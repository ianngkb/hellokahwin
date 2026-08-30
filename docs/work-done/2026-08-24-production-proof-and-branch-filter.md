# 2026-08-24 — The production proof ran. The fix survives Vercel's cache handler.

**Brief:** `docs/plans/aug-23-2026-session-01/aug-24-2026-brief-production-proof-and-branch-filter.md`
**Branch:** `ianng89/pillars-ingest-redirects` · **Worktree:** `orca/workspaces/hellokahwin-site/pillars-ingest-redirects`
**Deployment under test:** `dpl_DwZwdxB5LhmAnTa3aCPBKXA9rTwb` · `105d9de` · READY

**Status:** all three tasks done. The probe was written to production and deleted
again; production is back where it started. One finding contradicts the brief's
premise (Task 2 was already applied), and one credential-hygiene incident needs
the owner (§6).

---

## 1. The verdict up front

**The `PURGE_IMMEDIATELY` fix survives Vercel's own cache handler.** The first
origin-served read after a write returns the new content — no second request.

**But the brief's step-2 measurement, taken literally, shows the opposite**, and
the reason is not the cache handler. The one request to the pillar page never
reached the origin: Vercel's edge returned a copy it had held for 339 seconds.
That is the interim edge rule the brief told me to weigh, and it is exactly what
it looks like. §2 has the raw numbers; §3 has the test that separates the two
and settles it.

## 2. Task 1 — the production one-request proof, verbatim

### The baseline, before any write

Taken so that a pre-ingest cache entry provably exists — without one the test
proves nothing, because a cold miss renders fresh whether the fix works or not.

```
URL:            https://hellokahwin.com/artikel/nikah-undang-undang
AT (UTC):       2026-08-24T14:20:25.977Z
STATUS:         200
ELAPSED:        170ms
HDR age:        862
HDR x-vercel-cache:STALE
HDR cache-control:private, no-cache, no-store, max-age=0, must-revalidate
ARTICLE LINKS (href="/artikel/nikah-undang-undang/<slug>"): total=0 unique=0
ROBOTS META TAGS: <meta name="robots" content="noindex, follow"/>
PROBE SLUG PRESENT IN BODY: false
```

`age: 862` here is the first sign of what later spoils step 2: the edge was
already serving a 14-minute-old copy of this page and revalidating it in the
background.

### Step 1 — the ingest

```
INGEST START (UTC): 2026-08-24T14:25:37.0539399Z
File:   zz-revalidate-probe-prod.md
Target: aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
Mode:   COMMIT (will write)

Pillar:  Nikah & Undang-undang (P1)
Cluster: Borang & pendaftaran nikah (C1.1)
Status:  published
Author:  human · review_status pending_review
Images:  1, every one credited
  ./zz-probe-cover.jpg  →  "HelloKahwin" [G] HelloKahwin
Tags:    (none)
Links:   0 internal, all resolved
URL:     /artikel/nikah-undang-undang/zz-revalidate-probe-prod
  uploaded ./zz-probe-cover.jpg (+4 crops)

Done. /artikel/nikah-undang-undang/zz-revalidate-probe-prod (published)
It will appear on the pillar page under its cluster with no further action.
Content caches dropped — the article is visible on the site now.
INGEST EXIT CODE: 0
INGEST END (UTC): 2026-08-24T14:25:42.8343265Z
```

Two things the previous run could not have known, both found by running it:

- **The probe's `author: me@ian.ng` matches no profile in production.** The file
  had been validated against the *parser*, which checks file shape; the author is
  checked against the *database*, and production holds exactly two profiles:
  `hellokahwin-editorial` (`editorial@hellokahwin.com`, the author of all 29
  published articles) and `user_3IHGHN4wXTBBMfCtvRkCMklIWzJ`
  (`ianng@theweddingnotebook.com`). The probe was re-pointed at
  `editorial@hellokahwin.com` — the one already in use.
- **`--publish` is required**, not optional. `status: published` in the file alone
  inserts a DRAFT (`ingest-article.mts`, `effectiveStatus`), and a draft never
  reaches the pillar page, so the proof would have measured nothing.

### Step 2 — the pillar page, requested exactly once

