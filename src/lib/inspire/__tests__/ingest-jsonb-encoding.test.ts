import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * A source-level guard on ONE mistake, because the mistake is invisible at
 * runtime and expensive to undo.
 *
 * `scripts/ingest-article.mts` writes `content`, the cover's four image columns
 * and the same four on every `media` row as jsonb. postgres.js reads the
 * `::jsonb` cast that follows a placeholder, types the PARAMETER from it, and
 * then serialises the value with that type's serializer — which for json is
 * `JSON.stringify`. Hand it a value that has ALREADY been stringified and it
 * stringifies a second time, so Postgres stores a jsonb STRING scalar instead
 * of the object:
 *
 *   ${JSON.stringify(doc)}::jsonb  ->  jsonb_typeof = string   (wrong)
 *   ${sql.json(doc)}::jsonb        ->  jsonb_typeof = object   (right)
 *
 * This shipped once. Every article ingested on 24 Aug 2026 stored a string
 * where all 29 legacy articles stored an object, and it hid for a day because
 * Drizzle's `jsonb` column runs `JSON.parse` on a string on the way out — so
 * every rendered page looked correct while `content->'content'` was NULL to
 * SQL. Anything that queries into the document (a migration, a backfill, a
 * content audit, a sitemap builder) silently saw an empty article.
 *
 * A unit test cannot catch this without a live database, and an integration
 * test that needs Postgres will not run in the places this needs protecting.
 * So the test is on the source text: no `JSON.stringify` may sit in a jsonb
 * parameter position. It is a blunt instrument and deliberately so — the cost
 * of a false positive is renaming a variable, and the cost of a false negative
 * is another batch of articles written in the wrong shape.
 */
describe('ingest-article.mts jsonb parameters', () => {
  const raw = readFileSync(resolve(__dirname, '../../../../scripts/ingest-article.mts'), 'utf8');

  /**
   * Comments are stripped before scanning, because the comment that explains
   * this defect necessarily QUOTES the wrong form next to the right one. A
   * scanner that reads its own documentation as a violation is a scanner
   * somebody deletes.
   *
   * Only whole-line comments are removed. A trailing `//` is left alone on
   * purpose: cutting at the first `//` on a line would also cut every
   * `https://` inside the SQL, and silently shrink the region being checked.
   */
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join('\n');

  it('never feeds a pre-stringified value into a ::jsonb parameter', () => {
    // `${ ...JSON.stringify(x)... }::jsonb` in any arrangement, including the
    // `cond ? JSON.stringify(x) : null` ternary the eight columns use.
    const offenders = [...source.matchAll(/\$\{[^}]*JSON\.stringify[^}]*\}::jsonb/g)].map(
      (m) => m[0],
    );
    expect(offenders).toEqual([]);
  });

  it('still writes every jsonb column through sql.json', () => {
    const jsonbParams = [...source.matchAll(/\$\{[^}]*\}::jsonb/g)].map((m) => m[0]);
    // content + 4 cover columns + 4 media columns. If this number changes, a
    // column was added or removed and the new one needs the same treatment.
    expect(jsonbParams).toHaveLength(9);
    for (const param of jsonbParams) {
      expect(param).toContain('sql.json(');
    }
  });
});
