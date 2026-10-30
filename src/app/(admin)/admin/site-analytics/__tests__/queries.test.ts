// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';

const executed = vi.hoisted(() => ({ queries: [] as unknown[], rows: [] as unknown[] }));
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    execute: vi.fn(async (q: unknown) => {
      executed.queries.push(q);
      return executed.rows;
    }),
  },
}));

const q = await import('../queries');

const dialect = new PgDialect();
/** The last executed query as text + params, whitespace collapsed. */
function lastQuery() {
  const rendered = dialect.sqlToQuery(executed.queries.at(-1) as SQL);
  return { sql: rendered.sql.replace(/\s+/g, ' '), params: rendered.params };
}

const RANGE = { from: '2026-10-01', to: '2026-10-07' };

beforeEach(() => {
  executed.queries.length = 0;
  executed.rows = [];
});

describe('site-analytics query scoping', () => {
  it('a scoped getter carries country, region and half-open created_at bounds', async () => {
    await q.getCities(RANGE, 'human', undefined, 'MY', '10');
    const { sql, params } = lastQuery();
    expect(sql).toContain('country =');
    expect(sql).toContain('region =');
    expect(sql).toMatch(/created_at >= \$\d+::timestamptz/);
    expect(sql).toMatch(/created_at < \$\d+::timestamptz/);
    expect(sql).not.toContain('created_at <=');
    expect(params).toEqual(
      expect.arrayContaining(['2026-09-30T16:00:00.000Z', '2026-10-07T16:00:00.000Z', 'MY', '10']),
    );
    // The column is never wrapped in a zone conversion inside WHERE.
    expect(sql.split('WHERE')[1]).not.toContain('AT TIME ZONE');
  });

  it('getCountries (the navigator) is scoped by neither country nor region', async () => {
    await q.getCountries(RANGE, 'human');
    const { sql } = lastQuery();
    expect(sql).not.toContain('country =');
    expect(sql).not.toContain('region =');
  });

  it('getStates is scoped by country but not region', async () => {
    await q.getStates(RANGE, 'human', undefined, 'MY');
    const { sql } = lastQuery();
    expect(sql).toContain('country =');
    expect(sql).not.toContain('region =');
  });

  it('getTrafficCounts never filters on is_bot', async () => {
    await q.getTrafficCounts(RANGE, undefined, 'MY', '10');
    const { sql } = lastQuery();
    // is_bot appears only inside the per-visitor bool_or classification, never
    // as a row filter — the toggle labels must see both buckets.
    expect(sql).toContain('bool_or(is_bot = FALSE)');
    expect(sql.replace(/bool_or\(is_bot = (TRUE|FALSE)\)/g, '')).not.toMatch(/is_bot\s*=/);
  });

  it('getUtmSources buckets empty values as (none)', async () => {
    await q.getUtmSources(RANGE, 'human');
    expect(lastQuery().sql).toContain("COALESCE(NULLIF(utm_source, ''), '(none)')");
  });
});

describe('getChartData', () => {
  it('returns one point per KL day, zero-filling days without events', async () => {
    executed.rows = [
      {
        date: '2026-10-03',
        unique_visitors: '4',
        total_visits: '5',
        total_pageviews: '10',
        bounce_rate: '20.0',
        avg_visit_duration: '30',
      },
    ];
    const points = await q.getChartData(RANGE, 'human');
    expect(points.map((p) => p.date)).toEqual([
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
    ]);
    expect(points[0]).toMatchObject({ unique_visitors: 0, total_visits: 0, views_per_visit: 0 });
    expect(points[2]).toMatchObject({ unique_visitors: 4, total_visits: 5, views_per_visit: 2 });
  });
});
