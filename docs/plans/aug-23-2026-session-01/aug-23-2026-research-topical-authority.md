# Research: topical authority, who has it, and how they got it

**Task:** Phase 1, Task 0 (hard gate) · **Owner:** head-of-seo-content
**Date:** 23 Aug 2026 · **Session:** aug-23-2026-session-01
**Brief:** `aug-23-2026-brief-head-of-seo-content.md`

Every figure below carries its tool and date. Where a source could not be
reached, it says so. Nothing here is estimated unless it is labelled an
estimate.

---

## 0a. What the practitioners actually say

I pulled the real SERPs rather than trusting a memory of them, then read the
top-ranking pages in full.

**Ahrefs SERP Overview, country `us`, pulled 23 Aug 2026, "topical authority"**

| Pos | Page | DR | Est. traffic/mo |
|---|---|---|---|
| 2 | semrush.com/blog/topical-authority/ | 92 | 1,050 |
| 4 | ahrefs.com/blog/topical-authority/ | 91 | 500 |
| 6 | mailchimp.com/resources/topical-authority/ | 93 | 322 |
| 7 | reddit.com/r/SEO, "Understanding topical authority" | 95 | 72 |
| 10 | conductor.com/academy/topical-authority/ | 84 | 37 |

**Ahrefs SERP Overview, country `us`, pulled 23 Aug 2026, "topical map seo"**

| Pos | Page | DR | Est. traffic/mo |
|---|---|---|---|
| 2 | ahrefs.com/blog/seo-topical-map/ | 91 | 301 |
| 3 | bettermarketing.pub, "How I Create SEO Topical Maps" | 73 | 236 |
| 5 | inlinks.com/insight/creating-topic-maps/ | 68 | 84 |
| 8 | toprankmarketing.com/blog/topical-mapping-for-seo/ | 75 | 120 |

**Ahrefs SERP Overview, country `us`, pulled 23 Aug 2026, "content clusters seo"**

| Pos | Page | DR | Est. traffic/mo |
|---|---|---|---|
| 1 | yoast.com/content-clusters/ | 91 | 372 |
| 2 | semrush.com/blog/topic-clusters/ | 92 | 1,808 |
| 4 | siteimprove.com/blog/pillar-and-cluster-content-strategy/ | 81 | 531 |
| 6 | blog.hubspot.com/marketing/topic-clusters-seo | 93 | 743 |

I read four of these end to end (WebFetch, 23 Aug 2026): the two Ahrefs
pieces, and the two Semrush pieces. What they agree on, and where they leave
gaps, is the useful part.

### Where they agree

**There is no fixed article count.** Ahrefs is explicit: *"A specialized niche
might need 15-20 well-connected pieces; a broader subject could need 50 or
more. The better question is whether your content covers the topic more
comprehensively than your competitors'."* Completeness is comparative, not
absolute.

**Google appears to measure concentration, not just quality.** Ahrefs cites
the 2024 Google API leak for two internal signals, *site focus score* (how
concentrated content is around a core subject) and *site radius* (how far
content strays from that core). Whether or not those names survive, the
implication is directional and testable: a site that publishes twenty pages
about one thing is read differently from a site that publishes one page about
twenty things.

**E-E-A-T is evaluated per topic, not per domain.** A site can be authoritative
on hantaran and worthless on honeymoon destinations at the same time.

**Pillar and cluster pages link both ways.** Semrush: *"add internal links
from the pillar page to its cluster pages. And vice versa,"* with
*"keyword-rich anchor text."*

**Clusters have a size window.** Semrush: a topic should be *"broad enough to
warrant several pieces of content. But not so broad that the cluster could
become oversized and unfocused."*

**Timeline.** Ahrefs: *"Expect 6-12 months before seeing significant
movement"*, months 1-3 establish coverage, 4-6 show first ranking
improvements, 6-12 compound. This is the number the board should hold me to
for hard topics. Section 0b shows why the Malay wedding space is faster.

**Start narrow.** Semrush's first failure mode is competing in an overly broad
topic. Its second is thin or duplicate content published for traffic's sake.

### Where they are thin, and I had to look elsewhere

- **Ahrefs' topical-map guide gives a seven-step process** (identify main
  topic → supporting and sub-topics → score brand relevance and business value
  0-3 → verify volume in Keywords Explorer → drop anything scoring low on two
  or more axes → map existing vs new URLs → prioritise into bands) but on
  internal linking it says only *"internally linking between all posts in a
  topic hub."* No rule for how many links, or which direction.
- **Semrush's cluster piece does not address cannibalisation or orphan pages
  at all.** Both are the failure modes most likely to bite a site publishing
  80 articles in 90 days.
- Nobody gives a usable definition of "depth" at the article level.

