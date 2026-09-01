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
 * FOUR tests, in two pairs, and each pair differs in exactly ONE thing:
 *
 *   PILLAR  read rejects -> must throw   |  read returns EMPTY -> must render
 *   GRID    read rejects -> must throw   |  read returns EMPTY -> must render
 *
 * Both directions, on both shapes, because:
 *
 *  - a gate that only proved the throw would pass just as happily against a
 *    route that threw on everything, and "empty" is a legitimate state this
 *    site actually has;
 *  - the first version of this file covered only the PILLAR path, so
 *    re-wrapping the grid's `getCategoryArticles` read in the old
 *    `try/catch { console.error }` left the suite green. Found in review, not
 *    by the gate. Half a gate is the shape of a gate.
 *
 * THE DB MOCK FAILS THE WAY THE REAL FAILURE FAILS. It rejects only for reads
 * that touch `articles`, and leaves `inspire_categories` answering — which is
 * exactly what `LOCK TABLE articles IN ACCESS EXCLUSIVE MODE` does in the live
 * script. A mock that failed every query would fail on the category lookup and
 * never reach the render, i.e. never reach the defect.
 */

/** Drizzle stamps its table name on the table object under this symbol. */
const DRIZZLE_NAME = Symbol.for('drizzle:Name');

/** Table names whose reads should reject, set per test. */
let failingTables = new Set<string>();
/** Rows the `articles` reads resolve with when they are not failing. */
let articleRows: unknown[] = [];

let categoryRow: Record<string, unknown> = {};

/**
 * A thenable stand-in for a drizzle query builder. Any method returns itself;
 * `.from(table)` records which table this chain reads so the await can reject
 * or resolve accordingly.
 */
function queryBuilder(defaultRows: () => unknown[]) {
  let table: string | undefined;
  const proxy: unknown = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'then') {
          return (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => {
            if (table && failingTables.has(table)) {
              return Promise.reject(
                new Error(`connection terminated unexpectedly reading ${table}`),
              ).then(res, rej);
            }
            return Promise.resolve(table === 'articles' ? articleRows : defaultRows()).then(
              res,
              rej,
            );
          };
        }
        if (prop === 'from' || prop === 'innerJoin' || prop === 'leftJoin') {
          return (t: unknown) => {
            const name = (t as Record<symbol, string> | null)?.[DRIZZLE_NAME];
            // The FIRST table a chain names is the one it reads from; joins
            // only widen it. `articles` anywhere in the chain is enough to
            // stall it, which is what the table lock does.
            if (prop === 'from') table = name ?? table;
            if (name === 'articles') table = 'articles';
            return proxy;
          };
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
  db: {
    select: () => queryBuilder(() => [categoryRow]),
    selectDistinct: () => queryBuilder(() => [categoryRow]),
  },
}));
vi.mock('@/lib/cache/edge-tag', () => ({ tagEdgeResponse: async () => {} }));

const getPillarView = vi.fn();
vi.mock('@/lib/inspire/pillar-queries', () => ({
  getPillarView: (...a: unknown[]) => getPillarView(...a),
}));

// Imported here, NOT inside a test. The route pulls in the whole design-system
// CSS layer, and on a cold vitest cache that transform alone blew the 5s test
// timeout — which failed as "the route did not throw", the exact opposite of
// what had happened.
const { default: InspireCategoryPage } = await import('../page');

function render(slug: string) {
  return InspireCategoryPage({
    params: Promise.resolve({ category: slug }),
    searchParams: Promise.resolve({}),
  });
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  getPillarView.mockReset();
  failingTables = new Set();
  articleRows = [];
});
afterEach(() => vi.restoreAllMocks());

describe('/artikel/[pillar] — the pillar shape', () => {
  beforeEach(() => {
    categoryRow = {
      id: 'pillar-id',
      name: 'Hantaran & Mas Kahwin',
      slug: 'hantaran-mas-kahwin',
      isPillar: true,
      parentId: null,
      intro: 'Panduan hantaran.',
      description: null,
    };
  });

  it('THROWS when getPillarView fails, so no cache layer can keep the empty page', async () => {
    getPillarView.mockRejectedValue(new Error('connection terminated unexpectedly'));

    await expect(render('hantaran-mas-kahwin')).rejects.toMatchObject({
      name: 'RenderDataUnavailableError',
      label: 'inspire-pillar:hantaran-mas-kahwin',
    });
  });

  it('RENDERS when getPillarView returns a genuinely empty pillar', async () => {
    getPillarView.mockResolvedValue({ clusters: [], unclustered: [], totalArticles: 0 });

    await expect(render('hantaran-mas-kahwin')).resolves.toBeTruthy();
  });
});

describe('/artikel/[category] — the grid shape', () => {
  beforeEach(() => {
    categoryRow = {
      id: 'grid-id',
      name: 'Idea & Nasihat',
      slug: 'idea-dan-nasihat',
      isPillar: false,
      parentId: null,
      intro: null,
      description: null,
    };
  });

  it('THROWS when the article listing read fails', async () => {
    failingTables = new Set(['articles']);

    await expect(render('idea-dan-nasihat')).rejects.toMatchObject({
      name: 'RenderDataUnavailableError',
      label: 'inspire-category-articles:idea-dan-nasihat',
    });
  });

  it('THROWS when the category-hierarchy read fails', async () => {
    // This read had no deadline and no guard at all before PLAT-16. Its result
    // decides `categoryIds`, so soft-failing it would render a NARROWER
    // article set as though it were the whole category — a quieter lie than
    // the empty page, and a harder one to notice.
    failingTables = new Set(['inspire_categories']);

    await expect(render('idea-dan-nasihat')).rejects.toBeInstanceOf(Error);
  });

  it('RENDERS when the category is genuinely empty', async () => {
    articleRows = [];

    await expect(render('idea-dan-nasihat')).resolves.toBeTruthy();
  });
});
