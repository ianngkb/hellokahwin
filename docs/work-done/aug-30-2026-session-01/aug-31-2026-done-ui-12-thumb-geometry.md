# UI-12 — card thumbnails carried 25 upscale and 31 aspect violations

**Sprint 04 · 5 points · owner `creative-director` · 31 Ogos 2026**
**Branch:** `ianng89/ui12-thumb-geometry`
**Specification:** `docs/design/card-thumbnail-image-rules.md` (written first, then built)
**Evidence:** `docs/work-done/aug-30-2026-session-01/ui-12-EVIDENCE/`

---

## Outcome — read this first

**`image-upscale` 25 → 0. `image-aspect` 31 → 4. The gate does not exit 0, and the
DoD is therefore NOT fully met.** The four survivors are one article at four
widths, they have one named cause, and clearing them requires an image derivative
that does not exist. That is the brief's STOP-AND-REPORT gate and it is reported
in §4 with the count and the price. **I am not narrowing the DoD to match what I
achieved.**

```
BEFORE (production, 31 Ogos 2026)
totals: narrow-text-column 0 · clipped-text 0 · viewport-overflow 0 · image-upscale 25 · image-aspect 31

AFTER  (production, 31 Ogos 2026)
totals: PENDING-DEPLOY
```

---

## 1. What the tracker described, and what was actually there

The tracker scoped this to "the 12 `.s-row` CARD THUMBNAILS". It was that, and
three other slots with the same cause, which the gate reported in the same run and
nobody had attributed:

| Where                                       | upscale | aspect |
| ------------------------------------------- | ------: | -----: |
| homepage `.s-row` thumbnails (12 rows)       |  **22** | **26** |
| catalogue `/artikel` featured lead plate     |       0 |  **3** |
| article cover figure (`.inspire-editorial`)  |   **2** |  **2** |
| article in-body prose image @768             |   **1** |      0 |
| **total**                                    |  **25** | **31** |

Every one of them has the same root, and it is one sentence:

> **Every fixed-aspect image slot on this site is fed `low.webp`, whose aspect
> ratio is the photographer's, not the designer's — so each slot passes or fails
> the geometry gate according to which camera shot the cover.**

`low` is `resize({ width: 1200, withoutEnlargement: true })` on the **source**. It
preserves the source aspect and does not enlarge. Measured on production the same
day it is **1200×800** on eleven of the twelve homepage covers, **1200×1800** on
one, **1200×900** on the article page's related rows and **1024×683** on
`garden-wedding`'s cover. Four intrinsic sizes, three aspect ratios, one variant
name.

And two slots declared a **`2.4/1`** box. `CROP_TARGETS` produces exactly four
aspects — 0.800, 1.333, 1.905, 3.520. Nothing produces 2.4. Per UI-03 R1, that box
does not exist; it was drawn rather than derived.

## 2. The mechanical finding that made the fix cheap

`img.naturalWidth` on an element carrying a `srcset` with `w` descriptors returns
the intrinsic width **divided by the density the browser derived from `sizes`** —
which UI-03 §7 recorded as a direct instruction to UI-06, and which the gate
nonetheless reads directly. Measured on production: the `.s-row` `<img>` reported
`naturalWidth 176` while a detached `Image()` on the same `currentSrc` reported
**1200**.

Two consequences, both load-bearing:

- **`image-aspect` compares the BOX's aspect to the ASSET's aspect and nothing
  else.** Density cancels; `sizes` cannot affect it.
- **`image-upscale` collapses to `boxWidth / <what sizes resolved to>`** — so a
  pure aspect mismatch (1.333 box, 1.500 asset) surfaced through `object-fit:
  cover`'s taller axis as a **1.13× "upscale"** on eleven rows that are in fact
  downscaling by 6×.

**So 22 of the 25 upscale violations were never upscales.** Deleting one untrue
`srcset` cleared all 25 without touching a single image file.

## 3. What shipped

Specified in `docs/design/card-thumbnail-image-rules.md` §3, built by
`design-systems-engineer`, reviewed and verified by me.

- **S1 — `resolveCoverSource` no longer emits a `srcset`.** Two independent
  reasons. (a) R4: `${src} 1200w` is asserted, not read — `ImageVariantMeta` is
  `{ url, sizeBytes }` with no dimensions — and it is measurably wrong by **17.2%**
  on `garden-wedding`, whose `low` is really 1024 wide. (b) R3/UI-03 §0: the two
  candidates were `low` (source aspect) and `crop-4x3-article-card` (a *different
  photograph shape*), i.e. `srcset` being used to choose a **crop**. That defect
  was still shipping on three templates.
  **It is a byte win, not a cost:** on the article cover `sizes` resolved to 768px,
  so every display at DPR ≥ 1.33 was downloading **488–946 KB** of a wrongly-shaped
  crop. It now downloads `low` at **36–80 KB**.
