# Done — Editorial Verification Lead — the twelve unreviewed P3/P4/P5/P7 articles

**Brief:** `docs/plans/aug-23-2026-session-01/aug-25-2026-brief-verify-p3-p4-p5-p7.md`
**Date:** 25 Ogos 2026 · **Session:** aug-23-2026-session-01
**All sources consulted live on 25 August 2026.** Nothing in this log was verified
from memory.

---

## Verdicts

| Article | Verdict |
|---|---|
| `P3-A1-ucapan-pengantin-baru` | PASS WITH FIXES (1, applied) |
| `P3-A2-doa-pengantin-baru` | PASS WITH FIXES (1, applied) |
| `P3-A3-doa-majlis-perkahwinan` | PASS WITH FIXES (1, applied) |
| `C4-1-A1-baju-pengantin-sewa-atau-beli` | PASS |
| `C4-1-A2-songket-tenunan-tangan-atau-cetak` | PASS WITH FIXES (2, applied) |
| `C4-2-A1-inai-tangan-pengantin` | PASS |
| `C5-1-A1-pelamin` | **BLOCK** |
| `C5-2-A1-contoh-kad-jemputan-kahwin` | PASS WITH FIXES (1, applied) |
| `C5-4-A1-bunga-telur` | **BLOCK** |
| `P7-A1-cincin-tunang` | PASS WITH FIXES (3, applied) |
| `P7-A2-taaruf-maksud` | PASS |
| `P7-A3-doa-majlis-pertunangan` | PASS |

Plus one **batch-level blocker** that applies to all twelve: see §5.

---

## 1. The two blocks

### 1.1 `C5-4-A1-bunga-telur` — the article's headline number is wrong

**Claim:** "Hari ini sekuntum berharga **antara 64 sen dan RM1.58**." Supporting
claims: JV Craft & Gifts lists "12 jenis bunga telur, semuanya dijual dalam kotak
50 kuntum", in three bands RM32–45 / RM60–75 / RM78–79, and "Yang paling mahal
ialah RM79.00 sekotak."

**Verified against:** `jvcraftandgifts.com`, product search `bunga telur`,
`limit=100`, read 25 Ogos 2026. Result header: **"Showing 1 to 49 of 49"**.

**What the source actually shows.** Finished bunga telur sold in boxes of 50 run
from **RM32.00 to RM180.00**, across roughly 34 distinct 50-piece listings, on a
continuous spread: RM32, 42, 45, 60, 62, 72.50, 75, 78, 79, 80, 82.50, 87, 89.50,
90, 93, 93.50, 95, 105, 130, 143, 160, 180. There is no three-band structure and
no RM79 ceiling. The most expensive 50-piece box is **RM180.00**, *50pcs/box
Bunga Telur Hyrangea Dengan Net*.

**Consequence.** The true per-stem range from this same supplier is **64 sen to
RM3.60**, not 64 sen to RM1.58. The wrong figure is load-bearing: it appears in
the opening sentence, the `metaDescription`, the `excerpt`, the price table, and
the alt text of the `C5-4-A1-bunga-telur-jalur-kos.png` graphic spec.

**Confirmed correct in the same section, and worth keeping:** the RM32.00 floor
(two products, JV 4423 and JV 13109); the RM79.00 net-sleeved item (JV 2852,
8cm x 33cm, five colours — note JV 18502 is near-identical at RM95.00 and easy to
confuse); the RM6.90 kaki pahar 50-lubang, code 5018, 25cm; and the free-delivery
threshold "Free Delivery in Klang Valley with min. RM200.00 Purchase".

**What unblocks it.** Re-derive the per-stem range from the full 49-result
catalogue, correct every place the old figure appears, and add that several
listed prices are promotional (the kaki pahar shows RM6.90 from RM9.90; many
bunga telur listings carry a struck-through original).

**Not re-verified, because the article is blocked anyway:** the UiTM study by
Zalina Husain, the Wikipedia BM / UPM textual-overlap claim, and the Hindu-origin
dating. These need checking when the article comes back.

### 1.2 `C5-1-A1-pelamin` — a 2026 price article built on a blog dormant since 2014

**Two problems, either sufficient on its own.**

**(a) Currency.** Six of the eight rows in the price table, and the RM450 and
RM1,000–RM3,000 figures repeated in the running prose, come from
`surayarahman.blogspot.com/p/pakej-pakej-kami.html`. Every figure is genuinely on
that page — RM1250, RM450, "BERMULA DARI RM3,500", RM5,500, "RM1,000 - RM3,000",
"Pintu Gerbang Standard = RM 100" — and I confirmed each. But the blog's own
archive ends at **May 2014**. The article discloses that the list carries no
update date; it does not disclose that the source has been dormant for about
twelve years. In an article titled "Pelamin **2026**", that gap is the difference
between a caveat and a misdirection.

