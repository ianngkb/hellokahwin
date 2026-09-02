# CONT-17 — six doa articles live, the six that cleared the gates, and the six that did not

**Item:** CONT-17, Sprint 06 · **Owner:** `writer-inspirasi-vendor-venue` · **Date:** 2 September 2026
**Integration branch:** `feat/command-centre-dashboard` (docs line) · **Space:** DOCS
**Reviewer:** **Claude.** `editorial-verification-lead` (a Claude agent) ran the accuracy pass and
raised 6 BLOCKERs and 14 FIXes; all were addressed and re-ingested. `codex-reviewer` was **NOT**
dispatched, `/autopilot` was not used, and no OpenAI-backed path was touched at any point, per the
owner's 02 Sept directive.

---

## THE ANSWER, IN ONE LINE

**Six articles live, all 200, sitemap 113 → 119.** Not 109 → 115: the 109 baseline in the brief was
superseded by CONT-18's four articles, which landed between the brief being written and this item
starting. **The DoD's +6 is met exactly; the absolute numbers moved because the site moved.** Both
counts are quoted below from live `sitemap.xml` fetches.

---

## 1. THE SIX TARGETS, AND THE GATE EXIT CODES

Both gates were run **twice**: once at selection, once immediately before the first ingest. Both runs
returned the same codes. Second run, timestamped by the machine:

```
$ === PRE-INGEST GATE RUN, 2026-09-01T20:06:34Z ===
doa pembuka majlis       SERPSHAPE EXIT: 0   FAMILYOWNED EXIT: 0
doa untuk suami          SERPSHAPE EXIT: 0   FAMILYOWNED EXIT: 0
doa bersetubuh           SERPSHAPE EXIT: 0   FAMILYOWNED EXIT: 0
doa masuk rumah baru     SERPSHAPE EXIT: 0   FAMILYOWNED EXIT: 0
doa keluarga bahagia     SERPSHAPE EXIT: 0   FAMILYOWNED EXIT: 0
doa untuk isteri         SERPSHAPE EXIT: 0   FAMILYOWNED EXIT: 0
```

(The machine clock is UTC; 20:06Z on 1 Sept is 04:06 on 2 September in Malaysia. Every "disemak"
date on the live pages is the Malaysian date, which is what a Malaysian reader means. See §7.)

**The Ahrefs query, run and pasted rather than approximated** — `keywords-explorer-overview`,
`country: my`, `select: keyword,volume,parent_topic,difficulty,traffic_potential`, 2 September 2026.
The volume field is **`volume`** (12-month average), said out loud per house standard:

| target | `volume` | `parent_topic` | KD | TP | slug written |
|---|---|---|---|---|---|
| doa pembuka majlis | 5,000 | `doa pembuka majlis` | 69 | 1,800 | `doa-pembuka-majlis` |
| doa untuk suami | 1,400 | `doa untuk suami` | 0 | 500 | `doa-untuk-suami` |
| doa bersetubuh | 900 | `doa bersetubuh` | 0 | 500 | `doa-malam-pertama` |
| doa masuk rumah baru | 700 | `doa masuk rumah baru` | 0 | 300 | `doa-masuk-rumah-baru` |
| doa keluarga bahagia | 500 | `doa keluarga bahagia` | 0 | 200 | `doa-keluarga-bahagia` |
| doa untuk isteri | 350 | `doa untuk isteri` | 0 | 80 | `doa-untuk-isteri` |

**Six distinct parent topics. No two share one.** All six clear decision 170's ≥220/month floor for
document intent. Quality-bar point 10 is satisfied by the field that defines it, not by a reading of
the drafts.

## 2. THE SIX THAT DID NOT CLEAR, AND WHY

This half matters more than the first, because it is where a brief gets narrowed quietly.

**Failed a gate — not written:**

| candidate | `volume` | resolved parent | verdict |
|---|---|---|---|
| `doa kahwin` | 300 | `doa pengantin` | **FAMILYOWNED EXIT: 1** — owned by `/artikel/ucapan-doa/doa-pengantin-baru` and `/ucapan-doa/ucapan-pengantin-baru` |
| `doa selepas akad nikah` | 150 | `doa nikah` | **FAMILYOWNED EXIT: 1** — owned by `/artikel/sebelum-nikah/doa-jodoh` and `/sebelum-nikah/doa-majlis-pertunangan` |
| `doa ubun ubun isteri` | 80 | *(none resolved)* | **FAMILYOWNED EXIT: 3** — UNKNOWN is not a pass |

`doa selepas akad nikah rumi` is one of the three largest zero-click queries SEO-14 named. **The
ownership gate refuses a new page for it, and the gate is right**: we already rank on it because a
page already covers it. See §3 for what that means for the re-aim.

**Cleared both gates but rejected on judgement, with the measurement that decided it:**

