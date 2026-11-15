import { describe, it, expect, vi, beforeEach } from 'vitest';
import type postgres from 'postgres';

vi.mock('server-only', () => ({}));
const searchAnalyticsAll = vi.fn();
vi.mock('../client', () => ({
  searchAnalyticsAll: (...a: unknown[]) => searchAnalyticsAll(...a),
}));

const { foldPageDaily, syncPageDaily, upsertPages, reresolveUnresolvedPages, ymd } =
  await import('../sync');

/**
 * A stand-in for the postgres-js client: a tagged template that records each
 * statement (text + values), `sql(rows, ...cols)` as the bulk-insert helper,
 * `begin` running its callback on the same fake, and `unsafe` for SET LOCAL.
 */
type Call = { text: string; values: unknown[] };
function fakeSql(answer: (text: string, values: unknown[]) => unknown[]) {
  const calls: Call[] = [];
  const inserts: { rows: unknown[]; cols: string[] }[] = [];
  const unsafe: string[] = [];
  const sql = ((strings: TemplateStringsArray | unknown[], ...values: unknown[]) => {
    if (!Array.isArray(strings) || !('raw' in strings)) {
      // The helper form: sql(rows, ...cols).
      const marker = { __helper: true, rows: strings, cols: values as string[] };
      inserts.push({ rows: strings as unknown[], cols: values as string[] });
      return marker;
    }
    const text = (strings as TemplateStringsArray).join('?');
    calls.push({ text, values });
    return Promise.resolve(answer(text, values));
  }) as unknown as postgres.Sql;
  Object.assign(sql, {
    begin: async (fn: (tx: unknown) => Promise<unknown>) => fn(sql),
    unsafe: async (s: string) => {
      unsafe.push(s);
    },
  });
  return { sql, calls, inserts, unsafe };
}

beforeEach(() => {
  searchAnalyticsAll.mockReset();
});

describe('foldPageDaily', () => {
  it('folds raw URLs that share a page into one (page, day) row, position as position × impressions', () => {
    const ids = new Map([
      ['https://hellokahwin.com/artikel/a/b', 'p1'],
      ['https://www.hellokahwin.com/artikel/a/b/', 'p1'],
      ['https://hellokahwin.com/artikel/a/c', 'p2'],
    ]);
    const out = foldPageDaily(
      [
        {
          keys: ['2026-11-10', 'https://hellokahwin.com/artikel/a/b'],
          clicks: 2,
          impressions: 10,
          position: 3,
        },
        {
          keys: ['2026-11-10', 'https://www.hellokahwin.com/artikel/a/b/'],
          clicks: 1,
          impressions: 30,
          position: 7,
        },
        {
          keys: ['2026-11-10', 'https://hellokahwin.com/artikel/a/c'],
          clicks: 0,
          impressions: 4,
          position: 12.5,
        },
        { keys: ['2026-11-10', 'https://elsewhere.com/x'], clicks: 9, impressions: 9, position: 1 },
      ],
      ids,
      'all',
    );
    expect(out).toEqual([
      {
        page_id: 'p1',
        date: '2026-11-10',
        clicks: 3,
        impressions: 40,
        position_sum: 240,
        data_state: 'all',
      },
      {
        page_id: 'p2',
        date: '2026-11-10',
        clicks: 0,
        impressions: 4,
        position_sum: 50,
        data_state: 'all',
      },
    ]);
    // Read back the impression-weighted way: 240 / 40 = 6, not AVG(3, 7) = 5.
    expect(out[0].position_sum / out[0].impressions).toBe(6);
  });
});

