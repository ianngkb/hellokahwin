# Specification — the HelloKahwin graphic template kit

**Owner:** managing-editor · **Date:** 24 Ogos 2026
**Brief:** `aug-24-2026-brief-asset-register-and-graphic-kit-spec.md`, Task 3
**Status:** specification only. Nothing here is built. Engineering is BMAD's.

This is written to be built from without asking me questions. Where a decision was
mine to make I have made it and said why. Where something is genuinely not
decided, it is in §2 under Findings, named rather than improvised.

---

## 0. READ THIS FIRST — the minimum path, CEO addendum 24 Aug 2026

**Build `kad-tajuk` (§7) and nothing else. Produce 8 graphics. Publish.**

The CEO cut scope after this spec was written. The rest of the document stands
and is still the plan for the full kit, but it is no longer the path to
publishing C2.4.

**All ten in-article graphics are cut or absorbed into prose.** Nine of the ten
were specified in their own drafts as a re-render of a markdown table that
already sits on the page directly above them. Two need a short prose edit first
(A3 and A4, §0.1). No template in §5 is needed to publish these eight articles.

**No written standard is broken by this.** The PANDUAN template in
`aug-23-2026-framework-content.md` line 210 names C2.4 explicitly and mandates
*"at least one table"* — not an image. Its quality bar's only image line is
number 14, about alt text. The *"one image per H2 minimum"* rule at line 227
belongs to the SENARAI template and does not apply here.

**What still does not move:** every cover is `licenseClass: G`, licensor
HelloKahwin, credit `Grafik: HelloKahwin`, with real Malay alt text and a
register row.

**Board ruling, 24 Ogos 2026 — the cover carries NO ringgit figure.** The
generator brief specified figure-bearing "state-figure covers". The accuracy seat
blocked that for six of eight articles and found the brief's own table wrong in
four rows; the coverage seat reached the same conclusion on search evidence. The
brief's tie-break settles it: *"If a draft and this table disagree, the draft
wins."* Reasoning and the per-card record:
`docs/work-done/aug-23-2026-session-01/aug-24-2026-done-board-c24-cover-alt-text.md`.

**Skop lines, title lines and alt text for all eight are board-approved** — §7.4
below. Render them exactly. **The gate is now the render**, not the copy: nothing
ingests until one real card exists and all four crops have been inspected.

### 0.1 The two prose edits

| Article | Edit | Why |
|---|---|---|
| A3 johor | Add a four-row dated table under H2 *Dari mana datangnya angka RM22.50?* — 1935, 2019/2020, 2022, Mac 2024, Ogos 2026 | The chronology is in the prose but split across three H2s. A table makes it one object, and PANDUAN wants a table anyway |
| A4 kelantan-terengganu | Add a four-row two-column table, Kelantan against Terengganu: kadar minimum, sumber, tarikh, fi nikah utama | The contrast is stated in prose but never assembled side by side |

Both are writer edits of about ten minutes and both go back through the board,
because a new table is new published content.

---

## 1. The number (full kit)

**The eight C2.4 articles need 18 graphics.**

| | Count | Where it comes from |
|---|---|---|
| In-article graphics, each with a board-approved spec in its draft | **10** | The `*[IMEJ n di sini]*` markers and their `## IMAGE NOTES` blocks |
| Cover images, one per article | **8** | `cover` is required by the ingest parser and is not optional |
| **Total** | **18** | |

**The brief says 19. The real number is 18, and the difference matters** — see
§2.1. Of the 18, ten are fully specified by the review board and eight have never
been specified by anybody.

**Only three of the six template types are needed to ship these eight articles.**
Checklist card, ratio diagram and cost band chart are not exercised by C2.4 at
all. Build the three that are, ship, then build the rest against a cluster that
uses them. That is §5.

---

## 2. Findings — where reality and the strategy disagree

### 2.1 Nineteen placeholders, eighteen graphics

I counted every image marker across the eight `*-REVIEWED.md` drafts. There are
**ten** in-article markers, not eleven:

| Draft | Markers |
|---|---|
| A1 mas-kahwin-ikut-negeri | 2 |
| A2 apa-itu-mas-kahwin | 1 |
| A3 mas-kahwin-johor | 1 |
| A4 mas-kahwin-kelantan-terengganu | 1 |
| A5 mas-kahwin-perak | 1 |
| A6 mas-kahwin-pahang-negeri-sembilan | 2 |
| A7 mas-kahwin-sabah-sarawak | 1 |
| A8 mas-kahwin-melebihi-kadar-minimum | 1 (written `GRAFIK 1`, not `IMEJ 1`) |

Ten, plus eight covers, is 18. I cannot reconstruct a nineteenth and I am not
going to pad the count to match the brief.

### 2.2 The eight covers are the actual blocker, and no draft specifies them

