# RISK-08 — the 22 seconds were never a render, and the 3.5 that were are now 0.17

**Sprint 03 · risk track · 5 points · owner `BMAD` · 28 Ogos 2026**
**Branch `feat/risk08-cold-render` · shipped to `master` as `6103eab` and `c9ba319`**

The item carried two symptoms. They have two different causes, only one of which
was ours, and the one that was ours is fixed and measured.

- **"Cold renders take 5–22s"** — not renders. Every Sprint 01 figure was a
  whole-request stopwatch, and the seconds sat in the TCP handshake, on the
  measuring machine's path to Vercel's edge. Reproduced today at the same
  ~21.05s, twice on requests that were served from cache and therefore ran no
  function at all, and at an identical rate against `vercel.com`.
- **The `502 FUNCTION_RESPONSE_STREAM_INCOMPLETE`** — real, ours, and fixed.
  Cold renders genuinely cost **3,478 ms at p50** against a route declaring
  `maxDuration = 5`, because the functions ran 15,000 km from the database.
  They now cost 168 ms.

---

## 1. The monitor's series for the affected routes

RISK-05's indexing monitor has three completed sweeps. Full per-URL output in
`2026-08-28-risk-08-cold-render-EVIDENCE/indexing-monitor-series.txt`; these are
the run IDs, reproducible with `gh run view <id> --log`.

| swept | run | sitemap URLs | Submitted and indexed | Excluded by ‘noindex’ | Discovered – not indexed | Unknown to Google | **not answered by Google** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26 Ogos 21:37Z | `33016014024` | 91 | 76 | 6 | 4 | 5 | **0** |
| 27 Ogos 23:53Z | `33127688344` | 103 | 92 | 6 | 3 | 2 | **0** |
| 28 Ogos 03:50Z | `33139930483` | 103 | 92 | 6 | 4 | 1 | **0** |

**What the series says about this item.** Across 297 URL inspections in three
sweeps, Google reported exactly four coverage states, and not one of them is a
fetch failure. There is no `SOFT_404`, no fetch error, and the `blind` bucket —
"not answered by Google", which is how the monitor reports its own inability to
see — is zero on every run. If Googlebot were meeting 502s on this corpus at any
material rate, this is the series it would show up in, and it does not.

The one URL still unknown to Google on the last sweep,
`/artikel/fotografi-videografi/lokasi-pre-wedding-photoshoot-terbaik`, returned
`200` in 180 ms in today's cold sweep. The four alarming URLs on the 28 Ogos run
are all `sitemap-url-noindexed` category pages — that is RISK-07's defect, not
this one.

**Where the series is weak, said plainly.** This monitor was built to answer
"does Google know about this URL", not "how long did the server take". It
carries `pageFetchState` and `lastCrawlTime` per URL in its R2 snapshot but
prints only `coverageState`, so it is *evidence of absence of a crawl-visible
failure*, not a latency series. It could not, on its own, have closed this item.
Everything in §2–§4 is measured directly.

---

## 2. The 5–22s: a TCP handshake, on requests where no function ran

Sprint 01 recorded `dulang-hantaran` 22.0s cold then 0.12s warm,
`walimatul-urus` 3.7s then 21.1s, `mas-kahwin-johor` 5.6s. The
`walimatul-urus` pair was flagged at the time as contradicting the simplest
hypothesis, because the *second*, warm request was the slow one. That is the
reading the rest of this section explains.

A sequential `curl` sweep of all 86 article URLs today, recording every phase
(`2026-08-28-risk-08-cold-render-EVIDENCE/curl-phase-sweep-with-stalls.txt`).
Four requests stalled. All four stalls are in `connect`:

```
cache   age   dns        connect     tls         ttfb        total       path
STALE   625   0.003551   21.056630   21.089379   21.174343   21.197731   …/hantaran-tempah-atau-buat-sendiri
STALE   369   0.005215   21.047700   21.081589   21.450141   21.471796   …/contoh-kad-jemputan-kahwin
HIT      21   0.003761   21.053130   21.083660   21.429252   21.466671   …/rukun-nikah
HIT     105   0.004003   21.079520   21.109515   21.447493   21.466883   …/…-port-dickson
```

DNS resolves in 4 ms. The TCP handshake then takes 21.05 s. TLS adds 30 ms and
the server answers in ~350 ms. **The server never saw the request until 21
seconds in. Two of the four are `x-vercel-cache: HIT`, where the edge already
held the bytes: no function was invoked, no database was touched, and
`maxDuration` was never in play, so those two cannot be slow renders whatever
else is true.

