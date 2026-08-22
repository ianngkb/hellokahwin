/**
 * Register already-uploaded R2 objects as `media` rows.
 *
 * WHY THIS EXISTS
 * ---------------
 * `scripts/wp-import.ts` uploads every cover and inline image straight to R2
 * and writes the resulting URL onto the article — but it never wrote a `media`
 * row, so `/admin/inspire/media` showed an empty library on a site with
 * hundreds of images. Nothing downstream repairs it either: `syncMediaUsage()`
 * on article save resolves content URLs to EXISTING media rows and never
 * creates one, so no amount of re-saving articles populates the library.
 *
 * The source of truth is what the site actually references — the article
 * documents plus `articles.cover_image_url` — rather than a raw bucket
 * listing, so the backfill registers exactly the objects that are in use and
 * cannot resurrect orphaned uploads. The bucket listing is consulted only to
 * resolve each reference back to its ORIGINAL object and its sibling variants,
 * which is the shape a live upload produces (see `lib/storage/inspire-upload.ts`):
 *
 *   inspire/<slug>/<ts>-<name>.jpg            ← the original      → r2_key, original_url
 *   inspire/<slug>/<ts>-<name>/high.webp      ← what content uses → url
 *   inspire/<slug>/<ts>-<name>/low.webp       ← sibling variant
 *   inspire/<slug>/<ts>-<name>/crop-*.webp    ← smart crops
 *
 * SAFETY
 * ------
 * DRY RUN BY DEFAULT. It prints the rows it would write and exits without
 * touching the database. Pass `--execute` to write. Writes are idempotent: the
 * media insert rides `idx_media_r2_key_unique` with ON CONFLICT DO NOTHING and
 * the usage insert rides `media_article_usage_unique`, so a re-run is a no-op.
 *
 * USAGE
 * -----
 *   pnpm tsx scripts/backfill-media.ts                 # dry run (default)
 *   pnpm tsx scripts/backfill-media.ts --execute       # write
 *   pnpm tsx scripts/backfill-media.ts --verbose       # print every planned row
 *   pnpm tsx scripts/backfill-media.ts --limit 5       # only the first N articles
 */

import { readFileSync, existsSync } from 'fs';

// Load .env / .env.local exactly as scripts/wp-import.ts does — values already
// present in process.env win, so CI and a shell export both still work.
const envFile = existsSync('.env') ? '.env' : existsSync('.env.local') ? '.env.local' : null;
if (envFile) {
  const envContent = readFileSync(envFile, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).replace(/^export\s+/, '');
    let val = trimmed.slice(eqIdx + 1);
    const q = val[0];
    if ((q === '"' || q === "'") && val.length > 1 && val.endsWith(q)) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import * as schema from '../src/lib/db/schema';
import { extractImageUrlsFromContent } from '../src/lib/inspire/content-media';
import { resolveHouseAuthorId } from '../src/lib/authors/gate';
import type { ImageVariants, ImageVariantMeta } from '../src/lib/storage/image-variants';
import type { SmartCrops, FocalPoint } from '../src/lib/storage/smart-crop';

// ── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
/** Dry run is the DEFAULT. Writing is the thing you have to ask for. */
const EXECUTE = args.includes('--execute');
const VERBOSE = args.includes('--verbose');
const limitIdx = args.indexOf('--limit');
/**
 * `--limit N`, or null for "every article".
 *
 * Validated rather than coerced: `parseInt` turns `--limit 0`, `--limit -5` and
 * `--limit abc` into values that all previously fell through the
 * `Number.isFinite(LIMIT) && LIMIT > 0` guard to mean "no limit" — so a typo in
 * the flag meant to narrow a run silently widened it to the whole catalogue.
 * On a `--execute` run that is the difference between a 5-article rehearsal and
 * writing everything.
 */
const LIMIT: number | null = (() => {
  if (limitIdx === -1) return null;
  const raw = args[limitIdx + 1];
  const parsed = Number(raw);
  if (raw === undefined || !Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`--limit expects a positive whole number, got: ${raw ?? '(nothing)'}`);
  }
  return parsed;
})();

