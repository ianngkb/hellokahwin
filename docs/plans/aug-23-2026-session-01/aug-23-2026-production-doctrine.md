# Production Doctrine: how we overtake, what happens when they react

**Owner:** head-of-seo-content · **Date:** 23 Aug 2026
**Session:** aug-23-2026-session-01
**Brief:** `aug-23-2026-brief-production-and-visuals.md`, Part A
**Builds on:** `aug-23-2026-framework-content.md` (templates, 21-point quality
bar, linking rules) and `aug-23-2026-clusters-launch-plan.md` (approved)

Strategy document. No articles, drafts, outlines or sample paragraphs appear
here. One worked structural example is included where a rule needs to be made
concrete, and it names nothing real.

Every number carries its tool and its date. Figures reused from earlier
session documents are marked as carried forward rather than re-pulled.

---

## OUR FAILURE MODE HAS ONE SHAPE (Sprint 02 retrospective, 27 Aug 2026)

Mary put five of this sprint's failures side by side and they are the same
failure:

| Where | `unknown` silently became… |
|---|---|
| A dead agent's terminal | `IDLE/DONE` — the string a FINISHED agent shows |
| A squash-merged branch | "not an ancestor" → shipped work called unshipped |
| An item moved out of a sprint | 72/72 = **100%**, describing no real thing |
| `generateMetadata` timing out | `{}` → the site-default title, **and cached** |
| A failed URL inspection | "absent" → clean, over a silently shrinking denominator |

**In every case an ERROR or an UNKNOWN coerced into the value that means
"fine."** Not one of them announced itself. Four were caught by a person
happening to look; one was caught mid-build by its own author.

### The rule

> **Every collector that can fail must distinguish `absent` from `unknown`, and
> `unknown` must never coerce to a success value.**

If a check cannot run, it reports that it could not run. It does not report
"clean". A monitor that cannot see a page has not seen a healthy page.

This is not a platform rule wearing a doctrine hat — the writer seat already
works to the identical rule in Malay wedding law: *if you cannot source a claim,
flag it; never fill the gap with something plausible.* **Unverified must never
render as false.** The same sentence governs a monitoring pipeline and a fee
table.

### Its corollary, which has now cost two sprints

> **Check the artefact the consumer receives, not the input you control.**

SEO-05 audited 69 `seo_title` fields and found exactly one drifted — a correct
answer to the wrong question, because **39 pages were serving no article title
at all** and a row-level audit cannot see a render-level failure. SEO-02 hit the
identical shape a sprint earlier, when a page-level check could not see a
link-level `nofollow`.

**And a cached failure is worse than a failure.** A fallback returning `{}` under
load is reasonable; freezing that `{}` into a prerender and serving it for an
hour is not.


## The short version

The board asked why this system beats the incumbents over time. Most of the
answer has less to do with how well we write than with how little there is on
the other side.

**ppsignature.com, the market leader, earns 87% of its Malaysian organic
traffic from nineteen blog articles, and half of its total traffic from
content that has nothing to do with weddings.** Its traffic has not moved in
twelve months. **songketdunia.my earns 60% of its traffic from one page**, and
is down 38% from its own February peak. Neither is a publisher. Both are shops
with a blog attached, and neither blog has grown in a year.

We are not attacking a content moat. We are attacking roughly twenty-five
articles with no successor plan behind them, and our approved map is 204
topics.

This document turns that observation into a repeatable production behaviour
and states the numbers that would tell us it is not working.

---

## 1. The mechanism of overtaking

Two lines in the quality bar carry the entire competitive claim:

> **3.** No competitor page on page one answers something this page does not.
> **4.** It contains at least one specific, checkable fact a competitor does
> not have.

Both are assertions until a writer does something specific to make them true.
The two instruments below are that something: one table built before drafting,
and one named fact per article.

### 1.1 The instrument: the Coverage Ledger

Before a writer opens a document, they build one artefact. It is a table, it
lives in the brief, and it is the only thing QC checks line 3 against.

**How it is built. Five steps, roughly 45 minutes per article.**

**Step 1. Take page one as it actually is.** Pull the live SERP for the target
Malay keyword through Ahrefs `serp-overview`, country `my`, top 10, on the day
the brief is written. Not from memory, not from an earlier session's file. The
SERP is the definition of the competitive set for this article, and it is the
only definition that matters.

