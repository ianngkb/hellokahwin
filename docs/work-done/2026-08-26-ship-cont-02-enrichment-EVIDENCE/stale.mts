/**
 * What the re-ingest left behind.
 *
 * Every ingest stamps its uploads with a fresh `Date.now()` and inserts — never
 * updates — `media_article_usage`. So after a re-ingest each article's admin
 * library still lists the PREVIOUS generation's media rows as "used by" it,
 * even though nothing on the page points at them any more.
 *
 * READ ONLY unless `--commit`, and even then it only deletes usage rows: the
 * `media` rows and their R2 objects are left alone. An orphan media row is
 * invisible to a reader; a deleted one takes its R2 object with it and cannot
 * be undone. Same call the 26 Aug card purge made.
 *
 *   npx tsx .tmp-cont02-stale.mts --db <url> [--commit]
 */
import postgres from 'postgres';
import { readFileSync } from 'node:fs';

let db = '';
let commit = false;
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--db') db = process.argv[++i] ?? '';
  else if (process.argv[i] === '--commit') commit = true;
}
if (!db) {
  console.error('  - no --db given.');
  process.exit(1);
}

function stem(urlOrKey: string): string {
  let path = urlOrKey.replace(/\\+$/, '');
  try {
    path = new URL(path).pathname;
  } catch {
    /* bare key */
  }
  const parts = path.replace(/^\/+/, '').split('?')[0].split('/');
  const last = parts[parts.length - 1];
  if (/^(high|low|original|crop-)/.test(last)) parts.pop();
  else parts[parts.length - 1] = last.replace(/\.[a-z0-9]+$/i, '');
  return parts.join('/');
}
function collectSrcs(node: unknown, acc: string[]): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const n of node) collectSrcs(n, acc);
    return;
  }
  const n = node as { attrs?: { src?: unknown }; content?: unknown };
  if (n.attrs && typeof n.attrs.src === 'string') acc.push(n.attrs.src);
  if (n.content) collectSrcs(n.content, acc);
}

const snap = JSON.parse(
  readFileSync('docs/work-done/2026-08-26-ship-cont-02-enrichment-UNDO/before.json', 'utf8'),
) as { articles: { id: string; slug: string }[] };
const ids = snap.articles.map((a) => a.id);

const sql = postgres(db, { prepare: false, max: 2 });
const arts = await sql<
  { id: string; slug: string; cover_image_url: string | null; content: { content?: unknown[] } }[]
>`select id, slug, cover_image_url, content from articles where id in ${sql(ids)}`;
const usage = await sql<{ media_id: string; article_id: string }[]>`
  select media_id, article_id from media_article_usage where article_id in ${sql(ids)}`;
const media = await sql<{ id: string; filename: string; r2_key: string }[]>`
  select id, filename, r2_key from media where id in ${sql(usage.map((u) => u.media_id))}`;
const mediaById = new Map(media.map((m) => [m.id, m]));

const stale: { media_id: string; article_id: string; slug: string; filename: string }[] = [];
for (const a of arts) {
  const srcs: string[] = [];
  collectSrcs(a.content?.content ?? [], srcs);
  const inUse = new Set(
    [...(a.cover_image_url ? [a.cover_image_url] : []), ...srcs].map((s) => stem(s)),
  );
  for (const u of usage.filter((u) => u.article_id === a.id)) {
    const m = mediaById.get(u.media_id);
    if (!m) continue;
    if (!inUse.has(stem(m.r2_key)))
      stale.push({ media_id: u.media_id, article_id: a.id, slug: a.slug, filename: m.filename });
  }
}

console.log(`media_article_usage rows on the 23 articles: ${usage.length}`);
console.log(`  still on the page:  ${usage.length - stale.length}`);
console.log(`  superseded:         ${stale.length}`);
const byArticle = new Map<string, number>();
for (const s of stale) byArticle.set(s.slug, (byArticle.get(s.slug) ?? 0) + 1);
for (const [slug, n] of [...byArticle].sort()) console.log(`    ${slug.padEnd(38)} ${n}`);

if (!commit) {
  console.log('\nDRY RUN — nothing deleted. Re-run with --commit.');
  await sql.end();
  process.exit(0);
}
await sql.begin(async (tx) => {
  for (const s of stale)
    await tx`delete from media_article_usage
             where media_id = ${s.media_id} and article_id = ${s.article_id}`;
});
const [{ count }] = await sql<{ count: string }[]>`select count(*) from media_article_usage`;
console.log(`\ndeleted ${stale.length} superseded usage rows. media_article_usage now ${count}.`);
console.log('No media row and no R2 object was touched.');
await sql.end();
