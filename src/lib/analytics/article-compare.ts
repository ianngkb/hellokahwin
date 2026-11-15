import 'server-only';
import { unstable_cache } from 'next/cache';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { toUtcRange } from '@/lib/admin/date-range';
import { createPanelLimiter } from '@/lib/admin/panel-limiter';
import { runBatched } from '@/lib/admin/run-batched';
import { resolveArticlePaths, resolveArticlePathsUncached, textArrayParam } from './article-paths';
import {
  detailWindowFloor,
  ARTIKEL_PATH_SCOPE,
  SCROLL_DEPTH_BUCKETS,
  type ArticleDimensionRow,
  type ScrollDepthRow,
} from './article-views';
import { SCROLL_TRACKING_SINCE } from './scroll-tracking';
import { MAX_COMPARE_ARTICLES, OTHER_SOURCES_NAME, SOURCES_PER_ARTICLE } from './compare-limits';

/**
 * Side-by-side analytics for up to six Inspire articles (the Article Analytics
 * comparison page, /admin/inspire/analytics).
 *
 * ONE STATEMENT PER METRIC, ALL ARTICLES AT ONCE. Picking six articles must not
 * mean six times the panels: each metric is a single statement over the union
 * of every picked article's resolved paths (`resolveArticlePaths`), matched
 * `pathname = ANY(<one JSON-text parameter>)` so `idx_analytics_events_pathname`
 * serves it as an index probe — the T1 fix for the blank per-article panels.
 * The article is then recovered with `split_part(pathname,'/',4)`, which only
 * runs over the rows the index already matched (every resolved path's 4th
 * segment IS its slug — see article-paths.ts). Never put `split_part` in the
 * WHERE clause, and never match on `LIKE '/artikel/%'` INSTEAD of the paths:
 * that is the full-table walk. The three PAGEVIEW statements (totals, sources,
 * devices) do ADD `ARTIKEL_PATH_SCOPE` beside the `= ANY` match — it removes no
 * rows, but without it Postgres cannot use the partial covering index
 * `idx_analytics_events_inspire_pageview`, and each matched row costs a random
 * heap read (5.4 s cold for three popular articles on prod, 2026-11-08).
 *
 * NO `COUNT(DISTINCT …)`. Distinct visitors come from one `GROUP BY …,
 * visitor_hash` pass and a plain `COUNT(*)` over it (the CLAUDE.md analytics
 * rule). Every statement is also bounded by `detailWindowFloor` (365 days),
 * which is what "Last 12 months" on the page means. `visitor_hash` rotates
 * daily, so "unique visitors" is daily-unique, as everywhere else.
 *
 * Every requested slug is in the answer, zeros/empty when it has no rows, so a
 * column never silently disappears. `getArticlesCompare` (the page's entry)
 * runs each metric through `safePanel` under a three-slot `createPanelLimiter`,
 * so one slow or failed metric comes back `null` ("couldn't load") instead of
 * failing the rest.
 *
 * COUNTS ARE `bigint` in SQL (an `int` cast throws past 2,147,483,647) and
 * become JS numbers only through `toCount`, which clamps at
 * Number.MAX_SAFE_INTEGER rather than silently losing precision.
 */

const CACHE_TAG = 'article-analytics';
const CACHE_OPTS = { tags: [CACHE_TAG], revalidate: 600 };

// The comparison page compares at most this many articles at once (its own
// module so client code can share the number without importing `server-only`).
export { MAX_COMPARE_ARTICLES };

/** Drop-off bands: 0 = "Left before scrolling", then the scroll milestones. */
export const DROP_OFF_BANDS = [0, 25, 50, 75, 100] as const;
export type DropOffBandValue = (typeof DROP_OFF_BANDS)[number];

export interface DropOffBand {
  /** 0 = left before scrolling; 25/50/75/100 = the furthest milestone reached. */
  band: DropOffBandValue;
  visitors: number;
  /** Fraction (0–1) of this article's band total; 0 when the total is 0. */
  share: number;
}

