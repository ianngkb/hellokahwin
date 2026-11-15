import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import {
  CompareDashboard,
  DROP_OFF_CAPTION,
  avgReadDepth,
  dimensionShare,
  type CompareArticle,
  type ComparePanelsData,
} from '../compare-dashboard';
import type { DropOffBand } from '@/lib/analytics/article-compare';
import { OTHER_SOURCES_NAME } from '@/lib/analytics/compare-limits';

/**
 * The comparison page's dashboard (R12, D4–D6). A failed metric (`null`) must
 * SAY it failed, never pass for "no data"; up to six articles render as
 * columns, each title truncated with the full title on hover and linking to
 * its own full report; the drop-off panel stays on the page milestones.
 */

// `ConsoleTable` measures its scrollport with a ResizeObserver; jsdom has none.
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

afterEach(cleanup);

function article(n: number, title = `Article number ${n}`): CompareArticle {
  return {
    id: `00000000-0000-4000-8000-00000000000${n}`,
    slug: `slug-${n}`,
    title,
    status: n === 2 ? 'draft' : 'published',
    publishedAt: n === 2 ? null : '2026-10-15T02:00:00.000Z',
  };
}

function bands(counts: [number, number, number, number, number]): DropOffBand[] {
  const total = counts.reduce((a, b) => a + b, 0);
  return ([0, 25, 50, 75, 100] as const).map((band, i) => ({
    band,
    visitors: counts[i],
    share: total > 0 ? counts[i] / total : 0,
  }));
}

function fullData(arts: CompareArticle[]): ComparePanelsData {
  const rec = <T,>(f: (a: CompareArticle, i: number) => T) =>
    Object.fromEntries(arts.map((a, i) => [a.slug, f(a, i)]));
  return {
    totals: rec((_, i) => ({ views: 100 * (i + 1), uniqueVisitors: 80 * (i + 1) })),
    scroll: rec(() => [
      { percent: 25, visitors: 40 },
      { percent: 50, visitors: 30 },
      { percent: 75, visitors: 20 },
      { percent: 100, visitors: 10 },
    ]),
    dropOff: rec(() => bands([20, 10, 10, 10, 10])),
    sources: rec(() => [
      { name: 'Google', visitors: 30 },
      { name: 'Direct', visitors: 10 },
    ]),
    devices: rec(() => [
      { name: 'Mobile', visitors: 35 },
      { name: 'Desktop', visitors: 5 },
    ]),
  };
}

const empty: ComparePanelsData = {
  totals: {},
  scroll: {},
  dropOff: {},
  sources: {},
  devices: {},
};

