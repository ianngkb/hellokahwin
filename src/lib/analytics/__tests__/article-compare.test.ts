import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';

/**
 * The comparison getters (R8–R10): one statement per metric for ALL picked
 * articles, matched on exact resolved paths, bounded by the 365-day floor,
 * no COUNT(DISTINCT), every slug in the answer, drop-off bands per R9.
 */

vi.mock('server-only', () => ({}));
vi.mock('@sentry/nextjs', () => ({ captureMessage: vi.fn(), captureException: vi.fn() }));

// `unstable_cache` passthrough that records the arguments each cached call got,
// so the cache-key test can see the key the wrapper was handed.
const cacheCalls: { key: string; args: unknown[] }[] = [];
vi.mock('next/cache', () => ({
  unstable_cache:
    (fn: (...a: unknown[]) => unknown, key: string[]) =>
    (...args: unknown[]) => {
      cacheCalls.push({ key: key.join('|'), args });
      return fn(...args);
    },
}));
vi.mock('react', async (orig) => ({
  ...(await orig<typeof import('react')>()),
  cache: (fn: unknown) => fn,
}));

// Answers are routed by the statement's text, not call order, because the five
// metrics run in parallel.
// A router may also return a Promise (to hold a statement open, or reject).
type Router = (sql: string) => unknown[] | Promise<unknown[]> | undefined;
let route: Router = () => undefined;
const statements: { sql: string; params: unknown[] }[] = [];
// Peak number of analytics_events statements in flight at once.
let inFlight = 0;
let peakInFlight = 0;
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    execute: async (q: SQL) => {
      const { sql, params } = new PgDialect().sqlToQuery(q);
      statements.push({ sql, params });
      const analytics =
        sql.includes('FROM analytics_events') &&
        !sql.includes('FROM articles a') &&
        !sql.includes('analytics_visitor_target_daily');
      if (analytics) peakInFlight = Math.max(peakInFlight, ++inFlight);
      try {
        // A macrotask, so every statement the caller started is in flight together.
        await new Promise((r) => setTimeout(r, 0));
        return (await route(sql)) ?? [];
      } finally {
        if (analytics) inFlight--;
      }
    },
  },
}));

const cmp = await import('../article-compare');
const { SCROLL_TRACKING_SINCE } = await import('../scroll-tracking');

const A = 'takun-villa';
const B = 'garden-wedding';
const PATHS = new Map<string, string[]>([
  [A, [`/artikel/real-weddings/${A}`, `/artikel/real-weddings/${A}/`]],
  [B, [`/artikel/venues/${B}`, `/artikel/venues/${B}/`]],
]);
const ALL_PATHS = [...PATHS.values()].flat().sort();

const isTotals = (s: string) => s.includes('unique_visitors');
const isScroll = (s: string) =>
  s.includes("event_name = 'scroll_depth'") && !s.includes("'pageview'");
const isDropOff = (s: string) => s.includes('per_visitor');
const isSources = (s: string) => s.includes('referrer');
const isDevices = (s: string) => s.includes('screen_width');

beforeEach(() => {
  route = () => undefined;
  statements.length = 0;
  cacheCalls.length = 0;
  inFlight = 0;
  peakInFlight = 0;
});

// The cached path resolves through the (mocked) resolver statement first.
const RESOLVER_ROWS = [
  { slug: A, category_slug: 'real-weddings' },
  { slug: B, category_slug: 'venues' },
];
// Its three statements: canonical paths (articles), the rollup ledger's closed
// days (the raw floor) and seen aliases (the rollup + raw).
const isResolver = (s: string) =>
  s.includes('FROM articles a') ||
  s.includes('WHERE rn <= ') ||
  s.includes('FROM article_category_redirects');

// A count cast to a 32-bit int type (throws past 2,147,483,647). The `\b`
// is the textual word-boundary escape, so `::bigint` and `::int8` stay legal.
const NARROW_INT_COUNT = /(COUNT\(\*\)|SUM\(n\))(\s+FILTER \(WHERE opened\))?::(int4?|integer)\b/;