**(b) The headline figure is wrong on the article's own source.** The article
opens "harganya bermula sekitar **RM550** untuk pelamin mini di rumah", and the
table repeats "Mini pelamin rumah, 10 kaki | RM550". The cited listing —
`mymallmalaysia.my/product/pelamin-mini-package-a`, seller `raisya_pelaminmini`,
described "Size Keluasan Pelamin 10 Feet" — sells four variants: **Pakej A
RM450.00**, Pakej B RM550.00, Pakej C RM650.00, Pakej D (Dewan) RM1,000.00.
RM550 is the mid-tier, not the floor.

**(c) Also wrong, smaller.** "Pakej dewan lengkap dengan katering, 300 tetamu |
RM9,900 hingga RM31,900". `gokahwin.my` shows 2026/2027, 300 pax, lowest RM9,900
(Laman Perkahwinan NMR) — but the highest **displayed** price is **RM29,900**
(SkyGlass Designer Event Hall). RM31,900 is the pre-discount price. The FAQ
repeats the range.

**What unblocks it.** Either drop Suraya Beauty Bridal and rebuild the table from
sources that can be dated, or keep it and say plainly in the table that these are
undated figures from a blog last updated in 2014. Correct the RM550 floor to
RM450, and state which of the two gokahwin numbers is meant.