So the parts of the method that matter most to us are exactly the parts the
published guides skip. I filled them in from the sites in 0b.

---

## 0b. Sites that demonstrably own a topic

I deliberately picked cases in our own market rather than famous American
examples, because the interesting question is not *can topical authority work*
but *what does it cost here*.

**Ahrefs Site Explorer, country `my`, index date 2026-08-01, pulled 23 Aug
2026:**

| Site | DR | Organic keywords (MY) | Of those, top-3 | Est. organic traffic/mo |
|---|---|---|---|---|
| nikahsatu.com | 14 | 1,007 | 570 | **11,287** |
| theweddingnotebook.com | not pulled | 911 | 344 | 8,280 |
| thekenduri.com | 10 | not pulled | n/a | ~530 across top 20 pages |
| **hellokahwin.com** | not pulled | **6** | **0** | **13** |

DR figures for nikahsatu (14), thekenduri (10) and songketdunia.my (3) come
from the Ahrefs SERP Overview pulls in Task 3 of the audit, same date.

The first row is the argument. A domain with **DR 14**, barely any
backlink authority at all, earns **11,287 organic visits a month** in
Malaysia and holds **570 top-three rankings**. It does that on concentration,
not on links.

### Case 1. nikahsatu.com (Malay, weddings): the pattern to copy

Ahrefs Site Explorer top pages, `my`, 2026-08-01, pulled 23 Aug 2026:

| Page | Est. traffic/mo | Keywords | Top keyword (vol) | Pos |
|---|---|---|---|---|
| /ini-ucapan-ucapan-mengembirakan-pasangan-pengantin…/ | 2,916 | 119 | ucapan pengantin baru (4,700) | 3 |
| /17-idea-hantaran-kahwin-yang-menarik/ | 1,978 | 109 | barang hantaran lelaki (600) | 2 |
| /10-hantaran-tunang-yang-simple-tapi-kelihatan-elegan/ | 994 | 78 | hantaran tunang (4,800) | 4 |
| /venue/villa-rimba-flora-gombak/ | 515 | 2 | villa rimba flora gombak (1,300) | 1 |
| /checklist-persiapan-perkahwinan-lengkap-a-z/ | 429 | 75 | checklist kahwin (800) | 3 |
| /venue/jiwa-damansara/ | 424 | 2 | jiwa damansara (1,200) | 1 |
| /contoh-kad-kahwin-yang-menarik…/ | 347 | 64 | contoh kad jemputan kahwin (1,400) | 3 |
| /7-langkah-merisik-yang-perlu-anda-fahami/ | 271 | 40 | merisik (600) | 2 |
| /venue/rumah-abang-jamil-klang/ | 267 | 4 | rumah abang jamil klang (600) | 1 |
| /10-idea-menarik-gubahan-dulang-hantaran-terkini/ | 240 | 56 | dulang hantaran (3,500) | 5 |

Four things jump out.

**One: two page archetypes, doing completely different jobs.** Long advice
articles rank for 40-119 keywords each, they harvest a whole cluster of
long-tail phrases off one page. Venue directory pages (`/venue/<slug>/`) rank
for 1-4 keywords each, always at position 1, always for the venue's own name.
The articles build the topic; the directory pages are cheap, uncontested
traffic that would otherwise go to nobody.

**Two: the biggest page is not about planning a wedding.** "Ucapan pengantin
baru", congratulation wording, is a *guest* query, 4,700 searches a month,
and it is nikahsatu's single largest asset at 2,916 visits. The adjacent-intent
territory around a wedding (ucapan, doa, pantun, hadiah) is larger than parts
of the planning territory, and it is barely contested.

**Three: I read the flagship article** (WebFetch, 23 Aug 2026,
`/17-idea-hantaran-kahwin-yang-menarik/`). Roughly 2,400 words. Eight H2
sections, each an item category, with H3 sub-items nested underneath.
*Hantaran Wajib Adat Resam* holds sirih junjung, bunga rampai and wang tunai;
*Hantaran Makanan & Manisan* holds kek, buah-buahan, makanan tradisi and
makanan sunnah. Eight to ten images. A branded "NikahSatu Tips" callout. Named author
byline. No FAQ block, no comparison table, no price table beyond an
incidental RM5 mention. The writing is unremarkable. The coverage is not:
every sub-type of the entity gets its own heading.

**Four, and this is the opening: their internal linking is navigation, not
editorial.** Ahrefs pages-by-internal-links (pulled 23 Aug 2026) returns 168
internal links to almost every significant page, an identical number for the
venue hub, the catalogue pages, the promo page and individual venue pages.
That signature is a sitewide header/footer menu, not deliberate article-to-
article linking. They have depth of coverage and no cluster architecture. We
can have both.

