/**
 * CONT-08 post-write proof. Reads production (never writes), then takes the
 * proof requests ONE AT A TIME, a few seconds apart, recording status,
 * x-vercel-cache, age, body bytes, robots meta, credit line presence, and
 * keeping every body on disk (a cold render happens once, ever).
 */
import fs from 'node:fs';
import postgres from 'postgres';

const SLUGS = [
  'nisbah-hantaran', 'hantaran-kahwin-5-balas-7', 'hantaran-tunang-3-balas-5',
  'bilangan-dulang-hantaran-ganjil', 'duit-hantaran-kahwin', 'cara-tetapkan-duit-hantaran',
  'adat-hantaran-berbeza-negeri', 'hantaran-wajib-atau-adat',
];
const LINKED = ['apa-itu-mas-kahwin', 'cincin-tunang', 'dulang-hantaran', 'gubahan-hantaran',
  'hantaran-kahwin', 'hantaran-tunang', 'mas-kahwin-ikut-negeri', 'sirih-junjung'];
const url = fs.readFileSync('.env', 'utf8').match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, '');
const sql = postgres(url, { prepare: false, max: 1 });
const OUT = '.tmp-ops/cont08/proof';
fs.mkdirSync(OUT, { recursive: true });
const lines = [];
const P = (s) => { lines.push(s); console.log(s); };
const at = new Date().toISOString();
P(`=== POST-WRITE STATE, production, ${at} ===`);
const [a] = await sql`select count(*)::int n from articles`;
const [ap] = await sql`select count(*)::int n from articles where status='published'`;
const [m] = await sql`select count(*)::int n from media`;
const [t] = await sql`select count(*)::int n from inspire_tags`;
const census = await sql`select jsonb_typeof(content) t, count(*)::int n from articles group by 1 order by 1`;
P(`articles total ${a.n} | published ${ap.n} | media ${m.n} | inspire_tags ${t.n} | jsonb_typeof(content) ${JSON.stringify(census)}`);
const rows = await sql`
  select a.slug, a.status, a.published_at, c.slug as cat, m.filename as cover_file, m.credit as cover_credit,
         (select count(*)::int from media_article_usage u where u.article_id = a.id) as usage_n
    from articles a
    join inspire_categories c on c.id = a.primary_category_id
    left join media m on m.url = a.cover_image_url
   where a.slug = any(${SLUGS}) order by a.published_at`;
P('the eight rows (cover credit joins on media.url = articles.cover_image_url exactly):');
for (const r of rows) P(`  ${r.slug.padEnd(32)} ${r.status} ${r.published_at.toISOString()} cat=${r.cat} cover=${r.cover_file} credit="${r.cover_credit}" usage=${r.usage_n}`);
const missing = SLUGS.filter((s) => !rows.find((r) => r.slug === s));
P(`missing rows: ${missing.length ? missing.join(', ') : 'none'}`);
const cluster = await sql`select count(*)::int n from article_categories ac join inspire_categories c on c.id=ac.category_id join articles a on a.id=ac.article_id where c.pillar_code='C2.5' and a.status='published'`;
P(`articles in cluster C2.5 (article_categories): ${cluster[0].n}`);
const p2 = await sql`select count(*)::int n from articles a join inspire_categories c on c.id=a.primary_category_id where c.slug='hantaran-mas-kahwin' and a.status='published'`;
P(`P2 published: ${p2[0].n}`);
const linked = await sql`select slug, published_at from articles where slug = any(${LINKED}) order by slug`;
P('published_at of linked live articles AFTER (compare with prestate): ' + linked.map((r) => `${r.slug}=${r.published_at.toISOString()}`).join(' '));
const tc = await sql`select count(*)::int n from media mm join articles a on a.id = mm.original_article_id where a.slug = any(${SLUGS}) and (mm.filename ilike '%kad-tajuk%' or mm.filename ilike 'cover-%.png')`;
P(`text-card style media on the eight: ${tc[0].n}`);
await sql.end();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function probe(path, name) {
  const res = await fetch('https://hellokahwin.com' + path, { redirect: 'manual' });
  const body = await res.text();
  fs.writeFileSync(`${OUT}/${name}.html`, body);
  const robots = (body.match(/<meta name="robots" content="([^"]*)"/) || [])[1] || '-';
  const kredit = (body.match(/Kredit: /g) || []).length;
  const links8 = SLUGS.filter((s) => body.includes(`/artikel/hantaran-mas-kahwin/${s}"`)).length;
  P(`  ${res.status} cache=${res.headers.get('x-vercel-cache')} age=${res.headers.get('age')} bytes=${body.length} robots=${robots} kredit=${kredit} links-to-eight=${links8}  ${path}`);
}
P('\n=== PROOF REQUESTS, sequential, 4s apart (sweep shape: serial) ===');
for (const s of SLUGS) { await probe(`/artikel/hantaran-mas-kahwin/${s}`, s); await sleep(4000); }
await probe('/artikel/hantaran-mas-kahwin', 'pillar-p2'); await sleep(4000);
const sm = await fetch('https://hellokahwin.com/sitemap.xml'); const smb = await sm.text();
fs.writeFileSync(`${OUT}/sitemap-after.xml`, smb);
P(`  sitemap ${sm.status} cache=${sm.headers.get('x-vercel-cache')} age=${sm.headers.get('age')} loc=${(smb.match(/<loc>/g) || []).length} eight-present=${SLUGS.filter((s) => smb.includes(`/hantaran-mas-kahwin/${s}<`)).length}`);
fs.writeFileSync(`${OUT}/proof.txt`, lines.join('\n') + '\n');
