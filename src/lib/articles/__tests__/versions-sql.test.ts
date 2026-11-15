import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { VERSIONED_ARTICLE_FIELDS } from '../version-snapshot';

/**
 * The capture trigger runs on EVERY production article save, and there is no
 * local database to run it against. These checks pin the properties that make
 * it safe, so an edit that weakens one fails CI instead of failing a save.
 */

const SQL = readFileSync(
  path.resolve(__dirname, '../../db/migrations-pending/versions.sql'),
  'utf8',
);
// Comments stripped, so a rule written in prose cannot satisfy a check.
const CODE = SQL.replace(/--.*$/gm, '');

function functionBody(name: string): string {
  const start = CODE.indexOf(`CREATE OR REPLACE FUNCTION ${name}(`);
  expect(start, `${name} is defined`).toBeGreaterThanOrEqual(0);
  const open = CODE.indexOf('$fn$', start);
  const close = CODE.indexOf('$fn$', open + 4);
  return CODE.slice(open + 4, close);
}

const snake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

describe('migrations-pending/versions.sql', () => {
  const body = functionBody('article_version_capture');

  it('wraps the whole capture in an exception handler, so a snapshot can never fail a save', () => {
    // The first statement inside the function is the inner BEGIN, and the
    // handler is the last thing before the function returns.
    expect(body).toMatch(/^\s*DECLARE[\s\S]*?BEGIN\s+BEGIN\b/);
    expect(body).toMatch(
      /EXCEPTION\s+WHEN\s+OTHERS\s+THEN\s+RAISE\s+WARNING[\s\S]*END;\s*RETURN NULL;\s*END;\s*$/,
    );
    // It must not re-raise.
    expect(body).not.toMatch(/RAISE\s+EXCEPTION/i);
  });

  it('never writes `articles` (no recursion) — only article_versions', () => {
    expect(body).not.toMatch(/UPDATE\s+articles\b/i);
    expect(body).not.toMatch(/INSERT\s+INTO\s+articles\b/i);
    expect(body).not.toMatch(/DELETE\s+FROM\s+articles\b/i);
    const writes = [...body.matchAll(/(?:UPDATE|INSERT INTO|DELETE FROM)\s+(\w+)/gi)].map(
      (m) => m[1],
    );
    expect(new Set(writes)).toEqual(new Set(['article_versions']));
  });

  it('caps the snapshot size and skips deleted articles', () => {
    expect(body).toMatch(/pg_column_size\(v_art\.content\), 0\) > \d+/);
    expect(body).toMatch(/status::text = 'deleted'/);
  });

  it('reads the actor only from transaction-local settings, with machine as the default', () => {
    expect(body).toContain("current_setting('app.article_actor_id', true)");
    expect(body).toMatch(/ELSE 'machine'/);
  });

  it('fires on exactly the versioned columns, deferred to commit', () => {
    const m = CODE.match(
      /CREATE CONSTRAINT TRIGGER trg_article_version_capture\s+AFTER UPDATE OF([\s\S]*?)ON articles\s+DEFERRABLE INITIALLY DEFERRED/,
    );
    expect(m).not.toBeNull();
    const columns = m![1].split(',').map((c) => c.trim());
    expect(new Set(columns)).toEqual(new Set(VERSIONED_ARTICLE_FIELDS.map(snake)));
    expect(CODE).toMatch(
      /CREATE CONSTRAINT TRIGGER trg_article_version_capture_insert\s+AFTER INSERT ON articles\s+DEFERRABLE INITIALLY DEFERRED/,
    );
  });

  it('compares and snapshots every versioned column', () => {
    for (const col of VERSIONED_ARTICLE_FIELDS.map(snake)) {
      expect(body, col).toContain(`v_latest.${col}`);
      expect(body, col).toContain(`v_art.${col}`);
    }
  });

  it('is re-runnable', () => {
    expect(CODE).toMatch(/DROP TRIGGER IF EXISTS trg_article_version_capture ON articles;/);
    expect(CODE).toMatch(/DROP TRIGGER IF EXISTS trg_article_version_capture_insert ON articles;/);
    expect(CODE).toMatch(
      /NOT EXISTS \(SELECT 1 FROM article_versions v WHERE v\.article_id = a\.id\)/,
    );
    expect(CODE).not.toMatch(/CREATE TRIGGER(?! IF)/);
  });

  it('documents a rollback that removes every object it creates', () => {
    expect(SQL).toMatch(/DROP TRIGGER IF EXISTS trg_article_version_capture\s+ON articles;/);
    expect(SQL).toMatch(/DROP TRIGGER IF EXISTS trg_article_version_capture_insert ON articles;/);
    expect(SQL).toMatch(/DROP FUNCTION IF EXISTS article_version_capture\(\);/);
  });
});
