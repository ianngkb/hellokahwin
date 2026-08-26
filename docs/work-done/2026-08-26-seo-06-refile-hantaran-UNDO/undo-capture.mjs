// Capture the before-state of the two articles and generate a restore SQL from LIVE values.
import postgres from 'postgres';
import fs from 'node:fs';
const url = fs.readFileSync('.env','utf8').match(/^DATABASE_URL="?([^"\n]+)"?/m)[1];
const sql = postgres(url, { ssl: 'require', max: 1, prepare: false });
const IDS = ['de528bb4-650a-4c19-a1fa-5770d5963d0d','dd3bf19c-f43d-4907-87ee-fd8c41fc6664'];
const arts = await sql`select id, slug, primary_category_id, updated_at, status from articles where id in ${sql(IDS)} order by slug`;
const links = await sql`select ac.id, ac.article_id, ac.category_id, c.slug as category_slug from article_categories ac join inspire_categories c on c.id=ac.category_id where ac.article_id in ${sql(IDS)} order by ac.article_id, c.slug`;
const census = await sql`select (select count(*)::int from articles) as articles, (select count(*)::int from article_categories) as article_categories, (select count(*)::int from redirects) as redirects, (select count(*)::int from article_category_redirects) as article_category_redirects`;
const before = { capturedAt: new Date().toISOString(), articles: arts, article_categories: links, census: census[0] };
fs.writeFileSync(process.argv[2] + '/before.json', JSON.stringify(before, null, 2));
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const NEW = ['97473dfb-15ff-43bd-a215-4f9cd6fd6376','2ca40e4d-9d39-4b3c-b39b-c47578f72181','2e062943-d706-45bc-b8ee-3a6854321760'];
let out = `-- UNDO for SEO-06 re-file, generated ${before.capturedAt} from LIVE rows. Addresses rows by id only.\nbegin;\n`;
for (const a of arts) out += `update articles set primary_category_id = ${q(a.primary_category_id)}, updated_at = ${q(a.updated_at.toISOString())} where id = ${q(a.id)};\n`;
out += `delete from article_categories where article_id in (${IDS.map(q).join(', ')}) and category_id in (${NEW.map(q).join(', ')});\n`;
for (const l of links) out += `insert into article_categories (id, article_id, category_id) values (${q(l.id)}, ${q(l.article_id)}, ${q(l.category_id)}) on conflict do nothing; -- ${l.category_slug}\n`;
out += `commit;\n`;
fs.writeFileSync(process.argv[2] + '/undo.sql', out);
// Verify: parse the literals back out of the SQL and compare to live.
const s = fs.readFileSync(process.argv[2] + '/undo.sql','utf8');
let ok = 0, bad = 0;
for (const a of arts) { const re = new RegExp(`primary_category_id = '${a.primary_category_id}', updated_at = '${a.updated_at.toISOString()}' where id = '${a.id}'`); re.test(s) ? ok++ : bad++; }
for (const l of links) { s.includes(`('${l.id}', '${l.article_id}', '${l.category_id}')`) ? ok++ : bad++; }
console.log(JSON.stringify({ capturedAt: before.capturedAt, census: before.census, articles: arts.map(a=>({slug:a.slug, primary:a.primary_category_id, updated_at:a.updated_at})), links: links.map(l=>l.category_slug), verify: { ok, bad } }, null, 1));
await sql.end();
