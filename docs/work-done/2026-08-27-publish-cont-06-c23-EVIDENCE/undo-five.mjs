/**
 * UNDO — remove the five C2.3 articles CONT-06 published.
 * Executes exactly the SQL in docs/work-done/2026-08-27-publish-cont-06-c23-UNDO.sql
 * in one transaction, printing counts before and after. Requires --yes-really;
 * without it, it only reports what it would delete.
 */
import fs from 'node:fs';
import postgres from 'postgres';
const SLUGS = ['gubahan-hantaran-simple','hantaran-tema-warna','hantaran-coklat','hidden-hantaran','hantaran-tempah-atau-buat-sendiri'];
// The 6 created by this run. gubahan-hantaran, dulang-hantaran,
// persiapan-kahwin and bajet-kahwin are absent on purpose: they pre-date this run.
const NEW_TAGS = ['hantaran-simple','tema-hantaran','hantaran-coklat','hantaran-makanan','hidden-hantaran','kotak-hantaran'];
const url = fs.readFileSync('.env','utf8').match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g,'');
const sql = postgres(url,{prepare:false,max:1});
const go = process.argv.includes('--yes-really');
const counts = async (label) => {
  const [a] = await sql`select count(*)::int n from articles`;
  const [m] = await sql`select count(*)::int n from media`;
  const [t] = await sql`select count(*)::int n from inspire_tags`;
  console.log(`${label}  articles=${a.n} media=${m.n} inspire_tags=${t.n}`);
};
await counts('BEFORE');
const arts = await sql`select id, slug from articles where slug = any(${SLUGS})`;
const meds = await sql`select count(*)::int n from media where original_article_id = any(${arts.map((a)=>a.id)})`;
console.log(`would delete: ${arts.length} articles (${arts.map((a)=>a.slug).join(', ')||'none'}), ${meds[0].n} media rows, up to ${NEW_TAGS.length} tags`);
if (!go) { console.log('\nDRY RUN — pass --yes-really to delete.'); await sql.end(); process.exit(0); }
await sql.begin(async (tx) => {
  const ids = arts.map((a)=>a.id);
  const m = await tx`delete from media where original_article_id = any(${ids})`;
  const a = await tx`delete from articles where slug = any(${SLUGS})`;
  const t = await tx`delete from inspire_tags where slug = any(${NEW_TAGS})`;
  console.log(`deleted media=${m.count} articles=${a.count} tags=${t.count}`);
});
await counts('AFTER');
await sql.end();
