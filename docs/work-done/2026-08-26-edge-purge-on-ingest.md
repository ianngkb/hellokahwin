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
_"Cache keys are not configurable. To purge the cache you must configure cache
tags."_ Every route in — `next/cache`, `@vercel/functions`, `vercel cache`, the
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

| endpoint                     | what it does                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| `invalidate-by-tags`         | marks entries **stale**; the next request is served the stale copy while it revalidates in the background |
| `dangerously-delete-by-tags` | marks entries **deleted**; the next request fetches from origin before responding                         |

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
specific regression this brief named: the CLI once printed _"Content caches
dropped — the article is visible on the site now"_ while the route did nothing,
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

## 7. HANDOVER TO SPRINT 02 — cold article renders exceed `maxDuration`

**This is not a diagnosis. It is a data set and an exposure.** Root cause is
unestablished and no fix was attempted, deliberately: this sprint is closing and
the thing needs real diagnosis rather than a guess shipped at the end of a
Tuesday. Everything below is measurement plus one reading of it, kept apart on
purpose.

### 7.1 First data point — the 502 this work happened to catch

The **first ever request** to the brand-new probe article URL returned **502**,
verbatim:

```
HTTP/1.1 502 Bad Gateway
X-Vercel-Error: FUNCTION_RESPONSE_STREAM_INCOMPLETE
X-Matched-Path: /artikel/[category]/[slug]
X-Vercel-Cache: MISS
Content-Length: 117
```

```
An internal error occurred with Vercel.
FUNCTION_RESPONSE_STREAM_INCOMPLETE
sin1::q9zhn-1787678537470-7024416af8ba
```

The next request to the same URL returned 200 and it then served `HIT`. Existing
article pages on the same deployment returned 200 throughout. It was flagged in
the first report as "worth a look", which understated it.

### 7.2 The measurements that turned it from an anomaly into a pattern

Measured by the **CEO, 26 Aug 2026**, across live articles — not by this run, and
reproduced here as given:

```
dulang-hantaran      22.0s cold, then 0.12s warm
walimatul-urus        3.7s,  then 21.1s
mas-kahwin-johor      5.6s   (established article)
```

**Cold renders of 5 to 22 seconds on a route that declares `maxDuration = 5`.**
That is the profile that produces a `FUNCTION_RESPONSE_STREAM_INCOMPLETE`: the
platform kills the function mid-stream because the render outran its own declared
ceiling.

One number in that set does not fit the simple story and is worth keeping
visible rather than rounding off: **`walimatul-urus` was SLOWER warm (21.1s) than
cold (3.7s)**. A pure cold-start explanation does not predict that. Whatever is
happening is not only "the first render is expensive".

### 7.3 What the route actually declares and does

- `export const maxDuration = 5` —
  `src/app/(public)/artikel/[category]/[slug]/page.tsx:63`. The comment there
  states its purpose plainly: bot crawls on cold-cache windows used to run this
  function to the 300s Vercel limit, and 5s was chosen so "a stuck render dies
  fast and the instance recovers for the next 50 requests". The 502 is that
  design working as written — it is the visible form of the render being killed.
- The same `maxDuration = 5` is on `[category]/page.tsx:24`,
  `tag/[slug]/page.tsx:25` and `author/[slug]/page.tsx:25`.
- `startDeadlineBudget(4_000)` at `[category]/[slug]/page.tsx:524` — ONE shared
  4s budget across the render's sequential reads (the article payload, then the
  related-articles block), leaving ~1s for the render itself.
- **`generateStaticParams()` returns `[]`** —
  `src/app/(public)/artikel/[category]/[slug]/page.tsx:406`. No article page is
  prerendered at build. **Every article's first render is on-demand and cold**,
  which is what makes 7.4 an exposure rather than a curiosity.
- `export const revalidate = false` at line 56, so the entry is rebuilt only on
  an explicit purge — meaning a cold render is not a rare event bounded by a TTL,
  it is what happens to any URL nobody has fetched since the last deploy.
- `generateMetadata` and the page component are kicked off **concurrently** in
  Next 16 and both reach `getArticlePageData` at the same moment; a React
  `cache()` wrapper is what collapses the duplicate DB fan-out (in-file comment,
  same route, referencing Sentry TWN-NEW-47). If that collapse ever fails to
  apply, a cold render pays its fan-out twice — noted as a thread to pull, not as
  a claim that it is failing.

