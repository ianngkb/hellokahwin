/**
 * Cache identity and pre-render policy for `/artikel/[category]/[slug]`.
 *
 * These live outside `page.tsx` for one reason: they are the invariants that
 * Sentry TWN-NEW-47 turned out to hinge on, and `page.tsx` cannot be imported
 * by a unit test (it drags in the whole article renderer — same constraint the
 * admin edit-page tests document). Keeping them here makes the invariants
 * assertable instead of trusting a comment.
 */

/**
 * Cache key for the article payload entry.
 *
 * v8 (2026-08-25): the payload gained `coverCredit` / `coverCreditUrl`. They
 * used to come from a separate deadline-guarded read whose failure was
 * swallowed, which is how eight live articles came to serve a licensed
 * photograph with no visible credit while the database held a correct one. The
 * bump is not cosmetic: with `revalidate: false` every already-cached v7 entry
 * lacks the two fields, so without a new key those articles would keep
 * rendering an uncredited cover for as long as the entry survived — which is
 * exactly the defect. See the note on `coverCredit` in `page.tsx`.
 *
 * v7 (2026-08-15): the merged shape after two independent v6 bumps landed in
 * one batch — author profile columns added, `credits` removed. See the version
 * history in `page.tsx` for why reusing v6 was unsafe.
 */
export const ARTICLE_PAGE_CACHE_KEY = 'inspire-article-page-v8';

/**
 * Tags for the article payload entry.
 *
 * ⚠️ `listings` MUST NOT APPEAR HERE. It was present from v4 until 2026-08-15,
 * which meant the ~30 admin/vendor write paths that fire
 * `revalidateTag('listings', PURGE_IMMEDIATELY)` — every listing edit, every vendor photo
 * upload — evicted the cached payload of all ~2,286 published articles at once.
 * A crawler then re-rendered the corpus cold against a 5-wide DB pool, which is
 * Sentry TWN-NEW-47 (2,716 `deadline_exceeded` errors in 48h, 89 distinct slugs
 * per 100-event sample, while the prod DB sat at 1 active connection).
 *
 * Listing freshness for the sidebar venue card is owned by
 * `ARTICLE_CREDITS_CACHE_TAGS` instead — a far smaller entry to rebuild.
 *
 * NOT the complete tag list the route passes: `page.tsx` composes
 * `INSPIRE_AUTHORS_TAG` on top, because that constant lives in a module that
 * pulls in the DB client and this one is imported by a DB-free unit test. What
 * this constant pins is the invariant that matters — `listings` is absent.
 */
export const ARTICLE_PAGE_CACHE_TAGS = ['articles', 'inspire-categories', 'inspire-tags'] as const;

/**
 * Cache key for the CHEAP metadata-only entry — the tier-2 title source added
 * by SEO-07 (`getArticleMetadataFallback` in the route file).
 *
 * It shares `ARTICLE_PAGE_CACHE_TAGS`, so an editor's save evicts it in the
 * same breath as the page payload and the two can never disagree about a title.
 * It gets its own KEY rather than riding `ARTICLE_PAGE_CACHE_KEY` because the
 * two entries hold different shapes: this one has no `content`, no tags and no
 * resolved dynamic blocks. Sharing a key would let a metadata-shaped entry be
 * served to the page renderer, which is the exact class of bug every version
 * bump on `ARTICLE_PAGE_CACHE_KEY` above was written to prevent.
 *
 * v1 (2026-08-28): initial shape — `ArticleMetadataSource` minus `bodyText`
 * and `tagNames`. Bump this whenever a column is added to or removed from the
 * fallback SELECT; with `revalidate: false` an entry written under the old
 * shape would otherwise be served forever against the new one.
 */
export const ARTICLE_META_CACHE_KEY = 'inspire-article-meta-v1';

/** Cache key for the vendor-credit sidebar entry. */
export const ARTICLE_CREDITS_CACHE_KEY = 'inspire-article-credits-v1';

/**
 * Tags for the vendor-credit sidebar entry.
 *
 * `listings` belongs HERE, and must stay: the card's name, photo and — this is
 * the load-bearing part — its `status`/`isHidden`/`isDemo` visibility gate are
 * cached in this entry. Without the tag, a venue that is hidden or unpublished
 * would stay advertised and linked on every article crediting it, forever.
 */
