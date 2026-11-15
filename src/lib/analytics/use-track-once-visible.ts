'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { track } from '@/lib/analytics/tracker';

/** Scalar props only — what `analytics_events.props` stores and the admin reports read. */
export type TrackProps = Record<string, string | number | boolean | null>;

/**
 * `track()`, fire-and-forget. Measuring must never break the thing being
 * measured: a brochure button whose handler throws inside `track()` (a corrupt
 * visitor cookie, a storage quota error) would become a dead button. Callers do
 * their real work FIRST and report after, through this.
 */
export function trackSafely(event: string, props: TrackProps): void {
  try {
    track(event, props);
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') console.warn('[track] failed', event, err);
  }
}

/**
 * "Seen" = some of the element has entered the TOP THREE-QUARTERS of the
 * screen. Expressed as a root margin rather than a visible-share threshold on
 * purpose: a share (say 25%) can never be reached by an element taller than
 * four screens — a long price list on a phone — so those venues would record
 * nothing. A margin works for any height, and it still ignores a section merely
 * peeking above the bottom edge at page load.
 */
export const SEEN_ROOT_MARGIN = '0px 0px -25% 0px';

/**
 * Fire `trackSafely(event, props)` ONCE, the first time the element is seen
 * (see {@link SEEN_ROOT_MARGIN}). Returns a CALLBACK REF — attach it to the
 * element. A callback ref (not a `useRef`) because the observer must start
 * whenever the element actually mounts, including after the first commit.
 *
 * Once per mount = once per page view: a listing page is a fresh mount on every
 * navigation. The `fired` guard also stops StrictMode's double effect counting
 * twice. `props: null` disables tracking.
 *
 * `resetKey` is for the case where a mount is NOT a page view: a client
 * navigation can hand this same instance a different subject (article A → B)
 * without unmounting it, and A's impression must not suppress B's. Pass the
 * subject's identity and the guard re-arms when it changes — the rule
 * `ArticleSectionTracker` already applies to its own `fired` set. Omitted, the
 * hook behaves exactly as it did before (the guard is never reset), so existing
 * callers are untouched.
 */
export function useTrackOnceVisible(
  event: string,
  props: TrackProps | null,
  resetKey?: string,
): (node: Element | null) => void {
  const [node, setNode] = useState<Element | null>(null);
  const fired = useRef(false);
  // What `fired` belongs to. Compared in the effect, never during render, so
  // StrictMode's double run cannot look like a change of subject.
  const firedFor = useRef(resetKey);
  // Read through a ref so a parent re-render passing a fresh-but-equal props
  // object never tears down and re-arms the observer.
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  }, [props]);
  const enabled = props !== null;

  useEffect(() => {
    if (firedFor.current !== resetKey) {
      firedFor.current = resetKey;
      fired.current = false;
    }
    if (!enabled || !node || fired.current) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (fired.current) return;
        if (entries.some((e) => e.isIntersecting)) {
          fired.current = true;
          observer.disconnect();
          if (propsRef.current) trackSafely(event, propsRef.current);
        }
      },
      { rootMargin: SEEN_ROOT_MARGIN, threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, event, enabled, resetKey]);

  return useCallback((el: Element | null) => setNode(el), []);
}