**Confirmed correct and worth keeping:** the entire PP Signature / The Dulang
30-foot package contents list, dated 20/11/2022, published with no price — I
verified it line by line, including that no price is shown. (Source says "Bantal
Inai"; article says "bantal berinai".)

---

## 2. What the fixes were

All six applied by me, all small and unambiguous, all evidenced above or below.

**`P3-A1`** — cut ", atau menjaga orang sakit" from the list of excuses
attributed to Irsyad Hukum ke-296. The fatwa's list contains "sakit"; it contains
nothing about caring for a sick person. Everything else in that list is verbatim.

**`P3-A2`** — the "Yang mana tuntutan agama" table was headed "kedudukan setiap
satu mengikut Jabatan Mufti Wilayah Persekutuan dalam al-Kafi li al-Fatawi Soalan
186", but two of its four source citations are not in al-Kafi 186. Raudhah
al-Talibin 8:35 is in Irsyad al-Hukum 954; the hadith number 2160 is from Sunan
Abu Daud itself (al-Kafi 186 says only "Riwayat Abu Daud, Ibn Majah dan
lain-lain"). Header and one cell rewritten to attribute each correctly. No claim
changed.

**`P3-A3`** — "Terbitan 2026 menukar kedua-duanya kepada *hendaklah*" was false.
I downloaded all three editions. The 2025 edition already reads "hendaklah" at
6.1 and 6.3; 2026 inherited it. Rewritten to say so, and the surrounding "berubah
secara beransur" framing corrected, since both changes were single-step, just at
different editions.

**`C4-1-A2`** — two fixes. (i) The GI certificate was presented on **19 November
2025**, not 20 November. `trdi.my` is *dated* 20 Nov 2025 and reports the majlis
as "semalam"; the writer took the article's publication date as the event date.
(ii) RM2,800 / RM7,500 / RM11,500 at Sampin Exclusive are **promotional** prices;
the list prices are RM3,500 / RM9,500 / RM15,500. Both now stated.

**`C5-2-A1`** — the Nurfa Grafik paragraph claimed Nurfa "menyiarkan angka pun
tidak menyiarkan kuantitinya". The RM45 homepage claim is exactly right ("Serendah
RM45 sahaja", no quantity anywhere near it). But Nurfa's own ala carte page
publishes a full quantity ladder — 100pcs RM76 (105x148mm) / RM88 (110x182mm),
rising to 2,000pcs RM385 / RM446, three to five working days — and RM45 appears
nowhere on it. The section's thesis was contradicted by the vendor it chose to
illustrate it. Rewritten with the real ladder, which is a better data point than
the original claim.

**`P7-A1`** — three fixes, one of them the most serious finding outside the two
blocks.

*The white gold sentence.* The article read: "Muzakarah itu menyatakan tiada
bahan khusus bernama emas putih; apa yang dikenali sebagai emas putih ialah
campuran beberapa jenis logam termasuk emas kuning, **dan ia boleh dipisahkan
semula**." Three components, three different verdicts:

- "campuran beberapa jenis logam termasuk emas kuning" — **correct, and it is the
  Muzakarah's**. Confirmed in Selangor's Taudhih al-Hukmi #30, which reproduces
  the Muzakarah ke-52 definition in full: "Emas putih terbentuk hasil daripada
  campuran beberapa unsur logam iaitu emas kuning, tembaga, nikel dan zink",
  with a composition table (Emas kuning 18K 56.94%, Tembaga 26.77%, Nikel 11.96%,
  Zink 4.33%).
- "tiada bahan khusus bernama emas putih" — **misattributed**. That is al-Kafi
  #953's own sentence ("Asalnya, tidak ada satu bahan yang dinamakan emas
  putih..."), not the Muzakarah's. The Muzakarah's definition, as reproduced,
  defines white gold positively as a mixture.
- "**boleh dipisahkan semula**" — **not in any source I could reach.** Zero
  occurrences in al-Kafi #953. Zero occurrences of "dipisah" in Taudhih #30. The
  Muzakarah's own record at `e-smaf.islam.gov.my` **refuses connection on both
  port 80 and port 443** (150.242.181.190) and could not be read today, so this
  cannot be closed either way from the primary source.

Rewritten to state only what the Muzakarah decided (haram for men) plus its
verified definition, cited to Mufti Selangor's reproduction, with a source-note
recording that e-SMAF was unreachable.

*Platinum.* "Platinum **tulen** harus" — al-Kafi #953 says "platinum", never
"tulen": "Adapun jika yang dimaksud emas putih adalah platinum, maka tidak
mengapa bagi lelaki untuk memakainya kerana ia tidak mempunyai unsur emas." The
practical advice that follows (ask for the hallmark) is sound and kept.

*Citations.* muftiwp has renamed the series while keeping old URL slugs. The live
pages read "IRSYAD HUKUM SIRI KE-794" and "IRSYAD HUKUM KE-187", not "Irsyad
al-Fatwa". Corrected in body and source list. Also: Irsyad Hukum 794 says
"Mahkamah", not "Mahkamah Syariah" — the article now says the fatwa says
mahkamah, and separately that the enactment's "Mahkamah" is the Syariah Court it
defines.

All inserted prose passed `/humanizer`; three phrasings were revised on that pass
("menggerakkan hukumnya" as figurative, a semicolon splice, and a "bukan sekadar"
construction that would have been the batch's third).

---

## 3. What I verified and found clean

This section exists so the next reviewer does not repeat the work.

### Religious content — the highest-risk item in the batch

**Every Arabic text in the batch was compared character by character against a
published source. All of them match.**

| Text | Source read | Result |
|---|---|---|
| `Barakallahu laka…` (P3-A1, P3-A2, P3-A3) | Sunan Abi Dawud 2130 (sunnah.com) and Irsyad al-Hukum 954 | exact |
| `Allahumma inni as'aluka khairaha…` (P3-A2) | Sunan Abi Dawud 2160 | exact |
| Ibn Mas'ud's household doa (P3-A2) | al-Kafi li al-Fatawi 186 | exact |
| al-Furqan 74 (P3-A2, P7-A2) | Quran text + Basmeih translation | exact |
| Ali Imran 38, al-Anbiya' 89 (P7-A2) | Irsyad Hukum 577 | exact |
| Doa istikharah (P7-A2) | al-Kafi #829 | exact |

**Hadith gradings.** "Sahih oleh al-Albani" for Abu Daud 2130 and "hasan oleh
al-Albani" for 2160 are **both correct** (sunnah.com carries al-Albani's
grading), and both are the writer's own addition — Irsyad al-Hukum 954 contains
zero mentions of al-Albani. The articles do not claim otherwise; the grading and
the muftiwp citation sit in separate sentences. No fix needed.

**The writer's two reported judgements, both confirmed.**

1. *The lafaz left out because it only circulates on blogs.* Confirmed. Irsyad
   al-Hukum 954 (16 April 2026) addresses exactly the Yusuf/Zulaikha, Musa/Safurah,
   Sulaiman/Balqis doa, does not forbid it, and answers on adab. Its two
   *Kesimpulan* points are quoted in P7-A3 **character for character**.
2. *JAKIM Arabic omitted for a reproduction restriction.* Confirmed, verbatim,
   on page 2 of the 2026 PDF: "Tidak dibenarkan mengeluarkan ulang mana-mana
   artikel, ilustrasi dan kandungan buku ini... sebelum mendapat izin bertulis
   terlebih dahulu daripada Ketua Pengarah, Jabatan Kemajuan Islam Malaysia."

**Nothing similar slipped through.** I checked every remaining direct quotation
in the batch against its source. All are exact:

- Irsyad Hukum 854's conclusion (P7-A2) — exact.
- Irsyad Hukum 187's "pemakaian cincin suasa bagi lelaki adalah haram dan tidak
  dibolehkan" (P7-A1) — exact.
- Irsyad Hukum 794's "Hadiah yang diberikan sebagai hantaran untuk pertunangan
  boleh untuk diambil kembali sekiranya mereka tidak jadi untuk berkahwin"
  (P7-A1) — exact, and the article correctly carries the fatwa's condition that
  the gift must have been given *for* the marriage.
- Taudhih al-Hukmi #30's one-sentence ruling (P7-A1) — exact.
- Irsyad al-Fatwa 342's two phrases on istikharah dreams (P7-A2) — both exact.
- Irsyad Hukum 586's makruh-muktamad sentence (P7-A2) — exact.
- Irsyad Hukum 577's conclusion (P7-A2) — exact.
- Irsyad Hukum 820's printing prohibition (C5-2-A1) — exact.
- Irsyad al-Fatwa 163's conclusion (P7-A3) — exact but for the source's own typo
  "pertunagannya", silently corrected. Acceptable.
- **Enakmen Undang-Undang Keluarga Islam (Negeri Selangor) 2003, s.15** (P7-A1,
  P7-A3) — quoted **verbatim exact** against the Dewan Negeri Selangor portal.
- **Enakmen Jenayah Syariah (Selangor) 1995, s.29** (P7-A2) — quoted **verbatim
  exact**, including "tiga ribu ringgit" and "dua tahun".

**No fabricated quotation, authority, hadith or attribution was found anywhere in
the twelve.** Every hadith number checked resolves: Abu Daud 2130 and 2160;
Muslim 1412, 2078, 2089, 2095, 2162; Bukhari 6337; al-Nasa'i 5148; Ibn Majah 1913
and 1383; Tirmizi 480; Abdurrazzaq 10460. Every kitab citation checked resolves:
Raudhah al-Talibin 8:35, Hasyiah al-Syarwani 7:216, Tafsir al-Qurtubi 7:226,
al-Majmu' 4/54, al-Fiqh al-Islami wa Adillatuh 9/6622.

### The JAKIM doa guideline — read by word coordinate, per the standing rule

I did not use `pdftotext -layout`. All three editions were extracted with
PyMuPDF by word coordinate and re-sorted into reading order.

Every paragraph number cited in `P3-A3` and `P7-A3` is where the articles say it
is, and the wording matches: 4.1, 4.2, 5.2, 5.3, 6.1, 6.2(i)(ii)(iv)(v)(vi), 6.3,
6.4, 7.1, 7.2(i)–(iv), 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, and the Penutup.
Paragraph 9.2 reads exactly "Tempoh masa untuk membaca doa antara 2 hingga 3
minit."

**Page counts, all three confirmed by download:** undated edition **76**, 2025
edition **60**, 2026 edition **28**. All three are still downloadable from
islam.gov.my today (HTTP 200 each). The 2026 file does sit in the portal's
`/2025/` folder, exactly as `P3-A3` warns. Portal publication date **12 Mac
2026**, confirmed.

**The strongest claim in the batch, and it holds.** `P3-A3` states that the words
*perkahwinan*, *kenduri* and *pengantin* do not appear anywhere in the 2026
edition. Case-insensitive count across the full extracted text: **perkahwinan 0,
kenduri 0, khenduri 0, pengantin 0, mempelai 0, nikah 0, walimah 0.** Bahagian 2
contains exactly the four doa the article names.

The cross-edition comparisons also hold: the undated edition's 9.3(ii) "tidak
melebihi 5 minit" and 9.2(ii) "boleh diterjemah" and 6.1 "seelok-eloknya seorang
lelaki" and its "DOA MAJLIS PERKAHWINAN"; the 2025 edition's 9.2 "2 hingga 3
minit", 6.2(vi) "boleh diterjemah", 7.2(i) "hendaklah", 7.2(iv) on women, and
"Doa Majlis Khenduri Perkahwinan" at page 41. `P7-A3`'s characterisation of that
2025 text — "menyebut 'kedua mempelai' dan memohon zuriat" — is accurate: it
reads "keluarga kedua-dua mempelai" and "kurniakanlah keduanya anak-anak yang
soleh". The article's warning that paragraph numbers do not correspond between
editions is correct and useful.

### Hukum versus adat

Handled correctly throughout. No article presents custom as obligation. The
separation sections in P3-A1, P3-A2, P3-A3 and P7-A1 are accurate against their
sources, including the harder calls:

- P3-A2 correctly reports, quoting muftiwp directly, that *membatalkan air
  sembahyang* is "bukanlah tuntutan syarak melainkan hanyalah adat semata-mata"
  — and then says a family who skips it leaves no religious duty undone. That is
  reporting, not ruling.
- P3-A3 correctly separates JAKIM's administrative guideline from hukum, and
  says in its own words that the three-part structure, the two-to-three minutes
  and the reader criteria are administration, not religion.
- P7-A1 correctly holds that all three rings are adat, and that only two things
  come from hukum.
- C4-2-A1 correctly scopes the inai ruling to Wilayah Persekutuan and tells the
  reader to check their own state, and correctly scopes the PPD prohibition to US
  law.
- P7-A3 declines to rule on the language of a family's doa and refers the reader
  to their imam or district religious office. Correct.

**State and mazhab variance** is stated wherever it exists: three views on
walimah attendance with their schools named (P3-A1), Syafie on which hand
(P7-A1), state-by-state enactment differences flagged in P7-A1, P7-A2 and P7-A3.

### Prices and material claims

**P7-A1 Kijang Emas — the labelling is honest and visible, as the brief asked me
to confirm.** Bank Negara's page for **24 Ogos 2026** shows 1oz selling
**RM19,849** and buying **RM19,074** — the article's figures, exactly. The
arithmetic is right: 19,849 / 31.1035 = RM638.16/g, and x 0.916 = RM584.55/g. The
article labels it "Kiraan kami daripada angka BNM itu" in the sentence that
carries the number, refuses to publish retail ring ranges, and attaches two
correct caveats (the coin price includes an issuance margin; a counter price is
metal plus workmanship plus margin). This is the model for how the rest of the
batch should handle a derived figure.

**Verified and correct:** all six PP Signature rental bands and the +RM200
upgrade and the accessories statement; all eight ADNAA prices; Songket Dunia's
six nikah sets at RM477 / RM487 / RM587 and the absence of any fabric-construction
statement on that page; Sampin Exclusive's three tiers and its own "1-3 months"
claim; Songket Boutique's product naming without construction detail; UNESCO
entry Songket 01505 element by element (2021, kek two-pedal loom, threads
floating over the base weave, women in the Peninsula and Sarawak, months of
weaving, 16th century, geometric and nature motifs); DermNet on black henna,
including its authors and its November 2019 date, the 7–14 day and 48-hour
timings, keloid scarring, pigment change, and the three-week fade; the US FDA on
PPD and on henna being approved only as a hair dye; Kamus Dewan Edisi Keempat on
*walimatulurus*; ExpressPrint's 10-piece minimum and "3-4 Production days (10 –
2,000pcs)"; Printlab's "Minimum tempahan ialah 100 keping" and 5–7 working days;
Printoka and Murah Print publishing no price; Tuan Majlis at RM59.90, correctly
described as a promotional price; JKKN Pemetaan Budaya entries 901 (Kelantan) and
1054 (Sarawak), the Sarawak *jari manis* sentence verbatim.

**A note in the articles' favour.** Both P4 pricing articles say plainly that no
authority publishes rates for their category and that the figures are named
vendors' published prices rather than market rates. C4-1-A1 refuses to quote
tailoring rates because the only circulating figures are decade-old blogs.
C4-1-A2 refuses to quote a mid-market cotton songket range for the same reason.
C5-1-A1 refuses to quote large fresh-flower dewan pelamin prices. C4-2-A1 reports
an absence honestly after searching KKM and NPRA. That instinct is right, and it
is what makes the two blocks above conspicuous rather than typical.

### Internal links — all resolve

Checked every body link against the live sitemap and by HTTP. **No dead links.**
`/artikel/ucapan-doa` returns 200. The eight C2.4 URLs, `/artikel/hantaran-mas-kahwin`,
`/artikel/hiasan-dekorasi/hantaran-kahwin`, `/goodies-kahwin`,
`/artikel/idea-dan-nasihat/sewa-dewan-kahwin`, `/dewan-kahwin`,
`/pelamin-kahwin-dewan` and `/cara-buat-kad-kahwin-digital` are all live. **No
article in this batch links to a P1 or P6 page.**

One thing for whoever runs ingest: `P7-A3`'s front matter carries
`internalLinks: - slug: hantaran-mas-kahwin`, which is a pillar hub, not an
article slug. The body link is fine. Worth a dry run.

### /humanizer

The recurring house tic — "Satu nota kecil yang menjimatkan masa:" — **does not
appear in any of the twelve.** Broader sweep found only "bukan sekadar" (2) and
one "Yang pasti," across roughly 20,000 words. Clean.

---

## 4. Cross-check against our own published work

`P7-A1` states that "enam daripada 14 bidang kuasa tidak menetapkan satu pun"
minimum mas kahwin rate. Consistent with our own reviewed A1, which carries an H2
headed *Enam bidang kuasa yang tidak menetapkan kadar minimum*. No conflict.

---

## 5. Batch-level blocker: 27 named graphics do not exist

Every one of the twelve names at least one `.png` in its front matter that is not
on disk, in `drafts/` or in `drafts/images/`. Twenty-seven files in total,
including a `cover` or in-article title card for all twelve.

All the photographs (`images/S-*.jpg`) do exist, and **every image in the batch —
photograph and graphic alike — carries a credit naming its source, a
`creditUrl`, a `licenseClass` and a `licensorName`.** The credit discipline is
intact. The files are simply not there.

This is an asset-production gap, not a writer error, and it sits outside these
twelve articles' scope. It is recorded here because nothing publishes with a
cover that does not exist.

---

## 6. For the currency register

New entries, all first verified 25 Ogos 2026:

| Claim | Where | Source | Volatility |
|---|---|---|---|
| JAKIM doa guideline: 2–3 minutes, para 9.2; Arabic-only isi kandungan, para 6.2(vi); reader criteria, para 7.2 | P3-A3, P7-A3 | *Garis Panduan dan Himpunan Doa*, terbitan 2026 | Medium — amended twice in two years |
| 2026 edition carries no wedding doa | P3-A3, P7-A3 | same, Bahagian 2 | Medium |
| Kijang Emas 1oz RM19,849 / RM19,074 (24 Ogos 2026) and the RM638/g, RM585/g derivations | P7-A1 | Bank Negara Malaysia | **Very high — daily** |
| Bridal rental and ready-to-wear bands (PP Signature, ADNAA, Songket Dunia) | C4-1-A1, C4-1-A2 | vendor sites | High |
| Sampin Exclusive promotional vs list prices | C4-1-A2 | vendor site | High |
| Bunga telur per-stem range | C5-4-A1 | JV Craft & Gifts | High — **currently blocked** |
| Pelamin package prices | C5-1-A1 | vendors incl. one 2014 blog | **Stale on arrival — blocked** |
| Kad kahwin ladders (Nurfa, ExpressPrint, Printlab, Tuan Majlis) | C5-2-A1 | vendor sites | High |
| Songket Terengganu GI, presented 19 Nov 2025 | C4-1-A2 | trdi.my | Low |
| Muzakarah ke-52 white gold ruling | P7-A1 | Mufti Selangor Taudhih #30 (e-SMAF unreachable) | Low, but the primary record is currently inaccessible |

---

## 7. Patterns worth fixing upstream in the briefs

Three of the errors in this batch share one shape, and a brief could prevent all
three.

1. **A filtered category page was mistaken for a catalogue** (C5-4-A1: 12
   varieties instead of 49 results; a RM79 ceiling instead of RM180). Briefs
   should require the writer to record the result count they saw — "Showing 1 to
   N of M" — next to any range they derive from a vendor site.
2. **A source's publication date was used as the event date** (C4-1-A2: 20 Nov
   instead of 19 Nov). Briefs should require the event date to come from the
   report's own words, not its byline.
