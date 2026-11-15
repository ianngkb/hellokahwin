'use client';

import { useEffect, useRef } from 'react';
import { SEEN_ROOT_MARGIN, trackSafely } from '@/lib/analytics/use-track-once-visible';
import {
  MAX_TRACKED_SECTIONS,
  SECTION_HEADING_SELECTOR,
  SECTION_REACHED_EVENT,
  normaliseSectionHeading,
} from '@/lib/analytics/section-tracking';

/**
 * How long the page must have been open before any section counts. Sightings
 * before this are buffered and sent only if the reader is still here at 3 s,
 * so a bounce on a short article (whose end is visible at load) records
 * nothing instead of "read to the end" — the scroll tracker's dwell rule,
 * scaled for a per-section event.
 */
export const MIN_DWELL_MS = 3_000;

/**
 * Records WHERE in an article readers stop: fires a `section_reached` event
 * the first time each body section comes into view, once per page load.
 *
 * Event shape (`analytics_events.event_name = 'section_reached'`, flat props):
 *
 *   {
 *     section_index: number,   // 1..N = the Nth body heading; N + 1 = end of article
 *     section_total: number,   // N, the article's heading count (capped at 60)
 *     heading: string | null,  // heading text, whitespace-collapsed, ≤ 80 chars;
 *                              // '' for an empty heading; null for the end sentinel
 *     article_slug: string,
 *   }
 *
 * `pathname`, `session_id`, device fields and (server-side) the bot flag are
 * filled by `track()` like every other event; it also drops framed/preview
 * renders. The collect route and the table schema are unchanged — this is how
 * `scroll_depth` lands too. Read back by `getArticleSectionDropOff`
 * (`@/lib/analytics/article-sections`).
 *
 * Sections are the article's own `h2`/`h3` headings, found in the rendered body
 * by `SECTION_HEADING_SELECTOR` (direct children of the renderer's HTML parts,
 * so embeds and the "Related articles" heading are excluded). The rendered
 * headings carry no ids (the sanitiser strips them), so a section's identity is
 * its position; an edit that adds or removes a heading shifts the indices,
 * which the admin panel states rather than hides (`headingsChanged`).
 *
 * "Seen" uses the shared `SEEN_ROOT_MARGIN` (entered the top three-quarters of
 * the screen), so a tall section or a heading merely peeking at the bottom
 * edge behaves as on the listing pages. At most `MAX_TRACKED_SECTIONS` headings
 * plus the sentinel are observed: never more than 61 rows per read.
 *
 * A wrapper like `ArticleClickTracker`: it receives the real body DOM as
 * children and renders a 1 px end-of-article sentinel after it.
 */
export function ArticleSectionTracker({
  articleSlug,
  children,
}: {
  articleSlug: string;
  children: React.ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Sections already reported this page load. A ref (never state) so firing
  // never re-renders, and it survives StrictMode's double effect.
  const firedRef = useRef<Set<number>>(new Set());
  // The article `firedRef` belongs to. A client navigation can reuse this
  // instance for another article (slug A → B); A's indices must not suppress
  // B's. Reset only on a real slug change, never on StrictMode's re-run.
  const firedForRef = useRef<string>(articleSlug);

  useEffect(() => {
    if (firedForRef.current !== articleSlug) {
      firedForRef.current = articleSlug;
      firedRef.current = new Set();
    }
    const root = rootRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || !articleSlug) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const headings = Array.from(root.querySelectorAll<HTMLElement>(SECTION_HEADING_SELECTOR)).slice(
      0,
      MAX_TRACKED_SECTIONS,
    );
    const total = headings.length;
    const indexOf = new Map<Element, number>();
    headings.forEach((h, i) => indexOf.set(h, i + 1));
    indexOf.set(sentinel, total + 1);

    const fired = firedRef.current;
    const pending = new Set<number>();
    let dwellDone = false;

    function send(index: number) {
      if (fired.has(index)) return;
      fired.add(index);
      const heading =
        index <= total ? normaliseSectionHeading(headings[index - 1].textContent) : null;
      trackSafely(SECTION_REACHED_EVENT, {
        section_index: index,
        section_total: total,
        heading,
        article_slug: articleSlug,
      });
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const seen = entries
          .filter((e) => e.isIntersecting)
          .map((e) => indexOf.get(e.target))
          .filter((i): i is number => i !== undefined && !fired.has(i))
          .sort((a, b) => a - b);
        for (const index of seen) {
          observer.unobserve(index === total + 1 ? sentinel : headings[index - 1]);
          if (dwellDone) send(index);
          else pending.add(index);
        }
      },
      { rootMargin: SEEN_ROOT_MARGIN, threshold: 0 },
    );
    for (const h of headings) if (!fired.has(indexOf.get(h)!)) observer.observe(h);
    if (!fired.has(total + 1)) observer.observe(sentinel);

    const dwellTimer = setTimeout(() => {
      dwellDone = true;
      for (const index of [...pending].sort((a, b) => a - b)) send(index);
      pending.clear();
    }, MIN_DWELL_MS);

    return () => {
      clearTimeout(dwellTimer);
      observer.disconnect();
    };
  }, [articleSlug]);

  return (
    <div ref={rootRef}>
      {children}
      <div ref={sentinelRef} data-article-end="" aria-hidden="true" className="h-px" />
    </div>
  );
}
