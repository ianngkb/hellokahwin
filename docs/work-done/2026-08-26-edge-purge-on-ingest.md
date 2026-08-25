# 2026-08-26 — The Vercel edge is purged as part of ingest. Proven on one request.

**Brief:** `docs/plans/aug-23-2026-session-01/aug-24-2026-brief-edge-purge-on-ingest.md`
**Branch:** `ianng89/pillars-ingest-redirects` → `master` · **Worktree:** `orca/workspaces/hellokahwin-site/pillars-ingest-redirects`
**Status:** DONE. Shipped to production, proven against production, probe removed
and verified gone. One unexplained observation is recorded in §7 rather than
smoothed over.

---

## 1. What an ingest now purges, and how narrowly

Exactly three paths, and they are computed from the article being written:

```
/artikel/<pillar>/<slug>      the article
/artikel/<pillar>             its pillar page
/sitemap.xml
```

`pathsInvalidatedByIngest()` in `src/lib/cache/edge-purge.ts` is the only thing
that decides, it returns those three and nothing else, and a test asserts the
list, asserts no entry contains `*`, and asserts no entry contains a comma
(Vercel reads a comma as a tag separator, so one comma would silently become two
tags and purge neither page).

The deployment is **not** blanket-purged. `*` is a valid tag and would have been
one line; it also throws away the performance decision the TTL headers exist to
make, which is the same reason the board rejected simply dropping the headers.

A pillar's paginated variants (`?page=2`, `?sub=…`) are separate CDN entries and
are all taken by the one pillar purge, because they share the tag. A path-level
purge would have missed them. That is a side benefit of the mechanism below, not
a design goal.

## 2. The mechanism, and the first attempt that silently did nothing

**Vercel has no purge-by-path.** Verified against the API docs, 26 Aug:
*"Cache keys are not configurable. To purge the cache you must configure cache
tags."* Every route in — `next/cache`, `@vercel/functions`, `vercel cache`, the
REST API, the dashboard button — ends at a tag, and the only tag that reaches
everything is `*`.

So **the tag for a page is its own path**. One rule, no mapping table, nothing to
drift.

The obvious place to declare that tag is `next.config.ts`, beside the
`Vercel-CDN-Cache-Control` that creates the CDN entry in the first place, with
`:category` and `:slug` interpolating from the same `source`. That was the first
implementation. It builds, it deploys, and `next start` returns the header with
the parameters correctly substituted:

```
Vercel-Cache-Tag: /artikel/pantai-santai
```

Against production, on the deployment that shipped it:

```
GET  /artikel/pantai-santai                          x-vercel-cache: MISS
GET  /artikel/pantai-santai                          x-vercel-cache: HIT   age: 15
POST dangerously-delete-by-tags ["/artikel/pantai-santai"]     STATUS: 200
GET  /artikel/pantai-santai                          x-vercel-cache: HIT   age: 29
POST dangerously-delete-by-tags ["/artikel/pantai-santai"]     STATUS: 200
GET  (15 seconds later)                              x-vercel-cache: HIT   age: 78
```

The entry never moved. `next.config.ts` headers are applied by the routing layer
and the CDN's tag index does not read them. Next's own implicit path tag
(`_N_T_/artikel/pantai-santai`) was tried in the same session and did not move it
either — these pages read `searchParams`, so their CDN entry is created by the
TTL header rather than by ISR, and nothing tags them automatically.

**The purge API returns 200 for a tag nobody ever stamped.** Confirmed
deliberately before any of this, by purging `hk-preflight-does-not-exist`:
`STATUS: 200`, empty body. So the header version looked correct from every angle
— the header was on the response, the parameters were substituted, the API said
200 — except the only one that counts. That is worth remembering the next time
this looks easy.

The working version stamps the tag from inside the render with `addCacheTag`
from `@vercel/functions`, which is what Vercel documents for exactly this case.
The pillar page, the article page and `sitemap.ts` each tag themselves with their
own path. The dead approach is kept in the record: a comment in `next.config.ts`
where the next person will reach for it, and the transcript in
`src/lib/cache/edge-tag.ts`.

Same deployment, same experiment, after the change:

```
GET  /artikel/pantai-santai                          x-vercel-cache: MISS
GET  /artikel/pantai-santai                          x-vercel-cache: HIT   age: 6
POST dangerously-delete-by-tags ["/artikel/pantai-santai"]     STATUS: 200
GET  /artikel/pantai-santai                          x-vercel-cache: REVALIDATED   age: 0
```

