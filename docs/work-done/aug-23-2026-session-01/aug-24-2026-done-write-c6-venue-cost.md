# Done: C6.2 Kos, bajet & checklist perkahwinan — four articles

**Task:** Brief `aug-24-2026-brief-write-c6-venue-cost.md`
**Owner:** writer-inspirasi-vendor-venue · **Date:** 24 Aug 2026
**Session:** aug-23-2026-session-01
**Status:** Four drafts written, humanized, and validated against the real
ingest parser. **Blocked on covers only** — the same gate the eight C2.4
articles sit behind.

---

## The four

All in `docs/plans/aug-23-2026-session-01/drafts/`, pillar P6, cluster C6.2.

| File | Slug | Words | Meta |
|---|---|---|---|
| `C6-2-A1-harga-sewa-dewan-kahwin.md` | `harga-sewa-dewan-kahwin` | 1,730 | 145 ch |
| `C6-2-A2-checklist-kahwin.md` | `checklist-kahwin` | 1,086 | 141 ch |
| `C6-2-A3-pakej-dewan-kahwin.md` | `pakej-dewan-kahwin` | 1,008 | 138 ch |
| `C6-2-A4-bajet-kahwin.md` | `bajet-kahwin` | 1,129 | 148 ch |

## Format — validated, not assumed

The brief said the last eight failed on format, so I read the parser rather
than copying a draft. `src/lib/inspire/article-file.ts` does not exist on
`master`; it lives on `ianng89/pillars-ingest-redirects` in
`~/Documents/Code/hellokahwin-site`, which is why it could not be found at the
path the brief gives.

I transcribed `parseArticleFile()` into a checker and ran all four against it.
Every one passes:

- front matter parses, all required keys present
- `metaDescription` under 160 on all four
- `slug` matches `^[a-z0-9][a-z0-9-]*$`, `pillar: P6`, `cluster: C6.2`
- `cover` carries `file`, `alt`, `credit`, `licenseClass: G`, `licensorName`
- **zero image syntax in any body** — the parser refuses inline, reference and
  HTML images, and there are none. No `*[IMEJ N di sini]*` markers either
- every body link and every `internalLinks` entry resolves to a **published**
  article, verified live (HTTP 200 on all five targets)

Checker kept at
`<scratchpad>/check_article.py`; re-runnable against any future draft.

### One field I could not verify

`author: ianng@theweddingnotebook.com`. Ingest resolves author against
`profiles` by id or email, and I have no database access. That address is the
site's own author account in the WordPress export, so it is the best available
guess. **If ingest rejects it, it is a one-word fix** — it is the only field in
the four files not confirmed against a source.

## Covers — specified, not yet generated

`cover` is mandatory and the four PNGs do not exist. I did not invent a
filename shape: `drafts/` already holds `A1-mas-kahwin-ikut-negeri-cover.png`
and `A2-apa-itu-mas-kahwin-cover.png` from the cover generator, so I matched
that convention exactly. The four files ingest needs are:

```
C6-2-A1-harga-sewa-dewan-kahwin-cover.png
C6-2-A2-checklist-kahwin-cover.png
C6-2-A3-pakej-dewan-kahwin-cover.png
C6-2-A4-bajet-kahwin-cover.png
```

**These are `kad-tajuk` title cards, not cost band charts.** The brief suggests
a cost band chart for the cover; §7 of the approved graphic template kit spec
says a cover carries no data, because data fails at the 3.52:1 desktop-hero
crop. The spec wins. Each is 2464 x 700 with a centred 1600 x 700 safe area,
scope line above the Malay title, `Disemak Ogos 2026` at the foot, one brass
rule, `credit: HelloKahwin`, `licenseClass: G`.

Scope line per cover: *Semua majlis perbandaran* (A1), *Dua belas bulan* (A2),
*Dewan Banquet MBPJ* (A3), *Kadar rasmi 2026* (A4). Alt text is already written
into each file's front matter.

**`carta-jalur-kos` (spec §5.6) is now exercised.** The spec deferred it for
want of real P6 cost data; A1 and A4 now carry it. Two in-article charts worth
building later, once the template exists: the MBSJ A-to-E band with capacity
plotted against price (it shows the price/size mismatch in one picture), and
the "RM160 becomes RM860" stack. Both are additions to a published article, not
blockers.

