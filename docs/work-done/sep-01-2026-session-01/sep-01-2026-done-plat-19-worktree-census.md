# PLAT-19 — Fourteen stale worktrees, censused by content and cut to two

**Sprint 05 — *Build where the click is*** · track `platform` · 2 points · owner `BMAD`
**Run:** 01 September 2026 · **Agent:** Amelia (bmad-agent-dev)
**Evidence:** [`sep-01-2026-done-plat-19-worktree-census-EVIDENCE/`](./sep-01-2026-done-plat-19-worktree-census-EVIDENCE/)
**Gate committed:** `scripts/audit-worktree-shipped.sh`

---

## 1. What was in scope

The census was pinned at dispatch: the main checkout plus fourteen orca worktrees.
`origin/master` was `72f9735` at dispatch and still `72f9735` when this ran, so
every reading below is against the same base the brief named.

By the time this item ran, **five worktrees existed that were not on the pinned
list** — `des18-midsize`, `risk10-hooks`, `seo13-faq`, `ui17-rail`, `ui18-toc`.
Those are Sprint 05 items being worked right now (`risk10-hooks` moved from
`72f9735` to `e03e1b5` during this run, so it is live). They were left alone and
are not counted in anything below.

## 2. The two signals

The standing rule is two independent signals before any destructive removal, tested
by content, never by ref position and never by name. The two used here:

| | Signal | What it reads | Why it is independent |
|---|---|---|---|
| **SIG1** | tip commit ∈ enumerated commit set of `origin/master` | `git rev-list origin/master` — 199 commits, listed, then searched | Enumerates what *is* there instead of asking whether an assumption holds. Not `merge-base --is-ancestor`, which answers a question about the assumption. |
| **SIG2** | tip **tree object** sha ∈ tree objects of `origin/master`'s history | `git rev-list --format=%T` — 186 distinct trees | A tree sha hashes the file content itself. It survives rebase, squash and cherry-pick, so it catches the squash-merge trap and its Sprint 04 mirror. |

Both must pass. A third reading — uncommitted state — is a **gate**, not a ship
signal: shipped history says nothing about what is sitting dirty in a checkout.

Two further content readings were taken during the census and agreed with SIG1/SIG2
on every tree: `git cherry` patch-ids, and blob-level comparison of each branch's
own contribution set against master. Both are in
`two-signal-census-BEFORE.txt`.

## 3. Result — 14 trees

| Tree | SIG1 | SIG2 | Dirty | Verdict |
|---|---|---|---|---|
| `pillars-ingest-redirects` | **FAIL** (0 hits) | **FAIL** (0 hits) | 1 modified, 6 untracked | **KEPT** |
| `ui-01-ship` | PASS | PASS | **1 modified** | **discarded, then removed** |
| `rights01-credits` | PASS | PASS | 6 untracked | removed |
| `ui01-srow` | PASS | PASS | 6 untracked | removed |
| `ui02-nav` | PASS | PASS | 6 untracked | removed |
| `ui03-hero` | PASS | PASS | 6 untracked | removed |
| `ui05-category-images` | PASS | PASS | 6 untracked | removed |
| `ui06-layout-gate` | PASS | PASS | 6 untracked | removed |
| `ui07-label-clip` | PASS | PASS | 6 untracked | removed |
| `ui08-attrib-link` | PASS | PASS | 6 untracked | removed |
| `ui09-search-a11y` | PASS | PASS | 6 untracked | removed |
| `ui10-measure` | PASS | PASS | 6 untracked | removed |
| `ui11-tap-targets` | PASS | PASS | 6 untracked | removed |
| `ui12-thumb-geometry` | PASS | PASS | 6 untracked | removed |

Raw output: `gate-report-BEFORE.txt`, `two-signal-census-BEFORE.txt`.

## 4. The negative control — `pillars-ingest-redirects`, kept

This is the tree that was **not** removed, and the signal that stopped it:

```
SIG1 tip commit in enumerated base commit set : FAIL (hits=0)
SIG2 tip tree object in base tree-object set  : FAIL (hits=0)
```

It carries thirteen commits past its merge base, and **four of them have patch-ids
that are not upstream at all**:

```
+ 79b3b14  docs(cont-05): undo record for the five C2.2 articles, written before the first write
+ 8e0f735  docs(cont-05): ingest transcript, proof and the generateMetadata measurement
+ 06f18d5  docs(cont-05): undo for the five links added to the C2.2 seed article
+ 06a377b  docs(cont-05): correct the meta_title mechanics, and record the FAQPage gap
```

43 of the 114 files it touches differ from master. Three of those four commits are
**undo records for production writes** — precisely the artefacts that make a
production write reversible in fact. Removing this tree would have destroyed them.
It stays until someone lands or explicitly abandons CONT-05.

It also holds a modified `.claude/settings.local.json`, a second reason to leave it.

## 5. The `ui-01-ship` discard

