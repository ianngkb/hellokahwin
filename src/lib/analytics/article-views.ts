import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { sql, type SQL } from 'drizzle-orm';
import { subDays, format } from 'date-fns';
import { db } from '@/lib/db/drizzle';
import { getKLToday } from '@/lib/admin/date-range';
import {
  resolveArticlePaths,
  resolveArticlePathsUncached,
  slugInList,
  textArrayParam,
} from './article-paths';

/**
 * Per-article view analytics for /admin/inspire — the articles-table "Views"
 * column (all-time total + WoW/MoM trend) and the single-article analytics page.
 *
 * Ported from The Wedding Notebook. TWN serves closed days from a rollup table
 * and only "today" raw; HelloKahwin has no rollups, so every getter here reads
 * `analytics_events` directly — the same source /admin/site-analytics reads, so
 * an article's numbers here agree with Top Pages there.
 *
 * "Views" is the pageview EVENT count of human visitors (a refresh counts
 * again); "visitors"/"readers" count distinct `visitor_hash`es. The hash
 * rotates every KL day (src/lib/analytics/hash.ts), so somebody who returns on
 * three days counts three times over a multi-day range. The pages say so.
 *
 * MATCHING AN ARTICLE TO ITS ROWS. The catalogue-wide getters match by the
 * slug segment (`split_part(pathname,'/',4)`), so a category change (old and
 * new `/artikel/{cat}/{slug}` both live) still counts once per article. The
 * single-article detail getters match `pathname = ANY(<resolved paths>)` from
 * ./article-paths.ts — an index probe instead of a scan.
 *
 * DISCIPLINE. Every getter is cached 600s under the `article-analytics` tag and
 * called from inside `safePanel`, so a slow read degrades one panel to
 * "couldn't load" instead of failing the page.
 *
 * ⚠️ NEVER bind a JS array as `= ANY(${arr})` in a raw `sql` template — use
 * `textArrayParam` (one JSON-text parameter) or `slugInList` (an `IN` list).
 */

const CACHE_TAG = 'article-analytics';
const CACHE_OPTS = { tags: [CACHE_TAG], revalidate: 600 };

/** How far back the raw detail getters (events / scroll / sources / devices) look. */
export const detailWindowFloor = sql`created_at >= NOW() - INTERVAL '365 days'`;

/**
 * The partial-index predicate for human article pageviews. Repeat it VERBATIM
 * next to any pageview read so Postgres can use
 * `idx_analytics_events_artikel_pageview` (an index-only scan). It filters
 * nothing a slug/path match would keep — it is there for the planner.
 */
export const ARTIKEL_PATH_SCOPE = sql`pathname LIKE '/artikel/%'`;

/** The same predicate for an arbitrary column (a CTE alias, say). */
function articlePathMatch(col: SQL, slug: string): SQL {
  return sql`${col} LIKE '/artikel/%' AND split_part(${col}, '/', 4) = ${slug}`;
}

export { slugInList };

export { SCROLL_TRACKING_SINCE } from './scroll-tracking';

/** KL calendar day of an `analytics_events.created_at`. */
export const KL_DAY = sql`(created_at AT TIME ZONE 'Asia/Kuala_Lumpur')::date`;

/** The cached resolver, for the page's cached getters. */
async function pathsForCached(slug: string): Promise<string[]> {
  return (await resolveArticlePaths([slug])).get(slug) ?? [];
}

// ── Table metrics: all-time total + WoW/MoM current/prior, per slug ──────────

export interface ArticleViewMetrics {
  totalViews: number;
  /** Week-on-week: last 7 days incl. today vs the 7 days before that. */
  wow: { current: number; prior: number };
  /** Month-on-month: last 30 days incl. today vs the 30 days before that. */
  mom: { current: number; prior: number };
}

/**
 * All-time total views plus the four WoW/MoM window sums for each given slug,
 * in one pass. `slugs = null` means "every real article" (the view-column sort
 * needs every article's number before it can pick page 1) — NOT an empty list;
 * an empty list short-circuits before reaching here, because `IN ()` is a
 * syntax error. Only slugs with at least one view come back.
 */
