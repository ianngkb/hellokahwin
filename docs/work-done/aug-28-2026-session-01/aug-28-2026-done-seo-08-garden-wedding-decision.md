# Done — SEO-08: `garden-wedding` — **KEEP, DO NOT REWRITE, QUARANTINE FROM THE HEADLINE**

**Date:** 28 Ogos 2026 · **Sprint 03, SEO-08** · **Owner:** `head-of-seo-content`
**Brief:** `docs/plans/aug-28-2026-session-01/aug-28-2026-brief-seo-08.md`
**Evidence:** `docs/work-done/aug-28-2026-session-01/aug-28-2026-seo-08-EVIDENCE/`
**Volume field used throughout: Ahrefs Keywords Explorer `volume`** — the
12-month average — country `my`, pulled 28 Ogos 2026. Where `volume_monthly`
(the latest month) is quoted it is named at the point of use. Every keyword row
in the evidence TSV prints both fields side by side.

---

## The decision

**Keep the page. Do not rewrite it Malay-first. Give it no editorial
investment this sprint. Take it out of the headline numbers with a command
rather than a promise. Judge it on 27 November 2026.**

One obligation is carved out of "no investment" and is not optional: **27 of
the 48 images in the article carry no credit**, which breaks an owner-level
rule. That is a rights obligation, not an SEO one, and it is filed separately
below.

---

## The premise in decisions 88 and 97 is wrong, and correcting it decides most of this

Both decisions describe `/garden-wedding/` as *"an English-intent page on a
Malay-first site."* It is not an English page. Fetched from production at
**2026-08-28T07:54:29Z** (`…-EVIDENCE/live-page-state.txt`):

```
<title>20 Venue Garden Wedding Paling Cantik di Malaysia | HelloKahwin</title>
  h1: 20 Venue Garden Wedding Paling Cantik di Malaysia
```

Below that sit 2,332 words of Malay prose and twenty `<h2>` headings, every one
of them a real Malaysian venue — The Waterway Villa Pahang, Kebun Rimba Janda
Baik, Glasshouse Seputeh, Cove 55 Sarawak, Rowan & Parsley Johor Bahru. The
body opens *"Jika anda mengimpikan majlis perkahwinan yang dikelilingi
kehijauan…"*. This is a Malay article about Malaysian venues.

What is English is the **query**, not the page. And `garden wedding` is not an
English query that Malay speakers avoid — it is the loanword Malaysians use for
the thing. There is no Malay phrase competing with it. That single fact settles
the rewrite option, and it is measured below rather than asserted.

---

## What the page actually earns — first-hand, family-aggregated, per query

Pulled directly from the Search Console API with the service account, not from
a connector: `…-EVIDENCE/gsc-garden-wedding.mjs`, output in
`…-EVIDENCE/gsc-query-breakdown-28d-to-27aug.txt`.

**28 days to 27 August 2026.** The redirect family has exactly one live address
in Search Console — the legacy string. The canonical earns nothing:

| URL string Google printed | impressions | clicks | position |
|---|---:|---:|---:|
| `https://hellokahwin.com/garden-wedding/` | 778 | 3 | 36.7 |
| `…/artikel/idea-dan-nasihat/garden-wedding` | 0 | 0 | — |
| **family total** | **778** | **3** | **36.73** · CTR **0.39%** |

That is **25.2% of the site's page-attributed impressions** (3,088 in the same
window). The evidence file prints 25.5% against a site total of 3,055 because
it takes the total from an undimensioned query while the headline script sums
the page rows; Search Console's two aggregations differ by about 1% and neither
is wrong. Quote whichever, and say which.

Decision 97 quoted 814 impressions, 4 clicks, position 36.6. Re-running its own
window, 27 Jul – 23 Aug, returns **856 / 4 / 36.41**. Search Console backfills
for several days after a window closes, so the board's figure was right when it
was taken and has since grown by about 5%. The two reconcile; nothing here
contradicts the board.

**The averaged position 36.7 describes no query on the page**, so here is the
breakdown it hides. Forty named queries carry 664 impressions, 85.3% of the
family; the remainder is anonymised:

| query | impressions | clicks | position |
|---|---:|---:|---:|
| garden wedding | 140 | 0 | 30.1 |
| garden wedding kl | 111 | 0 | 49.5 |
| garden wedding malaysia | 110 | 0 | 41.4 |
| garden wedding kuala lumpur | 100 | 0 | 46.5 |
| wedding garden | 27 | 0 | 30.0 |
| garden wedding in kl | 24 | 0 | 45.6 |
| outdoor wedding venue | 18 | 0 | 37.8 |
| garden wedding hall | 1 | 0 | **11.0** |

