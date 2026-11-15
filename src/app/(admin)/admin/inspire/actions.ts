'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { PURGE_IMMEDIATELY } from '@/lib/cache/purge';
import { eq, ne, and, inArray, isNull, like, sql } from 'drizzle-orm';
import {
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { db } from '@/lib/db/drizzle';
import { articles, articleCategories, inspireCategories } from '@/lib/db/schema/articles';
import { media, mediaArticleUsage } from '@/lib/db/schema/media';
import { deleteR2Objects } from '@/lib/r2/delete';
import {
  collectReferencedAssets,
  copyReferencedAssets,
  rewriteR2Urls,
} from '@/lib/inspire/duplicate-assets';
import { requireAdminSectionAction } from '@/lib/auth/admin';
import { logAuditEvent, logAuditEventAsync } from '@/lib/audit/log';
import { checkIsSuperAdmin } from '@/lib/auth/admin';
import { generateSlug } from '@/lib/utils/slug';
import {
  ARTICLE_REVIEW_STATUSES,
  type ArticleReviewStatus,
  type ArticleStatus,
} from '@/lib/constants';
import { getR2Client, getR2Bucket, getR2PublicUrl } from '@/lib/r2/client';
import { generateVariants, getDefaultPresets } from '@/lib/storage/image-variants';
import { generateLqipForCover } from '@/lib/storage/lqip';
import type { ImageVariants } from '@/lib/storage/image-variants';
import {
  framingFromStoredOverride,
  processSmartCrops,
  resolveOriginalKey,
} from '@/lib/storage/smart-crop';
import { submitUrlToIndexNow } from '@/lib/seo/indexnow';
import { INSPIRE_AUTHORS_TAG, listSelectableAuthors } from '@/lib/authors/queries';
import { MAX_BULK_REASSIGN } from '@/lib/authors/gate';

// ── R2 rename helpers (best-effort, used during soft-delete) ─────────────

async function renameR2Prefix(oldPrefix: string, newPrefix: string): Promise<void> {
  const r2 = getR2Client();
  const bucket = getR2Bucket();

  let continuationToken: string | undefined;
  do {
    const list = await r2.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: oldPrefix,
        ContinuationToken: continuationToken,
      }),
    );

    for (const obj of list.Contents ?? []) {
      if (!obj.Key) continue;
      const newKey = newPrefix + obj.Key.slice(oldPrefix.length);

      await r2.send(
        new CopyObjectCommand({
          Bucket: bucket,
          CopySource: `${bucket}/${obj.Key}`,
          Key: newKey,
        }),
      );
      await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key }));
    }

    continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (continuationToken);
}

async function rewriteMediaUrls(
  articleId: string,
  oldPrefix: string,
  newPrefix: string,
): Promise<void> {
  const publicUrl = getR2PublicUrl().replace(/\/+$/, '');
  const oldUrlPrefix = `${publicUrl}/${oldPrefix}`;
  const newUrlPrefix = `${publicUrl}/${newPrefix}`;

  const records = await db
    .select({
      id: media.id,
      r2Key: media.r2Key,
      url: media.url,
      originalUrl: media.originalUrl,
      variants: media.variants,
    })
    .from(media)
    .where(and(eq(media.originalArticleId, articleId), like(media.r2Key, `${oldPrefix}%`)));

  for (const record of records) {
    const newR2Key = newPrefix + record.r2Key.slice(oldPrefix.length);
    const newUrl = record.url.replace(oldUrlPrefix, newUrlPrefix);
    const newOriginalUrl = record.originalUrl.replace(oldUrlPrefix, newUrlPrefix);

    let newVariants = record.variants;
    if (newVariants) {
      newVariants = { ...newVariants };
      for (const key of Object.keys(newVariants) as (keyof ImageVariants)[]) {
        const v = newVariants[key];
        if (v) {
          newVariants[key] = { ...v, url: v.url.replace(oldUrlPrefix, newUrlPrefix) };
        }
      }
    }

    await db
      .update(media)
      .set({
        r2Key: newR2Key,
        url: newUrl,
        originalUrl: newOriginalUrl,
        variants: newVariants,
        updatedAt: new Date(),
      })
      .where(eq(media.id, record.id));
  }
}

