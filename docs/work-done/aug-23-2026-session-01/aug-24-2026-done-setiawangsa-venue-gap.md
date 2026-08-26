# Done: the venue-name gap — sized, diagnosed, and declined

**Task:** Brief `aug-24-2026-brief-setiawangsa-venue-gap.md`
**Owner:** head-of-seo-content · **Date:** 24 Aug 2026 (~01:20–03:40 MYT)
**Status:** Complete. **Recommendation is NO on venue pages. YES on a one-day
pass over the existing page, retargeted from name intent to price intent.**

Ahrefs, a second SERP overview and a live Chrome capture were all pulled by
the team lead after my first pass, and they changed the argument. Section 7
records what I got wrong on the way and what corrected it.

---

## Headline

**The named-hall query space is real, it is bigger than our own impressions
suggested, and it is not a wedding space.**

Ahrefs sizes it at **3,700 searches a month across 61 terms** — larger than the
2,200 a month of generic wedding-intent demand sitting next to it. But the
terms carrying that volume are `dewan serbaguna mbsj usj7 subang jaya` (500),
`dewan serbaguna damansara utama` (300), `dewan komuniti batu muda` (200).
Those are council multipurpose halls, searched by residents after an address,
a booking form or a badminton slot. **Zero of the 61 carry a local pack; five
carry a knowledge panel**, which is the signature of a civic entity rather
than a venue a couple is shortlisting. The live SERP settles it: Google's own
"Orang lain turut mencari" on Pusat Komuniti Setiawangsa offers **"Pusat
komuniti setiawangsa badminton"**.

Ranking for it would teach Google that HelloKahwin is a facilities directory.
That is the same rule that made us walk past `solat istikharah` at 9,300 a
month, and a 500-a-month sports hall is a far weaker case for an exception.

**The finding worth keeping is a different one.** The local pack splits the
wedding-intent set cleanly in two. Thirteen terms carrying 2,120 searches a
month have a map above the organic results. Twenty-six terms carrying 970 a
month have nothing above them at all, and every one of them is a price,
package or cost query. **Our only click from a named query in 28 days came
from that second group** — `harga sewa dewan kahwin`, at position 1.

Google agrees on that too. The same refinement strip carries **"Harga sewa
pusat komuniti setiawangsa"** and **"Pusat komuniti setiawangsa booking"**.

So: stop chasing *which hall*. Own *what a hall costs*.

**The venue-name opportunity, executed perfectly, is worth +2.4 clicks a
month.** Our best measured CTR anywhere on this entity is 0.98%, taken from
the one query variant where we demonstrably hold an organic listing. Applied
to the Setiawangsa family's 2,522 impressions over 181 days, that is a ceiling
of 4.2 clicks a month against the 1.8 we take today.

**Nothing on the 26-cluster roadmap moves.**

---

## 1. Sizing the venue-name query space

**Ahrefs Keywords Explorer, `matching-terms`, country `my`**, seeds `dewan
komuniti`, `dewan serbaguna`, `dewan kahwin`, `dewan majlis perkahwinan`,
`sewa dewan`, 100 rows, pulled 24 Aug 2026. The list reaches 20 searches a
month by row 78, so the space is effectively exhausted inside it.

**6,790 searches a month across 100 terms.** My split:

| Group | Terms | Vol/mo |
|---|---|---|
| **Named hall** (a specific building) | 61 | **3,700** |
| **Generic wedding intent** (`dewan kahwin`, `sewa dewan kahwin`, `pakej…`) | 20 | 2,200 |
| **City-level** (`dewan kahwin` + a place) | 19 | 890 |

### The named-hall pool is bigger than I first reported, and it is the wrong entity

| Named hall | Vol/mo | SERP features |
|---|---|---|
| dewan serbaguna mbsj usj7 subang jaya | 500 | none |
| dewan serbaguna damansara utama | 300 | none |
| dewan serbaguna mbsj kinrara bk 5 puchong | 250 | none |
| dewan komuniti damansara damai | 200 | none |
| dewan komuniti batu muda | 200 | image |
| dewan serbaguna seri akasia | 150 | none |
| dewan komuniti lebuh macallum | 80 | none |
| dewan serbaguna desa cemerlang | 80 | none |

