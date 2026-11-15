/**
 * In-article link clicks, recorded as ordinary `analytics_events` rows.
 *
 * The Wedding Notebook beacons each click to its own endpoint and keeps a
 * daily `article_link_clicks` table. HelloKahwin reuses its one first-party
 * pipeline instead: `ArticleClickTracker` calls `track()` with this event name,
 * so the click lands on the article's own `pathname`, gets the same session,
 * bot flag and privacy treatment as every other event, and needs no new table
 * or endpoint. Read back by the cluster analytics click matrix and the
 * per-article events panel.
 *
 * No `server-only`: the public tracker and the server getters share it.
 */
export const ARTICLE_LINK_CLICK_EVENT = 'article_link_click';

export type LinkType = 'internal_article' | 'internal' | 'external';

/** Longest href we keep (the collector clips prop strings at 1,000 anyway). */
export const MAX_HREF_CHARS = 500;

/**
 * What to record for a clicked anchor, or null when it is not a real link
 * click (mailto:, tel:, javascript:, an in-page `#` jump on the same page).
 *
 * Same-origin links are stored as path + query (host-independent, so it reads
 * the same on localhost, a preview and production); anything else as the
 * absolute URL with its query string DROPPED — an outbound URL can carry a
 * reader's own tokens, and only where they went matters.
 */
export function linkClickProps(
  rawHref: string,
  location: { origin: string; pathname: string; search: string },
): { href: string; link_type: LinkType } | null {
  if (!/^https?:/i.test(rawHref)) return null;
  let url: URL;
  try {
    url = new URL(rawHref);
  } catch {
    return null;
  }
  if (url.origin === location.origin) {
    if (url.hash && url.pathname === location.pathname && url.search === location.search) {
      return null;
    }
    const href = (url.pathname + url.search).slice(0, MAX_HREF_CHARS);
    return {
      href,
      link_type: url.pathname.startsWith('/artikel/') ? 'internal_article' : 'internal',
    };
  }
  return { href: `${url.origin}${url.pathname}`.slice(0, MAX_HREF_CHARS), link_type: 'external' };
}
