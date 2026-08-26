/**
 * Restore the 23 articles to the state `before.json` captured.
 *
 * Dry run by default; `--commit` writes, in ONE transaction, for the same
 * reason ingest does: a half-restored article is worse than a refusal.
 *
 * What it puts back:
 *  - every one of the 22 `articles` columns ingest rewrites, `published_at`
 *    and `review_status` included;
 *  - `article_categories` and `article_tags` exactly as captured;
 *  - `media_article_usage` exactly as captured — rows the ingest added are
 *    deleted, and nothing else is;
 *  - the captured `media` rows' own columns.
 *
 * What it does NOT do, deliberately: delete `media` rows the ingest created, or
 * the R2 objects behind them. An orphan media row is invisible to a reader; a
 * deleted one takes its R2 object with it and cannot be undone. Unreferencing
 * is enough, and it is the same call the 26 Aug card purge made.
 *
 *   npx tsx .tmp-cont02-undo-restore.mts --db <url> --file <before.json> [--commit]
 */
import postgres from 'postgres';
import { readFileSync } from 'node:fs';

let db = '';
let file = '';
let commit = false;
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--db') db = process.argv[++i] ?? '';
  else if (process.argv[i] === '--file') file = process.argv[++i] ?? '';
  else if (process.argv[i] === '--commit') commit = true;
}
if (!db || !file) {
  console.error('  - need --db and --file');
  process.exit(1);
}

type Row = Record<string, unknown>;
const snap = JSON.parse(readFileSync(file, 'utf8')) as {
  articles: Row[];
  articleCategories: Row[];
  articleTags: Row[];
  mediaArticleUsage: Row[];
  media: Row[];
};

const sql = postgres(db, { prepare: false, max: 2 });
const j = (v: unknown) => (v == null ? null : sql.json(v as never));

console.log(commit ? 'Mode: COMMIT' : 'Mode: DRY RUN (no writes)');
console.log(`articles ${snap.articles.length}, usage ${snap.mediaArticleUsage.length}, media ${snap.media.length}`);
if (!commit) {
  for (const a of snap.articles) console.log(`  would restore ${a.slug} published_at=${a.published_at}`);
  await sql.end();
  process.exit(0);
}

await sql.begin(async (tx) => {
  for (const a of snap.articles) {
    await tx`
      update articles set
        title = ${a.title as string},
        excerpt = ${(a.excerpt as string) ?? null},
        content = ${j(a.content)}::jsonb,
        cover_image_url = ${(a.cover_image_url as string) ?? null},
        cover_image_variants = ${j(a.cover_image_variants)}::jsonb,
        cover_image_smart_crops = ${j(a.cover_image_smart_crops)}::jsonb,
        cover_image_focal_point = ${j(a.cover_image_focal_point)}::jsonb,
        cover_image_detection_data = ${j(a.cover_image_detection_data)}::jsonb,
        meta_description = ${(a.meta_description as string) ?? null},
        status = ${a.status as string},
        author_id = ${a.author_id as string},
        primary_category_id = ${(a.primary_category_id as string) ?? null},
        published_at = ${(a.published_at as string) ?? null},
        authorship = ${a.authorship as string}::article_authorship,
        review_status = ${a.review_status as string}::article_review_status,
        reviewed_at = ${(a.reviewed_at as string) ?? null},
        reviewed_by = ${(a.reviewed_by as string) ?? null},
        is_ai_generated = ${a.is_ai_generated as boolean},
        human_reviewed_at = ${(a.human_reviewed_at as string) ?? null},
        updated_at = now()
      where id = ${a.id as string}`;
  }

  const ids = snap.articles.map((a) => a.id as string);

  await tx`delete from article_categories where article_id in ${tx(ids)}`;
  for (const c of snap.articleCategories)
    await tx`insert into article_categories (article_id, category_id)
             values (${c.article_id as string}, ${c.category_id as string})
             on conflict do nothing`;

  await tx`delete from article_tags where article_id in ${tx(ids)}`;
  for (const t of snap.articleTags)
    await tx`insert into article_tags (article_id, tag_id)
             values (${t.article_id as string}, ${t.tag_id as string})
             on conflict do nothing`;

  await tx`delete from media_article_usage where article_id in ${tx(ids)}`;
  for (const u of snap.mediaArticleUsage)
    await tx`insert into media_article_usage (media_id, article_id)
             values (${u.media_id as string}, ${u.article_id as string})
             on conflict do nothing`;

  for (const m of snap.media) {
    await tx`
      update media set
        filename = ${m.filename as string},
        url = ${m.url as string},
        alt = ${(m.alt as string) ?? null},
        caption = ${(m.caption as string) ?? null},
        credit = ${(m.credit as string) ?? null},
        credit_url = ${(m.credit_url as string) ?? null},
        license_class = ${(m.license_class as string) ?? null},
        licensor_name = ${(m.licensor_name as string) ?? null},
        width = ${(m.width as number) ?? null},
        height = ${(m.height as number) ?? null},
        file_size = ${(m.file_size as number) ?? null},
        mime_type = ${(m.mime_type as string) ?? null},
        variants = ${j(m.variants)}::jsonb,
        smart_crops = ${j(m.smart_crops)}::jsonb,
        focal_point = ${j(m.focal_point)}::jsonb,
        detection_data = ${j(m.detection_data)}::jsonb,
        updated_at = now()
      where id = ${m.id as string}`;
  }
});

console.log('restored. Re-run the revalidate + edge purge afterwards.');
await sql.end();
