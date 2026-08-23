# Audit: baseline, Malay keyword landscape and competitor gap

**Tasks:** Phase 1, Tasks 1-3 · **Owner:** head-of-seo-content
**Date:** 23 Aug 2026 · **Session:** aug-23-2026-session-01
**Method applied:** `aug-23-2026-research-topical-authority.md` (Task 0)

Sources and dates are attached to every number. Two sources behaved
unexpectedly and are flagged in §1.0. Read that before quoting anything.

---

## Headline

Three findings, in the order they change decisions.

1. **The site migrated to new URLs on 21 Aug 2026, two days before this
   audit, and every page that earns traffic has moved.** The GSC baseline in
   the plan measures the old WordPress URL structure. It is not a stable
   floor and will move on its own, in both directions, for reasons unrelated
   to anything we publish.
2. **English does not actually dominate. It dominates one vanity metric.**
   Over 12 months, English queries produced 28.5% of named impressions and
   **1 of 34 clicks**. Malay queries produced 37.3% of impressions and **26 of
   34 clicks**. The English impressions come from a single legacy page sitting
   on page four.
3. **Our best-performing page is a venue/hall listicle, and so is every
   competitor's.** `/dewan-kahwin/` earned 25 of our 32 clicks. nikahsatu and
   TheWeddingNotebook both make most of their money the same way. The content
   type we have been treating as our flagship, Real Weddings, earns
   effectively nothing.

---

## 1. Baseline audit (Google Search Console)

### 1.0 Two things to know about the data first

**The `gsc` MCP server did not load in this session.** Its tools were not
exposed to the agent. I pulled the same data by calling the Search Console
API directly with the same service account
(`~/.claude/secrets/gsc-service-account.json`), which confirmed
`https://hellokahwin.com/` at `siteFullUser`. Numbers below are from that
API, pulled 23 Aug 2026. Worth fixing before the next session so the tooling
matches the documented setup.

**Roughly half the data is anonymised and cannot be broken down.** The
28-day totals are 32 clicks and 2,163 impressions, but the query dimension
returns only 106 queries totalling **1,175 impressions and 0 clicks**. Google
withholds low-volume queries. So **988 impressions (45.7%) and all 32 clicks
sit in queries GSC will not name.** Every query-level percentage below is a
share of the *named* half. I have not extrapolated it to the whole, and
neither should the board.

### 1.1 The numbers

**GSC, 28 days 2026-07-25 → 2026-08-21, pulled 23 Aug 2026:**

| Metric | Value |
|---|---|
| Clicks | 32 |
| Impressions | 2,163 |
| CTR | 1.48% |
| Average position | 20.6 |

Matches the plan's baseline exactly.

**By page, 28 days.** Only **14 URLs earned a single impression.** Three of
them carry 97%:

| Page | Clicks | Impressions | Avg pos |
|---|---|---|---|
| /dewan-kahwin/ | **25** | 958 | 9.4 |
| /garden-wedding/ | 4 | 844 | 36.6 |
| /mas-kahwin-ikut-negeri/ | 1 | 307 | 12.9 |
| /majlis-kahwin/ | 1 | 13 | 6.5 |
| /perkahwinan-taman-kebun-yang-minimalis-di-hulu-langat/ | 1 | 11 | 13.7 |
| / (home) | 0 | 9 | 19.4 |
| /category/real-wedding/warisan-tradisi/ | 0 | 7 | 12.3 |
| 7 more URLs | 0 | 1-4 each | n/a |

**One page produced 78% of all clicks.** Fifteen of our 29 posts produced no
impressions at all in 28 days; seventeen produced none in 12 months.

**Position distribution, 28 days, share of impressions:**

| Bucket | Impressions | Share |
|---|---|---|
| 1-3 | 4 | 0.3% |
| 4-10 | 318 | 27.1% |
| 11-20 | 69 | 5.9% |
| 21-50 | **772** | **65.7%** |
| 51+ | 12 | 1.0% |

Two-thirds of our visibility is on page 3 or worse, where clicks do not
happen. That is the 1.48% CTR explained.

