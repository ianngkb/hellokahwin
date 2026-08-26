# The Vercel edge is purged as part of ingest — and cold article renders are exceeding `maxDuration`, undiagnosed — 26 Ogos 2026

**Session:** aug-23-2026-session-01 · **Owner:** BMAD · **Status:** completed
**Plan:** [aug-24-2026-brief-edge-purge-on-ingest.md](../../plans/aug-23-2026-session-01/aug-24-2026-brief-edge-purge-on-ingest.md)

**Full engineering log, with every measurement:**
`hellokahwin-site` repo → `docs/work-done/2026-08-26-edge-purge-on-ingest.md`
(worktree `orca/workspaces/hellokahwin-site/pillars-ingest-redirects`). This
entry exists because that log lives in the OTHER repository and is therefore
invisible to this index — see Follow-ups.

## What was done

An ingest now deletes the Vercel CDN copy of exactly the three paths it
invalidates — the article, its pillar, and `/sitemap.xml` — so the pillar page is
correct on the FIRST request after a publish rather than up to five minutes
later. The interim rule "publish, wait five minutes, then invite the crawl" is
retired.

The `Vercel-CDN-Cache-Control` headers stay. They were the board's performance
decision and the deployment is not blanket-purged.

Three findings that cost time and are now written where the next person will
hit them (README of the site repo, "Caching"):

1. **The Vercel purge API returns `200` for a cache tag nobody ever stamped.**
   No read-back, no error. A green purge call proves acceptance, not effect.
2. **`Vercel-Cache-Tag` declared in `next.config.ts` is not read by the CDN's
   tag index.** It appears on the response, interpolates correctly, and purging
   it moves nothing. Tags must be stamped from inside the render.
3. **`invalidate-by-tags` marks entries stale and serves the stale copy on the
   next request** — the same defect shape as `revalidateTag(tag, 'max')`, one
   layer out. Only the `dangerously-delete` form makes request #1 correct.

## Ship state

**Commit:** `4b66373` fix(ingest): purge the Vercel edge for the exact paths an ingest invalidates · `baae7fe` fix(cache): stamp the edge cache tag from the render, not from next.config · `6002905` test(cache): put the success sentence on one branch and hold it there · `97b0837` docs(cache): put the three cache traps where someone reaches before writing purge code
**On `origin/master`:** yes — all four, pure fast-forward pushes
**Deployed:** `dpl_7ZA6UoQ7bWGuTJxHoiRnmSg82AGw` READY, aliased to hellokahwin.com, sha `6002905`. `97b0837` is docs plus one comment block and needs no deployment of its own.
**Still uncommitted in the tree:** nothing belonging to this task — see Evidence

## Evidence

Ship-state check, run in the site worktree:

```
$ git status --porcelain -- src/ scripts/
 M src/lib/cache/purge.ts
 M src/lib/inspire/article-file.ts
?? scripts/audit-live-images.mts
?? scripts/covers/
?? scripts/generate-cover-graphics.mts

$ git log --oneline origin/master..HEAD
f01a13a style(seo): drop the unused destructured bindings eslint flagged
7c63287 fix(seo): stop nofollowing our own internal links
```

**Not all of that is this task's.** `src/lib/inspire/article-file.ts` and the
three `scripts/` paths belong to other sessions in the shared worktree and are
still uncommitted. `src/lib/cache/purge.ts` was this task's documentation
pointer and was committed as `97b0837` immediately after this check.

`f01a13a` and `7c63287` are another session's SEO fix. At the moment of the
check above they were committed to the shared branch and unpushed, so shipping
this task's docs commit would have shipped them too — which is why it was held.
That session pushed them itself a few minutes later, `97b0837` then went up
alone as a clean fast-forward, and `origin/master` now stands at `97b0837` with
nothing unpushed. Recorded because the hold was a real decision, not a delay.

