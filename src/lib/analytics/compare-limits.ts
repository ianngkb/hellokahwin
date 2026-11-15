/**
 * The comparison page compares at most this many articles at once. Its own
 * module (no `server-only`) so the client picker and the URL parser share the
 * exact number the server getters enforce.
 */
export const MAX_COMPARE_ARTICLES = 6;

/** Sources kept by name per article on the comparison page; the rest are summed. */
export const SOURCES_PER_ARTICLE = 8;

/**
 * The row that sums every source past an article's top SOURCES_PER_ARTICLE, so
 * the panel's shares are of ALL that article's source visitors, not just the
 * eight shown. (A normalised referrer is a hostname and never contains a
 * space, so it cannot collide with this label.)
 */
export const OTHER_SOURCES_NAME = 'Other sources';

/** The refusal shown when a selection would pass the cap (picker and page share it). */
export function capMessage(max: number = MAX_COMPARE_ARTICLES): string {
  return `Compare up to ${max} articles at a time`;
}
