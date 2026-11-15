/**
 * Deleting a Media Library picture — the ONE core every delete goes through.
 *
 * Ported from The Wedding Notebook's `lib/media/media-delete.ts` and cut down to
 * what HelloKahwin actually has: no venue galleries, no moodboard `photos`
 * twin, and no per-section grants (every HelloKahwin admin holds every section —
 * see `@/lib/auth/admin`). What is kept is the part that was wrong here before:
 * the ORDER of the writes, the crop guard, and saying out loud when something
 * was left behind.
 *
 * WHAT A DELETE ACTUALLY IS, in order — AND WHY THIS ORDER:
 *
 *   0. Look up what USES the picture (article bodies, article covers, child
 *      crops). Without `force` a picture in use is refused, naming the users,
 *      and nothing is written. The admin page passes `force: true` because it
 *      has already shown the person what uses the picture.
 *   1. Scrub the articles — body nodes, gallery blocks, PDF links and the cover
 *      columns. Returns a RESULT: a failed scrub ABORTS the delete rather than
 *      leaving live pages pointing at files step 3 is about to wipe. (The old
 *      inline version swallowed its own failure and carried on.)
 *   2. Delete the `media` row (cascading `media_article_usage`) inside a
 *      transaction that locks the row first. `returning()` tells a double
 *      delete it lost the race, so it does not write a second audit row and
 *      re-wipe storage.
 *   3. Delete the stored files — every variant and crop file in the picture's
 *      own directory, never a bare namespace prefix. Best-effort and AFTER the
 *      row, because an orphaned file is harmless while an orphaned row is a
 *      broken page. But no longer SILENT: any file left behind comes back as a
 *      `note` naming the keys, and the admin sees it as a warning.
 *   4. Hard-delete the originating article if it was soft-deleted and is now
 *      empty.
 *
 * WHY A CROP IS NEVER DELETED OUT FROM UNDER ITS PARENT. A crop's file lives in
 * the parent's directory, so step 3's directory wipe would destroy the crop's
 * bytes while its own `media` row survived, pointing at nothing. A parent with
 * crops is refused even under `force` unless the crops are in the same batch,
 * in which case children go first.
 */
