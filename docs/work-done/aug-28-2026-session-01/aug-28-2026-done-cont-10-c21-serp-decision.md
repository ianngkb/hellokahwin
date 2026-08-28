# Done — CONT-10: C2.1 settled on SERP evidence — **DO NOT MERGE**

**Date:** 28 Ogos 2026 · **Sprint 03, CONT-10** · **Owner:** `head-of-seo-content`
**Brief:** `docs/plans/aug-28-2026-session-01/aug-28-2026-brief-cont-10.md`
**Evidence:** `docs/work-done/aug-28-2026-session-01/aug-28-2026-cont-10-EVIDENCE/`
**Volume field used throughout: Ahrefs Keywords Explorer `volume`** (the 12-month
average), country `my`, pulled 28 Ogos 2026. Where a different field is quoted it
is named at the point of use.

---

## The decision

**DO NOT MERGE. C2.1 stays at eight published articles.** No URL changes, no
redirects, no migration. **CONT-12 plans against an article count of 8.**

The groom and bride angles are separate SERPs in Malaysia, a competitor is
already being paid for splitting them, and Google asks the two questions
separately in its own People-also-ask box.

One boundary inside the cluster is not settled by this test, and it is reported
as open below. It is a re-angling job, not a merge.

---

## What was actually in question

Seven Malay terms share the Ahrefs `parent_topic` **`barang hantaran lelaki`**,
and four live articles target them:

| Article (live) | Targets | `volume` |
|---|---|---|
| `hantaran-kahwin` (legacy seed) | hantaran kahwin · contoh hantaran kahwin | 2,000 · 200 |
| `hantaran-untuk-lelaki` (topic 2) | hantaran untuk lelaki · barang hantaran lelaki | 700 · 500 |
| `barang-hantaran-perempuan` (topic 3) | barang hantaran perempuan | 300 |
| `barang-hantaran-berguna` (topic 5) | barang hantaran · idea hantaran | 500 · 80 |

Targets come from CONT-07's brief table, not from the slugs. The full pull, with
`volume_monthly` printed beside `volume`, is in
`…-EVIDENCE/keywords-explorer-parent-topics.tsv`.

Rule 4 of the playbook says a shared parent topic means merge. Rule 2 says every
question over 100/mo gets a page. Both were followed here, and they point in
opposite directions. This item does not resolve that conflict in general. It
decides this cluster on evidence, which is what the brief asked for.

---

## The test, and why it is the right one

`parent_topic` is one field's opinion about how Google groups a topic. The SERP
is Google doing it. So the test is to take the organic top 10 for each head term
and measure how much the result sets actually overlap.

Six SERPs came from Ahrefs `serp-overview`, country `my`, on 28 Ogos 2026: two
groom terms, two bride terms, and the two broad terms the seed and topic 5 aim
at. Every URL is in `…-EVIDENCE/serp-organic-sets.tsv` with the snapshot date
Ahrefs returned for it. A script computed the overlaps from that file, so no
number below was tallied by eye: `…-EVIDENCE/overlap-matrix.txt`.

Two URLs appear on all six SERPs, and both are combined "lelaki dan perempuan"
pages: nikahsatu's *17 Idea Hantaran Kahwin* and songketdunia's *25 Idea Hantaran
Lelaki dan Perempuan*. They are the family's background rather than a sign that
Google has collapsed the topic. The table gives the overlap with them and
without them.

| Pair | Shared URLs | Jaccard | Shared, constants removed | Jaccard, constants removed |
|---|---|---|---|---|
| **Same article, two of its own terms** — `barang hantaran lelaki` vs `hantaran untuk lelaki` | 4 | **40%** | 2 | **25%** |
| **Same article** — `barang hantaran perempuan` vs `hantaran untuk perempuan` | 5 | **83%** | 3 | **75%** |
| groom vs bride — `barang hantaran lelaki` vs `barang hantaran perempuan` | 2 | 18% | **0** | **0%** |
| groom vs bride — `barang hantaran lelaki` vs `hantaran untuk perempuan` | 2 | 20% | **0** | **0%** |
| groom vs bride — `hantaran untuk lelaki` vs `barang hantaran perempuan` | 2 | 18% | **0** | **0%** |
| groom vs bride — `hantaran untuk lelaki` vs `hantaran untuk perempuan` | 2 | 20% | **0** | **0%** |
| seed vs groom — `hantaran kahwin` vs `barang hantaran lelaki` | 2 | 15% | **0** | **0%** |
| topic 5 vs groom — `barang hantaran` vs `barang hantaran lelaki` | 2 | 17% | **0** | **0%** |
| seed vs topic 5 — `hantaran kahwin` vs `barang hantaran` | 2 | 15% | **0** | **0%** |
| **seed vs bride** — `hantaran kahwin` vs `barang hantaran perempuan` | 4 | **40%** | 2 | **25%** |

