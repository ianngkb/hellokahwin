# The article-to-graphic map

**Owner:** managing-editor · **Date:** 25 Ogos 2026
**Brief:** `aug-25-2026-brief-supporting-images-and-credit.md`, Tasks 1.2 and 1.3
**Templates:** `aug-25-2026-spec-graphic-kit-remaining-templates.md`
**Status:** specification. Nothing here is built and nothing is published.

Every graphic HelloKahwin should carry, with the template, the data it renders
and the Malay alt text. Built from without a follow-up question.

---

## 0. Where the brief and reality parted, and one thing that changed under me

Reality wins over the strategy document. Two of the brief's premises were wrong,
one was overtaken during the day, and one live defect turned up on the way.

### 0.1 The live eight carry no in-article images, and the ten specs were cut

The brief says *"every one carries a cover and nothing else"* — correct. What it
does not say is that the ten in-article graphics were **specified, approved and
then cut at publish**. `aug-24-2026-brief-publish-the-eight.md` §3.2: the markers
were removed because nine of ten re-rendered a table already on the page. Verified
empirically: `grep -c "IMEJ\|GRAFIK"` returns 0 across all eight files in
`drafts/ingest/`.

So this is not a gap to fill. It is a decision to reopen, which is Task 1.3, and
reopening it means arguing against my own §0 cut in the kit spec.

### 0.2 There were no twelve articles when I started. There are now

**Superseded within the day, and I am leaving the correction visible rather than
rewriting history.** When I inventoried the pipeline this morning, zero drafts
existed for P3, P4, P5 and P7, and both writing briefs delegated topic selection
to the writer. **All twelve landed while this document was being written.** So did
a sourcing run that added thirteen openly-licensed photographs, and both
photography gap lists.

§3 is now a real per-graphic mapping rather than the cluster-level fallback I had
planned. **The writers already declared 21 in-article graphics with Malay alt
text in their front matter**, which is a much better starting point: my job on
those is to assign the template, not to invent the graphic.

**None of the twelve has a cover PNG on disk, and none of the 21 declared
graphics exists.** The thirteen sourced photographs do.

### 0.3 Chair's ruling — the credit string had split into two, and I have closed it

**Found during this work: two credit conventions were live at once for our own
graphics.** The eight published C2.4 covers carry `Grafik: HelloKahwin`. Every
other draft in the pipeline carried a bare `HelloKahwin` — the eight P1/P6
drafts and all twelve new ones, 35 occurrences across 20 files.

The bare form comes from the generator, which fixes `CREDIT_BRIEF = 'HelloKahwin'`
alongside `CREDIT_BOARD = 'Grafik: HelloKahwin'` and lets each set pick.

**Ruling: `Grafik: HelloKahwin`. Applied to all 35.**

Style guide §13.1, ratified at the A2 review board, sets `Grafik:` for our own
drawn graphics and `Kredit:` for photography. It is already live on eight pages,
so the alternative was not "pick one" but "break eight published pages or leave
two conventions running". And a bare `HelloKahwin` under an image reads as a
byline — the name of whoever made it — rather than as the source of the thing you
are looking at. The prefix is what turns a name into an attribution.

This was free to fix now and expensive later: every one of the 35 is unpublished.
I applied it to the drafts rather than routing it through the boards, because a
credit string is style-guide compliance and that is the chair's to enforce. **The
P1/P6 and P3–P7 boards should note it rather than re-litigate it.** Register rows
updated to match, and the sourced photographs already used `Kredit: {name}
({licence})` correctly.

**One thing I could not fix:** `CREDIT_BRIEF` still exists in
`hellokahwin-site:scripts/covers/generate-cover-graphics.mts`, so the next set
wired up can reintroduce the split. **Delete the constant** and let
`CREDIT_BOARD` be the only one. The two contact sheets in `drafts/` still show
the old string; they are generated output and will correct themselves on the next
render.

### 0.4 A2's published file still carries an internal appendix

`drafts/ingest/A2-apa-itu-mas-kahwin.md` still contains
`## SOURCE NOTES (for the verification lead, not published)` — roughly fifty
lines of English editorial notes, raw gazette URLs and a strikethrough
retracted-claims table, sitting after the Malay reader content. The publish brief
said to drop the appendix. On A2 it was not dropped.

**This is not an image problem and it is not mine to fix, but it is live on a
page and it outranks every graphic decision in this document in priority.**
Flagged to the CEO separately.

---

## 1. The live eight (C2.4)

