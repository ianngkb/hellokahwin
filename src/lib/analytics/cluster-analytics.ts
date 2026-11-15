import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { sql, type SQL } from 'drizzle-orm';
import { format, subDays } from 'date-fns';
import { db } from '@/lib/db/drizzle';
import { getKLToday, toUtcRange } from '@/lib/admin/date-range';
import {
  clusterAnalyticsTag,
  getShownSeriesForArticles,
  loadClusterMembers,
} from './cluster-scope';
import { SERIES_BOX_VIEWED_EVENT, SERIES_LINK_CLICKED_EVENT } from './series-events';
import { resolveArticlePaths, textArrayParam } from './article-paths';
import { detailWindowFloor, ARTIKEL_PATH_SCOPE } from './article-views';
import { addCounts, toCount } from './article-compare';
import type { ClusterWindow } from './cluster-window';
import { ARTICLE_LINK_CLICK_EVENT } from './link-click-tracking';

/**
 * Cluster analytics (R16–R21): how a hand-picked group of articles
 * performs together — `/admin/inspire/clusters/[id]/analytics`.
 *
 * TWO STATEMENTS, ALL MEMBERS AT ONCE.
 *   1. pageviews — ONE scan of the members' pageviews giving (a) per member:
 *      views and daily-unique visitors (one `GROUP BY slug, visitor_hash`
 *      pass, no COUNT(DISTINCT)), and (b) per session (the tracker's own
 *      `session_id`: 30-minute inactivity, 100 % populated on article
 *      pageviews), the visit's member pageviews in time order with consecutive
 *      repeats of the same article collapsed by `LAG()` (A, A, B → A, B). From
 *      EVERY such visit — nothing is capped — SQL returns two small summaries:
 *        - visit shapes: (last article, distinct articles read) → visits, at
 *          most members × members rows. Visits, "read 2+ cluster articles",
 *          articles per visit and last stop are exact sums over these.
 *        - moves: (from, to) → how often a visit went straight from one to
 *          the other (`LEAD()` over the collapsed steps), at most members²
 *          rows. Every move counts, so A, B, A, B is A→B twice and B→A once.
 *      Both are bounded by the member count whatever the traffic; the cached
 *      entry stores them as member indices (no slug text) under a byte budget
 *      (`compactPageviews`), since Next's cache refuses entries over ~2 MB.
 *   2. clicks  — `article_link_click` events (see queryLinkClicks), no session or
 *      visitor grouping: in-body links out of a member, resolved to
 *      their target member in TS (`linkTargetSlug`).
 *
 * ORDER WITHIN A VISIT is `created_at`. /collect stamps each row at
 * `now() − its client queue age` plus one microsecond per queue position
 * (`batchCreatedAt`), so two pageviews flushed together keep their real order —
 * also when the tracker split a big queue over several requests (I-F2).
 * Rows written before that shipped share their batch's instant; such a tie is
 * broken by slug — deterministic, but for those historical ties only it is
 * not the reading order.
 *
 * Statement 1 matches `pathname = ANY(<member paths>)` + the partial-index
 * scope `ARTIKEL_PATH_SCOPE` + an explicit window floor: index probes on the
 * resolved exact paths, never a `split_part` in WHERE (the T1 bug). Rows with
 * `session_id IS NULL` (historical only) count toward views but not sessions.
 * A session crossing the window edge is counted by its in-window pageviews
 * only. The page loads the cluster's members ONCE (`loadClusterAnalytics`) and
 * hands that same snapshot to every getter, so labels and numbers always
 * describe the same members. Every getter is cached 600 s under
 * `article-analytics` and the cluster's own `cluster-analytics:<id>` tag
 * (revalidated by every clusters admin action), and the page runs each
 * through `safePanel` in `runBatched(…, 3)`.
 */

const CACHE_TAG = 'article-analytics';

export { LINK_CLICKS_SINCE, SERIES_BOX_SINCE } from './cluster-window';

// ── Types ───────────────────────────────────────────────────────────────────

/** What the getters read: the cluster's members and their resolved paths. */
export interface ClusterScope {
  /** Member slugs, in member order. Parallel to `memberIds`. */
  slugs: string[];
  /** Member article ids, in member order. Parallel to `slugs`. */
  memberIds: string[];
  /** Every resolved path of every member (see article-paths.ts). */
  paths: string[];
}

export interface ClusterMemberRow {
  slug: string;
  /** Pageviews in the window (a refresh counts again). */
  views: number;
  /** Distinct visitors (daily-unique, `visitor_hash` rotates daily). */
  uniqueVisitors: number;
  /** Visits whose last cluster article was this one. */
  lastStops: number;
  /** `lastStops` ÷ all cluster visits (0–1); 0 when there are none. */
  lastStopShare: number;
}

export interface ClusterOverview {
  /** One row per member, in member order. */
  members: ClusterMemberRow[];
  /** Visits (sessions) that read at least one member. */
  visits: number;
  /** Visits that read 2+ DIFFERENT members. */
  flowSessions: number;
  /** `flowSessions ÷ visits` (0–1) — "Read 2+ cluster articles". */
  flowRate: number;
  /** Σ distinct members per visit ÷ visits; 0 when there are no visits. */
  articlesPerVisit: number;
}

export interface ClusterTransition {
  from: string;
  to: string;
  /** Times a visit went straight from `from` to `to` (every move counts). */
  moves: number;
}

export interface ClusterLinkClick {
  fromArticleId: string;
  toSlug: string;
  /** Raw clicks (the table has no visitor, so not de-duplicated). */
  clicks: number;
}

