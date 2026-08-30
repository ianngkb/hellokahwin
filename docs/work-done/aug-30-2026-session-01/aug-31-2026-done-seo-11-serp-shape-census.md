# SEO-11 — SERP-shape census: 84 queries classified, and the discriminator is not the AI Overview

**Sprint:** 04 · **Item:** `SEO-11` · 5 points · track `seo`
**Owner:** head-of-seo-content
**Date:** 31 August 2026
**Status:** completed — DoD met in full, plus an extension tier

---

## The headline

The board found a 15x CTR split across three queries on 30 August and attributed it
to the AI Overview. The census confirms a split of that size — **12.2x at matched
positions, Fisher exact p = 0.00002** — and identifies a variable that carries it
reliably: **what kind of answer the query wants.** A document the reader takes away,
against a number or a definition Google can state in two sentences.

**On the AI Overview itself the census is inconclusive, and I want to be exact about
that rather than tidy.** It reads p = 0.102 across all 30 rows in the analysis band
and **p = 0.0009 across the 23 rows whose SERP snapshot is actually from the
measurement month**. The subset that flips it is not neutral — it removes the two
best-converting AI-Overview'd queries we own. With 14 clicks in the band, the AI
Overview question is **not decidable from this data in either direction.** The 15x
figure is neither confirmed nor refuted.

Intent, by contrast, holds at p = 0.000003 to 0.000025 under every treatment.

**So the operative conclusion is not "the AI Overview does not matter". It is: gate
on the variable that survives the robustness check.** Decision 156 was right that
the split is real, and right in the prose it used to describe the mechanism — *"the
test is whether a two-sentence answer satisfies the searcher"*. What it turned that
into was a check on a SERP feature, when the checkable thing was the query itself.

---

## 1. What was produced

| Deliverable | Path |
|---|---|
| The census | `docs/work-done/aug-30-2026-session-01/serp-shape-census.csv` — 84 rows |
| The builder | `scripts/seo/serp-shape-census.py` — reruns the whole thing in one command |

The CSV carries every column the DoD names — `query`, `impressions`, `position`,
`actual_ctr_pct`, `ai_overview_present`, `ai_overview_position`, `paa_present`,
`image_pack_present`, `expected_ctr_pct`, `ratio_actual_over_expected` — plus
`clicks`, `cluster`, `intent_class`, `landing_page`, `serp_data`,
`serp_update_date` and `tier`.

**The DoD's threshold is `>=20` impressions and that yields 26 rows, not the ~200
the brief anticipated.** The site simply does not have 200 queries at that volume:
346 named queries in the window, 26 of them at 20 impressions or more. I did not
move the threshold to make the number look bigger. I extended *downward* instead —
every query at `>=5` impressions is also in the file, 84 rows, tagged
`tier=extension`. The `tier` column separates them so the DoD population can be
recovered exactly with one filter.

---

## 2. Method, with every condition needed to reproduce it

| Condition | Value |
|---|---|
| Search Console property | `https://hellokahwin.com/` (service account `hellokahwin-gsc@twn-new.iam.gserviceaccount.com`, `siteFullUser`) |
| Window | **2026-08-01 to 2026-08-28**, 28 days, `dataState=final` |
| GSC dimensions | `['query']` for metrics; `['query','page']` for the landing page |
| Device / country filter | **none** — all devices, all countries |
| Ahrefs endpoint | `serp-overview`, **country `my`** |
| Ahrefs `select` | `position,type,url,title,domain_rating,traffic,update_date` |
| Ahrefs SERP crawl dates | carried per row in `serp_update_date`. **Range 2023-08-09 to 2026-08-28** — 37 of the 49 crawled SERPs are from August 2026, 11 from July 2026, and **one from August 2023**. This is load-bearing; see §5.1. |
| Volume data | `keywords-explorer-overview`, country `my`, field **`volume`** (12-month average), pulled 2026-08-31 |
| Ahrefs units spent | **23,350** on `serp-overview` + **2,624** on volumes + ~500 on probes. Budget was 251,613 of 400,000 remaining, so the census was never unit-constrained and no sampling was necessary. |

Our own performance is Search Console only. Ahrefs is used solely for the shape of
the SERP — decision 91, where Ahrefs reported 9 organic keywords against GSC's
2,869 impressions on the same day.

Rerun it with:

```
python scripts/seo/serp-shape-census.py \
    --start 2026-08-01 --end 2026-08-28 --min-impressions 5 \
    --out docs/work-done/aug-30-2026-session-01/serp-shape-census.csv
```

---

## 3. The expected-CTR curve, and the three I rejected

**The curve used** is First Page Sage, *Google Click-Through Rates (CTRs) by
Ranking Position*,
`https://firstpagesage.com/reports/google-click-through-rates-ctrs-by-ranking-position/`,
publisher's stated update 28 May 2025, retrieved 31 August 2026. Quoted in full in
the script:

| 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|
| 39.8% | 18.7% | 10.2% | 7.2% | 5.1% | 4.4% | 3.0% | 2.1% | 1.9% | 1.6% |

Its weaknesses, stated rather than buried: the publisher discloses **no sample
size**, it is a meta-analysis rather than a measurement, it is not
Malaysia-specific and not Malay, and **it stops at position 10.** Positions past 10
are written `NA` in the CSV and excluded from every ratio statistic. Nothing is
extrapolated. That leaves 10 of the 26 DoD rows without a ratio, and nine of those
ten are the quarantined `garden-wedding` family sitting at positions 29 to 49.

