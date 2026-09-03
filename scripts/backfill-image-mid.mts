/**
 * Ahrefs image item, 04 September 2026 — write the `mid` article-body variant
 * for every media row that lacks one, and re-encode any `crop-*` cover crop
 * that is over the 300 KB ceiling.
 *
 *   pnpm backfill:mid --db "<url>" --undo <path> --dry-run   # report + diff only
 *   pnpm backfill:mid --db "<url>" --undo <path>             # write
 *   pnpm backfill:mid --db "<url>" --undo <path> --limit 5   # a small first pass
 *   pnpm backfill:mid --db "<url>" --undo <path> --phase crops
 *
 * `--db` and `--undo` are REQUIRED and never defaulted, for the reason
 * `backfill-midsize-cover.mts` states: this script writes, the local database is
 * not a copy of production, and defaulting the target would make the
 * destructive case the easy one.
 *
 * ── ⚠ THIS SCRIPT MUST RUN BEFORE THE RENDER CHANGE DEPLOYS ────────────────
 * `getArticleVariantUrl` is a STRING REWRITE. Once `article-renderer.tsx` asks
 * for `mid`, every inline figure and single-column gallery cell on the site
 * points at `<dir>/mid.webp` whether or not that object exists. Deploying
 * first 404s the entire article body. The order is:
 *
 *   1. run this against production
 *   2. `pnpm audit:mid-coverage --db "<url>"` reports zero misses
 *   3. then ship
 *
 * Step 2 is `audit-mid-coverage.mts`, NOT `audit-body-image-bytes.mjs`. The
 * latter scrapes RENDERED pages, and before the deploy those pages still emit
 * `high.webp` — it never requests a `mid.webp` at all, so it could never prove
 * coverage ahead of the deploy. Coverage has to be read from the article
 * CONTENT. `audit-body-image-bytes.mjs` is the AFTER check.
 *
 * ⚠ AND THE SELECTION IS EVERY ROW LACKING `mid`, NOT EVERY ROW WITH A `high`.
 * An earlier draft selected `variants ? 'high'`, which reads as the same set and
 * is not: 13 of the 1,087 live media rows carry no `high`. `getArticleVariantUrl`
 * rewrites `original.{webp,jpg,jpeg,png}` and `low.webp` to `mid.webp` as well,
 * and `editor-toolbar.tsx` inserts `item.url` verbatim into the Tiptap document
 * — which for a row with no generated variant set IS the original. So those 13
 * are exactly the rows whose body figures would 404, and a 30-page audit sample
 * can miss every one of them.
 *
 * ── WHAT IT WRITES, AND HOW TO UNDO IT ─────────────────────────────────────
 *
 * PHASE `variants` — purely ADDITIVE. Nothing existing is overwritten.
 *   R2  PUT  <dir>/mid.webp        — a NEW key. No object existed there before
 *            this item, so the PUT cannot clobber anything.
 *   DB  UPDATE media SET variants = variants || '{"mid": …}'
 *            — one added JSONB key, applied as a MERGE rather than a
 *            read-modify-write. A sibling worker is editing `media.alt` on the
 *            same rows during this run; a merge cannot lose their update, and a
 *            whole-row write would.
 *
 * PHASE `crops` — REPLACES BYTES AT AN EXISTING KEY, and writes no database at
 * all.
 *   R2  COPY <key> → <key>.pre-ceiling   — the prior bytes, kept, BEFORE the
 *            overwrite, and re-used as the encode SOURCE on any later run so a
 *            second pass cannot stack a second lossy generation.
 *   R2  PUT  <key>                       — the SAME key, re-encoded lower.
 *   DB  nothing. The stored URL, its `?v=` token, the recorded width and height
 *            and the crop geometry are all unchanged, because this is a quality
 *            re-encode of the very pixels already at that key — not a re-cut.
 *
 * That last point is the whole reason this phase is safe to run beside a
 * content worker: it never touches `articles`.
 *
 * ── THE THREE THINGS THE CDN BREAKS IF YOU LET IT ──────────────────────────
 * These objects are served `max-age=31536000, immutable` through Cloudflare
 * (verified `cf-cache-status: HIT`, 04 September 2026) and phase `crops` keeps
 * the URL while changing the bytes. So:
 *
 *  1. The edge must be purged or production serves the old file for a YEAR.
 *     The purge therefore runs BY DEFAULT and a purge that is skipped or fails
 *     is a NON-ZERO EXIT. `--no-purge` exists for a local target and says so.
 *  2. Candidate sizes are read with an R2 `HeadObject`, never a HEAD against
 *     the public URL. The CDN answers with the length it has cached, so a
 *     resumed run would see the OLD size for a crop it already fixed, re-encode
 *     it, and never converge.
 *  3. An object that CANNOT be sized is never treated as small. `bytes: 0` from
 *     a failed HEAD reads as comfortably under any ceiling; such a candidate is
 *     recorded as a FAILURE and forces a non-zero exit instead.
 *
 * ── BACKUP AND RECOVERY ────────────────────────────────────────────────────
 * The undo path is written to at STARTUP, before anything else, so a bad path
 * fails the run at exit 2 rather than after 1,000 production writes. The
 * pre-state of everything selected is exported to `--backup` before the first
 * write, and the undo file is flushed as the run proceeds and again in a
 * `finally`, so an interrupted run still leaves a record of what it had done.
 *
 *   variants: `UPDATE media SET variants = variants - 'mid' WHERE id IN (…)`,
 *             the ids being in the undo file. The orphaned `mid.webp` objects
 *             cost nothing and no code path reads a key absent from the JSONB.
 *   crops:    copy `<key>.pre-ceiling` back over `<key>` and purge. No re-cut,
 *             no Rekognition, and no write to `articles` — which matters,
 *             because that table belongs to another worker this week.
 *
 * Re-runnable. Without `--force` it skips any media row that already carries a
 * `mid` and any crop already under the ceiling, so an interrupted run resumes
 * where it stopped.
 */