## Every price published, with source and date checked

Every figure below was read from the authority's own document. Nothing came
from a blog, a vendor listing, or an average of two sources.

### MBPJ — `kadar_tempahan_kemudahan_mbpj_tahun_2024.pdf`, linked from the live MBPJ portal. Checked 24 Aug 2026.

Dewan komuniti and balairaya, per six-hour session: RM160 / RM200 / RM240 /
RM250 / RM350 / RM450 tiers, cagaran RM200 to RM350. Kebersihan dan elektrik
RM100 fixed; hawa dingin RM100/jam; Dewan Seksyen 7 splits it as kebersihan
RM100 + elektrik RM50. Dewan Komuniti Bandar Utama 11 and Dewan D'Kelana are
hourly at RM250/jam. Halls listed `TIADA HAWA DINGIN`: Balairaya PJS 6/3B, Kg
Sg Kayu Ara, SS 1/19 Kampung Tunku, Jalan 51A/227, Dewan Komuniti Taman Dato
Harun. Public holidays: double.

Dewan Banquet, Dewan Sivik: minimum 4-hour session RM5,000, each extra hour
RM1,000, cagaran RM2,000 cash or bank draft. Package: 500 banquet chairs (no
covers), 50 round tables (no cloths), PA, air-con, 2 mics, standby technician.
Extras: chair RM6, round table RM10, 3'x6' table RM5, mic RM50, projector
RM400, guest room RM200, rostrum RM50, LED RM800. Persiapan RM300/jam without
air-con, RM600/jam with. Caterer rules quoted verbatim in A3.

### MBDK Klang — two matching PDFs (Mar 2024 and Dec 2024) on mbdk.gov.my; deposit table stamped `DIKEMASKINI 27/1/2023`. Checked 24 Aug 2026.

Majlis perkahwinan, per hour: RM60 (Taman Bunga Melor), RM80 (Kg Jawa, Jalan
Batu Nilam 15), RM92 (Berkeley, Pelabuhan Klang, Pendamar Indah 2, Batu Nilam
34), RM115 (Sungai Pinang, Kompleks Sukan Pandamaran, Seri Kerayong), RM120
(Eng Ann, Ambang Botanik 2, Sentosa, Parklands, Telok Gedung Indah, Kg
Pendamar, Kg Kuantan, Klang Jaya, Jalan Palma Raja, Kg Raja Uda, Pangsapuri
Arista), RM170 (Pandamaran Jaya, Meru, Teluk Pulai, Kampung Idaman, Bandar
Sultan Suleiman, Bukit Tinggi 2), RM200 (Ahmad Razali). Dewan Hamzah RM1,750/1
jam, RM3,450/6 jam, RM7,500/10 jam, air-con included.

Persiapan RM23/jam, penghawa dingin RM60/jam, sampah RM100/hari. Cagaran
(excluding Hamzah): dewan RM200–300, kebersihan RM150 (weddings only),
keselamatan RM150, peralatan RM200. Hamzah: kebersihan RM1,500, keselamatan
RM1,500, pematuhan masa RM1,750. Dewan Sukan Klang (Sri Andalas) outsourced to
a private company since 1 Oct 2021.

**Note on method.** The Klang columns are ambiguous in flat PDF text
extraction — a naive read makes weekend weddings look cheaper than weekday
ones. I resolved the columns by word x-coordinate and then confirmed the
reading against the second, independently laid-out December PDF. The wedding
column is a single rate; the Isnin-Jumaat / Sabtu-Ahad pair belongs to
seminar/sukan/mesyuarat.

### MBSJ — `Senarai Dewan Serbaguna Mbsj 23022024.pdf` on mbsj.gov.my. Checked 24 Aug 2026.

Per 8-hour wedding session, weekday / public holiday, then 6-hour persiapan
weekday: A RM3,200 / RM3,600 / RM800 · B RM2,400 / RM2,800 / RM600 · C RM1,440
/ RM2,000 / RM360 · D RM1,200 / RM1,760 / RM300 · E RM880 / RM1,440 / RM220.
Cagaran 50% of total booking. Pakej siaraya RM500 / 4 jam.

Capacities and facilities from the same document: USJ 7 774 m², ~500 people,
**kipas** (not air-con), VIP room, 3 badminton courts. Putra Permai 4,152.5 m²,
~700 people, category C. Laman Puteri 3 lists penghawa dingin at category D.
Every MBSJ hall in the list has a badminton court.