- **`doa majlis ringkas` (2,800/mo, parent `doa majlis ringkas`, both gates exit 0).** Rejected as a
  separate page. `serp-overview` for `doa pembuka majlis` (country my) returns, at positions 1, 6, 7
  and 8: *"Doa Pembuka Majlis **Ringkas** | PDF"*, *"Doa Pembuka Majlis Ringkas Rumi | PDF"*,
  *"Doa Majlis **Ringkas** & Mudah, Sesuai Untuk Semua Majlis"*, *"Koleksi Doa Untuk Majlis Yang
  **Ringkas** & Mudah Dibaca"*. Google serves one set of pages for both terms. **Measured, not
  asserted.** The "ringkas" question is answered inside `doa-pembuka-majlis` under its own H2.
- **`doa selamat ringkas` (9,800/mo, both gates exit 0).** The gate passes it only because our live
  slug is `doa-selamat-majlis` and the parent topic carries the token `ringkas`. It is the
  short-form of the doa that page already owns. **That is an upgrade to a live article, not a new
  one, and merging or upgrading live articles belongs to `head-of-seo-content`, never to the writer
  who would create the collision.**
- **`doa jodoh yang baik` (600/mo, both gates exit 0).** Near miss printed by the gate itself against
  the live `/artikel/sebelum-nikah/doa-jodoh` (67%: doa, jodoh). Same reasoning.
- **`doa lembutkan hati suami` (400/mo, both gates exit 0).** In scope for P3 on paper; it is about
  marital discord, not a wedding, and it is not what this publication is for. Left.

**So six cleared, and it was exactly six.** Had `doa untuk isteri` (350) not held up, this item
would have come back parked rather than shipped at five.

## 3. WHAT SEO-14'S RE-AIM COULD AND COULD NOT BUY, STATED HONESTLY

The brief's instruction was to weight toward the 56 in-curve document-intent queries carrying 191
impressions and zero clicks. **I reproduced that set from GSC before selecting**, rather than taking
it from the log — same window (2026-08-20..2026-09-01, `dataState=final`), same frozen `intent_of`,
same First Page Sage curve:

```
window 2026-08-20..2026-09-01 dataState=final  total queries=337
document-intent zero-click: 99 queries, 295 imp
  in-curve (pos<=10): 56 queries, 191 imp, expected clicks 6.89
```

56 queries, 191 impressions, 6.89 expected clicks — SEO-14's figures reproduce exactly.

**Two things follow, and the second is a real limit on this item.**

**First, a correction to the brief.** It says *"the census CSV names all 56; start there rather than
from a keyword tool."* **The CSV names 12 of the 56.** `serp-shape-census-2026-09-02.csv` is 95 rows
of SERP-shape measurements at ≥5 impressions, not the query set; filtering it for document intent,
zero clicks and position ≤10 returns 12 rows. The other 44 exist only in GSC. Starting from the CSV
alone would have silently dropped four fifths of the target set. **A reader of the brief should
re-derive the 56 from GSC, which is one script and reproduces the numbers exactly.**

**Second, the structural conflict I did not paper over.** The re-aim says target queries where we
already rank and do not convert. **Those queries are by definition owned by a live page** — a page
ranking at 4.27 is a page that exists. PRE-FLIGHT #3 therefore refuses a new article for nearly all
of them, and it is right to: the correct response is an UPGRADE, and the DoD asks for six new
articles and a sitemap that grows by six. Those two instructions pull against each other.

How it was resolved rather than dodged:

- **Two of the six do land directly on ranked zero-click queries.** `doa-untuk-isteri` is the home of
  `doa ubun isteri rumi` (15 impressions, position **4.67**, zero clicks — the largest in-curve
  doa query in the family and the second-largest of all 56). That query has been landing on
  `doa-pengantin-baru`, which is a page about the doa for the couple; the ubun-ubun doa is the
  husband's doa for his wife, and it now has its own page carrying the complete artefact.
  `doa-malam-pertama` is the home of the wedding-night pair the same page was absorbing.
- **The other four are new ground**, and I am not going to dress them up as conversion fixes.
- **44 of the 56 sit in `mas-kahwin` / `hantaran` / `checklist` clusters owned by other writers, and
  every one of them is UPGRADE work on a live page, not a new article.** That is the finding this
  item hands to `head-of-seo-content`: the largest single block of the zero-click set is
  `hantaran tunang 3 balas 5` and its variants, roughly 60 impressions across a dozen query forms,
  all landing on `hantaran-tunang-3-balas-5` at positions 3.25 to 9.83, all converting nothing. That
  is one title-and-snippet job on one live page, and it is worth more than a new article.

**And Sprint 05's six doa articles still have ZERO GSC impressions.** I did not assume they worked
and did not build on them. The six shipped here target parent topics none of those six hold, so if
Sprint 05's intervention turns out to have failed, these six fail independently rather than
compounding it. The earliest window that scores Sprint 05 starts 2026-09-02 and is not final until
about 05 September.

## 4. LIVE, WITH THE HEADERS QUOTED

First request to each URL after the final ingest. Status line and `X-Vercel-Cache` verbatim:

```
doa-pembuka-majlis       HTTP/1.1 200 OK   Age: 4   X-Vercel-Cache: HIT
doa-untuk-isteri         HTTP/1.1 200 OK   Age: 0   X-Vercel-Cache: REVALIDATED
doa-untuk-suami          HTTP/1.1 200 OK   Age: 0   X-Vercel-Cache: REVALIDATED
doa-malam-pertama        HTTP/1.1 200 OK   Age: 0   X-Vercel-Cache: REVALIDATED
doa-masuk-rumah-baru     HTTP/1.1 200 OK   Age: 0   X-Vercel-Cache: REVALIDATED
doa-keluarga-bahagia     HTTP/1.1 200 OK   Age: 0   X-Vercel-Cache: REVALIDATED
```

`HIT` at `Age: 4` on the first one is not a stale page: the ingest's own revalidate had populated it
four seconds earlier, and §5 quotes the post-revision text out of that same response body.

The first ingest pass produced the same six 200s (`REVALIDATED` ×4, `HIT` at `Age: 1` ×2).

**Sitemap, before and after, both from live fetches of `https://hellokahwin.com/sitemap.xml`:**

```
BEFORE <loc> count: 113
AFTER  <loc> count: 119
```

and the diff names exactly the six and nothing else:

```
<loc>https://hellokahwin.com/artikel/ucapan-doa/doa-keluarga-bahagia</loc>
<loc>https://hellokahwin.com/artikel/ucapan-doa/doa-malam-pertama</loc>
<loc>https://hellokahwin.com/artikel/ucapan-doa/doa-masuk-rumah-baru</loc>
<loc>https://hellokahwin.com/artikel/ucapan-doa/doa-pembuka-majlis</loc>
<loc>https://hellokahwin.com/artikel/ucapan-doa/doa-untuk-isteri</loc>
<loc>https://hellokahwin.com/artikel/ucapan-doa/doa-untuk-suami</loc>
```

The sitemap was also re-fetched **immediately before the first write** and still read 113 with a
zero-line diff against the start-of-item copy, so nothing published concurrently under this run.

All six appear on the pillar hub `/artikel/ucapan-doa` (HTTP 200, `X-Vercel-Cache: MISS`), one
occurrence each.

**Schema and contents list, read out of the live HTML on every one of the six:**

| slug | JSON-LD types | FAQPage questions | `<h2>` count | contents list |
|---|---|---|---|---|
| doa-pembuka-majlis | Article, BreadcrumbList, FAQPage | 5 | 12 | yes |
| doa-untuk-isteri | Article, BreadcrumbList, FAQPage | 5 | 12 | yes |
| doa-untuk-suami | Article, BreadcrumbList, FAQPage | 5 | 10 | yes |
| doa-malam-pertama | Article, BreadcrumbList, FAQPage | 5 | 10 | yes |
| doa-masuk-rumah-baru | Article, BreadcrumbList, FAQPage | 5 | 9 | yes |
| doa-keluarga-bahagia | Article, BreadcrumbList, FAQPage | 5 | 9 | yes |

UI-18's floor is two `<h2>`; every page carries the "Dalam artikel ini" list.

## 5. THE COMPLETE ARTEFACT, QUOTED FIRST AND LAST LINE FROM LIVE HTML

Every block below was extracted from the fetched response body, not from the draft. The full dump is
`/tmp/artefact-firstlast.txt` and reproduces with the extractor in §8.

**`doa-pembuka-majlis` — four blocks. Mukadimah (basmalah, hamdalah, selawat) and penutup.**

- FIRST `بِسْمِ اللهِ الرَّحْمَـٰنِ الرَّحِيمِ` → LAST `Maksudnya: "Dengan nama Allah, Yang Maha Pemurah, lagi Maha Mengasihani."`
- FIRST `الحَمْدُ ِللهِ رَبِّ العَالَمِينَ حَمْدًا يُوَافِي نِعَمَهُ وَيُكَافِىءُ مَزِيدَهُ` → LAST `Maksudnya: "Segala puji bagi Allah, Tuhan sekalian alam; pujian yang menyempurnakan nikmat-Nya dan menandingi kelebihan-Nya."`
- FIRST `اَللَّهُمَّ صَلِّ وَسَلـِّمْ عَلَى سَيِّـدِنَا مُحَمَّدٍ فِى الأَوَّلِينَ …` → LAST `Maksudnya: "Ya Allah, cucurilah selawat dan salam ke atas junjungan kami Nabi Muhammad pada golongan yang terdahulu…"`
- FIRST `رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ` → LAST `Maksudnya: "Wahai Tuhan kami, kurniakanlah kepada kami kebaikan di dunia dan kebaikan di akhirat, serta peliharalah kami daripada azab neraka."`

**`doa-untuk-isteri` — two blocks.**

- FIRST `إِذَا أَفَادَ أَحَدُكُمُ امْرَأَةً ، أَوْ خَادِمًا ، أَوْ دَابَّةً ، فَلْيَأْخُذْ بِنَاصِيَتِهَا ، وَلْيَقُلِ : اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ خَيْرِهَا …` → LAST `Maksudnya: "Apabila seseorang kamu berkahwin dengan seorang perempuan … dan aku berlindung dengan-Mu daripada keburukan yang Engkau telah ciptakan atasnya."`
- FIRST `اللَّهُمَّ، بَارِكْ لِي فِي أَهْلِي، وَبَارِكْ لَهُمْ فِيَّ …` → LAST `Maksudnya: "Ya Allah! Berkatilah diriku dengan apa yang ada pada keluargaku … pisahkanlah kami (juga) ke arah kebaikan."`

