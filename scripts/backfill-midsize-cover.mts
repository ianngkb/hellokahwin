/**
 * DES-18 — backfill `crop-4x3-article-card-sm`, the mid-size cover rendition.
 * UI-16 — the same machinery, `--rendition`-selected, for `…-md` (792x594).
 *
 *   pnpm backfill:midsize --db "<url>" --dry-run   # report only, writes nothing
 *   pnpm backfill:midsize --db "<url>"             # write
 *   pnpm backfill:midsize --db "<url>" --force     # re-encode where one exists
 *   pnpm backfill:midsize --db "<url>" --limit 3   # a small first pass
 *   pnpm backfill:midsize --db "<url>" --rendition crop-4x3-article-card-md
 *
 * `--rendition` defaults to DES-18's `…-sm`, so every command already recorded
 * in a work-done entry still means what it meant when it was written down. It
 * must name a member of `COVER_RENDITIONS`; an unknown name exits 2 rather than
 * backfilling nothing and reporting success.
 *
 * `--db` is REQUIRED and never defaulted, for the reason
 * `backfill-cover-lqip.mts` states: this script writes, the local database is
 * not a copy of production, and defaulting the target would make the
 * destructive case the easy one.
 *
 * ── WHAT IT WRITES, AND HOW TO UNDO IT ─────────────────────────────────────
 * Both writes are ADDITIVE. Nothing existing is overwritten or deleted.
 *
 *   R2   PUT  <cover-dir>/crop-4x3-article-card-sm.webp   — a NEW key. No
 *             object at that key existed before this item, so the PUT cannot
 *             clobber anything.
 *   DB   UPDATE articles SET cover_image_smart_crops =
 *             cover_image_smart_crops || '{"crop-4x3-article-card-sm": …}'
 *             — one added JSONB key. The four existing crop entries are read
 *             and rewritten unchanged.
 *
 * BEFORE the first write it dumps every row's PRIOR `cover_image_smart_crops`
 * to `--undo <path>`, together with the exact reversal SQL. Recovery is
 * therefore either:
 *
 *   1. the surgical reversal, which needs nothing but the undo file —
 *        UPDATE articles
 *           SET cover_image_smart_crops =
 *                 cover_image_smart_crops - 'crop-4x3-article-card-sm'
 *         WHERE id IN (<the ids listed in the undo file>);
 *   2. or a wholesale restore of each row's dumped prior value.
 *
 * The orphaned R2 objects after a reversal are ~1.5 MB and cost nothing; they
 * are listed in the undo file so they CAN be deleted, but leaving them is safe
 * because no code path reads a key that is absent from the JSONB.
 *
 * Re-runnable. Without `--force` it skips any row that already carries the
 * rendition at recorded dimensions, so an interrupted run resumes.
 *
 * ── ⚠ THE RUN IS NOT FINISHED WHEN THIS EXITS 0 ────────────────────────────
 * This writes to the database DIRECTLY, from outside the running app, so none
 * of the admin write paths that call `revalidateTag` fire — and the public
 * article payload is cached with `revalidate: false`, i.e. FOREVER. On
 * 02 September 2026 UI-16 merged, deployed READY, and passed the UI-06 gate on
 * production while every article still served the pre-backfill fallback crop:
 * +186,620 B on the highest-traffic template, with every check green, because
 * the cached payload predated this script.
 *
 * After a successful run, on the environment you wrote to:
 *
 *   curl -X POST "<base>/api/cron/revalidate-content" \n *        -H "Authorization: Bearer $CRON_SECRET"
 *   pnpm audit:rendition --db "<url>" --base <base>     # must print RENDITION EXIT: 0
 *
 * `scripts/audit-cover-rendition.mjs` is the check that catches this; it
 * compares the database to the RENDERED page, which is the only comparison
 * that can see a stale cache.
 */
import { writeFileSync } from 'node:fs';
import postgres from 'postgres';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client, getR2Bucket, getR2PublicUrl, extractKeyFromUrl } from '../src/lib/r2/client';
import { renderCoverRendition } from '../src/lib/storage/smart-crop';
import { COVER_RENDITIONS, MIDSIZE_COVER } from '../src/lib/storage/midsize-cover';

type CropEntry = { url: string; width: number; height: number };
type Row = {
  id: string;
  slug: string;
  cover_image_smart_crops: Record<string, CropEntry> | null;
};