**Step 2. Read every editorial result on it.** Not the Pinterest boards, not
the Shopee listings, not the Instagram profiles. The pages a reader could
actually get an answer from. In this market that is typically two to four
results out of ten, which is why this step is affordable.

**Step 3. Extract each competitor's headings verbatim** into a column. Their
H2s and H3s are their coverage claim, stated in their own words. This is the
cheapest possible read of what a page covers, and it is what makes line 3
checkable rather than a matter of opinion.

**Step 4. Merge into one union list, then mark our column.** Every distinct
sub-topic any competitor covers becomes a row. Our column marks each row
covered, deliberately excluded, or missing. **Deliberately excluded needs a
written reason**, because "they cover it and we chose not to" is a legitimate
editorial position and "we forgot" is not.

**Step 5. Add the rows nobody has.** The questions from the Ahrefs
matching-terms tail for this cluster, plus the ones a Malay couple actually
asks that no incumbent thought to answer. This is where the article stops
being a better version of theirs and starts being a different thing.

**What the ledger looks like structurally** (a shape, not an article):

| Sub-topic | Competitor A | Competitor B | Competitor C | Us | Note |
|---|---|---|---|---|---|
| sub-topic covered by all three | H2 | H2 | H3 | required | |
| sub-topic covered by one | absent | H2 | absent | required | |
| sub-topic covered by one | H3 | absent | absent | excluded | out of topical radius, reason recorded |
| sub-topic nobody covers | absent | absent | absent | required | from keyword tail |
| state-by-state variation | absent | absent | absent | required | our differentiator, see 1.2 |

The ledger is the brief's spine. The article's H2 list is the "required" rows,
ordered. That is also why R17 (name the internal links in the brief) costs
nothing: by the time the ledger exists, the writer already knows what the
article contains.

### 1.2 The instrument: the Specific Fact

Line 4 asks for one specific, checkable fact a competitor does not have. Left
as a sentiment it produces a slightly better paraphrase of what is already on
page one, which is worth nothing. Given a definition it produces something a
competitor cannot acquire by reading our page.

**Four classes of fact qualify. Everything else does not.**

1. **A per-state or per-jurisdiction figure or rule**, with the state named and
   the authority named. Mas kahwin rates, procedural requirements, fee
   schedules, document lists.
2. **A real ringgit figure with its date and its basis.** Not "sekitar
   RM2,000" with no year and no source, which is what the incumbents publish.
3. **A named real-world reference a reader can go and check.** An enactment, a
   department, a form number, a published rate table.
4. **A structural distinction the incumbents blur.** Adat practice against
   religious requirement against state law. These are three different things
   and the pages on page one routinely present them as one.

**What does not qualify:** a longer list, a nicer photograph, more words, a
restated definition, or a claim we cannot source. Rule 7 of the quality bar
already forbids the last of those and it binds here too.

The data is what makes this list the right list. Every incumbent article read
during Phase 1 was generic, and the two market leaders both hold page one on
`mas kahwin` and `rukun nikah` with pages that state the general case and
nothing local (Ahrefs SERP Overview, `my`, 23 Aug 2026; article reads via
WebFetch, 23 Aug 2026). In a market where every ranking page is generic,
specificity is the opening rather than a refinement.

### 1.3 The check before QC passes

QC does not read the article and form an impression. It runs five checks in
order and stops at the first failure.

| # | Check | How it is verified | Fails when |
|---|---|---|---|
| 1 | **Ledger completeness** | Every "required" row in the brief's ledger maps to a heading or a named section in the draft | Any required row has no home in the article |
| 2 | **Ledger freshness** | The SERP pull date on the ledger is within 30 days of the QC date | Older than 30 days, in which case re-pull before passing |
| 3 | **The specific fact** | QC names it out loud and states which of the four classes it belongs to, and where it came from | It cannot be named, or it is not sourced, or it is class "longer list" |
| 4 | **Parent-topic clearance** | The target keyword's Ahrefs `parent_topic` is checked against the published set and the brief queue | Another live or queued page holds the same parent topic (R4) |
| 5 | **Price currency** | For every ringgit figure, QC names the source's own **last sign of life** (`datePublished`, last-updated stamp, newest archive entry, live stock count), not merely the date checked | The source shows no sign of life within 24 months; or a catalogue range carries no result count; or a promotional price is published without its struck-through original; or a market range rests on a single vendor |