// ── Config ───────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;

if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
if (!R2_PUBLIC_URL) throw new Error('R2_PUBLIC_URL is not set');
if (!R2_BUCKET_NAME) throw new Error('R2_BUCKET_NAME is not set');
if (!R2_ACCOUNT_ID) throw new Error('R2_ACCOUNT_ID is not set');

const PUBLIC_BASE = R2_PUBLIC_URL.replace(/\/+$/, '');

/**
 * `media.uploaded_by` FKs to `profiles`, and these rows belong to whoever the
 * import attributed the articles to. Resolved through the same helper the
 * importer and the app use, so a `WP_IMPORT_AUTHOR_ID` override does not send
 * the backfill at a profile that does not exist — which would fail the FK on
 * the first insert, halfway through a run.
 */
const UPLOADED_BY = resolveHouseAuthorId();

const client = postgres(DATABASE_URL, { max: 1, prepare: false });
const db = drizzle(client, { schema });

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * The R2 key for a stored URL, or null when the URL does not live in our
 * bucket. `r2_key` is NOT NULL and uniquely indexed, so an off-bucket URL
 * (an image the import never rehosted) must be skipped, not stuffed in.
 */
function r2KeyFromUrl(url: string): string | null {
  const [withoutQuery] = url.split(/[?#]/, 1);
  return withoutQuery.startsWith(PUBLIC_BASE + '/')
    ? withoutQuery.slice(PUBLIC_BASE.length + 1)
    : null;
}

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
};

/**
 * Mime from the key's extension. The objects were uploaded by `wp-import.ts`,
 * which picks the extension FROM the detected content type, so the extension
 * is trustworthy here. Falls back to `application/octet-stream` rather than
 * guessing — the column is NOT NULL and a vague mime beats a wrong one.
 */
function mimeFromKey(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXT[ext] ?? 'application/octet-stream';
}

/**
 * `media.file_size` is a Postgres `integer` (4 bytes), so anything at or above
 * 2^31 aborts the INSERT with a numeric-overflow error - and because the write
 * is chunked, it would abort PART WAY through a run, leaving the library half
 * populated. R2 happily stores objects past that (a 2 GiB+ video, a huge PDF),
 * so clamp instead: the exact byte count of an outsized object is not worth
 * failing a whole backfill over, and every caller of this column treats it as
 * a display hint. The clamp is reported in the run output so it is never
 * silent, and the column is deliberately NOT migrated here.
 */
const MAX_FILE_SIZE = 2147483647;

function clampFileSize(bytes: number): number {
  if (!Number.isFinite(bytes) || bytes < 0) return 0;
  return Math.min(Math.trunc(bytes), MAX_FILE_SIZE);
}

function filenameFromKey(key: string): string {
  return key.split('/').pop() || key;
}

/** `inspire/<slug>/` — the listing unit, one per imported article. */
function listingPrefix(key: string): string | null {
  const parts = key.split('/');
  return parts.length >= 3 ? `${parts[0]}/${parts[1]}/` : null;
}

/** Every object under a prefix, with its size. Paginates to exhaustion. */
async function listPrefix(prefix: string): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  let token: string | undefined;
  do {
    const res = await r2.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: token,
      }),
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key) out.set(obj.Key, obj.Size ?? 0);
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return out;
}

/** The variant preset names `generateVariants()` writes as `<dir>/<name>.webp`. */
const VARIANT_NAMES = new Set(['low', 'medium', 'high']);