import { writeFileSync } from 'node:fs';
import postgres from 'postgres';
import sharp from 'sharp';
import {
  CopyObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getR2Client, extractKeyFromUrl } from '../src/lib/r2/client';
import { encodeUnderCeiling } from '../src/lib/storage/byte-ceiling';
import { MID_PRESET } from '../src/lib/storage/image-variants';
import { CROP_TARGETS, CROP_CEILING, resolveR2Bucket } from '../src/lib/storage/smart-crop';
import type { ImageVariants } from '../src/lib/storage/image-variants';
import type { SmartCrops } from '../src/lib/storage/smart-crop';

type MediaRow = {
  id: string;
  r2_key: string;
  url: string;
  variants: ImageVariants | null;
  /** `jsonb_typeof(variants)`. NOT always 'object' — see `selectVariantRows`. */
  variants_type: string | null;
};

type ArticleRow = {
  id: string;
  slug: string;
  cover_image_smart_crops: SmartCrops | null;
};

/** Only the `CROP_TARGETS` family. The `-sm`/`-md` renditions already run their own ladder. */
const CROP_TARGET_NAMES = new Set(CROP_TARGETS.map((t) => t.name));

/** Where the prior bytes of an overwritten crop are kept, and re-encoded FROM. */
const BACKUP_SUFFIX = '.pre-ceiling';

const AUDIT_TMP = 'C:/Users/Ian Ng/Documents/Code/tmp/2026-09-04-ahrefs-audit';

function die(msg: string): never {
  console.error(`Refusing to run: ${msg}`);
  process.exit(2);
}