export async function deleteArticleAction(articleId: string) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  const [article] = await db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      status: articles.status,
    })
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);

  if (!article) return { error: 'Article not found' };
  if (article.status === 'deleted') return { error: 'Article already deleted' };

  // Check if the article has any media — if none, hard-delete immediately
  const [mediaCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(media)
    .where(eq(media.originalArticleId, articleId));

  const hasMedia = (mediaCount?.count ?? 0) > 0;

  if (hasMedia) {
    // Soft-delete: keep article so media can be cleaned up via media library
    await db
      .update(articles)
      .set({ status: 'deleted', title: `(Deleted) ${article.title}`, updatedAt: new Date() })
      .where(eq(articles.id, articleId));

    // Best-effort R2 folder rename
    const oldPrefix = `inspire/${article.slug}/`;
    const newPrefix = `inspire/(Deleted) ${article.slug}/`;
    try {
      await renameR2Prefix(oldPrefix, newPrefix);
      await rewriteMediaUrls(articleId, oldPrefix, newPrefix);
    } catch (err) {
      console.warn('R2 rename failed for article', articleId, err);
    }
  } else {
    // No media — hard-delete the article and clean up R2 folder
    await db.delete(articles).where(eq(articles.id, articleId));

    // Best-effort R2 cleanup for any orphaned files
    const r2Prefix = `inspire/${article.slug}/`;
    try {
      const r2 = getR2Client();
      const bucket = getR2Bucket();
      let continuationToken: string | undefined;
      do {
        const listResult = await r2.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: r2Prefix,
            ContinuationToken: continuationToken,
          }),
        );
        for (const obj of listResult.Contents ?? []) {
          if (obj.Key) {
            await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key }));
          }
        }
        continuationToken = listResult.IsTruncated ? listResult.NextContinuationToken : undefined;
      } while (continuationToken);
    } catch (err) {
      console.warn('R2 cleanup failed for article', articleId, err);
    }
  }

  logAuditEvent({
    entityType: 'article',
    entityId: articleId,
    action: hasMedia ? 'soft_deleted' : 'hard_deleted',
    performedBy: user.id,
    metadata: { title: article.title },
  });

  revalidatePath('/admin/inspire');
  revalidatePath('/artikel');
  revalidateTag('articles', PURGE_IMMEDIATELY);
  return { success: true };
}

export async function masterDeleteArticleAction(articleId: string) {
  // F3: Require super-admin for this irreversible action
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  const isSuperAdmin = await checkIsSuperAdmin();
  if (!isSuperAdmin) return { error: 'Only super admins can master delete articles' };

  const [article] = await db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      status: articles.status,
    })
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);

  if (!article) return { error: 'Article not found' };

  // F4: Collect media and delete atomically inside a single transaction
  const mediaCount = await db.transaction(async (tx) => {
    // Collect parent media IDs for this article
    const parentMedia = await tx
      .select({ id: media.id })
      .from(media)
      .where(eq(media.originalArticleId, articleId));

    const parentIds = parentMedia.map((m) => m.id);

    // F2: Delete child media (crops/variants) that reference these parent media rows
    if (parentIds.length > 0) {
      await tx.delete(media).where(inArray(media.parentMediaId, parentIds));
    }

    // Delete parent media rows (FK is set null, not cascade)
    if (parentIds.length > 0) {
      await tx.delete(media).where(eq(media.originalArticleId, articleId));
    }

    // Delete the article row (cascades to articleTags, articleCategories, etc.)
    await tx.delete(articles).where(eq(articles.id, articleId));

    return parentIds.length;
  });

  // F1: Best-effort R2 cleanup — check both original and soft-deleted prefixes
  const r2Prefixes = [`inspire/${article.slug}/`];
  if (article.status === 'deleted') {
    r2Prefixes.push(`inspire/(Deleted) ${article.slug}/`);
  }

  try {
    const r2 = getR2Client();
    const bucket = getR2Bucket();
    for (const r2Prefix of r2Prefixes) {
      let continuationToken: string | undefined;
      do {
        const listResult = await r2.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: r2Prefix,
            ContinuationToken: continuationToken,
          }),
        );
        for (const obj of listResult.Contents ?? []) {
          if (obj.Key) {
            await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key }));
          }
        }
        continuationToken = listResult.IsTruncated ? listResult.NextContinuationToken : undefined;
      } while (continuationToken);
    }
  } catch (err) {
    console.warn('R2 cleanup failed during master delete for article', articleId, err);
  }

  // Invalidate BEFORE the audit write. The row is already gone from the DB;
  // if the awaited audit insert throws (a DB blip, an FK surprise), an
  // exception here would skip revalidation entirely and the forever-cached
  // public page would keep serving a deleted article. Cache correctness for
  // readers outranks the audit row, which is best-effort by design.
  revalidatePath('/admin/inspire');
  revalidatePath('/artikel');
  revalidateTag('articles', PURGE_IMMEDIATELY);

  // F5: Await audit log for this critical destructive action
  try {
    await logAuditEventAsync({
      entityType: 'article',
      entityId: articleId,
      action: 'master_deleted',
      performedBy: user.id,
      metadata: { title: article.title, mediaCount },
    });
  } catch (err) {
    console.error('[master-delete] audit log failed for article', articleId, err);
  }

  return { success: true };
}

