# RISK-09 — the shared-repo boundary guard, built, proven, and INSTALLED IN BOTH TREES

**Sprint:** 04 · **Item:** `RISK-09` · 3 points · track `risk`
**Date:** 31 August 2026
**Status:** **done.** Built and proven in a throwaway clone (27/27), then
installed into both live trees on the owner's green-light and re-proven against
the *installed* hooks — refusal and in-space control quoted from **each** repo.
`install-hooks.sh --check` exits 0 in both.

One thing remains open and is named rather than buried: the hooks are committed
on `feat/command-centre-dashboard` only, so a fresh clone of the site repo has
nothing to install from. The concrete fix is written out under
*The remaining gap* below.

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

## Installed — and the pre-flight that decided it was safe

The owner green-lit installation while **15 site trees** were live (the main
checkout plus 14 `git worktree` trees — it was 9 when this item started; the
sprint grew). A guard that refuses branch switches, dropped into a shared
`.git/hooks` mid-sprint, is a real hazard to running agents, so the question was
answered with measurements before anything was written.

**1. Could an in-space switch by a running agent trigger a refusal? No.** Every
live worktree HEAD classifies `site`, using `hk_space()` extracted verbatim from
the shipped `post-checkout` with `sed` rather than retyped:

```
  hellokahwin-site      a7ae51f  site      ui07-label-clip       00e7267  site
  pillars-ingest-...    06a377b  site      ui08-attrib-link      a06a009  site
  rights01-credits      0d9deb5  site      ui09-search-a11y      8b1ee87  site
  ui-01-ship            105e79d  site      ui10-measure          01d24a1  site
  ui01-srow             ef1716e  site      ui11-tap-targets      61a505f  site
  ui02-nav              d934570  site      ui12-thumb-geometry   9302658  site
  ui03-hero             7a746d2  site
  ui05-category-images  c1632d1  site
  ui06-layout-gate      c2215ba  site
```

Positive control, so `site` is earned and not a default: `git cat-file -e
a7ae51f:next.config.ts` succeeds. All **27** local branches in the site repo
also classify `site`.

(Those shas are the pre-flight snapshot. Several moved while this ran —
`ui08-attrib-link` `66cab1f`→`a06a009`, `ui11-tap-targets` `61a505f`→`b060c84` —
because the agents were committing, which is the point: this was measured on a
sprint in motion, not a frozen one.)

**2. `pre-commit` now runs on every commit in 15 trees. Does it break any of
them?** Stress-tested in the throwaway clone with the hooks installed —
**every one exit 0**: ordinary commit, `--amend`, cherry-pick
(`CHERRY_PICK_HEAD`, no `MERGE_HEAD`), rebase, and **commit inside a linked
worktree**, which is the shape 14 of the 15 trees actually have.

**3. Do linked worktrees even share the installed hooks?** Yes, and that cuts
both ways — it is why one install covers 15 trees, and why a bad hook would have
broken all 15. Proven: a linked worktree's
`git rev-parse --git-common-dir` resolves to the main repo's `.git`, and the
refusal fires from inside a linked worktree.

**4. `git worktree add` of a cross-space branch is deliberately NOT refused.**
`post-checkout` gets a null previous HEAD and exits early. That is correct:
adding a new worktree overwrites nothing, and it is the legitimate way to hold
both spaces at once. Only switching an *existing* tree destroys anything.

**5. Line endings.** `core.autocrlf=true` in the docs repo, but all installed
hooks are LF-clean — `CR bytes=0`, shebang `#!/bin/sh\n` verified with `od -c`
in both trees. This was the failure mode that could have broken every commit for
every agent, so it is stated as measured bytes rather than as intent.

### Installed

```
=== /c/Users/Ian Ng/Documents/Code/hellokahwin/hellokahwin
    post-checkout: installed / pre-merge-commit: installed / pre-commit: installed
=== /c/Users/Ian Ng/Documents/Code/hellokahwin-site
    post-checkout: installed / pre-merge-commit: installed / pre-commit: installed
INSTALL EXIT: 0
--check EXIT: 0      (0 = installed in both)
```

