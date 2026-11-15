import 'server-only';
import { unstable_cache } from 'next/cache';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { loadCurrentSectionHeadings } from './article-current-headings';
import { resolveArticlePaths, resolveArticlePathsUncached, slugInList } from './article-paths';
import { detailWindowFloor, ARTIKEL_PATH_SCOPE } from './article-views';
import { addCounts, toCount } from './article-compare';
import {
  MAX_TRACKED_SECTIONS,
  SECTION_REACHED_EVENT,
  SECTION_TRACKING_SINCE,
  normaliseSectionHeading,
} from './section-tracking';

export { MAX_TRACKED_SECTIONS, SECTION_REACHED_EVENT, SECTION_TRACKING_SINCE };

/**
 * Section-level drop-off for ONE article: of the visitors who opened it since
 * section tracking began, how many reached each of its headings, and under
 * which heading each one stopped. Fed by the `section_reached` events of
 * `ArticleSectionTracker` (event shape documented there).
 *
 * Index 0 = "Introduction" (opened, never reached heading 1); 1..N = the
 * article's headings; N + 1 = "End of article" (the sentinel).
 *
 * DISCIPLINE (CLAUDE.md, admin analytics). Two statements, both matched on the
 * article's exact resolved paths (`pathname IN (…)` of individually bound
 * scalars via `slugInList`, per R25 — the per-article list is bounded by
 * MAX_SEEN_PATHS_PER_SLUG), human rows only, `created_at >=
 * SECTION_TRACKING_SINCE` (the fallback floor; the pageview denominator is
 * floored later still, at the article's first recorded section — see
 * `openedFloor`) and the 365-day `detailWindowFloor`. Each is ONE `GROUP BY visitor_hash` pass — never an
 * unbounded `COUNT(DISTINCT …)`. The raw counts are cached 600 s under
 * `article-analytics`; the page calls this through
 * `safePanel('article:sections', …, null)`, and the `article:sections` canary
 * case times it against prod (2 s tight budget).
 */

const CACHE_OPTS = { tags: ['article-analytics'], revalidate: 600 };

/**
 * The version-independent "End of article" index. The tracker sends the end
 * sentinel as `section_total + 1` of the layout the reader saw, so the raw
 * number means different things across an edit: on a 3-heading version 4 is
 * the END, on a later 5-heading version 4 is a heading. Statement 1 rewrites
 * every `idx = total + 1` to this value BEFORE taking each visitor's MAX, so a
 * reader who finished the old version is still "read to the end", never
 * "stopped at new heading 4". Above any real index (≤ 61).
 */
export const END_OF_ARTICLE_INDEX = 1000;

/** One row of the panel. */
export interface SectionDropOffRow {
  /** 0 = Introduction, 1..N = heading N, N + 1 = End of article. */
  index: number;
  /**
   * Heading text readers saw (latest recorded — `''` when the heading they saw
   * was empty — else the current one); null for Introduction / End.
   */
  heading: string | null;
  /** Visitors who got at least this far. */
  reached: number;
  /** Visitors whose furthest section was this one. */
  stoppedHere: number;
  /** `reached / openedVisitors` (R25); 0 when nobody opened it. */
  reachedShare: number;
}

export interface SectionDropOff {
  /**
   * Distinct visitors who opened the article since section tracking was live
   * for it (`openedFloor`), plus every visitor with a recorded section (the
   * denominator).
   */
  openedVisitors: number;
  rows: SectionDropOffRow[];
  /** Heading count the rows are laid out on (latest recorded, else the current one). */
  sectionTotal: number;
  /** First recorded `section_reached` on this article (ISO), null before any. */
  firstSeenAt: string | null;
  /**
   * Some recorded visit saw a different heading count from the article's
   * current one — ANY recorded `section_total`, not just the latest, so mixed
   * old/new-version data is always flagged.
   */
  headingsChanged: boolean;
}

/** What one statement-1 row carries (a tagged union in one result set). */
type SectionStatRow = {
  kind: 'stop' | 'label' | 'meta';
  idx: number | null;
  visitors: string | number | null;
  heading: string | null;
  total: number | null;
  first_seen: string | Date | null;
  /** meta only: every distinct recorded `section_total`, comma-separated. */
  totals: string | null;
};

/**
 * Raw read results, before the arithmetic. Plain pairs (a Map also fits), so
 * the cached copy survives `unstable_cache`'s JSON round trip. Exported for
 * the unit test.
 */
