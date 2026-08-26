# RISK-06 + RISK-04 — the publishing gate (26 Aug 2026)

Sprint 02. Two items in one brief because they compose and because two agents in
one worktree collide. RISK-06 first, as instructed: it protects everything else
the sprint ships.

Undo: [`2026-08-26-publishing-gate-UNDO.md`](./2026-08-26-publishing-gate-UNDO.md).
Raw evidence: [`2026-08-26-publishing-gate-EVIDENCE/`](./2026-08-26-publishing-gate-EVIDENCE).

---

# RISK-06 — the 365-day stale window

## The symptom WAS reproduced, deliberately, before anything was changed

The brief said to attempt this and to say so plainly if it failed. It did not
fail. It reproduced on the first attempt, at a rate nobody had guessed.

**Method** (`EVIDENCE/repro-stale-shell.mjs`). The Sprint-01 lesson was that a
sweep against a warm cache proves nothing because it re-renders nothing. So:
expire the `articles` tag through `/api/cron/revalidate-content`, then put 12
requests in flight at once against all 61 published articles, each with a
`?_r06=` parameter that defeats the edge but changes no route param and no
content. 26 Aug 2026, 13:12 UTC, against production.

```
=== coldA — mode=storm bust=1787749934A concurrency=12 ===
requests            : 61 (wall 27412 ms)
x-vercel-cache mix  : {"MISS":54,"REVALIDATED":7}
non-200             : 0
STALE SHELLS FOUND  : 50
```

**50 of 61 — 82% of cold concurrent renders.** Every one of them:

```
  https://hellokahwin.com/artikel/busana-pengantin/baju-pengantin-sewa-atau-beli?_r06=1787749934A
    x-vercel-cache : MISS   age: 0
    cache-control  : s-maxage=600, stale-while-revalidate=31535400
    <title>        : "HelloKahwin — Idea & Panduan Perkahwinan Malaysia"
    canonical      : null
    og:title       : null
    og:url         : null
    og:image       : null
    <h1>           : "Baju pengantin: sewa atau beli, dan kos sebenar 2026"
    JSON-LD headline: "Baju pengantin: sewa atau beli, dan kos sebenar 2026"
```

Site-default homepage title, no canonical, no og — with a correct H1 and correct
JSON-LD. That is the reviewer's report, character for character.

**And the edge held it.** Six and a half minutes later, the same 50 URLs,
re-requested with no purge in between (`EVIDENCE/restale.mjs`):

```
=== staleA — 2026-08-26T13:19:01.506Z ===
x-vercel-cache mix : {"STALE":50}
SHELLS SERVED STALE: 50

  https://hellokahwin.com/artikel/busana-pengantin/baju-pengantin-sewa-atau-beli?_r06=1787749934A
    x-vercel-cache : STALE   age: 395
    cache-control  : s-maxage=600, stale-while-revalidate=31535400
    <title>        : "HelloKahwin — Idea & Panduan Perkahwinan Malaysia"
    canonical      : null
    og:title       : null
    <h1>           : "Baju pengantin: sewa atau beli, dan kos sebenar 2026"
```

50 of 50 STALE, all still serving the shell. **This is the confirmed symptom on a
confirmed STALE response, which is exactly what the definition of done asked
for.** It is no longer an exposure with a plausible mechanism.

### Why the CEO could not reproduce it, and why this could

The CEO fetched pages one at a time against a warm cache. The shell is not a
property of a page; it is a property of a RACE, and the race only exists when
the data cache is cold and several renders are competing.

`src/app/(public)/artikel/[category]/[slug]/page.tsx:430-434`:

```ts
  let pageData;
  try {
    pageData = await withDeadline(getArticlePageData(slug), 1_500, `inspire-article-meta:${slug}`);
  } catch {
    return {};
  }
```

`generateMetadata` gets 1.5 seconds. The page component gets the page-level
`maxDuration = 5` and per-query `withDeadline(3_000)`. On a cold cache against
the 5-wide postgres pool, metadata loses and the page wins — measured render
times in the storm were p50 3.7s, p90 6.4s, so 1.5s was never going to survive.
`return {}` then falls through to the root layout's `title.default`, and a page
with no metadata of its own has no canonical and no og tags either.