**Check 5 was added on 25 Ogos 2026**, after the verification board blocked
`C5-1-A1-pelamin` for building a 2026 price article on a blog dormant since
May 2014, and `C5-4-A1-bunga-telur` for deriving a per-unit range from one
vendor and a filtered page. Both drafts satisfied every rule in force at the
time. The rule set recorded when we looked and never asked when the source
last moved. The full standard now lives in style guide §7.1a and reviewer
check S17; this row is the gate that enforces it before /humanizer.

Only after those five does the draft go to /humanizer, and only after
/humanizer does it go to the remaining seventeen lines of the quality bar.
**A draft that fails check 1, check 3 or check 5 goes back to the writer with the
ledger attached, not with an opinion attached.** That is the point of building
the instrument: disagreements about whether an article is good enough become
disagreements about a table, which are resolvable in minutes.

### 1.4 What the ledger buys beyond the article

Telling writers to be comprehensive achieves very little. The ledger produces
the comparison whether or not the writer feels like doing it, hands the
reviewer an object to check against, and leaves a record that tells us, six
months later, what page one looked like when we wrote the page. That record is
also the refresh trigger
under R18 and R19: when a page's traffic falls from its own peak, the first
question is whether the ledger has changed, and the old ledger is the only way
to answer it.

---

## 2. Why we beat these three specifically

The board asked for both halves, including the half where the incumbents are
strong.

**Current standing, all pulled 23 Aug 2026 unless noted:**

| Site | DR | MY organic keywords | Top-3 | MY visits/mo | Live ref. domains |
|---|---|---|---|---|---|
| ppsignature.com | **4.7** | 2,263 | 1,493 | ~29,745 | 628 |
| nikahsatu.com | **14.0** | 1,007 | 570 | ~11,287 | 2,362 |
| songketdunia.my | **3.8** | 823 | 505 | ~10,107 | 484 |
| hellokahwin.com | **0.0** | 6 | 0 | ~13 | 452 |

*DR and referring domains: Ahrefs `site-explorer-domain-rating` and
`site-explorer-backlinks-stats`, mode `subdomains`, 23 Aug 2026. Keyword,
top-3 and traffic figures: carried forward from
`aug-23-2026-clusters-launch-plan.md`, Ahrefs Site Explorer, `my`, index date
2026-08-01.*

### 2.1 ppsignature.com (DR 4.7): the leader, and it has stopped

**What it is.** A bridal boutique on Shopify with a blog. It is the largest
organic force in Malay wedding search by a wide margin.

**Where it is strong, and this is real.** Nineteen articles, each ranking for
29 to 100 keywords, several holding position 2 on 6,800-a-month head terms. It
holds genuine editorial backlinks from Malaysian media that we do not have:
says.com (DR 71), therakyatpost.com (DR 68), mstar.com.my (DR 64), each
acquired over years (Ahrefs `site-explorer-referring-domains`, dofollow only,
23 Aug 2026). Those links are not purchasable at speed and I am not going to
pretend otherwise.

**Where it is weak, structurally, in ways that do not resolve by trying
harder.**

**One: half its traffic is not wedding traffic.** Of the roughly 29,745
Malaysian visits a month, its top 25 pages account for 28,050, and within that
five pages about istikharah prayer, doa jodoh, divorce and iddah account for
**14,970 visits, 50.3% of the site's Malaysian traffic** (Ahrefs
`site-explorer-top-pages`, `my`, 2026-08-01, pulled 23 Aug 2026). One page,
`cara-solat-sunat-istikharah-yang-mudah-ringkas`, is 12,663 of it on its own.
**Its actual wedding editorial franchise is around 10,800 visits a month from
about fourteen articles.** That is the number we are contesting, not 29,745,
and the cluster plan already declined the istikharah territory on topical
radius grounds.

**Two: it has been flat for a year.** Global organic traffic was 31,056 in
August 2025 and 31,051 in August 2026, a change of five visits (Ahrefs
`site-explorer-metrics-history`, monthly, pulled 23 Aug 2026; the country
filter on this endpoint returned an error, so these are global figures, and
the Malaysian share of its traffic is roughly 96% by comparison with the
`my` figure above). A site publishing seriously does not sit still for twelve
months. This is a finished asset being maintained, not a programme.

