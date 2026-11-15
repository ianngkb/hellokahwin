import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';

/**
 * The HelloKahwin-specific half of the article analytics port: TWN reads
 * closed days from a rollup table; HelloKahwin has none, so every views getter
 * reads `analytics_events` directly. Pinned here: no rollup table is ever
 * named, human /artikel/ pageviews only, the partial-index predicate repeated
 * verbatim, and the period getters' output shapes.
 */

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock('react', async (orig) => ({
  ...(await orig<typeof import('react')>()),
  cache: (fn: unknown) => fn,
}));

let answers: unknown[][] = [];
const statements: { sql: string; params: unknown[] }[] = [];
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    execute: (q: SQL) => {
      const { sql, params } = new PgDialect().sqlToQuery(q);
      statements.push({ sql, params });
      return Promise.resolve(answers.shift() ?? []);
    },
  },
}));

const views = await import('../article-views');
const perf = await import('../article-performance');

const ROLLUP_TABLES =
  /analytics_visitor_target_daily|analytics_rollup_days|analytics_session_daily/;
const PAGEVIEW_SCOPE =
  /event_name = 'pageview'\s+AND is_bot = FALSE\s+AND pathname LIKE '\/artikel\/%'/;

beforeEach(() => {
  answers = [];
  statements.length = 0;
});

describe('articles-table view metrics', () => {
  it('scoped to the given slugs: one raw statement, human artikel pageviews, WoW/MoM windows', async () => {
    answers = [
      [
        {
          slug: 'hantaran',
          total_views: '12',
          wow_current: 3,
          wow_prior: 1,
          mom_current: 9,
          mom_prior: '0',
        },
      ],
    ];
    const out = await views.getArticleViewMetricsUncached(['hantaran', 'adat']);
    expect(out.get('hantaran')).toEqual({
      totalViews: 12,
      wow: { current: 3, prior: 1 },
      mom: { current: 9, prior: 0 },
    });
    expect(out.has('adat')).toBe(false); // callers default unviewed slugs to "—"
    expect(statements).toHaveLength(1);
    const { sql, params } = statements[0];
    expect(sql).not.toMatch(ROLLUP_TABLES);
    expect(sql).toMatch(PAGEVIEW_SCOPE);
    expect(sql).toMatch(/split_part\(pathname, '\/', 4\) IN \(\$\d+, \$\d+\)/);
    expect(params).toEqual(expect.arrayContaining(['hantaran', 'adat']));
    expect(sql).toContain("AT TIME ZONE 'Asia/Kuala_Lumpur'");
    expect(sql.match(/FILTER \(WHERE day/g)).toHaveLength(4);
  });

  it('an empty slug list runs nothing', async () => {
    expect((await views.getArticleViewMetricsUncached([])).size).toBe(0);
    expect(statements).toHaveLength(0);
  });

  it('catalogue-wide (the view sort) keeps only real article slugs', async () => {
    await views.getAllArticleViewMetricsUncached();
    const { sql } = statements[0];
    expect(sql).toContain('IN (SELECT slug FROM articles)');
    expect(sql).not.toMatch(ROLLUP_TABLES);
  });
});

describe('single-article detail getters', () => {
  it('daily views read raw pageviews by slug segment, grouped by KL day', async () => {
    answers = [[{ date: '2026-11-14', views: '5', visitors: 4 }]];
    expect(await views.getArticleDailyViewsUncached('hantaran')).toEqual([
      { date: '2026-11-14', views: 5, visitors: 4 },
    ]);
    const { sql, params } = statements[0];
    expect(sql).not.toMatch(ROLLUP_TABLES);
    expect(sql).toContain("pathname LIKE '/artikel/%' AND split_part(pathname, '/', 4) = $");
    expect(params).toContain('hantaran');
  });

  it('totals count daily-unique visitors (the hash rotates daily), never COUNT(DISTINCT) across days', async () => {
    answers = [[{ total_views: 7, unique_visitors: '6' }]];
    expect(await views.getArticleTotalsUncached('hantaran')).toEqual({
      totalViews: 7,
      uniqueVisitors: 6,
    });
    const { sql } = statements[0];
    expect(sql).toMatch(/GROUP BY 1, 2/);
    expect(sql).not.toMatch(/COUNT\s*\(\s*DISTINCT/i);
  });
});

describe('overview (article-performance)', () => {
  const w = perf.toPeriodWindow(
    { from: '2026-11-06', to: '2026-11-12' },
    { from: '2026-10-30', to: '2026-11-05' },
  );

  it('views per article: one raw pass over both windows, real slugs only', async () => {
    answers = [[{ slug: 'a', views: 5, readers: 4, prev_views: '2', prev_readers: 2 }]];
    expect(await perf.getArticlePeriodViewsUncached(w)).toEqual([
      ['a', { views: 5, readers: 4, prevViews: 2, prevReaders: 2 }],
    ]);
    const { sql, params } = statements[0];
    expect(sql).not.toMatch(ROLLUP_TABLES);
    expect(sql).toMatch(PAGEVIEW_SCOPE);
    expect(sql).toContain('IN (SELECT slug FROM articles)');
    // Bounded from the start of the comparison window (KL midnight 30 Oct).
    expect(params).toContain('2026-10-29T16:00:00.000Z');
    expect(params).toContain('2026-11-12T16:00:00.000Z');
  });

  it('Google numbers come from gsc_page_daily joined to gsc_pages.article_id', async () => {
    answers = [
      [{ d: '2026-11-10' }],
      [
        {
          article_id: 'id-1',
          clicks: 3,
          impressions: 100,
          pos_sum: 450,
          prev_clicks: 1,
          prev_impressions: 50,
          prev_pos_sum: 300,
        },
      ],
    ];
    const g = await perf.getArticlePeriodGoogleUncached(w, false);
    expect(g.dailyThrough).toBe('2026-11-10');
    // Clipped to the last reported day, and the comparison cut by the same 2 days.
    expect(g.range).toEqual({ from: '2026-11-06', to: '2026-11-10' });
    expect(g.prevRange).toEqual({ from: '2026-10-30', to: '2026-11-03' });
    expect(g.rows[0]).toEqual([
      'id-1',
      {
        clicks: 3,
        impressions: 100,
        positionSum: 450,
        prevClicks: 1,
        prevImpressions: 50,
        prevPositionSum: 300,
      },
    ]);
    expect(statements[1].sql).toContain('JOIN gsc_pages p ON p.id = d.page_id');
  });

  it('no Google data yet → no rows, and no second statement', async () => {
    answers = [[{ d: null }]];
    const g = await perf.getArticlePeriodGoogleUncached(w, false);
    expect(g).toEqual({ dailyThrough: null, range: null, prevRange: null, rows: [] });
    expect(statements).toHaveLength(1);
  });

  it('read-through before scroll tracking began reads nothing', async () => {
    expect(await perf.getArticleReadThroughUncached(['a'], '2026-10-01', '2026-10-31')).toEqual([]);
    expect(statements).toHaveLength(0);
  });
});