All eight are published at `/artikel/hantaran-mas-kahwin/{slug}`. All eight carry
a `kad-tajuk` cover, `licenseClass: G`, `licensorName: HelloKahwin`,
`credit: Grafik: HelloKahwin`.

**The alt text below is quoted verbatim from the board of 24 Ogos 2026**, held in
register rows `HK-G-0001` to `HK-G-0010`. It was reviewed. A rewrite goes back
through the board.

| Asset | Article | Template | Tier | Data it renders |
|---|---|---|---|---|
| `HK-G-0001` | A1 `mas-kahwin-ikut-negeri` | `jadual-perbandingan` `baris` | **B, 2464 × 3480** | 14 jurisdictions × 3 columns: `Negeri`, `Kadar minimum`, `Ditetapkan oleh`. House state order. Six cells read `Tiada kadar minimum ditetapkan` in full. Three rows flagged `belum disahkan` (Johor, Sabah, Sarawak) |
| `HK-G-0002` | A1 | `grid-kategori` | A | 5 categories: Fatwa diwartakan (Selangor) · Keputusan majlis agama negeri (WP, Melaka) · Titah pemerintah (Pahang) · Dokumen jabatan (Negeri Sembilan) · **Tiada penetapan**, `gaya: kosong` (Perlis, Kedah, Pulau Pinang, Perak, Terengganu, Kelantan). `nota_berasingan`: Johor, Sabah, Sarawak |
| `HK-G-0003` | A2 `apa-itu-mas-kahwin` | `jadual-perbandingan` `lajur` | A | 3 entities × 4 attributes: mas kahwin / hantaran / duit hantaran, against wajib atau adat · diberi kepada siapa · siapa memilikinya · siapa menetapkan jumlah. **No `Syarat sah nikah` row** — chair's ruling |
| `HK-G-0004` | A3 `mas-kahwin-johor` | `urutan-langkah` `garis-masa` | B | 5 nodes: 1935 (`gaya: lemah`) · 2019/2020 · 2022 · Mac 2024 · Ogos 2026. Node 1 reads `Disifatkan oleh pengkaji sebagai had maksimum`, not `Direkodkan` |
| `HK-G-0005` | A4 `mas-kahwin-kelantan-terengganu` | `jadual-perbandingan` `lajur` | A | 2 entities × 4 attributes: Kelantan / Terengganu against kadar minimum · sumber · tarikh · fi nikah utama. Terengganu cell carries `Warta negeri 19 Disember 2019` inside the cell |
| `HK-G-0006` | A5 `mas-kahwin-perak` | `jadual-perbandingan` `baris` | A | 6 fee rows × 2 columns, RM1 to RM30. Source line in the footer in full: `Jadual Kedua, Pk. P.U. 30, Warta Kerajaan Negeri Perak, 1 Jun 2013`. **RM101 does not appear in any form** |
| `HK-G-0007` | A6 `mas-kahwin-pahang-negeri-sembilan` | `urutan-langkah` `garis-masa` | A | 4 nodes: RM22.50 sejak 1900 · 28 Mac 2024 titah · RM100 · **`Tarikh kuat kuasa: tidak dinyatakan dalam mana-mana sumber rasmi`**. Node 4 stays |
| `HK-G-0008` | A6 | `jadual-perbandingan` `baris` | A | 8 Negeri Sembilan fee rows × 2 columns. `jalur_kesimpulan`: `Lain-lain bayaran adalah di luar ketetapan JHEAINS & MAINS` |
| `HK-G-0009` | A7 `mas-kahwin-sabah-sarawak` | `jadual-perbandingan` `lajur` | A | 2 entities × 2 attributes: Sabah s.21 Enakmen 2004 / Sarawak s.19 Ordinan 2001, against `Jumlah minimum: tidak ditetapkan` and `Kewajipan Pendaftar Nikah: menentukan dan merekodkan nilai mas kahwin`. `jalur_kesimpulan`: `Nilai direkodkan, bukan ditetapkan` |
| `HK-G-0010` | A8 `mas-kahwin-melebihi-kadar-minimum` | `urutan-langkah` `aliran` | B | 5 nodes on one path, 1 `nod_sisi` (`Duit hantaran dirunding berasingan`, label `bukan mas kahwin`), 2 footnotes inside the graphic (Selangor fatwa 4 Februari 2010; Kedah Borang 7) |

### 1.1 Alt text, board-approved 24 Ogos 2026 — render exactly

