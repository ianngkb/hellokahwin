import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

const where = vi.fn();
const select = vi.fn(() => ({ from: () => ({ where }) }));
const getArticlesCompare = vi.fn();
const requireAdminSection = vi.fn();

vi.mock('@/lib/db/drizzle', () => ({ db: { select: () => select() } }));
vi.mock('@/lib/auth/admin', () => ({ requireAdminSection: (s: string) => requireAdminSection(s) }));
vi.mock('@/lib/analytics/article-compare', () => ({
  getArticlesCompare: (slugs: string[]) => getArticlesCompare(slugs),
}));
// The page's client children are exercised by their own tests.
vi.mock('../compare-picker', () => ({
  ComparePicker: ({ selected }: { selected: { title: string }[] }) => (
    <div data-testid="picker">{selected.map((s) => s.title).join('|')}</div>
  ),
}));
vi.mock('../compare-dashboard', () => ({
  CompareDashboard: ({ articles }: { articles: { slug: string; status: string }[] }) => (
    <div data-testid="dashboard">
      {articles.map((a) => (a.status === 'published' ? a.slug : `${a.slug}:${a.status}`)).join('|')}
    </div>
  ),
}));
// The overview's loader and dashboard have their own tests; here we only
// check which tab renders and with what period/filters.
const loadOverview = vi.fn();
vi.mock('../overview-data', () => ({
  loadOverview: (...a: unknown[]) => loadOverview(...a),
}));
vi.mock('../overview-dashboard', () => ({
  OverviewDashboard: () => <div data-testid="overview" />,
}));
vi.mock('../period-bar', () => ({
  PeriodBar: ({ active }: { active: string }) => <div data-testid="period">{active}</div>,
}));
const TitleTestsView = vi.fn();
vi.mock('../title-tests-view', () => ({
  TitleTestsView: (p: { start?: string }) => {
    TitleTestsView(p);
    return <div data-testid="title-tests">{p.start ?? ''}</div>;
  },
}));
vi.mock('@/components/layout/page-header', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

import ArticleComparePage from '../page';

/** R11 on the server side: the cap is applied BEFORE the getters run. */

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const row = (n: number) => ({
  id: id(n),
  slug: `slug-${n}`,
  title: `Title ${n}`,
  status: 'published',
  publishedAt: new Date('2026-10-01T00:00:00Z'),
});

const okPanels = (slugs: string[]) => ({
  slugs,
  totals: new Map(),
  scroll: new Map(),
  dropOff: new Map(),
  sources: new Map(),
  devices: new Map(),
});

async function renderPage(ids?: string, extra: Record<string, string> = {}) {
  const ui = await ArticleComparePage({
    searchParams: Promise.resolve(ids === undefined ? extra : { ids, ...extra }),
  });
  render(ui);
}

beforeEach(() => {
  where.mockReset();
  select.mockClear();
  getArticlesCompare.mockReset();
  getArticlesCompare.mockImplementation(async (slugs: string[]) => okPanels(slugs));
  requireAdminSection.mockReset();
  loadOverview.mockReset();
  loadOverview.mockResolvedValue({ leaderboard: { page: 1 } });
});
afterEach(cleanup);

describe('Article Analytics page', () => {
  it('requires the inspire admin section', async () => {
    await renderPage();
    expect(requireAdminSection).toHaveBeenCalledWith('inspire');
  });

  it('opens on the overview, last 30 days, without touching the comparison', async () => {
    await renderPage();
    expect(screen.getByTestId('overview')).toBeTruthy();
    expect(screen.getByTestId('period').textContent).toBe('30d');
    expect(getArticlesCompare).not.toHaveBeenCalled();
    expect(screen.queryByTestId('picker')).toBeNull();
  });

  it('passes the chosen month and filters to the overview loader', async () => {
    await renderPage(undefined, {
      period: 'month',
      month: '2026-10',
      sort: 'readers',
      q: 'ring',
    });
    const [period, filters] = loadOverview.mock.calls[0];
    expect(period).toMatchObject({ key: 'month', monthKey: '2026-10' });
    expect(period.range).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(filters).toMatchObject({ sort: 'readers', q: 'ring', page: 1 });
  });

  it('shows the compare empty state and fires no query on the Compare tab with no selection', async () => {
    await renderPage(undefined, { view: 'compare' });
    expect(loadOverview).not.toHaveBeenCalled();
    expect(screen.getByText('Pick two or more articles to compare')).toBeTruthy();
    expect(select).not.toHaveBeenCalled();
    expect(getArticlesCompare).not.toHaveBeenCalled();
    expect(screen.queryByTestId('dashboard')).toBeNull();
  });

  it('passes at most 6 articles to the getters when the URL has 7, and says so', async () => {
    const seven = [1, 2, 3, 4, 5, 6, 7];
    where.mockResolvedValue(seven.slice(0, 6).map(row));
    await renderPage(seven.map(id).join(','));
    expect(getArticlesCompare).toHaveBeenCalledTimes(1);
    expect(getArticlesCompare.mock.calls[0][0]).toHaveLength(6);
    expect(
      screen.getByText(
        'Compare up to 6 articles at a time — only the first 6 in the link were used.',
      ),
    ).toBeTruthy();
  });

  it('skips unknown and malformed ids, keeps URL order for the rest', async () => {
    where.mockResolvedValue([row(1), row(3)]); // id(2) is unknown
    await renderPage(`${id(3)},garbage,${id(2)},${id(1)}`);
    expect(getArticlesCompare).toHaveBeenCalledWith(['slug-3', 'slug-1']);
    expect(screen.getByTestId('dashboard').textContent).toBe('slug-3|slug-1');
    expect(screen.getByTestId('picker').textContent).toBe('Title 3|Title 1');
    expect(
      screen.getByText('2 articles in the link could not be found and were skipped.'),
    ).toBeTruthy();
  });

  it('T4-F4: passes a scheduled draft on as "scheduled"', async () => {
    where.mockResolvedValue([
      { ...row(1), status: 'draft', scheduledPublishAt: new Date('2026-12-01T00:00:00Z') },
      { ...row(2), status: 'draft', scheduledPublishAt: null },
    ]);
    await renderPage(`${id(1)},${id(2)}`);
    expect(screen.getByTestId('dashboard').textContent).toBe('slug-1:scheduled|slug-2:draft');
  });

  it('shows the empty state when every id is unknown, without calling the getters', async () => {
    where.mockResolvedValue([]);
    await renderPage(id(9));
    expect(getArticlesCompare).not.toHaveBeenCalled();
    expect(screen.getByText('Pick two or more articles to compare')).toBeTruthy();
  });
});

describe('Title tests tab', () => {
  it('opens on ?view=title-tests and passes the article to start a test on', async () => {
    await renderPage(undefined, { view: 'title-tests', start: 'abc' });
    expect(screen.getByTestId('title-tests').textContent).toBe('abc');
    expect(screen.queryByTestId('overview')).toBeNull();
    expect(screen.getByRole('link', { name: 'Title tests' }).getAttribute('aria-current')).toBe(
      'page',
    );
    expect(requireAdminSection).toHaveBeenCalledWith('inspire');
  });
});
