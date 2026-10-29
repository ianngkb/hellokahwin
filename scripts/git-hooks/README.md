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
scripts/git-hooks/install-hooks.sh                    # the default trees
scripts/git-hooks/install-hooks.sh /path/to/tree ...  # named trees
scripts/git-hooks/install-hooks.sh --check            # audit only; exit 1 if missing
```

With no arguments the default targets are:

1. **the repository this script lives in** — always, so a fresh clone guards
   itself with the command above and nothing else;
2. `~/Documents/Code/hellokahwin/hellokahwin` and
   `~/Documents/Code/hellokahwin-site`, **when those trees exist on the
   machine**. Absent, they are skipped and do not fail the run; the same repo
   under a second spelling of its path is skipped too.

A tree named explicitly on the command line still fails the run when it is
missing — that is a typo, not an absent default.

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
all cases behaved as specified; exit 1 means a case failed; **exit 2 means the
harness could not build a fixture and ran nothing**, which is not a pass.

## Where the harness gets its fixture — decided, RISK-10, 01 Sept 2026

The harness needs one commit from **each** space. RISK-09 shipped it on the docs
branch, where a docs-space commit is always underfoot, and left open what should
happen once these files live on `master`, which is site space. The decision:

- **No branch name is ever trusted.** Names in this repo lie:
  `docs/plat-10-11-12` is site source; `feat/command-centre-dashboard` is the
  company record. A fixture picked by name is wrong today, on branches that
  already exist.
- **Every ref the clone can see is classified by tree content**, using
  `hk_space()` **extracted verbatim with `sed`** from the shipped
  `post-checkout`. Extracted, not retyped, so the harness cannot drift from the
  rule the guard actually applies.
- **A clone that carries only one space** (`--single-branch`, `--depth`) makes
  the harness fetch the true upstream once and classify again.
- **If a space is still missing, the harness exits 2 and runs nothing**, after
  printing every ref it looked at and how each classified. It does not skip the
  case and go green. A harness that passes because it could not find its own
  fixture is worse than no harness.
- **The two negative-control branches are created inside the throwaway clone
  with names that contradict their content** — `docs/risk10-site-probe` holds
  site source, `feat/risk10-docs-probe` holds the company record. A name-based
  classifier fails those cases by construction, so the content rule is proved by
  the harness itself rather than by any upstream branch continuing to exist.

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

| Hook               | Fires on                                      | Does                                           |
| ------------------ | --------------------------------------------- | ---------------------------------------------- |
| `post-checkout`    | branch/commit switch across the boundary      | prints the refusal, **switches back**, exits 1 |
| `pre-commit`       | committing a **conflicted** cross-space merge | refuses; no commit is made                     |
| `pre-merge-commit` | committing a clean cross-space merge          | refuses; no commit is made                     |

`pre-commit` is the one that matters for merges. Git runs `pre-merge-commit`
only when a merge auto-resolves, and a docs/site merge never does — **8
conflicted paths, measured**, including modify/delete on `frontend/` and
`backend/`. When the merge conflicts, git runs `pre-commit` at `git commit`
instead. `pre-merge-commit` is kept for the case where the two trees ever
diverge enough to auto-merge.

On an ordinary commit `pre-commit` exits immediately and prints nothing.

## Space is decided by content, never by branch name

Any name-based rule is wrong on day one in this repo:

| Branch                          | Space    |
| ------------------------------- | -------- |
| `docs/plat-10-11-12`            | **site** |
| `feat/command-centre-dashboard` | **docs** |

The rule the hooks use, against the commit's tree:

- `next.config.ts` present → **site**
- else `docs/boardroom` or `frontend/` present → **docs**
- else **unknown → the guard stays silent**

Failing open on `unknown` is deliberate. A guard that fires on commits it does
not understand is a guard people delete.

## `docs/` IS NOT THE DOCS SPACE — the path map, measured (UI-13, 01 Sept 2026)

The rule above classifies a **commit** by its tree. It says nothing about which
**paths** belong to which line, and the short version people write down —
_"anything under `docs/` goes to the docs line"_ — is wrong. It was written into
a sprint brief on 01 Sept after two incidents the same day, and following it
literally reproduces the first of them: CONT-14 pushed its paper trail to a
branch nobody reads.

Counted the same afternoon: **412 files under `docs/` on `master`**, 1,025 on
`feat/command-centre-dashboard`. Every item that shipped on 01 Sept — PLAT-19
(`0a46c9d`), DES-18 (`c56e46d`), SEO-13 (`82ca795`) — put its `docs/work-done/`
entry on **master**, beside the code it documents.

| Path                                     | Line          | Why                                                                                              |
| ---------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------ |
| `src/`, `scripts/`, `tests/`, `.github/` | **master**    | the site                                                                                         |
| `docs/work-done/**`                      | **master**    | the record of a change, next to the change; a reviewer reading the diff must be able to reach it |
| `docs/design/*.md` (component rules)     | **master**    | read while editing the component                                                                 |
| `docs/design/des-*` (the specs)          | **docs line** | the company record                                                                               |
| `docs/plans/**` (briefs, sprint plans)   | **docs line** | the company record                                                                               |
| `docs/fixtures/**`                       | **docs line** | authored beside the spec that needs them                                                         |

The two are not symmetrical and that is the point: **`master` carries the record
of the site, the docs line carries the record of the company.** A test fixture a
CI job must reach belongs under `tests/` on master, not under `docs/fixtures/` —
a blocking job cannot check out two branches to find its own inputs.

**Neither the hooks nor any script enforces this.** The hooks guard the boundary
that is unrecoverable (a cross-space merge or checkout, which collapses the two
records into one branch); a paper trail on the wrong line is recoverable by a
cherry-pick, and a guard that fires on every commit touching `docs/` is a guard
people delete. This table is the enforcement, so keep it correct.

## Deliberate override

```sh
HK_GIT_SPACE_GUARD=off git checkout <ref>
HK_GIT_SPACE_GUARD=off git commit
```

The escape hatch exists so the guard never becomes the obstacle that gets
removed. It is also how the hook re-enters itself to restore the tree.

## Where these files live

They are committed on **both** lines of this repository — `master` (site) and
`feat/command-centre-dashboard` (docs) — because a guard reachable from only one
branch is not reachable from a fresh clone, which is where a newcomer starts and
where the hazard is most likely to be triggered. When you change one, port it to
the other in the same session; `verify-guard.sh` case 0d clones the repo it
lives in and asserts the fresh-clone install path still works.

## If you change a hook

Edit the source here, then re-run `install-hooks.sh` and `verify-guard.sh`.
The copies under `.git/hooks/` are overwritten on the next install — editing
them is editing something that is about to be replaced.