- **HK-G-0001** `Jadual kadar minimum mas kahwin bagi 14 bidang kuasa di Malaysia, daripada RM22.50 hingga RM300, berserta pihak berkuasa dan tarikh setiap kadar.`
- **HK-G-0002** `Rajah menunjukkan empat cara kadar minimum mas kahwin ditetapkan di Malaysia, iaitu melalui fatwa, keputusan majlis agama negeri, titah pemerintah dan dokumen jabatan.`
- **HK-G-0003** `Jadual perbandingan tiga lajur menunjukkan mas kahwin wajib dan milik isteri, manakala hantaran dan duit hantaran ialah adat yang diberikan kepada keluarga pengantin.`
- **HK-G-0004** `Garis masa kadar mas kahwin RM22.50 di Johor, daripada Ahkam Syar'iyyah Johor 1935 sehingga status belum disahkan pada Ogos 2026.`
- **HK-G-0005** `Perbandingan Kelantan dan Terengganu: kedua-dua negeri tidak menetapkan kadar minimum mas kahwin, berserta sumber, tarikh dan fi nikah utama setiap negeri.`
- **HK-G-0006** `Jadual fi rasmi urusan perkahwinan di Perak, daripada permohonan kebenaran berkahwin RM1 hingga salinan perakuan nikah RM30, mengikut warta negeri 2013.`
- **HK-G-0007** `Garis masa kadar minimum mas kahwin di Pahang dari RM22.50 kepada RM100 selepas titah Sultan Pahang pada 28 Mac 2024`
- **HK-G-0008** `Jadual bayaran rasmi urusan nikah di Negeri Sembilan termasuk fi kebenaran berkahwin RM10, upah jurunikah RM120 dan upah saksi RM40 seorang`
- **HK-G-0009** `Perbandingan seksyen 21 Enakmen Undang-Undang Keluarga Islam Sabah 2004 dan seksyen 19 Ordinan Undang-Undang Keluarga Islam Sarawak 2001, kedua-duanya mewajibkan nilai mas kahwin direkodkan tanpa menetapkan jumlah minimum.`
- **HK-G-0010** `Rajah aliran menunjukkan kadar yang ditetapkan negeri, persetujuan dua keluarga, pilihan tunai atau hutang, dan nilai mas kahwin yang direkodkan oleh Pendaftar Nikah.`

Two of the ten end without a full stop (`HK-G-0007`, `HK-G-0008`). That is how
the board approved them. **Do not tidy it in the render** — fix it at a board,
or leave it. A silent copy edit to approved text is how approved text stops
meaning anything.

### 1.2 A1's card, and the board motion it corrects

The board of 24 Ogos 2026 carried a motion to build A1's card *"authored at
1200×1500"*. **Fourteen rows do not fit a 4:5 card at the legibility floor, at
any canvas size** — the ratio binds, not the pixels. The arithmetic is in the
template spec §1.2 and the measurements come from the generator's own
`measureText`.

A1's card is **2464 × 3480, Tier B, three columns**. The motion's dimensions were
a figure named in a room. This is the same asset measured.

**The `Tarikh ditetapkan` and `Anak dara / janda` columns stay in the page's
markdown table and do not go on the card.** Five columns at this canvas put every
column under 400px, and `Tiada kadar minimum ditetapkan` needs 1,292px at the
floor. The card carries the answer; the page carries the full record.

---

## 2. The eight in review (P1, P6)

Written 24 Ogos, humanizer-run, parser-validated. Covers rendered and on disk.
**No review verdict yet** — `aug-25-2026-brief-review-board-p1-p6.md` was
dispatched today and has no done log. Nothing below publishes ahead of that
board.

**Alt text in this section is new, written 25 Ogos 2026, `/humanizer`-passed, and
not yet board-approved.** It goes to the P1/P6 review board with the article.

The humanizer pass changed thirteen of the fourteen strings and caught one real
error, which is recorded here rather than quietly fixed: **HK-G-0024 originally
read `daripada RM40 sejam di Majlis Perbandaran Sepang hingga RM3,200 satu sesi
di MBSJ kategori A`. That is a false range** — an hourly rate and a per-session
rate are different units and do not form one. The alt text was repeating the same
unit-mixing error the article makes (§2.3), which is how the error was found.

### 2.1 P1 — Nikah & Undang-undang

