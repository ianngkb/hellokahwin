'use server';

import { parseTrafficMode } from '@/lib/analytics/sql-filters';
import { resolvePageTitles } from '@/lib/analytics/resolve-page-titles';
import { isBoundedRange } from '@/lib/admin/date-range';
import { requireAdminSectionAction } from '@/lib/auth/admin';
import { searchPages } from './queries';

export interface PageSearchResult {
  pathname: string;
  /** Human-readable title, or null when the pathname can't be resolved. */
  title: string | null;
}

const MAX_QUERY_CHARS = 200;

export async function searchPagesAction(
  query: string,
  from: string,
  to: string,
  traffic: string,
): Promise<PageSearchResult[]> {
  // Server actions are independently-callable POST endpoints — gate on the
  // admin allowlist like the page, or an unauthenticated caller could
  // enumerate the site's URL structure (draft tokens included) via analytics.
  const { error } = await requireAdminSectionAction('site_analytics');
  if (error) return [];

  // The declared types are not enforced on the wire — a caller can post
  // anything — so check them before use.
  if (typeof query !== 'string' || typeof from !== 'string' || typeof to !== 'string') return [];
  const trimmed = query.trim();
  if (!trimmed || trimmed.length > MAX_QUERY_CHARS) return [];
  // Well-formed, ordered, at most MAX_RANGE_DAYS and not past KL today — the
  // bounds the page clamps to — so this endpoint cannot scan the whole table.
  if (!isBoundedRange(from, to)) return [];
  const trafficMode = parseTrafficMode(typeof traffic === 'string' ? traffic : undefined);

  const pathnames = await searchPages({ from, to }, trafficMode, trimmed);
  const titles = await resolvePageTitles(pathnames);

  // Preserve the relevance order from searchPages.
  return pathnames.map((pathname) => ({ pathname, title: titles.get(pathname) ?? null }));
}