**The proof, one request, verbatim.** The pillar was first given a fresh
pre-publish edge copy (`HIT`, 39041 bytes, probe absent) so the proof measures
the purge and not an empty cache. Then the ingest, then exactly one request:

```
UTC 2026-08-25T17:21:49Z
HTTP_STATUS=200
HTTP/1.1 200 OK
X-Vercel-Cache: REVALIDATED
Age: 0

probe slug occurrences in that response body: 2
body bytes: 39041 -> 39605
```

**200, article listed, first request.** For contrast, the same shape on 25 Aug
without this fix: `x-vercel-cache: STALE`, `age: 717`, `noindex`, 457 seconds
after the write.

Throwaway probe removed and verified: article `404`, pillar and sitemap clean,
back to 56 published articles and 73 sitemap URLs — the numbers it started at.
All 7 R2 objects deleted. Undo was recorded BEFORE the write.

Gate before each push: `pnpm typecheck` 0, `pnpm build` 0, eslint 0, prettier
clean on every changed file. `pnpm test` was 21 files / 237 tests passed for the
three code pushes and 22 files / 250 tests passed for the docs push — the suite
grew between them because another session landed the SEO-02 tests.

## What it changed

- A published article is visible on its pillar and in the sitemap on the first
  request, not the second and not five minutes later. Googlebot crawling
  immediately after a publish no longer sees the pre-publish, `noindex` hub.
- The "wait five minutes with a stopwatch" rule is gone.
- A failed purge is now unmissable and still does not fail the publish: the
  operator gets a boxed warning naming the stale URLs and their TTLs, and the
  sentence "the article is visible on the site now" can no longer be printed
  unless both caches are actually clear — enforced by a test, because that
  sentence printing falsely is what let the original bug survive review.

## Follow-ups

1. **COLD ARTICLE RENDERS EXCEED `maxDuration = 5`. Undiagnosed. For Sprint 02.**
   The first request ever made to the new article URL returned
   `502 FUNCTION_RESPONSE_STREAM_INCOMPLETE`. The CEO then measured live
   articles on 26 Aug: `dulang-hantaran` 22.0s cold then 0.12s warm;
   `walimatul-urus` 3.7s then 21.1s; `mas-kahwin-johor` 5.6s. That is 5–22s on a
   route declaring `maxDuration = 5`
   (`src/app/(public)/artikel/[category]/[slug]/page.tsx:63`), and
   `generateStaticParams()` returns `[]` (line 406) so **every article's first
   render is cold and on demand**.
   Why it matters: SEO-01 found **20 of 28 articles have never been crawled**,
   and Googlebot's first request to an uncrawled URL IS a cold render — so the
   first impression on the twenty URLs we most want indexed may be a 502.
   **Root cause is NOT established**, no fix was attempted, and one reading
   (`walimatul-urus` slower warm than cold) contradicts the simplest hypothesis.
   Section 7 of the engineering log carries the full data and an explicit list
   of what was not determined. Measure before changing anything; the 5s ceiling
   was itself a considered fix for a worse behaviour.
   **Owner: CEO to schedule in Sprint 02.**
2. **Two work-done records exist and neither knows about the other.** Deep
   engineering logs from this sprint — the revalidate route fix, the jsonb
   double-encoding fix, the production proof, and this one — live only in
   `hellokahwin-site/docs/work-done/` with a `YYYY-MM-DD-` naming convention and
   no index. This folder is the indexed company record and uses
   `<mon>-<dd>-<yyyy>-done-`. The 502 above nearly stayed in the invisible one.
   This entry is the manual bridge; the split itself is unresolved.
   **Owner: CEO / `endsprint` process.**
3. **No engineering doctrine document exists in either repo.** The three cache
   traps had no home a person consults before writing cache code, so they went
   into the site repo's `README.md`. `aug-23-2026-production-doctrine.md` is a
   content-strategy document and would have been the wrong place.
   **Owner: CEO — decide whether an engineering doctrine doc is worth creating.**
