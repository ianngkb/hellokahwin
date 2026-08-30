# RISK-09 — the shared-repo boundary guard is built, tested, and NOT YET INSTALLED

**Sprint:** 04 · **Item:** `RISK-09` · 3 points · track `risk`
**Date:** 31 August 2026
**Status:** built and proven in a throwaway clone. **Installation into the two
live trees is PENDING the CEO's green-light** — the ordering constraint the CEO
set in the brief, not a narrowing of the DoD. See *Install, and why it has not
happened yet* below.

---

## What the hazard actually is, measured

`hellokahwin` (docs) and `hellokahwin-site` are one repository:

```
$ git -C ~/Documents/Code/hellokahwin/hellokahwin remote get-url origin
https://github.com/ianngkb/hellokahwin
$ git -C ~/Documents/Code/hellokahwin-site remote get-url origin
https://github.com/ianngkb/hellokahwin.git
$ git rev-list --max-parents=0 HEAD    # both trees
3a1fbe091d17c3d1cce106901ec8666712e74e28
```

Reproduced in a throwaway clone with no hooks installed, on a tree holding the
company record:

```
### BEFORE - this is the company record
docs/boardroom
docs/plans
docs/work-done
ls: cannot access 'src': No such file or directory

### RUN: git checkout master
Switched to branch 'master'
rc=0

### AFTER
HEAD: master 105e79d
ls: cannot access 'docs/boardroom': No such file or directory
ls: cannot access 'docs/plans': No such file or directory
next.config.ts
src
```

One command, exit code 0, no warning, and the boardroom is gone from disk.

---

## What was built

Executables in `scripts/git-hooks/`, plus a runbook:

| File | What it is |
|---|---|
| `post-checkout` | refuses a cross-boundary branch or commit switch, **restores the tree**, exits 1 |
| `pre-commit` | refuses the commit that completes a **conflicted** cross-space merge |
| `pre-merge-commit` | refuses the commit that completes a **clean** cross-space merge |
| `install-hooks.sh` | installs into named trees; `--check` audits and exits 1 if the guard is missing |
| `verify-guard.sh` | builds a throwaway clone, reproduces the hazard, runs 27 cases |
| `.gitattributes` | pins these files to LF; the repo runs `core.autocrlf=true` |
| `README.md` | the runbook |

### Three design decisions worth recording

**1. Space is decided by tree content, never by branch name.** Enumerating every
branch in the repo shows a name rule would be wrong immediately:

| Branch | `next.config.ts` | Space |
|---|---|---|
| `docs/plat-10-11-12` | present | **site** |
| `feat/command-centre-dashboard` | absent | **docs** |

The rule is: `next.config.ts` present → site; else `docs/boardroom` or
`frontend/` present → docs; else **unknown, and the guard stays silent.**
Failing open on unknown is deliberate — a guard that fires on commits it does
not understand is a guard people delete.

**2. `post-checkout` cannot refuse, so it restores.** Git has no `pre-checkout`
hook. `post-checkout` runs after the switch, and per git's own contract a
non-zero exit makes `git checkout` exit non-zero. So the hook prints the
refusal, runs `HK_GIT_SPACE_GUARD=off git checkout -` to put the tree back, and
exits 1. From the operator's side that is a refusal: non-zero exit, HEAD
unmoved, files unchanged.

**3. `pre-merge-commit` alone would never have fired.** Git runs it only when a
merge auto-resolves. A docs/site merge never does — **measured, 8 conflicted
paths**:

```
CONFLICT (modify/delete): backend/server.js deleted in master and modified in HEAD.
CONFLICT (modify/delete): frontend/package.json deleted in master and modified in HEAD.
Automatic merge failed; fix conflicts and then commit the result.
```

When a merge conflicts, git runs `pre-commit` at `git commit` instead. That is
the real interception point, and it is why `pre-commit` exists here. Shipping
only `pre-merge-commit` would have been a guard that could not fire on the one
path the tracker names — that these two are *kept apart only by the convention
that nobody merges*.

---

## Evidence — the refusal, literally

