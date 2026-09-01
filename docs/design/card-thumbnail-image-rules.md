# Card, thumbnail and cover image rules — binding art direction

**Owner:** Creative Director · **Issued:** 31 Ogos 2026 · **Item:** UI-12
**Inherits:** `docs/design/hero-image-rules.md` (UI-03). That document's R1–R8 are
binding here and are not restated except where this slot class changes what they
resolve to.
**Binding on:** every fixed-aspect image slot that is not a full-bleed hero — the
`.s-row` thumbnail, the catalogue lead plate, the article cover figure, the
"Baca seterusnya" bar thumbnail, and every in-body prose image.

Every number below was measured on live production on 31 Ogos 2026, with
`scripts/ui-layout-gate.mjs --base https://hellokahwin.com` and a Playwright probe
that reads intrinsics from a detached `Image()` on `currentSrc` (UI-03 §7).
Nothing here is asserted from reading source.

> ⚠ **THE GATE CHANGED UNDER THIS ITEM, AND THE TRACKER'S NUMBERS ARE STALE.**
> UI-12 was written against `image-upscale 25 · image-aspect 31`. While it was in
> flight, `767515e` — "the upscale check was blind at two of its widths" — landed
> on `master`: UI-06 independently found the same `naturalWidth` density trap
> described in §1, fixed the check to read intrinsics from a detached `Image()`,
> and added a fifth viewport (1920) and a second article instance.
>
> **Re-baselined against master's gate on the same production site:**
>
> ```
> image-upscale 0 · image-aspect 37 · image-attr-aspect 73 (advisory) · image-unmeasurable 0
> ```
>
> **`image-upscale` was already 0 before this item touched anything.** All 25 were
> the old check's artefact and UI-06's own fix cleared them. The number this item
> moves is **`image-aspect`, from 37**. Every figure below is against the current
> gate; where an argument in §1 or §3 was originally built on the 25, it is
> corrected in place and the correction is labelled rather than removed, because
> the reasoning still decides the fix even though the number does not.

---

## 0. The finding, in one sentence

> **Every fixed-aspect image slot on this site is fed `low.webp`, whose aspect
> ratio is the photographer's, not the designer's — so each slot passes or fails
> the geometry gate according to which camera shot the cover.**

The tracker described UI-12 as "the 12 `.s-row` card thumbnails". It is that, and
it is also three other slots with the same cause. All 37 `image-aspect` violations
on production, attributed. Widths are 390 / 768 / 1024 / 1440 / 1920.

| Slot                                               | Box today                    | Asset fed            | File aspect, measured | Deviation  |  Fails |
| -------------------------------------------------- | ---------------------------- | -------------------- | --------------------- | ---------- | -----: |
| `.s-row` thumbnail, `<1024px` — 11 landscape rows  | `80×80` = **1.000**          | `low` 1200×800       | 1.500                 | 33.5%      | **22** |
| `.s-row` thumbnail — the one portrait row          | `80×80` / `176×132`          | `low` 1200×1800      | 0.667                 | 50% / 100% |  **5** |
| catalogue lead plate                               | `4/3` → `16/9` → **`2.4/1`** | `crop-4x3` 1600×1200 | 1.333                 | 33% / 80%  |  **4** |
| article cover figure, `≥1024px` — `garden-wedding` | **`2.4/1`** = 2.400          | `low` 1024×683       | 1.4993                | 60%        |  **3** |
| article cover figure, `≥1024px` — longest-title    | **`2.4/1`** = 2.400          | `low` 1024×683       | 1.4993                | 60%        |  **3** |
| **total**                                          |                              |                      |                       |            | **37** |

Two more that the current gate does not fail the build on, fixed here as hardening
rather than as live violations. **Both are labelled honestly: neither is counted
in the 37, and neither is claimed as a number this item moved.**