Values are interpolated linearly between integer positions, because our position is
a fractional GSC average. On a convex curve that overestimates the expectation
slightly, which makes our CTR look *worse* than it is — the safe direction, since it
runs against the conclusion below.

**Three better-matched curves were tested and failed, and the failures are worth
recording because each looks usable until you plot it.**

1. **Ahrefs `gsc-ctr-by-position` on our own project (10264089).** Degenerate:
   position 1 reads 0.0% CTR from 2 keywords, position 4 reads 33.3% from 3.

2. **The same tool on TheWeddingNotebook (project 10264088), 2026-08-01..28.** Reads
   **17.0% at position 10, 26.2% at position 15, 34.9% at position 18** — CTR rising
   with depth. That is the signature of an **unweighted mean of per-keyword CTRs**,
   where one keyword with 1 impression and 1 click reads 100% and drags the mean up
   wherever samples are thin. It is not a CTR curve, and this is the finding that
   matters most for anyone reaching for that tool later.

3. **An impression-weighted curve built by hand from TWN's Search Console**
   (`gsc-keywords`, 52,823 impressions, 3,071 clicks, same window). Sound at
   positions 1–9 — 24.5%, 13.2%, 4.9%, 5.9%, 3.0%, 3.5%, 3.3%, 2.0%, 2.6% — and
   unusable past 9, because the endpoint **caps at 250 rows** (`limit=10000` returns
   250) and that truncation keeps only the highest-click keywords at depth.

**The brief asked me to disclose the circularity if I built the curve from our own
GSC. The circularity turned out to be beside the point: there is not enough data to
build one.** Over an 11-month hold-out window (2025-09-01 to 2026-07-31) the site
earned 388 clicks, of which only **34** are attributable to named queries; GSC
anonymises the rest. Thirty-four clicks spread across sixty positions is not a curve.

---

## 4. The hand-verified row — CSV and raw response, both quoted

DoD requirement. Row 8 of the census, `mas kahwin johor`.

**The CSV row, verbatim:**

```
query,cluster,intent_class,landing_page,impressions,clicks,position,actual_ctr_pct,serp_data,ai_overview_present,ai_overview_position,paa_present,image_pack_present,expected_ctr_pct,ratio_actual_over_expected,serp_update_date,tier
mas kahwin johor,mas-kahwin,number,/artikel/hantaran-mas-kahwin/mas-kahwin-johor,106,0,6.28,0.0,yes,true,3,true,true,4.008,0.0,2026-08-09T11:35:09Z,dod
```

**The raw `serp-overview` response for `keyword="mas kahwin johor"`, `country="my"`
— every non-organic row of the 42 returned:**

```json
{"position": 1, "type": ["image"], "url": "https://www.instagram.com/p/C8dcJyTOUTc/", ...}
{"position": 1, "type": ["image"], "url": "https://www.facebook.com/rafysuhaimee/photos/nilai-mas-kahwin-bagi-setiap-negeri...", ...}
{"position": 1, "type": ["image"], "url": "https://www.facebook.com/MMEKadKahwin/posts/nilai-mas-kahwin-mengikut-negeri...", ...}
{"position": 1, "type": ["image"], "url": "https://www.instagram.com/p/DWWONIVEtqx/", ...}
{"position": 1, "type": ["image"], "url": "https://www.threads.com/@byfiezasani/post/DVZz4glgbe9/kadar-mas-kahwin-anak-dara-selangor...", ...}
{"position": 1, "type": ["image"], "url": "https://www.instagram.com/the_doolang/", ...}
{"position": 1, "type": ["image"], "url": "https://www.facebook.com/NazBadruddin/posts/kadar-mas-kahwin-setiap-negeri-paling-mahal-kl-dan-selangor/", ...}
{"position": 1, "type": ["image"], "url": "https://www.instagram.com/p/DZJhMtfEyxP/", ...}
{"position": 1, "type": ["image"], "url": "https://www.mstar.com.my/lokal/viral/2020/02/29/misi-gubahan-mas-kahwin", ...}
{"position": 3, "type": ["ai_overview"], "url": null, "title": null, "update_date": "2026-08-09T11:35:09Z"}
{"position": 3, "type": ["ai_overview_sitelink", "image_th"], "url": "https://www.ppsignature.com/blogs/latest-blog/kadar-mas-kahwin-di-malaysia-mengikut-negeri", "title": "PP Signature Bridal", ...}
{"position": 3, "type": ["ai_overview_sitelink", "image_th"], "url": "https://siraplimau.com/nilai-mas-kahwin-setiap-negeri/", "title": "SirapLimau.com", ...}
{"position": 3, "type": ["ai_overview_sitelink"], "url": "https://lanaianggun.com/blog/Mas-Kahwin-Dan-Mahar", "title": "Lanai Anggun", ...}
{"position": 4, "type": ["question"], "url": null, "title": "Berapa mas kahwin Johor?", ...}
{"position": 4, "type": ["question"], "url": null, "title": "Apakah contoh mas kahwin?", ...}
{"position": 4, "type": ["question"], "url": null, "title": "Berapakah harga mas kahwin di Perak?", ...}
{"position": 4, "type": ["question"], "url": null, "title": "Berapakah harga mas kahwin di Sabah?", ...}
```

Field by field: `ai_overview_present=true` and `ai_overview_position=3` come from the
single `["ai_overview"]` row at position 3. `paa_present=true` comes from the four
`["question"]` rows. `image_pack_present=true` comes from the nine `["image"]` rows.
`serp_update_date` matches. `impressions=106`, `clicks=0`, `position=6.28` are GSC.
`expected_ctr_pct=4.008` is the curve at 6.28: `4.4 + (6.28-6) x (3.0-4.4) = 4.008`.

