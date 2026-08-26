# Specification — the remaining HelloKahwin graphic templates

**Owner:** managing-editor · **Date:** 25 Ogos 2026
**Brief:** `aug-25-2026-brief-supporting-images-and-credit.md`, Task 1.1
**Extends:** `aug-24-2026-spec-graphic-template-kit.md` — §3 brand, §4 Malay label
conventions and §8 phone legibility are unchanged and binding here.
**Status:** specification only. Nothing here is built.

This finishes the five templates the kit spec left at low resolution, plus the
checklist card, to the same standard as `kad-tajuk`. It is written to be built
from without a follow-up question. Where a decision was mine I have made it and
shown the arithmetic.

---

## 0. Four corrections to the kit spec, before anything is built

The kit spec was written before the generator existed. The generator now exists,
and on four points the code disagrees with the document. **The code wins.**

### 0.1 The canvas is 2464 × 3080, not 1600 × free

Kit spec §6.2 says in-article graphics are authored at **1600px wide**. The
built generator authors everything at **2464 × 3080** — `CANVAS_WIDTH` and
`CANVAS_HEIGHT` in `scripts/covers/cover-template.mts:57-58` — and asserts it
after rasterising (`cover-template.mts:719-724`).

**Every template in this document uses width 2464.** Not for crop reasons — see
§0.2 — but because the generator's legibility floor, its size ladders, its
margin constants and its measurement cache are all calibrated to that width. A
second canvas width means a second floor calculation, and the floor calculation
is the part that is easy to get wrong quietly.

### 0.2 The kad-tajuk portrait lesson applies to covers, and only to covers

The lesson is real and the arithmetic in `kad-tajuk-template.mts:16-39` is
right: `computeCropWindow` treats a source **wider** than the target as
**height**-constrained, so a 2464 × 700 card yields a 560 × 700 mobile cover — a
narrow slice through the middle of the title. Authoring at 4:5 makes the mobile
crop the whole image.

**But in-article graphics are never cropped.** Kit spec §2.3 established it and
it still holds: every render call site reads `article.coverImageSmartCrops`, and
body images render from `variants` at their own aspect ratio. `CROP_TARGETS`
never touches them.

So the lesson does not transfer as "all data cards go portrait". It transfers as
this, which is the part that generalises:

> **Author at the ratio the crop pipeline will not damage, wherever cropping is
> possible. Where nothing crops, height is free and the constraint is the
> reader's scroll, not the pipeline.**

That gives two tiers, and each template below declares which it is in.

| Tier | Height | For | Why |
|---|---|---|---|
| **A — crop-safe** | **2464 × 3080**, fixed | Anything that is or could become a cover; anything we are deliberately entering into an image pack | 4:5 is the mobile-cover ratio. That crop becomes the whole image and the other three come out at full target size |
| **B — in-article** | **2464 × free, ceiling 4400** | A reference table or sequence that lives in the body and nowhere else | Nothing crops it. 4400 is where a full-width image passes 1.5 phone screens of scroll |

A Tier B asset that someone later wants as a cover is re-rendered at Tier A with
fewer rows. It is not cropped into one.

### 0.3 The legibility floor is a fraction of width, not a pixel count

Kit spec §8.1 fixes **28px at a 1600px authoring width**. The generator fixes
**`MIN_BODY_SIZE = 88`** at 2464 (`cover-template.mts:94`). These are not two
standards. They are the same standard at two canvas widths:

```
 28 / 1600 = 1.75%   ← the kit spec's floor
 88 / 2464 = 3.57%   ← the generator's floor
```

They are **not** the same, and the generator's is stricter by a factor of two.
The generator's reasoning is written out at `cover-template.mts:47-52` and it is
the correct one: a full-width image on a 390px phone maps the whole canvas to
390 CSS px, so 88/2464 lands at **13.9 CSS px** and 28/1600 lands at 6.8 CSS px,
which is not readable by anybody.

**The floor for this kit is 3.57% of canvas width — 88px at 2464.** Kit spec §8.1
is superseded. Height does not enter the calculation, which is what makes Tier B
safe.