**Discarded, not merged.** Archived first, so the discard is reversible in fact:

| Artefact | File |
|---|---|
| the diff | `ui-01-ship-DISCARDED.diff` (49 lines) |
| the whole file as it stood | `ui-01-ship-page.tsx-DISCARDED-FULL-FILE.txt` (344 lines) |
| its blob sha | `977b0a8ddc7ef9c0e2bc44144ec316ed1ffe8548` |
| the tree's HEAD | `105e79d` |

### The brief's account of this needs one correction

The brief calls it "an uncommitted change that would REVERT UI-03's hero work."
The conclusion is right. The mechanism is not what the wording suggests, and the
difference matters for anyone who goes looking.

**The diff itself reverts nothing.** It is `+30 / -1`, and what it adds is UI-01's
own rank number:

```jsx
<span className="s-idx">{String(i + 1).padStart(2, '0')}</span>
```

**That line is already in `origin/master`, byte for byte**, shipped as `9e81bc8`
("UI-01: restore the homepage Terkini rank number"). So the change was a stale
duplicate of shipped work and discarding it cost nothing.

**The revert hazard is in the base, not the diff.** The tree sat 79 commits behind
master. Committing its `src/app/(public)/page.tsx` would have taken that one file
back **216 insertions and 61 deletions**, destroying every commit that touched it
since — including three UI-03 commits:

```
ddf2cfb  UI-03: art-direct the homepage hero with <picture>, one crop per band
4e8e395  UI-03: R8(c) — hero eligibility tests the SOURCE photograph's orientation
41c018e  UI-03: derive R8(c)'s threshold from HERO_ASPECT; correct the R7 comment
```

plus UI-11's tap-target work and four UI-12 commits. Counting the markers rather
than assuming them:

| marker | `origin/master` | the `ui-01-ship` checkout |
|---|---|---|
| `<source` | 6 | **0** |
| `HERO_ASPECT` | 3 | **0** |
| `<picture` | 3 | 1 |

UI-03's art direction was simply absent from that file. The brief's verdict holds;
the reason is the stale base.

## 6. What was nearly destroyed, and what caught it

Twelve trees carried six untracked agent personas each — `creative-director.md`,
`head-of-seo-content.md` and four others, about 105 KB, **not tracked in master and
not present in the main checkout**. `git worktree remove --force` deletes untracked
files without comment.

Hashing every copy in every tree, rather than assuming twelve copies of a file with
one name are one file, found that **`ui12-thumb-geometry` held the only copy on this
machine of two of them**:

| file | 11 other in-scope trees | `ui12-thumb-geometry` | Sprint 05 trees |
|---|---|---|---|
| `creative-director.md` | `60f2373` | **`960035a` — unique** | `aee6708` |
| `head-of-seo-content.md` | `07c8e48` | **`f1c6109` — unique** | `646e6e8` |

Two independent containment checks (`diff` over sorted lines, and `comm -23`) then
showed **0 lines** present in ui12's copies and absent from the current ones, so
ui12's were a superseded intermediate. The canonical home turned out to be a
different repo entirely — `buddy/skillcentral/agents/projects/hellokahwin/`, whose
hashes are exactly `aee6708` and `646e6e8`. Nothing unique was lost.

The same care applied to the `_bmad-output/` directories left on disk: all 89 files
were confirmed to exist in `origin/master` before deletion, one `git cat-file -e`
per file.

## 7. Corrections to the record

1. **`git worktree remove --force` is not atomic on Windows.** All twelve trees
   disappeared from `git worktree list` and then failed to delete: `Filename too
   long` on pnpm's deep `node_modules`, `Access to the path 'checksums' is denied`
   on pnpm's read-only hardlinks, `Directory not empty` on a locked `.next`, and
   one `Permission denied`. **Reading `git worktree list` as proof of removal gives
   a false clean** — at that moment it showed seven trees while nineteen
   directories were still on disk, one of them holding 70,382 files. This is now a
   mode of the committed gate, not a note here.
2. **That failure has already happened at least six times, and went unnoticed for
   two sprints.** `C:/Users/Ian Ng/orca/workspaces/hellokahwin-site/` holds six
   directories that are on nobody's worktree list, were not on the pinned census,
   and have no `.git` file at all. They are deregistered corpses of earlier items:

   | orphan directory | files still on disk |
   |---|---|
   | `seo07-title-halflife` | 38,303 |
   | `risk07-noindex` | 34,497 |
   | `des12-header-wordmark` | 11,237 |
   | `seo10-faq-schema` | 6,290 |
   | `risk08-cold-render` | 5,930 |
   | `seo05-titles` | 0 (empty directory) |

   About 96,000 files. **Per the brief's pinned-census rule these were left
   untouched and are reported, not removed.** They want an owner: the census the
   brief wrote was built from `git worktree list`, which is exactly the reading
   that cannot see them. `--verify-gone` exists so the next sweep can.