**One thing the hand-check caught, which is the reason the DoD demands it.** The
first build computed `expected_ctr` from the *unrounded* position and published the
rounded one, so the file said `6.28` and `4.004` — and a reader recomputing 4.008
from the CSV's own numbers would have found a discrepancy they could not resolve.
The script now rounds the position *before* computing, so **the file verifies
itself**. That is a defect the other 83 rows all carried and no summary statistic
would ever have surfaced.

**A note on `image_th` that matters for SEO-12.** `image_th` is a thumbnail hanging
off another feature — it appears on `ai_overview_sitelink` rows above — and is
deliberately **not** counted as an image pack. Only bare `image` is. Anyone reusing
this classifier should keep that distinction.

---

## 5. What the census actually found

### 5.1 The AI Overview: undecidable at this click volume, in both directions

Rows with SERP data, positions 3–11 so that depth cannot explain the gap:

| | n | impressions | clicks | CTR | mean position |
|---|---|---|---|---|---|
| AI Overview present | 24 | 738 | 7 | **0.95%** | 7.92 |
| No AI Overview | 6 | 387 | 7 | **1.81%** | 8.36 |

**Fisher exact, two-sided: p = 0.102.** Across the whole census the direction even
reverses — AI-Overview'd queries read 0.90% against 0.81%.

**That was very nearly the whole finding, and it would have been wrong.** Checking
the `serp_update_date` column turned up something the summary hides: **7 of the 30
band rows carry an Ahrefs SERP snapshot crawled before the GSC window** — eleven from
July 2026 and one from **August 2023**, three years stale, from before AI Overviews
existed. Ahrefs holds no fresher snapshot for them, so this cannot be repaired, only
tested. Doing so:

| treatment | AIO arm | no-AIO arm | p |
|---|---|---|---|
| as published, all 30 band rows | 7 / 738 = 0.95% | 7 / 387 = 1.81% | **0.102** |
| stale snapshots dropped (Aug-2026 crawls only) | 2 / 625 = 0.32% | 7 / 199 = 3.52% | **0.0009** |
| worst case — every stale `false` reassigned to `true` | 7 / 926 = 0.76% | 7 / 199 = 3.52% | **0.0045** |

**Dropping seven of thirty rows moves p from 0.102 to 0.0009.** And the filter is not
neutral: it removes `mas kahwin terengganu` (5.17%) and `idea goodies kahwin`
(10.53%) — the two best-converting AI-Overview'd queries we own, carrying 5 of the
AIO arm's 7 clicks — while also removing the 182-impression zero that dominates the
no-AIO arm. A subset that correlates with the outcome cannot arbitrate the outcome.

**So the honest statement is that this census cannot settle the AI Overview
question.** It does not refute 15x and it does not confirm it. What it establishes is
that **the AI Overview result is unstable under reasonable re-cuts of the same data,
and the intent result is not** (p = 0.000003 to 0.000025 across the identical three
treatments — see §5.2). That asymmetry, not a null, is the reason to gate on intent.

A power note that stands regardless: with these arm sizes the census could have
detected a genuine 15x split at p = 0.0071 and 5x at p = 0.029, but **not** 3x
(p = 0.066) or 2x (p = 0.155). The ~2.4x that Ahrefs' February 2026 study of 300,000
keywords reports is below this census's resolution either way.

**Two observations survive the staleness problem, because a `true` reading on an old
snapshot is the reliable direction** — an AI Overview seen in July is very likely
still there, whereas an *absence* seen in July may since have been filled:

- **`mas kahwin kelantan` and `mas kahwin terengganu` are the same page**
  (`/artikel/hantaran-mas-kahwin/mas-kahwin-kelantan-terengganu`), both carry an AI
  Overview **at position 1**, both carry an image pack, and they sit at positions
  6.69 and 6.19. One earns **0 clicks from 75 impressions**; the other **3 from 58
  (5.17%)**. Same page, same SERP shape, same depth, opposite result. Whatever the AI
  Overview does, it does not explain this pair.
- **`idea goodies kahwin` — the query decision 156 cites as its healthy-CTR
  counter-example — carries an AI Overview at position 1.** Best-performing row in the
  census: 10.53% CTR at position 9.16, ratio **5.68**. Its SERP was never checked when
  the decision was written.

**And one observation I am withdrawing.** I had written that the site's largest
zero-click query, `pusat komuniti setiawangsa` (182 impressions), has no AI Overview.
Its snapshot is from **2026-07-18**, and `false` on a stale snapshot is exactly the
unreliable direction. The claim may well be true; this data cannot support it.

### 5.2 What does separate them: the kind of answer the query wants

`intent_class` is assigned by the script from the grammar of the query itself, so it
is reproducible rather than a judgement call — this is what decision 159 asked
SEO-11 to make mechanical.

Positions 3–11, quarantine excluded:

| | n | impressions | clicks | CTR | 95% CI | mean position |
|---|---|---|---|---|---|---|
| **document** — a text or list the reader takes away | 16 | 220 | 10 | **4.55%** | 2.49% – 8.16% | 7.07 |
| **number / definition** — Google can state the answer | 33 | 806 | 3 | **0.37%** | 0.13% – 1.09% | 7.64 |

**12.2x. Fisher exact, two-sided: p = 0.00002.** The arms sit 0.57 places apart, so
position is not doing the work.

Stated honestly: the document arm's 10 clicks are concentrated — 6 come from
`doa pengantin baru rumi` and 2 from `idea goodies kahwin`, and only 5 of its 16
queries clicked at all. The *existence* of the effect is solid at p = 0.00002; the
point estimate is not. The confidence intervals bound the true ratio at **no less
than 2.3x**, with 12x the best estimate.