function parseArgs(argv: string[]) {
  const val = (n: string) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : undefined);

  /**
   * ⚠️ Validated, not just coerced. `Number('abc')` is NaN and `NaN ?? 4` is
   * NaN, not 4 — and a NaN concurrency made `Array.from({length: Math.max(1,
   * NaN)})` an EMPTY array, so the pool started no workers, every result slot
   * stayed a hole, every `.filter()` skipped the holes, and the script printed
   * "0 written, 0 failed … EXIT 0". A fat-fingered flag produced a green
   * backfill that wrote nothing, which is the worst possible failure here
   * because the render change then ships on the strength of it.
   */
  const num = (n: string, fallback: number | undefined, min: number) => {
    const v = val(n);
    if (v === undefined) return fallback;
    const x = Number(v);
    if (!Number.isFinite(x)) die(`${n} must be a number, got ${JSON.stringify(v)}.`);
    if (x < min) die(`${n} must be >= ${min}, got ${x}.`);
    return x;
  };

  return {
    db: val('--db'),
    undo: val('--undo'),
    backup: val('--backup') ?? `${AUDIT_TMP}/backups/hellokahwin-images.json`,
    diff: val('--diff') ?? `${AUDIT_TMP}/hellokahwin-images-dryrun.md`,
    dryRun: argv.includes('--dry-run'),
    /**
     * Re-attempts work already done. In phase `crops` it does NOT widen the
     * selection to every crop: an under-budget crop re-encoded for no byte
     * benefit just collects a lossy generation under an immutable URL, which is
     * 408 crops of blast radius to fix the 309 that are actually over.
     */
    force: argv.includes('--force'),
    // Purge is the DEFAULT, not a flag, because phase `crops` changes bytes
    // under an unchanged immutable URL. Opting out is the thing that has to be
    // typed out loud.
    noPurge: argv.includes('--no-purge'),
    limit: num('--limit', undefined, 1),
    // Deliberately modest. Each item is a multi-megabyte GET, a sharp encode and
    // a PUT; running these wide saturates the uplink and buys nothing, and R2
    // rate-limits a burst anyway.
    concurrency: num('--concurrency', 4, 1)!,
    /** Milliseconds between the completion of one item and the start of the next, per worker. */
    sleepMs: num('--sleep-ms', 150, 0)!,
    phase: (val('--phase') ?? 'all') as 'all' | 'variants' | 'crops',
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Run `task` over `items` with a fixed worker count, preserving input order in the results. */
async function pooled<T, R>(
  items: T[],
  concurrency: number,
  sleepMs: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  // Throws rather than clamping. A pool that silently runs zero workers returns
  // a sparse array that every `.filter()` reads as "nothing to report".
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error(`pooled: concurrency must be a positive integer, got ${concurrency}`);
  }
  const out = new Array<R>(items.length);
  let cursor = 0;
  const worker = async () => {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      out[i] = await task(items[i], i);
      if (sleepMs > 0) await sleep(sleepMs);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return out;
}

async function fetchR2Object(bucket: string, key: string): Promise<Buffer> {
  const res = await getR2Client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const chunks: Buffer[] = [];
  // @ts-expect-error — the SDK types Body as a union; in Node it is a Readable.
  for await (const chunk of res.Body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

/**
 * The stored size, read from R2 itself.
 *
 * ⚠ NOT a HEAD against the public URL. See the header: the CDN answers with the
 * length it cached, which for a crop this run has already rewritten is the OLD
 * number — and a resume would then re-encode it forever.
 *
 * Returns null when the object is absent or unreadable. Callers treat null as a
 * FAILURE, never as zero: a zero would read as comfortably under any ceiling and
 * the crop would be dropped from the run in silence.
 */
async function r2Size(bucket: string, key: string): Promise<number | null> {
  try {
    const res = await getR2Client().send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return typeof res.ContentLength === 'number' ? res.ContentLength : null;
  } catch {
    return null;
  }
}

/** The directory a variant sits in, matching `generateVariants`' own two key formats. */
function dirPrefixFor(originalKey: string): string {
  if (originalKey.includes('/original.')) {
    return originalKey.substring(0, originalKey.lastIndexOf('/') + 1);
  }
  const lastSlash = originalKey.lastIndexOf('/');
  const filename = originalKey.substring(lastSlash + 1).replace(/\.[^.]+$/, '');
  return originalKey.substring(0, lastSlash + 1) + filename + '/';
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

// ── Cloudflare purge ─────────────────────────────────────────────────────────

/**
 * Purge specific URLs from the Cloudflare edge. Only phase `crops` needs it:
 * those objects keep their URL while their bytes change, and they are served
 * `immutable` for a year.
 *
 * Batched at 30, Cloudflare's documented per-request cap for purge-by-URL on
 * this plan. Every failure is counted and returned; the CALLER decides the exit
 * code, and it treats any failure as fatal.
 */
async function purgeUrls(urls: string[]): Promise<{ purged: number; failed: number }> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zone = process.env.CLOUDFLARE_ZONE_ID;
  if (!token || !zone) {
    console.error('purge  CLOUDFLARE_API_TOKEN / CLOUDFLARE_ZONE_ID are not in the environment.');
    return { purged: 0, failed: urls.length };
  }

  let purged = 0;
  let failed = 0;
  for (let i = 0; i < urls.length; i += 30) {
    const batch = urls.slice(i, i + 30);
    try {
      const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: batch }),
      });
      if (res.ok) {
        purged += batch.length;
      } else {
        failed += batch.length;
        console.error(`purge  batch ${i / 30 + 1}: HTTP ${res.status} ${await res.text()}`);
      }
    } catch (e) {
      failed += batch.length;
      console.error(`purge  batch ${i / 30 + 1}: ${(e as Error).message}`);
    }
  }
  return { purged, failed };
}

// ── Outcomes ─────────────────────────────────────────────────────────────────

type VariantOutcome = {
  id: string;
  key: string;
  status: 'written' | 'written-no-db' | 'failed';
  bytes?: number;
  reason?: string;
  quality?: number;
  highBytes?: number;
  overCeiling?: boolean;
  error?: string;
};

type CropOutcome = {
  slug: string;
  name: string;
  url: string;
  key: string;
  bucket?: string;
  backupKey?: string;
  status: 'rewritten' | 'left' | 'failed';
  before?: number;
  after?: number;
  quality?: number;
  /** True whenever the object is STILL over the ceiling after this run. */
  overCeiling?: boolean;
  reason?: string;
  error?: string;
};

// ── Phase 1: the `mid` variant ───────────────────────────────────────────────

