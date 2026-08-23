# The HelloKahwin Content Framework

**Task:** Phase 1, Task 4 (main deliverable) · **Owner:** head-of-seo-content
**Date:** 23 Aug 2026 · **Session:** aug-23-2026-session-01
**Built on:** the method in `aug-23-2026-research-topical-authority.md` (R1-R20)
**Justified by:** the data in `aug-23-2026-audit-baseline.md`

This is a production system, not a wish list. It exists so that eighty
articles written by several people read like one publication that knows what
it is talking about.

**Status: awaiting CEO approval. No bulk production starts before that.**

---

## 1. The topical map

**Where the authoritative cluster inventory lives.** This section gives the
pillar-level architecture. The full inventory, 30 clusters with their data
arguments, long tails, topics and launch order, is
`aug-23-2026-clusters-launch-plan.md`. **Where the two disagree, the launch
plan wins**, it was built later and against SERP evidence this section
predates. Keeping one source of truth matters more than keeping this document
self-contained.

### 1.1 How it was built

Applying R1 (clusters are entities), R2 (coverage is question-shaped), R3
(8-15 articles per narrow cluster, 20-30 per pillar) and R4 (deduplicate on
Ahrefs `parent_topic`) to the ~260 qualifying Malay keywords from the audit.

Six pillars. Each pillar is an entity a Malay couple deals with. Each cluster
under it is a sub-entity. Each article answers one question that has real
Malay search demand.

Every keyword figure below: **Ahrefs Keywords Explorer, country `my`, pulled
23 Aug 2026.** Volume is monthly; KD is difficulty on the 100-point scale.

### 1.2 The six pillars

| # | Pillar | Pillar page | Articles mapped | Total addressable vol/mo | Why it exists |
|---|---|---|---|---|---|
| P1 | **Nikah & Undang-undang** | `/artikel/nikah-undang-undang` | 14 | ~19,000 | Largest demand pool in the market; almost all KD 0; we have 1 article |
| P2 | **Hantaran & Mas Kahwin** | `/artikel/hantaran-mas-kahwin` | 24 | ~26,000 | Culturally core, entirely Malay, we already have 3 good articles |
| P3 | **Ucapan, Doa & Adab Majlis** | `/artikel/ucapan-doa` | 16 | ~22,000 | The guest audience; nikahsatu's single biggest asset; we have zero |
| P4 | **Baju, Solekan & Inai** | `/artikel/baju-solekan` | 18 | ~17,000 | High volume, KD 0-2, no editorial incumbent |
| P5 | **Pelamin, Dekorasi & Kad Jemputan** | `/artikel/pelamin-dekorasi` | 20 | ~14,000 | `pelamin` has **no article on page one at all** |
| P6 | **Venue, Kos & Perancangan** | `/artikel/venue-perancangan` | 16 | ~6,000 | Where our current clicks come from; retention, not growth |
| n/a | **Direktori venue & vendor** | `/direktori` | (see §1.4) | uncontested | 40%+ of both competitors' traffic; we have none |

**108 articles of mapped inventory at pillar level**, after the C1.1
correction below. The launch plan maps the same landscape at cluster level and
arrives at 253 topics across 30 clusters; that finer count is the one to plan
against. Either way the map outlasts the 90-day sprint, which is the point.

### 1.3 Clusters, article by article

Sizing follows R3. Where a cluster is listed at fewer than 8 articles it is
because the demand genuinely stops there, and it is flagged.

#### P1. Nikah & Undang-undang (14 after the C1.1 correction)

| Cluster | Articles | Anchor keywords (vol / KD) |
|---|---|---|
| ~~C1.1 Borang & pendaftaran nikah~~ | **0 (dropped)** | **Cut after the SERP check. See the note below.** |
| **C1.2 Rukun, syarat & sah nikah** | 9 | rukun nikah 6,900/0 · syarat sah nikah 1,600/0 · akad nikah 1,000/0 · lafaz akad nikah 800/0 · lafaz taklik nikah 600/0 · rukun nikah dalam islam 600/0 · taklik nikah 500/0 · wali nikah 300/0 · saksi nikah berapa orang 150/0 |
| **C1.3 Kursus kahwin** | 6 | kursus kahwin penang 1,400/0 · sppim kursus kahwin 800/0 · daftar kursus kahwin online 350/4 · cara daftar kursus kahwin 200/3 (+ 2 state variants) |
| **C1.4 Dokumen & pemeriksaan** | 5 | hiv test kahwin 1,100/0 · kad nikah 800/0 · kad nikah selangor 700/0 · sijil nikah selangor 400/0 · cara semak status perkahwinan 150/0 |
| **C1.5 Soal-jawab hukum** | 4 | nikah siri itu apa 350/0 · adik beradik tiri boleh kahwin 200/0 · rukun nikah ada berapa 300/0 · siapa boleh jadi saksi nikah perempuan 100/0 |

