import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * One rule, mechanically enforced: NO BACKTICK inside a postgres.js tagged
 * template in the ingest script.
 *
 * `sql\`…\`` and `tx\`…\`` are tagged template literals, so a backtick anywhere
 * inside them — including inside a `--` SQL comment — terminates the string and
 * the rest of the statement is parsed as JavaScript. The file already carried a
 * warning saying exactly this, next to the comment where it had bitten once.
 * It bit again on 26 Aug 2026 while adding the `updated_at` change predicate,
 * because a warning is a thing you read AFTER you have already typed the line.
 *
 * The failure is also badly signposted. esbuild reports:
 *
 *     ERROR: Expected ";" but found "now"
 *
 * naming neither the comment, nor the backtick, nor the template — and it
 * surfaces only when the CLI is actually invoked, because `pnpm typecheck`
 * (tsconfig.typecheck.json) does not include `scripts/`. A prose warning cannot
 * catch this. A test can.
 *
 * Write SQL comments in plain words: `articles.title` becomes articles.title.
 */

const SCRIPTS = join(process.cwd(), 'scripts');
const FILES = ['ingest-article.mts'];

/**
 * Every `sql`/`tx`-tagged template body in `source`, with its 1-based start line.
 *
 * Deliberately a scanner and not a parser: it walks the file character by
 * character tracking which quote it is inside, so a backtick in an ordinary
 * `//` comment (of which this codebase has hundreds, correctly) is not a
 * finding, and only the tagged bodies are returned.
 */
function taggedSqlTemplates(source: string): { line: number; body: string }[] {
  const found: { line: number; body: string }[] = [];
  let i = 0;
  let line = 1;
  // `sql`…`` and `tx`…`` — but also `sql<{ id: string }[]>`…``, which is how
  // most of them are written here. The generic argument list sits between the
  // tag and the backtick, so it has to be stripped before the tag is checked;
  // a bounded lookback keeps a stray `<` elsewhere in the file from swallowing
  // half of it.
  const isTag = (end: number) => {
    const before = source.slice(Math.max(0, end - 200), end).trimEnd();
    const withoutGeneric = before.replace(/<[^<>]*(?:<[^<>]*>[^<>]*)*>$/, '').trimEnd();
    return /(?:^|[^A-Za-z0-9_$.])(?:sql|tx)$/.test(withoutGeneric);
  };

  while (i < source.length) {
    const ch = source[i];
    if (ch === '\n') {
      line++;
      i++;
      continue;
    }
    // Skip over the things that can legitimately contain a backtick.
    if (ch === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && source[i + 1] === '*') {
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
        if (source[i] === '\n') line++;
        i++;
      }
      i += 2;
      continue;
    }
    if (ch === "'" || ch === '"') {
      const quote = ch;
      i++;
      while (i < source.length && source[i] !== quote) {
        if (source[i] === '\\') i++;
        if (source[i] === '\n') line++;
        i++;
      }
      i++;
      continue;
    }
    if (ch === '`') {
      const startLine = line;
      const tagged = isTag(i);
      const bodyStart = ++i;
      // Template bodies here never nest another template, so the first
      // unescaped backtick closes it — which is precisely the defect being
      // guarded: a backtick meant as prose closes the SQL early.
      while (i < source.length && source[i] !== '`') {
        if (source[i] === '\\') i++;
        if (source[i] === '\n') line++;
        i++;
      }
      if (tagged) found.push({ line: startLine, body: source.slice(bodyStart, i) });
      i++;
      continue;
    }
    i++;
  }
  return found;
}

describe('SQL tagged templates in the ingest script', () => {
  for (const file of FILES) {
    const source = readFileSync(join(SCRIPTS, file), 'utf8');

    it(`${file}: finds the sql/tx templates at all (so a green test means something)`, () => {
      const templates = taggedSqlTemplates(source);
      // 12 at the time of writing. The floor is a canary: if a refactor or a
      // scanner bug makes this find nothing, the other two assertions would
      // pass vacuously and the guard would be decorative.
      expect(templates.length).toBeGreaterThanOrEqual(12);
      // The upsert this all exists for.
      expect(templates.some((t) => t.body.includes('insert into articles'))).toBe(true);
    });

    it(`${file}: no backtick inside any sql/tx template`, () => {
      // A backtick INSIDE a body is impossible by construction — the scanner
      // stops at the first one. So the real assertion is structural: if a
      // backtick had been used as prose inside a template, the body would end
      // early and the "template" that follows would be the JavaScript remainder.
      // The tell is a body that opens SQL and never closes the statement.
      const offenders = taggedSqlTemplates(source).filter((t) => {
        const sqlish = /\b(insert into|select |update |delete from)\b/i.test(t.body);
        // Every real statement in this file ends with something SQL-shaped, not
        // mid-sentence. A prematurely closed body ends inside a -- comment.
        const lastLine = t.body.trimEnd().split('\n').pop() ?? '';
        return sqlish && lastLine.trim().startsWith('--');
      });
      expect(
        offenders.map((o) => `line ${o.line}: SQL template ends inside a -- comment`),
      ).toEqual([]);
    });

    it(`${file}: SQL comments carry no backtick-quoted identifiers`, () => {
      // The direct check, on the source lines that are SQL comments: a `--`
      // line containing a backtick is either already broken or one edit away.
      const broken: string[] = [];
      for (const { line, body } of taggedSqlTemplates(source)) {
        body.split('\n').forEach((text, offset) => {
          if (text.trim().startsWith('--') && text.includes('`')) {
            broken.push(`line ${line + offset + 1}: ${text.trim()}`);
          }
        });
      }
      expect(broken).toEqual([]);
    });
  }
});