export async function duplicateArticleAction(articleId: string) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  const [original] = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
  if (!original) return { error: 'Article not found' };
  if (original.status === 'deleted') return { error: 'Cannot duplicate a deleted article' };

  const newSlug = generateSlug(original.title + ' copy') + '-' + Date.now().toString(36);

  // Give the copy its OWN photos.
  //
  // Cloning just the row leaves the copy's images physically inside the SOURCE
  // article's R2 folder, so master-deleting the source silently destroys the
  // copy's pictures. Copying the objects first makes the duplicate
  // self-contained, which is also what keeps the delete paths safe without a
  // reference check. See `@/lib/inspire/duplicate-assets`.
  //
  // Best-effort by design: an image that fails to copy is left pointing at the
  // original URL rather than aborting a duplication the admin asked for — and
  // the result says so, so the admin is warned the copy still shares photos.
  let bases: string[] = [];
  let canonicalBase = '';
  let r2Unavailable = false;
  try {
    canonicalBase = getR2PublicUrl();
    bases = [canonicalBase];
  } catch (err) {
    // Duplication used to be a pure DB clone that ran anywhere. Keep it working
    // without R2 configured rather than failing the whole action — but the
    // result is a duplicate sharing 100% of the source's photos, so it must
    // never be reported as a clean copy.
    console.warn('[duplicateArticle] R2 public URL unavailable; copying no assets', err);
    r2Unavailable = true;
  }

  const assets = canonicalBase
    ? collectReferencedAssets(
        [
          original.coverImageUrl,
          original.coverImageVariants,
          original.coverImageSmartCrops,
          original.content,
        ],
        bases,
      )
    : { dirs: [], siblingKeys: [], skipped: [] };

  let keyMap = new Map<string, string>();
  let copied = 0;
  // Only count skips that were inspire-shaped but unhandled. A URL pointing at
  // another bucket was never ours to copy and is unaffected by deleting the
  // source — counting it would fire the "some photos could not be copied"
  // warning on ordinary articles, and a warning that cries wolf gets ignored.
  let failed = assets.skipped.filter((s) => s.reason !== 'not under inspire/').length;
  let copyErrored = r2Unavailable;

  if (assets.dirs.length > 0 || assets.siblingKeys.length > 0) {
    try {
      const report = await copyReferencedAssets(
        getR2Client(),
        getR2Bucket(),
        assets,
        newSlug,
        (message, err) => console.warn('[duplicateArticle]', message, err),
      );
      keyMap = report.keyMap;
      copied = report.copied;
      failed += report.failed;
    } catch (err) {
      // Wholesale failure (bad credentials, bucket 401). Silence here is what
      // recreates the original incident, so make it loud.
      copyErrored = true;
      console.error('[duplicateArticle] asset copy failed for article', articleId, newSlug, err);
    }
  }

  const rewrite = <T>(value: T): T => rewriteR2Urls(value, keyMap, bases, canonicalBase);

  // If the transaction fails after the copy, the objects under
  // `inspire/{newSlug}/` belong to no article and nothing would ever reclaim
  // them — and the admin's natural retry mints a fresh slug and a fresh orphan
  // set. Clean up before reporting the failure.
  const newArticle = await db
    .transaction(async (tx) => {
      const [inserted] = await tx
        .insert(articles)
        .values({
          title: `${original.title} (Copy)`,
          slug: newSlug,
          content: rewrite(original.content),
          coverImageUrl: rewrite(original.coverImageUrl),
          // Carried across so the copy keeps its responsive sizes, social crops
          // and blur placeholder. Dropping these left every duplicate serving
          // one full-size hero with no mobile variant and no og image.
          coverImageVariants: rewrite(original.coverImageVariants),
          coverImageQuality: original.coverImageQuality,
          coverImageSmartCrops: rewrite(original.coverImageSmartCrops),
          coverImageFocalPoint: original.coverImageFocalPoint,
          coverImageDetectionData: original.coverImageDetectionData,
          coverImageFocalPointOverride: original.coverImageFocalPointOverride,
          coverImageLqip: original.coverImageLqip,
          status: 'draft',
          authorId: user.id,
          primaryCategoryId: original.primaryCategoryId,
          // A copy is the same provenance as its original — duplicating a
          // human-written article must not silently relabel it AI, which is what
          // falling through to the column default would do.
          authorship: original.authorship,
          // ...but the COPY has not been reviewed, whatever the original's state.
          // Carrying `reviewed` across would let edited copy inherit a sign-off
          // for text nobody has read.
          reviewStatus: 'pending_review',
          // Compat mirror for rollback safety — removed in the follow-up migration that drops these columns.
          isAiGenerated: original.isAiGenerated,
          humanReviewedAt: null,
        })
        .returning({ id: articles.id });

      // Clone the media rows for everything we copied, so the duplicate owns its
      // photos in the media library too — and so the delete paths see it as an
      // article WITH media, exactly like a normally-created one.
      if (keyMap.size > 0) {
        // Chunked on both sides: a gallery-heavy article yields hundreds of keys,
        // and one oversized statement failing here would abort AFTER all the R2
        // work is paid for.
        const copiedKeys = [...keyMap.keys()];
        const sourceMedia: (typeof media.$inferSelect)[] = [];
        for (let i = 0; i < copiedKeys.length; i += DUPLICATE_DB_CHUNK) {
          const chunk = copiedKeys.slice(i, i + DUPLICATE_DB_CHUNK);
          sourceMedia.push(...(await tx.select().from(media).where(inArray(media.r2Key, chunk))));
        }

        if (sourceMedia.length > 0) {
          // Pre-generate ids so a child row can point at its cloned parent in the
          // same insert; a parent that was not itself cloned becomes a root.
          const idMap = new Map(sourceMedia.map((m) => [m.id, crypto.randomUUID()]));
          const rows = sourceMedia.map((m) => ({
            ...m,
            id: idMap.get(m.id)!,
            r2Key: keyMap.get(m.r2Key) ?? m.r2Key,
            url: rewrite(m.url),
            originalUrl: rewrite(m.originalUrl),
            variants: rewrite(m.variants),
            smartCrops: rewrite(m.smartCrops),
            originalArticleId: inserted.id,
            parentMediaId: m.parentMediaId ? (idMap.get(m.parentMediaId) ?? null) : null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));
          for (let i = 0; i < rows.length; i += DUPLICATE_DB_CHUNK) {
            await tx.insert(media).values(rows.slice(i, i + DUPLICATE_DB_CHUNK));
          }

          // Record the copy as a USER of its own media. The junction is otherwise
          // only reconciled on article save, so until someone opened and saved the
          // copy its brand-new photos would read as "used by 0 articles" — and an
          // admin tidying unused media would delete the very files we just copied.
          const usage = rows.map((r) => ({ mediaId: r.id, articleId: inserted.id }));
          for (let i = 0; i < usage.length; i += DUPLICATE_DB_CHUNK) {
            await tx
              .insert(mediaArticleUsage)
              .values(usage.slice(i, i + DUPLICATE_DB_CHUNK))
              .onConflictDoNothing();
          }
        }
      }

      // Clone category associations
      const cats = await tx
        .select()
        .from(articleCategories)
        .where(eq(articleCategories.articleId, articleId));

      if (cats.length > 0) {
        await tx.insert(articleCategories).values(
          cats.map((c) => ({
            articleId: inserted.id,
            categoryId: c.categoryId,
          })),
        );
      }

      return inserted;
    })
    .catch(async (err) => {
      await reclaimCopiedObjects(newSlug, [...keyMap.values()]).catch((cleanupErr) =>
        console.warn('[duplicateArticle] orphan cleanup failed', newSlug, cleanupErr),
      );
      console.error('[duplicateArticle] insert failed for article', articleId, newSlug, err);
      // Returned, not rethrown: the caller awaits this action inside a
      // `startTransition`, so a thrown rejection surfaces as no toast at all —
      // silence after real R2 work has already run.
      return null;
    });

  if (!newArticle) {
    return { error: 'Could not duplicate the article. Nothing was saved.' };
  }

  logAuditEvent({
    entityType: 'article',
    entityId: newArticle.id,
    action: 'duplicated',
    performedBy: user.id,
    // Counts make a partial copy visible in the audit trail.
    metadata: {
      sourceArticleId: articleId,
      assetsCopied: copied,
      assetsFailed: failed,
      assetCopyErrored: copyErrored,
    },
  });

  revalidatePath('/admin/inspire');
  revalidateTag('articles', PURGE_IMMEDIATELY);
  return {
    success: true,
    newArticleId: newArticle.id,
    assetsCopied: copied,
    // The caller shows a warning when the copy was partial: the duplicate still
    // shares some photos with its source, so deleting the source would break it.
    assetsIncomplete: copyErrored || failed > 0,
  };
}

