/**
 * CONT-15 — record the REAL intrinsic pixels of every cover's `low.webp`.
 *
 *   pnpm backfill:cover-intrinsics --db "<url>" --undo <path> --dry-run
 *   pnpm backfill:cover-intrinsics --db "<url>" --undo <path>
 *   pnpm backfill:cover-intrinsics --db "<url>" --undo <path> --force
 *   pnpm backfill:cover-intrinsics --db "<url>" --undo <path> --limit 3
 *
 * `--db` and `--undo` are both REQUIRED and never defaulted, for the reason
 * `backfill-midsize-cover.mts` and `backfill-cover-lqip.mts` both state: this
 * script writes, the local database is not a copy of production, and defaulting
 * the target would make the destructive case the easy one.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * `ImageVariantMeta` is `{ url, sizeBytes }`. There is no width and no height
 * recorded for `low`, so every consumer that needed the file's shape has had to
 * assert one — which is exactly how a `1200w` descriptor came to be 17.2% wrong
 * on a live cover (UI-12 S1) and how the article cover figure came to declare
 * `width="1200" height="800"` for a 1200×1800 photograph on 14 articles.
 * CONT-15's plate derives its box from these numbers, so they have to be
 * measured rather than assumed.
 *
 * ── WHERE THE DIMENSIONS COME FROM ─────────────────────────────────────────
 * Out of each file's OWN header, via a ranged GET of the first 4 KB. Never from
 * `media.width`/`media.height`, never from a neighbouring smart-crop record.
 * `low.webp` is a RESIZE of the original with `withoutEnlargement`, so the only
 * artefact that knows its size is the artefact itself. The parser handles the
 * three container formats R2 holds for this key (WebP VP8/VP8L/VP8X, PNG,
 * JPEG); anything else is reported as UNMEASURABLE and is never guessed at.
 *
 * ── WHAT IT WRITES, AND HOW TO UNDO IT ─────────────────────────────────────
 * ADDITIVE only. No R2 write at all — not one byte of image data moves.
 *
 *   DB  UPDATE articles SET cover_image_variants =
 *         jsonb_set(cover_image_variants, '{low}', <prior low> || {width,height})
 *
 * `||` at the TOP level would replace the whole `low` object and drop its
 * `sizeBytes`; the merge is therefore done inside `low`, and every other key of
 * the JSONB (`high`, `original`, …) is left untouched and unread.
 *
 * BEFORE the first write it dumps every affected row's PRIOR
 * `cover_image_variants` to `--undo <path>`, with the exact reversal SQL and
 * every affected row id spelled out. Recovery is either:
 *
 *   1. the surgical reversal, which needs nothing but the undo file —
 *        UPDATE articles
 *           SET cover_image_variants = jsonb_set(
 *                 cover_image_variants, '{low}',
 *                 (cover_image_variants -> 'low') - 'width' - 'height')
 *         WHERE id IN (<the ids listed in the undo file>);
 *   2. or a wholesale restore of each row's dumped prior value.
 *
 * ── ORDERING IS SAFE IN BOTH DIRECTIONS ────────────────────────────────────
 * Code shipped before this backfill reads no `width`/`height`, so
 * `resolveCoverSource` returns nulls and the plate falls back to today's
 * geometry. This backfill run before the code is read by nobody. Neither order
 * can break production, which is why it is not a migration.
 *
 * Re-runnable. Without `--force` it skips any row that already carries numeric
 * `width` and `height` on `low`, so an interrupted run resumes and a second run
 * writes nothing.
 */
import { writeFileSync } from 'node:fs';
import postgres from 'postgres';

type VariantEntry = { url?: unknown; width?: unknown; height?: unknown; [k: string]: unknown };
type Variants = Record<string, VariantEntry | undefined>;
type Row = {
  id: string;
  slug: string;
  cover_image_variants: Variants | null;
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
  };
}

/**
 * Intrinsic pixels read out of the file's own header.
 *
 * Lifted from the CONT-15 corpus probe that measured the 92 covers this item is
 * specified against, so the numbers this writes are produced by the same code
 * that produced the specification's table — a rewrite here would be a second
 * implementation of the one thing that must not disagree.
 *
 * A ranged GET, not a full download: 4 KB is enough for every header below, and
 * the whole 92-cover pass therefore moves ~370 KB instead of ~4.6 MB.
 */
