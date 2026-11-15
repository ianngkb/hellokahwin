import { describe, expect, it } from 'vitest';
import {
  buildRows,
  expectedCtr,
  parseSort,
  pctChange,
  pickAttention,
  pickMovers,
  sortRows,
  type ArticleMeta,
  type LeaderRow,
} from '../article-leaderboard';

const meta = (n: number, publishedAt = '2026-01-01T00:00:00.000Z'): ArticleMeta => ({
  id: `id-${n}`,
  slug: `slug-${n}`,
  title: `Title ${n}`,
  status: 'published',
  publishedAt,
});

function row(n: number, over: Partial<LeaderRow> = {}): LeaderRow {
  return {
    ...meta(n),
    views: 0,
    prevViews: 0,
    readers: 0,
    googleClicks: 0,
    prevGoogleClicks: 0,
    impressions: 0,
    prevImpressions: 0,
    position: null,
    prevPosition: null,
    ...over,
  };
}

describe('parseSort', () => {
  it('defaults to views and accepts the three sorts', () => {
    expect(parseSort(undefined)).toBe('views');
    // TWN's enquiry sort does not exist here (no enquiry data).
    expect(parseSort('enquiries')).toBe('views');
    expect(parseSort('google')).toBe('google');
    expect(parseSort(['readers'])).toBe('readers');
  });
});

describe('buildRows', () => {
  it('joins views by slug and the rest by id, defaulting to zero', () => {
    const [a, b] = buildRows([meta(1), meta(2)], {
      views: new Map([['slug-1', { views: 10, readers: 8, prevViews: 5 }]]),
      google: new Map([
        [
          'id-1',
          {
            clicks: 3,
            impressions: 100,
            positionSum: 450,
            prevClicks: 1,
            prevImpressions: 0,
            prevPositionSum: 0,
          },
        ],
      ]),
    });
    expect(a).toMatchObject({
      views: 10,
      readers: 8,
      prevViews: 5,
      googleClicks: 3,
      position: 4.5,
      prevPosition: null,
    });
    expect(b).toMatchObject({ views: 0, readers: 0, googleClicks: 0, position: null });
  });
});

describe('sortRows', () => {
  const rows = [
    row(1, { views: 50, googleClicks: 1, readers: 2 }),
    row(2, { views: 10, googleClicks: 9, readers: 9 }),
    row(3, { views: 30, googleClicks: 9, readers: 2 }),
  ];
  it('ranks by views by default', () => {
    expect(sortRows(rows, 'views').map((r) => r.id)).toEqual(['id-1', 'id-3', 'id-2']);
  });
  it('ties on the chosen metric fall back to views', () => {
    expect(sortRows(rows, 'google').map((r) => r.id)).toEqual(['id-3', 'id-2', 'id-1']);
    expect(sortRows(rows, 'readers').map((r) => r.id)).toEqual(['id-2', 'id-1', 'id-3']);
  });
});

describe('pctChange', () => {
  it('is null with nothing to compare', () => {
    expect(pctChange(5, 0)).toBeNull();
    expect(pctChange(15, 10)).toBe(50);
  });
});

describe('pickMovers', () => {
  it('ranks by absolute change, ignores small and newly published articles', () => {
    const rows = [
      row(1, { views: 200, prevViews: 100 }),
      row(2, { views: 40, prevViews: 20 }),
      row(3, { views: 10, prevViews: 25 }), // under the 30-view floor
      row(4, { views: 20, prevViews: 120 }),
      { ...row(5, { views: 500, prevViews: 0 }), publishedAt: '2026-11-08T03:00:00.000Z' },
    ];
    const { risers, fallers } = pickMovers(rows, '2026-10-30');
    expect(risers.map((r) => r.id)).toEqual(['id-1', 'id-2']);
    expect(fallers.map((r) => r.id)).toEqual(['id-4']);
  });
});

describe('pickAttention', () => {
  it('flags a low click rate for the position, biggest opportunity first', () => {
    expect(expectedCtr(3)).toBe(0.11);
    const rows = [
      row(1, { impressions: 1000, googleClicks: 10, position: 3 }), // 1% vs 11%
      row(2, { impressions: 5000, googleClicks: 10, position: 3 }), // bigger gap × volume
      row(3, { impressions: 1000, googleClicks: 100, position: 3 }), // 10%: fine
      row(4, { impressions: 100, googleClicks: 0, position: 3 }), // too few impressions
    ];
    const a = pickAttention(rows, new Map(), true);
    expect(a.lowCtr.map((x) => x.row.id)).toEqual(['id-2', 'id-1']);
    expect(a.lowCtr[0].finding).toContain('5,000');
  });

  it('flags Google slips only when there is a comparison', () => {
    const rows = [
      row(1, { impressions: 300, prevImpressions: 300, position: 9, prevPosition: 4 }),
      row(2, { impressions: 300, prevImpressions: 300, position: 5, prevPosition: 4 }),
    ];
    expect(pickAttention(rows, new Map(), true).slipping.map((x) => x.row.id)).toEqual(['id-1']);
    expect(pickAttention(rows, new Map(), false).slipping).toEqual([]);
  });

  it('flags well-read-into articles that few finish', () => {
    const rows = [row(1), row(2), row(3)];
    const read = new Map([
      ['slug-1', { readers: 100, finished: 10 }],
      ['slug-2', { readers: 100, finished: 60 }],
      ['slug-3', { readers: 20, finished: 1 }], // too few readers to judge
    ]);
    expect(pickAttention(rows, read, true).unread.map((x) => x.row.id)).toEqual(['id-1']);
  });
});
