/**
 * The search contract shared by the engine (src/lib/search/article-search.ts,
 * GET /api/v1/search, the /cari page) and the search UI (header trigger,
 * search screen, the /artikel box). Both sides build against these types;
 * change them only together.
 *
 * Rules come from DES-06 (docs on origin/main:
 * docs/work-done/aug-28-2026-session-01/aug-28-2026-done-des-06-search-and-catalogue.md).
 */

/** One article in a result list. Dates are ISO strings; `thumbnailUrl` may be null. */
export interface SearchResultArticle {
  id: string;
  title: string;
  slug: string;
  /** The article's URL path, e.g. `/artikel/hantaran-mas-kahwin/hantaran-kahwin-bajet`. */
  href: string;
  categorySlug: string;
  categoryName: string;
  excerpt: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
}

/**
 * How the results were found:
 * - `exact`: every query word (or its English→Malay synonym) matched.
 * - `approximate`: a ranked partial match; the UI labels it "Padanan hampir".
 * - `none`: nothing matched; `suggestion` may still be set.
 */
export type SearchMode = 'exact' | 'approximate' | 'none';

export interface SearchResponse {
  query: string;
  articles: SearchResultArticle[];
  /** Total matches for this query and mode, before paging. */
  total: number;
  mode: SearchMode;
  /** A spelling correction for the whole query ("Mungkin maksud anda: …"), or null. */
  suggestion: string | null;
}

/**
 * GET /api/v1/search?q=<text>&limit=<1..20, default 6>&offset=<0..>
 *  - 200 → `{ data: SearchResponse }`. A query under 2 characters returns
 *    mode 'none', total 0.
 *  - 5xx → the search FAILED. The UI must say so ("Carian gagal") and must not
 *    show "Tiada hasil" — a failed request is not an empty result (DES-06 F1).
 */
export const SEARCH_API_PATH = '/api/v1/search';

/** The results page. Server-rendered; `q` and 1-based `page` in the query string. */
export const SEARCH_PAGE_PATH = '/cari';
export const SEARCH_PAGE_SIZE = 20;

export function searchPageHref(query: string, page = 1): string {
  const params = new URLSearchParams({ q: query });
  if (page > 1) params.set('page', String(page));
  return `${SEARCH_PAGE_PATH}?${params.toString()}`;
}

/**
 * Topics offered before typing and on no-results. Each is a real query that
 * returns articles today (hantaran is 38 of ~100 articles).
 */
export const POPULAR_SEARCHES: readonly string[] = [
  'hantaran',
  'mas kahwin',
  'nikah',
  'doa pengantin',
  'walimatul urus',
  'tunang',
  'pelamin',
  'baju pengantin',
];