After the work, all 15 site worktrees are back at their own HEADs, none moved by
me, and nothing of mine leaked into any of them.

## Proof against the INSTALLED hooks

The destructive case cannot be run in a live tree — that operation is the hazard
itself. Instead each demonstration ran in a **temporary detached worktree of the
live repo**, which shares the repository's `.git/hooks`; the hook file it used
was confirmed **byte-identical** to the installed one with `cmp`. Both probe
worktrees were removed afterwards. This is equivalent because the hook under
test is the same file, invoked by the same git, in the same repository.

### Refusal — docs repo

```
$ git rev-parse --short HEAD; ls -d docs/boardroom
1c16969
docs/boardroom
$ git checkout origin/master          # origin/master is the SITE source
Previous HEAD position was 1c16969 UI-06: the rendered-layout gate, its evidence, and the two rules it changed
HEAD is now at c2215ba Merge pull request #21 from ianngkb/ianng89/ui06-layout-gate

==============================================================================
  REFUSED: this checkout crosses the hellokahwin docs/site boundary.
==============================================================================

  from: docs space   1c16969
  to:   site space   c2215ba  (c2215ba)

  hellokahwin (docs) and hellokahwin-site are the SAME repository - same
  remote, same root commit 3a1fbe09 - kept apart only by convention. This
  switch replaces the contents of this working tree with the other space.

  RESTORED. You are back on HEAD at 1c16969.
  Nothing was lost. Work in the other tree instead:
    docs -> ~/Documents/Code/hellokahwin/hellokahwin
    site -> ~/Documents/Code/hellokahwin-site

  If you truly mean to cross the boundary in THIS tree:
    HK_GIT_SPACE_GUARD=off git checkout c2215ba
==============================================================================

EXIT CODE: 1
$ git rev-parse --short HEAD; ls -d docs/boardroom; ls -d src
1c16969
docs/boardroom
ls: cannot access 'src': No such file or directory
```

### In-space control — docs repo, exit 0

```
$ git checkout origin/feat/cont-08-nisbah      # another DOCS-space commit
Previous HEAD position was 1c16969 UI-06: the rendered-layout gate, its evidence, and the two rules it changed
HEAD is now at 5105700 docs(cont-08): work-done log with Stage 9 retrospective, and the two edits it names
EXIT CODE: 0
$ git rev-parse --short HEAD; ls -d docs/boardroom
5105700
docs/boardroom
```

### Refusal — site repo

```
$ git rev-parse --short HEAD; ls -d src
a7ae51f
src
$ git checkout origin/feat/command-centre-dashboard    # the DOCS space
Previous HEAD position was a7ae51f Merge pull request #19 from ianngkb/ianng89/ui06-layout-gate
HEAD is now at 1c16969 UI-06: the rendered-layout gate, its evidence, and the two rules it changed

==============================================================================
  REFUSED: this checkout crosses the hellokahwin docs/site boundary.
==============================================================================

  from: site space   a7ae51f
  to:   docs space   1c16969  (1c16969)

  hellokahwin (docs) and hellokahwin-site are the SAME repository - same
  remote, same root commit 3a1fbe09 - kept apart only by convention. This
  switch replaces the contents of this working tree with the other space.

  RESTORED. You are back on HEAD at a7ae51f.
  Nothing was lost. Work in the other tree instead:
    docs -> ~/Documents/Code/hellokahwin/hellokahwin
    site -> ~/Documents/Code/hellokahwin-site

  If you truly mean to cross the boundary in THIS tree:
    HK_GIT_SPACE_GUARD=off git checkout 1c16969
==============================================================================

EXIT CODE: 1
$ git rev-parse --short HEAD; ls -d src; ls -d docs/boardroom
a7ae51f
src
ls: cannot access 'docs/boardroom': No such file or directory
```

### In-space control — site repo, exit 0

```
$ git checkout origin/feat/ux-04-lqip          # another SITE-space commit
Previous HEAD position was a7ae51f Merge pull request #19 from ianngkb/ianng89/ui06-layout-gate
HEAD is now at 6d02fe4 docs(ux-04): work-done log with Stage 9 retrospective, and the edit it names
EXIT CODE: 0
$ git rev-parse --short HEAD; ls -d src next.config.ts
6d02fe4
next.config.ts
src
```

