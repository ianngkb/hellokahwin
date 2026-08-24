'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { PURGE_IMMEDIATELY } from '@/lib/cache/purge';
import { eq, and, desc, count, sql, ilike, or, inArray, asc } from 'drizzle-orm';
import { DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { db } from '@/lib/db/drizzle';
import { media, mediaArticleUsage } from '@/lib/db/schema/media';
import { articles } from '@/lib/db/schema/articles';
import { profiles } from '@/lib/db/schema/profiles';
import { requireAdminSectionAction } from '@/lib/auth/admin';
import { logAuditEvent } from '@/lib/audit/log';
import { diffFields } from '@/lib/audit/diff';
import { getR2Client, getR2Bucket } from '@/lib/r2/client';
import type { Media } from '@/lib/db/schema/media';
import type { ImageVariants } from '@/lib/storage/image-variants';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PAGE_SIZE = 100;
const MAX_BULK_DELETE = 50;

export type MediaListFilters = {
  search?: string;
  source?: 'article_upload' | 'library_upload';
  /** Filter by media kind — 'pdf' for application/pdf, 'image' for image/* */
  kind?: 'image' | 'pdf';
  originalArticleId?: string;
  articleId?: string;
  page?: number;
  pageSize?: number;
};

export type MediaListResult = {
  items: (Media & { uploaderName?: string })[];
  total: number;
  page: number;
  pageSize: number;
};

export async function getMediaListAction(
  filters: MediaListFilters,
): Promise<{ data?: MediaListResult; error?: string }> {
  const { error: authError } = await requireAdminSectionAction('media_library');
  if (authError) return { error: authError };

  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.pageSize ?? 48, MAX_PAGE_SIZE);
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (filters.source) {
    conditions.push(eq(media.source, filters.source));
  }
  if (filters.kind === 'pdf') {
    conditions.push(eq(media.mimeType, 'application/pdf'));
  } else if (filters.kind === 'image') {
    conditions.push(ilike(media.mimeType, 'image/%'));
  }
  if (filters.originalArticleId) {
    conditions.push(eq(media.originalArticleId, filters.originalArticleId));
  }
  if (filters.articleId && UUID_RE.test(filters.articleId)) {
    // Include media referenced in article content (junction) OR originally uploaded from this article
    const articleMediaIds = db
      .select({ mediaId: mediaArticleUsage.mediaId })
      .from(mediaArticleUsage)
      .where(eq(mediaArticleUsage.articleId, filters.articleId));
    conditions.push(
      or(inArray(media.id, articleMediaIds), eq(media.originalArticleId, filters.articleId)),
    );
  }
  if (filters.search) {
    const escaped = filters.search.replace(/[%_\\]/g, '\\$&');
    conditions.push(
      or(
        ilike(media.filename, `%${escaped}%`),
        ilike(media.alt, `%${escaped}%`),
        ilike(media.caption, `%${escaped}%`),
      ),
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: media.id,
        filename: media.filename,
        r2Key: media.r2Key,
        url: media.url,
        originalUrl: media.originalUrl,
        mimeType: media.mimeType,
        fileSize: media.fileSize,
        width: media.width,
        height: media.height,
        alt: media.alt,
        caption: media.caption,
        captionUrl: media.captionUrl,
        variants: media.variants,
        defaultQuality: media.defaultQuality,
        smartCrops: media.smartCrops,
        focalPoint: media.focalPoint,
        detectionData: media.detectionData,
        source: media.source,
        originalArticleId: media.originalArticleId,
        parentMediaId: media.parentMediaId,
        uploadedBy: media.uploadedBy,
        createdAt: media.createdAt,
        updatedAt: media.updatedAt,
        uploaderName: sql<string>`CONCAT(${profiles.firstName}, ' ', ${profiles.lastName})`,
      })
      .from(media)
      .leftJoin(profiles, eq(media.uploadedBy, profiles.id))
      .where(whereClause)
      .orderBy(desc(media.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ count: count() }).from(media).where(whereClause),
  ]);

  const total = totalResult[0]?.count ?? 0;

  return {
    data: {
      items: rows as (Media & { uploaderName?: string })[],
      total,
      page,
      pageSize,
    },
  };
}