### 1.2 The open question, answered

> *Why do English queries dominate impressions when the posts are titled in
> Malay?*

They don't, in any sense that matters. Here is the split.

**Named queries, 28 days (2026-07-25 → 2026-08-21):**

| Language | Queries | Clicks | Impressions | Impression share |
|---|---|---|---|---|
| Malay | 52 | 0 | 213 | 18.1% |
| English | 43 | 0 | 732 | 62.3% |
| Ambiguous* | 11 | 0 | 230 | 19.6% |

**Named queries, 12 months (2025-08-23 → 2026-08-21):**

| Language | Queries | Clicks | Impressions | Impression share |
|---|---|---|---|---|
| Malay | 117 | **26** | 2,081 | 37.3% |
| English | 68 | **1** | 1,591 | 28.5% |
| Ambiguous* | 22 | 7 | 1,901 | 34.1% |

*\*Classified by Malay/English token count. "Ambiguous" is dominated by
"pusat komuniti setiawangsa", a proper noun, effectively a Malay
navigational query.*

**English earns 28.5% of impressions and 2.9% of clicks. Malay earns 37.3% of
impressions and 76.5% of clicks.** English impressions are not competition
we are losing; they are noise we are accruing.

**Where the English noise comes from, one page.** `/garden-wedding/` alone
generated 844 impressions in 28 days (39% of the site total) at average
position **36.6**, converting 4 clicks. The queries feeding it:

| Query | Impressions (28d) | Avg pos | Clicks |
|---|---|---|---|
| garden wedding | 144 | 28.6 | 0 |
| garden wedding kl | 118 | 48.5 | 0 |
| garden wedding malaysia | 114 | 40.8 | 0 |
| garden wedding kuala lumpur | 107 | 45.8 | 0 |
| outdoor wedding | 33 | 30.0 | 0 |
| + ~15 more English venue variants | ~230 | 29-50 | 0 |

One English-titled legacy page, ranked on pages 3-5 of an English SERP it
cannot win, manufacturing impressions at a 0% click rate. Strip that page out
and the "English problem" disappears.

**Meanwhile the Malay queries that convert are already close to the top:**

| Query (12m) | Clicks | Impressions | Avg pos |
|---|---|---|---|
| dewan komuniti setiawangsa | 8 | 886 | 8.6 |
| dewan kahwin kl | 3 | 152 | 18.3 |
| dewan kahwin selangor | 3 | 46 | 12.1 |
| dewan kahwin murah kl | 3 | 40 | 9.2 |
| sewa dewan murah kl | 3 | 37 | 11.4 |
| dewan kahwin murah | 1 | 69 | 8.3 |
| sewa dewan kahwin | 1 | 35 | 16.8 |

Verdict: **this is a coverage problem with one loud English outlier, not a
language problem and not an indexing problem.** The audience found us in
Malay; there was almost nothing in Malay for them to find.

### 1.3 Indexing and technical coverage

I checked the live site directly (HTTP, 23 Aug 2026) rather than inferring.

**The site republished on 21 Aug 2026 with an entirely new URL structure.**
`https://hellokahwin.com/sitemap.xml` holds **34 URLs, every one stamped
`lastmod 2026-08-21T00:00:00.000Z`.** Articles now live at
`/artikel/<kategori>/<slug>`, for example
`/artikel/idea-dan-nasihat/dewan-kahwin`.

**The redirects are correct.** Every legacy flat URL 308-redirects to its new
home:

| Legacy URL | → | Destination |
|---|---|---|
| /dewan-kahwin | 308 | /artikel/idea-dan-nasihat/dewan-kahwin |
| /hantaran-kahwin | 308 | /artikel/hiasan-dekorasi/hantaran-kahwin |
| /garden-wedding | 308 | /artikel/idea-dan-nasihat/garden-wedding |
| /mas-kahwin-ikut-negeri | 308 | /artikel/idea-dan-nasihat/mas-kahwin-ikut-negeri |
| /majlis-kahwin, /sewa-dewan-kahwin, /pelamin-kahwin-dewan | 308 | (same pattern) |

