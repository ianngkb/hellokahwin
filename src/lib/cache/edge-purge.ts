/**
 * Purge the VERCEL EDGE for named paths — the second cache, the one
 * `revalidateTag` cannot reach.
 *
 * READ `@/lib/cache/purge` FIRST. That file documents the Next data cache
 * inside the origin and the `'max'` defect that made the first request after a
 * write serve the pre-write page. This file is the layer above it: the CDN copy
 * of the rendered HTML, which sits in front of the origin and does not care
 * that the origin has been told to rebuild.
 *
 * ── WHY THE EDGE GOES STALE HERE AND NOT ELSEWHERE ────────────────────────
 *
 * `next.config.ts` sets an explicit `Vercel-CDN-Cache-Control` on
 * `/artikel/:category` and `/artikel/:category/:slug`
 * (`s-maxage=300, stale-while-revalidate=600`) and an `s-maxage=3600` on
 * `/sitemap.xml`. Those pages read `searchParams`, so they are dynamic function
 * responses, not ISR output: the CDN entry is created by the header, and
 * nothing in Next knows it exists. `revalidateTag('articles')` empties the data
 * cache and the CDN keeps serving its own copy for up to five minutes — an hour
 * for the sitemap.
 *
 * Measured 25 Aug 2026 (full log in `@/lib/cache/purge`): 457 seconds after the
 * last write, past the 300s TTL, the pillar still answered
 * `x-vercel-cache: STALE  age: 717` with `<meta name="robots"
 * content="noindex, follow">`. Waiting does not fix it — the first request past
 * the TTL is the one that triggers the refresh and is served the old copy while
 * doing so. If that request is Googlebot's, Google indexes the pre-publish hub.
 *
 * The header is a deliberate performance decision, not a defect, so the answer
 * is to purge the paths an ingest actually invalidates rather than drop the
 * header or blanket-purge the project.
 *
 * ── WHY TAGS, WHEN WHAT WE WANT IS PATHS ──────────────────────────────────
 *
 * There is no purge-by-path or purge-by-URL on Vercel. Verified against the
 * API, 26 Aug 2026: *"Cache keys are not configurable. To purge the cache you
 * must configure cache tags."* Every purge route — `next/cache`,
 * `@vercel/functions`, `vercel cache`, the REST API, the dashboard button —
 * ends at a tag, and the only tag that reaches everything is `*`, which is the
 * blanket purge this work exists to avoid.
 *
 * So the path IS the tag. Each cached route stamps a `Vercel-Cache-Tag` equal
 * to its own URL path (`ROUTES` below, consumed by `next.config.ts`), and this
 * module purges by the paths it is handed. One rule, no mapping table, nothing
 * to drift: **the tag for a page is its path.** A useful side effect is that a
 * pillar's paginated variants (`?page=2`, `?sub=…`) are separate CDN entries
 * under the same tag, so one purge takes all of them — which a path-level purge
 * would not have done.
 *
 * ── WHY `dangerously-delete`, WHICH THE DOCS TELL YOU NOT TO USE ──────────
 *
 * Vercel offers two purges and the recommended one does not solve this problem:
 *
 *   invalidate-by-tags          marks entries STALE. "The next request serves
 *                               the stale content instantly while revalidation
 *                               happens in the background."
 *   dangerously-delete-by-tags  marks entries DELETED. "The next request
 *                               fetches content from your origin before
 *                               responding to the user."
 *
 * Serve-stale-then-refresh is the exact bug: it is the same shape as
 * `revalidateTag(tag, 'max')` one layer out, and it would leave request #1
 * after a publish showing the pre-publish page. Only the delete form makes the
 * FIRST request correct, which is the whole deliverable.
 *
 * The warning attached to `dangerously-delete` is about cache stampede — one
 * tag can name many paths, and deleting them all sends a thundering herd at the
 * origin. It does not apply at this blast radius. A tag here names ONE page,
 * three of them per ingest, on a site with ~30 articles, a few times a week.
 *
 * ── WHAT A 200 FROM THIS PROVES, AND WHAT IT DOES NOT ─────────────────────
 *
 * It proves the request was accepted. It does NOT prove a cache entry matched:
 * a tag nobody ever stamped returns 200 with an empty body, verified 26 Aug
 * 2026 by purging `hk-preflight-does-not-exist`. There is no read-back API for
 * tags. So this function reports transport and authorisation failure honestly
 * and claims nothing beyond that, and callers must not upgrade "the API said
 * 200" into "the reader will see fresh HTML". The only proof of the latter is a
 * request to the page.
 */