import { and, count, eq, inArray, not, or } from 'drizzle-orm';
import { revalidatePath, revalidateTag } from 'next/cache';
import { DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { db } from '@/lib/db/drizzle';
import { media, mediaArticleUsage } from '@/lib/db/schema/media';
import { articles } from '@/lib/db/schema/articles';
import { logAuditEvent } from '@/lib/audit/log';
import { getR2Client, getR2Bucket } from '@/lib/r2/client';
import { PURGE_IMMEDIATELY } from '@/lib/cache/purge';
import { normalizeVariants } from './media-quality';

/** At most this many ids in one bulk delete. */
export const MAX_BULK_DELETE = 50;

/**
 * Where every Media Library upload lands — see `pathPrefix` in
 * `src/app/api/v1/inspire/upload/route.ts`. A namespace shared by unrelated
 * rows, so no computed sweep may ever take it whole.
 */
export const LIBRARY_KEY_PREFIX = 'inspire/general/';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The acting admin. */
export interface MediaDeleteActor {
  id: string;
  email?: string;
}

export interface MediaDeleteOptions {
  /** Detach the picture from every article using it, then delete. */
  force?: boolean;
}

/** Everything currently pointing at one media row. */
export interface MediaUsage {
  /** Articles whose BODY references it (via `media_article_usage`). */
  articles: { id: string; title: string }[];
  /** Articles using it as their COVER (matched on URL, as covers always were). */
  covers: { id: string; title: string }[];
  /** Child crops, which `force` never overrides. */
  crops: { id: string; filename: string }[];
}

const emptyUsage = (): MediaUsage => ({ articles: [], covers: [], crops: [] });

/** How many DISTINCT articles a delete detached — the audit row's `detached`. */
export interface DetachedCounts {
  articles: number;
  covers: number;
}

const noDetached = (): DetachedCounts => ({ articles: 0, covers: 0 });

/**
 * The columns a delete needs, read once before anything is written. The caller
 * gets this back as its record of what disappeared.
 */
export interface MediaRecord {
  id: string;
  filename: string;
  url: string;
  originalUrl: string;
  r2Key: string;
  parentMediaId: string | null;
  originalArticleId: string | null;
  variants: unknown;
  alt: string | null;
}

export interface DeleteMediaSuccess {
  deleted: true;
  media: MediaRecord;
  detached: DetachedCounts;
  /** Anything that went wrong AFTER the row was gone (files left in storage). */
  note?: string;
  /** The exact storage keys that could not be removed. */
  leftoverKeys?: string[];
}

export interface BulkDeleteMediaSuccess {
  deleted: number;
  medias: MediaRecord[];
  detached: DetachedCounts;
  notFound: string[];
  /** One line per record that left files behind in storage. */
  errors: string[];
  leftoverKeys: string[];
}

export type MediaDeleteError = { error: string };

const MEDIA_COLUMNS = {
  id: media.id,
  filename: media.filename,
  url: media.url,
  originalUrl: media.originalUrl,
  r2Key: media.r2Key,
  parentMediaId: media.parentMediaId,
  originalArticleId: media.originalArticleId,
  variants: media.variants,
  alt: media.alt,
} as const;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** A short list, with "and N more" rather than a wall of names. */
function nameList(names: string[], limit = 3): string {
  const shown = names.slice(0, limit).join(', ');
  const rest = names.length - limit;
  return rest > 0 ? `${shown}, and ${rest} more` : shown;
}

/* ------------------------------------------------------------------ *
 * Usage lookup — runs before ANY write, on every path
 * ------------------------------------------------------------------ */

/**
 * What is using each of these media rows? Three queries batched over the whole
 * id set, rather than three per id.
 *
 * Covers are matched by URL because `articles.cover_image_url` holds a bare URL
 * string. Every URL one row can be addressed by — `url`, `original_url` and each
 * variant's url — goes into the match.
 */
export async function getMediaUsage(
  records: Pick<MediaRecord, 'id' | 'url' | 'originalUrl' | 'variants'>[],
): Promise<Map<string, MediaUsage>> {
  const byId = new Map<string, MediaUsage>();
  for (const record of records) byId.set(record.id, emptyUsage());
  if (records.length === 0) return byId;

  const ids = records.map((r) => r.id);
  /** url → the media ids that URL belongs to. One URL can serve two rows. */
  const ownersOfUrl = new Map<string, string[]>();
  for (const record of records) {
    for (const url of collectMediaUrls([record])) {
      const owners = ownersOfUrl.get(url);
      if (owners) owners.push(record.id);
      else ownersOfUrl.set(url, [record.id]);
    }
  }
  const allUrls = [...ownersOfUrl.keys()];

  const [bodyRows, coverRows, cropRows] = await Promise.all([
    db
      .select({
        mediaId: mediaArticleUsage.mediaId,
        articleId: articles.id,
        title: articles.title,
      })
      .from(mediaArticleUsage)
      .innerJoin(articles, eq(articles.id, mediaArticleUsage.articleId))
      .where(inArray(mediaArticleUsage.mediaId, ids)),
    allUrls.length > 0
      ? db
          .select({ id: articles.id, title: articles.title, url: articles.coverImageUrl })
          .from(articles)
          .where(inArray(articles.coverImageUrl, allUrls))
      : Promise.resolve([] as { id: string; title: string; url: string | null }[]),
    db
      .select({ id: media.id, filename: media.filename, parentMediaId: media.parentMediaId })
      .from(media)
      .where(inArray(media.parentMediaId, ids)),
  ]);

  for (const row of bodyRows) {
    byId.get(row.mediaId)?.articles.push({ id: row.articleId, title: row.title });
  }

  for (const row of coverRows) {
    for (const owner of ownersOfUrl.get(row.url ?? '') ?? []) {
      const usage = byId.get(owner);
      if (usage && !usage.covers.some((c) => c.id === row.id)) {
        usage.covers.push({ id: row.id, title: row.title });
      }
    }
  }

  for (const row of cropRows) {
    if (row.parentMediaId) {
      byId.get(row.parentMediaId)?.crops.push({ id: row.id, filename: row.filename });
    }
  }

  return byId;
}

/** "Used by 2 articles (…), 1 article cover (…)" — or `null` when unused. */
export function describeUsage(usage: MediaUsage): string | null {
  const parts: string[] = [];
  if (usage.articles.length > 0) {
    parts.push(
      `${plural(usage.articles.length, 'article')} (${nameList(usage.articles.map((a) => a.title))})`,
    );
  }
  if (usage.covers.length > 0) {
    parts.push(
      `${plural(usage.covers.length, 'article cover')} (${nameList(usage.covers.map((a) => a.title))})`,
    );
  }
  if (usage.crops.length > 0) {
    parts.push(
      `${plural(usage.crops.length, 'crop')} (${nameList(usage.crops.map((c) => c.filename))})`,
    );
  }
  return parts.length > 0 ? `Used by ${parts.join(', ')}.` : null;
}

/**
 * The refusal a used picture gets, or `null` when it may be deleted.
 *
 * `alsoDeleting` is the rest of the batch: a crop whose own id is in it is not
 * an obstacle, which is what makes "delete this picture and its crop" one legal
 * call.
 */
function refusalFor(
  usage: MediaUsage,
  force: boolean,
  alsoDeleting: ReadonlySet<string> = new Set<string>(),
): string | null {
  const blockingCrops = usage.crops.filter((c) => !alsoDeleting.has(c.id));

  if (blockingCrops.length > 0) {
    return (
      `This picture has ${plural(blockingCrops.length, 'crop')} ` +
      `(${nameList(blockingCrops.map((c) => c.filename))}) — delete the ${
        blockingCrops.length === 1 ? 'crop' : 'crops'
      } first, or select ${blockingCrops.length === 1 ? 'it' : 'them'} too. ` +
      'They share this picture’s folder in storage, so deleting the parent on its own would ' +
      'destroy their files and leave them pointing at nothing.'
    );
  }

  if (force) return null;
  const described = describeUsage(usage);
  if (!described) return null;
  return `${described} Take it off those pages first, or delete with force to detach it everywhere.`;
}

/* ------------------------------------------------------------------ *
 * The delete itself
 * ------------------------------------------------------------------ */

async function loadRecords(ids: string[]): Promise<MediaRecord[]> {
  if (ids.length === 0) return [];
  const rows = await db.select(MEDIA_COLUMNS).from(media).where(inArray(media.id, ids));
  return rows as MediaRecord[];
}

/**
 * Every URL the scrub may remove from an article.
 *
 * SUBTRACTS any URL a SURVIVING media row still owns. Two rows can name one
 * URL, and scrubbing on the raw set would quietly take a different, living
 * picture off the page too. Ownership is exact-match on purpose.
 */
async function urlsToScrub(records: MediaRecord[]): Promise<Set<string>> {
  const urls = collectMediaUrls(records);
  if (urls.size === 0) return urls;

  const all = [...urls];
  const survivors = (await db
    .select(MEDIA_COLUMNS)
    .from(media)
    .where(
      and(
        not(
          inArray(
            media.id,
            records.map((r) => r.id),
          ),
        ),
        or(inArray(media.url, all), inArray(media.originalUrl, all)),
      ),
    )) as MediaRecord[];

  if (survivors.length === 0) return urls;
  for (const owned of collectMediaUrls(survivors)) urls.delete(owned);
  return urls;
}

/**
 * The shared body: delete these records, which the caller has already loaded,
 * guarded and (for a batch) ordered children-before-parents.
 */
async function performDelete(
  records: MediaRecord[],
  usageById: Map<string, MediaUsage>,
): Promise<
  | { deletedIds: string[]; detached: DetachedCounts; notes: string[]; leftoverKeys: string[] }
  | MediaDeleteError
> {
  const articleIds = new Set<string>();
  const coverIds = new Set<string>();
  for (const record of records) {
    const usage = usageById.get(record.id) ?? emptyUsage();
    for (const a of usage.articles) articleIds.add(a.id);
    for (const c of usage.covers) coverIds.add(c.id);
  }

  // 1. Articles. A failed scrub aborts rather than leaving live pages pointing
  //    at files step 3 is about to wipe.
  const ids = records.map((r) => r.id);
  const urlsToRemove = await urlsToScrub(records);
  if (urlsToRemove.size > 0) {
    const scrub = await scrubArticlesForDeletedMedia(ids, urlsToRemove);
    if (!scrub.ok) {
      return {
        error:
          `The articles using this picture could not be updated (${scrub.error}), so it was NOT ` +
          'deleted — deleting it now would leave those pages showing a broken image. Try again in ' +
          'a moment.',
      };
    }
  }

  // 2. The rows, under a lock taken in the SAME transaction, and `returning()`
  //    so a double delete learns it lost.
  let deletedIds: string[] = [];
  await db.transaction(async (tx) => {
    await tx
      .select({ id: media.id })
      .from(media)
      .where(inArray(media.id, ids))
      .orderBy(media.id)
      .for('update');
    const gone = await tx.delete(media).where(inArray(media.id, ids)).returning({ id: media.id });
    deletedIds = gone.map((g) => g.id);
  });

  if (deletedIds.length === 0) {
    return {
      error:
        'That picture had already been deleted — somebody else got there first, and nothing was ' +
        'changed by this call.',
    };
  }

  // 3 + 4. Best-effort cleanup, reported but never fatal — the rows are gone.
  const notes: string[] = [];
  const leftoverKeys: string[] = [];
  const deletedSet = new Set(deletedIds);
  for (const record of records) {
    if (!deletedSet.has(record.id)) continue;
    const cleanup = await cleanupAfterDelete(record);
    if (cleanup.note) {
      notes.push(records.length === 1 ? cleanup.note : `${record.filename}: ${cleanup.note}`);
    }
    leftoverKeys.push(...cleanup.leftoverKeys);
  }

  return {
    deletedIds,
    detached: { articles: articleIds.size, covers: coverIds.size },
    notes,
    leftoverKeys,
  };
}

/**
 * Delete ONE library picture.
 *
 * Returns `{error}` and writes NOTHING when the picture is in use and `force`
 * was not given, or when it has a child crop (which `force` cannot override).
 */
export async function deleteMedia(
  actor: MediaDeleteActor,
  id: string,
  options: MediaDeleteOptions = {},
): Promise<DeleteMediaSuccess | MediaDeleteError> {
  if (!UUID_RE.test(id)) return { error: 'Invalid media ID' };

  const [record] = await loadRecords([id]);
  if (!record) return { error: 'Media not found' };

  const usageById = await getMediaUsage([record]);
  const refusal = refusalFor(usageById.get(id) ?? emptyUsage(), options.force === true);
  if (refusal) return { error: refusal };

  const result = await performDelete([record], usageById);
  if ('error' in result) return result;

  logAuditEvent({
    entityType: 'media',
    entityId: id,
    action: 'deleted',
    performedBy: actor.id,
    entityLabel: record.alt || record.filename || null,
    metadata: {
      force: options.force === true,
      detached: result.detached,
      r2Key: record.r2Key,
      ...(result.leftoverKeys.length > 0 ? { leftoverKeys: result.leftoverKeys } : {}),
    },
  });

  const note = result.notes[0];
  return {
    deleted: true,
    media: record,
    detached: result.detached,
    ...(note ? { note } : {}),
    ...(result.leftoverKeys.length > 0 ? { leftoverKeys: result.leftoverKeys } : {}),
  };
}

/**
 * Delete up to {@link MAX_BULK_DELETE} pictures.
 *
 * ALL-OR-NOTHING ON THE GUARD: every id is checked first, and one refusal
 * refuses the whole call. Unknown ids are reported in `notFound` — on the
 * refusal path too. Children go before parents, and a crop in the same batch is
 * not an obstacle.
 */
export async function bulkDeleteMedia(
  actor: MediaDeleteActor,
  ids: string[],
  options: MediaDeleteOptions = {},
): Promise<BulkDeleteMediaSuccess | MediaDeleteError> {
  const unique = [...new Set(ids)];
  const nothing = (notFound: string[]): BulkDeleteMediaSuccess => ({
    deleted: 0,
    medias: [],
    detached: noDetached(),
    notFound,
    errors: [],
    leftoverKeys: [],
  });
  if (unique.length === 0) return nothing([]);
  if (unique.length > MAX_BULK_DELETE) {
    return { error: `Maximum ${MAX_BULK_DELETE} items per bulk delete` };
  }
  if (!unique.every((id) => UUID_RE.test(id))) return { error: 'Invalid media ID in list' };

  const loaded = await loadRecords(unique);
  const found = new Set(loaded.map((r) => r.id));
  const notFound = unique.filter((id) => !found.has(id));
  if (loaded.length === 0) return nothing(notFound);

  // CHILDREN FIRST. A crop's file lives inside its parent's directory, so the
  // crop's single-file delete must be issued before the parent's sweep.
  const records = [...loaded].sort((a, b) => {
    const aIsCrop = a.parentMediaId !== null ? 0 : 1;
    const bIsCrop = b.parentMediaId !== null ? 0 : 1;
    return aIsCrop - bIsCrop || a.id.localeCompare(b.id);
  });

  const usageById = await getMediaUsage(records);
  const inBatch = new Set(records.map((r) => r.id));

  const refusals: string[] = [];
  for (const record of records) {
    const refusal = refusalFor(
      usageById.get(record.id) ?? emptyUsage(),
      options.force === true,
      inBatch,
    );
    if (refusal) refusals.push(`${record.filename}: ${refusal}`);
  }
  if (refusals.length > 0) {
    return {
      error:
        `${refusals.length} of these cannot be deleted, so NOTHING was deleted:\n` +
        refusals.map((r) => `· ${r}`).join('\n') +
        (notFound.length > 0
          ? `\nAlso, ${plural(notFound.length, 'id is', 'ids are')} not in the library at all: ` +
            `${notFound.join(', ')}.`
          : ''),
    };
  }

  const result = await performDelete(records, usageById);
  if ('error' in result) return result;

  const deletedSet = new Set(result.deletedIds);
  const medias = records.filter((r) => deletedSet.has(r.id));

  logAuditEvent({
    entityType: 'media',
    entityId: 'bulk',
    action: 'bulk_deleted',
    performedBy: actor.id,
    entityLabel: `${medias.length} media item${medias.length !== 1 ? 's' : ''}`,
    metadata: {
      force: options.force === true,
      count: medias.length,
      ids: result.deletedIds,
      sampleFilenames: medias.slice(0, 10).map((r) => r.filename),
      detached: result.detached,
      ...(result.leftoverKeys.length > 0 ? { leftoverKeys: result.leftoverKeys.slice(0, 50) } : {}),
    },
  });

  return {
    deleted: medias.length,
    medias,
    detached: result.detached,
    notFound,
    errors: result.notes,
    leftoverKeys: result.leftoverKeys,
  };
}

/**
 * Steps 3 and 4: the stored files, then the originating article if it is now an
 * empty soft-deleted shell.
 *
 * A crop deletes ONE file; anything else deletes its whole directory (every
 * variant, and any crop file whose row the crop guard has already let go).
 * Every key that could not be removed is collected and reported — never only
 * logged.
 */
async function cleanupAfterDelete(
  record: MediaRecord,
): Promise<{ note?: string; leftoverKeys: string[] }> {
  let leftoverKeys: string[] = [];
  let listFailed = false;

  try {
    const result = record.parentMediaId
      ? await deleteR2SingleFile(record.r2Key)
      : await deleteR2Directory(record.r2Key);
    leftoverKeys = result.failedKeys;
  } catch (err) {
    // The listing itself failed, so we do not even know which files exist.
    console.warn('[media-delete] could not list R2 files for media:', record.id, err);
    listFailed = true;
  }

  if (record.originalArticleId) {
    try {
      await cleanupDeletedArticleIfEmpty(record.originalArticleId);
    } catch (err) {
      console.warn('[media-delete] soft-deleted article cleanup failed:', err);
    }
  }

  if (listFailed) {
    return {
      note:
        'The library row is gone, but its files could not be removed from storage. ' +
        'They are orphaned, not visible anywhere, and can be cleaned up later.',
      leftoverKeys: [record.r2Key],
    };
  }
  if (leftoverKeys.length > 0) {
    console.warn('[media-delete] files left in storage for media:', record.id, leftoverKeys);
    return {
      note:
        `The library row is gone, but ${plural(leftoverKeys.length, 'file')} could not be removed ` +
        `from storage (${nameList(leftoverKeys)}). They are orphaned, not visible anywhere, and ` +
        'can be cleaned up later.',
      leftoverKeys,
    };
  }
  return { leftoverKeys: [] };
}

/* ------------------------------------------------------------------ *
 * Helpers, moved from the admin action module
 * ------------------------------------------------------------------ */

/**
 * Every URL one media row can legitimately be addressed by.
 *
 * NORMALISES `variants` rather than testing `typeof === 'object'`: a row that
 * stores the column as a JSON string would otherwise have its variant URLs
 * (including HelloKahwin's `mid` rung) skipped by the scrub.
 */
export function collectMediaUrls(
  records: { url: string | null; originalUrl: string | null; variants: unknown }[],
): Set<string> {
  const urls = new Set<string>();
  for (const record of records) {
    if (record.url) urls.add(record.url);
    if (record.originalUrl) urls.add(record.originalUrl);
    const variants = normalizeVariants(record.variants);
    if (variants) {
      for (const entry of Object.values(variants as Record<string, unknown>)) {
        if (
          entry &&
          typeof entry === 'object' &&
          'url' in entry &&
          typeof (entry as { url: unknown }).url === 'string'
        ) {
          urls.add((entry as { url: string }).url);
        }
      }
    }
  }
  return urls;
}

/** Scrub deleted media references from TipTap content JSON. */
export function scrubArticleContent(
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

      // pdfLinkBlock / pdfLinkInline: remove if the attached PDF url matches
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

/**
 * Find and scrub every article referencing the deleted media.
 *
 * Returns a RESULT instead of swallowing: a failure here must abort the delete
 * (see step 1 in the module docblock). Still logged.
 */
export async function scrubArticlesForDeletedMedia(
  mediaIds: string[],
  urlsToRemove: Set<string>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (mediaIds.length === 0 || urlsToRemove.size === 0) return { ok: true };

  try {
    const mediaIdSet = new Set(mediaIds);

    // 1. Articles via content usage (mediaArticleUsage junction)
    const contentUsages = await db
      .select({ articleId: mediaArticleUsage.articleId })
      .from(mediaArticleUsage)
      .where(inArray(mediaArticleUsage.mediaId, mediaIds));
    const contentArticleIds = new Set(contentUsages.map((u) => u.articleId));

    // 2. Articles via cover image URL match
    const coverArticles = await db
      .select({
        id: articles.id,
        slug: articles.slug,
        coverImageUrl: articles.coverImageUrl,
        content: articles.content,
      })
      .from(articles)
      .where(inArray(articles.coverImageUrl, [...urlsToRemove]));
    const coverArticleIds = new Set(coverArticles.map((a) => a.id));

    // 3. Content for content-only articles
    const contentOnlyIds = [...contentArticleIds].filter((id) => !coverArticleIds.has(id));
    let contentOnlyArticles: { id: string; slug: string; content: unknown }[] = [];
    if (contentOnlyIds.length > 0) {
      contentOnlyArticles = await db
        .select({ id: articles.id, slug: articles.slug, content: articles.content })
        .from(articles)
        .where(inArray(articles.id, contentOnlyIds));
    }

    const articleMap = new Map<string, { slug: string; content: unknown; hasCover: boolean }>();
    for (const a of coverArticles) {
      articleMap.set(a.id, { slug: a.slug, content: a.content, hasCover: true });
    }
    for (const a of contentOnlyArticles) {
      if (!articleMap.has(a.id)) {
        articleMap.set(a.id, { slug: a.slug, content: a.content, hasCover: false });
      }
    }
    if (articleMap.size === 0) return { ok: true };

    // 4. Build the updates
    const now = new Date();
    const updateOps: { articleId: string; slug: string; updates: Record<string, unknown> }[] = [];
    for (const [articleId, data] of articleMap) {
      const updates: Record<string, unknown> = {};
      let modified = false;

      if (data.content) {
        const result = scrubArticleContent(data.content, urlsToRemove, mediaIdSet);
        if (result.changed) {
          updates.content = result.content;
          modified = true;
        }
      }

      if (data.hasCover) {
        updates.coverImageUrl = null;
        updates.coverImageVariants = null;
        updates.coverImageQuality = null;
        updates.coverImageFocalPoint = null;
        updates.coverImageDetectionData = null;
        updates.coverImageSmartCrops = null;
        updates.coverImageFocalPointOverride = null;
        // HelloKahwin-only: the blur placeholder of a cover that no longer
        // exists would otherwise flash under the empty plate.
        updates.coverImageLqip = null;
        modified = true;
      }

      if (modified) {
        updates.updatedAt = now;
        updateOps.push({ articleId, slug: data.slug, updates });
      }
    }
    if (updateOps.length === 0) return { ok: true };

    // ORDERED and PRE-LOCKED: two bulk writers taking the same two articles in
    // opposite orders is a deadlock, and `Promise.all` is no order at all.
    // Sequential, because these share one borrowed connection anyway.
    const orderedOps = [...updateOps].sort((a, b) => a.articleId.localeCompare(b.articleId));
    await db.transaction(async (tx) => {
      await tx
        .select({ id: articles.id })
        .from(articles)
        .where(
          inArray(
            articles.id,
            orderedOps.map((op) => op.articleId),
          ),
        )
        .orderBy(articles.id)
        .for('update');
      for (const op of orderedOps) {
        await tx.update(articles).set(op.updates).where(eq(articles.id, op.articleId));
      }
    });

    // 5. Revalidate affected paths
    for (const op of updateOps) {
      revalidatePath(`/admin/inspire/${op.articleId}/edit`);
      revalidatePath(`/artikel/${op.slug}`);
    }
    revalidatePath('/artikel');
    // revalidatePath does NOT clear unstable_cache entries — the public article
    // pages are pinned at `revalidate: false`, so a scrubbed image would keep
    // rendering from cache.
    revalidateTag('articles', PURGE_IMMEDIATELY);
    return { ok: true };
  } catch (err) {
    console.warn('[media-delete] failed to scrub articles for deleted media:', err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Prefixes no computed sweep may ever touch, because each is a NAMESPACE other
 * rows' files live under rather than one picture's or one article's folder.
 */
const RESERVED_R2_NAMESPACES = [LIBRARY_KEY_PREFIX, 'inspire/'] as const;

/**
 * Would sweeping `prefix` reach into a reserved namespace — by being one, or by
 * being an ancestor of one?
 */
export function enclosesReservedNamespace(prefix: string): boolean {
  const normalised = prefix.endsWith('/') ? prefix : `${prefix}/`;
  return RESERVED_R2_NAMESPACES.some(
    (reserved) => normalised === reserved || reserved.startsWith(normalised),
  );
}

/** List every key under a prefix (paginated). Throws if the listing fails. */
async function listKeys(prefix: string): Promise<string[]> {
  const r2 = getR2Client();
  const bucket = getR2Bucket();
  const keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const listResult = await r2.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    for (const obj of listResult.Contents ?? []) if (obj.Key) keys.push(obj.Key);
    continuationToken = listResult.IsTruncated ? listResult.NextContinuationToken : undefined;
  } while (continuationToken);
  return keys;
}

/** Delete each key; never stop at the first failure. Returns the keys left. */
async function deleteKeys(
  keys: string[],
): Promise<{ deletedKeys: string[]; failedKeys: string[] }> {
  const r2 = getR2Client();
  const bucket = getR2Bucket();
  const deletedKeys: string[] = [];
  const failedKeys: string[] = [];
  for (const key of keys) {
    try {
      await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      deletedKeys.push(key);
    } catch (err) {
      console.warn('[media-delete] failed to delete R2 object:', key, err);
      failedKeys.push(key);
    }
  }
  return { deletedKeys, failedKeys };
}

/** Hard-delete a soft-deleted article once all its media is gone. */
export async function cleanupDeletedArticleIfEmpty(articleId: string) {
  const [article] = await db
    .select({ id: articles.id, slug: articles.slug, status: articles.status })
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);

  if (!article || article.status !== 'deleted') return;

  const [mediaCount] = await db
    .select({ count: count() })
    .from(media)
    .where(eq(media.originalArticleId, articleId));

  if ((mediaCount?.count ?? 0) > 0) return;

  // ⚠️ A SLUG IS NOT A SAFE PREFIX. An article whose slug is `general` produces
  // `inspire/general/` — exactly where every Media Library upload lives — and
  // the wholesale sweep would destroy the whole library while every `media`
  // row survived, pointing at nothing. Such a prefix is refused outright.
  const prefixes = [`inspire/(Deleted) ${article.slug}/`, `inspire/${article.slug}/`].filter(
    (prefix) => {
      if (enclosesReservedNamespace(prefix)) {
        console.warn('[media-delete] refusing to sweep a reserved R2 namespace:', prefix);
        return false;
      }
      return true;
    },
  );

  for (const prefix of prefixes) {
    await deleteKeys(await listKeys(prefix));
  }

  await db.delete(articles).where(eq(articles.id, articleId));

  revalidatePath('/admin/inspire');
  revalidatePath('/admin/inspire/media');
  revalidateTag('articles', PURGE_IMMEDIATELY);
}

/** Delete a single stored file. */
export async function deleteR2SingleFile(
  r2Key: string,
): Promise<{ deletedKeys: string[]; failedKeys: string[] }> {
  return deleteKeys([r2Key]);
}

/**
 * Delete every stored file in the same directory as an original key — the
 * original and all its variants and crop files.
 *
 * R2 keys look like `inspire/<slug>/<timestamp>-<name>/original.ext`; the
 * objects to remove are the ones in `inspire/<slug>/<timestamp>-<name>/`.
 */
export async function deleteR2Directory(
  r2Key: string,
): Promise<{ deletedKeys: string[]; failedKeys: string[] }> {
  const dirPrefix = r2Key.substring(0, r2Key.lastIndexOf('/') + 1);
  // No directory, or a key sitting directly in a namespace: it owns only itself.
  // Sweeping `inspire/general/` would take out the entire library.
  if (!dirPrefix || enclosesReservedNamespace(dirPrefix)) {
    if (dirPrefix) {
      console.warn(
        '[media-delete] key sits directly in a reserved namespace; deleting only it:',
        r2Key,
      );
    }
    return deleteKeys([r2Key]);
  }
  return deleteKeys(await listKeys(dirPrefix));
}