`REVALIDATED` on the request immediately after the purge is the deliverable: the
entry was deleted and the FIRST request rebuilt in the foreground rather than
being handed the old copy.

### Delete, not invalidate — and the docs say not to

Vercel offers two purges and the recommended one does not solve this problem:

| endpoint | what it does |
|---|---|
| `invalidate-by-tags` | marks entries **stale**; the next request is served the stale copy while it revalidates in the background |
| `dangerously-delete-by-tags` | marks entries **deleted**; the next request fetches from origin before responding |

Serve-stale-then-refresh is the bug, one layer out — the same shape as
`revalidateTag(tag, 'max')` that `@/lib/cache/purge` documents. Only the delete
form makes request #1 correct, which is the whole deliverable. The warning
attached to it is about cache stampede, where one tag names many paths; here a
tag names one page, three of them per ingest, on a site of ~56 published
articles, a few times a week.

## 3. Where the token comes from, and what must be configured

`process.env.VERCEL_TOKEN`. Never hardcoded, never logged, never on a command
line, and it is not returned in any error detail.

- **Local / operator runs.** Wrap the ingest in the vault:
  ```
  vault.ps1 run vercel.twn -EnvVar VERCEL_TOKEN -Cmd pwsh,"-NoProfile","-File",<runner>
  ```
  `vault.ps1 run` sets the variable in the child only. `bootstrapEnv()` loads the
  `.env` files with `override: false`, so an injected value survives; a
  `VERCEL_TOKEN=` line in `.env.local` would work too, and is the weaker option.
- **Vercel / CI.** Nothing to configure. No runtime code path calls the purge —
  only the ingest CLI does — so the deployed app never needs the token. If a
  future scheduled worker purges, it will need `VERCEL_TOKEN` as a project
  environment variable at that point and not before.
- Project and team are identifiers, not credentials, and are defaults in the
  source, overridable with `VERCEL_PROJECT_ID` / `VERCEL_TEAM_ID`. They are read
  at call time, not at module load, so `bootstrapEnv()` can still override them.

`vault.ps1` lives at
`~/Documents/Code/buddy/skillcentral/skills/tokens/vault.ps1`. Two traps, both
confirmed here: `--` confuses its parameter binder, and a bare `bash` on this
machine resolves to WSL and fails.

## 4. The proof — one request

The pillar page was deliberately given a **fresh pre-publish copy at the edge**
first, by purging its tag and then requesting it twice. Without that the proof
measures nothing: an expired or absent entry would rebuild on the first request
regardless of whether the purge did anything. The baseline is the control.

```
UTC 2026-08-25T17:21:29Z
GET https://hellokahwin.com/artikel/pelamin-kad-cenderahati   x-vercel-cache: REVALIDATED  age: 0
GET https://hellokahwin.com/artikel/pelamin-kad-cenderahati   x-vercel-cache: HIT          age: 0
  probe slug in baseline body: 0
  baseline body bytes:      39041
```

Then the ingest, into PRODUCTION:

```
RUN START  2026-08-25T17:21:38.7760659Z
File:   probe-edge-purge.md
Target: aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
Mode:   COMMIT (will write)

Pillar:  Pelamin, Kad & Cenderahati Majlis (P5)
Cluster: Doorgift, bunga telur & hadiah kahwin (C5.4)
Status:  published
Author:  human · review_status pending_review
Images:  1, every one credited
  cover.png  →  "Kredit: HelloKahwin" [G] HelloKahwin
Tags:    (none)
Links:   0 internal, all resolved
URL:     /artikel/pelamin-kad-cenderahati/probe-edge-purge-20260826
  uploaded cover.png (+4 crops)

Done. /artikel/pelamin-kad-cenderahati/probe-edge-purge-20260826 (published)
It will appear on the pillar page under its cluster with no further action.
Content caches dropped and the Vercel edge purged — the article is visible on the
site now. Purged (HTTP 200):
  /artikel/pelamin-kad-cenderahati/probe-edge-purge-20260826
  /artikel/pelamin-kad-cenderahati
  /sitemap.xml

RUN END    2026-08-25T17:21:44.6029549Z
EXIT CODE: 0
```

**Then ONE request to the pillar page. Not two, not a warm-up, not a retry.**

```
UTC 2026-08-25T17:21:49Z
$ curl -s -w 'HTTP_STATUS=%{http_code}' https://hellokahwin.com/artikel/pelamin-kad-cenderahati

HTTP_STATUS=200
```