**Three: it has no architecture at all.** Every article sits on the flat
Shopify path `/blogs/latest-blog/<slug>`. There are no pillars and no
categories, so every article is a sibling of every other article and of
nothing in particular. Rebuilding that on a live Shopify storefront is a URL
migration with revenue attached, not an afternoon's work.

**Four: it is cannibalising itself, and I can name four cases.** Two pages on
mas kahwin ikut negeri (2,847 visits against 8). Two on baju songket pengantin
(139 against 22). Two on dulang hantaran (275 against 36). Two on dugaan
bertunang (50 against 7). In each pair one page is eating the other. R4 exists
precisely to stop this and the market leader does not run it.

**Five: it is a dress shop.** Editorial is a customer-acquisition cost for
them, not the product. That constrains how much they can ever spend on it, and
it shows: their venue attempt, `/blogs/wedding-venues/`, is three pages
earning 135 visits a month combined.

**What we cannot take from them.** The istikharah page, and we do not want it.
The Malaysian media backlinks, which take years. And their commercial
proximity to the purchase, which is not a search asset.

### 2.2 songketdunia.my (DR 3.8): one article, and it is fading

**Where it is strong.** 505 top-three Malaysian keywords at DR 3.8, which
remains the single best proof in this market that domain authority is not the
gate. It also holds real Malaysian links: grab.com, mudah.my, gempak.com,
thesmartlocal.com, therakyatpost.com (Ahrefs
`site-explorer-referring-domains`, dofollow only, 23 Aug 2026).

**Where it is weak.** Its top page,
`/blogs/news/ucapan-selamat-pengantin-baru`, earns **6,356 visits a month, 60%
of the whole site**, and the top two pages together are 71% (Ahrefs
`site-explorer-top-pages`, `my`, 2026-08-01, pulled 23 Aug 2026). Only six
blog articles appear in its top fifteen pages; the rest are Shopify collection
pages for sampin and songket.

**And it is declining.** Global organic traffic peaked at 16,971 in February
2026 and was 10,594 in August 2026, **down 37.6% from its own peak** (Ahrefs
`site-explorer-metrics-history`, monthly, pulled 23 Aug 2026).

**The strategic read.** A competitor whose business is 60% one page is a
competitor with one thing to defend and no capacity to defend anything else.
Our P3 plan puts six articles around `ucapan pengantin baru` while they hold
it with one, which makes this the cleanest test of a cluster against a single
page anywhere on the map.

**What we cannot take.** Their product SERPs. `sampin instant`, `sampin
exclusive`, `songket pasang` are transactional queries answered by a shop that
sells the thing. We should never try.

### 2.3 nikahsatu.com (DR 14.0): the only real publisher, and the one growing

**Where it is strong, and it is the one to respect.** The only competitor
in the set that is actually a wedding publication. 570 top-three keywords,
2,362 live referring domains, and it is the only one of the three growing:
12,254 global organic visits in August 2025 against 13,183 in August 2026,
**up 7.6%** (Ahrefs `site-explorer-metrics-history`, monthly, pulled 23 Aug
2026). Its long articles rank for 40 to 119 keywords each, and it runs a venue
directory that supplies eleven of its top twenty-five pages.

**Where it is weak.** Its internal link graph is sitewide navigation.
Ahrefs `site-explorer-pages-by-internal-links` returns an identical 168
internal links to nearly every significant page, including the venue hub, the
catalogue and individual venue pages (carried forward from
`aug-23-2026-research-topical-authority.md`, pulled 23 Aug 2026). A number
that identical is a header and a footer, not editorial linking. They have
depth of coverage and no cluster architecture, which means each page earns
alone and none of them lifts the next one.

**What we cannot take.** Their directory, which is already built and already
ranking. Our answer is not to beat their directory but to build our own
against venues they have not covered, which the framework already scopes at 40
to 60 entries.

### 2.4 All three, summarised

| Competitor | Their real asset | The structural gap we exploit |
|---|---|---|
| ppsignature.com | ~14 wedding articles + 3 non-wedding giants | Flat 12 months, no taxonomy, four cannibalisation pairs, editorial is a cost centre |
| songketdunia.my | 1 article at 60% of traffic | Down 37.6% from peak, six articles total, no cluster around its own best asset |
| nikahsatu.com | A real publication and a working directory | Navigation-only internal linking, so nothing compounds |