### 0.4 No font is embedded, and the class G record must say so

Kit spec §3.2 and §6.1 require Geist and Geist Mono **embedded in the
rasteriser**. They are not, and they cannot be on the current pipeline: sharp
rasterises SVG through librsvg, which resolves font families from the host and
has no embedding path. `brand-tokens.mts:38-47` states it plainly, and there is
no font file in the repo to embed.

Two consequences, and both belong in the record rather than in a future
surprise:

1. **Renders are host-dependent.** Every measured width comes from the host's
   resolved font. A Linux CI runner without Segoe UI wraps differently, which
   changes which ladder rung is chosen, which can flip a `throw`. Kit spec
   §10.4 — *"two renders of the same JSON on two machines are byte-identical"* —
   **is not true today and no template below can make it true.** Fixing it means
   adding `satori` + `resvg-js`, which is a real piece of engineering and is the
   CEO's call, not mine. Until then, **all rendering happens on one machine and
   the machine is named in the register row.**
2. **The class G font-licence line in kit spec §9 is wrong as written.** We
   distribute no font file and embed no font. The honest record is: *"tiada fon
   pihak ketiga dibenamkan; glif dirasterkan daripada fon sistem hos"*. That
   line goes in the register README, not in a per-asset row.

**Geist Mono for ringgit figures (kit spec §3.2) is therefore also unavailable.**
Decimal alignment has to come from layout instead of from tabular figures — §1.4
below says how.

---

## 1. `jadual-perbandingan` — comparison table

**Tier:** B in-article by default; A when the card is also entering an image
pack (§1.6).
**For.** Any entity × attribute matrix. Its dominant use is state comparison, but
the entity axis is configurable and it serves terms, statutes, fee schedules and
authorities equally.

This is the first template in the kit that renders a real table. Nothing in the
generator does today — `renderCover` has a fixed two-column label/value list with
a hardcoded 700px label column (`cover-template.mts:607-609`) and no header row,
no column negotiation and no cell wrapping. **The elastic-column logic in §1.3 is
new work built on `measureText` and `wrap`, which do exist and do work.**

### 1.1 Two layouts, chosen by entity count, not by taste

- **`lajur`** — entities are columns, attributes are rows. **2 to 4 entities.**
- **`baris`** — entities are rows, attributes are columns. **5 or more.**

Above 4 entities in `lajur` the build fails. It does not shrink and it does not
scroll: a five-column table at this canvas puts every column under 400px, and
`Tiada kadar minimum ditetapkan` needs 1,292px at the floor to stay on one line.

### 1.2 Capacity, measured

Every number here comes from the generator's own `measureText` against the real
Malay strings, at 88px, on the machine that renders. It is not an estimate.

| String | Width at 88px |
|---|---|
| `Tiada kadar minimum ditetapkan` | **1,292** |
| `Jabatan Agama Islam Selangor (JAIS)` | **1,438** |
| `Wilayah Persekutuan Kuala Lumpur` | **1,383** |
| `Negeri Sembilan` | 639 |
| `Pulau Pinang` | 498 |
| `belum disahkan` | 608 |
| `RM22.50` | 334 |
| `RM300` | 267 |

Row height at the floor: line box `88 × 1.25 = 110`, plus `24` padding top and
bottom (kit spec §8.4) = **158px for a single-line row**, **+110px per extra
wrapped line**.

Chrome, at the sizes §1.5 fixes: top margin 120 · title block up to 2 lines at
116px = 290 · gap 60 · header row 158 · gap 20 · footer block 240 · gap 60 ·
bottom margin 120 = **1,068px**.

**So a Tier A card at 3080 tall holds `(3080 − 1068) / 158` = 12 single-line data
rows.** A Tier B card at the 4400 ceiling holds 21.

