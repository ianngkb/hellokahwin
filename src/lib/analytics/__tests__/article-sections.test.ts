import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';

/**
 * Section drop-off (R25): the furthest section each visitor reached, laid out
 * as Introduction / 1..N / End of article, over the article's exact paths,
 * bounded, with no COUNT(DISTINCT), and `headingsChanged` when the recorded
 * heading count differs from the article's current one.
 */

vi.mock('server-only', () => ({}));
vi.mock('@sentry/nextjs', () => ({ captureMessage: vi.fn(), captureException: vi.fn() }));
vi.mock('next/cache', () => ({
  unstable_cache:
    (fn: (...a: unknown[]) => unknown) =>
    (...args: unknown[]) =>
      fn(...args),
}));
vi.mock('react', async (orig) => ({
  ...(await orig<typeof import('react')>()),
  cache: (fn: unknown) => fn,
}));

type Router = (sql: string) => unknown[] | undefined;
let route: Router = () => undefined;
const statements: { sql: string; params: unknown[] }[] = [];
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    execute: async (q: SQL) => {
      const { sql, params } = new PgDialect().sqlToQuery(q);
      statements.push({ sql, params });
      return route(sql) ?? [];
    },
  },
}));

// The current headings come from the dynamic-block-merged content the public
// page renders (article-current-headings.ts, tested on its own).
const loadCurrentSectionHeadings = vi.hoisted(() =>
  vi.fn<(slug: string) => Promise<string[]>>(async () => []),
);
vi.mock('../article-current-headings', () => ({ loadCurrentSectionHeadings }));

// The path resolver (T1, tested on its own) answers with the article's two
// slash twins, so the one-argument getters really reach both statements.
vi.mock('@/lib/analytics/article-paths', async (orig) => {
  const real = await orig<typeof import('../article-paths')>();
  const resolved = async (slugs: readonly string[]) =>
    new Map(slugs.map((s) => [s, [`/artikel/venues/${s}`, `/artikel/venues/${s}/`]]));
  return { ...real, resolveArticlePaths: resolved, resolveArticlePathsUncached: resolved };
});

const mod = await import('../article-sections');
const { getArticleSectionDropOff, buildSectionDropOff, END_OF_ARTICLE_INDEX } = mod;

const SLUG = 'best-ballrooms';
const PATHS = [`/artikel/venues/${SLUG}`, `/artikel/venues/${SLUG}/`];
const HEADINGS = ['Grand halls', 'Garden venues', 'Budget picks'];
const OPTS = { paths: PATHS, currentHeadings: HEADINGS };
/** The uncached getter with explicit paths/headings (the default for most tests). */
const getUncached = (
  slug: string,
  opts: Parameters<typeof mod.getArticleSectionDropOffUncached>[1] = OPTS,
) => mod.getArticleSectionDropOffUncached(slug, opts);

/** A raw-counts literal for the pure builder. */
function raw(over: Partial<Parameters<typeof buildSectionDropOff>[0]>) {
  return {
    openedVisitors: 0,
    stoppedAt: [],
    labels: [],
    recordedTotal: null,
    recordedTotals: [],
    firstSeenAt: null,
    ...over,
  } as Parameters<typeof buildSectionDropOff>[0];
}

// Statement 2 (the denominator) also reads section_reached rows (its UNION
// half), so statement 1 is the one WITHOUT the pageview read.
const isStats = (s: string) =>
  s.includes("event_name = 'section_reached'") && !s.includes("event_name = 'pageview'");
const isOpened = (s: string) => s.includes("event_name = 'pageview'");