`cover: imageSchema` in `src/lib/inspire/article-file.ts` is **not optional**. It
requires `file`, `alt`, `credit`, `licenseClass` and `licensorName`. No draft
contains a cover specification — not a description, not alt text, not a caption.
The review board specified every in-article graphic in detail and specified no
cover at all.

So the ten graphics everyone has been discussing are the well-understood half.
The eight nobody has written a word about are the half that stops ingest.

**A cover cannot be one of the six templates.** Covers go through the smart-crop
pipeline and the in-article graphics do not — see §2.3. §7 specifies a seventh
template for them.

### 2.3 Only covers are crop-constrained. In-article graphics are not

`CROP_TARGETS` in `src/lib/storage/smart-crop.ts` generates four crops for every
uploaded image. But every render call site reads them from
`article.coverImageSmartCrops` — `(public)/artikel/[category]/[slug]/page.tsx`
lines 417, 615, 617, 688, 812; `(public)/page.tsx` line 122;
`components/inspire/article-card.tsx` line 46. **Body images render from
`variants`, at their own aspect ratio.**

That is the single most useful fact in this document for whoever builds the kit.
A table graphic placed in the body is never cropped, so it can be as tall as it
needs to be. A cover is cropped to four ratios from 4:5 to 3.52:1, so it can
carry almost no data.

With Rekognition off the focal point comes from Sharp saliency, which on a flat
graphic is arbitrary. A 14-row table auto-cropped to 2464×700 is a horizontal
slice through row seven. Covers must be designed so that every crop lands on
something readable — §7.2.

### 2.4 The brand palette exists in code. The document that ratified it does not

**There is a written palette**, and it is not improvised: `src/app/globals.css`
carries a full token set under the heading *Design System v2 "Plum Forward"*.
Values are in §3.1 below, copied from the file.

**But ten code comments cite `DESIGN.md` as the ratifying authority — "DESIGN.md,
ratified 2026-07-04" — and no `DESIGN.md` exists** in the site repo, in either
worktree, or in this repo. The tokens are the only surviving statement of the
design system. Treat `globals.css` as the source of truth, because today it is
the only source there is.

### 2.5 There is no brand chart palette, and nothing in C2.4 needs one

`--chart-1` through `--chart-5` are shadcn's stock defaults, unmodified:
`oklch(0.646 0.222 41.116)` orange, `oklch(0.6 0.118 184.704)` teal,
`oklch(0.398 0.07 227.392)` blue, and two ambers. They clash with plum and brass
and no one chose them for HelloKahwin.

**I am not inventing a replacement.** A categorical data-series palette is a real
design decision and it belongs to whoever owns the design system. It does not
block C2.4: none of the three needed templates plots multiple series. Graphics use
the brand tokens in §3.1 and nothing else.

### 2.6 The site has no fixed typeface, so there is nothing for a graphic to match

`globals.css` line 25: *"HelloKahwin serves system font stacks — zero webfont
bytes for an audience on cheap Android + slow connections."* `--font-cormorant`
resolves to Georgia, `--font-geist` to the platform sans. Geist and Geist Mono are
loaded through `next/font` **only in the `(admin)` console layout**, not on the
public site.

Two consequences:

1. The public site renders in a different typeface on every device. There is no
   house face for a graphic to be consistent with.
2. **A rasterised graphic cannot use a system stack at all.** The render box's
   installed fonts decide the output, and a Linux build agent has neither Georgia
   nor Segoe UI. Fonts must be embedded at render time or the graphic is
   non-deterministic.

So the typeface is a free choice, and the criteria are legibility of Malay text
and RM figures at phone size, plus an open licence recordable under class G. §3.2
picks on those grounds.

### 2.7 The strategy asks for SVG. The pipeline will not keep it

Strategy §4.4: *"Graphics: SVG where possible, otherwise PNG at 1,600px."*
`generateVariants` encodes every variant with `.webp({quality})` unconditionally
(`image-variants.ts` line 92), and `ingest-article.mts` line 687 derives
`mime_type` as `'image/' + extension`. An SVG handed to ingest is rasterised to
WebP by sharp, using the build box's fonts.

**Author in SVG, rasterise to PNG deterministically with fonts embedded, hand
ingest the PNG.** The SVG is the editable source and belongs in the repo; it is
not the published artefact. §6.

### 2.8 Three field vocabularies describe the same asset

The parser wants `credit`, `creditUrl`, `licenseClass`, `licensorName`. The style
guide §13.2 wants `nama pemilik`, `jenis pemilik`, `URL sumber asal`, `status
kebenaran`, `tarikh diperoleh`. The strategy §3.2 lists ten fields in a third
wording. Every draft's `Asset record:` line uses the style guide's set, so ten
approved graphics carry field names the parser does not know.