`dewan serbaguna` is a multipurpose hall and MBSJ USJ7 is a sports facility.
The SERP agrees with that reading: **0 of 61 named-hall terms
carry a local pack**, while 5 carry a `knowledge_panel` (`dewan komuniti
sentul perdana`, `dewan serbaguna johor jaya`, `dewan komuniti sri petaling`,
`dewan komuniti bu 11`, `dewan komuniti bandar utama 11`). Google is answering
these with an entity card, not a shortlist.

Compare the wedding-intent set, where 13 of 39 terms carry a local pack. The
two spaces do not behave alike, because they are not the same question.

### The two Setiawangsa terms, exact

| Keyword | Vol | KD | TP | Parent topic | cps |
|---|---|---|---|---|---|
| pusat komuniti setiawangsa | 300 | 0 | 150 | *itself* | **0.59** |
| dewan komuniti setiawangsa | 10 | 0 | 60 | pusat komuniti setiawangsa | null |
| dewan kahwin | 350 | 13 | 250 | **bizmilla** | 1.16 |
| sewa dewan kahwin | 150 | 0 | 100 | dewan kahwin | 0.98 |
| dewan keramat | **0** | null | null | null | null |
| dewan perdana keramat | **0** | null | null | null | null |

Three things in that table matter.

**`pusat komuniti setiawangsa` has a cps of 0.59.** Forty-one per cent of
searches on the single biggest term in this investigation end with no click on
anything at all, before we enter the picture.

**Keramat has no measurable volume.** Both `dewan keramat` and `dewan perdana
keramat` return 0 with null difficulty. One of the two names the CEO spotted
does not exist as a keyword.

**Ahrefs understates this tail by roughly 13x, and I am treating 3,700 as a
floor.** Ahrefs gives `dewan komuniti setiawangsa` 10 searches a month. Our own
Search Console recorded **818 impressions on that exact string in 181 days**,
about 136 a month, at position 8.8. That gap is a caution against reading any
single figure in the named-hall list too literally, and it is why the argument
below rests on entity class and clickability rather than on the volume being
small.

### What we actually surface for (Search Console, 2026-02-24 → 2026-08-23)

| | Queries | Impressions | Clicks | CTR |
|---|---|---|---|---|
| Named venue | 39 | 2,647 | 11 | 0.42% |
| Generic venue | 76 | 881 | 11 | 1.25% |

Setiawangsa alone is 2,522 of the 2,647 named-venue impressions, 95.3%. Every
other named hall we surface for is 125 impressions and zero clicks in 181
days. That remains true. What the Ahrefs data adds is *why*: we only surface
for halls the article names, and the market beyond them is a civic-lookup
space we have no business entering.

### The generic-local queries, and where the click actually is

| Query | Vol/mo | Local pack? | Our impressions (6mo) | Our clicks | Our pos |
|---|---|---|---|---|---|
| harga sewa dewan kahwin | 80 | **no** | 43 | 1 | 5.8 |
| dewan kahwin kl | 30 | yes | 130 | 1 | 18.3 |
| dewan kahwin petaling jaya | 30 | **no** | 111 | 0 | 14.8 |
| dewan kahwin kuala lumpur | 40 | **no** | 65 | 0 | 24.9 |
| dewan kahwin murah | 30 | **no** | 54 | 0 | 9.1 |

---

## 2. The local pack splits the wedding-intent set, and that is the strategy

This is the most useful thing in the Ahrefs pull.

**With a local pack — 13 terms, 2,120 searches a month.** `dewan majlis
perkahwinan` (600), `dewan kahwin` (350), `dewan kahwin near me` (300), `dewan
serbaguna` (200), `sewa dewan kahwin` (150), `dewan kahwin klang` (150),
`dewan kahwin shah alam` (150), then Kota Bharu, Bangi, KL, Cheras, Ipoh and
`dewan kahwin mewah` at 30 to 50 each. Google reads these as *where*, and puts
a map above the organic results.

**With no local pack — 26 terms, 970 searches a month.** `harga sewa dewan
kahwin` (80, cpc 25c), `sewa dewan` (70), `dewan kahwin kajang` (60), `harga
dewan kahwin` (50), `dewan untuk majlis perkahwinan` (50, **cps 1.0** — every
search produces a click), `pakej kahwin dewan` (40), `dewan kenduri kahwin`
(40), `dewan kahwin kuala lumpur` (40), `pakej dewan kahwin shah alam` (40),
`dewan kahwin murah` (30), `dewan kahwin petaling jaya` (30), `sewa dewan
kahwin near me` (30), down to `pakej dewan kahwin` (20).

