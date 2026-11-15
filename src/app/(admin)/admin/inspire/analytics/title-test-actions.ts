'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { articleEditLocks, articles, inspireCategories } from '@/lib/db/schema/articles';
import { articleTitleTests } from '@/lib/db/schema/article-title-tests';
import { requireAdminSectionAction } from '@/lib/auth/admin';
import { logAuditEvent } from '@/lib/audit/log';
import { PURGE_IMMEDIATELY } from '@/lib/cache/purge';
import { googleTitleOf, MAX_TITLE_CHARS } from './title-test-title';

const PAGE = '/admin/inspire/analytics';

type Result = { ok: true } | { error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);

const RUNNING = 'This article already has a test running. End it before starting another.';
const NOTHING_SAVED = 'The title could not be changed. Nothing was saved — try again.';

/**
 * Put a new Google title (`articles.meta_title`) live on a published article
 * and start measuring it. Ported from The Wedding Notebook.
 *
 * HelloKahwin has no versioned `updateArticle` core, so the guarantees TWN gets
 * from it are made here, in ONE transaction under the article's row lock:
 *   - the new title and the test row commit together — a title is never live
 *     without its baseline, and two quick presses cannot start two tests;
 *   - refused while anyone has the article open in the editor (an unexpired
 *     `article_edit_locks` row): the editor saves every field, so its next
 *     save would silently put the old title back mid-test;
 *   - refused if the live title changed since this request read it, so the
 *     recorded "old title" is always the one Google was really shown.
 * After commit: an audit row and the same public cache refresh an editor save
 * of a published article does.
 */
export async function startTitleTestAction(articleId: string, rawTitle: string): Promise<Result> {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  if (!isUuid(articleId)) return { error: 'That article no longer exists.' };
  const newTitle = (typeof rawTitle === 'string' ? rawTitle : '').replace(/\s+/g, ' ').trim();
  if (!newTitle) return { error: 'Type the new title first.' };
  if (newTitle.length > MAX_TITLE_CHARS) {
    return {
      error: `Keep it to ${MAX_TITLE_CHARS} characters or fewer, or Google cuts it off.`,
    };
  }

  const [a] = await db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      metaTitle: articles.metaTitle,
      status: articles.status,
      categorySlug: inspireCategories.slug,
    })
    .from(articles)
    .leftJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
    .where(eq(articles.id, articleId))
    .limit(1);
  if (!a) return { error: 'That article no longer exists.' };
  if (a.status !== 'published') {
    return { error: 'Only a published article can be tested: Google only sees live pages.' };
  }

  const oldTitle = googleTitleOf(a);
  if (oldTitle === newTitle) return { error: 'That is already the title Google sees.' };

  const [running] = await db
    .select({ id: articleTitleTests.id })
    .from(articleTitleTests)
    .where(and(eq(articleTitleTests.articleId, a.id), isNull(articleTitleTests.endedAt)))
    .limit(1);
  if (running) return { error: RUNNING };

  let outcome: Result;
  try {
    outcome = await db.transaction(async (tx): Promise<Result> => {
      // Serialise with any other write to this article for the rest of the tx.
      await tx.execute(sql`SELECT id FROM articles WHERE id = ${a.id}::uuid FOR UPDATE`);

      const [lock] = await tx
        .select({ lockedByName: articleEditLocks.lockedByName })
        .from(articleEditLocks)
        .where(
          and(eq(articleEditLocks.articleId, a.id), gt(articleEditLocks.expiresAt, new Date())),
        )
        .limit(1);
      if (lock) {
        return {
          error: `${lock.lockedByName} has this article open in the editor. Their next save would put the old title back, so close the editor first, then start the test.`,
        };
      }

      const [live] = await tx
        .select({ title: articles.title, metaTitle: articles.metaTitle, status: articles.status })
        .from(articles)
        .where(eq(articles.id, a.id))
        .limit(1);
      if (!live || live.status !== 'published' || googleTitleOf(live) !== oldTitle) {
        return { error: 'The article changed while you were typing. Reload and try again.' };
      }

      const [other] = await tx
        .select({ id: articleTitleTests.id })
        .from(articleTitleTests)
        .where(and(eq(articleTitleTests.articleId, a.id), isNull(articleTitleTests.endedAt)))
        .limit(1);
      if (other) return { error: RUNNING };

      await tx
        .update(articles)
        .set({ metaTitle: newTitle, updatedAt: new Date() })
        .where(eq(articles.id, a.id));
      await tx.insert(articleTitleTests).values({
        articleId: a.id,
        oldTitle,
        newTitle,
        createdBy: user.id,
      });
      return { ok: true };
    });
  } catch (err) {
    console.error('[title-tests] start failed; nothing was saved', err);
    return { error: NOTHING_SAVED };
  }
  if ('error' in outcome) return outcome;

  logAuditEvent({
    entityType: 'article',
    entityId: a.id,
    action: 'updated',
    performedBy: user.id,
    entityLabel: a.title,
    changes: { metaTitle: { old: a.metaTitle, new: newTitle } },
    metadata: { source: 'title_test' },
  });

  // The same public refresh an editor save of a published article does.
  if (a.categorySlug) revalidatePath(`/artikel/${a.categorySlug}/${a.slug}`);
  revalidatePath('/artikel');
  revalidateTag('articles', PURGE_IMMEDIATELY);
  revalidatePath(PAGE);
  return { ok: true };
}

/** Stop the clock on a test. Whatever title is live stays live. */
export async function endTitleTestAction(testId: string): Promise<Result> {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  if (!isUuid(testId)) return { error: 'That test has already ended.' };

  const rows = await db
    .update(articleTitleTests)
    .set({ endedAt: new Date() })
    .where(and(eq(articleTitleTests.id, testId), isNull(articleTitleTests.endedAt)))
    .returning({ id: articleTitleTests.id });
  if (rows.length === 0) return { error: 'That test has already ended.' };

  revalidatePath(PAGE);
  return { ok: true };
}
