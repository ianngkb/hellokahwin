/**
 * UNDO — remove the eight C2.5 articles CONT-08 published.
 * Executes exactly the SQL in docs/work-done/2026-08-26-publish-cont-08-c25-UNDO.sql
 * in one transaction, printing counts before and after. Requires --yes-really;
 * without it, it only reports what it would delete.
 */
import fs from 'node:fs';
import postgres from 'postgres';

const SLUGS = [
  'nisbah-hantaran',
  'hantaran-kahwin-5-balas-7',
  'hantaran-tunang-3-balas-5',
  'bilangan-dulang-hantaran-ganjil',
  'duit-hantaran-kahwin',
  'cara-tetapkan-duit-hantaran',
  'adat-hantaran-berbeza-negeri',
  'hantaran-wajib-atau-adat',
];
// The 14 created by this run. hantaran, dulang-hantaran, adat-perkahwinan and
// bertunang are absent on purpose: they pre-date this run.
const NEW_TAGS = [
  'nisbah-hantaran', 'hantaran-kahwin-5-balas-7', 'hantaran-tunang-3-balas-5',
  'hantaran-tunang', 'bilangan-dulang-hantaran', 'duit-hantaran-kahwin',
  'duit-hantaran', 'mas-kahwin', 'wang-hantaran', 'jumlah-duit-hantaran',
  'merisik', 'adat-hantaran', 'hantaran-wajib-atau-adat', 'hukum-hantaran',
];

const url = fs.readFileSync('.env', 'utf8').match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, '');
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
const meds = await sql`select count(*)::int n from media where original_article_id = any(${arts.map((a) => a.id)})`;
console.log(`would delete: ${arts.length} articles (${arts.map((a) => a.slug).join(', ') || 'none'}), ${meds[0].n} media rows, up to ${NEW_TAGS.length} tags`);

if (!go) {
  console.log('\nDRY RUN — pass --yes-really to delete.');
  await sql.end();
  process.exit(0);
}
await sql.begin(async (tx) => {
  const ids = arts.map((a) => a.id);
  const m = await tx`delete from media where original_article_id = any(${ids})`;
  const a = await tx`delete from articles where slug = any(${SLUGS})`;
  const t = await tx`delete from inspire_tags where slug = any(${NEW_TAGS})`;
  console.log(`deleted media=${m.count} articles=${a.count} tags=${t.count}`);
});
await counts('AFTER');
await sql.end();