**And unlike the AI Overview, it holds under the same re-cuts** — which is the whole
reason to prefer it as the gate:

| treatment | document | number / definition | p |
|---|---|---|---|
| as published | 10 / 220 = 4.55% | 3 / 806 = 0.37% | **0.000025** |
| stale SERP snapshots dropped | 8 / 185 = 4.32% | 0 / 727 = 0.00% | **0.000003** |
| rows with no Ahrefs SERP data also dropped | 8 / 151 = 5.30% | 0 / 480 = 0.00% | **0.000009** |

`intent_class` is derived from the query string, so SERP staleness and missing SERP
data cannot touch the classification at all — the only movement above is the change
in which rows are counted. **That is the argument for this gate in one line: it does
not depend on Ahrefs having crawled anything.**

### 5.3 Why the board saw the AI Overview

Because on Malay wedding SERPs the two variables are nearly the same set:

| intent_class | AIO present | AIO absent | share |
|---|---|---|---|
| number | 15 | 1 | **94%** |
| definition | 2 | 0 | **100%** |
| document | 11 | 3 | 79% |
| navigational | 1 | 4 | 20% |

There is exactly **one** number-intent query in the census without an AI Overview.
Sorting three queries on AI Overview presence therefore also sorts them on intent,
and intent is the variable that survives a position-matched test. The board's
reasoning in prose was correct — *"the test is not topic, it is whether a
two-sentence answer satisfies the searcher"* — and the checkable thing it was turned
into was the wrong one.

**PAA and image pack, tested identically at positions 3–11:** PAA p = 0.0196 (1
click in the true arm — fragile, and PAA co-occurs with number-intent, so it is
probably the same confound wearing another hat); image pack p = 0.098, with only 48
impressions in the false arm. Neither is promoted to a rule.

### 5.4 Queries where actual EXCEEDS expected

Requested explicitly, and they carry the argument:

| query | impr | clicks | pos | actual | expected | ratio | AI Overview |
|---|---|---|---|---|---|---|---|
| idea goodies kahwin | 19 | 2 | 9.16 | 10.53% | 1.85% | **5.68** | **true @1** |
| checklist kahwin | 33 | 1 | 8.03 | 3.03% | 2.09% | 1.45 | false |
| doa pengantin baru rumi | 53 | 6 | 3.53 | 11.32% | 8.61% | 1.32 | false |
| mas kahwin terengganu | 58 | 3 | 6.19 | 5.17% | 4.13% | 1.25 | **true @1** |
| hantaran kahwin 5 balas 7 | 12 | 1 | 3.67 | 8.33% | 8.19% | 1.02 | **true @1** |

**Three of the five over-performers carry an AI Overview**, including the top one.
Four of the five are document-intent.

### 5.5 Zero clicks: which are defects and which are variance

P(zero) = (1 − expected)^impressions, for every DoD row with zero clicks and a
defined expectation. Two are real:

| query | impr | expected | E[clicks] | P(zero) | verdict |
|---|---|---|---|---|---|
| pusat komuniti setiawangsa | 182 | 1.72% | 3.14 | **4.23%** | defect |
| mas kahwin johor | 106 | 4.01% | 4.25 | **1.31%** | defect |
| mas kahwin perak | 107 | 2.09% | 2.23 | 10.46% | variance |
| dewan komuniti setiawangsa | 101 | 1.87% | 1.89 | 14.90% | variance |
| mas kahwin kelantan | 75 | 3.43% | 2.58 | 7.27% | variance |
| walimatul urus maksud | 61 | 2.01% | 1.23 | 28.91% | variance |
| maksud walimatul urus | 42 | 1.93% | 0.81 | 44.03% | variance |
| mas kahwin pahang 2026 | 32 | 2.10% | 0.67 | 50.70% | variance |
| mas kahwin perak 2026 | 30 | 3.00% | 0.90 | 40.10% | variance |
| mas kahwin johor 2026 | 28 | 3.45% | 0.97 | 37.44% | variance |
| mas kahwin sarawak | 21 | 3.46% | 0.73 | 47.72% | variance |

Nine of eleven zero-click rows are ordinary variance. `pusat komuniti setiawangsa`
is a genuine defect **and it has no AI Overview** — it is navigational intent on a
council-hall query, the category decision 83 kept as a control and decision 89
closed before that control ever ran.

### 5.6 The split CTR metric decision 159 ordered

Full census, all 84 rows:

| intent_class | queries | impressions | clicks | CTR | mean position |
|---|---|---|---|---|---|
| document | 18 | 236 | 11 | **4.66%** | 7.70 |
| number | 38 | 815 | 4 | 0.49% | 8.33 |
| definition | 2 | 103 | 0 | 0.00% | 8.59 |
| navigational | 7 | 352 | 0 | 0.00% | 15.61 |
| other | 19 | 752 | 1 | 0.13% | 35.24 |
| **census total** | 84 | 2,258 | 16 | 0.71% | |
| ex-quarantine (garden-wedding removed, decision 148) | 69 | 1,578 | 16 | **1.01%** | |

Board reports should carry the document and number/definition lines. The single
census figure of 0.71% describes no query on the site.

### 5.7 Cluster click ceilings

Demand is Ahrefs `volume` (12-month average monthly MY searches), pulled 2026-08-31,
**deduplicated by `parent_topic`** — sibling queries sharing a parent are counted
once at the family's largest volume, because summing them sells the same demand
twice. Ceilings apply the cited curve at position 3 (10.2%) and position 5 (5.1%).