### 7.4 Why this outranks everything else in this log

`docs/plans/aug-23-2026-session-01/aug-25-2026-baseline-seo-01-gsc-indexing.md`
(SEO-01 baseline, hellokahwin repo) measured against GSC:

| Index state                                        | Count  |
| -------------------------------------------------- | ------ |
| Submitted and indexed                              | **8**  |
| Discovered — currently not indexed (never crawled) | **19** |
| URL is unknown to Google                           | **1**  |

**Twenty of twenty-eight articles have never been crawled.** Eight are indexed,
all in one cluster.

Googlebot's first request to a never-crawled URL **is a cold render**, by
definition — nothing has warmed it. So the exposure is:

> 20 uncrawled URLs × cold-first-request × cold renders measured at 5–22s
> against a 5s ceiling = the first impression Google forms of the pages we most
> want indexed may be a 502.

That is the shape of the risk. It is **not** a demonstration that it has
happened: no GSC crawl-error data was pulled for those URLs in this run, and
SEO-01 records all 28 returning HTTP 200 when it checked them by hand.

### 7.5 What was NOT determined — read this before planning

So that Sprint 02 does not mistake a data set for a diagnosis:

1. **Root cause is unknown.** Not established: whether the time goes to Lambda
   cold start, the Supabase pooler connection, the queries themselves, the
   Tiptap-to-HTML render, or something else.
2. **The warm-slower-than-cold reading (`walimatul-urus`) is unexplained** and
   contradicts the simplest hypothesis.
3. **No Sentry, Vercel function-log or GSC crawl-error data was pulled.** The
   observation here is one 502 plus three externally supplied timings.
4. **No causal link to Googlebot 502s is demonstrated** — only that the profile
   matches and the population is exposed.
5. **No before/after exists**, because nothing was changed. There is also no
   earlier record of `FUNCTION_RESPONSE_STREAM_INCOMPLETE` anywhere in this repo
   to compare against; the absence of prior record is not evidence of a new
   regression, only of nobody having looked.
6. **It is not caused by this work.** The pillar page and the sitemap carry the
   same `tagEdgeResponse` call and both returned 200 on their single proof
   requests, and `maxDuration = 5` predates this sprint. But the possibility that
   the added `await` contributes some milliseconds was not measured, so it is
   stated as unmeasured rather than excluded.

**Recommended first move for Sprint 02, and no further:** measure before
changing anything — Vercel function duration percentiles for
`/artikel/[category]/[slug]`, split cold and warm, alongside GSC crawl-error
data for the 20 uncrawled URLs. Raising `maxDuration` is the obvious response and
would convert a fast 502 into a slow success or a slower timeout; the comment at
line 57 records that the 5s ceiling was itself a considered fix for a worse
behaviour, so it should not be reverted without the data that justified it.

## 8. Files

| file                                                  | what changed                                                                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `src/lib/cache/edge-purge.ts`                         | new. The three paths, the purge call, the two operator notices, and the reasoning                                  |
| `src/lib/cache/edge-tag.ts`                           | new. `tagEdgeResponse()`, and the transcript of the header approach that did not work                              |
| `src/lib/cache/__tests__/edge-purge.test.ts`          | new. Narrowness, and the success sentence living on one branch only                                                |
| `src/app/(public)/artikel/[category]/page.tsx`        | tags its own path                                                                                                  |
| `src/app/(public)/artikel/[category]/[slug]/page.tsx` | tags its own path                                                                                                  |
| `src/app/sitemap.ts`                                  | tags its own path                                                                                                  |
| `scripts/ingest-article.mts`                          | purges the edge after the origin revalidate; pre-flight token warning; the success line moved below the edge purge |
| `next.config.ts`                                      | a comment recording why the tag is NOT declared here                                                               |
| `package.json`                                        | `@vercel/functions`                                                                                                |
| `src/lib/cache/purge.ts`                              | cross-reference to the module that now owns the second cache                                                       |
| `README.md`                                           | new "Caching" section — the two-cache table and the three traps, ahead of "Legacy URL handling"                    |

