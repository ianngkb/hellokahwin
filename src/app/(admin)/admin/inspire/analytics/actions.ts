'use server';

import { desc, ilike } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { articles } from '@/lib/db/schema/articles';
import { requireAdminSectionAction } from '@/lib/auth/admin';
import type { PickerArticle } from '@/components/admin/article-multi-picker';
import { articleDisplayStatus } from '@/components/admin/article-status-chip';
import { PICKER_MAX_TERM_CHARS, PICKER_MIN_TERM_CHARS, pickerTerm } from './picker-term';

/** Most matches one search returns. */
const PICKER_SEARCH_LIMIT = 20;

/**
 * Article search for `ArticleMultiPicker` (the comparison page, and the cluster
 * editor). Matches the TITLE, any status — an admin comparing a draft against
 * its published sibling must be able to find both — newest edit first.
 *
 * Fewer than 2 characters returns nothing without querying. Characters are
 * counted (and the 200-character cap applied) in code points, the same way the
 * picker counts them, so one emoji is one character and the cap never splits
 * a surrogate pair. `%`, `_` and the
 * backslash are escaped so a typed wildcard matches itself (a trailing
 * backslash would otherwise act as LIKE's escape character and raise 22025).
 * `ilike` with a leading wildcard cannot use a btree index; `articles` is a few
 * thousand rows, so the scan is milliseconds.
 */
export async function searchArticlesForPickerAction(
  query: string,
): Promise<{ articles: PickerArticle[] } | { error: string }> {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  const chars = Array.from(pickerTerm(typeof query === 'string' ? query : '')).slice(
    0,
    PICKER_MAX_TERM_CHARS,
  );
  if (chars.length < PICKER_MIN_TERM_CHARS) return { articles: [] };
  const term = chars.join('');

  try {
    const rows = await db
      .select({
        id: articles.id,
        title: articles.title,
        status: articles.status,
        scheduledPublishAt: articles.scheduledPublishAt,
      })
      .from(articles)
      .where(ilike(articles.title, `%${term.replace(/[\\%_]/g, '\\$&')}%`))
      .orderBy(desc(articles.updatedAt), desc(articles.id))
      .limit(PICKER_SEARCH_LIMIT);
    return {
      articles: rows.map((r) => ({
        id: r.id,
        title: r.title,
        status: articleDisplayStatus(r.status, r.scheduledPublishAt),
      })),
    };
  } catch (err) {
    console.error('[inspire-analytics] article search failed:', err);
    return { error: 'Could not search articles — please try again.' };
  }
}