/** Visits that ended on `lastSlug` having read `distinctReads` different members. */
export interface VisitShape {
  lastSlug: string;
  distinctReads: number;
  sessions: number;
}

/** A from→to move and how often visits made it. */
export interface MoveRow {
  from: string;
  to: string;
  moves: number;
}

// ── Pure maths (unit-tested; the page shows exactly these numbers) ──────────

export interface VisitSummary {
  visits: number;
  flowSessions: number;
  /** Σ distinct members per visit. */
  distinctReads: number;
  /** Per slug, visits that ended on it. */
  lastStops: Map<string, number>;
}

/**
 * Visits, read-2+, articles read and last stops from the visit shapes. A
 * shape whose last slug is not a member is ignored (defensive: every resolved
 * path's 4th segment is a member slug), as is one with no sessions or no
 * article read.
 */
export function summariseVisits(
  shapes: readonly VisitShape[],
  members: readonly string[],
): VisitSummary {
  const memberSet = new Set(members);
  const lastStops = new Map<string, number>();
  let visits = 0;
  let flowSessions = 0;
  let distinctReads = 0;
  for (const shape of shapes) {
    const sessions = toCount(shape.sessions);
    const distinct = Math.min(toCount(shape.distinctReads), memberSet.size);
    if (sessions === 0 || distinct === 0 || !memberSet.has(shape.lastSlug)) continue;
    visits = addCounts(visits, sessions);
    distinctReads = addCounts(distinctReads, distinct * sessions);
    if (distinct >= 2) flowSessions = addCounts(flowSessions, sessions);
    lastStops.set(shape.lastSlug, addCounts(lastStops.get(shape.lastSlug) ?? 0, sessions));
  }
  return { visits, flowSessions, distinctReads, lastStops };
}

/**
 * "Where readers went next" (R18) from the move rows: moves between two
 * DIFFERENT members only (a self-move cannot come out of the collapse; kept
 * explicit), duplicates summed, most-travelled first.
 */
export function clusterTransitions(
  rows: readonly MoveRow[],
  members: readonly string[],
): ClusterTransition[] {
  const memberSet = new Set(members);
  const out = new Map<string, ClusterTransition>();
  for (const r of rows) {
    const moves = toCount(r.moves);
    if (moves === 0 || r.from === r.to) continue;
    if (!memberSet.has(r.from) || !memberSet.has(r.to)) continue;
    const key = `${r.from}\n${r.to}`;
    const t = out.get(key) ?? { from: r.from, to: r.to, moves: 0 };
    t.moves = addCounts(t.moves, moves);
    out.set(key, t);
  }
  return [...out.values()].sort(
    (a, b) => b.moves - a.moves || a.from.localeCompare(b.from) || a.to.localeCompare(b.to),
  );
}

const OWN_HOSTS = new Set(['hellokahwin.com', 'www.hellokahwin.com']);

/**
 * The article slug an in-body link points at, or null when it is not an
 * `/artikel/{category}/{slug}` link on our site. Query string and fragment are
 * stripped, trailing slashes ignored, so `/artikel/c/slug/?utm=x#top` → `slug`.
 * Absolute links count only on our own host.
 */
export function linkTargetSlug(href: string): string | null {
  if (typeof href !== 'string') return null;
  let path: string;
  const trimmed = href.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    path = trimmed;
  } else {
    try {
      const url = new URL(trimmed.startsWith('//') ? `https:${trimmed}` : trimmed);
      if (!OWN_HOSTS.has(url.hostname.toLowerCase())) return null;
      path = url.pathname;
    } catch {
      return null;
    }
  }
  path = path.split('#')[0].split('?')[0].replace(/\/+$/, '');
  const parts = path.split('/');
  if (parts.length !== 4 || parts[0] !== '' || parts[1] !== 'artikel') return null;
  const [, , category, slug] = parts;
  if (!category || !slug) return null;
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

/**
 * Link-click rows → clicks between DIFFERENT members. A row counts when it was
 * clicked on a member and its href resolves to another member's slug; links to
 * non-members, to the article itself, or that do not resolve are dropped.
 * Rows for the same (from, to) — e.g. `/x` and `/x/?utm=y` — are summed.
 */
export function clusterLinkClicksFromRows(
  rows: readonly { articleId: string; href: string; clicks: number }[],
  scope: Pick<ClusterScope, 'slugs' | 'memberIds'>,
): ClusterLinkClick[] {
  const slugById = new Map(scope.memberIds.map((id, i) => [id, scope.slugs[i]]));
  const members = new Set(scope.slugs);
  const out = new Map<string, ClusterLinkClick>();
  for (const r of rows) {
    const fromSlug = slugById.get(r.articleId);
    if (fromSlug === undefined) continue;
    const toSlug = linkTargetSlug(r.href);
    if (toSlug === null || !members.has(toSlug) || toSlug === fromSlug) continue;
    const clicks = toCount(r.clicks);
    if (clicks === 0) continue;
    const key = `${r.articleId}\n${toSlug}`;
    const prev = out.get(key);
    out.set(key, {
      fromArticleId: r.articleId,
      toSlug,
      clicks: addCounts(prev?.clicks ?? 0, clicks),
    });
  }
  return [...out.values()].sort(
    (a, b) =>
      b.clicks - a.clicks ||
      a.fromArticleId.localeCompare(b.fromArticleId) ||
      a.toSlug.localeCompare(b.toSlug),
  );
}

