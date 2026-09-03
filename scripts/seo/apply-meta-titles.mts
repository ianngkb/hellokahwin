#!/usr/bin/env node
/**
 * Shorten the `<title>` of the articles whose rendered title is being cut.
 *
 * Ahrefs, 28 Ogos 2026: "Title too long", 33 pages. The page title comes from
 * `meta_title` when it is set and `title` otherwise (`resolveArticleTitle`),
 * and Next then appends ` | HelloKahwin` — the 14 characters
 * `SITE_TITLE_SUFFIX_LENGTH` records. That leaves about 46 for the page's own
 * title, and these are the rows that overrun it.
 *
 * ── WHAT IS AND IS NOT TOUCHED ────────────────────────────────────────────
 * ONLY `meta_title`. `title` is the article's headline: it renders as the
 * `<h1>`, it is what the editor wrote, and it is not this run's to rewrite.
 * Setting `meta_title` changes the browser tab and the search result, and
 * nothing on the page itself.
 *
 * The set is 38 rows: the 33 Ahrefs actually flagged, read back from its own
 * API rather than re-derived from a guessed character threshold, plus 5 more
 * whose stored `meta_title` already exceeded 46 characters without being
 * flagged. The 57 further articles whose `title` sits between 47 and 56
 * characters are deliberately left alone — Ahrefs does not flag them, and
 * rewriting editorial headlines nobody complained about is a different job.
 *
 * Every replacement keeps the article's primary keyword, which is why a few
 * keep a word the copy rules would otherwise cut: "terbaik" in
 * `wedding-planner-terbaik-di-malaysia` is the search term, not decoration.
 *
 * Usage:
 *   pnpm exec tsx scripts/seo/apply-meta-titles.mts --report <file.md>
 *   pnpm exec tsx scripts/seo/apply-meta-titles.mts --report <file.md> --apply
 */
import 'dotenv/config';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SERP_TITLE_BUDGET } from '../../src/lib/seo/site-title';
import { connect, parseMode, snapshot } from './_db.mts';

const argv = process.argv.slice(2);
const { apply } = parseMode(argv);
const reportIdx = argv.indexOf('--report');
const reportPath = reportIdx === -1 ? undefined : argv[reportIdx + 1];
if (!reportPath) throw new Error('--report <file.md> is mandatory');

/** The shared threshold, so this script and the admin editor cannot disagree. */
const BUDGET = SERP_TITLE_BUDGET;

const here = dirname(fileURLToPath(import.meta.url));
const copy: Record<string, string> = JSON.parse(
  readFileSync(join(here, 'meta-titles.json'), 'utf8'),
);

const over = Object.entries(copy).filter(([, v]) => v.length > BUDGET);
if (over.length) {
  throw new Error(
    `copy over ${BUDGET} characters: ${over.map(([k, v]) => `${k} (${v.length})`).join(', ')}`,
  );
}

const sql = connect();
try {
  const arts = await sql<
    { id: string; slug: string; title: string; meta_title: string | null; status: string }[]
  >`select id, slug, title, meta_title, status from articles where status = 'published' order by slug`;

  const bySlug = new Map(arts.map((a) => [a.slug, a]));
  const orphan = Object.keys(copy).filter((s) => !bySlug.has(s));
  if (orphan.length) {
    throw new Error(`copy names articles that are not published: ${orphan.join(', ')}`);
  }

  const effective = (a: { title: string; meta_title: string | null }) =>
    a.meta_title?.trim() ? a.meta_title.trim() : a.title;

  const changes = Object.entries(copy)
    .map(([slug, next]) => ({ row: bySlug.get(slug)!, next }))
    .filter(({ row, next }) => (row.meta_title ?? '') !== next);

  const lines: string[] = [];
  lines.push('# Article meta titles — dry run', '');
  lines.push(`Published articles: **${arts.length}**`);
  lines.push(`Rows to write: **${changes.length}**`);
  lines.push(`Budget before the 14-character brand suffix: **${BUDGET}**`, '');
  lines.push(
    '| slug (row id) | rendered title now | chars | new meta_title | chars |',
    '| --- | --- | --- | --- | --- |',
  );
  for (const { row, next } of changes) {
    const now = effective(row);
    lines.push(`| ${row.slug} (${row.id}) | ${now} | ${now.length} | ${next} | ${next.length} |`);
  }
  writeFileSync(reportPath, lines.join('\n') + '\n');

  console.log(`${changes.length} of ${Object.keys(copy).length} rows need writing`);
  console.log(`report -> ${reportPath}`);

  if (!apply) {
    console.log('DRY RUN — nothing written. Re-run with --apply.');
  } else {
    const backup = await snapshot(sql, 'articles', 'meta_title', [
      'slug',
      'meta_title',
      'updated_at',
    ]);
    const how = backup.created ? 'created now' : 'already existed';
    console.log(`backup table ${backup.table} (${backup.rows} rows, ${how})`);
    for (const { row, next } of changes) {
      await sql`update articles set meta_title = ${next}, updated_at = now() where id = ${row.id}`;
    }
    const [{ n }] = await sql<
      { n: number }[]
    >`select count(*)::int as n from articles where meta_title is not null and length(btrim(meta_title)) > ${BUDGET}`;
    console.log(
      `APPLIED — ${changes.length} rows updated; ${n} meta_title values still over ${BUDGET}`,
    );
  }
} finally {
  await sql.end();
}