### Case 2. theweddingnotebook.com (English, same market): the sibling

Ahrefs top pages, `my`, 2026-08-01, pulled 23 Aug 2026, 911 keywords, 8,280
traffic/mo. The structural pattern is *identical* to nikahsatu's despite a
totally different brand and language:

| Page | Est. traffic/mo | Type |
|---|---|---|
| /inspire/ideas-and-advice/10-affordable-wedding-venues-in-kl-selangor | 1,205 | roundup |
| /inspire/ideas-and-advice/beautiful-wedding-venues-in-malaysia | 832 | roundup |
| /catalog/venues/lantera-venue | 458 | directory entity |
| /catalog/venues/tanarimba-janda-baik | 343 | directory entity |
| /catalog/venues/templers-ballroom-setia-eco-templer-rawang | 301 | directory entity |
| /inspire/ideas-and-advice/best-venues-for-a-garden-wedding | 264 | roundup |

Same two archetypes: **venue roundups and a venue directory.** Of TWN's top 25
pages in Malaysia, 14 are `/catalog/venues/` entity pages.

And the third archetype is conspicuous by its weakness: TWN's best-performing
Real Wedding feature earns 132 visits a month, and it earns them for the
*venue's* name (laman gaharu emas, 1,100 searches), not for anything about
the wedding. Real Weddings are not a search asset in this market. They are a
brand asset that occasionally catches a venue-name query.

### Case 3. thekenduri.com (Malay, weddings): what failure looks like

Ahrefs top pages, `my`, 2026-08-01, pulled 23 Aug 2026. Top page: 137
visits/mo. Top twenty pages together: roughly 530 visits/mo, about 4.7% of
nikahsatu's. DR 10, so not meaningfully weaker on links.

The difference is shape. Their top twenty spans wedding packages, a venue or
two, catering pages, product pages for *nasi hujan panas* and *dalca sayur*,
one article about hot springs, one about wedding themes, one about hantaran.
No cluster is finished. Nothing links to anything. This is the breadth-before-
depth failure mode with a real traffic number attached to it: **breadth costs
about 95% of the traffic that depth earns, at the same domain strength.**

### Case 4. songketdunia.my (DR 3): how soft this market really is

From the "hantaran kahwin" SERP (Ahrefs SERP Overview, `my`, 23 Aug 2026): a
**DR 3** e-commerce blog holds position 5 with an estimated 593 visits a month
and 117 ranking keywords, on the same page as Pinterest (DR 97), Shopee
(DR 87) and Facebook (DR 100), and above all of them in usefulness. Position
2 on that SERP is nikahsatu at DR 14.

Backlink authority is not what decides these SERPs. Coverage is, and nobody
has finished building any.

---

## 0c. The distilled method

This is what I will actually do. It is written as rules because rules survive
delegation to writers; essays do not.

### Defining the map

**R1. Clusters are entities, not keywords.** A cluster is a real thing a
couple deals with, hantaran, mas kahwin, dewan, baju nikah, kad kahwin. Not a
keyword string. Entities have sub-parts, and the sub-parts are the articles.

**R2. Completeness is comparative and question-shaped.** For each entity, list
every question a Malay couple actually asks about it. The cluster is covered
when (a) every question with ≥100 monthly MY searches has a page, and (b) no
competitor page answers a question we do not answer somewhere. Ahrefs is right
that there is no magic count, but this test produces a count, per cluster, from
data.

**R3. Cluster size window.** 8-15 articles for a narrow entity cluster, 20-30
for a pillar-scale entity. Below 8, the cluster does not read as coverage;
above ~30 the entity was really two entities and should be split. (Ahrefs'
"15-20 for a specialised niche" is the same window seen from the other side.)

**R4. Deduplicate on Ahrefs `parent_topic`, always.** Two planned articles
sharing a parent topic are one article that has been split by accident. Merge
them before writing, not after they cannibalise each other. This is the cheapest
possible cannibalisation control and neither Semrush nor Ahrefs mentions it.

