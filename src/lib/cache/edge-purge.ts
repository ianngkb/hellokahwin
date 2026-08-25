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
 * So the path IS the tag. Each cached route stamps a tag equal to its own URL
 * path — `@/lib/cache/edge-tag`, called from the render — and this module
 * purges by the paths it is handed. One rule, no mapping table, nothing to
 * drift: **the tag for a page is its path.** A useful side effect is that a
 * pillar's paginated variants (`?page=2`, `?sub=…`) are separate CDN entries
 * under the same tag, so one purge takes all of them — which a path-level purge
 * would not have done.
 *
 * The tag has to be stamped from inside the render, not declared as a header in
 * `next.config.ts`. That was tried first and silently does nothing; the
 * measurements are in `@/lib/cache/edge-tag`.
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

const SITE = 'https://hellokahwin.com';

/**
 * What the operator is told when the purge worked.
 *
 * It is the ONLY place allowed to say the caches are clear, and it exists as a
 * function so that claim and the failure notice below can be asserted in a
 * test. "Content caches dropped — the article is visible on the site now"
 * printing while a reader still got the pre-publish page is the exact failure
 * that let the original bug survive review; a unit test is cheap insurance
 * against someone re-attaching that sentence to the wrong branch.
 */
export function edgePurgeSuccessNotice(result: EdgePurgeResult): string {
  return (
    'Content caches dropped and the Vercel edge purged — the article is visible on the\n' +
    `site now. Purged (${result.detail}):\n` +
    result.paths.map((p) => `  ${p}`).join('\n')
  );
}

/**
 * What the operator is told when the purge did NOT work.
 *
 * Three properties, all deliberate and all asserted in
 * `edge-purge-notices.test.ts`:
 *
 *  1. It never contains the success sentence. A degraded run must not read like
 *     a clean one at a glance.
 *  2. It names the URLs that are actually stale, in full, and the window they
 *     are stale for — because "the purge failed" is not something an operator
 *     can act on, and "do not invite a crawl of these two URLs for five
 *     minutes" is.
 *  3. It carries Vercel's own reason verbatim. A 403 and a DNS failure need
 *     different responses and only the literal detail separates them.
 */
export function edgePurgeFailureNotice(result: EdgePurgeResult): string {
  const pages = result.paths.filter((p) => p !== '/sitemap.xml');
  return (
    '\n' +
    '  ════════════════════════════════════════════════════════════════════\n' +
    '  ⚠  THE VERCEL EDGE WAS NOT PURGED. The article is published and the\n' +
    '     origin is correct, but readers — Googlebot included — can be\n' +
    '     served the PRE-PUBLISH page for up to 5 minutes:\n' +
    pages.map((p) => `       ${SITE}${p}\n`).join('') +
    '     and the sitemap for up to an hour:\n' +
    `       ${SITE}/sitemap.xml\n` +
    '\n' +
    `     Reason: ${result.detail}\n` +
    '\n' +
    (result.skipped
      ? '     Re-run the ingest under the vault to purge, or wait out the TTL\n' +
        '     before inviting a crawl.\n'
      : '     Retry the purge, or wait out the TTL before inviting a crawl.\n') +
    '  ════════════════════════════════════════════════════════════════════'
  );
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

  // Every batch is sent separately, and a batch that fails fails the whole
  // purge. Found 26 Aug 2026 by SEO-02, which changed 45 articles in one pass
  // and asked for 58 paths: the API answered
  //   400 `tags` should NOT have more than 16 items
  // and NOTHING was purged. The ingest path never met this because
  // `pathsInvalidatedByIngest` returns exactly three paths, so the ceiling sat
  // one article below the first batch job that would ever hit it. A cap that
  // only breaks above a batch size nobody has used yet is not a safe cap.
  for (let i = 0; i < paths.length; i += MAX_TAGS_PER_REQUEST) {
    const batch = paths.slice(i, i + MAX_TAGS_PER_REQUEST);
    // The endpoint also allows only MAX_REQUESTS_PER_WINDOW calls per minute.
    // Spacing the batches costs a publish about twelve seconds and is the
    // difference between a purge that completes and one that 429s halfway,
    // leaving an arbitrary subset of pages stale with no record of which.
    if (i > 0) await new Promise((r) => setTimeout(r, REQUEST_SPACING_MS));
    const result = await purgeBatch(url, token, batch);
    // `paths` on the result stays the FULL list on failure: the operator needs
    // to know every path still stale, not just the batch that happened to fail.
    if (!result.ok) return { ok: false, paths, skipped: false, detail: result.detail };
  }
  return {
    ok: true,
    paths,
    skipped: false,
    detail: `HTTP 200 in ${Math.ceil(paths.length / MAX_TAGS_PER_REQUEST)} request(s)`,
  };
}

