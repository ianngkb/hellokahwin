#!/usr/bin/env node
/**
 * Shorten the `<title>` of the articles whose rendered title is being cut.
 *
 * Ahrefs, 28 Ogos 2026: "Title too long", 33 pages. The page title comes from
 * `meta_title` when it is set and `title` otherwise (`resolveArticleTitle`),
 * and Next then appends ` | HelloKahwin` — the 14 characters
 * `SITE_TITLE_SUFFIX_LENGTH` records. That leaves `SERP_TITLE_BUDGET` for the
 * page's own title, and these are the rows that overrun it.
 *
 * ── WHAT IS AND IS NOT TOUCHED ────────────────────────────────────────────
 * ONLY `meta_title`. `title` is the article's headline: it renders as the
 * `<h1>`, it is what the editor wrote, and it is not this run's to rewrite.
 * Setting `meta_title` changes the browser tab and the search result, and
 * nothing on the page itself.
 *
 * The set is 38 rows: the 33 Ahrefs actually flagged, read back from its own
 * API rather than re-derived from a guessed character threshold, plus 5 more
 * whose stored `meta_title` already exceeded the budget without being flagged.
 * The 57 further articles whose `title` sits between 47 and 56 characters are
 * deliberately left alone — Ahrefs does not flag them, and rewriting editorial
 * headlines nobody complained about is a different job.
 *
 * Every replacement keeps the article's primary keyword, which is why a few
 * keep a word the copy rules would otherwise cut: "terbaik" in
 * `wedding-planner-terbaik-di-malaysia` is the search term, not decoration.
 *
 * ── THE GUARD RUNS IN BOTH DIRECTIONS ─────────────────────────────────────
 * It used to reject copy for an article that does not exist, but not an
 * over-budget row missing from the copy — so a row that needed shortening
 * could survive the run and be reported only as a number in a log line. Now
 * the over-budget set and the copy keys are compared both ways before writing,
 * and the postcondition THROWS inside the transaction.
 *
 * Usage:
 *   pnpm exec tsx scripts/seo/apply-meta-titles.mts --manifest <dir> --report <file.md>
 *   pnpm exec tsx scripts/seo/apply-meta-titles.mts --manifest <dir> --report <file.md> --apply
 */
import 'dotenv/config';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SERP_TITLE_BUDGET } from '../../src/lib/seo/site-title';
import {
  assertNoActiveEditLocks,
  connect,
  contentHash,
  newRunId,
  parseMode,
  requireManifest,
  snapshot,
  type Manifest,
} from './_db.mts';

const SCRIPT = 'apply-meta-titles';

const argv = process.argv.slice(2);
const { apply } = parseMode(argv);
const flag = (name: string): string | undefined => {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
};
const manifestDir = flag('--manifest');
const reportPath = flag('--report');
if (!manifestDir || !reportPath) {
  throw new Error('--manifest <dir> and --report <file.md> are mandatory');
}
const manifestPath = join(manifestDir, '_manifest.json');

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

interface ArticleTitleRow {
  id: string;
  slug: string;
  title: string;
  meta_title: string | null;
  updated_at: Date;
}