describe('SQL shape', () => {
  it('the narrow-int guard can fail: it rejects int casts and allows bigint', () => {
    expect('SELECT COUNT(*)::int AS visitors').toMatch(NARROW_INT_COUNT);
    expect('SELECT COUNT(*)::int\nFROM x').toMatch(NARROW_INT_COUNT);
    expect('SELECT SUM(n)::integer AS views').toMatch(NARROW_INT_COUNT);
    expect('COUNT(*) FILTER (WHERE opened)::int4 AS opened').toMatch(NARROW_INT_COUNT);
    expect('SELECT COUNT(*)::bigint AS visitors').not.toMatch(NARROW_INT_COUNT);
    expect('SELECT COUNT(*)::int8 AS visitors').not.toMatch(NARROW_INT_COUNT);
  });

  // The third column: does the statement read only pageviews, and so carry the
  // partial covering index's `pathname LIKE '/artikel/%'` (ARTIKEL_PATH_SCOPE)?
  const METRICS = [
    ['totals', cmp.getCompareTotalsUncached, true],
    ['scroll', cmp.getCompareScrollUncached, false],
    // Mixed: its pageview half carries the scope, its scroll half does not (I-F22).
    ['dropoff', cmp.getCompareDropOffUncached, 'pageviewHalf'],
    ['sources', cmp.getCompareSourcesUncached, true],
    ['devices', cmp.getCompareDevicesUncached, true],
  ] as const;

  it.each(METRICS)(
    '%s is ONE statement for all slugs, exact paths, bounded, no COUNT(DISTINCT)',
    async (_n, getter, pageviewOnly) => {
      await getter([A, B], PATHS);
      expect(statements).toHaveLength(1);
      const { sql, params } = statements[0];
      expect(sql).toContain('FROM analytics_events');
      // Exact-path match: the whole union of paths is ONE bind parameter.
      expect(sql).toMatch(
        /pathname = ANY \(ARRAY\(SELECT jsonb_array_elements_text\(\$\d+::text::jsonb\)\)\)/,
      );
      expect(params).toContain(JSON.stringify(ALL_PATHS));
      // The slug is recovered only in the SELECT list, never in the filter.
      const where = sql.slice(sql.indexOf('WHERE'));
      expect(where.slice(0, where.indexOf('GROUP BY'))).not.toContain('split_part(pathname');
      if (pageviewOnly) {
        // ALONGSIDE the exact-path match, never instead of it: the partial
        // index idx_analytics_events_artikel_pageview is only usable when the
        // statement repeats its predicate — without it, a cold read costs one
        // random heap page per matched row (5.4 s on prod, 2026-11-08).
        expect(sql).toMatch(
          /pathname = ANY \(ARRAY\(SELECT jsonb_array_elements_text\(\$\d+::text::jsonb\)\)\)\s+AND pathname LIKE '\/artikel\/%'/,
        );
        expect(sql).toContain("event_name = 'pageview'");
      } else if (pageviewOnly === 'pageviewHalf') {
        const pv = sql.slice(sql.indexOf('WITH pv AS'), sql.indexOf('sc AS ('));
        const sc = sql.slice(sql.indexOf('sc AS ('), sql.indexOf('per_visitor AS'));
        expect(pv).toContain("event_name = 'pageview'");
        expect(pv).toMatch(
          /pathname = ANY \(ARRAY\(SELECT jsonb_array_elements_text\(\$\d+::text::jsonb\)\)\)\s+AND pathname LIKE '\/artikel\/%'/,
        );
        expect(sc).toContain("event_name = 'scroll_depth'");
        expect(sc).not.toContain("LIKE '/artikel/%'");
      } else {
        expect(sql).not.toContain("LIKE '/artikel/%'");
      }
      expect(sql).toContain("created_at >= NOW() - INTERVAL '365 days'");
      expect(sql).toContain('is_bot = FALSE');
      expect(sql).not.toMatch(/COUNT\s*\(\s*DISTINCT/i);
      // Counts are bigint: an `int` cast throws past 2,147,483,647.
      expect(sql).toContain('::bigint');
      expect(sql).not.toMatch(NARROW_INT_COUNT);
    },
  );

  it('T4-F1: sources keep the top 8 by name and sum the rest into ONE "Other sources" row', async () => {
    await cmp.getCompareSourcesUncached([A], PATHS);
    const { sql, params } = statements[0];
    // Never a hard cut at the top 8: every source past them is summed, so the
    // dashboard's share denominator is the article's true total.
    expect(sql).not.toMatch(/WHERE rn <= \$\d+/);
    expect(sql).toMatch(/CASE WHEN rn <= \$\d+ THEN name ELSE \$\d+ END AS name/);
    expect(sql).toContain('SUM(visitors)::bigint AS visitors');
    expect(sql).toMatch(/ORDER BY slug, MIN\(rn\)/);
    expect(params).toContain(8);
    expect(params).toContain('Other sources');
  });

  // I-F22: one mixed pageview+scroll scan could not use the pageview-only
  // covering index (2.3-6.9 s cold on prod). The pageview half must be its
  // own scan carrying the index predicate, full-joined to the scroll half.
  it('I-F22: drop-off reads pageviews and scrolls in SEPARATE scans, full-joined per visitor', async () => {
    await cmp.getCompareDropOffUncached([A], PATHS);
    const { sql } = statements[0];
    expect(sql).not.toMatch(/event_name IN \('pageview', 'scroll_depth'\)/);
    expect(sql).toMatch(
      /FULL JOIN sc ON sc\.slug = pv\.slug AND sc\.visitor_hash = pv\.visitor_hash/,
    );
    expect(sql).toContain('(pv.visitor_hash IS NOT NULL) AS opened');
    // Both halves floored at the tracking date.
    expect(sql.match(/created_at >= \$\d+/g)).toHaveLength(2);
  });

  it('drop-off starts at the read-depth tracking date (KL midnight of SCROLL_TRACKING_SINCE)', async () => {
    await cmp.getCompareDropOffUncached([A], PATHS);
    const klMidnight = new Date(`${SCROLL_TRACKING_SINCE}T00:00:00+08:00`).toISOString();
    expect(statements[0].params).toContain(klMidnight);
  });

  it('runs no statement for an empty list or slugs with no paths', async () => {
    expect((await cmp.getArticlesCompareUncached([], PATHS)).size).toBe(0);
    const ghosts = await cmp.getArticlesCompareUncached(['ghost'], new Map([['ghost', []]]));
    expect(statements).toHaveLength(0);
    expect(ghosts.get('ghost')).toMatchObject({ views: 0, uniqueVisitors: 0, sources: [] });
  });

  it('the full compare is exactly five analytics statements, whatever the slug count', async () => {
    await cmp.getArticlesCompareUncached([A, B], PATHS);
    expect(statements).toHaveLength(5);
    expect(statements.filter((s) => isTotals(s.sql))).toHaveLength(1);
    expect(statements.filter((s) => isScroll(s.sql))).toHaveLength(1);
    expect(statements.filter((s) => isDropOff(s.sql))).toHaveLength(1);
    expect(statements.filter((s) => isSources(s.sql))).toHaveLength(1);
    expect(statements.filter((s) => isDevices(s.sql))).toHaveLength(1);
  });
});

describe('row → shape mapping', () => {
  it('maps every metric per slug and keeps every requested slug', async () => {
    route = (s) => {
      if (isTotals(s)) return [{ slug: A, views: '21', unique_visitors: 15 }];
      if (isScroll(s))
        return [
          { slug: A, percent: 25, visitors: 9 },
          { slug: A, percent: 50, visitors: '6' },
        ];
      if (isDropOff(s)) return [{ slug: A, top: null, visitors: 4, opened: 4 }];
      if (isSources(s))
        return [
          { slug: A, name: 'google.com', visitors: 10 },
          { slug: A, name: 'Direct / None', visitors: 5 },
        ];
      if (isDevices(s)) return [{ slug: A, name: 'Mobile', visitors: '12' }];
      return undefined;
    };
    const out = await cmp.getArticlesCompareUncached([B, A], PATHS);
    expect([...out.keys()]).toEqual([B, A].sort());
    expect(out.get(A)).toEqual({
      views: 21,
      uniqueVisitors: 15,
      scroll: [
        { percent: 25, visitors: 9 },
        { percent: 50, visitors: 6 },
        { percent: 75, visitors: 0 },
        { percent: 100, visitors: 0 },
      ],
      dropOff: [
        { band: 0, visitors: 4, share: 1 },
        { band: 25, visitors: 0, share: 0 },
        { band: 50, visitors: 0, share: 0 },
        { band: 75, visitors: 0, share: 0 },
        { band: 100, visitors: 0, share: 0 },
      ],
      sources: [
        { name: 'google.com', visitors: 10 },
        { name: 'Direct / None', visitors: 5 },
      ],
      devices: [{ name: 'Mobile', visitors: 12 }],
    });
    // B has no rows anywhere: present, all zeros / empty, never missing.
    expect(out.get(B)).toEqual({
      views: 0,
      uniqueVisitors: 0,
      scroll: [25, 50, 75, 100].map((percent) => ({ percent, visitors: 0 })),
      dropOff: [0, 25, 50, 75, 100].map((band) => ({ band, visitors: 0, share: 0 })),
      sources: [],
      devices: [],
    });
  });

  it('reads counts past the int range exactly, and clamps beyond 2^53 - 1', async () => {
    route = (s) =>
      isTotals(s) ? [{ slug: A, views: '3000000000', unique_visitors: '2147483648' }] : undefined;
    const out = await cmp.getCompareTotalsUncached([A], PATHS);
    expect(out.get(A)).toEqual({ views: 3_000_000_000, uniqueVisitors: 2_147_483_648 });
    expect(cmp.toCount('99999999999999999999')).toBe(Number.MAX_SAFE_INTEGER);
    expect(cmp.toCount(12n)).toBe(12);
    expect(cmp.toCount(null)).toBe(0);
    expect(cmp.toCount('garbage')).toBe(0);
  });

  it('ignores rows for slugs that were not requested', async () => {
    route = (s) => (isTotals(s) ? [{ slug: 'other', views: 99, unique_visitors: 9 }] : undefined);
    const out = await cmp.getCompareTotalsUncached([A], PATHS);
    expect([...out.keys()]).toEqual([A]);
    expect(out.get(A)).toEqual({ views: 0, uniqueVisitors: 0 });
  });
});

describe('drop-off bands (R9)', () => {
  it('R9 example: A at 25/50/75 and B at 25 → 75 % = 1, 25 % = 1', async () => {
    // The statement's answer for that fixture: one visitor topped at 75, one
    // at 25, both opened the article; nobody else opened it.
    route = (s) =>
      isDropOff(s)
        ? [
            { slug: A, top: 75, visitors: 1, opened: 1 },
            { slug: A, top: 25, visitors: 1, opened: 1 },
          ]
        : undefined;
    const bands = (await cmp.getCompareDropOffUncached([A], PATHS)).get(A)!;
    expect(bands).toEqual([
      { band: 0, visitors: 0, share: 0 },
      { band: 25, visitors: 1, share: 0.5 },
      { band: 50, visitors: 0, share: 0 },
      { band: 75, visitors: 1, share: 0.5 },
      { band: 100, visitors: 0, share: 0 },
    ]);
  });

  it('"Left before scrolling" = never-scrolled openers, shares over the band total', async () => {
    route = (s) =>
      isDropOff(s)
        ? [
            { slug: A, top: null, visitors: 3, opened: 3 },
            { slug: A, top: 75, visitors: 1, opened: 1 },
            { slug: A, top: 25, visitors: 1, opened: 1 },
          ]
        : undefined;
    const bands = (await cmp.getCompareDropOffUncached([A], PATHS)).get(A)!;
    expect(bands.map((b) => [b.band, b.visitors])).toEqual([
      [0, 3],
      [25, 1],
      [50, 0],
      [75, 1],
      [100, 0],
    ]);
    expect(bands[0].share).toBeCloseTo(0.6);
    expect(bands.reduce((a, b) => a + b.share, 0)).toBeCloseTo(1);
  });

  it('I-F1: scroll-only visitors never erase genuine "left before scrolling" openers', async () => {
    // 3 openers never scrolled; 2 more hashes scrolled to 50 % with NO
    // in-window pageview (scrolled a pageview from before the window). The old
    // "openers minus scrollers" maths gave band 0 = 3 - 2 = 1.
    route = (s) =>
      isDropOff(s)
        ? [
            { slug: A, top: null, visitors: 3, opened: 3 },
            { slug: A, top: 50, visitors: 2, opened: 0 },
          ]
        : undefined;
    const bands = (await cmp.getCompareDropOffUncached([A], PATHS)).get(A)!;
    expect(bands.map((b) => [b.band, b.visitors])).toEqual([
      [0, 3],
      [25, 0],
      [50, 2],
      [75, 0],
      [100, 0],
    ]);
    expect(bands[0].share).toBeCloseTo(0.6);
  });

  it('buildDropOffBands takes band 0 as given and never goes negative', () => {
    const bands = cmp.buildDropOffBands(
      1,
      new Map([
        [50, 2],
        [100, 1],
      ]),
    );
    expect(bands.map((b) => b.visitors)).toEqual([1, 0, 2, 0, 1]);
    expect(cmp.buildDropOffBands(-5, new Map())[0]).toEqual({ band: 0, visitors: 0, share: 0 });
  });

  it('sums counts into each aggregate precision-safely (exact, or clamped at 2^53 - 1)', async () => {
    const MAX = Number.MAX_SAFE_INTEGER;
    expect(cmp.addCounts(MAX, 1)).toBe(MAX);
    expect(cmp.addCounts(MAX - 1, 4)).toBe(MAX);
    expect(cmp.addCounts(2 ** 52, 2 ** 52 - 1)).toBe(MAX);
    expect(cmp.addCounts(3, 4, 5)).toBe(12);
    expect(cmp.addCounts()).toBe(0);
    // Query path: the openers total and the 25 % band each sum two rows whose
    // true total passes 2^53 - 1. Plain `+` gives 2^53 + 2 for both.
    route = (s) =>
      isDropOff(s)
        ? [
            { slug: A, top: null, visitors: '1', opened: String(MAX - 1) },
            { slug: A, top: 25, visitors: String(MAX - 1), opened: '4' },
            { slug: A, top: 25, visitors: '4', opened: '0' },
          ]
        : undefined;
    const bands = (await cmp.getCompareDropOffUncached([A], PATHS)).get(A)!;
    expect(bands[1]).toMatchObject({ band: 25, visitors: MAX });
    expect(bands.every((b) => Number.isSafeInteger(b.visitors))).toBe(true);
    // Band 0 is the never-scrolled openers as counted (MAX - 1), untouched by
    // the 4 scrollers at 50 %.
    route = (s) =>
      isDropOff(s)
        ? [
            { slug: A, top: null, visitors: '1', opened: String(MAX - 1) },
            { slug: A, top: null, visitors: '2', opened: '5' },
            { slug: A, top: 50, visitors: '4', opened: '4' },
          ]
        : undefined;
    const bands2 = (await cmp.getCompareDropOffUncached([A], PATHS)).get(A)!;
    expect(bands2[0]).toMatchObject({ band: 0, visitors: MAX });
    expect(bands2[2]).toMatchObject({ band: 50, visitors: 4 });
  });

  it('exports the five bands', () => {
    expect(cmp.DROP_OFF_BANDS).toEqual([0, 25, 50, 75, 100]);
  });
});

describe('limits and caching', () => {
  it('rejects more than six articles', async () => {
    expect(cmp.MAX_COMPARE_ARTICLES).toBe(6);
    const seven = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    await expect(cmp.getArticlesCompare(seven)).rejects.toThrow(/up to 6/);
    await expect(cmp.getArticlesCompareUncached(seven)).rejects.toThrow(RangeError);
    await expect(cmp.getCompareTotalsUncached(seven)).rejects.toThrow(RangeError);
    expect(statements).toHaveLength(0);
  });

  it('counts the limit after de-duplication', async () => {
    const six = ['a', 'b', 'c', 'd', 'e', 'f', 'a', ' b '];
    await expect(cmp.getArticlesCompareUncached(six, new Map())).resolves.toBeInstanceOf(Map);
  });

  it('keys every cached metric on the SORTED, de-duplicated slug list', async () => {
    // Resolver answers: canonical paths for both slugs, nothing seen.
    route = (s) =>
      s.includes('FROM articles a')
        ? [
            { slug: A, category_slug: 'real-weddings' },
            { slug: B, category_slug: 'venues' },
          ]
        : undefined;
    const panels = await cmp.getArticlesCompare([A, B, A]);
    expect(panels.slugs).toEqual([B, A].sort());
    const compareCalls = cacheCalls.filter((c) => c.key.startsWith('article-analytics:compare:'));
    expect(compareCalls.map((c) => c.key).sort()).toEqual(
      ['devices', 'dropoff', 'scroll', 'sources', 'totals'].map(
        (k) => `article-analytics:compare:${k}`,
      ),
    );
    for (const c of compareCalls) expect(c.args).toEqual([[B, A].sort()]);
    // Paths came from the (cached) resolver, keyed sorted too.
    const resolverCall = cacheCalls.find((c) => c.key === 'article-analytics:resolve-paths')!;
    expect(resolverCall.args).toEqual([[B, A].sort()]);
  });
});

describe('getArticlesCompare: the page read is panel-safe (R10)', () => {
  it('answers every metric for every slug', async () => {
    route = (s) => {
      if (isResolver(s)) return RESOLVER_ROWS;
      if (isTotals(s)) return [{ slug: A, views: '7', unique_visitors: '5' }];
      return undefined;
    };
    const p = await cmp.getArticlesCompare([B, A]);
    expect(p.slugs).toEqual([A, B].sort());
    expect(p.totals?.get(A)).toEqual({ views: 7, uniqueVisitors: 5 });
    expect(p.totals?.get(B)).toEqual({ views: 0, uniqueVisitors: 0 });
    for (const m of [p.scroll, p.dropOff, p.sources, p.devices]) {
      expect(m).toBeInstanceOf(Map);
      expect([...m!.keys()].sort()).toEqual([A, B].sort());
    }
  });

  it("one metric timing out is null ('couldn't load'); the other four still answer", async () => {
    const timeout = Object.assign(new Error('canceling statement due to statement timeout'), {
      code: '57014',
    });
    route = (s) => {
      if (isResolver(s)) return RESOLVER_ROWS;
      if (isSources(s)) return Promise.reject(timeout);
      if (isTotals(s)) return [{ slug: A, views: 3, unique_visitors: 2 }];
      return undefined;
    };
    const p = await cmp.getArticlesCompare([A, B]);
    expect(p.sources).toBeNull();
    expect(p.totals?.get(A)).toEqual({ views: 3, uniqueVisitors: 2 });
    expect(p.scroll).toBeInstanceOf(Map);
    expect(p.dropOff).toBeInstanceOf(Map);
    expect(p.devices).toBeInstanceOf(Map);
  });

  it('a real bug still surfaces (safePanel only degrades transient failures)', async () => {
    route = (s) => {
      if (isResolver(s)) return RESOLVER_ROWS;
      if (isDevices(s)) return Promise.reject(new Error('column "screen_widht" does not exist'));
      return undefined;
    };
    await expect(cmp.getArticlesCompare([A])).rejects.toThrow(/screen_widht/);
  });

  it('never has more than three analytics statements in flight', async () => {
    route = (s) => (isResolver(s) ? RESOLVER_ROWS : undefined);
    await cmp.getArticlesCompare([A, B]);
    expect(statements.filter((s) => !isResolver(s.sql))).toHaveLength(5);
    expect(peakInFlight).toBeGreaterThan(1);
    expect(peakInFlight).toBeLessThanOrEqual(3);
  });

  it('an empty selection runs nothing and answers empty maps', async () => {
    const p = await cmp.getArticlesCompare([' ', '']);
    expect(p.slugs).toEqual([]);
    expect(p.totals?.size).toBe(0);
    expect(statements).toHaveLength(0);
  });
});