`docs/asset-register/README.md` §3 reconciles all three: columns feeding the
parser carry the parser's own names. Whoever produces a graphic fills the
register row, not the draft's prose line.

---

## 3. Brand

### 3.1 Palette

Copied verbatim from `src/app/globals.css`, the `:root, .ds-surface-public` block.
Graphics use the light values only — a graphic is a file, not a themed surface,
and it will be viewed on white, on grey, and inside WhatsApp.

| Token | Value | Use in a graphic |
|---|---|---|
| `--primary` | `oklch(0.22 0.055 310)` midnight plum | Header bands, title text, rules that carry meaning |
| `--plum-deep` | `oklch(0.17 0.05 310)` | The darkest surface. Footer band of a graphic |
| `--plum-wash` | `oklch(0.965 0.012 310)` | Alternating row tint. 3% tint, safe under small text |
| `--plum-wash-border` | `oklch(0.9 0.025 310)` | Rule bounding a wash band |
| `--brass` | `oklch(0.78 0.065 85)` champagne | Accent **fills only**. Never text on light |
| `--brass-deep` | `oklch(0.55 0.065 85)` | Brass that is legible as text on light (4.87:1) |
| `--background` | `oklch(0.985 0.004 75)` warm off-white | Graphic canvas |
| `--card` | `oklch(1 0 0)` | Cells and cards that must lift off the canvas |
| `--surface-subtle` | `oklch(0.97 0.005 75)` | Zebra striping alternative to plum-wash |
| `--foreground` | `oklch(0.18 0.005 75)` warm near-black | All body text and figures |
| `--muted-foreground` | `oklch(0.45 0.008 75)` | Source lines, date stamps, footnotes |
| `--border-strong` | `oklch(0.62 0.008 75)` | Table gridlines. ≥3:1, the WCAG 1.4.11 threshold |
| `--hairline` | `oklch(0.91 0.008 75)` | Decorative rules only. Never a gridline a reader must follow |
| `--warning-strong` | `oklch(0.55 0.12 75)` | `belum disahkan` flags. Legible as text |
| `--success` | `oklch(0.55 0.12 155)` | Reserved. Not used in C2.4 |

**Rules.**

- **Never `--brass` as text on a light background.** It is 2.4:1. Use
  `--brass-deep`.
- **`--hairline` is never a table gridline.** A reader tracking across fourteen
  rows on a phone needs `--border-strong`.
- **Colour never carries meaning alone.** A `belum disahkan` row is flagged with
  a word, and colour on top. Strategy quality bar, and roughly one Malaysian man
  in twelve cannot separate the plum from the warm grey.
- No gradients, no drop shadows, no rounded photo frames, no decorative
  flourishes. A2's board note is the house position: *"clean, no decoration, no
  emoji, no ring or flower icons. This is a reference graphic."*

### 3.2 Type

The site has no fixed face (§2.6), so this is a decision rather than a match.

**Use Geist for all label and body text, and Geist Mono for ringgit figures in
table cells.** Reasoning, in order:

1. Both are already in this codebase, loaded through `next/font` in the `(admin)`
   layout. Using them adds no new vendor and no new licence to record.
2. Both are SIL Open Font Licence, so the class G register requirement — *"with
   any third-party font or icon licence recorded"* — is satisfied by one line.
3. Geist Mono gives tabular figures. `RM22.50` above `RM300` above `RM1,000`
   align on the decimal without hand-kerning, and a fee table where the ringgit
   column does not align reads as amateur at exactly the moment it is asking to
   be trusted.

**Do not use a display serif in a graphic.** `--font-cormorant` is a display face
with a small x-height; `globals.css` line 470 already says it "gets thin and
tiring at 16px". A graphic is read at less than that.

**Embed both faces in the SVG and in the rasteriser** (§6). Never reference them
by family name and hope.

| Role | Face | Size at the 1600px authoring width | Weight |
|---|---|---|---|
| Graphic title | Geist | 44px | 600 |
| Column header | Geist | 30px | 600 |
| Cell text, labels | Geist | 30px | 400 |
| Ringgit figures | Geist Mono | 30px | 500 |
| Emphasis inside a cell | Geist | 30px | 600 |
| Sidenote, footnote | Geist | 26px | 400 |
| Source and date footer | Geist | 24px | 400 |
| Credit | Geist | 24px | 500 |

**28px at 1600px authoring width is the floor. Nothing smaller, ever.** §8.

---

## 4. Malay label conventions

Binding. These are style guide §7 applied to a graphic, and a reviewer checks
them the same way.

**Ringgit.** `RM300`, no space. `RM22.50` — sen kept where the real figure has
sen; rounding a statutory figure is a factual error. `RM1,000` with a comma. In a
table cell a range may be written `RM300 – RM500`; in a sentence inside a graphic
it is `RM300 hingga RM500`.