/**
 * Rows per statement when cloning a duplicate's media. A gallery-heavy article
 * clones hundreds of rows; chunking keeps each statement small.
 */
const DUPLICATE_DB_CHUNK = 100;

/**
 * Delete the objects a failed duplication copied — but only when it is certain
 * nothing uses them.
 *
 * Two traps make the obvious "delete `inspire/{newSlug}/`" wrong:
 *  1. The transaction may have COMMITTED and only the response failed (a dropped
 *     connection). The copy's row is live; deleting its prefix strips it of
 *     every image we just gave it.
 *  2. `newSlug` ends in `Date.now().toString(36)`, so two duplications of the
 *     same title in the same millisecond collide. The loser's cleanup would wipe
 *     the winner's objects, leaving a live article with no photos.
 *
 * So: delete only the exact keys this run wrote, and only once the article is
 * confirmed absent. Anything left behind is inert storage, which is strictly
 * cheaper than a live article with holes in it.
 */
async function reclaimCopiedObjects(newSlug: string, copiedKeys: string[]): Promise<void> {
  if (copiedKeys.length === 0) return;

  const [survivor] = await db
    .select({ id: articles.id })
    .from(articles)
    .where(eq(articles.slug, newSlug))
    .limit(1);
  if (survivor) return; // it committed after all — these objects are in use

  // DeleteObjects caps at 1000 keys per call.
  for (let i = 0; i < copiedKeys.length; i += 1000) {
    await deleteR2Objects(copiedKeys.slice(i, i + 1000));
  }
}

