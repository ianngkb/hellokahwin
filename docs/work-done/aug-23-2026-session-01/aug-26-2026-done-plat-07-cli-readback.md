# Done — PLAT-07 — The sprint CLI tells you what it already knows

**Item:** PLAT-07, sprint 02, platform, 1pt.
**Brief:** `docs/plans/aug-23-2026-session-01/aug-26-2026-brief-plat-07.md`
**Executed:** 26 Aug 2026, in the buddy MAIN checkout, on
`feat/plat-07-cli-readback`.
**Shipped:** buddy PR [#39](https://github.com/ianng89/buddy/pull/39), merged to
`origin/main` at `0084826`.

---

## The headline

Five defects, every one hit for real by the CEO on Sprint 02's first day while
running the sprint these tools exist to run. All five are fixed, merged, and
**verified from a fresh clone of `origin/main`** — not from the tree they were
written in.

Four of the five lived in code that no test, no type-checker and no linter ever
touched. That is the finding underneath the five findings, and most of this
item's work went into closing it rather than into the five fixes, which are
small.

---

## CLAIM + EVIDENCE, per defect

Every "before" below was captured on `main` at `25fe6e5` before any change.
Every "after" was captured from
`scratchpad/fresh`, a fresh `git clone --branch main` at `0084826`.

### 1. `sprint retro N` was write-only

**Claim:** `sprint retro N` with no `--file` now prints the stored
retrospective, readable — learnings with their changed files, process findings,
carried-forward.

**Before:**

```
$ pnpm --silent sprint retro 1
retro needs --file <retro.json>.
exit=1
```

The row was demonstrably there the whole time — `sprint velocity 1` printed
`retro recorded planned 42 / completed 40 / parked 2 (agrees)`, which reads the
same column. It proved the retro existed and would not show it to you.

**After** (fresh checkout, Sprint 01's real retro):

```
$ npx tsx scripts/sprint.ts retro 1
Sprint 01 — Protect what we shipped, then measure it [done] — retrospective
  held     2026-08-26
  velocity planned 42 / completed 40 / parked 2   (as RECORDED — `sprint velocity` computes its own)
  sizing   Sizing held. Nothing was narrowed to fit and nothing ran over. …

  learnings (8)
     1. A gate you have to remember is a suggestion. Stage 9b, the ship check, was
        written on 25 Aug, caught a real gap on its first run, and was then not run
        again - after which three items were marked done without shipping.
        file   skillcentral/skills/startsprint/SKILL.md
        why    Moved from a reminder to a refusal: …
     …
  process findings
    THE SPRINT PROCESS FAILED THREE TIMES IN ONE CLASS AND THE OWNER CAUGHT ALL THREE. …

  carried forward (4)
    - PLAT-05 (backlog, 5pt) - sprint documents readable and searchable inside /sprints. …
```

Three details are deliberate. The recorded velocity is labelled **"as
RECORDED"** so it can never be mistaken for the computed one. A learning that
changed no file prints `— (nothing was changed for this one)` rather than a
blank, because a finding with no file is a feeling. And any key the renderer
does not recognise prints verbatim under `other keys in this retro`, because a
reader who cannot see a key cannot know it drifted.

### 2. `sprint get <KEY>` did not print `why`

**Claim:** `why` prints, verbatim and unwrapped; and every other stored field is
either shown or listed as hidden with a stated reason.

**Before:**

```
$ pnpm --silent sprint get PLAT-07
PLAT-07  in_progress
  title    sprint retro N is write-only - make it readable
  track    platform
  owner    BMAD
  points   1
  dod      …
  updated  2026-08-26T14:41:50.301184+00:00 by SYSTEM
```

No `why`, no `flags` line when empty, no `brief`, no `spec`, no `created`. The
`why` is what a dispatch brief must quote word for word, so the CEO read it out
of `docs/sprints/sprint-02.json` instead — the stale copy the sprint rules
explicitly say is **not** the state.

**After** (fresh checkout):

```
$ npx tsx scripts/sprint.ts get PLAT-07
PLAT-07  in_progress
  title    sprint retro N is write-only - make it readable
  track    platform
  owner    BMAD
  points   1
  flags    —
  why      Found closing Sprint 01. The CLI stores a retro and has no command to read
           one back; velocity cross-checks against the row, proving it is there, but
           nothing prints it. …
  dod      …
  brief    —
  spec     —
  created  2026-08-26T03:28:01.630446+00:00
  updated  2026-08-26T14:41:50.301184+00:00 by SYSTEM
  evidence (0) — nothing has been claimed against this item yet
```

Absent optional fields print `—` rather than vanishing. A reader must be able to
tell *"this item has no brief"* from *"this build of the CLI does not print
briefs"*, and before today they could not — which is exactly how `why` went
missing without anyone noticing.

**The part that outlives this commit.** Adding `why` fixes today. The test walks
the row's own keys:

```ts
const { rendered, hidden, missing } = itemFieldCoverage(FULL_ITEM);
expect(missing).toEqual([]);
expect(hidden).toEqual(["id", "sprint_id"]);
```

A column added to `SprintItemRow` and forgotten in the renderer now fails the
build. `id` and `sprint_id` are the only hidden fields and both carry a written
reason in `HIDDEN_ITEM_FIELDS`.

### 3. `--backlog` was documented bare and demanded a value

**Claim:** `sprint get PLAT-05 --backlog` works exactly as `--help` documents
it. `--from-backlog` had the identical shape and is fixed too.

**Before:**

```
$ pnpm --silent sprint get PLAT-05 --backlog
--backlog needs a value.
exit=1
```

while `--help` said `get <ITEM-KEY> [--backlog]`. They could not both be right;
the help was right, so the parser moved.

**After** — all three documented spellings take the same code path:

```
--backlog        -> No item PLAT-05 in the backlog. (exit=1)
--backlog true   -> No item PLAT-05 in the backlog. (exit=1)
--backlog=true   -> No item PLAT-05 in the backlog. (exit=1)
```

`No item PLAT-05 in the backlog` is the **correct answer**, not a failure:
PLAT-05 is in Sprint 02, and `sprint get PLAT-05` returns it. The parser is
past; the lookup ran and answered truthfully.

`--backlog true` is kept on purpose — it is the workaround people learned while
the bare form was broken, and it is already in briefs and shell history.
Breaking those to punish a typo we caused would be its own defect. `--backlog
false` now reads as **off**, which the old `"backlog" in flags` presence check
would have read as on.

A bare flag consumes the next token only when it is literally `true` or `false`,
so `set-state --backlog PLAT-05 done` still reads `PLAT-05` as the item key.
`--help` now lists the bare flags so the next one added has somewhere to live.

### 4. `status-board.py` was not project-scoped, and printed the handle on the next line

**Claim:** it scopes to a project and emits one parseable record per terminal.

**Before** — 23 rows, from twn-new, thepicklebase, hellokahwin and buddy at
once, of which 7 were HelloKahwin's; handle on its own line beneath the state:

```
STATE           IDLE  TITLE
STALLED?         15m  ✳ TASK-dev-A execution and report
                      term_94d320e3-f5a2-4136-800c-636bb7ea2986
                      last: ❯ Context: 73.0% used …
```

and the hazard, on a `WORKING` row (which prints no `last:` line, so this is the
**default** outcome, not the unlucky one):

```
$ grep -A1 term_0d5be420-e200-4122-8b72-beef7da8f595 board.txt
                      term_0d5be420-e200-4122-8b72-beef7da8f595
WORKING           0s  BMAD agent brief execution
```

That `WORKING` belongs to `term_677b977e`, a different terminal. **That is the
exact shape of the error that produced Sprint 01's wrong dispatch map** — two
items with two agents each, and the gate item never started.

**After** (fresh checkout, run from the hellokahwin tree with no flags):

```
7 terminals  ·  hellokahwin  ·  idle after 90s
STATE        IDLE  HANDLE                                     TITLE
IDLE/DONE     23m  term_f7e016a3-0c79-4d52-9632-653ff2323a9b  ✳ Managing-editor agent brief execution
                    last: 91140 tokens ❯ Context: 9.0% used …
WORKING        0s  term_0d5be420-e200-4122-8b72-beef7da8f595  BMAD agent brief execution
```

and the record format:

```
$ python status-board.py --project hellokahwin --format tsv | cut -f1-4
IDLE/DONE   180    term_c98e0e3a-1b1a-408d-a203-f2d7ab08a318   hellokahwin
WORKING     0      term_0d5be420-e200-4122-8b72-beef7da8f595   hellokahwin
…

$ python status-board.py --handle term_7ab56ad4-… --format tsv | cut -f1
WORKING
```

Attribution is exact rather than guessed from a path: a terminal's `worktreeId`
is `<orca-repo-id>::<path>`, and `orca repo list` maps that id to a display
name, so an Orca worktree at `orca/workspaces/twn-new/article-versioning-b` is
attributed as reliably as a main checkout. Scoping happens **before**
classification, which also cuts the expensive `terminal read` calls from 23 to 7.

`--all` restores the old every-project view as an opt-in. `--projects` lists the
names. `--format json` for structured callers. When the working directory
matches no project the script says so on stderr and shows everything — a silent
fallback would have recreated the defect.

**The UTF-8 fix is kept and now proven.** The script still reconfigures its own
streams, so it does not need `PYTHONIOENCODING` set by hand; every command above
ran on a default Windows shell. It also now writes **LF** records — a Windows
text stream translates LF to CRLF, and the stray CR was riding along on the last
tab-separated field, where a shell `cut -f7` would hand it to the caller.

### 5. `watch-agent.sh` fired on any `error:` substring

**Claim:** milestone matching is anchored to real outcomes, not to any line
containing a word.

The old matcher, run against the lines that actually woke the CEO on 26 Aug,
beside the new one:

```
LINE THE AGENT EMITTED                          OLD (main)                 NEW
Error: connect ECONNREFUSED 127.0.0.1:54322     FIRED on 'Error:'          quiet
Error: no rows returned                         FIRED on 'Error:'          quiet
probe finished with exit code 1                 FIRED on 'exit code 1'     quiet
bash: doppler: command not found                FIRED on 'command not found' quiet
I am refusing: to guess at the item key         FIRED on 'refusing:'       quiet
MIGRATE EXIT: 0                                 FIRED on 'MIGRATE EXIT: 0' FIRED on 'MIGRATE EXIT: 0'
HTTP/2 200                                      FIRED on 'HTTP/2 200'      FIRED on 'HTTP/2 200'
Production: https://hellokahwin.com             FIRED on 'Production: https' FIRED on 'Production: https'
Refusing: the brief names no item key           FIRED on 'Refusing:'       FIRED on 'Refusing:'
```

Four false wakes gone; four real outcomes still fire. What changed and why:

- `^Error:` **removed.** Every stack trace in every language starts a line with
  it, and an agent that hits one and fixes it has not reached a milestone — it
  has done its job.
- `exit code [1-9]` **removed.** A probe whose whole purpose is to fail (does
  this binary exist? is this port open?) prints it *on success*.
- `command not found` **removed.** Same reason, one layer down.
- `grep -i` **removed.** It turned `Refusing:` — a string this repo's own
  dispatch guard prints — into any sentence containing the word.

**A process exit is still a milestone**, but it has to be one only a tool would
write. The convention: print `NAME EXIT: <n>` at the start of a line —
`MIGRATE EXIT: 0`, `BUILD EXIT: 1`. A bare "exit code 1" in prose deliberately
wakes nobody.

`watch-agent.sh --self-test` runs the whole table offline, from a fresh
checkout:

```
MUST NOT fire (these are what woke the CEO on 26 Aug):
  ok    quiet                 Error: connect ECONNREFUSED 127.0.0.1:54322
  …8 lines…
MUST fire (real outcomes):
  ok    "MIGRATE EXIT: 0"      MIGRATE EXIT: 0
  …10 lines…
SELF-TEST EXIT: 0
```

The watcher also stopped reading the board by adjacency. It used to run
`status-board.py 90 | grep -B1 "$T" | head -1 | awk '{print $1}'` — the state
from the line *above* the handle. It now asks
`status-board.py --handle "$T" --format tsv | cut -f1`, and no longer needs
`PYTHONIOENCODING`.

---

## What was built to stop this recurring

The five defects are small. The reason they survived two sprints is not.

`scripts/sprint.ts` is 693 lines, is what `/startsprint` and `/endsprint` drive,
and was outside **every** gate this repo has: outside `pnpm typecheck` (turbo
walks packages, and `scripts/` is not one), outside `pnpm lint` (`eslint apps
packages`) and outside `pnpm test`. PLAT-04's log recorded that as a known gap
and left it open. Nothing failed anywhere, in either direction.

Three things changed:

1. **The CLI's pure half is now tested.** Parsing and rendering moved to
   `packages/db/src/repositories/sprint-cli.ts`, which is inside all three
   gates. **25 tests** in `sprint-cli.test.ts` cover the retro read, the `why`
   field, the field-coverage guarantee and the `--backlog` parse.

   `scripts/sprint.ts` deliberately stayed where it is. Promoting it to a
   package would have been tidier; PLAT-05's spec named that exact file as the
   one it would extend, and moving a file out from under another agent's branch
   buys a merge conflict for a cosmetic win. The new module conflicts with
   nothing. (In the event PLAT-05 added `scripts/docs-sync.ts` instead and never
   touched `sprint.ts` — but the reasoning was right at the time it was made,
   which is the only moment it could have been made.)

2. **`scripts/tsconfig.json`, wired into `pnpm typecheck`.** The root script is
   now `turbo run typecheck && tsc --noEmit -p scripts/tsconfig.json`. Proven by
   breaking it on purpose:

   ```
   $ printf 'const _plat07: number = "not a number";' >> scripts/sprint.ts
   $ pnpm typecheck
   scripts/sprint.ts(709,7): error TS2322: Type 'string' is not assignable to type 'number'.
   EXIT: 2
   ```

3. **An undeclared dependency, in both CLIs.** `scripts/sprint.ts` imported
   `@supabase/supabase-js` directly, and nothing in the root `package.json` names
   that package. It resolved only because `pnpm run` puts pnpm's hidden hoist
   directory on `NODE_PATH` — `npx tsx scripts/sprint.ts` could not find it, and
   neither could `tsc`. Both now go through `createServiceClientFrom` in
   `@buddy/db/client`, which is where the repo's own `no-restricted-imports` rule
   always said the SDK belongs; the CLI was simply outside the linter's reach.

   PLAT-05's `scripts/docs-sync.ts`, merged mid-flight, had the identical defect
   and failed the new gate the moment it was added to the include list. Fixed the
   same way. A gate that covered one of the two files would not have caught it.

---

## Gates

All four, on the merged tree, exit 0:

```
pnpm typecheck   EXIT: 0     (turbo, 7 tasks + scripts/tsconfig.json)
pnpm lint        EXIT: 0
pnpm test        EXIT: 0     (5 tasks; @buddy/db 19 files / 224 tests)
pnpm build       EXIT: 0     (3 tasks)
```

Plus, from the fresh clone: `vitest run src/repositories/sprint-cli.test.ts` →
25 passed.

---

## Files

**buddy** (`0084826`):

| File | What |
|---|---|
| `packages/db/src/repositories/sprint-cli.ts` | new — the CLI's pure half: `parseCliArgs`, `flagIsSet`, `renderItem`, `renderRetro`, `itemFieldCoverage`, `HIDDEN_ITEM_FIELDS` |
| `packages/db/src/repositories/sprint-cli.test.ts` | new — 25 tests |
| `scripts/tsconfig.json` | new — puts `sprint.ts` and `docs-sync.ts` inside `pnpm typecheck` |
| `scripts/sprint.ts` | `retro N` reads; `printItem` delegates; `flagIsSet` at four call sites; help text corrected; SDK import removed |
| `scripts/docs-sync.ts` | SDK import removed (PLAT-05's file, same defect) |
| `packages/db/src/client.ts` | `createServiceClientFrom` |
| `packages/db/src/index.ts`, `packages/db/package.json` | exports |
| `package.json` | `typecheck` runs the scripts leg; `@types/node` declared |
| `skillcentral/skills/hellokahwin/scripts/status-board.py` | project scoping, `--handle`, `--format tsv\|json`, handle on the state's line, LF records |
| `skillcentral/skills/hellokahwin/scripts/watch-agent.sh` | anchored milestones, `--self-test`, board read by `--handle` |
| `skillcentral/skills/hellokahwin/SKILL.md` | the milestone convention and the scoped board |
| `skillcentral/skills/startsprint/SKILL.md` | how to read a state back safely |
| `skillcentral/skills/hellokahwin/CHANGELOG.md` | dated entry |

**Tracker:** evidence recorded on PLAT-07 (sprint 02), state `in_progress → done`.

---

## Retrospective

### What we learned that is not written down

**A field you cannot read back is a field that will drift — and worse, it pushes
the operator toward the stale copy.** The brief said this and it is exactly
right, but the second half is the part that costs money. The CLI not printing
`why` did not merely inconvenience the CEO; it sent them to
`docs/sprints/sprint-02.json`, the file the sprint rules explicitly say is not
the state. **A missing read path does not create a gap. It creates a detour, and
the detour is always to whatever stale artefact is nearest.** Every write-only
field is a quiet instruction to go and read something else.

**Four of five defects were in code no runner touched, and the fifth was in the
one file that was.** That is not a coincidence, it is the measurement. The
distribution of bugs in this repo follows the distribution of gates almost
exactly, and `scripts/` had none.

**An undeclared dependency that works is worse than one that fails.**
`@supabase/supabase-js` resolved for two sprints purely because `pnpm run` sets
`NODE_PATH` to pnpm's hidden hoist directory. Every normal invocation worked.
`npx tsx scripts/sprint.ts` did not, and neither did `tsc` — which is a large
part of why nobody type-checked the file: the first person who tried would have
hit a module-not-found that looked like their own setup being wrong.

**A watcher that fires on a word is worse than no watcher.** Three false wakes
in one day, zero completions. The CEO learned, correctly and within a day, to
discount it. A monitor nobody believes is not a neutral cost; it is an
anti-signal, because the real fire now arrives in a channel that has been
trained to be ignored.

### Which document must change, who owns the edit, and the edit

All four made, in this item, not filed as follow-ups:

| Document | Owner | Edit |
|---|---|---|
| `skillcentral/skills/hellokahwin/SKILL.md` | BMAD (made) | The milestone convention (`NAME EXIT: <n>`) and why a bare `error` never fires again; the scoped board and `--format tsv`; `--self-test` before trusting a matcher change |
| `skillcentral/skills/startsprint/SKILL.md` | BMAD (made) | "CAPTURE THE HANDLE AT DISPATCH" kept as the rule, plus how to read a state back safely now that the board emits records — the old advice was right *and* the board made even a correct handle unsafe to look up |
| `skillcentral/skills/hellokahwin/CHANGELOG.md` | BMAD (made) | Dated entry, 2026-08-26 (2) |
| `scripts/tsconfig.json` (buddy) | BMAD (made) | The gate itself, with the instruction in a comment: add a new `.ts` script here the day you write it |

One is **not** made and is named here rather than quietly dropped: nothing yet
forces a new `scripts/*.ts` file to be added to `scripts/tsconfig.json`. The
comment asks; nothing checks. `docs-sync.ts` proves the ask alone is not enough —
it shipped with the same defect within hours. A `scripts/**/*.ts` glob would be
better than a list, but it would drag in files that do not compile today. **Owner:
whoever next adds a TypeScript file to `scripts/`. Recommended: switch `include`
to a glob and fix whatever it surfaces, in one item.**

### What we did twice

**Wrote the same `serviceClient()` function twice.** `scripts/sprint.ts` and
`scripts/docs-sync.ts` contain a byte-for-byte identical credential check
(different only in which `pnpm` script the error message names). PLAT-05 copied
it from PLAT-01. Both now call the same factory, but the duplicated *check* is
still duplicated. It is small and it is the seam where the next divergence goes.

**Diagnosed the same adjacency bug at two layers.** The board printed a handle
on a line beneath its state; the watcher then read that state with `grep -B1`.
Fixing the board without fixing the watcher would have left a caller relying on
a layout that had changed. Worth stating as a rule: **when you remove an
adjacency assumption, grep for who was relying on it.**

**Reversed the module-location decision three times before writing anything.**
Package vs `packages/db` vs leave it in `scripts/`. The deciding fact —
PLAT-05's spec naming `scripts/sprint.ts` as the file it would extend — was
available in the repo from the first minute and was found last. Reading the
*other* in-flight item's spec should be step one of any item that touches a
shared file, not a thing you get to by elimination.

### What we nearly shipped, and what caught it

**A typecheck gate that covered one of the two files it should have.** The
first version of `scripts/tsconfig.json` had `"include": ["sprint.ts"]`. It
passed. Then `origin/main` moved mid-flight, PLAT-05 landed `scripts/docs-sync.ts`,
and adding that one filename to the list turned the gate red immediately on the
identical undeclared-SDK defect. **What caught it was merging origin/main before
finishing rather than after** — had the merge waited until the branch was
"done", the gate would have shipped green, hollow, and looking exactly like a
gate that worked.

**A `--backlog false` that meant true.** Making the flag bare was the whole ask.
Storing `"true"` and leaving the call sites on `"backlog" in flags` would have
passed every test in the brief and quietly read `--backlog false` as *on*. The
test asking what the *off* case does is what forced `flagIsSet`.

**A retro renderer that dropped keys.** The first draft rendered the six known
`SprintRetro` fields and silently ignored anything else. For an item whose entire
premise is *a field you cannot read back is a field that will drift*, shipping a
reader that drops unknown keys would have been the same defect wearing the fix's
clothes. Unknown keys now print verbatim.

**A `git checkout main` to do the merge.** The instinct was to switch branches in
the main checkout. `buddy-plat05` was live in a second worktree at the time.
Checking `git worktree list` first — it was on its own branch, so the merge was
safe — cost ten seconds; CLAUDE.md says a tree that has converged looks identical
to one about to be wiped by the fix.

### Follow-ups

- **`scripts/tsconfig.json` include list is a list, not a glob.** Owner: the next
  person to add a `.ts` file under `scripts/`. See above.
- **The duplicated `serviceClient()` credential check** in `sprint.ts` and
  `docs-sync.ts`. Unowned, small, not urgent.
- **`apps/web/next-env.d.ts` flips on every `pnpm build`** (`./.next/dev/types/…`
  ↔ `./.next/types/…`) and is committed. Every agent that runs the build gate
  gets a dirty file it did not author. Not touched here beyond restoring it.
  Unowned.