async function readIntrinsics(url: string): Promise<{ w: number; h: number } | { err: string }> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { range: 'bytes=0-4095' } });
  } catch (e) {
    return { err: `fetch failed: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (!res.ok && res.status !== 206) return { err: `HTTP ${res.status}` };
  const b = Buffer.from(await res.arrayBuffer());

  if (
    b.length >= 30 &&
    b.subarray(0, 4).toString('ascii') === 'RIFF' &&
    b.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    const fourcc = b.subarray(12, 16).toString('ascii');
    // VP8X carries 24-bit canvas width-1/height-1 at byte 24 and 27.
    if (fourcc === 'VP8X')
      return { w: (b.readUIntLE(24, 3) & 0xffffff) + 1, h: (b.readUIntLE(27, 3) & 0xffffff) + 1 };
    // VP8L packs 14-bit width-1 and height-1 into the 32 bits after the signature byte.
    if (fourcc === 'VP8L') {
      const bits = b.readUInt32LE(21);
      return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
    }
    // Lossy VP8: 14-bit dimensions in the keyframe header, top 2 bits are scale.
    if (fourcc === 'VP8 ')
      return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    return { err: `unknown webp chunk ${fourcc}` };
  }
  if (b.length >= 24 && b[0] === 0x89 && b.subarray(1, 4).toString('ascii') === 'PNG')
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length - 9) {
      if (b[i] !== 0xff) {
        i++;
        continue;
      }
      const m = b[i + 1];
      // Any SOFn except DHT (c4), JPG (c8) and DAC (cc).
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc)
        return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      i += 2 + b.readUInt16BE(i + 2);
    }
    return { err: 'no jpeg SOF in first 4KB' };
  }
  return { err: `unknown magic ${b.subarray(0, 4).toString('hex')}` };
}

function hasRecordedIntrinsics(entry: VariantEntry | undefined): boolean {
  return (
    !!entry &&
    typeof entry.width === 'number' &&
    typeof entry.height === 'number' &&
    Number.isFinite(entry.width) &&
    Number.isFinite(entry.height) &&
    entry.width > 0 &&
    entry.height > 0
  );
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

  // Say out loud which database this run is pointed at, BEFORE the first write.
  // Two items in this repo have been measured against a target nobody had
  // checked; an unreadable host in the log is how that happens.
  const host = args.db.replace(/^postgres(ql)?:\/\//, '').replace(/^[^@]*@/, '');
  console.log(`target db     ${host}`);
  console.log(`writes        cover_image_variants.low.width / .height (additive JSONB merge)`);
  console.log(`writes to R2  none — not one byte of image data moves`);

  const sql = postgres(args.db, { prepare: false });

  const rows = await sql<Row[]>`
    select id, slug, cover_image_variants
      from articles
     where status = 'published'
       and cover_image_variants is not null
     order by slug
     ${args.limit ? sql`limit ${args.limit}` : sql``}
  `;

  const noLow = rows.filter((r) => typeof r.cover_image_variants?.low?.url !== 'string');
  const todo = rows.filter((r) => {
    const low = r.cover_image_variants?.low;
    if (typeof low?.url !== 'string') return false;
    if (args.force) return true;
    return !hasRecordedIntrinsics(low);
  });

  console.log(
    `\n${rows.length} published article(s) with cover variants · ${todo.length} to measure · ` +
      `${rows.length - todo.length - noLow.length} already recorded · ` +
      `${noLow.length} with no low.url`,
  );
  for (const r of noLow) console.warn(`  NO LOW ${r.slug}`);

  // ── The undo dump, written BEFORE the first write ────────────────────────
  const ids = todo.map((r) => `'${r.id}'`).join(', ');
  const undo = {
    item: 'CONT-15',
    writtenAt: new Date().toISOString(),
    targetDbHost: host,
    dryRun: args.dryRun,
    addedJsonbKeys: ['cover_image_variants.low.width', 'cover_image_variants.low.height'],
    r2ObjectsAdded: [],
    reversalSql:
      `UPDATE articles SET cover_image_variants = jsonb_set(cover_image_variants, '{low}', ` +
      `(cover_image_variants -> 'low') - 'width' - 'height') WHERE id IN (${ids});`,
    priorRows: todo.map((r) => ({
      id: r.id,
      slug: r.slug,
      cover_image_variants: r.cover_image_variants,
    })),
  };
  writeFileSync(args.undo, JSON.stringify(undo, null, 2));
  console.log(`\nundo dump written: ${args.undo} (${todo.length} row(s), reversal SQL included)`);
  console.log(args.dryRun ? '--dry-run: nothing will be written.\n' : '');

  let done = 0;
  let failed = 0;
  const aspects = new Map<string, number>();

  for (const r of todo) {
    const low = r.cover_image_variants!.low!;
    const url = low.url as string;
    try {
      const d = await readIntrinsics(url);
      if ('err' in d) throw new Error(d.err);
      if (!(d.w > 0 && d.h > 0)) throw new Error(`header parsed to ${d.w}x${d.h}`);

      const a = (d.w / d.h).toFixed(3);
      aspects.set(a, (aspects.get(a) ?? 0) + 1);

      if (!args.dryRun) {
        // Merge INSIDE `low`. A top-level `||` would replace the whole object
        // and drop `sizeBytes`; every other variant key is untouched.
        await sql`
          update articles
             set cover_image_variants = jsonb_set(
                   cover_image_variants,
                   '{low}',
                   (cover_image_variants -> 'low') || ${sql.json({ width: d.w, height: d.h })}::jsonb)
           where id = ${r.id}`;
      }

      done++;
      console.log(
        `  ${args.dryRun ? 'would write' : 'wrote'} ${r.slug.padEnd(42)} ` +
          `${String(d.w).padStart(5)}x${String(d.h).padEnd(5)} aspect ${a}`,
      );
    } catch (err) {
      failed++;
      console.error(
        `  UNMEASURABLE ${r.slug} — ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  console.log(`\n${args.dryRun ? 'would write' : 'wrote'} ${done}, unmeasurable ${failed}`);
  if (aspects.size) {
    console.log('source-aspect histogram (low.webp intrinsics, this run):');
    for (const [k, v] of [...aspects].sort((x, y) => +x[0] - +y[0])) console.log(`  ${k}  ×${v}`);
  }
  await sql.end();
  // A cover whose intrinsics could not be read is not a style note: it is a
  // cover the plate will silently render at today's 3:2 geometry, which is the
  // defect this item exists to close. A partial backfill is not a success.
  process.exit(failed > 0 ? 1 : 0);
}

main();