Throwaway clone at `<scratch>/risk09-verify`, root commit `3a1fbe09`,
`hk-docs` = `ab89692` (docs space), `hk-site` = `105e79d` (site space).

```
$ git rev-parse --abbrev-ref HEAD; git rev-parse --short HEAD
hk-docs
ab89692
$ ls -d docs/boardroom
docs/boardroom
$ git checkout hk-site
Switched to branch 'hk-site'

==============================================================================
  REFUSED: this checkout crosses the hellokahwin docs/site boundary.
==============================================================================

  from: docs space   ab89692
  to:   site space   105e79d  (hk-site)

  hellokahwin (docs) and hellokahwin-site are the SAME repository - same
  remote, same root commit 3a1fbe09 - kept apart only by convention. This
  switch replaces the contents of this working tree with the other space.

  RESTORED. You are back on hk-docs at ab89692.
  Nothing was lost. Work in the other tree instead:
    docs -> ~/Documents/Code/hellokahwin/hellokahwin
    site -> ~/Documents/Code/hellokahwin-site

  If you truly mean to cross the boundary in THIS tree:
    HK_GIT_SPACE_GUARD=off git checkout hk-site
==============================================================================

$ echo $?  ->  1
$ git rev-parse --abbrev-ref HEAD; ls -d docs/boardroom; ls -d src
hk-docs
docs/boardroom
ls: cannot access 'src': No such file or directory
```

Exit code 1, HEAD unmoved, `docs/boardroom` still on disk, no `src/`.

## Evidence — the negative control, literally

Ordinary in-space switches are untouched, in **both** spaces:

```
########## NEGATIVE CONTROL (docs -> docs, in-space) ##########
$ git checkout hk-docs2
Switched to branch 'hk-docs2'
exit code: 0
$ git rev-parse --abbrev-ref HEAD; ls -d docs/boardroom
hk-docs2
docs/boardroom

########## NEGATIVE CONTROL (site -> site, in-space) ##########
$ HK_GIT_SPACE_GUARD=off git checkout hk-site   # get into site space deliberately
Switched to branch 'hk-site'
$ git checkout hk-site2
Switched to branch 'hk-site2'
exit code: 0
$ git rev-parse --abbrev-ref HEAD; ls -d src
hk-site2
src
```

`hk-site2` is `docs/plat-10-11-12` — the site-space branch with a `docs/` name.
It passing the negative control is what proves the classifier reads content and
not the branch name.

## Evidence — the full harness, 27 of 27

```
== case 0  the hazard, UNGUARDED (no hooks installed)
  PASS  unguarded cross-space checkout succeeds (0)
  PASS  company record was replaced by site source - hazard confirmed
== case 0b  installing from a CRLF-mangled source
  PASS  CRLF source really has carriage returns (105) - fixture is valid
  PASS  installed hook has zero carriage returns (0)
  PASS  guard installed from CRLF source still refuses (1)
== case 0c  a target path containing a space
  PASS  spaced path resolved to a real tree
  PASS  guard installs into a path with a space (0)
== refusals
  PASS  docs->site checkout exits non-zero (1)
  PASS  docs->site left HEAD on the docs branch (hk-docs)
  PASS  docs/boardroom still on disk - tree restored
  PASS  untracked work survived the refusal
  PASS  detached-HEAD cross-space checkout exits non-zero (1)
  PASS  detached-HEAD refusal restored the branch (hk-docs)
  PASS  site->docs checkout exits non-zero (1)
  PASS  site->docs left HEAD on the site branch (hk-site)
== negative controls  (ordinary work must not be impeded)
  PASS  site->site checkout succeeds (0)
  PASS  docs->docs checkout succeeds (0)
  PASS  in-space 'git checkout -b' succeeds (0)
  PASS  file checkout 'git checkout -- README.md' succeeds (0)
  PASS  ordinary (non-merge) commit succeeds - pre-commit stays silent (0)
== merge path
  PASS  cross-space merge conflicts (8 paths) - pre-merge-commit is never reached
  PASS  resolved cross-space merge commit is refused (1)
==============================================
  RISK-09 guard: 27 passed, 0 failed
==============================================
```