async function selectVariantRows(
  sql: postgres.Sql,
  args: ReturnType<typeof parseArgs>,
): Promise<MediaRow[]> {
  // EVERY row lacking `mid`, not every row carrying `high`. See the header.
  //
  // ⚠️ `jsonb_typeof` is SELECTED, not filtered on, and that is deliberate.
  // Read on production 04 September 2026: 13 of the 1,087 media rows store
  // `variants` as a JSONB **string** — a double-encoded JSON document — rather
  // than an object. They are the `…-kad-tajuk.png` text cards plus one
  // photograph. Two things follow, and they pull in opposite directions:
  //
  //   · They MUST be in scope. `getArticleVariantUrl` rewrites a bare
  //     `original.png` to `mid.webp`, and `editor-toolbar.tsx` inserts a media
  //     row's `url` verbatim into the Tiptap document — which for these rows is
  //     the original. Skip them and any one of them in an article body 404s the
  //     moment the render change ships.
  //   · They must NOT be merged into. Postgres's `?` matches a top-level key, an
  //     array element OR a scalar string, and `variants || '{"mid":…}'` on a
  //     non-object does not error — it coerces both sides to arrays and
  //     concatenates, replacing the column with `["…", {"mid":…}]` and
  //     destroying the row's variant set outright.
  //
  // So the R2 object is written for them (which is what stops the 404) and the
  // database update is skipped (which is what stops the corruption). The rows
  // are reported so the double-encoding can be repaired as its own decision;
  // repairing it here would be a live data migration nobody asked for.
  return sql<MediaRow[]>`
    select id, r2_key, url, variants, jsonb_typeof(variants) as variants_type
      from media
     where r2_key is not null
       and r2_key <> ''
       ${
         args.force
           ? sql``
           : sql`and (jsonb_typeof(variants) is distinct from 'object' or not (variants ? 'mid'))`
       }
     order by r2_key
     ${args.limit ? sql`limit ${args.limit}` : sql``}
  `;
}

async function backfillVariants(
  rows: MediaRow[],
  sql: postgres.Sql,
  args: ReturnType<typeof parseArgs>,
  record: (o: VariantOutcome) => void,
): Promise<void> {
  let done = 0;
  await pooled(rows, args.concurrency, args.sleepMs, async (row) => {
    // Resolved per key, the same way `generateSmartCrops` resolves it when it
    // WRITES these objects: anything outside `inspire/` lives in the assets
    // bucket, and assuming `R2_BUCKET_NAME` would make those rows unfixable.
    const { bucket, publicUrl } = resolveR2Bucket(row.r2_key);
    const key = `${dirPrefixFor(row.r2_key)}mid.webp`;
    try {
      // Encoded from the ORIGINAL, not from `high`. Re-encoding a q80 WebP would
      // stack a second lossy pass on the rung the whole article body reads —
      // and 13 of these rows have no `high` to re-encode in any case.
      const source = await fetchR2Object(bucket, row.r2_key);

      const encoded = await encodeUnderCeiling(
        (quality) =>
          sharp(source)
            .resize({ width: MID_PRESET.maxWidth, withoutEnlargement: true })
            .webp({ quality }),
        MID_PRESET,
      );

      await getR2Client().send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: encoded.buffer,
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );

      const common = {
        id: row.id,
        key,
        bytes: encoded.bytes,
        quality: encoded.quality,
        highBytes: row.variants?.high?.sizeBytes,
        overCeiling: encoded.overCeiling,
      };

      // ⚠️ The object is on R2 either way — that is what stops the 404. The
      // column is only touched when it is safe to touch. See `selectVariantRows`.
      if (row.variants_type !== 'object') {
        done++;
        record({
          ...common,
          status: 'written-no-db',
          reason: `variants is jsonb ${row.variants_type ?? 'null'}, not an object; merging would destroy it`,
        });
        return;
      }

      // A MERGE, not a row write. See the header: a sibling worker is editing
      // `media.alt` on these same rows.
      await sql`
        update media
           set variants = variants || ${sql.json({
             mid: { url: `${publicUrl}/${key}`, sizeBytes: encoded.bytes },
           })}::jsonb,
               updated_at = now()
         where id = ${row.id}
      `;

      done++;
      if (done % 50 === 0) console.log(`PROGRESS: variants ${done}/${rows.length}`);

      record({ ...common, status: 'written' });
    } catch (e) {
      console.warn(`  FAILED ${key}: ${(e as Error).message}`);
      record({ id: row.id, key, status: 'failed', error: (e as Error).message });
    }
  });
}

// ── Phase 2: the over-ceiling crops ──────────────────────────────────────────

type CropCandidate = {
  slug: string;
  name: string;
  url: string;
  key: string;
  bucket: string;
  bytes: number;
  /** A prior run's pristine copy, if one exists. The encode SOURCE when present. */
  backupBytes: number | null;
};

async function selectCrops(
  sql: postgres.Sql,
  args: ReturnType<typeof parseArgs>,
): Promise<{ all: CropCandidate[]; selected: CropCandidate[]; unsizable: CropOutcome[] }> {
  const rows = await sql<ArticleRow[]>`
    select id, slug, cover_image_smart_crops
      from articles
     where cover_image_smart_crops is not null
       and jsonb_typeof(cover_image_smart_crops) = 'object'
     order by slug
     ${args.limit ? sql`limit ${args.limit}` : sql``}
  `;

  const flat = rows.flatMap((a) =>
    Object.entries(a.cover_image_smart_crops ?? {})
      .filter(([name]) => CROP_TARGET_NAMES.has(name))
      .map(([name, entry]) => ({ slug: a.slug, name, url: entry.url })),
  );

  // Sized from R2, never from the CDN. See `r2Size`.
  const sized = await pooled(flat, 8, 0, async (c) => {
    const key = extractKeyFromUrl(c.url);
    const { bucket } = resolveR2Bucket(key);
    const [bytes, backupBytes] = await Promise.all([
      r2Size(bucket, key),
      r2Size(bucket, `${key}${BACKUP_SUFFIX}`),
    ]);
    return { ...c, key, bucket, bytes, backupBytes };
  });

  // An object we could not size is a FAILURE, not a small file. Folding it into
  // the under-ceiling set is how a transient blip during a 400-object sizing
  // pass turns into "N over the ceiling" being under-reported and an exit 0.
  const unsizable: CropOutcome[] = sized
    .filter((c) => c.bytes === null)
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      url: c.url,
      key: c.key,
      bucket: c.bucket,
      status: 'failed' as const,
      error: 'could not read the object size from R2',
    }));

  const all = sized
    .filter((c): c is typeof c & { bytes: number } => c.bytes !== null)
    .map((c) => ({ ...c, bytes: c.bytes }));

  // ⚠ `--force` re-ATTEMPTS, it does not re-SELECT. The predicate stays, because
  // re-encoding an under-budget crop buys no bytes and costs it a lossy
  // generation under a URL that cannot be cache-busted.
  const selected = all.filter((c) => c.bytes > CROP_CEILING.CEILING_BYTES);
  return { all, selected, unsizable };
}

