import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CATEGORY_MAX_DURATION_MS,
  CATEGORY_RENDER_BUDGET_MS,
  FLOORED_READS_AFTER_FIRST,
  RENDER_PASSES_ON_FAILURE,
  READ_FLOOR_MS,
  RENDER_RESERVE_MS,
} from '../category-render-budget';

const ROUTE = path.join(process.cwd(), 'src/app/(public)/artikel/[category]/page.tsx');

/**
 * PLAT-16, found in review.
 *
 * The fix made the route THROW on a failed content read, and the throw was
 * verified against `next start`, which does not enforce `maxDuration`. The
 * stalled request took 6,188ms against a declared ceiling of 5s: on Vercel the
 * function is killed first, so neither the throw nor its log ever runs and the
 * measured 500 is a response production cannot produce.
 *
 * The arithmetic that stops that is asserted here rather than trusted to the
 * comment that describes it — same shape as `article-cache.test.ts`, for the
 * same reason.
 */
describe('the category render can never spend maxDuration on database waiting', () => {
  it('leaves the full render reserve after the deepest chain of reads, TWICE', () => {
    // Twice, because a failing request pays the chain twice: the render, then
    // Next's error document, which re-enters generateMetadata in a fresh React
    // cache() scope and starts a second budget from zero. Measured — 3,000ms
    // per read gave 6,188ms wall and a 3,500ms shared budget gave 7,138ms,
    // both against a 5,000ms ceiling.
    const oneChain = CATEGORY_RENDER_BUDGET_MS + FLOORED_READS_AFTER_FIRST * READ_FLOOR_MS;
    const worstCaseDbWait = RENDER_PASSES_ON_FAILURE * oneChain;
    expect(worstCaseDbWait).toBe(CATEGORY_MAX_DURATION_MS - RENDER_RESERVE_MS);
    expect(worstCaseDbWait).toBeLessThan(CATEGORY_MAX_DURATION_MS);
    // And the budget must stay a whole number of milliseconds — the division
    // above is the one place a fractional deadline could sneak in.
    expect(Number.isInteger(CATEGORY_RENDER_BUDGET_MS)).toBe(true);
    expect(CATEGORY_RENDER_BUDGET_MS).toBeGreaterThan(READ_FLOOR_MS);
  });

  it('agrees with the maxDuration the route actually declares', () => {
    // Next requires a route segment's `maxDuration` to be a literal it can read
    // statically, so `page.tsx` cannot import CATEGORY_MAX_DURATION_MS. Read it
    // as text instead, so the duplication cannot drift.
    const route = readFileSync(ROUTE, 'utf8');
    const declared = route.match(/^export const maxDuration = (\d+);$/m);
    expect(declared, 'page.tsx must declare maxDuration as a literal').not.toBeNull();
    expect(Number(declared![1]) * 1_000).toBe(CATEGORY_MAX_DURATION_MS);
  });

  it('leaves no fixed per-read deadline behind in the route', () => {
    // The defect was nine reads each independently promising not to exceed
    // 3,000ms — which permits 9,000ms on the metadata chain alone. Every one of
    // them must draw on the shared clock instead. This assertion is what makes
    // adding a tenth read with a fresh literal fail at commit time.
    const route = readFileSync(ROUTE, 'utf8');
    // Prettier puts each deadline argument on its own line, so a bare
    // `3_000,` line IS a fixed deadline. Matching the call site instead was
    // tried and is wrong: `withDeadline\([^)]*?,\s*\d+\s*,` matches the `1` in
    // `getCategoryArticles(allCategoryIds, 1, ARTICLES_PER_PAGE)` — a regex
    // cannot balance the parens, and the first version of this gate failed on
    // that false positive rather than on a real one.
    const literals = route.match(/^\s*\d[\d_]*,\s*$/gm) ?? [];
    expect(
      literals,
      `numeric literal arguments on their own line (fixed deadlines?): ${literals.join(' | ')}`,
    ).toHaveLength(0);

    // Exact, not a minimum: adding a tenth read means re-deriving
    // FLOORED_READS_AFTER_FIRST, and this is the line that makes you.
    const budgeted = route.match(/budgetLeft\(\)/g) ?? [];
    expect(
      budgeted.length,
      'every deadline in the route draws on the shared budget — if you added a read, ' +
        're-derive FLOORED_READS_AFTER_FIRST before bumping this number',
    ).toBe(9);
  });

  it('starts one budget per request, not one per module load', () => {
    // A module-level `startDeadlineBudget(...)` would be shared by every
    // request the instance ever serves — a budget that is already exhausted by
    // the time the second reader arrives. React `cache()` scopes it to one
    // request; assert the route reaches it through the accessor rather than a
    // constant.
    const route = readFileSync(ROUTE, 'utf8');
    expect(route).toContain('categoryRenderBudget()');
    expect(route).not.toMatch(/startDeadlineBudget\(/);
  });
});
