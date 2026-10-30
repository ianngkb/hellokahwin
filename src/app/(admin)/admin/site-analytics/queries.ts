import 'server-only';
import { sql, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import {
  DEFAULT_TRAFFIC,
  trafficFilter,
  pageFilter,
  countryFilter,
  regionFilter,
  type TrafficMode,
} from '@/lib/analytics/sql-filters';
import { getPreviousPeriod, toUtcRange, type DateRange } from '@/lib/admin/date-range';

// Ported from The Wedding Notebook's site-analytics queries — the `rawOnly`
// branch of each getter only. HelloKahwin has no rollup tables and no
// scheduler to maintain them, so every panel reads `analytics_events`
// directly. What keeps that fast (spec CAP-15):
//
//   1. Every query is bounded by `created_at >= $start AND created_at < $end`
//      on the BARE column, so `idx_analytics_events_created_at` (or a
//      composite led by the filter column) serves it. The range is capped at
//      366 days by the page; there is no "All time".
//   2. One scan per panel; top stats reads its scoped rows once.
//   3. `cached.ts` wraps each getter in a 10-minute `unstable_cache`.
//
// Re-exported so the page can import the range helpers alongside the getters.
export { getPreviousPeriod, type DateRange };

// Inlined as a SQL literal (not a bind parameter) because AT TIME ZONE with a
// parameterized zone causes runtime type-resolution failures. Used only to
// BUCKET rows into KL days in SELECT / GROUP BY — never on `created_at` inside
// a WHERE clause, which would make the predicate non-sargable.
const TZ = sql.raw(`'Asia/Kuala_Lumpur'`);

/**
 * The half-open UTC instant range covering the KL calendar days `from..to`,
 * as bound parameters: `[from 00:00+08, to+1 00:00+08)`.
 *
 * ISO strings, not Dates — see `toUtcRange` for why a `Date` cannot be bound
 * into a raw `sql` template. The `::timestamptz` cast pins the parameter type.
 */
function klWindow(from: string, to: string): { start: SQL; end: SQL } {
  const { start, endExclusive } = toUtcRange({ from, to });
  return {
    start: sql`${start}::timestamptz`,
    end: sql`${endExclusive}::timestamptz`,
  };
}

/** Every scoping predicate a panel can carry, as one fragment. */
function scope(
  { from, to }: DateRange,
  traffic: TrafficMode,
  page: string | undefined,
  country: string | undefined,
  region: string | undefined,
): SQL {
  const { start, end } = klWindow(from, to);
  return sql`created_at >= ${start}
    AND created_at < ${end}
    AND ${trafficFilter(traffic)}
    AND ${pageFilter(page)}
    AND ${countryFilter(country)}
    AND ${regionFilter(region)}`;
}

export interface TopStats {
  uniqueVisitors: number;
  totalVisits: number;
  totalPageviews: number;
  viewsPerVisit: number;
  bounceRate: number;
  avgVisitDuration: number; // seconds
}

/**
 * The six headline numbers. Definitions match twn-new:
 *   - visit = session (`session_id`); session-less events are excluded from
 *     the visit grain (they would otherwise collapse into one phantom visit);
 *   - bounce = a session with exactly one pageview;
 *   - duration = session span, capped at 1800s, over sessions with > 1 pageview;
 *   - unique visitors = distinct `visitor_hash` over ROWS, not over sessions —
 *     collapsing to one visitor per session undercounts anyone whose session
 *     spans more than one hash.
 *
 * `AS MATERIALIZED` is load-bearing: it makes Postgres read the scoped rows
 * ONCE and derive both the session rollup and the distinct-visitor count from
 * them. Without it the planner may inline `scoped` into both references and
 * scan the range twice.
 */
export async function getTopStats(
  range: DateRange,
  traffic: TrafficMode = DEFAULT_TRAFFIC,
  page?: string,
  country?: string,
  region?: string,
): Promise<TopStats> {
  const rows = await db.execute<{
    unique_visitors: string;
    total_visits: string;
    total_pageviews: string;
    bounce_rate: string;
    avg_visit_duration: string;
  }>(sql`
    WITH scoped AS MATERIALIZED (
      SELECT session_id, visitor_hash, event_name, created_at
      FROM analytics_events
      WHERE ${scope(range, traffic, page, country, region)}
    ),
    session_stats AS (
      SELECT
        session_id,
        COUNT(*) FILTER (WHERE event_name = 'pageview') AS pv_count,
        EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) AS duration_secs
      FROM scoped
      WHERE session_id IS NOT NULL
      GROUP BY session_id
    )
    SELECT
      (SELECT COUNT(DISTINCT visitor_hash) FROM scoped) AS unique_visitors,
      COUNT(*) AS total_visits,
      SUM(pv_count) AS total_pageviews,
      ROUND(
        COUNT(*) FILTER (WHERE pv_count = 1)::numeric / NULLIF(COUNT(*), 0) * 100,
        1
      ) AS bounce_rate,
      ROUND(AVG(LEAST(duration_secs, 1800)) FILTER (WHERE pv_count > 1), 0) AS avg_visit_duration
    FROM session_stats
  `);

  const r = rows[0];
  const totalVisits = Number(r?.total_visits ?? 0);
  const totalPageviews = Number(r?.total_pageviews ?? 0);
  return {
    uniqueVisitors: Number(r?.unique_visitors ?? 0),
    totalVisits,
    totalPageviews,
    viewsPerVisit: totalVisits > 0 ? Math.round((totalPageviews / totalVisits) * 10) / 10 : 0,
    bounceRate: Number(r?.bounce_rate ?? 0),
    avgVisitDuration: Number(r?.avg_visit_duration ?? 0),
  };
}

export interface ChartDataPoint {
  date: string;
  unique_visitors: number;
  total_visits: number;
  total_pageviews: number;
  bounce_rate: number;
  avg_visit_duration: number;
  views_per_visit: number;
}

/**
 * The same six metrics per KL day. Sessions are grouped PER DAY here (unlike
 * getTopStats, which groups over the whole range), so a session crossing KL
 * midnight counts as a visit on each day it touched.
 */
export async function getChartData(
  range: DateRange,
  traffic: TrafficMode = DEFAULT_TRAFFIC,
  page?: string,
  country?: string,
  region?: string,
): Promise<ChartDataPoint[]> {
  const rows = await db.execute<{
    date: string;
    unique_visitors: string;
    total_visits: string;
    total_pageviews: string;
    bounce_rate: string;
    avg_visit_duration: string;
  }>(sql`
    WITH scoped AS MATERIALIZED (
      SELECT
        DATE(created_at AT TIME ZONE ${TZ}) AS day,
        session_id,
        visitor_hash,
        event_name,
        created_at
      FROM analytics_events
      WHERE ${scope(range, traffic, page, country, region)}
    ),
    session_stats AS (
      SELECT
        day,
        session_id,
        COUNT(*) FILTER (WHERE event_name = 'pageview') AS pv_count,
        EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) AS duration_secs
      FROM scoped
      WHERE session_id IS NOT NULL
      GROUP BY day, session_id
    ),
    daily_sessions AS (
      SELECT
        day,
        COUNT(*) AS total_visits,
        SUM(pv_count) AS total_pageviews,
        ROUND(COUNT(*) FILTER (WHERE pv_count = 1)::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS bounce_rate,
        ROUND(AVG(LEAST(duration_secs, 1800)) FILTER (WHERE pv_count > 1), 0) AS avg_visit_duration
      FROM session_stats
      GROUP BY day
    ),
    daily_visitors AS (
      SELECT day, COUNT(DISTINCT visitor_hash) AS unique_visitors
      FROM scoped
      GROUP BY day
    )
    SELECT
      to_char(dv.day, 'YYYY-MM-DD') AS date,
      dv.unique_visitors,
      COALESCE(ds.total_visits, 0) AS total_visits,
      COALESCE(ds.total_pageviews, 0) AS total_pageviews,
      COALESCE(ds.bounce_rate, 0) AS bounce_rate,
      COALESCE(ds.avg_visit_duration, 0) AS avg_visit_duration
    FROM daily_visitors dv
    LEFT JOIN daily_sessions ds ON ds.day = dv.day
    ORDER BY dv.day
  `);

  const byDate = new Map(rows.map((r) => [r.date, r]));
  // One point per KL day across the WHOLE range, zeros for days without
  // events — otherwise the chart would interpolate straight across a gap.
  return eachDay(range.from, range.to).map((date) => {
    const r = byDate.get(date);
    const tv = Number(r?.total_visits ?? 0);
    const tp = Number(r?.total_pageviews ?? 0);
    return {
      date,
      unique_visitors: Number(r?.unique_visitors ?? 0),
      total_visits: tv,
      total_pageviews: tp,
      bounce_rate: Number(r?.bounce_rate ?? 0),
      avg_visit_duration: Number(r?.avg_visit_duration ?? 0),
      views_per_visit: tv > 0 ? Math.round((tp / tv) * 10) / 10 : 0,
    };
  });
}

/** Every `yyyy-MM-dd` from `from` to `to` inclusive (UTC arithmetic; no zone involved). */
function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  const d = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (d <= end) {
    days.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
}

export interface TableRow {
  name: string;
  visitors: number;
  pct: number;
}

function toTableRows(rows: Array<{ name: string; visitors: string }>): TableRow[] {
  const total = rows.reduce((s, r) => s + Number(r.visitors), 0);
  return rows.map((r) => ({
    name: r.name,
    visitors: Number(r.visitors),
    pct: total > 0 ? Math.round((Number(r.visitors) / total) * 100) : 0,
  }));
}

/**
 * One "top N by distinct visitors" panel over a single dimension expression.
 *
 * `name ASC` breaks ties so the LIMIT picks the same rows on every refresh
 * instead of reshuffling a tie for no reason.
 */
async function dimensionTable(
  range: DateRange,
  traffic: TrafficMode,
  page: string | undefined,
  country: string | undefined,
  region: string | undefined,
  expression: SQL,
  limit = 20,
): Promise<TableRow[]> {
  const rows = await db.execute<{ name: string; visitors: string }>(sql`
    SELECT ${expression} AS name, COUNT(DISTINCT visitor_hash) AS visitors
    FROM analytics_events
    WHERE ${scope(range, traffic, page, country, region)}
    GROUP BY 1
    ORDER BY visitors DESC, name ASC
    LIMIT ${sql.raw(String(limit))}
  `);
  return toTableRows(rows);
}

export async function getSources(
  range: DateRange,
  traffic: TrafficMode = DEFAULT_TRAFFIC,
  page?: string,
  country?: string,
  region?: string,
): Promise<TableRow[]> {
  // Referrer host: empty → `Direct / None`; otherwise lower-case it, strip the
  // scheme and a leading `www.`, everything from the first `/`, `?` or `#`,
  // and any `:port` — so `Google.com`, `google.com:443` and `google.com` are
  // one row. `\\.` in this JS template is the single backslash-dot Postgres
  // receives.
  return dimensionTable(
    range,
    traffic,
    page,
    country,
    region,
    sql`CASE
          WHEN referrer IS NULL OR referrer = '' THEN 'Direct / None'
          ELSE REGEXP_REPLACE(
            REGEXP_REPLACE(
              REGEXP_REPLACE(LOWER(referrer), '^https?://(www\\.)?', ''),
              '[/?#].*$', ''
            ),
            ':[0-9]+$', ''
          )
        END`,
  );
}

export async function getUtmSources(
  range: DateRange,
  traffic: TrafficMode = DEFAULT_TRAFFIC,
  page?: string,
  country?: string,
  region?: string,
): Promise<TableRow[]> {
  return dimensionTable(
    range,
    traffic,
    page,
    country,
    region,
    sql`COALESCE(NULLIF(utm_source, ''), '(none)')`,
  );
}

export async function getUtmMediums(
  range: DateRange,
  traffic: TrafficMode = DEFAULT_TRAFFIC,
  page?: string,
  country?: string,
  region?: string,
): Promise<TableRow[]> {
  return dimensionTable(
    range,
    traffic,
    page,
    country,
    region,
    sql`COALESCE(NULLIF(utm_medium, ''), '(none)')`,
  );
}

export async function getUtmCampaigns(
  range: DateRange,
  traffic: TrafficMode = DEFAULT_TRAFFIC,
  page?: string,
  country?: string,
  region?: string,
): Promise<TableRow[]> {
  return dimensionTable(
    range,
    traffic,
    page,
    country,
    region,
    sql`COALESCE(NULLIF(utm_campaign, ''), '(none)')`,
  );
}

export async function getTopPages(
  range: DateRange,
  traffic: TrafficMode = DEFAULT_TRAFFIC,
  page?: string,
  country?: string,
  region?: string,
): Promise<TableRow[]> {
  const rows = await db.execute<{ name: string; visitors: string }>(sql`
    SELECT COALESCE(NULLIF(pathname, ''), '/') AS name, COUNT(DISTINCT visitor_hash) AS visitors
    FROM analytics_events
    WHERE event_name = 'pageview'
      AND ${scope(range, traffic, page, country, region)}
    GROUP BY 1
    ORDER BY visitors DESC, name ASC
    LIMIT 20
  `);
  return toTableRows(rows);
}

/**
 * Entry / Exit Pages — the first (or last) pageview of each session across the
 * whole range (`DISTINCT ON (session_id)`). Session-less pageviews are
 * excluded: they have no visit to be the entry or exit of.
 */
async function entryExitTable(
  range: DateRange,
  traffic: TrafficMode,
  page: string | undefined,
  country: string | undefined,
  region: string | undefined,
  which: 'entry' | 'exit',
): Promise<TableRow[]> {
  const direction = which === 'entry' ? sql.raw('ASC') : sql.raw('DESC');
  const rows = await db.execute<{ name: string; visitors: string }>(sql`
    SELECT COALESCE(NULLIF(pathname, ''), '/') AS name, COUNT(DISTINCT visitor_hash) AS visitors
    FROM (
      SELECT DISTINCT ON (session_id) session_id, visitor_hash, pathname
      FROM analytics_events
      WHERE event_name = 'pageview'
        AND session_id IS NOT NULL
        AND ${scope(range, traffic, page, country, region)}
      ORDER BY session_id, created_at ${direction}, id ${direction}
    ) picked
    GROUP BY 1
    ORDER BY visitors DESC, name ASC
    LIMIT 20
  `);
  return toTableRows(rows);
}

export async function getEntryPages(
  range: DateRange,
  traffic: TrafficMode = DEFAULT_TRAFFIC,
  page?: string,
  country?: string,
  region?: string,
): Promise<TableRow[]> {
  return entryExitTable(range, traffic, page, country, region, 'entry');
}

export async function getExitPages(
  range: DateRange,
  traffic: TrafficMode = DEFAULT_TRAFFIC,
  page?: string,
  country?: string,
  region?: string,
): Promise<TableRow[]> {
  return entryExitTable(range, traffic, page, country, region, 'exit');
}

/**
 * Countries. Deliberately takes NO country/region: it is the navigator used to
 * change the country, so scoping it would hide the rows you click to move.
 */
export async function getCountries(
  range: DateRange,
  traffic: TrafficMode = DEFAULT_TRAFFIC,
  page?: string,
): Promise<TableRow[]> {
  return dimensionTable(
    range,
    traffic,
    page,
    undefined,
    undefined,
    sql`COALESCE(NULLIF(country, ''), 'Unknown')`,
  );
}

/**
 * States, as subdivision CODES (e.g. `10`) — named for display by
 * `regionName`. Scoped to the country but NOT the region: it is the navigator
 * within the country.
 */
export async function getStates(
  range: DateRange,
  traffic: TrafficMode = DEFAULT_TRAFFIC,
  page?: string,
  country?: string,
): Promise<TableRow[]> {
  return dimensionTable(
    range,
    traffic,
    page,
    country,
    undefined,
    sql`COALESCE(NULLIF(region, ''), 'Unknown')`,
  );
}

export async function getCities(
  range: DateRange,
  traffic: TrafficMode = DEFAULT_TRAFFIC,
  page?: string,
  country?: string,
  region?: string,
): Promise<TableRow[]> {
  return dimensionTable(
    range,
    traffic,
    page,
    country,
    region,
    sql`COALESCE(NULLIF(city, ''), 'Unknown')`,
  );
}

export async function getBrowsers(
  range: DateRange,
  traffic: TrafficMode = DEFAULT_TRAFFIC,
  page?: string,
  country?: string,
  region?: string,
): Promise<TableRow[]> {
  return dimensionTable(
    range,
    traffic,
    page,
    country,
    region,
    sql`COALESCE(NULLIF(browser, ''), 'Unknown')`,
  );
}

export async function getOperatingSystems(
  range: DateRange,
  traffic: TrafficMode = DEFAULT_TRAFFIC,
  page?: string,
  country?: string,
  region?: string,
): Promise<TableRow[]> {
  return dimensionTable(
    range,
    traffic,
    page,
    country,
    region,
    sql`COALESCE(NULLIF(os, ''), 'Unknown')`,
  );
}

export async function getScreenSizes(
  range: DateRange,
  traffic: TrafficMode = DEFAULT_TRAFFIC,
  page?: string,
  country?: string,
  region?: string,
): Promise<TableRow[]> {
  // Only ever four buckets; 100 is an effectively-unbounded cap.
  return dimensionTable(
    range,
    traffic,
    page,
    country,
    region,
    sql`CASE
          WHEN screen_width IS NULL THEN 'Unknown'
          WHEN screen_width < 768 THEN 'Mobile'
          WHEN screen_width < 1024 THEN 'Tablet'
          ELSE 'Desktop'
        END`,
    100,
  );
}

/**
 * Distinct pathnames matching a search query within the range, ordered by
 * visitor count. Powers the page-search box.
 */
export async function searchPages(
  range: DateRange,
  traffic: TrafficMode = DEFAULT_TRAFFIC,
  query: string,
): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Escape LIKE metacharacters so a literal % or _ in the query is matched
  // literally, not as a wildcard (default ESCAPE is backslash).
  const likePattern = `%${trimmed.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
  const { start, end } = klWindow(range.from, range.to);

  const rows = await db.execute<{ pathname: string }>(sql`
    SELECT pathname, COUNT(DISTINCT visitor_hash) AS visitors
    FROM analytics_events
    WHERE event_name = 'pageview'
      AND created_at >= ${start}
      AND created_at < ${end}
      AND ${trafficFilter(traffic)}
      AND pathname IS NOT NULL
      AND pathname ILIKE ${likePattern}
    GROUP BY pathname
    ORDER BY visitors DESC, pathname ASC
    LIMIT 30
  `);
  return rows.map((r) => r.pathname);
}

export interface TrafficCounts {
  humans: number;
  bots: number;
  total: number;
}

/**
 * Distinct-visitor counts per traffic bucket, for the Humans / Bots / All
 * toggle labels. Spans BOTH buckets by design, so traffic mode is never a
 * filter here. One distinct pass: group by visitor once, then count per-visitor
 * bot status with bool_or (a visitor with both human and bot rows counts in
 * both buckets; total = distinct visitors).
 */
export async function getTrafficCounts(
  range: DateRange,
  page?: string,
  country?: string,
  region?: string,
): Promise<TrafficCounts> {
  const rows = await db.execute<{ humans: string; bots: string; total: string }>(sql`
    SELECT
      COUNT(*) FILTER (WHERE is_human) AS humans,
      COUNT(*) FILTER (WHERE is_bot_visitor) AS bots,
      COUNT(*) AS total
    FROM (
      SELECT
        visitor_hash,
        bool_or(is_bot = FALSE) AS is_human,
        bool_or(is_bot = TRUE) AS is_bot_visitor
      FROM analytics_events
      WHERE ${scope(range, 'all', page, country, region)}
      GROUP BY visitor_hash
    ) v
  `);
  const r = rows[0];
  return {
    humans: Number(r?.humans ?? 0),
    bots: Number(r?.bots ?? 0),
    total: Number(r?.total ?? 0),
  };
}
