import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { StrictMode } from 'react';

/**
 * `section_reached` (R24): one event per body section the first time it is
 * seen, indices 1..N in document order with `section_total = N`, the end
 * sentinel as N + 1, nothing before 3 s of dwell, never more than 60 headings.
 */

const track = vi.hoisted(() => vi.fn());
vi.mock('@/lib/analytics/tracker', () => ({ track }));

// A controllable IntersectionObserver: tests decide which elements are "seen".
type Entry = { isIntersecting: boolean; target: Element };
type Cb = (entries: Entry[]) => void;
interface Rec {
  cb: Cb;
  options: IntersectionObserverInit;
  observed: Set<Element>;
  disconnected: boolean;
}
const observers: Rec[] = [];
class FakeIO {
  private rec: Rec;
  constructor(cb: Cb, options: IntersectionObserverInit) {
    this.rec = { cb, options, observed: new Set(), disconnected: false };
    observers.push(this.rec);
  }
  observe(el: Element) {
    this.rec.observed.add(el);
  }
  unobserve(el: Element) {
    this.rec.observed.delete(el);
  }
  disconnect() {
    this.rec.disconnected = true;
    this.rec.observed.clear();
  }
}
/** Report `els` as entering the viewport to every live observer watching them. */
function see(...els: Element[]) {
  act(() => {
    for (const o of observers) {
      if (o.disconnected) continue;
      const entries = els
        .filter((e) => o.observed.has(e))
        .map((target) => ({ isIntersecting: true, target }));
      if (entries.length) o.cb(entries);
    }
  });
}

const { ArticleSectionTracker, MIN_DWELL_MS } = await import('../article-section-tracker');
const { SEEN_ROOT_MARGIN } = await import('@/lib/analytics/use-track-once-visible');

/** Mimics ArticleRenderer: `.inspire-prose` > HTML-part divs > headings. */
function Body({ headings }: { headings: string[] }) {
  return (
    <div className="inspire-prose">
      <div dangerouslySetInnerHTML={{ __html: '<p>Intro</p>' }} />
      {headings.map((t, i) => (
        <div
          key={i}
          dangerouslySetInnerHTML={{
            __html: `${i % 2 ? '<h3>' : '<h2>'}${t}${i % 2 ? '</h3>' : '</h2>'}<p>para</p>`,
          }}
        />
      ))}
      {/* An embed's nested heading (the ang pow table) is NOT a section. */}
      <div className="angpow-table">
        <section>
          <h3>Hotels in Selangor</h3>
        </section>
      </div>
    </div>
  );
}

function mount(headings: string[], strict = false) {
  const tree = (
    <ArticleSectionTracker articleSlug="best-ballrooms">
      <Body headings={headings} />
    </ArticleSectionTracker>
  );
  const utils = render(strict ? <StrictMode>{tree}</StrictMode> : tree);
  const hs = Array.from(
    utils.container.querySelectorAll('.inspire-prose > div > h2, .inspire-prose > div > h3'),
  );
  const sentinel = utils.container.querySelector('[data-article-end]')!;
  return { ...utils, hs, sentinel };
}

const SEVEN = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'];
const calls = () => track.mock.calls.map((c) => c[1] as Record<string, unknown>);