export interface SectionRawCounts {
  openedVisitors: number;
  /** Furthest section index per visitor → visitor count (END_OF_ARTICLE_INDEX = the end). */
  stoppedAt: Iterable<readonly [number, number]>;
  /** Latest recorded heading text per index (`''` = the reader saw an empty heading). */
  labels: Iterable<readonly [number, string | null]>;
  /** Latest recorded `section_total`, null when nothing is recorded. */
  recordedTotal: number | null;
  /** Every distinct recorded `section_total` (empty when nothing is recorded). */
  recordedTotals: readonly number[];
  firstSeenAt: string | null;
}

/**
 * The arithmetic (R25), pure:
 *   reached(i)     = Σ stoppedHere(j) for j ≥ i  (i ≥ 1)
 *   stoppedHere(0) = max(0, opened − reached(1)), reached(0) = opened
 *   reachedShare   = reached / openedVisitors
 * The layout uses the latest recorded heading count (falling back to the
 * current one). The end sentinel arrives canonicalised (END_OF_ARTICLE_INDEX).
 * A heading index past the layout's last heading (only possible from an
 * older, LONGER version) is folded into "End of article" — that reader did
 * read past the last current heading — and is never silent: such data always
 * carries a recorded total ≠ the current count, so `headingsChanged` is set
 * and the panel says so.
 */
export function buildSectionDropOff(
  raw: SectionRawCounts,
  currentHeadings: readonly string[],
): SectionDropOff {
  const current = currentHeadings.slice(0, MAX_TRACKED_SECTIONS);
  const total = Math.min(raw.recordedTotal ?? current.length, MAX_TRACKED_SECTIONS);
  const endIndex = total + 1;

  const stopped = new Array<number>(endIndex + 1).fill(0);
  for (const [idx, n] of raw.stoppedAt) {
    if (!Number.isInteger(idx) || idx < 1) continue;
    const at = Math.min(idx, endIndex);
    stopped[at] = addCounts(stopped[at], n);
  }
  const reached = new Array<number>(endIndex + 1).fill(0);
  for (let i = endIndex; i >= 1; i--) {
    reached[i] = addCounts(stopped[i], i < endIndex ? reached[i + 1] : 0);
  }
  const opened = toCount(raw.openedVisitors);
  stopped[0] = Math.max(0, opened - reached[1]);
  reached[0] = opened;

  const labels = new Map(raw.labels);
  const rows: SectionDropOffRow[] = [];
  for (let i = 0; i <= endIndex; i++) {
    let heading: string | null = null;
    if (i >= 1 && i <= total) {
      // A recorded '' is what the reader saw (an empty heading): keep it.
      // Fall back to the current text only when nothing was recorded.
      const recorded = labels.get(i);
      heading = normaliseSectionHeading(
        typeof recorded === 'string' ? recorded : (current[i - 1] ?? ''),
      );
    }
    rows.push({
      index: i,
      heading,
      reached: reached[i],
      stoppedHere: stopped[i],
      reachedShare: opened > 0 ? reached[i] / opened : 0,
    });
  }
  const currentCount = Math.min(currentHeadings.length, MAX_TRACKED_SECTIONS);
  const totals = new Set(raw.recordedTotals);
  if (raw.recordedTotal !== null) totals.add(raw.recordedTotal);
  return {
    openedVisitors: opened,
    rows,
    sectionTotal: total,
    firstSeenAt: raw.firstSeenAt,
    headingsChanged: [...totals].some((t) => Math.min(t, MAX_TRACKED_SECTIONS) !== currentCount),
  };
}

