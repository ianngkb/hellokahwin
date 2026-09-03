/**
 * Ahrefs image item, 04 September 2026 — write the `mid` article-body variant
 * for every media row that lacks one, and re-encode any `crop-*` cover crop
 * that is over the 300 KB ceiling.
 *
 *   pnpm backfill:mid --db "<url>" --undo <path> --dry-run   # report only
 *   pnpm backfill:mid --db "<url>" --undo <path>             # write
 *   pnpm backfill:mid --db "<url>" --undo <path> --limit 5   # a small first pass
 *   pnpm backfill:mid --db "<url>" --undo <path> --phase crops
 *   pnpm backfill:mid --db "<url>" --undo <path> --force     # re-encode existing
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
 * first 404s the entire article body. Order is: run this against production,
 * confirm `scripts/audit-body-image-bytes.mjs` reports zero misses, then ship.
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
 *   R2  PUT  <dir>/crop-<target>.webp  — the SAME key, re-encoded lower.
 *   DB  nothing. The stored URL, its `?v=` token, the recorded width and height
 *            and the crop geometry are all unchanged, because this is a quality
 *            re-encode of the very pixels already at that key — not a re-cut.
 *
 * That last point is the whole reason this phase is safe to run beside a
 * content worker: it never touches `articles`.
 *
 * ⚠ It also means the CDN must be told. The objects are served with
 * `max-age=31536000, immutable` through Cloudflare (verified `cf-cache-status:
 * HIT` on 04 September 2026), and the URL does not change, so a cached edge
 * keeps serving the old bytes until the cache is purged. The undo file lists
 * every rewritten URL for exactly that purge; `--purge` does it for you when
 * `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ZONE_ID` are present in the
 * environment.
 *
 * RECOVERY.
 *   variants: `UPDATE media SET variants = variants - 'mid' WHERE id IN (…)`,
 *             the ids being in the undo file. The orphaned `mid.webp` objects
 *             cost nothing and no code path reads a key absent from the JSONB.
 *   crops:    the undo file records each crop's PRIOR bytes and quality but not
 *             the prior file. To restore, re-run `processSmartCrops` for the
 *             affected article, which re-cuts from the original at rung 0.
 *
 * Re-runnable. Without `--force` it skips any media row that already carries a
 * `mid` and any crop already under the ceiling, so an interrupted run resumes
 * where it stopped.
 */
import { writeFileSync } from 'node:fs';
import postgres from 'postgres';
import sharp from 'sharp';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client, getR2Bucket, getR2PublicUrl, extractKeyFromUrl } from '../src/lib/r2/client';
import { encodeUnderCeiling } from '../src/lib/storage/byte-ceiling';
import { MID_PRESET } from '../src/lib/storage/image-variants';
import { CROP_TARGETS, CROP_CEILING } from '../src/lib/storage/smart-crop';
import type { ImageVariants } from '../src/lib/storage/image-variants';
import type { SmartCrops } from '../src/lib/storage/smart-crop';

type MediaRow = {
  id: string;
  r2_key: string;
  variants: ImageVariants | null;
};

type ArticleRow = {
  id: string;
  slug: string;
  cover_image_smart_crops: SmartCrops | null;
};

/** Only the `CROP_TARGETS` family. The `-sm`/`-md` renditions already run their own ladder. */
const CROP_TARGET_NAMES = new Set(CROP_TARGETS.map((t) => t.name));

function parseArgs(argv: string[]) {
  const val = (n: string) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : undefined);
  const num = (n: string) => {
    const v = val(n);
    return v === undefined ? undefined : Number(v);
  };
  return {
    db: val('--db'),
    undo: val('--undo'),
    dryRun: argv.includes('--dry-run'),
    force: argv.includes('--force'),
    purge: argv.includes('--purge'),
    limit: num('--limit'),
    // Deliberately modest. Each item is a multi-megabyte GET, a sharp encode and
    // a PUT; running these wide saturates the uplink and buys nothing, and R2
    // rate-limits a burst anyway.
    concurrency: num('--concurrency') ?? 4,
    /** Milliseconds between the completion of one item and the start of the next, per worker. */
    sleepMs: num('--sleep-ms') ?? 150,
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
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  return out;
}