**Correction, applied 23 Aug 2026.** C1.1 originally allocated 10 articles to
the borang nikah cluster on search volume alone, before I pulled the SERP. The
`borang nikah` SERP (Ahrefs, `my`, 23 Aug 2026) is **seven of seven government
domains**: sppim.gov.my (DR 43, an estimated 133,075 visits),
islam.gov.my (DR 70), eqaryah.kelantan.gov.my (DR 57), jainj.johor.gov.my
(DR 62), emunakahat.penang.gov.my (DR 60), malaysia.gov.my (DR 77) and
jais.gov.my (DR 53). The intent is navigational, people want the portal, and
no article displaces it. The cluster is dropped and the one winnable fragment
(cara isi borang nikah, 200/KD 5) folds into C1.3. This is what the SERP check
in the launch plan is for, and it is why volume alone is never sufficient
evidence.

*Editorial note: this pillar touches religious ruling. Every article states
which state's enactment it describes and links to the official federal or
state Islamic religious authority as its source. We report the procedure; we do not issue fatwa.*

#### P2. Hantaran & Mas Kahwin (24)

| Cluster | Articles | Anchor keywords (vol / KD) |
|---|---|---|
| **C2.1 Hantaran kahwin** | 8 | hantaran kahwin 2,000/0 · hantaran 1,900/0 · barang hantaran lelaki 500/0 · hantaran untuk lelaki 700/0 · barang hantaran perempuan 300/0 · contoh hantaran kahwin 200/0 · hantaran kahwin perempuan 150/0 · idea hantaran lelaki 150/0 |
| **C2.2 Hantaran tunang** | 6 | hantaran tunang 4,700/0 · dulang hantaran tunang 800/0 · hantaran tunang untuk lelaki 450/0 · contoh hantaran tunang 350/0 · hantaran tunang untuk perempuan 250/0 · barang hantaran tunang 150/0 |
| **C2.3 Gubahan & dulang** | 8 | dulang hantaran 3,600/0 · gubahan hantaran 1,200/0 · hantaran coklat 450/0 · dulang hantaran kahwin 400/0 · hidden hantaran 350/0 · kotak hantaran 250/0 · gubahan hantaran simple tapi cantik 200/0 · sirih junjung hantaran 150/0 |
| **C2.4 Mas kahwin ikut negeri** | 8 | mas kahwin ikut negeri 2,000/0 (absorbing selangor 1,900 · mas kahwin 1,900 · kedah 600 · melaka 500 · setiap negeri 500, same parent topic) · mas kahwin johor 1,000/0 (+perak 800) · mas kahwin kelantan 900/0 (+terengganu 500, sarawak 350) · mas kahwin pahang 700/0 · mas kahwin negeri sembilan 700/0 · mas kahwin sabah 350/0 · duit hantaran kahwin 350/0 · frame mas kahwin 350/0 |
| **C2.5 Nisbah & etika hantaran** | 4 | hantaran kahwin 5 balas 7 350/0 · hantaran lelaki 5 perempuan 7 350/0 · hantaran tunang 3 balas 5 350/0 · duit hantaran kahwin 350/0 |

*C2.4 is fourteen state queries summing to roughly 11,000 searches a month,
all KD 0, and we already sit at position 12.9 on the head term. It is the
single best-value cluster on the map.*

*Sized at **8, not 10**, after applying R4. Six of the fourteen state
keywords (ikut negeri, selangor, mas kahwin, kedah, melaka, setiap negeri)
share the parent topic `mas kahwin selangor`, so one all-states article
absorbs the lot. Writing separate Selangor, Kedah and Melaka pages would have
been self-inflicted cannibalisation. This is R4 doing its job before a single
word was written.*

