# Done — SEO-04: venue entity pages — **THE SOURCING GATE FAILED. NOTHING WAS BUILT.**

**Date:** 27 Ogos 2026
**Brief:** `docs/plans/aug-23-2026-session-01/aug-27-2026-brief-seo-04.md`
**By:** BMAD / Amelia (Senior Software Engineer)
**Sprint 02, item SEO-04. The last undispatched item.**

**Zero pages built. Zero code changed. Zero rows written to production.** The
brief opened with a one-hour sourcing gate and gave it the power to kill the
item. It used that power. This report is the deliverable.

---

## Verdict in one paragraph

**nikahsatu.com is not a competitor that beat us with better entity pages. It is
the venue operator's own website.** Zest Venture Sdn Bhd (842187-P) runs
nikahsatu *and* the venue brands the item targets — Rumah Abang Jamil, Arjuna,
Jiwa, Villa Rimba Flora. Their `/venue/[slug]` pages hold position 1 on brand
terms because they *are* the brand. The re-scope moved us from one first-party
incumbent (DBKL's `tempahkl.dbkl.gov.my` on council halls) to a different
first-party incumbent, and did not notice, because the brief assumed "the
venue's own site holds 1 and nikahsatu is entrenched at 2" — **they are the same
party.** Meanwhile the venues publish neither capacity nor price on their own
properties, so the two facts the DoD requires exist in exactly one place on the
open web: the operator's own promotional package ladder, undated, with a live
discount banner. We cannot source them. **Item parked.**

---

## 1. The gate, answered

### Gate Q2 first, because it decides Q1: are nikahsatu's venue pages paid listings or partnerships?

**Neither. They are first-party pages of the venue operator.** Five independent
pieces of evidence, all pulled 27 Ogos 2026.

**a. The footer, from raw HTML — not a summariser:**

```
$ curl -s https://nikahsatu.com/ | grep -o -i -E "Zest Venture[^<]*"
Zest Venture Sdn Bhd (842187-P) All Rights Reserved
```

Full string in the page: `© 2019 NikahSatu by Zest Venture Sdn Bhd (842187-P)
All Rights Reserved`.

**b. Zest Venture is also the venue operator.** A PERKESO Pahang recruitment
post names them as one employer entity, verbatim:

> "NIKAHSATU ❤️ RUMAH ABANG JAMIL (Zest Venture Sdn Bhd) kini sedang mencari
> pelajar yang ingin menjalani latihan perindustrian bersama mereka."

<https://www.facebook.com/Perkesopahang/posts/1001865218797980/>

**c. Arjuna's own official Instagram routes its booking to nikahsatu's
WhatsApp.** Bio verbatim from <https://www.instagram.com/arjunaweddingspace/>:

> "A Bali-inspired Wedding Venue
> Bangi | Melaka | Johor Bahru | Ipoh
> •
> Date 2026 Masih Available + HIGH REBATE"

Bio link: `tinyurl.com/Whatsapp-Nikahsatu`. The venue brand's own sales channel
**is** nikahsatu.

**d. nikahsatu produces the venues' marketing assets.** Their own Pixieset
gallery for the venue — `nikahsatu.pixieset.com/vrfgombak/` — and YouTube titled
"Villa Rimba Flora Gombak | **Premium Wedding Venue by Nikahsatu**".

**e. `nikahsatu.com/venue/` is a portfolio, not a directory.** Seven brands
across ~24 locations: Dewan/Rumah Abang Jamil (11), Jiwa (4), Arjuna (4),
Villa Rimba Flora (2), Alam Maya (2), Pinewoods (2). No "claim this listing",
no "advertise with us", no vendor login, no third-party submissions — the things
a real directory has. What it has instead is a lead-capture form
(`<form ... id='gform_20'>`) and "Grab Discount hingga RM5,000 + FREE Site Visit
Consultation".

### Gate Q1: can we source real prices and capacities at scale?

**No — not for the brands this item targets.** The primary sources are empty.

**Villa Rimba Flora's own official website publishes neither fact.** This is the
cleanest measurement in the report:

```
$ curl -s https://www.villarimbaflora.com/ -o vrf.html -w "http=%{http_code} bytes=%{size_download}\n"
http=200 bytes=25533

$ grep -o -i -E "RM[ ]?[0-9,]+" vrf.html | sort -u     # prices
(no output)

$ grep -o -i -E "[0-9,]+[ ]?pax" vrf.html | sort -u    # capacity
(no output)

$ grep -o -i -E "\+?60[0-9 -]{7,}" vrf.html | sort -u
+6012 205 6756

$ grep -c -i "nikahsatu" vrf.html
0
```

**Zero price strings. Zero capacity strings.** One WhatsApp number covering all
three of their locations, labelled "(WhatsApp only)". The venue's own primary
source contains neither of the two facts the DoD demands.

**The only place the numbers exist is the operator's own page**, and what is
there is not what the DoD asked for:

| DoD requires | What nikahsatu actually publishes |
|---|---|
| Hall **capacity** | **Package tiers**, not capacity — `50 pax … 1000 pax` are price brackets for an all-in package (space + catering + deco + photography + songket + invitations). No hall's actual capacity is stated anywhere. |
| **Price** | An all-in wedding package ladder, e.g. Villa Rimba Flora Gombak Resepsi `RM28,700`→`RM40,500`; Jiwa Damansara 100 pax Resepsi `RM19,200`. Not a venue rental rate. |
| **Booking line** | **Nothing.** `grep` for `tel:`/`wa.me`/a 60-number on the venue page returns no output. |
| **Source + date checked** | No source cited, no publication or update date, and a live promo banner ("Discount hingga RM2,000", "Grab Discount hingga RM5,000") that moves the prices at the operator's discretion. |

The prices *are* in the static HTML and therefore scrapeable — `28,700`,
`30,700`, `40,500` and the rest of the ladder all appear. **Scrapeable is not
sourceable.** Republishing a competitor-operator's undated promotional price
list, with no independent verification and no way to know when it changes, is
precisely the "directory of plausible-looking figures" the brief called the
worst possible outcome.

**Note the trap inside the DoD's own proof step.** It asks me to "quote capacity
and booking line from live HTML for two venues." Neither fact is publicly
published for any of the eight target venues. **The brief's own acceptance test
is unsatisfiable from available sources** — which is, in fairness, exactly what a
gate is for.

---

## 2. There is no alternative target list

Before failing the gate I checked whether a *different* eight pages could pass
it. They cannot. Ahrefs Keywords Explorer, country `my`, pulled 27 Ogos 2026.

**The DoD needs "two or more multi-location venue brands at 400+ monthly brand
volume each", eight pages minimum. Here is the entire qualifying universe:**

| Venue page | Vol/mo | Brand | Owner |
|---|---|---|---|
| arjuna johor bahru | **1,200** | Arjuna | Zest Venture |
| jiwa damansara | **1,000** | Jiwa | Zest Venture |
| arjuna melaka | **700** | Arjuna | Zest Venture |
| villa rimba flora gombak | **700** | Villa Rimba Flora | Zest Venture |
| rumah abang jamil shah alam | **700** | Rumah Abang Jamil | Zest Venture |
| rumah abang jamil kuala terengganu | **700** | Rumah Abang Jamil | Zest Venture |
| rumah abang jamil klang | **600** | Rumah Abang Jamil | Zest Venture |
| rumah abang jamil melaka | **400** | Rumah Abang Jamil | Zest Venture |

**Exactly eight pages clear 400/month, and all eight belong to one company.**
The item's cluster floor and the competitor's portfolio are the same list. There
is no version of this item that is not "eight pages about one competitor's
venues, priced from that competitor's page."

The remaining Zest brands fall below the floor anyway — `alam maya shah alam` 80,
`pinewoods shah alam` 20.

**The one other commercial class with real volume is the wrong audience and
single-location.** `chuai heng banquet hall` 1,000, `the oscar banquet hall` 900,
`tulip banquet hall` 700, `alam indah banquet hall` 400, `galaxy banquet hall`
350. These are Chinese-Malaysian banquet halls — wrong market for a Malay-Muslim
wedding site — and **not one is a multi-location brand**, so they fail the DoD's
"two or more multi-location brands" requirement on their own terms.

`dewan perdana felda` at 1,000 is Malay-market and real, but single-location and
FELDA-operated — the same official-portal wall as DBKL.

### The brief's traffic figures did not reproduce, and the gap is large

Ahrefs Site Explorer, `nikahsatu.com`, `mode=subdomains`, country `my`,
date `2026-08-01`, filtered to `/venue/`:

| Page | Brief said | I measured |
|---|---|---|
| `/venue/arjuna-melaka/` | 882 traffic @ vol 2,400 | **6 traffic**, pos 5 |
| `/venue/arjuna-johor-bahru/` | 691 @ 1,800 | **177**, pos 1 |
| `/venue/villa-rimba-flora-gombak/` | 670 @ 1,800 | **515**, pos 1 |
| `/venue/jiwa-damansara/` | 431 @ 1,200 | **424**, pos 1 |
| **All `/venue/` pages** | **~4,900** | **2,433** |

Jiwa reproduces almost exactly; Arjuna Melaka is off by two orders of magnitude.
I cannot tell from here whether the brief's figures were global rather than
country-scoped, or taken on a different date — **so I am not claiming the
incumbent halved.** I am flagging that the number the item was scoped on does
not reproduce under `country=my`, and that a single entity page can go from 882
to 6, which is worth knowing before betting a sprint on the page type's
durability.

Ahrefs' own two endpoints also disagree on volume for the same term
(`arjuna johor bahru`: 1,200 via Keywords Explorer, 450 via `top_keyword_volume`;
`villa rimba flora gombak`: 700 vs 1,300). I have quoted both rather than picking
the flattering one.

---

## 3. The premise the brief could not have checked

The brief's expectation was explicit and reasonable:

> "**EXPECT POSITION 3–5, NOT 1** — the venue's own site holds 1 and nikahsatu
> is entrenched at 2."

That model has two independent incumbents and a gap at 3. **The real SERP has
one party holding both slots.** Position 1 on `villa rimba flora gombak` is
nikahsatu; the "venue's own site" (`villarimbaflora.com`) is the same company's
brochure with no prices on it. A searcher typing a venue brand name wants the
operator, and the operator owns the answer, the booking channel and the price.

This is the *same structural failure* the re-scope was written to escape. The
tracker rejected council halls because "what exists is held at position 1–2 by
the council's own booking portal (tempahkl.dbkl.gov.my, DR 64)." Swapping to
commercial brands swapped `tempahkl.dbkl.gov.my` for `nikahsatu.com`. **The DR
went down; the first-party ownership did not change.**

And note what actually explains the "17x" — entity pages beating hubs on
nikahsatu is real, but the cause is not template quality. **A brand's own pages
outrank its own category pages on brand terms. That is not a transferable SEO
finding; it is what owning a brand looks like in a SERP.**

---

## 4. What I did not build, and why the Setiawangsa control is held too

**Nothing was built.** Confirmed against production, 27 Ogos 2026:

```
404  https://hellokahwin.com/dewan/selangor/villa-rimba-flora-gombak
404  https://hellokahwin.com/dewan/kuala-lumpur/dewan-komuniti-setiawangsa
404  https://hellokahwin.com/dewan/
0 /dewan/ URLs in sitemap.xml
```

**The Setiawangsa control is held with the item, deliberately — and this is a
decision I want reviewed rather than assumed.** The brief is firm that the
control "is part of the deliverable, not a leftover." It is also firm that if
sourcing fails I must "not quietly downgrade to council halls." Those collide,
and the gate wins: the control's entire evidentiary value is measured *against*
commercial pages that rank. Build it alone and it proves nothing — a single
council-hall page earning nothing tells us only what we already believe, and it
is indistinguishable from the downgrade the brief forbids. So I stopped.

**But there is a real asymmetry the CEO should know about before deciding.**
Council halls are the one category where the DoD's sourcing bar is *actually
met today*: councils publish official, year-stamped rate cards on their own
domains — e.g. `https://www.mbpj.gov.my/sites/default/files/kadar_tempahan_kemudahan_mbpj_tahun_2024.pdf`,
titled "KADAR SEWAAN DEWAN SERBAGUNA / BALAIRAYA / KOMPLEKS SUKAN". (I could not
extract the figures here — the PDF uses Identity-H CID encoding and this box has
no `poppler`, so I am claiming the document exists and is official, **not**
quoting rates I did not read.)

**So the two halves of this item fail different tests, and neither half passes
both:**

| | Demand | Sourceable primary data |
|---|---|---|
| **Commercial brands** (Arjuna, Jiwa, RAJ, VRF) | ✅ 400–1,200/mo | ❌ operator-only, undated, promo-driven |
| **Council halls** (Setiawangsa et al.) | ❌ ~30/mo, official portal at 1–2 | ✅ official year-stamped rate cards |

That is the finding I would keep from this item even if nothing else survives.

---

## 5. What it would take

Four routes, honestly costed.

**1. Primary verification by phone — the only route that fits our doctrine.**
Call or WhatsApp each of the eight venues, record capacity, rental basis and
rate, publish with "disemak 27 Ogos 2026, melalui telefon." This is exactly how
`mas-kahwin-ikut-negeri` was built and it is the site's actual differentiator.
**It is field research, not an engineering task** — eight calls in Malay by a
human, plus a re-check cadence because these prices move with promo cycles.
Dispatch to a content/verification owner, not to a build agent. This is my
recommendation if the CEO still wants the category.

**2. A data partnership with Zest Venture.** They are a direct competitor for
the same couples and the same queries, and they monetise the booking we would be
sending them. Not plausible; not worth the ask.

**3. Pivot the entity class to hotels.** Hotels *do* publish official banquet
capacity charts on their own domains (Marriott, Ritz-Carlton, Hilton, Concorde
"Events & Weddings" pages carry pax figures). Genuinely sourceable and dated —
this is the only class that passes the sourcing bar at scale without fieldwork.
But brand demand belongs to the hotel, the hotel's own site holds position 1, and
the audience skews English. Same first-party wall, better data.

**4. Own the price question instead of the venue question.** The Aug-24
investigation already landed here — "stop chasing *which hall*. Own *what a hall
costs*" — and found 26 price/package/cost terms carrying 970/month **with no
local pack above them**, where our one click from a named query came from
(`harga sewa dewan kahwin`, position 1). SEO-04's genuine insight is that entity
pages beat listicles. That insight is transferable to an entity class we can
source. **Venue *cost* by city, sourced from council rate cards and phone
verification, is buildable today.** It is not this item, and I am not expanding
scope by starting it.

---

## 6. Regression check — nothing to regress

I merged nothing and changed no code, so the live-state constraints are
untouched by definition. Explicitly:

- **UX-01** — no new route, so `data-hide-mobile-nav` was never reintroduced.
- **RISK-06** — `stale-while-revalidate` unchanged; I merged nothing to re-check.
- **RISK-04 / RISK-05** — no sitemap entries added, so nothing dark was
  published and the indexing monitor has nothing new to alarm on.
- **UX-02** — **no collision.** My venue schema would have touched
  `article-renderer.tsx`, where UX-02 is live right now adding heading ids and
  ItemList/Place JSON-LD. Because the gate failed before any code, there is
  nothing to sequence. If this item is ever revived, **it must sequence behind
  UX-02** — that file is the contended one.
- Site worktree `pillars-ingest-redirects` left clean. The modified
  `.claude/settings.local.json` there was not mine and I did not touch it.

**Shipping status, stated plainly because the brief asked:** this report is
committed to the docs branch. There is no code to ship, no branch to merge, and
nothing pending a push.

---

## Retrospective

**What we learned that is not written down.** Before attributing a competitor's
ranking to their SEO, check whether they *own the entity they rank for*. We
spent a sprint item's scoping on "how does a DR 14 site with thin pages beat
us", and the answer was that it is not a publisher at all. The tell was cheap
and we never pulled it: a footer `grep`, and the brand's own Instagram bio
pointing its booking link at the "competitor". **Two minutes of ownership
checking would have re-scoped this item before it was written.**

**What we did twice.** We chose a target without asking who holds position 1 —
*twice in the same item*. The council-hall version was rejected for exactly this
reason, in writing, and the replacement list was adopted without re-running the
check that killed the first one. The rule existed; it was applied to the losing
option and not to the winning one.

**What we nearly shipped, and what caught it.** Eight entity pages carrying a
competitor-operator's undated promotional package prices, presented as venue
capacities and rental rates, on a site whose entire competitive claim is that its
numbers carry sources. **The gate caught it** — and only because the brief gave
the gate the explicit power to kill the item and said "a parked item with a clear
reason is a good outcome here." A softer brief would have produced the pages.

**Which document must change, and who owns the edit.**
**`docs/boardroom/ceo-memory.md`** — owner **ceo-hellokahwin**; edit made below
by me as instructed. The rule "⚠ CHOOSE TARGETS ON SEARCH VOLUME AND SERP
OWNERSHIP" is correct and stays. **Its worked example is wrong.** It ends:

> "The commercial-venue equivalents run 500–2,400/month with no official portal
> above them."

The commercial venues have an operator above them — the operator *is* the site
we called the incumbent. The rule warned "an official operator portal **or the
brand's own site** usually means no", then exempted the commercial venues from
its own test without checking. That sentence is the direct upstream cause of this
item, and it is what I am correcting.

**Edit applied:** see `docs/boardroom/ceo-memory.md`, Measurement rules — the
example is corrected and a new mechanical check ("resolve the OPERATOR before
you rank a competitor") is added, with this item as the worked case.
