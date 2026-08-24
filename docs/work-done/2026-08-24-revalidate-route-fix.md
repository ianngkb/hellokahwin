# 2026-08-24 — The revalidate route did not revalidate

**Brief:** `docs/plans/aug-23-2026-session-01/aug-24-2026-brief-revalidate-fix.md`
**Branch:** `ianng89/pillars-ingest-redirects` · **Worktree:** `orca/workspaces/hellokahwin-site/pillars-ingest-redirects`
**Status:** fixed and proven locally. **Not deployed** — production deploys need board approval.

---

## 1. The mechanism

Not "the route is never invoked", not "the wrong path", not "a tag nothing is
subscribed to", and not a race with the ingest write. The route was invoked, was
authenticated, returned 200, and named the right tags. **It asked Next to mark
those tags stale rather than expired**, and a stale entry is served once more
before it is refreshed.

The offending line, present at 48 call sites across the app:

```ts
revalidateTag('articles', 'max');
```

The second argument reads like an intensity — _purge as hard as possible_. It is
a **cacheLife profile name**, and `max` is the longest life Next ships. Traced
through the installed Next 16.1.6, in `node_modules/next/dist/server`:

| Step | File                                          | What happens                                                                          |
| ---- | --------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1    | `web/spec-extension/revalidate.js`            | records `{ tag, profile: 'max' }`                                                     |
| 2    | `revalidation-utils.js`                       | resolves the profile and passes `{ expire: cacheLife.expire }` to every cache handler |
| 3    | `config-shared.js`                            | the `max` profile's `expire` is `60*60*24*365` — **one year**                         |
| 4    | `incremental-cache/file-system-cache.js`      | stamps the tag `{ stale: now, expired: now + 31_536_000_000 }`                        |
| 5    | `incremental-cache/tags-manifest.external.js` | `areTagsExpired()` asks `expired <= now` → **no**; `areTagsStale()` → **yes**         |
| 6    | `web/spec-extension/unstable-cache.js`        | `if (cacheEntry.isStale) { …queue a background revalidation… } return cachedResponse` |

Step 6 is the defect in one line: on a stale hit the **cached value is returned
to the caller** and the fresh value is computed in the background. So the first
request after a write serves the pre-write page, and the second serves the new
one. Exactly the observed "warm the URL twice" behaviour, and not a Vercel quirk
— it is what the argument means.

### What actually fails, which is not what it looked like

The article's own URL was never the failing surface. A brand-new slug has no
cache entry, so there is nothing stale to serve — it renders fresh and returns
200 on the first request, before and after this fix.

What fails is **every page that lists the article**: the pillar page, the
sitemap, and — the one that matters for SEO — the pillar's own indexability
decision, which is an `unstable_cache` entry tagged `articles` /
`inspire-categories` with `revalidate: false`. On the first crawl after an
ingest, the pillar therefore still answers "nothing is published beneath me" and
serves `noindex, follow`. That is precisely the exposure the brief describes.

## 2. Reproduction, before any code changed

Production build (`pnpm build`, Next 16.1.6) served by `next start` against the
local throwaway Postgres mirror that `.env.local` already points at. One article
ingested into pillar P1 via `pnpm ingest … --commit --publish`, which POSTs
`/api/cron/revalidate-content` itself.

```
== STEP 1: warm the pillar page ==
  GET /artikel/nikah-undang-undang -> 200
  article links on pillar page BEFORE ingest: 0

== STEP 2: ingest ==
  Done. /artikel/nikah-undang-undang/zz-revalidate-probe (published)
  Content caches dropped — the article is visible on the site now.

== STEP 3: EXACTLY ONE request to the new article URL ==
  GET /artikel/nikah-undang-undang/zz-revalidate-probe -> 200

== STEP 4: EXACTLY ONE request to the pillar page ==
  GET /artikel/nikah-undang-undang -> 200
  article links on pillar page AFTER ingest, request #1: 0      <-- WRONG

== STEP 5: second request (diagnostic only) ==
  article links on pillar page AFTER ingest, request #2: 1      <-- appears
```

And the SEO consequence, from the same two responses:

```
robots meta, pillar request #1:  <meta name="robots" content="noindex, follow"
robots meta, pillar request #2:  (absent — indexable)

sitemap.xml request #1 after ingest: probe URL present = 0
sitemap.xml request #2 after ingest: probe URL present = 1
```

Note the ingest CLI printed _"Content caches dropped — the article is visible on
the site now."_ It was not. The route returned 200 while doing almost nothing,
which is why this survived review.

## 3. What changed

