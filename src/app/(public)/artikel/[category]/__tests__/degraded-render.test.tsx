import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * PLAT-16 — the route-level gate.
 *
 * `scripts/verify-degraded-page-uncacheable.mjs` is the real instrument: it
 * stalls Postgres under a built server and watches the wire. This file is the
 * cheap gate that runs on every `pnpm test`, so a future soft-fail
 * (`try { … } catch { console.error }` around a content read) is caught at
 * commit time rather than by an empty topic hub at the Vercel edge.
 *
 * TWO tests, deliberately, and they differ in exactly one thing:
 *
 *   - `getPillarView` REJECTS      -> the render must throw
 *   - `getPillarView` resolves EMPTY -> the render must succeed
 *
 * Those two produced the same HTTP 200 and the same "Panduan ini masih
 * kosong" before this change. A gate that only proves the first would pass
 * just as happily against a route that threw on everything.
 */

const categoryRow = {
  id: 'pillar-id',
  name: 'Hantaran & Mas Kahwin',
  slug: 'hantaran-mas-kahwin',
  isPillar: true,
  parentId: null,
  intro: 'Panduan hantaran.',
  description: null,
};

/** A thenable stand-in for a drizzle query builder: any method returns itself,
 *  awaiting it yields `rows`. */
function queryBuilder(rows: unknown[]) {
  const proxy: unknown = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'then') {
          return (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
            Promise.resolve(rows).then(res, rej);
        }
        return () => proxy;
      },
    },
  );
  return proxy;
}

vi.mock('next/cache', () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidateTag: vi.fn(),
}));
vi.mock('@/lib/db/drizzle', () => ({
  db: { select: () => queryBuilder([categoryRow]) },
}));
vi.mock('@/lib/cache/edge-tag', () => ({ tagEdgeResponse: async () => {} }));

const getPillarView = vi.fn();
vi.mock('@/lib/inspire/pillar-queries', () => ({
  getPillarView: (...a: unknown[]) => getPillarView(...a),
}));

const props = {
  params: Promise.resolve({ category: 'hantaran-mas-kahwin' }),
  searchParams: Promise.resolve({}),
};

// Imported here, NOT inside a test. The route pulls in the whole design-system
// CSS layer, and on a cold vitest cache that transform alone blew the 5s test
// timeout — which failed as "the route did not throw", the exact opposite of
// what had happened.
const { default: InspireCategoryPage } = await import('../page');

describe('/artikel/[category] — a pillar whose content read fails', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getPillarView.mockReset();
  });
  afterEach(() => vi.restoreAllMocks());

  it('THROWS when getPillarView fails, so no cache layer can keep the empty page', async () => {
    getPillarView.mockRejectedValue(new Error('connection terminated unexpectedly'));

    await expect(InspireCategoryPage(props)).rejects.toMatchObject({
      name: 'RenderDataUnavailableError',
      label: 'inspire-pillar:hantaran-mas-kahwin',
    });
  });

  it('RENDERS when getPillarView returns a genuinely empty pillar', async () => {
    getPillarView.mockResolvedValue({ clusters: [], unclustered: [], totalArticles: 0 });

    await expect(InspireCategoryPage(props)).resolves.toBeTruthy();
  });
});
