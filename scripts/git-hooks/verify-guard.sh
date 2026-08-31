#!/bin/sh
#
# RISK-09/RISK-10 - reproducible proof that the docs/site boundary guard works.
#
# Builds a THROWAWAY clone (never touches a live tree), reproduces the exact
# hazard, and runs the guard against it: refusals AND negative controls.
#
# Usage:
#   scripts/git-hooks/verify-guard.sh <scratch-dir> [--fresh]
#
# Exit 0 = every case behaved as specified.
# Exit 1 = at least one case did not.
# Exit 2 = the harness could not build a valid fixture, so it ran NOTHING.
#
# ---------------------------------------------------------------------------
# THE FIXTURE DECISION  (RISK-10, 01 September 2026)
#
# RISK-09 shipped this harness on the docs branch, where a docs-space commit is
# always at hand, and left one question open: where does the docs-space fixture
# come from once these files live on `master`, which is site space?
#
# Decided, and this is the implementation:
#
#   1. The harness NEVER hardcodes a branch name. RISK-09 measured that names in
#      this repo lie - `docs/plat-10-11-12` is site source, and
#      `feat/command-centre-dashboard` is the company record. A fixture picked by
#      name is wrong the day someone renames a branch, and wrong TODAY on two
#      branches that already exist.
#
#   2. It classifies every ref the clone can see by TREE CONTENT, using
#      hk_space() extracted verbatim with sed from the shipped post-checkout.
#      Not retyped - extracted - so the harness cannot drift from the guard.
#
#   3. If the local repo carries no ref from one of the two spaces (a
#      --single-branch or shallow clone), it fetches the true upstream once and
#      classifies again.
#
#   4. If after that a space is still missing, the harness prints exactly what it
#      searched and EXITS 2 WITHOUT RUNNING ANY CASE. It does not skip the case.
#      It does not pass. A harness that goes green because it could not find its
#      own fixture is worse than no harness.
#
#   5. The two negative-control branches are created inside the throwaway clone
#      with names that CONTRADICT their content - `docs/risk10-site-probe` holds
#      site source, `feat/risk10-docs-probe` holds the company record. A
#      name-based classifier fails those cases by construction, so the content
#      rule is proven by the harness itself and not by the continued existence of
#      any particular upstream branch.
# ---------------------------------------------------------------------------

set -u

SRC_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO=$(CDPATH= cd -- "$SRC_DIR/../.." && pwd)

SCRATCH="${1:-}"
[ -n "$SCRATCH" ] || { echo "usage: $0 <scratch-dir> [--fresh]" >&2; exit 2; }
FRESH=0
[ "${2:-}" = "--fresh" ] && FRESH=1
CLONE="$SCRATCH/risk09-verify"

pass=0; fail=0
ok()   { pass=$((pass+1)); echo "  PASS  $1"; }
bad()  { fail=$((fail+1)); echo "  FAIL  $1"; }
check(){ if [ "$2" = "$3" ]; then ok "$1 ($2)"; else bad "$1 (expected '$3', got '$2')"; fi; }

# ---------------------------------------------------------------- fixture ----
if [ "$FRESH" -eq 1 ] || [ ! -d "$CLONE/.git" ]; then
  echo "== building throwaway clone at $CLONE"
  rm -rf "$CLONE"; mkdir -p "$CLONE"; cd "$CLONE" || exit 1
  git init --quiet -b hk-fixture-base .
  git config core.longpaths true          # docs tree exceeds Windows MAX_PATH
  git remote add origin "$REPO"
  printf '%s\n' '.risk09-throwaway' 'RISK09-*' >> .git/info/exclude
  git fetch --quiet origin \
    '+refs/heads/*:refs/remotes/src/*' '+refs/remotes/origin/*:refs/remotes/gh/*' || exit 1
else
  cd "$CLONE" || exit 1
fi

cd "$CLONE" || exit 1

# This script runs `git reset --hard`. It must never do that anywhere but the
# clone it built itself, so refuse to proceed without the marker it drops.
if [ ! -f "$CLONE/.risk09-throwaway" ] && [ -n "$(git log --oneline -1 2>/dev/null)" ]; then
  if [ "$FRESH" -eq 0 ] && [ -d "$CLONE/.git" ] && [ ! -f "$CLONE/.risk09-throwaway" ]; then
    echo "REFUSING: $CLONE is a git tree this script did not create." >&2
    echo "Re-run with --fresh, or point at an empty scratch directory." >&2
    exit 2
  fi
fi
: > "$CLONE/.risk09-throwaway"