| Asset | Article | Template | Tier | Data it renders |
|---|---|---|---|---|
| `HK-G-0011` | `rukun-nikah` | `urutan-langkah` `aliran` | **B, ~4,000px** | **The 21-step tertib wali**, in order, bapa kandung → wali hakim. `gaya: tegas` on node 1, `biasa` throughout, `lemah` on the final wali hakim node. One footnote carrying the four conditions under which wali hakim may act |
| `HK-G-0012` | `rukun-nikah` | `jadual-perbandingan` `lajur` | A | 2 entities × 7 attributes: `Bakal suami` / `Bakal isteri`, against the syarat each carries. 7 for the man, 6 for the woman — the seventh row on the woman's side reads `Tidak berkenaan` |
| `HK-G-0013` | `syarat-sah-nikah` | `jadual-perbandingan` `lajur` | A | **2 entities × 5 attributes: `Hukum Syarak` / `Enakmen negeri`**, against lelaki · perempuan · wali · saksi · sighah. The article's whole thesis, and its own cover alt text already describes this shape |
| `HK-G-0014` | `borang-nikah` | `jadual-perbandingan` `baris` | A | 6 Perak forms × 3 columns: `Borang`, `Untuk apa`, `Fi`. Borang 1 RM1 → Borang 6 RM20. The `Seksyen` column stays on the page |
| `HK-G-0015` | `borang-nikah` | `jadual-perbandingan` `baris` | A | 4 applicant categories × 1 column: bilangan dokumen. Warganegara lelaki 12 · warganegara perempuan 19 · bukan warganegara 8 · penduduk tetap 5. `jalur_kesimpulan` carries the two easily-missed extras |
| `HK-G-0016` | `lafaz-taklik` | `urutan-langkah` `aliran` | A | 3 nodes: isteri mengadu ke Mahkamah Syariah → Hakim Syarie mensabitkan → RM10 dibayar bagi pihak suami, talak khulu' jatuh. Footnote: the Perak text only |

**Alt text, P1:**

- **HK-G-0011** `Rajah susunan 21 wali nikah mengikut keutamaan, daripada bapa kandung sehingga wali hakim.`
- **HK-G-0012** `Jadual dua lajur menyenaraikan syarat bagi bakal suami dan bakal isteri, tujuh pada lajur suami dan enam pada lajur isteri.`
- **HK-G-0013** `Jadual dua lajur membandingkan syarat sah nikah mengikut hukum syarak dengan syarat tambahan dalam enakmen negeri, bagi lelaki, perempuan, wali, saksi dan sighah.`
- **HK-G-0014** `Jadual enam borang nikah Perak, daripada Borang 1 permohonan kebenaran berkahwin RM1 hingga Borang 6 kad nikah RM20.`
- **HK-G-0015** `Jadual bilangan dokumen bagi permohonan nikah di Pulau Pinang mengikut empat kategori pemohon, daripada lima hingga sembilan belas.`
- **HK-G-0016** `Rajah tiga langkah selepas syarat taklik berlaku: isteri mengadu ke Mahkamah Syariah, Hakim Syarie mensabitkan aduan itu, dan RM10 dibayar kepada mahkamah bagi pihak suami.`

**The `rukun-nikah` card is the highest-value graphic in this batch and it is not
close.** The 21-step wali order currently renders as one middot-separated
paragraph. It is an ordered sequence written as prose, on a 6,900/mo keyword, and
it is the clearest case in the whole map of a graphic that adds something the
page does not have. A reader working out whether their uncle can act as wali
cannot do it from that paragraph.

### 2.2 P6 — Venue, Kos & Perancangan

