/**
 * The cache-life argument that makes `revalidateTag` actually purge.
 *
 * WHY THIS EXISTS — the defect it replaces, verified against the installed
 * Next 16.1.6, not inferred from the docs.
 *
 * Every content-invalidation call in this app used to read
 * `revalidateTag('articles', 'max')`. The second argument reads like an
 * intensity — "purge as hard as possible" — and it is the exact opposite. It
 * is a **cacheLife profile name**, and `max` is the LONGEST life Next ships.
 * Trace it through `next/dist/server`:
 *
 *   1. `revalidate()` records `{ tag, profile: 'max' }`
 *      (`web/spec-extension/revalidate.js`).
 *   2. `revalidateTags()` resolves the profile to its durations and passes
 *      `{ expire: cacheLife.expire }` to every cache handler
 *      (`revalidation-utils.js`). For `max`, `expire` is 60*60*24*365 —
 *      one year (`config-shared.js`).
 *   3. The handler therefore stamps the tag
 *      `{ stale: now, expired: now + 31_536_000_000 }`
 *      (`incremental-cache/file-system-cache.js`).
 *   4. On the next read, `areTagsExpired()` asks `expired <= now` — a year in
 *      the future, so NO — while `areTagsStale()` says yes
 *      (`incremental-cache/tags-manifest.external.js`).
 *
 * Stale is not expired. A stale entry is *served as-is* and refreshed in the
 * background (`unstable-cache.js`: `if (cacheEntry.isStale) { …background
 * revalidate… } return cachedResponse`). So the first request after a write
 * gets the PRE-WRITE page and the second gets the new one. That is the
 * "warm the URL twice" behaviour, and it is not a Vercel quirk — it is what
 * the argument means.
 *
 * Measured on a production build of this app (2026-08-24), ingesting one
 * article into pillar P1:
 *   with 'max'          → pillar request #1: 0 articles, `noindex, follow`
 *                          pillar request #2: 1 article,  indexable
 *   with PURGE_IMMEDIATELY → pillar request #1: 1 article, indexable
 *
 * WHY `{ expire: 0 }` AND NOT THE ALTERNATIVES.
 *
 * - `revalidateTag(tag)` with no second argument does purge immediately, but
 *   Next 16.1.6 prints a deprecation warning on every call and steers callers
 *   to `updateTag`.
 * - `updateTag(tag)` is the sanctioned immediate purge, but it **throws** in a
 *   Route Handler ("updateTag can only be called from within a Server
 *   Action", error E872) — and the ingest CLI reaches us through exactly such
 *   a handler, `/api/cron/revalidate-content`. It is not available where we
 *   need it most.
 * - A `CacheLifeConfig` object is the documented second-argument form, and
 *   `expire: 0` is unambiguous: step 3 above stamps `expired = now + 0`, so
 *   `areTagsExpired()` is true on the very next read and the entry is a MISS
 *   rather than a stale hit. `revalidate()` additionally special-cases
 *   `expire === 0` to mark the path revalidated, giving it the same
 *   read-your-own-writes semantics as the no-argument form — without the
 *   deprecation warning.
 *
 * ONE KNOWN EDGE, and it is Next's, not ours. `areTagsExpired()` requires
 * `expired > entry.lastModified` with a strict `>`, so a cache entry written in
 * the SAME millisecond as the purge is not expired by it. The no-argument
 * `revalidateTag(tag)` form stamps `expired: now` too and has exactly the same
 * edge, so this is not a cost of choosing `{ expire: 0 }` — there is no form
 * that avoids it. It needs a write and a purge to collide inside one
 * millisecond; the ingest CLI writes and purges seconds apart.
 *
 * A NOTE ON LOAD. Immediate expiry means the next reader rebuilds rather than
 * being handed a stale copy, so a purge of the `articles` tag costs a cold
 * rebuild of the entries under it instead of a background refresh. That is the
 * point — a stale copy is the bug — and here it is bounded: this site has ~30
 * published articles, and the write paths gate on `affectsPublic` so a draft
 * save costs nothing. The corpus-wide storm recorded in
 * `@/lib/inspire/article-cache` (Sentry TWN-NEW-47) was a different shape: 2,286
 * articles evicted by an over-broad `listings` TAG, which that file fixed by
 * narrowing the tag. Tag breadth is the lever there, not expiry timing.
 *
 * USE THIS FOR EVERY CONTENT PURGE. If a future call site wants genuine
 * stale-while-revalidate, it should say so with its own explicit profile and a
 * comment explaining why one stale response is acceptable there.
 */
export const PURGE_IMMEDIATELY = { expire: 0 } as const;