/** The R25 example: A reached 1, 2, 3; B reached 1; 5 visitors opened the article. */
function r25Router(opts: { total?: number } = {}): Router {
  return (sql) => {
    if (isStats(sql)) {
      return [
        { kind: 'stop', idx: 3, visitors: '1', heading: null, total: null, first_seen: null },
        { kind: 'stop', idx: 1, visitors: '1', heading: null, total: null, first_seen: null },
        {
          kind: 'label',
          idx: 1,
          visitors: null,
          heading: 'Grand halls',
          total: null,
          first_seen: null,
        },
        {
          kind: 'label',
          idx: 2,
          visitors: null,
          heading: 'Garden venues',
          total: null,
          first_seen: null,
        },
        {
          kind: 'label',
          idx: 3,
          visitors: null,
          heading: 'Budget picks',
          total: null,
          first_seen: null,
        },
        {
          kind: 'meta',
          idx: null,
          visitors: null,
          heading: null,
          total: opts.total ?? 3,
          first_seen: '2026-11-08T02:15:00.000Z',
          totals: String(opts.total ?? 3),
        },
      ];
    }
    if (isOpened(sql)) return [{ opened: '5' }];
    return undefined;
  };
}

beforeEach(() => {
  route = () => undefined;
  statements.length = 0;
});