Re-requesting the same URL six times immediately afterwards gave 0.087, 0.099,
0.094, 0.108, 0.156 and 0.083 s, all HIT, so it is not a property of the page.

### The negative control

40 TCP connects to each of four hosts, interleaved, from the same machine in the
same minutes (`tcp-connect-control-four-hosts.txt`):

| host | n | median connect | max | stalls > 5s |
| --- | --- | --- | --- | --- |
| `hellokahwin.com` | 40 | 0.0120 s | 21.077 s | **3** |
| `vercel.com` | 40 | 0.0125 s | 21.065 s | **3** |
| `www.google.com` | 40 | 0.0129 s | 0.318 s | 0 |
| `github.com` | 40 | 0.0180 s | 0.100 s | 0 |

`vercel.com`, a page this project does not render, stalls at the same rate as
our own site, and the hosts on other networks never do. The ~21.05 s is the SYN
retransmission ladder on this machine's path to Vercel's anycast edge. A sweep
of all 86 URLs run from a GitHub runner in Arizona at the same time produced
0 requests over 5,000 ms in 86 samples.

So there is nothing here to fix in the site, and the fix that was needed is to
the measurement — `pnpm measure:cold` now reports a `server` column
with the handshake removed, so this reading cannot be quoted as render time
again.

---

## 3. The real cold-render cost: the compute was 15,000 km from the data

Here are the conditions, so that a reader can reproduce them. A cold path on
this route is not obtainable with a query string — the query is not part of the CDN cache
key, re-verified today on a path rendered three minutes earlier, one entry
ageing through four requests (`age` 181 → 183 → 185 → 186, `HIT` every time).
What works is the clock: `Vercel-CDN-Cache-Control: s-maxage=300,
stale-while-revalidate=600` makes an untouched path `MISS` after 900 s. The
`before` figures below are from paths left alone for that long; the `after`
figures are from the minutes following a production deploy, when the whole
corpus is cold at once. Both sweeps are sequential — a concurrent sweep of this
site *creates* the title defect it would be measuring.

**Before** (`sweep-before-iad1.json`, 06:36–06:42Z, 86 URLs):

```
x-vercel-cache: MISS         n=43  ttfb p50 3508  p90 3743  max 4220 ms
x-vercel-cache: REVALIDATED  n=25  ttfb p50 3094            max 3680 ms
WAITED FOR A RENDER          n=68  ttfb p50 3478  p90 3717  max 4220 ms
x-vercel-cache: HIT          n=17  ttfb p50   52            max  321 ms
```

That is 3.5 seconds at concurrency one, on a quiet site, against a 5-second
ceiling, and very little of it was the page being built.

**Why.** Vercel ran this project's functions in `iad1` (Washington) — confirmed
by `x-vercel-id: sin1::iad1::…` on every response and by the project API
(`serverlessFunctionRegion=iad1`). The database is
`aws-0-ap-southeast-1.pooler.supabase.com` — Singapore. Every read in an article
render crossed the Pacific. Measured against the same production pooler on the
same day from two places (`db-roundtrip-from-us-runner.txt`):

| from | open a connection + first query | per query, connection already open |
| --- | --- | --- |
| a US runner (Phoenix, AZ) | 1,371 / 1,320 / 1,287 ms | 174.6 – 175.1 ms |
| Kuala Lumpur | 152 ms | 12 – 15 ms |

`iad1` is *further* from Singapore than Phoenix is, so the US column is a floor
on what our renders were paying, not an estimate of it. A cold render opens a
connection and then issues the payload read, the pillar up-link and the related
block in sequence — which is how a page whose SQL is trivial came to take 3.5
seconds.

**The fix.** `vercel.json` now pins `"regions": ["sin1"]`, putting the compute
in the database's region and the audience's. Live at `sin1::sin1::…`.

**After** (`sweep-after-sin1-shipped.json`, 07:16–07:18Z, the same 86 URLs on the
shipped deployment, every entry cold because the deploy was minutes old):

```
x-vercel-cache: MISS   n=85   server p50 168  p90 255  max 1191 ms
                              ttfb   p50 208  p90 396  max 1224 ms
WAITED FOR A RENDER    n=85   server p50 168  p90 255  max 1191 ms
requests with ttfb > 5000ms (the route's maxDuration): 0
```