async function queryArticleViewMetrics(
  slugs: readonly string[] | null,
): Promise<Map<string, ArticleViewMetrics>> {
  const dayAgo = (n: number) => format(subDays(getKLToday(), n), 'yyyy-MM-dd');
  // Windows INCLUDE today. Prior windows are the equal-length span immediately
  // before the current one, with no gap and no overlap.
  const wowFrom = dayAgo(6);
  const wowPriorFrom = dayAgo(13);
  const wowPriorTo = dayAgo(7);
  const momFrom = dayAgo(29);
  const momPriorFrom = dayAgo(59);
  const momPriorTo = dayAgo(30);

  const slugFilter = slugs
    ? sql`AND split_part(pathname, '/', 4) IN (${slugInList(slugs)})`
    : // Unscoped, scanner junk under /artikel/ would each become a map entry;
      // keep only real article slugs.
      sql`AND split_part(pathname, '/', 4) IN (SELECT slug FROM articles)`;

  const rows = await db.execute<{
    slug: string;
    total_views: number;
    wow_current: number;
    wow_prior: number;
    mom_current: number;
    mom_prior: number;
  }>(sql`
    WITH pv AS (
      SELECT split_part(pathname, '/', 4) AS slug, ${KL_DAY} AS day
      FROM analytics_events
      WHERE event_name = 'pageview'
        AND is_bot = FALSE
        AND ${ARTIKEL_PATH_SCOPE}
        ${slugFilter}
    )
    SELECT
      slug,
      COUNT(*)::int AS total_views,
      COUNT(*) FILTER (WHERE day >= ${wowFrom}::text::date)::int AS wow_current,
      COUNT(*) FILTER (WHERE day >= ${wowPriorFrom}::text::date AND day <= ${wowPriorTo}::text::date)::int AS wow_prior,
      COUNT(*) FILTER (WHERE day >= ${momFrom}::text::date)::int AS mom_current,
      COUNT(*) FILTER (WHERE day >= ${momPriorFrom}::text::date AND day <= ${momPriorTo}::text::date)::int AS mom_prior
    FROM pv
    GROUP BY slug
  `);

  const out = new Map<string, ArticleViewMetrics>();
  for (const r of rows) {
    out.set(r.slug, {
      totalViews: Number(r.total_views ?? 0),
      wow: { current: Number(r.wow_current ?? 0), prior: Number(r.wow_prior ?? 0) },
      mom: { current: Number(r.mom_current ?? 0), prior: Number(r.mom_prior ?? 0) },
    });
  }
  return out;
}

async function getArticleViewMetricsUncached(
  slugs: readonly string[],
): Promise<Map<string, ArticleViewMetrics>> {
  if (slugs.length === 0) return new Map();
  return queryArticleViewMetrics(slugs);
}

async function getAllArticleViewMetricsUncached(): Promise<Map<string, ArticleViewMetrics>> {
  return queryArticleViewMetrics(null);
}

// `unstable_cache` cannot store a `Map`, so cache a plain array of entries and
// rebuild the map on the way out. `cache()` (per-request) collapses the page's
// repeated reads; `unstable_cache` (cross-request, 600s) bounds how often the
// aggregation runs at all.
const getArticleViewMetricsEntries = unstable_cache(
  async (slugs: readonly string[]) =>
    Array.from((await getArticleViewMetricsUncached(slugs)).entries()),
  ['article-analytics:view-metrics'],
  CACHE_OPTS,
);

export const getArticleViewMetrics = cache(
  async (slugs: readonly string[]): Promise<Map<string, ArticleViewMetrics>> => {
    // Sorted key: the same slugs in a different order share one cache entry.
    const key = [...slugs].sort();
    return new Map(await getArticleViewMetricsEntries(key));
  },
);

const getAllArticleViewMetricsEntries = unstable_cache(
  async () => Array.from((await getAllArticleViewMetricsUncached()).entries()),
  ['article-analytics:all-view-metrics'],
  CACHE_OPTS,
);

/** The same metrics for EVERY article — what the view-column sort ranks by. */
export const getAllArticleViewMetrics = cache(
  async (): Promise<Map<string, ArticleViewMetrics>> =>
    new Map(await getAllArticleViewMetricsEntries()),
);

// ── Detail page: single-article getters ─────────────────────────────────────

export interface ArticleDailyPoint {
  date: string; // yyyy-MM-dd (KL)
  views: number;
  visitors: number;
}

/** Daily pageviews and distinct visitors for one article, oldest → newest. */
async function getArticleDailyViewsUncached(slug: string): Promise<ArticleDailyPoint[]> {
  const rows = await db.execute<{ date: string; views: number; visitors: number }>(sql`
    SELECT ${KL_DAY}::text AS date,
           COUNT(*)::int AS views,
           COUNT(DISTINCT visitor_hash)::int AS visitors
    FROM analytics_events
    WHERE event_name = 'pageview'
      AND is_bot = FALSE
      AND ${articlePathMatch(sql`pathname`, slug)}
    GROUP BY 1
    ORDER BY 1
  `);
  return rows.map((r) => ({
    date: r.date,
    views: Number(r.views ?? 0),
    visitors: Number(r.visitors ?? 0),
  }));
}

