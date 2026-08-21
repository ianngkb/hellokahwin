'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { eq, ne, and, inArray, isNull, like, sql } from 'drizzle-orm';
import {
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { db } from '@/lib/db/drizzle';
import {
  articles,
  articleCategories,
  inspireCategories,
} from '@/lib/db/schema/articles';
import { media } from '@/lib/db/schema/media';
import { requireAdminSectionAction } from '@/lib/auth/admin';
import { logAuditEvent, logAuditEventAsync } from '@/lib/audit/log';
import { checkIsSuperAdmin } from '@/lib/auth/admin';
import { generateSlug } from '@/lib/utils/slug';
import type { ArticleStatus } from '@/lib/constants';
import { getR2Client, getR2Bucket, getR2PublicUrl } from '@/lib/r2/client';
import { generateVariants, getDefaultPresets } from '@/lib/storage/image-variants';
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
  revalidateTag('articles', 'max');
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
  revalidateTag('articles', 'max');

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

  const newArticle = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(articles)
      .values({
        title: `${original.title} (Copy)`,
        slug: newSlug,
        content: original.content,
        coverImageUrl: original.coverImageUrl,
        status: 'draft',
        authorId: user.id,
        primaryCategoryId: original.primaryCategoryId,
      })
      .returning({ id: articles.id });

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
  });

  logAuditEvent({
    entityType: 'article',
    entityId: newArticle.id,
    action: 'duplicated',
    performedBy: user.id,
    metadata: { sourceArticleId: articleId },
  });

  revalidatePath('/admin/inspire');
  revalidateTag('articles', 'max');
  return { success: true, newArticleId: newArticle.id };
}

export async function toggleHumanReviewedAction(articleId: string) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  const [article] = await db
    .select({
      id: articles.id,
      isAiGenerated: articles.isAiGenerated,
      humanReviewedAt: articles.humanReviewedAt,
    })
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);

  if (!article) return { error: 'Article not found' };
  if (!article.isAiGenerated)
    return { error: 'Human-review state only applies to AI-generated articles' };

  const humanReviewedAt = article.humanReviewedAt ? null : new Date();
  // Deliberately does not bump updatedAt: the review mark is admin metadata,
  // not a content change, and the field is not rendered publicly.
  await db.update(articles).set({ humanReviewedAt }).where(eq(articles.id, articleId));

  logAuditEvent({
    entityType: 'article',
    entityId: articleId,
    action: humanReviewedAt ? 'human_review_marked' : 'human_review_unmarked',
    performedBy: user.id,
  });

  revalidatePath('/admin/inspire');
  return { success: true, humanReviewed: Boolean(humanReviewedAt) };
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
  revalidateTag('articles', 'max');

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
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hellokahwin.com';
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
  revalidateTag('articles', 'max');
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
  revalidateTag('articles', 'max');
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
  revalidateTag('articles', 'max');
  revalidateTag(INSPIRE_AUTHORS_TAG, 'max');
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

      // Update DB
      await db
        .update(articles)
        .set({
          coverImageVariants: variants,
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
  revalidateTag('articles', 'max');
  return { success: true, processed, failed };
}