git merge --abort 2>/dev/null
git reset --hard --quiet HEAD 2>/dev/null
rm -f .git/hooks/post-checkout .git/hooks/pre-merge-commit .git/hooks/pre-commit

# --- the classifier, taken from the guard rather than rewritten ---------------
# sed extracts hk_space() verbatim from the shipped post-checkout. If the guard's
# rule ever changes, the harness changes with it in the same commit.
HK_SPACE_SRC=$(sed -n '/^hk_space() {$/,/^}$/p' "$SRC_DIR/post-checkout")
hk_space_probes=$(printf '%s\n' "$HK_SPACE_SRC" | grep -c 'cat-file')
eval "$HK_SPACE_SRC"

echo "== fixture resolution  (by tree content; no branch name is trusted)"
if [ "$hk_space_probes" -lt 2 ] || ! command -v hk_space >/dev/null 2>&1; then
  echo "  FIXTURE UNAVAILABLE: could not extract hk_space() from $SRC_DIR/post-checkout" >&2
  echo "  (found $hk_space_probes cat-file probes; expected at least 2)" >&2
  exit 2
fi
ok "hk_space() extracted verbatim from post-checkout ($hk_space_probes cat-file probes)"

CAND="$SCRATCH/risk10-candidate-refs.txt"

classify_all() {
  git for-each-ref --format='%(objectname) %(refname)' \
      refs/remotes/gh refs/remotes/src refs/remotes/up 2>/dev/null \
  | while read -r sha ref; do
      case "$ref" in */HEAD) continue ;; esac
      echo "$(hk_space "$sha") $sha $ref"
    done
}

pick_first() {   # $1 = space, $2 = sha to exclude ("" for none)
  awk -v sp="$1" -v ex="$2" '$1==sp && $2!=ex {print $2" "$3; exit}' "$CAND"
}

classify_all > "$CAND"
docs_n=$(awk '$1=="docs"' "$CAND" | wc -l | tr -d ' ')
site_n=$(awk '$1=="site"' "$CAND" | wc -l | tr -d ' ')

# A clone made with --single-branch or --depth carries only one space. Go to the
# real upstream once before giving up.
if [ "$docs_n" -eq 0 ] || [ "$site_n" -eq 0 ]; then
  upstream=$(git -C "$REPO" remote get-url origin 2>/dev/null || true)
  if [ -n "$upstream" ]; then
    echo "  only one space in the local refs (docs=$docs_n site=$site_n)"
    echo "  fetching the upstream once: $upstream"
    git fetch --quiet "$upstream" '+refs/heads/*:refs/remotes/up/*' 2>/dev/null || true
    classify_all > "$CAND"
    docs_n=$(awk '$1=="docs"' "$CAND" | wc -l | tr -d ' ')
    site_n=$(awk '$1=="site"' "$CAND" | wc -l | tr -d ' ')
  fi
fi

docs_line=$(pick_first docs "")
site_line=$(awk '$1=="site" && $3 ~ /\/master$/ {print $2" "$3; exit}' "$CAND")
[ -n "$site_line" ] || site_line=$(pick_first site "")

if [ -z "$docs_line" ] || [ -z "$site_line" ]; then
  total=$(wc -l < "$CAND" | tr -d ' ')
  echo "" >&2
  echo "==============================================================================" >&2
  echo "  FIXTURE UNAVAILABLE - NO CASE WAS RUN. This is not a pass." >&2
  echo "==============================================================================" >&2
  echo "  This harness needs one docs-space commit AND one site-space commit." >&2
  echo "  It classifies by tree content (next.config.ts / docs/boardroom /" >&2
  echo "  frontend), never by branch name." >&2
  echo "" >&2
  echo "  searched     : refs/remotes/gh/*, refs/remotes/src/*, refs/remotes/up/*" >&2
  echo "  source repo  : $REPO" >&2
  echo "  found        : docs=$docs_n  site=$site_n  of $total refs" >&2
  echo "" >&2
  awk '{printf "    %-8s %s\n", $1, $3}' "$CAND" >&2
  echo "" >&2
  echo "  Fix: bring a ref from the missing space into the source repo, then" >&2
  echo "  re-run with --fresh:" >&2
  echo "    git -C '$REPO' fetch origin '+refs/heads/*:refs/remotes/origin/*'" >&2
  echo "==============================================================================" >&2
  exit 2
fi