export async function getMediaByIdAction(id: string): Promise<{
  data?: Media & {
    originalArticleTitle?: string;
    uploaderName?: string;
    parentMediaFilename?: string | null;
  };
  error?: string;
}> {
  const { error: authError } = await requireAdminSectionAction('media_library');
  if (authError) return { error: authError };

  if (!UUID_RE.test(id)) return { error: 'Invalid media ID' };

  const parentMedia = db
    .select({ id: media.id, filename: media.filename })
    .from(media)
    .as('parent_media');

  const [row] = await db
    .select({
      id: media.id,
      filename: media.filename,
      r2Key: media.r2Key,
      url: media.url,
      originalUrl: media.originalUrl,
      mimeType: media.mimeType,
      fileSize: media.fileSize,
      width: media.width,
      height: media.height,
      alt: media.alt,
      caption: media.caption,
      captionUrl: media.captionUrl,
      variants: media.variants,
      defaultQuality: media.defaultQuality,
      smartCrops: media.smartCrops,
      focalPoint: media.focalPoint,
      detectionData: media.detectionData,
      source: media.source,
      originalArticleId: media.originalArticleId,
      parentMediaId: media.parentMediaId,
      uploadedBy: media.uploadedBy,
      createdAt: media.createdAt,
      updatedAt: media.updatedAt,
      originalArticleTitle: articles.title,
      uploaderName: sql<string>`CONCAT(${profiles.firstName}, ' ', ${profiles.lastName})`,
      parentMediaFilename: parentMedia.filename,
    })
    .from(media)
    .leftJoin(articles, eq(media.originalArticleId, articles.id))
    .leftJoin(profiles, eq(media.uploadedBy, profiles.id))
    .leftJoin(parentMedia, eq(media.parentMediaId, parentMedia.id))
    .where(eq(media.id, id))
    .limit(1);

  if (!row) return { error: 'Media not found' };

  return {
    data: row as Media & {
      originalArticleTitle?: string;
      uploaderName?: string;
      parentMediaFilename?: string | null;
    },
  };
}