/**
 * Resolve a referenced URL back to the object family it belongs to.
 *
 * A content image points at a variant (`<dir>/high.webp`) whose original sits
 * beside the directory (`<dir>.jpg`); a cover points straight at the original.
 * Registering the ORIGINAL as `r2_key` is what makes these rows look like the
 * ones a live upload creates, so the crop editor and the delete path — both of
 * which work from `r2_key` — behave the same on imported and uploaded media.
 */
function resolveFamily(
  referencedKey: string,
  inventory: Map<string, number>,
): { originalKey: string; variants: ImageVariants | null } {
  const base = filenameFromKey(referencedKey).replace(/\.[^.]+$/, '');
  if (!VARIANT_NAMES.has(base)) {
    // Already the original (or something we don't recognise) — no variant dir.
    return { originalKey: referencedKey, variants: null };
  }

  const dir = referencedKey.slice(0, referencedKey.lastIndexOf('/')); // …/<ts>-<name>
  const originalKey =
    [...inventory.keys()].find(
      (k) => k.startsWith(dir + '.') && !k.slice(dir.length + 1).includes('/'),
    ) ??
    // The original is gone (or was never uploaded): fall back to the variant
    // itself so the reference is still registered rather than silently dropped.
    referencedKey;

  const meta = (key: string): ImageVariantMeta | null =>
    inventory.has(key) ? { url: `${PUBLIC_BASE}/${key}`, sizeBytes: inventory.get(key)! } : null;

  const original = meta(originalKey);
  const high = meta(`${dir}/high.webp`);
  const low = meta(`${dir}/low.webp`);
  // `ImageVariants` requires all three; anything less is not a usable variant
  // set and is better recorded as absent than as half-populated.
  const variants =
    original && high && low
      ? ({
          original,
          high,
          low,
          ...(meta(`${dir}/medium.webp`) ? { medium: meta(`${dir}/medium.webp`)! } : {}),
        } as ImageVariants)
      : null;

  return { originalKey, variants };
}

// ── Plan ─────────────────────────────────────────────────────────────────────

interface PlannedMedia {
  /** The URL the article references — becomes `media.url`. */
  url: string;
  /** The original object — becomes `media.r2_key` and `media.original_url`. */
  originalKey: string;
  fileSize: number;
  variants: ImageVariants | null;
  defaultQuality: string | null;
  smartCrops: SmartCrops | null;
  focalPoint: FocalPoint | null;
  detectionData: unknown;
  originalArticleId: string;
  fromCover: boolean;
}