/** Totals + visit shapes → the overview, one row per member in member order. */
export function buildClusterOverview(
  slugs: readonly string[],
  totals: ReadonlyMap<string, { views: number; uniqueVisitors: number }>,
  shapes: readonly VisitShape[],
): ClusterOverview {
  return overviewFromSummary(slugs, totals, summariseVisits(shapes, slugs));
}

/** Totals + an already-summarised set of visits → the overview (see buildClusterOverview). */
export function overviewFromSummary(
  slugs: readonly string[],
  totals: ReadonlyMap<string, { views: number; uniqueVisitors: number }>,
  s: VisitSummary,
): ClusterOverview {
  const share = (n: number) => (s.visits > 0 ? n / s.visits : 0);
  return {
    members: slugs.map((slug) => {
      const lastStops = s.lastStops.get(slug) ?? 0;
      return {
        slug,
        views: totals.get(slug)?.views ?? 0,
        uniqueVisitors: totals.get(slug)?.uniqueVisitors ?? 0,
        lastStops,
        lastStopShare: share(lastStops),
      };
    }),
    visits: s.visits,
    flowSessions: s.flowSessions,
    flowRate: share(s.flowSessions),
    articlesPerVisit: share(s.distinctReads),
  };
}

// ── Window ──────────────────────────────────────────────────────────────────

/**
 * The window as KL calendar days including today: `window = 30` is today and
 * the 29 days before it. Returns the first day (for the daily clicks table)
 * and its KL-midnight instant in UTC (for raw events), so both sources cover
 * exactly the same days.
 */
export function clusterWindowFloor(window: ClusterWindow): { day: string; utc: string } {
  const day = format(subDays(getKLToday(), window - 1), 'yyyy-MM-dd');
  return { day, utc: toUtcRange({ from: day, to: day }).start };
}

// ── Statements ──────────────────────────────────────────────────────────────

/** What the one pageview statement returns: per-member totals + the visit summaries. */
export interface ClusterPageviews {
  totals: Map<string, { views: number; uniqueVisitors: number }>;
  /** Every visit, summarised by (last article, distinct articles read). */
  shapes: VisitShape[];
  /** Every move between two consecutive (collapsed) steps of a visit. */
  moves: MoveRow[];
}

/**
 * ONE scan of the members' pageviews feeds the totals, the visit shapes and
 * the moves (`v` is referenced more than once, so Postgres materialises it
 * once). Matched on the exact member paths + ARTIKEL_PATH_SCOPE + the window
 * floor, it is an index-only scan on idx_analytics_events_artikel_pageview
 * (key: pathname, created_at, visitor_hash, session_id) — TWN measured that
 * without session_id every matched row is a random heap read (~49K for its
 * five most-viewed articles over 12 months, past an 8 s statement_timeout,
 * 2026-11-08). So this statement must read no column outside (pathname,
 * created_at, visitor_hash, session_id).
 *
 *   - totals: one `GROUP BY slug, visitor_hash` pass → views + daily-unique
 *     visitors per member (no COUNT(DISTINCT)); rows without a session count.
 *   - steps: per session, member pageviews in `created_at` order (see the
 *     header on ties), a step dropped when it repeats the previous step's
 *     article — the collapse, `LAG()`; `LEAD()` over what is left gives each
 *     step's next article (NULL on the visit's last step).
 *   - shapes: per visit its last step's article and the number of different
 *     articles it read (a `GROUP BY session_id, slug` pass, no
 *     COUNT(DISTINCT)), then visits counted per (last, distinct).
 *   - moves: every (step, next step) pair counted per (from, to) — no
 *     per-visit de-duplication, so a visit going A→B twice counts two.
 * Nothing is capped: shapes are ≤ members² rows, moves ≤ members² rows.
 */
async function queryPageviews(
  scope: ClusterScope,
  window: ClusterWindow,
): Promise<ClusterPageviews> {
  const totals = new Map<string, { views: number; uniqueVisitors: number }>();
  if (scope.paths.length === 0) return { totals, shapes: [], moves: [] };
  const rows = await db.execute<{
    kind: 'total' | 'shape' | 'move';
    slug: string;
    other: string | null;
    a: string;
    b: string | null;
  }>(sql`
    WITH v AS (
      SELECT split_part(pathname, '/', 4) AS slug, visitor_hash, session_id, created_at
      FROM analytics_events
      WHERE event_name = 'pageview'
        AND is_bot = FALSE
        AND ${detailWindowFloor}
        AND created_at >= ${clusterWindowFloor(window).utc}
        AND pathname = ANY (${textArrayParam(scope.paths)})
        AND ${ARTIKEL_PATH_SCOPE}
    ),
    per_visitor AS (
      SELECT slug, visitor_hash, COUNT(*) AS n
      FROM v
      GROUP BY slug, visitor_hash
    ),
    totals AS (
      SELECT slug, SUM(n)::bigint AS views, COUNT(*)::bigint AS unique_visitors
      FROM per_visitor
      GROUP BY slug
    ),
    ordered AS (
      SELECT session_id, slug, created_at,
             LAG(slug) OVER (PARTITION BY session_id ORDER BY created_at, slug) AS prev_slug
      FROM v
      WHERE session_id IS NOT NULL
    ),
    steps AS (
      SELECT session_id, slug,
             LEAD(slug) OVER (PARTITION BY session_id ORDER BY created_at, slug) AS next_slug
      FROM ordered
      WHERE prev_slug IS DISTINCT FROM slug
    ),
    reads AS (
      SELECT session_id, COUNT(*) AS distinct_reads
      FROM (SELECT session_id, slug FROM steps GROUP BY session_id, slug) AS read_once
      GROUP BY session_id
    ),
    shapes AS (
      SELECT s.slug AS last_slug, r.distinct_reads, COUNT(*)::bigint AS sessions
      FROM steps s
      JOIN reads r ON r.session_id = s.session_id
      WHERE s.next_slug IS NULL
      GROUP BY s.slug, r.distinct_reads
    ),
    moves AS (
      SELECT slug AS from_slug, next_slug AS to_slug, COUNT(*)::bigint AS moves
      FROM steps
      WHERE next_slug IS NOT NULL
      GROUP BY slug, next_slug
    )
    SELECT 'total' AS kind, slug, NULL::text AS other, views AS a, unique_visitors AS b
    FROM totals
    UNION ALL
    SELECT 'shape' AS kind, last_slug AS slug, NULL::text AS other, sessions AS a,
           distinct_reads AS b
    FROM shapes
    UNION ALL
    SELECT 'move' AS kind, from_slug AS slug, to_slug AS other, moves AS a, NULL::bigint AS b
    FROM moves
  `);
  const shapes: VisitShape[] = [];
  const moves: MoveRow[] = [];
  for (const r of rows) {
    if (!r.slug) continue;
    if (r.kind === 'total') {
      totals.set(r.slug, { views: toCount(r.a), uniqueVisitors: toCount(r.b) });
    } else if (r.kind === 'shape') {
      shapes.push({ lastSlug: r.slug, distinctReads: toCount(r.b), sessions: toCount(r.a) });
    } else if (r.kind === 'move' && r.other) {
      moves.push({ from: r.slug, to: r.other, moves: toCount(r.a) });
    }
  }
  return { totals, shapes, moves };
}