Nothing sits above an article on that second list. The searcher is asking what
it costs and what a package includes, which is a question a publisher answers
better than a map does. It is also, precisely, where our clicks come from:
`harga sewa dewan kahwin` at position 1 gave the page its only click from a
named query in 28 days, and the separate `sewa-dewan-kahwin` checklist article
took a click at position 8.5.

**970 searches a month, difficulty 0, no map, no shopping block, and a
measured click already landing.** That is a smaller number than 3,700 and it
is the only part of this space we can actually convert.

Two independent confirmations arrived with the live SERP. Google's own related
searches on Pusat Komuniti Setiawangsa include "Harga sewa pusat komuniti
setiawangsa" and "Pusat komuniti setiawangsa booking", so the price and
procedure intent exists even on a pure entity query. And on the `dewan
komuniti setiawangsa` SERP, position 6 is
`tiktok.com/discover/cara-sewa-dewan-komuniti-setiawangsa` — a TikTok ranking
on how to rent the place. The demand is being served, badly, by a video
platform. See §4.

---

## 3. What the page currently serves

Fetched live, 24 Aug 2026, mobile user agent.
`https://hellokahwin.com/dewan-kahwin/` → 301 → `/artikel/idea-dan-nasihat/dewan-kahwin`, HTTP 200.

```
<title>10 Dewan Kahwin Murah di Selangor & KL – Sesuai untuk Bajet Bawah RM5,000 | HelloKahwin</title>
<meta name="description" content="Mencari dewan kahwin murah di Selangor dan Kuala Lumpur kini bukan lagi satu cabaran. Banyak dewan komuniti dan…"/>
<meta name="robots" content="index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1"/>
<link rel="canonical" href="https://hellokahwin.com/artikel/idea-dan-nasihat/dewan-kahwin"/>
```

1,118 words. Ten halls, 73 to 116 words each. Last updated 14 December 2025.
Pusat Komuniti Setiawangsa is entry #6, 84 words, quoting RM3,000 to RM4,000.

The meta description is not a description. It is the opening sentence of the
intro, cut off mid-clause with an ellipsis. Nobody wrote it.

The title already leans price (`Murah`, `Bajet Bawah RM5,000`), which is the
right instinct and is probably why we hold position 1 on `harga sewa dewan
kahwin`. The body does not follow through: it is ten hall descriptions, not a
cost answer.

My first request returned **HTTP 504**; the next eight returned 200 in 0.1s to
3.2s. Intermittent, matches what the P1 investigation found, and not a cause of
anything here.

---

## 4. Diagnosing the near-zero CTR

### It is near-zero, not zero, and the three-day window flattered the problem

Search Console, `searchType: web`, 2026-02-24 → 2026-08-23:

| Query | Impressions | Clicks | CTR | Pos |
|---|---|---|---|---|
| dewan komuniti setiawangsa | 818 | 8 | **0.98%** | 8.8 |
| pusat komuniti setiawangsa | 1,497 | 1 | **0.07%** | 8.7 |
| Setiawangsa family (11 variants) | 2,522 | 11 | **0.44%** | ~8.7 |

This is not a blip and not a migration artefact; it has been this way since
February.

### It is not the page, and it is not the position

| /dewan-kahwin/ | Impressions | Clicks | CTR | Pos |
|---|---|---|---|---|
| 28 days (07-27 → 08-23) | 996 | 28 | **2.81%** | 9.4 |
| 28 days (07-28 → 08-24) | 955 | 26 | 2.72% | 9.4 |
| 84 days (06-01 → 08-23) | 3,869 | 93 | **2.40%** | ~8.8 |

**A caution on reading the page by query.** Summing its 36 named queries gives
1 click and 367 impressions for the 28-day window. The page's actual total for
the identical window is **28 clicks and 996 impressions**. Twenty-seven of the
twenty-eight clicks sit in queries Google will not name. So `harga sewa dewan
kahwin` is the only click among *named* queries, not the page's only click,
and the page is not dead — it converts at 2.81%.

The same URL, at the same average position, converts its blended mix at 2.40%
to 2.81% and its venue-name queries at 0.42%. **A 5.7x deficit isolated to one
query type.** Whatever is wrong is not the page's health, its speed, or where
it ranks.

### Web and image are separate pools, and both exist here

