# Baseline — SEO-01: GSC indexing and per-article baseline, 28 live articles

**Sprint 01 · SEO-01 · 2 points · head-of-seo-content**
**Brief:** `aug-25-2026-brief-seo-01-indexing-baseline.md`

**Capture date: 25 Ogos 2026.** Sitemap resubmitted 15:58 MYT; URL inspections
and analytics pulled in the hours following, crossing local midnight into
26 Aug. Every number below is a Google Search Console reading on property
`https://hellokahwin.com/` (service account, `siteFullUser`). Nothing here is
estimated. Where GSC has no row, the table says **0**, not blank.

**Data end dates.** GSC `final` data ends **2026-08-23** — two days behind, as
the measurement rule says. Figures for 24–25 Aug use `dataState=all` (fresh,
unconfirmed, will move). 25 Aug is essentially empty and that is lag.

---

## The headline

**Twenty of the twenty-eight articles have never been crawled.** Not
deprioritised, not demoted — never fetched. Eight are indexed, and all eight
are the same cluster.

| Index state | Count | Which |
|---|---|---|
| **Submitted and indexed** | **8** | All of `hantaran-mas-kahwin`. Last crawled 2026-08-25, Breadcrumbs rich result on each |
| **Discovered — currently not indexed** (never crawled) | **19** | All of `nikah-undang-undang` (4), `ucapan-doa` (3), `busana-pengantin` (3), `venue-perancangan` (4), `sebelum-nikah` (3), plus 2 of `pelamin-kad-cenderahati` |
| **URL is unknown to Google** | **1** | `pelamin-kad-cenderahati/bunga-telur` |

**8 / 28 indexed. This is the number Sprint 02 scores against.**

All 28 return HTTP 200 and none carries a `robots` meta tag — verified against
the live site, not inferred. Nothing is technically blocked. The constraint is
crawl scheduling alone.

### The pillars explain the pattern

| Pillar | Index state | Last crawled |
|---|---|---|
| `hantaran-mas-kahwin` | Submitted and indexed | 2026-08-25 |
| `ucapan-doa` | Discovered — not indexed | Never |
| `busana-pengantin` | Discovered — not indexed | Never |
| `venue-perancangan` | Discovered — not indexed | Never |
| `sebelum-nikah` | Discovered — not indexed | Never |
| `nikah-undang-undang` | **Unknown to Google** | Never |
| `pelamin-kad-cenderahati` | **Unknown to Google** | Never |
| `/artikel` (hub) | Submitted and indexed | 2026-08-23 |
| `/` (home) | Submitted and indexed | 2026-08-23 |

The one indexed cluster is the one whose pillar is indexed, and that pillar is
indexed because a legacy article — `mas-kahwin-ikut-negeri`, in the index since
before the migration — was re-parented into it. Googlebot had a reason to walk
into that pillar. It has no equivalent reason to walk into the other six.

The two "unknown" pillars are consistent with this: the `/artikel` hub links all
seven pillars, but the hub was last crawled 2026-08-23, while P1 was fixed on
24 Aug and P5 published on 25 Aug. Google has not re-read the hub since those
links appeared.

---

## What was done, and what was NOT

**Done — sitemap resubmitted.** `mcp__gsc__submit_sitemap` at 15:58 MYT on
25 Aug. Google re-downloaded within the minute. Status `processed`, **73 URLs
submitted, 0 errors, 0 warnings** — up from the 47 URLs of its own 00:32 fetch
that morning, which predated the day's publishing.

**Done — index status for all 28**, via `mcp__gsc__batch_url_inspection`
(three batches of ten; the tool caps at ten per call). This is the DoD's "which
articles Google has not indexed at all yet" figure.

**Done — per-article baseline**, via `mcp__gsc__get_advanced_search_analytics`,
unioning old and new URLs.

**NOT done — manual "Request Indexing" submissions. This is a deliberate
decision, not an oversight.** The GSC API cannot request indexing: the URL
Inspection API is read-only, and the Indexing API accepts only `JobPosting` and
`BroadcastEvent` page types. The only route is clicking through the Search
Console web UI in a browser, roughly 10–12 URLs per day against quota.