**This is the finding that matters, and it contradicts a board motion.** The
board of 24 Ogos 2026 carried a motion to build A1's state card *"authored at
1200×1500"*. A1 has **14 jurisdictions plus a header row**. Fourteen rows do not
fit a 4:5 card at the legibility floor, at any canvas width — the ratio is what
binds, not the pixels. A 1200 × 1500 render of 14 rows puts type at roughly 26px
on a 1200 canvas, which is **8.5 CSS px on a phone**, well under the floor and
under the kit spec's own superseded floor too.

**A1's card is Tier B at 2464 × 3480 and carries three columns.** That is the
honest shape of the asset the board voted for. The motion's dimensions were a
figure named in a room; this is the same asset measured.

### 1.3 Column width negotiation

The part that does not exist yet. The rule, in order:

1. Measure every cell and every header in each column at the floor size, 88px.
2. A column's **natural width** is its widest measured string plus 48px padding.
3. If the sum of natural widths ≤ 1,920 (`CONTENT_W`), use them. Done.
4. Otherwise, the **entity column keeps its natural width** — a state name is
   never wrapped — and the remaining width is distributed across the attribute
   columns in proportion to their natural widths.
5. Wrap each attribute cell to its allotted width with the existing `wrap()`.
   Recompute row heights.
6. If the resulting total height exceeds the tier's ceiling, **throw**. Do not
   shrink type, do not truncate, do not ellipsise.

The throw message names the overflow and the fix, matching the generator's
existing style:

```
A1: 14 rows at 3 columns needs 3,480px of data area; the tier B ceiling is
4,400 and the tier A ceiling is 3,080. Either drop an attribute column or
split the card. Nothing here shrinks below the 88px floor.
```

**Never widen the canvas to make something fit.** 2464 is fixed.

### 1.4 Ringgit alignment without a monospace face

Geist Mono is unavailable (§0.4), so tabular figures are not available either.
Decimal alignment comes from layout:

- A column whose every cell is `jenis: "rm"` is **right-aligned**, and each cell
  is rendered as two runs — the integer part right-aligned to a shared decimal
  x, the `.50` run left of it at the same x offset. Cells with no sen render only
  the integer run.
- A column mixing `rm` and `teks` — which is most of them, because
  `Tiada kadar minimum ditetapkan` sits in the same column as `RM300` — is
  **left-aligned throughout**. Do not right-align a column containing a sentence.

That is the whole rule. A fee schedule where every row is a figure gets the
alignment; a rate table where six of fourteen rows are a finding does not, and
should not, because right-aligning a sentence is worse than an unaligned column.

### 1.5 Type

| Role | Size | Weight | Token |
|---|---|---|---|
| Graphic title | 116, ladder `[132, 116, 104]`, max 2 lines | 600 | `foreground` |
| Column header | 88 | 600 | `plum-deep-foreground` on a `primary` band |
| Entity name | 88 | 600 | `foreground` |
| Cell text | 88 | 400 | `foreground` |
| Flag word (`belum disahkan`) | 88 | 600 | `warning-strong` |
| Source line | 64 | 400 | `muted-foreground` |
| `Disemak Ogos 2026` | 64 | 500 | `muted-foreground` |

**64px in the footer is below the 88px body floor and that is deliberate.** The
floor protects text a reader must be able to read to get the answer. A source
citation and a date stamp are provenance, not the answer, and 64/2464 lands at
10 CSS px — small but legible for a line you go looking for. Nothing that carries
a finding drops below 88.

### 1.6 Brand tokens

`REQUIRED_TOKENS` in `scripts/covers/brand-tokens.mts:21-33` loads ten tokens.
**This template needs five more**, and all five already exist in the
`:root, .ds-surface-public` block of `globals.css`:

| Token | Value in `globals.css` | Use |
|---|---|---|
| `plum-wash` | `oklch(0.965 0.012 310)` | Alternating row tint |
| `plum-wash-border` | `oklch(0.9 0.025 310)` | Rule bounding a wash band |
| `border-strong` | `oklch(0.62 0.008 75)` | **Every gridline a reader tracks across.** ≥3:1 |
| `warning-strong` | `oklch(0.55 0.12 75)` | `belum disahkan` flags, as text and as a rule |
| `card` | `oklch(1 0 0)` | Cells that must lift off the canvas |