- **S2 — the `.s-row` thumbnail is 4:3 at every width.** `80×60` below 1024px (was
  `80×80`), `176×132` at and above it (unchanged). Both exactly 1.33333.
- **S3 — the "Baca seterusnya" bar thumbnail is `44×33`, not `44×44`.** Hardening,
  not a live violation: it measured **25.0%** deviation, exactly the gate's
  ceiling, and fires at 33.5% the moment the next article's cover is 3:2 — which
  eleven of the twelve front-page covers are.
- **S4 — the `/artikel` lead plate inherits UI-03 §3 in full.** `aspect-[40/21]`
  fed `crop-16x9-og` below 1024px (**0.000%** deviation), `aspect-[88/25]` fed
  `crop-4.3x1-desktop-hero` above it (**0.041%**), art-directed with `<picture>` +
  `<source media>`. Mobile's LCP image drops from 488–946 KB to 278–425 KB and the
  plate shortens from 269px to 188px at 390px wide.
- **S5 — the article cover figure's invented `lg:aspect-[2.4/1]` is gone**, along
  with a `width={1200} height={500}` that described a 2.4 ratio no asset has.
- **S6 — in-body prose images never paint above their intrinsic width.**
  `h-auto w-full … lg:w-auto` → `h-auto w-auto max-w-full`. The one image that
  fired is genuinely **628×786** and `w-full` painted it 704×881 at a 768px
  viewport.

### R8 eligibility, and a second class-G cover

`HERO_ASPECT`, `MIN_RETAINED_FRAME`, `isHeroFrameEligible`, `resolveHeroCrops` and
`HERO_INELIGIBLE_SLUGS` were lifted into `src/lib/inspire/hero-frame.ts` so the
homepage hero and the `/artikel` lead plate run **one predicate from one
definition**. Without it the lead plate was `latestArticles[0]` by recency with no
orientation predicate — byte for byte the selection bug UI-03 found on the
homepage hero, in a second place.

The engineer correctly refused to extend the hand-curated class-G exclusion to a
second surface without me, and pushed the decision back. **I rendered the
2463×700 crop at its painted size (1232×350 at a 1440 viewport) and looked at it**
rather than reading the comment:

- `persiapan-hantaran-kahwin` at 3.52:1 is ~15 people across a suburban street,
  telephone poles and parked cars across the top band, faces at roughly 18px. A
  record shot, not a lead photograph. **R8(a) applies here.**
- **`hantaran-kahwin-bajet` is the same failure mode and was not on the list** — an
  even wider line of people across a yard, faces smaller still. Added.

A hand-curated list of one that turns out to have missed one of the twelve covers
on the front page is not a stopgap, it is an incomplete stopgap. Recorded in the
code as such.

## 4. STOP AND REPORT — the brief's gate fired

**The 4 surviving `image-aspect` violations are one article at four widths and
cannot be cleared with any asset that exists.**

```
100% off — source 0.67:1 (1200x1800), painted 1.33:1 (80x60), ~50% of the frame kept (ceiling 25%)
  section.s-pad.mx-auto.max-w-3xl > div > a.s-row > img
  "/1787780709236-images-s-dulang-buah-hantaran-mohd-hasan/low.webp"
```

**Named asset:** `inspire/tempat-beli-hantaran/1787780709236-images-s-dulang-buah-hantaran-mohd-hasan/low.webp`,
**1200 × 1800**. It is a portrait photograph and `low` is a resize, not a crop, so
it cannot satisfy the aspect rule in a landscape box at any breakpoint. UI-03
measured **12 of the 86 published articles** as portrait or near-portrait (0.667
×6, 0.750 ×4, 0.748, 0.753); any of them landing in a `.s-row` reproduces this.

### Every asset that article has, priced

| Asset                     | Intrinsic   | Aspect | Bytes today | 528w @q50 would be |
| ------------------------- | ----------- | -----: | ----------: | -----------------: |
| `low.webp` (**ships now**) | 1200 × 1800 |  0.667 |  **54 KB** |                  — |
| `crop-16x9-og`            | 1200 × 630  |  1.905 |  **224 KB** |          **11 KB** |
| `crop-4.3x1-desktop-hero` | 2464 × 700  |  3.520 |  **425 KB** |           **7 KB** |
| `crop-4x3-article-card`   | 1600 × 1200 |  1.333 |  **488 KB** |          **16 KB** |
| `crop-4x5-mobile-cover`   | 1920 × 2400 |  0.800 |  **987 KB** |          **22 KB** |

**The cheapest correctly-shaped asset in existence is 224 KB, for a thumbnail that
is 80 × 60 CSS pixels — 4.1× the file it fetches today.** Across the twelve
homepage rows the 4:3 substitution costs **+8.2 MB** (0.6 MB → 8.8 MB), on cheap
Android over Malaysian mobile data, to clear four gate points. I am not buying a
number with a reader's bandwidth.