**`doa-untuk-suami` — four blocks.**

- FIRST `أَسْتَوْدِعُ اللَّهَ دِينَكَ وَأَمَانَتَكَ وَخَوَاتِيمَ عَمَلِكَ` → LAST `Maksudnya: "Aku doakan agar Allah memelihara agamamu, amanahmu dan penutup-penutup amalmu kepada-Nya."`
- FIRST `اللَّهُمَّ اطْوِ لَهُ الأَرْضَ ، وَهَوِّنْ عَلَيْهِ السَّفَرَ` → LAST `Maksudnya: "Ya Allah, dekatkanlah jarak yang jauh baginya, dan mudahkanlah perjalanannya."`
- FIRST `مَنْ أَرَادَ أنْ يُسافِرَ فَلْيَقُلْ لِمَنْ يُخَلِّفُ: أَسْتَوْدِعُكُمُ اللَّهَ الَّذي لا تَضِيعُ وَدَائِعُهُ` → LAST `Maksudnya: "Sesiapa yang ingin pergi, hendaklah dia mendoakan orang yang dia tinggalkan…"`
- FIRST `مَا مِنْ عَبْدٍ مُسْلِمٍ يَدْعُو لِأَخِيهِ بِظَهْرِ الْغَيْبِ، إِلَّا قَالَ الْمَلَكُ: وَلَكَ بِمِثْلٍ` → LAST `Maksudnya: "Tidak ada seorang hamba yang muslim apabila berdoa kepada saudaranya yang berjauhan…"`

**`doa-malam-pertama` — three blocks.**

- FIRST `لَوْ أَنَّ أَحَدَكُمْ إِذَا أَتَى أَهْلَهُ قَالَ بِسْمِ اللَّهِ اللَّهُمَّ جَنِّبْنَا الشَّيْطَانَ …` → LAST `Maksudnya: "Sekiranya salah seorang dari kamu mendatangi isterinya lalu dia berkata: 'Bismillah, ya Allah jauhkanlah kami dari syaitan…'"`
- FIRST `إذا أتى الرجل أهله فليقل بسم الله اللهم بارك لنا فيما رزقتنا …` → LAST `Maksudnya: "Apabila seseorang lelaki itu mendatangi isterinya lalu dia membaca…"`
- FIRST `كُلُّ كَلَامٍ أَوْ أَمْرٍ ذِي بَالٍ لَا يُفْتَحُ بِذِكْرِ اللهِ فَهُوَ أَبْتَرُ - أَوْ قَالَ : أَقْطَعُ` → LAST `Maksudnya: "Semua ucapan atau perkara yang ada tujuan (ia dilakukan) yang tidak dimulakan dengan zikrullah maka ia terputus (dari keberkatan)."`

**`doa-masuk-rumah-baru` — five blocks.**

- FIRST `إِذَا دَخَلَ الْبَيْتَ غَيْرَ الْمَسْكُونِ فَلْيَقُلِ السلام علينا وعلى عباد الله الصالحين` → LAST `Maksudnya: "Jika engkau memasuki suatu rumah yang tidak berpenghuni maka katakanlah…"`
- FIRST `لاَ تَجْعَلُوا بُيُوتَكُمْ مَقَابِرَ …` → LAST `Maksudnya: "Janganlah kamu semua menjadikan rumah-rumah kalian seperti perkuburan…"`
- FIRST `إِذَا خَرَجْتَ مِنْ مَنْزِلِكَ فَصَلِّ رَكْعَتَيْنِ …` → LAST `Maksudnya: "Jika engkau (ingin) keluar dari rumahmu, maka laksanakanlah solat dua rakaat…"`
- FIRST `إِذَا دَخَلَ الرَّجُلُ بَيْتَهُ فَذَكَرَ اللَّهَ عِنْدَ دُخُولِهِ …` → LAST `Maksudnya: "Apabila seseor[a]ng masuk ke dalam rumah lalu dia mengingati Allah ketika masuk…"`
- FIRST `وَأَغْلِقُوا الأَبْوَابَ وَاذْكُرُوا اسْمَ اللَّهِ …` → LAST `Maksudnya: "Tutuplah pintu, dan sebutlah nama Allah kerana syaitan tidak akan membuka pintu yang tertutup…"`

**`doa-keluarga-bahagia` — two blocks.**

- FIRST `رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا` → LAST `Maksudnya: "Wahai Tuhan kami, berilah kami beroleh dari isteri-isteri dan zuriat keturunan kami…"`
- FIRST `وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُمْ مِنْ أَنْفُسِكُمْ أَزْوَاجًا …` → LAST `Maksudnya: "Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu isteri-isteri dari jenismu sendiri…"`