```
URL:            https://hellokahwin.com/artikel/nikah-undang-undang
AT (UTC):       2026-08-24T14:26:04.963Z
STATUS:         200
ELAPSED:        155ms
HDR age:        339
HDR x-vercel-cache:STALE
HDR x-vercel-id:sin1::iad1::tg85j-1787581568359-6757b68537b4
HDR cache-control:private, no-cache, no-store, max-age=0, must-revalidate
BODY BYTES:     31721
ARTICLE LINKS (href="/artikel/nikah-undang-undang/<slug>"): total=0 unique=0
ROBOTS META TAGS: <meta name="robots" content="noindex, follow"/>
NOINDEX PRESENT ANYWHERE IN BODY: true
PROBE SLUG PRESENT IN BODY: false
```

**Literal answer: status 200, article-link count 0, `noindex` present on that
same response.** The probe was not on the page.

**And that response is not evidence about the cache handler**, because it was not
produced by the cache handler. `x-vercel-cache: STALE` with `age: 339` says the
Vercel edge served a stored copy 339 seconds old. The baseline request was at
14:20:25.977Z and this one at 14:26:04.963Z — a gap of 339 seconds to the second.
The edge handed back the copy my own baseline request had caused it to store, and
never asked the origin. The article page below shows the site's edge policy for
these routes: `s-maxage=600, stale-while-revalidate=31535400`,
`x-nextjs-stale-time: 300`.

So the honest reading is: **step 2 failed as a measurement, not as a result.**
Reporting it as "the fix did not survive" would be reporting a CDN hit as a
cache-handler miss. §3 is the test that does not have that hole.

### Step 3 — the article URL, requested exactly once

```
URL:            https://hellokahwin.com/artikel/nikah-undang-undang/zz-revalidate-probe-prod
AT (UTC):       2026-08-24T14:26:26.374Z
STATUS:         200
ELAPSED:        5397ms
HDR age:        0
HDR x-vercel-cache:REVALIDATED
HDR cache-control:s-maxage=600, stale-while-revalidate=31535400
HDR x-nextjs-prerender:1
HDR x-nextjs-stale-time:300
BODY BYTES:     52981
ROBOTS META TAGS: (none)
NOINDEX PRESENT ANYWHERE IN BODY: false
PROBE SLUG PRESENT IN BODY: true
```

**Status 200 on the first request.** `age: 0`, rendered at origin in 5.4s.

### Step 4 — sitemap.xml, on the first request after the ingest

```
URL:            https://hellokahwin.com/sitemap.xml
AT (UTC):       2026-08-24T14:26:41.424Z
STATUS:         200
ELAPSED:        4292ms
HDR age:        0
HDR x-vercel-cache:REVALIDATED
HDR cache-control:public, max-age=0, must-revalidate
URL COUNT:      41
PROBE PRESENT:  true
PROBE ENTRY:    https://hellokahwin.com/artikel/nikah-undang-undang/zz-revalidate-probe-prod
P1 PILLAR ENTRY:https://hellokahwin.com/artikel/nikah-undang-undang
```

This one carries weight the article page cannot. The article URL had never
existed, so its freshness proves nothing — a miss renders fresh either way. The
sitemap **did** exist and **was** cached, it is built from the same `articles`
tag the purge targets, and `x-vercel-cache: REVALIDATED` with a 4.3-second inline
render says the origin did the work on this request. It came back containing the
probe. Under the old `'max'` behaviour the origin render would have read a
stale-but-valid tag entry and emitted a sitemap without it.

## 3. The test that settles it

The gap in step 2 is that no origin-served render of the *pillar page* was
obtained. Closing it needs a first origin read that happens after a purge and
whose stale answer would be visibly different from its fresh one. So:

1. One narrow, id-scoped `UPDATE` renaming the probe — on the row already
   scheduled for deletion, nothing else touched:

```
BEFORE: {"id":"ac707a9d-b7f6-4006-9f8b-d4ad189c938e","slug":"zz-revalidate-probe-prod","title":"Ujian Revalidate Probe Produksi (Buang Selepas Guna)"}
ROWS UPDATED: 1
AFTER:  {"id":"ac707a9d-b7f6-4006-9f8b-d4ad189c938e","slug":"zz-revalidate-probe-prod","title":"UJIAN SEMAKAN KEDUA ZZPROBE2 (Buang Selepas Guna)"}
UPDATE AT (UTC): 2026-08-24T14:28:41.784Z
PURGE POST STATUS: 200 {"revalidated":["articles","inspire-categories"]}
PURGE AT (UTC): 2026-08-24T14:28:42.464Z
```