The first two rows are the calibration, and they matter more than any threshold
borrowed from a blog post. They are pairs of queries that one article already
targets, so they show what "same intent, same page" looks like in this data: 40%
and 83%. Everything the merge question is actually about sits at 15 to 20%, and
at zero once the two ubiquitous pages are set aside. Groom queries and bride
queries in Malay wedding search do not share a single result.

### The competitor already running the experiment

`story.motherhood.com.my` (DR 48) publishes both angle pages,
`/my/barang-hantaran-lelaki/` and `/my/barang-hantaran-perempuan/`, on terms
Ahrefs assigns to one parent topic. Site Explorer, country `my`, 28 Ogos 2026,
reading `best_position` and Site Explorer's own `volume` column, which is not the
Keywords Explorer figure:

- `/barang-hantaran-lelaki/` holds position **1** on `hantaran untuk lelaki`
  (900), `barang hantaran lelaki` (600), `hantaran kahwin lelaki` (250),
  `hantaran lelaki` (250), and eight more.
- `/barang-hantaran-perempuan/` holds position **1** on `barang hantaran
  perempuan` (300), **2** on `senarai barang hantaran perempuan`, and **3** on
  `hantaran perempuan mewah`.

**The two pages share no keyword at all.** Same domain, same authority, one
parent topic, two pages, both at position 1 on their own angle, no collision.
That is the split working on a live site.

### Google asks the two questions separately

The People-also-ask box on the groom query
(`…-EVIDENCE/paa-boxes.tsv`) carries both of these, in the same box:

> *Apakah contoh barang hantaran yang sesuai untuk lelaki?*
> *Apakah idea barang hantaran yang menarik untuk perempuan?*

Google is decomposing this entity by side of the family and printing both
questions itself. That is the evidence shape that settled C2.2, and it is Google
declaring the structure rather than us inferring it.

The limit, stated rather than buried: neither bride query returned a question
block in Ahrefs' stored SERP, so the PAA evidence here comes only from the groom
side and the two broad terms. The decision does not rest on it alone.

---

## The boundary this test does not settle

`hantaran kahwin` (the legacy seed) against `barang hantaran perempuan`
(topic 3) comes in at Jaccard **40%**, or **25%** with the constants removed,
level with the within-article baseline. On this measurement those two are as
close as two queries that the same page already targets.

It is still not a merge case:

- The seed's SERP carries a money block that the bride SERP has none of. Shopee's
  hantaran shop, Mingguan Wanita on *duit hantaran hak siapa*, mhf.org.sg on
  *wang hantaran*, Loanstreet on *duit hantaran dan mas kahwin*. Four of its
  eight results.
- Its PAA asks *Apakah maksud hantaran kahwin?*, *Apakah mas kahwin dan hantaran
  di Kelantan?* and *Apakah maksud mas kahwin?* Definition and money, not an item
  list.
- The two extra URLs the seed shares with the bride SERP are both generic idea
  boards: a Pinterest board and Love & Co's idea list.

So the seed's SERP wants a different article from the one we have. Fetched live
on 28 Ogos 2026 (`…-EVIDENCE/hantaran-kahwin.html`, HTTP 200, 169,150 bytes),
`hantaran-kahwin` runs: *Apa itu Hantaran Kahwin*, then *Ratio Hantaran Antara
Pihak Lelaki dan Perempuan*, then **20 Idea Hantaran Kahwin Lelaki & Perempuan**,
then *Tips untuk Jimat Hantaran Kahwin*. Its centre of gravity is a combined idea
list, which is the job topics 2 and 3 were written to do.

Recommendation for CONT-12 to schedule, and not for this item to execute:
re-angle the seed away from the idea list and toward the definitional and money
questions its own SERP is asking, and let it link down to the two angle pages for
the lists. That changes one article's body. It does not change the count.

### The other half of the same finding

