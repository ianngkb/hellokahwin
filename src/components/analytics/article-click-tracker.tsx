'use client';

import { useCallback } from 'react';
import { track } from '@/lib/analytics/tracker';
import { ARTICLE_LINK_CLICK_EVENT, linkClickProps } from '@/lib/analytics/link-click-tracking';

/**
 * Wraps the article body and records an `article_link_click` event for any
 * link clicked inside it (ported from The Wedding Notebook's
 * ArticleClickTracker). One delegated `onClick` on the wrapper — clicks on
 * links rendered through `dangerouslySetInnerHTML` bubble to it. Never calls
 * `preventDefault`, so navigation is unaffected; `track()` only queues the
 * event, and the tracker's `visibilitychange` flush beacons it if the click
 * leaves the page.
 *
 * Goes through the shared `track()` (not TWN's separate beacon endpoint), so
 * it inherits the tracker's framed/preview guards and the collector's bot
 * flagging and no-PII hashing.
 */
export function ArticleClickTracker({
  articleId,
  children,
}: {
  articleId: string;
  children: React.ReactNode;
}) {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const anchor = (e.target as HTMLElement | null)?.closest?.('a');
      if (!anchor) return;
      try {
        const props = linkClickProps(anchor.href, window.location);
        if (props) track(ARTICLE_LINK_CLICK_EVENT, { ...props, article_id: articleId });
      } catch {
        // best-effort; never block navigation
      }
    },
    [articleId],
  );

  return <div onClick={handleClick}>{children}</div>;
}