/** Statement 1: furthest section per visitor, latest labels, totals, first seen. */
async function querySectionStats(paths: readonly string[]): Promise<SectionStatRow[]> {
  // The cast is guarded by CASE, never by WHERE alone: Postgres does not
  // promise to evaluate the regex before a cast in the same WHERE, so a
  // malformed index can never raise "invalid input syntax for type integer".
  // Indices outside 1..61 (a hand-made request) are dropped before MAX; the
  // end sentinel (idx = that event's own total + 1) becomes END_OF_ARTICLE_INDEX.
  const end = sql.raw(String(END_OF_ARTICLE_INDEX));
  return db.execute<SectionStatRow>(sql`
    WITH ev AS (
      SELECT visitor_hash,
             CASE WHEN props->>'section_index' ~ '^[0-9]{1,3}$'
                  THEN (props->>'section_index')::int END AS idx,
             CASE WHEN props->>'section_total' ~ '^[0-9]{1,3}$'
                  THEN (props->>'section_total')::int END AS total,
             LEFT(props->>'heading', 200) AS heading,
             created_at
      FROM analytics_events
      -- Literal, = SECTION_REACHED_EVENT (asserted by the SQL-shape test).
      WHERE event_name = 'section_reached'
        AND is_bot = FALSE
        AND ${detailWindowFloor}
        AND created_at >= ${SECTION_TRACKING_SINCE}
        AND pathname IN (${slugInList(paths)})
        AND props->>'section_index' ~ '^[0-9]{1,3}$'
    ),
    valid AS (
      SELECT visitor_hash,
             CASE WHEN total IS NOT NULL AND idx = total + 1 THEN ${end} ELSE idx END AS idx,
             total, heading, created_at
      FROM ev
      WHERE idx BETWEEN 1 AND ${MAX_TRACKED_SECTIONS + 1}
    ),
    last AS (
      SELECT visitor_hash, MAX(idx) AS last_idx FROM valid GROUP BY visitor_hash
    ),
    labels AS (
      SELECT DISTINCT ON (idx) idx, heading FROM valid
      WHERE idx <> ${end}
      ORDER BY idx, created_at DESC
    )
    SELECT 'stop' AS kind, last_idx AS idx, COUNT(*)::bigint AS visitors,
           NULL::text AS heading, NULL::int AS total, NULL::timestamptz AS first_seen,
           NULL::text AS totals
    FROM last GROUP BY last_idx
    UNION ALL
    SELECT 'label', idx, NULL, heading, NULL, NULL, NULL FROM labels
    UNION ALL
    SELECT 'meta', NULL, NULL, NULL,
           (SELECT total FROM valid WHERE total IS NOT NULL ORDER BY created_at DESC LIMIT 1),
           (SELECT MIN(created_at) FROM valid),
           (SELECT string_agg(DISTINCT total::text, ',') FROM valid WHERE total IS NOT NULL)
  `);
}

/**
 * The denominator's floor for one article (T7-F4): the LATER of
 * SECTION_TRACKING_SINCE and the article's first recorded `section_reached`.
 * Data-derived, so it no longer matters exactly when the deploy finished: an
 * open from before the tracker was live for this article (it could never emit
 * a `section_reached`) is not counted, and so cannot inflate "Introduction".
 * No recorded section yet → the constant (the honest "collecting since …"
 * state). Exported for the unit test.
 */
export function openedFloor(firstSeenAt: string | null): string {
  if (!firstSeenAt) return SECTION_TRACKING_SINCE;
  const first = new Date(firstSeenAt).getTime();
  if (Number.isNaN(first)) return SECTION_TRACKING_SINCE;
  return first > new Date(SECTION_TRACKING_SINCE).getTime()
    ? new Date(first).toISOString()
    : SECTION_TRACKING_SINCE;
}

/**
 * Statement 2: distinct visitors who opened the article since section
 * tracking was live for it — pageviews from `openedFloor(firstSeenAt)` on,
 * UNION every visitor statement 1 counted (same filters as its `valid` CTE).
 * The union keeps the floor from dropping the very readers that set it: the
 * first reader's pageview lands moments BEFORE their first `section_reached`,
 * so without it they would be in "reached" but not in "opened". It re-reads
 * only this article's `section_reached` rows (the same bounded set as
 * statement 1). UNION de-duplicates — one hash pass, no COUNT(DISTINCT).
 */
async function queryOpenedVisitors(
  paths: readonly string[],
  firstSeenAt: string | null,
): Promise<number> {
  const rows = await db.execute<{ opened: string | number }>(sql`
    SELECT COUNT(*)::bigint AS opened
    FROM (
      SELECT visitor_hash
      FROM analytics_events
      WHERE event_name = 'pageview'
        AND is_bot = FALSE
        AND ${detailWindowFloor}
        AND created_at >= ${openedFloor(firstSeenAt)}
        AND pathname IN (${slugInList(paths)})
        AND ${ARTIKEL_PATH_SCOPE}
      UNION
      SELECT visitor_hash
      FROM analytics_events
      WHERE event_name = 'section_reached'
        AND is_bot = FALSE
        AND ${detailWindowFloor}
        AND created_at >= ${SECTION_TRACKING_SINCE}
        AND pathname IN (${slugInList(paths)})
        AND props->>'section_index' ~ '^[0-9]{1,3}$'
        AND (CASE WHEN props->>'section_index' ~ '^[0-9]{1,3}$'
                  THEN (props->>'section_index')::int END)
            BETWEEN 1 AND ${MAX_TRACKED_SECTIONS + 1}
    ) v
  `);
  return toCount(rows[0]?.opened ?? 0);
}