Two things fall out of the full list that no average could show.

**Not one of the forty queries is in Malay.** Thirty-nine are English; one is
Chinese (`花园婚礼 马来西亚 地点`, 8 impressions at 29.4). A Malay page has been
serving an entirely non-Malay query set for months.

**Impressions sitting at position ≤ 13: one.** A single impression, on
`garden wedding hall`. By the title rule this seat already operates under — rank
title candidates by impressions at position ≤ 13, because a title is only
printed where the page ranks — **a title rewrite on this page buys nothing.**
The problem is position, and it is 30 places away.

### And the zero is not a defect

778 impressions at average position 36.7 earning 3 clicks is **0.39% CTR**.
Published curves put positions 31–40 at roughly 0.2–0.5%. The page is
performing *in band for where it sits*. There is no conversion failure here to
fix, exactly as decision 80 found sitewide. All 3 clicks fall in the anonymised
remainder; every named query reads zero, which at 1–140 impressions apiece is
ordinary variance, not a finding.

---

## SERP ownership on the head terms

Ahrefs `serp-overview`, country `my`, pulled 28 Ogos 2026, SERP snapshots dated
25–26 Aug. Full table with every position type in
`…-EVIDENCE/ahrefs-serp-head-terms.tsv`.

**Reading only organic results here would name the wrong owner.** On the two
biggest terms Google gives position 1 to a local pack — it has decided this
query is venue discovery, answered by Maps.

**`garden wedding` — `volume` 500/mo (12-month average), KD 0**

| pos | type | who | DR |
|---:|---|---|---:|
| 1 | local_pack | Dani Hill · Glasshouse at Seputeh · Tepian Rimba Villa | — |
| 2 | image block | mindyweiss, junebugweddings, herecomestheguide | — |
| **3** | **organic** | **theweddingnotebook.com** — *"20 Gorgeous Venues To Throw A Garden Wedding"* | **44** |
| 4 | organic | wedresearch.net | 14 |
| 5–9 | organic | Facebook, Pinterest, PARKROYAL Penang, bridepay, Saujana | 100 / 97 / 75 / 30 / 27 |
| 10 | organic | nikahsatu.com — *"8 Tempat Kahwin Konsep Garden di Lembah Klang"* | 14 |

**`garden wedding kl` — `volume` 150/mo, KD 7**: local pack at 1, then
**theweddingnotebook.com at 2**, colony.work (34) at 3, wedresearch (14) at 4.

**`garden wedding malaysia` — `volume` 150/mo, KD 0**: wedresearch.net (DR 14)
at 1, local pack at 2, bridepay (30) at 3, **theweddingnotebook.com at 4**.

**hellokahwin.com is DR 0.0** (Ahrefs, 28 Ogos 2026, `ahrefs_rank` null).

Two conclusions, and the second is the uncomfortable one.

**Nobody owns position 1 the way DBKL owned the council halls** — decision 83's
shape does not repeat here. Position 1 is Google's own Maps pack, which no
article of any quality displaces. The organic ceiling on the head term is 3.

**And position 3 is already ours.** `theweddingnotebook.com` is the company's
English property, on the same Cloudflare and Vercel accounts, and its page is
the article `/garden-wedding/` was translated from — same twenty-venue listicle,
same shape. At group level this SERP is already served by a DR 44 page. Pushing
a DR 0 domain at the same result set spends Malay-first editorial capital
competing with ourselves, behind seven stronger domains. **Honest expected
position for HelloKahwin here, after real work: 8–15.** Not 3, and never 1.

---

## The rewrite option, run against the rule that killed it — and against its replacement

Sprint 02's retrospective found the SERP-ownership rule used to kill an option
and then never run against what replaced it. So here it is run on the
replacement first, before the recommendation, and the replacement is what fails.

**"Rewrite Malay-first" means retargeting the page at Malay phrasing. That
phrasing has no searchers.** Ahrefs Keywords Explorer, `volume`, country `my`,
28 Ogos 2026 — full table in `…-EVIDENCE/ahrefs-keywords-english-vs-malay.tsv`:

| Malay rewrite candidate | `volume` | `volume_monthly` |
|---|---:|---:|
| konsep garden wedding | 0 | 1 |
| majlis kahwin outdoor | 0 | 1 |
| perkahwinan di taman | 0 | 1 |
| venue garden wedding | 0 | 1 |
| garden wedding murah | 0 | 1 |
| majlis kahwin luar | *no row* | *no row* |
| majlis perkahwinan taman | *no row* | *no row* |
| tempat kahwin taman | *no row* | *no row* |
| venue kahwin outdoor | *no row* | *no row* |
| tempat kahwin outdoor | *no row* | *no row* |
| tempat kahwin konsep garden | *no row* | *no row* |
| majlis kahwin di taman | *no row* | *no row* |
| pakej kahwin outdoor | *no row* | *no row* |

*No row* is stronger than volume 0: Ahrefs holds no record of the phrase in its
Malaysian index at all.

A `matching-terms` sweep on four Malay seeds — `kahwin taman`, `majlis taman`,
`kahwin luar`, `perkahwinan taman` — returned 17, 23, 50 and 15 ideas
(`…-EVIDENCE/ahrefs-matching-terms-malay-seeds.tsv`). **Every idea describing a
wedding held in a garden reads `volume` 0**: `majlis kenduri kahwin di taman
botani shah alam`, `majlis perkahwinan di taman tasik titiwangsa`, `majlis
perkahwinan dalam taman`, and so on down all 105 rows. The only rows clearing
zero are a different topic wearing the same words — `majlis ilmu taman syurga`
(50, a hadith about study circles), `denda kahwin luar negara` (20, marrying
abroad), `hukum kahwin semasa mengandung anak luar nikah` (10). Nobody in
Malaysia searches for this concept in Malay.

Against that, the English-loanword family the page already ranks for totals
**1,350/mo by `volume`**: garden wedding 500, garden wedding kl 150, garden
wedding malaysia 150, garden wedding kuala lumpur 150, wedding garden 80, garden
wedding venue 70, garden wedding venue kl 70, garden wedding in kl 60, outdoor
wedding malaysia 50, tema garden wedding 40, garden wedding venues 30.

**The rewrite trades 1,350 searches a month for zero.** It fails the volume half
of the rule outright, before anyone looks at who ranks. Rejected.

**The wider version of the same option — repoint the page at Malay venue terms
generally — fails too, and worse.** `tempat kahwin` 30, `tempat perkahwinan` 20,
`venue kahwin` 20, everything else 0: about **70/mo combined**. The one Malay
venue term with real demand is `dewan kahwin` at **350/mo, KD 13** — and that is
a different entity (an indoor hall) already held by `/dewan-kahwin/`, our single
best page at 27 clicks on 953 impressions, position 9.4. Retargeting
garden-wedding there would cannibalise the best page on the site. Rejected.

---

## Why not drop it

Nothing about a page at position 37 costs the company anything once it stops
distorting the reports, and this one is a genuine asset: 2,332 words of Malay
about twenty real Malaysian venues, indexed, on a keyword family worth 1,350
searches a month at difficulty 0. Impressions are not a bill.

For the record, since the brief asks what would happen to the URL: **a drop has
no coherent destination.** The redirect family's live address is
`/garden-wedding/`, 308-ing to
`/artikel/idea-dan-nasihat/garden-wedding`. A 301 needs a target covering
outdoor and garden venues in Malay, and no such page exists — the nearest,
`/dewan-kahwin/`, is a different entity and a 301 there would be a soft-404 in
Google's eyes and a broken promise in a reader's. A 410 would delete a working
article to fix a reporting problem that a command fixes for free. `noindex`
would keep the maintenance and surrender the 1,350/mo option. All three are
worse than keeping it. Rejected.

---

## The reporting consequence, and it is the largest finding in this item

"Stop reporting it" is worthless as a resolution, so it ships as a command:
**`scripts/seo/gsc-headline.mjs`**. It prints the headline three ways — site
total, quarantined pages, and site ex-quarantine — from a `QUARANTINE` list
where every entry names the decision that put it there and the date it is
reviewed. Quote the ex-quarantine line as the company's performance; the site
line prints beside it so nothing is concealed.

```
$ node scripts/seo/gsc-headline.mjs 2026-07-31 2026-08-27

row                                clicks  impressions       CTR   position
---------------------------------------------------------------------------
site total (all pages)                 54         3088     1.75%      16.72
QUARANTINED (see below)                 3          778     0.39%      36.73
SITE EX-QUARANTINE  <-- quote          51         2310     2.21%       9.98
```