| Slot                  | Box today        | Asset fed      | Measured                            | Status                                                                                                                                                                                                        |
| --------------------- | ---------------- | -------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Baca seterusnya" bar | `44×44` = 1.000  | `low` 1200×900 | **25.0%** — exactly on the ceiling  | Green only because that article's cover happens to be 4:3. Eleven of the twelve front-page covers are 3:2, which scores 33.5%. One article away from red.                                                     |
| prose image, `768px`  | `w-full` = 704px | `high` 628×786 | painted 704×881 = **1.12× upscale** | Fired on the tracker's baseline; does **not** fire now. UI-10's reading-measure cap (`767515e`'s neighbours on `master`) narrowed the prose column between the two runs. The `w-full` mechanism is unchanged. |

`low.webp` is `sharp().resize({ width: 1200, withoutEnlargement: true })` on the
**source** (`src/lib/storage/image-variants.ts`). It preserves the source aspect
and it does not enlarge. Measured across the twelve covers the homepage shows
today it is **1200×800 for eleven of twelve and 1200×1800 for one**; on the
article page's related rows it is **1200×900**; on `garden-wedding`'s cover it is
**1024×683**. Four different intrinsic sizes and three different aspect ratios,
all from one variant name.

**So `2.4/1` is the other half of the finding.** Two slots declare a 2.4:1 box.
`CROP_TARGETS` produces exactly four aspects — **0.800, 1.333, 1.905, 3.520**.
Nothing produces 2.4. Per UI-03 R1, _if no derivative matches the box you want,
you do not have that box_: 2.4:1 was drawn, not derived, and no asset on this site
can ever fill it.

---

## 1. What the gate is actually measuring, and why it matters to the fix

This is not obvious from the check names and it changes what the fix is, so it is
written down once.

`scripts/ui-layout-gate.mjs` **used to read** `img.naturalWidth`, and did so on the
run that produced the tracker's numbers. On an element carrying a `srcset` with `w`
descriptors, `naturalWidth` is the intrinsic width **divided by the density the
browser derived from `sizes`** — the behaviour UI-03 §7 recorded and UI-06 has
since fixed. Kept here because it is still the only correct reading of the
tracker's `image-upscale 25`, and because the same arithmetic is what makes the
`image-aspect` check independent of `sizes` — which is the half that still
decides §3.
Confirmed on production, same probe: the `.s-row` `<img>` reported
`naturalWidth 176` while a detached `Image()` on the same `currentSrc` reported
**1200**, because `sizes="176px"` and the descriptor said `1200w`.

Two consequences, and both are load-bearing:

1. **`image-aspect` compares the BOX's aspect to the ASSET's aspect**, and nothing
   else. Density scaling is uniform, so it cancels. `sizes` cannot affect it.
2. **`image-upscale` collapses to `boxWidth / <what sizes resolved to>`** whenever
   the box and the asset share an aspect ratio — and when they do _not_, the taller
   axis leaks in through `object-fit: cover`, which is precisely how a pure aspect
   mismatch (`1.333` box, `1.500` asset) surfaced as a **1.13× "upscale"** on
   eleven homepage rows that are in fact downscaling by 6×.

So the 22 upscale violations were not an upscale. They were the aspect defect,
reported through the other check because a `srcset` was in the way.

> ⚠ **CORRECTED, AND THE CORRECTION MATTERS MORE THAN THE ANALYSIS.** An earlier
> draft of this section ended: _"removing an untrue `srcset` clears all 25 upscale
> violations without touching a single image file."_ **That claim is dead.** UI-06
> reached the same diagnosis independently, an hour earlier, and fixed the gate
> instead — `767515e` reads the intrinsic from a detached `Image()`, so the check
> now compares the box to the real file and the 25 were gone before this item
> changed anything. `image-upscale` measures **0** on production today.
>
> **What survives is the reasoning, not the number.** The `srcset` in S1 is still
> untrue and still has to go, on two grounds that never depended on the gate: it
> declares a `w` descriptor nothing can verify (T1/R4, and it is measurably wrong
> by 17.2%), and it offers two differently-shaped photographs as interchangeable
> width candidates (R3 — UI-03 §0's defect, still live on three templates). It is
> also worth up to **900 KB per retina article page** (§3 S1). A fix whose stated
> justification evaporates and whose real justification is three other things is a
> fix that was about to be shipped for the wrong reason, and saying so is cheaper
> than finding out later.

---

## 2. The rules this slot class adds

UI-03's R1–R8 hold. Three additions.

**T1 — A `w` descriptor may only be written for an asset whose real dimensions are
recorded. `low`, `high` and `original` have none, so they get no `srcset` at all.**

`ImageVariantMeta` is `{ url, sizeBytes }` (`src/lib/storage/image-variants.ts`).
There is no width and no height. UI-03 R4 requires every `w` descriptor to state
the delivered file's real intrinsic width, _read from the file_ — which for these
three variants is not derivable at render time. `resolveCoverSource` therefore
hardcoded `1200w`, and on `garden-wedding` the delivered file is **1024** wide: a
17.2% overstatement, live on the site's highest-traffic template.

A descriptor that cannot be true must not be written. The smart crops keep theirs,
because `getSmartCropRef` returns stored `width`/`height` or nothing.

**T2 — A slot fed a source-aspect variant sets its box to 4:3 and tolerates up to
UI-03 R1's 15%, never the gate's 25%.**

The gate's ceiling is a defect threshold. R1's is the design rule and it is
stricter. Against the live corpus a 4:3 box (1.3333) fed `low` measures:

| `low` aspect, measured | Deviation from 4:3 | Frame retained by `object-fit: cover` | Verdict          |
| ---------------------- | ------------------ | ------------------------------------- | ---------------- |
| 1.500 (`1200×800`)     | **11.1%**          | 88.9% of the width                    | inside R1        |
| 1.333 (`1200×900`)     | **0.0%**           | 100%                                  | exact            |
| 1.4993 (`1024×683`)    | **11.1%**          | 88.9%                                 | inside R1        |
| 0.667 (`1200×1800`)    | **99.9%**          | 50.0% of the height                   | **outside, red** |

4:3 is chosen because it is the aspect of `crop-4x3-article-card`, which is where
this slot is going the day a small rendition of it exists (§5). **The box does not
move again when the asset changes.** A 3:2 box would clear more violations today —
it is `low`'s modal aspect — and it would have to be re-shaped later. One shape
change, not two.

**T3 — An image is never painted wider than its own intrinsic width.**

`w-full` on an in-body image is an instruction to upscale whatever is narrower
than the column. `w-auto max-w-full` is the same layout for everything wider and
correct for everything narrower.

---

## 3. What ships — the specification

Numbers are exact. Nothing below requires a new image file.

### S1 — `src/lib/storage/responsive-cover.ts`: delete the `srcset`

`resolveCoverSource` returns `{ src }` only. Drop `srcSet` from `CoverSource` and
drop the `upgradeCropName` parameter; every call site drops `srcSet={cover.srcSet}`
and drops its now-inert `sizes` attribute.

Two independent reasons, either sufficient:

- **T1/R4.** `${src} 1200w` is not readable from anything. Measured wrong by 17.2%
  on `garden-wedding`.
- **R3/UI-03 §0.** The two candidates are `low` (source aspect: 1.500, 1.333 or
  0.667 depending on the article) and `crop-4x3-article-card` (1.333, a _different
  photograph shape_). Declaring them as interchangeable width candidates is
  `srcset` being used to choose a **crop**, which is the exact mechanism UI-03 §0
  was written to retire. It is still shipping on three templates.

**It is also a byte win, not a cost.** On the article cover `sizes` resolves to
768px, so any display at DPR ≥ 1.33 — every retina laptop and phone — currently
selects the `1600w` candidate and downloads **488–946 KB** of a wrongly-shaped
crop. After S1 it downloads `low` at **36–80 KB**.

**Measured effect on the gate: none.** `image-upscale` was already 0 under the
current gate (see the banner at the top of this document). S1 ships because R3, R4
and the byte figure above each require it independently. It is recorded this way
round on purpose: the alternative is a changelog claiming credit for a number
somebody else moved.

### S2 — `src/design-system/components.css`: the `.s-row` thumbnail is 4:3 at every width

```
.s-row img          { width: 80px;  height: 60px;  }   /* was 80 × 80  */
@media (min-width: 1024px) {
  .s-row img        { width: 176px; height: 132px; }   /* unchanged     */
}
```

80/60 and 176/132 are both **1.33333**. `object-fit: cover` and `display: block`
are unchanged. The mobile grid track stays `80px minmax(0, 1fr)`; only the
thumbnail's height changes, so the row's mobile height is now set by the text
block rather than by the image — which is correct for a list whose content is the
headline.

At the three call sites (`src/app/(public)/page.tsx`,
`src/app/(public)/artikel/[category]/page.tsx` ×2,
`src/app/(public)/artikel/[category]/[slug]/page.tsx`): keep
`width={176} height={132}`, remove `sizes="176px"` (inert once S1 lands, and a
`sizes` with no `srcset` misleads the next reader). R6 is satisfied by the CSS box,
which is fixed in both axes and therefore reserves the layout itself; the
attributes state the same 4:3 ratio and cannot disagree with it.

### S3 — `src/components/inspire/mobile-article-bar.tsx`: 4:3, not square

`className="bg-muted relative size-11 shrink-0 overflow-hidden"` →
`className="bg-muted relative h-[33px] w-11 shrink-0 overflow-hidden"`, and
`sizes="44px"` is kept (this one is a real `<Image fill>`).

44 × 33 = **1.33333**. **This is hardening, not a live violation** — it measures
25.0% deviation today, which is exactly the gate's ceiling and does not fire. It
fires the moment the next article's cover is 3:2 (33.5%), which is eleven of the
twelve covers on the homepage right now. It is one cover away from red.

### S4 — `src/app/(public)/artikel/page.tsx`: the lead plate inherits UI-03 §3

This is a lead plate carrying `priority` — a hero slot in every sense that matters.
`docs/design/hero-image-rules.md` says it is binding on "every future full-bleed
hero slot"; the register is the same and the document is inherited, not re-decided.

Replace the `<Image fill>` with `<picture>` (R3 — one crop per band, never a
`srcset` width candidate):

| Band       | Box                      | Asset                     | Intrinsic (measured) | Deviation  |
| ---------- | ------------------------ | ------------------------- | -------------------- | ---------- |
| `< 1024px` | `aspect-[40/21]` 1.90476 | `crop-16x9-og`            | 1200 × 630 = 1.90476 | **0.000%** |
| `≥ 1024px` | `aspect-[88/25]` 3.52000 | `crop-4.3x1-desktop-hero` | 2463 × 700 = 3.51857 | **0.041%** |

Delete `aspect-[4/3]`, `sm:aspect-[16/9]` and `lg:aspect-[2.4/1]`.
`width`/`height` on the fallback `<img>` come from `getSmartCropRef(…, 'crop-16x9-og')`
(R4/R6); if the ref is absent the article is not lead-plate eligible.

Box widths and upscale, measured: 358 @390 (0.30×), 736 @768 (0.61×), 976 @1024
(0.40×), 1232 @1440 (0.50×). Never upscales.

**Byte effect: a saving.** Mobile's LCP image moves from `crop-4x3-article-card`
(**488–946 KB**, measured across all twelve homepage covers) to `crop-16x9-og`
(**278–425 KB**). The plate also shortens from 269px to 188px at 390px wide, which
hands 81px back to the headline.

**Eligibility (R8) is not optional here.** The lead plate is `latestArticles[0]`
selected by recency with no orientation predicate — byte for byte the selection
bug UI-03 found on the homepage hero, in a second place. Lift `HERO_ASPECT`,
`MIN_RETAINED_FRAME` and `isHeroFrameEligible` out of `src/app/(public)/page.tsx`
into a shared module (`src/lib/inspire/hero-frame.ts`), import it in both, and
pick the first eligible article for the lead plate; skipped articles fall into the
supporting-card positions in order. If none is eligible, render the `<img>` band
alone — 40/21 at every width, which retains **35.0%** even from the corpus's worst
source (0.667) and so needs no predicate. Never degrade to a portrait in a
landscape box.

**S4b — R8(d): the section front does not lead with the photograph the front page
is leading with.** Added after S4 was built, because S4 CAUSED this: before it,
`/artikel` led with `persiapan-hantaran-kahwin`; applying R8(a) and R8(c) walked
the plate onto **`adat-hantaran-ikut-keluarga`, the homepage hero's own
photograph**. Two surfaces one click apart, the same 88/25 crop at the same
painted size. A reader who clicks _Lihat semua artikel_ and lands on an identical
plate reads that as a page that failed to load, not as art direction.

This is a fourth skip predicate on a slot that already has three, not a new kind
of rule: the lead plate is `featured[0]`, an **editorial** slot, not a
chronological one. The cold reader who arrives from search loses nothing — they
get rank 3 instead of rank 2, and rank 3 is `barang-hantaran-berguna`, whose
2463×700 crop was rendered at 1232×350 and accepted (tiered dulang, a cake with
red roses, the bride's hands, songket).

⚠ **Implement it WITHOUT a second query.** Two surfaces computing "the hero"
from independently-built lists is the defect the deleted homepage category rail
is a monument to — _"built from a different query than the masthead's, and the two
disagreed"_ — and a second instance of it is not acceptable. Export the selection
itself from `src/lib/inspire/hero-frame.ts` as one function over a list
(`pickHeroIndex(articles)`, applying R8(a)+(b)+(c) and returning an index or −1).
The homepage calls it on its list; `/artikel` calls it on **its own** list, which
carries the same `publishedAt desc` ordering, to learn what the front page is
leading with, then takes the next eligible article after it. One definition of the
predicate, no cross-page data dependency, and both surfaces move together if the
ordering ever changes. The comment must say that it depends on both surfaces
ordering by `publishedAt desc`, so whoever changes either ordering is told what
they break.

Retained frame at each band, from the modal 1.500 source: **78.7%** at 1.905,
**42.6%** at 3.520. Both clear the 33% floor.

**S4c — every `<source>` carries its own `width` and `height`.**

⚠ **THE REASON I ORDERED THIS WAS WRONG, AND IT WAS DISPROVED BY MEASUREMENT
BEFORE IT SHIPPED. The rule survives on a different justification; the original
one is recorded because the shape of the error is worth more than the fix.**

What I asserted: that without `width`/`height` on the `<source>`, the browser
reserves the fallback `<img>`'s 1.905 and reflows to 3.520 at ≥1024px — a layout
shift on the LCP element of two templates. What was measured, with every image
request aborted and the same page re-run with the attributes stripped in flight
as a negative control:

| Plate      | @1024      | @1440      | @1920      | with vs without |
| ---------- | ---------- | ---------- | ---------- | --------------- |
| homepage   | 1024 × 291 | 1440 × 409 | 1920 × 545 | **identical**   |
| `/artikel` | 976 × 277  | 1232 × 350 | 1488 × 423 | **identical**   |

**There is no reflow, and there never was.** The box is pinned by the wrapper's
`aspect-[40/21] lg:aspect-[88/25]`, and the `<img>` is `absolute inset-0 h-full
w-full`. An absolutely-positioned, fully-inset image cannot size its containing
block, so neither its attributes nor a `<source>`'s can move the reserved box.
R6's sentence is right; DES-08's wrapper pattern had already solved it in CSS.
On a plate whose `<img>` sat in normal flow it would bite exactly as described.

**Why the rule stands anyway**, and this is the justification to quote:

- **It supplies the data the gate's own fix will need.** `image-attr-aspect` reads
  `img.getAttribute('width')` and compares it against the file at `currentSrc` —
  which, inside a `<picture>` above the breakpoint, is the `<source>`'s file. An
  `<img>` has one pair of attributes and a `<picture>` deliberately serves
  different aspects per band, so **those six rows cannot be cleared by any correct
  markup.** The check must read the `<source>`'s dimensions when a `<source>`
  supplied `currentSrc`. It now has them to read.
- **It is an honest declaration.** Each band states its own file's real dimensions,
  from the same `getSmartCropRef` lookup as its `w` descriptor, so a retarget moves
  both together.
- **It becomes load-bearing the moment someone drops the wrapper's aspect class or
  stops absolutely positioning the image** — which is one careless refactor away.

Measured cost: nothing. Not a painted pixel moved at any of the five widths, and
eight of the gate's nine checks were byte-identical across the change.

**What it does NOT do: move `image-attr-aspect`.** It stayed at 66. Any comment or
changelog claiming otherwise is wrong.

### S5 — `src/app/(public)/artikel/[category]/[slug]/page.tsx`: delete the 2.4:1 box

> ⚠ **SUPERSEDED IN PART BY UI-16, 02 September 2026 — see §7.** Deleting the
> 2.4:1 box was right and stands. Keeping `low` in the box that replaced it was
> right only for as long as no small 4:3 rendition existed, and it left **R2 red
> forever** on this slot. The box is now `aspect-[4/3]` fed
> `crop-4x3-article-card-md`. Read §7 before implementing anything below.

Line ~1036: `className="bg-muted relative aspect-[3/2] w-full overflow-hidden lg:aspect-[2.4/1]"`
→ drop `lg:aspect-[2.4/1]`. The box is `aspect-[3/2]` at every width.

2.4:1 matches no derivative the pipeline produces. With S1 landed, the served asset
is `low` at its true intrinsic — measured **1024 × 683 = 1.4993** against a 1.5 box,
a **0.05% deviation**.

Also on that `<img>`: remove `sizes` (inert after S1) and change
`width={1200} height={500}` → `width={1200} height={800}`. `1200×500` is a 2.4
ratio describing no asset in the pipeline — the same R6 defect UI-03 found on the
hero, still live here.

Retained frame in a 3:2 box: **100%** from a 1.500 source, **88.9%** from 1.333,
**44.5%** from 0.667. All clear the floor.

### S6 — `src/components/inspire/article-renderer.tsx`: never paint above intrinsic

Three `<Image>` elements (lines ~620, ~669, ~927) carry
`className="h-auto w-full rounded-md lg:w-auto"`. Change all three to
`className="h-auto w-auto max-w-full rounded-md"`.

Measured defect: `…-IN-GardenWedding-JardinEventVenue-4/high.webp` is genuinely
**628 × 786** (read from a detached `Image()`); at a 768px viewport the prose
column is 704px and `w-full` paints it **704 × 881 — a 1.12× upscale of a
photograph that does not have the pixels.**

`lg:w-auto` already does the right thing at ≥1024px, which is exactly why the
same element measures green there and red at 768. This extends the behaviour it
already has to the two bands below it rather than inventing one.

⚠ **Do not implement this from `parseImageDims`.** That helper reads the intrinsic
from a `-WxH/` segment in the URL and falls back to a hardcoded `1200 × 800` when
there is none — and the one image that actually fires this check has no such
segment, so a `maxWidth` derived from it would be the fallback constant and would
not fix the defect. The CSS form needs no dimensions at all.

---

## 4. What does NOT ship, and the count — the brief's STOP-AND-REPORT gate

**The 5 remaining `image-aspect` violations cannot be cleared with any asset that
exists, and the brief's gate fires.**

After S1–S6 the `.s-row` box is 4:3 at every width, fed `low`. For the eleven
covers whose `low` is 1.500 that is 11.1% and green. For
**`tempat-beli-hantaran`**, whose `low` is **1200 × 1800 (0.667)** — the portrait
UI-03 demoted out of the hero slot and into Terkini row 1 — it is 99.9% and red at
**all five widths**: 390, 768, 1024, 1440 and 1920.

**37 → 5.** The 32 cleared are 22 landscape `.s-row` rows at 390/768 (S2), the
catalogue lead plate ×4 (S4), and the article cover figure on both measured
articles ×6 (S5).

**Named asset, as the DoD requires:**
`inspire/tempat-beli-hantaran/1787780709236-images-s-dulang-buah-hantaran-mohd-hasan/low.webp`,
1200 × 1800. It cannot satisfy the aspect rule in a landscape box at any
breakpoint, because it is a portrait photograph and `low` is a resize, not a crop.
It is not alone: **UI-03 measured 12 of the 86 published articles as portrait or
near-portrait** (0.667 ×6, 0.750 ×4, 0.748, 0.753), and any of them landing in a
`.s-row` reproduces this exactly.

### The fix, and why it is not in this item

The article **has** a correct 4:3 crop —
`crop-4x3-article-card`, 1600 × 1200, retaining 50.0% of the frame. Serving it
clears all five violations. **It weighs 488 KB, for a thumbnail that is 80 × 60
CSS pixels.**

Across the twelve homepage rows the same substitution costs, measured by HTTP:

```
low.webp            36, 36, 37, 39, 49, 49, 50, 52, 54, 63, 67, 80 KB   ≈  0.6 MB
crop-4x3-article-card
                   488,567,706,710,716,736,758,779,785,793,874,946 KB   ≈  8.8 MB
```

**+8.2 MB on the front page, on cheap Android over Malaysian mobile data, to clear
five gate points.** I am not buying a number with a reader's bandwidth. UI-03 paid
+371 KB on one image and recorded that it "is not a good trade and it should not be
left standing"; this is that trade twenty-two times over.

### What the pipeline must produce — costed, and measured rather than estimated

The missing thing is the empty cell UI-03 §5 named: **there is no aspect-correct,
quality-reduced derivative anywhere in this pipeline.** I built the missing one
locally against the real production files to price it, rather than estimating:

```
                              crop-4x3 @q80    528×396 @q50   528×396 @q30   low.webp today
barang-hantaran-berguna            946 KB          30 KB          21 KB          67 KB
barang-hantaran-perempuan          874 KB          34 KB          25 KB          80 KB
hidden-hantaran                    793 KB          23 KB          17 KB          52 KB
hantaran-untuk-lelaki              785 KB          18 KB          13 KB          36 KB
persiapan-hantaran-kahwin          779 KB          28 KB          20 KB          63 KB
hantaran-tunang-simple             758 KB          18 KB          14 KB          39 KB
barang-hantaran-tunang             736 KB          24 KB          18 KB          49 KB
hantaran-tunang-untuk-lelaki       716 KB          18 KB          14 KB          37 KB
berapa-dulang-hantaran-tunang      710 KB          23 KB          17 KB          49 KB
hantaran-tunang-untuk-perempuan    706 KB          17 KB          13 KB          36 KB
hantaran-kahwin-bajet              567 KB          23 KB          17 KB          50 KB
tempat-beli-hantaran               488 KB          16 KB          11 KB          54 KB
```

**16–34 KB, median 23 KB — lighter than the `low.webp` those rows fetch today.**
Twelve rows would go from ≈620 KB to ≈272 KB: the correct fix is a **saving of
about 350 KB**, not a cost. 528px covers a 176 CSS px slot at DPR 3 exactly.

**The ask, in the pipeline's units:** a 528 × 396 q50 WebP rendition of the
existing `crop-4x3-article-card`, for **86 published articles**, plus the ingest
change that produces it for every future cover.

**And the distinction that decides how this gets priced:** it is a **resize of an
already-cropped file, not a re-crop.** The crop window and its focal point are
already computed and stored. No Rekognition call. No `CROP_TARGETS` entry, so no
`GEOMETRY_VERSION` change, so **no re-queue of every live cover** — which is the
AWS-cost decision UI-03 §5 and DES-08 both declined to make. The operation is
86 × (R2 GET → sharp resize → R2 PUT), roughly 2 MB of new storage, and a URL or
column convention for the rendition.

That is still a bulk operation against production media, an ingest-pipeline change
and a backfill script — which is the brief's gate verbatim, and it is not a
5-point item. **Stopped and reported. Count: 86.**

---

## 5. The best argument against this, and the answer

**"A 3:2 box on `.s-row` would clear 44 of the 48 homepage violations today at
zero bytes. Refusing it to protect a shape you cannot serve yet leaves the front
page broken for another sprint."**

It is a fair argument and the numbers in it are right. Two answers.

**It clears the same five fewer violations than 4:3 does, at the price of a second
shape change.** 3:2 is `low`'s modal aspect, so it is green _because eleven of
today's twelve covers came off a 3:2 sensor_ — and it is red for the same portrait
article regardless. When the 528px rendition lands the box must become 4:3 to match
it. 4:3 gets there in one move; 3:2 gets there in two, and the second one is
visible to readers.

**And 4:3 is defensible as design without the gate in the room.** The slot is
already 176 × 132 on desktop; the mobile 80 × 80 square meant _the same photograph
was two different shapes on two devices_, which nobody had named. One landscape
shape at every width is the correct treatment for a repeated element in an
editorial index — and 1:1 is the social-feed shape, which is the register this
site is trying not to be in.

**"You are leaving five known violations on production."** Yes, deliberately, and
they are legible: one article, one cause, one named file, one costed unblock. A
gate that reads 5 with a written reason is worth more than a gate that reads 0
because someone spent 8.2 MB. That is the inversion UI-06 exists to prevent.

---

## 6. CLOSED by DES-18, 01 September 2026 — the 528px rendition exists and ships

Added by the Design Systems Engineer. §4's argument is not amended; it was right,
and this is the unblock it costed.

**`crop-4x3-article-card-sm` — 528 × 396 WebP, byte ceiling 46,080 B.** Generated
for every published cover and served to the `.s-row` thumbnail on all three
surfaces (homepage Terkini, `CategoryRow`, the article page's related list).

**§4's prediction, against what shipped:**

|                      | §4 predicted                          | measured on production                              |
| -------------------- | ------------------------------------- | --------------------------------------------------- |
| the rendition        | 528 × 396 q50, 16–34 KB, median 23 KB | q50, **7,636–44,898 B, median 17,664 B**            |
| twelve homepage rows | ≈620 KB → ≈272 KB                     | **646,824 B → 271,764 B**                           |
| the saving           | "about 350 KB"                        | **375,060 B, −58.0%**                               |
| count                | 86                                    | **86, then 89 as three articles published mid-run** |
| `image-aspect`       | 5 → 0                                 | **5 → 0, `UILINT EXIT: 0`**                         |

The row total lands within 0.3% of §4's estimate. Every one of the twelve rows is
lighter; there is no row where this costs bytes.

**One thing §4 could not have known.** A fixed q50 does not honour the ceiling on
the real corpus. `songket-tenunan-tangan-atau-cetak` — handwoven songket, close to
worst-case entropy for a block encoder — is 47,628 B at q50, over. It ships at q46
and 44,898 B; the other 85 stay at q50. The ceiling is enforced by a descending
quality ladder rather than asserted by a constant, because a corpus grows and a
constant does not.

**The same measurement corrected DES-03 §6.2 at source** (docs line, branch
`feat/command-centre-dashboard`, commit `f3aa0b2`): its "Measured max" column was
generated from DES-02's eleven sample photographs, not the site's covers, and the
480 × 360 row reads "within budget" against a corpus max of 53,606 B. The ceilings
stand; the confirmation of them did not.

**What did NOT change, deliberately.** The rendition is opted into by slot class,
not switched on globally. `.s-card` and the article cover figure keep `low`: 528px
upscales in both, and the article cover is the LCP element on the highest-traffic
template and wants §5's 1.500 asset in its 3:2 box. `resolveRowThumbSource` is a
separate function from `resolveCoverSource` for exactly that reason.

> ⚠ **THE SENTENCE ABOVE IS MINE AND UI-16 RETIRED HALF OF IT, 02 September 2026.** "The article cover figure keeps `low`" was a correct statement about
> the asset that existed — 528px in that slot's 756px box is a **1.43×
> upscale** — and an incorrect conclusion, because it left a slot permanently
> outside R2 rather than naming the rung that was still missing. §7 is that
> rung. `.s-card` genuinely does keep `low` and is untouched here; that half
> stands.

---

## 7. SUPERSEDED by UI-16, 02 September 2026 — the article cover figure

Added by the Design Systems Engineer, who also wrote §6. §2's T2 is not amended;
it was right, and this is the day it named.

**The defect §6 left standing.** The article cover figure served `low.webp` into
an `aspect-[3/2]` box on the template drawing ~28% of all site impressions.
Measured on production 02 September 2026:

| rule                                               | verdict  | number                                                |
| -------------------------------------------------- | -------- | ----------------------------------------------------- |
| **R1** box within 15% of the asset                 | **PASS** | 1024×683 = 1.4993 against 1.5 — **0.05%**             |
| **R2** no `low`/`high`/`original` in a shaped slot | **FAIL** | it is `low`                                           |
| **R6** declared dims are the file's                | **FAIL** | declared 1200×800 for a 1024×683 file — **17.2%** out |

**R1 passing is the finding, not the reassurance.** `low` is a resize of the
SOURCE, so its aspect is the photographer's. This slot passed R1 because
`garden-wedding` happens to have been shot at 3:2. Eleven of the twelve front-page
covers are 3:2 and one is 2:3; the day an editor filed a portrait here, the same
markup measured **99.9%** off. A slot whose geometry is decided by the camera is
not a slot anyone designed, and that is the whole reason R2 exists.

**R6 was invisible to every check this company owned.** 1200/800 and 1024/683 are
both 1.50:1 to two decimal places, so check 4b — the only declared-box check that
existed — read **zero** on it. UI-16 adds `shaped-slot-dims`, which compares the
DIMENSIONS rather than the ratio, and `shaped-slot-variant` for R2. Both blocking,
both with a paired fixture (`pnpm ui:gate --shaped-slot`) in which five of eight
cases must produce nothing.

**What ships.** `ARTICLE_COVER_MD` — `crop-4x3-article-card-md`, **792×594**,
ceiling 103,680 B (DES-03 §6.2's card figure area-scaled to a box 2.25× larger).
792 is the smallest width that fills this slot's widest **measured** box — 756 CSS
px at 1440/1920 — with no upscale, and is exactly 1.5× DES-18's 528px rung, so the
two are one box at two scales. Same mechanism as DES-18: a resize of the stored
`crop-4x3-article-card`, no Rekognition, not a `CROP_TARGETS` entry, so
`GEOMETRY_VERSION` does not move.

**§4's count is not amended, because §4 was measuring a different thing.** Its
five remaining `image-aspect` violations were about the assets that existed then.
This rung did not exist; §4 was right to refuse to spend 8.2 MB on the only 4:3
asset that did.

**Bytes — a saving, measured over the whole corpus** by HTTP HEAD on the objects
the backfill wrote, all 96 published covers (the corpus moved 92 → 96 mid-item):

|                            | total                    | min    | median | max     |
| -------------------------- | ------------------------ | ------ | ------ | ------- |
| `low.webp`                 | 5,034,824 B              | 15,184 | 49,856 | 252,352 |
| `crop-4x3-article-card-md` | **3,296,332 B**          | 12,346 | 30,716 | 100,990 |
| delta                      | **−1,738,492 B, −34.5%** |        |        |         |

`garden-wedding`'s LCP image: **33,574 B → 26,936 B, −19.8%.**

**The box follows the asset, literally.** R1's own sentence, and its remedy for a
box no derivative can fill — _"you do not have that box"_. Four covers
(`sewa-dewan-kahwin`, `villa-warisan`, `wedding-planner-terbaik-di-malaysia`,
`yasaka-shrine`) have 800×500 source photographs, so their 4:3 crop is
height-constrained at **667px** and no larger 4:3 asset can exist for them.
Stretching 667 across 756 would be a 1.13× upscale and R5 would go red on four
articles; the figure narrows to the asset instead, measured **1.000×**. Computed
from the stored width, never a slug list, so the cap lifts itself the day a bigger
source is uploaded.

**⚠ AN OPEN QUESTION THIS SECTION DOES NOT SETTLE, and it belongs to the Creative
Director.** CONT-15 (PR #63, open at time of writing) rewrites this same figure to
the opposite rule: keep `low` and make the box follow the file per article, which
is R1-by-construction and costs zero bytes. It is not compatible with R2 as
written, and under `shaped-slot-variant` it fails the build. The substantive
question is **portrait covers**: `tempat-beli-hantaran` is 1200×1800, and a 4:3
crop of it keeps **50%** of the frame — clear of UI-03 R8(c)'s 33% floor, but
still half a frame an editor framed tall.

A synthesis exists and is deliberately NOT built here: drive the box's aspect from
the **rendition's stored `width`/`height`** instead of a hardcoded `4/3`, so the
box follows the asset in shape as well as in width. That needs a portrait rendition
at a sane weight — `crop-4x5-mobile-cover` is the right shape at 943 KB–2.0 MB, so
it needs the same resize rung — and it is a separate item, not a patch. **Recorded
so that whichever way the ruling goes, neither item is silently reverted.**