---

## 3. Compounding: why article 60 ranks faster than article 6

Article 6 lands on a domain with no pillar behind it, five siblings, no
inbound editorial links, no crawl history on its path, and no entity
association in Google's index. Article 60 lands on three finished pillars, a
crawl path Google already visits, fifteen available inbound editorial link
slots, and a domain that has been publishing about the same entity for three
months.

Four assets accumulate. They pay at different times and they should be
measured separately, because when growth stalls the useful question is which
one stopped.

### 3.1 Cluster completeness, and the long-tail harvest

**What accumulates.** The number of questions inside one entity that we
answer.

**Why it pays.** In this market a well-covered page earns most of its traffic
from keywords it did not target. The evidence is on both leaders' pages:
ppsignature's articles rank for 29 to 100 keywords each and nikahsatu's for 40
to 119 (Ahrefs `site-explorer-top-pages`, `my`, 2026-08-01, pulled 23 Aug
2026). A page written to the ledger picks up the tail; a page written to one
keyword does not. And when six siblings each carry a 40-keyword tail, the
overlap between them is what a cluster is.

**When it starts paying.** Article 5 to 8 within a cluster. Below that the
pillar has nothing to point down at and the cluster does not read as coverage
(R3). This is exactly why the sequence is depth-first.

### 3.2 Internal link equity

**What accumulates.** Editorial links, in both directions, under R13 and R14.
Each new article in a cluster adds one link up to the pillar, two to four
sideways to siblings, and creates two to four new inbound slots for the next
article.

**Why it pays.** Neither leader has this. nikahsatu's graph is nav-only;
ppsignature's is a flat Shopify blog namespace. It is the cheapest structural
advantage on the board and it costs discipline rather than money.

**When it starts paying.** Weeks 4 to 8, and only once the pillar pages exist.
The pillar pages remain unbuilt and remain the gate on article one. This is
the fifth time it has been raised and it is still the single item most likely
to cost us a month.

### 3.3 Entity recognition and site focus

**What accumulates.** The share of our published pages that are about one
thing.

**Why it pays.** The practitioner sources point to concentration as a measured
signal, and the local evidence is blunter than the theory: nikahsatu at DR 14
earns roughly 21 times thekenduri.com at DR 10, and the visible difference is
concentration (carried forward from
`aug-23-2026-research-topical-authority.md`).

**When it starts paying.** Months 3 to 6, at pillar completion rather than at
article completion. It is also the asset most easily damaged, which is why the
cluster plan walked past roughly 75,000 monthly searches of adjacent volume.

**A live drag on this asset that we should name.** Our current best page by
impressions, `/garden-wedding/`, is English-titled, sits at average position
36.6, and converted 844 impressions into 4 clicks (GSC, 28 days
2026-07-25 to 2026-08-21, carried forward from the baseline audit). It is
currently our loudest signal to Google about what this site is, and it is
signalling the wrong language.

### 3.4 Refresh cadence

**What accumulates.** A dated ledger and a booked refresh on every
price-bearing and year-stamped page.

**Why it pays.** It is the asset the incumbents structurally cannot hold.
ppsignature still has a live page titled with "updated 2022" earning 8 visits
a month while its successor earns 2,847. The state-level mas kahwin and cost
pages are the highest-value refresh targets on our map, and refresh is a
maintenance behaviour, not a content behaviour, so it survives writer
turnover.

**When it starts paying.** Month 12 onward, and it is the reason a 24-month
view of this programme looks different from a 90-day one.

### 3.5 The caveat on all four

None of this compounds if the articles do not ship. Every asset above is a
function of published volume, and published volume is a function of the two
writer hires that remain unapproved. **The compounding argument is a reason to
resource the programme, not a substitute for resourcing it.**

---

## 4. The counter-attack case

Assume an incumbent notices, works out what we are doing, and decides to
respond properly. This section is what I expect to happen then.

### 4.1 What they can do quickly, and it would hurt

