/**
 * Pure assembly for the Article Analytics overview: merges the per-metric maps
 * from `article-performance.ts` into one row per article, sorts the
 * leaderboard, and picks the movers and the "needs attention" lists.
 *
 * Ported from The Wedding Notebook without its enquiry and vendor-click
 * columns (no HelloKahwin equivalent); "readers" is a sort instead.
 *
 * No database, no React, no `server-only` — unit-tested directly, and the
 * thresholds below are the whole definition of each list.
 */

export const LEADERBOARD_SORTS = ['views', 'google', 'readers'] as const;
export type LeaderboardSort = (typeof LEADERBOARD_SORTS)[number];
export const DEFAULT_SORT: LeaderboardSort = 'views';

export function parseSort(raw: string | string[] | undefined): LeaderboardSort {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return (LEADERBOARD_SORTS as readonly string[]).includes(v ?? '')
    ? (v as LeaderboardSort)
    : DEFAULT_SORT;
}

export interface ArticleMeta {
  id: string;
  slug: string;
  title: string;
  /** Display status: published / draft / scheduled / archived… */
  status: string;
  /** ISO timestamp, or null when never published. */
  publishedAt: string | null;
}

export interface LeaderRow extends ArticleMeta {
  views: number;
  prevViews: number;
  readers: number;
  googleClicks: number;
  prevGoogleClicks: number;
  impressions: number;
  prevImpressions: number;
  /** Average Google position; null with no impressions. */
  position: number | null;
  prevPosition: number | null;
}

interface ViewsIn {
  views: number;
  readers: number;
  prevViews: number;
}
interface GoogleIn {
  clicks: number;
  impressions: number;
  positionSum: number;
  prevClicks: number;
  prevImpressions: number;
  prevPositionSum: number;
}

export interface MetricMaps {
  /** Keyed by slug. */
  views: ReadonlyMap<string, ViewsIn>;
  /** Keyed by article id. */
  google: ReadonlyMap<string, GoogleIn>;
}

function avgPosition(posSum: number, impressions: number): number | null {
  return impressions > 0 ? posSum / impressions : null;
}

export function buildRows(articles: readonly ArticleMeta[], m: MetricMaps): LeaderRow[] {
  return articles.map((a) => {
    const v = m.views.get(a.slug);
    const g = m.google.get(a.id);
    return {
      ...a,
      views: v?.views ?? 0,
      prevViews: v?.prevViews ?? 0,
      readers: v?.readers ?? 0,
      googleClicks: g?.clicks ?? 0,
      prevGoogleClicks: g?.prevClicks ?? 0,
      impressions: g?.impressions ?? 0,
      prevImpressions: g?.prevImpressions ?? 0,
      position: g ? avgPosition(g.positionSum, g.impressions) : null,
      prevPosition: g ? avgPosition(g.prevPositionSum, g.prevImpressions) : null,
    };
  });
}

/**
 * Leaderboard order: the chosen metric, then views, then title — so a tie
 * (many articles have 0 Google clicks) still reads as a sensible list.
 */
export function sortRows(rows: readonly LeaderRow[], sort: LeaderboardSort): LeaderRow[] {
  const key = (r: LeaderRow): number =>
    sort === 'google' ? r.googleClicks : sort === 'readers' ? r.readers : r.views;
  return [...rows].sort(
    (a, b) => key(b) - key(a) || b.views - a.views || a.title.localeCompare(b.title),
  );
}

/** Percentage change, or null when there is nothing to compare against. */
export function pctChange(cur: number, prev: number): number | null {
  if (prev <= 0) return null;
  return ((cur - prev) / prev) * 100;
}

// ── Movers ──────────────────────────────────────────────────────────────────

/** An article needs this many views in one of the two windows to be a mover. */
export const MOVER_MIN_VIEWS = 30;
export const MOVER_LIMIT = 5;

/**
 * Biggest gains and drops in views against the comparison window.
 *
 * Articles that went live after the comparison window started are left out:
 * they had no fair "before", so every one of them would top the risers. They
 * appear under Launches instead.
 */
export function pickMovers(
  rows: readonly LeaderRow[],
  prevFrom: string,
): { risers: LeaderRow[]; fallers: LeaderRow[] } {
  const eligible = rows.filter(
    (r) =>
      Math.max(r.views, r.prevViews) >= MOVER_MIN_VIEWS &&
      r.publishedAt !== null &&
      r.publishedAt.slice(0, 10) < prevFrom,
  );
  const delta = (r: LeaderRow) => r.views - r.prevViews;
  return {
    risers: eligible
      .filter((r) => delta(r) > 0)
      .sort((a, b) => delta(b) - delta(a))
      .slice(0, MOVER_LIMIT),
    fallers: eligible
      .filter((r) => delta(r) < 0)
      .sort((a, b) => delta(a) - delta(b))
      .slice(0, MOVER_LIMIT),
  };
}

