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

Retained frame at each band, from the modal 1.500 source: **78.7%** at 1.905,
**42.6%** at 3.520. Both clear the 33% floor.

### S5 — `src/app/(public)/artikel/[category]/[slug]/page.tsx`: delete the 2.4:1 box

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