| searchType, 6 months | Clicks | Impressions | Pos |
|---|---|---|---|
| web | 270 | 11,018 | 13.3 |
| image | 49 | 6,355 | 28.4 |

`pusat komuniti setiawangsa` appears in both: **1,497 web impressions at
position 8.7 for 1 click**, and separately **923 image impressions at position
6.2 for 6 clicks**. The image result out-converts the blue link six to one.

That matters because the two variants behave differently in the crawl data,
and that turns out to be the answer.

### Cause one, now corroborated: the title decides whether we get a blue link

Two queries name the same building, one position apart, fourteen times apart
on CTR.

| Query | Token in our title? | Impressions | CTR | Pos |
|---|---|---|---|---|
| **dewan** komuniti setiawangsa | **"Dewan"** — yes | 818 | **0.98%** | 8.8 |
| **pusat** komuniti setiawangsa | no | 1,497 | **0.07%** | 8.7 |

Both figures are `searchType: web`, so neither is contaminated by the image
result. Ahrefs then confirms the asymmetry from outside GSC entirely.

**Ahrefs SERP overview, `dewan komuniti setiawangsa`, `my`, 24 Aug 2026:** we
hold **an organic listing at position 9**, titled *"10 Dewan Kahwin Murah di
Selangor & KL – Sesuai untuk ..."*, and separately an image result at position
7. **Ahrefs SERP overview, `pusat komuniti setiawangsa`, same day:** the image
result only, no organic listing in the top ten.

So the mechanism is not persuasion. It is presence. The query that shares a
token with our title earns a blue link; the query that does not earns an image
tile. Two independent sources, GSC and Ahrefs, agree on the asymmetry.

**The retitle is justified, and it is worth about two and a half clicks a
month.** That second half matters as much as the first. Our measured CTR on
the variant where we do hold organic position 9 is 0.98%. Apply that to the
1,497 impressions the `pusat komuniti` variant earns over 181 days and the
retitle buys **2.5 clicks a month**. Do it because it is one line inside a
pass we are already making, not because it is worth a day of anyone's time.

### Cause two: a Knowledge Panel that answers the whole question

I no longer have to hedge this. Live Google capture, `hl=ms`, `gl=my`,
`pws=0`, 24 Aug 2026, screenshot at
`.../claude-chrome-screenshots-ag2Vs5/screenshot-1787579901295-0.jpg`.

**There is no map pack.** There is a full Knowledge Panel down the right rail:
**4.4 stars, 576 Google ulasan**, category **"Pusat komuniti di Ampang"**,
address, telephone 012-355 8565, opening hours with a live open/closed state,
"Laman web" and "Arah" buttons, a photo tile, an embedded map, a description
block quoting DBKL, and a reviews section.

That panel answers the searcher's entire question — where it is, what number
to call, when it opens, how to get there — without a click to anybody. It is
exactly the civic-entity signature the keyword data predicted: zero of 61
named-hall terms carry a local pack, and five carry a `knowledge_panel`.

**Page one carries nine organic results.** In order: Tempah@KL facility
detail, Waze, `dbkl.gov.my/fasiliti-awam/pusat-komuniti`, then an "Imej"
carousel sitting between the third and fourth results, then Instagram,
a Facebook media set, a Facebook video from Warga Taman Keramat, Moovit,
Parkopedia's car park page, and a Facebook page as the ninth and last.

Position 1 is the primary source and the transactional endpoint at the same
time: the searcher wants to book the hall, and DBKL owns both the facts and
the booking form. Facebook holds three of the nine. **No editorial publisher
appears anywhere on page one.**

**And hellokahwin.com is not on page one of that live capture at all.** The
full page text was searched; we are absent from the organic list, and the
three visible tiles in the image carousel are Facebook, Instagram and DBKL,
not us.

### A tension I am not going to resolve

Three observations say we do not hold a stable organic listing on `pusat
komuniti setiawangsa`: Ahrefs' crawl found only an image, the live capture
found nothing, and the query converts at 0.07%. One observation disagrees.
GSC's 181-day average puts us at web position 8.7 across 1,497 impressions.

One crawl is not a 181-day average, and this SERP shuffles. I am not calling
it. What it means practically is that the 2.5-clicks-a-month figure above is a
ceiling rather than a forecast, because it assumes we can hold a listing we
may only hold intermittently.