async function fetchR2Object(bucket: string, key: string): Promise<Buffer> {
  const r2 = getR2Client();
  const res = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const chunks: Buffer[] = [];
  // @ts-expect-error — the SDK types Body as a union; in Node it is a Readable.
  for await (const chunk of res.Body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
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
 * Batched at 30, which is Cloudflare's documented per-request cap for
 * purge-by-URL on this plan. A failed purge is reported and does NOT fail the
 * run — the bytes on R2 are already correct, and the undo file carries every
 * URL so the purge can be repeated by hand.
 */
async function purgeUrls(urls: string[]): Promise<{ purged: number; failed: number }> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zone = process.env.CLOUDFLARE_ZONE_ID;
  if (!token || !zone) {
    console.warn(
      'purge  skipped — CLOUDFLARE_API_TOKEN / CLOUDFLARE_ZONE_ID not in the environment.',
    );
    console.warn('       The rewritten URLs are listed in the undo file; purge them by hand.');
    return { purged: 0, failed: urls.length };
  }

  let purged = 0;
  let failed = 0;
  for (let i = 0; i < urls.length; i += 30) {
    const batch = urls.slice(i, i + 30);
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: batch }),
    });
    if (res.ok) {
      purged += batch.length;
    } else {
      failed += batch.length;
      console.warn(`purge  batch ${i / 30 + 1} failed: HTTP ${res.status} ${await res.text()}`);
    }
  }
  return { purged, failed };
}

// ── Phase 1: the `mid` variant ───────────────────────────────────────────────

type VariantOutcome = {
  id: string;
  key: string;
  status: 'written' | 'skipped' | 'failed';
  bytes?: number;
  quality?: number;
  highBytes?: number;
  overCeiling?: boolean;
  error?: string;
};

async function backfillVariants(
  sql: postgres.Sql,
  args: ReturnType<typeof parseArgs>,
  bucket: string,
  publicUrl: string,
): Promise<VariantOutcome[]> {
  const rows = await sql<MediaRow[]>`
    select id, r2_key, variants
      from media
     where variants ? 'high'
       ${args.force ? sql`` : sql`and not (variants ? 'mid')`}
     order by r2_key
     ${args.limit ? sql`limit ${args.limit}` : sql``}
  `;

  console.log(`\nPHASE variants — ${rows.length} media row(s) need a mid`);
  if (rows.length === 0) return [];

  const overBefore = rows.filter(
    (r) => (r.variants?.high?.sizeBytes ?? 0) > MID_PRESET.CEILING_BYTES,
  ).length;
  console.log(
    `  of those, ${overBefore} currently serve a high over the ${fmt(MID_PRESET.CEILING_BYTES)} B ceiling`,
  );

  if (args.dryRun) {
    for (const r of rows.slice(0, 10)) {
      console.log(
        `  would write ${dirPrefixFor(r.r2_key)}mid.webp  (high ${fmt(r.variants?.high?.sizeBytes ?? 0)} B)`,
      );
    }
    if (rows.length > 10) console.log(`  … and ${rows.length - 10} more`);
    return rows.map((r) => ({
      id: r.id,
      key: `${dirPrefixFor(r.r2_key)}mid.webp`,
      status: 'skipped' as const,
      highBytes: r.variants?.high?.sizeBytes,
    }));
  }

  let done = 0;
  return pooled(rows, args.concurrency, args.sleepMs, async (row) => {
    const key = `${dirPrefixFor(row.r2_key)}mid.webp`;
    try {
      // Encoded from the ORIGINAL, not from `high`. Re-encoding a q80 WebP would
      // stack a second lossy pass on the rung the whole article body reads.
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

      // A MERGE, not a row write. See the header: a sibling worker is editing
      // `media.alt` on these same rows.
      await sql`
        update media
           set variants = variants || ${sql.json({ mid: { url: `${publicUrl}/${key}`, sizeBytes: encoded.bytes } })}::jsonb,
               updated_at = now()
         where id = ${row.id}
      `;

      done++;
      if (done % 50 === 0) console.log(`PROGRESS: variants ${done}/${rows.length}`);

      return {
        id: row.id,
        key,
        status: 'written' as const,
        bytes: encoded.bytes,
        quality: encoded.quality,
        highBytes: row.variants?.high?.sizeBytes,
        overCeiling: encoded.overCeiling,
      };
    } catch (e) {
      console.warn(`  FAILED ${key}: ${(e as Error).message}`);
      return { id: row.id, key, status: 'failed' as const, error: (e as Error).message };
    }
  });
}