*C2.5 covers the etiquette of dulang ratios, the most distinctly Malay
material on this framework. Nobody on page one answers it properly, and it is
not something a writer outside the culture can fake.*

#### P3. Ucapan, Doa & Adab Majlis (16)

| Cluster | Articles | Anchor keywords (vol / KD) |
|---|---|---|
| **C3.1 Ucapan pengantin baru** | 6 | ucapan pengantin baru 5,400/0 · ucapan selamat pengantin baru 3,000/0 · ucapan untuk pengantin baru 1,700/0 · ucapan pengantin baru islam 1,600/0 · selamat pengantin baru 1,500/0 · ucapan kahwin 600/0 |
| **C3.2 Doa & bacaan** | 4 | doa pengantin baru 3,000/0 · doa untuk pengantin baru 2,000/0 · doa majlis perkahwinan 1,800/0 · doa pengantin 1,000/0 |
| **C3.3 Ulang tahun perkahwinan** | 4 | ucapan ulang tahun perkahwinan 1,900/0 · selamat ulang tahun perkahwinan 1,300/0 · doa ulang tahun perkahwinan 450/0 · ucapan ulang tahun perkahwinan islamik 450/0 |
| **C3.4 Pantun & adab majlis** | 2 | pantun pengantin baru 700/0 · ucapan tahniah perkahwinan 600/0 |

*Two clusters here are under the 8-article floor. That is deliberate and R3
allows it: the demand genuinely stops. Padding C3.4 to eight would be
manufacturing pages, which is the failure mode we are trying to avoid.*

*Strategic note: this pillar serves **guests, not couples**. It converts to
zero business value directly. It is here because it is 22,000 monthly searches
at KD 0 that establish us as the Malay wedding site, and because it is
nikahsatu's largest asset. Authority earned here carries across the map.*

#### P4. Baju, Solekan & Inai (18)

| Cluster | Articles | Anchor keywords (vol / KD) |
|---|---|---|
| **C4.1 Baju nikah & sanding** | 7 | baju nikah 2,000/1 · baju pengantin 1,700/0 · baju nikah perempuan 800/1 · baju kahwin 700/0 · baju pengantin perempuan 500/0 · baju nikah lelaki 450/0 · butik pengantin near me 1,800/0 |
| **C4.2 Songket & busana tradisional** | 5 | kain songket 1,400/2 · baju songket 1,100/0 · baju pengantin songket 900/0 · baju kurung songket 600/0 · kebaya songket 600/0 |
| **C4.3 Inai** | 4 | inai simple 3,800/0 · corak inai simple 1,400/0 · inai tangan 900/0 · corak inai 500/0 |
| **C4.4 Solekan & aksesori** | 2 | gandik pengantin 500/0 · bunga tangan pengantin 800/0 |

#### P5. Pelamin, Dekorasi & Kad Jemputan (20)

| Cluster | Articles | Anchor keywords (vol / KD) |
|---|---|---|
| **C5.1 Pelamin** | 8 | pelamin 1,500/0 · pelamin simple 900/0 · bunting pelamin 800/0 · pelamin kahwin 500/0 · pelamin tunang 350/0 · maksud bunting pelamin 350/0 · mini pelamin 300/0 · kerusi pelamin 150/0 |
| **C5.2 Kad kahwin & jemputan** | 8 | kad kahwin 4,700/5 · contoh kad kahwin 2,400/8 · contoh kad jemputan kahwin 1,500/3 · template kad kahwin 500/0 · cara buat kad kahwin digital 150/3 (+ 3 supporting) |
| **C5.3 Dekorasi & tema** | 4 | pelamin dewan 150/0 · khemah kenduri 350/0 (+ 2 supporting) |

*`pelamin` at 1,500/mo and KD 0 has **no article anywhere on page one**. The
SERP is Pinterest boards, an Instagram profile, Shutterstock and two DR-0
rental sites (Ahrefs SERP Overview, `my`, 23 Aug 2026). It is the least
defended keyword found in the entire audit.*

#### P6. Venue, Kos & Perancangan (16)