The CEO ruled the browser path out mid-item and I agree with the reasoning. It
is slow and fragile, it needs the owner's own browser session, and it is
marginal: all 20 uncrawled URLs are already in state **"Discovered — currently
not indexed"**, which means Google has them queued from the sitemap. Manual
requests reorder that queue; they do not create discovery that is missing. The
one genuinely uncovered case is `bunga-telur`, which is "unknown to Google" —
and the 15:58 sitemap resubmission is precisely the fix for that.

**What this costs us:** possibly a few days on when the 20 uncrawled articles
get fetched. It does not change the baseline, which is the deliverable.

**The better lever, for the record.** If we want to accelerate crawling without
a browser, the highest-value move is not per-article requests at all — it is
giving Googlebot a reason to enter the six cold pillars, the way the legacy
re-parent gave it a reason to enter `hantaran-mas-kahwin`. That means editorial
links from the two indexed legacy pages that hold all our traffic
(`/dewan-kahwin/`, 1,002 impressions; `/garden-wedding/`, 856) into the cold
pillars. That is a content change we control, it needs no browser and no quota,
and it is a Sprint 02 item rather than a click-through chore.

---

## Per-article baseline — old URLs unioned with new

Window: **2026-07-27 → 2026-08-23**, `dataState=final`, 28 days.

**Twenty-seven of the twenty-eight articles are new slugs with no legacy URL.**
Checked against the WordPress export
(`data/hellokahwin-export/content/posts.json`, 29 posts): exactly one of the 28
— `mas-kahwin-ikut-negeri` — existed before the migration. For the other 27
there is no old URL to union, because there was no old page. Zero is the true
reading, not a measurement gap.

### The 27 new articles

Every one: **0 clicks, 0 impressions, 0% CTR, no position** — in all three
windows (27 Jul–23 Aug final; 21–23 Aug final; 24–25 Aug fresh). None appears in
any GSC page-dimension response. They cannot have impressions; twenty of them
have not been crawled.

| Pillar | Articles | Clicks | Impressions | CTR | Position |
|---|---|---|---|---|---|
| `nikah-undang-undang` | borang-nikah, lafaz-taklik, rukun-nikah, syarat-sah-nikah | 0 | 0 | 0% | — |
| `hantaran-mas-kahwin` (7 new) | apa-itu-mas-kahwin, mas-kahwin-johor, mas-kahwin-kelantan-terengganu, mas-kahwin-melebihi-kadar-minimum, mas-kahwin-pahang-negeri-sembilan, mas-kahwin-perak, mas-kahwin-sabah-sarawak | 0 | 0 | 0% | — |
| `ucapan-doa` | doa-majlis-perkahwinan, doa-pengantin-baru, ucapan-pengantin-baru | 0 | 0 | 0% | — |
| `busana-pengantin` | baju-pengantin-sewa-atau-beli, inai-tangan-pengantin, songket-tenunan-tangan-atau-cetak | 0 | 0 | 0% | — |
| `pelamin-kad-cenderahati` | bunga-telur, contoh-kad-jemputan-kahwin, pelamin | 0 | 0 | 0% | — |
| `venue-perancangan` | bajet-kahwin, checklist-kahwin, harga-sewa-dewan-kahwin, pakej-dewan-kahwin | 0 | 0 | 0% | — |
| `sebelum-nikah` | cincin-tunang, doa-majlis-pertunangan, taaruf-maksud | 0 | 0 | 0% | — |

Note the seven indexed `hantaran-mas-kahwin` articles sit at 0 impressions
*despite being indexed*. Indexed is not ranked. They were crawled on 25 Aug and
final data ends 23 Aug — there has not yet been a day on which they could earn
an impression.

### The one article that needs a union — and it needs a THREE-way one

`mas-kahwin-ikut-negeri` exists at three URLs, and **Google has all three
indexed simultaneously.**