function toIso(v: string | Date | null | undefined): string | null {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** The recorded-nothing shape (also: no resolved paths → no query). */
const NOTHING_RECORDED: SectionRawCounts = {
  openedVisitors: 0,
  stoppedAt: [],
  labels: [],
  recordedTotal: null,
  recordedTotals: [],
  firstSeenAt: null,
};

/** Both statements → JSON-safe raw counts (pairs, not Maps: this is what gets cached). */
async function querySectionRaw(paths: readonly string[]): Promise<SectionRawCounts> {
  // An empty list would be `IN ()`, a syntax error — and there is nothing to read.
  if (paths.length === 0) return NOTHING_RECORDED;
  // Sequential, not parallel: one pooled connection per panel, like every
  // other per-article getter inside the page's runBatched(…, 3).
  const stats = await querySectionStats(paths);
  const firstSeenAt = toIso(stats.find((r) => r.kind === 'meta')?.first_seen);
  const openedVisitors = await queryOpenedVisitors(paths, firstSeenAt);

  const stoppedAt: [number, number][] = [];
  const labels: [number, string | null][] = [];
  let recordedTotal: number | null = null;
  let recordedTotals: number[] = [];
  for (const r of stats) {
    if (r.kind === 'stop' && r.idx != null) {
      stoppedAt.push([Number(r.idx), toCount(r.visitors)]);
    } else if (r.kind === 'label' && r.idx != null) {
      labels.push([Number(r.idx), r.heading]);
    } else if (r.kind === 'meta') {
      recordedTotal = r.total == null ? null : Number(r.total);
      recordedTotals = (r.totals ?? '')
        .split(',')
        .filter(Boolean)
        .map(Number)
        .filter(Number.isInteger);
    }
  }
  return { openedVisitors, stoppedAt, labels, recordedTotal, recordedTotals, firstSeenAt };
}

/** The raw counts, cached 600 s per slug (the current headings are NOT cached — see below). */
const getSectionRawCached = unstable_cache(
  async (slug: string): Promise<SectionRawCounts> => {
    const paths = (await resolveArticlePaths([slug])).get(slug) ?? [];
    return querySectionRaw(paths);
  },
  ['article-analytics:sections'],
  CACHE_OPTS,
);

/**
 * Uncached (the canary, which must measure cold DB cost). R25's
 * `getArticleSectionDropOffUncached(slug)`: the current headings are resolved
 * internally, exactly as the public page renders them. `opts.paths` given wins
 * (the canary resolves once and times the statements alone);
 * `opts.currentHeadings` given skips the heading lookup (unit tests).
 */
export async function getArticleSectionDropOffUncached(
  slug: string,
  opts: { paths?: readonly string[]; currentHeadings?: readonly string[] } = {},
): Promise<SectionDropOff> {
  if (!slug) return buildSectionDropOff(NOTHING_RECORDED, opts.currentHeadings ?? []);
  const paths = opts.paths ?? (await resolveArticlePathsUncached([slug])).get(slug) ?? [];
  const raw = await querySectionRaw(paths);
  const headings = opts.currentHeadings ?? (await loadCurrentSectionHeadings(slug));
  return buildSectionDropOff(raw, headings);
}

/**
 * R25's `getArticleSectionDropOff(slug)`. The expensive part (both
 * statements) is cached 600 s per slug; the article's CURRENT headings
 * (`loadCurrentSectionHeadings` — three tiny indexed reads plus the
 * dynamic-block resolve the public page uses) are looked up fresh on every
 * call, so an edit that changes the headings shows up — and `headingsChanged`
 * is recomputed — on the very next render, not 10 minutes later.
 */
export async function getArticleSectionDropOff(slug: string): Promise<SectionDropOff> {
  if (!slug) return buildSectionDropOff(NOTHING_RECORDED, []);
  const raw = await getSectionRawCached(slug);
  const headings = await loadCurrentSectionHeadings(slug);
  return buildSectionDropOff(raw, headings);
}