**One deliberate distinction, stated so nobody has to guess.** Every block that is a **doa to be
recited** carries all three parts: Arabic, DBP-method rumi, Malay meaning. Four blocks on
`doa-masuk-rumah-baru` and one on `doa-malam-pertama` carry Arabic and Malay but **no rumi**,
because they are **hadith quoted as the evidence for a ruling, not lafaz anybody reads aloud**.
Both pages say which block is the one you recite, in the body: *"Ini satu-satunya lafaz tetap dalam
senarai jabatan itu"* and *"Bahagian yang dibaca ialah bahagian dalam tanda petik sahaja"*.

## 6. AUTHORITY, EDITION AND DATE CHECKED — AND THE JAKIM EDITION QUESTION

Decision 162 and decision 186 are the reason this item took the time it did.

**Every source named on a live page, with the edition:**

| authority | edition, as printed on the source | used on |
|---|---|---|
| Jabatan Mufti Wilayah Persekutuan | *Al-Kafi #1163*, 23 Mac 2019 | doa-untuk-isteri |
| Jabatan Mufti Wilayah Persekutuan | *Al-Kafi li al-Fatawi: Soalan 186*, 16 Februari 2016 M / 7 Jamadilawal 1437 H | doa-untuk-isteri, doa-malam-pertama |
| Jabatan Mufti Wilayah Persekutuan | *Al-Kafi #1284*, 7 Jun 2019 | doa-malam-pertama |
| Jabatan Mufti Wilayah Persekutuan | *Al-Kafi #1133* | doa-untuk-suami |
| Jabatan Mufti Wilayah Persekutuan | *Al-Kafi li al-Fatawi: Soalan 141*, 4 Januari 2016 / 23 Rabiulawal 1437H | doa-masuk-rumah-baru |
| Jabatan Mufti Wilayah Persekutuan | *Irsyad al-Hadith Siri ke-108* | doa-untuk-suami |
| Jabatan Mufti Wilayah Persekutuan | *Irsyad al-Hadith Siri ke-523*, 1 Julai 2021 | doa-untuk-suami |
| Jabatan Mufti Wilayah Persekutuan | *Al-Afkar #113*, 10 Februari 2021 | doa-untuk-suami |
| Jabatan Mufti Wilayah Persekutuan | *Irsyad al-Hukum Siri ke-954*, 16 April 2026 | doa-pembuka-majlis, doa-keluarga-bahagia |
| Jabatan Mufti Wilayah Persekutuan | *Bayan Linnas Siri ke-121*, coretan 7 Disember 2017 | doa-keluarga-bahagia |
| Jabatan Mufti Wilayah Persekutuan | *Bayan Linnas Siri ke-168*, 24 Februari 2019 | doa-pembuka-majlis |
| Jabatan Mufti Kerajaan Negeri Sembilan | himpunan Doa dan Zikir, teks doa untuk pengantin | doa-pembuka-majlis |
| JAKIM | *Garis Panduan dan Himpunan Doa bagi Majlis Rasmi dan Separuh Rasmi Kerajaan*, **terbitan 2026**, terbit 12 Mac 2026 | doa-pembuka-majlis, doa-untuk-suami, doa-masuk-rumah-baru, doa-keluarga-bahagia |

Every one carries **disemak 2 September 2026** on the live page. Every one was fetched by this seat,
HTTP 200, and the quoted strings were compared against the fetched body — not against a search
summary and not against a subagent's report.

**Decision 186, satisfied and evidenced.** The JAKIM PDF ranking at position 3 is the **withdrawn
2007 edition** and is not cited anywhere. What is cited is the **current** one: landing page
`https://www.islam.gov.my/en/guideline/4994-panduan-dan-himpunan-doa-2026`, whose own page reads
`Panduan Doa Rasmi 2026 … Published: 12 March 2026`, and whose PDF page 2 reads
`HAK CIPTA JABATAN KEMAJUAN ISLAM MALAYSIA / www.islam.gov.my / Terbitan 2026`. The article names it
as the 2026 edition throughout.

**A finding about that PDF that changed how the article was built.** Its Arabic **cannot be copied
without corrupting the baris.** Two independent extractors were tried — PyMuPDF `get_text()` and
`pdftotext -enc UTF-8` — and both return displaced diacritics: al-Baqarah 201 comes out as
`رَ َّبن َا ء َاتنِ َا ف ِي ال ُّدنْي َا` where the shadda and fatha have moved in front of the
consonant they belong to. **So no Arabic was taken from that file.** Every Arabic string on
`doa-pembuka-majlis` comes from a Malaysian authority that publishes it as selectable text, named
line by line, and **the page says so in plain Malay** so a reader can check the same thing.

**Open, and I am not closing it by guessing.** The DBP *Pedoman Transliterasi Huruf Arab ke Huruf
Rumi* is cited on all six pages **without an edition year**, while every other source on those pages
carries one. There are at least two editions in circulation. Neither this seat nor the verification
lead could obtain the pedoman itself, and stating a year we have not read would be exactly the
fabrication the rule exists to prevent. **It is recorded here as an open item for
`editorial-verification-lead` and the currency register, not silently left out.**

## 7. THE REVIEW, AND WHAT IT CAUGHT

`editorial-verification-lead` was dispatched with the live URLs and the drafts, and returned **6
BLOCKERs, 14 FIXes and 6 NOTEs**. All 20 blockers and fixes were addressed **in session** and
re-ingested with `--commit --publish --update`; every one was then re-verified against a fresh fetch
of the live page. This is the part of the item worth reading.

