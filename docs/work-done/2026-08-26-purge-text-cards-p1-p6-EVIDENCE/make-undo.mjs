import postgres from 'postgres';
import { readFileSync, writeFileSync } from 'node:fs';
const sql = postgres(readFileSync('.tmp-textcard-purge/.dburl','utf8').trim(),{prepare:false,max:2});
const SLUGS = ['borang-nikah','rukun-nikah','syarat-sah-nikah','lafaz-taklik','harga-sewa-dewan-kahwin','checklist-kahwin','pakej-dewan-kahwin','bajet-kahwin'];
const capturedAt = new Date().toISOString();

const q = (v) => v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`;
const j = (v) => v === null || v === undefined ? 'null::jsonb' : `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
const ts = (v) => v === null || v === undefined ? 'null' : `'${new Date(v).toISOString()}'::timestamptz`;

const rows = await sql`select * from articles where slug = any(${SLUGS}) order by slug`;
const usage = await sql`
  select mau.media_id, mau.article_id, a.slug, m.filename, m.r2_key, m.url
  from media_article_usage mau
  join articles a on a.id = mau.article_id
  join media m on m.id = mau.media_id
  where a.slug = any(${SLUGS}) order by a.slug, m.filename`;
const cats = await sql`select ac.article_id, ac.category_id, a.slug, c.slug as cat_slug from article_categories ac join articles a on a.id=ac.article_id join inspire_categories c on c.id=ac.category_id where a.slug = any(${SLUGS}) order by a.slug, c.slug`;
const tags = await sql`select at.article_id, at.tag_id, a.slug, t.slug as tag_slug from article_tags at join articles a on a.id=at.article_id join inspire_tags t on t.id=at.tag_id where a.slug = any(${SLUGS}) order by a.slug, t.slug`;
const census = (await sql`select (select count(*) from articles) articles, (select count(*) from articles where status='published') published, (select count(*) from media) media, (select count(*) from media_article_usage) usage, (select count(*) from article_categories) article_categories, (select count(*) from article_tags) article_tags, (select count(*) from inspire_tags) inspire_tags`)[0];
const typecensus = await sql`select jsonb_typeof(content) t, count(*) c from articles group by 1`;

writeFileSync('.tmp-textcard-purge/pre-write-rows.json', JSON.stringify({ capturedAt, census, typecensus, rows, usage, cats, tags }, null, 1));

const L = [];
L.push('-- RESTORE the eight live P1/P6 articles to their pre-text-card-purge state.');
L.push(`-- Captured ${capturedAt} from the production pooler aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres.`);
L.push('-- Every value below is the LITERAL pre-write value read from the live row, not a description of one.');
L.push('-- Restores: content (the figureBlock this run removes), the cover fields, and every column');
L.push("-- the ingest script's ON CONFLICT clause overwrites.");
L.push('-- Does NOT delete the R2 objects or media rows a re-ingest creates; those become orphans, not breakage.');
L.push('-- Address rows by id. NEVER run this wholesale against a table you have not checked.');
L.push('begin;');
for (const r of rows) {
  L.push(`-- ${r.slug}  id=${r.id}  updated_at was ${new Date(r.updated_at).toISOString()}`);
  L.push('update articles set');
  L.push(`  title = ${q(r.title)},`);
  L.push(`  excerpt = ${q(r.excerpt)},`);
  L.push(`  content = ${j(r.content)},`);
  L.push(`  cover_image_url = ${q(r.cover_image_url)},`);
  L.push(`  cover_image_variants = ${j(r.cover_image_variants)},`);
  L.push(`  cover_image_smart_crops = ${j(r.cover_image_smart_crops)},`);
  L.push(`  cover_image_focal_point = ${j(r.cover_image_focal_point)},`);
  L.push(`  cover_image_focal_point_override = ${j(r.cover_image_focal_point_override)},`);
  L.push(`  cover_image_detection_data = ${j(r.cover_image_detection_data)},`);
  L.push(`  cover_image_quality = ${q(r.cover_image_quality)},`);
  L.push(`  meta_title = ${q(r.meta_title)},`);
  L.push(`  meta_description = ${q(r.meta_description)},`);
  L.push(`  status = ${q(r.status)}::article_status,`);
  L.push(`  author_id = ${q(r.author_id)},`);
  L.push(`  primary_category_id = ${q(r.primary_category_id)}::uuid,`);
  L.push(`  published_at = ${ts(r.published_at)},`);
  L.push(`  authorship = ${q(r.authorship)}::article_authorship,`);
  L.push(`  review_status = ${q(r.review_status)}::article_review_status,`);
  L.push(`  reviewed_at = ${ts(r.reviewed_at)},`);
  L.push(`  reviewed_by = ${q(r.reviewed_by)},`);
  L.push(`  is_ai_generated = ${r.is_ai_generated === null ? 'null' : r.is_ai_generated},`);
  L.push(`  human_reviewed_at = ${ts(r.human_reviewed_at)},`);
  L.push(`  updated_at = ${ts(r.updated_at)}`);
  L.push(`where id = '${r.id}';`);
  L.push('');
}
L.push('-- media_article_usage rows that existed before this run, restored idempotently.');
L.push('-- (This run unreferences the text cards by deleting their usage rows; these inserts put them back.)');
for (const u of usage) L.push(`insert into media_article_usage (media_id, article_id) values ('${u.media_id}','${u.article_id}') on conflict do nothing;  -- ${u.slug} <- ${u.filename}`);
L.push('');
L.push('-- article_categories and article_tags as they were (the ingest reconciles these; restore is idempotent).');
for (const c of cats) L.push(`insert into article_categories (article_id, category_id) values ('${c.article_id}','${c.category_id}') on conflict do nothing;  -- ${c.slug} <- ${c.cat_slug}`);
for (const t of tags) L.push(`insert into article_tags (article_id, tag_id) values ('${t.article_id}','${t.tag_id}') on conflict do nothing;  -- ${t.slug} <- ${t.tag_slug}`);
L.push('');
L.push('commit;');
L.push('-- After restoring, drop the site caches or the pages keep serving the purged version:');
L.push("--   curl -X POST -H \"authorization: Bearer $CRON_SECRET\" https://hellokahwin.com/api/cron/revalidate-content");
writeFileSync('docs/work-done/2026-08-26-purge-text-cards-p1-p6-UNDO.sql', L.join('\n') + '\n');
console.log('rows captured:', rows.length, '| usage rows:', usage.length, '| cats:', cats.length, '| tags:', tags.length);
console.log('census:', JSON.stringify(census));
console.log('jsonb_typeof(content):', JSON.stringify(typecensus));
console.log('capturedAt', capturedAt);
await sql.end();