/**
 * In-body link clicks between members. HelloKahwin port: TWN keeps a daily
 * `article_link_clicks` table fed by its own beacon endpoint; here the public
 * `ArticleClickTracker` records each click as an `article_link_click` event in
 * `analytics_events` (props `href`), on the article's own pathname. So the
 * click's FROM article is the pathname's slug (matched on the members' exact
 * paths — an index probe), and its TO article comes from `href`.
 */
async function queryLinkClicks(
  scope: ClusterScope,
  window: ClusterWindow,
): Promise<ClusterLinkClick[]> {
  // Fewer than two members: there is nothing "between" them to count.
  if (scope.slugs.length < 2 || scope.paths.length === 0) return [];
  const rows = await db.execute<{ slug: string; href: string | null; clicks: string }>(sql`
    SELECT split_part(pathname, '/', 4) AS slug, props->>'href' AS href, COUNT(*)::bigint AS clicks
    FROM analytics_events
    WHERE event_name = ${ARTICLE_LINK_CLICK_EVENT}
      AND is_bot = FALSE
      AND created_at >= ${clusterWindowFloor(window).utc}
      AND pathname = ANY (${textArrayParam(scope.paths)})
    GROUP BY 1, 2
  `);
  const idBySlug = new Map(scope.slugs.map((slug, i) => [slug, scope.memberIds[i]]));
  return clusterLinkClicksFromRows(
    rows.flatMap((r) => {
      const articleId = idBySlug.get(r.slug);
      return articleId && r.href ? [{ articleId, href: r.href, clicks: toCount(r.clicks) }] : [];
    }),
    scope,
  );
}

// ── Uncached getters (the canary runs these on a synthetic cluster) ──────────

function toScope(
  slugs: readonly string[],
  paths: readonly string[],
  memberIds: readonly string[],
): ClusterScope {
  return { slugs: [...slugs], paths: [...paths], memberIds: [...memberIds] };
}

export async function getClusterOverviewUncached(
  slugs: readonly string[],
  paths: readonly string[],
  memberIds: readonly string[],
  window: ClusterWindow,
): Promise<ClusterOverview> {
  const scope = toScope(slugs, paths, memberIds);
  const pv = await queryPageviews(scope, window);
  return buildClusterOverview(scope.slugs, pv.totals, pv.shapes);
}

export async function getClusterJourneyUncached(
  slugs: readonly string[],
  paths: readonly string[],
  memberIds: readonly string[],
  window: ClusterWindow,
): Promise<ClusterTransition[]> {
  const scope = toScope(slugs, paths, memberIds);
  const { moves } = await queryPageviews(scope, window);
  return clusterTransitions(moves, scope.slugs);
}

export async function getClusterLinkClicksUncached(
  slugs: readonly string[],
  paths: readonly string[],
  memberIds: readonly string[],
  window: ClusterWindow,
): Promise<ClusterLinkClick[]> {
  return queryLinkClicks(toScope(slugs, paths, memberIds), window);
}

// ── Cached getters (the page) ───────────────────────────────────────────────

/** A cluster's member, as the page labels it. */
export interface ClusterAnalyticsMember {
  articleId: string;
  slug: string;
  title: string;
}

/** Who is in the cluster: member slugs and ids, parallel, in member order. */
export type ClusterMembership = Pick<ClusterScope, 'slugs' | 'memberIds'>;

/** ONE read of the cluster: its labels and the membership every getter queries. */
export interface ClusterAnalyticsSnapshot {
  id: string;
  name: string;
  /** Live members with a slug, in member order — the same list as `membership`. */
  members: ClusterAnalyticsMember[];
  membership: ClusterMembership;
  /** Whether the reader-facing Series box is switched on (T5 · R18's "off" state). */
  seriesEnabled: boolean;
}

/**
 * The cluster and its live members, read ONCE per request. The page labels its
 * tables from `members` and passes `membership` to every getter, so a
 * membership change mid-render can never pair one snapshot's labels with
 * another's numbers. Null when the cluster does not exist; an empty member
 * list when it has none — then no getter runs.
 */