export async function updateMediaAction(
  id: string,
  data: { alt?: string; caption?: string; captionUrl?: string | null },
): Promise<{ error?: string }> {
  const { error: authError, user } = await requireAdminSectionAction('media_library');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  if (!UUID_RE.test(id)) return { error: 'Invalid media ID' };

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if ('alt' in data) updateData.alt = data.alt ?? '';
  if ('caption' in data) updateData.caption = data.caption ?? '';
  if ('captionUrl' in data) {
    const url = data.captionUrl?.trim() || null;
    if (url && !/^https?:\/\//i.test(url))
      return { error: 'Caption URL must start with http:// or https://' };
    updateData.captionUrl = url;
  }

  // Narrow read of just the diffable fields (+ label) so `changes` records what
  // actually moved rather than every submitted key.
  const [before] = await db
    .select({ alt: media.alt, caption: media.caption, captionUrl: media.captionUrl })
    .from(media)
    .where(eq(media.id, id))
    .limit(1);

  const [updated] = await db
    .update(media)
    .set(updateData)
    .where(eq(media.id, id))
    .returning({ alt: media.alt, filename: media.filename });

  logAuditEvent({
    entityType: 'media',
    entityId: id,
    action: 'updated',
    performedBy: user.id,
    entityLabel: updated?.alt || updated?.filename || null,
    changes: diffFields(before, updateData),
  });

  revalidatePath('/admin/inspire/media');
  return {};
}

export async function deleteMediaAction(id: string): Promise<{ error?: string }> {
  const { error: authError, user } = await requireAdminSectionAction('media_library');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  if (!UUID_RE.test(id)) return { error: 'Invalid media ID' };

  // `alt`/`filename` ride along on this pre-delete read — after the delete the
  // human label is gone for good.
  const [record] = await db
    .select({
      r2Key: media.r2Key,
      parentMediaId: media.parentMediaId,
      originalArticleId: media.originalArticleId,
      url: media.url,
      originalUrl: media.originalUrl,
      variants: media.variants,
      alt: media.alt,
      filename: media.filename,
    })
    .from(media)
    .where(eq(media.id, id))
    .limit(1);

  if (!record) return { error: 'Media not found' };

  // Scrub article references before deleting (best-effort, errors logged internally)
  const urlsToRemove = collectMediaUrls([record]);
  await scrubArticlesForDeletedMedia([id], urlsToRemove);

  // Delete DB record first (cascade removes media_article_usage)
  // If this fails, R2 files remain intact (preferable to orphaned DB records)
  await db.delete(media).where(eq(media.id, id));

  logAuditEvent({
    entityType: 'media',
    entityId: id,
    action: 'deleted',
    performedBy: user.id,
    entityLabel: record.alt || record.filename || null,
  });

  // Then clean up R2 files (best-effort; orphaned R2 files are harmless)
  // Cropped images (have parentMediaId) share a directory with the original,
  // so only delete the single file — not the whole directory.
  try {
    if (record.parentMediaId) {
      await deleteR2SingleFile(record.r2Key);
    } else {
      await deleteR2Directory(record.r2Key);
    }
  } catch (err) {
    console.warn('Failed to delete R2 files for media:', id, err);
  }

  // If the original article is soft-deleted and has no remaining media, clean up both
  if (record.originalArticleId) {
    try {
      await cleanupDeletedArticleIfEmpty(record.originalArticleId);
    } catch {
      /* best-effort */
    }
  }

  revalidatePath('/admin/inspire/media');
  return {};
}

export async function bulkDeleteMediaAction(
  ids: string[],
): Promise<{ error?: string; deleted?: number }> {
  const { error: authError, user } = await requireAdminSectionAction('media_library');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  if (ids.length === 0) return { deleted: 0 };
  if (ids.length > MAX_BULK_DELETE)
    return { error: `Maximum ${MAX_BULK_DELETE} items per bulk delete` };

  // Validate all IDs are valid UUIDs
  if (!ids.every((id) => UUID_RE.test(id))) return { error: 'Invalid media ID in list' };

  const records = await db
    .select({
      id: media.id,
      r2Key: media.r2Key,
      originalArticleId: media.originalArticleId,
      url: media.url,
      originalUrl: media.originalUrl,
      variants: media.variants,
      filename: media.filename,
    })
    .from(media)
    .where(inArray(media.id, ids));

  // Scrub article references before deleting (best-effort, errors logged internally)
  const urlsToRemove = collectMediaUrls(records);
  await scrubArticlesForDeletedMedia(
    records.map((r) => r.id),
    urlsToRemove,
  );

  // Delete DB records first (cascade removes usage records)
  await db.delete(media).where(inArray(media.id, ids));

  // One row for the whole batch rather than one per id. The full id list is
  // small (capped at MAX_BULK_DELETE) but filenames are sampled to stay bounded.
  logAuditEvent({
    entityType: 'media',
    entityId: 'bulk',
    action: 'bulk_deleted',
    performedBy: user.id,
    entityLabel: `${records.length} media item${records.length !== 1 ? 's' : ''}`,
    metadata: {
      count: records.length,
      ids: records.map((r) => r.id),
      sampleFilenames: records.slice(0, 10).map((r) => r.filename),
    },
  });

  // Then clean up R2 files (best-effort)
  for (const record of records) {
    try {
      await deleteR2Directory(record.r2Key);
    } catch (err) {
      console.warn('Failed to delete R2 files for media:', record.id, err);
    }
  }

  // If any original articles are soft-deleted and now empty, clean up both R2 + article record
  const seenArticleIds = new Set<string>();
  for (const record of records) {
    if (record.originalArticleId) seenArticleIds.add(record.originalArticleId);
  }
  for (const articleId of seenArticleIds) {
    try {
      await cleanupDeletedArticleIfEmpty(articleId);
    } catch {
      /* best-effort */
    }
  }

  revalidatePath('/admin/inspire/media');
  return { deleted: records.length };
}

export async function createMediaRecordAction(data: {
  filename: string;
  r2Key: string;
  url: string;
  originalUrl: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  variants?: unknown;
  defaultQuality?: string;
  smartCrops?: unknown;
  focalPoint?: unknown;
  detectionData?: unknown;
  source: 'article_upload' | 'library_upload';
  originalArticleId?: string | null;
  parentMediaId?: string | null;
}): Promise<{ data?: Media; error?: string }> {
  const { error: authError, user } = await requireAdminSectionAction('media_library');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  const [record] = await db
    .insert(media)
    .values({
      filename: data.filename,
      r2Key: data.r2Key,
      url: data.url,
      originalUrl: data.originalUrl,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
      width: data.width,
      height: data.height,
      variants: data.variants as Media['variants'],
      defaultQuality: data.defaultQuality ?? 'high',
      smartCrops: data.smartCrops as Media['smartCrops'],
      focalPoint: data.focalPoint as Media['focalPoint'],
      detectionData: data.detectionData,
      source: data.source,
      originalArticleId: data.originalArticleId ?? null,
      parentMediaId: data.parentMediaId ?? null,
      uploadedBy: user.id,
    })
    .returning();

  if (record) {
    logAuditEvent({
      entityType: 'media',
      entityId: record.id,
      action: 'created',
      performedBy: user.id,
      entityLabel: record.alt || record.filename || null,
      metadata: { source: data.source, mimeType: data.mimeType, fileSize: data.fileSize },
    });
  }

  revalidatePath('/admin/inspire/media');
  return { data: record };
}

export async function getMediaUsageAction(
  id: string,
): Promise<{ data?: { id: string; title: string; slug: string }[]; error?: string }> {
  const { error: authError } = await requireAdminSectionAction('media_library');
  if (authError) return { error: authError };

  const usages = await db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
    })
    .from(mediaArticleUsage)
    .innerJoin(articles, eq(mediaArticleUsage.articleId, articles.id))
    .where(eq(mediaArticleUsage.mediaId, id));

  return { data: usages };
}