Add them to `REQUIRED_TOKENS`. The loader's regex only matches three-component
`oklch(L C H)` with no alpha and no `var()`, and all five are in that form — but
note `--brass` is written across three lines in `globals.css` and the existing
loader reads `brand-secondary` instead, which is the same value. **Use
`brand-secondary`.** Do not add `brass`.

Unchanged from kit spec §3.1 and still binding: `brand-secondary` is never text
on a light background (2.4:1) — use `brass-deep`. `hairline` is never a gridline.
Colour never carries meaning alone.

### 1.7 Input

```jsonc
{
  "template": "jadual-perbandingan",
  "tier": "B",                            // "A" | "B" — decides the height ceiling
  "layout": "baris",                      // "baris" | "lajur"
  "tajuk": "Kadar minimum mas kahwin mengikut negeri",
  "entiti_label": "Negeri",
  "entiti": [
    {
      "nama": "Selangor",
      "sel": {
        "kadar":          { "nilai": "RM300", "jenis": "rm" },
        "pihak_berkuasa": { "nilai": "Jabatan Agama Islam Selangor (JAIS)" }
      }
    },
    {
      "nama": "Kelantan",
      "sel": {
        "kadar":          { "nilai": "Tiada kadar minimum ditetapkan", "jenis": "teks" },
        "pihak_berkuasa": { "nilai": "TIDAK DIKETAHUI" }
      },
      "bendera": "tiada-kadar"            // null | "belum-disahkan" | "tiada-kadar"
    }
  ],
  "atribut": [                            // column order is this array's order
    { "id": "kadar",          "label": "Kadar minimum" },
    { "id": "pihak_berkuasa", "label": "Ditetapkan oleh" }
  ],
  "jalur_kesimpulan": null,               // optional full-width band at the foot
  "sumber": "Jadual Kedua, Pk. P.U. 30, Warta Kerajaan Negeri Perak, 1 Jun 2013",
  "disemak": "Ogos 2026",
  "alt": "…"                              // Malay, written by the editor, never generated
}
```

### 1.8 Renderer rules

- `bendera: "belum-disahkan"` adds a 12px `warning-strong` left edge rule **and**
  the words `belum disahkan` in the cell. `bendera: "tiada-kadar"` adds no
  colour at all — an absence is not a warning, and flagging it as one tells the
  reader something is wrong when the finding is simply that no rate exists.
- `jalur_kesimpulan` renders as a full-width band across the foot of the data
  area, above the source footer, `plum-wash` fill with a `plum-wash-border` rule.
- **Cells grow to fit. Nothing truncates, ellipsises, or drops below 88px.**
- Where `entiti` is a state list the renderer **asserts** the house order of kit
  spec §4 and fails the build on a mismatch. Getting this wrong across fourteen
  rows is invisible in review and obvious to a reader who reads two articles.
- Zebra: even data rows on `background`, odd on `plum-wash`. Every row separated
  by a 3px `border-strong` rule. Vertical rules between columns, 2px
  `border-strong`, only in `baris` layout with 3 or more columns.
- **The credit does not render inside the graphic.** Kit spec §9.1 — the date
  stamp goes inside because a shared screenshot loses its caption; the credit
  does not, because the page is where it has to be visible.

---

## 2. `urutan-langkah` — step sequence

**Tier:** B.
**For.** An ordered progression. Two modes, one renderer.

- **`garis-masa`** — a timeline. Nodes carry a date; ordering is chronological.
- **`aliran`** — a flow. Nodes are stages, no dates, and a node may sit off the
  main path.

**Always vertical, top to bottom, at every width.** Kit spec §5.2 made this
conditional on phone width. It is not conditional: we emit one PNG, the article
container is 390 CSS px on the device this audience uses, and a horizontal
timeline with five dated nodes cannot be read there. There is no desktop variant
because there is no `srcset` in the figure renderer to pick one with.

### 2.1 Geometry