### What the pipeline must produce — measured, not estimated

I built the missing derivative locally against the real production files rather
than guessing at it:

```
                              crop-4x3 @q80    528×396 @q50   low.webp today
barang-hantaran-berguna            946 KB          30 KB          67 KB
barang-hantaran-perempuan          874 KB          34 KB          80 KB
hidden-hantaran                    793 KB          23 KB          52 KB
hantaran-untuk-lelaki              785 KB          18 KB          36 KB
persiapan-hantaran-kahwin          779 KB          28 KB          63 KB
hantaran-tunang-simple             758 KB          18 KB          39 KB
barang-hantaran-tunang             736 KB          24 KB          49 KB
hantaran-tunang-untuk-lelaki       716 KB          18 KB          37 KB
berapa-dulang-hantaran-tunang      710 KB          23 KB          49 KB
hantaran-tunang-untuk-perempuan    706 KB          17 KB          36 KB
hantaran-kahwin-bajet              567 KB          23 KB          50 KB
tempat-beli-hantaran               488 KB          16 KB          54 KB
```

**16–34 KB, median 23 KB — lighter than the `low.webp` those rows fetch today.**
Twelve rows go from ≈620 KB to ≈272 KB. **The correct fix is a saving of about
350 KB, not a cost.** 528px covers a 176 CSS px slot at DPR 3 exactly.

**The ask:** a 528 × 396 q50 WebP rendition of the existing
`crop-4x3-article-card`, for **86 published articles**, plus the ingest change that
produces it for every future cover.

**And the distinction that decides how this is priced: it is a RESIZE of an
already-cropped file, not a re-crop.** The crop window and its focal point are
already computed and stored. No Rekognition call. No `CROP_TARGETS` entry, so no
`GEOMETRY_VERSION` change, so **no re-queue of every live cover** — which is the
AWS-cost decision UI-03 §5 and DES-08 both declined to make. The operation is
86 × (R2 GET → sharp resize → R2 PUT), ~2 MB of new storage, and a URL or column
convention.

It is still a bulk operation against production media plus an ingest change plus a
backfill script — the brief's gate verbatim, and not a 5-point item.
**Stopped and reported. Count: 86.**

**Second, smaller follow-up, same owner:** `ImageVariantMeta` records
`{ url, sizeBytes }` and no dimensions, which is *why* `resolveCoverSource`
hardcoded a `1200w` that is wrong by 17.2% on real files. Adding `width`/`height`
at generation time makes UI-03 R4 satisfiable for `low`/`high` permanently. Do it
in the same pass as the rendition.

## 5. The best argument against this, and the answer

**"A 3:2 `.s-row` box clears 44 of the 48 homepage violations today at zero bytes.
Refusing it to protect a shape you cannot serve yet leaves the front page broken
for another sprint."**

Fair, and the numbers in it are right. Two answers.

**It clears exactly the same four fewer violations than 4:3 does, at the price of a
second shape change.** 3:2 is `low`'s modal aspect, so it is green *because eleven
of today's twelve covers came off a 3:2 sensor*, and it is red for the same
portrait article either way. When the 528px rendition lands the box must become
4:3 to match it. 4:3 arrives in one move; 3:2 arrives in two, and the second is
visible to readers.

**And 4:3 is defensible without the gate in the room.** The slot was already
176×132 on desktop, so the mobile 80×80 square meant *the same photograph was two
different shapes on two devices* — which nobody had named. One landscape shape at
every width is the correct treatment for a repeated element in an editorial index,
and 1:1 is the social-feed shape, which is the register this site is trying not to
be in.

**"You are leaving four known violations on production."** Yes, deliberately, and
they are legible: one article, one cause, one named file, one costed unblock. A
gate reading 4 with a written reason is worth more than a gate reading 0 because
someone spent 8.2 MB. That inversion is what UI-06 exists to prevent.

## 6. Hard rule 1 — I opened the images

Metadata cannot tell you whether a photograph still depicts anything, so the
retained fraction was computed **before** the slot was specified and the rendered
crop was then looked at.

| Slot                       | Box    | Source aspect | Retained frame |
| -------------------------- | ------ | ------------- | -------------- |
| `.s-row` 4:3               | 1.3333 | 1.500         | 88.9% of width |
| `.s-row` 4:3               | 1.3333 | 1.333         | 100%           |
| `.s-row` 4:3               | 1.3333 | 0.667         | 50.0% of height |
| lead plate `40/21`         | 1.9048 | 1.500         | 78.7%          |
| lead plate `88/25`         | 3.5200 | 1.500         | 42.6%          |
| article cover `3/2`        | 1.5000 | 0.667         | 44.5%          |

