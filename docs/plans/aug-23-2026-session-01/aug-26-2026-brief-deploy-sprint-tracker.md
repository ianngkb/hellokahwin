# Brief — BMAD — Deploy the sprint tracker. It was never shipped.

**Status:** APPROVED — executing. Sprint 01, PLAT-01 + PLAT-04, both reopened.
**Repo:** `~/Documents/Code/buddy`. **`-PermissionMode bypassPermissions`.**

---

## What happened, and it is on me

PLAT-01 and PLAT-04 were built, committed, tested and marked done. **Neither was
ever merged or deployed.** `origin/main` is still `36d887a`; `a38b74d` and
`cfa8ea9` are not ancestors of it. The work sits on:

- `feat/plat-01-sprint-tracker`
- `feat/plat-04-sprint-tracker-phase-2`

PLAT-01's definition of done says *"Open `buddy.ian.ng/sprints` and see all 14
Sprint 01 items."* That requires a deployment. The CEO verified the commits, the
file inventory and the CLI proving both directions, and treated that as the DoD
met. It is the middle row of the ship-check table the CEO wrote two days ago:
**committed is not deployed.**

**The trap that let it pass, and you should know it before you verify anything:**
`buddy.ian.ng/sprints` returns 307. So does `/tasks`. So does
`/definitely-not-a-real-route-xyz`. **The auth redirect fires before routing, so
from outside, a route that does not exist is indistinguishable from one that
does.** A status code alone can never prove this deployment. Do not use one.

## What to do

1. **Merge both branches to `main`**, PLAT-01 first — PLAT-04 builds on its
   schema and repository. Resolve honestly; do not force.
2. **Run the gates on the merged result before pushing**, not on either branch
   alone: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`. Two branches
   that each pass can still fail together.
3. **Push and let the deployment run.** Report the deployment id and its state.

## Prove it — and a status code will not do

The DoD is *seeing the items*, so prove that:

- **Authenticate and fetch `/sprints`**, then quote from the response body: the
  sprint name "Protect what we shipped, then measure it", the points line, and at
  least three item keys (`RISK-01`, `PLAT-01`, `SEO-02`). **Body content, not a
  status code.**
- **Prove the negative control**: show that `/definitely-not-a-real-route-xyz`
  does NOT return that content while `/sprints` does. That is what distinguishes
  a deployed route from an auth wall.
- **Prove both directions still work against production**, as PLAT-01's DoD
  requires: move an item's state in the deployed UI and read it back with
  `sprint get`; move one with the CLI and see the deployed UI reflect it.
- **PLAT-04's surfaces**: the backlog panel, sprint history with velocity, and
  the owner and track filters, each shown working on the deployed site.

## Two things already known that will bite you

- **All 39 Vercel env vars on `buddy-web` target `production` only.** There is no
  `preview` target, so `/sprints` cannot be reviewed on a preview URL and neither
  can any route touching Supabase. Verify on production.
- **`apps/web` imports leaf subpaths only** — `@buddy/db/sprints`, never the bare
  package. Turbopack does not resolve `./errors.js` to `errors.ts`, and a barrel
  import fails the build with errors that all point at the package's files rather
  than the import that caused them. It is in buddy's `CLAUDE.md`.

## Rules

- Additive migrations only; both are already written and must apply cleanly in
  order.
- `@buddy/design-system` only. A token or shared-component change updates
  `apps/web/app/(app)/design-system/reference.tsx` in the same commit.
- `pnpm --silent`, never `pnpm run`, for anything with a secret in argv.

## When done

Log to `docs/work-done/`, then a **`## Retrospective`** — Stage 9, mandatory.
The question it should answer: **two items passed a definition of done that
required a deployment, without one. What check would have caught that at the
moment of marking, rather than a day later when the owner asked?** Name the file,
edit it, log the path.