| | before (`iad1`) | after (`sin1`) |
| --- | --- | --- |
| cold render, p50 | 3,478 ms | **168 ms** |
| cold render, p90 | 3,717 ms | **255 ms** |
| cold render, max | 4,220 ms | **1,191 ms** |
| margin under `maxDuration = 5` at p90 | 1.3× | **19.6×** |

**20.7× at p50.** All 86 responses came from `sin1::sin1`; 0 non-200 across all
258 requests in the three rig sweeps.

Re-measured once more on `58280eb`, the commit actually serving the site as this
entry was written, again in the minutes after its deploy so the whole corpus was
cold (`sweep-confirm-58280eb.json`, 07:48–07:50Z):

```
x-vercel-cache: MISS   n=85   server p50 156  p90 232  max 1139 ms
requests with ttfb > 5000ms (the route's maxDuration): 0
```

Two independent post-fix sweeps of the same 86 URLs, on two different
deployments, agree to within 12 ms at p50. That is the number to hold the site
to.

This also re-sizes the 5-wide pool in `src/lib/db/drizzle.ts` without touching
`max`: five lanes at 175 ms a query clear ~28 queries a second, the same five at
15 ms clear ~330. The pool starvation behind Sentry TWN-NEW-47 was never really
about `max`.

---

## 4. The 502: the budget could outspend the ceiling

`502 FUNCTION_RESPONSE_STREAM_INCOMPLETE` is what Vercel produces when
`maxDuration` kills a function that has **already started streaming**. The
reader gets a truncated response and a 502 — not a slow page, not an error page
— and neither does any of this route's carefully-written fallbacks get to run,
because every one of them needs the function to still be alive.

The route could reach that state because it was allowed to spend its whole
ceiling on database waiting. `startDeadlineBudget` floors each read at 250 ms so
a late read still gets a real attempt rather than an already-expired deadline —
deliberate, and kept — but the floors therefore **add** to the shared budget:

    4,000 + 250 + 250 + 250 = 4,750 ms of database waiting

against a 5,000 ms ceiling, leaving 250 ms for React to render the article,
serialise it and flush the first byte. `4_000` was a number chosen to sit *near*
`maxDuration` rather than derived *from* it, and that gap is the 502.

The budget is now derived, in `@/lib/inspire/article-cache`:

    ARTICLE_RENDER_BUDGET_MS = maxDuration − render reserve − floors
                             = 5,000 − 1,000 − 3×250 = 3,250 ms

The 1,000 ms reserve is sized against §3's measurement, not a guess. Three tests
pin the arithmetic, including the one thing a constant in a second file cannot
pin by itself: the test reads `page.tsx` as **text** and asserts the
`maxDuration` literal still agrees, because Next requires that export to be
statically analysable and the route therefore cannot import the constant. A
fourth `budgetLeft()` call site fails the suite rather than quietly pushing the
worst case back over the ceiling — verified by breaking the count and watching
it fail.

---

## What shipped

| | |
| --- | --- |
| `6103eab` | `vercel.json` `regions: ["sin1"]`; `scripts/measure-cold-render.mts`; README section "Where the functions run"; the round-trip note on the pool config. Deployed 07:03:58Z. |
| `c9ba319` | derived render budget + three invariant tests. Deployed 07:16:02Z. |

Verified on `origin/master` by content, not by ancestry — cherry-picking changes
the SHA, so `--is-ancestor` returns false forever:

```
$ git cat-file -e origin/master:scripts/measure-cold-render.mts && echo present
present
$ git show origin/master:vercel.json | grep regions
  "regions": ["sin1"],
```

Gates in the ship worktree against `origin/master`: `pnpm typecheck` clean,
`pnpm lint` 0 errors, `pnpm test` 31 files / 392 tests passed, `pnpm build`
exit 0.

**Live link:** <https://hellokahwin.com/artikel/idea-dan-nasihat/garden-wedding>
— the heaviest page on the site at 215 KB (220,095 bytes). Cold
(`x-vercel-cache: MISS`) it answered in **240 ms** server-side after the region
moved; the same URL, also `MISS`, took **3,737 ms** before it. Reproduce with
`pnpm measure:cold --only garden-wedding` on an entry left alone for fifteen
minutes, and read the `server` column — anything reporting `HIT` is not a
measurement of this.

---

## Retrospective

