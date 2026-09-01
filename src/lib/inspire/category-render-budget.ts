import { cache } from 'react';
import { startDeadlineBudget } from '@/lib/api/timeout';

/**
 * The deadline budget for one render of `/artikel/[category]`.
 *
 * ── WHY THIS EXISTS (PLAT-16, found in review) ────────────────────────────
 *
 * PLAT-16 made the route's content reads THROW instead of rendering an empty
 * page, and then verified that against `next build && next start`, where the
 * stalled request came back `HTTP 500` after **6,188ms**.
 *
 * `page.tsx` declares `maxDuration = 5`. On Vercel that render is killed at
 * 5,000ms — so the 500 that was measured is a response production would never
 * have produced, and neither the throw nor its `console.error` would ever have
 * run. The fix was right and the evidence was for the wrong artefact.
 *
 * The route gave every read its own fixed `withDeadline(…, 3_000)`, and the
 * chains are three reads deep:
 *
 *   generateMetadata  category → hierarchy → articles     3s + 3s + 3s =  9s
 *   page (grid)       category → hierarchy → articles     3s +  ∞  + 3s =  ∞
 *   page (pillar)     category → pillar view              3s + 3s      =  6s
 *
 * — the grid's middle read had no deadline at all. Every one of those is over
 * the 5s ceiling. `startDeadlineBudget` is the tool the sibling article route
 * already uses for exactly this (`@/lib/inspire/article-cache`); this is the
 * same arithmetic for this route.
 *
 * ── WHY ONE BUDGET COVERS BOTH generateMetadata AND THE PAGE ──────────────
 *
 * Because they are ONE function invocation and they run CONCURRENTLY, not in
 * sequence. That is measured, not assumed: the note at
 * `artikel/[category]/[slug]/page.tsx` records that an earlier comment claimed
 * they were sequential and that the claim is what hid Sentry TWN-NEW-47.
 *
 * So the two chains race inside the same 5,000ms, and a budget held in a
 * module-level variable would be shared by every request on the instance —
 * which is worse than no budget. React `cache()` scopes it to ONE request,
 * which is precisely the boundary wanted: `generateMetadata` and the page
 * render get the same clock, started at whichever reaches it first, and the
 * wall time of the whole render is bounded once rather than twice.
 */

/**
 * `maxDuration` as declared by `/artikel/[category]`, in milliseconds.
 *
 * ⚠️ DUPLICATED ON PURPOSE, exactly as `ARTICLE_MAX_DURATION_MS` is. Next
 * requires a route segment's `maxDuration` to be a statically readable
 * literal, so `page.tsx` cannot import this. `__tests__/category-render-
 * budget.test.ts` reads `page.tsx` as TEXT and asserts the two agree, so the
 * duplication cannot drift.
 */
export const CATEGORY_MAX_DURATION_MS = 5_000;

/**
 * Reserved for the render itself — React, serialisation, and the first flush —
 * before any of `maxDuration` is offered to the database. Same 1,000ms the
 * article route reserves, against the same measured cold-render profile.
 */
export const RENDER_RESERVE_MS = 1_000;

/** The floor `startDeadlineBudget` gives a read whose budget is exhausted. */
export const READ_FLOOR_MS = 250;

/**
 * Reads that can each still claim the floor AFTER the first read has spent the
 * budget, on the deepest chain this route has.
 *
 * Both three-deep chains — `generateMetadata`'s base-hub path and the page's
 * grid path — are `category → hierarchy → articles`, so two reads follow the
 * first. Adding a fourth read to either chain without raising this number is
 * the bug this whole module exists to make impossible.
 */
export const FLOORED_READS_AFTER_FIRST = 2;

/**
 * A FAILING REQUEST PAYS THE CHAIN TWICE, and this is the number everything
 * else here is divided by.
 *
 * When the page throws, Next renders an error document — and that pass
 * re-enters `generateMetadata` in a FRESH React `cache()` scope, so it starts a
 * second budget from zero and stalls all over again. Measured on the locked
 * table, `next start`, 02 Sep 2026, at two different budgets:
 *
 *     per-read deadline 3,000ms (before this module)  ->  6,188ms wall
 *     shared budget     3,500ms (first attempt)       ->  7,138ms wall
 *
 * Two points, both ≈ 2× the chain plus ~150ms. Sizing the budget against ONE
 * pass is what put the first attempt at 7,138ms against a 5,000ms ceiling —
 * further outside `maxDuration` than the defect it replaced.
 */
export const RENDER_PASSES_ON_FAILURE = 2;

/**
 * The shared budget one render starts with. DERIVED from the ceiling, never
 * chosen next to it — a number picked to "sit near" the limit forgets both
 * that the floors ADD and that the failing path runs twice. That is the shape
 * that produced `502 FUNCTION_RESPONSE_STREAM_INCOMPLETE` on the article route.
 *
 *   (5,000 − 1,000) / 2 − (2 × 250) = 1,500ms
 *
 * Worst case database waiting: 2 × (1,500 + 250 + 250) = 4,000ms, leaving the
 * full 1,000ms reserve. Asserted in the test rather than trusted here.
 *
 * 1,500ms is not tight for the healthy path: the same run measures a warm
 * render of this route at 42ms and the README records cold renders at ~160ms
 * since the functions moved into the database's region. It is ~9× the cold
 * render, and it is the DEADLINE, not the expected cost.
 */
export const CATEGORY_RENDER_BUDGET_MS =
  (CATEGORY_MAX_DURATION_MS - RENDER_RESERVE_MS) / RENDER_PASSES_ON_FAILURE -
  FLOORED_READS_AFTER_FIRST * READ_FLOOR_MS;

/**
 * The remaining-time function for THIS request, shared by `generateMetadata`
 * and the page render.
 *
 * Call it once per read and pass the result as the deadline:
 *
 *     const budgetLeft = categoryRenderBudget();
 *     const cat  = await withDeadline(getCat(slug),   budgetLeft(), 'a');
 *     const kids = await withDeadline(getKids(cat.id), budgetLeft(), 'b');
 */
export const categoryRenderBudget = cache(() =>
  startDeadlineBudget(CATEGORY_RENDER_BUDGET_MS, READ_FLOOR_MS),
);