**Dates.** `23 Ogos 2026`. Malay month names always — Januari, Februari, Mac,
April, Mei, Jun, Julai, Ogos, September, Oktober, November, Disember. A numeric
date is permitted only inside a column that is explicitly a date column.

**The date stamp is not optional and it lives inside the graphic.** Every
template's footer carries `Disemak Ogos 2026`. The drafts are unanimous on why:
*"so the date travels with the image when it is shared."* A graphic screenshotted
into WhatsApp loses its caption and keeps its pixels.

**State names.** Full official Malay forms. Pulau Pinang, never Penang. Melaka,
never Malacca. Johor, never Johore. Terengganu, never Trengganu. No abbreviations
and no postal codes — not `P. Pinang`, not `N. Sembilan`.

**House state order, every state table, every time:**

> Perlis · Kedah · Pulau Pinang · Perak · Selangor · Wilayah Persekutuan Kuala
> Lumpur · Putrajaya · Negeri Sembilan · Melaka · Johor · Pahang · Terengganu ·
> Kelantan · Sabah · Sarawak · Labuan

A reader who checks two of our articles must not have to re-learn the layout. The
order is not sorted by value and it is not alphabetical.

**Headings inside a graphic are sentence case.** *Kadar minimum mas kahwin
mengikut negeri*, never *Kadar Minimum Mas Kahwin Mengikut Negeri*.

**Never abbreviate a finding to fit a cell.** Where a state sets no rate, the cell
reads `Tiada kadar minimum ditetapkan` in full. A1's board note requires it
explicitly. An empty cell, a dash or `-` reads as missing data rather than as the
finding it is. **If the text does not fit, the cell gets taller.**

**Authorities:** full name with the acronym in brackets on first appearance in
the graphic, acronym after — *Jabatan Agama Islam Selangor (JAIS)*.

**A label takes its wording from the article's answer, never from its keyword.**
*(Added 24 Ogos 2026, Editorial Review Board, after two blocking findings.)*

This is the rule that would have caught both. A card headed *Kadar mas kahwin dan
fi rasmi di Perak* sat above an article whose H1 reads *tiada kadar minimum
ditetapkan*. The label was not wrong as a topic. It was wrong as a claim, because
a topic label on a page that finds there is no rate reads as a statement that
there is one.

Six of the eight C2.4 articles answer *tiada* or *belum disahkan*. Any title,
heading or label in a graphic is written from the H1's **answer half**:

| Article H1 answer | Label |
|---|---|
| *tiada kadar minimum ditetapkan* | `Tiada kadar minimum, tetapi ada fi rasmi` |
| *kadar beredar, belum disahkan* | `Kadar yang beredar, belum disahkan` |
| a confirmed rate exists | `Kedua-dua negeri menetapkan kadar minimum` |

The one exception is an article whose answer cannot compress to a phrase — A1's
answer is a 14-row table — where the keyword is the honest label.

**Banned inside a graphic, as in body copy:** exclamation marks, emoji, ALL CAPS
for emphasis, *seserahan*, *pernikahan*, *bisa*, *ianya*, and English where an
everyday Malay word exists — `muat turun` not `download`, `senarai semak` not
`checklist`.

---

## 5. The six templates, and which C2.4 needs

| # | Template id | C2.4 uses | Build order |
|---|---|---|---|
| 1 | `jadual-perbandingan` — state comparison table | **6** | **First** |
| 2 | `urutan-langkah` — step sequence | **3** | **Second** |
| 3 | `grid-kategori` — category grid | **1** | **Third** |
| 4 | `kad-senarai-semak` — checklist card | 0 | Defer |
| 5 | `rajah-nisbah` — ratio diagram | 0 | Defer |
| 6 | `carta-jalur-kos` — cost band chart | 0 | Defer |
| 7 | `kad-tajuk` — cover title card (§7) | **8** | **With #1** |

**Templates 4, 5 and 6 are not needed to publish C2.4 and should not be built
now.** Their content lives in C2.1 hantaran (category grid, checklist) and C2.3
gubahan dulang (ratio diagram), which the launch sequence places later. Building
them now means building against no real data, and a template built against no
real data gets rebuilt.

They are specified below anyway, at lower resolution, because the brief asked for
six and because whoever builds the first three should know the shape of the rest.

---

### 5.1 `jadual-perbandingan` — comparison table

**For.** Any entity × attribute matrix. Its dominant use is state comparison, but
the entity axis is configurable and C2.4 uses it for terms (A2) and for statutes
(A7) as well as for states.

**Two layouts, chosen by column count, not by taste.**

- **`lajur`** — entities are columns, attributes are rows. Up to 4 entities.
  A2, A4, A7.
