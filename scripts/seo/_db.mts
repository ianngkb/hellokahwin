/**
 * The one place these one-off SEO scripts open a database connection, take a
 * backup, and prove that what they are about to overwrite is still what they
 * read.
 *
 * WHY A SHARED FILE. Four scripts in this batch write to production editorial
 * data. Each needs the same guarantees, and copying them into four files is
 * how one of the four ends up missing one.
 *
 * THE CONNECTION. `DATABASE_URL` is read from the environment and never
 * defaulted, the same rule `audit-internal-links.mts` states: a script that
 * defaults to production eventually runs against production by accident. The
 * caller injects it (`scripts/seo/run-with-db.ps1` builds it from the vault
 * key `supabase.hellokahwin-dbpass`), so the password is never typed, echoed
 * or written to disk.
 *
 * ── THE LOST UPDATE THIS FILE EXISTS TO PREVENT ───────────────────────────
 *
 * These scripts read a whole `articles.content` document, transform it in
 * memory, and write the whole thing back. Between the read and the write sits
 * a report, an undo file and a human deciding to pass `--apply`. If an editor
 * saves in that window, a plain `update ... where id = ?` throws their work
 * away, and — worse — the undo file does not contain it either, so NEITHER
 * recovery path has it. The autosave in the admin editor runs every 60
 * seconds, so this is an ordinary Tuesday, not a rare race.
 *
 * Three things close it, and all three are required:
 *
 *  1. `assertNoActiveEditLocks` — the app's own `article_edit_locks` table
 *     already says who has an article open. Refuse to touch a locked one.
 *  2. A PREIMAGE HASH per row, recorded by the dry run and re-checked against
 *     the freshly locked row inside the transaction. If anything changed since
 *     the dry run, the whole apply aborts: the diff a human approved is no
 *     longer the diff that would be written.
 *  3. `select ... for update` plus `where id = ? and updated_at = ?` on the
 *     write itself, with the affected count asserted, so a save that lands
 *     between the check and the write loses the race instead of the script.
 *
 * THE BACKUP is a real table in the same database rather than a file, because
 * a JSON file on one laptop is not a recovery path for a production row. Its
 * name carries a per-run id, so a second run can never be handed the FIRST
 * run's snapshot and told it is protected; a name collision is a hard failure,
 * not a silent reuse.
 */
import { createHash } from 'node:crypto';
import postgres, { type TransactionSql } from 'postgres';

export function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Run through scripts/seo/run-with-db.ps1 so the password is injected from the vault rather than typed.',
    );
  }
  return postgres(url, { max: 2, prepare: false, ssl: 'require' });
}

export type Sql = ReturnType<typeof connect>;
/**
 * A transaction handle. Every guard below accepts either this or a plain
 * connection, because the checks are the same and only the apply paths run
 * inside a transaction.
 */
export type Tx = TransactionSql<Record<string, never>>;
export type Db = Sql | Tx;

/**
 * A stable fingerprint of a stored value.
 *
 * Keys are sorted, so two documents that differ only in property order hash
 * the same — which is what we want, because a round trip through JSONB does
 * not promise to give the keys back in the order they went in, and a
 * false mismatch would abort a legitimate apply.
 */
export function contentHash(value: unknown): string {
  const canonical = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(canonical);
    if (v && typeof v === 'object') {
      return Object.fromEntries(
        Object.entries(v as Record<string, unknown>)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([k, x]) => [k, canonical(x)]),
      );
    }
    return v;
  };
  return createHash('sha256')
    .update(JSON.stringify(canonical(value) ?? null))
    .digest('hex');
}

/** One id's state at dry-run time: what the apply must find, or refuse to write. */
export interface ManifestEntry {
  id: string;
  slug: string;
  /** ISO string of the row's `updated_at` when the dry run read it. */
  updatedAt: string;
  /** Hash of the exact value the dry run transformed. */
  preimageHash: string;
  /** Hash of what the dry run intends to write. */
  postimageHash: string;
}

export interface Manifest {
  script: string;
  runId: string;
  generatedAt: string;
  entries: ManifestEntry[];
}

/** A run id that sorts by time and cannot collide with another run's snapshot. */
export function newRunId(): string {
  return new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, 'Z')
    .toLowerCase();
}

/**
 * Snapshot `columns` of `table` into `<table>_backup_<runId>_<slug>`.
 *
 * A name collision THROWS. The previous version reused an existing table and
 * reported it as a backup, which meant a second run on the same day wrote over
 * rows whose immediately-prior values had never been captured — a backup that
 * exists is not the same as a backup of what you are about to destroy.
 *
 * `create table as` copies values but no constraints, so the primary key is
 * added explicitly: a restore joins on it, and a snapshot you cannot join
 * against is an export, not a recovery path.
 */