**A publish is precisely the event that creates this condition**, because a
publish expires the `articles` tag and a crawler arriving afterwards is the
concurrency.

## The fix

`next.config.ts`:

```diff
+ expireTime: 3600,
```

Next builds `Cache-Control` as `s-maxage=<revalidate>,
stale-while-revalidate=<expireTime - revalidate>`
(`next/dist/server/lib/cache-control.js:13`). `expireTime` defaults to
`31536000` — hence `31536000 - 600 = 31535400`. Nothing in this app chose that
number.

And `/sitemap.xml`, whose `Cache-Control` is set explicitly and therefore does
not inherit `expireTime`:

```diff
- value: 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
+ value: 'public, max-age=300, s-maxage=3600, stale-while-revalidate=3600',
```

### Why 3600, justified against how often content actually changes

Queried on the production database the same day:

```
published articles: 61
  edits in the last    1h: 0
  edits in the last    3h: 0
  edits in the last    6h: 0
  edits in the last   12h: 23
  edits in the last   24h: 47
edits per day:
  2026-08-26  23
  2026-08-25  24
```

**47 of 61 published articles were edited within 24 hours; 23 within 12.**
Content on this site moves in daily bursts and, inside a sprint, several times a
day. An hour is already an order of magnitude tighter than the interval at which
the corpus changes.

It also costs nothing measurable:

- The **Vercel edge is governed separately** by `Vercel-CDN-Cache-Control:
  s-maxage=300, stale-while-revalidate=600` on the article and pillar routes —
  a 15-minute worst case that this change does not touch. `expireTime` only
  governs caches BEYOND Vercel.
- 3600 still leaves an article page **3000 seconds** of stale-serve against a
  cold render measured at p90 6.4s. The performance point of
  stale-while-revalidate is entirely intact. What is gone is the year.
- It matches `s-maxage=3600` on the sitemap, the longest deliberate cache on the
  site, so there is one number rather than two.

### The thing that was checked before choosing the number

`expireTime` also reaches the prerender manifest (`next/dist/build/index.js:1848`),
which on Vercel governs ISR expiry — and the article page carries an explicit
warning that time-based ISR caused bot-crawl stampedes. Checked rather than
assumed, from the manifest of a real build:

```
/artikel      {"revalidate":600,"expire":3600}
/sitemap.xml  {"revalidate":3600,"expire":3600}
--- dynamicRoutes ---
/artikel/[category]/[slug] {}
```

Article pages are `revalidate = false`, and the guard in that code path is
`cacheControl.revalidate !== false`, so they get **no** expiry in the manifest.
The stampede risk is not reintroduced.

## The header, before and after, on three pages

**BEFORE** — 26 Aug 2026 ~13:10 UTC, production (`EVIDENCE/headers-BEFORE.txt`):

```
=== https://hellokahwin.com/artikel/majlis-perkahwinan/mas-kahwin-ikut-negeri ===
Age: 308
Cache-Control: s-maxage=600, stale-while-revalidate=31535400
X-Vercel-Cache: STALE
=== https://hellokahwin.com/artikel/majlis-perkahwinan/dewan-kahwin ===
Cache-Control: s-maxage=600, stale-while-revalidate=31535400
=== https://hellokahwin.com/artikel/adat-perkahwinan/sirih-junjung ===
Cache-Control: s-maxage=600, stale-while-revalidate=31535400
```

(That first line is worth keeping: a page caught STALE at Age 308 during the
"before" capture, unprompted. This is not a rare state.)

**AFTER** — 26 Aug 2026 13:50 UTC, same three pages, production
(`EVIDENCE/headers-AFTER.txt`):

```
=== https://hellokahwin.com/artikel/majlis-perkahwinan/mas-kahwin-ikut-negeri ===
Cache-Control: s-maxage=600, stale-while-revalidate=3000
X-Vercel-Cache: MISS
=== https://hellokahwin.com/artikel/majlis-perkahwinan/dewan-kahwin ===
Age: 48
Cache-Control: s-maxage=600, stale-while-revalidate=3000
X-Vercel-Cache: HIT
=== https://hellokahwin.com/artikel/adat-perkahwinan/sirih-junjung ===
Cache-Control: s-maxage=600, stale-while-revalidate=3000
X-Vercel-Cache: MISS
=== https://hellokahwin.com/sitemap.xml ===
Cache-Control: public, max-age=300, s-maxage=3600, stale-while-revalidate=3600
X-Vercel-Cache: PRERENDER
```