Canonicals are self-referencing and correct. `robots` is
`index, follow, max-image-preview:large`. `robots.txt` allows everything
except admin paths and points at the sitemap. Content is intact, I fetched
`/artikel/hiasan-dekorasi/hantaran-kahwin` and it serves the full ~2,500-word
article. **No duplicate content, no indexing block. The migration was done
properly.**

Three defects worth fixing, none fatal:

1. **Two-hop redirect chain.** `/dewan-kahwin/` → 308 → `/dewan-kahwin` →
   308 → `/artikel/idea-dan-nasihat/dewan-kahwin`. Every inbound link and
   every historic Google URL carries the trailing slash. Collapse to one hop.
2. **Category hub pages are missing from the sitemap.** Only
   `idea-dan-nasihat`, `real-wedding` and `uncategorized` are listed, yet
   `/artikel/hiasan-dekorasi`, `/artikel/moden-kontemporari`,
   `/artikel/fotografi-videografi` and `/artikel/glamor-eksklusif` all return
   200. These hub pages are the natural pillar pages for the cluster
   architecture. They should be declared, and eventually rewritten as real
   pillars rather than bare archive listings.
3. **One article sits in `uncategorized`.**

**What this means for measurement.** Every ranking URL moved two days ago.
Google has not reprocessed the redirects yet. Expect a temporary dip in
clicks and position over the next few weeks that has nothing to do with our
content programme, followed by recovery. **The 30-day checkpoint in the plan
(150 clicks by ~22 Sep) is being measured straight through a site migration.**
I would treat the 60- and 90-day checkpoints as the real scoreboard and read
the 30-day one as directional only.

---

## 2. Malay keyword landscape (Ahrefs, country `my`)

All research done on Malay seed terms. No English keyword was researched and
translated. Every figure: **Ahrefs Keywords Explorer, matching terms, country
`my`, pulled 23 Aug 2026.** Filters: volume ≥ 100-150, difficulty ≤ 12.

### 2.1 The shape of the market

Across roughly 260 qualifying Malay keywords pulled from six seed batches, the
picture is consistent and remarkable: **almost everything is difficulty 0.**
Of the ~200 keywords with 150+ monthly searches, the overwhelming majority
score **KD 0**, and the highest score anywhere in the wedding core is **KD 12**
("perkahwinan", 1,700/mo). This is not a competitive market. It is an
undeveloped one.

### 2.2 Opportunity list, scored

Scoring: volume × (inverse difficulty) × intent fit for a wedding-advice
publisher. I have dropped keywords with wedding-shaped strings but no wedding
intent, `andaman island` (3,800, a holiday destination), `bohey dulang`
(2,300, an island), `songket berbenang emas` (1,600, a novel), `akad chords`
(700, a song), `layang layang perkahwinan` (1,400, a TV drama), celebrity
"X kahwin" queries, and `wattpad kahwin 🔞`. Volume without intent is a trap,
and this vocabulary is full of it.

**Tier 1, highest priority (real volume, KD 0-1, squarely our topic):**

