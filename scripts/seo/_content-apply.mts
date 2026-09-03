/**
 * The apply half of a `articles.content` migration, shared by the two scripts
 * that perform one.
 *
 * It is here rather than in each script because the two need identical
 * guarantees and the failure mode of a near-copy is that one of them quietly
 * lacks a check. See `_db.mts` for why each guarantee exists; this file is the
 * order they have to happen in:
 *
 *   1. ONE transaction around everything below.
 *   2. Nobody has the article open (`article_edit_locks`).
 *   3. `select ... for update` on exactly the rows the dry run named, so no
 *      save can interleave with the rest of this list.
 *   4. Every row still matches the dry run's manifest — same slug, same
 *      `updated_at`, same content hash — or the WHOLE apply aborts. A
 *      partly-applied migration against a diff nobody read is worse than no
 *      migration.
 *   5. The undo file on disk is parsed and checked against the same row, so a
 *      directory left over from the other migration cannot stand in for it.
 *   6. The backup table is created, under this run's own id.
 *   7. The transform is re-run on the LOCKED row — not replayed from the dry
 *      run's memory — and its result must hash to what the dry run promised.
 *   8. The write is conditional on `updated_at` and asserts one affected row.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  assertNoActiveEditLocks,
  assertUnchanged,
  contentHash,
  snapshot,
  type Manifest,
  type Sql,
} from './_db.mts';

export interface ArticleRow {
  id: string;
  slug: string;
  title: string;
  content: unknown;
  /** `updated_at::text` — exact. A JS `Date` loses the microseconds. */
  updated_at_raw: string;
}

export async function applyContentMigration(opts: {
  sql: Sql;
  manifest: Manifest;
  undoDir: string;
  /** Suffix for the backup table, e.g. `hrefs` or `alt`. */
  backupSlug: string;
  /** Re-run of the dry run's transform, against the freshly locked row. */
  transform: (row: ArticleRow) => unknown;
}): Promise<{ backupTable: string; backupRows: number; written: number }> {
  const { sql, manifest, undoDir, backupSlug, transform } = opts;
  const ids = manifest.entries.map((e) => e.id);

  return sql.begin(async (tx) => {
    await assertNoActiveEditLocks(tx, ids);

    const rows = await tx<ArticleRow[]>`
      select id, slug, title, content, updated_at::text as updated_at_raw from articles
      where id = any(${ids}::uuid[])
      for update`;
    const byId = new Map(rows.map((r) => [r.id, r]));

    for (const entry of manifest.entries) {
      const row = byId.get(entry.id);
      if (!row) {
        throw new Error(
          `aborting: article ${entry.slug} (${entry.id}) named by the manifest no longer exists.`,
        );
      }
      assertUnchanged(entry, { ...row, preimage: row.content });

      // The undo file has to be the one written for THIS row by THIS dry run.
      // Existence alone used to be the whole check, which the other
      // migration's directory would also have satisfied.
      const undoPath = join(undoDir, `${entry.slug}.json`);
      let undo: { id?: string; slug?: string; content?: unknown };
      try {
        undo = JSON.parse(readFileSync(undoPath, 'utf8'));
      } catch (err) {
        throw new Error(
          `aborting: undo file ${undoPath} is missing or unreadable (${String(err)})`,
        );
      }
      if (undo.id !== entry.id || undo.slug !== entry.slug) {
        throw new Error(
          `aborting: undo file ${undoPath} describes ${undo.slug} (${undo.id}), not ${entry.slug} (${entry.id}).`,
        );
      }
      if (contentHash(undo.content) !== entry.preimageHash) {
        throw new Error(
          `aborting: undo file ${undoPath} does not hold the document this apply is about to replace.`,
        );
      }
    }

    const backup = await snapshot(
      tx,
      'articles',
      backupSlug,
      ['content', 'updated_at'],
      manifest.runId,
    );

    let written = 0;
    for (const entry of manifest.entries) {
      const row = byId.get(entry.id)!;
      const next = transform(row);
      const hash = contentHash(next);
      if (hash !== entry.postimageHash) {
        throw new Error(
          `aborting: re-running the transform on ${entry.slug} produced a different document than the dry run reported (hash ${hash} vs ${entry.postimageHash}).`,
        );
      }
      const res = await tx`
        update articles set content = ${tx.json(next as never)}, updated_at = now()
        where id = ${entry.id} and updated_at::text = ${row.updated_at_raw}`;
      if (res.count !== 1) {
        throw new Error(
          `aborting: updating ${entry.slug} affected ${res.count} rows, not 1 — the row changed underneath the lock.`,
        );
      }
      written++;
    }

    return { backupTable: backup.table, backupRows: backup.rows, written };
  });
}
