/**
 * Pattern-based redirect rules — pure function, no DB, safe anywhere
 * (middleware, route handlers, pages).
 *
 * These cover the legacy WordPress URL shapes of hellokahwin.com so old
 * Google-indexed URLs keep resolving after the cutover to this app. Exact
 * per-article redirects (slug changes) live in the `redirects` table; this
 * file only handles structural WP cruft.
 */

export interface PatternRedirect {
  destinationPath: string;
  statusCode: 301 | 302;
}

/** Strip repeated slashes and a trailing slash (keep bare `/`). */
export function normalizePathname(pathname: string): string {
  const collapsed = pathname.replace(/\/{2,}/g, '/');
  if (collapsed.length > 1 && collapsed.endsWith('/')) return collapsed.slice(0, -1);
  return collapsed;
}

export function getPatternRedirect(rawPathname: string): PatternRedirect | null {
  const pathname = normalizePathname(rawPathname);

  // WP pagination (/page/N suffix) — strip FIRST and re-match, so
  // /category/x/page/2 resolves through the category rule below rather than
  // the category regex swallowing "2" as the slug.
  const pageMatch = pathname.match(/^(.*)\/page\/\d+$/);
  if (pageMatch) {
    const stripped = pageMatch[1] || '/';
    return getPatternRedirect(stripped) ?? { destinationPath: stripped, statusCode: 301 };
  }

  // WP category archive → our category page. WP used /category/{slug}
  // (optionally nested /category/{parent}/{child} — take the last segment).
  const categoryMatch = pathname.match(/^\/category\/(?:[^/]+\/)*([^/]+)$/);
  if (categoryMatch) {
    return { destinationPath: `/artikel/${categoryMatch[1]}`, statusCode: 301 };
  }

  // WP tag archive → our tag page.
  const tagMatch = pathname.match(/^\/tag\/([^/]+)$/);
  if (tagMatch) {
    return { destinationPath: `/artikel/tag/${tagMatch[1]}`, statusCode: 301 };
  }

  // WP author archive → article directory (per-author WP archives don't map).
  if (/^\/author\/[^/]+$/.test(pathname)) {
    return { destinationPath: '/artikel', statusCode: 301 };
  }

  // Feeds — site-wide or per-post — have no equivalent; send to the source page.
  if (pathname === '/feed' || pathname === '/comments/feed') {
    return { destinationPath: '/', statusCode: 301 };
  }
  const postFeedMatch = pathname.match(/^\/([^/]+)\/feed$/);
  if (postFeedMatch) {
    return { destinationPath: `/${postFeedMatch[1]}`, statusCode: 301 };
  }

  // WP attachment pages under a post → the post itself.
  const attachmentMatch = pathname.match(/^\/([^/]+)\/attachment\/.+$/);
  if (attachmentMatch) {
    return { destinationPath: `/${attachmentMatch[1]}`, statusCode: 301 };
  }

  // WP date archives (/2026/01, /2026/01/15) → article directory.
  if (/^\/\d{4}(\/\d{2}){0,2}$/.test(pathname)) {
    return { destinationPath: '/artikel', statusCode: 301 };
  }

  return null;
}
