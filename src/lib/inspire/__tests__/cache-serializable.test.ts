import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `unstable_cache` serializes whatever its callback returns in order to store
 * it. A `Set` or a `Map` does not survive that round trip — it comes back as a
 * plain `{}` — so any method call on it throws at runtime.
 *
 * This is not hypothetical. `getIndexableCategoryIds` shipped on this branch
 * returning `Promise<Set<string>>` from inside `unstable_cache`, and it failed
 * the production build:
 *
 *     TypeError: r.has is not a function
 *     Export encountered an error on /sitemap.xml/route: /sitemap.xml
 *
 * Two things made it expensive to find. It worked perfectly in `next dev`,
 * because the first call returns the live in-memory value before anything is
 * serialized — so the bug is invisible exactly where it would be cheapest to
 * catch. And TypeScript endorsed it, because the callback's return annotation
 * said `Set<string>` and the compiler had no reason to doubt it.
 *
 * The fix is always the same shape: cache an array, rebuild the Set outside the
 * cache boundary. This test pins that convention.
 */

const SRC = join(process.cwd(), 'src');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

describe('unstable_cache callbacks return serializable values', () => {
  const files = walk(SRC).filter((f) => readFileSync(f, 'utf8').includes('unstable_cache('));

  it('finds files using unstable_cache (guards against a vacuous pass)', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('no cached callback is annotated as returning a Set or a Map', () => {
    const offenders: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, 'utf8');

      // Only the CALLBACK's own annotation is a bug. A wrapper outside the cache
      // boundary that returns `Promise<Set<string>>` is the correct fix, not a
      // violation — so this looks specifically at the callback that
      // `unstable_cache` receives, not at every Set-returning function in the
      // file. The window is the callback's signature, which in every in-repo
      // usage sits immediately after the opening paren.
      let from = source.indexOf('unstable_cache(');
      while (from !== -1) {
        const signature = source.slice(from, from + 200);
        if (/:\s*Promise<\s*(Set|Map)\s*</.test(signature)) {
          const line = source.slice(0, from).split('\n').length;
          offenders.push(`${file.replace(process.cwd(), '')}:${line}`);
        }
        from = source.indexOf('unstable_cache(', from + 1);
      }
    }

    expect(
      offenders,
      'A Set/Map returned from an unstable_cache callback is serialized to a plain object and loses its methods. Return an array and rebuild the collection outside the cache. See src/lib/inspire/category-indexability.ts.',
    ).toEqual([]);
  });
});