DOCS_SHA=${docs_line%% *}; DOCS_REF=${docs_line#* }
SITE_SHA=${site_line%% *}; SITE_REF=${site_line#* }

synth() {   # $1 = base sha, $2 = message. Same tree, new commit: same space.
  GIT_AUTHOR_NAME=risk10 GIT_AUTHOR_EMAIL=risk10@hellokahwin \
  GIT_COMMITTER_NAME=risk10 GIT_COMMITTER_EMAIL=risk10@hellokahwin \
  git commit-tree "$1^{tree}" -p "$1" -m "$2"
}

docs2_line=$(pick_first docs "$DOCS_SHA")
if [ -n "$docs2_line" ]; then
  DOCS2_SHA=${docs2_line%% *}; DOCS2_SRC=${docs2_line#* }
else
  DOCS2_SHA=$(synth "$DOCS_SHA" "risk10 fixture: second docs-space commit")
  DOCS2_SRC="(synthesized on $DOCS_REF)"
fi

site2_line=$(pick_first site "$SITE_SHA")
if [ -n "$site2_line" ]; then
  SITE2_SHA=${site2_line%% *}; SITE2_SRC=${site2_line#* }
else
  SITE2_SHA=$(synth "$SITE_SHA" "risk10 fixture: second site-space commit")
  SITE2_SRC="(synthesized on $SITE_REF)"
fi

# Deliberately contradictory names. A classifier that reads names fails here.
DOCS2_BRANCH=feat/risk10-docs-probe
SITE2_BRANCH=docs/risk10-site-probe

git branch -f hk-docs "$DOCS_SHA" >/dev/null 2>&1
git branch -f hk-site "$SITE_SHA" >/dev/null 2>&1
git branch -f "$DOCS2_BRANCH" "$DOCS2_SHA" >/dev/null 2>&1
git branch -f "$SITE2_BRANCH" "$SITE2_SHA" >/dev/null 2>&1
HK_GIT_SPACE_GUARD=off git checkout --quiet --force hk-docs

echo "  refs classified : $(wc -l < "$CAND" | tr -d ' ')   docs=$docs_n  site=$site_n"
echo "  docs fixture    : $(git rev-parse --short "$DOCS_SHA")  <- $DOCS_REF"
echo "  site fixture    : $(git rev-parse --short "$SITE_SHA")  <- $SITE_REF"
echo "  docs control    : $(git rev-parse --short "$DOCS2_SHA")  <- $DOCS2_SRC  as $DOCS2_BRANCH"
echo "  site control    : $(git rev-parse --short "$SITE2_SHA")  <- $SITE2_SRC  as $SITE2_BRANCH"
check "docs fixture classifies docs" "$(hk_space "$DOCS_SHA")" "docs"
check "site fixture classifies site" "$(hk_space "$SITE_SHA")" "site"
check "branch NAMED $SITE2_BRANCH classifies" "$(hk_space "$SITE2_BRANCH")" "site"
check "branch NAMED $DOCS2_BRANCH classifies" "$(hk_space "$DOCS2_BRANCH")" "docs"
echo ""

echo "== fixture"
echo "  root commit : $(git rev-list --max-parents=0 HEAD | tail -1)"
echo "  hk-docs     : $(git rev-parse --short hk-docs)"
echo "  hk-site     : $(git rev-parse --short hk-site)"
echo ""

# --------------------------------------------------- 0. hazard is real -------
echo "== case 0  the hazard, UNGUARDED (no hooks installed)"
git checkout --quiet hk-site 2>/dev/null; rc=$?
check "unguarded cross-space checkout succeeds" "$rc" "0"
[ -d docs/boardroom ] && bad "company record survived (it should not have)" \
                      || ok "company record was replaced by site source - hazard confirmed"
git checkout --quiet hk-docs
echo ""

# ------------------------------------------------- CRLF source --------------
# This repo has core.autocrlf=true, so a checkout can hand the installer hooks
# whose shebang ends in a carriage return. Git for Windows tolerates that; Linux
# and macOS do not. The installer strips CR either way - this proves it does, and
# that a guard installed from a CRLF source still bites.
echo "== case 0b  installing from a CRLF-mangled source"
CRLFDIR="$SCRATCH/risk09-crlf-src"
rm -rf "$CRLFDIR"; mkdir -p "$CRLFDIR"
cp "$SRC_DIR/install-hooks.sh" "$CRLFDIR/"
for h in post-checkout pre-merge-commit pre-commit; do
  sed 's/$/\r/' "$SRC_DIR/$h" > "$CRLFDIR/$h"
done
crcount=$(tr -cd '\015' < "$CRLFDIR/post-checkout" | wc -c | tr -d ' ')
[ "$crcount" -gt 0 ] && ok "CRLF source really has carriage returns ($crcount) - fixture is valid" \
                     || bad "CRLF fixture has no CRs; the next case would prove nothing"
sh "$CRLFDIR/install-hooks.sh" "$CLONE" >/dev/null 2>&1
installed_cr=$(tr -cd '\015' < "$CLONE/.git/hooks/post-checkout" | wc -c | tr -d ' ')
check "installed hook has zero carriage returns" "$installed_cr" "0"
git checkout hk-site >/dev/null 2>&1; rc=$?
check "guard installed from CRLF source still refuses" "$rc" "1"
HK_GIT_SPACE_GUARD=off git checkout --quiet hk-docs
rm -rf "$CRLFDIR"
rm -f "$CLONE/.git/hooks/post-checkout" "$CLONE/.git/hooks/pre-merge-commit" "$CLONE/.git/hooks/pre-commit"
echo ""

# ------------------------------------------- paths containing spaces ---------
# The real install paths contain a space ("Ian Ng"). A space-joined target string
# splits them into broken half-paths, every tree reports "MISSING tree - skipped",
# and the script still exits 1 - which reads exactly like a correct "not
# installed" answer. Assert on the OUTPUT, not just the exit code.
echo "== case 0c  a target path containing a space"
spacedir="$SCRATCH/risk09 spaced tree"
rm -rf "$spacedir"; mkdir -p "$spacedir"
( cd "$spacedir" && git init --quiet . )
out=$("$SRC_DIR/install-hooks.sh" --check "$spacedir" 2>&1)
case "$out" in
  *"MISSING tree"*) bad "spaced path was split into broken half-paths" ;;
  *"NOT INSTALLED"*) ok "spaced path resolved to a real tree" ;;
  *) bad "unexpected output for a spaced path: $out" ;;
esac
"$SRC_DIR/install-hooks.sh" "$spacedir" >/dev/null 2>&1
"$SRC_DIR/install-hooks.sh" --check "$spacedir" >/dev/null 2>&1
check "guard installs into a path with a space" "$?" "0"
rm -rf "$spacedir"
echo ""

# ------------------------------ 0d. the fresh-clone install path -------------
# RISK-10: the reason these files are on master at all. A clone with no arguments
# must install into ITSELF, not only into two hardcoded home-directory trees that
# a new machine does not have. HOME is pointed at a directory that does not
# exist, so the known-trees branch cannot rescue a broken self-install.
echo "== case 0d  a clone installs into itself with no arguments (RISK-10)"
selfclone="$SCRATCH/risk10-selfinstall"
rm -rf "$selfclone"
# core.longpaths: without it this clone fails its checkout on Windows with
# "Filename too long" under docs/work-done/.../EVIDENCE/, and the FIRST version
# of this case then reported "master is missing the guard" - a confident and
# completely wrong answer about a repo that had it. Report what actually
# happened instead: a failed clone is a broken fixture, not a missing guard.
clone_out=$(git clone -c core.longpaths=true --quiet "$REPO" "$selfclone" 2>&1); clone_rc=$?
if [ "$clone_rc" -ne 0 ] || [ ! -d "$selfclone/.git" ]; then
  bad "could not clone the source repo - fixture broken, NOT a verdict on the guard: $clone_out"
elif [ ! -f "$selfclone/scripts/git-hooks/install-hooks.sh" ]; then
  bad "the clone checked out but carries no scripts/git-hooks/ - this branch is missing the guard"
else
  ok "clone of the source repo carries scripts/git-hooks/ (the fresh-clone path exists)"
  out=$(HOME="$selfclone/no-such-home" sh "$selfclone/scripts/git-hooks/install-hooks.sh" 2>&1); rc=$?
  check "  no-argument install succeeds with no known trees on the machine" "$rc" "0"
  out=$(HOME="$selfclone/no-such-home" sh "$selfclone/scripts/git-hooks/install-hooks.sh" --check 2>&1); rc=$?
  check "  no-argument --check exits 0 afterwards" "$rc" "0"
  case "$out" in
    *"MISSING tree"*) bad "  --check invented a missing tree or split a path" ;;
    *) ok "  --check named no missing tree" ;;
  esac
  [ -f "$selfclone/.git/hooks/post-checkout" ] && ok "  post-checkout landed in the clone's own hooks dir" \
                                               || bad "  clone has no post-checkout installed"