export const loadClusterAnalytics = cache(
  async (clusterId: string): Promise<ClusterAnalyticsSnapshot | null> => {
    const cluster = await loadClusterMembers(clusterId);
    if (!cluster) return null;
    const members = cluster.members
      .filter((m) => m.slug)
      .map((m) => ({ articleId: m.articleId, slug: m.slug, title: m.title }));
    return {
      id: cluster.id,
      name: cluster.name,
      members,
      membership: { slugs: members.map((m) => m.slug), memberIds: members.map((m) => m.articleId) },
      seriesEnabled: cluster.seriesEnabled === true,
    };
  },
);

/**
 * The membership's resolved paths, once per request (both pageview getters
 * share it). Runs inside each getter — so inside its safePanel — and only for
 * the snapshot's own slugs.
 */
const resolveScope = cache(async (membershipKey: string): Promise<ClusterScope> => {
  const { slugs, memberIds } = JSON.parse(membershipKey) as ClusterMembership;
  const bySlug = await resolveArticlePaths(slugs);
  const paths = [...new Set(slugs.flatMap((s) => bySlug.get(s) ?? []))].sort();
  return { slugs, memberIds, paths };
});

function membershipKeyOf(m: ClusterMembership): string {
  return JSON.stringify({ slugs: m.slugs, memberIds: m.memberIds });
}

function cacheOpts(clusterId: string) {
  return { tags: [CACHE_TAG, clusterAnalyticsTag(clusterId)], revalidate: 600 };
}

/** The cache-key namespaces; distinct so the two statements can never share an entry. */
export const PAGEVIEWS_CACHE_KEY = 'cluster-analytics:pageviews';
export const CLICKS_CACHE_KEY = 'cluster-analytics:clicks';

// ── The cached entry: compact, and byte-budgeted ───────────────────────────

/**
 * Next refuses to cache an entry over ~2 MB — it skips the write, so the
 * expensive statement would silently re-run on every render. The raw summary
 * rows are bounded by the member count, but each repeats slug TEXT (unbounded
 * length) up to ~members² times: 50 members × 300-character slugs could pass
 * 2 MB. So the entry holds no slug at all:
 *   - totals: [member index, views, unique visitors], ≤ members rows;
 *   - visits: the headline summary computed from EVERY visit shape BEFORE
 *     caching (visits, read-2+, Σ distinct reads, last stops per member
 *     index) — ≤ members + 3 numbers, never trimmed;
 *   - moves: [from index, to index, moves], ≤ members² rows, most-travelled
 *     first.
 * Only numbers, so 50 members stays well under 100 KB. If an entry ever still
 * came out over PAGEVIEWS_CACHE_BYTE_BUDGET, the least-travelled moves are
 * dropped (`movesTrimmed`) until it fits: the journey loses its rarest cells,
 * the headline numbers stay exact.
 */
export const PAGEVIEWS_CACHE_BYTE_BUDGET = 512 * 1024;

export interface CompactPageviews {
  totals: [number, number, number][];
  visits: { visits: number; flowSessions: number; distinctReads: number; lastStops: number[] };
  moves: [number, number, number][];
  /** Moves dropped to fit the byte budget (0 in practice). */
  movesTrimmed: number;
}

/** What the cached getters hand on: totals, the full-set summary, the moves. */
export interface ClusterPageviewsSummary {
  totals: Map<string, { views: number; uniqueVisitors: number }>;
  visits: VisitSummary;
  moves: MoveRow[];
}

/** Serialised size in UTF-8 bytes (what the cache stores). */
export function serializedBytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

/**
 * The statement's rows → the compact cache entry for `slugs` (member order).
 * Rows for a non-member slug are dropped (the getters ignore them anyway).
 */
export function compactPageviews(
  pv: ClusterPageviews,
  slugs: readonly string[],
  byteBudget: number = PAGEVIEWS_CACHE_BYTE_BUDGET,
): CompactPageviews {
  const index = new Map(slugs.map((slug, i) => [slug, i]));
  const totals: [number, number, number][] = [];
  for (const [slug, t] of pv.totals) {
    const i = index.get(slug);
    if (i !== undefined) totals.push([i, t.views, t.uniqueVisitors]);
  }
  const s = summariseVisits(pv.shapes, slugs);
  const visits = {
    visits: s.visits,
    flowSessions: s.flowSessions,
    distinctReads: s.distinctReads,
    lastStops: slugs.map((slug) => s.lastStops.get(slug) ?? 0),
  };
  const moves: [number, number, number][] = clusterTransitions(pv.moves, slugs).map((t) => [
    index.get(t.from)!,
    index.get(t.to)!,
    t.moves,
  ]);
  const entry: CompactPageviews = { totals, visits, moves, movesTrimmed: 0 };
  let bytes = serializedBytes(entry);
  // Least-travelled out first (moves are sorted most-travelled first). Each
  // move costs its own JSON plus one separator; `movesTrimmed` may gain a digit.
  while (moves.length > 0 && bytes > byteBudget) {
    const dropped = moves.pop()!;
    entry.movesTrimmed++;
    bytes -= serializedBytes(dropped) + 1;
    // Re-measure exactly once the estimate says it fits (the counter's digits).
    if (bytes <= byteBudget) bytes = serializedBytes(entry);
  }
  return entry;
}

