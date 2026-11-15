import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * IA-4. The ship runbook for the Inspire admin tables is run by hand against
 * the ONE production database. 0006 is drizzle-generated plain DDL, so it is
 * not re-runnable: the runbook must apply and record it atomically, skip it once
 * recorded, and never claim every step is safe to re-run. The hash and
 * timestamp it tells the operator to record must be the ones drizzle itself
 * would write.
 */

const DB = path.resolve(__dirname, '..');
const README = readFileSync(path.join(DB, 'migrations-pending/README.md'), 'utf8');
const SQL_0006 = readFileSync(
  path.join(DB, 'migrations/0006_inspire_admin_versions_clusters_gsc.sql'),
  'utf8',
);
const JOURNAL = JSON.parse(readFileSync(path.join(DB, 'migrations/meta/_journal.json'), 'utf8'));
const entry = (tag: string) =>
  (JOURNAL.entries as { tag: string; when: number }[]).find((e) => e.tag === tag)!;

describe('migrations-pending/README.md ship runbook (IA-4)', () => {
  const when0006 = String(entry('0006_inspire_admin_versions_clusters_gsc').when);
  const when0005 = String(entry('0005_analytics_events').when);
  // Exactly what drizzle-orm's migrator computes: sha256 of the file contents.
  const hash0006 = createHash('sha256').update(SQL_0006).digest('hex');

  it('no longer claims that every step is safe to re-run', () => {
    expect(README).not.toMatch(/every step is safe to re-run/i);
    expect(README).toMatch(/Step 2 is\s+NOT/);
  });

  it('records 0006 with the hash and created_at drizzle itself would write', () => {
    expect(README).toContain(hash0006);
    expect(README).toContain(when0006);
    expect(README).toContain(`VALUES ('${hash0006}', ${when0006})`);
  });

  it('applies and records 0006 inside ONE transaction on the manual path', () => {
    const manual = README.slice(README.indexOf('BEGIN;'), README.indexOf('COMMIT;'));
    expect(manual).toContain('0006_inspire_admin_versions_clusters_gsc.sql');
    expect(manual).toContain('INSERT INTO drizzle.__drizzle_migrations');
  });

  it('checks for an existing record / table before applying, and skips step 2 if done', () => {
    expect(README).toMatch(/created_at = 1794758324000.*Skip step 2/s);
    expect(README).toContain("to_regclass('public.article_versions')");
    // db:migrate only when history is exactly at 0005, so it cannot replay older files.
    expect(README).toContain(when0005);
  });

  it('0006 itself is the non-idempotent drizzle DDL the runbook guards against', () => {
    expect(SQL_0006).toMatch(/^CREATE TABLE "article_versions"/m);
    expect(SQL_0006).not.toMatch(/CREATE TABLE IF NOT EXISTS/);
  });
});