describe('getArticleSectionDropOff — arithmetic (R25 example)', () => {
  it('Introduction 3; s1 stopped 1 / reached 2; s2 0 / 1; s3 1 / 1; End 0; reachedShare(1) = 0.4', async () => {
    route = r25Router();
    const out = await getUncached(SLUG);
    expect(out.openedVisitors).toBe(5);
    expect(out.sectionTotal).toBe(3);
    expect(out.headingsChanged).toBe(false);
    expect(out.firstSeenAt).toBe('2026-11-08T02:15:00.000Z');
    expect(out.rows.map((r) => [r.index, r.heading, r.reached, r.stoppedHere])).toEqual([
      [0, null, 5, 3],
      [1, 'Grand halls', 2, 1],
      [2, 'Garden venues', 1, 0],
      [3, 'Budget picks', 1, 1],
      [4, null, 0, 0],
    ]);
    expect(out.rows[1].reachedShare).toBeCloseTo(0.4);
    expect(out.rows[0].reachedShare).toBe(1);
    expect(out.rows[4].reachedShare).toBe(0);
  });

  it('a visitor who reached the end counts at every section and under End of article', async () => {
    route = (sql) =>
      isStats(sql)
        ? [
            // The SQL canonicalises the end sentinel (idx = total + 1).
            {
              kind: 'stop',
              idx: END_OF_ARTICLE_INDEX,
              visitors: '2',
              heading: null,
              total: null,
              first_seen: null,
            },
            {
              kind: 'meta',
              idx: null,
              visitors: null,
              heading: null,
              total: 3,
              first_seen: null,
              totals: '3',
            },
          ]
        : [{ opened: '4' }];
    const out = await getUncached(SLUG);
    expect(out.rows.map((r) => [r.reached, r.stoppedHere])).toEqual([
      [4, 2],
      [2, 0],
      [2, 0],
      [2, 0],
      [2, 2],
    ]);
  });

  it('headingsChanged when the recorded section_total differs from the current heading count', async () => {
    route = r25Router({ total: 5 });
    const out = await getUncached(SLUG);
    expect(out.headingsChanged).toBe(true);
    // Rows are still laid out by index on the recorded count.
    expect(out.rows).toHaveLength(7);
  });

  it('folds a HEADING index past the layout end (an older, longer version) into End of article', () => {
    const out = buildSectionDropOff(
      raw({
        openedVisitors: 3,
        stoppedAt: [
          [9, 1],
          [2, 1],
        ],
        recordedTotal: 3,
        recordedTotals: [3, 10],
      }),
      HEADINGS,
    );
    expect(out.rows.at(-1)).toMatchObject({ index: 4, stoppedHere: 1, reached: 1 });
    expect(out.rows[2]).toMatchObject({ reached: 2, stoppedHere: 1 });
    // Never silent: a recorded 10-heading version is flagged.
    expect(out.headingsChanged).toBe(true);
  });

  // T7-F2: a reader who finished the OLD 3-heading version sent index 4 (its
  // end sentinel). After the article grew to 5 headings, 4 is a heading — the
  // SQL rewrites idx = total + 1 to END_OF_ARTICLE_INDEX first, so that reader
  // is still "read to the end", never "stopped at new heading 4".
  it('an old version end sentinel stays End of article after the article gains headings', () => {
    const five = [...HEADINGS, 'Four', 'Five'];
    const out = buildSectionDropOff(
      raw({
        openedVisitors: 4,
        stoppedAt: [
          [END_OF_ARTICLE_INDEX, 1], // finished the 3-heading version
          [4, 1], // stopped at heading 4 of the 5-heading version
        ],
        recordedTotal: 5,
        recordedTotals: [3, 5],
      }),
      five,
    );
    expect(out.rows.map((r) => [r.index, r.stoppedHere, r.reached])).toEqual([
      [0, 2, 4],
      [1, 0, 2],
      [2, 0, 2],
      [3, 0, 2],
      [4, 1, 2],
      [5, 0, 1],
      [6, 1, 1],
    ]);
  });

  it('the SQL canonicalises each event end sentinel (idx = its own total + 1) before MAX', async () => {
    route = r25Router();
    await getUncached(SLUG);
    const stats = statements.find((s) => isStats(s.sql))!;
    expect(stats.sql).toContain(
      `CASE WHEN total IS NOT NULL AND idx = total + 1 THEN ${END_OF_ARTICLE_INDEX} ELSE idx END AS idx`,
    );
    // The canonical index is applied in `valid`, which `last` (the MAX) reads.
    expect(stats.sql.indexOf('THEN 1000 ELSE idx')).toBeLessThan(stats.sql.indexOf('MAX(idx)'));
    // The end sentinel never becomes a heading label.
    expect(stats.sql).toMatch(/WHERE idx <> 1000\s+ORDER BY idx, created_at DESC/);
  });

  // T7-F7: labels are what readers saw — a recorded '' (an empty heading) is
  // kept, never replaced by today's text. Only an index with NO recorded
  // label falls back to the current heading.
  it('a recorded empty heading stays empty; only an unrecorded index falls back to current text', () => {
    const out = buildSectionDropOff(
      raw({
        openedVisitors: 1,
        stoppedAt: [[3, 1]],
        labels: [
          [1, ''],
          [3, null],
        ],
        recordedTotal: 3,
        recordedTotals: [3],
      }),
      ['Now one', 'Now two', 'Now three'],
    );
    expect(out.rows[1].heading).toBe(''); // the reader saw an empty heading
    expect(out.rows[2].heading).toBe('Now two'); // nothing recorded → current
    expect(out.rows[3].heading).toBe('Now three'); // null recorded → current
  });

  // T7-F8: R25 — reachedShare = reached / openedVisitors, no clamp in the
  // denominator. When section readers outnumber recorded openers (a pageview
  // before the floor, a visitor-hash rotation at KL midnight) the share is
  // reported as it is, and Introduction never goes negative.
  it('reachedShare divides by openedVisitors even when section readers outnumber openers', () => {
    const out = buildSectionDropOff(
      raw({ openedVisitors: 2, stoppedAt: [[1, 3]], recordedTotal: 1, recordedTotals: [1] }),
      ['Only'],
    );
    expect(out.rows[0]).toMatchObject({ reached: 2, stoppedHere: 0, reachedShare: 1 });
    expect(out.rows[1]).toMatchObject({ reached: 3, stoppedHere: 3 });
    expect(out.rows[1].reachedShare).toBeCloseTo(1.5);
    expect(out.rows[2].reachedShare).toBe(0);
  });

  it('every share is 0 when nobody opened the article', () => {
    const out = buildSectionDropOff(
      raw({ openedVisitors: 0, stoppedAt: [[1, 2]], recordedTotal: 1, recordedTotals: [1] }),
      ['Only'],
    );
    expect(out.rows.map((r) => r.reachedShare)).toEqual([0, 0, 0]);
  });

  // T7-F6: compare EVERY recorded total, not only the latest.
  it('headingsChanged when an OLDER recorded total differs, even if the latest matches', () => {
    const five = [...HEADINGS, 'Four', 'Five'];
    const mixed = buildSectionDropOff(
      raw({ openedVisitors: 2, stoppedAt: [[1, 2]], recordedTotal: 5, recordedTotals: [3, 5] }),
      five,
    );
    expect(mixed.headingsChanged).toBe(true);
    const same = buildSectionDropOff(
      raw({ openedVisitors: 2, stoppedAt: [[1, 2]], recordedTotal: 5, recordedTotals: [5] }),
      five,
    );
    expect(same.headingsChanged).toBe(false);
  });

  it('reads every distinct recorded total from the meta row', async () => {
    route = (sql) =>
      isStats(sql)
        ? [
            {
              kind: 'meta',
              idx: null,
              visitors: null,
              heading: null,
              total: 3,
              first_seen: null,
              totals: '3,5',
            },
          ]
        : [{ opened: '1' }];
    const out = await getUncached(SLUG); // current = 3 headings, latest recorded = 3
    expect(out.headingsChanged).toBe(true);
    const stats = statements.find((s) => isStats(s.sql))!;
    expect(stats.sql).toContain("string_agg(DISTINCT total::text, ',')");
  });

  it('the cached copy is JSON-safe (pairs, not Maps) and builds the same panel', async () => {
    route = r25Router();
    const direct = await getUncached(SLUG);
    const viaJson = buildSectionDropOff(
      JSON.parse(
        JSON.stringify(
          raw({
            openedVisitors: 5,
            stoppedAt: [
              [3, 1],
              [1, 1],
            ],
            labels: [
              [1, 'Grand halls'],
              [2, 'Garden venues'],
              [3, 'Budget picks'],
            ],
            recordedTotal: 3,
            recordedTotals: [3],
            firstSeenAt: '2026-11-08T02:15:00.000Z',
          }),
        ),
      ),
      HEADINGS,
    );
    expect(viaJson).toEqual(direct);
  });
});