2. Then one request on a URL with no edge copy, so the edge cannot answer it.
   Two Vercel aliases were tried first and both 302-redirect —
   `hellokahwin-thewednotebook.vercel.app` and
   `hellokahwin-git-master-thewednotebook.vercel.app`. A query string gives a
   distinct edge cache key on the canonical host, and this route renders
   dynamically anyway (it reads `searchParams`), so the only cache in play is
   precisely the tagged `unstable_cache` data cache the purge acts on.

```
URL:            https://hellokahwin.com/artikel/nikah-undang-undang?page=1
AT (UTC):       2026-08-24T14:29:20.838Z
STATUS:         200
ELAPSED:        3217ms
HDR age:        0
HDR x-vercel-cache:MISS
HDR cache-control:private, no-cache, no-store, max-age=0, must-revalidate
ARTICLE LINKS:  total=1 unique=zz-revalidate-probe-prod
OLD TITLE PRESENT ("Ujian Revalidate Probe Produksi"): false
NEW TITLE PRESENT ("ZZPROBE2"):                        true
ROBOTS META:    (none)
NOINDEX IN BODY: false
```

**`x-vercel-cache: MISS`, `age: 0`, 3.2 seconds of origin work, and the title
written 39 seconds earlier is on the page — on the first read.** The tag was
EXPIRED, not stale. Had `revalidateTag` still been marking tags stale, this
render would have been handed the pre-update entry and shown the old title. That
is the fix working through Vercel's cache handler, which is the question the
brief was asked to answer.

Corroborating, one earlier request on an alias with no edge copy for that path:

```
URL:            https://hellokahwin.vercel.app/artikel/nikah-undang-undang
AT (UTC):       2026-08-24T14:27:00.880Z
STATUS:         200 · HDR age: 0 · HDR x-vercel-cache: MISS
ARTICLE LINKS (href="/artikel/nikah-undang-undang/<slug>"): total=1 unique=1
   - zz-revalidate-probe-prod
ROBOTS META TAGS: (none)
NOINDEX PRESENT ANYWHERE IN BODY: false
```

Weaker on its own — a background revalidation triggered by the 14:26:04 stale hit
could have refreshed the entry before it — which is why the retitle test above
exists. Both agree.

### What this does and does not license

- **Proven:** the cache-handler purge is immediate on Vercel. A write is visible
  to the first origin read.
- **Not proven, and now measured:** the edge in front of it is not purged. A
  pillar URL that has been requested recently keeps serving its stored copy —
  339 seconds' worth, observed — regardless of the handler. `s-maxage=600` and
  `x-nextjs-stale-time: 300` are the numbers behind the "up to five minutes"
  interim rule, and this run is direct evidence for it. The rule stands: publish,
  wait five minutes, then invite the crawl. The edge-purge work is still worth
  building.

## 4. Task 1 step 5 — the probe deleted, and verified gone

Ran as its own step and would have run even if step 2 had failed.

```
R2 OBJECTS UNDER PREFIX BEFORE: 7
   inspire/zz-revalidate-probe-prod/1787581538183-zz-probe-cover.jpg
   inspire/zz-revalidate-probe-prod/1787581538183-zz-probe-cover/crop-16x9-og.webp
   inspire/zz-revalidate-probe-prod/1787581538183-zz-probe-cover/crop-4.3x1-desktop-hero.webp
   inspire/zz-revalidate-probe-prod/1787581538183-zz-probe-cover/crop-4x3-article-card.webp
   inspire/zz-revalidate-probe-prod/1787581538183-zz-probe-cover/crop-4x5-mobile-cover.webp
   inspire/zz-revalidate-probe-prod/1787581538183-zz-probe-cover/high.webp
   inspire/zz-revalidate-probe-prod/1787581538183-zz-probe-cover/low.webp
R2 DELETED: 7  ERRORS: []
DELETED media_article_usage rows: 1
DELETED article_categories rows:  2
DELETED article_tags rows:        0
DELETED media rows:               1 [{"id":"f06ac62a-0d8e-4e27-a372-99fc33bde6e7","r2_key":"inspire/zz-revalidate-probe-prod/1787581538183-zz-probe-cover.jpg"}]
DELETED articles rows:            1 [{"id":"ac707a9d-b7f6-4006-9f8b-d4ad189c938e","slug":"zz-revalidate-probe-prod"}]

--- VERIFICATION ---
articles remaining for probe:            0
media remaining for probe:               0
media_article_usage remaining for probe: 0
article_categories remaining for probe:  0
ORPHAN media_article_usage rows anywhere in the table: 0 []
any zz- article left:                    0
articles by status now: [{"status":"published","count":"29"}]
articles linked to P1 / C1.x now:        0
R2 OBJECTS UNDER PREFIX AFTER:  0
POST-DELETE PURGE STATUS: 200 {"revalidated":["articles","inspire-categories"]}
```

