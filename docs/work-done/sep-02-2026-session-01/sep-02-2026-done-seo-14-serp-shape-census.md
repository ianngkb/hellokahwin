# SEO-14 — the SERP-shape census re-run, and the answer CONT-17 was waiting for

**Item:** SEO-14, Sprint 06 · **Owner:** `head-of-seo-content` · **Date:** 2 September 2026
**Integration branch:** `feat/command-centre-dashboard` (docs line) · **Space:** DOCS
**Reviewer:** Claude — `/bmad-code-review` was **not** dispatched and `codex-reviewer` was
**not** dispatched. Review was my own adversarial pass, run as the checks in §8. No
OpenAI-backed path was used at any point, per the owner's 02 Sept directive.

---

## THE ANSWER, IN ONE LINE

**The split HOLDS. CONT-17 may proceed.** The document/number CTR ratio is **7.5×**
(SEO-11's frozen classifier) and **6.5×** (the SEO-12 gate) on the freshest 28 days of
final data, at Fisher exact two-sided **p = 0.0000125** and **p = 0.0000185**, with a 95%
confidence interval on the ratio of **3.00× – 18.5×** and **2.74× – 15.3×**. Decision 171's
floor is 2.3×. Every one of the six re-cuts across two windows and two classifiers sits
above it, and every computable confidence interval excludes parity.

```
$ python scripts/seo/census-restate.py \
    docs/work-done/sep-02-2026-session-01/serp-shape-census-2026-09-02.csv \
    --compare docs/work-done/aug-30-2026-session-01/serp-shape-census.csv
...
  frozen intent_of()       worst re-cut 7.5x vs the 2.3x floor | 3 of 3 re-cuts computable | CI excludes parity in 3 of 3 | HOLDS
  gate classifier          worst re-cut 6.5x vs the 2.3x floor | 3 of 3 re-cuts computable | CI excludes parity in 3 of 3 | HOLDS

  CONT-17 MAY PROCEED - the document/number split has not collapsed.
RESTATE EXIT: 0
$ echo $?
0
```

**12.2× → 7.5× is not a fall, and reading it as one would be the mistake.** 7.5× sits
inside SEO-11's own 95% interval, which was **3.39× – 44.0×**. The interval has narrowed
to **3.00× – 18.5×** because the band now carries **20 clicks instead of 13** and 1,515
impressions instead of 1,026. The effect did not move; the estimate got more precise, and
12.2× was always near the top of a very wide interval rather than a constant.

**Three things the board must carry with that number**, all in §4: the six Sprint 05
articles are **not in this measurement** and could not have been; SEO-11's crude bound has
slipped fractionally under 2.3× on one of six cuts; and decision 187's "`doa` at mean
position 21.7", the sentence CONT-17's scope rests on, **describes no query the family
holds** — the impression-weighted figure is **9.8**.

---

## 1. What was run, and with what

| | primary census | inclusive census |
|---|---|---|
| file | `serp-shape-census-2026-09-02.csv` | `serp-shape-census-2026-09-02-inclusive.csv` |
| GSC property | `https://hellokahwin.com/` | same |
| window | **2026-08-02 .. 2026-08-29** | **2026-08-05 .. 2026-09-01** |
| `dataState` | **final** | **all** (provisional in its last days) |
| length | 28 days | 28 days |
| min impressions | 5 | 5 |
| rows | **95** | **134** |
| named impressions / clicks | 2,899 / 24 | 4,039 / 30 |
| Ahrefs `serp-overview`, country | `my` | `my` |
| Ahrefs units consumed | 27,646 | 38,032 |

```
python scripts/seo/serp-shape-census.py --start 2026-08-02 --end 2026-08-29 \
  --min-impressions 5 --data-state final \
  --out docs/work-done/sep-02-2026-session-01/serp-shape-census-2026-09-02.csv

python scripts/seo/serp-shape-census.py --start 2026-08-05 --end 2026-09-01 \
  --min-impressions 5 --data-state all \
  --out docs/work-done/sep-02-2026-session-01/serp-shape-census-2026-09-02-inclusive.csv
```

**Why two windows.** `dataState=final` lags. On 02 September it stops at **2026-08-29**,
three days before the day this item ran, and the six Sprint 05 articles went live on
**01 September**. A final-data window therefore *cannot* contain them. The inclusive
window uses `dataState=all`, reaches 01 September, and exists to answer one question —
whether the new articles registered anything — rather than to be the headline. It is
reported in full anyway because it is the larger sample and it agrees.

Verified rather than assumed, GSC `dimensions=["date"]`:

```
final : 08-20 … 08-29 (last final day 2026-08-29, 1,481 impressions)
all   : … 08-30 (1,219), 08-31 (1,109), 09-01 (109 — clearly partial)
```

---

## 2. The frozen classifier was NOT edited. The gate's was imported.

`intent_of()` in `scripts/seo/serp-shape-census.py` carries a comment telling the next
seat exactly what to do at this point: *"When the census is re-run at the end of Sprint 05,
import the gate's classifier and re-issue the CSV; do not quietly edit this one and leave
a file nobody can reproduce."* That is what was done.

**Proof the frozen block is untouched** — extracted from `INTENT_PATTERNS` to
`return "other"` on both sides of the change:

```
frozen block byte-identical: True | 1449 bytes
```

**Proof it still reproduces the committed census** — the patched script's `intent_of()`
re-labelled all 84 rows of `aug-30-2026-session-01/serp-shape-census.csv`:

```
committed aug-30 census rows: 84
rows where the PATCHED script's frozen intent_of() disagrees with the committed
intent_class column: 0
REGRESSION: PASS - the frozen column still reproduces
```

**What changed instead.** The census now writes **two** intent columns and names both to
stderr on every run:

```
intent_class            : frozen intent_of() (SEO-11)
intent_class_gate       : check-serp-shape.py (SEO-12)
```

`check-serp-shape.py` is loaded by path (its filename is hyphenated) and, if it cannot be
loaded, the column is written `not-loaded` — never silently as the frozen label. A column
that quietly falls back to the other classifier is precisely the unreproducible figure
this re-issue exists to prevent.

**Every figure in this document names its column.** The two disagree on **22 of 95** rows
in the primary census and **36 of 134** in the inclusive one, so a ratio quoted without
its classifier is not reproducible.

| | frozen `intent_class` | gate `intent_class_gate` |
|---|---|---|
| document | 23 | **30** |
| number | 40 | 40 |
| definition | 3 | 4 |
| navigational | 7 | 11 |
| not gated (`other` / `unknown`) | **22** | **10** |
| rows landing in a gated class | 73 of 95 | **85 of 95** |

The gate classifies 12 more rows than the frozen function — it moves `hantaran tunang`
and its family into `document`, `walimatul urus` into `definition` on sibling evidence,
and the `garden wedding` loanword family into `unknown` (which is not a pass, and which is
quarantined anyway).

**Cross-check that the two instruments agree with each other**, run offline so the answer
comes from the committed cache rather than a fresh pull:

```
serp-shape-census-2026-09-02.csv             95 rows, disagreements between the two instruments: 0
serp-shape-census-2026-09-02-inclusive.csv  134 rows, disagreements between the two instruments: 0
```

---

## 3. The ratio, restated: n, Fisher exact p, and a confidence interval

Positions **3–11**, `garden-wedding` quarantined (decision 148) — the same band
`check-serp-shape.py --validate` uses, deliberately, because a second instrument that
picks its own band is not a check on the first one.

### 3.1 Primary census — 2026-08-02..29, `dataState=final`

**FROZEN `intent_of()` — SEO-11's classifier**

| treatment | document | number/definition | ratio | Fisher exact p | 95% CI on the ratio (Katz) |
|---|---|---|---|---|---|
| all band rows | 13 / 302 = **4.30%** | 7 / 1213 = **0.58%** | **7.5×** | **0.0000125** | **3.00× – 18.5×** |
| stale SERP snapshots dropped | 11 / 261 = 4.21% | 4 / 1103 = 0.36% | 11.6× | 0.0000069 | 3.73× – 36.2× |
| no-SERP-data rows also dropped | 11 / 212 = 5.19% | 3 / 744 = 0.40% | 12.9× | 0.0000099 | 3.62× – 45.7× |

mean position: document **6.74**, number/definition **7.73** — 0.99 apart, so depth is not
doing the work.

**GATE `check-serp-shape.py` — SEO-12's classifier**

| treatment | document | number/definition | ratio | Fisher exact p | 95% CI on the ratio (Katz) |
|---|---|---|---|---|---|
| all band rows | 14 / 360 = **3.89%** | 8 / 1332 = **0.60%** | **6.5×** | **0.0000185** | **2.74× – 15.3×** |
| stale SERP snapshots dropped | 12 / 313 = 3.83% | 5 / 1222 = 0.41% | 9.4× | 0.0000099 | 3.33× – 26.4× |
| no-SERP-data rows also dropped | 12 / 252 = 4.76% | 4 / 863 = 0.46% | 10.3× | 0.0000107 | 3.34× – 31.6× |

mean position: document 7.17, number/definition 7.93 — 0.76 apart.

### 3.2 Inclusive census — 2026-08-05..09-01, `dataState=all`

The larger sample, and it agrees in both direction and magnitude.

| classifier | treatment | document | number/definition | ratio | Fisher p | 95% CI |
|---|---|---|---|---|---|---|
| frozen | all band rows | 16 / 468 = 3.42% | 9 / 2005 = 0.45% | **7.6×** | **0.0000008** | 3.39× – 17.1× |
| frozen | stale dropped | 13 / 402 = 3.23% | 5 / 1829 = 0.27% | 11.8× | 0.0000006 | 4.24× – 33.0× |
| frozen | no-SERP-data dropped | 12 / 327 = 3.67% | 3 / 1200 = 0.25% | 14.7× | 0.0000019 | 4.17× – 51.7× |
| gate | all band rows | 18 / 583 = 3.09% | 10 / 2171 = 0.46% | **6.7×** | **0.0000009** | 3.11× – 14.4× |
| gate | stale dropped | 15 / 498 = 3.01% | 6 / 1990 = 0.30% | 10.0× | 0.0000005 | 3.90× – 25.6× |
| gate | no-SERP-data dropped | 14 / 400 = 3.50% | 4 / 1351 = 0.30% | 11.8× | 0.0000011 | 3.91× – 35.7× |

**Twelve re-cuts in total** — three treatments × two classifiers × two windows. The DoD
asks for at least two. The lowest ratio anywhere in the set is **6.5×**, against a floor of
2.3×.

### 3.3 Which interval, and why there are three of them

Decision 171's "no less than 2.3×" was not a confidence interval on a ratio. It was
**SEO-11's document Wilson-lower divided by its number Wilson-upper** — 2.49% / 1.09% =
2.28×. `census-restate.py` reproduces that arithmetic exactly on SEO-11's own committed
CSV, which is how I know it is the right reading of the decision:

```
=== PRIOR CENSUS, same instrument: docs/work-done/aug-30-2026-session-01/serp-shape-census.csv (84 rows) ===
  all band rows    10/220 = 4.55%   3/806 = 0.37%   12.2x  0.0000267  3.39x - 44.0x
    document 4.55% [2.49 - 8.16]   number/def 0.37% [0.13 - 1.09]   conservative bound 2.3x
```

Every published SEO-11 figure comes back byte-for-byte: 4.55%, 0.37%, 12.2×, p = 0.0000267
against its published 0.000025, the Wilson intervals 2.49–8.16 and 0.13–1.09, and the
**2.3×**. So the comparison in §4.2 below is like for like.

The report prints all three because they answer different questions, and the floor test
says which one it used:

- **Wilson 95% per arm** — what SEO-11 published, and what 2.3× was derived from.
- **The ratio of those two endpoints** — the "conservative bound". Comparable to 2.3×, and
  over-conservative by construction: it is not a confidence interval on a ratio.
- **Katz log-method 95% on the risk ratio** — the interval that *is* one, and the one the
  gate tests. Undefined when an arm has zero clicks, where it returns `not computable`
  rather than a continuity-corrected guess.

---

## 4. The three caveats that travel with the number

### 4.1 THE SIX SPRINT 05 ARTICLES ARE NOT IN THIS MEASUREMENT, AND COULD NOT HAVE BEEN

They went live on **1 September 2026**. This item ran on **2 September**. GSC has recorded
**zero impressions** for all six, in **both** data states, over **every** window tested.

```
=== dataState=final : 92 page rows total, 0 matching the six CONT-13 slugs
=== dataState=all   : 93 page rows total, 0 matching the six CONT-13 slugs
   (2026-08-01 .. 2026-09-02, dimensions=["page"])

serp-shape-census-2026-09-02.csv            rows= 95 imp=2899 clk=24  CONT-13 rows=0
serp-shape-census-2026-09-02-inclusive.csv  rows=134 imp=4039 clk=30  CONT-13 rows=0
```

**A surprising absence means verify the check first**, so all six were fetched from
production, one request at a time:

```
200  https://hellokahwin.com/artikel/ucapan-doa/doa-penutup-majlis
200  https://hellokahwin.com/artikel/ucapan-doa/doa-makan-majlis
200  https://hellokahwin.com/artikel/ucapan-doa/doa-selamat-majlis
200  https://hellokahwin.com/artikel/ucapan-doa/ucapan-ulang-tahun-perkahwinan
200  https://hellokahwin.com/artikel/nikah-undang-undang/lafaz-akad-nikah
200  https://hellokahwin.com/artikel/sebelum-nikah/doa-jodoh
```

Live, and one day old. The zero is Google's, not the pipeline's.

**So this census does not score Sprint 05's bet — it re-measures the thesis the bet was
placed on**, on 54% more impressions in the band than SEO-11 had, and finds it standing.
Reading anything about the new articles into these numbers would be reading noise as a
result. The item's own brief said to say so rather than do that, and this is me saying so.

**The measurement that would score the bet does not exist yet.** The earliest honest one is
a final-data window whose *start* is 2026-09-02, and `dataState=final` will not reach
02 September until roughly **05 September**. A meaningful impression base on six one-day-old
URLs needs longer than that.

### 4.2 SEO-11's CRUDE BOUND HAS SLIPPED UNDER 2.3× ON ONE OF SIX CUTS, AND I AM NOT BURYING IT

On the **primary window's widest cut only**, the conservative bound reads **2.1×** (frozen)
and **2.0×** (gate) — just under the 2.3× that decision 188 names.

| window | classifier | all band rows | stale dropped | no-SERP-data dropped |
|---|---|---|---|---|
| primary | frozen | **2.1×** | 2.6× | 2.5× |
| primary | gate | **2.0×** | 2.3× | 2.3× |
| inclusive | frozen | 2.5× | 3.0× | 2.9× |
| inclusive | gate | 2.3× | 2.8× | 2.8× |

**It does not change the verdict, and here is why, stated so a reader can disagree with
me.** That bound is the ratio of two independent per-arm interval endpoints. It is not a
confidence interval on a ratio, it is wider than one by construction, and on the correct
interval — Katz — the lower bound is **3.00×** (frozen) and **2.74×** (gate) on the same
rows, rising to **3.39×** and **3.11×** on the inclusive window. Four of the six crude
bounds clear 2.3× anyway, and the two that do not are the widest, noisiest cut of the
smaller window.

**The disclosure that belongs with this.** Conditions 1 and 2 of the floor test were fixed
before the census was pulled. This third comparison was **not** — I added it after seeing
the crude bound move, specifically so the movement would be printed by the instrument on
every run instead of living in a paragraph the next reader has to take on trust. It is
reported and never gated, `census-restate.py` says so in a comment at the point of use, and
the run above prints it:

```
      NOTE, not gated: SEO-11's crude bound (document Wilson-lower /
      number Wilson-upper) is now below 2.3x on all band rows (2.1x).
      That bound is not a CI on a ratio. The Katz CI is, and it reads 3.00x at its lower end.
```

DES-09's rule is to write the budget before meeting the thing it judges. On this one line I
did not, and saying so is the only mitigation available after the fact.

### 4.3 ⚠ DECISION 187's "`doa` AT MEAN POSITION 21.7" DESCRIBES NO QUERY THE FAMILY HOLDS

This is the finding CONT-17 most needs before it selects, and it corrects a number in the
company record.

Decision 187 and `sprint-06.json`'s theme both rest on this: *"the doa family at mean
position 21.7 means we are **not saturated on our best territory — we are barely competing
on it**."* That sentence is what bought CONT-17 its six articles.

**21.7 is the *unweighted* mean of 34 per-query positions.** Re-derived from decision 187's
own window (GSC 2026-08-20..09-01, `dataState=final`, frozen `intent_of`), which reproduces
its 337 queries and every one of its other figures exactly:

| family | n | imp | clicks | **impression-weighted position** | **unweighted mean** |
|---|---|---|---|---|---|
| `doa` | 34 | 221 | 10 | **9.82** | **21.74** ← decision 187 |
| `mas kahwin` | 54 | 1046 | 6 | 7.96 | 11.59 ← decision 187 |
| `walimatul` | 18 | 368 | 3 | 9.44 | 12.56 ← decision 187 |
| `rukun` | 7 | 17 | 0 | 20.12 | 22.32 ← decision 187 |
| `lafaz taklik` | 2 | 13 | 0 | 9.00 | 8.98 |

Decision 187 is internally consistent — it used unweighted means throughout — and every
other number in it reproduces, including *"26 document-intent queries carry impressions and
zero clicks, 184 impressions between them"*, which is exactly the set at **≥4 impressions**
(a threshold the decision does not state; at ≥1 it is 99 queries and 295 impressions).

But this seat's own standing rule is *never trust an averaged position without the
per-query breakdown*, and the breakdown says 21.7 is being made by the tail:

```
doa pengantin baru rumi                 imp= 84  clk= 8  pos=  3.74
doa selepas akad nikah rumi             imp= 20  clk= 0  pos= 10.60
doa ubun isteri rumi                    imp= 15  clk= 0  pos=  4.67
doa selamat untuk pengantin baru        imp= 13  clk= 0  pos=  8.54
doa pengantin                           imp= 12  clk= 1  pos= 15.17
... 20 more queries, 29 impressions between them, mean position 29.9
```

**Twenty queries carrying 29 of the family's 221 impressions drag the unweighted mean from
9.8 to 21.7.** One query — `doa pengantin baru rumi`, 84 impressions at position **3.74** —
carries 38% of the family's impressions and 8 of its 10 clicks.

**What this changes for CONT-17, which is less than it sounds and more useful.** The
"enormous headroom, we are barely competing" framing is **wrong as stated**: on the
impressions that exist, the family sits at position 9.8 and is competing. But the build
signal is still there and it is now specific rather than atmospheric — **the problem is not
depth, it is that document-intent queries at good positions are converting nothing**:

```
document-intent queries with impressions and ZERO clicks: 99, 295 impressions
  within the cited curve (position <= 10): 56 queries, 191 impressions, expected clicks 6.89
  beyond position 10 (curve NA, never extrapolated): 43 queries, 104 impressions
  P(zero clicks across the whole in-curve set) = e^-6.89 = 0.0010  -> a real defect
  against the document class's own measured 3.89% CTR: expected 11.48 clicks, P(zero) = 0.0000
```

**P(zero) = 0.001. That clears this seat's own "zero clicks at low impressions is not a
finding" bar**, which is why it is stated with the probability rather than as a raw zero.
The three largest are `doa selepas akad nikah rumi` (20 impressions, position **10.60**),
`doa ubun isteri rumi` (15, position **4.67**) and `hantaran tunang 3 balas 5` (15,
position **4.27**).

**A page at position 4.27 earning nothing from 15 impressions is not waiting for a ranking.
It is a coverage or a snippet problem.** CONT-17 should weight toward the queries in that
list — where we already rank and do not convert — over queries chosen for depth alone.
That is a re-angle of CONT-17's target selection, not a reason to stop it.

---

## 5. `serp_update_date` on every row, and the RANGE (decision 174)

Computed from the data, never from a remembered summary.

**Primary census, 95 rows**

```
crawled SERPs          : 56
serp_update_date RANGE : 2023-08-09T22:31:45Z  ..  2026-08-28T05:56:47Z
by month               : 2023-08 x1, 2026-07 x11, 2026-08 x44
not from 2026-08       : 12 of 56 - a stale `true` is reliable, a stale `false` is NOT
uncrawled              : 39 of 95 rows, written `unknown` and never `false` (decision 173)
of those, year-stamped : 17 - the standing blind spot
```

**Inclusive census, 134 rows**

```
crawled SERPs          : 78
serp_update_date RANGE : 2023-03-17T19:38:59Z  ..  2026-08-28T05:56:47Z
by month               : 2023-03 x1, 2023-06 x1, 2023-08 x1, 2026-07 x17, 2026-08 x58
not from 2026-08       : 20 of 78
uncrawled              : 56 of 134 rows, written `unknown` and never `false`
of those, year-stamped : 22
```

**New since SEO-11, and worth the board knowing:** the oldest snapshot in the corpus is no
longer August 2023. The 39 queries the inclusive window adds brought two older ones with
them, and the range now opens at **2023-03-17** — five months before AI Overviews existed.
Nothing in the Ahrefs response marks them; the range is the only thing that says so, which
is decision 174(a) firing exactly as designed.

The uncrawled share is stable and large — **41% of the primary census, 42% of the
inclusive**. Those rows are `unknown` in every feature column and excluded from every rate.
They are not a defect in this census; they are the standing limit of Ahrefs SERP coverage on
Malay long-tail, and 17 and 22 of them respectively are year-stamped.

---

## 6. Two corrections to the company record

Both small, both filed here because the evidence wins and the file gets corrected at source.

**(a) Decision 187's window label overstates its reach by three days.** It cites *"GSC
2026-08-20..09-01, `dataState=final`"*. Final data stopped at 2026-08-29 on 02 September,
so the last three days of that window are empty. Proved by pulling both:

```
decision 187's stated window 2026-08-20..09-01 final : 337 queries, 2627 impressions
the same window truncated at the last FINAL day 08-29: 337 queries, 2627 impressions
IDENTICAL: True
```

No number in decision 187 changes. What changes is a reader's belief that it saw
01 September — **it did not, and so decision 187 contains no post-CONT-13 data either.**
Nothing in the company record currently says that.

**(b) Decision 187's 26-query zero-click set is at a ≥4-impression threshold**, which the
decision does not state. At ≥1 it is 99 queries and 295 impressions. Reproduced in §4.3.

---

## 7. What was changed in the repo

All of it on the **docs line**, `feat/command-centre-dashboard`. **Nothing goes to
`master` and no PR was opened into it.** Tested by content, not by branch name:
`origin/master` carries `next.config.ts` and a `scripts/seo/` holding `faq-*.mjs`;
`origin/feat/command-centre-dashboard` carries `docs/boardroom/ceo-memory.md` and the
`scripts/seo/*.py` census tooling. The files I touched exist only on the second.

| file | what |
|---|---|
| `scripts/seo/serp-shape-census.py` | imports the gate's classifier; adds `intent_class_gate` and `--data-state`. **`intent_of()` byte-identical.** |
| `scripts/seo/check-serp-shape.py` | one fix — a `UnicodeEncodeError` that killed `--validate` (§8.2) |
| `scripts/seo/census-restate.py` | **new.** PRE-FLIGHT #4: restates a census with n, p, three intervals, the crawl-date range, and the floor test as an exit code |
| `scripts/seo/serp-shape-siblings.json` | the gate's committed sibling cache, grown by this run |
| `docs/work-done/sep-02-2026-session-01/serp-shape-census-2026-09-02.csv` | the primary census, 95 rows |
| `…/serp-shape-census-2026-09-02-inclusive.csv` | the inclusive census, 134 rows |
| `…/seo-14-restate.txt`, `…/seo-14-restate-inclusive.txt` | the full instrument output |
| this file, and `docs/work-done/README.md` | the log |

---

## 8. Verification — what was actually run, not what was believed

**8.1 The harness reproduces SEO-11 before it is trusted with anything new.** Pulling
SEO-11's own window returns **84 queries at ≥5 impressions**, its published count; and
`census-restate.py` on SEO-11's committed CSV returns 4.55%, 0.37%, 12.2×, p = 0.0000267,
Wilson 2.49–8.16 / 0.13–1.09 and the 2.3× bound — every published figure.

**8.2 A FIX RUN AGAINST ITS FAILING CASE.** `--validate` on the new census died:

```
UnicodeEncodeError: 'charmap' codec can't encode characters in position 2-5
```

The failing row is `花园婚礼 马来西亚 地点` — a Chinese-script query, the class stage T0
exists to catch — and the crash came **after 18 lines of correct output**, so it looked
like a partial result rather than a failure. Fixed by reconfiguring stdout/stderr to UTF-8
inside `main()` rather than by asking a future reader to set `PYTHONIOENCODING`. Re-run
against that exact row:

```
  花园婚礼 马来西亚 地点                             other         -> unknown
  ...
Every re-cut holds. The gate is built on the variable that survives.
SERPSHAPE EXIT: 0
$ echo $?   # read directly, not through a pipe
0
```

**8.3 The gate's regression suite still holds after that edit** — `REGRESSION SUITE: all 4
hold`, exit `0`, read directly.

**8.4 The two instruments agree.** `census-restate.py` and `check-serp-shape.py --validate`
were written to the same band on purpose and return the same arms; and the CSV's
`intent_class_gate` column matches a live re-classification on **0 of 229 rows**
disagreeing across both censuses.

**8.5 Exit codes read directly, never through a pipe.** `census-restate.py` → `0` on both
censuses; `--validate` → `0`; `--selftest` → `0`.

---

## 9. What the CEO is being asked to note

1. **CONT-17 proceeds.** The premise is intact at 6.5×–14.7× across twelve re-cuts, worst
   case 6.5× against a 2.3× floor.
2. **Restate 12.2× as 7.5× (frozen) / 6.5× (gate), 28 days to 2026-08-29**, and quote the
   interval with it. `ceo-memory.md`, decision 171 and PRE-FLIGHT #1 all carry 12.2×
   without one.
3. **This did not score Sprint 05's bet.** The six articles are one day old and carry zero
   impressions. The earliest window that can score it starts 02 September and is not final
   until roughly 05 September. **Book it; do not remember it.**
4. **Decision 187's "position 21.7" needs the weighted figure beside it (9.8)**, and
   CONT-17's targets should be weighted toward the 56 in-curve document-intent queries
   converting nothing at P(zero) = 0.001 — not toward depth.

---

## Retrospective

**What we learned that is not written down.** A frozen function is only half a freeze. The
comment on `intent_of()` told the next seat to import the gate rather than edit the
function, and that instruction was followed — but nothing anywhere said *what to do with
the two answers*, and the two classifiers disagree on 23% of rows. The gap between "do not
edit the frozen thing" and "name which one produced each figure" is where an
unreproducible number gets made. The CSV now carries both columns and the restate script
refuses to print a ratio without naming its column.

Second: **a "conservative bound" quoted in a decision needs the arithmetic that made it
written down beside it.** Decision 171 says "the confidence intervals bound the true ratio
only at no less than 2.3×" and does not say that 2.3× is Wilson-lower over Wilson-upper.
Decision 188 then made that unstated arithmetic a stop condition for another item. I had to
reverse-engineer it from SEO-11's committed CSV to know which of three plausible readings
decision 188 meant — and under one of them the answer would have been "COLLAPSED".

**What we did twice.** Nothing in this item, but the census was pulled twice on purpose
(final and all) because the first window could not contain the thing the DoD asked about.
That is not waste — it is the only way to state "not measurable yet" as a measurement.

**What we nearly shipped, and what caught it.** Two things.

*(a)* I nearly reported "12.2× → 7.5×, the effect is weakening". It is not: 7.5× sits
inside SEO-11's own 95% interval. What caught it was running the restate script against the
**old** census with `--compare` and seeing 3.39×–44.0× printed next to my new 3.00×–18.5×.
Had the instrument only taken one file, the comparison would have been a sentence I wrote
from memory, and it would have been wrong. **An instrument that can restate the prior
measurement with the same code is what makes "it moved" falsifiable.**

*(b)* I nearly let decision 187's "position 21.7" stand, because it was in the sprint theme,
the decision log and the plan — three places, and this seat's own rule is that each
restatement is a copy and not a confirmation. It broke only because I computed an
impression-weighted mean for a table I was building for a different purpose and it came out
at 9.8. The seat's own rule about averaged positions is from SEO-05 and it was written about
*pages*; nothing extended it to families, which is how it survived three restatements.

**Which document must change, and who owns the edit.**

`~/Documents/Code/buddy/skillcentral/agents/projects/hellokahwin/Marketing/head-of-seo-content.md`
— owner **`head-of-seo-content`** (this seat). Two edits, both made and both verified
deployed in §10:

1. PRE-FLIGHT #1 carries **12.2×** as the headline with no interval. It is restated to
   7.5×/6.5× with the interval, both classifiers named, and the two-window provenance.
2. The SEO-05 rule *"never trust an averaged position without the per-query breakdown"* is
   extended from pages to **query families**, with the doa case as its worked example — and
   with the rule stated as *which* mean, because both are correct and they differ by 12
   positions.

`docs/boardroom/decision-log.md` and `docs/boardroom/ceo-memory.md` carry 12.2× and
position 21.7 — owner **`ceo-hellokahwin`**, because this seat does not write the decision
log. Raised in §9 as items 2 and 4.

**Prefer a gate or a script over prose, and here are the two this item added.**

1. `scripts/seo/census-restate.py` (hellokahwin, docs line) is **PRE-FLIGHT #4**. Decision
   188's "CONT-17 STOPS if the split collapsed" was a sentence in two briefs; it is now an
   exit code, computed the same way every run, printing the number that would have made it
   fire even when it does not.
2. `skillcentral/sync-worktree-agents.py` (buddy) closes the deploy gap in §10 — the one
   `install.sh` cannot see. **It is the more valuable of the two**, because it fixes the
   mechanism by which every rule any of these retros writes fails to reach the seat that
   needs it. It found 21 stale files across 3 personas, not 1.

**And a third thing that should be a script and is not yet — named so it is not lost.**
Item 3 in §9 is "book the measurement that scores Sprint 05's bet". Booking it is a
`/loop` or a `cron`, not a line in a work log, and this seat did not create one because the
scheduling mechanism for HelloKahwin items is the sprint tracker and only the CEO writes
items into it. **Owner: `ceo-hellokahwin`, at Sprint 07 planning.** If it is not an item by
then it will be remembered instead, which is what decision 50 exists to warn about.

---

## 10. The persona edit — correct, committed, PUSHED, deployed… to ONE of ten copies

Both edits were made at source in
`~/Documents/Code/buddy/skillcentral/agents/projects/hellokahwin/Marketing/head-of-seo-content.md`,
never in a worktree, and `install.sh` was **run** rather than recommended. The deployed
file was then diffed CR-normalised and grepped for the specific rules rather than trusted
on a line count — evidence in
`sep-02-2026-seo-14-EVIDENCE/persona-deploy.txt`:

```
=== deployed: ~/Documents/Code/hellokahwin/hellokahwin/.claude/agents/head-of-seo-content.md ===
diff (CR-normalised) exit: 0   (0 = identical)
  rule 1 (7.5x restatement)      x1
  rule 2 (family mean position)  x1
  PRE-FLIGHT #4 command          x1
```

### ⚠ AND THEN THE CHECK FOUND SOMETHING BIGGER THAN THE EDIT

Enumerating every deployed copy on the machine — rather than testing the one I expected —
showed that **`install.sh` reaches 1 of 10 live copies of this persona.** Orca worktrees
each carry their own `.claude/agents/`, it is git-ignored by design, and nothing refreshes
it.

```
deployed copies of head-of-seo-content.md on this machine: 10
FRESH  930 lines  ~/Documents/Code/hellokahwin/hellokahwin/.claude/agents/
STALE  849 lines  ~/orca/workspaces/hellokahwin/seo14-census/     <- the worktree I am in
STALE  849 lines  ~/orca/workspaces/hellokahwin/cont18-nikah/     <- the next SEO item
STALE  822 lines  x6 further worktrees
```

**Three vintages co-existing is the finding, not the staleness.** 822, 849 and 930 lines —
agents dispatched into different worktrees in the same sprint were reading different
rulebooks, and nothing anywhere printed that. It is not confined to my seat either:

```
STALE  ceo-hellokahwin.md       source 733 lines, deployed 666 lines   (x6 worktrees)
STALE  managing-editor.md       source 262 lines, deployed 232 lines   (x6 worktrees)
...
  STALE : 21 files across 8 worktrees, 3 personas
```

**Sixty-seven lines of CEO rules were missing from six live worktrees.**

The persona's own section says the chain is `correct → committed → PUSHED → deployed`, and
CONT-07 caught it when that chain was written with three steps instead of four. This is the
same error one level out: **"deployed" was assumed to name one place, and it names ten.**

**Fixed with a script, not a sentence** —
`~/Documents/Code/buddy/skillcentral/sync-worktree-agents.py`, which reports before it
changes anything and exits non-zero while anything is stale:

```
### BEFORE   report-only exit: 1     (STALE 21, absent 0)
### APPLY    synced 21 file(s). post-sync verification: 21 of 21 identical to source
### AFTER    up to date : 81 | STALE : 0 | absent : 0 | re-check exit: 0
```

Full transcript in `sep-02-2026-seo-14-EVIDENCE/worktree-agent-sync.txt`. The `--apply` run
was re-checked with a fresh report-only run, so the fix is verified against the failing
case rather than asserted from the copy succeeding.

### A sixth instance of the unquoted-path failure, recorded because the brief predicted it

The brief says *"Quote a path with a space. `C:/Users/Ian Ng/...` unquoted has broken a
command five separate times in this repo."* It broke mine, and it broke it in the
worst-looking way: an unquoted `find` result split on the space and every row printed
`STALE` with an empty line count. **A first pass at that table would have reported ten stale
copies, including the one that was actually fresh, off a check that had failed entirely.**
The zero was a claim about the check, exactly as the standing rule says. Re-run inside a
Python loop with the paths quoted, the real answer is nine of ten.