// T7-F10: the R25 contract is ONE argument; the current headings are resolved
// inside (from the merged content the public page renders).
describe('getArticleSectionDropOff(slug) — the R25 signature', () => {
  it('the cached getter takes only the slug and resolves the current headings itself', async () => {
    expect(getArticleSectionDropOff.length).toBe(1);
    loadCurrentSectionHeadings.mockResolvedValueOnce(['Grand halls', 'Garden venues']);
    route = r25Router();
    const out = await getArticleSectionDropOff(SLUG);
    expect(loadCurrentSectionHeadings).toHaveBeenCalledWith(SLUG);
    expect(statements).toHaveLength(2);
    expect(out.rows[1]).toMatchObject({ heading: 'Grand halls', reached: 2 });
    // Recorded 3 vs current 2 → flagged.
    expect(out.headingsChanged).toBe(true);
  });

  it('the uncached getter works with the slug alone (paths + headings resolved inside)', async () => {
    loadCurrentSectionHeadings.mockResolvedValueOnce(HEADINGS);
    route = r25Router();
    const out = await mod.getArticleSectionDropOffUncached(SLUG);
    expect(loadCurrentSectionHeadings).toHaveBeenCalledWith(SLUG);
    expect(statements).toHaveLength(2);
    expect(out.openedVisitors).toBe(5);
    expect(out.headingsChanged).toBe(false);
  });
});