- **`baris`** — entities are rows, attributes are columns. 5 or more entities.
  A1's fourteen jurisdictions.

**Phone layout is not a scaled-down desktop layout.** In `lajur` above 3
entities, and in `baris` above 3 attribute columns, the graphic reflows to one
stacked card per entity. A five-column table shrunk to 390px is a picture of a
table, not a table. §8.

**Input**

```jsonc
{
  "template": "jadual-perbandingan",
  "layout": "baris",                     // "baris" | "lajur"
  "tajuk": "Kadar minimum mas kahwin mengikut negeri",
  "entiti_label": "Negeri",              // header of the entity axis
  "entiti": [
    {
      "nama": "Selangor",
      "sel": {
        "kadar": { "nilai": "RM300", "jenis": "rm" },
        "pihak_berkuasa": { "nilai": "Jabatan Agama Islam Selangor (JAIS)" },
        "tarikh": { "nilai": "4 Februari 2010", "jenis": "tarikh" }
      }
    },
    {
      "nama": "Kelantan",
      "sel": {
        "kadar": { "nilai": "Tiada kadar minimum ditetapkan", "jenis": "teks" },
        "pihak_berkuasa": { "nilai": "TIDAK DIKETAHUI" },
        "tarikh": { "nilai": "Disemak Ogos 2026", "jenis": "tarikh" }
      },
      "bendera": "belum-disahkan"        // null | "belum-disahkan" | "tiada-kadar"
    }
  ],
  "atribut": [                            // column order is this array's order
    { "id": "kadar", "label": "Kadar minimum" },
    { "id": "pihak_berkuasa", "label": "Ditetapkan oleh" },
    { "id": "tarikh", "label": "Tarikh" }
  ],
  "jalur_kesimpulan": null,               // optional full-width band, see A7
  "sumber": "Jadual Kedua, Pk. P.U. 30, Warta Kerajaan Negeri Perak, 1 Jun 2013",
  "disemak": "Ogos 2026",
  "kredit": "Grafik: HelloKahwin"
}
```

**Renderer rules.**

- `jenis: "rm"` renders in Geist Mono, right-aligned, decimal-aligned within the
  column. Every other type is Geist, left-aligned.
- `bendera: "belum-disahkan"` adds a `--warning-strong` left edge rule 6px wide
  **and** the word `belum disahkan` in the cell. Never colour alone.
- `jalur_kesimpulan` renders as a full-width band across the foot of the data
  area, above the source footer, in `--plum-wash` with a `--plum-wash-border`
  rule. A7's *Nilai direkodkan, bukan ditetapkan* is this.
- **Cells grow to fit. Text never truncates, never ellipsises, never shrinks
  below the 28px floor.**
- Where `entiti` is a state list, the renderer **asserts** the house order of §4
  and fails the build on a mismatch rather than silently reordering. Getting this
  wrong across fourteen rows is invisible in review and obvious to a reader who
  reads two articles.

**Serves:** A1 Imej 1 · A2 Imej 1 · A4 Imej 1 · A5 Imej 1 · A6 Imej 2 · A7 Imej 1.

---

### 5.2 `urutan-langkah` — step sequence

**For.** An ordered progression. Two modes, one renderer:

- **`garis-masa`** — a timeline. Nodes carry a date and the ordering is
  chronological. A3, A6 Imej 1.
- **`aliran`** — a flow. Nodes are stages, no dates, and a node may sit off the
  main path. A8.

**Input**

```jsonc
{
  "template": "urutan-langkah",
  "mod": "garis-masa",                   // "garis-masa" | "aliran"
  "tajuk": "Garis masa kadar RM22.50 di Johor",
  "nod": [
    {
      "penanda": "1935",                 // the date, or the step number
      "tajuk": "Ahkam Syar'iyyah Johor, perkara 309",
      "teks": "Mahar seluruh negeri ditetapkan sebanyak sekati perak (600 gram), bersamaan RM22.50.",
      "sidenota": "Disifatkan oleh pengkaji sebagai had maksimum",
      "gaya": "lemah",                   // "biasa" | "lemah" | "tegas"
      "nota_kaki": null                  // "A" | "B" | null — marker into nota_kaki[]
    }
  ],
  "nod_sisi": [                          // `aliran` only. Off the main path.
    {
      "selepas": 2,                      // index of the node it branches from
      "tajuk": "Duit hantaran dirunding berasingan",
      "label": "bukan mas kahwin",
      "nota_kaki": "A"
    }
  ],
  "nota_kaki": [
    { "id": "A", "teks": "Di Selangor, wang hantaran daripada pihak lelaki dikira sebagai mas kahwin (fatwa Selangor, 4 Februari 2010)." }
  ],
  "sumber": "…",
  "disemak": "Ogos 2026",
  "kredit": "Grafik: HelloKahwin"
}
```

