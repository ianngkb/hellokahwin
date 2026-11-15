import 'server-only';
import { unstable_cache } from 'next/cache';
import { sql, type SQL } from 'drizzle-orm';
import { format } from 'date-fns';
import { db } from '@/lib/db/drizzle';
import { getKLToday, toUtcRange, type DateRange } from '@/lib/admin/date-range';
import { resolveArticlePaths, textArrayParam } from './article-paths';
import { ARTIKEL_PATH_SCOPE, KL_DAY } from './article-views';
import { SCROLL_TRACKING_SINCE } from './scroll-tracking';
import { daysIn, laterDay, shiftDay } from './article-period';

/**
 * The Article Analytics OVERVIEW — "how are our articles doing in this
 * period?" — `/admin/inspire/analytics`. Ported from The Wedding Notebook,
 * without its vendor-click and enquiry (WhatsApp / lead) metrics, which have
 * no HelloKahwin equivalent.
 *
 * Every getter takes a {@link PeriodWindow} (the period, plus the equal window
 * it compares against, or none for lifetime) and answers for EVERY article in
 * one statement: the page must rank the whole catalogue before it can show
 * page one, and one GROUP BY is far cheaper than a per-article fan-out.
 *
 * SOURCES:
 *   - views / readers — human pageviews in `analytics_events` (HelloKahwin
 *     keeps no rollups), the same rows /admin/site-analytics counts. "Readers"
 *     counts distinct `visitor_hash`es per day; the hash rotates DAILY, so
 *     someone who comes back on three days counts three times. The page says so.
 *   - Google — `gsc_page_daily` via `gsc_pages.article_id` (filled nightly by
 *     /api/cron/gsc-sync). Position is always `SUM(position_sum) / SUM(impressions)`.
 *   - read-through — `scroll_depth` 75 % events against pageviews, matched on
 *     resolved exact paths.
 *
 * Every getter is cached 600 s under the shared `article-analytics` tag and the
 * page runs each one in its own `safePanel`.
 */

const CACHE_TAG = 'article-analytics';
const CACHE_OPTS = { tags: [CACHE_TAG], revalidate: 600 };

export interface PeriodWindow {
  from: string;
  to: string;
  /** null = lifetime: no comparison window. */
  prevFrom: string | null;
  prevTo: string | null;
}

export function toPeriodWindow(range: DateRange, prevRange: DateRange | null): PeriodWindow {
  return {
    from: range.from,
    to: range.to,
    prevFrom: prevRange?.from ?? null,
    prevTo: prevRange?.to ?? null,
  };
}

function lowerBound(w: PeriodWindow): string {
  return w.prevFrom && w.prevFrom < w.from ? w.prevFrom : w.from;
}

function todayKL(): string {
  return format(getKLToday(), 'yyyy-MM-dd');
}

/** `day` (a `date` expression) inside the current / the comparison window. */
function dayIn(col: SQL, from: string, to: string): SQL {
  return sql`(${col} >= ${from}::text::date AND ${col} <= ${to}::text::date)`;
}

function prevDayIn(col: SQL, w: PeriodWindow): SQL {
  return w.prevFrom && w.prevTo ? dayIn(col, w.prevFrom, w.prevTo) : sql`FALSE`;
}

/**
 * Human article pageviews over `[from, to]` (KL days), restricted to REAL
 * article slugs. Yields (slug, day, visitor_hash). The slug semi-join keeps
 * scanner junk under `/artikel/` out of every total, so the headline numbers
 * equal the sum of the leaderboard.
 */
export function articlePageviews(from: string, to: string): SQL {
  const { start, endExclusive } = toUtcRange({ from, to });
  return sql`
    SELECT split_part(pathname, '/', 4) AS slug, ${KL_DAY} AS day, visitor_hash
    FROM analytics_events
    WHERE event_name = 'pageview'
      AND is_bot = FALSE
      AND ${ARTIKEL_PATH_SCOPE}
      AND created_at >= ${start}
      AND created_at < ${endExclusive}
      AND split_part(pathname, '/', 4) IN (SELECT slug FROM articles)`;
}