Rail at `x = 400`, 8px wide, `primary`. Node markers are 96px circles centred on
the rail. Node content starts at `x = 560` and runs to `x = 2192` — **1,632px of
text column**.

Node block height = marker 96, or the text block if taller, plus 80px gap below.
Text block = `penanda` line (88px, 600) + `tajuk` (88px, 600, wrapped) + `teks`
(88px, 400, wrapped) + `sidenota` (88px, 400 italic, wrapped) + 24px between
each present part.

`Tarikh kuat kuasa: tidak dinyatakan dalam mana-mana sumber rasmi` measures
**2,680px** at 88px — it wraps to 2 lines in a 1,632px column and it stays. A6
node 4 is what separates that page from every other chart in the market;
removing it fabricates a fact we do not have.

**Ceiling 4400.** A sequence that needs more is two graphics, and splitting it is
a content decision that goes back to the writer, not a rendering one.

### 2.2 `gaya` is load-bearing and is not decoration

| `gaya` | Marker | Connector below |
|---|---|---|
| `biasa` | `primary` outline, 8px, `card` fill | Solid `primary`, 8px |
| `lemah` | `muted-foreground` outline, 6px, `background` fill | **Dashed** `muted-foreground` |
| `tegas` | Solid `primary` fill, `plum-deep-foreground` numeral | Solid `primary`, 8px |

A renderer that draws every node identically reintroduces a claim the board
removed. A3's node 1 is a researcher's characterisation of a 1935 maximum and
nodes 2 and 3 are a circulating figure; flattening them into one continuous rate
is the exact error the article exists to correct.

### 2.3 Off-path nodes and footnotes

- `nod_sisi` renders offset to `x = 900`, connected by a dashed
  `muted-foreground` line, with its `label` as a chip in `plum-wash` with a
  `plum-wash-border` outline. **It must not read as a stage in the sequence.**
- Footnotes render inside the graphic, under the sequence, above the source
  footer, at 72px. They are not captions and they cannot leave the image —
  A8's two footnotes are fenced factual scope.

### 2.4 Input

```jsonc
{
  "template": "urutan-langkah",
  "tier": "B",
  "mod": "garis-masa",                    // "garis-masa" | "aliran"
  "tajuk": "Garis masa kadar RM22.50 di Johor",
  "nod": [
    {
      "penanda": "1935",                  // the date, or the step number
      "tajuk": "Ahkam Syar'iyyah Johor, perkara 309",
      "teks": "Mahar seluruh negeri ditetapkan sebanyak sekati perak (600 gram), bersamaan RM22.50.",
      "sidenota": "Disifatkan oleh pengkaji sebagai had maksimum",
      "gaya": "lemah",                    // "biasa" | "lemah" | "tegas"
      "nota_kaki": null                   // "A" | "B" | null
    }
  ],
  "nod_sisi": [
    { "selepas": 2, "tajuk": "Duit hantaran dirunding berasingan",
      "label": "bukan mas kahwin", "nota_kaki": "A" }
  ],
  "nota_kaki": [
    { "id": "A", "teks": "Di Selangor, wang hantaran daripada pihak lelaki dikira sebagai mas kahwin (fatwa Selangor, 4 Februari 2010)." }
  ],
  "sumber": "…",
  "disemak": "Ogos 2026",
  "alt": "…"
}
```

---

## 3. `grid-kategori` — category grid

**Tier:** A. A taxonomy card is short, and a taxonomy is the kind of thing an
image pack shows.
**For.** A set of categories, each with members. Not a comparison and not a
sequence.

### 3.1 Geometry

**2 columns on the 2464 canvas, never 3.** Card width `(1920 − 64) / 2 = 928px`,
64px gutter. Six member names in a third of the canvas wrap to nothing readable,
and `Wilayah Persekutuan Kuala Lumpur` alone measures 1,383px at the floor —
**it does not fit a 928px card on one line and it never will.** A member list
containing it wraps, which is correct and expected; a three-column layout would
wrap it to three lines.