export async function getMediaUsageCountAction(
  id: string,
): Promise<{ count: number; error?: string }> {
  const { error: authError } = await requireAdminSectionAction('media_library');
  if (authError) return { count: 0, error: authError };

  const [result] = await db
    .select({ count: count() })
    .from(mediaArticleUsage)
    .where(eq(mediaArticleUsage.mediaId, id));

  return { count: result?.count ?? 0 };
}

export async function getMediaChildrenAction(parentId: string): Promise<{
  data?: {
    id: string;
    filename: string;
    url: string;
    width: number | null;
    height: number | null;
    createdAt: Date;
  }[];
  error?: string;
}> {
  const { error: authError } = await requireAdminSectionAction('media_library');
  if (authError) return { error: authError };

  if (!UUID_RE.test(parentId)) return { error: 'Invalid media ID' };

  const children = await db
    .select({
      id: media.id,
      filename: media.filename,
      url: media.url,
      width: media.width,
      height: media.height,
      createdAt: media.createdAt,
    })
    .from(media)
    .where(eq(media.parentMediaId, parentId))
    .orderBy(desc(media.createdAt));

  return { data: children };
}

export async function searchArticlesAction(
  query: string,
): Promise<{ data?: { id: string; title: string }[]; error?: string }> {
  const { error: authError } = await requireAdminSectionAction('media_library');
  if (authError) return { error: authError };

  const trimmed = query.trim();

  let rows;
  if (trimmed) {
    const escaped = trimmed.replace(/[%_\\]/g, '\\$&');
    rows = await db
      .select({ id: articles.id, title: articles.title })
      .from(articles)
      .where(ilike(articles.title, `%${escaped}%`))
      .orderBy(asc(articles.title))
      .limit(20);
  } else {
    rows = await db
      .select({ id: articles.id, title: articles.title })
      .from(articles)
      .orderBy(desc(articles.updatedAt))
      .limit(20);
  }

  return { data: rows };
}

// ── Helper: collect all known URLs for a set of media records ──────────

function collectMediaUrls(
  records: { url: string | null; originalUrl: string | null; variants: unknown }[],
): Set<string> {
  const urls = new Set<string>();
  for (const record of records) {
    if (record.url) urls.add(record.url);
    if (record.originalUrl) urls.add(record.originalUrl);
    if (record.variants && typeof record.variants === 'object') {
      const v = record.variants as Record<string, ImageVariants[keyof ImageVariants]>;
      for (const entry of Object.values(v)) {
        if (entry && typeof entry === 'object' && 'url' in entry && typeof entry.url === 'string') {
          urls.add(entry.url);
        }
      }
    }
  }
  return urls;
}

// ── Helper: scrub deleted media references from TipTap content JSON ───