**The six blockers, and what each actually was:**

1. **A clause of the JAKIM guideline was quoted; the clause that contradicts it was not.** The page
   said the doa may continue in Malay after the Arabic mukadimah, citing 6.1(i). Clause **6.2(vi)**
   of the same document says *"Isi kandungan doa hendaklah dibaca dalam Bahasa Arab"*, with Malay as
   the on-screen translation. Both clauses are now quoted, and the page says the two pull in
   different directions and that we will not pretend it is resolved.
2. **The rumi silently corrected a defect in the Arabic we published.** The Negeri Sembilan selawat
   prints `اللأَخِرِينَ` — two lams, confirmed by codepoint (`0x627 0x644 0x644 0x623`) — and our
   rumi read the corrected `fil akhirin`. Two different recitations on one page. Now disclosed.
3. **A prohibition issued in our own voice, and wrong on its own terms.** The draft said a *bapa
   saudara*, *abang ipar* or guest may not place a hand on a bride's head. Al-Kafi #1163 names
   nobody and prohibits nobody, and a bapa saudara is a mahram by nasab, so the example contradicted
   the rule it invoked. Cut.
4. **An engagement photograph on an article about the wedding night.** The licensor's own page titles
   it *"Beautiful Floral Engagement Ceremony Setting Indoors"* while our alt text called them
   *pengantin*. This is CONT-09 repeating on a seat that has the rule written into its own persona.
   Swapped for `HK-P-0022`, whose licensor titles it *"Bride and groom sitting together"*.
5. **A doa lafaz in rumi with no authority anywhere on the page** — *Barakallahu laka…* in a FAQ
   answer, inside FAQPage JSON-LD. Now carries the Arabic from *Irsyad al-Hukum Siri ke-954*,
   al-Nawawi via *Raudhah al-Talibin* 8:35, riwayat Abu Daud 2130, with 954's own Malay meaning.
6. **A government protocol applied to weddings, including a gendered restriction.** This is the
   serious one and it has its own section in the retrospective.

**Three of the six sat inside FAQPage JSON-LD**, which is the part Google lifts out and shows
without the page around it. The verification lead flagged that explicitly and was right to.

**One check of mine was wrong, and the rule caught it.** My post-revision verifier reported
`F8 extract disclosed — NOT FOUND` on `doa-pembuka-majlis`. A surprising absence means verify the
CHECK first: the edit is on the page, and my needle was `ialah petikan` while the rendered HTML is
`ialah <strong>petikan</strong>`. **The check was the fault, not the content.** Every other check
passed on first run.

**Not fixed, and stated rather than buried.** Every page's record block renders **"Disemak 1
September 2026"** while every source line in the body reads **"disemak 2 September 2026"**. The
block renders `dateModified`, which the ingest stamps at write time in UTC; Malaysian time was
already 2 September. It is not settable from the article file. **On pages whose competitive claim is
that the date checked is visible, two dates that disagree is a real defect** — it belongs to the
platform seat, and it is filed here rather than left for somebody to trip over.

## 8. HOW TO REPRODUCE EVERY NUMBER IN THIS LOG

```bash
# the six targets through both gates
for q in "doa pembuka majlis" "doa untuk suami" "doa bersetubuh" \
         "doa masuk rumah baru" "doa keluarga bahagia" "doa untuk isteri"; do
  python scripts/seo/check-serp-shape.py   "$q" >/dev/null 2>&1; echo "$q SERPSHAPE $?"
  python scripts/seo/check-family-owned.py "$q" >/dev/null 2>&1; echo "$q FAMILYOWNED $?"
done

# the checker's own negative control, which is what makes a FREE verdict readable
python scripts/seo/check-family-owned.py --parent "rukun nikah"          # -> EXIT 1
python scripts/seo/check-family-owned.py --parent "doa pengantin baru"   # -> EXIT 1

# the 56 in-curve zero-click queries, re-derived from GSC rather than from the CSV
python /tmp/doa56.py 2026-08-20 2026-09-01 final
```

Ahrefs, pasted in §1:
`mcp__ahrefs__keywords-explorer-overview` · `country: my` ·
`select: keyword,volume,parent_topic,difficulty,traffic_potential` ·
`keywords: doa pembuka majlis,doa untuk suami,doa bersetubuh,doa masuk rumah baru,doa keluarga bahagia,doa untuk isteri`

Live evidence:
```bash
for s in doa-pembuka-majlis doa-untuk-isteri doa-untuk-suami \
         doa-malam-pertama doa-masuk-rumah-baru doa-keluarga-bahagia; do
  curl -sS -D - -o "final-$s.html" "https://hellokahwin.com/artikel/ucapan-doa/$s" \
    | grep -iE "^HTTP/|^x-vercel-cache|^age:"
done
curl -s https://hellokahwin.com/sitemap.xml | grep -c '<loc>'
```