| Asset | Article | Template | Tier | Data it renders |
|---|---|---|---|---|
| `HK-G-0017` | `harga-sewa-dewan-kahwin` | `carta-jalur-kos` `unit: sesi` | A | 3 bands: MBPJ dewan komuniti RM160–RM450 · MBSJ kategori E RM880–RM1,440 · MBSJ kategori A RM3,200–RM3,600 |
| `HK-G-0018` | `harga-sewa-dewan-kahwin` | `carta-jalur-kos` `unit: sejam` | A | 2 bands: MP Sepang RM40–RM80 · MBDK Klang RM60–RM200. **Dewan Hamzah RM1,750/jam is a footnote line, not a bar** — see §2.3 |
| `HK-G-0019` | `harga-sewa-dewan-kahwin` | `urutan-langkah` `aliran` | A | The RM160-becomes-RM860 worked example, 4 nodes: sewa sesi RM160 → kebersihan dan elektrik RM100 → penghawa dingin RM100 sejam × 6 = RM600 → **RM860**, `gaya: tegas`. `nod_sisi`: cagaran RM200, label `dikembalikan` |
| `HK-G-0020` | `checklist-kahwin` | `kad-senarai-semak` | **B, ~4,000px** | Groups `12 bulan` to `3 bulan`, 19 items. `jalur_kesimpulan`: the three hard deadlines |
| `HK-G-0021` | `checklist-kahwin` | `kad-senarai-semak` | **B, ~3,600px** | Groups `1 bulan` to `Selepas majlis`, 16 items |
| `HK-G-0022` | `pakej-dewan-kahwin` | `jadual-perbandingan` `baris` | A | 10 Dewan Banquet extras × 2 columns, kerusi RM6 → skrin LED RM800 |
| `HK-G-0023` | `pakej-dewan-kahwin` | `kad-senarai-semak` | B | The 10 questions to ask about any package, ungrouped. `jalur_kesimpulan`: nine of the ten cannot be answered from a website |
| `HK-G-0024` | `bajet-kahwin` | `jadual-perbandingan` `baris` | A | 4 authorities × 1 column: kadar majlis perkahwinan. Sepang RM40–RM80 sejam · Klang RM60–RM200 sejam · MBPJ RM160–RM450 sesi · MBSJ RM880–RM3,200 sesi |

**Alt text, P6:**

- **HK-G-0017** `Carta jalur kadar sewa mengikut sesi bagi tiga kategori dewan, daripada RM160 di dewan komuniti MBPJ hingga RM3,600 di MBSJ kategori A pada cuti am.`
- **HK-G-0018** `Carta jalur kadar sewa dewan sejam bagi Majlis Perbandaran Sepang dan Majlis Bandaraya Diraja Klang, daripada RM40 hingga RM200.`
- **HK-G-0019** `Rajah empat langkah: sewa dewan RM160 satu sesi naik kepada RM860 apabila caj kebersihan, elektrik dan penghawa dingin dikira sekali.`
- **HK-G-0020** `Senarai semak persediaan kahwin, 12 bulan hingga 3 bulan sebelum majlis, 19 perkara mengikut urutan.`
- **HK-G-0021** `Senarai semak persediaan kahwin, sebulan sebelum majlis hingga selepas majlis, 16 perkara mengikut urutan.`
- **HK-G-0022** `Jadual 10 caj tambahan di Dewan Banquet MBPJ, daripada kerusi banquet RM6 seunit hingga skrin LED RM800.`
- **HK-G-0023** `Senarai 10 soalan yang perlu ditanya tentang mana-mana pakej dewan sebelum membuat tempahan.`
- **HK-G-0024** `Jadual kadar majlis perkahwinan bagi empat pihak berkuasa tempatan, dua menetapkan kadar sejam dan dua menetapkan kadar satu sesi.`

### 2.3 Two findings the cost chart forced out

Specifying `carta-jalur-kos` against real P6 data surfaced two things the article
should say and currently does not. Both go back to the writer, not to the
renderer.

**Dewan Hamzah is not comparable to a community hall, and putting it on the same
scale says it is.** RM1,750/hour against RM60/hour is a 29:1 spread; the Klang
community band renders at 26px, under the 40px floor, and the template throws.
That throw is the template working. The honest presentation is two objects: a
chart of the RM40–RM200 hourly band that most readers are actually choosing
between, and a separate line naming Dewan Hamzah as a different class of venue.
A single chart containing both makes the RM60 hall look free, which is exactly
the misreading the article was written to prevent.

