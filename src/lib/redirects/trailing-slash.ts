/**
 * Trailing-slash resolution — pure function, no DB, safe in middleware.
 *
 * WHY THIS EXISTS. Next normalises `/foo/` → `/foo` itself, with a 308, and it
 * does that in the redirects step which runs BEFORE middleware. On this site
 * that produced a two-hop chain on every legacy URL Google holds, because the
 * old WordPress permalinks were flat and every one of them now lives under
 * /artikel/{category}/:
 *
 *   /hantaran-kahwin/  →308→  /hantaran-kahwin  →308→  /artikel/hiasan-dekorasi/hantaran-kahwin
 *
 * Measured against production on 2026-08-23; `/category/venue/` showed the same
 * shape (308 → 301 → 200) while `/category/venue` was a single 301, which is
 * what proves the first hop is Next's and not the middleware's.
 *
 * Every historic inbound link and every URL in Google's index carries the
 * trailing slash, so every one of them was paying for two round-trips and
 * diluting through an extra redirect. Setting `skipTrailingSlashRedirect` in
 * next.config hands the whole question to middleware, and this function is the
 * decision it makes.
 *
 * The catch that comes with it: with that flag on, Next stops normalising
 * ANYTHING. Whatever this function does not handle serves at both the slashed
 * and unslashed form. That is why the default branch still 308s — the flag
 * removes a behaviour, and this file has to put it back everywhere it was not
 * the problem.
 */
import { getPatternRedirect, normalizePathname } from './patterns';

export type TrailingSlashAction =
  /** Nothing to do — path has no trailing slash (or is the bare root). */
  | { kind: 'none' }
  /** Send the client straight to the final destination. One hop, not two. */
  | { kind: 'redirect'; path: string; statusCode: 301 | 302 | 308 }
  /**
   * Serve the de-slashed path internally without telling the client. The route
   * that answers is then free to issue the ONE redirect that matters (the
   * legacy root-slug resolver 308s to /artikel/{category}/{slug}).
   */
  | { kind: 'rewrite'; path: string };

/**
 * A bare WordPress-era permalink: one path segment, lowercase slug shape.
 * These are the URLs `src/app/(public)/[slug]/page.tsx` resolves against the
 * articles table, and they are the ones that were paying two hops. The regex
 * is deliberately the same one that route uses to decide whether a DB lookup
 * is worth doing — if they drift, this rewrites paths that then 404 instead of
 * redirecting.
 */
const LEGACY_ROOT_SLUG = /^\/[a-z0-9][a-z0-9-]*$/;

export function resolveTrailingSlash(rawPathname: string): TrailingSlashAction {
  // Bare root is legitimately "/" and must never be rewritten to "".
  if (rawPathname === '/') return { kind: 'none' };

  const stripped = normalizePathname(rawPathname);

  // Nothing to normalise: no trailing slash and no doubled slashes.
  if (stripped === rawPathname) return { kind: 'none' };

  // A pattern rule already knows the final destination, so go there directly
  // rather than 308-ing to the de-slashed path and letting the same rule fire
  // on the next request. `/category/venue/` becomes one hop to /artikel/venue.
  const pattern = getPatternRedirect(stripped);
  if (pattern) {
    return { kind: 'redirect', path: pattern.destinationPath, statusCode: pattern.statusCode };
  }

  // The legacy-permalink case, and the whole reason this file exists. Rewriting
  // (not redirecting) lets /[slug] do its DB lookup and emit the single 308 to
  // the canonical article URL. The client sees exactly one redirect.
  //
  // Trade-off, accepted deliberately: an UNKNOWN slug now 404s at `/unknown/`
  // instead of 308-ing to `/unknown` and 404ing there. It is a 404 either way,
  // no indexable URL changes, and paying a redirect to reach a 404 helps nobody.
  if (LEGACY_ROOT_SLUG.test(stripped)) {
    return { kind: 'rewrite', path: stripped };
  }

  // Everything else — /artikel/, /artikel/kategori/slug/, API paths — keeps the
  // canonicalising 308 Next used to do for free.
  return { kind: 'redirect', path: stripped, statusCode: 308 };
}
