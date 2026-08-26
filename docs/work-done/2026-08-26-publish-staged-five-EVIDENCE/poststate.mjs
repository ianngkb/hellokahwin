import fs from 'node:fs';
import postgres from 'postgres';

const url = fs
  .readFileSync('.env', 'utf8')
  .match(/^DATABASE_URL=(.*)$/m)[1]
  .trim()
  .replace(/^["']|["']$/g, '');
const sql = postgres(url, { prepare: false, max: 1 });

const SLUGS = [
  'dulang-hantaran',
  'gubahan-hantaran',
  'sirih-junjung',
  'walimatul-urus',
  'skrip-pengacara-majlis-perkahwinan',
];
const out = [];
const P = (s) => {
  out.push(s);
  console.log(s);
};

P(`=== jsonb_typeof(content) census, WHOLE TABLE, ${new Date().toISOString()} ===`);
P(
  JSON.stringify(
    await sql`select jsonb_typeof(content) t, count(*)::int n from articles group by 1 order by 1`,
  ),
);

P('\n=== every jsonb column on the five new rows ===');
for (const r of await sql`
  select slug,
         jsonb_typeof(content) content,
         jsonb_typeof(cover_image_variants) variants,
         jsonb_typeof(cover_image_smart_crops) crops,
         jsonb_typeof(cover_image_focal_point) focal,
         jsonb_typeof(cover_image_detection_data) detect
    from articles where slug = any(${SLUGS}) order by slug`)
  P(JSON.stringify(r));

P('\n=== kursus-kahwin, the row that was EDITED not inserted ===');
P(
  JSON.stringify(
    (
      await sql`
  select slug, jsonb_typeof(content) content,
         jsonb_array_length(content->'content') blocks,
         length(content::text) bytes, updated_at
    from articles where slug='kursus-kahwin'`
    )[0],
  ),
);

P('\n=== media jsonb on the rows created by this run ===');
P(
  JSON.stringify(
    await sql`
  select jsonb_typeof(variants) v, jsonb_typeof(smart_crops) s, count(*)::int n
    from media where original_article_id in (select id from articles where slug = any(${SLUGS}))
   group by 1,2`,
  ),
);

P('\n=== totals ===');
const [a] = await sql`select count(*)::int n from articles`;
const [ap] = await sql`select count(*)::int n from articles where status='published'`;
const [m] = await sql`select count(*)::int n from media`;
const [t] = await sql`select count(*)::int n from inspire_tags`;
P(`articles ${a.n} (published ${ap.n})  ·  media ${m.n}  ·  inspire_tags ${t.n}`);

P('\n=== published per top-level category ===');
for (const r of await sql`
  select c.slug, count(a.id)::int n from inspire_categories c
    left join articles a on a.primary_category_id=c.id and a.status='published'
   where c.parent_id is null group by c.slug order by c.slug`)
  P(`  ${r.slug.padEnd(26)} ${String(r.n).padStart(3)}`);

P('\n=== the five rows as published ===');
for (const r of await sql`
  select a.slug, a.status, a.authorship, a.review_status, c.slug cat,
         a.published_at, length(a.meta_description) meta_len
    from articles a join inspire_categories c on c.id=a.primary_category_id
   where a.slug = any(${SLUGS}) order by a.published_at`)
  P(
    `  ${r.slug.padEnd(36)} ${r.status} ${r.authorship} ${r.review_status} /${r.cat} meta=${r.meta_len}ch ${r.published_at.toISOString()}`,
  );

fs.writeFileSync('.tmp-ops/pub5/poststate.txt', out.join('\n') + '\n');
await sql.end();