| URL | Clicks | Impr. | CTR | Pos. | Index state | Last crawled |
|---|---|---|---|---|---|---|
| `/mas-kahwin-ikut-negeri/` (legacy WP root) | 0 | **344** | 0% | 12.6 | Submitted and indexed | **2026-07-24** |
| `/artikel/idea-dan-nasihat/mas-kahwin-ikut-negeri` (superseded category) | 0 | 5 | 0% | 8.4 | Submitted and indexed | 2026-08-23 |
| `/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri` (**canonical**) | 0 | **0** | 0% | — | Submitted and indexed | 2026-08-25 |
| **Union** | **0** | **349** | **0%** | ~12.6 | | |

Two things here matter more than the numbers.

**The canonical URL has zero impressions.** All 349 sit on URLs that are not the
one we want to win with. The legacy root was **last crawled 2026-07-24** — a
month ago, and four days *before* the 21 Aug migration. Google has not fetched
it since the 308 went live, so as far as Google knows the redirect does not
exist. Consolidation is not "in flight" on this URL; it has not started.

**The record's own union example is misread.** `ceo-memory.md` and this brief
both say "44 impressions on the old path against 5 on the new `/artikel/…`
path". That 5 is on `/artikel/idea-dan-nasihat/…` — the *superseded* category,
not the canonical one. The canonical path had 0 then and has 0 now. The union
rule as written compares an old URL to another old URL. **It must be three-way
for any re-parented article: legacy root, superseded category, canonical.**

### Site totals for context (union of all URLs, old and new)

| Window | Clicks | Impressions | CTR | Data state |
|---|---|---|---|---|
| 27 Jul – 23 Aug (28d) | 37 | 2,292 | 1.61% | final |
| 21 – 23 Aug (post-migration) | 8 | 302 | 2.65% | final |
| 24 Aug (single day) | 4 | 136 | 2.94% | fresh |
| 25 Aug | 0 | 3 | 0% | fresh — lag |

**None of this traffic comes from the 28 articles.** It comes from two legacy
pages: `/dewan-kahwin/` (28 clicks, 1,002 impressions, pos 9.4 over 28 days) and
`/garden-wedding/` (4 clicks, 856 impressions, pos 36.4). 24 Aug is the highest
impression day in the whole series, but those impressions are on the legacy
pages — **it is not evidence that the new content is working**, and must not be
reported as such.

---

## What I expect to move first, and why

**The brief nominated the mas kahwin cluster and the brief is right — but not
for the reason given.** The argument offered was "it was already at position
10–11". Position is the weakest part of the case. That page has held roughly
position 12.6 for 28 days and converted **344 impressions into zero clicks**. A
page that cannot earn a single click from 344 impressions at page-two position
is exhibiting the failure mode named in our own playbook: impressions at ~0%
CTR, wrong intent for the query. Position 10–11 is not the asset here.

**The asset is the query inventory.** Those 344 impressions arrive on **28
distinct Malay queries**, and the shape of them is the finding:

| Query | Impr. | Position | Now has a dedicated page? |
|---|---|---|---|
| mas kahwin ikut negeri | 23 | 14.0 | yes — the cluster's own article |
| maskawin setiap negeri | 11 | 9.8 | yes |
| mahar ikut negeri | 7 | 10.7 | yes |
| **mas kahwin negeri sembilan** | 5 | **34.6** | **yes — `mas-kahwin-pahang-negeri-sembilan`** |
| **mas kahwin sabah** | 5 | **37.0** | **yes — `mas-kahwin-sabah-sarawak`** |
| **mas kahwin negeri perak** | 4 | **34.0** | **yes — `mas-kahwin-perak`** |
| **mas kawin sabah** | 4 | **31.2** | **yes** |
| mahar misil dan mahar musamma | 3 | 7.3 | partly — `apa-itu-mas-kahwin` |
| mas kahwin | 2 | 44.0 | yes — `apa-itu-mas-kahwin` |
| berapa mas kahwin | 1 | 41.0 | yes — `apa-itu-mas-kahwin` |

**Ranked, with the confidence each one actually earns:**

1. **`mas-kahwin-perak`, `mas-kahwin-sabah-sarawak`,
   `mas-kahwin-pahang-negeri-sembilan`.** Measured demand exists; a single
   omnibus page is currently serving it from **positions 31–37** — page four —
   and these pages are already indexed. A dedicated state page displacing an
   omnibus page on a state-specific query is the most reliable movement
   available in this dataset, and it is capture of an unserved position rather
   than defence of an existing one.