async function backfillCrops(
  selected: CropCandidate[],
  args: ReturnType<typeof parseArgs>,
  record: (o: CropOutcome) => void,
): Promise<void> {
  await pooled(selected, args.concurrency, args.sleepMs, async (c) => {
    const backupKey = `${c.key}${BACKUP_SUFFIX}`;
    const base = {
      slug: c.slug,
      name: c.name,
      url: c.url,
      key: c.key,
      bucket: c.bucket,
      before: c.bytes,
    };
    try {
      // A prior run already walked the whole ladder on this crop and it is STILL
      // over. Re-encoding would start again from that run's own output — a
      // second lossy generation, for a result the ladder has already shown it
      // cannot reach. Report it and leave it alone; the non-zero exit is what
      // carries the news, not another pass over the pixels.
      if (c.backupBytes !== null && !args.force) {
        record({
          ...base,
          backupKey,
          status: 'left',
          overCeiling: true,
          reason: 'the ladder was already exhausted on this crop by an earlier run',
        });
        return;
      }

      // ⚠ The SOURCE is the pristine backup when one exists, never the stored
      // object. Re-encoding a crop from its own degraded output stacks
      // generations every time the run is repeated — and the exit code
      // deliberately invites a repeat.
      const sourceKey = c.backupBytes !== null ? backupKey : c.key;
      const current = await fetchR2Object(c.bucket, sourceKey);
      const meta = await sharp(current).metadata();

      const encoded = await encodeUnderCeiling(
        (quality) => sharp(current).webp({ quality }),
        CROP_CEILING,
      );

      // Asserted BEFORE the write, not after: the stored JSONB records a width
      // and height that render code trusts for the intrinsic size, and a
      // re-encode that changed them would make that record a lie. Nothing is
      // overwritten until this holds — an earlier draft checked it AFTER the
      // PUT, which left the untrusted object live and, because a failed item is
      // never collected for the purge, un-bustable at the edge for a year.
      if (encoded.width !== meta.width || encoded.height !== meta.height) {
        throw new Error(
          `dimensions moved ${meta.width}x${meta.height} -> ${encoded.width}x${encoded.height}; ` +
            'the stored JSONB would be wrong. NOTHING was written.',
        );
      }

      // Never make a file bigger. A crop that encodes larger at a lower quality
      // is left exactly as it was — and it is still over the ceiling, which the
      // outcome says out loud so the run cannot report success over it.
      if (encoded.bytes >= c.bytes) {
        record({
          ...base,
          status: 'left',
          after: encoded.bytes,
          quality: encoded.quality,
          overCeiling: true,
          reason: 'the re-encode was not smaller than the stored object',
        });
        return;
      }

      // The prior bytes, kept, BEFORE the overwrite. Without this the only
      // stated recovery was a re-cut through Rekognition that also writes
      // `articles.cover_image_smart_crops` — a table this run is not allowed to
      // touch. Skipped when a backup is already there: overwriting it with the
      // degraded current object would destroy the pristine copy.
      if (c.backupBytes === null) {
        await getR2Client().send(
          new CopyObjectCommand({
            Bucket: c.bucket,
            Key: backupKey,
            CopySource: `${c.bucket}/${c.key}`,
            MetadataDirective: 'COPY',
          }),
        );
      }

      await getR2Client().send(
        new PutObjectCommand({
          Bucket: c.bucket,
          Key: c.key,
          Body: encoded.buffer,
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );

      console.log(
        `  ${c.name} ${c.slug}: ${fmt(c.bytes)} -> ${fmt(encoded.bytes)} B at q${encoded.quality}`,
      );

      record({
        ...base,
        backupKey,
        status: 'rewritten',
        after: encoded.bytes,
        quality: encoded.quality,
        overCeiling: encoded.overCeiling,
      });
    } catch (e) {
      console.warn(`  FAILED ${c.key}: ${(e as Error).message}`);
      record({ ...base, status: 'failed', overCeiling: true, error: (e as Error).message });
    }
  });
}

// ── The dry-run diff the audit's common rules require ────────────────────────

function writeDiff(
  path: string,
  rows: MediaRow[],
  crops: { selected: CropCandidate[]; all: CropCandidate[]; unsizable: CropOutcome[] },
  args: ReturnType<typeof parseArgs>,
): void {
  const L: string[] = [];
  L.push('# HelloKahwin image backfill — dry-run diff');
  L.push('');
  L.push(`Generated ${new Date().toISOString()} against \`${args.db?.replace(/^[^@]*@/, '')}\`.`);
  L.push('');
  L.push('Nothing below has been written. Two rules select rows:');
  L.push('');
  L.push(
    `- **R1 \`mid\` missing** — the media row carries no \`mid\` variant. A new ` +
      `\`mid.webp\` is written at q${MID_PRESET.quality}/${MID_PRESET.maxWidth}px, stepping down ` +
      `the ladder ${MID_PRESET.QUALITY_LADDER.join('/')} until it fits ` +
      `${fmt(MID_PRESET.CEILING_BYTES)} B. Additive: no existing object or column value is replaced.`,
  );
  L.push(
    `- **R2 crop over ceiling** — a \`CROP_TARGETS\` crop measures over ` +
      `${fmt(CROP_CEILING.CEILING_BYTES)} B on R2. It is re-encoded down the ladder ` +
      `${CROP_CEILING.QUALITY_LADDER.join('/')} at the SAME key and the same dimensions; the prior ` +
      `bytes are copied to \`<key>${BACKUP_SUFFIX}\` first and are the source for any later run.`,
  );
  L.push('');
  L.push(`## R1 — \`mid\` missing (${rows.length} rows)`);
  L.push('');
  L.push('| media id | r2 key | before (`high`) | after | rule |');
  L.push('|---|---|---|---|---|');
  for (const r of rows) {
    const high = r.variants?.high?.sizeBytes;
    L.push(
      `| \`${r.id}\` | \`${r.r2_key}\` | ${high ? `${fmt(high)} B` : '— (no `high`)'} | ` +
        `<= ${fmt(MID_PRESET.CEILING_BYTES)} B | R1 |`,
    );
  }
  L.push('');
  const noHigh = rows.filter((r) => !r.variants?.high?.sizeBytes);
  L.push(
    `${noHigh.length} of these rows carry no \`high\` at all. They are IN scope on purpose: ` +
      '`getArticleVariantUrl` rewrites a bare `original.*` to `mid.webp` too, so a body figure ' +
      'on such a row would 404 after the render change if it were skipped.',
  );
  L.push('');
  L.push(`## R2 — crops over the ceiling (${crops.selected.length} of ${crops.all.length})`);
  L.push('');
  L.push('| slug | crop | before | after | rule |');
  L.push('|---|---|---|---|---|');
  for (const c of [...crops.selected].sort((a, b) => b.bytes - a.bytes)) {
    L.push(
      `| ${c.slug} | \`${c.name}\` | ${fmt(c.bytes)} B | <= ${fmt(CROP_CEILING.CEILING_BYTES)} B | R2 |`,
    );
  }
  if (crops.unsizable.length > 0) {
    L.push('');
    L.push(`### Could not be sized on R2 (${crops.unsizable.length}) — these FAIL the run`);
    L.push('');
    for (const c of crops.unsizable) L.push(`- ${c.slug} \`${c.name}\` — \`${c.key}\``);
  }
  L.push('');
  writeFileSync(path, L.join('\n'), 'utf8');
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.db) die('--db <url> is required. This script writes.');
  if (!args.undo) die('--undo <path> is required. This script writes to production.');
  if (!['all', 'variants', 'crops'].includes(args.phase)) {
    die(`--phase ${args.phase} is not one of all|variants|crops.`);
  }

  // ⚠ Prove the undo path is writable BEFORE anything else happens. It was
  // previously only checked for presence, so a path whose directory did not
  // exist passed the guard, both phases ran to completion against production,
  // and `writeFileSync` then threw ENOENT — losing every purge URL and every
  // reversal id AFTER the writes had already landed.
  for (const [label, path] of [
    ['--undo', args.undo],
    ['--backup', args.backup],
    ['--diff', args.diff],
  ] as const) {
    try {
      writeFileSync(path, '');
    } catch (e) {
      die(`${label} path ${path} is not writable: ${(e as Error).message}`);
    }
  }

  const host = args.db.replace(/^postgres(ql)?:\/\//, '').replace(/^[^@]*@/, '');
  console.log(`target db     ${host}`);
  console.log(
    `mid           q${MID_PRESET.quality} @ ${MID_PRESET.maxWidth}px, ceiling ${fmt(MID_PRESET.CEILING_BYTES)} B, ladder ${MID_PRESET.QUALITY_LADDER.join('/')}`,
  );
  console.log(
    `crops         ceiling ${fmt(CROP_CEILING.CEILING_BYTES)} B, ladder ${CROP_CEILING.QUALITY_LADDER.join('/')}`,
  );
  console.log(
    `mode          ${args.dryRun ? 'DRY RUN — writes nothing' : 'WRITE'}` +
      `${args.force ? ' --force' : ''}  phase=${args.phase}  concurrency=${args.concurrency}  sleep=${args.sleepMs}ms` +
      `${args.noPurge ? '  --no-purge' : ''}`,
  );

  const sql = postgres(args.db, { prepare: false });

  const variants: VariantOutcome[] = [];
  const crops: CropOutcome[] = [];
  let complete = false;
  const flushUndo = () => {
    const rewritten = crops.filter((c) => c.status === 'rewritten');
    writeFileSync(
      args.undo!,
      JSON.stringify(
        {
          ranAt: new Date().toISOString(),
          target: { db: host },
          dryRun: args.dryRun,
          phase: args.phase,
          complete,
          reversal: {
            variants:
              "UPDATE media SET variants = variants - 'mid' WHERE id IN (" +
              variants
                // ONLY rows whose column was actually merged into. A row that
                // got the R2 object but no column write has nothing to reverse,
                // and naming it here would strip a `mid` it never gained.
                .filter((v) => v.status === 'written')
                .map((v) => `'${v.id}'`)
                .join(', ') +
              ');',
            crops:
              'Copy each backupKey back over its key on R2 (bucket is recorded per row), ' +
              'then purge the url. No database change to reverse.',
          },
          purgeUrls: rewritten.map((c) => c.url),
          variants,
          crops,
        },
        null,
        2,
      ),
      'utf8',
    );
  };

  try {
    // ── Select first, so the pre-state can be exported before anything moves ─
    const variantRows = args.phase === 'crops' ? [] : await selectVariantRows(sql, args);
    const cropSel =
      args.phase === 'variants'
        ? { all: [], selected: [], unsizable: [] }
        : await selectCrops(sql, args);
    for (const u of cropSel.unsizable) crops.push(u);

    const noHigh = variantRows.filter((r) => !r.variants?.high?.sizeBytes).length;
    console.log(`\nPHASE variants — ${variantRows.length} media row(s) lack a mid`);
    if (variantRows.length > 0) {
      const overBefore = variantRows.filter(
        (r) => (r.variants?.high?.sizeBytes ?? 0) > MID_PRESET.CEILING_BYTES,
      ).length;
      console.log(
        `  ${overBefore} currently serve a high over the ${fmt(MID_PRESET.CEILING_BYTES)} B ceiling`,
      );
      console.log(`  ${noHigh} carry no high at all (in scope — see the script header)`);
    }
    console.log(
      `\nPHASE crops — ${cropSel.selected.length} of ${cropSel.all.length} crop(s) over the ${fmt(CROP_CEILING.CEILING_BYTES)} B ceiling`,
    );
    for (const c of [...cropSel.selected].sort((a, b) => b.bytes - a.bytes).slice(0, 12)) {
      console.log(`    ${fmt(c.bytes).padStart(10)} B  ${c.name.padEnd(26)} ${c.slug}`);
    }
    if (cropSel.unsizable.length > 0) {
      console.error(
        `  ${cropSel.unsizable.length} crop(s) could NOT be sized on R2 — recorded as failures`,
      );
    }

    // ── The dry-run diff the common rules require, written either way ────────
    writeDiff(args.diff, variantRows, cropSel, args);
    console.log(`\ndry-run diff  ${args.diff}`);

    if (args.dryRun) {
      console.log('\nDRY RUN — nothing written.');
      complete = true;
      await sql.end();
      return;
    }

    // ── The pre-state, exported BEFORE the first write ───────────────────────
    writeFileSync(
      args.backup,
      JSON.stringify(
        {
          takenAt: new Date().toISOString(),
          target: { db: host },
          note:
            'Pre-state of every row and object this run selected. `media` rows carry the ' +
            'complete prior JSONB; restoring one is a straight overwrite. `crops` records the ' +
            'prior size and the backup key the run copies the prior bytes to.',
          media: variantRows.map((r) => ({
            id: r.id,
            r2_key: r.r2_key,
            url: r.url,
            variants: r.variants,
          })),
          crops: cropSel.selected.map((c) => ({
            slug: c.slug,
            name: c.name,
            url: c.url,
            key: c.key,
            bucket: c.bucket,
            backupKey: `${c.key}${BACKUP_SUFFIX}`,
            bytesBefore: c.bytes,
          })),
        },
        null,
        2,
      ),
      'utf8',
    );
    console.log(`backup        ${args.backup}`);

    // Flush the undo file as the run proceeds, so an interrupted run still
    // leaves a record of what it had already done.
    const ticker = setInterval(flushUndo, 10_000);
    try {
      if (variantRows.length > 0) {
        await backfillVariants(variantRows, sql, args, (o) => variants.push(o));
      }
      if (cropSel.selected.length > 0) {
        await backfillCrops(cropSel.selected, args, (o) => crops.push(o));
      }
    } finally {
      clearInterval(ticker);
    }

    await sql.end();

    // ── Purge, only for bytes that changed under a URL that did not ──────────
    const rewritten = crops.filter((c) => c.status === 'rewritten');
    let purgeFailed = 0;
    if (rewritten.length > 0) {
      if (args.noPurge) {
        purgeFailed = rewritten.length;
        console.error(
          `\npurge  SKIPPED by --no-purge. ${rewritten.length} URL(s) now serve stale bytes at the edge.`,
        );
      } else {
        console.log(`\npurging ${rewritten.length} rewritten crop URL(s) from the Cloudflare edge`);
        const { purged, failed } = await purgeUrls(rewritten.map((c) => c.url));
        purgeFailed = failed;
        console.log(`purge  ${purged} ok, ${failed} failed`);
      }
    }

    // ── Report ──────────────────────────────────────────────────────────────
    const wroteDb = variants.filter((v) => v.status === 'written');
    const noDb = variants.filter((v) => v.status === 'written-no-db');
    // Both have the R2 object, which is the thing the render path needs.
    const written = [...wroteDb, ...noDb];
    const failedV = variants.filter((v) => v.status === 'failed');
    const failedC = crops.filter((c) => c.status === 'failed');
    const left = crops.filter((c) => c.status === 'left');
    // Anything still above the ceiling after this run, whatever its status.
    const stillOver = crops.filter((c) => c.status !== 'rewritten' || c.overCeiling);
    const overV = written.filter((v) => v.overCeiling);

    console.log('\n── RESULT ────────────────────────────────────────────────');
    console.log(
      `variants written   ${written.length}   failed ${failedV.length}` +
        (noDb.length ? `   (${noDb.length} R2-only, column left alone)` : ''),
    );
    if (noDb.length > 0) {
      // Named loudly rather than buried: these rows carry a `mid.webp` on R2 but
      // no `mid` entry in the column, because the column is a double-encoded
      // string. Nothing on the site reads that column for a body figure, so the
      // page is correct — the DATA is not, and somebody has to decide about it.
      console.log('  R2-only rows (variants column is not a JSON object — needs a data repair):');
      for (const v of noDb.slice(0, 20)) console.log(`    ${v.id}  ${v.key}`);
      if (noDb.length > 20) console.log(`    … and ${noDb.length - 20} more`);
    }
    if (written.length > 0) {
      const withHigh = written.filter((v) => v.highBytes);
      const before = withHigh.reduce((s, v) => s + (v.highBytes ?? 0), 0);
      const after = withHigh.reduce((s, v) => s + (v.bytes ?? 0), 0);
      const rungs = new Map<number, number>();
      for (const v of written) rungs.set(v.quality!, (rungs.get(v.quality!) ?? 0) + 1);
      console.log(
        `  high total       ${fmt(before)} B  (over ${withHigh.length} rows with a high)`,
      );
      console.log(
        `  mid total        ${fmt(after)} B   (${before ? (((after - before) / before) * 100).toFixed(1) : '0.0'}%)`,
      );
      console.log(
        `  rungs used       ${[...rungs.entries()]
          .sort((a, b) => b[0] - a[0])
          .map(([q, n]) => `q${q}x${n}`)
          .join('  ')}`,
      );
      console.log(`  over ceiling     ${overV.length}`);
    }
    console.log(
      `crops rewritten    ${rewritten.length}   left ${left.length}   failed ${failedC.length}`,
    );
    if (rewritten.length > 0) {
      const before = rewritten.reduce((s, c) => s + (c.before ?? 0), 0);
      const after = rewritten.reduce((s, c) => s + (c.after ?? 0), 0);
      const rungs = new Map<number, number>();
      for (const c of rewritten) rungs.set(c.quality!, (rungs.get(c.quality!) ?? 0) + 1);
      console.log(`  before / after   ${fmt(before)} -> ${fmt(after)} B`);
      console.log(
        `  rungs used       ${[...rungs.entries()]
          .sort((a, b) => b[0] - a[0])
          .map(([q, n]) => `q${q}x${n}`)
          .join('  ')}`,
      );
    }
    console.log(`crops still over ceiling  ${stillOver.length}`);
    for (const c of stillOver.slice(0, 10)) {
      console.log(`    ${c.name} ${c.slug} — ${c.reason ?? c.error ?? 'over after re-encode'}`);
    }

    complete = true;

    // A failure, a miss, or an unpurged rewrite is a non-zero exit. The library
    // warns and carries on so an editor's upload is never blocked; a BACKFILL is
    // where that same signal has to stop the run — and an unpurged rewrite means
    // production is still serving the old file, which is indistinguishable from
    // not having run at all.
    const bad = failedV.length + overV.length + stillOver.length + purgeFailed;
    if (bad > 0) {
      console.error(
        `\nEXIT 1 — ${failedV.length} variant failures, ${overV.length} variants over ceiling, ` +
          `${stillOver.length} crops still over ceiling, ${purgeFailed} unpurged. See the undo file.`,
      );
      process.exitCode = 1;
    } else {
      console.log('\nEXIT 0');
    }
  } finally {
    flushUndo();
    console.log(`undo file     ${args.undo}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