export const ARTICLE_CREDITS_CACHE_TAGS = ['articles', 'listings'] as const;

// NOTE: a `PRERENDER_LIMIT` / `resolvePrerenderParams` pair lived here briefly on
// 2026-08-15 to drive a build-time pre-render of the most-read articles. It was
// removed the same day: the build could not survive it (31 export workers
// rendering this page concurrently exceeded a 120s per-page budget and exited
// non-zero). The reasoning and the conditions for a future attempt are recorded
// on `generateStaticParams` in the route file — the fix needed is concurrency
// control, not a smaller count.

// ── THE RENDER'S TIME BUDGET, AND WHY THE ARITHMETIC LIVES HERE ────────────
//
// RISK-08 opened with two symptoms. One was "cold renders take 5-22s", which
// turned out to be a TCP handshake stall on the measuring machine and not a
// render at all. The other was real and is what these constants are about: the
// first request ever made to a new article URL returned
// `502 FUNCTION_RESPONSE_STREAM_INCOMPLETE`.
//
// That status is what Vercel produces when `maxDuration` kills a function that
// has ALREADY STARTED STREAMING. The reader does not get a slow page or an
// error page; they get a truncated response and a 502, and so does Googlebot.
// It is a strictly worse outcome than any degradation the route's own fallbacks
// were written to produce — every one of which needs the function to still be
// alive to run.
//
// So the route must never be able to spend `maxDuration` on database waiting,
// and until this change it could. `startDeadlineBudget` FLOORS each read at
// `READ_FLOOR_MS` so a late read still gets a real attempt rather than an
// already-expired 0ms deadline. That floor is deliberate and stays — but it
// means the floors ADD to the total. With a 4,000ms budget and the three
// floored reads that follow the payload read, the worst case was
//
//     4,000 + 250 + 250 + 250 = 4,750ms of database waiting
//
// against a 5,000ms ceiling, leaving 250ms for React to render the article,
// serialise it and flush the first byte. Exceed that and the kill lands
// mid-stream.
//
// The budget is therefore DERIVED from the ceiling instead of chosen next to
// it, and `article-cache.test.ts` asserts the sum fits. These live here rather
// than in `page.tsx` for the same reason the cache keys above do: `page.tsx`
// drags in the whole article renderer and cannot be imported by a unit test.

/**
 * `maxDuration` as declared by `/artikel/[category]/[slug]`, in milliseconds.
 *
 * ⚠️ DUPLICATED ON PURPOSE. Next requires a route segment's `maxDuration` to be
 * a literal it can read statically, so `page.tsx` cannot import this. The test
 * file reads `page.tsx` as TEXT and asserts the two agree, which is why this
 * duplication cannot drift.
 */
export const ARTICLE_MAX_DURATION_MS = 5_000;

/**
 * Reserved for the render itself — React, serialisation, and the first flush of
 * the stream — before any of `maxDuration` is offered to the database.
 *
 * 1,000ms against a measured render. After the function moved into the
 * database's own region (see "Where the functions run" in the README), a
 * sequential sweep of all 82 cold article URLs on the deployment that shipped
 * it gave a whole server response of p50 185ms / p90 271ms / max 385ms — and
 * that figure INCLUDES the database reads this reserve excludes.
 */
export const RENDER_RESERVE_MS = 1_000;

/** The floor `startDeadlineBudget` gives a read whose budget is exhausted. */
export const READ_FLOOR_MS = 250;

/**
 * Reads that run AFTER the payload read and can each claim the floor:
 * the pillar up-link, the cluster siblings, and the related-articles fallback.
 * Raising this count without re-deriving the budget below is the bug this
 * whole block exists to make impossible.
 */
export const FLOORED_READS_AFTER_PAYLOAD = 3;

/**
 * The shared budget the article render starts with.
 *
 * Derived, never chosen: whatever is left of `maxDuration` once the render has
 * its reserve and every floored read that follows can still be paid.
 */
export const ARTICLE_RENDER_BUDGET_MS =
  ARTICLE_MAX_DURATION_MS - RENDER_RESERVE_MS - FLOORED_READS_AFTER_PAYLOAD * READ_FLOOR_MS;