**Renderer rules.**

- **`gaya` is load-bearing and is not decoration.** `lemah` renders the node with
  a dashed connector and a `--muted-foreground` marker; `biasa` is solid;
  `tegas` fills the marker with `--primary`. A3's board note requires node 1 to
  read as a researcher's characterisation and nodes 2–3 as a circulating figure,
  *"so the graphic carries the article's actual finding rather than flattening it
  into one continuous rate."* A renderer that draws every node identically
  reintroduces a claim the board removed.
- `nod_sisi` renders visibly off the main path — offset, connected by a dashed
  line, with its `label` as a chip. It must not read as a stage in the sequence.
- Footnotes render inside the graphic, under the sequence, above the source
  footer. They are not captions. A8's two footnotes are fenced factual scope and
  they cannot leave the image.
- **`sidenota` never truncates.** A6 node 4 is *"Tarikh kuat kuasa: tidak
  dinyatakan dalam mana-mana sumber rasmi"* — the board's note says that node is
  what separates the page from every other chart in the market and that removing
  it fabricates a fact we do not have. It is long, and it stays.
- On a phone the timeline is **vertical**, top to bottom. A horizontal timeline
  with five dated nodes cannot be read at 390px.

**Serves:** A3 Imej 1 · A6 Imej 1 · A8 Grafik 1.

---

### 5.3 `grid-kategori` — category grid

**For.** A taxonomy — a set of categories, each with members. Not a comparison and
not a sequence.

**Input**

```jsonc
{
  "template": "grid-kategori",
  "tajuk": "Siapa yang menetapkan kadar mas kahwin",
  "kategori": [
    {
      "tajuk": "Fatwa diwartakan",
      "ahli": ["Selangor"],
      "nota": null
    },
    {
      "tajuk": "Tiada penetapan",
      "ahli": ["Perlis", "Kedah", "Pulau Pinang", "Perak", "Terengganu", "Kelantan"],
      "nota": null,
      "gaya": "kosong"                   // "biasa" | "kosong" — an absence, not a mechanism
    }
  ],
  "nota_berasingan": "Johor, Sabah dan Sarawak: kadar beredar, belum disahkan semula.",
  "sumber": "…",
  "disemak": "Ogos 2026",
  "kredit": "Grafik: HelloKahwin"
}
```

**Renderer rules.**

- One card per category. Card height is set by its longest member list; cards in a
  row share a height.
- `gaya: "kosong"` renders on `--surface-subtle` with a `--border-strong` outline
  rather than a plum fill. *Tiada penetapan* is the absence of a mechanism and
  drawing it as a fifth mechanism is a factual error — A1's board note calls it
  out as *"four mechanisms, and six jurisdictions that use none of them."*
- `nota_berasingan` renders as a separate band below the grid, not as a card.
- 2 columns on desktop widths, 1 on phone. Never 3 — six member names in a third
  of 390px wrap to nothing readable.

**Serves:** A1 Imej 2.

---

### 5.4 `kad-senarai-semak` — checklist card *(not needed for C2.4)*

A titled card holding an ordered or unordered list of items a reader ticks off:
documents to bring, things to settle before an akad. Each item carries optional
supporting text and an optional `nota_kaki`. No checkbox glyph that implies an
interactive control in a static image; a filled square rule in `--primary` at the
left of each item. Built when C2.1 or P1's document lists need it.

### 5.5 `rajah-nisbah` — ratio diagram *(not needed for C2.4)*

Two counts in proportion — dulang ratios, *5 balas 7*, *3 balas 5*. Two rows of
tray glyphs, labelled `pihak lelaki` and `pihak perempuan`, with the ratio stated
in words underneath because the glyph count alone is a puzzle rather than an
answer. Style guide §7.2 requires figures for ratios. Built with C2.3.

### 5.6 `carta-jalur-kos` — cost band chart *(not needed for C2.4)*

Horizontal bars spanning a low-to-high ringgit range per category, with the band
printed as text on or beside each bar. An axis is optional and the printed figures
are not — a reader on a phone reads the number, not the bar length. Bands only;
a single fixed figure is a table row, not a chart, which is why A5's six-row fee
schedule is `jadual-perbandingan` and not this. Built with P6 cost content.

---

## 6. Output

### 6.1 Authoring and rasterising

**Author in SVG. Publish PNG.** §2.7 is the reason.

| Stage | What |
|---|---|
| Source | SVG, committed to the repo beside the article, one file per graphic |
| Authoring width | **1600px**, height free |
| Rasterise | PNG at **2×** — 3200px wide — then downsample to 1600px for delivery |
| Fonts | **Embedded in the rasteriser.** Never a family name resolved from the host |
| Deliver to ingest | PNG, 1600px long edge, under 100 KB (strategy §4.4) |
| After ingest | The pipeline emits WebP variants and four crops. Not our concern past handing over the PNG |

