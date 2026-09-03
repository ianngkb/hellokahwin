#!/usr/bin/env node
/**
 * Write the authored `description` on every category row.
 *
 * Ahrefs, 28 Ogos 2026: "Meta description too short", 43 warnings plus 323
 * notices, every one of them a category hub or a tag page. The hub route
 * already prefers `cat.description` and only falls back to
 * `Artikel ${cat.name} di HelloKahwin.` when it is null, so this is a data
 * fix and there is no code half.
 *
 * Every one of the 57 rows was null on 4 September 2026, not the ~17 the
 * finding estimated: the finding counted the hubs Ahrefs happened to crawl,
 * and the rest are empty pillars and child hubs that will be crawled the
 * moment they carry an article. The copy is in
 * `scripts/seo/category-descriptions.json`, keyed by slug, and every string
 * has been through the humanizer.
 *
 * ── WHAT THIS REFUSES TO DO ───────────────────────────────────────────────
 * It will not run if the JSON and the database disagree about which
 * categories exist, in either direction. A description written for a slug
 * that no longer exists is dead copy, and a category with no entry would be
 * silently skipped and then show up in the next audit. Both are a hard stop,
 * not a warning.
 *
 * Usage:
 *   pnpm exec tsx scripts/seo/apply-category-descriptions.mts --report <file.md>
 *   pnpm exec tsx scripts/seo/apply-category-descriptions.mts --report <file.md> --apply
 */
import 'dotenv/config';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { connect, parseMode, snapshot } from './_db.mts';

const argv = process.argv.slice(2);
const { apply } = parseMode(argv);
const reportIdx = argv.indexOf('--report');
const reportPath = reportIdx === -1 ? undefined : argv[reportIdx + 1];
if (!reportPath) throw new Error('--report <file.md> is mandatory');

/** Google prints roughly this window; outside it the tag is padded or cut. */
const MIN = 120;
const MAX = 155;

const here = dirname(fileURLToPath(import.meta.url));
const copy: Record<string, string> = JSON.parse(
  readFileSync(join(here, 'category-descriptions.json'), 'utf8'),
);

const tooShort = Object.entries(copy).filter(([, v]) => v.length < MIN);
const tooLong = Object.entries(copy).filter(([, v]) => v.length > MAX);
if (tooShort.length || tooLong.length) {
  const named = [...tooShort, ...tooLong].map(([k, v]) => `${k} (${v.length})`).join(', ');
  throw new Error(`copy outside ${MIN}-${MAX} characters: ${named}`);
}

const sql = connect();
try {
  const cats = await sql<
    { id: string; slug: string; name: string; description: string | null }[]
  >`select id, slug, name, description from inspire_categories order by slug`;

  const dbSlugs = new Set(cats.map((c) => c.slug));
  const missingCopy = cats.filter((c) => !copy[c.slug]).map((c) => c.slug);
  const orphanCopy = Object.keys(copy).filter((s) => !dbSlugs.has(s));
  if (missingCopy.length || orphanCopy.length) {
    throw new Error(
      `copy and database disagree. No description for: ${missingCopy.join(', ') || 'none'}. Description for a category that does not exist: ${orphanCopy.join(', ') || 'none'}.`,
    );
  }

  const changes = cats.filter((c) => (c.description ?? '') !== copy[c.slug]);

  const lines: string[] = [];
  lines.push('# Category descriptions — dry run', '');
  lines.push(`Category rows: **${cats.length}**`);
  lines.push(`Rows to write: **${changes.length}**`, '');
  lines.push('| slug | before | after | chars |', '| --- | --- | --- | --- |');
  for (const c of changes) {
    const before = c.description === null ? '_(null)_' : c.description;
    lines.push(`| ${c.slug} | ${before} | ${copy[c.slug]} | ${copy[c.slug].length} |`);
  }
  writeFileSync(reportPath, lines.join('\n') + '\n');

  console.log(`${cats.length} categories, ${changes.length} to write`);
  console.log(`report -> ${reportPath}`);

  if (!apply) {
    console.log('DRY RUN — nothing written. Re-run with --apply.');
  } else {
    const backup = await snapshot(sql, 'inspire_categories', 'description', [
      'slug',
      'description',
      'updated_at',
    ]);
    const how = backup.created ? 'created now' : 'already existed';
    console.log(`backup table ${backup.table} (${backup.rows} rows, ${how})`);
    for (const c of changes) {
      await sql`update inspire_categories set description = ${copy[c.slug]}, updated_at = now() where id = ${c.id}`;
    }
    const [{ n }] = await sql<
      { n: number }[]
    >`select count(*)::int as n from inspire_categories where description is null or length(description) < ${MIN}`;
    console.log(
      `APPLIED — ${changes.length} rows updated; ${n} rows still null or under ${MIN} chars`,
    );
  }
} finally {
  await sql.end();
}