### Google's own refinement chips make both arguments for me

"Orang lain turut mencari", from the live capture:

- **"Pusat komuniti setiawangsa badminton"**. Google's own related search on
  this entity is a racquet sport. That is the wrong-entity-class argument
  confirmed on the page rather than inferred from a keyword list.
- **"Harga sewa pusat komuniti setiawangsa"** and **"Pusat komuniti
  setiawangsa booking"**. The price and procedure intent exists on this exact
  entity and Google is advertising it, which is direct support for the pivot
  in §2.
- Plus "…photos", "…reviews" and "…au2", matching the eight refinement-chip
  queries already sitting in our own Search Console data.

The same signal appears in the `dewan komuniti setiawangsa` SERP, where
position 6 is `tiktok.com/discover/cara-sewa-dewan-komuniti-setiawangsa` — a
TikTok ranking on **how to rent it**. Somebody is already serving the
procedure question on this hall. It is not us, and it is not a wedding
publisher.

Our own query set says the same from the other side. Eight of the 39
named-venue queries are refinement chips: `pusat komuniti setiawangsa reviews`
(37 impressions), `pusat komuniti setiawangsa photos` (8), `dewan perdana
keramat mall reviews` (19), plus `photos` variants for BU11, Melati Seksyen 7,
Raja Muda Musa, Seri Hatinie Glassview and Seri Siantan.

And top-three organic earns nothing here regardless. `dewan komuniti
setiawangsa kahwin` sits at position **3.8** with zero clicks.
`"dewan komuniti au2" keramat` sits at position **2.0** with zero clicks.

### The diagnosis

**We are not ranking the wrong page.** `/dewan-kahwin/` names the hall and is
the only page we own that could rank for it. It is the right page for *"I am
getting married, is this hall any good"* and the wrong page for *"what is this
hall's phone number and can I book it"* — and the SERP, the cps of 0.59 and
the refinement chips all say the second question is the dominant one.

No title, schema or rewrite puts an article above a council's own booking
portal on the council's own facility name, under a panel that has already
given the searcher the address, the phone number and the opening hours. The
retitle can win us a blue link on the second variant, as §4 shows. It cannot
make the click appear, and the measured ceiling for the whole Setiawangsa
family says so: **4.2 clicks a month**, against the 1.8 we take today.

---

## 5. The recommendation

**No venue pages. No directory pull-forward. One day on the existing page,
retargeted from name intent to price intent.**

### Why not venue pages

**Wrong entity class, and that is now the primary argument.** The 3,700 a
month is real, and probably understated, but it belongs to council facilities:
sports halls, community centres, address and booking lookups. Zero of 61 terms
carry a local pack; five carry a civic knowledge panel. Our own cluster plan
rejects keywords on exactly this basis — we walked past `solat istikharah` at
9,300 a month because ranking for it would blur the entity we are building.
A multipurpose hall in USJ7 is a much weaker case for an exception.

**The click is not there even where the volume is.** `pusat komuniti
setiawangsa`, the largest term in this investigation at 300 a month, has a cps
of **0.59**: 41% of its searches end in no click at all. Position 1 is the
booking portal the searcher is trying to reach. Page one is Waze, Instagram,
Facebook, Moovit and Google Maps.

**Keramat, one of the two names that started this, has no volume at all.**
`dewan keramat` and `dewan perdana keramat` both return 0 in Ahrefs.

**The verification cost is the highest on the plan.** I checked the primary
source: `dbkl.gov.my/fasiliti-awam/pusat-komuniti` (24 Aug 2026) publishes
names, addresses and phone numbers and **no rental rates at all**. Rates live
only inside Tempah@KL, which returns **HTTP 500** to any non-browser client.
Our doctrine requires primary sourcing on price-bearing facts, so each hall
costs a live browser session or a phone call, and DBKL, MBPJ, MBSA, MPAJ and
Perbadanan Putrajaya are five separate authorities with five separate portals.
Rates change, so it recurs annually.

**The market leader skipped venues entirely.** `ppsignature.com` holds **2,255
Malaysian organic keywords, 1,479 of them in the top three, and 31,408 organic
visits a month worth USD 1,726** (Ahrefs Site Explorer, `my`, 24 Aug 2026),
with zero paid. **Not one venue or `dewan` query appears in its top 60.** The
only venue-adjacent row anywhere in that top 60 is `majestic event hall` (400
a month, position 2, 72 visits). Everything else is `solat istikharah` (7,148
visits), `rukun nikah` (2,550), `taaruf maksud` (1,185), `hadiah kahwin` (474),
the mas kahwin state page and the doorgift page. **That is our P1, P2 and P7
almost line for line.** The best-performing site in this market built 31,000
visits a month without touching a single hall.