/** The compact entry back into slugs, for `slugs` (the same member order). */
export function expandPageviews(
  entry: CompactPageviews,
  slugs: readonly string[],
): ClusterPageviewsSummary {
  const totals = new Map<string, { views: number; uniqueVisitors: number }>();
  for (const [i, views, uniqueVisitors] of entry.totals) {
    if (slugs[i] !== undefined) totals.set(slugs[i], { views, uniqueVisitors });
  }
  const lastStops = new Map<string, number>();
  entry.visits.lastStops.forEach((n, i) => {
    if (n > 0 && slugs[i] !== undefined) lastStops.set(slugs[i], n);
  });
  const moves: MoveRow[] = [];
  for (const [from, to, n] of entry.moves) {
    if (slugs[from] !== undefined && slugs[to] !== undefined) {
      moves.push({ from: slugs[from], to: slugs[to], moves: n });
    }
  }
  return {
    totals,
    visits: {
      visits: entry.visits.visits,
      flowSessions: entry.visits.flowSessions,
      distinctReads: entry.visits.distinctReads,
      lastStops,
    },
    moves,
  };
}

/**
 * The pageview statement, cached and shared: the overview and the journey
 * matrix both derive from it, so one page render runs it once (React `cache`
 * per request, `unstable_cache` across requests). The entry is the compact,
 * byte-budgeted form above — bounded by the member count, never by traffic or
 * slug length. Keyed on the cluster, the window and the scope itself, so a
 * membership change is a new entry even before its tag revalidation lands.
 */
const cachedPageviews = cache(
  async (
    clusterId: string,
    window: ClusterWindow,
    scopeKey: string,
  ): Promise<ClusterPageviewsSummary> => {
    const scope = JSON.parse(scopeKey) as ClusterScope;
    const entry = await unstable_cache(
      async () => compactPageviews(await queryPageviews(scope, window), scope.slugs),
      [PAGEVIEWS_CACHE_KEY, clusterId, String(window), scopeKey],
      cacheOpts(clusterId),
    )();
    return expandPageviews(entry, scope.slugs);
  },
);

function scopeKeyOf(scope: ClusterScope): string {
  return JSON.stringify(scope);
}

/**
 * Tiles + member table (R17, R19) for the snapshot's members. No members →
 * the empty overview without querying analytics.
 */
export async function getClusterOverview(
  clusterId: string,
  membership: ClusterMembership,
  window: ClusterWindow,
): Promise<ClusterOverview> {
  if (membership.slugs.length === 0) {
    return { members: [], visits: 0, flowSessions: 0, flowRate: 0, articlesPerVisit: 0 };
  }
  const scope = await resolveScope(membershipKeyOf(membership));
  const pv = await cachedPageviews(clusterId, window, scopeKeyOf(scope));
  return overviewFromSummary(scope.slugs, pv.totals, pv.visits);
}

/** "Where readers went next" (R18), most-travelled move first. */
export async function getClusterJourney(
  clusterId: string,
  membership: ClusterMembership,
  window: ClusterWindow,
): Promise<ClusterTransition[]> {
  if (membership.slugs.length < 2) return [];
  const scope = await resolveScope(membershipKeyOf(membership));
  const { moves } = await cachedPageviews(clusterId, window, scopeKeyOf(scope));
  return clusterTransitions(moves, scope.slugs);
}

/** In-body link clicks between members (R20), most clicked first. */
export async function getClusterLinkClicks(
  clusterId: string,
  membership: ClusterMembership,
  window: ClusterWindow,
): Promise<ClusterLinkClick[]> {
  if (membership.slugs.length < 2) return [];
  // Clicks are events on the members' own pages: matched on their exact paths.
  const scope = await resolveScope(membershipKeyOf(membership));
  return unstable_cache(
    () => queryLinkClicks(scope, window),
    [CLICKS_CACHE_KEY, clusterId, String(window), scopeKeyOf(scope)],
    cacheOpts(clusterId),
  )();
}

// ── "Series box" panel (T5 · R18, R19) ─────────────────────────────────────

/**
 * How the Series box did for this cluster in the window: how often readers saw
 * it, how often they clicked a row, per member and per from→to pair.
 *
 * ONE STATEMENT (`UNION ALL`), two branches over `analytics_events`:
 *   - impressions (`Series Box Viewed`): `COUNT(*) … GROUP BY pathname` over
 *     the counted members' exact paths, probing
 *     idx_analytics_events_series_box (migration 20261110135759) on
 *     (event_name, pathname, created_at) and then reading `props` for
 *     `cluster_id` — the attribution filter I-F1 added. The index probe still
 *     does all the narrowing (event name, the member paths, the window floor);
 *     `props` costs a heap read on the rows that survive it, which is ~1 row
 *     per member pageview inside one cluster's window, not the whole table.
 *     The index predicate is untouched, so bots are still structurally absent.
 *   - clicks (`Series Link Clicked`): the same index probe, then the same kind
 *     of heap read for `props` (`cluster_id`, `to_article_id`). A handful of
 *     rows per window — a click, not a view.
 * Both bounded by the window and the member paths; the result is at most
 * members (impressions) + members² (click pairs) rows whatever the traffic.
 *
 * EVERY IMPRESSION IS ATTRIBUTED BY ITS OWN `cluster_id` (I-F1). The event
 * carries the cluster whose box was on screen, so two clusters can never claim
 * the same impression — including the case both are switched OFF, where the R2
 * read below answers "no box shows here" for both of them.
 *
 * THE PATH SET ADDITIONALLY EXCLUDES MEMBERS A DIFFERENT CLUSTER CURRENTLY SHOWS
 * (R2, via `getShownSeriesForArticles`): an article in two switched-on clusters
 * renders ONE box (see `getShownSeriesForArticles`), so its impressions belong to that
 * cluster alone. Without that exclusion, the second cluster would claim page
 * views its box never appeared on.
 *
 * A member with NO shown series at all IS counted (T5-F1).
 * `getShownSeriesForArticles` answers nothing for an article in no
 * reader-facing cluster, which is exactly the state the moment THIS cluster's
 * switch goes off — and the panel's documented 4th state says a switched-off
 * cluster keeps the history readers already made (R18/D4). A `Series Box
 * Viewed` row only exists where a box actually rendered, so widening the
 * probed path set cannot invent an impression; it only stops another
 * switched-ON cluster from claiming one.
 *
 * Clicks are filtered the same way, and always were: the event carries its own
 * `cluster_id`, so a click is attributed to the box the reader actually used.
 *
 * Bots never reach the panel: `NOT is_bot` is part of the index predicate, so
 * a bot's row is not in the index this statement reads at all.
 */