| cluster | queries | impr | clicks | raw vol | dedup vol | ceiling @3 | ceiling @5 | AIO share |
|---|---|---|---|---|---|---|---|---|
| mas-kahwin | 43 | 857 | 4 | 11,310 | 8,230 | 839 | 420 | 21/23 |
| **nikah-undang-undang** | 3 | 16 | 0 | 6,940 | **6,940** | **708** | **354** | 2/2 |
| dewan-venue | 6 | 305 | 1 | 1,380 | 1,320 | 135 | 67 | 0/3 |
| doa-ucapan | 7 | 119 | 7 | 1,330 | 1,330 | 136 | 68 | 3/4 |
| walimatul-urus | 4 | 198 | 1 | 1,210 | 1,020 | 104 | 52 | 3/3 |
| garden-wedding | 15 | 680 | 0 | 1,710 | 930 | 95 | 47 | 2/10 |
| perancangan-kos | 2 | 40 | 1 | 820 | 820 | 84 | 42 | 0/1 |
| hantaran | 2 | 16 | 0 | 1,050 | 800 | 82 | 41 | 2/2 |
| hiasan-dekorasi | 1 | 19 | 2 | 200 | 200 | 20 | 10 | 1/1 |
| **total** | 84 | 2,258 | 16 | 25,950 | 21,590 | **2,202** | **1,101** | |

These are ceilings, not forecasts: they assume every query is won at that position.
The site currently earns 82 clicks per 28 days against a position-5 ceiling of 1,101
on the queries it already touches.

**`nikah-undang-undang` is the finding here.** 6,940 monthly searches, our largest
single demand pool, and it draws **16 impressions**. `rukun nikah` alone is 6,900 at
difficulty 0, and we sit at position 17.8 on it with a page that already exists.

---

## 6. What this census cannot tell you

Four limits, all of which bound how the result may be used.

1. **It sees 44% of impressions and 20% of clicks.** The site earned 5,158
   impressions and 82 clicks in the window. Named queries account for 2,673 and 18;
   the census's `>=5` cut covers 2,258 and 16. GSC anonymises the rest. Concretely,
   `/dewan-kahwin/` earns **28 clicks from 946 impressions** — the site's best page
   by clicks — and almost none of that is visible at query level.

2. **It can only see demand we already rank for.** A census built from Search
   Console cannot propose a topic we have never appeared for. Any recommendation
   below is therefore an upgrade or an extension of an existing signal. Genuinely
   new territory needs a keyword-gap study, which this is not.

3. **Ahrefs holds no SERP snapshot for 35 of the 84 queries**, including 4 of the 26
   DoD rows — `garden wedding kuala lumpur` (108 impressions), `mas kahwin pahang
   2026`, `mas kahwin perak 2026`, `mas kahwin johor 2026`. This was verified rather
   than assumed: re-requested individually, all still empty, while
   `keywords-explorer-overview` returns volume for them (150, 200, 150) with
   `difficulty: null` and `serp_features: []`. **Ahrefs knows the keyword and has
   never crawled the SERP.** Those rows are written `unknown` — never `false` — and
   excluded from every rate. Note the pattern: almost every uncrawled query is
   **year-stamped**, which is a live blind spot for any future SERP-feature gate.

4. **Eleven clicks carry the document arm.** The effect is significant; the
   magnitude is not settled. Re-run the census at the end of Sprint 05 before
   treating 12x as a planning constant.

5. **SERP snapshots go stale silently.** The 49 crawled SERPs span **2023-08-09 to
   2026-08-28** — 11 from July 2026 and one from August 2023. Nothing in the response
   marks an old snapshot; it looks exactly like a fresh one, and only
   `serp_update_date` reveals it. This is what makes §5.1 undecidable. Treat a stale
   `true` as reliable and a stale `false` as unknown: a feature seen in July is
   probably still there, an absence seen in July may since have been filled.

---

## 7. THE RULE

The DoD asks for the impression threshold above which an AI-Overview'd query is not
worth a new page. The census's answer is that the AI Overview is the wrong variable
to hang the threshold on, so the rule is stated on the variable that survives the
test, with the AI Overview clause kept and answered.

> ### The page-worthiness threshold
>
> **1. Classify the query by the answer it wants, not by the SERP feature it
> carries.**
> - **document** — the searcher leaves with a text or a list they will use: a
>   prayer, a checklist, an item list, a lafaz, a procedure.
> - **number / definition** — the answer is a figure or a meaning, and Google states
>   it.
>
> **2. Apply the threshold in monthly Malaysian search volume (Ahrefs `volume`,
> country `my`):**
>
> | intent | measured CTR at positions 3–11 | volume needed for 10 clicks/month |
> |---|---|---|
> | document | 4.55% | **220** |
> | number / definition | 0.37% | **2,700** |
>
> **A number or definition query below 2,700 monthly MY searches does not earn a new
> page. A document query earns one from 220.**
>
> **3. Do not include or exclude a target on AI Overview presence — not because it
> has no effect, but because this data cannot tell you whether it does.** The same
> position-matched test reads p = 0.102 on all rows and p = 0.0009 on rows with a
> current SERP snapshot, and the subset that flips it removes the two
> best-converting AI-Overview'd queries we own. Intent gives p = 0.000003 to
> 0.000025 under every one of those treatments. **Gate on the variable that is
> stable.** Keep recording the AI Overview: at Sprint 05's click volume it may become
> decidable, and it costs one field.