Publishers have differentiated the groom angle and have left the bride angle
alone. The groom SERP carries dedicated groom pages from motherhood, ecentral,
thekenduri and Zalora inside the top 10, with therichscents and atokpencen
deeper. The bride SERP carries one dedicated bride page, and it sits in the AI
Overview citations rather than the organic top eight.

The least contested angle in this cluster is the bride's. Merging it away would
have handed back the one position with no incumbent in it.

---

## What this does and does not decide

C2.1 is decided: do not merge, eight articles, no redirects.

The rule 2 / rule 4 conflict is **not** decided in general. It stays open in the
persona, as flagged. What this item adds toward eventually settling it is a
procedure rather than an opinion, written into the persona below.

CONT-07's four zero-volume head terms carry forward untouched:
`hantaran kahwin bajet`, `kos hantaran kahwin`, `adat hantaran` and
`persiapan hantaran`. Target selection, independent of the merge question, still
unowned.

---

## Retrospective

### 1. What did we learn that is not written down anywhere?

**A cluster contains its own calibration for the SERP-overlap test, and using it
beats importing a threshold.** The industry rule of thumb is that a top-10
overlap above roughly 60% means one intent. Nobody has calibrated that on thin
Malay long-tail, and I was about to quote it as though somebody had. The fix cost
nothing: two of the queries in this cluster are already targeted by one article,
so their overlap *is* the "same page" reading for this data, at 40% and 83%.
Every pair the decision was actually about came in at 15 to 20%. The gap does the
arguing, and it needs no borrowed number.

Using the cluster's own baseline also caught the one thing a fixed threshold
would have missed. The seed/bride pair reads 40%, which passes clean under any
60% rule. Against the cluster's own baseline it sits exactly at "same page",
which is what sent me to look at the seed's live H2s and find a combined idea
list doing its two children's job.

**And the second URL set is the one that carries the signal.** Two pages appear
on all six SERPs in this family. Left in, every pair looks 15 to 20% similar and
the groom/bride split reads as a difference of degree. Taken out, groom and bride
share zero URLs. The constant term was hiding the result.

### 2. Which document must change, and who owns that edit?

Three, all mine, all edited in this commit:

1. `skillcentral/agents/projects/hellokahwin/Marketing/head-of-seo-content.md`,
   the persona. Its ⚠ RULE 2 / RULE 4 section says the conflict is unresolved and
   stops there, which leaves the next seat with a live contradiction and no
   procedure. It now carries the SERP-overlap test as the tie-breaker, including
   the self-calibration step and the constant-URL step. Owner: me. Committed,
   pushed **and deployed** to `.claude/agents/`, verified by diff, per my own rule
   that a persona edit is not live until `install.sh` has run.
2. `docs/boardroom/ceo-memory.md`, which carries C2.1 as OPEN with "no SERP check
   has been run". Flipped to DECIDED with the numbers. Owner: me.
3. `docs/boardroom/decision-log.md`, decision 116. Owner: me.

### 3. What did we do twice that we should never repeat?

I recomputed CONT-07's parent-topic pull instead of trusting it. That was the
right call and it paid: `barang hantaran` read 350 on 27 Aug and 500 today, same
field, one day apart, because the 12-month average rolls.

The wider pattern is worse than one duplicated query. This cluster has now had
`parent_topic` run against it four times across three sessions, by CONT-05,
SEO-05, CONT-07 and now me. Four pulls, one answer, and not one of them could
decide anything, because the field was never the resolver. The repetition was not
wasted effort on the same check. It was four sessions running the wrong check
carefully.

The interim guard already adopted, running `parent_topic` at planning time, is
only half of it. The other half is knowing that a shared parent opens the
question and the SERP closes it, so the second call gets made once, by whoever
finds the shared parent, instead of being deferred to a fourth session.

### 4. What did we nearly ship, and what caught it?

A clean sweep. The first version of this decision said every boundary in C2.1 was
clear and the cluster was fine as built. Reading the raw overlap output rather
than my own summary of it, one pair, seed against bride, came in at exactly the
within-article baseline, and I had already written the sentence that would have
covered it over.

What caught it was a habit rather than vigilance: computing the matrix by script
into a file instead of eyeballing six URL lists. The script had no view about
what the answer should be, and it printed the row I did not want. Had I tallied
the overlaps by hand while holding the conclusion in mind, that row would have
been rounded toward the story. The evidence file was written before the prose,
and that ordering is the whole safeguard.

The finding it produced is the most useful thing in this document, and it was
nearly a rounding error.