Cards in a row share a height, set by the taller. Card height = title (88px, 600,
wrapped) + 24 + members at 88px, one per line, wrapped + 48px padding all round.

**Ceiling: 6 categories.** Beyond that the card is a table and should be
`jadual-perbandingan`.

### 3.2 `gaya: "kosong"` is a factual distinction, not a style

An absence renders on `surface-subtle` with a 4px `border-strong` outline and no
fill. A mechanism renders on `card` with a 4px `primary` top rule.

Drawing *Tiada penetapan* as a fifth mechanism is a factual error, and A1's board
note names it: *"four mechanisms, and six jurisdictions that use none of them."*

`nota_berasingan` renders as a full-width band below the grid, `plum-wash`, not
as a card. A note is not a category.

### 3.3 Input

```jsonc
{
  "template": "grid-kategori",
  "tier": "A",
  "tajuk": "Siapa yang menetapkan kadar mas kahwin",
  "kategori": [
    { "tajuk": "Fatwa diwartakan", "ahli": ["Selangor"], "nota": null },
    { "tajuk": "Tiada penetapan",
      "ahli": ["Perlis", "Kedah", "Pulau Pinang", "Perak", "Terengganu", "Kelantan"],
      "gaya": "kosong" }
  ],
  "nota_berasingan": "Johor, Sabah dan Sarawak: kadar beredar, belum disahkan semula.",
  "sumber": "…",
  "disemak": "Ogos 2026",
  "alt": "…"
}
```

---

## 4. `carta-jalur-kos` — cost band chart

**Tier:** A.
**For.** A low-to-high ringgit range per category. **Bands only.** A single fixed
figure is a table row, not a chart — which is why A5's six-row fee schedule is
`jadual-perbandingan` and not this.

This is the template P6 was waiting for. `harga-sewa-dewan-kahwin` carries four
authorities whose published rates span RM60/hour to RM3,600/session, and the
article's own finding is that they are not comparable until you see them on one
scale.

### 4.1 The rule that makes it honest

**Every band prints its own figures as text, on or beside the bar. The axis is
optional; the printed figures are not.** A reader on a phone reads the number,
not the bar length, and a bar chart whose numbers are only implied by length is
a chart that cannot be checked.

**Bars are drawn on a linear scale and the scale starts at zero.** No broken
axis, no log scale. Where the range is so wide that the smallest band renders
under 40px — `RM60` against `RM7,500` is a 125:1 spread — the renderer **throws**
rather than compress:

```
harga-sewa-dewan-kahwin: RM60 against RM7,500 is a 125:1 spread; the smallest
band renders at 15px. Split into two charts by unit (sejam / sesi) or use
jadual-perbandingan. A log scale would make the difference look smaller than
it is.
```

That is the whole reason this template is worth building rather than reaching
for a generic chart library. A cost chart that quietly rescales is a cost chart
that misleads, and this audience is making a spending decision from it.

### 4.2 Units are not mixed

Every band in one chart shares a `unit` — `sejam`, `sesi`, `sehari`, `sekali`.
The unit is printed once in the title area, not repeated per bar. A chart
plotting an hourly rate against a per-session rate compares nothing, and
`harga-sewa-dewan-kahwin` contains both. **Mixing units fails the build.**

### 4.3 Geometry

Label column 760px left, bars from `x = 1032` to `x = 2192` — 1,160px of track.
Bar height 120px, 64px between. Band figures at 88px, 500 weight, printed to the
right of the bar where it ends before `x = 1800`, and inside the bar in
`plum-deep-foreground` where it does not.

Bar fill `primary`. A band flagged `belum-disahkan` fills `brand-secondary` and
carries the words in the label. Colour never alone.

**Ceiling: 8 bands.** Nine is a table.

### 4.4 Input

```jsonc
{
  "template": "carta-jalur-kos",
  "tier": "A",
  "tajuk": "Kadar sewa dewan majlis perbandaran",
  "unit": "sesi",                         // one unit per chart, printed once
  "jalur": [
    { "label": "MBSJ kategori A", "rendah": 3200, "tinggi": 3600, "nota": "cuti am" },
    { "label": "MBPJ dewan komuniti", "rendah": 160, "tinggi": 450, "nota": null }
  ],
  "paksi": false,                          // axis optional; printed figures are not
  "sumber": "…",
  "disemak": "Ogos 2026",
  "alt": "…"
}
```