The orphan check is deliberately table-wide, not probe-scoped: it asks whether
**any** `media_article_usage` row anywhere now points at a missing article or a
missing media row. Zero.

And the site agrees:

```
https://hellokahwin.com/artikel/nikah-undang-undang/zz-revalidate-probe-prod
  AT 2026-08-24T14:30:44.754Z · STATUS 404 · age 0 · x-vercel-cache REVALIDATED
  ROBOTS META TAGS: <meta name="robots" content="noindex"/>

https://hellokahwin.com/sitemap.xml
  AT 2026-08-24T14:30:51Z · URL COUNT: 39 · PROBE PRESENT: false · P1 PILLAR ENTRY: (absent)
```

41 URLs with the probe, 39 without — the probe's article URL and the P1 pillar
URL, which drops back out of the sitemap once P1 owns no published article again.
Production is exactly where it started: 29 published, 0 `zz-`, 0 articles linked
to P1 or C1.x.

### The undo, recorded before the write

Written to the session scratchpad **before** the ingest ran, then completed with
the real ids the moment they existed. Reproduced here because that is what makes
"reversible" a fact:

| what | identity |
| --- | --- |
| `articles` | 1 row, `id = ac707a9d-b7f6-4006-9f8b-d4ad189c938e`, `slug = zz-revalidate-probe-prod` |
| `article_categories` | 2 rows: `8e20afff-8125-41fd-9e0c-e23816a8c10c` (P1), `2279f2a5-fb56-47f7-9503-fd54fb67c590` (C1.1) |
| `article_tags` | 0 rows |
| `media` | 1 row, `id = f06ac62a-0d8e-4e27-a372-99fc33bde6e7`, `r2_key = inspire/zz-revalidate-probe-prod/1787581538183-zz-probe-cover.jpg` |
| `media_article_usage` | 1 row (`f06ac62a-…`, `ac707a9d-…`) |
| R2 | 7 objects under `inspire/zz-revalidate-probe-prod/` in `hellokahwin-images` |

```sql
-- in this order; FK media.original_article_id -> articles.id
DELETE FROM media_article_usage WHERE article_id = :id;
DELETE FROM article_categories  WHERE article_id = :id;
DELETE FROM article_tags        WHERE article_id = :id;
DELETE FROM media               WHERE original_article_id = :id
                                   OR r2_key LIKE 'inspire/zz-revalidate-probe-prod/%';
DELETE FROM articles            WHERE id = :id AND slug = 'zz-revalidate-probe-prod';
```

No DROP, no TRUNCATE, no migration, no schema change. Every statement id- or
slug-scoped. The ingest itself ran in one transaction, and there was no existing
row at that slug (`zz-` articles = 0, checked first), so its
`on conflict (slug) do update` branch could not fire against anything
pre-existing.

## 5. Task 2 — the branch filter. It was already set.

The brief's premise was that `commandForIgnoringBuildStep` is `null`. **It was
not.** Read from the live project immediately before writing anything:

```
BEFORE commandForIgnoringBuildStep : if [ "$VERCEL_GIT_COMMIT_REF" = "feat/command-centre-dashboard" ]; then exit 0; else exit 1; fi
BEFORE productionBranch            : master
BEFORE link.type/repo              : github / ianngkb/hellokahwin
PATCH RESPONSE HTTP: OK
PATCH RESPONSE commandForIgnoringBuildStep : if [ "$VERCEL_GIT_COMMIT_REF" = "feat/command-centre-dashboard" ]; then exit 0; else exit 1; fi
AFTER  commandForIgnoringBuildStep : if [ "$VERCEL_GIT_COMMIT_REF" = "feat/command-centre-dashboard" ]; then exit 0; else exit 1; fi
EXACT MATCH TO TARGET: True
```