export interface ClusterSeriesArticle {
  articleId: string;
  /** Times the box was seen on this article (one per page view). */
  seen: number;
  /** Clicks on a row of the box ON this article. */
  clicks: number;
}

/** A from→to row click and how often readers made it. */
export interface ClusterSeriesLink {
  fromArticleId: string;
  toArticleId: string;
  clicks: number;
}

export interface ClusterSeriesBox {
  /** Times the box was seen across the counted members. */
  seen: number;
  /** Clicks on a series row across the members. */
  clicks: number;
  /** One row per member, in member order (zeros included). */
  perArticle: ClusterSeriesArticle[];
  /** From→to pairs, most clicked first; at most members² rows. */
  links: ClusterSeriesLink[];
}

/** One row of the series statement: an impression count or a click count. */
export interface SeriesEventRow {
  kind: 'seen' | 'click';
  /** The member slug the event happened ON (`pathname`'s 4th segment). */
  slug: string;
  /** Clicks only: the article clicked TO (`props->>'to_article_id'`). */
  other: string | null;
  n: number;
}

/** The empty answer for a membership — one zero row per member, in order. */
export function emptySeriesBox(memberIds: readonly string[]): ClusterSeriesBox {
  return {
    seen: 0,
    clicks: 0,
    perArticle: memberIds.map((articleId) => ({ articleId, seen: 0, clicks: 0 })),
    links: [],
  };
}

/** A resolved `/artikel/<category>/<slug>` path's slug — SQL's `split_part(…, '/', 4)`. */
export function pathSlug(path: string): string {
  return path.split('/')[3] ?? '';
}

/**
 * The statement's rows into the panel's numbers, for `scope`'s members in
 * member order. Defensive on every join the statement cannot make itself:
 *   - an impression on a slug that is not a member, or on a member a DIFFERENT
 *     cluster currently shows (`countedSlugs`), is dropped — the statement
 *     already reads only the counted paths, so this is belt and braces for a
 *     membership that moved between the two reads;
 *   - a click whose `to_article_id` is not a current member, or is the article
 *     it was clicked on, is dropped (an article moved out of the cluster, or a
 *     stale event from before a membership change);
 *   - ids are matched case-insensitively (`to_article_id` travels through the
 *     browser) and answered in the spelling the membership uses.
 */
export function buildSeriesBox(
  rows: readonly SeriesEventRow[],
  scope: Pick<ClusterScope, 'slugs' | 'memberIds'>,
  countedSlugs: readonly string[],
): ClusterSeriesBox {
  const idBySlug = new Map(scope.slugs.map((slug, i) => [slug, scope.memberIds[i]]));
  const idByLower = new Map(scope.memberIds.map((id) => [id.toLowerCase(), id]));
  const counted = new Set(countedSlugs);
  const seenBy = new Map<string, number>();
  const clicksBy = new Map<string, number>();
  const links = new Map<string, ClusterSeriesLink>();
  let seen = 0;
  let clicks = 0;

  for (const r of rows) {
    const n = toCount(r.n);
    if (n === 0 || !r.slug) continue;
    const fromId = idBySlug.get(r.slug);
    if (fromId === undefined) continue;
    if (r.kind === 'seen') {
      if (!counted.has(r.slug)) continue;
      seenBy.set(fromId, addCounts(seenBy.get(fromId) ?? 0, n));
      seen = addCounts(seen, n);
      continue;
    }
    const toId = r.other ? idByLower.get(r.other.toLowerCase()) : undefined;
    if (toId === undefined || toId === fromId) continue;
    clicksBy.set(fromId, addCounts(clicksBy.get(fromId) ?? 0, n));
    clicks = addCounts(clicks, n);
    const key = `${fromId}\n${toId}`;
    const prev = links.get(key);
    links.set(key, {
      fromArticleId: fromId,
      toArticleId: toId,
      clicks: addCounts(prev?.clicks ?? 0, n),
    });
  }

  return {
    seen,
    clicks,
    perArticle: scope.memberIds.map((articleId) => ({
      articleId,
      seen: seenBy.get(articleId) ?? 0,
      clicks: clicksBy.get(articleId) ?? 0,
    })),
    links: [...links.values()].sort(
      (a, b) =>
        b.clicks - a.clicks ||
        a.fromArticleId.localeCompare(b.fromArticleId) ||
        a.toArticleId.localeCompare(b.toArticleId),
    ),
  };
}