**One page has been hiding the difference between a site at position 16.7 and a
site at position 10.0.** The same run over decision 97's window reads 1.61% at
20.09 for the site and **2.29% at 10.41** ex-quarantine. Both windows agree:
HelloKahwin's editorial estate is sitting on page one, CTR 2.2–2.3%, and every
board report so far has averaged that against a single page on page four and
reported the blend.

Decision 96 recorded "CTR 1.78%, average position 17.7" and read the trend as
the sprint's real result. It was — the underlying number is better than the
board has been told.

---

## What is NOT decided here

The demand is real and it does not disappear because this page cannot convert
it. Google answers `garden wedding` with a **local pack of three venues**, which
is the same signal decision 83 read off nikahsatu: the format that wins venue
discovery is the venue entity page, not the listicle. Whether HelloKahwin builds
garden and outdoor venue entity pages belongs to the venue track (SEO-04) and is
scoped there on its own evidence. It is named here so it is not lost, and left
undecided here so it is not smuggled in on this item's evidence.

---

## Carve-out: 27 uncredited images on the site's highest-impression page

Found while measuring the live page; verifiable with
`…-EVIDENCE/check-live-page.sh`:

```
images in article body : 48
images carrying a credit: 21
images with NO credit   : 27
images with empty alt   : 48 of 48
images carrying srcset  : 0
credit label casings    : {'Source': 11, 'SOURCE': 3, 'sOURCE': 3, 'source': 3, 'image': 1}
```

Twenty-seven images with no credit at all breaks the owner-level rule that
every image records and shows its source. The twenty-one that are credited say
`SOURCE:` / `sOURCE:` / `source:` / `Source:` — an English word in four casings
on a Malay page. This is a rights and courtesy obligation and it does not wait
on a ranking. **Filed for the CEO as a carve-out**, not folded into this item's
"no investment": the SEO decision is to spend nothing on ranking this page; the
credits are owed regardless.

Two known template defects reproduce here and belong to their own items, noted
so the next reader does not re-find them: **two `<h1>` on the page** (DES-09
measured this on 85 of 85 articles) and **`srcset` on 0 of 48 images** (DES-09,
sitewide).

---

## The judgement date, and what is judged

**Reviewed 27 November 2026** — 90 days.

**Target:** at least one query on the family, aggregated across every URL string
Search Console prints, sitting at **position ≤ 20 with ≥ 30 impressions** in the
28-day window ending that date.

Today's best is `garden wedding` at **30.1 on 140 impressions**. The target asks
for roughly ten places of movement from sitewide authority growth alone, with no
editorial spend on this page. It is a genuine coin-flip, which is what a
tripwire should be.

**If the target is met**, the page earns investment on that review: rewrite the
opening 60 words to answer the loanword query directly, add capacity and price
bands per venue in the way `mas-kahwin-ikut-negeri` was built, repair the
credits. It becomes a live target instead of a quarantined one.

**If it is missed**, the page stays exactly as it is and comes out of the review
rota. It is not dropped — see above — and it is not asked about again. The
quarantine stands until a decision removes it.

Commands for that review, so it is a repeat rather than a re-derivation:

```
node scripts/seo/gsc-headline.mjs
node docs/work-done/aug-28-2026-session-01/aug-28-2026-seo-08-EVIDENCE/gsc-garden-wedding.mjs 2026-10-31 2026-11-27
```

---

## Evidence index

| File | What it holds |
|---|---|
| `gsc-garden-wedding.mjs` | The Search Console pull. Service-account JWT, `dimensions=query,page`, family-aggregated. |
| `gsc-query-breakdown-28d-to-27aug.txt` | 40 named queries with per-query position, 28d to 27 Aug. |
| `gsc-query-breakdown-board-window.txt` | The same over decision 97's window, reconciling 814/4/36.6. |
| `headline-with-and-without.txt` | Headline metrics with and without the quarantine, both windows. |
| `pull-keywords.py` + `ahrefs-keywords-english-vs-malay.tsv` | `volume` and `volume_monthly` for 32 English and Malay terms, country `my`. |
| `pull-matching-terms.py` + `ahrefs-matching-terms-malay-seeds.tsv` | 105 keyword ideas off four Malay seeds, ordered by `volume`. |
| `pull-serp.py` + `ahrefs-serp-head-terms.tsv` | Top 10 with every position type for five head terms, snapshots dated. |
| `check-live-page.sh` + `live-page-state.txt` | Sequential production fetch: status, headers, title, H1 count, negative control, credit audit. |
| `ahrefs-mcp-client.py` | The MCP client the two pull scripts share. |

