# RISK-10 — the boundary guard is now installable from a fresh clone, and the fixture question is decided

**Sprint:** 05 · **Item:** `RISK-10` · 2 points · track `risk`
**Date:** 01 September 2026
**Status:** DoD met in full, from a throwaway fresh clone. Evidence below is
pasted from that clone, not from an existing tree.

Shipped on both lines of the repository: `master` (PRs
[#35](https://github.com/ianngkb/hellokahwin/pull/35),
[#36](https://github.com/ianngkb/hellokahwin/pull/36),
[#39](https://github.com/ianngkb/hellokahwin/pull/39), merged at `55e53c7`) and
`feat/command-centre-dashboard` (`e7f0ebc`, `e15635d`).

---

## The measurement that opened the item, re-measured

```
$ git ls-tree -r --name-only origin/master -- scripts/git-hooks | wc -l
0
$ git ls-tree -r --name-only origin/feat/command-centre-dashboard -- scripts/git-hooks | wc -l
7
```

The guard was real and installed across 15 live site trees, and the documented
install command named a path that does not exist on the branch a clone lands on.
After this item, from the throwaway clone:

```
$ git ls-tree -r --name-only origin/master -- scripts/git-hooks
scripts/git-hooks/.gitattributes
scripts/git-hooks/README.md
scripts/git-hooks/install-hooks.sh
scripts/git-hooks/post-checkout
scripts/git-hooks/pre-commit
scripts/git-hooks/pre-merge-commit
scripts/git-hooks/verify-guard.sh
$ git ls-tree -r --name-only origin/master -- scripts/git-hooks | wc -l
7
```

**The three hooks are byte-identical to the docs branch** — blobs `11762a8`,
`744f250`, `ed3b285` on both — so putting them on `master` could not disturb the
guard already installed in the live trees. Every `install-hooks.sh` run in the
transcript below reports both of those trees `up to date`, and nothing was
written to either.

---

## The decision RISK-09 left open, made

RISK-09's *remaining gap* listed five steps and said step 4 was the only one
that was not a straight copy: `verify-guard.sh` needs a **docs-space** commit
for its fixture, and on `master` the docs branch is not checked out. It offered
two options — fetch one, or accept that the harness runs from the docs tree only
and say so in the README.

**Neither was taken. Both are wrong for the same reason:** the second makes the
harness unrunnable from the branch a newcomer actually has, and the first, done
naively, means hardcoding `feat/command-centre-dashboard` — a branch name, in a
repository where branch names lie.

What was implemented instead, and is written at the top of `verify-guard.sh` and
in `scripts/git-hooks/README.md`:

1. **No branch name is ever trusted.** `docs/plat-10-11-12` is site source and
   `feat/command-centre-dashboard` is the company record. A name rule is wrong
   today, on branches that already exist.
2. **Every ref the clone can see is classified by tree content**, with
   `hk_space()` **extracted verbatim by `sed`** from the shipped `post-checkout`.
   Extracted, not retyped, so the harness cannot drift from the rule the guard
   applies. The harness asserts the extraction worked before it trusts it — it
   counts the `cat-file` probes it pulled out and refuses to continue below two.
3. **A clone carrying only one space** (`--single-branch`, `--depth`) makes the
   harness fetch the true upstream once and classify again.
4. **If a space is still missing it exits 2 having run nothing**, printing every
   ref it looked at and how each classified. It does not skip the case and go
   green. The brief was explicit about this and it is the part worth defending: a
   harness that passes because it could not find its own fixture is worse than no
   harness, because it is believed.
5. **The two negative controls are branches created inside the throwaway clone
   with names that contradict their content** — `docs/risk10-site-probe` holds
   site source, `feat/risk10-docs-probe` holds the company record. A name-based
   classifier fails those two cases by construction. RISK-09 proved the same
   point with `docs/plat-10-11-12`, which works only while that branch exists;
   this proves it from inside the harness.

Resolution on a real run, printed every time so the fixture is never implicit:

```
== fixture resolution  (by tree content; no branch name is trusted)
  PASS  hk_space() extracted verbatim from post-checkout (3 cat-file probes)
  refs classified : 36   docs=6  site=30
  docs fixture    : e15635d  <- refs/remotes/gh/feat/command-centre-dashboard
  site fixture    : 55e53c7  <- refs/remotes/gh/master
  docs control    : 96771ab  <- refs/remotes/gh/feat/cont-07-hantaran  as feat/risk10-docs-probe
  site control    : b937ca7  <- refs/remotes/gh/docs/plat-10-11-12  as docs/risk10-site-probe
  PASS  docs fixture classifies docs (docs)
  PASS  site fixture classifies site (site)
  PASS  branch NAMED docs/risk10-site-probe classifies (site)
  PASS  branch NAMED feat/risk10-docs-probe classifies (docs)
```

`feat/cont-07-hantaran` classifying `docs` is not a special case anybody wrote
down — it is what content classification finds, and it is the point.

### The hard-fail path was run, not asserted

A source repo was cloned `--single-branch` off a site-space branch, into a bare
repo that carries nothing else, so neither the local refs nor the upstream can
supply a docs-space commit. The harness ran **zero cases** and exited 2:

```
==============================================================================
  FIXTURE UNAVAILABLE - NO CASE WAS RUN. This is not a pass.
==============================================================================
  This harness needs one docs-space commit AND one site-space commit.
  It classifies by tree content (next.config.ts / docs/boardroom /
  frontend), never by branch name.

  searched     : refs/remotes/gh/*, refs/remotes/src/*, refs/remotes/up/*
  found        : docs=0  site=3  of 3 refs

    site     refs/remotes/gh/ianng89/risk10-hooks
    site     refs/remotes/src/ianng89/risk10-hooks
    site     refs/remotes/up/ianng89/risk10-hooks
==============================================================================
EXIT: 2
```

Full run: `sep-01-2026-risk-10-EVIDENCE/fixture-unavailable-exit2-2026-09-01.txt`

---

## The second thing the straight copy would have shipped broken

`install-hooks.sh` with no arguments installed into two hardcoded
home-directory paths. On the machine those trees exist on, that is right. From a
fresh clone it is **the wrong thing entirely**: the documented command installs
the guard into somebody else's checkouts and not into the tree the operator is
standing in. On a machine that has neither tree it reports two `MISSING tree`
lines and exits 1, which reads like a correct "not installed" answer.

Changed: with no arguments the **first** default target is the repository the
script lives in. The two well-known trees are still targeted when they exist, so
the fleet-wide gate is unchanged. A well-known tree that is absent is skipped
**without** setting the exit code — it is an absent default, not a failed target
— while a tree named on the command line still fails loudly. The same repository
reached by a second spelling of its path is deduped by comparing
`--git-common-dir`, which is what stops this worktree and
`~/Documents/Code/hellokahwin-site` being installed into twice.

That last change has a consequence, and it is written into the pre-flight it
affects rather than left to be discovered — see the correction below.

---

## DoD evidence — pasted from the throwaway fresh clone

Full transcript:
`sep-01-2026-risk-10-EVIDENCE/freshclone-transcript-2026-09-01.txt` (295 lines).

```
$ git clone -c core.longpaths=true https://github.com/ianngkb/hellokahwin.git risk10-freshclone
EXIT CODE: 0
$ git rev-parse --abbrev-ref HEAD
master
$ git log --oneline -1
55e53c7 Merge pull request #39 from ianngkb/ianng89/risk10-hooks
$ git rev-list --max-parents=0 HEAD
3a1fbe091d17c3d1cce106901ec8666712e74e28
$ ls -d src next.config.ts
next.config.ts
src
$ ls docs/boardroom
ls: cannot access 'docs/boardroom': No such file or directory
```

### The documented install command, before and after

```
$ scripts/git-hooks/install-hooks.sh --check
=== .../risk10-freshclone
    post-checkout: NOT INSTALLED
    pre-merge-commit: NOT INSTALLED
    pre-commit: NOT INSTALLED
=== /c/Users/Ian Ng/Documents/Code/hellokahwin/hellokahwin
    post-checkout: up to date / pre-merge-commit: up to date / pre-commit: up to date
=== /c/Users/Ian Ng/Documents/Code/hellokahwin-site
    post-checkout: up to date / pre-merge-commit: up to date / pre-commit: up to date
EXIT CODE: 1

$ scripts/git-hooks/install-hooks.sh
=== .../risk10-freshclone
    post-checkout: installed / pre-merge-commit: installed / pre-commit: installed
=== /c/Users/Ian Ng/Documents/Code/hellokahwin/hellokahwin      (up to date)
=== /c/Users/Ian Ng/Documents/Code/hellokahwin-site             (up to date)
EXIT CODE: 0

$ scripts/git-hooks/install-hooks.sh --check
    ... all three trees: up to date
EXIT CODE: 0
```

**`install-hooks.sh --check` exits 0 from the throwaway clone.** That is the DoD
gate. Both live trees report `up to date` throughout, so no live tree was
written.

### REFUSAL — a cross-space checkout, in that clone

```
$ git rev-parse --short HEAD; ls -d next.config.ts; ls -d docs/boardroom
55e53c7
next.config.ts
ls: cannot access 'docs/boardroom': No such file or directory

$ git checkout origin/feat/command-centre-dashboard
HEAD is now at e15635d RISK-10: bring case 0e across, so the drift check exists on both lines

==============================================================================
  REFUSED: this checkout crosses the hellokahwin docs/site boundary.
==============================================================================

  from: site space   55e53c7
  to:   docs space   e15635d  (e15635d)

  hellokahwin (docs) and hellokahwin-site are the SAME repository - same
  remote, same root commit 3a1fbe09 - kept apart only by convention. This
  switch replaces the contents of this working tree with the other space.

  RESTORED. You are back on master at 55e53c7.
  Nothing was lost. Work in the other tree instead:
    docs -> ~/Documents/Code/hellokahwin/hellokahwin
    site -> ~/Documents/Code/hellokahwin-site

  If you truly mean to cross the boundary in THIS tree:
    HK_GIT_SPACE_GUARD=off git checkout e15635d
==============================================================================

EXIT CODE: 1
$ git rev-parse --abbrev-ref HEAD; git rev-parse --short HEAD
master
55e53c7
$ ls -d next.config.ts src; ls -d docs/boardroom
next.config.ts
src
ls: cannot access 'docs/boardroom': No such file or directory
```

Exit 1, HEAD unmoved, the site source still on disk, no `docs/boardroom`.

### PERMITTED — an in-space checkout, same clone

`origin/docs/plat-10-11-12` is **site source with a `docs/` name**, which makes
it the strongest available in-space control: a guard reading names would refuse
it.

```
$ git checkout origin/docs/plat-10-11-12
HEAD is now at b937ca7 docs(plat-10/11/12): three tools that lied, and what each one was lying about
EXIT CODE: 0
$ git rev-parse --short HEAD; ls -d next.config.ts src
b937ca7
next.config.ts
src
$ git checkout master
Switched to branch 'master'
EXIT CODE: 0
```

### The harness, run from the fresh clone

```
  RISK-09/10 guard: 38 passed, 0 failed
EXIT CODE: 0
```

RISK-09's 27 cases, plus 11 added here: four asserting the fixture resolved by
content (including the two contradictory-name probes), five in case 0d for the
fresh-clone install path, one for the extraction of `hk_space()`, and case 0e.

---

## Two copies now exist, so drift is checked by a case rather than a paragraph

Putting `scripts/git-hooks/` on `master` as well as the docs branch creates a
second copy. Two copies drift. **Case 0e** compares the committed blobs of all
seven files on the site-space ref and the docs-space ref the harness already
resolved — no working tree, so no line-ending noise — and fails naming the file
and both shas.

It was run against the real failing case. Between merging case 0e to `master`
and porting it across, the two lines genuinely disagreed by exactly one file:

```
== case 0e  the guard is identical on both lines of this repo (RISK-10)
  FAIL    verify-guard.sh: site 65754da0aec37c3e09b697f6e66374712a487300 != docs afbaafae699e05c8d6c892b9b57060c9ca5ff03a - the two copies have drifted
  RISK-09/10 guard: 37 passed, 1 failed
```

Then the port closed it. Full run:
`sep-01-2026-risk-10-EVIDENCE/case-0e-drift-caught-2026-09-01.txt`

---

## Corrections to things already written down

**1. `docs/work-done/README.md` — RISK-09's row.** Its status read *"completed —
hooks not yet on `master`, so a fresh clone still cannot install them."* That is
no longer true and has been corrected in this commit. The evidence wins and the
file gets corrected at source.

**2. `~/Documents/Code/buddy/skillcentral/skills/startsprint/SKILL.md` — the
dispatch pre-flight.** RISK-09 put this in it:

```
~/Documents/Code/hellokahwin/hellokahwin/scripts/git-hooks/install-hooks.sh --check
```

and read exit 0 as *"installed in both trees"*. **After this item that reading is
wrong.** A well-known tree that is absent is now skipped instead of failing, so a
no-argument `--check` can exit 0 on a machine where one of the two trees does not
exist at all. The pre-flight now names both trees explicitly, which restores the
strict reading, and the change is explained in place so nobody re-simplifies it:

```
~/Documents/Code/hellokahwin/hellokahwin/scripts/git-hooks/install-hooks.sh --check \
  ~/Documents/Code/hellokahwin/hellokahwin \
  ~/Documents/Code/hellokahwin-site
```

Run, not asserted — both present exits 0; a named tree that does not exist prints
`MISSING tree - skipped` and exits 1. Committed and pushed to buddy `main` at
`1a9901f`.

---

## Retrospective

### 1. What did we learn that is not written down?

**"Copy the files to the other branch" was 20 minutes of the estimate and none of
the risk.** RISK-09 sized this as steps 1–3 and 5 being trivial and step 4 being
the real decision. That was right about step 4 and wrong about the rest: the
straight copy would have shipped an installer whose documented no-argument form
installs into the wrong repository from the only starting point this item exists
to support. The copy was not the trivial part; it was the part where nobody had
asked what the script does when the assumptions it was written under are gone.

**A guard that lives on one branch of a two-space repository is only half
installed, and the missing half is the one that matters.** Every existing tree
had the guard because `.git/hooks` is shared and someone ran the installer once.
The only person who could not get it was the one starting from `git clone` —
which is precisely the person most likely to run `git checkout master` in the
docs tree, because they have not yet learned that this repository is two things.

**Duplicating a file across branches is a real cost and it needs a firing check,
not a note.** The moment `scripts/git-hooks/` existed twice, "keep them in sync"
became a thing a human has to remember. Case 0e turns that into a failing test in
the harness that already runs. The paragraph in the README explains the rule;
case 0e is the rule.

### 2. Which document must change, and who owns the edit?

| Document | Change | Owner |
|---|---|---|
| `~/Documents/Code/buddy/skillcentral/skills/startsprint/SKILL.md` | exit 0 from a no-argument `--check` no longer means "both trees". Name both trees in the pre-flight command. | **this item — done, pushed as `1a9901f`** |
| `docs/work-done/README.md` | RISK-09's row still says a fresh clone cannot install the guard | **this item — done, in this commit** |
| `scripts/git-hooks/README.md` | the fixture decision, the new default-target rule, and why the guard is committed on both lines | **this item — done, on both branches** |

The executable half, which is what actually holds: **case 0d** fails if `master`
ever loses `scripts/git-hooks/`, and **case 0e** fails the moment the two copies
disagree. Both run inside `verify-guard.sh`, which is already the command the
README tells you to run. The prose exists to explain them.

### 3. What did we do twice that we should never repeat?

**Read from the wrong repository because `GIT_DIR` was exported.** Porting the
files to the docs branch had to be done without touching the docs working tree
(another session is working in it and it was dirty), so the commit was built with
plumbing — `hash-object`, `update-index`, `commit-tree`. With `GIT_DIR` exported
to the docs repo, `git -C <site-worktree> show HEAD:...` **ignored `-C` entirely**
and read the docs repo's HEAD. It returned the old file, re-hashed it to the same
blob, and produced a commit that changed nothing while printing three plausible
sha lines. It was caught only by `git diff --stat base tree` printing nothing.
**When `GIT_DIR` is set, `-C` is decoration.** Use `env -u GIT_DIR` for every read
that is meant to come from somewhere else.

**Hashed a working-tree file with `--no-filters` and got the whole file back as a
diff.** The same plumbing route into the buddy repo produced *"722 insertions,
705 deletions"* for a 19-line edit, because the file on disk is CRLF
(`core.autocrlf=true`) and the blob in the repo is LF. `--no-filters` is correct
when the bytes come out of a git object and wrong when they come off a Windows
disk. Caught by the same `diff --stat`. **`git diff --stat <base> <tree>` before
`commit-tree` is the cheap check that catches both of these**, and it is now the
habit.

**Cloned into a long path without `core.longpaths`, twice.** RISK-09 recorded
this exact failure. It bit again here, and the second time it did something worse
than fail — see below.

### 4. What did we nearly ship, and what caught it?

**A test that blamed the code for its own broken fixture.** Case 0d clones the
repo it lives in and asserts the no-argument install works. Run from the
worktree, it passed. Run from the fresh clone — which lives at a much longer path
— the clone's checkout failed with `Filename too long`, so
`scripts/git-hooks/install-hooks.sh` was not there, and the case reported:

```
FAIL  clone of the source repo has no scripts/git-hooks/ - master is missing the guard
```

`master` had the guard. The message was a confident, specific, entirely wrong
claim about the exact thing this item exists to fix, and it was produced by the
item's own test. It now sets `core.longpaths` on that clone, and distinguishes
three outcomes that used to collapse into one: the clone failed (broken fixture,
reported with git's own error and explicitly *not* a verdict on the guard), the
clone succeeded but carries no `scripts/git-hooks/` (the branch really is missing
it), or it works.

Caught by **running the harness from the fresh clone rather than only from the
worktree it was written in**. The whole item is about the fresh clone being a
different environment; the test was not run there until the end, and that is
where it was wrong.

**A harness that could have gone green with no fixture.** The exit-2 path was
written, and then run against a repository that genuinely cannot supply a
docs-space ref. Writing the branch is not evidence the branch is reachable —
RISK-09's `tr -d ""` shipped as a defence that deleted nothing, and this is the
same shape.

**A `--check` that would have kept exiting 0 while quietly meaning something
weaker.** The default-target change was made to fix the fresh clone and it
silently loosened the CEO's dispatch gate. Nothing failed; the gate would have
gone on printing exit 0. It was caught by asking what the *other* callers of this
script now get, which is the same question RISK-09's own retrospective ended on:
ask what a guard does on the paths it is not meant to fire on.