Figures are integers in ringgit. The renderer formats them per kit spec §4 —
`RM160`, `RM3,600`, sen kept only where the real figure has sen.

---

## 5. `rajah-nisbah` — ratio diagram

**Tier:** A.
**For.** Two counts in proportion. Dulang ratios — *5 balas 7*, *3 balas 5*.
Nothing else in the map uses it, and it should be built with C2.3 rather than
now.

### 5.1 The rule

**Two rows of tray glyphs, labelled `pihak lelaki` and `pihak perempuan`, with
the ratio stated in words underneath.** The glyph count alone is a puzzle rather
than an answer — a reader counting trays in an image on a phone is doing work
the graphic exists to save. Style guide §7.2 requires figures for ratios, so the
numerals appear too.

The tray glyph is a filled rounded rectangle in `primary`, 160 × 120, 40px
apart, on a single row. **Maximum 12 per row.** Above that the glyphs are too
small to count and the answer is the numerals alone.

Rows are left-aligned to the same x so the difference in length is the point,
which is the only reason to draw this rather than write `5 : 7`.

### 5.2 Input

```jsonc
{
  "template": "rajah-nisbah",
  "tier": "A",
  "tajuk": "Nisbah dulang 5 balas 7",
  "pihak_a": { "label": "Pihak lelaki",    "kiraan": 5 },
  "pihak_b": { "label": "Pihak perempuan", "kiraan": 7 },
  "keterangan": "Pihak lelaki menghantar lima dulang, pihak perempuan membalas tujuh.",
  "sumber": "…",
  "disemak": "Ogos 2026",
  "alt": "…"
}
```

---

## 6. `kad-senarai-semak` — checklist card

**Tier:** B.
**For.** An ordered or unordered list a reader ticks off. Documents to bring,
things to settle before an akad, a month-by-month plan.

**The brief did not ask for this one and I am specifying it anyway**, because
`checklist-kahwin` is in review this week with **35 items across a 12-month
spine and zero tables**, and it is the single strongest graphic candidate in the
whole batch. Deferring this template means that article ships as a wall of
bullets.

### 6.1 Geometry and the grouping rule

Items may be grouped under headings — the twelve-month spine is nine groups. A
group renders as an 88px 600-weight heading on a `plum-wash` band, then its
items.

Item marker: a filled 40 × 40 square in `primary` at `x = 320`, **not a checkbox
outline**. An empty checkbox in a static image implies an interactive control
that is not there, and a reader who taps it learns the graphic is lying.

Item text from `x = 400` to `x = 2192`. Supporting text at 80px in
`muted-foreground`, one line below, indented to the same x.

Item block = 110 per text line + 90 per supporting line + 32 gap. Group heading
= 158.

**At the 4400 ceiling this holds roughly 24 items with headings, or 34 without.**
`checklist-kahwin`'s 35 items across 9 groups needs about 6,900px and **does not
fit one card.** It splits at the natural seam the article already has:

- Card 1 — `12 bulan` to `3 bulan`, four groups, 19 items.
- Card 2 — `1 bulan` to `Selepas majlis`, four groups, 16 items, plus the three
  hard deadlines as a `jalur_kesimpulan` band.

That is a content decision and it goes back to the writer as one, not to the
renderer as a scaling problem.

### 6.2 Input

```jsonc
{
  "template": "kad-senarai-semak",
  "tier": "B",
  "tajuk": "Checklist kahwin: 12 hingga 3 bulan sebelum",
  "kumpulan": [
    {
      "tajuk": "12 bulan sebelum",
      "item": [
        { "teks": "Tetapkan tarikh dan bajet kasar", "sokongan": null },
        { "teks": "Semak kadar dewan majlis perbandaran", "sokongan": "Kadar rasmi diterbitkan; pakej vendor tidak" }
      ]
    }
  ],
  "jalur_kesimpulan": "Tiga tarikh mati yang ada dendanya: tempahan dewan, kursus pra-perkahwinan, borang nikah.",
  "sumber": "…",
  "disemak": "Ogos 2026",
  "alt": "…"
}
```

