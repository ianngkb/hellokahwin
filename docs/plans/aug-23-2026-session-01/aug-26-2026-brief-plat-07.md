# Brief — Sprint 02 — PLAT-07: the sprint CLI tells you less than it knows

**Status:** APPROVED — executing. Sprint 02 is in progress.
**Repo:** `C:/Users/Ian Ng/Documents/Code/buddy` — the MAIN checkout.
**Dispatch mode:** `bypassPermissions`

**Another agent is working buddy in a separate worktree** (`buddy-plat05`, branch
`feat/plat-05-document-store`). Stay in the main checkout, cut your own branch, and
**do not `git checkout` anything that would move another tree's HEAD.**

## Why

The tracker stores fields it will not show you, and documents flags it does not
accept. Every one of these was hit for real during Sprint 02's first day, by the
CEO, while running the sprint the CLI exists to run.

**1. `sprint retro N` is write-only.** It attaches a retrospective and there is no
way to read one back. `sprint velocity N` cross-checks against the stored row and
prints "retro recorded … (agrees)", which proves the row is there — but nothing
prints it. The retrospective is the single most re-read document a sprint produces.

**2. `sprint get <KEY>` does not print `why` at all.** It shows title, track, owner,
points, dod, updated. The `why` is stored and unreadable. This bit hard today:
building dispatch briefs requires the item's `why` verbatim, so the CEO had to read
it out of `docs/sprints/sprint-02.json` instead — a file the sprint rules explicitly
say is NOT the state. **A field you cannot read back is a field that will drift**,
and worse, it pushed the operator toward the stale copy.

**3. `--backlog` is documented as a bare flag and demands a value.** `--help` prints
`get <ITEM-KEY> [--backlog]`, but `sprint get PLAT-05 --backlog` dies with
"--backlog needs a value." It only works as `--backlog true`. Either the parser or
the help text is wrong; they cannot both be right.

**4. `status-board.py` is not project-scoped, and prints the handle on the line
AFTER the state.** It lists terminals from every project on the machine — twn-new,
thepicklebase, article-versioning — alongside HelloKahwin's. And because the handle
is on its own line beneath the state, a naive `grep <handle>` pairs a handle with
the NEXT row's state. **That is the exact shape of the error that produced Sprint
01's wrong dispatch map**, which gave two items two agents each and left the gate
item never started. It is in `skillcentral/skills/hellokahwin/scripts/`.

**5. `watch-agent.sh` fires on any `error:` substring.** Today it woke three times:
once on the word inside a sweep script the agent was *writing*, once on a stack
trace the agent then *resolved*, once on an exit code from a probe that was working
as designed. Never on a completion. A milestone that fires on text an agent happens
to type is noise, and noise is how a real signal gets ignored.

## Definition of done

- `sprint retro N` **with no `--file`** prints the stored retrospective for sprint N,
  readable — learnings with their changed files, process findings, carried-forward.
  Sprint 01's retro is in the database; print it as the proof.
- `sprint get <KEY>` prints **`why`** alongside the other fields. Every stored field
  is either shown or deliberately hidden with a stated reason; no silent ones.
- `sprint get PLAT-05 --backlog` works **exactly as `--help` documents it**, with no
  value. Fix the parser or fix the help — and if any other flag has the same shape,
  fix it too and say which.
- `status-board.py` **scopes to a project** (a flag, or inferred from cwd), and emits
  one parseable record per terminal so a handle can never be paired with another
  row's state. It also **must not crash on a default Windows shell** — that was
  fixed today by reconfiguring stdout to UTF-8; keep it working.
- `watch-agent.sh`'s milestone matching **does not fire on arbitrary occurrences of
  `error`**. Anchor it to real outcomes — a process exit, an HTTP status line, a
  `Refusing:` — not to any line containing the word. Show a case that used to fire
  and no longer does, and a real completion that still does.
- Tests covering the retro read, the `why` field, and the `--backlog` parse.
- **`pnpm typecheck && pnpm lint && pnpm build` clean**, exit 0.

## What "shipped" means here

Merged to `origin/main` AND the commands demonstrably behave differently when run
from a fresh checkout. **A tool fix that is not merged has fixed nothing** — three
Sprint 01 items were marked done in exactly that state.

## Repo rules that bind you

- **`apps/web` imports LEAF SUBPATHS ONLY** — `@buddy/db/sprints`, never `@buddy/db`.
  Turbopack cannot resolve `./errors.js` to `errors.ts` and the failure points at the
  package's files rather than the import that caused it.
- **`date` columns are Kuala Lumpur days.** `klToday()`, never
  `toISOString().slice(0,10)` — that is the UTC day and is yesterday here for eight
  hours out of twenty-four.
- Evidence is append-only and the store refuses a claim with no proof. Do not work
  around that; it is deliberate.

## Report format

**CLAIM + EVIDENCE**, per defect, not a summary. For each of the five, show the
command failing before and working after, as literal output.

## When done

Log to `docs/work-done/` in the hellokahwin repo, then a **`## Retrospective`** —
Stage 9, mandatory. What did we learn that is not written down; **which document
must change and who owns the edit (name the file)**; what did we do twice; what did
we nearly ship and what caught it. **Then make the edit.**
