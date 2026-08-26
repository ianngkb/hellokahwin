/**
 * Disarm the publish-date trap before ingesting.
 *
 * `scripts/ingest-article.mts` writes
 * `published_at = frontMatter.publishedAt ?? new Date().toISOString()` on update.
 * Most drafts carry no `publishedAt:`, so a plain `--update --publish` re-ingest
 * restamps an indexed page with today's date and takes the sitemap `lastmod` and
 * the JSON-LD `datePublished` with it. Two earlier runs hit this; the purge run
 * of 26 Aug worked around it with reconstructed files and wrote up that the trap
 * was still armed for anyone using the drafts.
 *
 * This closes it at the file: every canonical draft gets the article's real
 * `published_at`, read out of production, written into the front matter with the
 * same comment `A3-mas-kahwin-johor.md` already carries.
 *
 *   npx tsx .tmp-cont02-stamp.mts --db <url>            # report only
 *   npx tsx .tmp-cont02-stamp.mts --db <url> --write
 */
import postgres from 'postgres';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArticleFile } from './src/lib/inspire/article-file';

let db = '';
let write = false;
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--db') db = process.argv[++i] ?? '';
  else if (process.argv[i] === '--write') write = true;
}
if (!db) {
  console.error('  - no --db given.');
  process.exit(1);
}

const DRAFTS =
  'C:/Users/Ian Ng/Documents/Code/hellokahwin/hellokahwin/docs/plans/aug-23-2026-session-01/drafts';
const audit = JSON.parse(readFileSync('.tmp-cont02/audit-BEFORE.json', 'utf8')) as {
  drafts: { slug: string; path: string }[];
};

const COMMENT = `# The instant this article FIRST went live. Carried in the file so a re-ingest
# writes the same value back instead of stamping the row with the date of the
# edit — which would move the sitemap lastmod and the JSON-LD datePublished of
# a page Google has already indexed.`;

const sql = postgres(db, { prepare: false, max: 2 });
const live = await sql<{ slug: string; published_at: string | null }[]>`
  select slug, published_at from articles where status = 'published'`;
const pubBySlug = new Map(live.map((a) => [a.slug, a.published_at]));

let stamped = 0;
let already = 0;
for (const d of audit.drafts) {
  const path = `${DRAFTS}/${d.path}`;
  const raw = readFileSync(path, 'utf8');
  const parsed = parseArticleFile(raw);
  if (parsed.frontMatter.publishedAt) {
    already++;
    console.log(`  = ${d.slug.padEnd(38)} already carries ${parsed.frontMatter.publishedAt}`);
    continue;
  }
  const at = pubBySlug.get(d.slug);
  if (!at) {
    console.log(`  ! ${d.slug.padEnd(38)} no published_at in production — SKIPPED`);
    continue;
  }
  const iso = new Date(at).toISOString();

  // Insert after the `status:` line, which every one of these files has exactly
  // once at the top level of the front matter.
  //
  // Two of these files are CRLF and the rest are LF. Splitting on /\r?\n/ and
  // re-joining with '\n' would rewrite every line ending in the file, which the
  // body-unchanged guard below correctly refused — so keep the file's own EOL.
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = raw.split(/\r?\n/);
  const idx = lines.findIndex((l) => /^status:\s/.test(l));
  if (idx < 0) {
    console.log(`  ! ${d.slug.padEnd(38)} no top-level status: line — SKIPPED`);
    continue;
  }
  lines.splice(idx + 1, 0, ...COMMENT.split('\n'), `publishedAt: "${iso}"`);
  const next = lines.join(eol);

  // Round-trip through the real parser before the bytes land, so a malformed
  // insert refuses here rather than at ingest time with 22 files already done.
  const check = parseArticleFile(next);
  if (check.frontMatter.publishedAt !== iso) {
    console.log(`  ! ${d.slug.padEnd(38)} round-trip failed — SKIPPED`);
    continue;
  }
  if (check.markdown !== parsed.markdown) {
    console.log(`  ! ${d.slug.padEnd(38)} body changed — SKIPPED`);
    continue;
  }
  if (write) writeFileSync(path, next);
  stamped++;
  console.log(`  ${write ? '+' : '~'} ${d.slug.padEnd(38)} ${iso}   ${d.path}`);
}

console.log(
  `\n${write ? 'stamped' : 'would stamp'} ${stamped}; ${already} already carried one; ${audit.drafts.length} canonical drafts.`,
);
await sql.end();
