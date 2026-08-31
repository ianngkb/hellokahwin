#!/usr/bin/env bash
# audit-worktree-shipped.sh - decide whether a git worktree's work is PROVABLY
# SHIPPED, using TWO INDEPENDENT CONTENT SIGNALS. Never matches on branch or
# directory NAME.
#
# WHY THIS EXISTS (PLAT-19, 01 Sept 2026):
#   Sprint 03: a grep for 'RISK-07' against a tree named 'risk07' returned
#   nothing on a case mismatch, and would have deleted worktrees whose work was
#   fully shipped. Sprint 04: three trees showed commits "ahead" of their own
#   branch ref that were ancestors of origin/master BY CONTENT (merge commits
#   pulling master in) - the mirror of the squash-merge trap.
#   Conclusion: test by CONTENT, never by ref position and never by name.
#
# THE TWO SIGNALS (independent - one is graph membership, one is content identity):
#   SIG1  the tip commit object is a member of the ENUMERATED commit set of the
#         base ref (git rev-list <base>). Enumeration, not an ancestry query:
#         we list what IS there rather than asking whether an assumption holds.
#   SIG2  the tip's TREE object sha appears among the tree objects of the base
#         ref's history. This is content identity - it holds even when the
#         commit was rewritten (rebase, squash, cherry-pick), because a tree sha
#         is a hash of the file content itself.
#   Both must pass. Either alone is insufficient.
#
# GATE  uncommitted work blocks removal regardless of the signals: shipped
#       history says nothing about what is sitting dirty in the checkout.
#       --allow-untracked downgrades untracked files to a warning; tracked
#       modifications ALWAYS block.
#
# USAGE
#   bash scripts/audit-worktree-shipped.sh
#       Report on every worktree except the main checkout. Always exits 0.
#   bash scripts/audit-worktree-shipped.sh <path> [<path> ...]
#       Exit 0 only if EVERY named worktree is provably shipped and clean.
#       Safe removal idiom:
#         bash scripts/audit-worktree-shipped.sh "$T" && git worktree remove --force "$T"
#   bash scripts/audit-worktree-shipped.sh --verify-gone <path> [<path> ...]
#       Post-removal check. Exit 0 only if every named path is absent from BOTH
#       'git worktree list' AND the filesystem.
#       WHY: on Windows 'git worktree remove --force' is NOT atomic. It
#       deregisters the worktree and then fails to delete the files -
#       'Filename too long' on pnpm's deep node_modules, 'Access is denied' on
#       pnpm's read-only hardlinks, 'Directory not empty' on a locked .next.
#       PLAT-19 hit all three: 12 of 12 trees vanished from 'git worktree list'
#       while their directories stayed on disk half-deleted. Reading
#       'git worktree list' as proof of removal gives a FALSE CLEAN.
#       To finish the deletion on Windows:
#         cmd /c 'attrib -R -S -H "<path>\*" /S /D' && cmd /c 'rd /s /q "<path>"'
#
#   Options: --base <ref>  (default origin/master)   --allow-untracked
set -uo pipefail

BASE="origin/master"
ALLOW_UNTRACKED=0
VERIFY_GONE=0
TARGETS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --base) BASE="$2"; shift 2 ;;
    --allow-untracked) ALLOW_UNTRACKED=1; shift ;;
    --verify-gone) VERIFY_GONE=1; shift ;;
    -h|--help) sed -n '2,40p' "$0"; exit 0 ;;
    *) TARGETS+=("$1"); shift ;;
  esac
done

git rev-parse --git-dir >/dev/null 2>&1 || { echo "not a git repo"; exit 2; }
BASE_SHA=$(git rev-parse --verify "$BASE^{commit}" 2>/dev/null) || {
  echo "FATAL: base ref '$BASE' does not resolve"; exit 2; }