/**
 * Move an article to an explicit review status.
 *
 * Takes a TARGET status rather than toggling. A toggle over three states is
 * ambiguous, and the list's one-click "Needs review" chip has to be predictable:
 * clicking it always means "I have reviewed this", never "cycle to whatever is
 * next".
 *
 * Note there is no `isAiGenerated` guard any more. Review status now applies to
 * every article regardless of authorship — the owner may well want to sign off a
 * legacy human post, and the old guard made that impossible.
 */
export async function setReviewStatusAction(articleId: string, target: ArticleReviewStatus) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  // Validated before it reaches Postgres: an unknown value would otherwise be
  // sent as an invalid enum literal and raise 22P02. This is a server action, so
  // the argument is attacker-controllable regardless of what the UI sends.
  if (!ARTICLE_REVIEW_STATUSES.includes(target)) {
    return { error: 'Unknown review status' };
  }

  const [article] = await db
    .select({ id: articles.id })
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);

  if (!article) return { error: 'Article not found' };

  const reviewed = target === 'reviewed';
  const reviewedAt = reviewed ? new Date() : null;
  // Cleared on any non-reviewed status: a stale "reviewed by X" sitting against
  // an article the owner has just sent back for changes is worse than no
  // attribution at all.
  const reviewedBy = reviewed ? user.id : null;

  // Deliberately does not bump updatedAt: the review mark is admin metadata,
  // not a content change, and none of it is rendered publicly.
  await db
    .update(articles)
    .set({
      reviewStatus: target,
      reviewedAt,
      reviewedBy,
      // Compat mirror for rollback safety — removed in the follow-up migration that drops these columns.
      humanReviewedAt: reviewedAt,
    })
    .where(eq(articles.id, articleId));

  logAuditEvent({
    entityType: 'article',
    entityId: articleId,
    action: `review_status_${target}`,
    performedBy: user.id,
  });

  revalidatePath('/admin/inspire');
  return { success: true, reviewStatus: target };
}