async function main() {
  console.log(
    `\n=== Media backfill — ${EXECUTE ? 'EXECUTE (will write)' : 'DRY RUN (no writes)'} ===\n`,
  );

  // Fail here, before a single object is listed, rather than on the first
  // INSERT's foreign-key violation halfway through a run. Checked in dry run
  // too: a rehearsal that "passes" and then dies on execute is worthless.
  const [uploader] = await db
    .select({ id: schema.profiles.id })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, UPLOADED_BY))
    .limit(1);
  if (!uploader) {
    throw new Error(
      `media.uploaded_by would reference profile '${UPLOADED_BY}', which does not exist. ` +
        `Set WP_IMPORT_AUTHOR_ID to the house profile on this database, or run the WordPress ` +
        `import first (it creates the row).`,
    );
  }
  console.log(`Uploader: ${UPLOADED_BY}`);

  const rows = await db
    .select({
      id: schema.articles.id,
      slug: schema.articles.slug,
      content: schema.articles.content,
      coverImageUrl: schema.articles.coverImageUrl,
      coverImageVariants: schema.articles.coverImageVariants,
      coverImageQuality: schema.articles.coverImageQuality,
      coverImageSmartCrops: schema.articles.coverImageSmartCrops,
      coverImageFocalPoint: schema.articles.coverImageFocalPoint,
      coverImageDetectionData: schema.articles.coverImageDetectionData,
    })
    .from(schema.articles);

  const articles = LIMIT === null ? rows : rows.slice(0, LIMIT);
  console.log(`Articles scanned: ${articles.length}`);

  // Pass 1 — collect every referenced in-bucket URL and who references it.
  /** url -> the referencing article ids, first one wins for original_article_id. */
  const referencedKeyByUrl = new Map<string, string>();
  const firstArticleByUrl = new Map<string, string>();
  const coverUrls = new Set<string>();
  /** article id -> content URLs (covers excluded: usage tracks content only). */
  const usageByArticle = new Map<string, Set<string>>();
  const offBucket = new Set<string>();

  for (const article of articles) {
    const usage = new Set<string>();
    for (const url of extractImageUrlsFromContent(article.content)) {
      const key = r2KeyFromUrl(url);
      if (!key) {
        offBucket.add(url);
        continue;
      }
      usage.add(url);
      referencedKeyByUrl.set(url, key);
      if (!firstArticleByUrl.has(url)) firstArticleByUrl.set(url, article.id);
    }
    if (usage.size > 0) usageByArticle.set(article.id, usage);

    if (article.coverImageUrl) {
      const key = r2KeyFromUrl(article.coverImageUrl);
      if (!key) {
        offBucket.add(article.coverImageUrl);
      } else {
        referencedKeyByUrl.set(article.coverImageUrl, key);
        if (!firstArticleByUrl.has(article.coverImageUrl)) {
          firstArticleByUrl.set(article.coverImageUrl, article.id);
        }
        coverUrls.add(article.coverImageUrl);
      }
    }
  }

  // Pass 2 — one bucket listing per article prefix, not one HeadObject per
  // object. A listing page carries 1000 keys with their sizes, so ~29 requests
  // replace ~4000 and we get the variant siblings for free.
  const prefixes = new Set<string>();
  for (const key of referencedKeyByUrl.values()) {
    const prefix = listingPrefix(key);
    if (prefix) prefixes.add(prefix);
  }
  process.stdout.write(`Listing ${prefixes.size} R2 prefix(es)…`);
  const inventory = new Map<string, number>();
  for (const prefix of prefixes) {
    for (const [k, size] of await listPrefix(prefix)) inventory.set(k, size);
  }
  console.log(` ${inventory.size} object(s) found`);

  // Pass 3 — resolve each reference to its original + variants.
  const coverMetaByUrl = new Map<string, (typeof articles)[number]>();
  for (const article of articles) {
    if (article.coverImageUrl) coverMetaByUrl.set(article.coverImageUrl, article);
  }

  const planned: PlannedMedia[] = [];
  const seenOriginalKeys = new Set<string>();
  /**
   * EVERY referenced URL to the original object it belongs to, aliases
   * included.
   *
   * `r2_key` is uniquely indexed, so several references sharing one original
   * (an article using both `high.webp` and `low.webp`, or a cover also used
   * inline) collapse to a single `media` row whose `url` is whichever
   * reference was seen first. Usage linking therefore CANNOT go through
   * `media.url` - the runner-up URLs would match nothing and those articles
   * would silently lose their usage rows. It goes through this map to the
   * canonical key instead, which every alias shares.
   */
  const originalKeyByUrl = new Map<string, string>();
  let aliasedUrls = 0;

  for (const [url, referencedKey] of referencedKeyByUrl) {
    const { originalKey, variants } = resolveFamily(referencedKey, inventory);
    originalKeyByUrl.set(url, originalKey);

    // Two references to one original collapse to a single row, but BOTH URLs
    // stay in `originalKeyByUrl` so both can still be linked for usage.
    if (seenOriginalKeys.has(originalKey)) {
      aliasedUrls++;
      continue;
    }
    seenOriginalKeys.add(originalKey);

    const cover = coverMetaByUrl.get(url);
    planned.push({
      url,
      originalKey,
      fileSize: clampFileSize(inventory.get(originalKey) ?? 0),
      // A cover's variants/crops were already generated by the importer and
      // stored on the article; prefer those over the ones derived from the
      // listing, since they are what the public page actually renders. The
      // `articles` cover columns are untyped `jsonb`, so the shapes are
      // asserted here — they were written by `generateVariants()` /
      // `processSmartCrops()` and the `media` columns declare the same types.
      variants: (cover?.coverImageVariants as ImageVariants | null) ?? variants,
      defaultQuality: cover?.coverImageQuality ?? null,
      smartCrops: (cover?.coverImageSmartCrops as SmartCrops | null) ?? null,
      focalPoint: (cover?.coverImageFocalPoint as FocalPoint | null) ?? null,
      detectionData: cover?.coverImageDetectionData ?? null,
      originalArticleId: firstArticleByUrl.get(url)!,
      fromCover: coverUrls.has(url),
    });
  }

  // Already-registered objects, keyed on the column the insert conflicts on so
  // the counts below are the real deltas.
  const existing = await db.select({ r2Key: schema.media.r2Key }).from(schema.media);
  const existingKeys = new Set(existing.map((m) => m.r2Key));
  const toInsert = planned.filter((p) => !existingKeys.has(p.originalKey));

  const missingOriginal = toInsert.filter((p) => !inventory.has(p.originalKey)).length;
  const clamped = toInsert.filter(
    (p) => (inventory.get(p.originalKey) ?? 0) > MAX_FILE_SIZE,
  ).length;
  const noSize = toInsert.filter((p) => p.fileSize === 0).length;

  console.log(`\nDistinct in-bucket media referenced: ${planned.length}`);
  if (aliasedUrls > 0) {
    console.log(
      `  (${aliasedUrls} further URL(s) are variants of those same originals; still usage-linked)`,
    );
  }
  console.log(`  already registered: ${planned.length - toInsert.length}`);
  console.log(`  to insert:          ${toInsert.length}`);
  console.log(
    `  covers / inline:    ${toInsert.filter((p) => p.fromCover).length} / ${toInsert.filter((p) => !p.fromCover).length}`,
  );
  console.log(`  with variants:      ${toInsert.filter((p) => p.variants).length}`);
  if (missingOriginal > 0) {
    console.log(`  ⚠ ${missingOriginal} reference(s) whose original object is missing from R2`);
  }
  if (noSize > 0) console.log(`  ⚠ ${noSize} row(s) will get file_size = 0 (object not listed)`);
  if (clamped > 0) {
    console.log(`  ⚠ ${clamped} object(s) exceed 2 GiB; file_size clamped to ${MAX_FILE_SIZE}`);
  }
  if (offBucket.size > 0) {
    console.log(`\nSkipped ${offBucket.size} URL(s) outside ${PUBLIC_BASE} (no derivable r2_key):`);
    for (const u of [...offBucket].slice(0, 10)) console.log(`  - ${u}`);
    if (offBucket.size > 10) console.log(`  … and ${offBucket.size - 10} more`);
  }

  console.log('\n--- media rows ---');
  const preview = VERBOSE ? toInsert : toInsert.slice(0, 15);
  for (const p of preview) {
    console.log(
      `  ${p.fromCover ? 'cover ' : 'inline'} ${mimeFromKey(p.originalKey)} ${String(p.fileSize).padStart(9)}B ${p.variants ? 'v' : '-'} ${p.originalKey}`,
    );
  }
  if (!VERBOSE && toInsert.length > preview.length) {
    console.log(`  … and ${toInsert.length - preview.length} more (--verbose to list all)`);
  }

  if (!EXECUTE) {
    // Counted the way the write path counts them: distinct (original object,
    // article) pairs, so two variant URLs of one image inside one article are
    // one link, not two.
    const plannedPairs = new Set<string>();
    for (const [articleId, urls] of usageByArticle) {
      for (const url of urls) {
        const key = originalKeyByUrl.get(url);
        if (key) plannedPairs.add(`${key}::${articleId}`);
      }
    }
    const plannedUsage = plannedPairs.size;
    console.log('\n--- media_article_usage ---');
    console.log(`  ${plannedUsage} link(s) across ${usageByArticle.size} article(s)`);
    console.log('\nDRY RUN — nothing was written. Re-run with --execute to apply.\n');
    await client.end();
    return;
  }

  // ── Write ──────────────────────────────────────────────────────────────────

  // Chunked so one statement never carries the whole catalogue: the pooled
  // role has an 8s statement_timeout and this is a maintenance script, not a
  // reason to hold a lane open for the duration.
  const CHUNK = 200;

  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const chunk = toInsert.slice(i, i + CHUNK);
    const result = await db
      .insert(schema.media)
      .values(
        chunk.map((p) => ({
          filename: filenameFromKey(p.originalKey),
          r2Key: p.originalKey,
          // `url` MUST be the exact string the article references: it is what
          // `syncMediaUsage()` matches on when reconciling usage on every save.
          url: p.url,
          originalUrl: `${PUBLIC_BASE}/${p.originalKey}`,
          mimeType: mimeFromKey(p.originalKey),
          fileSize: p.fileSize,
          variants: p.variants,
          defaultQuality: p.defaultQuality ?? 'high',
          smartCrops: p.smartCrops,
          focalPoint: p.focalPoint,
          detectionData: p.detectionData,
          // Every one of these came in attached to an article, which is exactly
          // what `article_upload` means on the live upload path.
          source: 'article_upload' as const,
          originalArticleId: p.originalArticleId,
          uploadedBy: UPLOADED_BY,
        })),
      )
      // Idempotency lives on `idx_media_r2_key_unique`.
      .onConflictDoNothing({ target: schema.media.r2Key })
      .returning({ id: schema.media.id });
    inserted += result.length;
    console.log(`  inserted ${inserted}/${toInsert.length}`);
  }

  // Usage links. Re-read the full media set so URLs registered by an earlier
  // run (or by a live upload) get linked too, not only the ones inserted above.
  // Keyed on `r2_key`, not `url`: see `originalKeyByUrl` above - several
  // referenced URLs can share one row, and only the canonical key is common to
  // all of them.
  const allMedia = await db
    .select({ id: schema.media.id, r2Key: schema.media.r2Key })
    .from(schema.media);
  const mediaIdByKey = new Map(allMedia.map((m) => [m.r2Key, m.id]));

  // De-duplicated: two aliases of one original inside the same article would
  // otherwise name the identical (mediaId, articleId) pair twice, and Postgres
  // rejects a single INSERT that hits the same conflict target row more than
  // once even under ON CONFLICT DO NOTHING.
  const usageSeen = new Set<string>();
  const usageValues: { mediaId: string; articleId: string }[] = [];
  for (const [articleId, urls] of usageByArticle) {
    for (const url of urls) {
      const key = originalKeyByUrl.get(url);
      const mediaId = key ? mediaIdByKey.get(key) : undefined;
      if (!mediaId) continue;
      const pair = `${mediaId}\u0000${articleId}`;
      if (usageSeen.has(pair)) continue;
      usageSeen.add(pair);
      usageValues.push({ mediaId, articleId });
    }
  }

  let linked = 0;
  for (let i = 0; i < usageValues.length; i += CHUNK) {
    const result = await db
      .insert(schema.mediaArticleUsage)
      .values(usageValues.slice(i, i + CHUNK))
      // Idempotency lives on `media_article_usage_unique`.
      .onConflictDoNothing()
      .returning({ id: schema.mediaArticleUsage.id });
    linked += result.length;
  }

  console.log(`\nDone. media rows inserted: ${inserted}. usage links created: ${linked}.`);
  console.log('Visit /admin/inspire/media to confirm.\n');

  await client.end();
}

main().catch(async (err) => {
  console.error('Backfill failed:', err);
  await client.end();
  process.exit(1);
});