**Units cannot be mixed and the article mixes them.** `harga-sewa-dewan-kahwin`
carries MBPJ and MBSJ per session, Klang and Sepang per hour, and MBPJ's Dewan
Banquet per four-hour block. Three units, one heading. The two charts above
separate them. **The article's own summary table should separate them too**, and
today it does not — `bajet-kahwin`'s four-row authority table puts `RM40/RM80 per
hour` in the same column as `RM880–RM3,200 sesi`, which is not a comparison.

---

## 3. The twelve (P3, P4, P5, P7)

All twelve are drafted, none reviewed, none published. Slugs, titles and volumes
are the writers' own. **The `Declared` column says whether the writer already put
the graphic in their `images:` block with alt text; where it says `new`, I am
adding it and the alt text is mine and `/humanizer`-passed.**

Assign `HK-G-0025` onward at production, in this order.

### 3.1 P3 — Ucapan, Doa & Adab

| Article | Graphic | Template | Tier | Data | Declared |
|---|---|---|---|---|---|
| `ucapan-pengantin-baru` | Nada ucapan ikut hubungan | `jadual-perbandingan` `baris` | A | 6 relationships × `Nada` and `Panjang yang sesuai` | **new** |
| `doa-pengantin-baru` | Amalan selepas akad | `jadual-perbandingan` `baris` | A | 4 rows × `Kedudukan` and `Sumber`. The fourth row is the finding: *upacara membatalkan air sembahyang = adat semata-mata* | **new** |
| `doa-majlis-perkahwinan` | Tiga edisi garis panduan JAKIM | `jadual-perbandingan` `lajur` | A | 3 editions × 4 attributes. **The 2026 edition dropped the wedding doa entirely** — that is the article's finding and the graphic exists to carry it | **new** |

- `ucapan-pengantin-baru` — `Jadual nada dan panjang ucapan pengantin baru mengikut enam jenis hubungan, daripada kawan rapat sehingga kenalan jauh.`
- `doa-pengantin-baru` — `Jadual empat amalan selepas akad dan kedudukannya, tiga sunat berserta sumber dan satu yang adat semata-mata.`
- `doa-majlis-perkahwinan` — `Jadual tiga edisi garis panduan doa JAKIM: tempoh bacaan turun daripada lima minit kepada dua hingga tiga minit, dan doa perkahwinan tiada dalam edisi 2026.`

**The doa texts stay as page text and get no card**, which is what the writer did
and it is right. The kit has no Arabic face and the generator resolves fonts from
the host. Rendering Qur'anic or hadith text in whatever Arabic font a render box
happens to have is not something I will approve.

### 3.2 P7 — Sebelum Nikah

| Article | Graphic | Template | Tier | Data | Declared |
|---|---|---|---|---|---|
| `cincin-tunang` | `P7-A1-cincin-tunang-hukum-adat.png` | `jadual-perbandingan` `lajur` | A | 2 entities, `Adat` / `Hukum`, 7 rows. The one hard ruling, that gold is haram for men (Muzakarah ke-52), sits on the hukum side | yes |
| `taaruf-maksud` | `P7-A2-taaruf-lapan-garis-panduan.png` | **`kad-senarai-semak`**, ordered | A | The 8 guidelines from Irsyad Hukum 854, in order | yes |
| `doa-majlis-pertunangan` | `P7-A3-rangka-doa-majlis.png` | `urutan-langkah` `aliran` | A | 4 parts of the doa frame, perenggan 6.1 → 6.2 i → 6.2 ii → 6.3 | yes |

**One template correction.** `taaruf-lapan-garis-panduan` reads as a numbered
sequence and it is not one — the eight guidelines are conditions that hold at the
same time, not steps taken in order. `urutan-langkah` would draw a connector
between them and imply a progression the source does not have.
**`kad-senarai-semak` with an ordered list keeps the numbering the writer wants
and drops the false sequence.** The alt text needs no change.

### 3.3 P4 — Busana

| Article | Graphic | Template | Tier | Data | Declared |
|---|---|---|---|---|---|
| `baju-pengantin-sewa-atau-beli` | `-jadual-sewa-beli.png` | `jadual-perbandingan` `baris` | A | 5 rental bands × published price, each with vendor and date checked | yes |
| | `-bilangan-baju.png` | **`grid-kategori`** | A | 3 majlis structures as categories, the outfits needed as members | yes |
| `songket-tenunan-tangan-atau-cetak` | Harga songket tersiar | `jadual-perbandingan` `baris` | A | 5 rows × `Harga tersiar` and `Peniaga`, RM477 to RM11,500 | yes |
| | Cara membezakan tenunan daripada cetakan | `urutan-langkah` `aliran` | A | The 3-step physical test: belek belakang kain · sentuh coraknya · timbang di tangan | yes |
| `inai-tangan-pengantin` | `-jadual-jenis.png` | `jadual-perbandingan` `lajur` | A | 3 inai types × 5 attributes, including `Tindak balas alahan dilaporkan` | yes |
| | `-garis-masa.png` | `urutan-langkah` `garis-masa` | **B** | The PPD reaction window, 7 to 14 days, against the countdown to the majlis | yes |

`bilangan-baju` is a taxonomy, not a ratio — three majlis shapes, each with a set
of outfits. `rajah-nisbah` is for two counts in proportion and would misdescribe
it.

**The `inai` timeline is the highest-stakes graphic in the batch and it is not
close.** That article's entire safety argument is a claim about colour and
timing: natural inai matures orange to brown over a day or two, PPD-blackened
paste goes jet black in hours, and a contact reaction lands 7 to 14 days after
first exposure. That is a claim about *when* something happens, argued in prose,
on a page whose head SERP is nothing but images. **Build this one first of the
twelve.**

### 3.4 P5 — Pelamin, Kad & Cenderahati

| Article | Graphic | Template | Tier | Data | Declared |
|---|---|---|---|---|---|
| `pelamin` | `-pelamin-gaya.png` | `grid-kategori` | A | 4 styles: tradisional istana · moden minimalis · taman · gabungan | yes |
| | `-pelamin-sebut-harga.png` | `kad-senarai-semak` | **B** | The 11-item quotation checklist, each with its supporting line | yes |
| | Angka pelamin yang tersiar | `jadual-perbandingan` `baris` | A | 8 rows × `Angka tersiar` and `Siapa menyiarkannya`, RM100 to RM31,900 | **new** |
| `contoh-kad-jemputan-kahwin` | `-susunan.png` | `urutan-langkah` `aliran` | **B** | The 10 things a card must carry, top to bottom in card order | yes |
| | `-cetak.png` | `jadual-perbandingan` `lajur` | A | 2 entities, cetak / digital, × 3 attributes | yes |
| `bunga-telur` | `-bunga-telur-jalur-kos.png` | `carta-jalur-kos` `unit: sekuntum` | A | 3 bands: 64 sen–90 sen · RM1.20–RM1.50 · RM1.56–RM1.58 | yes |
| | Beza bunga telur, bunga pahar dan bunga rampai | `jadual-perbandingan` `lajur` | A | 3 entities × `Apa ia` and `Di mana ia berada` | **new** |

- `pelamin` price table — `Jadual lapan angka pelamin yang tersiar, daripada pintu gerbang RM100 sehingga pakej dewan dengan katering RM31,900, berserta nama peniaga yang menyiarkannya.`
- `bunga-telur` terminology — `Jadual membezakan bunga telur, bunga pahar dan bunga rampai, apa setiap satu dan di mana ia berada dalam majlis.`

### 3.5 The one declared graphic no template in this kit can render

**`C5-4-A1-bunga-telur-anatomi.png`** — the two basic forms, berjoran on an
upright stem and beraga in a small basket, labelled part by part.

That is an **illustration of a physical object**, not a data card. None of the six
templates draws one, and none of them should: an anatomical diagram needs drawn
artwork and the kit is a typographic renderer.

**Three articles now want something this kit does not make**, and they are worth
naming together because they are one gap rather than three:

| Article | Wants | Why the kit cannot |
|---|---|---|
| `bunga-telur` | An anatomy diagram of two forms | Drawn artwork |
| `inai-tangan-pengantin` | A side-by-side of natural inai against PPD black | Photography. The P4 gap list flags it as that pillar's priority |
| `doa-pengantin-baru`, `doa-majlis-perkahwinan` | Arabic doa text set properly | No Arabic face; fonts resolve from the render host |

**Do not stretch the kit to cover any of them.** An illustration commission, a
photography commission and an Arabic-typesetting decision are three different
pieces of work with three different owners, and a typographic renderer asked to
fake any of them produces something worse than the prose it replaces.
**`bunga-telur-anatomi` comes out of the front matter until it has a path to
existing**, because a declared image that cannot be produced blocks ingest.

## 4. Task 1.3 — which of the live eight get an in-article data card

### 4.1 What I can and cannot verify, stated first

The board's finding of 24 Ogos 2026 is on the record and I am relying on it:

> Ahrefs, `my`, 24 Ogos 2026: 13 of 13 cluster keywords carry image SERP
> features; the image pack sits at **position 1 on `mas kahwin johor`**
> (1,000/mo), above the AI Overview, and is occupied by typographic data cards.

**I could not re-verify it. The Ahrefs and Search Console tools are not in this
agent's toolset** — the brief said they were available and they are not. So the
SERP evidence below is a one-day-old recorded pull, not a fresh one, and the
per-keyword volumes are the 23 Ogos 2026 pull recorded in
`aug-23-2026-clusters-launch-plan.md`. Both are real and both are dated. Neither
is today's.

**I also have no measurement of image-pack click-through for Malay queries**, and
I am not going to model one. Anyone who hands you a number for that has made it
up.

### 4.2 The argument, and where it actually leads

The coverage seat's argument was: a markdown table is not indexable as an image;
a PNG of it is; the pack sits at position 1 on a 1,000/mo query we are choosing
not to enter. That is correct and it falsified my §0 cut.

But it does not generalise the way the brief expects, for one reason that only
becomes visible once you cost it:

**The template is the investment. The card is nearly free.**

Once `jadual-perbandingan` exists, generating A5's fee card is writing a JSON
file. So the marginal question per card is not *"is this worth an afternoon"* —
it is not an afternoon, it is twenty minutes. The marginal question is **"does
this card tell the truth about this article when it is seen without the
article"**, because that is the only condition an image-pack result is ever seen
in.

That is an editorial question, not a traffic one, and it is mine. It gives a
different answer to the traffic ranking, and the difference is the whole finding.

### 4.3 The ranking

**Build for the image pack — 2.**

| # | Asset | Article | Keyword demand | Why |
|---|---|---|---|---|
| 1 | `HK-G-0001` | A1 | `mas kahwin ikut negeri` 2,000/mo; the page absorbs six parent-topic-merged keywords, ~5,400/mo combined | The only card in the cluster whose data no competitor holds in one place. Fourteen jurisdictions, sourced and dated. It reads correctly with no article around it: it says what the rate is, and where there is none it says so in a full sentence rather than a dash |
| 2 | `HK-G-0007` | A6 | `mas kahwin pahang` 700 + `mas kahwin negeri sembilan` 700 = 1,400/mo | The only grade-A/A data in the cluster. RM22.50 → RM100 after the 28 Mac 2024 titah is the single most searched *change* here, and no incumbent has a dated timeline of it. Node 4 — `tarikh kuat kuasa tidak dinyatakan` — is what makes it ours |

**Build, but not for the pack — 2.**

| # | Asset | Article | Why the pack is the wrong reason |
|---|---|---|---|
| 3 | `HK-G-0004` | A3 | `mas kahwin johor` 1,000/mo is the exact query whose pack sits at position 1 — and the pack is full of bare `RM22.50` cards. **Our honest card says the figure is unconfirmed.** It will lose to a confident wrong answer, and it should. Build the timeline because it shows the figure's provenance, and accept it does worse in the pack than the thing it is correcting. I will not reverse that for traffic |
| 4 | `HK-G-0010` | A8 | Long-tail, no image demand behind it. But it is **the one graphic of the ten that adds information rather than re-rendering a table** — A8 has no table at all — and it is the clearest thing on that page. Build it for the reader |

**Do not build — 4.** A2 `HK-G-0003`, A4 `HK-G-0005`, A5 `HK-G-0006`,
A7 `HK-G-0009`.

| Asset | Why not |
|---|---|
| `HK-G-0003` A2 | ~100/mo, definitional. The "table" is three terms against four attributes. A card of a definition seen without its article is a claim without a source |
| `HK-G-0005` A4 | 1,400/mo, and every cell of the comparison reads `Tiada kadar minimum ditetapkan`. A card whose data is four blanks tells a reader nothing they cannot get from the H1 |
| `HK-G-0006` A5 | 800/mo. A six-row fee schedule from a 2013 gazette. Nobody image-searches a fee schedule, and it is the most expiring content in the cluster — a card of it is a liability with a shelf life |
| `HK-G-0009` A7 | 700/mo. Two statute panels. It is text set in boxes, and text set in boxes is not a data card |

**And `HK-G-0002`, A1's category grid — build it, and build it second.** It is not
in the ranking above because it is not a data card and will not enter a pack. It
is the clearest explanation of *why* six states have no rate, on the page that
carries the most traffic in the cluster. That is worth twenty minutes on reader
grounds alone.

### 4.4 What it is worth, honestly

**Six cards, not ten. Two of them for search, four for the reader.**

The number I will stand behind: **we currently receive zero of the image demand
on 13 of 13 cluster keywords, because we have no image on any of them.** Going
from zero to two well-made cards on the two highest-volume, best-sourced pages is
the whole of the available upside I can evidence. Everything past that is
reader-facing quality, which is worth doing and is not worth forecasting.

**Three costs the board should hold against it.**

1. **`Disemak Ogos 2026` is baked into every render.** On 1 Januari 2027 every
   card misstates its own currency. Six cards is six re-renders every January,
   and that is a recurring commitment, not a one-off.
2. **Renders are host-dependent** until a font is embedded — spec §0.4. Two
   machines can produce two different files from the same JSON.
3. **A3's card will underperform the pack and that is the correct outcome.** If
   somebody later reads that as the programme failing, this paragraph is the
   record that it was the intended result.