export interface ArticleCompareTotals {
  /** Pageview events (a refresh counts again). */
  views: number;
  /** Distinct `visitor_hash` (daily-unique). */
  uniqueVisitors: number;
}

export interface ArticleCompareRow extends ArticleCompareTotals {
  /** Read-depth funnel: distinct visitors who reached at least each milestone. */
  scroll: ScrollDepthRow[];
  /** Where readers stopped: each visitor in exactly one band. */
  dropOff: DropOffBand[];
  /**
   * Top 8 referrer sources, distinct visitors, then (only when there are more)
   * one OTHER_SOURCES_NAME row summing the rest — so the rows add up to the
   * article's full source total.
   */
  sources: ArticleDimensionRow[];
  /** Device split by screen width, distinct visitors. */
  devices: ArticleDimensionRow[];
}

/**
 * A SQL `bigint` count (postgres-js hands it over as a string) as a JS number:
 * missing/garbage → 0, beyond 2^53 − 1 → clamped there, never imprecise.
 */
export function toCount(v: unknown): number {
  const n = typeof v === 'bigint' ? Number(v) : Number(v ?? 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(Math.trunc(n), Number.MAX_SAFE_INTEGER);
}

/**
 * Sum counts precision-safely. Each operand is a safe integer (it came through
 * `toCount`), but plain `+` on two of them can pass 2^53 − 1 and silently
 * round. The sum is taken in `bigint` and clamped by `toCount`, so the
 * AGGREGATE obeys the same rule as each value: exact, or clamped at 2^53 − 1.
 */
export function addCounts(...counts: readonly number[]): number {
  let sum = BigInt(0);
  for (const c of counts) sum += BigInt(toCount(c));
  return toCount(sum);
}

/** Paths per slug, as `resolveArticlePaths` returns them. */
type PathsBySlug = ReadonlyMap<string, readonly string[]>;

/**
 * Unique, trimmed, non-empty slugs, sorted — also the cache key, so the same
 * selection in a different order shares one entry. Throws past
 * MAX_COMPARE_ARTICLES (counted after de-duplication) rather than quietly
 * running a bigger fan-out than the page promises.
 */
export function normaliseCompareSlugs(slugs: readonly string[]): string[] {
  const out = [...new Set(slugs.map((s) => s.trim()).filter(Boolean))].sort();
  if (out.length > MAX_COMPARE_ARTICLES) {
    throw new RangeError(
      `Compare up to ${MAX_COMPARE_ARTICLES} articles at a time (got ${out.length})`,
    );
  }
  return out;
}

/** UTC instant read-depth tracking starts from (KL midnight of SCROLL_TRACKING_SINCE). */
function scrollSinceUtc(): string {
  return toUtcRange({ from: SCROLL_TRACKING_SINCE, to: SCROLL_TRACKING_SINCE }).start;
}

/** Every path of the wanted slugs, flattened (the resolver keeps them disjoint). */
function allPaths(wanted: readonly string[], paths: PathsBySlug): string[] {
  const out = new Set<string>();
  for (const slug of wanted) for (const p of paths.get(slug) ?? []) out.add(p);
  return [...out].sort();
}

function emptyScroll(): ScrollDepthRow[] {
  return SCROLL_DEPTH_BUCKETS.map((percent) => ({ percent, visitors: 0 }));
}

function emptyDropOff(): DropOffBand[] {
  return DROP_OFF_BANDS.map((band) => ({ band, visitors: 0, share: 0 }));
}

/** A Map with every wanted slug present, seeded with `empty()`. */
function seeded<T>(wanted: readonly string[], empty: () => T): Map<string, T> {
  return new Map(wanted.map((s) => [s, empty()]));
}

/**
 * The shared prelude of every metric: normalise, resolve paths (given ones
 * win — the canary resolves once and times the statement alone), and the
 * flattened path list. `paths` empty means no statement should run at all.
 */
async function prepare(
  slugs: readonly string[],
  given: PathsBySlug | undefined,
  resolve: (s: readonly string[]) => Promise<PathsBySlug>,
): Promise<{ wanted: string[]; paths: string[] }> {
  const wanted = normaliseCompareSlugs(slugs);
  if (wanted.length === 0) return { wanted, paths: [] };
  const bySlug = given ?? (await resolve(wanted));
  return { wanted, paths: allPaths(wanted, bySlug) };
}

type Resolver = (s: readonly string[]) => Promise<PathsBySlug>;

// ── 1. Views + unique visitors ──────────────────────────────────────────────

async function queryTotals(
  wanted: readonly string[],
  paths: readonly string[],
): Promise<Map<string, ArticleCompareTotals>> {
  const out = seeded(wanted, () => ({ views: 0, uniqueVisitors: 0 }));
  if (paths.length === 0) return out;
  const rows = await db.execute<{ slug: string; views: string; unique_visitors: string }>(sql`
    WITH pv AS (
      SELECT split_part(pathname, '/', 4) AS slug, visitor_hash, COUNT(*) AS n
      FROM analytics_events
      WHERE event_name = 'pageview'
        AND is_bot = FALSE
        AND ${detailWindowFloor}
        AND pathname = ANY (${textArrayParam(paths)})
        AND ${ARTIKEL_PATH_SCOPE}
      GROUP BY 1, 2
    )
    SELECT slug, SUM(n)::bigint AS views, COUNT(*)::bigint AS unique_visitors
    FROM pv
    GROUP BY slug
  `);
  for (const r of rows) {
    if (!out.has(r.slug)) continue;
    out.set(r.slug, {
      views: toCount(r.views),
      uniqueVisitors: toCount(r.unique_visitors),
    });
  }
  return out;
}

// ── 2. Read-depth funnel ────────────────────────────────────────────────────

async function queryScroll(
  wanted: readonly string[],
  paths: readonly string[],
): Promise<Map<string, ScrollDepthRow[]>> {
  const out = seeded(wanted, emptyScroll);
  if (paths.length === 0) return out;
  const rows = await db.execute<{ slug: string; percent: number; visitors: string }>(sql`
    WITH hits AS (
      SELECT split_part(pathname, '/', 4) AS slug, (props->>'percent')::int AS percent, visitor_hash
      FROM analytics_events
      WHERE event_name = 'scroll_depth'
        AND is_bot = FALSE
        AND ${detailWindowFloor}
        AND pathname = ANY (${textArrayParam(paths)})
        AND props->>'percent' IN ('25', '50', '75', '100')
      GROUP BY 1, 2, 3
    )
    SELECT slug, percent, COUNT(*)::bigint AS visitors
    FROM hits
    GROUP BY slug, percent
  `);
  for (const r of rows) {
    const funnel = out.get(r.slug);
    const bucket = funnel?.find((b) => b.percent === Number(r.percent));
    if (bucket) bucket.visitors = toCount(r.visitors);
  }
  return out;
}

// ── 3. Drop-off: where each visitor stopped ─────────────────────────────────

// The comparison page (compare-dashboard.tsx) shows THESE milestone bands,
// never section rows — sections differ per article (R12/R28). Each article's
// title there links to /admin/inspire/[article-id]/analytics, where T7's
// "Where readers stop" panel (getArticleSectionDropOff) lives.

/**
 * Turn per-article counts into the five bands (R9). Every visitor of the
 * window (opened the article and/or scrolled it) lands in exactly ONE band:
 *   - band p (25/50/75/100): visitors whose HIGHEST milestone was p;
 *   - band 0, "Left before scrolling": visitors who OPENED the article (a
 *     pageview since SCROLL_TRACKING_SINCE) and reached no milestone at all —
 *     counted directly, never derived as "openers minus scrollers". A
 *     scroll-only visitor (scrolled a pageview from before the window, or
 *     across the daily `visitor_hash` rotation) is a scroller, in its
 *     milestone band; subtracting it from the openers would erase a genuine
 *     leaver (I-F1);
 *   - share: each band over the five-band total.
 */
export function buildDropOffBands(
  leftBeforeScrolling: number,
  stoppedAt: ReadonlyMap<number, number>,
): DropOffBand[] {
  const counts = DROP_OFF_BANDS.map((band) =>
    band === 0 ? toCount(leftBeforeScrolling) : toCount(stoppedAt.get(band) ?? 0),
  );
  // `total` is only a divisor for shares (ratios) and is never shown as a
  // count; clamping it would push shares past 1, so a float sum is right here.
  const total = counts.reduce((a, b) => a + b, 0);
  return DROP_OFF_BANDS.map((band, i) => ({
    band,
    visitors: counts[i],
    share: total > 0 ? counts[i] / total : 0,
  }));
}

async function queryDropOff(
  wanted: readonly string[],
  paths: readonly string[],
): Promise<Map<string, DropOffBand[]>> {
  const out = seeded(wanted, emptyDropOff);
  if (paths.length === 0) return out;
  // One row per (slug, highest milestone), with NULL = never scrolled. Both
  // halves start at SCROLL_TRACKING_SINCE, so pageviews from before the
  // tracker existed never inflate "Left before scrolling".
  //
  // TWO HALVES, FULL-JOINED PER VISITOR (I-F22). One mixed
  // `event_name IN ('pageview','scroll_depth')` scan could not use the partial
  // covering index `idx_analytics_events_inspire_pageview` (it covers pageviews
  // only), so every matched pageview was a random heap read: 2.3–6.9 s cold on
  // prod for six popular articles. The pageview half now carries the index's
  // exact predicate (`ARTIKEL_PATH_SCOPE`) and reads only `visitor_hash` —
  // an index-only scan; the scroll half is the small `scroll_depth` set
  // (the same probe `compare:scroll` times at ~0.3 s). A visitor appears once
  // per slug: opened (has an in-window pageview) and/or their top milestone.
  const rows = await db.execute<{
    slug: string;
    top: number | null;
    visitors: string;
    opened: string;
  }>(sql`
    WITH pv AS (
      SELECT split_part(pathname, '/', 4) AS slug, visitor_hash
      FROM analytics_events
      WHERE event_name = 'pageview'
        AND is_bot = FALSE
        AND ${detailWindowFloor}
        AND created_at >= ${scrollSinceUtc()}
        AND pathname = ANY (${textArrayParam(paths)})
        AND ${ARTIKEL_PATH_SCOPE}
      GROUP BY 1, 2
    ),
    sc AS (
      SELECT split_part(pathname, '/', 4) AS slug,
             visitor_hash,
             MAX((props->>'percent')::int) AS top
      FROM analytics_events
      WHERE event_name = 'scroll_depth'
        AND is_bot = FALSE
        AND ${detailWindowFloor}
        AND created_at >= ${scrollSinceUtc()}
        AND pathname = ANY (${textArrayParam(paths)})
        AND props->>'percent' IN ('25', '50', '75', '100')
      GROUP BY 1, 2
    ),
    per_visitor AS (
      SELECT COALESCE(pv.slug, sc.slug) AS slug,
             (pv.visitor_hash IS NOT NULL) AS opened,
             sc.top
      FROM pv
      FULL JOIN sc ON sc.slug = pv.slug AND sc.visitor_hash = pv.visitor_hash
    )
    SELECT slug, top, COUNT(*)::bigint AS visitors, COUNT(*) FILTER (WHERE opened)::bigint AS opened
    FROM per_visitor
    GROUP BY slug, top
  `);
  // Band 0 is the `opened` count of the never-scrolled (top IS NULL) rows
  // ONLY — openers who reached no milestone. Scroll rows go to their band
  // whether or not the same hash also has an in-window pageview.
  const leftEarly = new Map<string, number>();
  const stopped = new Map<string, Map<number, number>>();
  for (const r of rows) {
    if (!out.has(r.slug)) continue;
    if (r.top == null) {
      leftEarly.set(r.slug, addCounts(leftEarly.get(r.slug) ?? 0, toCount(r.opened)));
      continue;
    }
    const m = stopped.get(r.slug) ?? new Map<number, number>();
    m.set(Number(r.top), addCounts(m.get(Number(r.top)) ?? 0, toCount(r.visitors)));
    stopped.set(r.slug, m);
  }
  for (const slug of wanted) {
    out.set(slug, buildDropOffBands(leftEarly.get(slug) ?? 0, stopped.get(slug) ?? new Map()));
  }
  return out;
}

// ── 4. Sources ──────────────────────────────────────────────────────────────

async function querySources(
  wanted: readonly string[],
  paths: readonly string[],
): Promise<Map<string, ArticleDimensionRow[]>> {
  const out = seeded<ArticleDimensionRow[]>(wanted, () => []);
  if (paths.length === 0) return out;
  // Same referrer normalisation as the per-article Sources panel. The top
  // SOURCES_PER_ARTICLE keep their names; everything past them is ONE
  // OTHER_SOURCES_NAME row (sorted last), so the dashboard's shares divide by
  // the article's true source total rather than the sum of the eight shown.
  const rows = await db.execute<{ slug: string; name: string; visitors: string }>(sql`
    WITH hits AS (
      SELECT split_part(pathname, '/', 4) AS slug,
             CASE
               WHEN referrer IS NULL OR referrer = '' THEN 'Direct / None'
               ELSE REGEXP_REPLACE(REGEXP_REPLACE(referrer, '^https?://(www\\.)?', ''), '/.*$', '')
             END AS name,
             visitor_hash
      FROM analytics_events
      WHERE event_name = 'pageview'
        AND is_bot = FALSE
        AND ${detailWindowFloor}
        AND pathname = ANY (${textArrayParam(paths)})
        AND ${ARTIKEL_PATH_SCOPE}
      GROUP BY 1, 2, 3
    ),
    counted AS (
      SELECT slug, name, COUNT(*)::bigint AS visitors
      FROM hits
      GROUP BY slug, name
    ),
    ranked AS (
      SELECT slug, name, visitors,
             ROW_NUMBER() OVER (PARTITION BY slug ORDER BY visitors DESC, name ASC) AS rn
      FROM counted
    )
    SELECT slug,
           CASE WHEN rn <= ${SOURCES_PER_ARTICLE} THEN name ELSE ${OTHER_SOURCES_NAME} END AS name,
           SUM(visitors)::bigint AS visitors
    FROM ranked
    GROUP BY slug, 2
    ORDER BY slug, MIN(rn)
  `);
  for (const r of rows) out.get(r.slug)?.push({ name: r.name, visitors: toCount(r.visitors) });
  return out;
}

// ── 5. Devices ──────────────────────────────────────────────────────────────

async function queryDevices(
  wanted: readonly string[],
  paths: readonly string[],
): Promise<Map<string, ArticleDimensionRow[]>> {
  const out = seeded<ArticleDimensionRow[]>(wanted, () => []);
  if (paths.length === 0) return out;
  // Same screen-width bands as the per-article Devices panel.
  const rows = await db.execute<{ slug: string; name: string; visitors: string }>(sql`
    WITH hits AS (
      SELECT split_part(pathname, '/', 4) AS slug,
             CASE
               WHEN screen_width IS NULL THEN 'Unknown'
               WHEN screen_width < 768 THEN 'Mobile'
               WHEN screen_width < 1024 THEN 'Tablet'
               ELSE 'Desktop'
             END AS name,
             visitor_hash
      FROM analytics_events
      WHERE event_name = 'pageview'
        AND is_bot = FALSE
        AND ${detailWindowFloor}
        AND pathname = ANY (${textArrayParam(paths)})
        AND ${ARTIKEL_PATH_SCOPE}
      GROUP BY 1, 2, 3
    )
    SELECT slug, name, COUNT(*)::bigint AS visitors
    FROM hits
    GROUP BY slug, name
    ORDER BY slug, visitors DESC, name ASC
  `);
  for (const r of rows) out.get(r.slug)?.push({ name: r.name, visitors: toCount(r.visitors) });
  return out;
}

// ── Public getters ──────────────────────────────────────────────────────────

/**
 * Per-metric uncached getters. `paths` given (the canary) skips resolution so
 * the statement is timed alone; otherwise the UNCACHED resolver runs, so an
 * `…Uncached` read is cold end to end. More than MAX_COMPARE_ARTICLES slugs
 * throws a RangeError; an empty list returns an empty map without querying.
 */
function uncached<T>(
  query: (wanted: readonly string[], paths: readonly string[]) => Promise<Map<string, T>>,
  resolve: Resolver,
) {
  return async (slugs: readonly string[], paths?: PathsBySlug): Promise<Map<string, T>> => {
    const p = await prepare(slugs, paths, resolve);
    return query(p.wanted, p.paths);
  };
}

export const getCompareTotalsUncached = uncached(queryTotals, resolveArticlePathsUncached);
export const getCompareScrollUncached = uncached(queryScroll, resolveArticlePathsUncached);
export const getCompareDropOffUncached = uncached(queryDropOff, resolveArticlePathsUncached);
export const getCompareSourcesUncached = uncached(querySources, resolveArticlePathsUncached);
export const getCompareDevicesUncached = uncached(queryDevices, resolveArticlePathsUncached);

function merge(
  wanted: readonly string[],
  totals: ReadonlyMap<string, ArticleCompareTotals>,
  scroll: ReadonlyMap<string, ScrollDepthRow[]>,
  dropOff: ReadonlyMap<string, DropOffBand[]>,
  sources: ReadonlyMap<string, ArticleDimensionRow[]>,
  devices: ReadonlyMap<string, ArticleDimensionRow[]>,
): Map<string, ArticleCompareRow> {
  return new Map(
    wanted.map((slug) => [
      slug,
      {
        ...(totals.get(slug) ?? { views: 0, uniqueVisitors: 0 }),
        scroll: scroll.get(slug) ?? emptyScroll(),
        dropOff: dropOff.get(slug) ?? emptyDropOff(),
        sources: sources.get(slug) ?? [],
        devices: devices.get(slug) ?? [],
      },
    ]),
  );
}

/**
 * Every metric for every slug, cold (resolver included unless `paths` given),
 * merged into one row per slug. DIAGNOSTICS AND TESTS ONLY: a failure here
 * rejects, deliberately, so a broken statement is never hidden — which is why
 * no page may render from it. Pages use `getArticlesCompare`. Still capped at
 * three statements in flight, like every analytics fan-out.
 */
export async function getArticlesCompareUncached(
  slugs: readonly string[],
  paths?: PathsBySlug,
): Promise<Map<string, ArticleCompareRow>> {
  const wanted = normaliseCompareSlugs(slugs);
  if (wanted.length === 0) return new Map();
  const bySlug = paths ?? (await resolveArticlePathsUncached(wanted));
  const [totals, scroll, dropOff, sources, devices] = await runBatched(
    [
      () => getCompareTotalsUncached(wanted, bySlug),
      () => getCompareScrollUncached(wanted, bySlug),
      () => getCompareDropOffUncached(wanted, bySlug),
      () => getCompareSourcesUncached(wanted, bySlug),
      () => getCompareDevicesUncached(wanted, bySlug),
    ] as const,
    3,
  );
  return merge(wanted, totals, scroll, dropOff, sources, devices);
}

// Cached per-metric reads: each its own `unstable_cache` entry (600 s,
// `article-analytics` tag), keyed on the SORTED slug list, resolving paths
// through the cached resolver. `unstable_cache` cannot store a Map, so entries
// are cached and the Map rebuilt. `getArticlesCompare` wraps each one in its
// own `safePanel`, so one slow metric blanks one panel, not the page.
function cached<T>(
  query: (wanted: readonly string[], paths: readonly string[]) => Promise<Map<string, T>>,
  key: string,
) {
  const entries = unstable_cache(
    async (sortedSlugs: readonly string[]) => {
      const p = await prepare(sortedSlugs, undefined, resolveArticlePaths);
      return Array.from((await query(p.wanted, p.paths)).entries());
    },
    [`article-analytics:compare:${key}`],
    CACHE_OPTS,
  );
  return async (slugs: readonly string[]): Promise<Map<string, T>> => {
    const sorted = normaliseCompareSlugs(slugs);
    if (sorted.length === 0) return new Map();
    return new Map(await entries(sorted));
  };
}

export const getCompareTotals = cached(queryTotals, 'totals');
export const getCompareScroll = cached(queryScroll, 'scroll');
export const getCompareDropOff = cached(queryDropOff, 'dropoff');
export const getCompareSources = cached(querySources, 'sources');
export const getCompareDevices = cached(queryDevices, 'devices');

/**
 * The comparison page's read: every metric for every picked slug, one metric
 * per field. A field is `null` when that metric could not be read — its
 * `safePanel` hit the 6 s deadline or a transient database failure — and the
 * page renders that panel as "couldn't load" while the others still show.
 * Otherwise every requested slug is present, zeros/empty when it has no rows.
 */
export interface ArticleComparePanels {
  /** The normalised selection (sorted, de-duplicated) — the column order. */
  slugs: string[];
  totals: Map<string, ArticleCompareTotals> | null;
  scroll: Map<string, ScrollDepthRow[]> | null;
  dropOff: Map<string, DropOffBand[]> | null;
  sources: Map<string, ArticleDimensionRow[]> | null;
  devices: Map<string, ArticleDimensionRow[]> | null;
}

/**
 * Every metric for every picked slug (max MAX_COMPARE_ARTICLES; more throws a
 * RangeError before anything runs). Each metric is one cached statement for
 * all slugs, run through `safePanel` under a three-slot `createPanelLimiter` —
 * at most three statements in flight (until each really settles), and a slow
 * or failed metric is `null`, never a page error (the admin-analytics query
 * discipline).
 */
export async function getArticlesCompare(slugs: readonly string[]): Promise<ArticleComparePanels> {
  const wanted = normaliseCompareSlugs(slugs);
  if (wanted.length === 0) {
    return {
      slugs: [],
      totals: new Map(),
      scroll: new Map(),
      dropOff: new Map(),
      sources: new Map(),
      devices: new Map(),
    };
  }
  // At most three statements in flight, counted until each statement really
  // settles — a metric past its 6 s deadline keeps its slot until the database
  // is done with it, so a slow metric cannot let a fourth and fifth start on
  // top of it (I-F13; see panel-limiter.ts).
  const panel = createPanelLimiter(3);
  const [totals, scroll, dropOff, sources, devices] = await Promise.all([
    panel<Map<string, ArticleCompareTotals> | null>(
      'compare:totals',
      () => getCompareTotals(wanted),
      null,
    ),
    panel<Map<string, ScrollDepthRow[]> | null>(
      'compare:scroll',
      () => getCompareScroll(wanted),
      null,
    ),
    panel<Map<string, DropOffBand[]> | null>(
      'compare:dropoff',
      () => getCompareDropOff(wanted),
      null,
    ),
    panel<Map<string, ArticleDimensionRow[]> | null>(
      'compare:sources',
      () => getCompareSources(wanted),
      null,
    ),
    panel<Map<string, ArticleDimensionRow[]> | null>(
      'compare:devices',
      () => getCompareDevices(wanted),
      null,
    ),
  ]);
  return { slugs: wanted, totals, scroll, dropOff, sources, devices };
}
