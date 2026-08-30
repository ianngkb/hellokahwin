/**
 * Capture the exact pre-write state of every article this run will touch.
 * READ ONLY. Run before the first ingest.
 *
 * Ingest's upsert rewrites 18 columns on `articles`, reconciles
 * `article_categories` and `article_tags`, upserts `media` by `r2_key` and
 * inserts `media_article_usage`. All of that is captured here, plus the ids
 * that already exist so the restore can tell an added row from an original one.
 *
 *   npx tsx .tmp-cont02-undo-capture.mts --db <url> --out <dir>
 */
import postgres from 'postgres';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

let db = '';
let outDir = '';
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--db') db = process.argv[++i] ?? '';
  else if (process.argv[i] === '--out') outDir = process.argv[++i] ?? '';
}
if (!db || !outDir) {
  console.error('  - need --db and --out');
  process.exit(1);
}

const audit = JSON.parse(readFileSync('.tmp-cont02/audit-BEFORE.json', 'utf8')) as {
  rows: { slug: string; draftFile: string | null; missingLive: string[] }[];
};
const slugs = audit.rows.filter((r) => r.draftFile && r.missingLive.length > 0).map((r) => r.slug);

const sql = postgres(db, { prepare: false, max: 2 });

const articles = await sql`
  select id, title, slug, excerpt, content, cover_image_url, cover_image_variants,
         cover_image_smart_crops, cover_image_focal_point, cover_image_detection_data,
         meta_description, status, author_id, primary_category_id, published_at,
         authorship, review_status, reviewed_at, reviewed_by, is_ai_generated,
         human_reviewed_at, updated_at
  from articles where slug in ${sql(slugs)}`;
const ids = articles.map((a) => a.id as string);

const categories = await sql`
  select article_id, category_id from article_categories where article_id in ${sql(ids)}`;
const tags = await sql`
  select article_id, tag_id from article_tags where article_id in ${sql(ids)}`;
const usage = await sql`
  select media_id, article_id from media_article_usage where article_id in ${sql(ids)}`;
const media = await sql`
  select id, filename, r2_key, url, alt, caption, credit, credit_url, license_class,
         licensor_name, width, height, file_size, mime_type, variants, smart_crops,
         focal_point, detection_data, original_article_id, updated_at
  from media
  where id in ${sql(usage.map((u) => u.media_id as string))}
     or original_article_id in ${sql(ids)}`;

mkdirSync(outDir, { recursive: true });
const payload = {
  capturedAt: new Date().toISOString(),
  note: 'Pre-write state for the CONT-02 image ingest. Restore with .tmp-cont02-undo-restore.mts.',
  slugs,
  articles,
  articleCategories: categories,
  articleTags: tags,
  mediaArticleUsage: usage,
  media,
};
writeFileSync(`${outDir}/before.json`, JSON.stringify(payload, null, 1));

console.log(`articles          ${articles.length}`);
console.log(`article_categories ${categories.length}`);
console.log(`article_tags       ${tags.length}`);
console.log(`media_article_usage ${usage.length}`);
console.log(`media rows          ${media.length}`);
console.log(`wrote ${outDir}/before.json`);
await sql.end();