export async function toggleArticleStatusAction(articleId: string) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  const [article] = await db
    .select({
      id: articles.id,
      status: articles.status,
      slug: articles.slug,
      categorySlug: inspireCategories.slug,
    })
    .from(articles)
    .leftJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
    .where(eq(articles.id, articleId))
    .limit(1);

  if (!article) return { error: 'Article not found' };
  if (article.status === 'deleted') return { error: 'Cannot change status of a deleted article' };

  const newStatus: ArticleStatus = article.status === 'draft' ? 'published' : 'draft';
  const publishedAt = newStatus === 'published' ? new Date() : null;

  await db
    .update(articles)
    .set({ status: newStatus, publishedAt, scheduledPublishAt: null, updatedAt: new Date() })
    .where(eq(articles.id, articleId));

  logAuditEvent({
    entityType: 'article',
    entityId: articleId,
    action: 'status_changed',
    performedBy: user.id,
    changes: { status: { old: article.status, new: newStatus } },
  });

  revalidatePath('/admin/inspire');
  revalidatePath('/artikel');
  revalidateTag('articles', PURGE_IMMEDIATELY);

  // Revalidate the sitemap entries that newly-published URLs land in, and
  // push the URL to IndexNow (Bing/Yandex hub). Only fire on the
  // draft → published transition; the reverse is out of scope (see
  // deferred-work.md). The revalidatePath calls fire unconditionally per
  // the spec's I/O matrix — they are no-ops for a category-less article
  // (the public sitemap inner-joins inspireCategories and would skip it
  // anyway) but keep behaviour predictable and matrix-conformant. The
  // IndexNow call is fire-and-forget — the publish action returns success
  // even if the hub is slow or unreachable, and is gated on having a
  // category because we can't build a canonical URL without one.
  if (article.status !== 'published' && newStatus === 'published') {
    revalidatePath('/sitemap.xml');

    if (article.categorySlug) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hellokahwin.com';
      const canonicalUrl = `${baseUrl}/artikel/${article.categorySlug}/${article.slug}`;
      void submitUrlToIndexNow(canonicalUrl, articleId).catch((err) => {
        console.error('[indexnow] submit failed for', canonicalUrl, err);
      });
    }
  }

  return { success: true };
}

export async function bulkDeleteArticlesAction(articleIds: string[]) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  if (articleIds.length === 0) return { error: 'No articles selected' };

  const toDelete = await db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      status: articles.status,
    })
    .from(articles)
    .where(inArray(articles.id, articleIds));

  const nonDeleted = toDelete.filter((a) => a.status !== 'deleted');
  if (nonDeleted.length === 0) return { error: 'No articles to delete' };

  for (const article of nonDeleted) {
    await db
      .update(articles)
      .set({ status: 'deleted', title: `(Deleted) ${article.title}`, updatedAt: new Date() })
      .where(eq(articles.id, article.id));

    const oldPrefix = `inspire/${article.slug}/`;
    const newPrefix = `inspire/(Deleted) ${article.slug}/`;
    try {
      await renameR2Prefix(oldPrefix, newPrefix);
      await rewriteMediaUrls(article.id, oldPrefix, newPrefix);
    } catch (err) {
      console.warn('R2 rename failed for article', article.id, err);
    }

    logAuditEvent({
      entityType: 'article',
      entityId: article.id,
      action: 'soft_deleted',
      performedBy: user.id,
      metadata: { title: article.title, bulk: true },
    });
  }

  revalidatePath('/admin/inspire');
  revalidatePath('/artikel');
  revalidateTag('articles', PURGE_IMMEDIATELY);
  return { success: true };
}

