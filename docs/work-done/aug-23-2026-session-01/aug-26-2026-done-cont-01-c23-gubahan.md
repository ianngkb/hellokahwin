# Done: CONT-01, cluster C2.3 — gubahan & dulang hantaran

**Task:** Brief `docs/plans/aug-23-2026-session-01/aug-25-2026-brief-cont-01-c23-gubahan.md`
**Owner:** `writer-inspirasi-vendor-venue` · **Date:** 26 Ogos 2026 · Sprint 01, CONT-01, 3 points
**Status:** Complete to Stage 9. Three drafts are **ready to ingest**. Nothing was
published, no production database was touched. Publishing stays gated on RISK-01.

---

## 1. Where the content is

Three ingest-ready Markdown files with real YAML front matter, in the house format
that the 28 live articles use:

| File | Slug | Title |
|---|---|---|
| `docs/plans/aug-23-2026-session-01/drafts/ingest/C2-3-A1-dulang-hantaran.md` | `dulang-hantaran` | Dulang hantaran: jenis, saiz dan kos beli atau sewa |
| `docs/plans/aug-23-2026-session-01/drafts/ingest/C2-3-A2-gubahan-hantaran.md` | `gubahan-hantaran` | Gubahan hantaran: cara susun dan cara baca sebut harga |
| `docs/plans/aug-23-2026-session-01/drafts/ingest/C2-3-A3-sirih-junjung.md` | `sirih-junjung` | Sirih junjung: maksud, cara dibuat dan harganya 2026 |

All three carry `pillar: P2`, `cluster: C2.3`, so they land under
`/artikel/hantaran-mas-kahwin/{slug}`.

Seven new image files, in `docs/plans/aug-23-2026-session-01/drafts/images/`:

```
S-pertunangan-zeeana-mohd-nasir.jpg            4144x3096
S-pertunangan-zeeana-shopedah-mohd-nasir.jpg   4752x3168
S-sirih-junjung-mohd-nasir.jpg                 4752x3168
S-sirih-junjung-salwa-hamzah.jpg               1536x2048
S-hantaran-masjid-tetamu-mylifestory.jpg       1536x2048
S-dulang-berkaki-hiasan-farritz.jpg            1527x2264
S-tepak-sirih-muzium-negara-marcin-konsek.jpg  4317x3053
```

Register rows `HK-P-0055` to `HK-P-0061` in
`docs/asset-register/asset-register.csv`, plus three existing rows patched at
`digunakan_dalam` (`HK-P-0009`, `HK-P-0010`, `HK-P-0037`). The diff against the
pre-run file is exactly 13 lines: 7 added, 3 edited.

---

## 2. Images: 3 covers, 9 supporting placements, 10 distinct files

Every cover is a licensed photograph of Malaysian Malay people in a Malay wedding
context. No text card appears anywhere, on a cover or in a body.

| Article | Cover | Licence | Supporting images |
|---|---|---|---|
| `dulang-hantaran` | `S-pertunangan-zeeana-mohd-nasir.jpg` | S, CC BY 2.0 | 3 |
| `gubahan-hantaran` | `S-serah-hantaran-akad-mylifestory.jpg` | S, CC BY 2.0 | 3 |
| `sirih-junjung` | `S-pertunangan-zeeana-shopedah-mohd-nasir.jpg` | S, CC BY 2.0 | 3 |

All 12 declarations are `licenseClass: S`. Nine are CC BY 2.0 from Flickr, one is
CC BY-SA 4.0 from Wikimedia Commons, and two are Pexels Licence images already in
the library. **Zero CC BY-NC and zero CC BY-ND** — both were filtered out at the
search stage, not at the review stage, by restricting every Flickr query to
licence ids 4, 5, 7, 9 and 10.

Every image carries Malay alt text written for someone who cannot see it, a
caption that teaches rather than describes, and `credit` + `creditUrl` +
`licensorName` + `licenseClass`.

Verified before handover:

```
# every declared path resolves on disk
python -c "...C2-3-A*.md front matter -> os.path.exists..."   # 12/12 OK
# front matter parses and internalLinks match the body links
python -c "yaml.safe_load(front_matter)"                       # 3/3 OK, MATCH
# every internal link target is live
curl -o /dev/null -w '%{http_code}' https://hellokahwin.com/artikel/<...>  # 5/5 200
```

