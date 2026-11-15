import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { ArticleAnalyticsDashboard } from '../dashboard';
import type { SectionDropOff } from '@/lib/analytics/article-sections';
import { SECTION_TRACKING_SINCE } from '@/lib/analytics/section-tracking';
import { SCROLL_TRACKING_SINCE } from '@/lib/analytics/scroll-tracking';

/**
 * A failed panel must SAY it failed. On 2026-11-07 three panels on this page
 * timed out and rendered the same "No … yet" box as an article with no data,
 * for an article with 21 real visits. `null` = couldn't load; `[]` = no data.
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

/** Section drop-off with nothing recorded yet (the deploy-day state). */
const noSections: SectionDropOff = {
  openedVisitors: 0,
  rows: [
    { index: 0, heading: null, reached: 0, stoppedHere: 0, reachedShare: 0 },
    { index: 1, heading: null, reached: 0, stoppedHere: 0, reachedShare: 0 },
  ],
  sectionTotal: 0,
  firstSeenAt: null,
  headingsChanged: false,
};

const base = {
  daily: [],
  totals: { totalViews: 21, uniqueVisitors: 18 },
  publishedAt: '2026-11-03T00:00:00.000Z',
  sections: noSections,
};
const scroll = [
  { percent: 25, visitors: 10 },
  { percent: 50, visitors: 8 },
  { percent: 75, visitors: 5 },
  { percent: 100, visitors: 2 },
];

function panel(title: string): HTMLElement {
  return screen.getByText(title).closest('.rounded-card') as HTMLElement;
}

