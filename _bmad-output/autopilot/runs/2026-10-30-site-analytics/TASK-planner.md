# TASK — planner (Fable): spec for hellokahwin Site Analytics

You are the PLANNER. Write ONE spec and stop. Do not implement anything.

Output: `_bmad-output/implementation-artifacts/spec-hellokahwin-site-analytics.md`
(use `/bmad-spec`, express/headless — no menus, no questions; pre-supply everything from this brief).
When done, write `_bmad-output/autopilot/runs/2026-10-30-site-analytics/planner-DONE.md` whose FIRST line is
`STATUS: done` (or `STATUS: blocked` + why), followed by a 2–3 sentence plain-language summary of the spec.

## Confirmed brief

Build first-party Site Analytics for hellokahwin.com, modelled on twn-new's, from scratch.

Findings already established (do not re-litigate):
- hellokahwin has NO analytics backend. Only `src/lib/analytics/tracker.ts` — a no-op `track(event, props)` seam;
  one live call site: `src/components/inspire/photo-gallery.tsx:197` ('Photo Gallery Opened'). No analytics tables,
  no GA tag, no collect route. No historical first-party data exists, so there is nothing to backfill.
- Reference implementation (read it, port and SIMPLIFY — do not copy wholesale):
  `C:/Users/Ian Ng/Documents/Code/twn-new/`
  - schema: `src/lib/db/schema/analytics-events.ts` (and `analytics-rollups.ts` — NOT ported, see below)
  - collect: `src/app/api/v1/analytics/collect/route.ts` (+ its tests), `src/app/api/v1/analytics/404/route.ts`
  - client: `src/lib/analytics/tracker.ts`, `src/components/analytics/track-view.tsx`, `article-scroll-tracker.tsx`, `not-found-tracker.tsx`
  - lib: `bot-detection.ts`, `bot-list.ts`, `geo.ts`, `hash.ts`, `region-name.ts`, `sql-filters.ts`, `resolve-page-titles.ts`
  - dashboard: `src/app/(admin)/admin/site-analytics/{page,dashboard,queries,cached,actions,loading}.tsx/ts`
    and shared admin pieces it imports (date-range picker, traffic toggle, page-search, safe-panel, run-batched, date-range).
- hellokahwin stack: Next 16 App Router, Drizzle + postgres (`src/lib/db`, migrations in `src/lib/db/migrations`,
  hand-numbered SQL `0001_…` — next is `0005_…`; RLS is enabled on the public schema per 0001, so a new table needs the
  same RLS treatment), Clerk admin auth (`src/lib/auth/admin.ts`: `requireAdminSection`), Vercel sin1, vitest.
  hellokahwin already has `src/lib/admin/safe-panel.ts` — reuse what exists before porting.

Hard constraints:
1. NO cron, NO scheduled job, NO GitHub Action. Commit 4e8aaaf removed all scheduled automation on purpose.
   So twn-new's rollup tables / rollup-refresh are OUT. Dashboard queries read `analytics_events` directly, indexed.
2. Privacy parity with twn-new: no raw IP stored; daily-rotating visitor hash (salted) + an anonymous first-party
   visitor-id cookie; bot rows stored but flagged (`is_bot`) and excluded by default with a humans/bots/all toggle.
3. Geo from Vercel request headers (country / region / city / lat / long). City estimation from cities15k.json is OUT
   (heavy, backfill-oriented) unless trivially small — your call, justify it.
4. The existing `track()` seam keeps its signature so the photo-gallery call site starts recording with no change.
5. Pageviews recorded on every public route (the `(public)` route group), NOT on `/admin`, `/login`, preview or print routes.
6. Malay-first public site, but the admin dashboard is English (as the rest of admin is).
7. Admin nav: add a Site Analytics entry wherever the admin console lists its sections.

Dashboard scope (parity, minus rollups/upsell/lead-specific panels that are TWN business features):
top stats (unique visitors, visits, pageviews, views/visit, bounce rate, avg visit duration) with previous-period
comparison; time-series chart; sources/referrers; UTM medium & campaign; top / entry / exit pages (with resolved
article titles); countries → states → cities; browsers, OS, screen sizes; humans vs bots counts; date-range picker
(KL timezone). Leave out: conversions/upsell, lead Trace, live route, ad analytics, search analytics.

Out of scope, note as follow-ups in the spec: importing GSC history (service account lost access), GA, rollups.

## Spec must end with the verification plan — exactly this shape

```markdown
## Verification plan

### Dev checks (run in the worktree before review)

| ID | What | How (command or steps) | Expected | Kind |
| --- | --- | --- | --- | --- |

### Prod checks (run by the ship worker after the deploy, on the live site)

| ID | URL / action | Expected observable | Method | Side effects & cleanup |
| --- | --- | --- | --- | --- |
```
Rules: at least one dev check must go RED when the change is reverted; every user-visible requirement gets ≥1 prod
check; prod checks are read-only unless the row names its cleanup (a test pageview row is acceptable data — name how
it's identified, e.g. a `?utm_source=autopilot-verify` tag, and whether it is deleted).

Also include in the spec: the DB change (migration SQL outline + whether it's additive-only), and how the dashboard
stays fast without rollups (indexes, date-bounded queries, caching approach).