if [ "$VERIFY_GONE" -eq 1 ]; then
  [ ${#TARGETS[@]} -eq 0 ] && { echo "--verify-gone needs at least one path"; exit 2; }
  REGISTERED=$(git worktree list --porcelain | awk '/^worktree /{print substr($0,10)}')
  RC=0
  for T in "${TARGETS[@]}"; do
    STILL_REG=NO; printf '%s
' "$REGISTERED" | grep -qxF "$T" && STILL_REG=YES
    ON_DISK=NO;  [ -e "$T" ] && ON_DISK=YES
    N=0; [ "$ON_DISK" = YES ] && N=$(find "$T" -mindepth 1 2>/dev/null | wc -l)
    if [ "$STILL_REG" = NO ] && [ "$ON_DISK" = NO ]; then
      echo "GONE          $T"
    else
      echo "NOT-GONE      $T  registered=$STILL_REG on_disk=$ON_DISK residual_entries=$N"
      RC=1
    fi
  done
  exit "$RC"
fi

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
# Enumerate the base's commit set and its tree-object set ONCE.
git rev-list "$BASE_SHA" > "$WORK/commits.txt"
git rev-list "$BASE_SHA" --format=%T | grep -v '^commit ' | sort -u > "$WORK/trees.txt"

REPORT_ONLY=0
if [ ${#TARGETS[@]} -eq 0 ]; then
  REPORT_ONLY=1
  MAIN=$(git rev-parse --path-format=absolute --show-toplevel 2>/dev/null || git rev-parse --show-toplevel)
  while read -r p; do
    [ -z "$p" ] && continue
    [ "$p" = "$MAIN" ] && continue
    TARGETS+=("$p")
  done < <(git worktree list --porcelain | awk '/^worktree /{print substr($0,10)}')
fi

echo "base: $BASE = $BASE_SHA"
echo "enumerated: $(wc -l < "$WORK/commits.txt") commits, $(wc -l < "$WORK/trees.txt") distinct trees"
echo

FAIL=0
for T in "${TARGETS[@]}"; do
  echo "worktree: $T"
  if [ ! -d "$T" ]; then echo "  VERDICT: NOT-PROVEN (no such directory)"; FAIL=1; echo; continue; fi

  H=$(git -C "$T" rev-parse HEAD 2>/dev/null) || { echo "  VERDICT: NOT-PROVEN (no HEAD)"; FAIL=1; echo; continue; }
  B=$(git -C "$T" rev-parse --abbrev-ref HEAD 2>/dev/null)
  TREE=$(git rev-parse "$H^{tree}")
  echo "  branch=$B  head=$H  tree=$TREE"

  S1=$(grep -c "^$H$"    "$WORK/commits.txt"); [ "$S1" -ge 1 ] && S1R=PASS || S1R=FAIL
  S2=$(grep -c "^$TREE$" "$WORK/trees.txt");   [ "$S2" -ge 1 ] && S2R=PASS || S2R=FAIL
  echo "  SIG1 tip commit in enumerated base commit set : $S1R (hits=$S1)"
  echo "  SIG2 tip tree object in base tree-object set  : $S2R (hits=$S2)"

  MODIFIED=$(git -C "$T" status --porcelain --untracked-files=no | wc -l)
  UNTRACKED=$(git -C "$T" ls-files --others --exclude-standard | wc -l)
  echo "  GATE tracked modifications=$MODIFIED  untracked=$UNTRACKED"
  [ "$MODIFIED" -gt 0 ] && git -C "$T" status --porcelain --untracked-files=no | sed 's/^/    MODIFIED /'
  [ "$UNTRACKED" -gt 0 ] && git -C "$T" ls-files --others --exclude-standard | sed 's/^/    UNTRACKED /'

  CLEAN=1
  [ "$MODIFIED" -gt 0 ] && CLEAN=0
  if [ "$UNTRACKED" -gt 0 ] && [ "$ALLOW_UNTRACKED" -eq 0 ]; then CLEAN=0; fi

  if [ "$S1R" = PASS ] && [ "$S2R" = PASS ] && [ "$CLEAN" -eq 1 ]; then
    echo "  VERDICT: SHIPPED - safe to remove"
  else
    echo "  VERDICT: NOT-PROVEN - LEAVE THIS TREE"
    FAIL=1
  fi
  echo
done

if [ "$REPORT_ONLY" -eq 1 ]; then
  echo "report-only mode: exit 0 regardless of verdicts"
  exit 0
fi
exit "$FAIL"