I could not run `pnpm --silent ingest <file> --db "$DB"`. The `hellokahwin-site`
repo is not checked out anywhere under `C:\Users\Ian Ng\Documents\Code\hellokahwin`,
so `src/lib/inspire/article-file.ts` was not readable from this machine. **The
handover gate in Stage 6b is therefore not closed**, and whoever ingests must run
the dry run first. See the retrospective.

### The sourcing finding

Wikimedia Commons still returns nothing usable for Malaysian hantaran. Searches
for `hantaran`, `dulang hantaran`, `sirih junjung`, `gubahan hantaran` and
`pahar sirih` on 26 Ogos 2026 returned either zero results, one Indonesian result,
or unrelated files. `hantaran` matched English "post" pages. This repeats the
25 Ogos finding rather than contradicting it.

**Flickr broke the deadlock this time**, and it is a source the previous run did
not sweep systematically. Restricting the search to CC BY, CC BY-SA, CC0, PDM and
"no known restrictions" produced the only full-resolution Malaysian sirih junjung
photograph found anywhere: 4752x3168, from a 2009 engagement in a photographer's
own stream, with the arrangement in sharp focus. Its cover companion comes from
the same event by the same photographer.

Two candidate sets were downloaded, looked at, and **rejected**:

- **Mueaz Photography**, 13 CC BY 2.0 frames from a Malay engagement. Every frame
  carries a burnt-in `www.MueazPhotography.com` watermark. The licence permits
  use; the watermark makes the page look like the studio's, and cropping it out
  would strip an attribution notice the photographer placed in the work itself.
- **Fuzuri Design**, a CC BY 2.0 engagement set from Labis, Johor, including one
  frame of a bride-to-be seated beside her hantaran table. Maximum published size
  is 800x543. Too small for a cover, and marginal in-article. One frame in the
  set is a typographic title card, which the owner directive rules out outright.

---

## 3. How the pricing problem was handled

Gubahan pricing behaves differently in each of the three articles, so each one
gets a different treatment. Style guide §7.1a governs all three.

### `dulang-hantaran`: a real market range, from three named shops

Dulang are physical goods with public catalogues, so a range is defensible.
Three suppliers, each checked at its own site on 26 Ogos 2026, each with a 2026
copyright line and live stock states:

- **JV Craft & Gifts Sdn Bhd**, Setia Alam, Selangor. Search "dulang hantaran"
  at limit 100 returned *"Showing 1 to 99 of 99"*. 45 of the 99 are trays or tray
  sets; 39 of the 45 show a single price; 6 are size-variant listings that display
  RM0.00 until a size is chosen. That last detail is in the article, because it is
  a thing that wastes a reader's evening.
- **KYK Sayang**, GK Marvellous Sdn Bhd. Collection *Wedding Tray Dulang*, 20
  products, 7 of them plain trays.
- **Sarang Hae Yo**, Trendymax (M) Sdn Bhd (583246-A). Collection *Dulang
  Hantaran*, 33 products, 8 out of stock, almost every one showing a struck-through
  list price.

Published range: **RM2.30 to RM380.00** for one empty tray. Both figures, the
result counts and the struck-through originals are in the article.

Rental was the harder half. Almost every provider quotes by private message. One
does not: **Rimbun Serai**, two kiosks in Shah Alam, publishes the full ladder —
RM45 for one tray, RM225 for five plus RM200 cagaran, RM315 for seven plus RM280,
RM405 for nine plus RM360, with the upfront and refunded amounts spelled out. The
article carries that table, and it carries the two traps on that page: the RM50.00
shown large is a **booking deposit and not the rental price**, and the shop's own
summary page says RM35 to RM60 per tray where its product page computes RM45 flat.
Two numbers from one shop is exactly the case the reader needs to be told to get
in writing.

### `gubahan-hantaran`: the honest negative, and the better article

**No supplier checked publishes a per-tray labour rate for arranging trays.** Not
JV Craft, not KYK Sayang, not Sarang Hae Yo, not Rimbun Serai. Every rate
circulating online traces back to a social-media post or a private message, none
of which can be dated to a published price list. None of those numbers is in the
article, and the article says so in plain terms.

What is publishable instead, and what the article does:

1. **Materials, priced to the sen**, because they are catalogue goods: non-woven
   alas RM4.00 for four trays, gabus siap balut RM10.90, renda kedut RM2.20 to
   RM3.30 a metre, rantai manik RM5.90 an ela, artificial flowers RM3.10 to
   RM14.50, dried flowers RM16.00 to RM38.50. Roughly **RM24.30 per tray** in
   materials, before the tray and before the contents.
