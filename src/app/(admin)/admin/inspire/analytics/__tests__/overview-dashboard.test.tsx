import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';

vi.mock('server-only', () => ({}));
// Recharts needs a real layout engine; the chart has nothing to assert here.
vi.mock('../views-chart', () => ({ ViewsChart: () => <div data-testid="chart" /> }));
vi.mock('../overview-data', () => ({ PAGE_SIZE: 25 }));

import { OverviewDashboard } from '../overview-dashboard';
import type { OverviewData } from '../overview-data';
import { resolveArticlePeriod } from '@/lib/analytics/article-period';
import { parseFilters } from '../overview-params';
import type { LeaderRow } from '@/lib/analytics/article-leaderboard';

// `ConsoleTable` measures its scrollport with a ResizeObserver; jsdom has none.
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

afterEach(cleanup);

const today = new Date(2026, 10, 12);

function row(n: number, over: Partial<LeaderRow> = {}): LeaderRow {
  return {
    id: `00000000-0000-4000-8000-00000000000${n}`,
    slug: `slug-${n}`,
    title: `Article ${n}`,
    status: 'published',
    publishedAt: '2026-01-05T02:00:00.000Z',
    views: 100 * n,
    prevViews: 50 * n,
    readers: 80 * n,
    googleClicks: 10 * n,
    prevGoogleClicks: 10 * n,
    impressions: 1000,
    prevImpressions: 1000,
    position: 4.25,
    prevPosition: 4,
    ...over,
  };
}

function data(over: Partial<OverviewData> = {}): OverviewData {
  const rows = [row(2), row(1)];
  return {
    tiles: {
      views: { cur: 300, prev: 150 },
      readers: { cur: 240, prev: 240 },
      google: { cur: 30, prev: 30, dailyThrough: '2026-11-09' },
      readThrough: {
        range: { from: '2026-10-14', to: '2026-11-12' },
        cur: { readers: 200, finished: 50 },
        prev: { readers: 100, finished: 50 },
      },
    },
    daily: [{ date: '2026-11-12', views: 5, readers: 4 }],
    leaderboard: {
      rows,
      total: 2,
      page: 1,
      pageCount: 1,
      readThrough: { 'slug-2': { readers: 100, finished: 40 } },
    },
    failed: { articles: false, views: false, google: false },
    google: null,
    movers: { risers: [row(2)], fallers: [] },
    launches: [
      {
        id: row(3).id,
        title: 'Fresh piece',
        slug: 'slug-3',
        publishedOn: '2026-11-10',
        first7: 12,
        first30: 12,
        daysLive: 3,
      },
    ],
    attention: { lowCtr: [], slipping: [], unread: [] },
    categories: [{ slug: 'rings', name: 'Rings' }],
    ...over,
  };
}

function renderIt(d: OverviewData, periodKey = '30d') {
  const period = resolveArticlePeriod({ period: periodKey }, today);
  render(<OverviewDashboard data={d} period={period} filters={parseFilters({})} params={{}} />);
}

describe('OverviewDashboard', () => {
  it('shows the headline numbers with their change', () => {
    // 7 days: the window before it is tracked, so changes show.
    renderIt(data(), '7d');
    expect(screen.getByText('300')).toBeTruthy();
    expect(screen.getByText('25%')).toBeTruthy(); // read to the end: 50 / 200
    expect(screen.getByText(/Google reports 2–3 days late: up to 9 Nov 2026/)).toBeTruthy();
    expect(screen.getAllByText('▲ 100%').length).toBeGreaterThan(0);
  });

  it('lists articles in the order given, linking to each full report', () => {
    renderIt(data());
    const table = screen.getAllByRole('table')[0];
    const links = within(table).getAllByRole('link', { name: /Article \d/ });
    expect(links.map((l) => l.textContent)).toEqual(['Article 2', 'Article 1']);
    expect(links[0].getAttribute('href')).toBe(`/admin/inspire/${row(2).id}/analytics`);
    expect(within(table).getByText('40%')).toBeTruthy(); // read-through for slug-2
  });

  it('marks the active sort and links the other sorts', () => {
    renderIt(data());
    expect(screen.getByRole('link', { name: 'Views ↓' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Readers' }).getAttribute('href')).toBe(
      '/admin/inspire/analytics?sort=readers',
    );
  });

  it('says a failed tile could not load instead of showing zero', () => {
    renderIt(data({ tiles: { ...data().tiles, google: null } }));
    expect(screen.getByText("Couldn't load. Refresh to try again.")).toBeTruthy();
  });

  it('explains that lifetime has no movers and shows no change', () => {
    renderIt(data({ movers: null }), 'lifetime');
    expect(screen.getByText(/Lifetime has nothing earlier to compare against\. Pick/)).toBeTruthy();
    expect(screen.queryByText('▲ 100%')).toBeNull();
  });

  it('marks an incomplete launch window as "so far"', () => {
    renderIt(data());
    expect(screen.getAllByText('so far (3d)')).toHaveLength(2);
  });
});