All clear UI-03's 33% floor. I then rendered all twelve `.s-row` thumbnails as
`object-fit: cover` will paint them and looked at the contact sheet: every one
depicts its subject — dulang hantaran, rombongan, tepak sirih, cincin, real human
documentary photography, subject legible at 176×132. The portrait one
(`tempat-beli-hantaran`) reads better at 4:3 keeping 50% than it did at 1:1
keeping 66%, because the fruit and the swan gubahan now fill the frame.

Looking at the lead plate is also what found the second class-G cover (§3). **The
crop review is not a formality; it produced a finding the numbers could not.**

## 7. Retrospective — Stage 9

**What we learned that is not written down.**

1. **UI-03 §7 told UI-06 not to read `img.naturalWidth`, and UI-06 reads it.** The
   consequence is not recorded anywhere: on a `srcset` image `image-upscale` is
   really a `sizes`-accuracy audit, and an aspect mismatch leaks into it through
   `object-fit: cover`. It is why 22 of 25 "upscale" violations were not upscales.
   **Owner: UI-06.** The fix is the one UI-03 already specified — read intrinsics
   from a detached `Image()` on `currentSrc` — and report both figures so the check
   means its name. Raised, not done: the brief forbids me touching that file, and
   rightly.

2. **The gate's `TEMPLATES` manifest carries ONE instance per template, so a
   per-article defect is invisible to it.** The article cover figure is
   `aspect-[3/2]` fed `low`: green on `garden-wedding` (source 1.4993) and 125% off
   on any of the 12 portrait-source articles. The gate samples one of 86. This is
   the brief's own warning — "a 5-page sample disproved an agent's count until the
   CEO noticed the sample was drawn entirely from the affected subset" — reappearing
   inside the tool built to prevent it. **Owner: UI-06.** Fix: a second article
   entry in the manifest, chosen adversarially (a portrait-source cover).

3. **The gate is not deterministic against a live CDN.** Three production runs
   inside ~90 minutes returned `clipped-text` 2 / 0 / 0 and `image-upscale`
   25 / 25 / 24. A ±1 wobble on a pass/fail gate means an item can be "fixed" by
   re-running it. **Owner: UI-06.** Fix, and prefer it to prose: the gate already
   collects `imagesNotDecoded` and `imagesSkippedZeroBox` — print them in the
   totals line so a moved number is attributable.

**What we did twice.** I derived the `naturalWidth` density arithmetic by hand
before finding UI-03 §7 had already written it — §7 is at the bottom of a long
document under a "how to verify" heading, which is where a load-bearing rule goes
to be missed. And I measured the 4:3 crop's bytes twice, because the first
measurement answered the wrong question. **The rule worth keeping: when a byte
number blocks a decision, measure the asset you would SHIP, not the asset that
exists.** One `sharp` run turned "we cannot afford the correct fix" into "the
correct fix is 350 KB cheaper than today", which is a completely different report
for the owner to act on.

**What we nearly shipped, and what caught it.**

- A **3:2** `.s-row` box, which clears 44 of 48 violations at zero bytes. Caught by
  asking what the box becomes when the missing derivative lands — two visible shape
  changes instead of one.
- **Overstating `sizes` to 198px** so a 4:3 box would pass the upscale check
  against a 1.500 asset. It works. It is also a lie in a declaration, which is the
  exact thing R4 and R6 exist to forbid. Caught by writing down why I wanted it.
- **The `/artikel` lead plate showing `persiapan-hantaran-kahwin`** — the one cover
  `HERO_INELIGIBLE_SLUGS` exists to keep out of a large frame. Caught by the
  engineer refusing to extend a curated editorial exclusion without the Creative
  Director, and then by me rendering the crop and looking at it — which found a
  **second** class-G cover nobody had listed.

**Edits made, rather than described.**

- `docs/design/card-thumbnail-image-rules.md` — **new.** The rules the next
  fixed-aspect slot inherits, in the same form UI-03 shipped for the next hero
  slot. Adds three rules to UI-03's eight: **T1** a `w` descriptor may only be
  written for an asset whose real dimensions are recorded, so `low`/`high`/
  `original` get no `srcset` at all; **T2** a slot fed a source-aspect variant sets
  a 4:3 box and tolerates R1's 15%, never the gate's 25%; **T3** an image is never
  painted wider than its own intrinsic width.
- `docs/design/hero-image-rules.md` — cross-reference to the above, and §7 gains
  the second half of its own consequence.
- `src/lib/inspire/hero-frame.ts` — **new.** One definition of R8 for both
  surfaces, replacing a copy that was about to be made.
- `HERO_INELIGIBLE_SLUGS` gains its second entry, with the reason and the date it
  was judged, and a note that a second entry appearing this fast is the argument
  for replacing the list rather than extending it.
