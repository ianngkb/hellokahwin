/**
 * The cache-life argument that makes `revalidateTag` actually purge.
 *
 * ⚠ THIS FILE IS HALF THE STORY. There are two caches in front of a reader and
 * this one is the inner one. Nothing here reaches the Vercel CDN copy of a
 * rendered page — that is `@/lib/cache/edge-purge` and `@/lib/cache/edge-tag`,
 * and its traps are different from these ones. If you are here because a page
 * served stale content, read the README's "Caching" section first: it lists the
 * three failure modes that look like success, including a purge API that
 * answers 200 for a tag nobody ever stamped.
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
 *
 * THE THIRD CACHE IS GOOGLE'S, AND THE CHAIN DOES NOT END AT THE CDN.
 *
 * This is here because this file is where people arrive before writing purge
 * code, and stopping at two caches is what made publishing invisible for a day.
 *
 * Google holds its own copy of the sitemap and re-reads it on a schedule that
 * has run to days on this property. On 26 Aug 2026 four articles that had been
 * live and correct for a day still inspected as `URL is unknown to Google` or
 * `Discovered - currently not indexed`, last crawled `Never`. Both caches above
 * were clean the whole time. Clearing our caches does not publish anything; it
 * only stops us serving the old thing. Telling Google is a separate act, and it
 * is `@/lib/seo/gsc-sitemap`.
 *
 * **The order is not free, and it is the one thing to get right.**
 *
 *     1. revalidateTag        empty the data cache at the origin
 *     2. purgeVercelEdge      delete the CDN copies, /sitemap.xml among them
 *     3. submitSitemapToGsc   ask Google to come and read it
 *
 * Run 3 before 2 and Google arrives on our invitation and collects the sitemap
 * the CDN is still holding — the one WITHOUT the new article — and records a
 * `last_downloaded` that moved. Every dashboard then reports success. That is
 * strictly worse than not inviting Google at all, which is why the ingest runs
 * step 3 only inside the success branch of step 2 and says out loud when it
 * skips.
 *
 * Two more things that look like proof and are not:
 *
 *   - `PUT .../sitemaps/{feedpath}` answers **204 with an EMPTY BODY** on
 *     success. The good outcome is indistinguishable from nothing happening.
 *   - A 204 is an ACCEPTANCE. It is not a fetch and it is certainly not an
 *     indexing. The only evidence of the fetch is `last_downloaded` moving in
 *     Search Console; the only evidence of indexing is a URL inspection, and
 *     that one takes up to 48h.
 *
 * And do NOT reach for the Indexing API instead. Google restricts it to
 * `JobPosting` and `BroadcastEvent`; using it for articles is a policy
 * violation against the whole property. It was proposed at the 26 Aug 2026
 * board and withdrawn in the same meeting.
 *
 * A FOURTH THING THAT IS NOT A CACHE, AND THE ONE STILL OPEN.
 *
 * `next.config.ts` now sets `expireTime: 3600`, which caps how long ANY of the
 * above may be served stale once it has gone wrong — it was 31536000, a year,
 * inherited from a framework default. Read the comment there before changing
 * it; the number is argued against measured edit frequency, not chosen.
 *
 * What the cap does NOT do is stop the wrong thing being CACHED in the first
 * place. Reproduced on production 26 Aug 2026: expire the `articles` tag, put
 * 12 renders in flight against the 5-wide pool, and 50 of 61 responses came
 * back with the site-default homepage title, no canonical and no og tags,
 * because `generateMetadata` in the article page gives itself 1.5s while the
 * page component has 5. Metadata loses that race; the page wins; the edge
 * stores the mismatch. The cap bounds the damage to ~50 minutes and the purge
 * chain clears it in seconds — but a publish is exactly the event that creates
 * the condition, so a crawl arriving in that window still sees it. Fixing the
 * race lives in the article page, not in this file.
 */
export const PURGE_IMMEDIATELY = { expire: 0 } as const;
