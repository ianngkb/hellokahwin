# Four P1 articles written for C1.1 and C1.2 — 24 Aug 2026

**Session:** aug-23-2026-session-01 · **Owner:** writer-adat-agama-prosedur · **Status:** completed
**Plan:** [Brief — Write cluster C1.1 and C1.2](../../plans/aug-23-2026-session-01/aug-24-2026-brief-write-c1-nikah-procedure.md)

## What was done

Four publish-ready article files, each one Markdown file with YAML front matter
that the ingest parser accepts. Not editorial deliverable documents.

| File | Slug | Cluster | Target keyword | Vol/mo (Ahrefs `my`, 24 Aug 2026) | Words |
|---|---|---|---|---|---|
| `rukun-nikah.md` | `rukun-nikah` | C1.2 | `rukun nikah` | 6,900 · KD 0 | ~1,196 |
| `syarat-sah-nikah.md` | `syarat-sah-nikah` | C1.2 | `syarat sah nikah` | 1,600 · KD 0 | ~1,150 |
| `lafaz-taklik.md` | `lafaz-taklik` | C1.2 | `lafaz taklik` | 1,500 · KD 0 | ~1,042 |
| `borang-nikah.md` | `borang-nikah` | C1.1 | `borang nikah` | 2,700 · KD 0 | ~1,456 |

All four are in `docs/plans/aug-23-2026-session-01/drafts/`.

### Why these four

Chosen on live Ahrefs data, not on the plan's ordering.

- **`rukun nikah`** is the largest single keyword in the Malay wedding market
  and the strongest internal-link hub in P1. Not optional.
- **`syarat sah nikah`** is a separate Ahrefs parent topic from `rukun nikah`,
  so the two justify two pages rather than cannibalising. With `syarat nikah`
  400, `syarat nikah dalam islam` 250, `syarat sah nikah dalam islam` 200 and
  `syarat wajib nikah` 90, the entity is worth roughly 2,540/mo.
- **`lafaz taklik`** is the plan's biggest miss and is explained below.
- **`borang nikah`** is the highest-intent query in the whole map and the one
  C1.1 topic where an explainer can win. `borang nikah` itself has parent topic
  `sppim`, so Google's chosen answer for it is a portal; the page is written to
  earn `borang nikah online` (2,500, KD 4, its own parent topic),
  `cara isi borang nikah` (200) and the state variants around them.

Three from C1.2 and one from C1.1 is deliberate. Government owns the head of
C1.1 and will keep it; C1.2's individual topics are both larger and winnable.

### Three deep instead of four adequate

Not taken. Four were written and each clears 1,000 words with primary-source
specificity throughout, so the trade the brief offered did not arise.

## Evidence

Every claim in all four articles is traced to a primary source. Each article
carries its own `## Sumber` block with the date checked.

**Gazette and enactment text, read directly:**

- Kaedah-Kaedah Undang-Undang Keluarga Islam (Borang dan Fi) 2013, **Pk. P.U. 30**,
  Warta Kerajaan Negeri Perak, Jil. 66 Tambahan No. 13, **1 Jun 2013** — 84 pages,
  via Jabatan Kehakiman Syariah Negeri Perak. Yielded the full Borang 1–19
  register, Borang 1's field-by-field contents, the printed per-form fees, the
  printed 7-day reminder, and **the complete prescribed lafaz ta'liq**.
- Enakmen Undang-Undang Keluarga Islam (Negeri Selangor) 2003, Warta Kerajaan
  Negeri Selangor, 27 Julai 2003 — 87 pages, via `jakess.gov.my`. Sections 2, 7,
  8, 9, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22, 26, 50.
- Enakmen Undang-Undang Keluarga Islam (Negeri Pulau Pinang) 2004, via
  `jksnpp.penang.gov.my`. Sections 2, 22, 26, 50.
- RUU Enakmen Undang-Undang Keluarga Islam (Negeri Selangor) (Pindaan) 2018,
  Warta Kerajaan Negeri Selangor, Jil. 71 No. 17, 24 Ogos 2018.

**Departmental pages, checked 24 Aug 2026:**

- e-Munakahat, Jabatan Hal Ehwal Agama Islam Pulau Pinang — Perkahwinan page
  (its own footer reads "Tarikh kemaskini maklumat terakhir : 24 August 2026"),
  Senarai Semak Permohonan Kebenaran Berkahwin (Mei 2023), Kadar Bayaran Urusan
  Nikah, Cerai dan Ruju' (Mei 2023).