**One caveat on the `check-family-owned.py` output that the next reader should not misread.** When
no live page reaches the 60% near-miss band, the script prints *"no live page shares a token with
this parent topic."* **That message is wrong as worded** — for `doa masuk rumah baru`, the live
`/artikel/ucapan-doa/doa-pengantin-baru` shares two of four tokens (`doa`, `baru`); it just scores
50%, below the 0.60 `near` threshold, so it is not printed. The verdict is correct; the sentence
explaining it is not. Filed for whoever owns PRE-FLIGHT #3 next.

## 9. WHAT WAS WRITTEN, AND WHY EACH ONE EXISTS

| slug | the artefact it carries, and why no sibling could carry it |
|---|---|
| `doa-pembuka-majlis` | The mukadimah and penutup, plus what JAKIM 2026 requires of each. We already own `doa-penutup-majlis`; this is the missing bookend, and the only page on the SERP that tells a reader the guideline does not bind their kenduri. |
| `doa-untuk-isteri` | The ubun-ubun doa, both riwayat, and the doa Ibn Mas'ud taught. The home of `doa ubun isteri rumi`, 15 impressions at position 4.67, zero clicks. |
| `doa-untuk-suami` | The doa read for someone leaving, and the hadith making a doa read without his knowing mustajab. Plus two claims circulating in Malaysia that Mufti WP has examined and found unsourced. |
| `doa-malam-pertama` | Al-Bukhari 141 and the riwayat Ibn Hajar nukilkan. Distinct artefact, distinct moment. |
| `doa-masuk-rumah-baru` | *"Tidak ada amalan khusus yang diperintahkan Syarak"* — and the four practices that are sourced. Framed for a couple taking keys to a first home. |
| `doa-keluarga-bahagia` | Al-Furqan 74 with the official Malay, al-Rum 21, and the six *asbab bahagia* Mufti WP listed. |

**Two truncations in a source were found and neither was reproduced.** Al-Kafi li al-Fatawi Soalan
186 prints the active-form ubun-ubun lafaz with its final word cut short as `عَلَيْ`; the page says so
and publishes the complete passive-form riwayat from Al-Kafi #1163 instead. And two Malay typos in
sources (`den`, `seseorng`) are quoted with `[dan]` and `seseor[a]ng` and a note, not silently
mended.

**Images: thirteen photographs, no new files, every one already in the register.** `credit`,
`creditUrl`, `licensorName`, `licenseClass` and the alt text were **copied out of
`docs/asset-register/asset-register.csv`**, not retyped and not written from memory. Every cover
measures at least 2464×2400 (measured, not assumed): the smallest used as a cover is 3264×2448.
`HK-P-0001` (1500×1000) and `HK-P-0042` (1080×1080) were measured, found too small for a cover, and
used in-article only. `HK-P-0053` was skipped: its own register row reads `jangan-guna` with a note
saying it duplicates `HK-P-0005`.

**A cover note that ships with the batch rather than being left silent.** `doa-untuk-suami`'s cover
is a couple portrait, because the subject is a wife praying for her husband and **the library holds
no photograph of a woman in doa.** It is correct but generic. That is a commission gap, and it is
recorded here so the photographer-outreach list can carry it rather than the next writer
rediscovering it.

## 10. THE UNDO

`docs/work-done/sep-02-2026-session-01/sep-02-2026-cont-17-UNDO.md`, committed and **pushed to
`origin/ianng89/cont17-doa` before the first `--commit` ran** (commit `f1eedf8`). It names all six
slugs, gives the DELETE in dependency order, gives the cache-drop sequence, and carries the
body-link dependency map so a partial undo does not leave dead links on the survivors.

`docs/asset-register/asset-register.csv.before-cont17` is committed alongside it.

## 11. WHAT THIS ITEM HANDS TO SOMEBODY ELSE

- **`head-of-seo-content`** — 44 of the 56 zero-click queries are upgrade work on live pages in other
  writers' clusters, concentrated on `hantaran-tunang-3-balas-5`. That is one title-and-snippet job
  worth more than a new article, and it needs assigning.
- **`head-of-seo-content`** — `doa selamat ringkas` (9,800/mo) and `doa jodoh yang baik` (600/mo)
  clear both gates but are upgrades to `doa-selamat-majlis` and `doa-jodoh`. Merging or upgrading a
  live article is a migration with redirects and is not the writer's call.
- **`editorial-verification-lead`** — the DBP pedoman edition, unresolved (§6).
- **platform seat** — the record block's `Disemak` date disagrees with every body date (§7).
- **whoever owns PRE-FLIGHT #3** — the "no live page shares a token" message is inaccurate (§8).
- **the brief's next reader** — the census CSV names 12 of the 56, not all 56 (§3).
- **whoever ingests next, and `CONT-15`** — **this item's ingest silently deleted a production
  asset key, twice.** `processSmartCrops` **replaces** `cover_image_smart_crops` rather than merging
  into it, and `scripts/ingest-article.mts` runs from the operator's own checkout rather than the
  deployed app — so a checkout not rebased past `5c18c74` writes the old shape and drops
  `crop-4x3-article-card-md`. Both CONT-17 batches (20:12–20:16Z and 20:51:46–20:53:23Z) did it, the
  second overwriting UI-16's 20:30 backfill. Reported by the UI-16 seat, who measured
  **1,115,760 B** of avoidable weight on `doa-masuk-rumah-baru` alone. Not visible from this seat:
  the pillar hub is client-rendered, so the rungs cannot be read from server HTML.