The `GET` runs before the `PATCH` in the same script, so `BEFORE` is the value as
it stood at 2026-08-24T14:31Z, not an echo of my own write. The PATCH was
therefore a confirming no-op: the setting now holds the exact string the brief
specified, byte-for-byte (compared with `-ceq`, case-sensitive).

Two explanations fit and I cannot distinguish them from here: either one of the
previous run's two refused PATCH attempts reached the Vercel API before the
session's classifier stopped it — the refusal would then have been on the
response, not the request — or the owner set it in the dashboard afterwards.
Worth knowing which, because the first would mean a "refused" write in that log
actually landed. It was **not** widened to disable all previews.

## 6. Data hygiene

- **One production write cycle, fully reversed.** One ingest (one transaction),
  one id-scoped title `UPDATE`, one delete. Nothing else was created, updated or
  deleted. Verified back to the starting state in §4.
- **Three purges** of the `articles` / `inspire-categories` tags: one by the
  ingest CLI, one for the retitle test, one after the delete so the site stopped
  showing a row that no longer exists.
- **One Vercel project write** — the `commandForIgnoringBuildStep` PATCH in §5,
  which changed nothing.
- **The probe article and its cover never entered the repository** and were never
  committed. They live in this session's scratchpad only.
- `.claude/settings.local.json` remains modified and unstaged, as it has been
  since before this session. Not this run's file; left alone.
- `.tmp-ops/` (gitignored) held the read/verify/delete scripts during the run and
  was removed afterwards. Nothing from it is committed.

### One incident the owner needs to action

**The production database password was echoed into this session's transcript.**
Not by a script of mine: `ingest-article.mts` requires `--db <url>` and refuses
any implicit `DATABASE_URL` by design, so the connection string is necessarily an
argv; and `pnpm run` prints the full resolved command line as its banner before
executing. The dry run therefore printed the Supabase connection string, password
included, to stdout. The real run was switched to `pnpm --silent`, which
suppresses the banner, and the value appears nowhere in this document, in any
committed file, or in any file on disk written by this run.

**Recommended: rotate the Supabase database password for project
`nyidzlupgmyyazhyykuk` and update `DATABASE_URL` in the Vercel project.** The
exposure is a transcript, not a repository, so the risk is contained — but it is
real and the fix is cheap.

Two smaller notes on the same theme:

- Credentials were fetched only through
  `vault.ps1 run vercel.twn -EnvVar VERCEL_TOKEN`, which injects the token into
  one child process. No value was hardcoded or written to disk.
- **The Vercel env LIST endpoint does not decrypt.**
  `GET /v9/projects/{id}/env?decrypt=true` returns an encrypted envelope
  (`{"v":"v2","c":"…","k":[…]}`), and a script that trusts it will hand a garbage
  "DATABASE_URL" to whatever it wraps. The SINGULAR endpoint,
  `GET /v1/projects/{id}/env/{envId}`, returns the plaintext. The previous run's
  `with-prod-env.ps1` used the list form and had never been executed; anything
  reusing it needs this correction.

## 7. Task 3 — Preview environment variables: the 22 Aug constraint does not hold

**Answer: yes — there are three routes, and none of them puts a secret on a
command line.** The premise that the Vercel CLI only accepts preview values via
`--value` is false, and was false in the shipped CLI at the time.

**First, the finding that made previews fail is confirmed.** Read from the live
project today, names and targets only:

```
ADMIN_EMAILS  CLERK_SECRET_KEY  CRON_SECRET  DATABASE_URL
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY  NEXT_PUBLIC_R2_ASSETS_PUBLIC_URL
R2_ACCESS_KEY_ID  R2_ACCOUNT_ID  R2_ASSETS_BUCKET_NAME  R2_ASSETS_PUBLIC_URL
R2_BUCKET_NAME  R2_PUBLIC_URL  R2_SECRET_ACCESS_KEY  REKOGNITION_ENABLED
WP_SOURCE_URL
```