**31535400 → 3000 seconds.** 365 days to 50 minutes; a factor of 10,512. The
sitemap, 86400 → 3600.

## THE SHELL IS STILL PRODUCED. ONLY ITS LIFETIME IS CAPPED.

Stated first and plainly, because the brief's rule is not to report a symptom as
fixed. **The definition of done asked for the window to be capped, and it is.
It did not ask for the race that fills the window to be fixed, and it is not.**

What changed and what did not:

| | before | after |
| --- | --- | --- |
| shells produced per publish storm | 50 of 61 (82%) | **unchanged — same race** |
| how long a shell may be served, beyond Vercel | 365 days | 50 minutes |
| how long at the Vercel edge | 15 min | 15 min (untouched) |
| how long after an ingest purge | seconds | seconds |

The residual exposure is a crawl that arrives inside the window a publish opens,
before the purge lands or on a path the purge does not name.

**What would actually fix it**, for whoever picks this up: the asymmetry at
`src/app/(public)/artikel/[category]/[slug]/page.tsx:430`. `generateMetadata`
gives itself 1.5s and returns `{}` on timeout; the page component has 5s and
succeeds. Two candidate shapes, and the choice is a real one:

1. **Give metadata the same budget as the page.** Smallest change. It spends the
   `maxDuration = 5` ceiling that comment was written to protect.
2. **Do not cache a render whose metadata degraded.** Strictly better and more
   work: the render knows it fell back, and a response that knows it is wrong
   should not be stored for anyone else.

Either belongs in the article page with its own measurement, not bolted onto a
header cap. It is the natural next tracker item and it is the actual root cause
of RISK-06.

---

# RISK-04 — publishing tells Google

## What the brief's premise got wrong, and it matters

The brief lists four articles reporting `URL is unknown to Google`:
`sirih-junjung`, `dulang-hantaran`, `gubahan-hantaran`, `walimatul-urus`, and
gives them under `adat-perkahwinan` / `hantaran-perkahwinan` /
`majlis-perkahwinan`. **Those are not their URLs.** Read off the live sitemap,
the canonical paths are `hantaran-mas-kahwin/…` and `ucapan-doa/walimatul-urus`.

Inspecting the real URLs gives a materially different picture:

| URL | coverage_state | last_crawled |
| --- | --- | --- |
| `/artikel/hantaran-mas-kahwin/sirih-junjung` | URL is unknown to Google | Never |
| `/artikel/hantaran-mas-kahwin/dulang-hantaran` | Discovered - currently not indexed | Never |
| `/artikel/hantaran-mas-kahwin/gubahan-hantaran` | Discovered - currently not indexed | Never |
| `/artikel/ucapan-doa/walimatul-urus` | **Submitted and indexed** | 2026-08-26 |

One of the four is indexed and two are discovered. The gap is real but it is
narrower than reported, and **an inspection of the wrong URL always returns
"unknown to Google"** — which is a trap worth naming, because it makes any
absent page look like an indexing failure.

## What was built

`src/lib/seo/gsc-sitemap.ts` — resubmits the sitemap through the Search Console
API, service-account JWT signed with `node:crypto`. No new dependency: a service
account flow is one signed JWT and one token exchange, and pulling `googleapis`
into a Next app's tree for two HTTP calls is not a trade worth making.

**Not the Indexing API.** Google restricts it to `JobPosting` and
`BroadcastEvent`; using it for articles is a policy violation against the whole
property. Recorded in the module header so the next reader does not rediscover
the idea and act on it.

### The ordering constraint, which is the whole design

A publish now clears three things in a fixed order:

1. `revalidateTag` — the Next data cache at the origin.
2. `purgeVercelEdge` — the CDN copies, `/sitemap.xml` among them.
3. `submitSitemapToGsc` — ask Google to come and read it.