### MP Sepang — mpsepang.gov.my public facilities and rental rates. Checked 24 Aug 2026.

Dewan orang ramai RM40/jam without air-con, RM80/jam with; cagaran RM200
(RM500 at Bandar Baru Salak Tinggi). Auditorium Taman Tasik Cyberpark RM300/day,
cagaran RM1,000. **Page states effective 1 July 2016** — published in the
article with that date attached, because a ten-year-old rate card is a fact
about the source, not a current price.

### JAIS — soalan lazim, jais.gov.my. Checked 24 Aug 2026.

KPPI Selangor **RM100**, "merangkumi makan minum dan alat tulis."

A web search summary offered RM80 for the same fee. Fetching the JAIS page
itself returned RM100. The RM80 was discarded.

### Arithmetic, labelled as ours

Three computations over sourced inputs, stated in-article as workings, not as
quoted rates: MBPJ RM160 + RM100 + (RM100 x 6) = RM860; MBSJ USJ 7 RM3,200 +
RM800 = RM4,000 with 50% cagaran = RM2,000; MBPJ Dewan Banquet six-hour
air-conditioned setup 6 x RM600 = RM3,600.

## What I could not source, and therefore left out

- **DBKL hall rates.** dbkl.gov.my publishes 20 halls with names, addresses and
  phone numbers and no rates at all; everything sits behind Tempah@KL. Stated
  as an absence in A1 rather than estimated. This matches what the venue-gap
  memo found.
- **MBSA Shah Alam rates.** The MBSA booking page carries procedure and SOPs,
  no rate card. The RM3,800 Dewan Kenanga figure in circulation traces to
  blogs, some dated 2015. **Not published.** This is directly relevant to the
  existing `/dewan-kahwin/` page, which carries a Dewan Kenanga MBSA figure
  with no authority named.
- **MPKj Kajang rates.** The council's rental page 404s. `dewan kahwin kajang`
  is 60/mo with no map pack and would be a good article; it needs a live
  browser session or a phone call first.
- **Catering, pelamin, photography, baju.** No governing rate schedule exists.
  Rather than copy blog figures, A2 and A4 say so explicitly and tell the
  reader to get three written quotes. That refusal is the differentiator: it is
  the one thing every competitor page on `kos kahwin` gets wrong.
- **Capacity for MBPJ and Klang halls.** Neither council publishes capacity
  alongside rates. Only MBSJ does, so only MBSJ capacities appear.

## Where live SERP evidence overrode the launch plan

Ahrefs was reachable from this session (country `my`, pulled 24 Aug 2026),
contrary to the memo's note that subagents have no access. Five overrides:

1. **`kos kahwin` is 20/mo, not a head term.** The launch plan calls it "the
   money question of the entire category." Its parent topic is `budget kahwin`.
   A4 targets `bajet kahwin` (60/mo, its own parent topic) with `kos kahwin` as
   a secondary. The plan's framing survives; its head keyword does not.
2. **`pakej perkahwinan` (100/mo) carries a `local_pack`.** The launch plan
   lists it as a C6.2 supporting keyword. It is a map-pack term and by the
   brief's own criterion not worth writing for. A3 targets `pakej kahwin dewan`
   (40), `pakej dewan kahwin` (20) and `pakej dewan kahwin shah alam` (40),
   which carry no SERP features at all.
3. **`checklist kahwin` is the largest no-map-pack term in the cluster by a
   factor of four.** 800/mo, KD 0, cps 1.5, features are image + video only. No
   map, no AI Overview. With its tail (`checklist kahwin excel` 70, `pdf free
   download` 60, `pdf` 40, `kahwin checklist` 40, `template` 30, `persediaan
   kahwin` 30 and others) the family is ~1,200/mo, against 970/mo for the
   entire price group the memo identified. The brief is titled "the price
   cluster"; its stated selection rule is no map pack. On that rule this term
   cannot be skipped, so A2 is a checklist rather than a price piece, and I am
   flagging the tension rather than hiding it.