/**
 * The ONE series statement (see the `ClusterSeriesBox` header). `is_bot =
 * FALSE` and the two event names are repeated verbatim so the partial index's
 * predicate is proven, and `ARTIKEL_PATH_SCOPE` is repeated for the same
 * reason the pageview statement repeats it (Postgres cannot infer a LIKE from
 * `pathname = ANY(…)`).
 *
 * The event names go in as SQL LITERALS (`eventLiteral`), not bind parameters,
 * for the same reason the pageview statement writes `event_name = 'pageview'`:
 * proving the partial predicate is a PLANNING step, and a literal cannot
 * depend on how the driver happens to plan a parameterised statement. They
 * still come from the one shared contract (series-events.ts), so the panel and
 * the tracker cannot drift apart.
 */
function eventLiteral(name: string): SQL {
  return sql.raw(`'${name.replace(/'/g, "''")}'`);
}

async function querySeriesBox(
  scope: ClusterScope,
  clusterId: string,
  window: ClusterWindow,
  impressionPaths: readonly string[],
): Promise<SeriesEventRow[]> {
  if (scope.paths.length === 0) return [];
  const floor = clusterWindowFloor(window).utc;
  const rows = await db.execute<{
    kind: 'seen' | 'click';
    slug: string | null;
    other: string | null;
    n: string;
  }>(sql`
    SELECT 'seen' AS kind, split_part(pathname, '/', 4) AS slug, NULL::text AS other,
           COUNT(*)::bigint AS n
    FROM analytics_events
    WHERE event_name = ${eventLiteral(SERIES_BOX_VIEWED_EVENT)}
      AND is_bot = FALSE
      AND created_at >= ${floor}
      AND pathname = ANY (${textArrayParam([...impressionPaths])})
      AND ${ARTIKEL_PATH_SCOPE}
      AND props->>'cluster_id' = ${clusterId}
    GROUP BY 1, 2, 3
    UNION ALL
    SELECT 'click' AS kind, split_part(pathname, '/', 4) AS slug,
           props->>'to_article_id' AS other, COUNT(*)::bigint AS n
    FROM analytics_events
    WHERE event_name = ${eventLiteral(SERIES_LINK_CLICKED_EVENT)}
      AND is_bot = FALSE
      AND created_at >= ${floor}
      AND pathname = ANY (${textArrayParam(scope.paths)})
      AND ${ARTIKEL_PATH_SCOPE}
      AND props->>'cluster_id' = ${clusterId}
    GROUP BY 1, 2, 3
  `);
  return rows
    .filter((r) => r.slug)
    .map((r) => ({ kind: r.kind, slug: r.slug as string, other: r.other, n: toCount(r.n) }));
}

/** The paths of `slugs` only, out of the scope's resolved paths (every alias). */
function pathsForSlugs(scope: ClusterScope, slugs: readonly string[]): string[] {
  const wanted = new Set(slugs);
  return scope.paths.filter((p) => wanted.has(pathSlug(p)));
}

/** The cache-key namespace for the series panel; distinct from the other two. */
export const SERIES_CACHE_KEY = 'cluster-analytics:series';

/**
 * The panel's read (R18, R19), cached 600 s under `article-analytics` + this
 * cluster's own tag like every other getter, and run by the page inside
 * `safePanel(…, null)`.
 *
 * The R2 "which series does this article show" read lives INSIDE the cached
 * entry, so one render costs one cached unit of work and the counted members
 * and the counts they explain always come from the same moment. A switch-on
 * elsewhere is picked up by the cluster's tag revalidation (every clusters
 * admin action fires it) or the 10-minute timer.
 *
 * No members → the empty answer without touching analytics.
 */
export async function getClusterSeriesBox(
  clusterId: string,
  membership: ClusterMembership,
  window: ClusterWindow,
): Promise<ClusterSeriesBox> {
  if (membership.slugs.length === 0) return emptySeriesBox(membership.memberIds);
  const scope = await resolveScope(membershipKeyOf(membership));
  return unstable_cache(
    async () => {
      const shown = await getShownSeriesForArticles(scope.memberIds);
      const wanted = clusterId.toLowerCase();
      const countedSlugs = scope.slugs.filter((_slug, i) => {
        const shownSeries = shown.get(scope.memberIds[i]);
        // No reader-facing cluster shows a box on this article at all — which
        // is the state the moment THIS cluster's switch goes off. No other
        // cluster can claim those impressions, so they stay here (T5-F1).
        if (shownSeries === undefined) return true;
        // Otherwise only the cluster whose box actually renders counts them.
        return shownSeries.clusterId.toLowerCase() === wanted;
      });
      const rows = await querySeriesBox(
        scope,
        clusterId,
        window,
        pathsForSlugs(scope, countedSlugs),
      );
      return buildSeriesBox(rows, scope, countedSlugs);
    },
    [SERIES_CACHE_KEY, clusterId, String(window), scopeKeyOf(scope)],
    cacheOpts(clusterId),
  )();
}

/**
 * The canary's twin (`cluster:series`): the statement alone, uncached.
 *
 * It counts EVERY member's impressions instead of asking R2 which members show
 * this cluster's box, because the canary's cluster is synthetic — it has no
 * membership rows, so the R2 read would answer "no member shows it" and the
 * impressions branch would probe nothing. Counting all of them times the
 * heaviest honest shape of the branch this index exists for.
 */
export async function getClusterSeriesBoxUncached(
  clusterId: string,
  slugs: readonly string[],
  paths: readonly string[],
  memberIds: readonly string[],
  window: ClusterWindow,
): Promise<ClusterSeriesBox> {
  const scope = toScope(slugs, paths, memberIds);
  const rows = await querySeriesBox(scope, clusterId, window, scope.paths);
  return buildSeriesBox(rows, scope, scope.slugs);
}
