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
# With no arguments the default targets are: the repository this script lives in
# (always), plus `~/Documents/Code/hellokahwin/hellokahwin` and
# `~/Documents/Code/hellokahwin-site` when those trees exist on this machine.
#
# Exit 0 = every named tree has the current guard installed.
# Exit 1 = at least one tree does not (so --check is usable as a gate).
# Exit 2 = there was no target at all, or an unknown option.
#
# Hooks live in the repository's COMMON git dir, so installing into a tree also
# covers every `git worktree` linked to it - one install per clone, not per
# worktree.

set -u

SRC_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
HOOKS="post-checkout pre-merge-commit pre-commit"

# Targets are carried in the positional parameters, NOT in a space-joined string.
# The default paths contain a space ("Ian Ng"), so `for t in $TARGETS` splits them
# into four broken half-paths and every tree reports "MISSING tree - skipped".
# That still exits 1, which looks like a correct "not installed" answer, so the
# bug survives a casual check. Do not reintroduce it.
CHECK_ONLY=0
had_targets=0
argc=$#
i=0
while [ "$i" -lt "$argc" ]; do
  arg=$1; shift
  case "$arg" in
    --check) CHECK_ONLY=1 ;;
    -*) echo "unknown option: $arg" >&2; exit 2 ;;
    *)  set -- "$@" "$arg"; had_targets=1 ;;
  esac
  i=$((i + 1))
done

# RISK-10: with no arguments, the FIRST default target is the repository this
# script lives in. RISK-09 defaulted to two hardcoded home-directory paths, which
# is right on the machine those trees exist on and wrong everywhere else - on a
# fresh clone the documented command installed the guard into somebody's other
# checkouts and not into the clone the operator was standing in.
#
# The two well-known trees are still checked when they exist, so the fleet-wide
# gate keeps working. A well-known tree that is NOT on this machine is skipped
# without setting rc: it is an absent default, not a failed target. A tree named
# explicitly on the command line still fails loudly when it is missing.
if [ "$had_targets" -eq 0 ]; then
  self_tree=$(git -C "$SRC_DIR" rev-parse --path-format=absolute --show-toplevel 2>/dev/null || true)
  self_common=$(git -C "$SRC_DIR" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)
  set --
  [ -n "$self_tree" ] && set -- "$self_tree"
  for known in "$HOME/Documents/Code/hellokahwin/hellokahwin" "$HOME/Documents/Code/hellokahwin-site"; do
    [ -d "$known" ] || continue
    known_common=$(git -C "$known" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)
    [ -n "$known_common" ] || continue
    # Same repository under a different spelling of the same path - skip it.
    [ -n "$self_common" ] && [ "$known_common" = "$self_common" ] && continue
    set -- "$@" "$known"
  done
  if [ "$#" -eq 0 ]; then
    echo "no target: $SRC_DIR is not inside a git tree, and neither default tree" >&2
    echo "exists on this machine. Name a tree explicitly:" >&2
    echo "  $0 /path/to/tree" >&2
    exit 2
  fi
fi

rc=0

for tree in "$@"; do
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
