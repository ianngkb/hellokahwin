import postgres from 'postgres';
import fs from 'node:fs';
const url = fs.readFileSync('.env','utf8').match(/^DATABASE_URL="?([^"\n]+)"?/m)[1];
const sql = postgres(url, { ssl: 'require', max: 1, prepare: false });
const HIASAN = 'd8b9992d-7553-45ac-be4f-a2036db37f98';
const P2 = '97473dfb-15ff-43bd-a215-4f9cd6fd6376';
const C21 = '2ca40e4d-9d39-4b3c-b39b-c47578f72181'; // hantaran-kahwin-panduan
const C22 = '2e062943-d706-45bc-b8ee-3a6854321760'; // hantaran-tunang-panduan
const KAHWIN = 'de528bb4-650a-4c19-a1fa-5770d5963d0d';
const TUNANG = 'dd3bf19c-f43d-4907-87ee-fd8c41fc6664';
const result = await sql.begin(async (tx) => {
  const u1 = await tx`update articles set primary_category_id = ${P2}, updated_at = now() where id = ${KAHWIN} and primary_category_id = ${HIASAN} and slug = 'hantaran-kahwin'`;
  const u2 = await tx`update articles set primary_category_id = ${P2}, updated_at = now() where id = ${TUNANG} and primary_category_id = ${HIASAN} and slug = 'hantaran-tunang'`;
  const d = await tx`delete from article_categories where article_id in (${KAHWIN}, ${TUNANG}) and category_id = ${HIASAN}`;
  const i = await tx`insert into article_categories (article_id, category_id) values (${KAHWIN}, ${P2}), (${KAHWIN}, ${C21}), (${TUNANG}, ${P2}), (${TUNANG}, ${C22}) on conflict do nothing`;
  const counts = { updated: u1.count + u2.count, deleted: d.count, inserted: i.count };
  if (counts.updated !== 2 || counts.deleted !== 2 || counts.inserted !== 4) {
    throw new Error('GUARD FAILED, rolling back: ' + JSON.stringify(counts));
  }
  return counts;
});
console.log('COMMITTED', JSON.stringify(result), new Date().toISOString());
const after = await sql`select a.slug, pc.slug as primary_slug, a.updated_at, string_agg(c.slug, ',' order by c.slug) as linked from articles a join inspire_categories pc on pc.id=a.primary_category_id join article_categories ac on ac.article_id=a.id join inspire_categories c on c.id=ac.category_id where a.id in (${KAHWIN}, ${TUNANG}) group by a.slug, pc.slug, a.updated_at order by a.slug`;
console.table(after);
await sql.end();