Gate, run before each push: `pnpm test` 21 files / 237 tests
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
way on purpose. A third, `6002905`, extracted the operator notices and added the
test that holds the success sentence on one branch.

## 9. Retrospective

### What did we learn that is not written down anywhere else?

**Three things, and all three were discovered by measurement rather than by
reading, which is the point.**

1. **The Vercel purge API returns `200` for a cache tag nobody ever stamped.**
   There is no read-back for tags and no error for an unknown one. A green purge
   is proof of acceptance, not of effect. This is the load-bearing one: it is
   what let a completely non-functional implementation pass every check for an
   hour. Anyone writing cache-invalidation code against a green API response is
   standing where this run stood.
2. **`Vercel-Cache-Tag` declared in `next.config.ts` is not read by the CDN's tag
   index.** It is applied by the routing layer. The header appears on the
   response, `:params` interpolate, `next start` confirms it — and purging that
   tag moves nothing. The same is true of Next's implicit `_N_T_/<path>` tag on
   these routes.
3. **`invalidate-by-tags` is the wrong endpoint for a publish**, despite being the
   one Vercel recommends. It marks entries stale and serves the stale copy on the
   next request — the same defect shape as `revalidateTag(tag, 'max')`, one layer
   out.

A fourth, smaller: **the PowerShell tool on this machine has no network egress
unless the sandbox is explicitly disabled**, while Bash does. Since every
vault-injected credential has to travel through PowerShell, every vault-plus-HTTP
call needs the flag. It fails intermittently enough to look like a flaky remote,
which invites retrying instead of fixing.

### Which document must change, and who owns the edit

**Answered honestly first: there is no engineering doctrine document in either
repository.** `docs/plans/…/aug-23-2026-production-doctrine.md` is a
content-strategy document — SERPs, coverage ledgers, competitor analysis — and
putting a Vercel cache trap in it would bury the finding and damage the document.
The `endsprint` doc table has no engineering row, and
`agents/projects/hellokahwin/` has no engineering seat to edit. So the finding
was placed where an engineer actually arrives, and the gap itself is logged as a
decision for the CEO.

| What changed                                                                                                                        | Path                                                                                                                                 | Owner                        |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| **New "Caching" section, ahead of "Legacy URL handling"** — the two-cache table, all three traps, and "Vercel has no purge-by-path" | `README.md` (site repo root)                                                                                                         | this run · **DONE**          |
| **Warning hoisted to the TOP of the file** — "this file is half the story", pointing at the edge modules and the README section     | `src/lib/cache/purge.ts:1`                                                                                                           | this run · **DONE**          |
| **The mechanism, the failed approach and the measurements, in full**                                                                | `src/lib/cache/edge-purge.ts`, `src/lib/cache/edge-tag.ts`                                                                           | this run · **DONE**          |
| **Why the tag is NOT declared here**, at the exact line someone will reach for it                                                   | `next.config.ts:132`                                                                                                                 | this run · **DONE**          |
| **Company-side work-done entry + index row**, so the 502 reaches the CEO's planning surface                                         | `hellokahwin` repo → `docs/work-done/aug-23-2026-session-01/aug-26-2026-done-edge-purge-on-ingest.md` and `docs/work-done/README.md` | this run · **DONE**          |
| Memory note on the PowerShell network sandbox                                                                                       | `~/.claude/projects/…/memory/powershell-tool-has-no-network-unless-sandbox-disabled.md`                                              | this run · **DONE**          |
| **Decide whether an engineering doctrine document should exist**, and where cache/platform findings live if not the site README     | —                                                                                                                                    | **CEO — OPEN**               |
| **Schedule the cold-render diagnosis** (§7)                                                                                         | —                                                                                                                                    | **CEO — OPEN, Sprint 02**    |
| **Resolve the two-work-done-records split** (below)                                                                                 | `skills/endsprint/`, `docs/work-done/README.md`                                                                                      | **CEO / `endsprint` — OPEN** |

The README was chosen over the cache module alone deliberately. The module doc
comment is excellent for someone already editing cache code; it is useless to
someone about to write their first purge call, because they do not know the file
exists. The README is the front door of the repository where that code gets
written, and it already carries operational gotchas ("Legacy URL handling"), so
the section has a precedent to sit next to.