3. **A promotional price was published as the price** (Sampin Exclusive; and the
   same trap sits under gokahwin and the JV Craft kaki pahar). Briefs should
   require a struck-through price to be recorded whenever one is visible.

A fourth is not a writer error but should be a standing rule: **a vendor page
with no update date needs its last sign of life checked** — a blog archive, a
copyright year, a latest post. C5-1-A1 disclosed the missing date and still
published a 2014 source into a 2026 article.

---

## 8. What a writer must return to

**`C5-4-A1-bunga-telur`** — re-derive the per-stem range from the full JV Craft
catalogue (49 results, boxes of 50 running RM32.00–RM180.00, so 64 sen to
RM3.60), correct the intro, `metaDescription`, `excerpt`, table, and the
`jalur-kos` graphic alt text, note the promotional prices, and re-verify the
three bunga telur history sources that were not reached.

**`C5-1-A1-pelamin`** — resolve the Suraya Beauty Bridal currency problem, either
by replacing the source or by labelling it as a 2014 list in the table itself;
correct the RM550 floor to RM450; and state whether the gokahwin ceiling is the
displayed RM29,900 or the regular RM31,900.

Nothing else in the batch needs the writer. The other ten are cleared, six of
them with fixes already applied.

---

## 9. Re-check of the two blocks — 25 Ogos 2026, later same day