**Refresh their two or three biggest pages.** songketdunia updating and
expanding `ucapan-selamat-pengantin-baru`, or ppsignature rewriting
`rukun-nikah-panduan-5-rukun-syarat-sah-nikah`, is a week of work against
pages that already hold position 2 with years of accumulated ranking history.
On those specific SERPs they would probably hold. **We should expect to lose
head terms where an incumbent has both position 2 and the will to defend it,
and win the cluster around them anyway.** That trade is acceptable and it is
the plan; it is worth stating so that losing one head keyword in October is
not read as the doctrine failing.

**Buy a few Malaysian media links.** They already have relationships with
says.com, mstar, gempak, therakyatpost. We have none.

### 4.2 What they cannot do quickly, and this is the defensible position

**Restructure into pillars and clusters.** ppsignature's entire editorial
namespace is `/blogs/latest-blog/`. Shopify's blog structure gives one flat
namespace per blog; building a real pillar architecture there means URL
changes across a live storefront, which is a migration with revenue attached.
songketdunia has the identical constraint on `/blogs/news/`. **Both leaders
are architecturally frozen in the exact dimension where our advantage lives.**

**Fund an editorial programme.** They are shops. Editorial spend competes with
inventory and paid acquisition. Twelve flat months at ppsignature is not an
oversight, it is a budget.

**Match cultural depth at speed.** The nisbah and adat material, the
state-by-state variation, the distinction between adat and hukum and state
enactment, is the part that cannot be produced by someone briefing a
generalist writer. It is also the part with the least incumbent coverage.

**Match cadence.** Six articles a week against their observed twelve-month
output is not a race they have staff for.

### 4.3 What we could actually lose

Ranked by how much it would cost us, not by likelihood.

1. **The two writers not being approved.** This is the largest risk to the
   plan and it is internal. At three to four articles a week the honest target
   is roughly 45 articles and a proportionally lower click number.
2. **The pillar pages not being built.** R16 forbids orphans, so without them
   the linking architecture, which is the whole compounding argument in 3.2,
   does not exist. Article one is blocked on an engineering task nobody has
   picked up.
3. **A real publisher entering the market.** Not these three. A Malaysian
   media group deciding Malay wedding content is worth a team would arrive
   with links and brand that we cannot match, and the SERPs are soft enough
   that they would see the same opportunity we did. Our defence is being
   twelve months ahead on coverage by the time it happens.
4. **AI Overviews absorbing the answer.** Every cluster on the map is
   informational Malay queries, which is the query class most exposed. R10
   (answer in the first 60 words) is written for extraction, which cuts both
   ways: it wins the citation and it can cost the click. The mitigations are
   the parts an overview cannot carry, which are the state tables, the
   comparison charts, the directory and the brand. **This is a genuine
   structural risk to the click target and I am not going to model it, because
   I have no measurement of Malay AI Overview incidence on our keywords.**
5. **Google reading our backlink profile as spam.** See 5.4. This is a live
   finding from today and it is not in any earlier document.

### 4.4 The position, summarised

What we can defend is the cluster architecture, the publishing cadence and the
cultural depth of the material, held by a company whose product is the
content. The two retailers treat content as a marketing line item, and the one
publisher in the set has never linked its own pages together.

---

## 5. Failure modes and the stop rule

Three things make this measurement genuinely hard for the next 60 days, and
they need to be separated before any number means anything.

**Noise source one: the migration.** Every URL on the site changed on 21 Aug
2026. Search Console will be measuring a migration as much as a content
programme for several weeks.

**Noise source two: anonymised queries.** 45.7% of impressions and all 32
baseline clicks sit in queries GSC will not name (carried forward from the
baseline audit). Query-level analysis covers roughly half the data.

**Noise source three: normal SEO lag.** 6 to 12 months remains the correct
default. Faster is a competitor-derived expectation, not a measurement of our
own site.

**The rule that separates signal from all three.** Every article published
after 1 Sep 2026 sits on a brand-new URL with no history, no redirect and no
migration exposure. **The doctrine is measured only on post-1-Sep URLs.**
Sitewide totals go in the board report for context; the doctrine is judged on
the new set. This one decision removes noise sources one and two from the
assessment almost entirely, because new URLs have no legacy impressions and
their volumes will be small enough to name.

### 5.1 The checkpoints

Dates assume production starts the week of 25 Aug 2026.

**Day 30, checkpoint 22 Sep 2026. Leading indicators only. No click target.**

