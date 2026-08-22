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

  // Legacy sitemap URLs. All in One SEO served a sitemap index at
  // /sitemap.xml plus per-type children (/post-sitemap.xml, /page-sitemap.xml,
  // /category-sitemap.xml, /addl-sitemap.xml) and 302'd /sitemap_index.xml and
  // /wp-sitemap.xml to the index. All of those returned 200/302 on the live
  // site and are the URLs search engines already hold, so point every one of
  // them at the app's own sitemap. `/sitemap.xml` itself is excluded from the
  // middleware matcher, so it can never be caught by this rule.
  if (/^\/(?:[a-z0-9-]+-)?sitemap(?:_index)?\.(?:xml|rss)$/.test(pathname)) {
    return { destinationPath: '/sitemap.xml', statusCode: 301 };
  }

  // Feeds — site-wide or per-post — have no equivalent; send to the source page.
  // `/rss` is included because the live site 301s it rather than 404ing.
  if (pathname === '/feed' || pathname === '/comments/feed' || pathname === '/rss') {
    return { destinationPath: '/', statusCode: 301 };
  }

  // WordPress admin/login entry points. No WordPress here, but these are the
  // paths the team (and every bot on the internet) still hits, and the live
  // site 302s them rather than 404ing. Point them at this app's sign-in; Clerk
  // still gates everything behind it.
  if (pathname === '/wp-admin' || pathname === '/wp-login.php') {
    return { destinationPath: '/login', statusCode: 301 };
  }

  // WordPress' default sample page. It is still 200 on the live site and sits
  // in the page sitemap, so it is a real indexed URL — but there is no
  // equivalent here, and letting it 404 would turn an indexed 200 into a new
  // crawl error at cutover.
  if (pathname === '/sample-page') {
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
