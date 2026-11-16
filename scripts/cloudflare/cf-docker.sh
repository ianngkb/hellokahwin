#!/usr/bin/env bash
# Build (and optionally deploy) the HelloKahwin Cloudflare Worker inside a
# Linux container. Copied from thepadelbase's kit (docs/cloudflare.md), with
# pnpm instead of npm and the app at the repo root.
#
# Why a container: @opennextjs/cloudflare's bundler recreates the symlinks that
# Next's file tracing leaves in .next, and Windows refuses to create symlinks
# without Developer Mode or an elevated shell (EPERM). Linux has no such limit,
# and CI is Linux, so this is the same path CI takes.
#
# The host worktree is mounted read-only at /src and copied into a container-side
# working copy at /work, so the container never touches the Windows node_modules
# (whose native binaries are the wrong platform) and never writes to the worktree.
#
# /work is WIPED at the start of every run, and the run ABORTS if the wipe does
# not leave it empty - see "Starting from empty" below. Only the dependency
# caches survive, on their own volumes.
#
#   scripts/cloudflare/cf-docker.sh build            # bundle only
#   scripts/cloudflare/cf-docker.sh deploy           # bundle, then upload to workers.dev
#   scripts/cloudflare/cf-docker.sh secrets          # push runtime values to the Worker
#   scripts/cloudflare/cf-docker.sh check            # bundle, then inspect the output
#   scripts/cloudflare/cf-docker.sh sh '<cmd>'       # anything else, in the built /work
#
# Requires an env file at $ENV_FILE holding the dev runtime values plus
# CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID. Generate it with
# scripts/cloudflare/write-env-file.ps1 and delete it the moment this script returns.
# (Values come from Vercel's env and the local vault. Infisical project
# `hellokahwin` mirrors the production env under `prod`
# (`infisical run --projectId 79665911-0240-4eab-b23c-caae042efecf --env=prod -- ...`);
# its `dev` env holds only ANALYTICS_SALT and the GSC key, not the dev runtime env.)
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IMAGE="node:24-bookworm"
# Three volumes, with different lifetimes:
#   SRC_VOLUME  the working copy. Wiped at the start of every run.
#   DEPS_VOLUME node_modules. Kept, because reinstalling it every run is slow
#               and it is built by pnpm from the lockfile, not copied from the
#               host, so it is not a path secrets can travel.
#   NPM_VOLUME  pnpm's content-addressed store. Kept, for the same reason.
# HOME points inside the working copy, so any credential state a tool writes to
# $HOME is wiped with everything else rather than surviving the run.
SRC_VOLUME="hellokahwin-cf-src"
DEPS_VOLUME="hellokahwin-cf-deps"
NPM_VOLUME="hellokahwin-cf-pnpm"
ENV_FILE="${ENV_FILE:?set ENV_FILE to the generated docker env file}"

case "${1:-build}" in
  build)  INNER='pnpm exec opennextjs-cloudflare build' ;;
  # The top-level (workers.dev preview) Worker. There is no production env in
  # wrangler.jsonc; hellokahwin.com stays on Vercel.
  deploy) INNER='pnpm exec opennextjs-cloudflare build && pnpm exec wrangler deploy' ;;
  # Push only the runtime values the read-only preview reads. The temp file is
  # written inside the container and deleted in the same shell.
  secrets) INNER='node -e '"'"'
      const keys=["CRON_SECRET","NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY","NEXT_PUBLIC_R2_ASSETS_PUBLIC_URL","R2_PUBLIC_URL","R2_ASSETS_PUBLIC_URL","R2_BUCKET_NAME","R2_ASSETS_BUCKET_NAME"];
      const out={}; const missing=[];
      for (const k of keys) { if (process.env[k]) out[k]=process.env[k]; else missing.push(k); }
      require("fs").writeFileSync("/tmp/cf-secrets.json", JSON.stringify(out));
      console.log("pushing", Object.keys(out).length, "secrets; missing:", missing.join(",")||"(none)");
    '"'"' && pnpm exec wrangler secret bulk /tmp/cf-secrets.json; rc=$?; rm -f /tmp/cf-secrets.json; exit $rc' ;;
  check) INNER='pnpm exec opennextjs-cloudflare build >/dev/null && echo "--- DO exports ---" && grep -c DOQueueHandler .open-next/worker.js && ls -la .open-next/worker.js && du -sh .open-next/assets .open-next/server-functions' ;;
  sh)     shift; INNER="$*" ;;
  *)      echo "unknown command: $1" >&2; exit 2 ;;
esac

