# SEO-03 — source register for the kursus kahwin fee table

Every figure in `kursus-kahwin-yuran-section.html`, with the primary source it
came from and the date it was checked. All checks made **26 Ogos 2026**.

## Method

Two source classes, and the section says which is which on every row.

1. **A state authority's own published notice.** Only Pulau Pinang has one.
2. **SPPIM (`sppim.gov.my`), JAKIM's national system**, read live for courses
   scheduled 26 Ogos 2026 to 31 Disember 2026. The fee is published per course,
   per organiser, in the field `JDL_KURSUS_YURAN`. Public read endpoint:
   `GET https://www.sppim.gov.my/v2/biz/api/jadual-param?param={"jdl_negeri":<id>,
   "jdl_tarikh_mula":"2026-08-26","jdl_tarikh_tamat":"2026-12-31","with_all_info":"N"}`.
   State ids from `GET /v2/biz/api/negeri-get-all`. Read only; nothing written.

**Government PDFs were read by word coordinate** (PyMuPDF `page.get_text("words")`,
rows grouped by y-midpoint, sorted by x0), never `pdftotext -layout`. Script kept
at `scratchpad/pdfwords.py`. This mattered: the Sabah `kadar fii` PDF is a
four-package grid where the layout tool interleaves package columns, and a
column-misread there would have produced a Sabah "course fee" that does not exist.

## The fourteen

| Negeri | Figure published | Source | Note |
|---|---|---|---|
| Perlis | RM100 | SPPIM, 2 courses, 1 organiser | JAIPs' own `Kadar Bayaran` schedule (page dated 07 Nov 2025, `jaips.perlis.gov.my/iklan/470-kadar-bayaran-perkhidmatan-di-jaips`, figures in `images/content/kadar_bayaranJAIPs.png`) lists 27 fees and **no course fee**. Read from the image. |
| Kedah | RM100 | SPPIM, 135 courses, 19 organisers, all RM100 | `jheaik.kedah.gov.my` did not resolve on 26 Ogos. |
| Pulau Pinang | RM100; RM120 from 1 Sep 2026 | **JHEAIPP**, `emunakahat.penang.gov.my/v2/index.php?tab=kursuspra` | Verbatim: *"yuran Kursus Praperkahwinan Islam Negeri Pulau Pinang akan dikemaskini kepada RM120.00 seorang, berkuat kuasa mulai 1 September 2026… Kadar sedia ada RM100.00 masih terpakai untuk kursus sebelum tarikh berkuat kuasa."* Host was **up** on 26 Ogos; the 25 Ogos outage has cleared. |
| Perak | RM100 | SPPIM, 27 courses, 9 organisers, all RM100 | |
| Selangor | RM100 | SPPIM, 75 courses, all RM100 | Every one is `JDL_KURSUS_JNS_PGJR = P` and every organiser account is a JAIS district office body (PAID Petaling, PAID Hulu Langat, PAID Sepang, Bahagian Undang-Undang Keluarga…). No private organiser in Selangor. `jais.gov.my` publishes no fee page; its site search for "kursus praperkahwinan" returns only an outbound SPPIM link. |
| Wilayah Persekutuan | RM120; RM180 at one organiser | SPPIM, 203 courses, 24 organisers | 199 at RM120, 4 at RM180 (Islamic Outreach ABIM Centre, Sep–Dis 2026). |
| Negeri Sembilan | RM100 or RM115 | SPPIM, 34 courses, 9 organisers | 19 at RM100, 15 at RM115. |
| Melaka | Free (Sep 2026) or RM118.80 (Okt 2026) | SPPIM, 10 courses, sole organiser MAIM Holdings Berhad | Five courses titled `KPKI PERCUMA` at RM0.00, 5–27 Sep 2026; four at RM118.80 in Okt 2026. |
| Johor | RM150 or RM165 | SPPIM, 64 courses, 11 organisers | 48 at RM150, 16 at RM165. JAINJ's own guide (`jainj.johor.gov.my/kursus-pra-perkahwinan/`) publishes **no** fee and points to SPPIM. |
| Pahang | **none published** | `jaip.pahang.gov.my` returns *"PORTAL SEDANG DISELENGGARA"* | `prakahwin.pahang.gov.my/frmLogin.php` ("Sistem Permohonan Kursus Pra Perkahwinan Negeri Pahang") requires MyKad + password before any course data. Pahang is not in SPPIM (`NGR_SPPIM_FLAG = N`). |
| Terengganu | RM80 | SPPIM, 12 courses, all `JNS_PGJR = P`, series codes `KPP/11/2026/…` | Jabatan-run. Note JAKIM's own page still lists only eight states for online registration and omits Terengganu, though its system carries it. |
| Kelantan | **none published** | JHEAIK `jaheaik.kelantan.gov.my`; e-Qaryah covers marriage permission only | Last official figure found: **RM70** per person, MBKPI course at Masjid Jamek Jubli Perak Sultan Ismail Petra, Rantau Panjang, with JHEAIK, 9–10 Sep 2025 (`masjid.e-maik.my/news/1098`). One organiser, one date, not a state rate. No 2026 fee announcement in the MAIK news stream. |
| Sabah | **none published** | JHEAINS `ikursuskahwin.sabah.gov.my` | Its own "Yuran Kursus" section states only that fees are non-refundable and dates cannot be changed. No amount. Every district shows *"Slot Belum Dibuka"*. The official `kadar fii` PDF (`ekahwin.sabah.gov.my/assets/images/kadar fii.pdf`, read by word coordinate) covers kebenaran berkahwin, pendaftaran, sijil digital and kad nikah — **not** the course. Sabah is not in SPPIM. |
| Sarawak | **none current** | JAIS Sarawak `jais.sarawak.gov.my/web/subpage/webpage_view/60` | Its "Tarikh Kursus Pra Perkahwinan" page still carries a 2013 schedule; the linked schedule download returns **Access Denied**. Last figure the department itself published: **RM80** per person, Bahagian Kuching, Jun 2024 (`announcement_view/280`). Registration and payment via KISWA. The 2026 announcement list carries no course fee. Sarawak is not in SPPIM. |