All 15, without exception: `type=encrypted`, `targets=production`. Nothing on
preview, nothing on development. A preview build has no `DATABASE_URL` and cannot
succeed.

### Route A — `vercel env add` from stdin (CLI 50.23.2, installed here)

The CLI's own `--help`, verbatim:

```
--value <VALUE>  Value for the variable (non-interactive). Otherwise use stdin
                 or you will be prompted.
```

and among its own examples:

```
- Add a new Environment Variable from stdin

  $ cat <file> | vercel env add <name> <production | preview | development>
  $ cat ~/.npmrc | vercel env add NPM_RC preview
  $ vercel env add API_URL production < url.txt

- Add a new Environment Variable for a specific Environment and Git Branch

  $ vercel env add DB_PASS preview feat1
```

`--value` is one input mode among three, not the only one. The current docs
(`/docs/cli/env`, last updated 2026-07-15) carry the same forms, including
`vercel env add [name] [environment] [gitbranch] < [file]`, and
`vercel env update` accepts stdin the same way.

This is the shape `vault.ps1 push` already uses for Doppler —
`Get-Plain $key | doppler secrets set …` — so the pattern is established here:
`vault.ps1 get <key> | vercel env add DATABASE_URL preview --token …`.

**Residual risk.** The docs' own `echo <value> | vercel env add …` example is
*not* safe — it puts the value on a command line and into shell history, and the
docs say so. Only `< file` or a pipe from a program that does not take the secret
as an argument qualifies. If a file is used it must be deleted after. Second, and
more consequential: **preview writes now default to `sensitive`**, which cannot
be read back afterwards by `vercel env ls` or
`vercel env pull --environment=preview`, or by the read-back verification this
session used on production. Pass `--no-sensitive` if the value must stay
readable — and note team policy can refuse that opt-out.

### Route B — the REST API, `POST /v10/projects/{idOrName}/env`

The value travels in a JSON request body. Nothing reaches argv at all.

```http
POST /v10/projects/{idOrName}/env?teamId=…&upsert=true
Authorization: Bearer <token>
Content-Type: application/json

{ "key": "DATABASE_URL", "value": "…", "type": "encrypted",
  "target": ["preview"], "gitBranch": "feat/command-centre-dashboard" }
```

`key`, `value`, `type` are required; `target` accepts `preview`; `gitBranch`
scopes a value to one branch and *requires* `target=preview`; `upsert=true`
updates instead of failing when the variable exists.

**This session is direct evidence that the route is open to us.** The same
authenticated shape — bearer token injected as an env var by `vault.ps1 run`,
never on a command line — performed both a `GET` and the `PATCH` in §5 against
this exact project today. A `POST` with a body is the same call with a payload.

**Residual risk.** The value exists in the script's process memory and in the
HTTPS body. It must be read from the vault at runtime, the way `prod-env.ps1`
does — a script that embeds the literal is a secret written to disk, which is
worse than what this route replaces. There is no partial-failure rollback: the
endpoint returns `created` and `failed` arrays, so a bulk call must be checked
field by field rather than by status code alone.

### Route C — the dashboard, including bulk `.env` import

No command line involved. The Environment Variables page takes a key and value
with target selection, and the docs state you can "add variables in bulk instead
of one at a time by pasting the contents of a `.env` file or uploading the file
directly."

**Residual risk.** Manual, so no repository audit trail and no reproducibility;
paste error is the realistic failure. It needs the owner at a browser, which
makes it the slowest route and the one an agent cannot perform.

### The recommendation, and the thing to decide first

Route B for anything scripted; Route A when a human is already at a terminal;
Route C only for a one-off bootstrap. The 22 Aug decision should be reopened — it
was a correct application of the vault rule to a mistaken belief about the tool.

**But do not simply copy the production values into preview.** That is the
one-command version of this and it points preview deployments at the production
Supabase database and the live `hellokahwin-images` R2 bucket, where a preview
build's writes are production writes — against a database with
`pitr_enabled=false` and no platform backups. Populating preview properly means
deciding what preview should point AT (a separate database at minimum) before
deciding how to write it. That is a decision, not a task, and it is the CEO's.

Not implemented, as instructed.

## 8. Not touched

The eight C2.4 articles. Out of scope by the brief; no attempt was made to
publish, transcribe, or stage them.