export interface ArticleTotals {
  totalViews: number;
  uniqueVisitors: number;
}

/**
 * All-time total pageviews and visitors for one article. "Visitors" is the sum
 * of each day's distinct visitors (the hash rotates daily, so a cross-day
 * DISTINCT would be no truer) — it therefore equals the daily chart's sum.
 */
async function getArticleTotalsUncached(slug: string): Promise<ArticleTotals> {
  const rows = await db.execute<{ total_views: number; unique_visitors: number }>(sql`
    WITH per_day AS (
      SELECT ${KL_DAY} AS day, visitor_hash, COUNT(*) AS events
      FROM analytics_events
      WHERE event_name = 'pageview'
        AND is_bot = FALSE
        AND ${articlePathMatch(sql`pathname`, slug)}
      GROUP BY 1, 2
    )
    SELECT COALESCE(SUM(events), 0)::int AS total_views,
           COUNT(*)::int AS unique_visitors
    FROM per_day
  `);
  const r = rows[0];
  return {
    totalViews: Number(r?.total_views ?? 0),
    uniqueVisitors: Number(r?.unique_visitors ?? 0),
  };
}

export interface ArticleEventRow {
  eventName: string;
  total: number;
  visitors: number;
}

/**
 * Non-pageview events recorded ON this article (scroll_depth, section_reached,
 * article_link_click, photo gallery events…), last 365 days, matched on the
 * article's exact paths.
 */
async function queryArticleEventBreakdown(paths: readonly string[]): Promise<ArticleEventRow[]> {
  if (paths.length === 0) return [];
  const rows = await db.execute<{ event_name: string; total: number; visitors: number }>(sql`
    SELECT event_name,
           COUNT(*)::int AS total,
           COUNT(DISTINCT visitor_hash)::int AS visitors
    FROM analytics_events
    WHERE event_name <> 'pageview'
      AND is_bot = FALSE
      AND ${detailWindowFloor}
      AND pathname = ANY (${textArrayParam(paths)})
    GROUP BY event_name
    ORDER BY total DESC, event_name ASC
  `);
  return rows.map((r) => ({
    eventName: r.event_name,
    total: Number(r.total ?? 0),
    visitors: Number(r.visitors ?? 0),
  }));
}

/** The scroll-depth milestones the client tracker emits (see ArticleScrollTracker). */
export const SCROLL_DEPTH_BUCKETS = [25, 50, 75, 100] as const;

export interface ScrollDepthRow {
  percent: number;
  /** Distinct visitors who reached at least this depth. */
  visitors: number;
}

function emptyScrollDepth(): ScrollDepthRow[] {
  return SCROLL_DEPTH_BUCKETS.map((percent) => ({ percent, visitors: 0 }));
}

/**
 * How far readers get: distinct visitors who fired each milestone `scroll_depth`
 * event. Each bucket fires once per page load, so the numbers are a descending
 * funnel. Every bucket is returned (0 when unreached) so the chart is stable.
 */
async function queryArticleScrollDepth(paths: readonly string[]): Promise<ScrollDepthRow[]> {
  if (paths.length === 0) return emptyScrollDepth();
  const rows = await db.execute<{ percent: number; visitors: number }>(sql`
    SELECT (props->>'percent')::int AS percent,
           COUNT(DISTINCT visitor_hash)::int AS visitors
    FROM analytics_events
    WHERE event_name = 'scroll_depth'
      AND is_bot = FALSE
      AND ${detailWindowFloor}
      AND pathname = ANY (${textArrayParam(paths)})
      AND props->>'percent' IN ('25', '50', '75', '100')
    GROUP BY percent
  `);
  const byPercent = new Map(rows.map((r) => [Number(r.percent), Number(r.visitors ?? 0)]));
  return SCROLL_DEPTH_BUCKETS.map((percent) => ({
    percent,
    visitors: byPercent.get(percent) ?? 0,
  }));
}

export interface ArticleDimensionRow {
  name: string;
  visitors: number;
}