Scope: the blocked points only. All sources below re-read live.

### 9.1 `C5-4-A1-bunga-telur` — **CLEARED**

Every figure in the replacement three-supplier table verified against its own
source today.

- **JV Craft & Gifts** — search `bunga telur`, `limit=100`: header still reads
  **"Showing 1 to 49 of 49"**. 50-piece boxes RM32.00 (JV 13109, JV 4423) to
  **RM180.00** (JV 287, *50pcs/box Bunga Telur Hyrangea Dengan Net*). 64 sen to
  RM3.60 is arithmetically and factually right. Kaki pahar code 5018 RM6.90 from
  RM9.90, and "Free Delivery in Klang Valley with min. RM200.00 Purchase!", both
  still on the page. Premium packs confirmed: JV 205, 15pcs, RM90.00 from
  RM99.00; JV 21051, 30pcs, RM159.00 from RM180.00.
- **KYK Sayang** (GK Marvellous Sdn. Bhd.) — collection carries exactly **9
  products**. Displayed prices, read out of the rendered `new-price`/`old-price`
  blocks: RM16.66 (was RM20.00), RM18.40 (was RM20.00), RM33.09, RM38.00 (was
  RM38.50), RM38.64 (was RM48.80), RM90.00, plus kaki pahar 50 lubang RM10.00.
  Floor 33 sen and ceiling RM1.80 both hold.
