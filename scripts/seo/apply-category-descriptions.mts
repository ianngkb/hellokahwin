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
 * categories exist, in either direction. It will not apply without a manifest
 * from its own dry run, and it aborts if any row has changed since that dry
 * run read it. Every write happens in ONE transaction with the backup, and the
 * postcondition — zero rows left null or short — THROWS rather than printing a
 * number, so a partial run rolls back instead of reporting a count nobody
 * reads.
 *
 * Usage:
 *   pnpm exec tsx scripts/seo/apply-category-descriptions.mts --manifest <dir> --report <file.md>
 *   pnpm exec tsx scripts/seo/apply-category-descriptions.mts --manifest <dir> --report <file.md> --apply
 */
import 'dotenv/config';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  connect,
  contentHash,
  newRunId,
  parseMode,
  requireManifest,
  snapshot,
  type Manifest,
} from './_db.mts';

const SCRIPT = 'apply-category-descriptions';

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

/** Google prints roughly this window; outside it the tag is padded or cut. */
const MIN = 120;
const MAX = 155;

const here = dirname(fileURLToPath(import.meta.url));
const copy: Record<string, string> = JSON.parse(
  readFileSync(join(here, 'category-descriptions.json'), 'utf8'),
);

const outOfRange = Object.entries(copy).filter(([, v]) => v.length < MIN || v.length > MAX);
if (outOfRange.length) {
  const named = outOfRange.map(([k, v]) => `${k} (${v.length})`).join(', ');
  throw new Error(`copy outside ${MIN}-${MAX} characters: ${named}`);
}

interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  updated_at: Date;
}

/** Both directions. A slug in one and not the other is a hard stop, not a skip. */
function assertCopyMatchesDatabase(cats: CategoryRow[]): void {
  const dbSlugs = new Set(cats.map((c) => c.slug));
  const missingCopy = cats.filter((c) => !copy[c.slug]).map((c) => c.slug);
  const orphanCopy = Object.keys(copy).filter((s) => !dbSlugs.has(s));
  if (missingCopy.length || orphanCopy.length) {
    throw new Error(
      `copy and database disagree. No description for: ${missingCopy.join(', ') || 'none'}. Description for a category that does not exist: ${orphanCopy.join(', ') || 'none'}.`,
    );
  }
}

const sql = connect();
try {
  const cats = await sql<CategoryRow[]>`
    select id, slug, name, description, updated_at from inspire_categories order by slug`;
  assertCopyMatchesDatabase(cats);
  const changes = cats.filter((c) => (c.description ?? '') !== copy[c.slug]);

  if (!apply) {
    const manifest: Manifest = {
      script: SCRIPT,
      runId: newRunId(),
      generatedAt: new Date().toISOString(),
      entries: changes.map((c) => ({
        id: c.id,
        slug: c.slug,
        updatedAt: new Date(c.updated_at).toISOString(),
        preimageHash: contentHash(c.description),
        postimageHash: contentHash(copy[c.slug]),
      })),
    };
    mkdirSync(manifestDir, { recursive: true });
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));

    const lines: string[] = [];
    lines.push('# Category descriptions — dry run', '');
    lines.push(`Run id: \`${manifest.runId}\``);
    lines.push(`Category rows: **${cats.length}**`);
    lines.push(`Rows to write: **${changes.length}**`, '');
    lines.push('| slug | before | after | chars |', '| --- | --- | --- | --- |');
    for (const c of changes) {
      const before = c.description === null ? '_(null)_' : c.description;
      lines.push(`| ${c.slug} | ${before} | ${copy[c.slug]} | ${copy[c.slug].length} |`);
    }
    writeFileSync(reportPath, lines.join('\n') + '\n');

    console.log(`${cats.length} categories, ${changes.length} to write`);
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

    const result = await sql.begin(async (tx) => {
      const locked = await tx<CategoryRow[]>`
        select id, slug, name, description, updated_at from inspire_categories
        where id = any(${manifest.entries.map((e) => e.id)}::uuid[])
        for update`;
      const byId = new Map(locked.map((r) => [r.id, r]));
      for (const entry of manifest.entries) {
        const row = byId.get(entry.id);
        if (!row)
          throw new Error(`aborting: category ${entry.slug} (${entry.id}) no longer exists.`);
        if (row.slug !== entry.slug) {
          throw new Error(
            `aborting: category ${entry.id} is now "${row.slug}", was "${entry.slug}".`,
          );
        }
        if (new Date(row.updated_at).toISOString() !== entry.updatedAt) {
          throw new Error(
            `aborting: category ${entry.slug} was edited after the dry run read it. Re-run the dry run.`,
          );
        }
        if (contentHash(row.description) !== entry.preimageHash) {
          throw new Error(
            `aborting: category ${entry.slug} no longer holds the value the dry run saw.`,
          );
        }
      }

      const backup = await snapshot(
        tx,
        'inspire_categories',
        'description',
        ['slug', 'description', 'updated_at'],
        manifest.runId,
      );

      for (const entry of manifest.entries) {
        const row = byId.get(entry.id)!;
        const res = await tx`
          update inspire_categories set description = ${copy[entry.slug]}, updated_at = now()
          where id = ${entry.id} and updated_at = ${row.updated_at}`;
        if (res.count !== 1) {
          throw new Error(`aborting: updating ${entry.slug} affected ${res.count} rows, not 1.`);
        }
      }

      // The postcondition THROWS. Printing it made a partial run look like a
      // clean one, and the transaction is still open here, so a failure rolls
      // the whole thing back.
      const [{ n }] = await tx<{ n: number }[]>`
        select count(*)::int as n from inspire_categories
        where description is null or length(btrim(description)) < ${MIN}`;
      if (n > 0) {
        throw new Error(
          `aborting: ${n} category row(s) still have a null or under-${MIN}-character description after the write.`,
        );
      }
      return { backup, written: manifest.entries.length };
    });

    console.log(`backup table ${result.backup.table} (${result.backup.rows} rows)`);
    console.log(`APPLIED — ${result.written} rows updated; 0 rows null or under ${MIN} chars`);
  }
} finally {
  await sql.end();
}