**Where the numbers come from.** 10 clicks per month is the bar because the whole
site earns 82 clicks per 28 days: a page that cannot plausibly add 10 is adding
under 12% to the company's total output and does not repay an article. Divide that
bar by the CTR each intent class actually achieved at positions 3–11 in this census
and the volume thresholds fall out: 10 / 0.0455 = 220, 10 / 0.0037 = 2,700.

**And if you must have the threshold conditioned on the AI Overview, it is 2,700** —
but only because 94% of number-intent queries carry one. That number is the
number/definition threshold wearing the AI Overview's name, and applying it *as* an
AI Overview rule will wrongly kill document-intent targets like `idea goodies
kahwin`, which carries an AI Overview at position 1 and is the best-converting query
on the site. **The failure mode is not that the AI Overview is harmless. It is that
79% of document-intent queries carry one too, so the feature does not sort the two
classes** — and the classes are what the CTR follows.

**What this rule kills, applied to the census:** the entire `mas-kahwin` state series
below 2,700 — `mas kahwin johor` (1,000), `mas kahwin kelantan` (900), `mas kahwin
perak` (800), `mas kahwin negeri sembilan` (700), `mas kahwin sabah` (350), `mas
kahwin sarawak` (350). No *new* pages there. The existing pages stay; they cost
nothing to keep and they hold the cluster's topical coverage.

---

## 8. CONT-13: six targets, chosen on this evidence

CONT-13 is gated on this census, and the census says plainly that **the return is in
upgrading pages that already rank, not in new pages** — playbook rule 7, and here it
is quantified. Five of the six below are upgrades. That is the recommendation, not a
hedge.

| # | Target | Demand | Our position now | Intent | AIO | Why it is on the list |
|---|---|---|---|---|---|---|
| **1** | **`rukun nikah`** — upgrade `/artikel/nikah-undang-undang/rukun-nikah` | **6,900**/mo, KD 0 | **17.8** | document | true@1 | Largest demand in the census by 3.5x, at difficulty zero, with a page already ranking. Document intent, so the 4.55% CTR band applies. Ceiling at position 5 alone is ~350 clicks/month against the site's current 82. |
| **2** | **`doa pengantin baru` family** — extend `/artikel/ucapan-doa/doa-pengantin-baru` | 1,000/mo parent | 15.73 on `doa pengantin`, 3.53 on `doa pengantin baru rumi` | document | mixed | The best-converting cluster we own: 7 of 16 census clicks from 119 impressions. `doa pengantin baru rumi` returns 11.32% at position 3.53. The head term sits at 15.73 — the same page, one rung short. |
| **3** | **`hantaran tunang` family** — upgrade the four ranking pages | 800/mo parent, plus `dulang hantaran tunang` 800 | 8.11 best | document | 4/4 true | Four queries, 34 impressions, **zero clicks**, all document intent at page-one depth. Document intent at position 8 should return ~4.5%; it returns nothing. This is the clearest gap between what the class predicts and what we get. |
| **4** | **`checklist kahwin`** — upgrade `/artikel/venue-perancangan/checklist-kahwin` | 800/mo, KD 0 | 8.03 | document | **false** | Already beats expectation (ratio 1.45) with no AI Overview and no competition at KD 0. The one target on this list where nothing at all is working against us. |
| **5** | **`pusat komuniti setiawangsa`** — a venue page, **and it reverses decision 89** (see below) | 300/mo | 9.59 | navigational | **false** | 283 impressions across two queries, 0 clicks, **P(zero) = 4.23%** — one of only two statistically real zeros on the site. No AI Overview, page one. |
| **6** | **`mas kahwin ikut negeri`** — consolidate, do not add | 2,000/mo, KD 27 | 13.85 | number | true@1 | The **only** mas-kahwin target clearing the 2,700-adjacent bar in spirit, and the sole KD-27 term in a cluster that is otherwise KD 0. Three URLs already compete for this family (`/mas-kahwin-ikut-negeri/`, `/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri`, `/artikel/idea-dan-nasihat/mas-kahwin-ikut-negeri`). **Consolidation, not a sixth article.** |

**Explicitly not recommended, with reasons:**

- **The `mas kahwin` state series.** 8,230 deduplicated volume and it looks like the
  obvious prize. Every member is number-intent below the 2,700 bar, 21 of 23 carry
  an AI Overview, and the cluster returns 4 clicks from 857 impressions. Keep the
  pages; write no new ones.
- **`garden-wedding`.** Quarantined under decision 148 and the census supports it:
  930 deduplicated volume, 680 impressions, **0 clicks**, positions 29–49. Note for
  the record that only 2 of its 10 checked SERPs carry an AI Overview — its problem
  was never the AI Overview either.
- **`walimatul urus`.** 1,020 volume, definition intent, 100% AIO, 198 impressions
  and 1 click. The definition arm of this census returned 0 clicks from 103
  impressions. This is the clearest example of the class the rule excludes.

### Target 5 conflicts with two standing decisions, and that is the CEO's call

I am not going to bury this in a table cell. **Decision 89 closed
`dewan komuniti setiawangsa` as dead**, and **decision 83 killed the council-hall
category structurally** on the basis that it carried about 30 searches a month
between four halls, with DBKL's own DR 64 portal at positions 1–2.

What this census adds, and why I am raising it rather than quietly complying:

- **`pusat komuniti setiawangsa` reads 300/mo on Ahrefs `volume`, country `my`,
  pulled 2026-08-31.** It was **not one of the four terms decision 83 measured**
  (setiawangsa 10, perdana keramat mall 20, keramat 0, mpaj tasik tambahan 0). The
  category estimate that killed it did not include the term that is actually drawing
  the impressions.