describe('getArticleSectionDropOff — empty and missing', () => {
  it('no resolved paths: the empty shape, laid out on the current headings, and NO query', async () => {
    const out = await getUncached(SLUG, { paths: [], currentHeadings: HEADINGS });
    expect(statements).toHaveLength(0);
    expect(out).toMatchObject({ openedVisitors: 0, firstSeenAt: null, headingsChanged: false });
    expect(out.rows.map((r) => r.reached)).toEqual([0, 0, 0, 0, 0]);
  });

  it('an empty slug through the cached getter fires no query', async () => {
    const out = await getArticleSectionDropOff('');
    expect(statements).toHaveLength(0);
    expect(out.openedVisitors).toBe(0);
  });

  it('no section rows yet: firstSeenAt null and headingsChanged false (nothing recorded to differ)', async () => {
    route = (sql) =>
      isStats(sql)
        ? [
            {
              kind: 'meta',
              idx: null,
              visitors: null,
              heading: null,
              total: null,
              first_seen: null,
              totals: null,
            },
          ]
        : [{ opened: '0' }];
    const out = await getUncached(SLUG);
    expect(out.firstSeenAt).toBeNull();
    expect(out.headingsChanged).toBe(false);
    expect(out.openedVisitors).toBe(0);
  });

  it('a body with no headings lays out Introduction + End of article', async () => {
    route = (sql) =>
      isStats(sql)
        ? [
            {
              kind: 'stop',
              idx: END_OF_ARTICLE_INDEX,
              visitors: '2',
              heading: null,
              total: null,
              first_seen: null,
            },
            {
              kind: 'meta',
              idx: null,
              visitors: null,
              heading: null,
              total: 0,
              first_seen: null,
              totals: '0',
            },
          ]
        : [{ opened: '3' }];
    const out = await getUncached(SLUG, { paths: PATHS, currentHeadings: [] });
    expect(out.rows.map((r) => [r.index, r.reached, r.stoppedHere])).toEqual([
      [0, 3, 1],
      [1, 2, 2],
    ]);
    expect(out.headingsChanged).toBe(false);
  });
});