2. **Finished-goods prices**, labelled as finished-goods prices and explicitly not
   used as a proxy for labour: JV Craft's 5-tray siap gubah set at RM149.50 from a
   RM170.00 list, which is RM29.90 a tray including the tray; Rimbun Serai's eight
   gubahan bakul at RM100.00 to RM300.00; Sarang Hae Yo's ready-made sirih junjung
   at RM39.92 from RM80.00.
3. **Five things a written quotation must answer**, which is the section that
   actually helps: whether the tray is included, the per-tray rate behind the set
   price, fresh versus artificial flowers, who buys the contents, and the delivery
   arrangement. Plus one test that closes most of it: ask the price for **one**
   tray, not for a set.

### `sirih-junjung`: published where it exists, withheld where it does not

Ready-made artificial sirih junjung is a catalogue good and is priced: KYK Sayang
lists 11 of them at **RM23.50 to RM50.00**, two out of stock; Sarang Hae Yo lists
two at RM39.00 and RM39.92 against RM49.90 and RM80.00 list prices. The article
carries both rows with counts, stock states and struck-through originals.

**No figure is published for a fresh-leaf sirih junjung**, because none could be
found on a dated price list anywhere. The article says why that is not a gap in
the reporting: Perpustakaan Negara Malaysia records that one arrangement takes 100
or more fresh sirih Melayu leaves, pinned one at a time, and fresh leaves wilt in a
day or two. A thing made to order the night before does not have a shelf price.

### The source nobody in this SERP is using

`sirih-junjung` rests on two authorities rather than on wedding blogs:

- **Perpustakaan Negara Malaysia**, *Sirih Pinang: Simbol Budaya Melayu*, edisi
  2001 — a dedicated Sirih Junjung page giving the 100-leaf figure, the materials
  (gabus as the tower, dawai, jarum penyemat, lidi), the forms, the role at the
  head of a procession, the "not fewer than 10 pahar" figure for state ceremonies,
  and the Kelantan coronation processions. Its Pengertian page gives the meaning
  of all five bersirih ingredients, which is the article's table.
- **Kamus Dewan Edisi Keempat** via PRPM, Dewan Bahasa dan Pustaka — `junjung II`
  is the pole that supports a climbing plant "seperti sirih", with `junjung sirih`
  as the dictionary's own example. The article also reports the negative finding
  that **`sirih junjung` is not a headword in the current dictionary**, and quotes
  the pantun in DBP's corpus that ties the phrase to meminang.

A 2001 National Library reference is old, and §7.1a does not touch it: that rule
governs price sources, where staleness makes a figure wrong. The meaning of sirih
in adat does not expire. Every use is dated in the source note so a reader can see
exactly how old the record is.

---

## 4. Internal links

Taken from the live sitemap on 26 Ogos 2026, never from drafts. Every target
returns HTTP 200. The three new articles do **not** link to each other, because
none of them is live yet and the ingest resolves link targets against the real
database.

| Article | Links out to |
|---|---|
| `dulang-hantaran` | `hiasan-dekorasi/hantaran-kahwin`, `hiasan-dekorasi/hantaran-tunang`, `pelamin-kad-cenderahati/bunga-telur`, `venue-perancangan/bajet-kahwin` |
| `gubahan-hantaran` | `hiasan-dekorasi/hantaran-kahwin`, `hiasan-dekorasi/hantaran-tunang`, `venue-perancangan/bajet-kahwin` |
| `sirih-junjung` | `hiasan-dekorasi/hantaran-tunang`, `pelamin-kad-cenderahati/bunga-telur`, `sebelum-nikah/doa-majlis-pertunangan` |

`internalLinks` in the front matter now matches the links in the body exactly, in
all three files. It did not, on first draft, in two of them.

**Once these three are live**, the obvious follow-up edits are: link
`bunga-telur` back to `sirih-junjung` (both sit on a pahar, and the live article
already explains kaki pahar), and link `hantaran-kahwin` to `dulang-hantaran`.
Both are one-line edits to live files and belong to whoever runs the next
reparenting pass.

---

## 5. The Editorial Review Board, and what it changed