/** Vercel's documented ceiling on `tags` per purge request. */
const MAX_TAGS_PER_REQUEST = 16;
/** And on purge requests per minute, measured against the live API 26 Aug 2026. */
const MAX_REQUESTS_PER_WINDOW = 5;
const REQUEST_SPACING_MS = Math.ceil(60_000 / MAX_REQUESTS_PER_WINDOW) + 500;
/** Cap on how long a single 429 may hold a publish up. */
const MAX_RATE_LIMIT_WAIT_MS = 90_000;

async function purgeBatch(
  url: string,
  token: string,
  batch: string[],
): Promise<{ ok: boolean; detail: string }> {
  // No `target`. Omitting it purges every environment for the project, which is
  // still narrow BY PATH — the thing that matters — and removes a whole class
  // of silent no-op where a run guesses the environment wrong and the API
  // cheerfully returns 200 for a tag it never looked at.
  const body = JSON.stringify({ tags: batch });

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
      if (res.ok) return { ok: true, detail: `HTTP ${res.status}` };
      // The response body carries Vercel's reason (bad tag, wrong project, no
      // permission). It cannot contain the token, and an operator staring at a
      // 403 needs it.
      const text = await res.text().catch(() => '');
      detail = `HTTP ${res.status}${text ? ` ${text.slice(0, 300)}` : ''}`;

      if (res.status === 429) {
        // The one 4xx worth waiting out. Vercel returns the reset instant, so
        // sleep to it rather than guessing — and cap the wait so a stuck limit
        // degrades to "purge failed" instead of hanging a publish.
        const wait = Math.min(rateLimitWaitMs(text), MAX_RATE_LIMIT_WAIT_MS);
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }
        return { ok: false, detail };
      }
      // Every other 4xx is a fact about the request, not a blip: the same body
      // will get the same answer. Retrying it twice more only spends the
      // five-per-minute budget that the NEXT batch needs. This is how the
      // 16-tag 400 above turned into a 429 on the retry.
      if (res.status >= 400 && res.status < 500) return { ok: false, detail };
    } catch (err) {
      detail = err instanceof Error ? err.message : String(err);
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 1000));
  }
  return { ok: false, detail };
}

/**
 * How long to wait out a 429, read from Vercel's own reset timestamp.
 *
 * The body carries `limit.reset` as epoch MILLISECONDS. Falls back to the full
 * window when the shape is anything else, because guessing short is the
 * expensive direction: it spends another request and re-arms the limit.
 */
export function rateLimitWaitMs(body: string, now: number = Date.now()): number {
  try {
    const reset = JSON.parse(body)?.error?.limit?.reset;
    if (typeof reset === 'number' && Number.isFinite(reset)) {
      // Tolerate seconds as well as milliseconds — a ten-digit value is
      // seconds, and treating it as ms would compute a wait in 1970.
      const ms = reset < 1e12 ? reset * 1000 : reset;
      const delta = ms - now;
      if (delta > 0) return delta + 1_000;
    }
  } catch {
    // fall through
  }
  return 61_000;
}