**And on the generic head, the incumbents are beatable but a map sits above
them.** `dewan kahwin` (350, KD 13): position 1 is a local pack (Laman Qaseh,
Nadi Seroja, nikahsatu), then `bizmillacatering.com` DR 14 with 407 visits,
`gokahwin.my` DR 0 with 139, nikahsatu DR 14 with 104, `dewankahwin.com.my`
DR 0 with 39, an image block, `lanaianggun.com` DR 2 with 90, a Facebook
group, an Instagram profile and `sewadewan.com.my` DR 4 with 37. Everything
organic is DR 0 to 14. Winnable — but it is a location query with a map on it,
and it is not where I would spend the day.

### What to do instead: one pass, retargeted to price

The page already holds position 1 on `harga sewa dewan kahwin` and its title
already says `Murah` and `Bajet Bawah RM5,000`. The body does not deliver on
that promise. Fixing that is the whole move.

**The SEO changes:**

- **Rebuild the article around cost, not around ten buildings.** Rental bands
  by capacity and by authority, what the rate does and does not include,
  deposit and cleaning charges, what "pakej" covers when a caterer bundles the
  hall. Target the 26 local-pack-free terms carrying 970 searches a month:
  `harga sewa dewan kahwin`, `harga dewan kahwin`, `pakej kahwin dewan`,
  `dewan untuk majlis perkahwinan` (cps 1.0), `dewan kenduri kahwin`,
  `dewan kahwin murah`, `pakej dewan kahwin shah alam`.
- **Keep the ten halls as evidence for the price bands, not as the point.**
  They are what earns us page one on those hall names, at a cost of one
  paragraph each. That mechanism is already working and needs no new pages.
- **Write a real meta description** naming the price band and the hall types.
- **Add per-hall heading anchors** so Google can offer a jump-to-section link.
- **Name the booking route per hall** — Tempah@KL for DBKL halls, the relevant
  council portal otherwise. It is the one thing the searcher wants that we can
  legitimately carry.
- **Retitle to carry "Pusat Komuniti" alongside "Dewan Komuniti".** Confirmed
  by the SERP pull in §4: we hold organic position 9 on the variant carrying
  our title token and no organic listing at all on the variant that does not.
  Worth 2.5 clicks a month, which is why it is one line in a larger pass and
  not a project.
- **Book the annual refresh at publish time** (doctrine rule 18, price-bearing
  page).

**Six defects to fix in the same pass.** These fail our own production
doctrine regardless of what any keyword is worth:

1. **Heading #10 names the wrong hall.** The heading reads *"Dewan MBSA
   Seksyen 7, Shah Alam"*; the paragraph beneath describes *"Dewan Lavender
   Seksyen 7"*. Two buildings, one entry.
2. **Three of ten entries carry no image credit.** #3 Dewan Sivik MBPJ, #4
   Dewan Kenanga MBSA, #8 Dewan Warisan Kampung Melayu Subang. That is the
   owner-level rule, so the page fails QC on this alone.
3. **One credit is wrong.** #9 Dewan Seri Melati, Gombak is credited *"source:
   perbadanan putrajaya"*. Perbadanan Putrajaya does not run a hall in Gombak.
4. **Ten ringgit figures, RM2,500 to RM4,000, with no authority named against
   any of them**, on a page last updated 14 December 2025. Same rot the C2.4
   run found in the mas kahwin figures.
5. **The meta description is a truncated auto-stub.**
6. **The page is stamped December 2025 and quotes 2026 prices.**

**Cost:** one writer-day. Roughly 2h verification across the council portals in
a browser, 3h rewrite around the cost frame, 1h image-credit remediation, then
`/humanizer` and the review board. Call it 6 to 8 hours.

**Expected return.** The Setiawangsa recovery is now measurable rather than
modelled. Our best observed CTR
anywhere on this entity is 0.98%, on the one variant where we demonstrably
hold an organic listing. Apply it to the family's full 2,522 impressions over
181 days and the ceiling is **4.2 clicks a month**. We take 1.8 today. **So
executing the venue-name opportunity perfectly is worth about +2.4 clicks a
month**, and that is the strongest single argument in this document for
declining it.