fi
rm -rf "$selfclone"
echo ""

# ------------------------------------------------------- install -------------
echo "== installing guard"
"$SRC_DIR/install-hooks.sh" "$CLONE" | sed 's/^/  /'
"$SRC_DIR/install-hooks.sh" --check "$CLONE" >/dev/null 2>&1
check "install-hooks.sh --check reports clean" "$?" "0"
echo ""

# ------------------------------------------------------- refusals ------------
echo "== refusals"
git checkout hk-site >/dev/null 2>&1; rc=$?
check "docs->site checkout exits non-zero" "$rc" "1"
check "docs->site left HEAD on the docs branch" "$(git rev-parse --abbrev-ref HEAD)" "hk-docs"
[ -d docs/boardroom ] && ok "docs/boardroom still on disk - tree restored" \
                      || bad "tree was NOT restored"

echo "unsaved agent work" > RISK09-UNTRACKED-PROBE.txt
git checkout hk-site >/dev/null 2>&1
[ -f RISK09-UNTRACKED-PROBE.txt ] && ok "untracked work survived the refusal" \
                                  || bad "untracked work was destroyed"
rm -f RISK09-UNTRACKED-PROBE.txt

git checkout "$(git rev-parse hk-site)" >/dev/null 2>&1; rc=$?
check "detached-HEAD cross-space checkout exits non-zero" "$rc" "1"
check "detached-HEAD refusal restored the branch" "$(git rev-parse --abbrev-ref HEAD)" "hk-docs"