const sql = connect();
try {
  const arts = await sql<ArticleTitleRow[]>`
    select id, slug, title, meta_title, updated_at from articles
    where status = 'published' order by slug`;

  const bySlug = new Map(arts.map((a) => [a.slug, a]));
  const orphan = Object.keys(copy).filter((s) => !bySlug.has(s));
  if (orphan.length) {
    throw new Error(`copy names articles that are not published: ${orphan.join(', ')}`);
  }

  // The other direction: any row whose STORED meta_title is over budget must
  // have a replacement. (A long `title` with no `meta_title` is out of scope —
  // see the header — so it is not part of this set.)
  const overBudgetRows = arts.filter((a) => (a.meta_title?.trim().length ?? 0) > BUDGET);
  const uncovered = overBudgetRows.filter((a) => !copy[a.slug]).map((a) => a.slug);
  if (uncovered.length) {
    throw new Error(
      `these published articles store a meta_title over ${BUDGET} characters and have no replacement in meta-titles.json: ${uncovered.join(', ')}`,
    );
  }

  const changes = Object.entries(copy)
    .map(([slug, next]) => ({ row: bySlug.get(slug)!, next }))
    .filter(({ row, next }) => (row.meta_title ?? '') !== next);

  const effective = (a: ArticleTitleRow) => (a.meta_title?.trim() ? a.meta_title.trim() : a.title);

  if (!apply) {
    const manifest: Manifest = {
      script: SCRIPT,
      runId: newRunId(),
      generatedAt: new Date().toISOString(),
      entries: changes.map(({ row, next }) => ({
        id: row.id,
        slug: row.slug,
        updatedAt: new Date(row.updated_at).toISOString(),
        preimageHash: contentHash(row.meta_title),
        postimageHash: contentHash(next),
      })),
    };
    mkdirSync(manifestDir, { recursive: true });
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));

    const lines: string[] = [];
    lines.push('# Article meta titles — dry run', '');
    lines.push(`Run id: \`${manifest.runId}\``);
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
    console.log(`report   -> ${reportPath}`);
    console.log(`manifest -> ${manifestPath} (run ${manifest.runId})`);
    console.log('DRY RUN — nothing written. Re-run with --apply.');
  } else {
    let raw: string | undefined;
    try {
      raw = readFileSync(manifestPath, 'utf8');
    } catch {
      raw = undefined;
    }
    const manifest = requireManifest(raw, SCRIPT, manifestPath);
    const ids = manifest.entries.map((e) => e.id);

    const result = await sql.begin(async (tx) => {
      await assertNoActiveEditLocks(tx, ids);
      const locked = await tx<ArticleTitleRow[]>`
        select id, slug, title, meta_title, updated_at from articles
        where id = any(${ids}::uuid[])
        for update`;
      const byId = new Map(locked.map((r) => [r.id, r]));
      for (const entry of manifest.entries) {
        const row = byId.get(entry.id);
        if (!row)
          throw new Error(`aborting: article ${entry.slug} (${entry.id}) no longer exists.`);
        if (row.slug !== entry.slug) {
          throw new Error(
            `aborting: article ${entry.id} is now "${row.slug}", was "${entry.slug}".`,
          );
        }
        if (new Date(row.updated_at).toISOString() !== entry.updatedAt) {
          throw new Error(
            `aborting: article ${entry.slug} was saved after the dry run read it. Re-run the dry run.`,
          );
        }
        if (contentHash(row.meta_title) !== entry.preimageHash) {
          throw new Error(
            `aborting: article ${entry.slug} no longer holds the meta_title the dry run saw.`,
          );
        }
      }

      const backup = await snapshot(
        tx,
        'articles',
        'meta_title',
        ['slug', 'meta_title', 'updated_at'],
        manifest.runId,
      );

      for (const entry of manifest.entries) {
        const row = byId.get(entry.id)!;
        const res = await tx`
          update articles set meta_title = ${copy[entry.slug]}, updated_at = now()
          where id = ${entry.id} and updated_at = ${row.updated_at}`;
        if (res.count !== 1) {
          throw new Error(`aborting: updating ${entry.slug} affected ${res.count} rows, not 1.`);
        }
      }

      const [{ n }] = await tx<{ n: number }[]>`
        select count(*)::int as n from articles
        where status = 'published' and meta_title is not null
          and length(btrim(meta_title)) > ${BUDGET}`;
      if (n > 0) {
        throw new Error(
          `aborting: ${n} published article(s) still store a meta_title over ${BUDGET} characters after the write.`,
        );
      }
      return { backup, written: manifest.entries.length };
    });

    console.log(`backup table ${result.backup.table} (${result.backup.rows} rows)`);
    console.log(`APPLIED — ${result.written} rows updated; 0 meta_title values over ${BUDGET}`);
  }
} finally {
  await sql.end();
}