// ── Needs attention ─────────────────────────────────────────────────────────

/**
 * Typical organic click-through rate at a Google position — the same industry
 * curve /admin/seo-standing ranks with (its EXPECTED_CTR). Approximate by
 * nature; used only to decide what to flag, never reported as a fact.
 */
export function expectedCtr(pos: number): number {
  if (pos < 1.5) return 0.28;
  if (pos < 2.5) return 0.15;
  if (pos < 3.5) return 0.11;
  if (pos < 4.5) return 0.08;
  if (pos < 5.5) return 0.06;
  if (pos < 6.5) return 0.05;
  if (pos < 7.5) return 0.04;
  if (pos < 8.5) return 0.033;
  if (pos < 9.5) return 0.028;
  if (pos < 10.5) return 0.025;
  if (pos < 20.5) return 0.015;
  return 0.005;
}

export const ATTENTION_LIMIT = 5;
/** Enough Google impressions that a low click rate is not just noise. */
export const LOW_CTR_MIN_IMPRESSIONS = 200;
/** Flag when the click rate is under this share of what the position usually gets. */
export const LOW_CTR_SHARE = 0.5;
/** A slip of this many places or more in average Google position. */
export const SLIP_MIN_PLACES = 3;
/** Enough tracked readers that a low read-through is not just noise. */
export const UNREAD_MIN_READERS = 50;
/** Flag when fewer than this share of readers reach three-quarters down. */
export const UNREAD_MAX_SHARE = 0.25;

export interface AttentionItem {
  row: LeaderRow;
  /** The plain-language fact, e.g. "Seen 1,240 times on Google, clicked 0.4%". */
  finding: string;
  /** The suggested fix. */
  action: string;
}

export interface AttentionLists {
  lowCtr: AttentionItem[];
  slipping: AttentionItem[];
  unread: AttentionItem[];
}

const fmtInt = (n: number) => n.toLocaleString('en-MY');
const fmtPct = (n: number) => `${(n * 100).toFixed(n < 0.1 ? 1 : 0)}%`;

export function pickAttention(
  rows: readonly LeaderRow[],
  readThrough: ReadonlyMap<string, { readers: number; finished: number }>,
  hasComparison: boolean,
): AttentionLists {
  const lowCtr = rows
    .filter((r) => r.impressions >= LOW_CTR_MIN_IMPRESSIONS && r.position !== null)
    .map((r) => {
      const ctr = r.googleClicks / r.impressions;
      const expected = expectedCtr(r.position as number);
      return { r, ctr, gap: expected - ctr, expected };
    })
    .filter((x) => x.ctr < x.expected * LOW_CTR_SHARE)
    // Biggest missed opportunity first: impressions × the click-rate gap.
    .sort((a, b) => b.gap * b.r.impressions - a.gap * a.r.impressions)
    .slice(0, ATTENTION_LIMIT)
    .map(({ r, ctr }) => ({
      row: r,
      finding: `Seen ${fmtInt(r.impressions)} times on Google (around position ${Math.round(
        r.position as number,
      )}), but only ${fmtPct(ctr)} clicked`,
      action:
        'Rewrite the title and the Google description so the result is more tempting to click.',
    }));

  const slipping = !hasComparison
    ? []
    : rows
        .filter(
          (r) =>
            r.prevImpressions >= LOW_CTR_MIN_IMPRESSIONS &&
            r.position !== null &&
            r.prevPosition !== null &&
            r.position - r.prevPosition >= SLIP_MIN_PLACES,
        )
        .sort(
          (a, b) =>
            (b.position as number) -
            (b.prevPosition as number) -
            ((a.position as number) - (a.prevPosition as number)),
        )
        .slice(0, ATTENTION_LIMIT)
        .map((r) => ({
          row: r,
          finding: `Dropped on Google from around position ${Math.round(
            r.prevPosition as number,
          )} to ${Math.round(r.position as number)}`,
          action: 'Refresh it: update facts, prices and dates, and add anything newer pages cover.',
        }));

  const unread = rows
    .map((r) => ({ r, rt: readThrough.get(r.slug) }))
    .filter(
      (x): x is { r: LeaderRow; rt: { readers: number; finished: number } } =>
        x.rt !== undefined &&
        x.rt.readers >= UNREAD_MIN_READERS &&
        x.rt.finished / x.rt.readers < UNREAD_MAX_SHARE,
    )
    .sort((a, b) => b.rt.readers - a.rt.readers)
    .slice(0, ATTENTION_LIMIT)
    .map(({ r, rt }) => ({
      row: r,
      finding: `${fmtInt(rt.readers)} readers, but only ${fmtPct(
        rt.finished / rt.readers,
      )} got three-quarters of the way down`,
      action:
        'Check the opening delivers what the headline promises, and move the key answer higher.',
    }));

  return { lowCtr, slipping, unread };
}

/** How many of the top articles by views the "not read" check looks at. */
export const UNREAD_CANDIDATES = 40;