function scrubArticleContent(
  content: unknown,
  urlsToRemove: Set<string>,
  mediaIdsToRemove: Set<string>,
): { content: unknown; changed: boolean } {
  if (!content || typeof content !== 'object') return { content, changed: false };

  const cloned = JSON.parse(JSON.stringify(content));
  let changed = false;

  function walk(node: Record<string, unknown>) {
    if (!Array.isArray(node.content)) return;

    node.content = (node.content as Record<string, unknown>[]).filter((child) => {
      // image and figureBlock: remove if src or data-original-src matches
      if (child.type === 'image' || child.type === 'figureBlock') {
        const attrs = child.attrs as Record<string, unknown> | undefined;
        if (attrs) {
          const src = attrs.src as string | undefined;
          const origSrc = attrs['data-original-src'] as string | undefined;
          if ((src && urlsToRemove.has(src)) || (origSrc && urlsToRemove.has(origSrc))) {
            changed = true;
            return false;
          }
        }
      }

      // pdfLinkBlock / pdfLinkInline: remove if the attached PDF url matches a deleted media url
      if (child.type === 'pdfLinkBlock' || child.type === 'pdfLinkInline') {
        const attrs = child.attrs as Record<string, unknown> | undefined;
        const url = attrs?.['data-url'] as string | undefined;
        if (url && urlsToRemove.has(url)) {
          changed = true;
          return false;
        }
      }

      // galleryBlock: filter matching images from data-images array
      if (child.type === 'galleryBlock') {
        const attrs = child.attrs as Record<string, unknown> | undefined;
        if (attrs) {
          try {
            const raw = attrs['data-images'];
            const images: { src?: string; mediaId?: string }[] =
              typeof raw === 'string' ? JSON.parse(raw) : Array.isArray(raw) ? raw : [];
            const filtered = images.filter(
              (img) =>
                !(img.src && urlsToRemove.has(img.src)) &&
                !(img.mediaId && mediaIdsToRemove.has(img.mediaId)),
            );
            if (filtered.length < images.length) {
              changed = true;
              if (filtered.length === 0) return false; // remove entire node
              attrs['data-images'] = JSON.stringify(filtered);
            }
          } catch {
            // Malformed data-images — leave node intact
          }
        }
      }

      // Recurse into children first, then check for empty containers
      walk(child);

      // sectionBlock requires block+ (at least 1 child) — remove if empty
      if (
        child.type === 'sectionBlock' &&
        Array.isArray(child.content) &&
        child.content.length === 0
      ) {
        changed = true;
        return false;
      }

      return true;
    });
  }

  walk(cloned as Record<string, unknown>);
  return { content: cloned, changed };
}

// ── Helper: find and scrub all articles referencing deleted media ──────

async function scrubArticlesForDeletedMedia(mediaIds: string[], urlsToRemove: Set<string>) {
  if (mediaIds.length === 0 || urlsToRemove.size === 0) return;

  try {
    const mediaIdSet = new Set(mediaIds);

    // 1. Find articles via content usage (mediaArticleUsage junction)
    const contentUsages = await db
      .select({ articleId: mediaArticleUsage.articleId })
      .from(mediaArticleUsage)
      .where(inArray(mediaArticleUsage.mediaId, mediaIds));

    const contentArticleIds = new Set(contentUsages.map((u) => u.articleId));

    // 2. Find articles via cover image URL match
    const urlArray = [...urlsToRemove];
    const coverArticles = await db
      .select({
        id: articles.id,
        slug: articles.slug,
        coverImageUrl: articles.coverImageUrl,
        content: articles.content,
      })
      .from(articles)
      .where(inArray(articles.coverImageUrl, urlArray));

    const coverArticleIds = new Set(coverArticles.map((a) => a.id));

    // 3. Merge all affected article IDs, fetch content for content-only articles
    const contentOnlyIds = [...contentArticleIds].filter((id) => !coverArticleIds.has(id));
    let contentOnlyArticles: { id: string; slug: string; content: unknown }[] = [];
    if (contentOnlyIds.length > 0) {
      contentOnlyArticles = await db
        .select({ id: articles.id, slug: articles.slug, content: articles.content })
        .from(articles)
        .where(inArray(articles.id, contentOnlyIds));
    }

    // Build a map of articleId -> article data
    const articleMap = new Map<string, { slug: string; content: unknown; hasCover: boolean }>();
    for (const a of coverArticles) {
      articleMap.set(a.id, { slug: a.slug, content: a.content, hasCover: true });
    }
    for (const a of contentOnlyArticles) {
      if (!articleMap.has(a.id)) {
        articleMap.set(a.id, { slug: a.slug, content: a.content, hasCover: false });
      }
    }

    if (articleMap.size === 0) return;

    // 4. Scrub each article inside a transaction for atomicity
    const now = new Date();
    const affectedSlugs: string[] = [];
    const affectedArticleIds: string[] = [];

    // Build update operations
    const updateOps: { articleId: string; slug: string; updates: Record<string, unknown> }[] = [];

    for (const [articleId, data] of articleMap) {
      const updates: Record<string, unknown> = {};
      let modified = false;

      // Scrub content
      if (data.content) {
        const result = scrubArticleContent(data.content, urlsToRemove, mediaIdSet);
        if (result.changed) {
          updates.content = result.content;
          modified = true;
        }
      }

      // Scrub cover image
      if (data.hasCover) {
        updates.coverImageUrl = null;
        updates.coverImageVariants = null;
        updates.coverImageQuality = null;
        updates.coverImageFocalPoint = null;
        updates.coverImageDetectionData = null;
        updates.coverImageSmartCrops = null;
        updates.coverImageFocalPointOverride = null;
        modified = true;
      }

      if (modified) {
        updates.updatedAt = now;
        updateOps.push({ articleId, slug: data.slug, updates });
      }
    }

    if (updateOps.length === 0) return;

    // Execute all updates in a transaction
    await db.transaction(async (tx) => {
      await Promise.all(
        updateOps.map((op) =>
          tx.update(articles).set(op.updates).where(eq(articles.id, op.articleId)),
        ),
      );
    });

    for (const op of updateOps) {
      affectedArticleIds.push(op.articleId);
      affectedSlugs.push(op.slug);
    }

    // 5. Revalidate affected paths
    for (let i = 0; i < affectedArticleIds.length; i++) {
      revalidatePath(`/admin/inspire/${affectedArticleIds[i]}/edit`);
      revalidatePath(`/artikel/${affectedSlugs[i]}`);
    }
    revalidatePath('/artikel');
    // revalidatePath does NOT clear unstable_cache entries — the public article
    // pages are pinned at `revalidate: false`, so a scrubbed image would keep
    // rendering from cache.
    revalidateTag('articles', PURGE_IMMEDIATELY);
  } catch (err) {
    console.warn('Failed to scrub articles for deleted media:', err);
  }
}

