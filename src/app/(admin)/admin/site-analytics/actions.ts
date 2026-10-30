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

  const trimmed = query.trim();
  if (!trimmed) return [];
  // Well-formed, ordered and at most MAX_RANGE_DAYS — the same bound the page
  // enforces, so this endpoint cannot be used to scan the whole table.
  if (!isBoundedRange(from, to)) return [];

  const pathnames = await searchPages({ from, to }, parseTrafficMode(traffic), trimmed);
  const titles = await resolvePageTitles(pathnames);

  // Preserve the relevance order from searchPages.
  return pathnames.map((pathname) => ({ pathname, title: titles.get(pathname) ?? null }));
}