- **`CONT-15`'s ingest guard — the argument for it is this log** — **CONT-17 shipped six production
  articles and recorded nowhere which checkout performed the write.** The log, the UNDO and the DOCS
  worktree between them do not name it, and it could not be recovered afterwards: an ingest writes
  to the database and R2, not the working tree, so no file mtime identifies it, and atime is
  uniform. A guard that refuses a stale write is the fix; a guard that also **records the checkout
  and commit on every ingest** would have made this answerable in seconds. Worth having both.

---

## Retrospective

Chaired by `managing-editor`; written by this seat.

### What did we learn that is not written down anywhere

**Quoting a document accurately is not the same as quoting a document that applies.** Eight clauses
of the JAKIM 2026 guideline went onto `doa-pembuka-majlis`, every one verbatim, every one with its
clause number, every one checked against the PDF by this seat. The article was still wrong, because
paragraph 1 and paragraphs 4.1–4.2 — the document's own statement of who it governs — were never
read. The guideline binds majlis organised by government or attended by pembesar. **A kenduri kahwin
in somebody's front yard is neither.**

What that produced was the worst available output: clause 7.2(i)'s *"pembaca doa hendaklah seorang
lelaki"* was carried across into a FAQ answer reading *"Bagi majlis campur, kriteria 7.2(i) menyebut
pembaca doa hendaklah seorang lelaki"* — on a wedding site, a religious-sounding restriction on who
may read the doa at a Malay kenduri, **sourced to a government protocol that says nothing about
weddings**, and sitting inside FAQPage JSON-LD where Google shows it without the page around it.

This is a third failure mode, distinct from the two the persona already names. It is not fabrication
and it is not misquotation. **It is a rule that nobody issued, wearing the authority of somebody who
could have.** The fix is one paragraph of reading and it makes the article better: the scope section
is now the most useful thing on that page, because no competitor tells the reader the document they
keep being shown does not bind their majlis.

**And a second, smaller one.** Producing our own rumi makes this seat **the first person who reads
the source's Arabic letter by letter** — which is why this seat, and only this seat, can see when the
Arabic is broken. The Negeri Sembilan selawat prints two lams; our rumi read the corrected form and
said nothing. The house already had the disclosure pattern (`[dan]`, `seseor[a]ng`) and it simply had
not been applied to Arabic.

### Which document must change, and who owns the edit

**`~/Documents/Code/buddy/skillcentral/agents/projects/hellokahwin/Editorial/writer-inspirasi-vendor-venue.md`**
— owned by this seat. **The edit is made**, not proposed: 371 lines to 441, two new sections,
*"Read a document's SCOPE clause before you quote a single clause from it"* and *"When you produce
the rumi, you are the first person who can see the Arabic is broken"*. Both carry the CONT-17
evidence, both state the check as something to run rather than something to remember.

Deliberately **not** written into a brief. A rule repeated in briefs is a rule that belongs in the
artefact — this seat's own Sprint 01 finding — and a persona is the artefact a writer actually reads
before drafting.

### What did we do twice

**Ingested `doa-untuk-isteri`.** The ingest validates body links against published articles, and six
articles that link to one another cannot all go in first. It went in once with two sibling links
removed, then again with `--commit --publish --update` once the batch was live. Deliberate, recorded
in the UNDO before the first write, and the final state matches the draft exactly.

**Ingested all six a second time** after the verification review. That is the process working, not
waste: revising in session is what the review board is for.

**And one thing done twice that should have been done once.** The scope of the JAKIM guideline was
read *after* the article was written, because a reviewer asked for it. Reading paragraph 1 first
would have cost two minutes and saved a full revision-and-re-ingest cycle across one article and
three FAQ answers. That is exactly what the persona edit above is for.

### What did we nearly ship, and what caught it

**A gendered restriction on who may read the doa at a Malay wedding, attributed to JAKIM, inside
FAQPage JSON-LD.** It was live for roughly forty minutes.

**What caught it was dispatching a genuine adversarial reviewer with blocking authority and the
instruction not to praise** — `editorial-verification-lead`, a Claude agent, given the live URLs, the
drafts and the named sources, and told that a "not found" is not a verification. It opened every
source, read the JAKIM PDF by word coordinate rather than trusting `pdftotext`, and came back with
six blockers, three of them in structured data.

It also recorded something worth keeping: **three attributions its own first-pass text extraction
reported as missing were present in the raw HTML on a second, differently-shaped search** —
Abdurrazzaq (10460), al-Tirmizi (3445), Riwayat al-Bukhari (141). A naive extraction would have
produced three false "unsourced" blockers and three true citations would have been cut from live
articles for being unverifiable. That is this seat's own 27 Ogos lesson, arriving from the other
direction, and it held.

**The cheap check that did not run.** Nothing caught the scope problem before the reviewer did,
because nothing was looking for it — the drafting checklist has "is the quotation accurate" and did
not have "does the document apply". It does now.