And an ordinary commit in the site repo, which is what 15 trees do all day:
`EXIT CODE: 0`, `dde1a5d risk09: install probe`. That commit was made on a
detached HEAD in the probe worktree and died with it —
`git branch -a --contains dde1a5d` returns nothing.

Full transcript: `aug-31-2026-risk-09-EVIDENCE/installed-hooks-verification-2026-08-31.txt`

## The remaining gap, concretely

`scripts/git-hooks/` is committed on `feat/command-centre-dashboard` only. The
consequence is precise and limited: **the installed hooks work today, in both
trees, for everyone using these checkouts.** What does not work is a *fresh
clone* of the site repo — `git clone` then `scripts/git-hooks/install-hooks.sh`
fails, because on `master` that path does not exist. New worktrees are fine;
they inherit the installed hooks from the common git dir.

The fix, in the order it should happen:

1. Branch from `master` in `hellokahwin-site`, e.g. `chore/risk09-hooks-on-master`.
2. Copy the six files from the docs branch — they are self-contained and have no
   dependency on anything in the docs tree:
   ```sh
   git --git-dir=<docs>/.git show feat/command-centre-dashboard:scripts/git-hooks/post-checkout > scripts/git-hooks/post-checkout
   ```
   and the same for `pre-commit`, `pre-merge-commit`, `install-hooks.sh`,
   `verify-guard.sh`, `README.md`, `.gitattributes`.
3. **`.gitattributes` must land with them**, or `master`'s checkout reintroduces
   CRLF. `git ls-files --stage` must show mode `100755` on the four executables;
   `core.filemode` is `false` on this machine, so set it explicitly with
   `git update-index --chmod=+x`.
4. `verify-guard.sh` points its fixture at the repo it lives in. On `master` it
   would need `hk-docs` to resolve to a docs-space ref — either fetch one, or
   accept that the harness runs from the docs tree only and say so in the README.
   **This is the one part that is not a straight copy.**
5. Open the PR against `master`; it touches nothing any other item touches.

Sizing it honestly: steps 1–3 and 5 are maybe twenty minutes. Step 4 is a real
decision about where the harness lives. **It is a separate item, not a leftover
of this one** — and the guard is installed and working meanwhile.

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

**Installing a shared hook is a fleet-wide change, and it should be argued like
one.** `.git/hooks` is shared by every worktree, so this install reached 15 trees
at once. That is the whole value — one command guards all of them — and it is
also the whole risk: a `pre-commit` that throws breaks every agent's commit
simultaneously. The pre-flight that mattered was not "does the guard refuse"
but "does it stay silent through `--amend`, cherry-pick, rebase, and a commit
inside a linked worktree". **Ask what a guard does on the paths it is *not* meant
to fire on, and test those, because that is where the blast radius is.**

**A guard's non-firing cases are design, not omission.** `git worktree add` of a
cross-space branch is not refused, and should not be — nothing is overwritten,
and it is the legitimate way to hold both spaces at once. Writing down *why* a
guard stays quiet is what stops the next person "fixing" it into something that
blocks honest work and then gets deleted.

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

**Split a path on the space in "Ian Ng" — twice, in two different tools, both
times producing a confident wrong answer rather than an error.** First in
`install-hooks.sh` (`for tree in $TARGETS`), where it reported every tree
"MISSING" and still exited 1, which reads like a correct "not installed". Then
again during the install pre-flight, in a throwaway `git worktree list | while
read -r path sha rest` — which classified **all 15 worktrees as `unknown`**, a
uniform and entirely plausible result that would have led straight to
"installation is safe, nothing classifies" for completely the wrong reason.

Both were caught by the output looking odd, not by an exit code. The rule that
would have caught them the first time: **on this machine every real path contains
a space, so any `for x in $VAR` or bare `read` over paths is a bug.** Use
positional parameters, or `--porcelain` output with an explicit delimiter.

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