| Measure | Healthy | Concerning | Stop and reassess |
|---|---|---|---|
| Articles published | 24+ | 15 to 23 | **under 15** |
| Published URLs with ≥1 GSC impression after 14 days live | 90%+ | 70 to 89% | **under 60%** |
| Cluster-one head keywords appearing at any position | 3 of 3 | 2 of 3 | **0 of 3** |
| Pillar pages live | 2+ | 1 | **0** |

*Reading it: at day 30 nothing is expected to rank. The only question is
whether we are producing and whether Google is picking the pages up. A
publishing shortfall here is a resourcing problem, not a doctrine problem, and
it has a different fix.*

**Day 60, checkpoint 22 Oct 2026. First ranking movement.**

| Measure | Healthy | Concerning | Stop and reassess |
|---|---|---|---|
| Articles published | 45+ | 30 to 44 | under 30 |
| Post-1-Sep URLs in top 20 for their target keyword | 40%+ | 20 to 39% | **under 15%** |
| Cluster-one combined impressions, 28 days | 3,000+ | 1,500 to 2,999 | **under 1,500** |
| Sitewide clicks, 28 days | 150+ | 60 to 149 | under 60 |
| Post-1-Sep URLs with impressions and 0 clicks | under 25% | 25 to 40% | **over 40%** |

*Reading it: the last row is the important one and it is the failure mode this
site already demonstrates. `/garden-wedding/` earns 844 impressions and 4
clicks. Impressions without clicks means wrong intent, wrong language surface
or wrong position band, and it is the one failure that looks like progress on
a chart.*

**Day 90, checkpoint 21 Nov 2026. The board's scoreboard.**

| Measure | Target | Acceptable | Change course |
|---|---|---|---|
| Sitewide clicks, 28 days | **1,500** | 600 to 1,499 | **under 400** |
| Articles published and indexed | 78 | 55 to 77 | under 50 |
| Post-1-Sep URLs in top 10 | 35%+ | 20 to 34% | under 12% |
| Finished clusters at 80%+ coverage | 5 | 3 to 4 | under 2 |

### 5.2 The number I will bring to the CEO as a change-of-course

**Fewer than 400 clicks in the 28 days to 21 Nov 2026, with 70 or more
articles published and indexed and at least three clusters at 80% coverage.**

That combination is the one that cannot be explained away. It means the
articles shipped, Google found them, the clusters were finished, and the
traffic did not come. At that point the doctrine is wrong, not late, and I
will say so in those words rather than ask for another quarter.

**What is explicitly not a change-of-course signal**, so that we do not
panic on the wrong number:

- Low clicks at day 30 or day 60. Expected.
- Sitewide impressions falling. The migration is still resolving and half the
  legacy impressions come from one English page we intend to lose anyway.
- Losing a head keyword where an incumbent holds position 2 and defends it.
  Section 4.1 says we should expect this.
- Average position getting worse while impressions rise. New pages entering
  the index at position 40 drag the average down. This metric is close to
  useless during a build phase and it should not appear in a board report
  without that caveat attached.

### 5.3 The per-article failure modes QC watches for

| Failure mode | The tell | The fix |
|---|---|---|
| Impressions at near-zero CTR | 45 days live, 200+ impressions, under 1% CTR | Wrong intent. Re-read the SERP, usually the query wanted a tool, a product or an image |
| Never indexed | 21 days live, zero impressions | Orphan. Check the inbound editorial link actually exists (R16) |
| Ranking for the wrong tail | Target keyword absent, siblings present | Ledger was incomplete, or a sibling page holds the parent topic |
| Two pages trading positions | Both fluctuating on one keyword | Cannibalisation. Merge (R4, R20) |
| Stalled at position 11 to 20 | 60 days, no movement | The cluster is not finished. Publish the siblings before touching the page |

### 5.4 A finding from today that belongs in this section

**Our backlink profile is spam and it should be looked at before it becomes a
problem.**

Ahrefs `site-explorer-backlinks-stats` and `site-explorer-referring-domains`,
`subdomains`, pulled 23 Aug 2026:

- 452 live referring domains, up from 12 in March 2026, a 37-fold rise in five
  months during which nothing was published.
- The 25 highest-DR referring domains are **all** link-selling sites:
  rankyour.website (DR 74), buybacklinks.agency (DR 69), backlinker.shop,
  pbnseolinks.shop, buyseobacklinks.shop and twenty more of the same shape.
  Every one is nofollow, one link each, all first seen between January and
  July 2026.