- The two Setiawangsa queries together are **283 impressions, the largest single
  demand signal in the census after the quarantined garden-wedding family**, at
  page-one position, with **no AI Overview** and no operator portal in the way of
  this particular term.
- **Decision 89 itself records that the control never ran** — "SEO-04 parked before
  reaching it, so the control never ran."
- **Decision 132 already diagnosed why the clicks are zero**: the content does not
  exist. We rank `/dewan-kahwin/`, a generic listing, for a specific named venue.
  So this is not a title fix, and I withdraw that framing — a title rewrite on a
  listing page cannot answer a venue query.

**My recommendation is to run it, once, as the control decision 83 asked for and
never got** — one venue page, cheap, with a stated kill date. If a properly built
page still earns nothing at page one with no AI Overview and 300/mo of demand, the
council-hall category is finally *proved* dead instead of assumed dead, and it stops
coming back every third sprint. **But it reverses a closed decision, so it is the
CEO's to approve, not mine to slip into a target list.** If the answer is no, drop
target 5 and take the five above it; nothing else in the list depends on it.

**One caveat on target 1 that the CEO should hear before committing.** `rukun nikah`
is the biggest number in this document and it rests on **5 impressions**. The 6,900
volume is Ahrefs', not ours; our own evidence that we can rank for it is one page at
position 17.8. It is the right first pick because demand and difficulty both favour
it, but it is a bet on Ahrefs' volume figure, not a measurement of our own
performance, and it should be said that way in the board pack.

---

## Evidence

- Census: `docs/work-done/aug-30-2026-session-01/serp-shape-census.csv` (84 rows)
- Builder: `scripts/seo/serp-shape-census.py`
- Every statistic above is Fisher exact two-sided or a Wilson score interval,
  computed from the committed CSV; the CSV is the single source and can be re-derived
  with the command in §2.
- Ahrefs usage before the item: 148,387 of 400,000 units (workspace, reset
  2026-09-21). Consumed by this item: ~26,500.

## What it changed

- Decision 156's stated cause is corrected: the split is intent, not the AI Overview.
- Decision 159's split CTR metric is now a column in a script rather than a
  judgement call.
- SEO-12 has a classifier to turn into a gate — and a cheaper one than planned, since
  `intent_class` is derived from the query string and needs no Ahrefs call.
- CONT-13 has six evidence-ranked targets.

## Follow-ups

- **SEO-12** should gate on `intent_class` + volume, not on AI Overview presence.
- **The persona file `head-of-seo-content.md` PRE-FLIGHT #1 must be rewritten** — see
  the retrospective. It lives in the `buddy` checkout, which I am not the writer for.
- **Re-run this census at the end of Sprint 05.** 11 clicks is a thin base for a 12x
  constant.
- **Year-stamped queries have no Ahrefs SERP data at all.** Any SERP-feature gate
  needs a defined behaviour for that case; today it would silently see nothing.

---

## Retrospective

### 1. What did we learn that is not written down?

**A three-query comparison cannot separate two variables that co-occur 94% of the
time.** Decision 156 sorted three queries on AI Overview presence and concluded the
AI Overview was the cause. On Malay wedding SERPs, "the query wants a number" and
"Google prints an AI Overview" are nearly the same set — one number-intent query in
84 lacks an AI Overview. Any sort on one is a sort on the other. Nothing in the
playbook says that a small sample cannot distinguish correlated causes, and it is
the whole reason this census exists.

**And the tool that looks purpose-built for the job is wrong.** Ahrefs
`gsc-ctr-by-position` returns an unweighted mean of per-keyword CTRs. It reads 17.0%
at position 10 and 34.9% at position 18. Anyone who quotes it without plotting it
will publish a curve that rises with depth.

### 2. Which document must change, and who owns the edit?

**`docs/boardroom/decision-log.md`, decision 156** — my checkout, my edit, **made in
this commit.** Decision 156 states the cause as the AI Overview "NOT BY POSITION";
the census shows position explains a large share of its own three-query example
(5.3x between its anchors from the curve alone) and that intent explains the rest.

**`.claude/agents/head-of-seo-content.md` — PRE-FLIGHT #1** — and this one I did
**not** make, deliberately. The file lives in `~/Documents/Code/buddy` at
`skillcentral/agents/projects/hellokahwin/Marketing/head-of-seo-content.md`, and that
tree has another agent writing in it throughout this sprint. Writing there would
violate the one-writer rule I was given and could move another agent's HEAD with no
error and no signal.

Its working tree was dirty at every point I checked, though **the specific files
changed between checks** — `packages/db/src/index.ts` and `scripts/sprint.ts` at
00:50, then `skillcentral/agents/projects/hellokahwin/Design/creative-director.md` at
01:45, with `skillcentral/agents/Marketing/` untracked throughout. Treat any file list
here as a snapshot; **the durable fact is that the tree has a live writer, not which
files it had open.**

**The exact replacement text is in
`docs/plans/aug-30-2026-session-01/aug-31-2026-patch-preflight-1.md`** (committed and
pushed in this commit). Landing it takes all four steps of the persona's own rule —
correct → committed → **PUSHED** → **deployed**:

1. Apply the patch text to the buddy source file above, from the buddy checkout.
2. Commit **and push** it. `git status` reads clean while a commit sits unpushed;
   the count that shows it is `git rev-list --count @{u}..HEAD`.
3. Run **`skillcentral/install.sh`** from the buddy checkout. `.claude/agents/` is a
   plain copy and is git-ignored, so neither `git status` nor the unpushed count will
   ever tell you the deploy landed.
