# Brief — BMAD — PLAT-01: build the sprint tracker board on buddy.ian.ng

**Status:** APPROVED — executing. Sprint 01, item PLAT-01, 8 points.
**Repo:** `~/Documents/Code/buddy` — NOT the hellokahwin site worktree.
**Dispatch with `-PermissionMode bypassPermissions`.**

---

## The spec is approved and it is the contract

**`_bmad-output/implementation-artifacts/spec-plat-01-sprint-tracker-board.md`**,
status `ready-for-dev`. Read it fully before touching anything.

It went through `/bmad-quick-dev` and a round-table review that found three
defects in the CEO's first draft. **The amendments are the valuable part — do not
skim them:**

1. **Compare-and-set on `updated_at` for every state and evidence write.** The
   first draft claimed sharing a repository made two writers safe. It does not —
   one repository prevents divergent *logic*, not lost *updates*. Without this,
   the owner dragging an item while the CLI writes evidence silently loses one of
   them. That is the cover-credit race in a new table.
2. **The CLI has no session, so `requireUserId` cannot serve it.** It uses the
   service-role key from the vault and bypasses RLS deliberately; the repository
   takes an explicit actor — a user id from the web, or `SYSTEM` from the CLI.
3. **Cards show the DoD, and there is an owner selector in Phase 1.** Both were
   pulled forward from Phase 2 because the tool's actual daily user said a board
   that cannot answer "what is mine" is useless, and a DoD behind a click is how
   DoDs get narrowed from memory.

## Definition of done — verbatim from the sprint file

> Open `buddy.ian.ng/sprints` and see all 14 Sprint 01 items grouped by track.
> Move one item's state in the UI and show `sprint get` returning the new state
> from the CLI. Move one via the CLI and show the UI reflecting it. Both
> directions quoted literally. Schema additive only; no existing buddy route
> disturbed.

**Both directions, quoted literally.** One direction proves half a system.

## Working state you should know

`buddy` is on `main` with 19 dirty files — all under `skillcentral/` and `docs/`,
none under `apps/` or `packages/`. **Your work area is clean.** Cut a feature
branch before you start; do not build on `main`.

Import from
`~/Documents/Code/hellokahwin/hellokahwin/docs/sprints/sprint-01.json` — 14 items,
one already `parked` (RISK-02, risk accepted by the owner). **The importer must
carry state across, not reset everything to `todo`.**

## Rules

- `@buddy/design-system` only; tokens, never hex. If you touch a token or shared
  component, `apps/web/app/(app)/design-system/reference.tsx` updates in the
  **same** commit — that is buddy's maintenance contract, not ours to bend.
- Additive migrations only. Any change to an existing table stops and asks.
- Credentials from the vault; never hardcoded, never printed.
- `pnpm --silent`, never `pnpm run`, for anything with a secret in argv.

## When done

Log to `docs/work-done/`, then a **`## Retrospective`** — Stage 9, mandatory.
Four questions: what did we learn that is not written down; **which document must
change and who owns the edit — name the file**; what did we do twice; what did we
nearly ship and what caught it. Then make the edits and log the paths. Naming a
document without changing it is a failed retrospective.