| Keyword | Vol/mo | KD | Parent topic | Cluster |
|---|---|---|---|---|
| rukun nikah | 6,900 | 0 | rukun nikah | Nikah & Undang-undang |
| ucapan pengantin baru | 5,400 | 0 | ucapan pengantin baru | Ucapan & Doa |
| hantaran tunang | 4,700 | 0 | hantaran tunang | Hantaran |
| kad kahwin | 4,700 | 5 | kad kahwin | Kad & Jemputan |
| dulang hantaran | 3,600 | 0 | kotak hantaran | Hantaran |
| inai simple | 3,800 | 0 | easy inai simple | Solekan & Inai |
| ucapan selamat pengantin baru | 3,000 | 0 | ucapan pengantin baru | Ucapan & Doa |
| doa pengantin baru | 3,000 | 0 | doa pengantin baru | Ucapan & Doa |
| borang nikah | 2,700 | 0 | sppim | Nikah & Undang-undang |
| borang nikah online | 2,500 | 5 | borang nikah online | Nikah & Undang-undang |
| contoh kad kahwin | 2,400 | 8 | contoh kad kahwin | Kad & Jemputan |
| baju nikah | 2,000 | 1 | baju nikah perempuan | Baju & Butik |
| **mas kahwin ikut negeri** | **2,000** | **0** | mas kahwin selangor | Mas Kahwin |
| hantaran kahwin | 2,000 | 0 | barang hantaran lelaki | Hantaran |
| hantaran | 1,900 | 0 | hantaran kahwin | Hantaran |
| mas kahwin selangor | 1,900 | 0 | mas kahwin selangor | Mas Kahwin |
| mas kahwin | 1,900 | 0 | mas kahwin selangor | Mas Kahwin |
| ucapan ulang tahun perkahwinan | 1,900 | 0 | (own) | Ucapan & Doa |
| doa majlis perkahwinan | 1,800 | 0 | (own) | Ucapan & Doa |
| butik pengantin near me | 1,800 | 0 | (own) | Baju & Butik |
| baju pengantin | 1,700 | 0 | sewa baju nikah | Baju & Butik |
| syarat sah nikah | 1,600 | 0 | syarat sah nikah | Nikah & Undang-undang |
| hadiah kahwin | 1,600 | 0 | hadiah kahwin | Hadiah & Doorgift |
| goodies kahwin | 1,500 | 0 | doorgift kahwin | Hadiah & Doorgift |
| contoh kad jemputan kahwin | 1,500 | 3 | contoh kad kahwin | Kad & Jemputan |
| pelamin | 1,500 | 0 | wedding pelamin | Pelamin & Dekorasi |
| kursus kahwin penang | 1,400 | 0 | (own) | Nikah & Undang-undang |
| doorgift kahwin | 1,400 | 0 | goodies kahwin | Hadiah & Doorgift |
| corak inai simple | 1,400 | 0 | inai simple cantik | Solekan & Inai |
| borang nikah selangor | 1,400 | 0 | sppim | Nikah & Undang-undang |
| kain songket | 1,400 | 2 | songket | Baju & Butik |
| gubahan hantaran | 1,200 | 0 | dulang hantaran | Hantaran |
| hiv test kahwin | 1,100 | 0 | (own) | Nikah & Undang-undang |
| akad nikah | 1,000 | 0 | akad nikah | Nikah & Undang-undang |
| baju songket | 1,100 | 0 | baju songket perempuan | Baju & Butik |

**Tier 2, strong support (400-1,000/mo, KD 0-5):**

mas kahwin johor (1,000) · cincin kahwin (900) · mas kahwin kelantan (900) ·
pelamin simple (900) · adat perpatih (900) · cincin merisik (800) · kad nikah
(800) · lafaz akad nikah (800) · checklist kahwin (800) · dulang hantaran
tunang (800) · bunting pelamin (800) · baju nikah perempuan (800) · ayam
masak merah kenduri (800) · bunga tangan pengantin (800) · inai tangan (900)
· ucapan perkahwinan (800) · mas kahwin perak (800) · sppim kursus kahwin
(800) · mas kahwin pahang (700) · mas kahwin negeri sembilan (700) · baju
kahwin (700) · hantaran untuk lelaki (700) · pantun pengantin baru (700) ·
kenduri (700) · lafaz taklik nikah (600) · rukun nikah dalam islam (600) ·
dewan majlis perkahwinan (600) · ucapan kahwin (600) · mas kahwin kedah
(600) · ucapan tahniah perkahwinan (600) · kebaya songket (600) · baju kurung
songket (600) · merisik (500) · barang hantaran lelaki (500) · pelamin kahwin
(500) · cincin nikah (500) · taklik nikah (500) · mas kahwin melaka (500) ·
template kad kahwin (500) · mas kahwin setiap negeri (500) · gandik pengantin
(500) · baju pengantin perempuan (500) · corak inai (500) · pokok inai (500) ·
mas kahwin terengganu (500) · kek kahwin (450) · rukun kahwin (450) · baju
nikah lelaki (450) · hantaran tunang untuk lelaki (450) · hantaran coklat
(450) · kenduri kahwin (400) · syarat nikah (400) · dulang hantaran kahwin
(400) · sijil nikah selangor (400)