4. Hand over the diff that proves it, `tr` included — without it CRLF makes every
   line read as changed and you learn nothing:

```
diff <(tr -d '\r' < skillcentral/agents/projects/hellokahwin/Marketing/head-of-seo-content.md) \
     <(tr -d '\r' < <repo>/.claude/agents/head-of-seo-content.md)
```

Verified 31 Aug 2026 01:45: buddy source and the deployed copy are currently
**byte-identical**, so step 3 is not optional — editing the source alone changes
nothing that the next seat loads.

PRE-FLIGHT #1 currently instructs the next occupant of this seat to reject targets
on AI Overview presence. On this census that rule would have killed
`idea goodies kahwin` — AI Overview at position 1, 10.53% CTR, the best-converting
query we own.

### 3. What did we do twice that we should never repeat?

**Sourcing the expected-CTR curve.** Four separate attempts — Ahrefs on our project,
Ahrefs on TWN, a hand-built impression-weighted TWN curve, then published studies —
before settling, and two of them were abandoned only after the data was in hand.
The general lesson is the one DES-09 already wrote down and I did not apply:
**pick and write the measuring instrument before you meet the thing it measures.**
Had "the curve must be monotonic, cover positions 1–20, and disclose its sample
size" been written first, three of the four would have failed on sight.

Made concrete rather than left as prose: the curve now lives in
`scripts/seo/serp-shape-census.py` as a named constant with its URL, retrieval date
and stated limits in the comment above it, so the next census inherits the decision
instead of re-litigating it.

### 4. What did we nearly ship, and what caught it?

**A refutation I did not have the data to make — and this is the big one.** The
write-up said, in bold, that the AI Overview finding was *"a refutation, not merely a
failure to confirm"*, with a power calculation to back it. Then a stray accuracy
check on an unrelated sentence — I had asserted a SERP crawl-date range in the method
table and went to verify it — turned up a snapshot from **August 2023** and eleven
from July. Re-running the same test on current snapshots only moved p from 0.102 to
**0.0009**. The conclusion I was 20 minutes from committing was an artefact of stale
data, and it was pointed the wrong way.

What makes it instructive is that the correct final answer is neither the original
claim nor its opposite: the AI Overview is **undecidable** here, because the re-cut
that flips it is correlated with the outcome. The recommendation did not change —
gate on intent — but the *reason* did, from "the AI Overview does not matter" to
"intent is stable and the AI Overview is not". Those license very different future
decisions, and only the second is true.

**What caught it was checking a claim I had made in passing, not the headline.** The
crawl-date range was a throwaway line in a method table. Nothing in the analysis
depended on it. **The load-bearing number was the one nobody would have audited, and
it was reached through the one that did not matter.**

The form this takes: `serp_update_date` was already a column — I had put it there and
then reported a summary of it from memory instead of computing it. So the rule is not
"add a column". It is: **every date range, count and total you state in prose gets
computed from the artefact in the same pass that writes the sentence.** Where a
census is involved, that means a robustness table, not a p-value: **any finding from
this census ships with its value under at least two re-cuts of the data,** because at
14 clicks a single subsetting decision moves p by two orders of magnitude.

**A census whose own arithmetic did not reproduce.** `expected_ctr_pct` was computed
from the full-precision GSC position while the CSV published the rounded one, so the
file said position `6.28` and expected `4.004`, where 6.28 gives 4.008. Every one of
the 84 rows carried it. **The DoD's hand-check caught it** — not a test, not a
review, but the requirement to recompute one row by hand from the published numbers.
No summary statistic would ever have shown it, and a reader who tried to verify the
file would have found a discrepancy they could not explain and reasonably stopped
trusting the whole thing. The fix is in the script with the reason attached.

**Second, and worse: I nearly recorded `ai_overview_present=false` for 35 queries
Ahrefs has never crawled.** The empty `positions` array reads exactly like a clean
SERP. Those 35 rows are 499 impressions, and four of them are DoD rows. Recording
them as `false` would have inflated the no-AIO arm with queries whose SERP nobody has
seen — and it would have done so in the direction that made the headline finding
*stronger*. What caught it was the sprint rule to verify a surprising absence:
`organic` appeared on only 49 of 84 SERPs, which is impossible for real Google
results, and pulling that thread found the empty responses. They are `unknown` in
the file, and the script carries a comment forbidding the change.

### Form these lessons took

| Lesson | Form |
|---|---|
| Intent class, not AI Overview, gates a target | `intent_of()` in the census script — a column, computed from the query string, ready for SEO-12's gate |
| Never write `false` for a SERP nobody crawled | `serp_data` column + `unknown` value + a comment in the script forbidding removal |
| A stale `false` is also unknown | Decision 174, clause (b) — and `serp_update_date` is already a column, so SEO-12 can enforce it |
| No finding ships on one p-value | Decision 174, clause (c): every census finding carries its value under two re-cuts. §5.1 and §5.2 both do |
| The published file must verify itself | Position rounded before the expectation is computed, with the reason in the code |
| The curve is a decision, not a preference | Named constant with URL, date and limits in the script |
| Decision 156's cause | Correction written into `decision-log.md` as decisions 169–174 |
| PRE-FLIGHT #1 | Patch text written; **escalated**, not applied — wrong checkout |

The one lesson that stayed prose, because I could not find a mechanical form for it:
**a claim made in passing gets the same verification as a claim in the headline.**
The stale-snapshot discovery came from checking a throwaway sentence in a method
table. I cannot write a script that finds the sentence nobody would audit. The
closest mechanical proxy is decision 174's clause (a) — compute every range and count
from the artefact in the pass that writes it — and that is what has been recorded.
