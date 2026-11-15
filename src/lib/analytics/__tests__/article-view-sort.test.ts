import { describe, it, expect } from 'vitest';
import { parseViewSort, sortByViews } from '@/lib/analytics/article-view-sort';

const m = (totalViews: number, week: number, month: number) => ({
  totalViews,
  wow: { current: week, prior: 0 },
  mom: { current: month, prior: 0 },
});

const rows = [
  { id: 'a', slug: 'old-popular', createdAt: new Date('2025-01-01') },
  { id: 'b', slug: 'new-hot', createdAt: new Date('2026-09-01') },
  { id: 'c', slug: 'never-viewed', createdAt: new Date('2026-10-01') },
  { id: 'd', slug: 'older-never-viewed', createdAt: new Date('2024-06-01') },
];

const metrics = new Map([
  ['old-popular', m(1000, 5, 40)],
  ['new-hot', m(300, 120, 300)],
]);

describe('parseViewSort', () => {
  it('accepts each valid key with an explicit direction', () => {
    expect(parseViewSort('views', 'asc')).toEqual({ key: 'views', dir: 'asc' });
    expect(parseViewSort('week', 'desc')).toEqual({ key: 'week', dir: 'desc' });
    expect(parseViewSort('month', 'asc')).toEqual({ key: 'month', dir: 'asc' });
  });

  it('defaults a missing or invalid direction to desc', () => {
    expect(parseViewSort('views')).toEqual({ key: 'views', dir: 'desc' });
    expect(parseViewSort('views', 'up')).toEqual({ key: 'views', dir: 'desc' });
  });

  it('treats a missing or unknown sort as no sort (default order)', () => {
    expect(parseViewSort()).toBeNull();
    expect(parseViewSort('foo', 'up')).toBeNull();
    expect(parseViewSort('', 'asc')).toBeNull();
  });
});

describe('sortByViews', () => {
  it('ranks by all-time total, high to low', () => {
    expect(sortByViews(rows, metrics, 'views', 'desc')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('ranks by the 7-day COUNT, not by growth', () => {
    expect(sortByViews(rows, metrics, 'week', 'desc')).toEqual(['b', 'a', 'c', 'd']);
  });

  it('ranks a big steady article above a small fast-growing one (count, not % change)', () => {
    // steady: 900 this week, 1,000 the week before (-10%).
    // spike: 12 this week, 3 the week before (+300%). A growth sort would put
    // spike first; a count sort must not.
    const withPriors = new Map([
      [
        'old-popular',
        {
          totalViews: 5000,
          wow: { current: 900, prior: 1000 },
          mom: { current: 3000, prior: 3200 },
        },
      ],
      [
        'new-hot',
        { totalViews: 20, wow: { current: 12, prior: 3 }, mom: { current: 20, prior: 2 } },
      ],
    ]);
    const twoRows = rows.slice(0, 2);
    expect(sortByViews(twoRows, withPriors, 'week', 'desc')).toEqual(['a', 'b']);
    expect(sortByViews(twoRows, withPriors, 'month', 'desc')).toEqual(['a', 'b']);
  });

  it('puts never-viewed articles first ascending, newest-first among the zeros', () => {
    expect(sortByViews(rows, metrics, 'month', 'asc')).toEqual(['c', 'd', 'a', 'b']);
  });

  it('breaks ties by newest createdAt in BOTH directions', () => {
    const tied = new Map([
      ['old-popular', m(50, 0, 0)],
      ['new-hot', m(50, 0, 0)],
    ]);
    const twoRows = rows.slice(0, 2);
    expect(sortByViews(twoRows, tied, 'views', 'desc')).toEqual(['b', 'a']);
    expect(sortByViews(twoRows, tied, 'views', 'asc')).toEqual(['b', 'a']);
  });

  it('falls back to id when value and createdAt both tie, so pagination is stable', () => {
    const same = new Date('2026-01-01');
    const twins = [
      { id: 'z', slug: 'x', createdAt: same },
      { id: 'y', slug: 'y', createdAt: same.toISOString() },
    ];
    expect(sortByViews(twins, new Map(), 'views', 'desc')).toEqual(['y', 'z']);
    expect(sortByViews(twins, new Map(), 'views', 'asc')).toEqual(['y', 'z']);
  });

  it('returns an empty list for an empty filtered set', () => {
    expect(sortByViews([], metrics, 'views', 'desc')).toEqual([]);
  });
});