- Only **13 referring domains link with a followed link at all**, and every one
  of those is junk as well: a casino site, a PLR download site, a celebrity
  scraper, a crime-news domain. All thirteen were first seen in August 2026.
- Domain Rating is **0.0** with a null Ahrefs rank, which is consistent with a
  profile carrying no real link equity.

**What this is.** Almost certainly the automated backlink-tool crawl that
sprays every registered domain, not something anyone did on purpose. It is
common and usually harmless.

**Why it still matters.** Any future claim of "link parity with the
incumbents" based on the 452 figure would be false, and I want that on the
record before somebody makes it, including me. On genuine editorial links the
score is ppsignature and songketdunia with a handful each from real Malaysian
media, and **HelloKahwin with zero**. The market is still soft enough that
this does not block the strategy, since DR 3.8 holds page one here. It does
mean our only route to links is being worth linking to.

**What I recommend.** No disavow action today; disavowing nofollow spam is
usually pointless and occasionally harmful. Re-check the profile at the day 60
checkpoint, and escalate only if followed spam links start growing at pace.

---

## 6. What this doctrine asks for

Nothing new. It asks for the same four decisions already open, and it explains
what each one costs if it stays open.

1. **The two Malay writer hires.** Section 3.5. Every compounding asset is a
   function of published volume.
2. **The seven pillar pages.** Section 3.2. Without them R16 blocks article
   one and the compounding argument does not exist.
3. **The venue directory.** Section 2.3. It is the one asset nikahsatu holds
   that we cannot out-write, and the only answer is to build our own.
4. **The redirect chain fix.** Every historic inbound link runs through two
   hops.

One thing the doctrine adds, and it is free: **every brief from now on carries
a Coverage Ledger with a SERP date on it, and no draft passes QC without the
specific fact named out loud.** That is a change to the brief template and the
QC checklist, and I own both.

---

## Data provenance

**Pulled fresh for this document, Ahrefs MCP, 23 Aug 2026:**

- `site-explorer-domain-rating`: ppsignature.com (4.7), songketdunia.my (3.8),
  nikahsatu.com (14.0), hellokahwin.com (0.0).
- `site-explorer-metrics-history`, monthly, Aug 2025 to Aug 2026:
  ppsignature.com, songketdunia.my, nikahsatu.com. **The `country` parameter
  returned an empty error on this endpoint across four attempts, so these
  three series are global, not Malaysia-filtered. For ppsignature the global
  and Malaysian figures are within 5% of each other, so the flat-trend reading
  holds; for the other two the trend direction is global and is labelled as
  such wherever it is used.**
- `site-explorer-top-pages`, `my`, 2026-08-01: ppsignature.com (top 25 with
  keyword detail, then top 100 for the article census), songketdunia.my
  (top 15).
- `site-explorer-backlinks-stats`, `subdomains`, 23 Aug 2026: all four
  domains.
- `site-explorer-referring-domains`, `subdomains`, 23 Aug 2026:
  hellokahwin.com (top 25 by DR, then filtered to dofollow), ppsignature.com
  and songketdunia.my (dofollow only, top 15 by DR).
- `site-explorer-refdomains-history`, monthly, Aug 2025 to Aug 2026:
  hellokahwin.com.

**Carried forward, not re-pulled:** the Malaysian keyword, top-3 and traffic
figures for all four domains (Ahrefs Site Explorer, `my`, index 2026-08-01,
pulled 23 Aug 2026, recorded in `aug-23-2026-clusters-launch-plan.md`); the
GSC baseline and per-page breakdown (Search Console API, property
`https://hellokahwin.com/`, 2026-07-25 to 2026-08-21, recorded in
`aug-23-2026-audit-baseline.md`); nikahsatu's internal-link signature and the
thekenduri comparison (recorded in
`aug-23-2026-research-topical-authority.md`).

**Ahrefs unit spend for this document:** 30,414 units before starting, 33,693
after. **3,279 units consumed, 0.8% of the 400,000 monthly workspace
allowance.** Verified through `subscription-info-limits-and-usage`.

**Nothing here is estimated.** The only modelled numbers are the checkpoint
thresholds in section 5, which are targets rather than measurements and are
presented as such.
