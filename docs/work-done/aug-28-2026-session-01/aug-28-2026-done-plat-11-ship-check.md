# PLAT-11 — the ship check is a command with an exit code now

**Sprint 03 · platform · 2pt · owner BMAD · 28 Aug 2026**
**Shipped:** buddy PR [#47](https://github.com/ianng89/buddy/pull/47), squash-merged to `main` as `11e40e6`.

## Claim

Ancestry is gone from the ship check and from the file that described it.
`skillcentral/skills/startsprint/scripts/ship-check.sh` decides shipped-ness from
positive evidence, makes `git rev-list @{u}..HEAD` mandatory, and exits non-zero
as a refusal. Both real Sprint 02 failures were reproduced against it and both
now come out right.

## What was wrong

Two failures, opposite in shape.

**PLAT-05 — a false negative.** `git merge-base --is-ancestor origin/feat/…
origin/main` returned false for work that had shipped through a squash-merged
PR. A squash merge creates a *new* commit containing the branch's changes; the
branch tip never becomes an ancestor of the default branch, so that test returns
"not merged" forever no matter how many times the work lands. The item was
reported UNSHIPPED. That direction is the dangerous one — the correct response
to "unshipped" is to ship it again, and on this codebase a re-triggered
revalidate re-creates a sitewide title defect within 14 minutes.

**PLAT-06 — no signal at all.** The item was genuinely unshipped at 6 commits
unpushed and 7 ahead of the default branch. `git status` reads perfectly clean in
that state, and nothing in the sprint's tooling looked at the upstream, so no
check said anything.

A check that is wrong on the item that shipped and silent on the item that did
not is not a gate; it is noise with a green tick.

And the part that decides the shape of the fix: **the squash-merge trap was
already documented in `startsprint/SKILL.md`, in capitals, with a worked
example, before Sprint 02 ran.** It shipped anyway. Murat's finding at that retro
is the whole reason this is a script:

> *"Not 'we lacked a check' — we HAD one, and running it was left to memory.
> A gate you have to remember is a suggestion."*

## What changed

**New: `skillcentral/skills/startsprint/scripts/ship-check.sh`.** Already live at
`~/.claude/skills/startsprint/scripts/ship-check.sh` — the skill directory is a
symlink, so no `install.sh` re-run was needed.

```
bash ~/.claude/skills/startsprint/scripts/ship-check.sh \
  --item PLAT-11 --repo ~/Documents/Code/buddy \
  --path <a file the work added> \
  --surface "what you checked on the page/row/URL, and what it needs to reproduce"
```

| Check | Fails when |
|---|---|
| `git fetch origin` | the fetch fails — a stale `origin/<default>` turns every check below into a false negative, so this is a failure and not a warning |
| merge-style census | never; it **prints** how the repo merges so nobody has to remember |
| `git status --porcelain` | this item's own `--path` files are uncommitted |
| `git rev-list --count @{u}..HEAD` | there are unpushed commits, **or the branch has no upstream at all** |
| `git cat-file -e origin/<default>:<path>` | a file the work added is not on the default branch |
| `git log` + `gh pr list --state merged` | corroboration; absence is noted, not scored |
| any positive evidence at all | **none was offered** — an absent test is not a passed test |

Three decisions worth recording:

- **"Ahead of the default branch" is printed and scored at zero.** It is the same
  trap in different arithmetic: a squash-merged branch is ahead forever.
- **Dirt is fatal by default and can only be narrowed by being specific.** buddy's
  main checkout is a single shared worktree, so another agent's work-in-progress
  sits in the same `git status` as yours. A gate that fails on somebody else's
  file gets switched off by the first person it annoys. Name the item's files
  with `--path` and unrelated dirt drops to a warning that is still printed in
  full; name nothing and every uncommitted path counts against you.
- **`--surface` is a required argument.** The script cannot verify it and does not
  pretend to. Its job is to make you type the sentence, because *"if you cannot
  name what you checked, do not mark it done"* was true as advice and got skipped
  as advice.

**`startsprint/SKILL.md`:** the ancestry command is **deleted**, not annotated.
Step 4's three-command list is replaced by the script; Step 5 chains it with
`&&` before `set-state … done`, so the gate cannot be skipped by forgetting it.
The section that used to carry the failing command now says why it is gone, and
records what the old list got wrong: it offered `git rev-list --count
origin/<default>..HEAD` **labelled as "unpushed commits", which it is not** —
that counts commits ahead of the default branch. Unpushed is `@{u}..HEAD`, a
different ref pair answering a different question, and it appeared nowhere.
That is precisely why PLAT-06 passed in silence.

## Evidence

`aug-28-2026-plat-11-EVIDENCE/`

**Case A — PLAT-05, the squash-merge false negative** (`plat11-case-a-plat05.txt`).
The real surviving branch:

```
$ git merge-base --is-ancestor origin/feat/plat-05-document-store origin/main
ancestor: FALSE   (reads as UNSHIPPED)

$ ship-check.sh --item PLAT-05 --branch feat/plat-05-document-store …
  ✓ pass  origin/main:apps/web/app/(app)/docs/href.ts exists (1120 bytes)
  ✓ pass  origin/main:packages/db/src/repositories/documents.ts exists (16119 bytes)
  ✓ pass  4 commit(s) on origin/main mention 'PLAT-05'
  ✓ pass  merged PR(s) matching 'PLAT-05':  #38, #41
== SHIPPED: PLAT-05. 4 check(s) passed, 0 failed. ==
EXIT CODE = 0
```

**Case B — PLAT-06, unshipped with a clean status** (`plat11-case-b-exact.txt`).
PLAT-06's branch ref was deleted after it merged, so the branch itself cannot be
resurrected; its **state** is reproduced exactly — 6 unpushed, 7 ahead, and
`git status --porcelain` empty:

```
status: []   <- EMPTY, the tree reads perfectly clean
unpushed (git rev-list --count @{u}..HEAD): 6
ahead of main:                             7

$ ship-check.sh --item PLAT-06 …
  ✓ pass  working tree clean (git status --porcelain is empty)
  ✗ FAIL  6 unpushed commit(s) on feat/plat-06-spaces
  ✗ FAIL  origin/main:spaces.ts DOES NOT EXIST
  ✗ FAIL  NO POSITIVE EVIDENCE OF ANY KIND
== REFUSED: PLAT-06 is NOT proven shipped. 3 check(s) failed. ==
EXIT CODE = 1
```

The `✓ pass` on the clean tree sitting directly above three failures is the point:
that pass is the entire signal the old check had.

**Case B, live** (`plat11-case-b-live.txt`). Not a reconstruction — a branch in
this checkout right now. `feat/plat-07-cli-readback` carries **4 unpushed
commits** with a clean-reading `git status`, and one of them is
`470a37b docs(startsprint): the ship check had a false negative on squash-merged
repos`. The documentation of this very defect has been sitting on one laptop.
Exit 1.

**The dogfood** (`plat11-selftest.txt`). Run against its own shipping:

```
$ git merge-base --is-ancestor origin/feat/plat-10-11-12-tracker-truth origin/main
ancestor FALSE   <- would call this PR unshipped

$ ship-check.sh --item PLAT-10 --branch feat/plat-10-11-12-tracker-truth …
== SHIPPED: PLAT-10. 4 check(s) passed, 0 failed. ==   EXIT = 0
```

**The false-pass check the DoD asked for.** buddy uses **both** merge styles —
10 squash-shaped `(#NN)` commits and 35 `Merge pull request` commits on
`origin/main`. That mixture is the worst case, because ancestry is then right
often enough to be believed and wrong exactly when it matters. The script prints
this census on every run so nobody has to check by hand.

## Live link

`ship-check.sh` is a local gate, not a URL. It is on `origin/main` and live on
this machine:

```
git cat-file -e origin/main:skillcentral/skills/startsprint/scripts/ship-check.sh   # exists, 15138 bytes
ls ~/.claude/skills/startsprint/scripts/ship-check.sh                                # symlinked, live
```

Source: <https://github.com/ianng89/buddy/blob/main/skillcentral/skills/startsprint/scripts/ship-check.sh>

## Retrospective

**1. What did we learn that is not written down anywhere?**

That documenting a trap next to its trigger *teaches the trigger*. The
squash-merge warning was in the file, in capitals, with a worked example — and
the worked example was the failing command, sitting there ready to paste. The
warning did not compete with the command; it advertised it. Deleting the wrong
command is worth more than any amount of prose beside it.

Second: **`git status` clean and "0 commits ahead of main" are both *absence* of a
signal, and the sprint's tooling treated both as *presence* of proof.** Shipping
is a claim about content on the default branch. Only content can answer it.

**2. Which document must change, and who owns that edit?**

`skillcentral/skills/startsprint/SKILL.md`, Steps 4 and 5 — owned by whoever runs
`/startsprint`, which is the CEO. **Done in this change:** the ancestry command
deleted, the script mandated, `@{u}..HEAD` added, and the mislabelling of
`origin/<default>..HEAD` as "unpushed" called out by name so nobody reconstructs
the old list from memory.

**3. What did we do twice that we should never repeat?**

Written a check as a paragraph. That is the second time — Stage 9b in Sprint 01
was also prose, also caught a real gap on its first run, and also was not run
again. Anything phrased as "before you mark it done, check that…" should be a
command that returns an exit code, or it will be run once.

**4. What did we nearly ship, and what caught it?**

Two things.

A gate that fails on other people's work. The first version scored the whole
tree's `git status`, and the first run against a real item failed on two files
another agent was editing in the shared checkout — nothing to do with the item
under test. Shipped as-is it would have been disabled inside a day.

And, more embarrassing and more instructive: **a self-check that was itself
wrong.** The SKILL.md section that says "there is no ancestry command in this
file any more" carried `grep -c 'merge-base' ship-check.sh # -> 0` as its proof.
The real answer is **2** — both in the script's own header comment explaining why
it does not do this. Running the grep caught it; the box now strips comments
first and says plainly that the bare grep returns 2. A section about checks that
lie, containing a check that lied.
