import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { sql, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';

/**
 * Every real pathname an article has been seen under, so the per-article
 * `analytics_events` getters can match rows with `pathname = ANY(…)` — an index
 * probe on `idx_analytics_events_pathname_created` — instead of
 * `split_part(pathname, '/', 4) = slug`, which no index serves.
 *
 * Ported from The Wedding Notebook. TWN reads closed days from a rollup table;
 * HelloKahwin has no rollups (the site-analytics dashboard reads the raw table
 * too), so the discovery half here is a single raw read, and the union is:
 *   1. the canonical `/artikel/{primary category}/{slug}`;
 *   2. every `/artikel/{from|to category}/{slug}` in `article_category_redirects`
 *      (an article that moved category is reachable under both);
 *   3. every HUMAN path recorded in the last DISCOVERY_WINDOW_DAYS whose 4th
 *      `/`-segment is the slug (old trailing-slash URLs and the like), capped
 *      at MAX_SEEN_PATHS_PER_SLUG per slug, most-visited first.
 * Each path is also added in its trailing-slash twin, then de-duplicated. One
 * statement for the whole slug list, never one per slug.
 */

const CACHE_TAG = 'article-analytics';
const CACHE_OPTS = { tags: [CACHE_TAG], revalidate: 600 };

/** The URL prefix every article lives under on the public site. */
export const ARTICLE_PATH_PREFIX = '/artikel/';

/** Most-visited discovered paths kept per slug, before slash twins. */
export const MAX_SEEN_PATHS_PER_SLUG = 50;

/** How far back path discovery looks: the detail getters' own 365-day floor + 1. */
export const DISCOVERY_WINDOW_DAYS = 366;

/**
 * `a, b, c` of individually-bound scalars, for use inside `IN (…)` — one bind
 * parameter per element, so only for short, caller-bounded lists. Callers must
 * short-circuit an empty list: `IN ()` is a syntax error. Never bind a JS array
 * directly: postgres-js serialises it as a malformed array literal (`22P02`).
 */
export function slugInList(values: readonly string[]): SQL {
  return sql.join(
    values.map((s) => sql`${s}`),
    sql`, `,
  );
}

/**
 * ONE bound parameter carrying a whole text list, for `col = ANY(${…})`: a JSON
 * array sent as text and unpacked server-side. The `::text` before `::jsonb`
 * stops postgres-js JSON-encoding the string a second time.
 */
export function textArrayParam(values: readonly string[]): SQL {
  return sql`ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(values)}::text::jsonb))`;
}

/** The path and its trailing-slash twin (`/a/b` ⇄ `/a/b/`). */
export function withSlashVariants(path: string): string[] {
  const bare = path.replace(/\/+$/, '');
  if (!bare) return [];
  return [bare, `${bare}/`];
}

/** Unique, non-empty slugs in a stable order (also the cache key). */
function normaliseSlugs(slugs: readonly string[]): string[] {
  return [...new Set(slugs.map((s) => s.trim()).filter(Boolean))].sort();
}

async function resolveArticlePathsUncached(
  slugs: readonly string[],
): Promise<Map<string, string[]>> {
  const wanted = normaliseSlugs(slugs);
  const out = new Map<string, string[]>();
  if (wanted.length === 0) return out;

  const list = slugInList(wanted);
  const [known, seen] = await Promise.all([
    // Canonical + category-redirect history: tiny indexed lookups.
    db.execute<{ slug: string; category_slug: string | null }>(sql`
      SELECT a.slug AS slug, c.slug AS category_slug
      FROM articles a
      JOIN inspire_categories c ON c.id = a.primary_category_id
      WHERE a.slug IN (${list})
      UNION
      SELECT a.slug AS slug, r.from_category_slug AS category_slug
      FROM article_category_redirects r
      JOIN articles a ON a.id = r.article_id
      WHERE a.slug IN (${list})
      UNION
      SELECT a.slug AS slug, r.to_category_slug AS category_slug
      FROM article_category_redirects r
      JOIN articles a ON a.id = r.article_id
      WHERE a.slug IN (${list})
    `),
    // Every human path recorded for these slugs, most visited first, capped.
    db.execute<{ slug: string; path: string }>(sql`
      WITH seen AS (
        SELECT split_part(pathname, '/', 4) AS slug, pathname AS path, COUNT(*)::bigint AS hits
        FROM analytics_events
        WHERE is_bot = FALSE
          AND created_at >= NOW() - (${DISCOVERY_WINDOW_DAYS}::int * INTERVAL '1 day')
          AND pathname LIKE '/artikel/%'
          AND split_part(pathname, '/', 4) IN (${list})
        GROUP BY 1, 2
      ),
      ranked AS (
        SELECT slug, path, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY hits DESC, path) AS rn
        FROM seen
      )
      SELECT slug, path FROM ranked WHERE rn <= ${MAX_SEEN_PATHS_PER_SLUG}
    `),
  ]);

  const sets = new Map<string, Set<string>>(wanted.map((s) => [s, new Set<string>()]));
  const add = (slug: string, path: string) => {
    const set = sets.get(slug);
    if (!set) return;
    for (const p of withSlashVariants(path)) set.add(p);
  };
  for (const r of known) {
    if (r.category_slug) add(r.slug, `${ARTICLE_PATH_PREFIX}${r.category_slug}/${r.slug}`);
  }
  for (const r of seen) {
    if (r.path) add(r.slug, r.path);
  }

  for (const [slug, set] of sets) out.set(slug, [...set].sort());
  return out;
}

// `unstable_cache` cannot store a Map, so cache entries and rebuild. Keyed on
// the sorted, de-duplicated slug list.
const resolveArticlePathEntries = unstable_cache(
  async (slugs: readonly string[]) =>
    Array.from((await resolveArticlePathsUncached(slugs)).entries()),
  ['article-analytics:resolve-paths'],
  CACHE_OPTS,
);

// Per-request de-dupe: the per-article page runs several panels that each need
// the same article's paths. `cache()` keys on argument identity, so key on a
// string, not on the (fresh-every-call) array.
const resolveByKey = cache(async (key: string): Promise<Map<string, string[]>> => {
  const slugs = JSON.parse(key) as string[];
  return new Map(await resolveArticlePathEntries(slugs));
});

/**
 * Per slug, every pathname the article has been seen under (see the header).
 * A slug with no article row and no recorded traffic maps to `[]`. An empty
 * slug list returns an empty map without querying.
 */
export async function resolveArticlePaths(
  slugs: readonly string[],
): Promise<Map<string, string[]>> {
  const key = normaliseSlugs(slugs);
  if (key.length === 0) return new Map();
  return resolveByKey(JSON.stringify(key));
}

export { resolveArticlePathsUncached };