The status line and cache headers of that same single response:

```
HTTP/1.1 200 OK
X-Vercel-Cache: REVALIDATED
Age: 0
X-Vercel-Id: sin1::iad1::z97hc-1787678509862-5a979945e4ef
```

And whether the new article is listed in **that one response body**:

```
probe slug occurrences in the proof response body: 2
href="/artikel/pelamin-kad-cenderahati/probe-edge-purge-20260826"
PROBE — edge purge verification, 26 Ogos 2026 (padam selepas ujian)

body bytes:  baseline 39041  →  proof 39605   (+564)
```

**200, listed, on the first request.** The 25 Aug comparison, same site, same
pillar shape, without this fix: `x-vercel-cache: STALE`, `age: 717`,
`<meta name="robots" content="noindex, follow">`, 457 seconds after the write.

The sitemap, one request:

```
HTTP_STATUS=200   X-Vercel-Cache: REVALIDATED   Age: 0
probe present: 1     <loc> count: 74   (baseline was 73)
```

## 5. The probe is gone, and verified gone

Undo recorded **before** the write, per the no-recovery-point rule:
`2026-08-26-edge-purge-on-ingest-UNDO.md` and `-UNDO.sql`, naming the exact slug.

```
BEFORE  articles matching slug: 1 [{"id":"bf62e238-09c6-4f64-a8e6-883eb33bbe3c","status":"published"}]
BEFORE  media rows: 1
   r2_key: inspire/probe-edge-purge-20260826/1787678499822-cover.png
deleted media_article_usage: 1
deleted media: 1
deleted article_categories: 2
deleted article_tags: 0
deleted articles: 1
AFTER   articles matching slug: 0
AFTER   media rows for that id: 0
AFTER   published articles total: 56 (was 56 before the probe)
```

R2, all seven objects under the slug's prefix:

```
bucket hellokahwin-images · prefix inspire/probe-edge-purge-20260826/
objects found: 7
deleted inspire/probe-edge-purge-20260826/1787678499822-cover.png
deleted inspire/probe-edge-purge-20260826/1787678499822-cover/crop-16x9-og.webp
deleted inspire/probe-edge-purge-20260826/1787678499822-cover/crop-4.3x1-desktop-hero.webp
deleted inspire/probe-edge-purge-20260826/1787678499822-cover/crop-4x3-article-card.webp
deleted inspire/probe-edge-purge-20260826/1787678499822-cover/crop-4x5-mobile-cover.webp
deleted inspire/probe-edge-purge-20260826/1787678499822-cover/high.webp
deleted inspire/probe-edge-purge-20260826/1787678499822-cover/low.webp
objects remaining under prefix: 0
```

Then the same two purges the ingest does, and one request each:

```
/artikel/pelamin-kad-cenderahati/probe-edge-purge-20260826   HTTP 404  REVALIDATED
/artikel/pelamin-kad-cenderahati                             HTTP 200  REVALIDATED  probe occurrences: 0
/sitemap.xml                                                 HTTP 200  REVALIDATED  probe occurrences: 0  <loc> count: 73
```

Back to 73 URLs and 56 published articles — the numbers it started at. Nothing
else in production was written, read-modify-written, or touched.

## 6. What an operator sees when the purge fails

The success sentence now lives in exactly ONE function,
`edgePurgeSuccessNotice()`, printed only on the branch where both caches are
actually clear. A unit test asserts it never appears in the failure notice and
that the ingest script does not print it anywhere of its own. That is the
specific regression this brief named: the CLI once printed *"Content caches
dropped — the article is visible on the site now"* while the route did nothing,
and that sentence is why the original bug survived review.

Failure is **loud and does not fail the publish**. Literal output, both modes,
the second one from a real 403 off the live API:

```
  ════════════════════════════════════════════════════════════════════
  ⚠  THE VERCEL EDGE WAS NOT PURGED. The article is published and the
     origin is correct, but readers — Googlebot included — can be
     served the PRE-PUBLISH page for up to 5 minutes:
       https://hellokahwin.com/artikel/pelamin-kad-cenderahati/bunga-telur
       https://hellokahwin.com/artikel/pelamin-kad-cenderahati
     and the sitemap for up to an hour:
       https://hellokahwin.com/sitemap.xml

     Reason: VERCEL_TOKEN is not set, so no purge was attempted

     Re-run the ingest under the vault to purge, or wait out the TTL
     before inviting a crawl.
  ════════════════════════════════════════════════════════════════════
```