4. **The `bajet kahwin` family carries an AI Overview on nearly every term**
   (`bajet kahwin`, `kahwin bajet`, `bajet untuk kahwin`, `bajet kahwin 5k`,
   `persediaan sebelum kahwin`, `checklist sebelum kahwin`). No map pack, so it
   is still winnable, but expect suppressed CTR. `bajet kenduri kahwin 500
   orang` (30/mo) and `bajet kahwin 10k` are clean and A4 covers both angles.
5. **Several launch-plan-adjacent terms are zero volume:** `kos majlis
   perkahwinan`, `kos kenduri kahwin`, `senarai persediaan kahwin`, `bajet
   kahwin 20k`, `kos kahwin di malaysia`. None targeted.

## One thing I deliberately did not write

**`dewan kahwin murah` (30/mo).** It has no map pack and fits the cluster, but
`/dewan-kahwin/` is already titled *"10 Dewan Kahwin Murah di Selangor & KL –
Sesuai untuk Bajet Bawah RM5,000"* and holds position 9.4 with 5 of 8 site
clicks. Writing a second page on that phrase is textbook cannibalisation of the
site's strongest asset. A1 links to it instead.

## Recommendation on `/dewan-kahwin/`

**Not editing it in this brief. This is the recommendation the brief asked for.**

### 1. What the page should become

**The shortlist page and the cluster hub. Not the rate reference.**

This is a partial override of the venue-gap memo, and I want it on the record
rather than buried. The memo recommends rebuilding `/dewan-kahwin/` "around
cost, not around ten buildings" and pointing it at the 970/mo price cluster.
That was the right call **when no price article existed.** A1 now does that job
at 1,730 words against four councils' own fee schedules, which is deeper than a
listicle rebuild would ever have gone. Pointing both pages at `harga sewa dewan
kahwin` would set our best-ranking URL against our best-sourced one.

So the split is by **question**, not by quality:

- `/dewan-kahwin/` answers *which hall should I look at.*
- A1 answers *what does a hall cost.*

**Terms `/dewan-kahwin/` should own** (all no-map-pack, all already its natural
intent): `dewan kahwin murah` (30), `dewan untuk majlis perkahwinan` (50, cps
1.0), `dewan kenduri kahwin` (40), `dewan kahwin kuala lumpur` (40), `dewan
kahwin petaling jaya` (30), plus the long-tail it already converts on (`dewan
kahwin kl`, `dewan kahwin selangor`, `dewan kahwin murah kl`, `sewa dewan murah
kl`).

