import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The authorship tag is INTERNAL review tracking, not a public disclosure
 * banner. The brief is explicit about that, and the field is built so it COULD
 * be surfaced publicly later if the board decides to — which is exactly why this
 * needs a test rather than care. A field that is one `select` away from being
 * public will eventually be selected by someone who did not read the brief.
 *
 * So: no file under `src/app/(public)` may reference any of the four fields, in
 * either their Drizzle (camelCase) or SQL (snake_case) spelling.
 *
 * This is a source-level assertion, not a render assertion, and that is
 * deliberate. Rendering the page in a test needs a database, Clerk, and R2; this
 * catches the mistake at the point it is made — someone adding
 * `authorship: articles.authorship` to a public query — and it keeps catching it
 * on every route added later without anyone remembering to extend a fixture.
 */

const PUBLIC_ROOT = join(process.cwd(), 'src', 'app', '(public)');

const FORBIDDEN = [
  'authorship',
  'reviewStatus',
  'review_status',
  'reviewedAt',
  'reviewed_at',
  'reviewedBy',
  'reviewed_by',
  // The compat mirror is just as private. It is kept only as a rollback net.
  'isAiGenerated',
  'is_ai_generated',
  'humanReviewedAt',
  'human_reviewed_at',
] as const;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

describe('the authorship tag never reaches a public route', () => {
  const files = walk(PUBLIC_ROOT);

  it('finds public route files to check (guards against the walk silently returning nothing)', () => {
    // Without this, a wrong PUBLIC_ROOT would make every assertion below pass
    // vacuously — a green test proving nothing at all.
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(FORBIDDEN)('no public route references %s', (field) => {
    const offenders = files.filter((file) => {
      const source = readFileSync(file, 'utf8');
      // Word-boundary match so `reviewedAt` does not trip on an unrelated
      // `lastReviewedAtBuildTime`, and so a comment mentioning the field in
      // prose is still caught — a comment is cheap to reword, and loosening the
      // match to exclude comments is how a real reference sneaks past.
      return new RegExp(`\\b${field}\\b`).test(source);
    });

    expect(
      offenders.map((f) => f.replace(process.cwd(), '')),
      `${field} must not appear under src/app/(public) — the authorship tag is internal review tracking, not a public disclosure. If the board has decided to disclose publicly, that is a separate change and this test should be updated deliberately.`,
    ).toEqual([]);
  });
});
