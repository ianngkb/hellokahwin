import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
// Like the real one for a timed-out read: the panel's fallback, never a throw.
vi.mock('@/lib/admin/safe-panel', () => ({
  safePanel: async (_: string, run: () => Promise<unknown>, fallback: unknown) => {
    try {
      return await run();
    } catch {
      return fallback;
    }
  },
}));

let articlesStalled = false;
const articleRows = [
  {
    id: 'a1',
    slug: 's1',
    title: 'One',
    status: 'published',
    publishedAt: null,
    scheduledPublishAt: null,
  },
];
vi.mock('@/lib/db/drizzle', () => {
  const chain = {
    from: () => chain,
    where: async () => {
      if (articlesStalled) throw new Error('deadline_exceeded:panel:articlePerf:articles');
      return articleRows;
    },
    orderBy: async () => [],
  };
  return { db: { select: () => chain } };
});

// On 12 Dec the running month compares Dec 1–12 with Nov 1–12. The daily
// series spans Nov 1 → Dec 12, so Nov 13–30 sits between the two windows.
const daily = [
  { date: '2026-11-01', views: 10, readers: 8 },
  { date: '2026-11-20', views: 90, readers: 72 }, // outside both windows
  { date: '2026-12-01', views: 10, readers: 8 },
];
vi.mock('@/lib/analytics/article-performance', () => ({
  toPeriodWindow: (r: { from: string; to: string }, p: { from: string; to: string } | null) => ({
    from: r.from,
    to: r.to,
    prevFrom: p?.from ?? null,
    prevTo: p?.to ?? null,
  }),
  getArticlePeriodViews: async () => [],
  getArticleDailySeries: async () => daily,
  getArticlePeriodGoogle: async () => ({
    dailyThrough: null,
    range: null,
    prevRange: null,
    rows: [],
  }),
  getSiteReadThrough: async () => ({ range: null, cur: null, prev: null }),
  getArticleLaunches: async () => [],
  getArticleReadThrough: async () => [],
}));

import { loadOverview } from '../overview-data';
import { resolveArticlePeriod } from '@/lib/analytics/article-period';
import { parseFilters } from '../overview-params';

describe('loadOverview tiles', () => {
  it('month to date compares only the same days of last month', async () => {
    const period = resolveArticlePeriod(
      { period: 'month', month: '2026-12' },
      new Date(2026, 11, 12),
    );
    expect(period.prevRange).toEqual({ from: '2026-11-01', to: '2026-11-12' });
    const data = await loadOverview(period, parseFilters({}));
    expect(data.tiles.views).toEqual({ cur: 10, prev: 10 });
    expect(data.tiles.readers).toEqual({ cur: 8, prev: 8 });
  });

  it('lifetime has no comparison days', async () => {
    const period = resolveArticlePeriod({ period: 'lifetime' }, new Date(2026, 10, 12));
    const data = await loadOverview(period, parseFilters({}));
    expect(data.tiles.views?.prev).toBe(0);
  });

  it('a stalled article list blanks the table instead of hanging the page', async () => {
    articlesStalled = true;
    try {
      const period = resolveArticlePeriod({ period: '30d' }, new Date(2026, 10, 12));
      const data = await loadOverview(period, parseFilters({}));
      expect(data.failed.articles).toBe(true);
      expect(data.leaderboard.rows).toEqual([]);
      expect(data.movers).toBeNull();
      expect(data.launches).toBeNull();
      expect(data.attention).toBeNull();
      // The site-wide tiles do not depend on the article list.
      expect(data.tiles.views).not.toBeNull();
    } finally {
      articlesStalled = false;
    }
  });
});