Run in session against the three seats' documented criteria: the chair's S1–S17
checklist from the style guide, the Verification Lead's price and claim gate from
§7.1a and §14, and the SEO seat's coverage and intent test. It was **not** run as
a `/bmad-party-mode` room — I am a single dispatched agent and my instructions
forbid me spawning others. That is a real departure from the workflow and it is
named in the retrospective rather than buried here.

**The Verification Lead's block, and it was right.** `dulang-hantaran` opened with
*"Dulang cermin dan besi naik sehingga RM299.00 sekeping"* and closed the pricing
section with *"RM2.30 hingga RM299.00"*, while its own table two paragraphs up said
JV Craft's dearest tray was **RM380.00**. The article contradicted itself inside
one screen. Both figures corrected to RM380.00, and the comparison sentence
rewritten, because a RM299.00 three-tier renjis tray is not the same object as a
RM380.00 mirror tray.

Everything else the board changed:

| Seat | Finding | Fix |
|---|---|---|
| Verification | Discount depth understated as "sehingga 50 peratus"; one Sarang Hae Yo product is 75% off | Corrected, with the second worked example added |
| Verification | "Dulang kayu **berukir**" attached to the RM8.85 product, which does not say so | Moved "berukir" to the pallet tray, whose listing does |
| Verification | RM9.90 PVC box quoted without its out-of-stock state | State added |
| Verification | KYK row counted 20 products as if all were trays; 7 are | Row now says "20 produk, 7 daripadanya dulang kosong" |
| Verification | Sarang Hae Yo max quoted as RM299.00 with no note that it is out of stock | In-stock ceiling RM70.22 added alongside |
| Verification | Museum caption asserted what four **closed** cembul contain | Rewritten to state the recorded arrangement, not the object's contents |
| Verification | Alt text called the engraved medallion "tulisan Jawi" and the blade a "kacip" | Both described by what is visible, not named |
| Verification | `sirih-junjung` cover caption claimed the arrangement is built tall *because* it is seen first | Replaced with the sourced claim: it heads the procession |
| Verification | `dulang-hantaran` cover alt called a blur at frame right "gubahan hantaran" | Softened to "sebahagian hiasan majlis" |
| Verification | "jenis perangkap yang sama di banyak laman sewaan" — an unsourced generalisation | Clause cut |
| Chair (S10) | Two FAQ answers ran to four sentences; seven of twelve fell below the 40-word floor | All twelve now 40–49 words, 2–3 sentences |
| Chair (S13) | `Kesimpulan`, `yang mana`, one decorative `anda` | All three removed |
| Chair (S2) | Three sentences over 30 words | Split |
| SEO | `internalLinks` in A2 and A3 declared targets the bodies never linked | Reconciled |

**S15, the required cut.** One per article, and all three shipped without them:

- `dulang-hantaran`: the clause *"dan sama ada ia boleh dicuci selepas majlis"* —
  raised as a difference between tray types and then never mentioned again.
- `gubahan-hantaran`: the closing line *"Kesimpulan praktikalnya menyenangkan
  hati"* — a summary of four points the reader had just read, cut entirely rather
  than reworded.
- `sirih-junjung`: a second sentence contrasting humility with extravagance,
  which editorialised past what Perpustakaan Negara actually records. Folded into
  one clause.

**S12, the warmth test.** Each article names a real awkward moment and answers it.
`dulang-hantaran`: a shop quoting two different per-tray prices on two of its own
pages. `gubahan-hantaran`: being handed a lump-sum "set hantaran" figure with no
way to compare it. `sirih-junjung`: choosing between the adat and the schedule
when fresh leaves last a day.

**S16, `/humanizer`.** Run after revision, never before. It took out four "here is
what comes next" announcements, a self-congratulatory *"dan itu jawapan yang
jujur"*, three "the real question is" reveals, the four-bold-label rhythm in
`gubahan-hantaran`, an en dash used as an empty-cell marker, and three sentence-level
bold spans. Front matter was left untouched, and `metaDescription` was recounted
afterwards: 136, 135 and 142 characters against a 155 editorial target and a 160
schema ceiling.

It took two passes on `gubahan-hantaran`. The first replaced four bold labels with
four paragraphs all opening "Yang pertama / kedua / ketiga / keempat", which trades
one mechanical rhythm for another and is the same defect under a different name.
The second pass varied them properly. A humanizer pass needs its own read-back.

