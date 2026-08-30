# PLAT-15 — the sprint file and the tracker now agree, item for item, and a gate keeps them that way

**Item:** `PLAT-15` · 2 points · track `platform` · Sprint 04
**Owner:** BMAD (executed by `design-systems-engineer`)
**Date:** 31 August 2026
**Repos touched:** `buddy` (the `sprint` CLI and three skills), `hellokahwin` (the four sprint files). **No site code.**

---

## The claim

`docs/sprints/sprint-NN.json` had diverged from the tracker for three consecutive
sprints, in both directions. It no longer has: **all four sprint files now agree
with the tracker item for item**, verified by a query that shares no code with the
tool that wrote them. The mechanism that let it drift is closed by a **gate that
exits non-zero**, not by a paragraph.

---

## What was actually wrong — measured before anything was changed

`sprint reconcile N --check` compares the file to the tracker **by item key**.
Run against the four files before any fix:

| Sprint | Items | Agreed | Disagreed | Header fields differing |
|---|---|---|---|---|
| 01 | 14 | 10 | **4** | `state`, `ended_at`, `retro` |
| 02 | 20 | 0 | **20** | `state`, `started_at`, `ended_at`, `retro` |
| 03 | 26 | 3 | **23** | `state`, `started_at`, `ended_at`, `retro` |
| 04 | 11 | 1 | **10** | `state`, `started_at` |

`sprint-03.json` read `state: "in_progress"` with 24 of its 26 items `todo`,
against a tracker reading `done`, 107/115. **A reader opening it would have
concluded nothing shipped.**

Full before-state output: `evidence/before.txt` (reproduced below in the diff
section).

### Why nobody noticed for three sprints

**The header agreed while the items disagreed.** `sprint-03.json` and the tracker
both said "26 items, 115 points". Every comparison anybody ran was a header
comparison, and every one of them passed. The brief said this in one line —
*"Compare item-for-item"* — and it is the whole finding.

### And the divergence ran the other way too

Sprint 04 did not exist in the tracker at all when `/startsprint` ran on 31 Aug.
It lived only in `sprint-04.json` and had to be seeded with `sprint import`
mid-dispatch. A planned sprint that is not in the tracker is not a sprint,
because nothing executes files.

### Three skills said three different things about the same file

| Skill | What it said | True? |
|---|---|---|
| `/hellokahwin` | "That file is the contract: `/startsprint` executes it, the dashboard reads it, `/endsprint` writes the retro into it" | **all three clauses false** |
| `/startsprint` | "Do not read, and do not write, `docs/sprints/sprint-NN.json`" | true, and it is why nothing ever updated the file |
| `/endsprint` | "It is not the state, and it is not where the retro goes" | true, and it stopped there |

Nothing was wrong with any individual instruction. What was missing was **anything
that wrote the tracker back into the file**, and nothing measured the gap.

---

## What was built

### 1. `sprint reconcile N [--file F] [--check]` — the missing direction

`sprint import` moved a file INTO the tracker. Nothing moved the tracker back
out. `reconcile` does, and it never writes to the tracker, so it is safe on a
closed sprint — which is what made back-filling 01–03 possible at all.

- **Synced from the tracker:** the sprint's `state`, `started_at`, `ended_at`,
  `retro`, and every item's `state` and `evidence`.
- **Left AS SCOPED, deliberately:** `points`, `track`, `owner`, `title`, `why`,
  `dod`, `brief`. `/endsprint` measures sizing accuracy by comparing the file's
  as-scoped point total against the tracker's `planned`. **Syncing points would
  make that check compare a number to itself and pass forever.** Drift is
  recorded in a `reconciled.scope_drift` block instead of erased.
- **`--check` writes nothing and exits 1** on any disagreement. That is what lets
  `/endsprint` hold a gate rather than a request to remember.
- It prints the before-state, writes, **re-reads the file and prints the
  after-state**. A reconciler that reports success without re-reading is
  asserting its own correctness.

Pure logic in `packages/db/src/repositories/sprint-cli.ts` — inside `pnpm
typecheck`, `pnpm lint` and `pnpm test`, which `scripts/` is not. That placement
is PLAT-07's lesson and it paid twice today (see the retrospective).

### 2. Two gates on `sprint import`, replacing prose that had already failed

**Gate 1 — a stale file header cannot overwrite a running sprint.** `upsertSprint`
wrote the header unconditionally, so importing a file that still said `planned`
reset a live sprint and lost its `started_at`. **That happened to Sprint 03 on
28 Aug 2026.** The only guard since was a `_warning` string *inside
sprint-03.json* — prose, in one file, that a reader meets after typing the
command. Now:

```
$ pnpm --silent sprint import <a file saying "planned">
Sprint 4 is IN PROGRESS in the tracker and …gate-stale.json says "planned".
Importing would carry that stale header back over the live sprint and lose
started_at — which is exactly what happened to Sprint 03 on 28 Aug 2026.

You almost certainly want the OTHER direction:

  pnpm --silent sprint reconcile 4

which writes the tracker INTO the file and never touches the tracker.
If you really mean to overwrite the running sprint, re-run with --force.
EXIT=1
```

**Gate 2 — the whole file is validated before any of it is written.** The
repository rejected a bad track one item at a time, *after* writing the items
before it. Sprint 04 was planned with tracks `ui` and `rights`, neither of which
exists, and both were found at 01:00 during dispatch:

```
$ pnpm --silent sprint import <a file with ui/rights/review>
…gate-tracks.json cannot be imported as written. NOTHING was written.

  track "ui" does not exist — 1 item(s): UI-04
  track "rights" does not exist — 1 item(s): UI-01
  state "review" does not exist — 1 item(s): UI-02

  tracks: risk, platform, seo, design, content
  states: todo, in_progress, blocked, done, parked
EXIT=1
```

`SPRINT_TRACKS` lives in `packages/db/src/repositories/sprints.ts` and allows only
`risk, platform, seo, design, content`. Adding a track is a one-line change plus a
migration widening the DB CHECK — **a decision to take at planning time, which is
why the message says so and why `/hellokahwin` now checks it while the owner is
still in the room.**

**Negative control — the gates do not block legitimate use.** After the refused
imports, the sprint was untouched (`state=in_progress startedAt=2026-08-31
itemCount=16`), and a valid import ran clean: `0 created, 16 updated`.

### 3. A departed item is not a divergence

Sprint 02's `SEO-04` was scoped in and moved out; PLAT-10's `sprints.departures`
ledger recorded it with points and a note. Calling that a disagreement made
Sprint 02 fail the gate **forever** — and a gate that can never pass is a gate
somebody deletes. The tool now reads the ledger, reports
`ok (left this sprint — in the departures ledger)`, and stamps
`departed_from_this_sprint` onto the item so the file explains itself.

### 4. The three skills now say one thing

- **`/endsprint` Step 4a** (new): `sprint reconcile N`, then
  `sprint reconcile N --check` **as a gate**. "If that exits non-zero, the sprint
  is not closed." Step 1 now names which fields the file owns and which the
  tracker owns, and says why syncing points would break Step 3.
- **`/startsprint` Step 0**: refuses to start a sprint that exists only as a file
  and tells you to import it; ends with one `sprint reconcile N` after
  `sprint state N in_progress`. The hard rule is now precise — never *hand*-edit
  the file; `reconcile` is the one sanctioned writer.
- **`/hellokahwin` Step 2b**: the false "contract" paragraph replaced, the import
  made a required step of planning, and the two things the import rejects listed.

All three have dated CHANGELOG entries.

---

## Evidence

### The diff of `sprint-03.json`, before and after

```
$ git diff --stat docs/sprints/
 docs/sprints/sprint-01.json | 301 ++++++++++++++++------
 docs/sprints/sprint-02.json | 440 +++++++++++++++++++++++++++++---
 docs/sprints/sprint-03.json | 610 ++++++++++++++++++++++++++++++++++++++++----
 docs/sprints/sprint-04.json | 114 +++++++--
 4 files changed, 1276 insertions(+), 189 deletions(-)
```

The header and the first item states, from `git diff -U0 docs/sprints/sprint-03.json`:

```
-  "state": "in_progress",
+  "state": "done",
+  "started_at": "2026-08-28",
+  "ended_at": "2026-08-29",
-      "state": "todo",
+      "state": "done",
…
-      "state": "todo",
+      "state": "parked",     ← SEO-04
-      "state": "blocked",
+      "state": "done",       ← DES-02
```

The bulk of the 610 lines is **evidence and the retrospective** being pulled into
the file, which is the point: the file is the archive that has to survive a
database we no longer have, and until today it carried neither.

### The as-scoped record survived byte-identical

The one thing a reconciler must not do is overwrite what the owner authored.
Checked against `HEAD` for all four files, across ten fields:

```
sprint-01  14 as-scoped items  lost:none  altered:none
sprint-02  20 as-scoped items  lost:none  altered:none
sprint-03  26 as-scoped items  lost:none  altered:none
sprint-04  11 as-scoped items  lost:none  altered:none
71 items x 10 fields verified byte-identical to HEAD.
```

Fields checked: `track, points, owner, title, why, dod, brief, flags, spec,
spec_status`. No top-level key was dropped or altered outside the four the
reconciler owns.

### The item-for-item proof, from a query that shares no code with the fix

`verify.mjs` queries PostgREST directly and parses the JSON with node's own
parser. **It deliberately reimplements the comparison**, so a bug in the
reconciler cannot make it pass:

```
sprint 01  file 14 items / tracker 14 rows  state file=done tracker=done  ->  AGREES item-for-item
sprint 02  file 20 items / tracker 19 rows  state file=done tracker=done  ->  AGREES item-for-item
sprint 03  file 26 items / tracker 26 rows  state file=done tracker=done  ->  AGREES item-for-item
sprint 04  file 16 items / tracker 16 rows  state file=in_progress tracker=in_progress  ->  AGREES item-for-item

76 file items compared against their tracker rows. 0 disagreements.
VERIFY EXIT=0
```

Sprint 02 reads 20 file items against 19 tracker rows because `SEO-04` left; the
verifier checks the departures ledger for exactly that and does not accept an
unexplained absence.

### The gate, run as a gate

```
reconcile 1 exit=0   check 1 exit=0
reconcile 2 exit=0   check 2 exit=0
reconcile 3 exit=0   check 3 exit=0
reconcile 4 exit=0   check 4 exit=0
```

### The round-trip

`reconcile` → file → `import` → tracker: `0 created, 16 updated`. Nothing lost,
nothing invented.

### Build gates

`231 tests passed` (19 files; `sprint-cli.test.ts` went 30 → 42), `tsc --noEmit`
clean on `@buddy/db` **and on `scripts/sprint.ts`**, `eslint packages/db` clean.

### How to reproduce every number above

```
cd ~/Documents/Code/buddy
pnpm --silent sprint reconcile 3 --check     # exits 0; prints all 26 items
pnpm --filter @buddy/db test
```

---

## Two things a reader should know that are not defects of this item

**Sprint 04 grew under me, mid-run.** It went from 11 items to 16 while this item
was being worked — `UI-07` was created at 01:48 KL by UI-04's discovery work, and
four more followed. My first run reported Sprint 04 as agreeing and the
independent verifier then found `UI-07` missing. **That is not a bug; it is what
an in-flight sprint does**, and it is the reason the reconcile belongs at
`/startsprint` and `/endsprint` rather than being run once. Sprint 04's file is
correct as of the final run and will drift again before the sprint closes;
Step 4a is what fixes it at close.

**A tracker row has a mangled title.** `UI-07`'s title reads
`C:/Program Files/Git/artikel card category labels clip mid-word at 390px…`.
That is MSYS path conversion: `sprint add --title "/artikel …"` run from Git Bash
turns a leading `/artikel` into a Windows path. **I have not edited another
agent's item mid-sprint** — it is recorded here and in the retrospective, with the
mitigation, for whoever owns UI-07.

---

## Retrospective (Stage 9)

### 1. What did we learn that is not written down?

**A rule with no mechanism decays into a false statement, and reads as true the
whole time.** Every one of the three skills was internally coherent. What was
absent was any *tool* that wrote the tracker back into the file, and any *check*
that measured the gap. The `/hellokahwin` sentence calling the file "the
contract" was false in all three of its clauses and had been for three sprints,
and it read perfectly well.

**The corollary, which is the sharper half: a check that compares summaries
agrees with everything.** The header matched — same item count, same point total —
so every comparison anybody ran passed. This is the same failure the CEO's rules
already name ("check the artefact, never a summary of it"), arriving in a shape
nobody recognised, because a *count of items* feels like the artefact.

**And a gate that can never pass is worse than no gate.** Sprint 02 has a
legitimately departed item. The first version of `--check` called that a
divergence, which would have made Sprint 02 fail forever — and the first thing
anyone does with a check that always fails is stop running it.

### 2. Which document must change, and who owns the edit?

All four are **done in this change**, not proposed:

| File | Edit | Owner |
|---|---|---|
| `skillcentral/skills/endsprint/SKILL.md` | New **Step 4a**: `sprint reconcile N` then `--check` as a gate. Step 1 rewritten to name which fields the file owns and which the tracker owns | design-systems-engineer — **done** |
| `skillcentral/skills/startsprint/SKILL.md` | Step 0 refuses a sprint that exists only as a file; ends with `sprint reconcile N`; the "never write the file" hard rule made precise | design-systems-engineer — **done** |
| `skillcentral/skills/hellokahwin/SKILL.md` | The false "contract" paragraph replaced; import made a required planning step; `SPRINT_TRACKS` and the item states listed as things the import rejects | design-systems-engineer — **done** |
| `docs/sprints/sprint-03.json` `_warning` | Rewritten to name both directions and point at the gate that now enforces it | design-systems-engineer — **done** |

Plus dated CHANGELOG entries in all three skills.

### 3. What did we do twice that we should never repeat?

