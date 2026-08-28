/**
 * UNDO for CONT-12 — restore the C2.1 seed `hantaran-kahwin` exactly as it was
 * before the 28 Ogos 2026 re-angle.
 *
 * COPY THIS FILE INTO THE SITE WORKTREE BEFORE RUNNING. `postgres` resolves
 * against the script's own directory, so it must sit inside a tree that has
 * node_modules. It was run from
 * C:/Users/Ian Ng/orca/workspaces/hellokahwin-site/pillars-ingest-redirects/.tmp-cont12/
 * whose .env holds the production DATABASE_URL.
 *
 *   npx tsx .tmp-cont12/undo.mts            # dry run, prints what it would restore
 *   npx tsx .tmp-cont12/undo.mts --commit   # writes
 *
 * Restores `content`, the five scalar columns and the 25 media_article_usage
 * rows. Does not touch `published_at`, the cover, R2 or any other article.
 */
import postgres from 'postgres';
import fs from 'node:fs';
import path from 'node:path';

const EVIDENCE = process.env.CONT12_EVIDENCE ?? 'C:/Users/Ian Ng/Documents/Code/hellokahwin/hellokahwin/docs/work-done/aug-28-2026-session-01/aug-28-2026-cont-12-EVIDENCE';
const SLUG = 'hantaran-kahwin';
const commit = process.argv.includes('--commit');

const env = fs.readFileSync('.env', 'utf8');
const url = env.split('\n').find((l) => l.startsWith('DATABASE_URL='))!
  .slice('DATABASE_URL='.length).replace(/^"|"$/g, '').trim();

const content = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'seed-hantaran-kahwin-content-BEFORE.json'), 'utf8'));
const fields = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'seed-hantaran-kahwin-fields-BEFORE.json'), 'utf8'));
const usage = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'seed-media-usage-BEFORE.json'), 'utf8'));

const sql = postgres(url, { ssl: 'require', prepare: false, max: 1 });
const [now]: any = await sql`select id, title, length(content::text) n from articles where slug=${SLUG}`;
console.log('current :', now.title, `(${now.n} bytes)`);
console.log('restore :', fields.title, `(${fields.content_bytes} bytes), ${content.content.length} nodes, ${usage.length} usage rows`);

if (!commit) {
  console.log('\nDRY RUN. Re-run with --commit to write.');
  await sql.end();
  process.exit(0);
}

await sql.begin(async (tx) => {
  await tx`update articles set
      content = ${tx.json(content)}::jsonb,
      title = ${fields.title},
      meta_title = ${fields.meta_title},
      meta_description = ${fields.meta_description},
      excerpt = ${fields.excerpt},
      updated_at = now()
    where slug = ${SLUG}`;
  await tx`delete from media_article_usage where article_id = ${fields.id}`;
  for (const u of usage) {
    await tx`insert into media_article_usage (media_id, article_id)
             values (${u.media_id}, ${fields.id}) on conflict do nothing`;
  }
});

const [after]: any = await sql`select title, length(content::text) n, published_at from articles where slug=${SLUG}`;
const [uc]: any = await sql`select count(*)::int n from media_article_usage where article_id=${fields.id}`;
console.log('\nrestored:', after.title, `(${after.n} bytes, expect ${fields.content_bytes})`);
console.log('usage rows:', uc.n, `(expect ${usage.length})`);
console.log('published_at:', after.published_at.toISOString(), `(expect ${fields.published_at})`);
await sql.end();