Full run: `aug-31-2026-risk-09-EVIDENCE/verify-guard-run-2026-08-31.txt`
Transcript: `aug-31-2026-risk-09-EVIDENCE/refusal-and-negative-control-transcript.txt`

Reproduce with:

```sh
scripts/git-hooks/verify-guard.sh <scratch-dir> --fresh
```

**No live tree was ever switched across the boundary.** Every destructive case
ran in the throwaway clone, which the harness refuses to run in unless it finds
the `.risk09-throwaway` marker it drops itself.

---

## Install, and why it has not happened yet

**The DoD requires the hook installed in both trees. It is not installed. The
item is therefore not fully closed, and this entry does not claim otherwise.**

The CEO's brief set the ordering explicitly: six agents are running
`git checkout` in `hellokahwin-site` worktrees right now, and a guard that
refuses branch switches, installed mid-sprint, is a live hazard to them. Build
and prove now; install on the green-light.

Both trees are ready — audited 31 Aug, **zero non-sample hooks, no husky, no
`core.hooksPath`** in either, so nothing will be clobbered:

```
=== C:/Users/Ian Ng/Documents/Code/hellokahwin/hellokahwin
  core.hooksPath: ''
  non-sample hooks:
    (end)
  husky dir: absent
=== C:/Users/Ian Ng/Documents/Code/hellokahwin-site
  core.hooksPath: ''
  non-sample hooks:
    (end)
  husky dir: absent
```

### The exact commands, pending green-light

```sh
cd ~/Documents/Code/hellokahwin/hellokahwin
scripts/git-hooks/install-hooks.sh
scripts/git-hooks/install-hooks.sh --check    # must exit 0
```

The default targets are the two live trees. Hooks live in each repository's
**common** git dir, so this one run also covers all **eight** `hellokahwin-site`
worktrees and the `hellokahwin` worktree — verified with `git worktree list`.

### One thing that is still open after install

The hook source is committed on `feat/command-centre-dashboard` (docs space).
It is **not** on `master`, so a fresh clone of the site repo has no
`scripts/git-hooks/` to install from. Closing that needs a small PR putting
`scripts/git-hooks/` onto `master` as well. It is named here rather than left
implicit; it is the CEO's call whether it rides with the green-light or follows.

---

## Retrospective

### 1. What did we learn that is not written down?

**A hook that only guards the obvious command guards nothing.** The brief named
`git checkout`. Building only for that would have shipped a guard that a
`git merge` walks straight past — and the tracker's own text says the merge is
the thing convention was holding back. Enumerating the ways the boundary can be
crossed, rather than implementing the one that was named, is what turned up the
`pre-merge-commit` / `pre-commit` split.

**And the obvious hook for merges is the wrong one.** `pre-merge-commit` reads
like the answer and never fires here, because git skips it whenever the merge
conflicts, and a docs/site merge always conflicts — 8 paths, measured. The hook
that actually fires is `pre-commit`. Nothing in the item description hints at
this; only running the real merge showed it.

**Branch names in this repo actively lie about which space they belong to.**
`docs/plat-10-11-12` is site source. Any guard, script or human rule that keys
off the branch name is wrong on a branch that already exists.

### 2. Which document must change, and who owns the edit?

| Document | Change | Owner |
|---|---|---|
| `docs/boardroom/ceo-memory.md` | the hazard entry says **"STRUCTURAL, STILL UNGUARDED"**. It must carry the guard's state and the exact `--check` command. | **this item — done, see below** |
| `~/Documents/Code/buddy/skillcentral/skills/startsprint/SKILL.md` | add `install-hooks.sh --check` to the dispatch pre-flight, so an uninstalled guard is caught by a command rather than by someone remembering. Also: its three-trees table names `~/orca/workspaces/hellokahwin-site/pillars-ingest-redirects` as "the site code, and where every dispatched engineer works" — **that tree is 42 commits behind master and a UI-01 agent was dispatched into it by mistake this sprint.** | **this item — done, see below** |
| `scripts/git-hooks/README.md` | did not exist | **this item — created** |