HK_GIT_SPACE_GUARD=off git checkout --quiet hk-site
git checkout hk-docs >/dev/null 2>&1; rc=$?
check "site->docs checkout exits non-zero" "$rc" "1"
check "site->docs left HEAD on the site branch" "$(git rev-parse --abbrev-ref HEAD)" "hk-site"
echo ""

# ------------------------------------------------ negative controls ----------
echo "== negative controls  (ordinary work must not be impeded)"
git checkout --quiet "$SITE2_BRANCH" >/dev/null 2>&1; rc=$?
check "site->site checkout succeeds (target is NAMED docs/)" "$rc" "0"
check "  landed on $SITE2_BRANCH" "$(git rev-parse --abbrev-ref HEAD)" "$SITE2_BRANCH"

HK_GIT_SPACE_GUARD=off git checkout --quiet hk-docs
git checkout --quiet "$DOCS2_BRANCH" >/dev/null 2>&1; rc=$?
check "docs->docs checkout succeeds (target is NAMED feat/)" "$rc" "0"
check "  landed on $DOCS2_BRANCH" "$(git rev-parse --abbrev-ref HEAD)" "$DOCS2_BRANCH"

git checkout --quiet -b hk-scratch >/dev/null 2>&1; rc=$?
check "in-space 'git checkout -b' succeeds" "$rc" "0"

echo "MUTATED" >> README.md
git checkout -- README.md >/dev/null 2>&1; rc=$?
check "file checkout 'git checkout -- README.md' succeeds" "$rc" "0"
check "  README.md restored" "$(git status --porcelain README.md | wc -l | tr -d ' ')" "0"

echo "ordinary in-space change" > RISK09-ORDINARY.txt
git add -f RISK09-ORDINARY.txt   # -f: this harness excludes RISK09-* from the clone
staged=$(git diff --cached --name-only | wc -l | tr -d ' ')
check "  probe file is actually staged (guards the test itself)" "$staged" "1"
git -c user.email=verify@hellokahwin -c user.name=verify commit --quiet -m "risk09 verify: ordinary commit" >/dev/null 2>&1; rc=$?
check "ordinary (non-merge) commit succeeds - pre-commit stays silent" "$rc" "0"
git checkout --quiet hk-docs; git branch -D hk-scratch >/dev/null 2>&1
echo ""

# ------------------------------------------------------ merge path -----------
echo "== merge path"
git merge --no-edit hk-site >/dev/null 2>&1
conf=$(git diff --name-only --diff-filter=U | wc -l | tr -d ' ')
[ "$conf" -gt 0 ] && ok "cross-space merge conflicts ($conf paths) - pre-merge-commit is never reached" \
                  || bad "cross-space merge auto-resolved, which contradicts the measurement"
git checkout --theirs -- . >/dev/null 2>&1; git add -A >/dev/null 2>&1
git -c user.email=verify@hellokahwin -c user.name=verify commit --no-edit >/dev/null 2>&1; rc=$?
check "resolved cross-space merge commit is refused" "$rc" "1"
git merge --abort >/dev/null 2>&1
git reset --hard --quiet hk-docs
echo ""

echo "=============================================="
echo "  RISK-09/10 guard: $pass passed, $fail failed"
echo "=============================================="
[ "$fail" -eq 0 ] || exit 1
exit 0
