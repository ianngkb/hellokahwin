/**
 * The one place these one-off SEO scripts open a database connection, and the
 * one place they take a backup before writing to it.
 *
 * WHY A SHARED FILE. Four scripts in this batch write to production editorial
 * data. Each of them needs the same three things — a connection built without
 * a secret on a command line, a timestamped backup taken BEFORE the first
 * UPDATE, and a refusal to write at all unless the caller passed `--apply`.
 * Copying that into four files is how one of the four ends up missing the
 * backup.
 *
 * THE CONNECTION. `DATABASE_URL` is read from the environment and never
 * defaulted, the same rule `audit-internal-links.mts` states: a script that
 * defaults to production eventually runs against production by accident. The
 * caller injects it (`scripts/seo/run-with-db.ps1` builds it from the vault
 * key `supabase.hellokahwin-dbpass`), so the password is never typed, echoed
 * or written to disk.
 *
 * THE BACKUP is a real table in the same database rather than a file, because
 * a JSON file on one laptop is not a recovery path for a production row. It
 * carries the primary key, the columns about to change and `updated_at`, so a
 * revert is a join, and it is created ONCE per run — a second run of the same
 * script finds the table already there and leaves the first snapshot intact,
 * which is the copy taken before anything was touched.
 */
import postgres from 'postgres';

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
 * Snapshot `columns` of `table` into `<table>_backup_<stamp>_<slug>`, once.
 *
 * Returns the table name it snapshotted into and how many rows it holds, so
 * the caller can print both and the result file can name a real object rather
 * than an intention.
 */
export async function snapshot(
  sql: Sql,
  table: string,
  slug: string,
  columns: string[],
  stamp = '20260904',
): Promise<{ table: string; rows: number; created: boolean }> {
  const name = `${table}_backup_${stamp}_${slug}`;
  if (!/^[a-z0-9_]+$/.test(name)) throw new Error(`unsafe backup table name: ${name}`);
  for (const c of columns) {
    if (!/^[a-z0-9_]+$/.test(c)) throw new Error(`unsafe column name: ${c}`);
  }
  const [existing] = await sql`select to_regclass(${name}) as oid`;
  if (existing?.oid) {
    const [{ n }] = await sql`select count(*)::int as n from ${sql(name)}`;
    return { table: name, rows: n, created: false };
  }
  const select = ['id', ...columns.filter((c) => c !== 'id')].join(', ');
  await sql.unsafe(`create table ${name} as select ${select} from ${table}`);
  const [{ n }] = await sql`select count(*)::int as n from ${sql(name)}`;
  return { table: name, rows: n, created: true };
}

/** `--apply` writes; anything else is a dry run. Stated once so no script invents its own spelling. */
export function parseMode(argv: string[]): { apply: boolean } {
  return { apply: argv.includes('--apply') };
}