### What did we do twice?

1. **We built the tagging mechanism twice.** The `next.config.ts` header version
   was written, type-checked, tested, built, committed, pushed and deployed to
   production before a measurement showed it did nothing. The second
   implementation shipped 8 minutes later. Cost: one production deployment and
   roughly forty minutes. The cause was assuming that because
   `Vercel-CDN-Cache-Control` from `next.config.ts` demonstrably reaches the CDN,
   `Vercel-Cache-Tag` from the same place would too. **The cheap thing that was
   skipped: the experiment that eventually settled it — warm a page, purge its
   tag, request it once — takes about ninety seconds and could have been run
   against the header approach before writing anything else.** It is written into
   the README now as the only proof that counts.
2. **We wrote the same work-done log into two places, in two formats.** This log
   lives in the site repo (`docs/work-done/2026-08-26-…`, `YYYY-MM-DD-` naming, no
   index); the company's indexed record lives in the other repository
   (`docs/work-done/aug-23-2026-session-01/aug-26-2026-done-…`, README index,
   mandatory Ship-state block). Every deep engineering log this sprint — the
   revalidate route fix, the jsonb double-encoding fix, the production proof, this
   one — exists only in the invisible one. **The §7 cold-render finding, which is
   the most consequential thing in this document, would have stayed there.** The
   bridge was written by hand today. The split is unresolved.
3. **We retried a network call that needed a flag, not a retry** (the PowerShell
   sandbox). Twice, before diagnosing it.

### What did we nearly ship, and what caught it?

**We nearly shipped a purge that did nothing at all, and we did in fact ship it —
to production — for eight minutes.** `4b66373` is live in the git history as a
deployment whose entire purpose was inert.

What caught it was **not** a review, a type, a test or an API response. All four
were green: the build passed, the header was on the response with parameters
substituted, `next start` confirmed it, and the purge API returned `200`. What
caught it was **requesting the page and reading `x-vercel-cache` and `age`** —
`HIT, age: 78` fifteen seconds after a successful purge.

That mechanism is the thing to keep, and it is the same one `@/lib/cache/purge`
already recorded on 25 Aug in a different context: _"Record `x-vercel-cache` and
`age` on every proof request. Without those two headers a stale 200 is
indistinguishable from a fresh one."_ **The lesson was already written down and
was still nearly missed, because it was filed under "how to take publish proof"
rather than under "how to know whether your cache code works".** It is now
generalised in the README as the first of the three traps.

Two smaller near-misses, both caught by process rather than luck:

- **The success sentence nearly stayed attached to the wrong branch.** The first
  implementation printed "Content caches dropped — the article is visible on the
  site now" after the origin revalidate, exactly as before. Extracting it into
  `edgePurgeSuccessNotice()` and writing a test that asserts it appears on no
  other branch is what makes it hold. The test also strips comments before
  asserting, because the script legitimately quotes the sentence when explaining
  the old defect.
- **The proof was nearly run against a cold pillar page**, which would have
  produced a green result that proved nothing — an absent edge entry rebuilds on
  the first request whether or not a purge happened. Deliberately purging and
  re-warming the pillar first, and recording the `HIT` baseline with its byte
  count, is what makes the 200 mean something. That is a deviation from the
  standing "never request the proof URL before publishing" rule and the reason is
  recorded in §4: that rule exists to stop a baseline masking a failure, and here
  the baseline is the control that makes a success measurable.

### What did the sprint process itself get wrong?

The brief was accurate, complete and correctly scoped, and the credential was
where it said it was. Two process observations, neither about this brief:

- **"Verify against Vercel's actual API before relying on it" was followed, and
  was not enough.** The docs were read carefully and the endpoint, method, body
  and plan constraints were all confirmed correct. The docs simply do not state
  which mechanisms attach a tag _in a Next.js app on Vercel_, and the failure mode
  is silent. A brief cannot fix that; only "prove it with a request" can.
- **The 502 was reported as "worth a look" when it deserved a section.** It was
  observed, recorded verbatim and honestly caveated — and then filed under
  caveats, where its significance depended on the reader connecting it to SEO-01.
  The CEO made that connection; this run did not. The rule worth keeping: **an
  anomaly on a path that Googlebot takes is never a caveat.**
