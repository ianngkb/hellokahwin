import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';

/**
 * Regression test for the blank per-article panels (2026-11-07).
 *
 * The four raw-event getters found an article's rows with
 * `pathname LIKE '/artikel/%' AND split_part(pathname,'/',4) = slug`. Neither
 * half can use the pathname index, so each panel walked every human row in
 * `analytics_events` (3.5–5.5 s on prod), tripped the 6 s safePanel deadline and
 * showed "no data" on an article with 21 real visits. They must match the
 * article's resolved paths EXACTLY: `pathname = ANY(<one JSON-text parameter>)`
 * — one bind parameter however many paths (T1-F2), never one per path.
 */

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));

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

const PATHS = ['/artikel/persiapan/hantaran', '/artikel/persiapan/hantaran/'];

// The third column: a pageview-only getter, which ADDS the partial covering
// index's `pathname LIKE '/artikel/%'` (ARTIKEL_PATH_SCOPE) beside the exact
// path match so a cold read is an index-only scan.
const GETTERS = [
  ['events', views.getArticleEventBreakdownUncached, false],
  ['scroll', views.getArticleScrollDepthUncached, false],
  ['sources', views.getArticleSourcesUncached, true],
  ['devices', views.getArticleDevicesUncached, true],
] as const;

beforeEach(() => {
  answers = [];
  statements.length = 0;
});

describe.each(GETTERS)('article:%s raw getter', (_name, getter, pageviewOnly) => {
  it('matches exact resolved paths through ONE array parameter', async () => {
    await getter('hantaran', PATHS);
    expect(statements).toHaveLength(1);
    const { sql, params } = statements[0];
    expect(sql).toContain('FROM analytics_events');
    expect(sql).toMatch(
      /pathname = ANY \(ARRAY\(SELECT jsonb_array_elements_text\(\$\d+::text::jsonb\)\)\)/,
    );
    // The whole path list is one bind parameter (T1-F2), never one per path.
    expect(params).toContain(JSON.stringify(PATHS));
    for (const p of PATHS) expect(params).not.toContain(p);
    expect(sql).not.toMatch(/pathname IN \(/);
    expect(sql).not.toContain('split_part(pathname');
    if (pageviewOnly) {
      // Only ever ALONGSIDE the exact-path match (it removes no rows).
      expect(sql).toMatch(
        /pathname = ANY \(ARRAY\(SELECT jsonb_array_elements_text\(\$\d+::text::jsonb\)\)\)\s+AND pathname LIKE '\/artikel\/%'/,
      );
    } else {
      expect(sql).not.toContain("LIKE '/artikel/%'");
    }
    // The 365-day floor stays as a belt-and-braces bound, and bots stay out.
    expect(sql).toContain("created_at >= NOW() - INTERVAL '365 days'");
    expect(sql).toContain('is_bot = FALSE');
  });

  it('resolves the paths itself when none are given, then probes by exact path', async () => {
    // Resolver statements run in parallel and are answered in call order:
    // article tables first, then the seen-paths read; then the getter's own.
    answers = [[{ slug: 'hantaran', category_slug: 'persiapan' }], [], []];
    await getter('hantaran');
    // The resolver's seen-paths statement also reads analytics_events, so pick
    // the getter's statement: the one matching by exact path.
    const raw = statements.find(
      (s) => s.sql.includes('FROM analytics_events') && s.sql.includes('pathname = ANY ('),
    )!;
    expect(raw.sql).toContain('pathname = ANY (');
    expect(raw.params).toContain(JSON.stringify(PATHS));
  });

  it('returns early without touching analytics_events when the article has no paths', async () => {
    await getter('ghost', []);
    expect(statements).toHaveLength(0);
  });
});

describe('result shapes', () => {
  it('scroll returns every bucket, zeros when there are no paths', async () => {
    expect(await views.getArticleScrollDepthUncached('ghost', [])).toEqual([
      { percent: 25, visitors: 0 },
      { percent: 50, visitors: 0 },
      { percent: 75, visitors: 0 },
      { percent: 100, visitors: 0 },
    ]);
  });

  it('devices maps rows to name/visitors', async () => {
    answers = [
      [
        { name: 'Mobile', visitors: '15' },
        { name: 'Desktop', visitors: 6 },
      ],
    ];
    expect(await views.getArticleDevicesUncached('hantaran', PATHS)).toEqual([
      { name: 'Mobile', visitors: 15 },
      { name: 'Desktop', visitors: 6 },
    ]);
  });

  it('exports the read-depth start date', () => {
    expect(views.SCROLL_TRACKING_SINCE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