beforeEach(() => {
  observers.length = 0;
  vi.useFakeTimers();
  vi.stubGlobal('IntersectionObserver', FakeIO);
});
afterEach(() => {
  cleanup();
  track.mockClear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('ArticleSectionTracker', () => {
  it('renders the end-of-article sentinel after the body', () => {
    const { sentinel, container } = mount(SEVEN);
    expect(sentinel).toBeTruthy();
    expect(sentinel.getAttribute('aria-hidden')).toBe('true');
    expect(container.firstElementChild!.lastElementChild).toBe(sentinel);
  });

  it('uses the shared top-three-quarters rule', () => {
    mount(SEVEN);
    expect(observers[0].options.rootMargin).toBe(SEEN_ROOT_MARGIN);
    expect(observers[0].options.threshold).toBe(0);
  });

  it('scrolling to the 3rd of 7 headings fires indices 1, 2, 3 with section_total 7 and the heading text', () => {
    const { hs } = mount(SEVEN);
    act(() => vi.advanceTimersByTime(MIN_DWELL_MS));
    see(hs[0]);
    see(hs[1]);
    see(hs[2]);
    expect(track).toHaveBeenCalledTimes(3);
    expect(track.mock.calls.every((c) => c[0] === 'section_reached')).toBe(true);
    expect(calls()).toEqual([
      { section_index: 1, section_total: 7, heading: 'One', article_slug: 'best-ballrooms' },
      { section_index: 2, section_total: 7, heading: 'Two', article_slug: 'best-ballrooms' },
      { section_index: 3, section_total: 7, heading: 'Three', article_slug: 'best-ballrooms' },
    ]);
  });

  it('a heading that scrolls out and back in fires once', () => {
    const { hs } = mount(SEVEN);
    act(() => vi.advanceTimersByTime(MIN_DWELL_MS));
    see(hs[0]);
    see(hs[0]);
    see(hs[0], hs[1]);
    expect(calls().map((c) => c.section_index)).toEqual([1, 2]);
  });

  it('records nothing for a reader who leaves within 3 s, even with sections seen', () => {
    const { hs, sentinel, unmount } = mount(SEVEN);
    see(hs[0], hs[1], sentinel);
    act(() => vi.advanceTimersByTime(MIN_DWELL_MS - 1));
    unmount();
    act(() => vi.advanceTimersByTime(10_000));
    expect(track).not.toHaveBeenCalled();
  });

  it('flushes sightings from the first 3 s once the reader stays, in order', () => {
    const { hs, sentinel } = mount(['A', 'B']);
    see(sentinel, hs[0]); // a short article: the end is visible at load
    expect(track).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(MIN_DWELL_MS));
    expect(calls()).toEqual([
      { section_index: 1, section_total: 2, heading: 'A', article_slug: 'best-ballrooms' },
      { section_index: 3, section_total: 2, heading: null, article_slug: 'best-ballrooms' },
    ]);
    // After the dwell, a sighting fires immediately.
    see(hs[1]);
    expect(calls().map((c) => c.section_index)).toEqual([1, 3, 2]);
  });

  it('the end sentinel is index N + 1 with a null heading', () => {
    const { sentinel } = mount(SEVEN);
    act(() => vi.advanceTimersByTime(MIN_DWELL_MS));
    see(sentinel);
    expect(calls()).toEqual([
      { section_index: 8, section_total: 7, heading: null, article_slug: 'best-ballrooms' },
    ]);
  });

  it('a body with no headings fires only the sentinel, index 1, section_total 0', () => {
    const { hs, sentinel } = mount([]);
    expect(hs).toHaveLength(0);
    act(() => vi.advanceTimersByTime(MIN_DWELL_MS));
    see(sentinel);
    expect(calls()).toEqual([
      { section_index: 1, section_total: 0, heading: null, article_slug: 'best-ballrooms' },
    ]);
  });

  it('ignores headings nested in embeds (the ang pow table)', () => {
    const { container } = mount(['Only']);
    const nested = container.querySelector('.angpow-table h3')!;
    expect(observers[0].observed.has(nested)).toBe(false);
    expect(observers[0].observed.size).toBe(2); // one heading + the sentinel
  });

  it('observes at most 60 headings plus the sentinel', () => {
    const many = Array.from({ length: 75 }, (_, i) => `H${i + 1}`);
    const { hs, sentinel } = mount(many);
    expect(hs).toHaveLength(75);
    expect(observers[0].observed.size).toBe(61);
    expect(observers[0].observed.has(hs[59])).toBe(true);
    expect(observers[0].observed.has(hs[60])).toBe(false);
    act(() => vi.advanceTimersByTime(MIN_DWELL_MS));
    see(...hs, sentinel);
    expect(track).toHaveBeenCalledTimes(61);
    expect(calls()[0].section_total).toBe(60);
    expect(calls()[60]).toMatchObject({ section_index: 61, heading: null });
  });

  it('trims and caps heading text at 80 characters', () => {
    const { hs } = mount([`  Spaced   out\n ${'y'.repeat(100)}  `]);
    act(() => vi.advanceTimersByTime(MIN_DWELL_MS));
    see(hs[0]);
    const heading = calls()[0].heading as string;
    expect(heading.startsWith('Spaced out y')).toBe(true);
    expect(heading).toHaveLength(80);
  });

  it('is StrictMode-safe: one event per section', () => {
    const { hs } = mount(SEVEN, true);
    act(() => vi.advanceTimersByTime(MIN_DWELL_MS));
    see(hs[0]);
    see(hs[0]);
    expect(track).toHaveBeenCalledTimes(1);
  });

  it('a reused instance that moves to another article (slug A to B) fires the new sections afresh', () => {
    const tree = (slug: string, headings: string[]) => (
      <ArticleSectionTracker articleSlug={slug}>
        <Body headings={headings} />
      </ArticleSectionTracker>
    );
    const { container, rerender } = render(tree('article-a', ['A1', 'A2']));
    const q = () =>
      Array.from(
        container.querySelectorAll('.inspire-prose > div > h2, .inspire-prose > div > h3'),
      );
    act(() => vi.advanceTimersByTime(MIN_DWELL_MS));
    see(q()[0], q()[1]);
    expect(calls().map((c) => [c.article_slug, c.section_index])).toEqual([
      ['article-a', 1],
      ['article-a', 2],
    ]);

    // Same component instance (no key), new article: indices 1 and 2 again.
    rerender(tree('article-b', ['B1', 'B2']));
    act(() => vi.advanceTimersByTime(MIN_DWELL_MS));
    see(q()[0], q()[1]);
    expect(calls().map((c) => [c.article_slug, c.section_index, c.heading])).toEqual([
      ['article-a', 1, 'A1'],
      ['article-a', 2, 'A2'],
      ['article-b', 1, 'B1'],
      ['article-b', 2, 'B2'],
    ]);
  });

  it('a tracking failure never breaks the page', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    track.mockImplementationOnce(() => {
      throw new Error('quota');
    });
    const { hs } = mount(SEVEN);
    act(() => vi.advanceTimersByTime(MIN_DWELL_MS));
    expect(() => see(hs[0])).not.toThrow();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