export async function snapshot(
  sql: Db,
  table: string,
  slug: string,
  columns: string[],
  runId: string,
): Promise<{ table: string; rows: number }> {
  const name = `${table}_backup_${runId}_${slug}`;
  if (!/^[a-z0-9_]+$/.test(name)) throw new Error(`unsafe backup table name: ${name}`);
  for (const c of columns) {
    if (!/^[a-z0-9_]+$/.test(c)) throw new Error(`unsafe column name: ${c}`);
  }
  const [existing] = await sql<{ oid: string | null }[]>`select to_regclass(${name})::text as oid`;
  if (existing?.oid) {
    throw new Error(
      `backup table ${name} already exists. Every apply takes its own snapshot; reusing one would leave the rows this run is about to change with no record of their current values.`,
    );
  }
  const select = ['id', ...columns.filter((c) => c !== 'id')].join(', ');
  await sql.unsafe(`create table ${name} as select ${select} from ${table}`);
  await sql.unsafe(`alter table ${name} add primary key (id)`);
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from ${sql(name)}`;
  return { table: name, rows: n };
}

/**
 * Refuse to write to an article somebody has open in the editor.
 *
 * `article_edit_locks` is the app's own advisory lock, taken when an admin
 * opens an article and refreshed while they work. A lock that has expired is
 * nobody's, so only live ones count.
 */
export async function assertNoActiveEditLocks(sql: Db, articleIds: string[]): Promise<void> {
  if (articleIds.length === 0) return;
  const locked = await sql<{ article_id: string; locked_by_name: string }[]>`
    select article_id, locked_by_name from article_edit_locks
    where article_id = any(${articleIds}::uuid[]) and expires_at > now()`;
  if (locked.length > 0) {
    const who = locked.map((l) => `${l.article_id} (${l.locked_by_name})`).join(', ');
    throw new Error(
      `refusing to write: ${locked.length} article(s) are open in the editor right now — ${who}. Re-run when the locks have expired.`,
    );
  }
}

/**
 * The href resolver computes an article's canonical path from its CURRENT
 * primary category and does not consult the `redirects` table, which was empty
 * in production on 4 September 2026. That table is written when an admin
 * renames a published article's slug, and once it has rows the resolver can no
 * longer claim to know where every stored href lands. Rather than quietly
 * degrade, the script stops and says so.
 */
export async function assertRedirectsTableEmpty(sql: Db): Promise<void> {
  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from redirects where is_active is distinct from false`;
  if (n > 0) {
    throw new Error(
      `refusing to run: the redirects table now holds ${n} active row(s). resolveInternalHref resolves an article through its current primary category and does not follow exact redirects, so it can no longer prove that every rewritten href lands on a 200. Teach the resolver to follow them before re-running.`,
    );
  }
}

/**
 * Load a dry run's manifest, or explain why the apply cannot proceed without
 * one.
 *
 * `--apply` used to accept the mere EXISTENCE of an undo file. That let a
 * directory from a different migration satisfy the gate — the two content
 * scripts write files with the same names — so the run could be "protected" by
 * an undo that would restore the wrong document.
 */
export function requireManifest(raw: string | undefined, script: string, path: string): Manifest {
  if (raw === undefined) {
    throw new Error(
      `refusing to apply: no dry-run manifest at ${path}. Run this script without --apply first; the manifest records what each row looked like when the diff was produced, and the apply verifies the database still matches it.`,
    );
  }
  let manifest: Manifest;
  try {
    manifest = JSON.parse(raw) as Manifest;
  } catch (err) {
    throw new Error(`refusing to apply: manifest at ${path} is not valid JSON (${String(err)})`);
  }
  if (manifest.script !== script) {
    throw new Error(
      `refusing to apply: manifest at ${path} was written by ${manifest.script}, not ${script}. Undo directories from the two content migrations hold files with identical names; this is the check that tells them apart.`,
    );
  }
  if (!Array.isArray(manifest.entries)) {
    throw new Error(`refusing to apply: manifest at ${path} has no entries array`);
  }
  return manifest;
}

/**
 * Assert the row is still exactly what the dry run measured.
 *
 * Both halves matter and they fail differently. `updated_at` catches any save,
 * including one that happened to produce identical content; the hash catches a
 * write that did not move `updated_at`. Either mismatch aborts the whole apply
 * rather than skipping the row, because a partly-applied migration against a
 * diff nobody approved is the worse outcome.
 */
export function assertUnchanged(
  entry: ManifestEntry,
  row: { id: string; slug: string; updated_at: Date | string; preimage: unknown },
): void {
  const updatedAt = new Date(row.updated_at).toISOString();
  if (row.slug !== entry.slug) {
    throw new Error(
      `aborting: article ${entry.id} is now slug "${row.slug}", was "${entry.slug}" at dry-run time.`,
    );
  }
  if (updatedAt !== entry.updatedAt) {
    throw new Error(
      `aborting: article ${entry.slug} (${entry.id}) was saved at ${updatedAt}, after the dry run read it at ${entry.updatedAt}. Re-run the dry run and re-read the diff.`,
    );
  }
  const hash = contentHash(row.preimage);
  if (hash !== entry.preimageHash) {
    throw new Error(
      `aborting: article ${entry.slug} (${entry.id}) no longer matches the value the dry run transformed (hash ${hash} vs ${entry.preimageHash}).`,
    );
  }
}

/** `--apply` writes; anything else is a dry run. Stated once so no script invents its own spelling. */
export function parseMode(argv: string[]): { apply: boolean } {
  return { apply: argv.includes('--apply') };
}