**R5. Score every candidate before it enters the calendar**, Malay volume,
difficulty, intent, and whether HelloKahwin has any business answering it. Drop
anything weak on two or more. (Ahrefs' step 3/5, kept.)

### Sequencing from near-zero authority

**R6. Depth-first, one cluster at a time.** Finish a cluster to ~80% coverage
before opening the next. Evidence: nikahsatu at DR 14 earns 21x thekenduri at
DR 10, and the only visible difference is concentration.

**R7. Open with the cluster where we already have a ranking signal.** Existing
position 8-15 pages are 90 days ahead of a blank page. Momentum first, ambition
second.

**R8. Build the directory spine in parallel with the article layer.** Venue and
vendor entity pages rank at position 1 for their own names, need almost no
words, and carried 40%+ of the top-25 traffic for both winners. They are the
cheapest authority in this market and we are not competing for them, we are
claiming them.

### Article-level depth

**R9. "Depth" means every sub-type of the entity has its own heading.** Not
word count. Nikahsatu's flagship is ~2,400 words and wins because eight H2s
cover eight categories of hantaran with H3s beneath. A 3,000-word article that
covers five of eight sub-types is thinner than a 1,500-word one that covers all
eight.

**R10. Answer the question in the first 60 words, then earn the rest.** These
are informational Malay queries with AI Overviews in play; the answer has to be
extractable.

**R11. Specificity is the differentiator here.** Real ringgit figures, real
state-by-state rules, real names, current year. Every incumbent article I read
is generic. Specific beats long.

**R12. Minimum bar to publish is coverage, not length.** A page that answers
its question completely at 900 words ships. A page that pads to 2,000 without
covering the sub-types does not.

### Linking

**R13. The pillar links down to every cluster article; every cluster article
links up to the pillar.** Bidirectional, no exceptions.

**R14. Each cluster article also links sideways to 2-4 siblings in the same
cluster, and to nothing outside it.** Cross-cluster links go through the
pillars. This is what keeps the "radius" tight.

**R15. Anchor text is the target Malay entity phrase.** Never "klik di sini",
never "baca lagi", never a bare URL.

**R16. No orphans. Ever.** Nothing publishes without at least one inbound
*editorial* link from its pillar. Navigation and footer links do not count.
nikahsatu's entire internal link graph is nav links, which is exactly the gap
we exploit.

**R17. Every article names its outbound internal links in the brief**, before
drafting. Retrofitting links across 80 articles is a project; specifying them
up front is a line in a template.

### Maintenance

**R18. Year-stamped and price-bearing pages get a scheduled annual refresh**,
booked at publish time, not remembered later.

**R19. Refresh trigger: traffic down materially from the page's own peak.**
(Ahrefs' rule, kept.)

**R20. Re-check `parent_topic` overlap every time a cluster gains 5 articles.**

### Failure modes, with local evidence

| Failure mode | What it looks like here |
|---|---|
| Breadth before depth | thekenduri.com, DR 10, ~530 visits/mo across 20 scattered pages |
| Thin stubs | Our own Real Weddings: five posts of 85-107 words, zero headings |
| Orphan pages | 17 of our 29 posts drew **zero** GSC impressions in 28 days |
| Cannibalisation | Two of our pages both chase dewan/venue intent; see audit §4 |
| Impressions without clicks | Our `/garden-wedding/`, 844 impressions, 4 clicks, position 36.6 |
| Wrong-language surface area | Same page, English title, in a Malay-first business |

### The honest timeline

Ahrefs says 6-12 months for significant movement. That is the right default and
I will not promise better as a rule. But the local evidence says this specific
market is faster: the target keywords sit at **difficulty 0-2**, a **DR 3** site
holds page one for hantaran kahwin, and a **DR 14** site holds **570 top-three
positions**. At that difficulty, first movement in weeks and cluster-level
results in 8-12 weeks is a reasonable expectation, with the caveat, stated
plainly, that it is an expectation drawn from competitor benchmarks and not a
measurement of our own site.

---

## 0d. Written into the persona

The rules above (R1-R20, sequencing, failure modes) are now a permanent
**"Topical authority method"** section in the persona file at
`~/Documents/Code/buddy/skillcentral/agents/projects/hellokahwin/Marketing/head-of-seo-content.md`,
and `skillcentral/install.sh` has been re-run so it is live. The rest of the
persona is untouched.

---

## Sources

Read in full via WebFetch, 23 Aug 2026:
- https://ahrefs.com/blog/topical-authority/
- https://ahrefs.com/blog/seo-topical-map/
- https://www.semrush.com/blog/topical-authority/
- https://www.semrush.com/blog/topic-clusters/
- https://nikahsatu.com/17-idea-hantaran-kahwin-yang-menarik/

Ahrefs MCP, all pulled 23 Aug 2026:
- `serp-overview`, "topical authority", "topical map seo", "content clusters seo" (`us`); "hantaran kahwin", "pelamin", "kos kahwin" (`my`)
- `site-explorer-top-pages`, nikahsatu.com, thekenduri.com, theweddingnotebook.com, hellokahwin.com (`my`, index date 2026-08-01)
- `site-explorer-metrics`, nikahsatu.com, theweddingnotebook.com, hellokahwin.com (`my`, 2026-08-01)
- `site-explorer-pages-by-internal-links`, nikahsatu.com

**Not reached:** none. Every source attempted returned data.
