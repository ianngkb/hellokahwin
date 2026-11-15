/**
 * The two Series-box events (R17).
 *
 * Deliberately NOT a client module: the names and prop shapes are read by the
 * client tracker that sends them AND by the admin analytics read that counts
 * them, so one file holds both ends of the contract. If these two sides ever
 * disagreed about a name or a prop key, the box would still look fine and the
 * admin panel would silently report zero.
 *
 * Both events travel the existing path — `track()` → the 5s queue →
 * `/api/v1/analytics/collect` → `analytics_events`. There is no event
 * allowlist to extend: the collector accepts any name and stores `props` as
 * JSONB, which is why props must stay SCALAR (its zod schema rejects nested
 * objects).
 *
 * `article_id` / `to_article_id` are ids, never slugs: a retitle or a category
 * move changes an article's URL, and a report keyed on slugs would split one
 * article's history in two.
 */

/** Fired once per page view, when the box first enters the viewport. */
export const SERIES_BOX_VIEWED_EVENT = 'Series Box Viewed';

/** Fired on a row click, before the browser navigates. */
export const SERIES_LINK_CLICKED_EVENT = 'Series Link Clicked';

/**
 * `Series Box Viewed` props.
 *
 * A `type`, not an `interface`, on purpose: only a type alias gets TypeScript's
 * implicit index signature, which is what lets it be passed to `trackSafely`'s
 * `TrackProps` without a cast.
 */
export type SeriesBoxViewedProps = {
  /** The cluster whose box is on screen (the cluster's `inspire_categories.id`). */
  cluster_id: string;
  /** The article the reader is on. */
  article_id: string;
  /** How many rows the box offered — the denominator for a row-level CTR. */
  sibling_count: number;
};

/** `Series Link Clicked` props. */
export type SeriesLinkClickedProps = {
  cluster_id: string;
  /** The article the reader clicked FROM. */
  article_id: string;
  /** The article the reader clicked TO. */
  to_article_id: string;
  /** 1-based row position, so "which rows get used" is answerable. */
  position: number;
};

export function seriesBoxViewedProps(
  clusterId: string,
  articleId: string,
  siblingCount: number,
): SeriesBoxViewedProps {
  return { cluster_id: clusterId, article_id: articleId, sibling_count: siblingCount };
}

export function seriesLinkClickedProps(
  clusterId: string,
  articleId: string,
  toArticleId: string,
  position: number,
): SeriesLinkClickedProps {
  return {
    cluster_id: clusterId,
    article_id: articleId,
    to_article_id: toArticleId,
    position,
  };
}