- **Sarang Hae Yo** (Trendymax (M) Sdn Bhd) — FBT2653 sells at **RM27.00**, three
  variants, `compare_at_price` 4990. The RM0.90 shown as the listing's "from"
  price is a **sold-out twist-tie variant sharing the listing**, not a box of 50;
  the article is right to ignore it. FBT407 RM92.65 from RM130.00. **FBT2221
  carries the slug `50pcs-bunga-telur-kawat-bulu` and the title `25PCS Bunga
  Telur Kawat Bulu`** — 25 pieces, RM259.80, so RM10.39 per stem. The trap is
  real and the article reads it correctly.
- **Consistency across the five places**: opening sentence, price table and the
  `jalur-kos` alt text all carry 33 sen – RM3.60, rising to RM10.39. The
  `metaDescription` and `excerpt` carry no figure at all, so no stale number
  survives anywhere. The old RM1.58 appears nowhere in the file.
- **History sources closed**: UiTM eprint 58751, Student Project, Faculty of Art
  and Design, no year — the abstract confirms "sebelum kurun ke 1 Masihi" and the
  occasions list. UPM i-PUTRA published 26/09/2018, updated 06/07/2020, credited
  "sitiafiqah". Wikipedia BM *Bunga telur* last edited 2025-11-30T10:09:44Z,
  read from the revisions API rather than the rendered footer. UPM's own bunga
  pahar definition does differ from the article's table, and the article now
  says so.