function parseArgs(argv: string[]) {
  const val = (n: string) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : undefined);
  const limit = val('--limit');
  return {
    db: val('--db'),
    undo: val('--undo'),
    dryRun: argv.includes('--dry-run'),
    force: argv.includes('--force'),
    limit: limit ? Number(limit) : undefined,
    // UI-16 — which rung to backfill. Defaults to DES-18's so every command
    // already written down in a work-done entry keeps meaning what it meant.
    rendition: val('--rendition') ?? MIDSIZE_COVER.NAME,
  };
}

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

  // Say out loud which database and which bucket this run is pointed at. Two
  // items in this repo have been measured against a target nobody had checked;
  // an unreadable host in the log is how that happens.
  const spec = COVER_RENDITIONS.find((r) => r.NAME === args.rendition);
  if (!spec) {
    console.error(
      `Refusing to run: --rendition ${args.rendition} is not a declared rendition. ` +
        `Known: ${COVER_RENDITIONS.map((r) => r.NAME).join(', ')}`,
    );
    process.exit(2);
  }

  const host = args.db.replace(/^postgres(ql)?:\/\//, '').replace(/^[^@]*@/, '');
  console.log(`target db     ${host}`);
  console.log(`target bucket ${process.env.R2_BUCKET_NAME ?? '(R2_BUCKET_NAME unset)'}`);
  console.log(
    `rendition     ${spec.NAME} ${spec.WIDTH}x${spec.HEIGHT} ` +
      `ceiling ${spec.CEILING_BYTES} B, quality ladder ` +
      spec.QUALITY_LADDER.join('/'),
  );

  const sql = postgres(args.db, { prepare: false });

  const rows = await sql<Row[]>`
    select id, slug, cover_image_smart_crops
      from articles
     where status = 'published'
       and cover_image_smart_crops is not null
     order by slug
     ${args.limit ? sql`limit ${args.limit}` : sql``}
  `;

  const noSource = rows.filter((r) => !r.cover_image_smart_crops?.[spec.SOURCE_NAME]?.url);
  const todo = rows.filter((r) => {
    const src = r.cover_image_smart_crops?.[spec.SOURCE_NAME];
    if (!src?.url) return false;
    if (args.force) return true;
    const have = r.cover_image_smart_crops?.[spec.NAME];
    return !(have?.url && typeof have.width === 'number' && typeof have.height === 'number');
  });

  console.log(
    `\n${rows.length} published article(s) with smart crops · ${todo.length} to render · ` +
      `${rows.length - todo.length - noSource.length} already done · ` +
      `${noSource.length} with no ${spec.SOURCE_NAME}`,
  );
  for (const r of noSource) console.warn(`  NO SOURCE ${r.slug}`);

  // ── The undo dump, written BEFORE the first write ────────────────────────
  const ids = todo.map((r) => `'${r.id}'`).join(', ');
  const undo = {
    item: spec.NAME === MIDSIZE_COVER.NAME ? 'DES-18' : 'UI-16',
    writtenAt: new Date().toISOString(),
    targetDbHost: host,
    targetBucket: process.env.R2_BUCKET_NAME ?? null,
    dryRun: args.dryRun,
    addedJsonbKey: spec.NAME,
    reversalSql:
      `UPDATE articles SET cover_image_smart_crops = ` +
      `cover_image_smart_crops - '${spec.NAME}' WHERE id IN (${ids});`,
    r2ObjectsAdded: todo.map((r) => {
      const src = r.cover_image_smart_crops![spec.SOURCE_NAME]!;
      const dir = extractKeyFromUrl(src.url).replace(/\/[^/]*$/, '');
      return `${dir}/${spec.NAME}.webp`;
    }),
    priorRows: todo.map((r) => ({
      id: r.id,
      slug: r.slug,
      cover_image_smart_crops: r.cover_image_smart_crops,
    })),
  };
  writeFileSync(args.undo, JSON.stringify(undo, null, 2));
  console.log(`\nundo dump written: ${args.undo} (${todo.length} row(s), reversal SQL included)`);
  console.log(args.dryRun ? '--dry-run: nothing will be written.\n' : '');

  const r2 = getR2Client();
  const bucket = getR2Bucket();
  const publicUrl = getR2PublicUrl();

  let done = 0;
  let failed = 0;
  let over = 0;
  const sizes: number[] = [];

  for (const r of todo) {
    const src = r.cover_image_smart_crops![spec.SOURCE_NAME]!;
    try {
      const res = await fetch(src.url);
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching source crop`);
      const sourceBuf = Buffer.from(await res.arrayBuffer());

      const out = await renderCoverRendition(sourceBuf, spec);
      sizes.push(out.bytes);

      const srcKey = extractKeyFromUrl(src.url);
      const key = `${srcKey.replace(/\/[^/]*$/, '')}/${spec.NAME}.webp`;
      // Carry the source crop's own `?v=` token onto the rendition. It encodes
      // the focal point and the geometry version, so a re-cut that moves the
      // window changes this URL too — without it an immutable CDN would serve
      // a rendition of the OLD crop for a year.
      const qi = src.url.indexOf('?v=');
      const version = qi >= 0 ? src.url.slice(qi) : '';
      const url = `${publicUrl}/${key}${version}`;

      if (!args.dryRun) {
        await r2.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: out.buffer,
            ContentType: 'image/webp',
            CacheControl: 'public, max-age=31536000, immutable',
          }),
        );
        const entry: CropEntry = { url, width: out.width, height: out.height };
        await sql`
          update articles
             set cover_image_smart_crops =
                   coalesce(cover_image_smart_crops, '{}'::jsonb)
                   || ${sql.json({ [spec.NAME]: entry })}::jsonb
           where id = ${r.id}`;
      }

      if (out.overCeiling) over++;
      done++;
      console.log(
        `  ${args.dryRun ? 'would write' : 'wrote'} ${r.slug.padEnd(42)} ` +
          `${out.width}x${out.height} q${out.quality} ${String(out.bytes).padStart(6)} B` +
          (out.overCeiling ? '  OVER CEILING' : ''),
      );
    } catch (err) {
      failed++;
      console.error(`  FAIL ${r.slug} — ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  sizes.sort((a, b) => a - b);
  const summary = sizes.length
    ? ` | min ${sizes[0]} B  median ${sizes[Math.floor(sizes.length / 2)]} B  ` +
      `max ${sizes[sizes.length - 1]} B  total ${sizes.reduce((a, b) => a + b, 0)} B`
    : '';
  console.log(
    `\n${args.dryRun ? 'would write' : 'wrote'} ${done}, failed ${failed}, ` +
      `over ceiling ${over}${summary}`,
  );
  await sql.end();
  // A file that could not be brought under the ceiling is a budget failure, not
  // a style note: the whole point of this rendition is that its weight is
  // bounded. A partial backfill is not a success either.
  process.exit(failed > 0 || over > 0 ? 1 : 0);
}

main();
