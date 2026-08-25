import { addCacheTag } from '@vercel/functions';

/**
 * Stamp a CDN cache tag on the response this render is producing, so an ingest
 * can later delete exactly this page from the Vercel edge.
 *
 * This is the READ half of the pair. `@/lib/cache/edge-purge` is the write half
 * and carries the full reasoning: why the edge goes stale at all, why the tag
 * for a page is its own path, and why the purge uses the `dangerously-delete`
 * form. Read that first.
 *
 * ── WHY THIS IS A FUNCTION CALL AND NOT A HEADER IN `next.config.ts` ──────
 *
 * Because the header does not work, and it fails silently, which is the worst
 * shape a cache bug can take.
 *
 * The obvious implementation is a `Vercel-Cache-Tag` response header declared
 * next to the `Vercel-CDN-Cache-Control` that creates the CDN entry in the
 * first place — same file, same `source` patterns, `:category`/`:slug`
 * interpolating into the value. It builds, it deploys, and `next start` shows
 * the header on the response with the parameters correctly substituted:
 *
 *     Vercel-Cache-Tag: /artikel/pantai-santai
 *
 * Measured against production on the deployment that shipped it, 26 Aug 2026:
 *
 *     GET /artikel/pantai-santai      x-vercel-cache: MISS
 *     GET /artikel/pantai-santai      x-vercel-cache: HIT   age: 15
 *     POST dangerously-delete-by-tags ["/artikel/pantai-santai"]  ->  HTTP 200
 *     GET /artikel/pantai-santai      x-vercel-cache: HIT   age: 29
 *     POST dangerously-delete-by-tags ["/artikel/pantai-santai"]  ->  HTTP 200
 *     (15s later) GET                 x-vercel-cache: HIT   age: 78
 *
 * The entry never moved. `next.config.ts` headers are applied by the routing
 * layer, and the CDN's tag index does not read them — Vercel's own list of ways
 * to attach a cache tag is `Vercel-Cache-Tag` **on a function's own response**,
 * `addCacheTag()`, `cacheTag()`, and nothing else. The purge API accepts any
 * string and returns 200 for a tag nobody ever stamped, so the header version
 * looked like it worked from every angle except the only one that counts.
 *
 * Next's implicit path tag (`_N_T_/artikel/pantai-santai`) was tried in the
 * same session and did not move the entry either: these pages read
 * `searchParams`, so they are dynamic function responses whose CDN entry is
 * created by the TTL header rather than by ISR, and nothing tags them
 * automatically.
 *
 * So the tag has to be added from inside the render, at request time, which is
 * what `addCacheTag` is for.
 *
 * ── WHY IT NEVER THROWS ───────────────────────────────────────────────────
 *
 * `addCacheTag` needs the Vercel function runtime. There is none under
 * `next dev`, `next start`, or `vitest`, and a page that renders in production
 * but 500s locally would be a bad trade for a cache optimisation. A missed tag
 * costs at most the pre-existing five-minute staleness; a thrown error costs
 * the page.
 */
export async function tagEdgeResponse(path: string): Promise<void> {
  try {
    await addCacheTag(path);
  } catch {
    /* not on Vercel, or the runtime declined — the page still renders. */
  }
}