| File                                                    | Change                                                                                                                                               |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/cache/purge.ts`                                | **New.** Exports `PURGE_IMMEDIATELY = { expire: 0 }`, with the full trace above as its doc comment so the next person does not have to re-derive it. |
| `src/app/api/cron/revalidate-content/route.ts`          | Both `revalidateTag` calls now pass `PURGE_IMMEDIATELY`; the comment that claimed `'max'` was correct is replaced with what actually happened.       |
| `src/app/api/cron/publish-scheduled/route.ts`           | Same substitution.                                                                                                                                   |
| `src/app/(admin)/admin/inspire/**/actions.ts` (8 files) | Same substitution — 46 further call sites.                                                                                                           |
| `src/lib/inspire/article-cache.ts`                      | Comment updated so it no longer documents the removed argument.                                                                                      |
| `src/lib/cache/__tests__/purge.test.ts`                 | **New.** Walks the source tree and fails if any `revalidateTag` call passes anything but `PURGE_IMMEDIATELY`.                                        |

**Why all 48 and not just the route.** The brief names the cron route, but the
identical wrong argument sits in every admin write path. An editor saving an
article had the same one-request-stale defect, from the same cause. Fixing one
and leaving 47 would have left the bug in place under a different trigger.

**Why `{ expire: 0 }` and not the alternatives.**

- `revalidateTag(tag)` with no second argument _does_ purge immediately, but Next
  16.1.6 prints a deprecation warning on every call.
- `updateTag(tag)` is the sanctioned immediate purge, but it **throws** in a
  Route Handler (`updateTag can only be called from within a Server Action`,
  E872) — and the ingest CLI arrives through exactly such a handler. It is
  unavailable where it is needed most.
- `{ expire: 0 }` is the documented `CacheLifeConfig` form. Step 4 stamps
  `expired = now`, so `areTagsExpired()` is true on the very next read and the
  entry is a MISS rather than a stale hit. `revalidate()` additionally
  special-cases `expire === 0` to mark the path revalidated, giving the same
  read-your-own-writes semantics as the no-argument form, without the warning.

**The regression guard is not decorative.** A unit test on the constant would
not have caught this defect — the constant was never wrong, the argument at the
call sites was. The guard was verified by reintroducing `'max'` into the route:

```
AssertionError: expected [ Array(1) ] to deeply equal []
+   "app\api\cron\revalidate-content\route.ts: revalidateTag('articles', 'max')"
```

## 4. The proof — one request

Rebuilt (`pnpm build`, exit 0), restarted, probe article deleted, identical
script re-run:

```
== STEP 1: warm the pillar page ==
  GET /artikel/nikah-undang-undang -> 200
  article links on pillar page BEFORE ingest: 0

== STEP 3: EXACTLY ONE request to the new article URL ==
  GET /artikel/nikah-undang-undang/zz-revalidate-probe -> 200

== STEP 4: EXACTLY ONE request to the pillar page ==
  GET /artikel/nikah-undang-undang -> 200
  article links on pillar page AFTER ingest, request #1: 1      <-- FIXED
```

On that same single pillar response the `noindex, follow` meta is **absent** —
the hub is indexable on the first crawl. `GET /sitemap.xml -> 200`, probe URL
present on request #1. The article page's single response carried
`<title>Ujian Revalidate Probe (Buang Selepas Guna) | HelloKahwin</title>`.

Gates: `pnpm test` 223 passed / 19 files · `pnpm typecheck` clean ·
`pnpm lint` 0 errors (118 pre-existing warnings), Prettier clean ·
`pnpm build` exit 0.

## 5. Data hygiene

- **No production data was written.** `.env.local` already pointed at a
  throwaway local Postgres mirror; the whole cycle ran there. `--skip-media`
  meant R2 was never touched either.
- The throwaway article `zz-revalidate-probe` was deleted after the proof.
  Verified: `articles named probe: 0, media named probe: 0`, mirror back to its
  original 30 articles, `orphan media_article_usage rows: 0, orphan media rows: 0`.
- The local mirror was one migration behind (`0003_article_authorship`). Applied
  it **to the local database only**, behind an explicit refusal guard on any
  non-localhost URL.
- The eight C2.4 articles were not touched and remain unpublished.

## 6. Open items for the board

1. **This is not deployed.** The fix is proven against a production build with
   Next's own filesystem cache handler. On Vercel the handler is Vercel's, and it
   receives the same `{ expire: 0 }` durations through the same interface — but
   that specific handler cannot be exercised without a deploy. First action after
   approval should be to repeat exactly this test against production and confirm
   the pillar lists the article on request #1.
2. **A second, independent staleness source remains, and it is not this bug.**
   `next.config.ts` sets `Vercel-CDN-Cache-Control: s-maxage=300,
stale-while-revalidate=600` on `/artikel/:category` and
   `/artikel/:category/:slug`. That is a CDN cache, separate from the tag system.
   A brand-new article URL has no CDN entry so it is unaffected, but a pillar page
   can serve an edge copy up to 5 minutes old. Flagged, not changed — it is a
   deliberate performance setting and narrowing it is a business call.
3. The branch's last recorded code-review verdict predates this work; a fresh
   review verdict for this HEAD accompanies the ship report.
