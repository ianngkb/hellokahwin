import postgres from 'postgres';
import { readFileSync } from 'node:fs';
const sql = postgres(readFileSync('.tmp-textcard-purge/.dburl','utf8').trim(),{prepare:false,max:2});
const text = readFileSync('docs/work-done/2026-08-26-purge-text-cards-p1-p6-UNDO.sql','utf8');
const canon = v => Array.isArray(v)?v.map(canon):(v&&typeof v==='object')?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canon(v[k])])):v;
const SLUGS=['borang-nikah','rukun-nikah','syarat-sah-nikah','lafaz-taklik','harga-sewa-dewan-kahwin','checklist-kahwin','pakej-dewan-kahwin','bajet-kahwin'];
// split into per-article update blocks
const blocks = text.split(/^-- (?=[a-z0-9-]+  id=)/m).slice(1);
console.log('update blocks found:', blocks.length);
let ok = 0, fail = 0;
for (const b of blocks) {
  const slug = b.match(/^([a-z0-9-]+)  id=([0-9a-f-]+)/);
  const [live] = await sql`select * from articles where id=${slug[2]}`;
  const grab = (col) => { const m = b.match(new RegExp(`^  ${col} = '((?:[^']|'')*)'::jsonb,?$`,'m')); return m ? JSON.parse(m[1].replace(/''/g,"'")) : (new RegExp(`^  ${col} = null::jsonb,?$`,'m').test(b) ? null : undefined); };
  const grabT = (col) => { const m = b.match(new RegExp(`^  ${col} = '((?:[^']|'')*)',?$`,'m')); return m ? m[1].replace(/''/g,"'") : (new RegExp(`^  ${col} = null,?$`,'m').test(b) ? null : undefined); };
  const checks = {
    content: JSON.stringify(canon(grab('content'))) === JSON.stringify(canon(live.content)),
    cover_image_variants: JSON.stringify(canon(grab('cover_image_variants'))) === JSON.stringify(canon(live.cover_image_variants)),
    cover_image_smart_crops: JSON.stringify(canon(grab('cover_image_smart_crops'))) === JSON.stringify(canon(live.cover_image_smart_crops)),
    cover_image_focal_point: JSON.stringify(canon(grab('cover_image_focal_point'))) === JSON.stringify(canon(live.cover_image_focal_point)),
    cover_image_detection_data: JSON.stringify(canon(grab('cover_image_detection_data'))) === JSON.stringify(canon(live.cover_image_detection_data)),
    title: grabT('title') === live.title,
    cover_image_url: grabT('cover_image_url') === live.cover_image_url,
    meta_description: grabT('meta_description') === live.meta_description,
    excerpt: grabT('excerpt') === live.excerpt,
    author_id: grabT('author_id') === live.author_id,
    published_at: b.includes(`published_at = '${new Date(live.published_at).toISOString()}'::timestamptz`),
    updated_at: b.includes(`updated_at = '${new Date(live.updated_at).toISOString()}'::timestamptz`),
  };
  const bad = Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
  if (bad.length) { fail++; console.log(`FAIL ${slug[1]}: ${bad.join(', ')}`); } else { ok++; console.log(`OK   ${slug[1]}  (content ${JSON.stringify(live.content).length} bytes verified identical)`); }
}
console.log(`\nverified ${ok} ok, ${fail} fail`);
// statement sanity
console.log('update statements:', (text.match(/^update articles set$/gm)||[]).length);
console.log('insert statements:', (text.match(/^insert into /gm)||[]).length);
console.log('begin/commit:', (text.match(/^begin;$/gm)||[]).length, (text.match(/^commit;$/gm)||[]).length);
await sql.end();
