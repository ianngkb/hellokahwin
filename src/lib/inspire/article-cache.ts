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
 * v7 (2026-08-15): the merged shape after two independent v6 bumps landed in
 * one batch — author profile columns added, `credits` removed. See the version
 * history in `page.tsx` for why reusing v6 was unsafe.
 */
export const ARTICLE_PAGE_CACHE_KEY = 'inspire-article-page-v7';

/**
 * Tags for the article payload entry.
 *
 * ⚠️ `listings` MUST NOT APPEAR HERE. It was present from v4 until 2026-08-15,
 * which meant the ~30 admin/vendor write paths that fire
 * `revalidateTag('listings', 'max')` — every listing edit, every vendor photo
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