**SEO coverage, and the gap.** Head terms `dulang hantaran` (3,600), `gubahan
hantaran` (1,200) and `sirih junjung hantaran` (150) each own one article with a
distinct H1 and no shared head term, so there is no cannibalisation between them.
Supporting terms covered: `dulang hantaran kahwin`, `kotak hantaran`, `gubahan
hantaran simple tapi cantik` by intent. **Not covered, and still open in C2.3:**
`hantaran coklat` (450) and `hidden hantaran` (350). Both are separate commissions
in the approved eight-topic list, and neither was padded into these three.

---

## Retrospective

### What we learned that is not written down anywhere

**Flickr, filtered by licence id, is the strongest source we have for Malaysian
Malay wedding photography, and no document says so.** The 25 Ogos sourcing run
concluded that "Malaysian Malay wedding photography barely exists under an open
licence" after sweeping Wikimedia Commons and Pexels. That conclusion is right
about Commons and it is wrong in general. Flickr's search takes
`?text=<query>&license=4,5,7,9,10`, which is exactly CC BY, CC BY-SA, no-known-restrictions,
CC0 and PDM, and it excludes every NC and ND licence before a human ever looks.
Malay-language queries against that filter returned usable frames for `hantaran`,
`sirih junjung`, `majlis pertunangan`, `akad nikah`, `kenduri kahwin` and
`berinai`. It is a deep seam of mid-2000s to early-2010s Malaysian wedding
photography that nobody had swept.

Two things about it are worth carrying forward. Published size is capped at
1024px in the search JSON but the originals are often far larger, so size must be
read from the photo page and not from the result list. And a watermark is a
disqualifier that only shows up once the file is on disk, which is the second
independent argument for the download-and-look rule.

### Which document must change, and who owns the edit

**`docs/plans/aug-23-2026-session-01/aug-23-2026-workflow-content-production.md`,
Stage 6b, owned by `managing-editor`.** Two things in that stage are now wrong.

First, its source list reads "Wikimedia Commons first for Malay cultural subject
matter, then Unsplash, Pexels, Pixabay, Openverse." Flickr is not on it, and
Flickr is where the only Malaysian sirih junjung photograph in existence under an
open licence turned out to be. Openverse is on it and no longer usable without
credentials: its API returned HTTP 401 on every request on 26 Ogos 2026.

Second, the stage's handover gate is a single `pnpm --silent ingest` command run
from the site worktree, and a writer dispatched into this repo cannot run it. The
site repo is not checked out here. The stage needs to say what a writer does when
the gate is unreachable, instead of leaving each run to improvise a different
answer.

**I have made both edits.** See the diff on that file.

### What we did twice

**Searched Wikimedia Commons for Malaysian hantaran.** The 25 Ogos run did it,
recorded a clear negative in `aug-25-2026-done-source-images-from-web.md`, and I
did the whole sweep again on 26 Ogos and got the same nothing. The negative was
written into a work-done log, which is a record of one run, not a standing
instruction — so the next person searched from scratch. It cost maybe twenty
minutes here. It will cost twenty minutes every time until it lives somewhere a
writer reads before starting. The Stage 6b edit moves it there.

**Re-derived the price checks after midnight.** The supplier fetches straddled
23:50 on 25 Ogos and 00:10 on 26 Ogos. Rather than stamp figures with a date that
was true for half of them, I re-ran every catalogue, every count and every
struck-through price on 26 Ogos so that one date is true for all of them. That
repeat was deliberate and would be right to repeat.

### What we nearly shipped, and what caught it

**A price that contradicted its own table, two paragraphs apart.**
`dulang-hantaran` said RM299.00 was the ceiling in its opening paragraph and in
its summary, and RM380.00 in the table between them. The table was right.

What caught it was not proofreading. It was reconciling every figure in the prose
back against the scrape output, one at a time, as a separate pass with the article
closed. The error is invisible on a read-through because both numbers are
plausible, both are real prices from the same run, and they are far enough apart
that nothing jars. A reader planning against the wrong ceiling would have
underbudgeted by RM81 a tray on the top tier.

The second near-miss was quieter and would have been worse. The Muzium Negara
caption originally stated that the four cembul in that specific tepak hold pinang,
kapur, gambir and tembakau. The cembul are closed. Perpustakaan Negara records
that arrangement as the standard; the photograph shows a lidded box in a display
case. Attaching a sourced general rule to a specific object as though the source
described that object is the exact shape of a fabricated detail, and it survives a
read-through because every individual word in it is true.