2. **`apa-itu-mas-kahwin`.** "mas kahwin" (pos 44) and "berapa mas kahwin" (pos
   41) are definition intent that a state-rate table answers badly. Indexed, and
   the query demonstrably exists.
3. **`mas-kahwin-johor`, `mas-kahwin-kelantan-terengganu`,
   `mas-kahwin-melebihi-kadar-minimum`.** Indexed, same cluster, but with no
   measured query demand in our own GSC. The case is topical, not evidenced —
   lower confidence, and stated as such.
4. **`mas-kahwin-ikut-negeri` itself: I expect it to move LAST, not first.** It
   is defending a 0% CTR position while competing against two other indexed
   copies of itself, one of which Google has not re-crawled in a month.
5. **The remaining 20 articles cannot move at all until they are crawled.**
   There is no ranking signal to argue from. Any prediction about them would be
   invention, so I am not making one.

**Timeline.** Weeks for the state pages, on the competitor-derived expectation
that low-difficulty Malay queries move quickly at low DR. That expectation comes
from what competitors hold, not from a measurement of our own site. For the six
uncrawled clusters the clock has not started.

---

## Two findings the brief did not ask for

**1. The sitemap lags the publishing batch by up to a day.** Google last
downloaded the sitemap at **00:32 on 25 Aug and got 47 URLs**. Articles
published from 09:25 that morning onward were not in that fetch. After
resubmission at 15:58 it reads **73 URLs, 0 errors, 0 warnings**. The sitemap
route also carries `s-maxage=3600`, so the edge can serve an hour-stale sitemap
on top of that. **Resubmitting the sitemap belongs in the publish routine, not
in a sprint item.**

**2. There is a second, unsubmitted taxonomy.** `/artikel` links **36** category
URLs; the sitemap contains **15**. The other **21** are legacy WordPress
categories that return 200 and are crawlable — for example
`/artikel/mas-kahwin-ikut-negeri-panduan` lists the same 8 articles as the
`hantaran-mas-kahwin` pillar and self-canonicalises to itself.

This is not a crawl trap: I checked, and the article links on those pages are
already canonical, so there are no 308 hops. But it is 21 duplicate listing
pages competing for crawl budget against 20 articles that have never been
fetched, and it splits the "one pillar per entity" signal. Recommendation: keep
them out of the sitemap (already true) and drop them from the `/artikel` hub, or
`noindex` them. **Flagged, not fixed — no production writes in this brief.**

---

## Gap found: three states with demand and no page

Our own GSC shows measured impressions for states the cluster does not cover
with a dedicated page:

| Query | Impressions | Position |
|---|---|---|
| mas kahwin negeri selangor | 1 | 23.0 |
| selangor mas kahwin | 1 | 30.0 |
| mas kahwin kl | 4 | 32.0 |
| mas kawin wilayah persekutuan | 1 | 11.0 |
| mas kahwin penang | 1 | 20.0 |
| mas kahwin pulau pinang | 2 | 36.5 |

Selangor, Wilayah Persekutuan and Pulau Pinang — among the highest-population
states in the country — have demand and no page. The cluster stands at 8
articles, the floor of the 8–15 window for a narrow entity. Adding these three
takes it to 11 and covers the states most likely to search. **Sprint 02
candidate**, and it is the same lever as items 1–2 above, which is the argument
for it.

---

## Scoring instructions for Sprint 02

Score against these four, all captured 25 Aug 2026:

1. **Articles indexed: 8 / 28.** The primary number.
2. **Articles never crawled: 20 / 28.**
3. **Canonical-URL impressions across all 28: 0.**
4. **Union impressions across all 28 (legacy + superseded + canonical): 349** —
   all on one article, all on non-canonical URLs, 0 clicks.

And two rules for the report that produces the score:

- Union **three** URLs for any re-parented article, not two.
- Report the 28 separately from the legacy pages. `/dewan-kahwin/` and
  `/garden-wedding/` carry 1,858 of the site's 2,292 impressions; folding them
  in hides whether the new content did anything at all.
