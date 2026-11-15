import { parseSort } from '@/lib/analytics/article-leaderboard';
import type { ArticlePeriod } from '@/lib/analytics/article-period';
import { DEFAULT_PERIOD } from '@/lib/analytics/article-period';
import { DEFAULT_SORT } from '@/lib/analytics/article-leaderboard';
import type { OverviewFilters } from './overview-data';

/**
 * URL state for the Article Analytics overview. Plain functions (no React):
 * the server page and the client period bar both build links with them.
 */

export const ANALYTICS_BASE = '/admin/inspire/analytics';

type Raw = string | string[] | undefined;

function first(raw: Raw): string {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return typeof v === 'string' ? v : '';
}

/** Longest title search we honour; anything longer is trimmed. */
const MAX_QUERY = 120;

export function parseFilters(params: Record<string, Raw>): OverviewFilters {
  const page = Number.parseInt(first(params.page), 10);
  return {
    q: first(params.q).trim().slice(0, MAX_QUERY),
    category: first(params.category).trim().slice(0, 200),
    fresh: first(params.fresh) === '1',
    sort: parseSort(params.sort),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/**
 * The query params that describe the current view, minus defaults, so links
 * stay short and the default view is the bare URL.
 */
export function currentParams(
  period: ArticlePeriod,
  filters: OverviewFilters,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (period.key !== DEFAULT_PERIOD) out.period = period.key;
  if (period.key === 'month' && period.monthKey) out.month = period.monthKey;
  if (filters.q) out.q = filters.q;
  if (filters.category) out.category = filters.category;
  if (filters.fresh) out.fresh = '1';
  if (filters.sort !== DEFAULT_SORT) out.sort = filters.sort;
  if (filters.page > 1) out.page = String(filters.page);
  return out;
}

/**
 * A link to the overview with `patch` applied (a `null` value removes the
 * key). Changing anything but the page sends you back to page one.
 */
export function overviewHref(
  params: Record<string, string>,
  patch: Record<string, string | null>,
): string {
  const next: Record<string, string> = { ...params };
  if (!('page' in patch)) delete next.page;
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete next[k];
    else next[k] = v;
  }
  if (next.period !== 'month') delete next.month;
  if (next.period === DEFAULT_PERIOD) delete next.period;
  if (next.sort === DEFAULT_SORT) delete next.sort;
  if (next.page === '1') delete next.page;
  const qs = new URLSearchParams(next).toString();
  return qs ? `${ANALYTICS_BASE}?${qs}` : ANALYTICS_BASE;
}