**Tier 3, soal-jawab / question long tail (KD 0-5), the FAQ layer:**

nikah siri itu apa (350) · rukun nikah ada berapa (300) · cincin kahwin jari
mana (300) · cara daftar kursus kahwin (200, KD 3) · cara isi borang nikah
(200, KD 5) · adik beradik tiri boleh kahwin (200) · saksi nikah siapa (150)
· saksi nikah berapa orang (150) · cincin nikah jari mana (150) · cincin
nikah di jari mana menurut islam (150) · cara semak status perkahwinan (150)
· maksud nikah siri (150) · cara buat kad kahwin digital (150, KD 3) · maksud
mas kahwin (100) · siapa boleh jadi saksi nikah perempuan (100) · maksud
merisik (400) · maksud bunting pelamin (350)

**Also present, lower priority but genuinely ours:** hantaran ratio queries
(`hantaran kahwin 5 balas 7` 350, `hantaran lelaki 5 perempuan 7` 350,
`hantaran tunang 3 balas 5` 350, `hantaran kahwin 3 balas 5` 150), a
distinctly Malay etiquette question with no good answer anywhere on page one.

### 2.3 What the keyword data says that the plan did not anticipate

**Three clusters nobody at HelloKahwin has thought about are bigger than the
ones we planned around.**

- **Nikah & Undang-undang** (rukun nikah 6,900 · borang nikah 2,700 · borang
  nikah online 2,500 · syarat sah nikah 1,600 · borang nikah selangor 1,400 ·
  hiv test kahwin 1,100 · akad nikah 1,000 · lafaz akad nikah 800 · kursus
  kahwin penang 1,400 …). The procedural and religious side of getting married
  The forms, the conditions, the courses and the legal steps together make
  the single largest demand pool in the market, almost entirely at KD 0. We have
  exactly one article touching it (`kursus-kahwin`).
- **Ucapan & Doa** (ucapan pengantin baru 5,400 · ucapan selamat pengantin
  baru 3,000 · doa pengantin baru 3,000 · doa untuk pengantin baru 2,000 ·
  ucapan ulang tahun perkahwinan 1,900 · doa majlis perkahwinan 1,800 …).
  This is the *guest* audience, not the couple, and it is nikahsatu's single
  largest asset (2,916 visits/mo from one article). We have zero coverage.
- **Mas Kahwin, state by state** (mas kahwin ikut negeri 2,000 · mas kahwin
  selangor 1,900 · mas kahwin 1,900 · johor 1,000 · kelantan 900 · perak 800
  · pahang 700 · negeri sembilan 700 · kedah 600 · melaka 500 · terengganu
  500 · sarawak 350 · sabah 350 · setiap negeri 500). Fourteen state-level
  queries, all KD 0, summing to roughly **11,000 searches a month**, and we
  already rank at position 12.9 for the head term with a page that exists.

**And one cluster the plan over-weighted.** `pakej perkahwinan` returns 100
searches at KD 0; `dewan kahwin near me` 300; `sewa dewan kahwin` 150;
`kos kahwin` did not clear the volume filter at all. The venue/hall cluster
is where our *current* clicks come from, but its Malay search volume is thin
compared with hantaran, mas kahwin, nikah procedure and ucapan. It is a
retention play, not a growth engine.

---

## 3. Competitor gap

### 3.1 Where we stand

**Ahrefs Site Explorer, `my`, index date 2026-08-01, pulled 23 Aug 2026:**

| Site | Organic keywords (MY) | Top-3 | Est. traffic/mo |
|---|---|---|---|
| nikahsatu.com (DR 14) | 1,007 | 570 | 11,287 |
| theweddingnotebook.com | 911 | 344 | 8,280 |
| thekenduri.com (DR 10) | n/a | n/a | ~530 (top-20 sum) |
| **hellokahwin.com** | **6** | **0** | **13** |

