/**
 * Read-depth (`scroll_depth`) is recorded from this KL day: the scroll tracker
 * (`ArticleScrollTracker`) ships with the article-analytics release, while page
 * views go back to 30 Oct 2026. The read-depth panels say so, so nobody
 * compares a weeks-old funnel with all-time views.
 *
 * ⚠ SHIP-TIME CONSTANT: set this to the KL day the release reaches production
 * if that is not this date. A value earlier than the deploy only makes the
 * panels claim coverage for a few empty days; it never miscounts.
 *
 * Its own module (no `server-only`) so client dashboards can import it;
 * `@/lib/analytics/article-views` re-exports it for server callers.
 */
export const SCROLL_TRACKING_SINCE = '2026-11-16';