## Two national facts that anchor the "no single rate" claim

- **JAKIM's guideline sets no fee.** `Garis Panduan Bagi Prosedur Pentadbiran
  Perkahwinan, Penceraian dan Ruju'` (`islam.gov.my/images/garis-panduan/…pdf`,
  5 pages, read by word coordinate) requires the MBKPPI certificate before
  kebenaran berkahwin is approved and contains **no** occurrence of a fee, a
  ringgit figure, or the word *yuran*.
- **JAKIM's own course page publishes no rate** either
  (`islam.gov.my/ms/kekeluargaan/permohonan-kursus-pra-perkahwinan`, page footer
  "Kemaskini: 24 Ogos 2026").

The "RM120 JAKIM ceiling" that circulates on aggregator sites appears in **no**
primary source we could find, and four live WP courses are listed at RM180. It is
not used anywhere in the article.

## Rejected sources

`cariharga.my`, `iuran.my`, `portalkahwin.com`, `kahwinstudio.com`,
`kursuskahwin2u.com`, `projekmykahwin.com`. All were surfaced by search; none is
primary; none contributed a figure.

## Currency register entries this creates

| Claim | Expires when | Watch |
|---|---|---|
| Pulau Pinang RM100 | **1 September 2026** | `emunakahat.penang.gov.my` |
| Every SPPIM-derived row | Organisers reprice at will | Re-run the `jadual-param` pull |
| Pahang "none published" | JAIP portal returns from maintenance | `jaip.pahang.gov.my` |
| Sabah "none published" | Slots open on iKursusKahwin | `ikursuskahwin.sabah.gov.my` |
| Melaka free courses | After 27 Sep 2026 | SPPIM Melaka |
