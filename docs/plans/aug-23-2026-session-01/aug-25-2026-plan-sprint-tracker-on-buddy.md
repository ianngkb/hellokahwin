# Plan — The sprint tracker on buddy.ian.ng

**Status:** PROPOSED — owner decision needed on the architecture question below.
**Owner directive, 25 Aug 2026:** *"I want the sprint planning dashboard to all
sit on buddy.ian.ng, build out something similar to JIRA, plan this out in this
sprint."*

**Supersedes** sprint item PLAT-01 as originally written (a static HTML
dashboard reading a JSON file).

---

## What already exists, and what it changes

I checked buddy before sizing this. It is a much better starting point than I
expected:

| Asset | State |
|---|---|
| `buddy.ian.ng` | **Live**, returns 307 — behind auth |
| Stack | Next.js, Chakra UI v3 via `@buddy/design-system`, Supabase |
| Existing Kanban | **`apps/web/app/(app)/tasks/kanban-board.tsx`** — 396 lines, working |
| Data layer | `packages/db/src/repositories/` — an established repository pattern |
| Auth | Already gating the app |

**We are not building JIRA from nothing.** We are adding a sprint module to a
running app that already has a board, a design system, auth and a database.

That said — **JIRA is fifteen years of product.** If "similar to JIRA" means
epics, workflows, permissions schemes, custom fields and JQL, that is not a
sprint's work or a quarter's. Below is what I think you actually want, and I have
separated it from what I would refuse to build.

---

## THE ARCHITECTURE DECISION — I need your call

Sprint state currently lives at `docs/sprints/sprint-01.json` in the hellokahwin
repo. `/startsprint` reads and writes it; `/endsprint` writes the retro into it.

If the tracker lives on buddy.ian.ng, **two things now want to write the same
state**: you, clicking in a web UI, and the CEO, running a sprint. They must not
diverge.

### Option A — Supabase is the source of truth ⭐ my recommendation

The sprint lives in buddy's database. The web app reads and writes it normally.
The skills read and write it through a small CLI (`sprint get`, `sprint set-state`,
`sprint add-evidence`).

- **For:** one source of truth, no sync, real-time UI, history and velocity come
  free from the data. Drag an item and it moves — no file to commit.
- **Against:** sprint state leaves git, so it is no longer diffable in a PR, and
  the skills gain a network dependency. Needs a schema and a CLI before anything
  renders.

### Option B — JSON files stay the source of truth, buddy reads them

The app reads the JSON from the hellokahwin repo (committed, or synced to
storage).

- **For:** state stays in git and diffable; the skills do not change at all.
- **Against:** the UI is read-mostly — clicking to change state means writing a
  file from a web app in another repo, which is awkward and slow. History and
  velocity mean parsing many files.

### Option C — Supabase source of truth, JSON exported on every write

Both. Write to Supabase, export a JSON snapshot into the repo on each change.

- **For:** git history and diffability preserved; the UI is fully interactive.
- **Against:** an export step that will drift the first time it fails silently.

**I recommend A.** The whole point of moving off a static file is an interactive
board, and Option B gives you a viewer rather than a tracker. The diffability we
lose is worth less than the sync bug we avoid — and the paper trail we actually
care about already lives in `docs/work-done/` and the decision log, not in the
sprint file.

---

## Scope — three phases, honestly sized

### Phase 1 — The board that replaces the JSON file · **8 pts**

The minimum that is genuinely a tracker rather than a report.

- **Schema + repository**: sprints, sprint_items, item_evidence. Following the
  existing `packages/db/src/repositories/` pattern.
- **Sprint board** at `/sprints` — items as cards, grouped by **track**
  (risk / platform / SEO / content), moving through **todo → in progress → done /
  blocked / parked**. Reuses the `/tasks` Kanban rather than inventing a second
  board idiom.
- **Item detail**: title, why, **definition of done**, owner, points, flags,
  brief link, and the evidence block (claim / proof / live link / verified-by-CEO).
- **Sprint header**: name, state, points burned against total, per-track split.
- **`sprint` CLI** so `/startsprint` and `/endsprint` read and write the same
  state the UI does.
- **Migrate sprint-01.json in** as the first real sprint.

**DoD:** open `buddy.ian.ng/sprints`, see all 13 Sprint 01 items in their tracks;
move one item's state in the UI and show `sprint get` returning the new state
from the CLI; move one via the CLI and show the UI reflecting it. Both directions
proven, quoted literally.

### Phase 2 — What makes it feel like JIRA · **5 pts**

- **Backlog** — items not yet in a sprint, draggable into one at planning.
- **Sprint history** with velocity per sprint: planned vs completed vs parked,
  and the sizing-accuracy note `/endsprint` records.
- **Owner filter and track filter** — see only what a given agent owns.
- **The retro** attached to its sprint and readable in place.

**DoD:** a second sprint can be planned entirely in the UI, with items dragged
from the backlog, and `/startsprint` executes it without touching a file.

### Phase 3 — Only if it earns its place · not sized, not committed

Burndown charts, comments, notifications, cross-project support, custom fields,
saved filters. **I would not build any of these until we have run three sprints
and know which absence actually hurts.** Naming them here so they are visibly
deferred rather than forgotten.

### What I will not build

Permissions schemes, workflow designers, JQL, story-point poker, release
management, time tracking. A one-person company with a fleet of agents does not
need role-based access control on its own sprint board, and every one of these
is a week that buys nothing.

---

## What this does to Sprint 01

PLAT-01 was 5 points for a static dashboard. **Phases 1 and 2 are 13 points.**

Sprint 01 goes from **34 → 42 points**.

You have already said a sprint is a body of work and completeness beats fitting a
budget, so I am **not proposing a cut** — but I owe you the honest consequence:
this sprint now contains a substantial software build alongside the content and
SEO work, and RISK-01 (the production recovery point) still runs first regardless.

**If you would rather keep Sprint 01 tight, the alternative is Phase 1 only
(8 pts, 42 → 37) with Phase 2 in Sprint 02** — the board would be usable for
running Sprint 01, and planning Sprint 02 in the UI would come later. Your call.

---

## Risks I can see from here

- **buddy is a live personal app.** A new module must not disturb what is there.
  Migrations are additive; the sprint module is a new route and new tables.
- **buddy's design system is a hard constraint, and a good one.** All UI comes
  from `@buddy/design-system`, tokens not hex, and **the reference page at
  `apps/web/app/(app)/design-system/reference.tsx` must be updated in the same PR
  as any token or shared-component change.** That is buddy's maintenance
  contract, not ours to bend.
- **Two writers on one state** is the whole reason for the architecture question
  above. Whichever option you pick, the CLI and the UI must go through one
  repository layer, never two paths to the same table.