The Ahrefs and Search Console MCP servers were **not reachable as tools in this
session** — `ToolSearch` returned no `mcp__ahrefs__*` or `mcp__gsc__*` schemas.
Both data sources were reached directly instead, over the same credentials the
MCP servers use: Ahrefs by speaking JSON-RPC to `https://api.ahrefs.com/mcp/mcp`,
Search Console by signing a service-account JWT. That is why every pull ships as
a runnable script rather than a tool transcript, and it is stated here so nobody
reads these numbers as hand-typed.

---

## Retrospective

### 1. What did we learn that is not written down anywhere?

**Malay-first is a property of the page, not of the query — and this playbook
never says so.** Every rule in the persona pushes toward Malay keywords, which
is right, and none of them handles the case where the Malay-speaking audience
searches in an English loanword. `garden wedding` carries 500/mo by `volume`;
every Malay phrasing of the same concept carries zero, and eight of them are not
in the Ahrefs Malaysian index at all. Writing in Malay for a loanword query is
not a failure of Malay-first strategy. It is Malay-first strategy meeting how
Malaysians actually type.

The failure-modes list makes this worse by naming "pages accumulating
impressions at ~0% CTR (wrong intent or wrong language surface)". That line
diagnosed this page as a language-surface error for two sprints. The language
surface is fine. **The page is on page four, and CTR at position 37 is 0.39%
whatever language it is in.** The rule needs the position check before the
language check, or it will keep producing this misdiagnosis.

**And a page can distort a company's self-image, not just its dashboard.** With
`/garden-wedding/` out of the totals the site reads CTR 2.21% at average
position 9.98, against the 1.75% at 16.72 the board has been quoting. Decision
80 already retracted "we rank and do not convert" once. This is the same
retraction again, one layer down, and it took a single `filter` to find.

### 2. Which document must change, and who owns that edit?

Four. All mine. All edited in this commit, not named and left.

1. **`skillcentral/agents/projects/hellokahwin/Marketing/head-of-seo-content.md`**
   — the persona. It now carries the loanword rule and the ordering fix to the
   failure-modes list. Owner: me. Committed, pushed **and deployed** to
   `.claude/agents/`, verified by diff, per this seat's own rule that a persona
   edit is not live until `install.sh` has run.
2. **`docs/boardroom/ceo-memory.md`** — two edits. The founding-baseline entry
   asserts the English impressions prove "the site currently isn't competing
   where its audience searches", which is the wrong reading of this page and is
   corrected in place. And a measurement rule is added: quote the headline
   ex-quarantine. Owner: me.
3. **`docs/boardroom/decision-log.md`** — decision 148, including the correction
   to decisions 88 and 97's "English-intent page" description. Owner: me.
4. **`scripts/seo/gsc-headline.mjs`** — new, because rule 2 is unenforceable as
   prose. Owner: me.

### 3. What did we do twice that we should never repeat?

**The page's language was described three times and read once.** Decision 88
(26 Aug), decision 97 (27 Aug) and this item's own brief all call it an
English-intent page. One `curl` and a `grep` for `<title>` — nine seconds —
shows a Malay H1 over 2,332 Malay words. Three sessions carried a claim about a
public URL that nobody had opened.

The general form is worse than the instance: **the brief inherited the premise
from the decision log, and the decision log inherited it from the query list.**
Nobody along that chain was careless; each was quoting the previous step. A
claim about what a page *is* has to be sourced to the page, and every restatement
of it after that is a copy, not a confirmation.

### 4. What did we nearly ship, and what caught it?

**A tripwire that ended in deleting the page.** The first draft of the review
clause read: if the family shows no query at position ≤ 20 by 27 November, the
URL is 410'd and removed from the sitemap. It had the shape of rigour — dated,
falsifiable, no third deferral — and it was wrong, because it made deletion the
default outcome of a test the page was likely to fail for reasons that have
nothing to do with its quality.

What caught it was writing the *"why not drop it"* section afterwards and
finding I could not name a 301 target. There is no Malay page about outdoor
venues to send those readers to. The absence of a destination is what exposed
the tripwire as a disguised deletion. **A review that destroys an asset when it
fails has already decided the outcome; it is a countdown dressed as a check.**
The failure branch now stops asking about the page instead of removing it.

Second, smaller: I very nearly reported the rewrite option as failing on SERP
ownership. It does not — it fails one step earlier, on volume, and never reaches
the ownership test. Running the rule in the order it is written (volume **and**
who owns position 1) is what kept the finding accurate. The replacement was
measured before the recommendation was written, which is the whole point of the
Sprint 02 retro's correction.