// ── Views & readers per article ─────────────────────────────────────────────

export interface PeriodViews {
  views: number;
  readers: number;
  prevViews: number;
  prevReaders: number;
}

async function queryArticleViews(w: PeriodWindow): Promise<Array<[string, PeriodViews]>> {
  const rows = await db.execute<{
    slug: string;
    views: number;
    readers: number;
    prev_views: number;
    prev_readers: number;
  }>(sql`
    WITH pv AS (${articlePageviews(lowerBound(w), w.to)}),
    per_visitor AS (
      SELECT slug, day, visitor_hash, COUNT(*) AS events
      FROM pv
      GROUP BY slug, day, visitor_hash
    )
    SELECT slug,
           COALESCE(SUM(events) FILTER (WHERE ${dayIn(sql`day`, w.from, w.to)}), 0)::int AS views,
           COUNT(*) FILTER (WHERE ${dayIn(sql`day`, w.from, w.to)})::int AS readers,
           COALESCE(SUM(events) FILTER (WHERE ${prevDayIn(sql`day`, w)}), 0)::int AS prev_views,
           COUNT(*) FILTER (WHERE ${prevDayIn(sql`day`, w)})::int AS prev_readers
    FROM per_visitor
    GROUP BY slug
  `);
  return rows.map((r) => [
    r.slug,
    {
      views: Number(r.views ?? 0),
      readers: Number(r.readers ?? 0),
      prevViews: Number(r.prev_views ?? 0),
      prevReaders: Number(r.prev_readers ?? 0),
    },
  ]);
}

// ── Daily series (all articles together) ────────────────────────────────────

export interface DailyPoint {
  date: string;
  views: number;
  readers: number;
}

/**
 * Daily views and readers across all articles, oldest → newest, covering the
 * comparison window AND the period (the caller splits them). Because the
 * visitor hash rotates daily, a day's distinct readers can be summed across
 * days, so the readers tile is the sum of this series.
 */
async function queryDailySeries(w: PeriodWindow): Promise<DailyPoint[]> {
  const rows = await db.execute<{ date: string; views: number; readers: number }>(sql`
    WITH pv AS (${articlePageviews(lowerBound(w), w.to)}),
    per_visitor AS (
      SELECT day, visitor_hash, COUNT(*) AS events FROM pv GROUP BY day, visitor_hash
    )
    SELECT day::text AS date, SUM(events)::int AS views, COUNT(*)::int AS readers
    FROM per_visitor
    GROUP BY day
    ORDER BY day
  `);
  return rows.map((r) => ({
    date: r.date,
    views: Number(r.views ?? 0),
    readers: Number(r.readers ?? 0),
  }));
}

// ── Google Search ───────────────────────────────────────────────────────────

export interface GoogleStats {
  clicks: number;
  impressions: number;
  /** position × impressions; divide by impressions for the average position. */
  positionSum: number;
  prevClicks: number;
  prevImpressions: number;
  prevPositionSum: number;
}

export interface PeriodGoogle {
  /** The last day Google has reported (it lags 2–3 days); null = no data at all. */
  dailyThrough: string | null;
  /** The days actually compared, after clipping both windows to `dailyThrough`. */
  range: DateRange | null;
  prevRange: DateRange | null;
  rows: Array<[string, GoogleStats]>;
}

/**
 * Google numbers per article id. Google reports with a 2–3 day lag, so the
 * period is clipped to the last reported day and the comparison window is cut
 * by the same number of days — otherwise "last 7 days" would compare four
 * reported days against seven and every article would look like it was falling.
 * `allHistory` (lifetime) reads every day the sync has stored.
 */