| Cluster | Articles | Anchor keywords (vol / KD) |
|---|---|---|
| **C6.1 Dewan & venue** | 6 | dewan majlis perkahwinan 600/0 · dewan kahwin near me 300/0 · sewa dewan kahwin 150/0 · dewan kahwin shah alam 150/0 · dewan kahwin klang 150/0 (+ 1) |
| **C6.2 Kos & bajet** | 4 | goodies kahwin bajet 150/0 · pakej perkahwinan 100/0 (+ 2 derived from Tier-3 questions) |
| **C6.3 Perancangan & checklist** | 3 | checklist kahwin 800/0 (+ 2) |
| **C6.4 Hadiah, doorgift & kenduri** | 3 | hadiah kahwin 1,600/0 · goodies kahwin 1,500/0 · doorgift kahwin 1,400/0 |

*Sized deliberately small. The audit found Malay search volume for the
venue/package cluster is thin next to hantaran, nikah procedure and ucapan.
It earns our current clicks and must be defended, but it is not where the
growth is.*

### 1.4 The directory spine (recommended as a parallel workstream)

Not one of the 80 articles, and not a writer's job.

Both market leaders earn 40%+ of their traffic from one-page-per-venue entity
pages that rank #1 for the venue's own name: nikahsatu's `/venue/<slug>/`
(11 of its top 25 pages), TWN's `/catalog/venues/<slug>` (14 of its top 25 in
Malaysia, Lantera 458 visits/mo, Tanarimba Janda Baik 343, Templers Ballroom
301). We have none.

**Recommendation to the CEO:** scope a `/direktori/venue/<slug>` template as a
Phase 3 engineering task and seed it with 40-60 Malaysian wedding venues.
Each page needs a name, location, capacity, indicative price band, photos and
two paragraphs, not an article. Five of them come free: the five 85-107-word
Real Wedding stubs (Grand Hyatt KL, Sime Darby Convention Centre, The Danna
Langkawi, Villa Warisan, Marriott Putrajaya) convert directly into directory
entries, because the venue was always the asset in those posts, not the
wedding.

This is the highest traffic-per-hour item on the whole framework and it needs
zero editorial capacity. **It should not wait for the article programme.**

---

## 2. Article templates

Four types, as briefed, plus a fifth I am recommending. Each template is a
contract: a brief that does not fill in every field is not a brief, and a
draft that does not satisfy the template does not go to /humanizer.

### Type 1. PANDUAN (guide)

*For: a procedure or entity a couple must understand. C1.1, C1.2, C2.4, C5.2.*

- **Length:** 1,200-2,000 words. Coverage decides, not the counter (R12).
- **H1 pattern:** exact Malay head term, then the state or year if the answer
  varies by either, then the two or three things the page settles. No sample
  headline is given here: naming one invites it to be written.
- **Opening:** answer the question in the first 60 words, before any preamble
  (R10). A couple who reads only the first paragraph should have the answer.
- **Structure:** one H2 per stage or sub-type of the entity (R9). H3 for
  variants beneath. A procedure guide carries a numbered-step H2 block.
- **Mandatory elements:** at least one table (states, prices, documents, or
  a comparison); real ringgit figures or real official references; the
  current year where relevant; a "Soalan Lazim" H2 with 3-5 questions drawn
  from the Tier-3 question list in the audit.
- **Close:** what to do next, linking to the next article in the cluster.
- **Good looks like:** a couple prints it and takes it to the pejabat agama.

### Type 2. SENARAI (listicle / roundup)

*For: ideas, options, examples. C2.1, C2.3, C3.1, C4.3, C5.1.*

- **Length:** 1,200-2,400 words.
- **H1 pattern:** honest item count, exact Malay term, then the qualifier that
  distinguishes this list from every other one (budget, year, sub-audience).
- **Structure:** the incumbent pattern, done better, **H2 per category, H3
  per item within it** (R9). Not a flat list of 17 H2s. Categorising is what
  turns a list into coverage.
- **Mandatory elements:** an intro that defines the entity in 2-3 sentences
  (this is what makes a listicle rank for definitional queries too); a price
  or budget indication per item or per category; one image per H2 minimum;
  a "Soalan Lazim" block.