- Masjid Wilayah Persekutuan, Jabatan Agama Islam Wilayah Persekutuan — rukun
  nikah, syarat lelaki, syarat perempuan.
- Jabatan Mufti Wilayah Persekutuan — Irsyad Hukum Siri ke-408, 7 Feb 2020.
  The 21-step tertib wali and the syarat wali.
- Jabatan Mufti Pulau Pinang, Sistem eKemusykilan, jawapan 01174.
- Jabatan Mufti Negeri Selangor, e-Musykil.
- Portal Rasmi JAKIM — SPPIM 2.0 launch, and the 24 Apr 2026 item on the five
  states still outside SPPIM.
- Jabatan Agama Islam Negeri Johor; Jabatan Hal Ehwal Agama Islam Negeri Sabah.

**Parser check.** All four validated against the real
`src/lib/inspire/article-file.ts` from branch `ianng89/pillars-ingest-redirects`.
Four OK, zero problems. Meta descriptions 132–143 characters, all under the
160 cap. No image is written into any body. Body links resolve only to
articles that are published today.

**Humanizer.** Run on all four after drafting. Removed every em dash from the
body prose, converted five bold-label paragraph runs to real subheadings,
removed stray bold emphasis, and cut four unsourced claims about what readers
commonly get wrong or what is "the most detailed in the country".

## What it changed

P1 goes from zero articles to four, covering roughly **12,700 searches a month**
in target and close-support keywords. The pillar's link hub (`rukun nikah`) now
exists, which is what the other C1 articles will point at.

## What the cluster plan got wrong

**1. `lafaz taklik` is under-counted by about 2,000 searches a month.**
The plan lists `lafaz taklik nikah` 600 and `taklik nikah` 500 as supporting
keywords only. Live Ahrefs (`my`, 24 Aug 2026) shows **`lafaz taklik` at
1,500/mo, KD 0** — the plan does not list it at all. With `lafaz taklik nikah`
600, `taklik nikah` 500, `taklik` 200, `taklik maksud` 150, `lafaz taklik yang
tidak sah` 100 and `maksud taklik` 70, the taklik entity is worth about
**3,120/mo**. That makes it the second-largest topic in C1.2 after `rukun
nikah`, ahead of `syarat sah nikah`. It has been written accordingly.

**2. The wali entity is bigger than one supporting keyword.**
The plan lists `wali nikah` 300. The cluster around it adds up to roughly
**1,770/mo**: `syarat wali nikah` 250, `wali hakim` 200, `syarat sah wali nikah`
150, `urutan wali nikah` 150, `susunan wali nikah` 150, `wali nikah dalam islam`
150, `syarat jadi wali nikah` 100, `senarai wali nikah` 90, `turutan wali nikah`
90, `wali hakim maksud` 70, `wali nikah perempuan` 70. That is a page, not a
section. **Recommended as the next C1.2 article.** It is not written here
because taklik is larger.

**3. `borang nikah` carries a navigational parent topic.**
Ahrefs gives `borang nikah` (2,700) the parent topic **`sppim`**, and
`borang nikah selangor`, `borang nikah johor`, `borang nikah perak`,
`borang nikah terengganu`, `borang nikah melaka` and `daftar nikah` the same.
The plan's own SERP reading is right that government owns this query, but the
parent-topic data says something stronger: Google treats these as portal-seeking
queries served by one page. `borang nikah online` (2,500, KD 4) and
`borang nikah kelantan` (parent `e qaryah`) are the genuinely separate topics.

**4. Everything else in the plan checked out exactly.** `rukun nikah` 6,900/KD 0,
`syarat sah nikah` 1,600/0, `akad nikah` 1,000/0, `lafaz akad nikah` 800/0,
`borang nikah` 2,700/0, `borang nikah selangor` 1,400/0, `sppim borang nikah`
1,300/4, `borang nikah kelantan` 800/3, `borang nikah johor` 700/5,
`isi borang nikah online` 600/10, `borang nikah kedah` 500/4, `borang nikah
perak` 350/0. Every figure matched.

## Facts left out because no authority publishes them

1. **Syarat saksi nikah as a list.** The Masjid Wilayah Persekutuan page is
   titled "Rukun Nikah / Syarat Dua Orang Saksi / Syarat Bagi Perempuan" but
   publishes only the rukun, the syarat lelaki and the syarat perempuan. There is
   no syarat saksi list on it. No other department page found published one.
   `syarat saksi nikah` is a 200/mo query and `siapa boleh jadi saksi nikah
   perempuan` another 100, so the demand is real and the answer is missing from
   the authorities. **`syarat-sah-nikah.md` says so in the body rather than
   copying a list from a blog.** Worth a second look by the Verification Lead.

