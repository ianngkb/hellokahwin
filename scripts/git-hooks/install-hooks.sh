#!/bin/sh
#
# RISK-09 - install (or audit) the hellokahwin docs/site boundary guard.
#
# Usage:
#   scripts/git-hooks/install-hooks.sh                 # install into the default trees
#   scripts/git-hooks/install-hooks.sh --check         # audit only, install nothing
#   scripts/git-hooks/install-hooks.sh /path/to/tree   # install into named trees
#   scripts/git-hooks/install-hooks.sh --check /path   # audit named trees
#
# Exit 0 = every named tree has the current guard installed.
# Exit 1 = at least one tree does not (so --check is usable as a gate).
#
# Hooks live in the repository's COMMON git dir, so installing into a tree also
# covers every `git worktree` linked to it - one install per clone, not per
# worktree.

set -u

SRC_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
HOOKS="post-checkout pre-merge-commit pre-commit"

CHECK_ONLY=0
TARGETS=""
for arg in "$@"; do
  case "$arg" in
    --check) CHECK_ONLY=1 ;;
    -*) echo "unknown option: $arg" >&2; exit 2 ;;
    *)  TARGETS="$TARGETS $arg" ;;
  esac
done

if [ -z "$TARGETS" ]; then
  TARGETS="$HOME/Documents/Code/hellokahwin/hellokahwin $HOME/Documents/Code/hellokahwin-site"
fi

rc=0

for tree in $TARGETS; do
  echo "=== $tree"
  if [ ! -d "$tree" ]; then
    echo "    MISSING tree - skipped"; rc=1; continue
  fi

  # Honour core.hooksPath; otherwise the common git dir's hooks/.
  hp=$(git -C "$tree" config --get core.hooksPath 2>/dev/null || true)
  if [ -n "$hp" ]; then
    case "$hp" in /*|?:*) dest="$hp" ;; *) dest="$tree/$hp" ;; esac
  else
    common=$(git -C "$tree" rev-parse --path-format=absolute --git-common-dir 2>/dev/null) || {
      echo "    NOT A GIT TREE - skipped"; rc=1; continue; }
    dest="$common/hooks"
  fi
  echo "    hooks dir: $dest"

  [ "$CHECK_ONLY" -eq 1 ] || mkdir -p "$dest"

  for h in $HOOKS; do
    src="$SRC_DIR/$h"
    tgt="$dest/$h"
    if [ ! -f "$src" ]; then
      echo "    $h: SOURCE MISSING at $src"; rc=1; continue
    fi
    # Install a CR-stripped copy, ALWAYS. This repo has core.autocrlf=true, so a
    # checkout can hand us hooks whose shebang line ends in a carriage return.
    # Git for Windows tolerates that (measured 31 Aug 2026 - it still fired);
    # Linux and macOS do not, and give "bad interpreter" on a hook that looks
    # installed. Stripping here costs nothing and removes the question.
    # Octal 015 is CR.
    norm="${TMPDIR:-/tmp}/risk09-$h.$$"
    tr -d '\015' < "$src" > "$norm"

    if [ -f "$tgt" ] && cmp -s "$norm" "$tgt"; then
      echo "    $h: up to date"
      rm -f "$norm"
      continue
    fi
    # An existing hook that is not ours (husky, lint-staged, anything) must
    # never be silently replaced. Refuse and let a person decide.
    foreign=0
    if [ -f "$tgt" ] && ! grep -q 'RISK-09' "$tgt" 2>/dev/null; then
      foreign=1
    fi

    if [ "$CHECK_ONLY" -eq 1 ]; then
      if [ "$foreign" -eq 1 ]; then echo "    $h: FOREIGN HOOK PRESENT - guard not installed"
      elif [ -f "$tgt" ]; then echo "    $h: STALE - differs from source"
      else echo "    $h: NOT INSTALLED"; fi
      rc=1
      rm -f "$norm"
      continue
    fi

    if [ "$foreign" -eq 1 ]; then
      echo "    $h: REFUSED - $tgt already exists and is not the RISK-09 guard."
      echo "       Not overwriting. Merge the two by hand, then re-run this installer."
      rc=1
      rm -f "$norm"
      continue
    fi

    if [ -f "$tgt" ]; then
      bak="$tgt.pre-risk09.$(date +%Y%m%d%H%M%S)"
      cp "$tgt" "$bak" && echo "    $h: previous guard version backed up to $bak"
    fi
    cp "$norm" "$tgt" && chmod +x "$tgt" && echo "    $h: installed"
    rm -f "$norm"
  done
done

if [ "$CHECK_ONLY" -eq 1 ] && [ "$rc" -ne 0 ]; then
  echo ""
  echo "RISK-09 guard is not fully installed. Fix with:"
  echo "  $SRC_DIR/install-hooks.sh"
fi

exit $rc