- **Explicitly not allowed:** items padded to hit the number in the title. If
  the honest list is 14, the title says 14.
- **Good looks like:** every sub-type of the thing has a heading, and a reader
  choosing between two options can tell them apart.

### Type 3. SOAL-JAWAB (question / definition)

*For: single questions and definitions. C1.5, C2.5, and the Tier-3 tail.*

- **Length:** 600-1,100 words. These are short by design; padding them is the
  failure mode.
- **H1 pattern:** the question exactly as Malay searchers type it, then the
  second half of what they actually want to know.
- **Opening:** the direct answer in 40-60 words, in bold or its own paragraph.
  This is the block that wins the featured snippet and the AI Overview.
- **Structure:** answer → why it is so (adat / hukum / practice) → the common
  variations → what to do if your family does it differently.
- **Mandatory elements:** cite the source of any religious or legal claim,
  including which state; state plainly when practice varies by family and
  region, because it does.
- **Good looks like:** the answer is extractable without opening the page,
  and the page is still worth opening.

### Type 4. REAL WEDDING (feature)

*For: brand, not traffic. Be honest about this.*

The audit is unambiguous: TWN's best-performing Real Wedding earns 132
visits/mo and earns them for the **venue's name**, not the wedding. Our own
Real Weddings drew 1-4 impressions each in 28 days. The format does not rank
on its own merits.

So the template is built to harvest the one thing that does rank, the venue,
while still serving the brand:

- **Length:** 700-1,200 words. Never under 400 (five of ours are).
- **H1 pattern:** ceremony or theme, then **the venue's full name as people
  search it**, then its town. The venue name is the part that ranks.
- **Structure:** one H2 per phase (*Persiapan*, *Akad Nikah*, *Sanding*,
  *Dekorasi & Pelamin*, *Butiran Majlis*). Never zero headings, which is what
  fourteen of ours currently have.
- **Mandatory elements:** a *Butiran Majlis* vendor credit block (venue,
  pelamin, solekan, jurugambar, katering, kad); a link to the venue's
  directory page; 8-15 images with descriptive Malay alt text.
- **Internal links:** to the venue directory entry and to 2-3 cluster
  articles the wedding illustrates (its pelamin style, its hantaran, its
  baju).
- **Good looks like:** a reader who came for the pictures leaves through a
  link to an article that helps them plan.

### Type 5. DIREKTORI (venue / vendor entity), a recommended addition

*Not in the brief. Recommending it because it is where the competitors'
traffic actually is.*

- **Length:** 250-500 words. This is a data page, not an essay.
- **H1:** the venue's exact name as people search it, plus location.
- **Structure:** intro paragraph → *Kapasiti & Ruang* → *Anggaran Kos* →
  *Kemudahan* → *Lokasi & Hubungi* → *Majlis di Sini* (links to any Real
  Wedding featuring it).
- **Mandatory:** capacity numbers, an indicative price band, address, photos.
- **Good looks like:** it ranks #1 for the venue's name within weeks, because
  nobody else has written a proper page about it.

---

## 3. The quality bar

A HelloKahwin article is publishable when **every** line is true. This is a
checklist a QC reviewer works through, not a sentiment.

**Coverage**
1. Every sub-type of the entity has its own heading (R9).
2. Every question in the brief's question list is answered somewhere on the page.
3. No competitor page on page one answers something this page does not.

**Substance**
4. It contains at least one specific, checkable fact a competitor does not have, a ringgit figure, a state-level rule, a named source, a real capacity number.
5. Any religious or legal claim names its source and its state.
6. Any price or year-bound claim is dated.
7. Nothing is asserted that the writer cannot source. Where practice varies, it says so instead of picking one.

**Search**
8. The exact Malay target keyword is in the H1, the URL slug and the first 100 words, naturally, not stuffed.
9. The meta description is ≤155 characters, in Malay, and describes the page rather than advertising it.
10. No other page on the site targets the same Ahrefs `parent_topic` (R4).
11. The page answers its head question in the first 60 words (R10).

**Structure**
12. H2/H3 nesting is logical; no H1 other than the title; no heading is decorative.
13. A "Soalan Lazim" block on every Panduan and Senarai.
14. Images have descriptive Malay alt text. No stock photo of a non-Malay wedding on a page about adat.

