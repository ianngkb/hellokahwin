'use server';

import { revalidatePath } from 'next/cache';
import { eq, and, desc, count, sql, ilike, or, inArray, asc } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { media, mediaArticleUsage } from '@/lib/db/schema/media';
import { articles } from '@/lib/db/schema/articles';
import { profiles } from '@/lib/db/schema/profiles';
import { requireAdminSectionAction } from '@/lib/auth/admin';
import { logAuditEvent } from '@/lib/audit/log';
import { diffFields } from '@/lib/audit/diff';
import { countOrNull, estimateTotalFromPage } from '@/lib/media/paging';
// Deleting a picture is several writes in a particular order (scrub articles,
// drop the row, wipe every stored version) and it lives in ONE module; this
// file is just the admin door onto it.
import { bulkDeleteMedia, deleteMedia } from '@/lib/media/media-delete';
import type { Media } from '@/lib/db/schema/media';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PAGE_SIZE = 100;

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

  // The COUNT IS NOT ALLOWED TO TAKE THE PAGE DOWN. A searched view is an
  // unanchored ILIKE no index can answer, so the count is the slow half and can
  // hit the statement timeout. Sitting in a bare `Promise.all`, that rejected
  // the whole action and lost the rows that had already been fetched. Now the
  // count degrades on its own and the rows still render.
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
    countOrNull(() =>
      db
        .select({ count: count() })
        .from(media)
        .where(whereClause)
        .then((r) => r[0]?.count ?? 0),
    ),
  ]);

  // `??`, never `||`: a real count of 0 is falsy. `null` is the only failure
  // sentinel. See `estimateTotalFromPage` for what the estimate means.
  const total = totalResult ?? estimateTotalFromPage(offset, rows.length, pageSize);

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

/**
 * Delete one library picture.
 *
 * A thin door onto `deleteMedia` in `@/lib/media/media-delete`. `force: true`
 * because the detail panel has already shown the person which articles use
 * this picture and they pressed Delete anyway — those articles are scrubbed.
 * A picture with child crops is still refused: their files live in its folder.
 *
 * `warning` carries what went wrong AFTER the row was gone (files that could
 * not be removed from storage). It used to be dropped, so a delete that
 * orphaned its files still showed a green toast and the only trace was a
 * console warning.
 */
export async function deleteMediaAction(id: string): Promise<{ error?: string; warning?: string }> {
  const { error: authError, user } = await requireAdminSectionAction('media_library');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  const result = await deleteMedia({ id: user.id, email: user.email }, id, { force: true });
  revalidatePath('/admin/inspire/media');
  if ('error' in result) return { error: result.error };
  return result.note ? { warning: result.note } : {};
}

/**
 * Delete several library pictures.
 *
 * `notFound` and `warning` are returned rather than swallowed: a bulk delete
 * carrying stale ids used to report them all deleted, and a failed storage wipe
 * showed nothing at all.
 */
export async function bulkDeleteMediaAction(ids: string[]): Promise<{
  error?: string;
  deleted?: number;
  notFound?: number;
  warning?: string;
}> {
  const { error: authError, user } = await requireAdminSectionAction('media_library');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  if (!Array.isArray(ids) || ids.length === 0) return { deleted: 0 };

  const result = await bulkDeleteMedia({ id: user.id, email: user.email }, ids, { force: true });
  revalidatePath('/admin/inspire/media');
  if ('error' in result) return { error: result.error };

  return {
    deleted: result.deleted,
    ...(result.notFound.length > 0 ? { notFound: result.notFound.length } : {}),
    ...(result.errors.length > 0
      ? {
          warning:
            `${result.errors.length} of them left files behind in storage: ` +
            `${result.errors.slice(0, 3).join('; ')}` +
            (result.errors.length > 3 ? `, and ${result.errors.length - 3} more` : ''),
        }
      : {}),
  };
}

export async function createMediaRecordAction(data: {
  filename: string;
  /**
   * Required at the upload dialog, optional here: cover images and older
   * callers create records without one, and a failed media insert must never
   * take an upload down (see `uploadInspireImage`, which swallows this).
   */
  alt?: string | null;
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
      // `undefined` leaves the column's own `''` default in place, so a
      // caller that never had an alt to give behaves exactly as it did before.
      // The `typeof` guard is not paranoia about our own callers: this is a
      // server action, so its argument crosses a network boundary and arrives
      // as whatever the client sent — a bare `.trim()` on a non-string throws
      // inside the insert.
      alt: typeof data.alt === 'string' ? data.alt.trim().slice(0, 300) || undefined : undefined,
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