2. **The prescribed lafaz taklik for thirteen of fourteen jurisdictions.**
   Each state prescribes its own wording in its own gazetted Kaedah. Perak's was
   read from Pk. P.U. 30 and reproduced verbatim. No single official source
   collects the rest, and Selangor's own Kaedah (Borang dan Fi) is not on the
   JAKESS download page. `lafaz-taklik.md` states this plainly and tells the
   reader to look at their own surat perakuan nikah. **This is the same shape of
   finding as the C2.4 mas kahwin work and probably a bigger one.**

3. **Selangor's current minimum marriage age.** The gazetted 2003 enactment,
   section 8, says 18 for men and 16 for women. The 2018 amendment Bill (Warta,
   24 Ogos 2018) replaces that with 18 for both and leaves commencement to a
   notification by the Sultan in the Warta. The Dewan Negeri Selangor enactment
   page for section 8 shows "Pindaan: Tiada Pindaan" and does not render the
   section text. The commencement notification could not be confirmed from any
   gazette source. `syarat-sah-nikah.md` states both, says the notification could
   not be verified, and tells the reader to confirm with JAIS. **It does not
   assert a current figure for Selangor.** Penang's 18/16 is stated because
   e-Munakahat publishes it and the page was live today.

4. **How to propose a taklik other than the prescribed one.** Section 22(1) of
   both the Selangor and Penang enactments allows "ta'liq yang ditetapkan **atau
   ta'liq lain**". No department publishes guidance on how a couple would do
   that or what is accepted. Stated as a gap in the article.

5. **The Perak fee schedule (Jadual Kedua of Pk. P.U. 30).** The table did not
   extract as text from the gazette PDF. The per-form fees used in
   `borang-nikah.md` were read from the fee box printed at the head of each
   gazetted form instead, verified positionally, and Borang 4 is recorded as
   "Tiada fi bercetak" rather than guessed.

6. **The Penang kursus praperkahwinan fee.** Omitted deliberately. The Mei 2023
   schedule says RM100.00, and the Verification Lead's currency register (CR-P2-03)
   records a rise to RM120.00 on 1 September 2026, eight days from publication. It
   belongs to C1.3 and would have shipped stale.

## Follow-ups

| # | Item | Owner |
|---|---|---|
| 1 | **Next C1.2 article: wali nikah**, ~1,770/mo, material already gathered (tertib wali, syarat wali, wali hakim, wali Raja, section 13). | head-of-seo-content to brief |
| 2 | **Four covers needed**, one per article, named exactly as the front matter declares: `cover-rukun-nikah.png`, `cover-syarat-sah-nikah.png`, `cover-lafaz-taklik.png`, `cover-borang-nikah.png`, beside the drafts. Each `alt` in the front matter describes precisely what the graphic must show. | cover-graphic-generator brief |
| 3 | **Mid-article graphics that would earn their place** (noted here, not left as placeholders in prose): the 21-step tertib wali in `rukun-nikah.md` currently reads as a run-on sentence and would be far better as a numbered ladder graphic; and the three taklik conditions in `lafaz-taklik.md` as a three-panel card. Neither is required to publish. | head-of-seo-content |
| 4 | **`author: hellokahwin-editorial`** is the house `profiles.id` resolved from `src/lib/authors/gate.ts` (`HOUSE_AUTHOR_ID`). Confirm it resolves on the production database before ingest. | deploy engineer |
| 5 | **Internal links are deliberately thin.** No C1 article is published yet, so cross-links between these four would be refused by the parser. Body links point only at `mas-kahwin-ikut-negeri` and `kursus-kahwin`, which are live today, plus pillar and cluster hubs, which the parser treats as hubs and does not resolve. **After these four publish, a second pass should wire them to each other.** | writer, after ingest |
| 6 | **`sppim.gov.my` without `www` does not resolve** (checked 24 Aug 2026); `www.sppim.gov.my/v2/` does. Recorded in `borang-nikah.md` as a practical note and worth adding to the currency register, since it will change back. | editorial-verification-lead |
| 7 | **Verification Lead review of the syarat saksi gap** (item 1 above) before publication. | editorial-verification-lead |