**Two precision fixes applied by me on the re-check**, both small, both evidenced
above: the Sarang Hae Yo ceiling is the dearest *in-stock* box, since FBT6522 at
RM99.00 and FBT19702 at RM111.75 are dearer and both marked sold out, now
disclosed in the source note; and the RM6.00 and RM5.30 premium per-stem figures
come from promotional prices, now stated.

### 9.2 `C5-1-A1-pelamin` — **STILL BLOCKED**, one new figure

The three original blocked points are all closed and verified:

- **RM550 floor corrected to RM450.** The MyMall listing still shows Pakej A
  RM450.00, B RM550.00, C RM650.00, D (Dewan) RM1,000.00, seller
  `raisya_pelaminmini`, "Size Keluasan Pelamin 10 Feet", no listing date, footer
  "© 2022 MyMall v2.0 - KUSKOP".
- **gokahwin ceiling resolved.** Ten rows, all labelled "Diskaun RM2,000".
  Displayed 300-pax RM9,900 (Laman Perkahwinan NMR) to RM29,900 (SkyGlass);
  Harga Biasa RM11,900 to RM31,900. The self-contradiction is still live on
  exactly two rows: Dewan Impiana (Harga Biasa RM11,900, 300 pax RM12,900) and
  Dewan Seri Hatinie (Harga Biasa RM17,500, 300 pax RM20,900). The "2026 / 2027"
  label is visible page text.
- **"Pelamin Sanding Sedia Ada"** appears verbatim in the PAKEJ TERMASUK list on
  the Laman Perkahwinan NMR venue page, four times.
- Suraya Beauty Bridal is gone from the file. The RM1,000–RM3,000 fresh-flower
  figure is gone. Najiha Online verified: five wedding packages (Tunang, Nikah,
  Sanding, Nikah & Sanding, Premium Dome), each naming pelamin, each with a
  WhatsApp quote button, no package price anywhere. The RM bands on that page are
  options in an "Anggaran Bajet" dropdown the customer fills in, not prices. A
  page titled "Pakej Perkahwinan 2027-2028" exists, so the 2027/2028 labelling
  holds. `pelaminselangor.com` does not resolve — a DNS failure, not a server
  timeout.

**The new blocking finding.** The article's whole thesis is now an honest
negative, and one row of it is wrong.

Table row 1 reads: "The Dulang, melalui laman PP Signature… Tiada harga di
mana-mana pada halaman itu". That is true of the 30ft dewan article,
`pakej-pelamin-dewan`, which I re-read today: `datePublished` 2022-11-20, no
price.

But the same vendor on the same site publishes a price on a sibling page.
`ppsignature.com/blogs/pakej-perkahwinan-terkini/pakej-pelamin-mini`,
`datePublished` **2025-01-01**, author Azhar Azmi, reads **"Hanya RM350 /
Event"** for a 5ft mini pelamin including backdrop, kerusi, hiasan bunga, karpet
shaggy, LED lighting and delivery plus setup around Kajang, with "Deposit RM100
untuk lock tarikh".

Consequences, all in the rewritten section:

1. "Lima sumber disemak… dan hanya dua daripadanya memaparkan angka" is wrong.
   Three of the five publish a figure.