Step 3 runs **only if step 2 succeeded**. `/sitemap.xml` is the longest-lived
edge entry on the site; asking Google to fetch it while the CDN still holds the
pre-publish copy hands Google a sitemap without the new article AND moves
`last_downloaded`, so every dashboard reports success. When the purge fails, the
run says so explicitly rather than leaving a silent absence:

```
  Google was also NOT asked to re-read the sitemap, on purpose: until the
  edge is purged, the sitemap it would fetch is the pre-publish copy. Purge
  first, then resubmit — by hand in Search Console, or by re-running this.
```

### The gate: `lastmod` only moves when something moved

`updated_at` on the `articles` upsert was an unconditional `now()`. That made
every re-ingest of an unchanged article tell Google, through
`src/app/sitemap.ts`, that the article had just been modified — and left the run
with no honest signal for whether the sitemap needed resubmitting at all.

It is now a `CASE` comparing the fourteen content-bearing columns old against
new (`IS DISTINCT FROM`, because half of them are nullable). The same predicate
comes back through `RETURNING` as `content_changed` and gates the resubmission.
Review columns are deliberately excluded — every re-ingest resets them by
design, so including them would make the predicate permanently true.

The one blind spot, written into the code rather than left to be discovered:
tag and cluster membership are reconciled by a delete-then-reinsert that cannot
report whether the set changed, so a tags-only ingest does not move `lastmod`.
Correct today — neither changes the article's URL or its text — and flagged for
the day tags become part of the indexed page.

## Evidence

### The API call, and its literal response

Ingest run 1, an INSERT (`content_changed = true`):

```
Content caches dropped and the Vercel edge purged — the article is visible on the
site now. Purged (HTTP 200 in 1 request(s)):
  /artikel/nikah-undang-undang/borang-nikah
  /artikel/nikah-undang-undang
  /sitemap.xml

Google was asked to re-read the sitemap (HTTP 204 (empty body — this is Google's success response)):
  property: https://hellokahwin.com/
  sitemap : https://hellokahwin.com/sitemap.xml
  This is an ACCEPTANCE, not a fetch and not an indexing. Confirm with the
  sitemap's `last_downloaded` in Search Console, and with a URL inspection
  of the new article within 48h.
```

`HTTP 204` with an empty body **is** Google's success response for
`PUT .../sitemaps/{feedpath}`. The module spells that out because a 204 followed
by nothing is indistinguishable from a truncated log line, and "the API said
200" is exactly the class of claim that let the original cache bug survive
review.

**Where the row went, stated plainly:** the local database (`hklocal`), not
production. The write is the only part that was kept local; the origin
revalidate, the edge purge and the GSC submission all ran for real against the
real property. Production article content was not touched by this work at all —
a demonstration ingest is not a reason to rewrite a live article from whatever
version happens to sit in a scratch folder. What a production-DB run would
additionally prove is only that the same code executes with `--db` pointed
elsewhere.

### `last_downloaded` moved past the ingest timestamp

```
before this work   last_submitted 2026-08-25 15:58   last_downloaded 2026-08-26 13:07
after run 1        last_submitted 2026-08-26 13:33   last_downloaded 2026-08-26 13:33
```

The ingest committed at `13:33:24.998Z` and Google had re-downloaded the sitemap
inside the same minute. That is the DoD's first verification, met.

### An unchanged re-run does NOT resubmit

Run 2, the identical file against the row run 1 had just written:

```
Sitemap NOT resubmitted: this ingest changed nothing the sitemap carries — no
URL added or removed, and no lastmod moved. Resubmitting an unchanged sitemap
teaches Google that https://hellokahwin.com/sitemap.xml is noisy, which is the
opposite of the point.
```

And the row confirms the gate is real, not just the message:

```
created_at    : 2026-08-26T13:33:24.998Z
updated_at    : 2026-08-26T13:33:24.998Z
delta (ms)    : 0
review_status : pending_review   (reset by every re-ingest, deliberately NOT in the predicate)
```

`updated_at` did not move, so the sitemap's `lastmod` did not move, so there was
nothing to tell Google about.

### `lastmod` is the ingest date, not the build date

From the live sitemap, and the production deployment record:

```
sitemap lastmod, the four articles   2026-08-25T18:01:59.511Z
sitemap lastmod, homepage entry      2026-08-26T01:31:04.025Z
production deployment (97b0837)      2026-08-26T00:59:04Z
```

One is before the build and one is after it. `lastmod` tracks `articles.updated_at`
(`src/app/sitemap.ts:102`), which is the ingest time. If it tracked the build,
all 78 entries would carry one timestamp. They do not.

### The URL inspection, before and after — it moved inside 35 minutes

The DoD asks that a URL inspection leaves `URL is unknown to Google` within 48h.
It did not take 48h.

**BEFORE** — 26 Aug 2026 13:20 UTC, before any resubmission:

```
/artikel/hantaran-mas-kahwin/sirih-junjung     URL is unknown to Google           Never
/artikel/hantaran-mas-kahwin/dulang-hantaran   Discovered - currently not indexed Never
/artikel/hantaran-mas-kahwin/gubahan-hantaran  Discovered - currently not indexed Never
/artikel/ucapan-doa/walimatul-urus             Submitted and indexed              2026-08-26
```

**AFTER** — 26 Aug 2026 13:55 UTC, after the resubmissions at 13:25 and 13:33:

```
/artikel/hantaran-mas-kahwin/sirih-junjung     Discovered - currently not indexed Never
/artikel/hantaran-mas-kahwin/dulang-hantaran   Discovered - currently not indexed Never
/artikel/hantaran-mas-kahwin/gubahan-hantaran  Submitted and indexed              2026-08-26
/artikel/ucapan-doa/walimatul-urus             Submitted and indexed              2026-08-26
```

Two moved:

- **`sirih-junjung` left `URL is unknown to Google`** — the exact state change
  the DoD names — and is now Discovered. That is the verification, met.
- **`gubahan-hantaran` went from Discovered to `Submitted and indexed`**, crawled
  the same day, and picked up Breadcrumbs rich results.

Honest caveat on attribution: this is a 35-minute correlation with two
resubmissions, not a controlled experiment, and Google crawls on its own schedule
too. What is not in doubt is the causal link one step earlier —
`last_downloaded` moved to the same minute as each submission, twice.
`dulang-hantaran` did not move, which is the reminder that a resubmission asks
rather than instructs.

Worth carrying to the tracker: `sirih-junjung` should be re-inspected on **28 Aug
2026** to see whether Discovered becomes indexed.

```
mcp__gsc__inspect_url_enhanced
  site_url: https://hellokahwin.com/
  page_url: https://hellokahwin.com/artikel/hantaran-mas-kahwin/sirih-junjung
```

### What is NOT verified

**Not verified:** that any of the 50 stale shells was ever served to
Googlebot. Nobody has proven that and this work does not claim it. The mechanism
is proven, its rate under a publish is proven at 82%, and the window it could
persist for is now an hour instead of a year.

---

# Shipped

```
commit      92e2b51  fix(seo): cap the year-long stale window, and make an ingest tell Google
pushed      origin/ianng89/pillars-ingest-redirects
deployment  dpl_Bey1BCqsug7ZqeLcyfDfdRwvmV2g   state READY   target production
            https://hellokahwin-c2gooexbm-thewednotebook.vercel.app
live at     https://hellokahwin.com  — capped header confirmed 13:50:52Z
```

Two notes on how, both worth carrying forward:

**Not merged to master.** `master` is at `be08556` and this branch is 44 commits
ahead of it, carrying several agents' Sprint-02 work. Merging that batch is the
integrator's step, not one item's. Production on this project is deployed from a
branch SHA — the last five production deployments are all commits on
`ianng89/pillars-ingest-redirects` — so this shipped the way every deployment
before it shipped.

**Deployed from git, not from the working directory.** `vercel deploy --prod`
uploads the local tree, which here means 60+ untracked scratch files and a
deployment tied to no commit. The deploy was created through the API with a
`gitSource` pinned to `92e2b51`, so the built tree is exactly the commit.

**Preview builds fail on this project and it is not this change.** The preview
for `92e2b51` errored with `connect ECONNREFUSED 127.0.0.1:5432` — `DATABASE_URL`
is not set for the Preview environment, and `/` prerenders against the database.
The preview for `7597ea9`, the commit before this one, failed the same way at
18:38. Worth its own tracker item: preview builds currently cannot verify
anything.

