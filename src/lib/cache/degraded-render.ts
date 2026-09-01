import { withDeadline } from '@/lib/api/timeout';

/**
 * The read that a CACHEABLE public page cannot honestly render without.
 *
 * ── THE DEFECT THIS EXISTS TO STOP (PLAT-16) ──────────────────────────────
 *
 * `/artikel/[category]` used to wrap its two content reads like this:
 *
 *     let view = { clusters: [], unclustered: [], totalArticles: 0 };
 *     try   { view = await withDeadline(getPillarView(id), 3_000, label); }
 *     catch (err) { console.error(label, err); }          // <- and carry on
 *
 * That is a soft-fail, and soft-failing a CONTENT read on a CACHEABLE page is
 * not the safe choice it looks like. Three things go wrong at once:
 *
 *  1. THE PAGE LIES. A failed read and a genuinely empty pillar render the
 *     same UI. UI-05 gave that shape a designed empty state — "Panduan ini
 *     masih kosong" ("this guide is still empty") — which is exactly right for
 *     a pillar with nothing in it and exactly wrong for a pillar whose four
 *     articles could not be read. The reader is told a fact about our
 *     editorial calendar when the truth is a database blip.
 *
 *  2. IT IS A 200, SO EVERY CACHE DOWNSTREAM KEEPS IT. `/artikel/:category`
 *     carries `Vercel-CDN-Cache-Control: s-maxage=300,
 *     stale-while-revalidate=600` (next.config.ts), so one unlucky render
 *     publishes an empty topic hub at the edge for up to fifteen minutes, and
 *     the purge chain has no reason to fire because nothing was published.
 *     A 5xx is cached by nothing.
 *
 *  3. IT SHIPS `numberOfItems: 0` AND `hasPart: []` IN THE CollectionPage
 *     JSON-LD while `generateMetadata` fails OPEN to `index, follow`
 *     (ROBOTS_ON_DEADLINE_MISS, deliberately — see category-robots.ts). So the
 *     artefact Google may collect is an indexable hub that states, in
 *     machine-readable form, that it contains nothing.
 *
 * ── WHY THIS IS NOT THE SAME DECISION AS `ROBOTS_ON_DEADLINE_MISS` ────────
 *
 * That one fails OPEN on purpose and this one fails CLOSED, which looks
 * contradictory until you ask what each failure PERSISTS. A robots directive
 * derived from a blown deadline gets frozen into an `unstable_cache` entry
 * with `revalidate: false` and stays wrong until a tag is expired — so the
 * safe direction there is the recoverable one. A degraded page body persists
 * only as long as a cache holds the RESPONSE, so the safe direction here is to
 * make the response uncacheable. Same instinct, opposite lever.
 *
 * ── WHY NOT "A SHORT REVALIDATE WINDOW ON THE DEGRADED PATH" ──────────────
 *
 * Because a React Server Component cannot set one. `export const revalidate`
 * is static segment config, read at build time; there is no per-render
 * override and no way for a server component to put a header on its own
 * response. Throwing is the only lever a render actually holds.
 *
 * ── WHAT WAS MEASURED, AND WHAT WAS NOT ──────────────────────────────────
 *
 * `scripts/verify-degraded-page-uncacheable.mjs` forces the stall for real, by
 * taking ACCESS EXCLUSIVE on `articles` in an open transaction, against a
 * built server. Against `next build && next start`, BUILD_ID lmJC2SbvuqgTurf-
 * GwjCV, 02 Sep 2026:
 *
 *   before   GET /artikel/hantaran-mas-kahwin  ->  200  3800ms  "Panduan ini
 *                                                    masih kosong" x2, 0 links
 *   after    GET /artikel/hantaran-mas-kahwin  ->  500  7704ms  no empty state
 *   after    (lock released) next request      ->  200    51ms  4 article links
 *
 * The identical pair on the GRID shape (`/artikel/idea-dan-nasihat`): 200 with
 * `Kategori ini masih kosong` before, 500 after, 200 with 15 links on recovery.
 *
 * TWO HONEST LIMITS on that evidence:
 *
 *  - THE 500 BODY IS A CLIENT-RENDERED SHELL. Measured, same run: the document
 *    is `<html id="__next_error__">` carrying the correct `<title>` and the JS
 *    bundles, and NOT the words "Ada masalah teknikal". Next does not
 *    server-render `error.tsx` for an uncaught error on the initial document;
 *    the boundary renders after hydration. A reader with JavaScript sees the
 *    designed retry page. A reader WITHOUT it sees a blank 500. That is a real
 *    regression against the (untrue) empty state it replaces, and it is
 *    accepted deliberately: a blank 500 tells a crawler "come back", while a
 *    200 saying "this pillar is empty" is a statement Google may believe and
 *    the edge will repeat.
 *
 *  - VERCEL'S TREATMENT OF A 5xx IS NOT MEASURED HERE. The response still
 *    carries `Vercel-CDN-Cache-Control: public, s-maxage=300,
 *    stale-while-revalidate=600` — that header comes from `next.config.ts`
 *    `headers()`, which matches on the request path and cannot see the status.
 *    Vercel documents that its Edge Network does not cache 5xx responses, and
 *    a page cannot set a header on its own response to make that structural.
 *    So: the fact that no EMPTY page is produced is measured; the fact that
 *    the edge keeps no copy of the 500 rests on Vercel's documented behaviour.
 *    If that behaviour ever changed, the symptom would be a 500 served with a
 *    non-zero `age` — which is the thing to look for, not the empty page.
 *
 * Use this for reads the page's MEANING depends on. Do not use it for
 * decorative or supplementary reads — those may still soft-fail, because a
 * page missing a sidebar is still true.
 */
export class RenderDataUnavailableError extends Error {
  readonly label: string;
  constructor(label: string, options?: { cause?: unknown }) {
    super(`render_data_unavailable:${label}`, options);
    this.name = 'RenderDataUnavailableError';
    this.label = label;
  }
}

/**
 * Await a content read under a deadline, and FAIL THE RENDER if it does not
 * land. Never returns a placeholder.
 *
 * @param promise the read
 * @param ms      deadline in milliseconds, enforced by `withDeadline`
 * @param label   the same label convention `withDeadline` uses, e.g.
 *                `inspire-pillar:hantaran-mas-kahwin`
 */
export async function readForCacheablePage<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  try {
    return await withDeadline(promise, ms, label);
  } catch (err) {
    // Logged here rather than at the call site so the reason is in the log
    // exactly once, whatever the caller does with the throw.
    console.error(
      `[${label}] content read failed — failing the render rather than caching an empty page:`,
      err,
    );
    throw new RenderDataUnavailableError(label, { cause: err });
  }
}