Rasterising at 2× and downsampling is not gold-plating: it is what makes 28px
Malay text with its diacritic-free but tightly-spaced letterforms survive
resampling. A 1600px direct render of a fourteen-row table has visibly ragged
stems.

### 6.2 Dimensions

**In-article graphics: 1600px wide, height whatever the content needs.** They are
not cropped (§2.3). Do not pad to a ratio and do not compress a tall table into a
wide one.

Practical ceiling: **1600 × 2400**. Beyond that the article's own image container
scales it down past the legibility floor, and the reader is better served by
splitting it — which is a content decision, not a rendering one, and goes back to
the writer.

**Covers: 2464 × 700**, matching `crop-4.3x1-desktop-hero` exactly. §7.

### 6.3 Weight

Under 100 KB. A fourteen-row table PNG at 1600px, flat colour, no photography,
lands around 40–70 KB. If a graphic exceeds 100 KB something has gone wrong —
usually an anti-aliased gradient that should not be there.

---

## 7. `kad-tajuk` — the cover title card

The seventh template. Eight are needed and none is specified anywhere else.

### 7.1 What it is for

An article cover that survives four crops and says what the article is. It carries
**no data**. Every attempt to put the state table on the cover fails at 3.52:1.

### 7.2 The crop problem, and the safe area

`CROP_TARGETS` generates, from one source image:

| Crop | Output | Ratio |
|---|---|---|
| `crop-4.3x1-desktop-hero` | 2464 × 700 | 3.52 : 1 |
| `crop-16x9-og` | 1200 × 630 | 1.90 : 1 |
| `crop-4x3-article-card` | 1600 × 1200 | 1.33 : 1 |
| `crop-4x5-mobile-cover` | 1920 × 2400 | 0.80 : 1 |

Targets are ceilings, not floors — `fit:'inside', withoutEnlargement:true`. A
2464 × 700 source is 3.52:1, so it is **width-constrained for every other target**
and each crop takes the full width and a shorter slice of the height. The
narrowest is 4:5, which from a 2464-wide source needs 3080px of height and cannot
get it, so it takes the whole image.

**Design at 2464 × 700 and put everything inside a centred safe area of
1600 × 700.** Within that, all four crops contain the full safe area. Outside it,
only the desktop hero sees the pixels — so the outer 432px on each side carries
background and nothing else. No text, no logo, no date stamp.

**Set an explicit focal point of `{x: 0.5, y: 0.5}` on the media row rather than
relying on Sharp saliency**, which on a flat card lands somewhere arbitrary. The
override path already exists — `parseFramingOverride` in `smart-crop.ts`.

### 7.3 Content

Inside the safe area, and nothing else:

- **The article's Malay title**, sentence case, Geist 600, at a size that fits on
  two lines and no more. This is the whole design.
- **The state name or scope**, Geist 400 in `--muted-foreground`, above the title.
  *Johor*. *Kelantan dan Terengganu*. *Semua negeri*.
- **`Disemak Ogos 2026`**, Geist 400, 24px, bottom of the safe area.
- Background `--background`, with a single `--brass` rule 4px tall above the
  title. That is the entire ornament.

No photograph, no illustration, no pattern, no logo lockup. A cover that says what
the page is beats a decorative one, and it is the only cover we can produce today
without a licence.

### 7.4 The eight

Skop and title lines below are board-approved. Alt text is written and approved
too, at the board of 24 Ogos 2026; the register rows carry it.

| Id | Slug | Skop line | Title line |
|---|---|---|---|
| HK-C-0001 | `mas-kahwin-ikut-negeri` | 14 bidang kuasa | Kadar minimum mas kahwin mengikut negeri |
| HK-C-0002 | `apa-itu-mas-kahwin` | Asas | Apa itu mas kahwin |
| HK-C-0003 | `mas-kahwin-johor` | Johor | Kadar yang beredar, belum disahkan |
| HK-C-0004 | `mas-kahwin-kelantan-terengganu` | Kelantan dan Terengganu | Tiada kadar tetap di dua negeri |
| HK-C-0005 | `mas-kahwin-perak` | Perak | Tiada kadar minimum, tetapi ada fi rasmi |
| HK-C-0006 | `mas-kahwin-pahang-negeri-sembilan` | Pahang dan Negeri Sembilan | Kedua-dua negeri menetapkan kadar minimum |
| HK-C-0007 | `mas-kahwin-sabah-sarawak` | Sabah dan Sarawak | Mas kahwin di bawah dua undang-undang berasingan |
| HK-C-0008 | `mas-kahwin-melebihi-kadar-minimum` | Soal jawab | Bolehkah mas kahwin melebihi kadar minimum? |