**The form matters more than the wording.** The lesson here is not "remember to
install the hook" — that is prose, and Sprint 03's central finding is that prose
does not fire. The form is `install-hooks.sh --check`, which **exits 1** when the
guard is missing, so it can sit in a pre-flight as a gate. The prose in
`ceo-memory.md` exists only to point at the command.

### 3. What did we do twice that we should never repeat?

**Cloned the docs tree twice.** The first throwaway clone silently lost 34 files
to Windows `MAX_PATH` — `Filename too long`, on paths under
`docs/work-done/.../EVIDENCE/`. The test fixture was incomplete and I would have
been measuring a broken clone. `git config core.longpaths true` fixes it, and it
is now set by `verify-guard.sh` when it builds the fixture, so nobody has to
know. **Anyone cloning this repo fresh on Windows needs `core.longpaths`** — that
is a fact about the docs tree, not about my test.

### 4. What did we nearly ship, and what caught it?

**A refusal message giving advice that does not work.** In the detached-HEAD
case the hook printed `HK_GIT_SPACE_GUARD=off git checkout HEAD` — because
`git rev-parse --abbrev-ref HEAD` returns the literal string `HEAD` when
detached. That command is a no-op. Someone following it would have concluded the
override was broken. Caught by running the detached case rather than only the
branch case; fixed by naming the commit instead.

**A harness failure that was the harness's own fault.** The first full run
reported `FAIL ordinary (non-merge) commit succeeds`. The hook was innocent: the
harness had added `RISK09-*` to `.git/info/exclude`, so `git add` staged nothing
and the commit failed with "nothing to commit". A green run with that bug still
present would have looked fine; the **red** run is what exposed it. The fix added
an assertion that the probe file is actually staged — the test now checks itself
before it checks the hook, which is the same discipline as proving a grep on a
line you know matches.

**A CR-stripping guard that stripped nothing.** `git add` warned
`LF will be replaced by CRLF the next time Git touches it` on every hook — this
repo runs `core.autocrlf=true` with no `.gitattributes`. Adding a `.gitattributes`
and CR-stripping in the installer was right, but the code that did the stripping
went in as `tr -d ""`, an empty argument that deletes nothing. Escape sequences
were mangled twice passing through the tool layer before it landed correctly as
`tr -d '\015'`, and `od -c` on the actual bytes is what caught it — reading the
line as rendered showed nothing wrong. **A defence you have not executed is not a
defence**; the fix is now case 0b in the harness, which builds a genuinely
CRLF-mangled source, asserts the fixture really has 105 carriage returns before
trusting the result, and then proves the installed guard still refuses.

**An installer that could not install — and an exit code that hid it.** The very
last check before reporting done was to run the green-light command itself,
`install-hooks.sh --check` with no arguments. It printed:

```
=== /c/Users/Ian
    MISSING tree - skipped
=== Ng/Documents/Code/hellokahwin/hellokahwin
    MISSING tree - skipped
```

The default paths contain a space — `Ian Ng` — and the script carried targets in
a space-joined string, so `for tree in $TARGETS` split two paths into four broken
halves. **Every earlier test passed because the harness always passed the target
as one quoted argument; only the no-argument default was broken, and that is
exactly the form the CEO would have run.** Worse, the failure still exits 1,
which reads as a correct "the guard is not installed" answer. Had I checked the
exit code alone, this ships. Targets now live in the positional parameters, and
case 0c asserts on the *output* for a path containing a space — not on the exit
code, because the exit code was right for the wrong reason.

**And the claim that motivated all of it was wrong on this platform.** I wrote,
in three files, that a CRLF hook "silently does nothing". Then I tested it:
installed a raw CRLF hook directly into `.git/hooks`, ran the hazardous checkout,
and it **refused normally**. Git for Windows' bundled `sh` tolerates the carriage
return. The CR failure is real on Linux and macOS, but it is **not** observed
here, and all three files now say so. The defence is kept as portability
insurance; what changed is that it is no longer justified by a failure nobody
reproduced. This is the Sprint 03 error in miniature — a plausible mechanism,
asserted rather than run.