// ── Phase 2: the over-ceiling crops ──────────────────────────────────────────

type CropOutcome = {
  slug: string;
  name: string;
  url: string;
  key: string;
  status: 'rewritten' | 'skipped' | 'failed';
  before?: number;
  after?: number;
  quality?: number;
  overCeiling?: boolean;
  error?: string;
};

async function backfillCrops(
  sql: postgres.Sql,
  args: ReturnType<typeof parseArgs>,
  bucket: string,
): Promise<CropOutcome[]> {
  const rows = await sql<ArticleRow[]>`
    select id, slug, cover_image_smart_crops
      from articles
     where cover_image_smart_crops is not null
       and jsonb_typeof(cover_image_smart_crops) = 'object'
     order by slug
     ${args.limit ? sql`limit ${args.limit}` : sql``}
  `;

  // Flatten to one candidate per (article, CROP_TARGETS entry).
  const candidates = rows.flatMap((a) =>
    Object.entries(a.cover_image_smart_crops ?? {})
      .filter(([name]) => CROP_TARGET_NAMES.has(name))
      .map(([name, entry]) => ({ slug: a.slug, name, url: entry.url })),
  );

  console.log(`\nPHASE crops — ${candidates.length} crop(s) across ${rows.length} article(s)`);

  // Size is not recorded in the JSONB, so it has to be measured. A HEAD against
  // the public URL is the cheapest way and it reads the object the BROWSER gets,
  // which is the number the audit is about.
  const sized = await pooled(candidates, 8, 0, async (c) => {
    try {
      const res = await fetch(c.url, { method: 'HEAD' });
      const len = Number(res.headers.get('content-length') ?? 0);
      return { ...c, bytes: len };
    } catch {
      return { ...c, bytes: 0 };
    }
  });

  const over = sized.filter((c) => args.force || c.bytes > CROP_CEILING.CEILING_BYTES);
  const totalOver = sized.filter((c) => c.bytes > CROP_CEILING.CEILING_BYTES);
  console.log(
    `  ${totalOver.length} over the ${fmt(CROP_CEILING.CEILING_BYTES)} B ceiling` +
      (args.force ? `, ${over.length} selected (--force)` : ''),
  );
  for (const c of [...totalOver].sort((a, b) => b.bytes - a.bytes).slice(0, 12)) {
    console.log(`    ${fmt(c.bytes).padStart(10)} B  ${c.name.padEnd(26)} ${c.slug}`);
  }

  if (args.dryRun || over.length === 0) {
    return over.map((c) => ({
      slug: c.slug,
      name: c.name,
      url: c.url,
      key: extractKeyFromUrl(c.url),
      status: 'skipped' as const,
      before: c.bytes,
    }));
  }

  return pooled(over, args.concurrency, args.sleepMs, async (c) => {
    const key = extractKeyFromUrl(c.url);
    try {
      // A quality RE-ENCODE of the stored crop, not a re-cut. The crop window,
      // its focal point and the recorded width/height stay exactly as they are,
      // so nothing in the database has to move and no geometry can drift. The
      // source is a q100 WebP — visually near-lossless — so the second pass
      // costs far less than recomputing a crop window would risk.
      const current = await fetchR2Object(bucket, key);
      const meta = await sharp(current).metadata();

      const encoded = await encodeUnderCeiling(
        (quality) => sharp(current).webp({ quality }),
        CROP_CEILING,
      );

      // Never make a file bigger. A crop that somehow encodes larger at a lower
      // quality is left exactly as it was rather than "fixed" upward.
      if (encoded.bytes >= c.bytes) {
        return {
          slug: c.slug,
          name: c.name,
          url: c.url,
          key,
          status: 'skipped' as const,
          before: c.bytes,
          after: encoded.bytes,
        };
      }

      await getR2Client().send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: encoded.buffer,
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );

      // Dimensions are asserted, not assumed: the stored JSONB records a width
      // and height that render code trusts for the intrinsic size, and a
      // re-encode that changed them would silently make that record a lie.
      if (encoded.width !== meta.width || encoded.height !== meta.height) {
        throw new Error(
          `dimensions moved ${meta.width}x${meta.height} → ${encoded.width}x${encoded.height}; ` +
            'the stored JSONB would be wrong. Object NOT trusted.',
        );
      }

      console.log(
        `  ${c.name} ${c.slug}: ${fmt(c.bytes)} → ${fmt(encoded.bytes)} B at q${encoded.quality}`,
      );

      return {
        slug: c.slug,
        name: c.name,
        url: c.url,
        key,
        status: 'rewritten' as const,
        before: c.bytes,
        after: encoded.bytes,
        quality: encoded.quality,
        overCeiling: encoded.overCeiling,
      };
    } catch (e) {
      console.warn(`  FAILED ${key}: ${(e as Error).message}`);
      return {
        slug: c.slug,
        name: c.name,
        url: c.url,
        key,
        status: 'failed' as const,
        before: c.bytes,
        error: (e as Error).message,
      };
    }
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.db) {
    console.error('Refusing to run: --db <url> is required. This script writes.');
    process.exit(2);
  }
  if (!args.undo) {
    console.error('Refusing to run: --undo <path> is required. This script writes to production.');
    process.exit(2);
  }
  if (!['all', 'variants', 'crops'].includes(args.phase)) {
    console.error(`Refusing to run: --phase ${args.phase} is not one of all|variants|crops.`);
    process.exit(2);
  }

  const bucket = getR2Bucket();
  const publicUrl = getR2PublicUrl();

  // Say out loud which database and which bucket this run is pointed at. Two
  // items in this repo have been measured against a target nobody had checked.
  const host = args.db.replace(/^postgres(ql)?:\/\//, '').replace(/^[^@]*@/, '');
  console.log(`target db     ${host}`);
  console.log(`target bucket ${bucket}  (${publicUrl})`);
  console.log(
    `mid           q${MID_PRESET.quality} @ ${MID_PRESET.maxWidth}px, ceiling ${fmt(MID_PRESET.CEILING_BYTES)} B, ladder ${MID_PRESET.QUALITY_LADDER.join('/')}`,
  );
  console.log(
    `crops         ceiling ${fmt(CROP_CEILING.CEILING_BYTES)} B, ladder ${CROP_CEILING.QUALITY_LADDER.join('/')}`,
  );
  console.log(
    `mode          ${args.dryRun ? 'DRY RUN — writes nothing' : 'WRITE'}` +
      `${args.force ? ' --force' : ''}  phase=${args.phase}  concurrency=${args.concurrency}  sleep=${args.sleepMs}ms`,
  );

  const sql = postgres(args.db, { prepare: false });

  const variants =
    args.phase === 'crops' ? [] : await backfillVariants(sql, args, bucket, publicUrl);
  const crops = args.phase === 'variants' ? [] : await backfillCrops(sql, args, bucket);

  await sql.end();

  // ── The undo file, written whether or not anything was written ────────────
  const rewritten = crops.filter((c) => c.status === 'rewritten');
  writeFileSync(
    args.undo,
    JSON.stringify(
      {
        ranAt: new Date().toISOString(),
        target: { db: host, bucket, publicUrl },
        dryRun: args.dryRun,
        phase: args.phase,
        reversal: {
          variants:
            "UPDATE media SET variants = variants - 'mid' WHERE id IN (" +
            variants
              .filter((v) => v.status === 'written')
              .map((v) => `'${v.id}'`)
              .join(', ') +
            ');',
          crops:
            'No database change to reverse. To restore the ORIGINAL bytes, re-run ' +
            'processSmartCrops for the listed slugs; it re-cuts from the original at rung 0.',
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
  console.log(`\nundo file     ${args.undo}`);

  // ── Purge, only for bytes that changed under a URL that did not ───────────
  if (!args.dryRun && rewritten.length > 0) {
    const urls = rewritten.map((c) => c.url);
    console.log(`\npurging ${urls.length} rewritten crop URL(s) from the Cloudflare edge`);
    const { purged, failed } = args.purge
      ? await purgeUrls(urls)
      : { purged: 0, failed: urls.length };
    if (!args.purge) {
      console.warn('purge  NOT requested (--purge). The edge will serve the OLD bytes for up to a');
      console.warn('       year: these objects are `immutable` and their URLs did not change.');
    } else {
      console.log(`purge  ${purged} ok, ${failed} failed`);
    }
  }

  // ── Report ────────────────────────────────────────────────────────────────
  const written = variants.filter((v) => v.status === 'written');
  const failedV = variants.filter((v) => v.status === 'failed');
  const failedC = crops.filter((c) => c.status === 'failed');
  const overV = written.filter((v) => v.overCeiling);
  const overC = rewritten.filter((c) => c.overCeiling);

  console.log('\n── RESULT ────────────────────────────────────────────────');
  console.log(`variants written   ${written.length}   failed ${failedV.length}`);
  if (written.length > 0) {
    const before = written.reduce((s, v) => s + (v.highBytes ?? 0), 0);
    const after = written.reduce((s, v) => s + (v.bytes ?? 0), 0);
    const rungs = new Map<number, number>();
    for (const v of written) rungs.set(v.quality!, (rungs.get(v.quality!) ?? 0) + 1);
    console.log(`  high total       ${fmt(before)} B`);
    console.log(
      `  mid total        ${fmt(after)} B   (${(((after - before) / before) * 100).toFixed(1)}%)`,
    );
    console.log(
      `  rungs used       ${[...rungs.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([q, n]) => `q${q}×${n}`)
        .join('  ')}`,
    );
    console.log(`  over ceiling     ${overV.length}`);
  }
  console.log(`crops rewritten    ${rewritten.length}   failed ${failedC.length}`);
  if (rewritten.length > 0) {
    const before = rewritten.reduce((s, c) => s + (c.before ?? 0), 0);
    const after = rewritten.reduce((s, c) => s + (c.after ?? 0), 0);
    const rungs = new Map<number, number>();
    for (const c of rewritten) rungs.set(c.quality!, (rungs.get(c.quality!) ?? 0) + 1);
    console.log(`  before / after   ${fmt(before)} → ${fmt(after)} B`);
    console.log(
      `  rungs used       ${[...rungs.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([q, n]) => `q${q}×${n}`)
        .join('  ')}`,
    );
    console.log(`  over ceiling     ${overC.length}`);
  }

  // A failure or a miss is a non-zero exit. The library warns and carries on so
  // an editor's upload is never blocked; a BACKFILL is where that same signal
  // has to stop the run, which is the split `image-variants.ts` describes.
  const bad = failedV.length + failedC.length + overV.length + overC.length;
  if (bad > 0) {
    console.error(`\nEXIT 1 — ${bad} item(s) failed or missed the ceiling. See the undo file.`);
    process.exit(1);
  }
  console.log('\nEXIT 0');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