### 1. What did we learn that is not written down anywhere?

**A whole-request total cannot measure a render, and on this site the gap between
the two was 21 seconds.** That is not a subtlety — it inverted the item's entire
premise. The phase that carried the time, `time_connect`, is invisible to
`fetch()`, to a browser's "load time", and to every number Sprint 01 recorded.
Nothing in this repo said so, and the one tool that touched the subject said the
opposite.

**`x-vercel-cache: REVALIDATED` exists, and it means the reader waited for a
render.** It is the edge rebuilding an expired entry *inline*, holding the
connection open — as cold as a `MISS`. It appears nowhere in this repo's cache
documentation, which discusses `HIT`, `MISS` and `STALE` only. It was 25 of 86
rows in the before-sweep: 37% of the renders.

**Node's global agent keeps sockets alive**, so a sequential sweep of one host
silently stops measuring the handshake after row one.

**The functions were 15,000 km from the database and nothing in the repo said
so.** `drizzle.ts` carries four screens of hard-won reasoning about pool sizing
and never mentions that a lane was being held for 175 ms of Pacific.

### 2. Which document must change, and who owns that edit?

**`scripts/audit-rendered-titles.mts` — and I own it, done in this branch.** Its
usage text advertised `--bust` as "unique `?_t=` per URL: skips the Vercel edge,
measures the origin". That is false, re-verified today: one entry ageing through
four requests, `HIT` every time. A tool whose own documentation tells you how to
get a cold path, wrongly, is exactly the mechanism by which this item's premise
survived two sprints. It now carries the four-line proof and points at the two
things that do work — the 900-second clock and the minutes after a deploy. It
does not invalidate any number that script has produced, because every row it
writes carries its own `x-vercel-cache`; it invalidates the *belief* that the
flag makes a run cold.

Also edited here, and also mine: **`README.md`** gains "Where the functions run,
and why it is not the default" with the two-vantage round-trip table, so the
`sin1` pin cannot be tidied away by someone who thinks `vercel.json` is only
about crons; **`src/lib/db/drizzle.ts`** gains the round-trip framing next to the
pool-sizing note it contradicts.

**Still owned by someone else: `docs/work-done/` is still two folders that do not
know about each other.** This entry is in the site repo; the company record is in
`hellokahwin/docs/work-done/`. That was follow-up #2 of the 26 Ogos entry, is
unresolved, and this entry has just widened the split again. **Owner: CEO /
`endsprint`.**

### 3. What did we do twice that we should never repeat?

**Measured a cold render against a warm cache.** Sprint 01 did it; my own first
reconnaissance sweep did it twelve minutes into this item — 12 URLs, all `HIT`,
and one of them the 21-second reading. The rule already existed in the DoD
("a warmed cache proves nothing") and I still had to be told by the header.
Recording `x-vercel-cache` on every row is the only thing that makes the mistake
self-announcing.

**Built a summary keyed on a hardcoded list of enum values.** RISK-07 learned
this three days ago in the indexing monitor — *"a bucket label that cannot
describe a defect is a place for that defect to hide"* — and wrote it in that
file. My rig repeated it exactly: it iterated
`['MISS','STALE','HIT','BYPASS','PRERENDER']` and silently dropped 25 of its own
86 rows because nobody had told it about `REVALIDATED`. The lesson was written
down in one file and never generalised. Both are now derived from the data.

### 4. What did we nearly ship, and what caught it?

**Nearly shipped "cold renders take 3.5 s and the root cause is the deadline
budget"** — a tidy, wrong story that would have attributed 21 seconds of someone
else's network to our route, and left the real 3.5-second cause untouched
underneath it. What caught it was one column: a 21.1-second row stamped
`x-vercel-cache: HIT`. A HIT runs no function. Everything else followed from
refusing to explain that row away.

**Nearly shipped a rig that reported 61 of its own 86 rows** and would have had
me quote a p90 computed over a population missing 37% of the renders in it. What
caught it was checking the arithmetic of the summary against the row count
before quoting it — `43 + 1 + 17 ≠ 86`.

### The edits named above are made

- `scripts/audit-rendered-titles.mts` — the `--bust` correction, with proof.
- `README.md` — "Where the functions run, and why it is not the default".
- `src/lib/db/drizzle.ts` — a lane is sized in round trips, not in queries.
- `src/lib/inspire/article-cache.ts` + its test — the budget arithmetic.
