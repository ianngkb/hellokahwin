#!/bin/sh
#
# RISK-09 - reproducible proof that the docs/site boundary guard works.
#
# Builds a THROWAWAY clone (never touches a live tree), reproduces the exact
# hazard, and runs the guard against it: refusals AND negative controls.
#
# Usage:
#   scripts/git-hooks/verify-guard.sh <scratch-dir> [--fresh]
#
# Exit 0 = every case behaved as specified. Exit 1 = at least one did not.

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
  git init --quiet -b feat/command-centre-dashboard .
  git config core.longpaths true          # docs tree exceeds Windows MAX_PATH
  git remote add origin "$REPO"
  printf '.risk09-throwaway
RISK09-*
' >> .git/info/exclude
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

DOCS_REF=refs/remotes/gh/feat/command-centre-dashboard
SITE_REF=refs/remotes/gh/master
DOCS2_REF=refs/remotes/gh/feat/cont-08-nisbah          # docs space
SITE2_REF=refs/remotes/gh/docs/plat-10-11-12           # SITE space despite name
git branch -f hk-docs  "$DOCS_REF"  >/dev/null 2>&1
git branch -f hk-site  "$SITE_REF"  >/dev/null 2>&1
git branch -f hk-docs2 "$DOCS2_REF" >/dev/null 2>&1
git branch -f hk-site2 "$SITE2_REF" >/dev/null 2>&1
HK_GIT_SPACE_GUARD=off git checkout --quiet --force hk-docs

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
git checkout --quiet hk-site2 >/dev/null 2>&1; rc=$?
check "site->site checkout succeeds" "$rc" "0"
check "  landed on hk-site2" "$(git rev-parse --abbrev-ref HEAD)" "hk-site2"

HK_GIT_SPACE_GUARD=off git checkout --quiet hk-docs
git checkout --quiet hk-docs2 >/dev/null 2>&1; rc=$?
check "docs->docs checkout succeeds" "$rc" "0"
check "  landed on hk-docs2" "$(git rev-parse --abbrev-ref HEAD)" "hk-docs2"

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
echo "  RISK-09 guard: $pass passed, $fail failed"
echo "=============================================="
[ "$fail" -eq 0 ] || exit 1
exit 0
