# RISK-09 — the hellokahwin docs/site boundary guard

`hellokahwin` (the company record) and `hellokahwin-site` (the Next.js source)
are **one git repository**: same remote `github.com/ianngkb/hellokahwin`, same
root commit `3a1fbe09`. Nothing but convention keeps them apart.

Unguarded, `git checkout master` in the docs tree replaces `docs/boardroom`,
`docs/plans` and `docs/work-done` with `src/` and `next.config.ts`. Measured,
not assumed — `verify-guard.sh` case 0 reproduces it every run.

This directory is the guard. It is executable, not advisory.

## Install

```sh
scripts/git-hooks/install-hooks.sh                    # the two default trees
scripts/git-hooks/install-hooks.sh /path/to/tree ...  # named trees
scripts/git-hooks/install-hooks.sh --check            # audit only; exit 1 if missing
```

Hooks live in the repository's **common** git dir, so one install per clone
covers every `git worktree` linked to it. `--check` exits non-zero, so it works
as a gate in a pre-flight rather than as a reminder.

The installer **refuses** to overwrite a hook that is not this guard (husky,
lint-staged, anything without the `RISK-09` marker). It never silently replaces
someone else's hook.

## Verify

```sh
scripts/git-hooks/verify-guard.sh <scratch-dir> --fresh
```

Builds a throwaway clone — never a live tree — reproduces the hazard, installs
the guard, and asserts both the refusals and the negative controls. Exit 0 means
all cases behaved as specified. 25 cases as of 31 Aug 2026.

## Line endings

This repo has `core.autocrlf=true`. `.gitattributes` here pins these files to
LF, and `install-hooks.sh` strips carriage returns on the way in regardless, so
a CRLF checkout cannot produce a hook that looks installed and is not.

**Measured 31 Aug 2026: a CRLF hook still fires under Git for Windows** — the
bundled `sh` tolerates the carriage return. The defence is portability
insurance for Linux and macOS, where a shebang ending in CR gives
`bad interpreter`. That failure was **not** reproduced on this machine and is
not claimed as observed.

## What each hook does

| Hook | Fires on | Does |
|---|---|---|
| `post-checkout` | branch/commit switch across the boundary | prints the refusal, **switches back**, exits 1 |
| `pre-commit` | committing a **conflicted** cross-space merge | refuses; no commit is made |
| `pre-merge-commit` | committing a clean cross-space merge | refuses; no commit is made |

`pre-commit` is the one that matters for merges. Git runs `pre-merge-commit`
only when a merge auto-resolves, and a docs/site merge never does — **8
conflicted paths, measured**, including modify/delete on `frontend/` and
`backend/`. When the merge conflicts, git runs `pre-commit` at `git commit`
instead. `pre-merge-commit` is kept for the case where the two trees ever
diverge enough to auto-merge.

On an ordinary commit `pre-commit` exits immediately and prints nothing.

## Space is decided by content, never by branch name

Any name-based rule is wrong on day one in this repo:

| Branch | Space |
|---|---|
| `docs/plat-10-11-12` | **site** |
| `feat/command-centre-dashboard` | **docs** |

The rule the hooks use, against the commit's tree:

- `next.config.ts` present → **site**
- else `docs/boardroom` or `frontend/` present → **docs**
- else **unknown → the guard stays silent**

Failing open on `unknown` is deliberate. A guard that fires on commits it does
not understand is a guard people delete.

## Deliberate override

```sh
HK_GIT_SPACE_GUARD=off git checkout <ref>
HK_GIT_SPACE_GUARD=off git commit
```

The escape hatch exists so the guard never becomes the obstacle that gets
removed. It is also how the hook re-enters itself to restore the tree.

## If you change a hook

Edit the source here, then re-run `install-hooks.sh` and `verify-guard.sh`.
The copies under `.git/hooks/` are overwritten on the next install — editing
them is editing something that is about to be replaced.
