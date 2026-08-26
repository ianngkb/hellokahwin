/**
 * UX-04 — backfill `articles.cover_image_lqip` for covers that predate it.
 *
 * Every article written before UX-04 has a cover but no blur placeholder, so
 * its cards render over a flat `bg-muted` plate until the WebP decodes. New
 * covers get a placeholder from the write paths (the admin actions and
 * `ingest-article.mts`); this is the one-off pass for everything already live.
 *
 *   pnpm backfill:lqip --db "<url>"            # write
 *   pnpm backfill:lqip --db "<url>" --dry-run  # report only, writes nothing
 *   pnpm backfill:lqip --db "<url>" --force    # re-derive even where one exists
 *
 * `--db` is REQUIRED and never defaulted. This script writes to whichever
 * database it is pointed at, and the local database is not a copy of
 * production — defaulting it would make the destructive case the easy one.
 *
 * Re-runnable. Without `--force` it only touches rows where the placeholder is
 * missing, so an interrupted run is resumed by running it again.
 */
import postgres from 'postgres';
import { generateLqip, LQIP_MAX_BYTES } from '../src/lib/storage/lqip';

type Row = {
  id: string;
  slug: string;
  cover_image_url: string | null;
  cover_image_variants: Record<string, { url: string }> | null;
  cover_image_smart_crops: Record<string, { url: string }> | null;
  cover_image_lqip: string | null;
};

function parseArgs(argv: string[]) {
  const dbIdx = argv.indexOf('--db');
  const db = dbIdx >= 0 ? argv[dbIdx + 1] : undefined;
  return {
    db,
    dryRun: argv.includes('--dry-run'),
    force: argv.includes('--force'),
    limit: argv.includes('--limit') ? Number(argv[argv.indexOf('--limit') + 1]) : undefined,
  };
}

/**
 * MUST match `cardImageUrl` in `components/inspire/article-card.tsx` and
 * `generateLqipForCover` in `lib/storage/lqip.ts`. A placeholder derived from a
 * different crop than the card renders is worse than none: it is confidently
 * the wrong colours in the wrong corners.
 */
function cardUrl(r: Row): string | null {
  return (
    r.cover_image_smart_crops?.['crop-4x3-article-card']?.url ??
    r.cover_image_variants?.low?.url ??
    r.cover_image_url
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.db) {
    console.error('Refusing to run: --db <url> is required. This script writes.');
    process.exit(1);
  }

  const sql = postgres(args.db, { prepare: false });

  const rows = await sql<Row[]>`
    select id, slug, cover_image_url, cover_image_variants,
           cover_image_smart_crops, cover_image_lqip
      from articles
     where cover_image_url is not null
       ${args.force ? sql`` : sql`and cover_image_lqip is null`}
     order by published_at desc nulls last
     ${args.limit ? sql`limit ${args.limit}` : sql``}
  `;

  console.log(
    `${rows.length} article(s) with a cover and ${args.force ? '(--force: any)' : 'no'} placeholder.`,
  );
  if (args.dryRun) console.log('--dry-run: nothing will be written.\n');

  let done = 0;
  let skipped = 0;
  let failed = 0;
  let bytesTotal = 0;
  let bytesMax = 0;

  for (const r of rows) {
    const url = cardUrl(r);
    if (!url) {
      console.warn(`  SKIP ${r.slug} — cover row has no resolvable URL`);
      skipped++;
      continue;
    }
    // `--skip-media` ingests write `local://…` covers that were never uploaded.
    // Those exist on development databases only. Skipping is the honest
    // outcome — there is no image to derive a placeholder from — and it keeps
    // the exit code meaningful for the failures that are real.
    if (!/^https?:\/\//.test(url)) {
      console.warn(`  SKIP ${r.slug} — cover is not an uploaded URL (${url.slice(0, 40)}…)`);
      skipped++;
      continue;
    }
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const lqip = await generateLqip(Buffer.from(await res.arrayBuffer()));

      bytesTotal += lqip.length;
      bytesMax = Math.max(bytesMax, lqip.length);
      // The budget is per-card and these inline into the HTML once each, so an
      // overshoot is a real regression in document size, not a style note.
      if (lqip.length > LQIP_MAX_BYTES) {
        console.warn(`  OVER BUDGET ${r.slug} — ${lqip.length}B > ${LQIP_MAX_BYTES}B`);
      }

      if (!args.dryRun) {
        await sql`update articles set cover_image_lqip = ${lqip} where id = ${r.id}`;
      }
      done++;
      console.log(`  ${args.dryRun ? 'would set' : 'set'} ${r.slug} (${lqip.length}B)`);
    } catch (err) {
      failed++;
      console.error(`  FAIL ${r.slug} — ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(
    `\n${args.dryRun ? 'would write' : 'wrote'} ${done}, skipped ${skipped}, failed ${failed}` +
      (done ? ` | avg ${Math.round(bytesTotal / done)}B, max ${bytesMax}B` : ''),
  );
  await sql.end();
  // A partial backfill is a real outcome, not a success. Say so in the exit code.
  process.exit(failed > 0 ? 1 : 0);
}

main();
