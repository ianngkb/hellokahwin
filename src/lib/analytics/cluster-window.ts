/**
 * The cluster analytics page's time window (R16): `?window=30|90|365`, default
 * 90. Its own module, with no server imports, so the client dashboard can share
 * the labels and the server page can parse the URL with the same list.
 */

export const CLUSTER_WINDOWS = [30, 90, 365] as const;
export type ClusterWindow = (typeof CLUSTER_WINDOWS)[number];

export const DEFAULT_CLUSTER_WINDOW: ClusterWindow = 90;

/** Human preset names (D2) — never a date-format string. */
export const CLUSTER_WINDOW_LABELS: Record<ClusterWindow, string> = {
  30: 'Last 30 days',
  90: 'Last 90 days',
  365: 'Last 12 months',
};

/**
 * `?window=` → a supported window: exactly `30`, `90` or `365`. Anything else
 * — missing, repeated (`?window=30&window=365` is ambiguous, so neither wins),
 * `7`, `90abc`, ` 30 ` with whitespace, `030` — falls back to the 90-day
 * default rather than erroring, so a hand-edited link still renders.
 */
export function parseClusterWindow(raw: string | string[] | undefined | null): ClusterWindow {
  if (typeof raw !== 'string') return DEFAULT_CLUSTER_WINDOW;
  const match = CLUSTER_WINDOWS.find((w) => String(w) === raw);
  return match ?? DEFAULT_CLUSTER_WINDOW;
}

/**
 * ⚠ SHIP-TIME CONSTANTS (HelloKahwin): the KL day the trackers reach production.
 *
 * In-body link clicks (`article_link_click` events, from ArticleClickTracker)
 * are recorded from this KL day; the click matrix says so.
 */
export const LINK_CLICKS_SINCE = '2026-11-16';

/**
 * The Series-box events (`Series Box Viewed`, `Series Link Clicked`) are
 * recorded from this KL day — the day the box shipped. Before it there is no
 * history at all, so the panel says so rather than letting an admin read an
 * empty 12-month window as "nobody clicks it".
 */
export const SERIES_BOX_SINCE = '2026-11-16';