# Tests

```
Test Files  25 passed (25)
Tests       272 passed (272)
```

`src/lib/seo/__tests__/gsc-sitemap.test.ts` (14) guards the same property the
edge-purge tests guard one layer down: the sentence that means "Google has been
told" lives on exactly one branch, a failure carries Google's reason verbatim,
and a skipped submission reads as a decision rather than a fault. Plus: the
private key never reaches `detail` or any operator notice.

`scripts/__tests__/ingest-sql-templates.test.ts` (3) — see the retrospective.

---

# Retrospective

## What we learned that is not written down

**A reproduction is a statement about conditions, not about a page.** The CEO's
six clean fetches and this run's 50 shells are not in conflict; they are the same
system under different concurrency against a different cache state. "Could not
reproduce" was true and told us nothing. What made the difference was reading the
source for a mechanism first (`generateMetadata`'s 1.5s deadline against the
page's 5s), then building conditions that would trigger *that*, rather than
re-requesting the page and hoping. The Sprint-01 cold-concurrent sweep had
already learned half of this and its harness was sitting in the worktree.

**An inspection of the wrong URL is indistinguishable from an indexing failure.**
Three of the brief's four URLs did not exist. All four returned "URL is unknown
to Google", which reads as a finding. The habit that catches it: take the URL
from the live sitemap, never from prose.

**A prose warning does not survive contact with an editor.** The ingest script
carried an explicit warning about backticks inside `sql` tagged templates. This
change put one in anyway, four lines below it, because a warning is something you
read after you have typed the line. It cost a run and an unhelpful error
(`Expected ";" but found "now"`, naming neither the comment nor the backtick) —
and `pnpm typecheck` does not cover `scripts/`, so nothing catches it until the
CLI is invoked.

## Which document must change, and who owns the edit

**`src/lib/cache/purge.ts`** — the file that already collects the cache traps
(commit 97b0837, "put the three cache traps where someone reaches before writing
purge code"). It documents two caches; there are three, and the third is Google.
Anyone who writes purge code needs to know that the chain does not end at the
CDN and that the order is not free.

Owner: this agent, in this session. **The edit is made below and committed with
this work** — see `src/lib/cache/purge.ts`, the fourth trap.

## What we did twice that we should never repeat

**Backticks inside a postgres.js tagged template**, now for the second recorded
time in this file. The prose warning did not hold. It is now a test —
`scripts/__tests__/ingest-sql-templates.test.ts` — verified to FAIL when the trap
is deliberately re-armed:

```
× ingest-article.mts: no backtick inside any sql/tx template
+   "line 807: SQL template ends inside a -- comment"
```

and to pass when it is not. Prose warned; the test refuses.

**Deploying from the working directory.** `vercel deploy --prod` would have
uploaded 60+ untracked scratch files and produced a production deployment tied to
no commit. Every successful production deployment on this project was built from
a GitHub ref; the deploy was redone through the API with a `gitSource` so the
built tree is exactly the commit. Worth a line in the deploy doctrine.

## What we nearly shipped, and what caught it

**A sitemap URL derived from the wrong base.** The first end-to-end run submitted
`http://127.0.0.1:3199/sitemap.xml` — the origin being revalidated — to the
`https://hellokahwin.com/` property. Google answered:

```
HTTP 400 { "error": { "code": 400,
  "message": "Could not process sitemap 'http://127.0.0.1:3199/sitemap.xml'" } }
```

What caught it was **running the thing end to end instead of trusting the unit
tests**, and the failure notice printing Google's reason verbatim rather than
"submission failed". The fix (`gscSitemapUrlFor`, deriving the sitemap from the
property) is not a test fix — on a production publish the two bases are the same
and this would have sat dormant until the first preview-environment run.

**A silently reintroduced ISR stampede.** `expireTime` reaches the prerender
manifest as well as the header, and the article page carries a warning that
time-based ISR caused bot-crawl stampedes. Reading the manifest of a real build
rather than reasoning about it showed article pages get no expiry, because they
are `revalidate = false`. Had they been `revalidate = 1800`, an hour-long
`expireTime` would have re-armed exactly the failure that comment warns about.