The return I will stand behind instead is the price cluster: 970 searches a
month at difficulty 0, no map, no shopping block, no government portal above
us, on a page that already holds position 1 on the biggest term in it. If the
rebuilt page takes a third of that at a 6% blended CTR it is roughly **20
clicks a month**, an order of magnitude above the hall names for the same
day's work. Worth one day. Not worth reorganising anything for.

---

## 6. Placement against the 26-cluster plan

**It displaces nothing and expands nothing.**

C6.1 Dewan & venue majlis is already in the approved plan and already **Tier
4**. This is a maintenance pass on an existing asset. It belongs to the "seven
existing-article upgrades" line, not to the 80-article production plan, and it
does not change the article count.

**Weeks 1 to 4 stay exactly as approved:** P2 complete, C2.4 mas kahwin ikut
negeri first, then C2.1, C2.3, C2.2, C2.5. The ppsignature keyword list is the
strongest argument yet for that sequence — the site earning 31,408 visits a
month in this market did it on istikharah, rukun nikah, taaruf, mas kahwin,
hadiah kahwin and doorgift, and on nothing resembling a venue.

**One thing this does change.** It should push the still-open venue directory
decision (cluster plan, CEO ask #4) **later and narrower**. If it is built,
build it for commercial venues whose operators publish rates and want the
listing. Not for council halls, where the volume is civic, the SERP is a map,
and the rates sit behind a portal that will not answer a machine.

I should also record what this does *not* prove. We hold ten venue-titled
pages from the WordPress export, and I nearly cited their single-digit monthly
impressions as evidence that venue entity pages fail for us. They are not
entity pages. They are Real Wedding features about one couple's day at a
venue, 93 to 483 words, with no capacity, no rate and no booking route. **We
have never published a venue entity page.** The directory case is untested,
not disproven.

**A bigger leak, found on the way.** `/garden-wedding/` took **848 impressions
in 28 days at average position 36.4, for 4 clicks** — more than double
Setiawangsa's rate — on English queries (`garden wedding kl`, `garden wedding
malaysia`, `outdoor wedding venue`) on a Malay-first site. An English-titled
page accumulating impressions at near-zero CTR is a named failure mode in our
own doctrine, and it is already slated for retargeting as C6.1 topic 5. **If
the CEO wants one venue-pillar action brought forward, that page has the
numbers behind it and the halls do not.**

---

## 7. What I got wrong, and what corrected it

My first pass ran without Ahrefs and I said so at the time. Three things came
out of the subsequent pull, and two of them corrected me.

**I sized the tail too small.** I reported the named-hall space as "about 21
impressions a month outside Setiawangsa" from our own Search Console. That was
an accurate measurement of what *we* surface for and a poor proxy for the
market, which Ahrefs puts at 3,700 a month across 61 terms. The conclusion
survived, but for a better reason than the one I gave: the space is not too
small, it is the wrong entity.

**I over-weighted the title, then under-weighted it, and the pull settled
both.** I first called the 14x CTR gap "the one finding here I would act on
without waiting for anything else". Ahrefs then showed us in the `pusat
komuniti setiawangsa` SERP only as an image, a competing explanation I could
not rule out, so I demoted the finding to conditional. The SERP overview on
`dewan komuniti setiawangsa` resolved it: we hold organic position 9 there
with our title visible, and no organic listing on the variant that omits the
token. The hypothesis was right and the mechanism was presence rather than
persuasion. What I had wrong throughout was the size of it. It is worth 2.5
clicks a month.

**Two readings of the Ahrefs data I checked and did not accept.** First, that
we appear only as an image and that explains the zero CTR: Search Console
separates search types, and the 1,497 impressions at position 8.7 are
`searchType: web`, which excludes image results. The image result is a
separate 923 impressions at position 6.2, and it converts better, not worse.
Second, that `harga sewa dewan kahwin` produced the page's only click in 28
days: it produced the only click among *named* queries, while the page took 28
clicks in total, 27 of them on queries Google anonymises.

**Still unresolved, and I am leaving it that way.** Ahrefs' crawl and the live
Chrome capture both put us off page one on `pusat komuniti setiawangsa`, while
GSC's 181-day average puts us at web position 8.7 on 1,497 impressions. One
crawl is not a 181-day average and this SERP shuffles, so the honest reading
is that our listing there is intermittent. It makes the 2.5-clicks figure a
ceiling, and it changes nothing else.

---

## 8. Open items for the CEO

1. **Authorise the one-day pass on `/dewan-kahwin/`**, retargeted to price.
   Four of the six defect items need fixing whether or not the SEO return
   arrives.
2. **Restore Ahrefs, GSC and Chrome MCP access to subagent sessions.** Every
   external measurement in this document was taken by the orchestrating
   session on my behalf, because none of those tools reach a subagent. The
   Phase 1 audit hit the same wall with `gsc` and worked around it through the
   API. It cost this task a full pass and a published conclusion that had to
   be corrected. This is an infrastructure defect, not a one-off.
3. **The venue directory decision stays open**, and should now be scoped to
   commercial venues if it proceeds at all.
4. **Note for the record:** ppsignature's top 60 keywords are a near-exact map
   of our P1, P2 and P7 pillars. The approved sequence is validated by the
   only site in this market that has actually won it.

No data request is outstanding. Both pulls I asked for mid-task — the SERP
overview on `dewan komuniti setiawangsa` and the live Chrome capture — came
back and are folded into §4. Nothing in this document is waiting on a
measurement.

---

## Data provenance

**Ahrefs**, country `my`, pulled 24 Aug 2026 by the team lead at my request
(this session had no Ahrefs access; see §7). `keywords-explorer` overview on
six exact terms; `keywords-explorer` matching-terms, `match_mode=terms`, five
seeds, 100 rows; `serp-overview` on `pusat komuniti setiawangsa`, `dewan
komuniti setiawangsa` and `dewan kahwin`, top 15 each; `site-explorer` metrics
and organic keywords for ppsignature.com (subdomains, top 60 by traffic).
Monetary values converted from USD cents.
The group totals, the local-pack split and the named-versus-generic
classification in §1 and §2 are my computation over those 100 rows.

**Google Search Console**, property `https://hellokahwin.com/`, service account
via the Search Analytics API, `dataState: all`, pulled 24 Aug 2026. Windows:
2026-02-24 → 2026-08-24 (search-type split), 2026-02-24 → 2026-08-23 (181
days), 2026-06-01 → 2026-08-23 (84 days), 2026-07-27 → 2026-08-23 and
2026-07-28 → 2026-08-24 (28 days). Method mirrors
`scripts/dashboard/lib/gsc.mjs`; the credential was read from its configured
path and never printed.

**Live Google SERP capture**, `google.com/search?q=pusat+komuniti+setiawangsa`,
`hl=ms`, `gl=my`, `pws=0`, 24 Aug 2026, captured by the team lead via Chrome.
Screenshot retained at
`.../claude-chrome-screenshots-ag2Vs5/screenshot-1787579901295-0.jpg`
(102 KB, verified present 24 Aug 2026). Full page text was searched for
`hellokahwin`; no organic listing found. The Knowledge Panel contents, the
nine organic results and the "Orang lain turut mencari" chips in §4 are read
from that capture.

**Live page fetch**, `https://hellokahwin.com/dewan-kahwin/`, 24 Aug 2026,
mobile user agent.

**Primary source check**, `dbkl.gov.my/fasiliti-awam/pusat-komuniti`, 24 Aug
2026 — names, addresses and phone numbers only, no published rates.
`tempahkl.dbkl.gov.my/facility/detail` returned HTTP 500 to a non-browser
client.

**Content inventory**, `data/hellokahwin-export/content/posts.json`, export of
21 Aug 2026, 29 posts.

**Carried forward, not re-measured:** nikahsatu.com and
theweddingnotebook.com venue figures, and the `thekenduri.com` comparison,
from `aug-23-2026-clusters-launch-plan.md`, pulled 23 Aug 2026.

**Not pulled, and not estimated:** the `gsc-ctr-by-position` benchmark;
hellokahwin.com's own Domain Rating and backlink profile; any council rental
rate or capacity. None of the three changes the recommendation, which is why I
did not ask for them. Every null in the Ahrefs output is left null.

**Click ceilings in §4 and §5** are arithmetic over measured inputs, not
forecasts: observed impressions over 181 days multiplied by our own observed
CTR on the same entity. They are labelled as ceilings because they assume we
hold a listing the live capture suggests we hold only intermittently.