describe('CompareDashboard', () => {
  it('renders a failed metric as "couldn\'t load", distinct from every empty state', () => {
    const arts = [article(1), article(2)];
    render(
      <CompareDashboard
        articles={arts}
        panels={{ totals: null, scroll: null, dropOff: null, sources: null, devices: null }}
      />,
    );
    // Four metric panels failed → four "couldn't load" boxes; no empty copy.
    expect(screen.getAllByText("This panel couldn't load")).toHaveLength(4);
    expect(screen.queryByText('No device data yet')).toBeNull();
    expect(screen.queryByText('No source data yet')).toBeNull();
    expect(screen.queryByText('No scroll data yet')).toBeNull();
    // The summary still lists the articles, with dashes rather than zeros.
    expect(screen.getByText(/Views and visitors couldn't load/)).toBeTruthy();
    const row = document.querySelector(`[data-summary-row="${arts[0].id}"]`) as HTMLElement;
    expect(within(row).queryByText('0')).toBeNull();
    expect(within(row).getAllByText('—').length).toBeGreaterThanOrEqual(4);
  });

  it('renders no-data as empty states, never as "couldn\'t load"', () => {
    render(<CompareDashboard articles={[article(1), article(2)]} panels={empty} />);
    expect(screen.queryByText("This panel couldn't load")).toBeNull();
    expect(screen.getByText('No scroll data yet')).toBeTruthy();
    expect(screen.getByText('No drop-off data yet')).toBeTruthy();
    expect(screen.getByText('No source data yet')).toBeTruthy();
    expect(screen.getByText('No device data yet')).toBeTruthy();
  });

  it('fails one panel without blanking the others', () => {
    const arts = [article(1), article(3)];
    render(<CompareDashboard articles={arts} panels={{ ...fullData(arts), devices: null }} />);
    expect(screen.getAllByText("This panel couldn't load")).toHaveLength(1);
    expect(screen.getAllByText('Google').length).toBe(1);
  });

  it('renders six articles as six columns in every metric panel', () => {
    const arts = [1, 2, 3, 4, 5, 6].map((n) => article(n));
    render(<CompareDashboard articles={arts} panels={fullData(arts)} />);
    for (const a of arts) {
      // read depth, drop-off, sources, devices
      expect(document.querySelectorAll(`[data-compare-column="${a.id}"]`)).toHaveLength(4);
      expect(document.querySelector(`[data-summary-row="${a.id}"]`)).not.toBeNull();
    }
    expect(screen.getByText('600')).toBeTruthy(); // 6th article's views
  });

  it('truncates long titles with the full title in title= and links each to its report', () => {
    const long =
      'The complete guide to choosing a garden wedding venue in Kuala Lumpur and Selangor for 2027';
    const arts = [article(1, long), article(3)];
    render(<CompareDashboard articles={arts} panels={fullData(arts)} />);
    const links = document.querySelectorAll<HTMLAnchorElement>(
      `[data-article-link="${arts[0].id}"]`,
    );
    // summary row + 4 column headers
    expect(links).toHaveLength(5);
    for (const link of links) {
      expect(link.getAttribute('title')).toBe(long);
      expect(link.getAttribute('href')).toBe(`/admin/inspire/${arts[0].id}/analytics`);
      expect(link.querySelector('.truncate')?.textContent).toBe(long);
    }
  });

  it('keeps the drop-off panel on milestones, with the R12 caption and section links', () => {
    const arts = [article(1), article(3)];
    render(<CompareDashboard articles={arts} panels={fullData(arts)} />);
    expect(screen.getByText(DROP_OFF_CAPTION)).toBeTruthy();
    expect(DROP_OFF_CAPTION).toBe(
      "Sections differ from article to article, so this view compares the four page milestones. Open an article's full report for its section-by-section drop-off.",
    );
    expect(screen.getByText('Left before scrolling')).toBeTruthy();
    expect(screen.getByText('Reached the bottom of the page')).toBeTruthy();
    // Never section rows here (R28).
    expect(screen.queryByText('Introduction')).toBeNull();
    expect(screen.queryByText('End of article')).toBeNull();
    for (const a of arts) {
      const link = document.querySelector(`[data-sections-link="${a.id}"]`);
      expect(link?.getAttribute('href')).toBe(
        `/admin/inspire/${a.id}/analytics#where-readers-stop`,
      );
      expect(link?.textContent).toContain(`Where readers stop in ${a.title}`);
    }
  });

  it('shows plain-language status and dates, not stored values', () => {
    const arts = [article(1), article(2)];
    render(<CompareDashboard articles={arts} panels={fullData(arts)} />);
    const first = document.querySelector(`[data-summary-row="${arts[0].id}"]`) as HTMLElement;
    const second = document.querySelector(`[data-summary-row="${arts[1].id}"]`) as HTMLElement;
    expect(within(first).getByText('Published')).toBeTruthy();
    expect(within(first).getByText("Oct 15 '26")).toBeTruthy();
    expect(within(second).getByText('Draft')).toBeTruthy();
    expect(within(second).getByText('Not published')).toBeTruthy();
    expect(screen.queryByText('in_review')).toBeNull();
  });

  it('marks a zero-traffic article "No data yet" beside one with data, with zeros in the summary', () => {
    const arts = [article(1), article(3)];
    const data = fullData([arts[0]]);
    data.totals![arts[1].slug] = { views: 0, uniqueVisitors: 0 };
    data.scroll![arts[1].slug] = [25, 50, 75, 100].map((percent) => ({ percent, visitors: 0 }));
    data.dropOff![arts[1].slug] = bands([0, 0, 0, 0, 0]);
    data.sources![arts[1].slug] = [];
    data.devices![arts[1].slug] = [];
    render(<CompareDashboard articles={arts} panels={data} />);
    expect(screen.getAllByText('No data yet')).toHaveLength(4);
    const row = document.querySelector(`[data-summary-row="${arts[1].id}"]`) as HTMLElement;
    expect(within(row).getAllByText('0')).toHaveLength(3); // views, unique, reached the end
    expect(within(row).getByText('—')).toBeTruthy(); // avg read depth
    expect(screen.queryByText("This panel couldn't load")).toBeNull();
  });
});

describe('CompareDashboard — T4 review fixes', () => {
  it('T4-F3: dates an article published 00:30 Kuala Lumpur on its KL day, not the UTC day before', () => {
    // 2026-10-14T16:30Z is 2026-10-15 00:30 in Asia/Kuala_Lumpur (UTC+8).
    const a = { ...article(1), publishedAt: '2026-10-14T16:30:00.000Z' };
    render(<CompareDashboard articles={[a]} panels={fullData([a])} />);
    const row = document.querySelector(`[data-summary-row="${a.id}"]`) as HTMLElement;
    expect(within(row).getByText("Oct 15 '26")).toBeTruthy();
    expect(within(row).queryByText("Oct 14 '26")).toBeNull();
  });

  it('T4-F4: a scheduled article reads "Scheduled", not "Draft"', () => {
    const a = { ...article(2), status: 'scheduled' };
    render(<CompareDashboard articles={[a]} panels={fullData([a])} />);
    const row = document.querySelector(`[data-summary-row="${a.id}"]`) as HTMLElement;
    expect(within(row).getByText('Scheduled')).toBeTruthy();
    expect(within(row).queryByText('Draft')).toBeNull();
  });

  it('T4-F1: source shares are of ALL source visitors (Other sources included), not the top 8 shown', () => {
    const a = article(1);
    const data = fullData([a]);
    const top8 = Array.from({ length: 8 }, (_, i) => ({ name: `site${i}.com`, visitors: 5 }));
    // 8 x 5 = 40 named + 60 in Other sources = 100 total.
    data.sources![a.slug] = [...top8, { name: OTHER_SOURCES_NAME, visitors: 60 }];
    render(<CompareDashboard articles={[a]} panels={data} />);
    const table = screen.getByText('site0.com').closest('table') as HTMLElement;
    const site0 = screen.getByText('site0.com').closest('tr') as HTMLElement;
    expect(within(site0).getByText('· 5%')).toBeTruthy(); // 5 / 100, not 5 / 40 = 13%
    const other = within(table).getByText(OTHER_SOURCES_NAME).closest('tr') as HTMLElement;
    expect(within(other).getByText('· 60%')).toBeTruthy();
    // "Other sources" is always the last row even though it is the biggest.
    const rows = table.querySelectorAll('tbody tr');
    expect(rows[rows.length - 1]).toBe(other);
    expect(screen.getByText(/the rest are grouped as Other sources/)).toBeTruthy();
    expect(dimensionShare(data.sources![a.slug], 'site0.com')).toBeCloseTo(0.05);
  });

  it('T4-F5: a device bucket an article lacks is a real 0, while a missing source stays —', () => {
    const arts = [article(1), article(3)];
    const data = fullData(arts);
    data.devices![arts[1].slug] = [{ name: 'Mobile', visitors: 10 }]; // no Desktop
    data.sources![arts[1].slug] = [{ name: 'Google', visitors: 10 }]; // no Direct
    render(<CompareDashboard articles={arts} panels={data} />);
    const desktop = screen.getByText('Desktop').closest('tr') as HTMLElement;
    const cells = desktop.querySelectorAll('td');
    expect(cells[2].textContent).toContain('0');
    expect(cells[2].textContent).toContain('0%');
    expect(cells[2].textContent).not.toContain('—');
    const direct = screen.getByText('Direct').closest('tr') as HTMLElement;
    expect(direct.querySelectorAll('td')[2].textContent).toBe('—');
  });
});

describe('avgReadDepth', () => {
  it('uses the telescoping formula and is null with no scroll', () => {
    expect(
      avgReadDepth([
        { percent: 25, visitors: 40 },
        { percent: 50, visitors: 30 },
        { percent: 75, visitors: 20 },
        { percent: 100, visitors: 10 },
      ]),
    ).toBe(63); // 25 * 100 / 40 = 62.5
    expect(avgReadDepth([{ percent: 25, visitors: 0 }])).toBeNull();
    expect(avgReadDepth([])).toBeNull();
  });
});