async function queryArticleGoogle(w: PeriodWindow, allHistory: boolean): Promise<PeriodGoogle> {
  const [through] = await db.execute<{ d: string | null }>(
    sql`SELECT MAX(date)::text AS d FROM gsc_page_daily`,
  );
  const dailyThrough = through?.d ?? null;
  if (!dailyThrough || (!allHistory && dailyThrough < w.from)) {
    return { dailyThrough, range: null, prevRange: null, rows: [] };
  }

  const to = w.to > dailyThrough ? dailyThrough : w.to;
  const from = allHistory ? '2000-01-01' : w.from;
  let prevRange: DateRange | null = null;
  if (!allHistory && w.prevFrom && w.prevTo) {
    const cut = daysIn({ from: w.from, to: w.to }) - daysIn({ from: w.from, to });
    prevRange = { from: w.prevFrom, to: shiftDay(w.prevTo, -cut) };
  }
  const lo = prevRange ? prevRange.from : from;
  const inPrev = prevRange ? dayIn(sql`d.date`, prevRange.from, prevRange.to) : sql`FALSE`;

  const rows = await db.execute<{
    article_id: string;
    clicks: number;
    impressions: number;
    pos_sum: number;
    prev_clicks: number;
    prev_impressions: number;
    prev_pos_sum: number;
  }>(sql`
    SELECT p.article_id::text AS article_id,
      COALESCE(SUM(d.clicks) FILTER (WHERE ${dayIn(sql`d.date`, from, to)}), 0)::int AS clicks,
      COALESCE(SUM(d.impressions) FILTER (WHERE ${dayIn(sql`d.date`, from, to)}), 0)::int AS impressions,
      COALESCE(SUM(d.position_sum) FILTER (WHERE ${dayIn(sql`d.date`, from, to)}), 0)::float8 AS pos_sum,
      COALESCE(SUM(d.clicks) FILTER (WHERE ${inPrev}), 0)::int AS prev_clicks,
      COALESCE(SUM(d.impressions) FILTER (WHERE ${inPrev}), 0)::int AS prev_impressions,
      COALESCE(SUM(d.position_sum) FILTER (WHERE ${inPrev}), 0)::float8 AS prev_pos_sum
    FROM gsc_page_daily d
    JOIN gsc_pages p ON p.id = d.page_id
    WHERE p.article_id IS NOT NULL
      AND d.date >= ${lo}::text::date
      AND d.date <= ${to}::text::date
    GROUP BY p.article_id
  `);

  return {
    dailyThrough,
    range: { from: allHistory ? w.from : from, to },
    prevRange,
    rows: rows.map((r) => [
      r.article_id,
      {
        clicks: Number(r.clicks ?? 0),
        impressions: Number(r.impressions ?? 0),
        positionSum: Number(r.pos_sum ?? 0),
        prevClicks: Number(r.prev_clicks ?? 0),
        prevImpressions: Number(r.prev_impressions ?? 0),
        prevPositionSum: Number(r.prev_pos_sum ?? 0),
      },
    ]),
  };
}

// ── Read-through (scroll to 75 %) ───────────────────────────────────────────

export interface ReadThrough {
  /** Readers who opened the article (distinct daily visitors). */
  readers: number;
  /** …of whom reached three-quarters of the way down. */
  finished: number;
}

/** The part of `[from, to]` read-depth tracking covers, or null if none. */
export function scrollWindow(from: string, to: string): DateRange | null {
  if (to < SCROLL_TRACKING_SINCE) return null;
  return { from: laterDay(from, SCROLL_TRACKING_SINCE), to };
}

/**
 * Read-through for a bounded list of articles (the visible leaderboard page
 * and the "needs attention" candidates — never the whole catalogue), over the
 * part of the period read-depth tracking covers. Exact-path matches.
 */