**Wrote a rule as prose when it could have been a gate — and then did it again
inside this very item.** `sprint-03.json`'s `_warning` was prose guarding the
28 Aug import accident, and the accident was still fully reproducible today: I
tested it and `import` cheerfully overwrote a running sprint. Prose in one JSON
file, met *after* typing the command, stopped nothing for three days. It is a
gate now.

**Trusted a write path because its exit code was 0 — twice, in the same hour.**

- The first `reconcile` exited 0 and the file was "correct". Reading the *diff*
  showed `items` had been promoted to the second key, turning a ~60-line diff of
  `sprint-03.json` into a **639-line one in which every field read as deleted**.
  Caused by seeding the result object with `items: []`, the obvious way to
  satisfy the type.
- Then an item appended by `reconcile` was written without a `dod`, which made
  the file **unimportable** — `sprint import` refuses an item with no definition
  of done, *after* partially writing the ones before it. Re-reconciling did not
  repair it, because the merge path walks the file's keys and a field the file
  lacks stays missing forever.

Both were found by **exercising the artefact** — reading the diff, and importing
the reconciled file as a negative control — not by the exit code, and not by the
tool's own `--check`, which passed on both. Both now have tests.

### 4. What did we nearly ship, and what caught it?

**Nearly shipped a reconciled `sprint-04.json` that could not be re-imported** —
five items with no `dod`. Caught by running `sprint import` on the reconciled
file as a negative control. Nothing else would have found it: `--check` passed,
the tests passed, the diff looked right. The file is the archive that must
survive a database we no longer have; **an archive that cannot be read back is
not one**, and there is now a test asserting every item carries the field set
`import` requires.

**Nearly reported Sprint 04 as agreeing when it did not.** My own `--check`
said 16/16 agree; the *independent* verifier — written to share no code with the
reconciler — found `UI-07` in the tracker and not in the file. It turned out to
be a live race rather than a bug, but the point stands: **the tool's own check
agreeing with the tool is not evidence.**

### 5. The form each lesson took

Per the sprint's own rule — *"ask which FORM it can take, and write prose only
when none of those is possible."*

| Lesson | Form it took | Not prose because |
|---|---|---|
| The file must agree with the tracker | **A script** (`sprint reconcile`) | Nothing existed to do it at all |
| …and must be *proved* to | **A gate** (`--check`, exit 1) in `/endsprint` Step 4a | The prose version already existed and did nothing for three sprints |
| Never import a stale header over a live sprint | **A gate** in `sprint import` | The prose version was a `_warning` string inside one JSON file |
| A sprint must be in the tracker before it starts | **A refusal** in `/startsprint` Step 0 | Sprint 04 got all the way to dispatch |
| Tracks/states/DoD must be valid | **A whole-file pre-flight** that writes nothing on failure | The old check failed one item at a time, after partial writes |
| An added item must carry `dod` | **A test** | Two silent variants of the same bug in one hour |
| Key order must survive | **A test** naming the 639-line diff | Exit code 0 hid it |

The one lesson that stayed prose — *"compare item for item, never by count"* —
stayed prose only in the sense that it is now **the shape of the tool's output**:
`--check` prints every item, agreeing ones included, so a reader can count the
comparison rather than trust a summary of it.

### 6. One finding I am handing on rather than fixing

`sprint add --title "/artikel …"` from **Git Bash** silently becomes
`C:/Program Files/Git/artikel …` through MSYS path conversion. `UI-07`'s title in
the tracker carries it now. Mitigation: prefix the command with
`MSYS_NO_PATHCONV=1`, or run the CLI from PowerShell. I have not edited another
agent's live item to fix it; **UI-07's owner should.** A durable form for this
would be a check in `sprint add` that refuses a title containing
`Program Files/Git/` — worth a backlog item, not worth taking unasked inside a
2-point platform item.

---

## Files changed

**`buddy`**

- `packages/db/src/repositories/sprint-cli.ts` — `diffSprintFile`,
  `renderSprintFileDiff`, `reconcileSprintFile`; `--check` and `--force` added to
  `BOOLEAN_FLAGS`
- `packages/db/src/repositories/sprint-cli.test.ts` — 12 new tests (30 → 42)
- `packages/db/src/index.ts` — barrel exports
- `scripts/sprint.ts` — the `reconcile` command; two pre-flight gates on `import`
- `skillcentral/skills/endsprint/{SKILL.md,CHANGELOG.md}`
- `skillcentral/skills/startsprint/{SKILL.md,CHANGELOG.md}`
- `skillcentral/skills/hellokahwin/{SKILL.md,CHANGELOG.md}`

**`hellokahwin`**

- `docs/sprints/sprint-01.json`, `sprint-02.json`, `sprint-03.json`,
  `sprint-04.json` — reconciled
- `docs/work-done/aug-30-2026-session-01/aug-31-2026-done-plat-15-sprint-file-reconcile.md` — this file
- `docs/work-done/README.md`