// ── Helper: hard-delete a soft-deleted article once all its media is gone ──

async function cleanupDeletedArticleIfEmpty(articleId: string) {
  // 1. Check the article is soft-deleted
  const [article] = await db
    .select({ id: articles.id, slug: articles.slug, status: articles.status })
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);

  if (!article || article.status !== 'deleted') return;

  // 2. Check no media records still reference this article
  const [mediaCount] = await db
    .select({ count: count() })
    .from(media)
    .where(eq(media.originalArticleId, articleId));

  if ((mediaCount?.count ?? 0) > 0) return;

  // 3. Delete any remaining R2 files under the article's prefix
  // Soft-delete renames to `inspire/(Deleted) {slug}/`
  const prefixes = [`inspire/(Deleted) ${article.slug}/`, `inspire/${article.slug}/`];

  const r2 = getR2Client();
  const bucket = getR2Bucket();

  for (const prefix of prefixes) {
    let continuationToken: string | undefined;
    do {
      const listResult = await r2.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
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

  // 4. Hard-delete the article record from the database
  await db.delete(articles).where(eq(articles.id, articleId));

  revalidatePath('/admin/inspire');
  revalidatePath('/admin/inspire/media');
  // revalidatePath does NOT clear unstable_cache entries — the hard-deleted
  // article must also drop out of the tag-cached public listings.
  revalidateTag('articles', PURGE_IMMEDIATELY);
}

// ── Helper: delete a single R2 file ───────────────────────────────────

async function deleteR2SingleFile(r2Key: string) {
  const r2 = getR2Client();
  const bucket = getR2Bucket();
  await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: r2Key }));
}

// ── Helper: delete all R2 files in the same directory as an original key ───

async function deleteR2Directory(r2Key: string) {
  const r2 = getR2Client();
  const bucket = getR2Bucket();

  // R2 keys are like `inspire/slug/timestamp-name/original.ext`
  // We want to delete all objects in `inspire/slug/timestamp-name/`
  const dirPrefix = r2Key.substring(0, r2Key.lastIndexOf('/') + 1);
  if (!dirPrefix) {
    // Single file, no directory
    await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: r2Key }));
    return;
  }

  // List and delete all objects in the directory (paginated)
  let continuationToken: string | undefined;
  do {
    const listResult = await r2.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: dirPrefix,
        ContinuationToken: continuationToken,
      }),
    );

    if (listResult.Contents) {
      for (const obj of listResult.Contents) {
        if (obj.Key) {
          await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key }));
        }
      }
    }

    continuationToken = listResult.IsTruncated ? listResult.NextContinuationToken : undefined;
  } while (continuationToken);
}
