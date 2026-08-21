import { unstable_cache } from 'next/cache';
import type { JsonSafe } from './json-safe';

/**
 * `unstable_cache`, but the payload is checked for JSON round-trip safety at
 * compile time. See `./json-safe.ts` for why a bare `Date` in a cached value is
 * a production-only landmine.
 *
 * The `T & JsonSafe<T>` on the parameter is the whole point: if the getter's
 * return type contains a `Date` anywhere, `JsonSafe<T>` puts `never` in that
 * slot, the intersection collapses that property to `never`, and the getter is
 * no longer assignable — so the call fails to compile, naming the property.
 *
 * (It is written as an intersection rather than the more obvious
 * `T extends JsonSafe<T>` constraint because that form is rejected by TypeScript
 * as a circular constraint, TS2313.)
 *
 * Prefer this over calling `unstable_cache` directly for anything DB-backed.
 */
export function cachedJson<Args extends unknown[], T>(
  fn: (...args: Args) => Promise<T & JsonSafe<T>>,
  keyParts: string[],
  options?: { revalidate?: number | false; tags?: string[] },
): (...args: Args) => Promise<T> {
  return unstable_cache(fn, keyParts, options);
}