**A correction to my own earlier assignment.** In my first report I counted
`dewan untuk majlis perkahwinan` and `dewan kenduri kahwin` (90/mo combined)
inside A1's family. That was wrong: both are "which hall" queries and belong to
`/dewan-kahwin/`. A1's real family is the four rate terms — `harga sewa dewan
kahwin` (80), `sewa dewan` (70), `harga dewan kahwin` (50), `sewa dewan kahwin
near me` (30) = 230/mo.

**Terms `/dewan-kahwin/` should stop competing for**, and hand down by link:
`harga sewa dewan kahwin`, `harga dewan kahwin`, `sewa dewan` (to A1);
`pakej dewan kahwin`, `pakej kahwin dewan` (to A3); `bajet kahwin`, `kos kahwin`
(to A4); `checklist kahwin` (to A2).

**Sequence this, do not swap it in one move.** The page holds position 1 on
`harga sewa dewan kahwin` today. Publish A1 first, let it establish, and only
then thin the page's price framing. Dropping a live position 1 before its
replacement ranks is the one way this recommendation loses clicks instead of
gaining them. The title does not need to change for this (see §4).

### 2. The link graph

Already written into the four drafts and verified live:

- A1 → `/dewan-kahwin/`, anchor **"dewan kahwin murah"** — supporting
- A4 → `/dewan-kahwin/`, anchor **"dewan kahwin murah"** — supporting
- A1, A2, A3 → `/sewa-dewan-kahwin`, anchor "checklist sewa dewan kahwin"
- A3 → `/majlis-kahwin`, anchor "lokasi majlis kahwin di Shah Alam"
- A2 → `/kursus-kahwin`, `/hantaran-kahwin` · A4 → `/kursus-kahwin`, `/goodies-kahwin`

To add **to `/dewan-kahwin/` once A1, A3 and A4 are published** (the parser
refuses links to unpublished articles, so these cannot be written yet):

- `/dewan-kahwin/` → A1, anchor **"harga sewa dewan kahwin"** — the load-bearing
  one. This is the link that tells Google which page owns the rate term.
- `/dewan-kahwin/` → A3, anchor "pakej dewan kahwin"
- `/dewan-kahwin/` → A4, anchor "bajet kahwin"

**Do not link `/dewan-kahwin/` → A2.** A checklist link bleeds a reader with
commercial shortlist intent into a planning article. Keep the hub commercial.
A2 reaches this cluster through `/sewa-dewan-kahwin` instead.

**The one link that would cannibalise.** The A1 → `/dewan-kahwin/` anchor must
stay a *shortlist* phrase. If a future editor changes it to "harga sewa dewan
kahwin" to look more relevant, the two pages start pointing price intent at each
other and neither wins the term. Same rule for A4's anchor.

**Load note:** three of the four link to `/sewa-dewan-kahwin`, making it the
most-linked existing asset on the site. Worth confirming it is good enough to
carry that before publish, since it will now receive most of the cluster's
internal equity.

### 3. The Dewan Kenanga MBSA figure

**Cut the figure. Keep the hall.**

MBSA publishes no rate card. Its booking page carries procedure and SOPs and no
prices, and I confirmed that directly (24 Aug 2026). The circulating RM3,800
traces to blogs, one dated 2015. There is no second source to cross-check
against, so it cannot be corrected — only removed.

Replace it with what we can stand behind: the hall name, and the booking route
(Jabatan Penilaian & Pengurusan Harta, Wisma MBSA), plus a plain line that MBSA
does not publish rates. **Do not substitute another number**, including any
figure lifted from A3, which says the same thing for the same reason.

This is not an isolated defect. The memo found **ten ringgit figures on that
page, RM2,500 to RM4,000, with no authority named against any of them.** A1 now
supplies sourced, dated replacements for the MBPJ, MBSJ, Klang and Sepang halls,
so most of those ten can be fixed rather than cut. The DBKL and MBSA entries
cannot, and should lose their figures.

### 4. What a future editor must not break

1. **The URL.** `/dewan-kahwin/` resolves in one hop to
   `/artikel/idea-dan-nasihat/dewan-kahwin`, HTTP 200 (verified 24 Aug 2026).
   Changing the slug discards the ranking history on the site's strongest page.
2. **The "Dewan" token in the title.** The memo demonstrated with two
   independent sources that we hold an organic listing on the query variant
   carrying that token and none on the variant that does not. Add "Pusat
   Komuniti" alongside it; never remove "Dewan".
3. **`Murah` and `Bajet Bawah RM5,000`.** These are the likeliest reason the
   page holds price rankings at all, and they remain correct for a shortlist
   page. The retarget in §1 is a body and internal-linking change, not a retitle.
4. **The ten hall names.** They are what earns page-one presence on those hall
   names at a cost of one paragraph each. Keep them as evidence for the price
   bands. Removing them to "focus the page" would throw away the impressions
   the page is built on.
5. **Image credits, owner-level rule.** The memo records three entries with no
   credit (#3 Dewan Sivik MBPJ, #4 Dewan Kenanga MBSA, #8 Dewan Warisan Kampung
   Melayu Subang) and one wrong credit (#9 Dewan Seri Melati Gombak credited to
   Perbadanan Putrajaya, which runs no hall in Gombak). Any pass that touches
   this page must fix these; the page fails QC on this alone, independently of
   any SEO argument.
6. **Heading #10 names the wrong hall** (heading says Dewan MBSA Seksyen 7, body
   describes Dewan Lavender Seksyen 7). Two buildings, one entry.
7. **The date stamp.** Currently 14 December 2025 while quoting 2026 prices. Any
   rate that survives the pass needs its authority and check date attached, and
   the page needs an annual refresh booked at publish (doctrine rule 18).

**One number I am not adjudicating.** The brief cites 132 impressions and 5 of 8
clicks; the memo's 28-day pull gives 996 impressions and 28 clicks at 2.81%; the
launch plan says 25 of 32 clicks. Different windows and scopes. They agree on
the only two things this recommendation rests on: position ~9.4, and this page
is the largest single source of clicks on the site.

## Cadence

Four articles against a three-per-week cadence, in one session, all sourced to
primary documents. No filler was shipped to hit the number.