**Links**
15. Links up to its pillar, with the pillar's entity phrase as anchor (R13).
16. Links sideways to 2-4 siblings in the same cluster, and to nothing outside it (R14).
17. Has at least one inbound editorial link from its pillar before it publishes. **No orphans** (R16).
18. No anchor text reading "klik di sini", "baca lagi", "di sini", or a bare URL (R15).

**Language**
19. Natural Bahasa Melayu (Malaysia). Correct adat terminology, merisik, bertunang, akad nikah, bersanding, berinai, kenduri, hantaran, mas kahwin, used the way a Malaysian Malay writer uses them.
20. Written for a couple planning their own wedding, warmly and practically. Not translated English. Not a brochure.
21. **It has passed /humanizer.** Non-negotiable, owner-level. No article, meta description, or caption is done until it has.

**Failing any of 1-21 sends the draft back. Failing 21 means it was never
finished.**

---

## 4. Internal-linking rules

The competitors' entire internal link graph is sitewide navigation, Ahrefs
returns an identical 168 internal links to nearly every significant nikahsatu
page (23 Aug 2026). Neither leader has a real cluster architecture. This is
the cheapest structural advantage available to us, and it costs nothing but
discipline.

**The shape**

```
                    /artikel  (site hub)
                        │
        ┌───────────────┼───────────────┐
     PILLAR P1       PILLAR P2       PILLAR P3 ...
        │  ▲             │  ▲
        │  │             │  │        pillar ⇄ every article (both ways)
        ▼  │             ▼  │
   ┌────┴──┴────┐   ┌────┴──┴────┐
   art  art  art     art  art  art    ←→ siblings link across, 2-4 each
   └─ same cluster ─┘   └─ same cluster ─┘

   cross-pillar traffic routes THROUGH the pillars, never article-to-article
```

**The rules**

- **L1.** Every article links up to its pillar page, once, using the pillar's entity phrase as anchor.
- **L2.** Every pillar page links down to every article in every one of its clusters. The pillar is the coverage map made visible.
- **L3.** Every article links sideways to 2-4 siblings **in its own cluster**. Not more, over-linking within a cluster dilutes what each link says.
- **L4.** Articles do **not** link directly to articles in other pillars. Cross-pillar journeys go article → pillar → pillar → article. This is what keeps the topical radius tight (R14).
- **L5.** Anchor text is the target Malay entity phrase of the destination. Never generic (R15).
- **L6.** Internal links are named in the brief, before drafting (R17). A draft that invents its own links did not follow the brief.
- **L7.** No article publishes without at least one inbound editorial link already live. Navigation and footer links do not count (R16).
- **L8.** Real Wedding features link to the venue's directory page and to 2-3 cluster articles they illustrate. Directory pages link back to any Real Wedding held there.
- **L9.** When a cluster reaches 5 articles, re-check `parent_topic` overlap across the whole cluster and merge anything that collided (R20).

**Pillar pages need building.** Today they are bare category archives, and
four of them (`hiasan-dekorasi`, `moden-kontemporari`, `fotografi-videografi`,
`glamor-eksklusif`) are not even in the sitemap. A pillar page under this
framework is a real page: 800-1,500 words introducing the entity, an H2 per
cluster, and every article in that cluster linked beneath its H2 with the
article's target phrase as anchor text. **This is a small engineering task and
it gates the whole architecture**, see §7.

---

## 5. Proposed publishing cadence

*Recommendation with reasoning. The CEO decides.*

### 5.1 What the goal requires

80 articles in 90 days is **6.7 per week sustained for 13 weeks**, with no
slack for a bad week, a public holiday, or a rewrite.

I could not measure competitors' publishing rates, Ahrefs does not expose
publication dates in the endpoints I used, and I will not guess at a number
that would look like evidence. What I *can* say from the data is that
nikahsatu reached 1,007 ranking keywords and 570 top-three positions on a
DR-14 domain, and thekenduri.com, at comparable domain strength, reached
roughly 5% of that traffic by publishing across many topics instead of
finishing any. **The variable that separated them was concentration, not
speed.**

### 5.2 What I recommend

