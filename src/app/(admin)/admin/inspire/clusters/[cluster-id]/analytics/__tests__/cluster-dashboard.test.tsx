import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';

/**
 * Cluster analytics page + dashboard (R16–R21, D2, D4, D5): the window chooser,
 * headline tiles, member table, both matrices, the honest copy, and the
 * failed / empty / one-member states. The page test checks the server side:
 * auth, window fallback, no reads for an empty cluster, safePanel null.
 */

const h = vi.hoisted(() => ({
  requireAdminSection: vi.fn(),
  load: vi.fn(),
  overview: vi.fn(),
  journey: vi.fn(),
  clicks: vi.fn(),
  series: vi.fn(),
}));

vi.mock('@/lib/auth/admin', () => ({
  requireAdminSection: (s: string) => h.requireAdminSection(s),
}));
vi.mock('@/lib/analytics/cluster-analytics', () => ({
  loadClusterAnalytics: (id: string) => h.load(id),
  getClusterOverview: (id: string, m: unknown, w: number) => h.overview(id, m, w),
  getClusterJourney: (id: string, m: unknown, w: number) => h.journey(id, m, w),
  getClusterLinkClicks: (id: string, m: unknown, w: number) => h.clicks(id, m, w),
  getClusterSeriesBox: (id: string, m: unknown, w: number) => h.series(id, m, w),
}));
vi.mock('@sentry/nextjs', () => ({ captureMessage: vi.fn(), captureException: vi.fn() }));
vi.mock('@/components/layout/page-header', () => ({
  PageHeader: ({ title }: { title: React.ReactNode }) => <h1>{title}</h1>,
}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

// `ConsoleTable` measures its scrollport with a ResizeObserver; jsdom has none.
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

import ClusterAnalyticsPage from '../page';
import {
  ClusterDashboard,
  CLICKS_CAPTION,
  FLOW_EXPECTATION,
  JOURNEY_CAPTION,
  SERIES_CAPTION,
  SERIES_LINKS_SHOWN,
  type ClusterDashboardMember,
  type ClusterDashboardProps,
} from '../cluster-dashboard';
import { SERIES_BOX_SINCE } from '@/lib/analytics/cluster-window';
import type { ClusterOverview, ClusterSeriesBox } from '@/lib/analytics/cluster-analytics';

const CID = '99999999-9999-4999-8999-999999999999';
const m = (n: number, title = `Article ${n}`): ClusterDashboardMember => ({
  articleId: `0000000${n}-0000-4000-8000-000000000000`,
  slug: `slug-${n}`,
  title,
});
const M1 = m(1, 'Garden weddings in Selangor');
const M2 = m(2, 'Ballroom guide');
const M3 = m(3, 'Budget tips');

function overviewOf(over: Partial<ClusterOverview> = {}): ClusterOverview {
  return {
    members: [
      { slug: M1.slug, views: 1200, uniqueVisitors: 900, lastStops: 30, lastStopShare: 0.6 },
      { slug: M2.slug, views: 400, uniqueVisitors: 350, lastStops: 15, lastStopShare: 0.3 },
      { slug: M3.slug, views: 10, uniqueVisitors: 9, lastStops: 5, lastStopShare: 0.1 },
    ],
    visits: 50,
    flowSessions: 2,
    flowRate: 0.042,
    articlesPerVisit: 1.07,
    ...over,
  };
}

function seriesOf(over: Partial<ClusterSeriesBox> = {}): ClusterSeriesBox {
  return {
    seen: 400,
    clicks: 20,
    perArticle: [
      { articleId: M1.articleId, seen: 300, clicks: 18 },
      { articleId: M2.articleId, seen: 100, clicks: 2 },
      { articleId: M3.articleId, seen: 0, clicks: 0 },
    ],
    links: [
      { fromArticleId: M1.articleId, toArticleId: M2.articleId, clicks: 15 },
      { fromArticleId: M1.articleId, toArticleId: M3.articleId, clicks: 3 },
      { fromArticleId: M2.articleId, toArticleId: M1.articleId, clicks: 2 },
    ],
    ...over,
  };
}

function renderDash(over: Partial<ClusterDashboardProps> = {}) {
  return render(
    <ClusterDashboard
      clusterId={CID}
      members={[M1, M2, M3]}
      window={90}
      overview={overviewOf()}
      journey={[
        { from: M1.slug, to: M2.slug, moves: 7 },
        { from: M2.slug, to: M1.slug, moves: 1 },
      ]}
      clicks={[
        { fromArticleId: M1.articleId, toSlug: M2.slug, clicks: 5 },
        { fromArticleId: M3.articleId, toSlug: M1.slug, clicks: 2 },
      ]}
      series={seriesOf()}
      seriesEnabled
      {...over}
    />,
  );
}

afterEach(cleanup);

describe('ClusterDashboard', () => {
  it('window chooser: three human presets as links, the current one marked (D2)', () => {
    renderDash({ window: 365 });
    const nav = screen.getByRole('navigation', { name: 'Time window' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual([
      'Last 30 days',
      'Last 90 days',
      'Last 12 months',
    ]);
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      `/admin/inspire/clusters/${CID}/analytics?window=30`,
      `/admin/inspire/clusters/${CID}/analytics?window=90`,
      `/admin/inspire/clusters/${CID}/analytics?window=365`,
    ]);
    expect(links.map((l) => l.getAttribute('aria-current'))).toEqual([null, null, 'page']);
  });

  it.each([30, 90, 365] as const)(
    'window chooser: exactly one link is current, the selected %s-day one',
    (w) => {
      renderDash({ window: w });
      const nav = screen.getByRole('navigation', { name: 'Time window' });
      const current = within(nav)
        .getAllByRole('link')
        .filter((l) => l.getAttribute('aria-current') === 'page');
      expect(current).toHaveLength(1);
      expect(current[0]).toHaveAttribute('data-window', String(w));
    },
  );

  it('headline tiles in plain words, the technical term as the hint (R17, D4)', () => {
    renderDash();
    const tiles = within(screen.getByRole('region', { name: 'Headline numbers' }));
    expect(tiles.getByText('Visits that read this cluster')).toBeInTheDocument();
    expect(tiles.getByText('50')).toBeInTheDocument();
    expect(tiles.getByText('Read 2+ cluster articles')).toBeInTheDocument();
    expect(tiles.getByText('4.2%')).toBeInTheDocument();
    expect(tiles.getByText('2 visits · recirculation rate')).toBeInTheDocument();
    expect(tiles.getByText('Articles read per visit')).toBeInTheDocument();
    expect(tiles.getByText('1.07')).toBeInTheDocument();
    expect(tiles.getByText('Link clicks between cluster articles')).toBeInTheDocument();
    expect(tiles.getByText('7')).toBeInTheDocument(); // 5 + 2 clicks
  });

  it('says "1 visit", not "1 visits"', () => {
    renderDash({ overview: overviewOf({ flowSessions: 1 }) });
    expect(screen.getByText('1 visit · recirculation rate')).toBeInTheDocument();
  });

  it('sets the expectation: single digits is normal (R19)', () => {
    renderDash();
    expect(screen.getByText(FLOW_EXPECTATION)).toBeInTheDocument();
    expect(FLOW_EXPECTATION).toMatch(/^Single digits is normal\./);
  });

  it('member table: views, unique visitors, last stop, clicks out / in, linked to each report (R19, R20)', () => {
    const { container } = renderDash();
    const row = container.querySelector(`[data-member-row="${M1.slug}"]`)!;
    const cells = [...row.querySelectorAll('td')].map((td) => td.textContent);
    expect(cells).toEqual(['1', M1.title, '1,200', '900', '60%', '5', '2']);
    expect(within(row as HTMLElement).getByRole('link', { name: M1.title })).toHaveAttribute(
      'href',
      `/admin/inspire/${M1.articleId}/analytics`,
    );
    const r3 = container.querySelector(`[data-member-row="${M3.slug}"]`)!;
    expect([...r3.querySelectorAll('td')].map((td) => td.textContent).slice(4)).toEqual([
      '10%',
      '2',
      '0',
    ]);
  });

  it('journey matrix: rows from, columns to, diagonal —, zero cells muted (R18)', () => {
    const { container } = renderDash();
    const cell = (a: ClusterDashboardMember, b: ClusterDashboardMember) =>
      container.querySelectorAll(`[data-cell="${a.slug}>${b.slug}"]`);
    // Present in both matrices (journey first, clicks second).
    expect(cell(M1, M2)[0].textContent).toBe('7');
    expect(cell(M2, M1)[0].textContent).toBe('1');
    expect(cell(M1, M3)[0].textContent).toBe('0');
    expect(cell(M1, M3)[0].className).toContain('text-muted-foreground');
    expect(cell(M1, M2)[0].className).not.toContain('text-muted-foreground');
    expect(cell(M1, M1)).toHaveLength(0);
    expect(screen.getAllByLabelText('Same article').length).toBe(6); // 3 per matrix
  });

  it('link-click matrix states its limits: in-body links only (R20)', () => {
    const { container } = renderDash();
    expect(screen.getByText(CLICKS_CAPTION)).toBeInTheDocument();
    expect(CLICKS_CAPTION).toMatch(/^Counts in-body article links only/);
    expect(CLICKS_CAPTION).toContain('16 Nov 2026');
    const cells = container.querySelectorAll(`[data-cell="${M1.slug}>${M2.slug}"]`);
    expect(cells[1].textContent).toBe('5');
    expect(container.querySelectorAll(`[data-cell="${M3.slug}>${M1.slug}"]`)[1].textContent).toBe(
      '2',
    );
  });

  it('a failed read says it failed, in a different sentence from empty (D5)', () => {
    renderDash({ overview: null, journey: null, clicks: null });
    expect(screen.getAllByText("This panel couldn't load")).toHaveLength(4);
    expect(screen.queryByText(FLOW_EXPECTATION)).not.toBeInTheDocument();
    expect(screen.queryByText(/No moves between/)).not.toBeInTheDocument();
    // Tiles fall back to —, never a confident 0.
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4);
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });

  it('only the clicks failed: tiles and table still render, clicks say so', () => {
    const { container } = renderDash({ clicks: null });
    expect(
      screen.getByText("Link clicks couldn't load. Refresh the page to try again."),
    ).toBeInTheDocument();
    const row = container.querySelector(`[data-member-row="${M1.slug}"]`)!;
    expect([...row.querySelectorAll('td')].map((td) => td.textContent).slice(5)).toEqual([
      '—',
      '—',
    ]);
    expect(screen.getAllByText("This panel couldn't load")).toHaveLength(1);
  });

  it('empty data: honest empty states, not blank matrices', () => {
    renderDash({
      overview: overviewOf({ visits: 0, flowSessions: 0, flowRate: 0, articlesPerVisit: 0 }),
      journey: [],
      clicks: [],
    });
    expect(screen.getByText('No moves between these articles yet')).toBeInTheDocument();
    expect(screen.getByText('No link clicks between these articles yet')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('one member: read-2+ is 0 % and both matrices ask for a second article (edge case)', () => {
    renderDash({
      members: [M1],
      overview: overviewOf({
        members: [{ slug: M1.slug, views: 5, uniqueVisitors: 5, lastStops: 5, lastStopShare: 1 }],
        visits: 5,
        flowSessions: 0,
        flowRate: 0,
        articlesPerVisit: 1,
      }),
      journey: [],
      clicks: [],
    });
    expect(screen.getByText('Add a second article to see movement')).toBeInTheDocument();
    expect(screen.getByText('Add a second article to see link clicks')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('no members: says so and offers to add articles', () => {
    renderDash({ members: [], overview: null });
    expect(screen.getByText('This cluster has no articles yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add articles' })).toHaveAttribute(
      'href',
      `/admin/inspire/clusters/${CID}`,
    );
    expect(screen.queryByText("This panel couldn't load")).not.toBeInTheDocument();
  });

  it('journey caption says every move counts (R18)', () => {
    renderDash();
    expect(screen.getByText(JOURNEY_CAPTION)).toBeInTheDocument();
    expect(JOURNEY_CAPTION).toMatch(/Every move counts/);
    expect(screen.queryByText(/reading paths were left out/)).not.toBeInTheDocument();
  });
});

// ── The page (server) ───────────────────────────────────────────────────────

const snapshot = (members: ClusterDashboardMember[], seriesEnabled = true) => ({
  id: CID,
  name: 'Venue guides',
  members,
  membership: { slugs: members.map((x) => x.slug), memberIds: members.map((x) => x.articleId) },
  seriesEnabled,
});

/** The panel (header + body) whose header title is `title`. */
const panelOf = (title: string) =>
  screen.getByText(title, { selector: 'p[data-panel-title]' }).closest('.rounded-card')!;

async function renderPage(window?: string) {
  const ui = await ClusterAnalyticsPage({
    params: Promise.resolve({ 'cluster-id': CID }),
    searchParams: Promise.resolve(window === undefined ? {} : { window }),
  });
  return render(ui);
}

describe('Cluster analytics page', () => {
  beforeEach(() => {
    for (const f of Object.values(h)) f.mockReset();
    h.load.mockResolvedValue(snapshot([M1, M2]));
    h.overview.mockResolvedValue(overviewOf());
    h.journey.mockResolvedValue([]);
    h.clicks.mockResolvedValue([]);
    h.series.mockResolvedValue(seriesOf());
  });

  it('requires the inspire admin section before reading anything (R22)', async () => {
    h.requireAdminSection.mockRejectedValue(new Error('NEXT_REDIRECT'));
    await expect(renderPage()).rejects.toThrow('NEXT_REDIRECT');
    expect(h.requireAdminSection).toHaveBeenCalledWith('inspire');
    expect(h.load).not.toHaveBeenCalled();
  });

  it('an unknown cluster is a 404', async () => {
    h.load.mockResolvedValue(null);
    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it.each([
    [undefined, 90],
    ['30', 30],
    ['365', 365],
    ['7', 90],
    ['junk', 90],
  ])('?window=%s reads the %s-day window (R16)', async (raw, want) => {
    await renderPage(raw);
    const membership = { slugs: [M1.slug, M2.slug], memberIds: [M1.articleId, M2.articleId] };
    expect(h.overview).toHaveBeenCalledWith(CID, membership, want);
    expect(h.journey).toHaveBeenCalledWith(CID, membership, want);
    expect(h.clicks).toHaveBeenCalledWith(CID, membership, want);
    expect(h.series).toHaveBeenCalledWith(CID, membership, want);
  });

  it('reads the cluster ONCE and hands that same snapshot to the labels and every getter', async () => {
    const snap = snapshot([M1, M2]);
    h.load.mockResolvedValue(snap);
    const { container } = await renderPage();
    expect(h.load).toHaveBeenCalledTimes(1);
    for (const g of [h.overview, h.journey, h.clicks, h.series]) {
      expect(g).toHaveBeenCalledTimes(1);
      expect(g.mock.calls[0][1]).toBe(snap.membership);
    }
    // The member table is labelled from the same snapshot.
    expect(
      [...container.querySelectorAll('[data-member-row]')].map((r) =>
        r.getAttribute('data-member-row'),
      ),
    ).toEqual([M1.slug, M2.slug]);
  });

  it('an empty cluster runs no analytics read', async () => {
    h.load.mockResolvedValue(snapshot([]));
    await renderPage();
    expect(screen.getByText('This cluster has no articles yet')).toBeInTheDocument();
    expect(h.overview).not.toHaveBeenCalled();
    expect(h.journey).not.toHaveBeenCalled();
    expect(h.clicks).not.toHaveBeenCalled();
    expect(h.series).not.toHaveBeenCalled();
  });

  it('a transient failure in one read shows "couldn\'t load" in THAT panel only (R21)', async () => {
    h.journey.mockRejectedValue(
      Object.assign(new Error('canceling statement due to statement timeout'), { code: '57014' }),
    );
    // Clicks succeed with a real cell, so a swapped result would show here.
    h.clicks.mockResolvedValue([{ fromArticleId: M1.articleId, toSlug: M2.slug, clicks: 4 }]);
    const { container } = await renderPage();
    expect(screen.getAllByText("This panel couldn't load")).toHaveLength(1);
    const movement = panelOf('Where readers went next');
    const linkPanel = panelOf('Link clicks between cluster articles');
    expect(within(movement).getByText("This panel couldn't load")).toBeInTheDocument();
    expect(within(linkPanel).queryByText("This panel couldn't load")).not.toBeInTheDocument();
    // The click matrix keeps its own data: the only M1→M2 cell is the clicks' 4.
    const cells = container.querySelectorAll(`[data-cell="${M1.slug}>${M2.slug}"]`);
    expect(cells).toHaveLength(1);
    expect(linkPanel.contains(cells[0])).toBe(true);
    expect(cells[0].textContent).toBe('4');
    expect(screen.getByText('Visits that read this cluster')).toBeInTheDocument();
  });

  it('a failed clicks read fails the click panel, not the movement panel', async () => {
    h.journey.mockResolvedValue([{ from: M1.slug, to: M2.slug, moves: 3 }]);
    h.clicks.mockRejectedValue(
      Object.assign(new Error('canceling statement due to statement timeout'), { code: '57014' }),
    );
    const { container } = await renderPage();
    const linkPanel = panelOf('Link clicks between cluster articles');
    expect(within(linkPanel).getByText("This panel couldn't load")).toBeInTheDocument();
    const movement = panelOf('Where readers went next');
    expect(within(movement).queryByText("This panel couldn't load")).not.toBeInTheDocument();
    const cells = container.querySelectorAll(`[data-cell="${M1.slug}>${M2.slug}"]`);
    expect(cells).toHaveLength(1);
    expect(movement.contains(cells[0])).toBe(true);
    expect(cells[0].textContent).toBe('3');
  });

  it('declares maxDuration 60 (R22)', async () => {
    const mod = await import('../page');
    expect(mod.maxDuration).toBe(60);
  });
});

// ── T5: the "Series box" panel (R18, D4) ────────────────────────────────────

describe('Series box panel (R18)', () => {
  const panel = () => panelOf('Series box');

  it('tiles in plain words: seen, clicks, click rate (R18)', () => {
    renderDash();
    const p = panel();
    expect(within(p).getByText('Times the series box was seen')).toBeInTheDocument();
    expect(within(p).getByText('400')).toBeInTheDocument();
    expect(within(p).getByText('Clicks on series links')).toBeInTheDocument();
    // Both the tile and the table column are called "Click rate" (same number,
    // overall vs per article), so the tile is matched by its own element.
    expect(within(p).getByText('Click rate', { selector: 'p' })).toBeInTheDocument();
    // 20 of 400 = 5 %.
    expect(within(p).getByText('5%')).toBeInTheDocument();
  });

  it('click rate is "—" when the box has not been seen but something was clicked', () => {
    renderDash({ series: seriesOf({ seen: 0, clicks: 2, perArticle: [], links: [] }) });
    const rate = within(panel())
      .getByText('Click rate', { selector: 'p' })
      .closest('.rounded-card')!;
    expect(rate.textContent).toContain('—');
  });

  it('per-article table in cluster order: seen, clicks, click rate, linked to the report', () => {
    const { container } = renderDash();
    const rows = [...container.querySelectorAll('[data-series-row]')];
    expect(rows.map((r) => r.getAttribute('data-series-row'))).toEqual([M1.slug, M2.slug, M3.slug]);
    const cells = (r: Element) => [...r.querySelectorAll('td')].map((c) => c.textContent);
    // #, article, seen, clicks, click rate — 18/300 = 6 %.
    expect(cells(rows[0])).toEqual(['1', M1.title, '300', '18', '6%']);
    expect(cells(rows[1])).toEqual(['2', M2.title, '100', '2', '2%']);
    // Never seen: the rate is "—", not a misleading 0 %.
    expect(cells(rows[2])).toEqual(['3', M3.title, '0', '0', '—']);
    expect(within(rows[0] as HTMLElement).getByRole('link')).toHaveAttribute(
      'href',
      `/admin/inspire/${M1.articleId}/analytics`,
    );
  });

  it('most-clicked series links: from → to, most clicked first, capped at ten', () => {
    const many = Array.from({ length: SERIES_LINKS_SHOWN + 4 }, (_, i) => ({
      fromArticleId: i % 2 === 0 ? M1.articleId : M2.articleId,
      toArticleId: i % 2 === 0 ? M2.articleId : M1.articleId,
      clicks: 100 - i,
    }));
    const { container } = renderDash({ series: seriesOf({ links: many }) });
    const rows = [...container.querySelectorAll('[data-series-link]')];
    expect(rows).toHaveLength(SERIES_LINKS_SHOWN);
    expect(SERIES_LINKS_SHOWN).toBe(10);
    expect(rows[0].getAttribute('data-series-link')).toBe(`${M1.slug}>${M2.slug}`);
    expect([...rows[0].querySelectorAll('td')].map((c) => c.textContent)).toEqual([
      M1.title,
      M2.title,
      '100',
    ]);
  });

  it('drops a link row whose article is no longer in the cluster', () => {
    const { container } = renderDash({
      series: seriesOf({
        links: [
          { fromArticleId: M1.articleId, toArticleId: 'gone', clicks: 90 },
          { fromArticleId: M1.articleId, toArticleId: M2.articleId, clicks: 1 },
        ],
      }),
    });
    const rows = [...container.querySelectorAll('[data-series-link]')];
    expect(rows).toHaveLength(1);
    expect(rows[0].getAttribute('data-series-link')).toBe(`${M1.slug}>${M2.slug}`);
  });

  it('seen but never clicked: the table shows, the link list says so', () => {
    renderDash({
      series: seriesOf({
        clicks: 0,
        perArticle: [{ articleId: M1.articleId, seen: 12, clicks: 0 }],
        links: [],
      }),
    });
    const p = panel();
    expect(within(p).getByText('No series links clicked yet')).toBeInTheDocument();
    expect(within(p).queryByText("This panel couldn't load")).not.toBeInTheDocument();
    expect(within(p).queryByText('No one has seen the series box yet')).not.toBeInTheDocument();
  });

  it('a failed read says it failed — never zeros, and only in this panel (D4)', () => {
    renderDash({ series: null });
    const p = panel();
    expect(within(p).getByText("This panel couldn't load")).toBeInTheDocument();
    expect(within(p).queryByText('Times the series box was seen')).not.toBeInTheDocument();
    expect(screen.getAllByText("This panel couldn't load")).toHaveLength(1);
    // The rest of the page is untouched.
    expect(screen.getByText('Visits that read this cluster')).toBeInTheDocument();
  });

  it('nothing recorded and the box switched OFF: says so, and links to the switch', () => {
    renderDash({
      seriesEnabled: false,
      series: { seen: 0, clicks: 0, perArticle: [], links: [] },
    });
    const p = panel();
    expect(
      within(p).getByText('The series box is switched off for this cluster'),
    ).toBeInTheDocument();
    expect(within(p).getByRole('link', { name: 'Open cluster settings' })).toHaveAttribute(
      'href',
      `/admin/inspire/clusters/${CID}`,
    );
    expect(within(p).queryByText("This panel couldn't load")).not.toBeInTheDocument();
    expect(within(p).queryByText('No one has seen the series box yet')).not.toBeInTheDocument();
    // T5-F1: the copy is scoped to the window — it never claims there is
    // nothing to count full stop.
    expect(
      within(p).getByText(/no views or clicks were recorded in this window/),
    ).toBeInTheDocument();
    expect(within(p).queryByText(/there is nothing to count/)).not.toBeInTheDocument();
  });

  it('nothing recorded but the box is ON: it is collecting, not switched off', () => {
    renderDash({ seriesEnabled: true, series: { seen: 0, clicks: 0, perArticle: [], links: [] } });
    const p = panel();
    expect(within(p).getByText('No one has seen the series box yet')).toBeInTheDocument();
    expect(
      within(p).queryByText('The series box is switched off for this cluster'),
    ).not.toBeInTheDocument();
  });

  it('switched off AFTER readers saw it: the history still shows (not the "off" state)', () => {
    renderDash({ seriesEnabled: false, series: seriesOf() });
    const p = panel();
    expect(within(p).getByText('400')).toBeInTheDocument();
    expect(
      within(p).queryByText('The series box is switched off for this cluster'),
    ).not.toBeInTheDocument();
  });

  it('switched off, seen > 0 and clicks = 0: NEVER the "nothing to count" state (T5-F1)', () => {
    // The state the getter now reports for a switched-off cluster readers saw
    // but never clicked. Views alone must put the numbers on screen.
    renderDash({
      seriesEnabled: false,
      series: {
        seen: 12,
        clicks: 0,
        perArticle: [{ articleId: M1.articleId, seen: 12, clicks: 0 }],
        links: [],
      },
    });
    const p = panel();
    // "12" is both the tile and the table cell, so the tile is matched by its own
    // label, the way the other tile tests do it.
    const seenTile = within(p).getByText('Times the series box was seen').closest('.rounded-card')!;
    expect(seenTile.textContent).toContain('12');
    expect(
      within(p).queryByText('The series box is switched off for this cluster'),
    ).not.toBeInTheDocument();
    expect(within(p).queryByText(/nothing new is being counted/)).not.toBeInTheDocument();
    expect(within(p).queryByText(/nothing to count/)).not.toBeInTheDocument();
    expect(within(p).queryByText('No one has seen the series box yet')).not.toBeInTheDocument();
  });

  it('switched off with clicks but no views recorded: still the numbers, not the "off" state (T5-F1)', () => {
    renderDash({
      seriesEnabled: false,
      series: {
        seen: 0,
        clicks: 3,
        perArticle: [{ articleId: M1.articleId, seen: 0, clicks: 3 }],
        links: [{ fromArticleId: M1.articleId, toArticleId: M2.articleId, clicks: 3 }],
      },
    });
    const p = panel();
    expect(within(p).getByText('Clicks on series links')).toBeInTheDocument();
    expect(
      within(p).queryByText('The series box is switched off for this cluster'),
    ).not.toBeInTheDocument();
  });

  it('the caption says how it counts and when recording began (R18)', () => {
    renderDash();
    const caption = within(panel()).getByText(new RegExp(SERIES_CAPTION.slice(0, 40)));
    expect(caption.textContent).toContain('Last 90 days');
    expect(SERIES_CAPTION).toMatch(/one view/i);
    expect(SERIES_CAPTION).toMatch(/Bot traffic excluded/);
    expect(SERIES_CAPTION).toMatch(/clicks per view, not per reader/);
    expect(SERIES_CAPTION).toMatch(/Recorded from 16 Nov 2026\./);
    expect(SERIES_BOX_SINCE).toBe('2026-11-16');
    // D1: no storage names on screen.
    expect(SERIES_CAPTION).not.toMatch(/series_enabled|cluster_id|analytics_events|boolean/);
  });
});

describe('Series box panel on the page (R18, R19)', () => {
  beforeEach(() => {
    for (const f of Object.values(h)) f.mockReset();
    h.load.mockResolvedValue(snapshot([M1, M2]));
    h.overview.mockResolvedValue(overviewOf());
    h.journey.mockResolvedValue([]);
    h.clicks.mockResolvedValue([]);
    h.series.mockResolvedValue(seriesOf());
  });

  it('a failed series read fails ONLY the series panel', async () => {
    h.series.mockRejectedValue(
      Object.assign(new Error('canceling statement due to statement timeout'), { code: '57014' }),
    );
    h.journey.mockResolvedValue([{ from: M1.slug, to: M2.slug, moves: 3 }]);
    await renderPage();
    expect(screen.getAllByText("This panel couldn't load")).toHaveLength(1);
    const series = panelOf('Series box');
    expect(within(series).getByText("This panel couldn't load")).toBeInTheDocument();
    expect(
      within(panelOf('Where readers went next')).queryByText("This panel couldn't load"),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Visits that read this cluster')).toBeInTheDocument();
  });

  it("passes the cluster's switch through, so OFF reads as off and not as empty", async () => {
    h.load.mockResolvedValue(snapshot([M1, M2], false));
    h.series.mockResolvedValue({ seen: 0, clicks: 0, perArticle: [], links: [] });
    await renderPage();
    expect(
      within(panelOf('Series box')).getByText('The series box is switched off for this cluster'),
    ).toBeInTheDocument();
  });

  it('a switched-ON cluster with nothing recorded is collecting', async () => {
    h.load.mockResolvedValue(snapshot([M1, M2], true));
    h.series.mockResolvedValue({ seen: 0, clicks: 0, perArticle: [], links: [] });
    await renderPage();
    expect(
      within(panelOf('Series box')).getByText('No one has seen the series box yet'),
    ).toBeInTheDocument();
  });
});
