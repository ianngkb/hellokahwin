# Brief — BMAD — PLAT-04: sprint tracker Phase 2

**Status:** APPROVED — executing. Sprint 01, item PLAT-04, 5 points.
**Repo:** `~/Documents/Code/buddy`. **`-PermissionMode bypassPermissions`.**
**Unblocked:** PLAT-01 is merged to `feat/plat-01-sprint-tracker` — build on it.

---

## The spec is approved and it is the contract

**`_bmad-output/implementation-artifacts/spec-plat-04-sprint-tracker-phase-2.md`**,
status `ready-for-dev`. Read it fully.

## What PLAT-01 already gives you — read it before designing anything

Commits `a38b74d` and `cfa8ea9`, 3,343 insertions. Do not re-derive any of this:

- `supabase/migrations/20260825120000_sprint_tracker.sql` — `sprints` and
  `sprint_items`, RLS on both
- `packages/db/src/repositories/sprints.ts` (551 lines) — the guarded repository
  with an **explicit actor** (a user id from the web, `SYSTEM` from the CLI) and
  **compare-and-set on `updated_at`**
- `packages/db/src/repositories/sprints.test.ts` (531 lines)
- `scripts/sprint.ts` (365 lines) — the CLI
- `apps/web/app/(app)/sprints/` — the board
- `logs/2026-08-25-plat-01-sprint-tracker-board.md` — read the retrospective

**Extend the repository. Do not fork it.** One path to the table is the whole
design, and compare-and-set is what makes two writers safe — not the sharing of a
repository, which was the CEO's original false claim and was disproved in review.

## Definition of done — verbatim from the sprint file

> A second sprint can be planned entirely in the UI with items dragged from the
> backlog, and `/startsprint` executes it without touching a file. Sprint history
> shows planned vs completed vs parked per sprint. Owner and track filters work.
> The retro is attached to its sprint and readable in place.

## Two constraints from PLAT-01 that will bite you

1. **`apps/web` imports leaf subpaths only** — `@buddy/db/sprints`,
   `@buddy/db/client`. **Never the bare package name.** Turbopack does not
   resolve `./errors.js` to `errors.ts`, so a barrel import fails the build with
   dozens of errors that all point at the *package's* files and never at the
   import that caused them. Documented in buddy's `CLAUDE.md` — read it.
2. **All 39 Vercel env vars on `buddy-web` target `production` only.** There is
   no `preview` target, so a preview deployment has no Supabase credentials and
   `/sprints` fails there. Pre-existing, not yours to fix, but it means **you
   cannot review this on a preview URL** — verify locally and on production.

## Rules

- `@buddy/design-system` only; tokens, never hex. A token or shared-component
  change updates `apps/web/app/(app)/design-system/reference.tsx` in the **same**
  commit — buddy's maintenance contract.
- Additive migrations only. Making `sprint_items.sprint_id` nullable is the one
  schema change the spec sanctions; anything beyond that stops and asks.
- **Velocity is computed from the data, never typed in.** A hand-entered number
  is a number someone can flatter.
- **A closed sprint is immutable.** History that can be revised is not history.
- Credentials from the vault. `pnpm --silent`, never `pnpm run`.

## When done

Log to `docs/work-done/`, then a **`## Retrospective`** — Stage 9, mandatory.
Four questions; **name the file that must change and edit it.** Naming a document
without changing it is a failed retrospective.
