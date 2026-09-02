/**
 * Every published cover carries the numbers its box is derived from — or this
 * exits 1 and names the rows that do not.
 *
 *   node scripts/audit-cover-intrinsics.mjs --db "<url>"
 *   node scripts/audit-cover-intrinsics.mjs --db "<url>" --quiet
 *
 * READ ONLY. It never writes; `--db` is still required and never defaulted,
 * because the local database is not a copy of production and an audit pointed
 * at the wrong corpus is worse than no audit.
 *
 * ── WHY THIS EXISTS, AND WHY IT IS A SCRIPT RATHER THAN A PARAGRAPH ────────
 * CONT-15 recorded the real intrinsics of all 96 published covers by BACKFILL.
 * `generateVariants` was not changed, so ingest still writes
 * `ImageVariantMeta = { url, sizeBytes }` with no width and no height. The
 * consequence is not hypothetical and it did not take a week:
 *
 *   19:08  backfill run          96 of 96 covers recorded
 *   19:32  re-check              4 covers unrecorded — three newly published,
 *                                one (`syarat-wali-nikah`) REGENERATED in admin,
 *                                its `low.url` moved …558718… -> …708079… and
 *                                its recorded intrinsics went with the old file
 *   20:18  re-check              corpus 102, SIX covers unrecorded
 *
 * A value that only a backfill writes decays from the moment the backfill ends.
 * The retrospective lesson is not "remember to re-run the backfill" — nobody
 * remembers — it is that the decay has to be VISIBLE. This is that, as a check
 * rather than as a sentence in a document nobody re-reads.
 *
 * ── THE ASYMMETRY IT MEASURES, WHICH IS THE POINT ──────────────────────────
 * UI-16 added its `crop-4x3-article-card-md` rung to `COVER_RENDITIONS`, which
 * `generateSmartCrops` LOOPS — so ingest writes it and every new cover has one.
 * Measured 02 Sept: 102 of 102 carry the rendition, 96 of 102 carry low's
 * intrinsics. Same corpus, same evening, one number self-maintaining and one
 * not, and the difference is entirely whether ingest writes it.
 *
 * So this checks BOTH, and reports them separately. A future change that adds a
 * third thing only to the backfill shows up here as the same shape.
 *
 * ⚠️ It enumerates and prints what IS there rather than testing for what it
 * assumes is there. A count of "how many are missing" cannot distinguish a
 * healthy corpus from a query that matched nothing; the header line states the
 * corpus size, and a corpus of zero is itself an error.
 */
import postgres from 'postgres';

const argv = process.argv.slice(2);
const val = (n) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : undefined);
const quiet = argv.includes('--quiet');

const MD = 'crop-4x3-article-card-md';

/** Numeric, finite and positive — the same contract `getSmartCropRef` honours. */
const dims = (e) =>
  !!e &&
  typeof e.width === 'number' &&
  typeof e.height === 'number' &&
  Number.isFinite(e.width) &&
  Number.isFinite(e.height) &&
  e.width > 0 &&
  e.height > 0;

const db = val('--db');
if (!db) {
  console.error('Refusing to run: --db <url> is required.');
  console.log('COVER-INTRINSICS EXIT: 2');
  process.exit(2);
}

const host = db.replace(/^postgres(ql)?:\/\//, '').replace(/^[^@]*@/, '');
console.log(`target db  ${host}`);
console.log(`read at    ${new Date().toISOString()}`);

const sql = postgres(db, { prepare: false });
const rows = await sql`
  select slug, cover_image_variants, cover_image_smart_crops
    from articles
   where status = 'published'
     and cover_image_variants is not null
   order by slug`;
await sql.end();

// A corpus of zero is a broken query, not a clean site.
if (rows.length === 0) {
  console.error(
    '\nFAIL: zero published covers returned. That is a broken query, not a clean corpus.',
  );
  console.log('COVER-INTRINSICS EXIT: 2');
  process.exit(2);
}

const noLowUrl = [];
const noIntrinsics = [];
const noRendition = [];
for (const r of rows) {
  const low = r.cover_image_variants?.low;
  const md = r.cover_image_smart_crops?.[MD];
  if (typeof low?.url !== 'string') noLowUrl.push(r.slug);
  else if (!dims(low)) noIntrinsics.push(r.slug);
  if (!md?.url || !dims(md)) noRendition.push(r.slug);
}

const ok = rows.length - noLowUrl.length - noIntrinsics.length;
console.log(`\ncorpus     ${rows.length} published cover(s)`);
console.log(
  `low.width/height recorded   ${ok}/${rows.length}   (ingest does NOT write these — backfill only)`,
);
console.log(
  `${MD}   ${rows.length - noRendition.length}/${rows.length}   (ingest DOES write this)`,
);

if (!quiet) {
  for (const s of noLowUrl) console.log(`  NO low.url            ${s}`);
  for (const s of noIntrinsics) console.log(`  NO low.width/height   ${s}`);
  for (const s of noRendition) console.log(`  NO ${MD}   ${s}`);
}

const bad = noLowUrl.length + noIntrinsics.length + noRendition.length;
if (bad) {
  console.log(
    `\n${bad} row(s) incomplete. Recover the intrinsics with:\n` +
      `  pnpm backfill:cover-intrinsics --db "<url>" --undo docs/undo/<new-path>.json\n` +
      `(the undo path must not already exist; the script refuses to overwrite one)`,
  );
}
console.log(`COVER-INTRINSICS EXIT: ${bad ? 1 : 0}`);
process.exit(bad ? 1 : 0);