/**
 * The routes whose CDN entries carry a purgeable tag, and the tag each carries.
 *
 * `next.config.ts` turns this into `Vercel-Cache-Tag` response headers. `tag`
 * is a path-to-regexp template compiled against `source`, so `:category` and
 * `:slug` interpolate — which is what keeps the tag equal to the concrete path
 * rather than to the route pattern.
 *
 * Adding a route here is half the job: the route must also be CDN-cached (a
 * `Cache-Control`/`Vercel-CDN-Cache-Control` with `s-maxage`), or there is no
 * entry to tag and the purge is a no-op that still returns 200.
 */
export const EDGE_TAGGED_ROUTES = [
  { source: '/artikel/:category', tag: '/artikel/:category' },
  { source: '/artikel/:category/:slug', tag: '/artikel/:category/:slug' },
  { source: '/sitemap.xml', tag: '/sitemap.xml' },
] as const;

/** The response header Vercel reads cache tags from. */
export const EDGE_CACHE_TAG_HEADER = 'Vercel-Cache-Tag';

/**
 * Project and team the purge is scoped to.
 *
 * These are identifiers, not credentials — they appear in the Vercel dashboard
 * URL — so they are defaults in the source rather than required environment.
 * Overridable for anyone pointing this at a different project.
 *
 * Read at CALL time, not at module load. The ingest CLI settles its environment
 * inside `main()` (see `bootstrapEnv`), so anything this module captured at
 * import time would predate the `.env` files and silently ignore an override.
 */
const projectId = () => process.env.VERCEL_PROJECT_ID || 'prj_pGV0Cq7wrZZbCHq94DNYj89Urotj';
const teamId = () => process.env.VERCEL_TEAM_ID || 'team_Mkofv56yM7EItimRjwSkiqNC';

const ENDPOINT = 'https://api.vercel.com/v1/edge-cache/dangerously-delete-by-tags';

export interface EdgePurgeResult {
  /** True only if Vercel accepted the purge. See the header comment for what that does and does not mean. */
  ok: boolean;
  /** The paths that were sent as tags, in the order they were sent. */
  paths: string[];
  /** Literal detail for the operator: `HTTP 401`, a network error message, or why it was skipped. */
  detail: string;
  /** True when no token was available, so nothing was even attempted. */
  skipped: boolean;
}

/**
 * The paths one ingest invalidates: the article, its pillar, and the sitemap.
 *
 * Exactly three, and no more. The article's own path is included even though a
 * brand-new slug has no CDN entry yet, because `--update` re-ingests an
 * existing one and that path is then the whole point.
 */
export function pathsInvalidatedByIngest(categorySlug: string, articleSlug: string): string[] {
  return [`/artikel/${categorySlug}/${articleSlug}`, `/artikel/${categorySlug}`, '/sitemap.xml'];
}

/**
 * Delete the CDN entries tagged with `paths`.
 *
 * Never throws: a failed purge is a degradation (the old five-minute staleness
 * returns), not a corruption, and it must not take down a publish that has
 * already written correctly. Callers are responsible for saying so loudly.
 *
 * The token is read from `VERCEL_TOKEN` and is never logged, never returned in
 * `detail`, and never placed on a command line. Supply it with
 * `vault.ps1 run vercel.twn -EnvVar VERCEL_TOKEN -Cmd …`.
 */
export async function purgeVercelEdge(paths: string[]): Promise<EdgePurgeResult> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    return {
      ok: false,
      paths,
      skipped: true,
      detail: 'VERCEL_TOKEN is not set, so no purge was attempted',
    };
  }
  if (paths.length === 0) {
    return { ok: true, paths, skipped: false, detail: 'nothing to purge' };
  }

  const url = `${ENDPOINT}?projectIdOrName=${encodeURIComponent(projectId())}&teamId=${encodeURIComponent(teamId())}`;

  // No `target`. Omitting it purges every environment for the project, which is
  // still narrow BY PATH — the thing that matters — and removes a whole class
  // of silent no-op where a run guesses the environment wrong and the API
  // cheerfully returns 200 for a tag it never looked at.
  const body = JSON.stringify({ tags: paths });

  // Three attempts, matching the origin revalidate call next to it. A cold
  // edge-API request or a momentary blip must not be the reason a correctly
  // published article stays stale, and deleting an already-deleted tag costs
  // nothing.
  let detail = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body,
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) return { ok: true, paths, skipped: false, detail: `HTTP ${res.status}` };
      // The response body carries Vercel's reason (bad tag, wrong project, no
      // permission). It cannot contain the token, and an operator staring at a
      // 403 needs it.
      const text = await res.text().catch(() => '');
      detail = `HTTP ${res.status}${text ? ` ${text.slice(0, 300)}` : ''}`;
    } catch (err) {
      detail = err instanceof Error ? err.message : String(err);
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 1000));
  }
  return { ok: false, paths, skipped: false, detail };
}
