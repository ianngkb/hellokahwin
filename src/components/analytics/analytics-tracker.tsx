'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { init, trackPageview, type UtmParams } from '@/lib/analytics/tracker';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

/**
 * AnalyticsTracker — sibling-mounted in the `(public)` layout (NOT a children
 * wrapper) so the page tree doesn't sit inside its Suspense boundary.
 *
 * Renders nothing. Initialises the tracker on mount and fires a pageview on
 * every App Router pathname change. Captures UTM parameters once, from the
 * landing URL.
 *
 * Why sibling-not-wrapper: Next.js streams HTML once any descendant of a
 * Suspense boundary begins rendering. Once HTML flushes, the response status
 * code is locked at 200 and `notFound()` from a page can no longer set 404 —
 * Google then reads the not-found UI as a Soft 404. Keeping this hook-using
 * client component as a sibling of `{children}` means the Suspense boundary
 * applies only to itself, so pages can `notFound()` and still produce real
 * HTTP 404 responses.
 *
 * `/draft/<token>` lives in the `(public)` group but is an editor's preview of
 * unpublished work, not a visit, so it is never tracked.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const utmCapturedRef = useRef(false);
  const lastTrackedPathRef = useRef<string | null>(null);

  // Initialise tracker once on mount
  useEffect(() => {
    init();
  }, []);

  // Track pageview on every pathname change (ref guard prevents StrictMode double-fire)
  useEffect(() => {
    if (!pathname || lastTrackedPathRef.current === pathname) return;
    // Recorded BEFORE the draft guard, so A → /draft/x → A still counts the
    // return to A as a new pageview.
    lastTrackedPathRef.current = pathname;
    if (pathname.startsWith('/draft/')) return;

    let utmParams: UtmParams | undefined;

    // Only capture UTMs on the first load
    if (!utmCapturedRef.current) {
      utmCapturedRef.current = true;
      // Any UTM key counts — a link tagged only with utm_medium/utm_campaign
      // must not lose its tags.
      for (const key of UTM_KEYS) {
        const value = searchParams?.get(key);
        if (value) (utmParams ??= {})[key] = value;
      }
    }

    trackPageview(pathname, undefined, utmParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