async function queryReadThrough(
  slugs: readonly string[],
  from: string,
  to: string,
  resolve: (s: readonly string[]) => Promise<Map<string, string[]>> = resolveArticlePaths,
): Promise<Array<[string, ReadThrough]>> {
  const window = scrollWindow(from, to);
  if (!window || slugs.length === 0) return [];
  const pathMap = await resolve(slugs);
  const paths = Array.from(pathMap.values()).flat();
  if (paths.length === 0) return [];
  const { start, endExclusive } = toUtcRange(window);

  const rows = await db.execute<{ slug: string; readers: number; finished: number }>(sql`
    WITH ev AS (
      SELECT pathname, ${KL_DAY} AS day, visitor_hash, TRUE AS viewed, FALSE AS reached
      FROM analytics_events
      WHERE event_name = 'pageview'
        AND is_bot = FALSE
        AND created_at >= ${start} AND created_at < ${endExclusive}
        AND pathname = ANY (${textArrayParam(paths)})
        AND ${ARTIKEL_PATH_SCOPE}
      UNION ALL
      SELECT pathname, ${KL_DAY} AS day, visitor_hash, FALSE AS viewed, TRUE AS reached
      FROM analytics_events
      WHERE event_name = 'scroll_depth'
        AND is_bot = FALSE
        AND created_at >= ${start} AND created_at < ${endExclusive}
        AND pathname = ANY (${textArrayParam(paths)})
        AND props->>'percent' = '75'
    ),
    per_visitor AS (
      SELECT split_part(pathname, '/', 4) AS slug, day, visitor_hash,
             bool_or(viewed) AS viewed, bool_or(reached) AS reached
      FROM ev
      GROUP BY 1, 2, 3
    )
    SELECT slug,
           COUNT(*) FILTER (WHERE viewed)::int AS readers,
           COUNT(*) FILTER (WHERE viewed AND reached)::int AS finished
    FROM per_visitor
    GROUP BY slug
  `);
  return rows.map((r) => [
    r.slug,
    { readers: Number(r.readers ?? 0), finished: Number(r.finished ?? 0) },
  ]);
}

export interface SiteReadThrough {
  /** The covered part of the period; null = read-depth not tracked yet then. */
  range: DateRange | null;
  cur: ReadThrough | null;
  prev: ReadThrough | null;
}

/**
 * Read-through across ALL articles: of the daily visitors who opened an
 * article, how many reached 75 % of at least one.
 */
async function querySiteReadThrough(w: PeriodWindow): Promise<SiteReadThrough> {
  const curWin = scrollWindow(w.from, w.to);
  const prevWin = w.prevFrom && w.prevTo ? scrollWindow(w.prevFrom, w.prevTo) : null;
  if (!curWin) return { range: null, cur: null, prev: null };

  const one = async (win: DateRange): Promise<ReadThrough> => {
    const { start, endExclusive } = toUtcRange(win);
    const [r] = await db.execute<{ readers: number; finished: number }>(sql`
      WITH ev AS (
        SELECT ${KL_DAY} AS day, visitor_hash, TRUE AS viewed, FALSE AS reached
        FROM analytics_events
        WHERE event_name = 'pageview'
          AND is_bot = FALSE
          AND created_at >= ${start} AND created_at < ${endExclusive}
          AND ${ARTIKEL_PATH_SCOPE}
          AND split_part(pathname, '/', 4) <> ''
        UNION ALL
        SELECT ${KL_DAY} AS day, visitor_hash, FALSE AS viewed, TRUE AS reached
        FROM analytics_events
        WHERE event_name = 'scroll_depth'
          AND is_bot = FALSE
          AND created_at >= ${start} AND created_at < ${endExclusive}
          AND pathname LIKE '/artikel/%'
          AND props->>'percent' = '75'
      ),
      per_visitor AS (
        SELECT day, visitor_hash, bool_or(viewed) AS viewed, bool_or(reached) AS reached
        FROM ev GROUP BY day, visitor_hash
      )
      SELECT COUNT(*) FILTER (WHERE viewed)::int AS readers,
             COUNT(*) FILTER (WHERE viewed AND reached)::int AS finished
      FROM per_visitor
    `);
    return { readers: Number(r?.readers ?? 0), finished: Number(r?.finished ?? 0) };
  };

  const cur = await one(curWin);
  // Compare only like with like: a comparison window that read-depth tracking
  // only partly covers would compare a few days against a full period.
  const prevFull = prevWin && w.prevFrom && prevWin.from === w.prevFrom ? prevWin : null;
  const prev = prevFull ? await one(prevFull) : null;
  return { range: curWin, cur, prev };
}

