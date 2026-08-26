/**
 * UNDO part 1 — remove the five articles this run published.
 *
 * Executes exactly the SQL in
 * `docs/work-done/2026-08-26-publish-staged-five-UNDO.sql`, in one transaction,
 * and prints row counts before and after. Requires `--yes-really`; without it,
 * it only reports what it would delete.
 */
import fs from 'node:fs';
import postgres from 'postgres';

const SLUGS = [
  'dulang-hantaran',
  'gubahan-hantaran',
  'sirih-junjung',
  'walimatul-urus',
  'skrip-pengacara-majlis-perkahwinan',
];
// The 11 created by this run. The four pre-existing ones — bajet-kahwin,
// adat-perkahwinan, adab-tetamu-majlis, jemputan-kahwin — are absent on purpose.
const NEW_TAGS = [
  'dulang-hantaran',
  'gubahan-hantaran',
  'hantaran',
  'persiapan-kahwin',
  'sirih-junjung',
  'walimatul-urus',
  'kenduri-kahwin',
  'protokol-majlis',
  'skrip-pengacara-majlis-perkahwinan',
  'aturcara-majlis-perkahwinan',
  'teks-pengacara-majlis',
];

const url = fs
  .readFileSync('.env', 'utf8')
  .match(/^DATABASE_URL=(.*)$/m)[1]
  .trim()
  .replace(/^["']|["']$/g, '');
const sql = postgres(url, { prepare: false, max: 1 });
const go = process.argv.includes('--yes-really');

const counts = async (label) => {
  const [a] = await sql`select count(*)::int n from articles`;
  const [m] = await sql`select count(*)::int n from media`;
  const [t] = await sql`select count(*)::int n from inspire_tags`;
  console.log(`${label}  articles=${a.n} media=${m.n} inspire_tags=${t.n}`);
};

await counts('BEFORE');
const arts = await sql`select id, slug from articles where slug = any(${SLUGS})`;
const meds =
  await sql`select count(*)::int n from media where original_article_id = any(${arts.map((a) => a.id)})`;
console.log(
  `would delete: ${arts.length} articles (${arts.map((a) => a.slug).join(', ') || 'none'}), ${meds[0].n} media rows, up to ${NEW_TAGS.length} tags`,
);

if (!go) {
  console.log('\nDRY RUN — pass --yes-really to delete.');
  await sql.end();
  process.exit(0);
}

await sql.begin(async (tx) => {
  await tx`delete from media where original_article_id in (select id from articles where slug = any(${SLUGS}))`;
  await tx`delete from articles where slug = any(${SLUGS})`;
  await tx`delete from inspire_tags where slug = any(${NEW_TAGS})`;
});
await counts('AFTER ');
console.log('\nExpected: articles=56 media=757 inspire_tags=65');
console.log('Now drop the caches — see the UNDO doc.');
await sql.end();