describe('getArticleSectionDropOff — SQL shape', () => {
  it('matches exact paths, the event, humans, the tracking floor, the regex guard; no COUNT(DISTINCT', async () => {
    route = r25Router();
    await getUncached(SLUG);
    expect(statements).toHaveLength(2);
    const stats = statements.find((s) => isStats(s.sql))!;
    const opened = statements.find((s) => isOpened(s.sql))!;
    for (const s of [stats, opened]) {
      // R25 / V-D19: `pathname IN (…)` of individually bound scalars (slugInList).
      expect(s.sql).toMatch(/pathname IN \(\$\d+, \$\d+\)/);
      expect(s.sql).not.toContain('= ANY');
      expect(s.sql).toContain('is_bot = FALSE');
      expect(s.sql).toContain("INTERVAL '365 days'");
      expect(s.sql).toMatch(/created_at >= \$\d+/);
      expect(s.sql).not.toMatch(/COUNT\(DISTINCT/i);
      expect(s.sql).not.toContain('split_part(pathname');
      // One bound parameter per path.
      for (const p of PATHS) expect(s.params).toContain(p);
      // The floor is the exact tracking-launch instant, not a calendar day.
      expect(s.params).toContain(mod.SECTION_TRACKING_SINCE);
    }
    // The regex guard sits in the WHERE (drops malformed rows before any
    // work) AND in the CASE that guards each cast.
    expect(stats.sql).toContain("AND props->>'section_index' ~ '^[0-9]{1,3}$'");
    // Every cast is CASE-guarded, never a bare cast in WHERE.
    expect(stats.sql).toMatch(/CASE WHEN props->>'section_index' ~ '\^\[0-9\]\{1,3\}\$'\s+THEN/);
    expect(stats.sql).toMatch(/GROUP BY visitor_hash/);
    expect(stats.sql).toMatch(/BETWEEN 1 AND \$\d+/);
    expect(stats.params).toContain(mod.MAX_TRACKED_SECTIONS + 1);
    // The pageview denominator carries the partial-index scope.
    expect(opened.sql).toContain("pathname LIKE '/artikel/%'");
    // One de-duplicating pass (UNION) over pageviews + section readers (T7-F4).
    expect(opened.sql).toMatch(/UNION\s+SELECT visitor_hash/);
  });

  it('constants', () => {
    expect(mod.SECTION_REACHED_EVENT).toBe('section_reached');
    expect(mod.MAX_TRACKED_SECTIONS).toBe(60);
    // T7-F4: an exact UTC instant, not a date-only day boundary.
    expect(mod.SECTION_TRACKING_SINCE).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(new Date(mod.SECTION_TRACKING_SINCE).toISOString()).toBe(mod.SECTION_TRACKING_SINCE);
  });
});

describe('getArticleSectionDropOff — opened floor is per-article first seen (T7-F4)', () => {
  const SINCE = mod.SECTION_TRACKING_SINCE;
  const at = (minutesAfterSince: number) =>
    new Date(new Date(SINCE).getTime() + minutesAfterSince * 60_000).toISOString();

  it('openedFloor: the constant with no section yet or an earlier first seen; else the first seen', () => {
    expect(mod.openedFloor(null)).toBe(SINCE);
    expect(mod.openedFloor('not a date')).toBe(SINCE);
    expect(mod.openedFloor(at(-60))).toBe(SINCE);
    expect(mod.openedFloor(at(120))).toBe(at(120));
    // A Postgres-style timestamptz string is normalised to ISO.
    expect(mod.openedFloor('2026-12-08 06:00:00+00')).toBe('2026-12-08T06:00:00.000Z');
  });

  /**
   * Deploy day: the constant says 04:00Z but the tracker really went live
   * around 06:00Z. P1 and P2 opened the article before that and could never
   * emit a section_reached. A opened at 05:59 and is the first reader
   * (section 3 at 06:00); B opened later and reached section 1; C opened
   * later and read nothing. The router plays Postgres: the pageview half
   * counts visitors with created_at >= its bound floor, UNION the section
   * readers.
   */
  const pageviews: [string, string][] = [
    ['P1', at(30)],
    ['P2', at(60)],
    ['A', at(119)],
    ['B', at(180)],
    ['C', at(240)],
  ];
  const sectionReaders = ['A', 'B'];
  const deployDayRouter: Router = (sql) => {
    if (isStats(sql)) {
      return [
        { kind: 'stop', idx: 3, visitors: '1', heading: null, total: null, first_seen: null },
        { kind: 'stop', idx: 1, visitors: '1', heading: null, total: null, first_seen: null },
        {
          kind: 'meta',
          idx: null,
          visitors: null,
          heading: null,
          total: 3,
          first_seen: at(120),
          totals: '3',
        },
      ];
    }
    if (isOpened(sql)) {
      const s = statements[statements.length - 1];
      const floor = new Date(String(s.params[0])).getTime();
      const opened = new Set(
        pageviews.filter(([, t]) => new Date(t).getTime() >= floor).map(([v]) => v),
      );
      if (sql.includes('UNION')) for (const v of sectionReaders) opened.add(v);
      return [{ opened: String(opened.size) }];
    }
    return undefined;
  };

  it('a deploy-day open BEFORE the first recorded section is excluded; later opens (and the first reader) count', async () => {
    route = deployDayRouter;
    const out = await getUncached(SLUG);
    // A, B, C — not P1/P2 (pre-tracker), and A is kept although their
    // pageview is a minute before the first section_reached.
    expect(out.openedVisitors).toBe(3);
    // Introduction = only C, not inflated to 3 by P1 + P2.
    expect(out.rows[0]).toMatchObject({ index: 0, reached: 3, stoppedHere: 1 });
    expect(out.rows[1]).toMatchObject({ index: 1, reached: 2, stoppedHere: 1 });
    expect(out.rows[1].reachedShare).toBeCloseTo(2 / 3);
    const opened = statements.find((s) => isOpened(s.sql))!;
    expect(opened.params[0]).toBe(at(120));
    // The section half keeps the constant floor and the index guard.
    expect(opened.params).toContain(SINCE);
    expect(opened.params).toContain(mod.MAX_TRACKED_SECTIONS + 1);
    expect(opened.sql).toMatch(/UNION\s+SELECT visitor_hash/);
    expect(opened.sql).not.toMatch(/COUNT\(DISTINCT/i);
  });

  it('no recorded section yet: the denominator falls back to SECTION_TRACKING_SINCE', async () => {
    route = (sql) =>
      isStats(sql)
        ? [
            {
              kind: 'meta',
              idx: null,
              visitors: null,
              heading: null,
              total: null,
              first_seen: null,
              totals: null,
            },
          ]
        : [{ opened: '2' }];
    const out = await getUncached(SLUG);
    expect(out.firstSeenAt).toBeNull();
    expect(out.openedVisitors).toBe(2);
    const opened = statements.find((s) => isOpened(s.sql))!;
    expect(opened.params[0]).toBe(SINCE);
  });
});