/** Top referrer sources for one article (last 365 days, distinct visitors). */
async function queryArticleSources(paths: readonly string[]): Promise<ArticleDimensionRow[]> {
  if (paths.length === 0) return [];
  const rows = await db.execute<{ name: string; visitors: number }>(sql`
    SELECT
      CASE
        WHEN referrer IS NULL OR referrer = '' THEN 'Direct / None'
        ELSE REGEXP_REPLACE(REGEXP_REPLACE(referrer, '^https?://(www\\.)?', ''), '/.*$', '')
      END AS name,
      COUNT(DISTINCT visitor_hash)::int AS visitors
    FROM analytics_events
    WHERE event_name = 'pageview'
      AND is_bot = FALSE
      AND ${detailWindowFloor}
      AND pathname = ANY (${textArrayParam(paths)})
      AND ${ARTIKEL_PATH_SCOPE}
    GROUP BY name
    ORDER BY visitors DESC, name ASC
    LIMIT 12
  `);
  return rows.map((r) => ({ name: r.name, visitors: Number(r.visitors ?? 0) }));
}

/**
 * Device-type split for one article (last 365 days, distinct visitors),
 * bucketed by screen width exactly as TWN does (Mobile < 768 ≤ Tablet < 1024).
 */
async function queryArticleDevices(paths: readonly string[]): Promise<ArticleDimensionRow[]> {
  if (paths.length === 0) return [];
  const rows = await db.execute<{ name: string; visitors: number }>(sql`
    SELECT
      CASE
        WHEN screen_width IS NULL THEN 'Unknown'
        WHEN screen_width < 768 THEN 'Mobile'
        WHEN screen_width < 1024 THEN 'Tablet'
        ELSE 'Desktop'
      END AS name,
      COUNT(DISTINCT visitor_hash)::int AS visitors
    FROM analytics_events
    WHERE event_name = 'pageview'
      AND is_bot = FALSE
      AND ${detailWindowFloor}
      AND pathname = ANY (${textArrayParam(paths)})
      AND ${ARTIKEL_PATH_SCOPE}
    GROUP BY name
    ORDER BY visitors DESC, name ASC
  `);
  return rows.map((r) => ({ name: r.name, visitors: Number(r.visitors ?? 0) }));
}

export const getArticleDailyViews = unstable_cache(
  getArticleDailyViewsUncached,
  ['article-analytics:daily'],
  CACHE_OPTS,
);
export const getArticleTotals = unstable_cache(
  getArticleTotalsUncached,
  ['article-analytics:totals'],
  CACHE_OPTS,
);
// The raw getters resolve the article's paths through the CACHED resolver (one
// pass per article per 10 minutes, shared by all four panels).
export const getArticleEventBreakdown = unstable_cache(
  async (slug: string) => queryArticleEventBreakdown(await pathsForCached(slug)),
  ['article-analytics:events'],
  CACHE_OPTS,
);
export const getArticleScrollDepth = unstable_cache(
  async (slug: string) => queryArticleScrollDepth(await pathsForCached(slug)),
  ['article-analytics:scroll'],
  CACHE_OPTS,
);
export const getArticleSources = unstable_cache(
  async (slug: string) => queryArticleSources(await pathsForCached(slug)),
  ['article-analytics:sources'],
  CACHE_OPTS,
);
export const getArticleDevices = unstable_cache(
  async (slug: string) => queryArticleDevices(await pathsForCached(slug)),
  ['article-analytics:devices'],
  CACHE_OPTS,
);

// Uncached variants (tests, and any future prod-scale canary).
export {
  getArticleViewMetricsUncached,
  getAllArticleViewMetricsUncached,
  getArticleDailyViewsUncached,
  getArticleTotalsUncached,
  queryArticleEventBreakdown,
  queryArticleScrollDepth,
  queryArticleSources,
  queryArticleDevices,
};

/**
 * Resolve one article's paths for an uncached getter. `paths` given (a test,
 * or a caller that resolved once) wins; otherwise the uncached resolver, so an
 * `…Uncached` getter really is cold end to end.
 */
async function pathsForUncached(slug: string, paths?: readonly string[]): Promise<string[]> {
  if (paths) return [...paths];
  return (await resolveArticlePathsUncached([slug])).get(slug) ?? [];
}

export const getArticleEventBreakdownUncached = async (slug: string, paths?: readonly string[]) =>
  queryArticleEventBreakdown(await pathsForUncached(slug, paths));
export const getArticleScrollDepthUncached = async (slug: string, paths?: readonly string[]) =>
  queryArticleScrollDepth(await pathsForUncached(slug, paths));
export const getArticleSourcesUncached = async (slug: string, paths?: readonly string[]) =>
  queryArticleSources(await pathsForUncached(slug, paths));
export const getArticleDevicesUncached = async (slug: string, paths?: readonly string[]) =>
  queryArticleDevices(await pathsForUncached(slug, paths));