3. **`docs/work-done/README.md` does not exist.** The convention in this repo is a
   per-session index — `docs/work-done/<session>/README.md`. This item wrote the
   session index the convention describes.
4. **`scripts/measure/count-in-html.sh`**, cited in the standing rules, does not
   exist in this repo on `master`.

## 8. Final state

Of the fourteen in-scope worktrees, **thirteen are removed and one remains**. Every
surviving tree in the repo, with its one-line reason:

| Tree | In scope? | Why it survived |
|---|---|---|
| the main checkout `hellokahwin-site` | it is the repo | it is the repo |
| `pillars-ingest-redirects` | yes | SIG1 and SIG2 both FAIL — four unupstreamed commits, three of them production undo records |
| `des18-midsize` | no | created after the census, live Sprint 05 work |
| `risk10-hooks` | no | created after the census; its HEAD moved `72f9735` → `e03e1b5` during this run |
| `seo13-faq` | no | created after the census, live Sprint 05 work |
| `ui17-rail` | no | created after the census, live Sprint 05 work |
| `ui18-toc` | no | created after the census, live Sprint 05 work |

I left the branches in place. The DoD is about checkouts, and the hazard the brief
names is a checkout in the wrong tree; a ref costs nothing and nobody can work in
one by accident.

Orca's own registry agrees with git: `orca worktree list` shows the same six
survivors and none of the thirteen. Full output in `final-state-AFTER.txt`.

### One thing is not finished, and it is not a worktree

Twelve **empty directory entries** remain on disk. Every file inside them is gone
(`residual_entries=0` on all twelve), they hold no `.git`, and neither git nor Orca
registers them.

I did not total the twelve before deleting them, so this log states no total. The
one tree counted before its files went was `ui03-hero`, at **70,382**. The six
older orphans in §7 were counted directly and that figure is still checkable on
disk today. A stray process holds each directory handle:

```
NOT-GONE  .../ui03-hero  registered=NO on_disk=YES residual_entries=0
```

They are not worktrees. Nothing can be checked out into them and they carry none of
the hazard the brief describes. What they need is a stray-shell sweep, which is
`/cleanup-full`'s job, and I did not run one: five agents are working this sprint
right now (RIGHTS-03, UI-17 and three others were live in `orca terminal list`
during this run) and a broad process sweep would risk their work.

What was ruled out, so the next person does not repeat it: no live Orca terminal
sits in any of the twelve; Orca's registry no longer lists them; five orphaned
`next` servers running inside removed trees were found and killed (pids 44272,
30004, 31972, 58300, and 52300 which had already exited), and the directories
stayed locked; twelve `rmdir` retries over two minutes did not clear them, so the
lock is held, not transient; and of 126 shell processes only 11 have a dead parent,
10 of those created during this session, so "orphaned parent" does not identify the
holder. `handle.exe` is not installed on this machine, which is what would name it.

## Retrospective

**What we learned that is not written down.** `git worktree remove` deregisters
before it deletes, and on Windows the delete is the half that fails. The gap
between the two is a false clean that any later audit reading `git worktree list`
would inherit. Finishing the deletion needs
`attrib -R -S -H "<path>\*" /S /D` before `rd /s /q`, because pnpm's store is
hardlinked read-only — .NET's `Directory.Delete` and `Remove-Item -Force` both stop
on it.

**Which document must change, and who owns the edit.**
`scripts/audit-worktree-shipped.sh` — created by this item, owned by `platform`.
It is the two-signal rule as a command rather than a paragraph, and it now carries
a `--verify-gone` mode for the trap above. The safe idiom is one line:

```bash
bash scripts/audit-worktree-shipped.sh "$T" && git worktree remove --force "$T"
bash scripts/audit-worktree-shipped.sh --verify-gone "$T"   # or it did not happen
```

Both modes were run against their failing cases before being trusted: the gate
exits 1 on `pillars-ingest-redirects` and 0 on `ui03-hero`; `--verify-gone` exits 1
on a deregistered directory still holding 70,382 files.

**What we did twice that we should never repeat.** Two checks in this run returned
a false ABSENCE, and both would have concluded "no untracked files at risk":

- `for d in $W/*` unquoted, where `$W` contains `Ian Ng` — the shell split the path
  on the space and matched nothing.
- `find "$W" -maxdepth 3 -path "*/.claude/agents/*"` — one level too shallow, so it
  returned nothing while `ls` on the same directory listed nine files.

Both were caught by the standing rule that a surprising absence means you verify
the check first. That rule earned its place twice in one afternoon. The general
form: **a check that returns zero has not found zero until a positive control on
the same command returns non-zero.**

**What we nearly shipped, and what caught it.** Removing `ui12-thumb-geometry`
while it held the only copy on this machine of two untracked agent personas. What
caught it was hashing all eighteen copies instead of trusting that files sharing a
name share content — they did not. The containment check that cleared them for
deletion was run twice, by two different methods, before anything was removed.