describe('ArticleAnalyticsDashboard — failed vs empty panels', () => {
  it('renders "This panel couldn\'t load" for every null panel, and no empty-state copy', () => {
    render(
      <ArticleAnalyticsDashboard
        {...base}
        events={null}
        scroll={null}
        sources={null}
        devices={null}
      />,
    );
    for (const title of [
      'Devices',
      'Where readers came from',
      'What people did on the page',
      'How far people read',
    ]) {
      const p = within(panel(title));
      expect(p.getByText("This panel couldn't load")).toBeTruthy();
      expect(p.getByText('Refresh the page to try again.')).toBeTruthy();
    }
    expect(screen.queryByText('No device data yet')).toBeNull();
    expect(screen.queryByText('No source data yet')).toBeNull();
    expect(screen.queryByText('No interactions recorded yet')).toBeNull();
    expect(screen.queryByText('No scroll data yet')).toBeNull();
    // A failed read-depth read never claims "0 reached the end".
    const tile = screen.getByText('Reached the end').parentElement!;
    expect(within(tile).getByText('—')).toBeTruthy();
  });

  it('renders the empty states for [] and never the failed copy', () => {
    render(
      <ArticleAnalyticsDashboard
        {...base}
        events={[]}
        scroll={scroll.map((s) => ({ ...s, visitors: 0 }))}
        sources={[]}
        devices={[]}
      />,
    );
    expect(screen.getByText('No device data yet')).toBeTruthy();
    expect(screen.getByText('No source data yet')).toBeTruthy();
    expect(screen.getByText('No interactions recorded yet')).toBeTruthy();
    expect(screen.getByText('No scroll data yet')).toBeTruthy();
    expect(screen.queryByText("This panel couldn't load")).toBeNull();
    const tile = screen.getByText('Reached the end').parentElement!;
    expect(within(tile).getByText('0')).toBeTruthy();
  });

  it('renders rows when the panels have data', () => {
    render(
      <ArticleAnalyticsDashboard
        {...base}
        events={[{ eventName: 'article_link_click', total: 21, visitors: 18 }]}
        scroll={scroll}
        sources={[{ name: 'google.com', visitors: 12 }]}
        devices={[{ name: 'Mobile', visitors: 15 }]}
      />,
    );
    expect(within(panel('Devices')).getByText('Mobile')).toBeTruthy();
    expect(within(panel('Where readers came from')).getByText('google.com')).toBeTruthy();
    expect(
      within(panel('What people did on the page')).getByText('Clicked a link in the article'),
    ).toBeTruthy();
    expect(screen.queryByText("This panel couldn't load")).toBeNull();
  });

  // T5 / R20: the two Series-box events are named in the same plain words as
  // every other row, so an admin reading one article's report never meets the
  // raw event name.
  it('names the series-box events in plain words (R20)', () => {
    render(
      <ArticleAnalyticsDashboard
        {...base}
        events={[
          { eventName: 'Series Box Viewed', total: 300, visitors: 240 },
          { eventName: 'Series Link Clicked', total: 18, visitors: 17 },
        ]}
        scroll={scroll}
        sources={[]}
        devices={[]}
      />,
    );
    const did = panel('What people did on the page');
    expect(within(did).getByText('Saw the series box')).toBeTruthy();
    expect(within(did).getByText('Clicked a series link')).toBeTruthy();
    expect(within(did).queryByText('Series Box Viewed')).toBeNull();
    expect(within(did).queryByText('Series Link Clicked')).toBeNull();
  });

  it('says read depth is recorded from 16 Nov 2026', () => {
    render(
      <ArticleAnalyticsDashboard {...base} events={[]} scroll={scroll} sources={[]} devices={[]} />,
    );
    expect(
      within(panel('How far people read')).getByText(/recorded\s+from 16 Nov 2026/),
    ).toBeTruthy();
  });

  // I-F6: the caption's formatter appends `T00:00:00Z`, so the constant must
  // stay a DATE (yyyy-MM-dd); a full ISO instant would render "Invalid Date".
  // (SECTION_TRACKING_SINCE is an instant and goes through fmtInstantKL.)
  it('I-F6: SCROLL_TRACKING_SINCE stays date-only and never renders "Invalid Date"', () => {
    expect(SCROLL_TRACKING_SINCE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    render(
      <ArticleAnalyticsDashboard {...base} events={[]} scroll={scroll} sources={[]} devices={[]} />,
    );
    expect(document.body.textContent).not.toContain('Invalid Date');
  });
});

/** The R25 example as the getter returns it: A reached 1-3, B reached 1, 5 opened. */
const r25: SectionDropOff = {
  openedVisitors: 5,
  rows: [
    { index: 0, heading: null, reached: 5, stoppedHere: 3, reachedShare: 1 },
    { index: 1, heading: 'Grand halls', reached: 2, stoppedHere: 1, reachedShare: 0.4 },
    { index: 2, heading: '', reached: 1, stoppedHere: 0, reachedShare: 0.2 },
    { index: 3, heading: 'Budget picks', reached: 1, stoppedHere: 1, reachedShare: 0.2 },
    { index: 4, heading: null, reached: 0, stoppedHere: 0, reachedShare: 0 },
  ],
  sectionTotal: 3,
  firstSeenAt: '2026-11-08T17:30:00.000Z', // 9 Nov in KL
  headingsChanged: false,
};

// SECTION_TRACKING_SINCE is the exact launch instant (T7-F4); the caption
// shows its KL calendar day.
const SINCE_LABEL = new Date(SECTION_TRACKING_SINCE).toLocaleDateString('en-MY', {
  timeZone: 'Asia/Kuala_Lumpur',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function renderSections(sections: SectionDropOff | null) {
  render(
    <ArticleAnalyticsDashboard
      {...base}
      events={[]}
      scroll={scroll}
      sources={[]}
      devices={[]}
      sections={sections}
    />,
  );
  return within(panel('Where readers stop'));
}

describe('ArticleAnalyticsDashboard — Where readers stop', () => {
  it('nothing recorded yet: "No section data yet" with the collecting-since date, never zeros', () => {
    const p = renderSections(noSections);
    expect(p.getByText('No section data yet')).toBeTruthy();
    expect(
      p.getByText(`We started collecting this on ${SINCE_LABEL} — check back as visits come in.`),
    ).toBeTruthy();
    expect(p.queryByText('Introduction')).toBeNull();
    expect(p.queryByText('0%')).toBeNull();
    expect(p.queryByText("This panel couldn't load")).toBeNull();
  });

  it('a failed read says so, distinct from the empty state', () => {
    const p = renderSections(null);
    expect(p.getByText("This panel couldn't load")).toBeTruthy();
    expect(p.queryByText('No section data yet')).toBeNull();
  });

  it('rows read Introduction, the numbered headings, End of article, with Stopped-here counts', () => {
    const p = renderSections(r25);
    const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-section-row]')).map((r) =>
      Array.from(r.children).map((c) => c.textContent?.trim()),
    );
    expect(rows).toEqual([
      ['Introduction', '100%', '3'],
      ['1. Grand halls', '40%', '1'],
      ['2. (untitled section)', '20%', '0'],
      ['3. Budget picks', '20%', '1'],
      ['End of article', '0%', '0'],
    ]);
    expect(p.getByText(/Collecting since/).textContent).toContain(SINCE_LABEL);
    expect(p.getByText(/visitors who opened the article/)).toBeTruthy();
    // firstSeenAt is shown as its KL date.
    expect(p.getByText(/First recorded visit: 9 Nov 2026/)).toBeTruthy();
    expect(p.queryByText(/headings were edited/)).toBeNull();
  });

  it('warns when the headings were edited after tracking began', () => {
    const p = renderSections({ ...r25, headingsChanged: true });
    expect(
      p.getByText(
        /The article's headings were edited after tracking began, so older visits may sit under a neighbouring section\./,
      ),
    ).toBeTruthy();
  });

  it('section_reached reads in English in "What people did on the page"', () => {
    render(
      <ArticleAnalyticsDashboard
        {...base}
        events={[{ eventName: 'section_reached', total: 9, visitors: 4 }]}
        scroll={scroll}
        sources={[]}
        devices={[]}
      />,
    );
    expect(
      within(panel('What people did on the page')).getByText('Reached a section'),
    ).toBeTruthy();
  });
});