export async function bulkStatusChangeArticlesAction(
  articleIds: string[],
  newStatus: ArticleStatus,
) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  if (articleIds.length === 0) return { error: 'No articles selected' };
  if (newStatus === 'deleted') return { error: 'Use the delete action to soft-delete articles' };

  await db.transaction(async (tx) => {
    const updateData: Record<string, unknown> = {
      status: newStatus,
      scheduledPublishAt: null,
      updatedAt: new Date(),
    };
    if (newStatus === 'draft') {
      updateData.publishedAt = null;
    }

    // `ne(status, 'deleted')` matches the single-article toggle's guard: a
    // soft-deleted article has had its R2 images renamed, so resurrecting one
    // through a bulk selection republishes it with broken image URLs.
    await tx
      .update(articles)
      .set(updateData)
      .where(and(inArray(articles.id, articleIds), ne(articles.status, 'deleted')));

    // Set publishedAt only for articles that don't already have one
    if (newStatus === 'published') {
      await tx
        .update(articles)
        .set({ publishedAt: new Date() })
        .where(
          and(
            inArray(articles.id, articleIds),
            isNull(articles.publishedAt),
            ne(articles.status, 'deleted'),
          ),
        );
    }
  });

  for (const id of articleIds) {
    logAuditEvent({
      entityType: 'article',
      entityId: id,
      action: 'status_changed',
      performedBy: user.id,
      changes: { status: { old: 'unknown', new: newStatus } },
      metadata: { bulk: true },
    });
  }

  revalidatePath('/admin/inspire');
  revalidatePath('/artikel');
  revalidateTag('articles', PURGE_IMMEDIATELY);
  return { success: true };
}

/**
 * Move a selection of articles onto one author.
 *
 * The whole point of the feature: 2,235 of 2,286 published articles sit on the
 * house account, and re-crediting a category's back catalogue one editor screen
 * at a time is not a thing anyone would actually do.
 *
 * ONE `UPDATE ... WHERE id IN (...)` inside a single transaction, exactly like
 * `bulkStatusChangeArticlesAction` — 500 rows on a single indexed-PK update
 * finishes well inside the 8s role-level `statement_timeout`, where a per-id
 * loop would hold one of five pooled connections for 500 round-trips and blow
 * straight through it. The audit rows are written per id AFTER the commit, for
 * the same reason that action does it: `logAuditEvent` defers through `after()`
 * and could never have joined the transaction anyway.
 */
export async function bulkReassignAuthorAction(articleIds: string[], authorId: string) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  if (articleIds.length === 0) return { error: 'No articles selected' };
  if (articleIds.length > MAX_BULK_REASSIGN) {
    return { error: `Maximum ${MAX_BULK_REASSIGN} articles per batch` };
  }

  // Same authorisation check as the single-article editor path: `author_id` FKs
  // to `profiles`, which holds every couple and vendor on the site, so the
  // selectable list is what stops an arbitrary profile id becoming a byline.
  const selectable = await listSelectableAuthors();
  const target = selectable.find((a) => a.id === authorId);
  if (!target) return { error: 'That author is not available for attribution.' };

  // Read the CURRENT author of each article before overwriting it. This is the
  // only record of where a bulk-moved article came from: the intended job here
  // is re-crediting the ~2,235-article house back catalogue, and an audit entry
  // saying only "now attributed to X" cannot be walked backwards. One indexed
  // lookup over at most MAX_BULK_REASSIGN primary keys, so it costs nothing
  // against the 8s statement timeout.
  const previous = await db
    .select({ id: articles.id, authorId: articles.authorId })
    .from(articles)
    .where(inArray(articles.id, articleIds));
  const previousAuthorById = new Map(previous.map((r) => [r.id, r.authorId]));

  await db.transaction(async (tx) => {
    await tx
      .update(articles)
      .set({ authorId, updatedAt: new Date() })
      .where(inArray(articles.id, articleIds));
  });

  for (const id of articleIds) {
    const old = previousAuthorById.get(id);
    // Skip ids that matched no row — a stale selection whose article was
    // deleted between render and submit. The UPDATE already ignored them; an
    // audit entry claiming a change that never happened would be worse than
    // none.
    if (old === undefined) continue;
    logAuditEvent({
      entityType: 'article',
      entityId: id,
      action: 'author_changed',
      performedBy: user.id,
      changes: { authorId: { old, new: authorId } },
      metadata: { bulk: true, authorName: target.name },
    });
  }

  revalidatePath('/admin/inspire');
  revalidatePath('/artikel');
  // Both tags: `articles` holds the cached article pages whose byline just
  // changed, `inspire-authors` holds the archive listings the articles moved
  // between. Article pages are `revalidate = false`, so without this bust a
  // re-credited byline would never reach a reader.
  revalidateTag('articles', PURGE_IMMEDIATELY);
  revalidateTag(INSPIRE_AUTHORS_TAG, PURGE_IMMEDIATELY);
  return { success: true, moved: articleIds.length };
}