We are not behind our competitors. We have not started.

### 3.2 Where they win, which is the same place twice

Both leaders make their money from **two page types**: long advice/roundup
articles that harvest a 40-120-keyword long tail each, and **entity directory
pages** (one page per venue) that rank at position 1 for the venue's own name.

- nikahsatu: 11 of its top 25 pages are `/venue/<slug>/`, several ranked #1
  for 250-1,300-volume venue names.
- TWN: 14 of its top 25 in Malaysia are `/catalog/venues/<slug>`, Lantera
  (458 visits), Tanarimba Janda Baik (343), Templers Ballroom (301), Ukay
  Hills (237), Forest Valley Hall (234).

We have **no directory at all.** Every venue name in Malaysia is currently
uncontested inventory.

**Their editorial coverage is broad but shallow, and their internal linking
is nav-only.** Ahrefs pages-by-internal-links on nikahsatu (23 Aug 2026)
returns an identical 168 internal links to nearly every significant page.
That is the signature of a sitewide menu, not editorial cluster linking. Neither
leader has a pillar-and-cluster architecture. That is the gap the framework
attacks.

### 3.3 What they do not cover

Reading the SERPs for our Tier-1 keywords (Ahrefs SERP Overview, `my`,
23 Aug 2026):

- **hantaran kahwin**, position 2 is nikahsatu (DR 14, 2,425 visits);
  position 5 is **songketdunia.my at DR 3** (593 visits); positions 4, 6 and 8
  are Pinterest, Shopee and Facebook. Half of page one is not editorial
  content at all.
- **pelamin** (1,500/mo, KD 0), page one is **Pinterest boards, an Instagram
  profile, Shutterstock, and two DR-0 rental sites**. There is no article on
  page one. None. A competent Malay guide to pelamin styles takes this SERP.
- **kos kahwin**, position 1 is `lanaianggun.com` at **DR 2** with 34 visits;
  position 2 is Astro Awani with 5. A DR-2 blog owns the money question of
  the entire category.

Nobody owns Nikah & Undang-undang, Ucapan & Doa, or the state-by-state Mas
Kahwin cluster in a structured way. Those three are open.

### 3.4 TWN as a translation source: an honest read

TWN's traffic in Malaysia is venue-driven: its top pages are affordable-venue
roundups and venue catalogue entries. Its *advisory* content that could be
translated is thin on the ground, the complete wedding checklist (115
visits), wedding planners list (138), bridal boutique list (103), and a Guo Da
Li betrothal-gift guide (152) which is culturally Chinese and does not
transfer.

**Conclusion: the translation lever is weaker than the plan assumed.** The
Malay demand sits in adat, agama and procedure, hantaran, mas kahwin, rukun
nikah, borang nikah, ucapan, inai, none of which TWN covers, because its
audience does not search for them. Translation is worth using for the venue
roundups and the checklist, and for the venue catalogue as a directory seed.
For the rest, **original Malay is not a preference, it is the only option.**

### 3.5 Which of the 29 posts to upgrade rather than replace

Inventory from `data/hellokahwin-export/content/posts.json`, cross-referenced
with GSC (23 Aug 2026) and the keyword data above.

**Group A, upgrade now; the article exists and the keyword is wide open
(7 posts).** These are the fastest wins on the whole site.

| Post | Words | Target keyword | Vol | KD | Current state |
|---|---|---|---|---|---|
| mas-kahwin-ikut-negeri | 1,225 | mas kahwin ikut negeri | 2,000 | 0 | **pos 12.9, 307 impressions**, closest to page 1 |
| hantaran-kahwin | 1,817 | hantaran kahwin | 2,000 | 0 | 0 impressions; live and complete |
| hantaran-tunang | 1,219 | hantaran tunang | 4,700 | 0 | 0 impressions |
| goodies-kahwin | 999 | goodies kahwin / doorgift kahwin | 1,500 / 1,400 | 0 | 0 impressions |
| kursus-kahwin | 1,075 | kursus kahwin (+ state variants) | 1,400 (penang) | 0 | 0 impressions |
| cara-buat-kad-kahwin-digital | 1,237 | contoh kad jemputan kahwin | 1,500 | 3 | 0 impressions; retarget to the bigger parent |
| dewan-kahwin | 1,118 | dewan kahwin murah / selangor | 300 + tail | 0 | **25 clicks, pos 9.4**, our only earner; protect it |