2. The article's lowest published pelamin price is stated as MyMall's RM450. The
   RM350 is lower and better evidenced — it carries a date, and the MyMall
   listing carries none.
3. This is the §7 pattern again: one page of a vendor's site read as the vendor.

**What unblocks it:** add the PP Signature mini pelamin row with its RM350, its
5ft size, its inclusions, its Kajang-area scope and its 01/01/2025 date; correct
the count of five sources; and re-word row 1 so the "no price" finding is scoped
to the 30ft dewan page rather than to the vendor.

### 9.3 On the two ladders the writer withheld

Correct call, and the article's handling is right. An aggregator page behind a
Cloudflare challenge is unread, not verified, and a social post whose own date
resolves to the future is evidence of nothing. Saying such ladders circulate and
that their dates could not be confirmed is the honest form of that. One
improvement, not a block: say why they were left out — an unread page and an
unconfirmable date — rather than only that they exist.

---

## Retrospective — re-check pass

**What we learned that is not written down.** A vendor's price can live on a page
the article never opens. Checking the one URL a draft cites tells you about that
URL and nothing about the vendor. Before publishing "this vendor does not publish
prices", the vendor's own site has to be swept, not sampled.

**Which document must change, and who owns the edit.** The sourcing checklist in
`docs/plans/aug-23-2026-session-01/aug-25-2026-brief-verify-p3-p4-p5-p7.md` and
any successor brief — owner: **Head of SEO & Content**. Add the rule that a
negative claim about a source ("publishes no price", "no authority sets this")
requires a site-level sweep, and that the sweep is recorded: pages checked, not
only the page cited. Carry over the two from the earlier pass as well — record
the result-count header, and record the struck-through price whenever one is
visible. This re-check found a promotional pair and a sold-out ceiling that
neither the writer nor I caught the first time.

**What we did twice.** Read the JV Craft catalogue, and read the gokahwin ten
rows. Both were unavoidable: expiring facts get re-read, and both had in fact
been rewritten between the two reads.

**What we nearly shipped, and what caught it.** An article whose central claim is
that almost no pelamin vendor publishes a price, naming a vendor that does, at a
figure below the floor the article gives. What caught it was following a search
result for the vendor rather than the URL the draft cited — the check the brief
does not currently ask for.

### 9.4 `C5-1-A1-pelamin` second re-check — **CLEARED**

The five points fixed after §9.2, all re-verified live 25 Ogos 2026.

1. **Mini pelamin row** — RM350 satu majlis, backdrop mini 5 kaki, kerusi, hiasan
   bunga ikut tema, karpet shaggy, lampu LED, deposit RM100, dated 1 Januari
   2025. All match `datePublished` 2025-01-01T15:51:00+0800 and the page body.
   The source lists a sixth inclusion, delivery and setup around Kajang; the
   article moves it into the limits column as the geographic condition on the
   price. That reads truer than listing it as an inclusion, and the distance
   charge outside Kajang is on the page.
2. **Row 2** — rumah 2022-11-20T15:48:44, khemah 2022-11-20T15:59:59, dewan
   2022-11-20T16:10:17, no price on any of the three. Scoping the negative to
   those pages rather than to the vendor is correct.
3. **Count** — three of six sources display a figure (Dulang mini, MyMall,
   gokahwin) and only the RM350 is a dated pelamin price. Reasoning right.
4. **Opening** — now leads with RM350 attributed to The Dulang with its date and
   its 5-kaki, Kajang-area scope, not with MyMall RM450. `metaDescription` and
   `excerpt` carry no figure, so nothing stale there.
5. **Withheld ladders** — the article now gives the reason for each omission.
   Declining to characterise the unconfirmable date beyond "tidak dapat
   disahkan" is the right restraint.

`pelaminselangor.com` cell now matches the DNS failure rather than implying a
server refusal.

**Independent sweep, applying the rule this batch produced.** I did not take the
four-page count on trust. `sitemap_blogs_1.xml`, 86 URLs, holds exactly four
`pakej-pelamin-*` articles plus a fifth Dulang page, the vendor profile
`the-dulang-by-aqielaahadie`, dated 2022-11-10, which mentions pelamin five
times and publishes no price. No other PP Signature page carries a pelamin
figure. The four-page finding holds.

**One fix applied by me.** The count sentence read "Enam **halaman** vendor dan
direktori disemak", which contradicted its own table two lines below, where one
row covers three pages. Six is the source count, not the page count. Changed to
"Enam sumber... sesetengahnya lebih daripada satu halaman". I first wrote a
page total of nine and removed it: the honest number depends on whether the
Najiha 2027-2028 page and the gokahwin venue page are counted separately, and I
would have been publishing a precision I could not defend.

**Both P5 articles are now cleared on the blocked points.** The §5 batch blocker
on the 27 missing graphics is unaffected and still stands.