docker volume create "$SRC_VOLUME"  >/dev/null
docker volume create "$DEPS_VOLUME" >/dev/null
docker volume create "$NPM_VOLUME"  >/dev/null

# ---------------------------------------------------------------------------
# Starting from empty
#
# The working copy used to persist between runs, so anything that ever landed
# in it stayed until something deleted it by name. A deny-list cannot close
# that: a stale secrets file called cf.conf matches no pattern and survives.
#
# So the working copy is now WIPED before every copy. /work starts empty, which
# means the only files in it are the ones this run just copied from /src - and
# the exclude list below decides what that is. The two caches survive because
# they are separate volumes mounted *inside* /work, and neither is a path a
# host file can travel along: pnpm builds them from the lockfile.
#
# The wipe is not assumed to have worked. It runs with no error suppression, so
# a failed delete stops the run; and the container then checks that /work really
# is empty before copying anything in. A wipe that failed - loudly or quietly -
# aborts the run instead of letting the source land on top of whatever survived.
#
# The excludes are kept as the second defence. They stop a secret being copied
# in and used *during* a run, which the wipe alone would not prevent.
# ---------------------------------------------------------------------------

EXC="--exclude=./node_modules --exclude=./.git --exclude=./tmp --exclude=./.vercel --exclude=./_bmad-output --exclude=./artifacts"
EXC="$EXC --exclude='*/node_modules' --exclude='*/.next' --exclude='*/.open-next' --exclude='*/.wrangler'"
for g in .env '.env.*' '*.env' .dev.vars '.dev.vars.*' '*.cred' '*.pem' '*.key' '*.p12' 'cf-secrets*' .npmrc.local; do
  EXC="$EXC --exclude='$g'"
done

# If ENV_FILE sits inside the checkout, exclude it by its exact path too: it
# may match none of the globs above (nothing stops it being called "cf.conf").
ENV_ABS="$(cd "$(dirname "$ENV_FILE")" && pwd)/$(basename "$ENV_FILE")"
case "$ENV_ABS" in
  "$REPO"/*) EXC="$EXC --exclude='./${ENV_ABS#"$REPO"/}'" ;;
esac

# MSYS/Git-Bash rewrites a leading / in container paths; MSYS_NO_PATHCONV stops it.
MSYS_NO_PATHCONV=1 docker run --rm \
  -v "$REPO:/src:ro" \
  -v "$SRC_VOLUME:/work" \
  -v "$DEPS_VOLUME:/work/node_modules" \
  -v "$NPM_VOLUME:/pnpm-store" \
  --env-file "$ENV_FILE" \
  -e HOME=/work/.home \
  -e npm_config_store_dir=/pnpm-store \
  -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
  -w /work \
  "$IMAGE" \
  bash -euo pipefail -c '
    # (1) Wipe the working copy - loudly. Everything at the top level goes
    # except node_modules, which is a separate volume mounted here and cannot
    # be removed from inside anyway. There is no error suppression: a wipe that
    # cannot finish must stop the run, not be built on top of.
    before=$(find /work -mindepth 1 -maxdepth 1 ! -name node_modules | wc -l)
    if ! find /work -mindepth 1 -maxdepth 1 ! -name node_modules -exec rm -rf {} + ; then
      echo "ABORT: could not wipe the working copy (rm errors above)." >&2
      echo "Nothing has been copied in. Remove the working-copy volume and re-run." >&2
      exit 3
    fi

    # (2) Verify it, before trusting it. If the wipe failed quietly - a tool
    # that reports success without deleting, a path find did not reach - a
    # stale file, possibly a secret, would sit underneath the files this run
    # copies in. So anything still present except the node_modules mount aborts
    # the run BEFORE the copy.
    leftover=$(find /work -mindepth 1 -name node_modules -prune -o -print | wc -l)
    if [ "$leftover" -ne 0 ]; then
      echo "ABORT: /work is not empty after the wipe - ${leftover} path(s) remain:" >&2
      find /work -mindepth 1 -name node_modules -prune -o -print >&2
      echo "Refusing to copy the source into a working copy that was not cleared." >&2
      exit 4
    fi
    echo "working copy wiped: ${before} top-level entries removed, /work verified empty"
    mkdir -p /work/.home

    # (3) Copy the source in. The excludes still matter: they keep a secret out
    # of the container for the duration of the run, not just afterwards.
    tar -C /src -cf - '"$EXC"' . | tar -C /work -xf -

    corepack enable
    corepack prepare pnpm@10.30.1 --activate >/dev/null
    pnpm install --frozen-lockfile --config.confirmModulesPurge=false
    '"$INNER"'
  '