describe('upsertPages', () => {
  it('normalises, resolves article ids by slug in ONE lookup, and upserts without clobbering a resolved id', async () => {
    const f = fakeSql((text) => {
      if (text.includes('FROM articles')) return [{ id: 'art-1', slug: 'merisik' }];
      if (text.includes('INSERT INTO gsc_pages')) {
        return [
          { id: 'p1', url: 'https://hellokahwin.com/artikel/adat/merisik' },
          { id: 'p2', url: 'https://hellokahwin.com/artikel/adat' },
        ];
      }
      return [];
    });
    const out = await upsertPages(f.sql, [
      'https://www.hellokahwin.com/Artikel/Adat/Merisik/',
      'https://hellokahwin.com/artikel/adat/merisik?utm=x',
      'https://hellokahwin.com/artikel/adat',
      'https://elsewhere.com/x',
    ]);
    expect(out.get('https://www.hellokahwin.com/Artikel/Adat/Merisik/')).toBe('p1');
    expect(out.get('https://hellokahwin.com/artikel/adat/merisik?utm=x')).toBe('p1');
    expect(out.get('https://hellokahwin.com/artikel/adat')).toBe('p2');
    expect(out.has('https://elsewhere.com/x')).toBe(false);

    const lookups = f.calls.filter((c) => c.text.includes('FROM articles'));
    expect(lookups).toHaveLength(1);
    expect(lookups[0].values).toEqual([['merisik']]);
    const rows = f.inserts[0].rows as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      url: 'https://hellokahwin.com/artikel/adat/merisik',
      entity_type: 'article',
      slug: 'merisik',
      article_id: 'art-1',
    });
    expect(typeof rows[0].resolved_at).toBe('string');
    expect(rows[1]).toMatchObject({ entity_type: 'category', article_id: null, resolved_at: null });
    const upsert = f.calls.find((c) => c.text.includes('INSERT INTO gsc_pages'))!;
    expect(upsert.text).toContain('COALESCE(excluded.article_id, gsc_pages.article_id)');
  });

  it('nothing ours → no statements', async () => {
    const f = fakeSql(() => []);
    expect((await upsertPages(f.sql, ['https://elsewhere.com/'])).size).toBe(0);
    expect(f.calls).toHaveLength(0);
  });
});

describe('syncPageDaily', () => {
  it('fetches date × page, then upserts (page, day) rows in a timed transaction', async () => {
    searchAnalyticsAll.mockResolvedValue({
      rows: [
        {
          keys: ['2026-11-10', 'https://hellokahwin.com/artikel/a/b'],
          clicks: 2,
          impressions: 10,
          position: 3,
          ctr: 0.2,
        },
      ],
      apiCalls: 1,
      truncated: false,
    });
    const f = fakeSql((text) =>
      text.includes('INSERT INTO gsc_pages')
        ? [{ id: 'p1', url: 'https://hellokahwin.com/artikel/a/b' }]
        : [],
    );
    const session = { token: 't', property: 'https://hellokahwin.com/' };
    const stats = await syncPageDaily(
      { sql: f.sql, session },
      { startDate: '2026-11-08', endDate: '2026-11-12' },
    );
    expect(stats).toEqual({ rowsFetched: 1, rowsWritten: 1, apiCalls: 1, truncated: false });
    expect(searchAnalyticsAll).toHaveBeenCalledWith(session, {
      startDate: '2026-11-08',
      endDate: '2026-11-12',
      dimensions: ['date', 'page'],
      dataState: 'all',
    });
    expect(f.unsafe).toEqual(["SET LOCAL statement_timeout = '120s'"]);
    const daily = f.calls.find((c) => c.text.includes('INSERT INTO gsc_page_daily'))!;
    expect(daily.text).toContain('ON CONFLICT (page_id, date) DO UPDATE');
    expect(f.inserts.at(-1)!.cols).toEqual([
      'page_id',
      'date',
      'clicks',
      'impressions',
      'position_sum',
      'data_state',
    ]);
  });

  it('no rows from Google → nothing written', async () => {
    searchAnalyticsAll.mockResolvedValue({ rows: [], apiCalls: 1, truncated: false });
    const f = fakeSql(() => []);
    const stats = await syncPageDaily(
      { sql: f.sql, session: { token: 't', property: 'p' } },
      { startDate: 'a', endDate: 'b' },
    );
    expect(stats.rowsWritten).toBe(0);
    expect(f.calls).toHaveLength(0);
  });
});

describe('reresolveUnresolvedPages', () => {
  it('links article-shaped pages to articles published since Google first saw them', async () => {
    const f = fakeSql((text) => {
      if (text.includes('FROM gsc_pages')) {
        return [
          { id: 'p1', slug: 'baru' },
          { id: 'p2', slug: 'tiada' },
        ];
      }
      if (text.includes('FROM articles')) return [{ id: 'art-9', slug: 'baru' }];
      return [];
    });
    expect(await reresolveUnresolvedPages(f.sql)).toBe(1);
    const update = f.calls.find((c) => c.text.includes('UPDATE gsc_pages'))!;
    expect(update.values).toEqual(['art-9', 'p1']);
  });
});

describe('ymd', () => {
  it('counts back whole UTC days', () => {
    expect(ymd(1, new Date('2026-11-15T03:00:00Z'))).toBe('2026-11-14');
    expect(ymd(5, new Date('2026-11-03T03:00:00Z'))).toBe('2026-10-29');
  });
});