Upgrade means: retarget the H1 and title to the exact Malay head term, add the
missing sub-type headings (method rule R9), add real ringgit and state-level
specifics (R11), add the FAQ block from the Tier-3 question list, and wire it
into its pillar with bidirectional links (R13-R16).

**Group B, keep, reposition (3 posts).**

- `garden-wedding` (2,180 words), our impression firehose and our CTR
  problem. It is an English-titled page in a Malay business ranked at 36.6.
  Keep the content, retitle and re-target in Malay ("Venue Garden Wedding /
  perkahwinan taman"), and accept that the English impressions will fall. They
  were worth 4 clicks.
- `majlis-kahwin` (1,198 words), position 6.5, only 13 impressions. Narrow
  target, healthy position. Expand to a state-level series.
- `pelamin-kahwin-dewan` (1,247 words), currently 1 impression, but
  `pelamin` (1,500/mo, KD 0) has **no article on page one at all**. This is the
  single most under-defended keyword found in the whole audit.

**Group C, thin stubs; rebuild or retire (5 posts).** Real Wedding features
of 85-107 words with zero headings: `grand-hyatt-kuala-lumpur` (93),
`sime-darby-convention-centre` (100), `the-danna-langkawi` (107),
`villa-warisan` (96), `marriott-putrajaya` (85). These are not articles. The
evidence says the format itself does not earn: TWN's best Real Wedding gets
132 visits and gets them for the *venue's* name. **Convert these five into the
first five entries of a venue directory**, the venue is the asset, not the
wedding.

**Group D, leave alone for now (14 posts).** The remaining Real Weddings
(400-1,120 words) and the off-core listicles (`tempat-honeymoon-di-malaysia`
3,842 words, `wedding-planner-terbaik-di-malaysia`,
`lokasi-pre-wedding-photoshoot-terbaik`, `hadiah-untuk-pengantin`,
`sewa-dewan-kahwin`). Decent content, not on the critical path. Revisit when
their clusters come up in the calendar.

---

## Data provenance

**Google Search Console**, API, service account
`hellokahwin-gsc@twn-new.iam.gserviceaccount.com`, property
`https://hellokahwin.com/`, pulled 23 Aug 2026. Windows: 2026-07-25→2026-08-21
(28d) and 2025-08-23→2026-08-21 (12m). *The `gsc` MCP server was unavailable
this session; see §1.0.*

**Ahrefs MCP**, all pulled 23 Aug 2026, country `my` unless noted:
`keywords-explorer-matching-terms` (6 batches on Malay seeds: kahwin /
perkahwinan; hantaran / pelamin / dulang; nikah / akad / kenduri / adat /
bertunang / merisik; pengantin / baju nikah / solekan / andaman / inai /
songket; dewan kahwin / sewa dewan / pakej perkahwinan / katering kenduri /
bajet kahwin / kos kahwin; plus a questions-mode batch) ·
`serp-overview` (hantaran kahwin, pelamin, kos kahwin) ·
`site-explorer-top-pages` and `site-explorer-metrics` (nikahsatu.com,
thekenduri.com, theweddingnotebook.com, hellokahwin.com; index date
2026-08-01) · `site-explorer-pages-by-internal-links` (nikahsatu.com).

**Live site checks**, HTTP requests to hellokahwin.com, 23 Aug 2026:
sitemap.xml, robots.txt, redirect status and canonical tags on 13 URLs.

**Content inventory**, `data/hellokahwin-export/content/posts.json`
(export of 21 Aug 2026), 29 posts parsed for word count and heading structure.