**Cadence: 6 published articles per week, plus 1 upgrade of an existing
post.** Thirteen weeks gives **78 new articles and 13 upgrades, 91 pieces of
work, against a goal of 80.**

Why 6 and not 7:

- Seven per week with no buffer means the first bad week is unrecoverable, and the recovery always comes out of quality.
- The 7 Group A upgrades in the audit are worth more per hour than 7 new articles, one of them (`mas-kahwin-ikut-negeri`) is already at position 12.9 on a 2,000/mo KD-0 keyword. Upgrades are the cheapest ranking movement available and they need a slot in the cadence, not goodwill.
- 6 + 1 still clears 80.

**Capacity: the two writers in the plan are necessary, not optional.** At 6-7
pieces a week, one writer plus an SEO head doing QC makes the SEO head the
bottleneck within a fortnight, and QC is the only thing standing between bulk
production and filler. Two writers on separate clusters, me on briefs and QC.

**Sequence: depth-first, one pillar at a time** (R6), opening where a ranking
signal already exists (R7).

| Weeks | Focus | Output |
|---|---|---|
| **1-4** | **P2 Hantaran & Mas Kahwin**, 24 of 24 articles + all 7 Group A upgrades | Pillar P2 reaches full mapped coverage. Contains the cluster we already rank for. |
| **5-8** | **P1 Nikah & Undang-undang**, 14 articles | Large demand pool, reduced after the borang nikah cluster was cut on SERP evidence. Opens once P2 is genuinely finished. |
| **9-11** | **P3 Ucapan, Doa & Adab**, 16 articles | Highest volume per article; establishes us with the guest audience. |
| **12-13** | **P5 Pelamin & Kad**, 14 of 20 articles | `pelamin` and `kad kahwin` are undefended; finish in the following sprint. |
| Parallel, engineering | Pillar pages + directory spine | Gates the architecture; needs no editorial capacity |

P4 (Baju, Solekan & Inai) and P6 (Venue, Kos & Perancangan) come in the next
sprint. **Six pillars opened at once would be exactly the mistake
thekenduri.com made.**

### 5.3 What would make me change this recommendation

- If the two writers are not approved, the honest cadence is 3-4 per week and the 90-day target should be restated to ~45 articles rather than quietly missed. I would rather bring the CEO a smaller number than a slipped one.
- If the directory spine ships early, I would trade 5 article slots for 30 directory entries. On the competitor evidence, that is a better trade.

---

## 6. Measurement

Per R18-R20 and Phase 4 of the plan.

- **Weekly:** articles published (the leading indicator, if this slips, everything slips 30 days later); GSC clicks, impressions and average position by cluster, not just site-wide.
- **Per article, at 14 and 45 days:** does it rank for its target keyword; how many keywords has it picked up; is it in the top 10.
- **Per cluster, monthly:** coverage percentage against the mapped article list; combined clicks; `parent_topic` collision check.
- **Every board meeting:** what moved, what did not, and what the data changed in this framework. The framework is versioned and expected to change.

**One caveat the board must hold on to:** the site changed every URL on
21 Aug 2026. Search Console numbers over the next few weeks are measuring a
migration as much as a content programme. The 30-day checkpoint is
directional; the 60- and 90-day checkpoints are the scoreboard.

---

## 7. What I need decided before bulk production

1. **Approve this framework** (or redirect it). Nothing bulk starts until it is approved.
2. **Approve the two writer hires.** The cadence maths does not work otherwise, and I would rather restate the target than ship filler.
3. **Commission the pillar pages**, six real pillar pages at `/artikel/<pillar>`, plus adding the four missing category hubs to the sitemap. Small engineering task; the entire linking architecture depends on it.
4. **Decide on the directory spine.** My recommendation is yes, now, in parallel, it is the highest traffic-per-hour item on this framework and it needs no writers.
5. **Fix the two-hop redirect chain** (`/slug/` → `/slug` → `/artikel/…`). Small, and every historic inbound link goes through it.
6. **Note for the record:** the TWN translation lever is weaker than the plan assumed. Malay demand sits in adat, agama and procedure, which TWN does not cover. I will use translation for venue roundups, the checklist and the directory seed; the rest is original Malay. That is a change in supply mix, not in output.
