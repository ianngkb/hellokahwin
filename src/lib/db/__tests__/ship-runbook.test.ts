import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * IA-4. The ship runbook for the Inspire admin tables is run by hand against
 * the ONE production database. 0006 (Clusters) and 0007 (this build) are
 * drizzle-generated plain DDL, so neither is re-runnable: the runbook must
 * apply and record each atomically, skip it once recorded, and never claim
 * every step is safe to re-run. The hash and timestamp it tells the operator
 * to record must be the ones drizzle itself would write.
 */

const DB = path.resolve(__dirname, '..');
const README = readFileSync(path.join(DB, 'migrations-pending/README.md'), 'utf8');
// Hashed as committed (LF). A Windows autocrlf checkout has CRLF on disk; the
// runbook tells the operator to hash/apply the committed bytes, so do the same.
const committed = (file: string) =>
  readFileSync(path.join(DB, 'migrations', file), 'utf8').replace(/\r\n/g, '\n');
const SQL_0006 = committed('0006_cluster_series_box.sql');
const SQL_0007 = committed('0007_inspire_admin_versions_gsc.sql');
const JOURNAL = JSON.parse(readFileSync(path.join(DB, 'migrations/meta/_journal.json'), 'utf8'));
const entry = (tag: string) =>
  (JOURNAL.entries as { tag: string; when: number }[]).find((e) => e.tag === tag)!;
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

describe('migrations-pending/README.md ship runbook (IA-4)', () => {
  const when0006 = String(entry('0006_cluster_series_box').when);
  const when0007 = String(entry('0007_inspire_admin_versions_gsc').when);
  // Exactly what drizzle-orm's migrator computes: sha256 of the file contents.
  const hash0006 = sha(SQL_0006);
  const hash0007 = sha(SQL_0007);

  it('no longer claims that every step is safe to re-run', () => {
    expect(README).not.toMatch(/every step is safe to re-run/i);
    expect(README).toMatch(/Steps 1 and 3\s+are NOT/);
  });

  it('records 0006 and 0007 with the hash and created_at drizzle itself would write', () => {
    expect(README).toContain(`VALUES ('${hash0006}', ${when0006})`);
    expect(README).toContain(`VALUES ('${hash0007}', ${when0007})`);
  });

  it('applies and records 0007 inside ONE transaction on the manual path', () => {
    const at = README.indexOf('\i src/lib/db/migrations/0007_inspire_admin_versions_gsc.sql');
    expect(at).toBeGreaterThan(-1);
    const manual = README.slice(README.lastIndexOf('BEGIN;', at), README.indexOf('COMMIT;', at));
    expect(manual).toContain('0007_inspire_admin_versions_gsc.sql');
    expect(manual).toContain(`VALUES ('${hash0007}', ${when0007})`);
  });

  it('orders the steps: 0006, then the concurrent index, then 0007', () => {
    const i0006 = README.indexOf('| 1   | `../migrations/0006_cluster_series_box.sql`');
    const iIndex = README.indexOf('| 2   | `analytics.sql`, the `CREATE INDEX CONCURRENTLY`');
    const i0007 = README.indexOf('| 3   | `../migrations/0007_inspire_admin_versions_gsc.sql`');
    expect(i0006).toBeGreaterThan(-1);
    expect(iIndex).toBeGreaterThan(i0006);
    expect(i0007).toBeGreaterThan(iIndex);
    expect(README).not.toContain('series.sql');
  });

  it('checks for an existing record / table before applying, and skips step 3 if done', () => {
    expect(README).toMatch(new RegExp(`created_at = ${when0007}.*Skip step 3`, 's'));
    expect(README).toMatch(new RegExp(`created_at = ${when0006}.*Skip step 1`, 's'));
    expect(README).toContain("to_regclass('public.article_versions')");
  });

  it('0007 is the non-idempotent drizzle DDL the runbook guards against, with no cluster tables', () => {
    expect(SQL_0007).toMatch(/^CREATE TABLE "article_versions"/m);
    expect(SQL_0007).not.toMatch(/CREATE TABLE IF NOT EXISTS/);
    expect(SQL_0007).not.toMatch(/cluster/i);
    expect(SQL_0007).toContain(
      'CREATE INDEX IF NOT EXISTS "idx_analytics_events_artikel_pageview"',
    );
  });
});
