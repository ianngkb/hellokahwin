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
 *
 * THE SECOND CACHE, WHICH THIS DOES NOT TOUCH — and the trap it sets for proof.
 *
 * Everything above is the Next data cache, inside the origin. In front of it
 * sits the **Vercel edge**, which stores its own copy of a rendered page and
 * which `revalidateTag` cannot reach. `/api/cron/revalidate-content` returning
 * 200 means the origin will render fresh HTML on its next miss. It does not
 * mean a reader gets fresh HTML.
 *
 * Measured publishing P1 and P6, 25 Aug 2026. Eight articles written, the last
 * at 10:13:20Z, `--revalidate-url` on every run. Then a 457-second wait — past
 * the 300s edge TTL — and the pillar page still came back:
 *
 *     x-vercel-cache: STALE   age: 717   <meta name="robots" content="noindex, follow">
 *
 * `age: 717` is older than the wait: the edge was serving the copy stored by a
 * BASELINE request taken at 10:09:49Z, before the write, and it served it
 * stale-while-revalidate rather than revalidating inline. The immediately
 * following request returned `x-vercel-cache: HIT`, `age: 16`, no `noindex`,
 * and 4.5 KB more body — the four new article cards.
 *
 * So the shape is the same one described above, one layer out, and waiting does
 * not fix it: **the first request past the TTL is the one that triggers the
 * refresh, and it is served the old copy while doing so.** Two consequences for
 * anyone taking publish proof:
 *
 *   1. Do not request the URL whose after-state is the deliverable BEFORE
 *      publishing. A baseline request re-arms the edge for another TTL and
 *      makes the proof request measure the baseline.
 *   2. The article URLs above were never requested before publishing, and every
 *      one came back `x-vercel-cache: MISS` and correct on the FIRST request.
 *      That is the control, and it is why the pillar-page staleness is the
 *      baseline's fault rather than a purge failure.
 *
 * Record `x-vercel-cache` and `age` on every proof request. Without those two
 * headers a stale 200 is indistinguishable from a fresh one, and the honest
 * reading of the pillar response above would have been "publish failed".
 *
 * That second cache now HAS an owner: `@/lib/cache/edge-purge`, which deletes
 * the CDN entries for exactly the paths an ingest invalidates — the article,
 * its pillar, and the sitemap. It is a separate module because it is a separate
 * cache with separate credentials and a separate failure mode: this one can
 * only degrade freshness, never lose a write. The two are called back to back
 * at the end of `scripts/ingest-article.mts`, origin first.
 */
export const PURGE_IMMEDIATELY = { expire: 0 } as const;
