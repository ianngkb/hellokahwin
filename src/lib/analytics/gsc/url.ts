/**
 * Mapping Google Search Console page URLs back to HelloKahwin's own rows.
 * Ported from The Wedding Notebook's `src/lib/gsc/url.ts`, re-cut for
 * HelloKahwin's routes.
 *
 * Search Console reports raw URLs as Google saw them: mixed case, query
 * strings, legacy paths that now 301 elsewhere, both the apex and www hosts.
 * Rather than `regexp_replace` inside every aggregation, each URL is normalised
 * + classified ONCE at ingest and the resolved `article_id` stored on
 * `gsc_pages`. Everything here is pure and synchronous.
 */

/** Hosts that belong to us. Anything else means the property is misconfigured. */
const OWN_HOSTS = new Set(['hellokahwin.com', 'www.hellokahwin.com']);

export type GscEntityType = 'home' | 'article' | 'category' | 'tag' | 'author' | 'static' | 'other';

export interface GscPathClassification {
  entityType: GscEntityType;
  /** Terminal slug used to join to `articles.slug`. */
  slug: string | null;
  /** The category segment as it appeared in the URL. Reporting only, never a join key. */
  categorySlug: string | null;
}

/** Single-segment public pages that are not legacy article slugs. */
const STATIC_PATHS = new Set(['/artikel', '/cari', '/brand', '/draft']);

/**
 * Reduce a raw GSC URL to a canonical path, or `null` for a URL on a host we
 * do not own (or one that does not parse).
 */
export function normalizeGscUrl(rawUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!OWN_HOSTS.has(parsed.hostname.toLowerCase())) return null;

  // The query string is dropped: no indexable HelloKahwin route depends on one
  // (paginated and filtered listings canonicalise to the bare path).
  let path = parsed.pathname;
  // GSC percent-encodes non-ASCII slugs; decode so they match the DB.
  try {
    path = decodeURIComponent(path);
  } catch {
    /* keep the encoded form */
  }
  path = path.toLowerCase();
  if (path.length > 1 && path.endsWith('/')) path = path.replace(/\/+$/, '');
  path = path.replace(/\/{2,}/g, '/');
  return path === '' ? '/' : path;
}

/**
 * Classify a normalised path into an entity type + join key.
 *
 * `/artikel/{category}/{slug}` keys on the SLUG alone: `articles.slug` is
 * unique and stable, the category is neither (articles get recategorised), so
 * old- and new-category URLs resolve to the same article and its Google
 * history is summed across the move instead of split in half.
 *
 * Order matters: `/artikel/tag/{slug}` and `/artikel/author/{slug}` have the
 * article shape and must be caught first.
 *
 * A single-segment `/{slug}` is the WordPress-era post URL, which the
 * `(public)/[slug]` route still 301s to the article — attributed to the
 * article so its pre-migration Google history stays with it.
 */
export function classifyGscPath(path: string): GscPathClassification {
  const none: GscPathClassification = { entityType: 'other', slug: null, categorySlug: null };
  if (path === '/') return { ...none, entityType: 'home' };
  if (STATIC_PATHS.has(path)) return { ...none, entityType: 'static' };

  const segments = path.split('/').filter(Boolean);

  if (segments[0] === 'artikel') {
    if (segments[1] === 'tag' && segments.length === 3) {
      return { entityType: 'tag', slug: segments[2], categorySlug: null };
    }
    if (segments[1] === 'author' && segments.length === 3) {
      return { entityType: 'author', slug: segments[2], categorySlug: null };
    }
    if (segments.length === 3) {
      return { entityType: 'article', slug: segments[2], categorySlug: segments[1] };
    }
    if (segments.length === 2) {
      return { entityType: 'category', slug: segments[1], categorySlug: segments[1] };
    }
    return none;
  }

  if (segments.length === 1) {
    return { entityType: 'article', slug: segments[0], categorySlug: null };
  }
  return none;
}

/** Convenience: normalise then classify. */
export function parseGscUrl(
  rawUrl: string,
): { path: string; classification: GscPathClassification } | null {
  const path = normalizeGscUrl(rawUrl);
  if (path === null) return null;
  return { path, classification: classifyGscPath(path) };
}