const MAX_BULK_REGENERATE = 50;

export async function bulkRegenerateImagesAction(articleIds: string[]) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  if (articleIds.length === 0) return { error: 'No articles selected' };
  if (articleIds.length > MAX_BULK_REGENERATE) {
    return { error: `Maximum ${MAX_BULK_REGENERATE} articles per batch` };
  }

  const r2 = getR2Client();
  const bucket = getR2Bucket();
  const presets = await getDefaultPresets();

  let processed = 0;
  let failed = 0;

  for (const articleId of articleIds) {
    try {
      const [article] = await db
        .select({
          id: articles.id,
          coverImageUrl: articles.coverImageUrl,
          coverImageVariants: articles.coverImageVariants,
          coverImageFocalPointOverride: articles.coverImageFocalPointOverride,
          coverImageDetectionData: articles.coverImageDetectionData,
        })
        .from(articles)
        .where(eq(articles.id, articleId))
        .limit(1);

      if (!article?.coverImageUrl) {
        failed++;
        continue;
      }

      const r2Key = resolveOriginalKey(article.coverImageVariants, article.coverImageUrl);

      // Download original from R2
      const response = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: r2Key }));

      if (!response.Body) {
        failed++;
        continue;
      }

      const originalBuffer = Buffer.from(await response.Body.transformToByteArray());

      // Generate variants
      const variants = await generateVariants(originalBuffer, r2Key, presets);

      // Generate smart crops (pass buffer to avoid redundant R2 download).
      // A stored manual focal point is REUSED rather than re-detected — otherwise
      // bulk-regenerating variants silently discards the admin's chosen point while
      // leaving the override column populated.
      const framing = framingFromStoredOverride(
        article.coverImageFocalPointOverride,
        article.coverImageDetectionData,
      );
      const { focalPoint, detectionData, smartCrops } = await processSmartCrops(r2Key, {
        ...framing,
        originalBuffer,
      });

      // The blur placeholder is derived AFTER the crops exist, from the same
      // crop the card renders — see generateLqipForCover.
      const lqip = await generateLqipForCover(smartCrops, variants, article.coverImageUrl);

      // Update DB
      await db
        .update(articles)
        .set({
          coverImageVariants: variants,
          coverImageLqip: lqip,
          coverImageQuality: 'high',
          coverImageFocalPoint: focalPoint,
          coverImageSmartCrops: smartCrops,
          // The override branch returns `detectionData: null`; persisting it would
          // destroy the stored faces that safe-zone rebuilds depend on.
          ...(framing ? {} : { coverImageDetectionData: detectionData }),
          updatedAt: new Date(),
        })
        .where(eq(articles.id, articleId));

      logAuditEvent({
        entityType: 'article',
        entityId: articleId,
        action: 'images_regenerated',
        performedBy: user.id,
        metadata: { bulk: true },
      });

      processed++;

      // Rate limit: 500ms between articles to respect Rekognition limits
      await new Promise((r) => setTimeout(r, 500));
    } catch {
      failed++;
    }
  }

  revalidatePath('/admin/inspire');
  revalidatePath('/artikel');
  revalidateTag('articles', PURGE_IMMEDIATELY);
  return { success: true, processed, failed };
}
