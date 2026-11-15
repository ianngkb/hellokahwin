'use client';

import { useEffect, useRef } from 'react';
import { track } from '@/lib/analytics/tracker';

/**
 * Fires a `scroll_depth` analytics event as the reader passes each quarter of
 * the page (25 / 50 / 75 / 100%), once per milestone per page load.
 *
 * The buckets match `SCROLL_DEPTH_BUCKETS` in `@/lib/analytics/article-views`,
 * which reads them back for the single-article read-depth chart. The milestones
 * are deliberately coarse — a continuous scroll listener would flood the ingest
 * pipeline with one row per pixel; four fire-once events per reader are enough
 * to answer "how far do people get?" while staying cheap.
 *
 * Goes through the shared `track()` helper, which auto-fills the pathname,
 * session, device and (server-side) bot flag, guards framed/preview renders, and
 * is already initialised by <AnalyticsTracker> in the (public) layout. Renders nothing.
 */
export function ArticleScrollTracker() {
  // The set of milestones already fired this page load; a ref (not state) so
  // firing never re-renders.
  const firedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const BUCKETS = [25, 50, 75, 100];
    // How long a reader must stay on a page that needs no scrolling before it
    // counts as a full read. Long enough that a sub-second bounce records
    // nothing (so it lands in the 0%-reached band, per the analytics spec),
    // short enough that a genuine read is captured.
    const SHORT_PAGE_DWELL_MS = 10_000;
    let dwellTimer: ReturnType<typeof setTimeout> | undefined;

    function fire(bucket: number) {
      if (firedRef.current.has(bucket)) return;
      firedRef.current.add(bucket);
      track('scroll_depth', { percent: bucket });
    }

    // Current scroll depth as a %, or null when the page is not scrollable
    // (content fits the viewport) — recomputed each call so late-loading images
    // that grow the page are handled correctly.
    function currentDepth(): number | null {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return null;
      return Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100));
    }

    function onScroll() {
      const depth = currentDepth();
      if (depth === null) return;
      // A real scroll on a page that CAN scroll cancels the short-page dwell —
      // depth is now measured, not assumed.
      if (dwellTimer) {
        clearTimeout(dwellTimer);
        dwellTimer = undefined;
      }
      for (const bucket of BUCKETS) {
        if (depth >= bucket) fire(bucket);
      }
    }

    // A page that fits the viewport emits no scroll events, so nothing would
    // ever record. Credit a full read only after the reader has actually stayed
    // — never instantly on mount, which would count every bounce as 100%.
    if (currentDepth() === null) {
      dwellTimer = setTimeout(() => BUCKETS.forEach(fire), SHORT_PAGE_DWELL_MS);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (dwellTimer) clearTimeout(dwellTimer);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return null;
}