**These strings are board-approved, 24 Ogos 2026. Render them exactly.** Five
title lines and three skop lines were changed at that board; two of the originals
were blocking findings. The approved Malay alt text for each card is in
`docs/work-done/aug-23-2026-session-01/aug-24-2026-done-board-c24-cover-alt-text.md`
and in the register rows `HK-C-0001`..`HK-C-0008`.

**No cover in this batch carries a ringgit figure.** That is a board ruling on
accuracy, not a design preference, and it is not the engineer's to reopen.

---

## 8. Phone legibility

This audience reads on a phone. Every rule here is a build check, not advice.

1. **28px minimum type at the 1600px authoring width.** At an article container
   of roughly 390 CSS px that is about 7px rendered — the floor at which Malay
   text stays readable on a mid-range Android at arm's length. Below it, the
   graphic is decoration.
2. **A graphic reflows below 900px of rendered width; it does not scale.** A
   table becomes stacked cards, a horizontal timeline becomes vertical, a 2-column
   grid becomes 1. The build emits **two PNGs per graphic — a wide and a narrow —
   and the page picks with `srcset`**, or it emits the narrow one only. Emitting
   the wide one only is the failure mode this rule exists to prevent.
3. **No more than 4 entity columns in `lajur`, ever.** Above that, use `baris`.
4. **Minimum 24px padding inside every cell** at authoring width. Malay
   compounds are long and a tight cell reads as one word.
5. **Contrast: 4.5:1 for text, 3:1 for a rule a reader must follow.** The tokens
   in §3.1 that fail are named there.
6. **Check every graphic at 390px before it ships.** Not a preference — the
   drafts' whole argument for graphics over photography is that a comparison is
   more usable as a table, and a table nobody can read on a phone loses that
   argument.

---

## 9. Accessibility and credit

**Every generated graphic is class G, licensor HelloKahwin.** Non-negotiable and
already true of all 18.

Register row, at production:

| Column | Value |
|---|---|
| `license_class` | `G` |
| `licensor_name` | `HelloKahwin` |
| `pencipta` | `HelloKahwin` |
| `bukti_pencipta` | `karya asal, dihasilkan dalaman` |
| `credit` | `Grafik: HelloKahwin` |
| `dijana_ai` | `tidak` — the kit is a renderer, not a model |
| `bukti_lesen` | this spec, plus the SVG source path |

**The font licence is part of the class G record.** Strategy §3.1: class G
requires *"any third-party font or icon licence recorded."* One line in the
register README covers the kit: Geist and Geist Mono, SIL Open Font Licence 1.1.

### 9.1 Credit

`Grafik: HelloKahwin`, style guide §13.1, as ratified at the A2 review board.
`Grafik:` for our own drawn graphics, `Kredit:` for photography. All ten drafts
already use it.

**The credit renders on the page, in the caption slot, and not inside the
graphic.** The date stamp goes inside the image because a shared screenshot loses
its caption; the credit does not, because the page is where the credit has to be
visible and the graphic is ours either way.

### 9.2 Alt text

**Malay, descriptive, written for somebody who cannot see the image. The credit
never goes in the alt text.**

The ten in-article graphics already have board-approved alt text, quoted verbatim
in the `nota` column of register rows `HK-G-0001` to `HK-G-0010`. Use those
strings exactly. They were reviewed; a rewrite goes back through the board.

Model, A1 Imej 1:

> `Jadual kadar minimum mas kahwin bagi 14 bidang kuasa di Malaysia, daripada RM22.50 hingga RM300, berserta pihak berkuasa dan tarikh setiap kadar.`

What makes it right: it says what kind of graphic, what it covers, the range of
the data, and what the columns are. A reader who cannot see it knows whether it
holds their answer.

**Never** a filename. Never `Grafik mas kahwin`. Never the target keyword
repeated — 38 of the inherited 682 have alt text and 22 of those are the string
"wedding planner terbaik di malaysia", which is what that failure looks like.

**Alt text is generated content's hardest part and the parser will not accept a
blank one:** `alt is required — write it in Malay, for somebody who cannot see the
image`. The eight covers have none written. That is eight sentences somebody owes
before ingest runs.

---

## 10. Definition of done

A template is finished when:

1. It renders all of its C2.4 assignments from §5 out of JSON alone, with no
   per-graphic hand-editing.
2. Both PNGs — wide and narrow — come out under 100 KB.
3. The narrow one is readable at 390px on a real phone.
4. Fonts are embedded, and two renders of the same JSON on two machines are
   byte-identical.
5. The state-order assertion fails the build on a wrong order.
6. Nothing in the output truncates, ellipsises, or drops below 28px.