---

## 7. Build order, and what each one unblocks

| # | Template | Unblocks | Build |
|---|---|---|---|
| 1 | `jadual-perbandingan` | 6 of the live 8, plus `syarat-sah-nikah`, `borang-nikah`, `bajet-kahwin`, `pakej-dewan-kahwin` | **First** |
| 2 | `urutan-langkah` | A3, A6, A8, `rukun-nikah`'s 21-step wali order, `lafaz-taklik` | **Second** |
| 3 | `kad-senarai-semak` | `checklist-kahwin`, `borang-nikah`'s document lists | **Third** |
| 4 | `carta-jalur-kos` | `harga-sewa-dewan-kahwin`, `bajet-kahwin` | Fourth |
| 5 | `grid-kategori` | A1 Imej 2 | Fifth |
| 6 | `rajah-nisbah` | Nothing until C2.3 | **Defer** |

The kit spec put `grid-kategori` third and deferred the checklist card. That was
right when C2.4 was the whole queue. It is wrong now: `grid-kategori` serves one
graphic on one article, and the checklist card serves an article that is in
review this week.

**`rajah-nisbah` should not be built now.** It has no real data to build against
until C2.3, and a template built against no real data gets rebuilt.

---

## 8. What an engineer has to change in the generator

The kit spec's claim that *"adding a batch is adding a spec file and one entry in
`SETS`"* — repeated in `generate-cover-graphics.mts:26-27` — is true for a new
**batch**. It is not true for a new **template**. Adding one touches five places:

1. **New** `scripts/covers/<template>-template.mts` — exports the spec interface
   and `render<Template>(spec, tokens): Promise<{png, layout}>`. Import
   `measureText`, `wrap`, `CANVAS_WIDTH` from `cover-template.mts`.
2. **New** `scripts/covers/<batch>-<template>-specs.mts` — the spec array.
3. `generate-cover-graphics.mts:77-95` — a third member of the `CoverSet` union.
4. `generate-cover-graphics.mts:97-134` — the `SETS` entry, plus the import.
5. `generate-cover-graphics.mts:726-772` — a third branch in the render
   dispatch, which is a hardcoded `if (set.kind === 'kad-tajuk') … else …` today.

**Do the fifth one properly the first time.** Six templates through a chain of
`if`s is where this becomes unpleasant. Replace the dispatch with a
`Record<kind, renderFn>` when the third template lands — not before, because a
registry built for two members is speculative, and not after five, because by
then it is a refactor rather than a change.

Two things to add while you are in there:

- **`CANVAS_HEIGHT` becomes per-spec, not a module constant.** Tier A is 3080;
  Tier B computes its height from content and asserts it is ≤ 4400. The
  post-raster assertion at `cover-template.mts:719-724` checks against the
  spec's declared height rather than the constant.
- **`renderKadTajuk` has no post-raster geometry assertion** and `renderCover`
  does. Give every template the assertion. It is four lines and it is the check
  that caught a `density: 96` silently producing 3285 × 4107.

---

## 9. Definition of done

A template is finished when:

1. It renders every assignment in `aug-25-2026-map-article-to-graphic.md` from
   JSON alone, with no per-graphic hand-editing.
2. Output is under 100 KB. Flat colour, no photography, no gradient — a
   fourteen-row table at this canvas lands around 40–70 KB.
3. **Nothing truncates, ellipsises, or drops below 88px.** Overflow throws.
4. The state-order assertion fails the build on a wrong order.
5. It has been looked at on a real phone at 390px, not in a browser at 390px.
6. The register row exists **before** the PNG is handed to ingest, not after.
7. The render machine is named in the register row, because renders are
   host-dependent until a font is embedded (§0.4).