```
  ════════════════════════════════════════════════════════════════════
  ⚠  THE VERCEL EDGE WAS NOT PURGED. The article is published and the
     origin is correct, but readers — Googlebot included — can be
     served the PRE-PUBLISH page for up to 5 minutes:
       https://hellokahwin.com/artikel/pelamin-kad-cenderahati/bunga-telur
       https://hellokahwin.com/artikel/pelamin-kad-cenderahati
     and the sitemap for up to an hour:
       https://hellokahwin.com/sitemap.xml

     Reason: HTTP 403 {"error":{"code":"forbidden","message":"Not authorized","invalidToken":true}}

     Retry the purge, or wait out the TTL before inviting a crawl.
  ════════════════════════════════════════════════════════════════════
```

It names the URLs that are stale, in full, and the window — because "the purge
failed" is not something an operator can act on and "do not invite a crawl of
these two URLs for five minutes" is. It carries Vercel's own reason verbatim,
because a 403 and a DNS failure need different responses.

**The exit code stays 0**, and that is a deliberate difference from the origin
revalidate immediately above it, which exits 2. The two failures are not the same
size: a failed revalidate leaves the article invisible indefinitely, a failed
edge purge leaves it correct and up to five minutes late. A degradation is not a
corruption, so the publish stands. For the same reason a missing `VERCEL_TOKEN`
**warns before the write** rather than refusing, where a missing `CRON_SECRET`
still refuses.

The honest limit, documented at the call site: a 200 from the purge API proves
the request was accepted, not that any cache entry matched. There is no read-back
for tags. The only proof a reader gets fresh HTML is a request to the page, which
is why §4 is a request and not an API response.

## 7. One thing that happened and is not explained

The **first ever request** to the brand-new article URL returned **502**:

```
HTTP/1.1 502 Bad Gateway
X-Vercel-Error: FUNCTION_RESPONSE_STREAM_INCOMPLETE
X-Matched-Path: /artikel/[category]/[slug]
X-Vercel-Cache: MISS
```

The next request to the same URL returned 200, and it then served `HIT`. Existing
article pages on the same deployment returned 200 throughout.

What is known: that route sets `maxDuration = 5` and makes sequential database
reads under a 4s shared budget, and this was a cold function rendering a slug
that had existed for six seconds. That is the plausible cause and it predates
this work. What is **not** known: it was not root-caused, and no earlier record of
`FUNCTION_RESPONSE_STREAM_INCOMPLETE` exists in this repo to compare against. It
is not evidence that the purge failed — the pillar and the sitemap both carry the
same `tagEdgeResponse` call and both returned 200 on their single request — but it
is not nothing either, and a first-request 502 on a newly published article is
exactly the request Googlebot might make. **Worth a look before the next batch
publish.**

## 8. Files

| file | what changed |
|---|---|
| `src/lib/cache/edge-purge.ts` | new. The three paths, the purge call, the two operator notices, and the reasoning |
| `src/lib/cache/edge-tag.ts` | new. `tagEdgeResponse()`, and the transcript of the header approach that did not work |
| `src/lib/cache/__tests__/edge-purge.test.ts` | new. Narrowness, and the success sentence living on one branch only |
| `src/app/(public)/artikel/[category]/page.tsx` | tags its own path |
| `src/app/(public)/artikel/[category]/[slug]/page.tsx` | tags its own path |
| `src/app/sitemap.ts` | tags its own path |
| `scripts/ingest-article.mts` | purges the edge after the origin revalidate; pre-flight token warning; the success line moved below the edge purge |
| `next.config.ts` | a comment recording why the tag is NOT declared here |
| `package.json` | `@vercel/functions` |
| `src/lib/cache/purge.ts` | cross-reference to the module that now owns the second cache |

Gate, run before each of the two pushes: `pnpm test` 21 files / 237 tests
passed, `pnpm typecheck` exit 0, `pnpm build` exit 0, `eslint` exit 0 and
`prettier --check` clean on every file listed above.

`pnpm lint` repo-wide still fails on 88 files, all of them untracked `.tmp-*`
scratch files and `docs/work-done/` markdown belonging to other sessions in this
shared worktree. Not touched, not mine to reformat.

Two commits, both fast-forward pushes to `master`, both deployed by the git
integration:

```
4b66373  fix(ingest): purge the Vercel edge for the exact paths an ingest invalidates
baae7fe  fix(cache): stamp the edge cache tag from the render, not from next.config
```

The second exists because the first did not work, and it is on the record that
way on purpose.
