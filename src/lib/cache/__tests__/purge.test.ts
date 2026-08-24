import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PURGE_IMMEDIATELY } from '../purge';

/**
 * Guards the fix documented in `../purge.ts`.
 *
 * The defect was invisible in every ordinary way of looking at the code:
 * `revalidateTag('articles', 'max')` type-checks, returns 200, and reads like
 * the strongest possible purge. It silently marked tags stale instead of
 * expired, so the site served the previous page once after every write. A unit
 * test on the constant alone would not have caught it — the constant was never
 * wrong, the ARGUMENT AT THE CALL SITES was. So this walks the source tree.
 */

const SRC = join(__dirname, '..', '..', '..');

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '__tests__') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, acc);
    else if (/\.tsx?$/.test(entry)) acc.push(full);
  }
  return acc;
}

/** Strip comments so a historical note mentioning `'max'` is not a failure. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('PURGE_IMMEDIATELY', () => {
  it('expires on the next read rather than describing a cache lifetime', () => {
    // `expire: 0` is what makes `areTagsExpired()` true immediately. Any
    // positive number — including the one hour that looks harmless — puts the
    // tag back on the stale-while-revalidate path this exists to escape.
    expect(PURGE_IMMEDIATELY).toEqual({ expire: 0 });
  });

  it('is used by every revalidateTag call in the app', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const code = stripComments(readFileSync(file, 'utf8'));
      for (const call of code.match(/revalidateTag\([^)]*\)/g) ?? []) {
        // A single-argument call purges correctly but is deprecated in Next
        // 16.1.6 and warns on every invocation; anything other than
        // PURGE_IMMEDIATELY as the second argument is a cache-life profile,
        // which does NOT purge.
        if (!call.includes('PURGE_IMMEDIATELY')) {
          offenders.push(`${file.slice(SRC.length + 1)}: ${call}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