// ── Launches ────────────────────────────────────────────────────────────────

export interface LaunchRow {
  slug: string;
  /** KL day the article went live. */
  publishedOn: string;
  first7: number;
  first30: number;
  /** Days it has been live, counting the publish day (caps how complete first30 is). */
  daysLive: number;
}

/** How many launches the panel lists at most. */
export const LAUNCH_LIMIT = 25;

/**
 * Articles that went live in the period (newest first, at most LAUNCH_LIMIT)
 * and their views over the first 7 and 30 days live.
 */
async function queryLaunches(from: string, to: string): Promise<LaunchRow[]> {
  const today = todayKL();
  const { start, endExclusive } = toUtcRange({ from, to });

  const rows = await db.execute<{
    slug: string;
    published_on: string;
    first7: number;
    first30: number;
  }>(sql`
    WITH a AS (
      SELECT slug, (published_at AT TIME ZONE 'Asia/Kuala_Lumpur')::date AS pub, published_at
      FROM articles
      WHERE status = 'published'
        AND published_at >= ${start}
        AND published_at < ${endExclusive}
      ORDER BY published_at DESC
      LIMIT ${LAUNCH_LIMIT}
    ),
    pv AS (
      SELECT split_part(pathname, '/', 4) AS slug, ${KL_DAY} AS day
      FROM analytics_events
      WHERE event_name = 'pageview'
        AND is_bot = FALSE
        AND ${ARTIKEL_PATH_SCOPE}
        AND created_at >= ${start}
        AND split_part(pathname, '/', 4) IN (SELECT slug FROM a)
    )
    SELECT a.slug, a.pub::text AS published_on,
           COUNT(pv.slug) FILTER (WHERE pv.day < a.pub + 7)::int AS first7,
           COUNT(pv.slug) FILTER (WHERE pv.day < a.pub + 30)::int AS first30
    FROM a
    LEFT JOIN pv ON pv.slug = a.slug AND pv.day >= a.pub
    GROUP BY a.slug, a.pub, a.published_at
    ORDER BY a.published_at DESC
  `);
  return rows.map((r) => ({
    slug: r.slug,
    publishedOn: r.published_on,
    first7: Number(r.first7 ?? 0),
    first30: Number(r.first30 ?? 0),
    daysLive: daysIn({ from: r.published_on, to: today }),
  }));
}

// ── Cached exports ──────────────────────────────────────────────────────────

export const getArticlePeriodViews = unstable_cache(
  queryArticleViews,
  ['article-perf:views'],
  CACHE_OPTS,
);
export const getArticleDailySeries = unstable_cache(
  queryDailySeries,
  ['article-perf:daily'],
  CACHE_OPTS,
);
export const getArticlePeriodGoogle = unstable_cache(
  queryArticleGoogle,
  ['article-perf:google'],
  CACHE_OPTS,
);
export const getArticleReadThrough = unstable_cache(
  async (slugs: readonly string[], from: string, to: string) =>
    queryReadThrough([...slugs].sort(), from, to),
  ['article-perf:read-through'],
  CACHE_OPTS,
);
export const getSiteReadThrough = unstable_cache(
  querySiteReadThrough,
  ['article-perf:site-read'],
  CACHE_OPTS,
);
export const getArticleLaunches = unstable_cache(
  queryLaunches,
  ['article-perf:launches'],
  CACHE_OPTS,
);

// Uncached, for tests.
export {
  queryArticleViews as getArticlePeriodViewsUncached,
  queryDailySeries as getArticleDailySeriesUncached,
  queryArticleGoogle as getArticlePeriodGoogleUncached,
  queryReadThrough as getArticleReadThroughUncached,
  querySiteReadThrough as getSiteReadThroughUncached,
  queryLaunches as getArticleLaunchesUncached,
};
