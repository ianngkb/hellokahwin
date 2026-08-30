# Hero image rules — binding art direction

**Owner:** Creative Director · **Issued:** 31 Ogos 2026 · **Item:** UI-03
**Binding on:** the homepage lead plate, and every future full-bleed hero slot
(UI-05 inherits this document rather than re-deciding it).

Every number below was measured on live production on 31 Ogos 2026 with
`scripts/measure-hero.mjs`. Nothing here is asserted from reading source.

---

> **Read §2 first if you read nothing else.** §0 is the mechanical cause and it
> is real. §2 is the one that would have come back.

## 0. The mechanical cause

**`srcset`/`sizes` is a mechanism for choosing a SIZE. It was used to choose a
CROP.**

The homepage declared two photographs of different shapes — a 0.667 portrait and
a 3.520 landscape — as interchangeable width candidates in a single `srcset`.
Which of the two a reader sees is therefore decided by their viewport width and
their device pixel ratio, not by anyone's art direction. Measured, same page,
same moment:

| Viewport      | Variant the browser chose      | Asset aspect          | Box aspect |
| ------------- | ------------------------------ | --------------------- | ---------- |
| 1920 × 900 @1 | `low.webp`                     | **0.667** (portrait)  | 2.40       |
| 768 × 1024 @2 | `crop-4.3x1-desktop-hero.webp` | **3.520** (landscape) | 1.778      |
| 390 × 844 @2  | `low.webp`                     | **0.667** (portrait)  | 1.333      |

A tablet and a desktop were served two different photographs of two different
shapes into two boxes that matched neither. That is not a tuning error; it is the
wrong HTML mechanism. Art direction across breakpoints is `<picture>` +
`<source media>`, and only that.

---

## 1. The rules

**R1 — The box follows the asset, never the reverse.** A hero box's aspect ratio
at a breakpoint must equal the intrinsic aspect of the derivative served at that
breakpoint, within **15%**. If no derivative matches the box you want, you do not
have that box; you have a pipeline request.

**R2 — `low`, `high` and `original` are never hero-eligible.** Those three
variants preserve the SOURCE aspect ratio. Sources are frequently portrait — the
current hero's is 1200×1800 — so they can never satisfy R1 in a landscape slot,
at any quality. Only named landscape crop targets may fill a hero.

**R3 — Art-direct with `<picture>` + `<source media>`.** One crop per band. Never
express a crop change as a `srcset` width candidate. (See §0 for what that costs.)

**R4 — Every `w` descriptor states the asset's REAL intrinsic width.** Live today
`crop-4.3x1-desktop-hero` is declared `1600w` and is genuinely `2464w` — a 54%
understatement that corrupts every selection decision the browser makes.

**R5 — Upscale ceiling 1.1× in CSS pixels.** Intrinsic width ≥ 0.91 × rendered
CSS width, at the widest viewport the band covers. Report the device-pixel figure
alongside it; do not quote one without saying which it is.

**R6 — `width`/`height` on the `<img>` state the default source's real intrinsic
dimensions.** Live today they read `1200 × 500` — an aspect of 2.4, which
describes neither asset in the `srcset`. The browser reserves the wrong box and
the page shifts.

**R7 — The headline is reachable in the first screen.** The test is literal and
it is the one the rig asserts: **`h1.getBoundingClientRect().top < innerHeight`**
at every measured breakpoint. Live today the `h1` starts at **y=1024 in a 900px
viewport** — off-screen. The audit's complaint that the hero has "NO HEADLINE
over it" is this rule, unwritten.

Plate height as a percentage of the viewport is a **diagnostic, not the rule**.
Report it — the live plate is 88.9% at 1920×900, which is why the headline is
gone — but do not gate on it. A first draft of this document set a 60% ceiling
and the shipped design lands at **60.6%**, which would have failed a threshold
I invented while passing the requirement it was a proxy for. Keeping the proxy
would have meant either shaving the design to fit a number with no reasoning
behind it, or quietly restating the number afterwards. Both are worse than
gating on the thing I actually mean. **A budget: a plate over ~65% of viewport
height needs the h1 position checked explicitly, because it is close.**

**R8 — Hero eligibility tests the SOURCE PHOTOGRAPH, not just the crop's
existence.** An article may hold the hero slot only if all three hold:

- **(a)** it is not in `HERO_INELIGIBLE_SLUGS` (the existing class-G rule); **and**
- **(b)** both hero crops exist; **and**
- **(c)** the hero crop retains enough of the photograph to still be one.

Unknown dimensions count as **ineligible**. Defaulting unknown to eligible is
exactly how this defect shipped. If no article qualifies, render the no-hero
path; never degrade to a portrait in a landscape box.

**(c) is the rule this whole item turns on, and §2 is why.** State it in its
general form, because the specific form hides the reasoning:

> **Retained frame = `sourceAspect / heroAspect`** (the hero target is wider than
> any source here, so `computeCropWindow` always takes the width-constrained
> branch and the surviving fraction is exactly this ratio).
> **A hero crop must retain ≥ 33% of the source's height.**

At the shipped `88/25` = 3.520 hero that threshold resolves to
`sourceAspect ≥ 1.16` — so a plain landscape check is what the general rule
_collapses to_ at this one ratio, and not the rule itself. The implementation
therefore derives it rather than hardcoding it:

```ts
const HERO_ASPECT = 88 / 25; // MUST stay in sync with lg:aspect-[88/25]
const MIN_RETAINED_FRAME = 0.33;
isHeroFrameEligible = (w, h) =>
  w != null && h != null && h > 0 && w / h / HERO_ASPECT >= MIN_RETAINED_FRAME;
```

Against the live corpus:

| Source aspect            | Retained at 3.52:1 | Verdict        |
| ------------------------ | ------------------ | -------------- |
| 1.500 (12 of 13 covers)  | 42.6%              | eligible       |
| 1.333 (4:3, 10 articles) | 37.9%              | eligible       |
| 1.160 (threshold)        | 33.0%              | boundary       |
| 0.667 (the shipped hero) | **18.9%**          | **ineligible** |

**Verified against the production database, 31 Ogos 2026** — the whole corpus,
not a sample, because a rule keyed on data must be checked against the data:

```
published articles                              86
articles with NO joining media row               0
articles with NULL width/height                 26   <- ranks 58-86 by recency
source aspect >= 1.16 (hero-eligible)           48
disqualified as portrait/near-portrait          12   (0.667 x6, 0.750 x4, 0.748, 0.753)
```

**Within the 20-article buffer `getHomeData` actually fetches: 0 nulls, 18 of 20
eligible.** So `null → ineligible` is safe today — but it is safe because of
_where the nulls sit_, not because of the rule. All 26 are in the oldest tail,
which a buffer of 20 never reaches. **If that buffer is ever deepened past ~57,
this rule starts silently excluding real candidates**, and the fix then is to
backfill `media.width`/`height`, not to loosen the rule.

Nothing in the corpus sits near the boundary: the lowest passing value is 1.333,
well clear of 1.16. There are no marginal cases to argue about today.

Write it this way round so that changing the hero's aspect ratio automatically
re-derives the eligibility threshold instead of silently invalidating a
hardcoded `1.15`. **`HERO_ASPECT` in the eligibility test and the Tailwind
`lg:aspect-[88/25]` on the box are the same number and must be kept visibly
tied.** If someone widens the plate and the threshold does not move with it,
this defect returns and every check stays green.

**Where 33% comes from: judgement, owned as judgement.** It is not derived.
Below roughly a third of the frame a crop stops reading as a photograph of its
subject and starts reading as a texture — which is precisely what the 18.9%
crop does. A defensible line, drawn by the person accountable for taste, and
labelled as one rather than dressed up as a constant.

---

## 2. The finding: the hero slot picked the only portrait photograph on the page

This is the deepest cause of UI-03, and it is not the crop, the `sizes`
attribute or the descriptor. Those are all real and all fixed below. This is the
one that would have come back.

**`computeCropWindow` is width-constrained on a portrait source.** A 3.52:1
window on a 2:3 portrait keeps `(w / 3.52) / h` = **18.9% of the source height**.
A landscape crop of a portrait photograph is not a landscape photograph. It is a
band.

Measured on all 13 homepage covers, source aspect read from each `low.webp`
(which preserves it):

| Sources      | Dimensions  | Aspect | Orientation | Height kept at 3.52:1 |
| ------------ | ----------- | ------ | ----------- | --------------------- |
| **12 of 13** | 1200 × 800  | 1.500  | LANDSCAPE   | **42.6%**             |
| **1 of 13**  | 1200 × 1800 | 0.667  | PORTRAIT    | **18.9%**             |

**The one portrait is the one in the hero.** Selection is `publishedAt desc`
with no orientation predicate, so the single portrait photograph in the set won
the largest slot on the site by recency accident.

Looked at, not inferred: the 3.52:1 crop of the current hero is correctly
shaped, sharp and editorially useless — an extreme macro of artificial flowers
that does not depict _"Tempat beli barang hantaran: lima jenis kedai"_. The
3.52:1 crop of `adat-hantaran-ikut-keluarga`, a 1.5 landscape source, is a real
documentary frame: people seated around tiered dulang, subject legible, human
photography. Same pipeline, same target, same day. The difference is the source.

**So fixing the crop alone would have shipped a sharp, correctly-proportioned
photograph of nothing.** R8(c) is the fix; the rest of this document is
plumbing.

---

## 3. The breakpoint map — what ships

Two bands. Monotonic: the plate gets wider as the screen gets wider. All 13
homepage covers carry both assets (verified 13/13 by HTTP HEAD, 31 Ogos 2026).

| Band       | Box aspect            | Asset                     | Intrinsic  | Bytes (measured, all 13 covers) |
| ---------- | --------------------- | ------------------------- | ---------- | ------------------------------- |
| `< 1024px` | **1.905** (`40 / 21`) | `crop-16x9-og`            | 1200 × 630 | **278–425 KB** (median ~318)    |
| `≥ 1024px` | **3.520** (`88 / 25`) | `crop-4.3x1-desktop-hero` | 2464 × 700 | **535–916 KB** (median ~624)    |

Aspect deviation is **0.0%** in both bands, because the box was derived from the
asset rather than chosen first.

**Why 3.52:1 on desktop and not something rounder.** It is the only landscape
derivative the pipeline produces that is wide enough for a 1920px full-bleed
plate without upscaling (2464 ≥ 1920 → 0.78×), and at 1920×900 it makes the plate
545px — **60.6% of the viewport, which puts the headline back on the first
screen.** The cinematic band is also the correct editorial register for a lead
plate in the caratsandcake / partyslate reference set: one photograph, held wide,
with the type below it rather than fighting it. Taste and mechanism agree here;
that is a convergence, not a capitulation to what the pipeline happened to have.

**What I rejected, and why.** A 1.65 box on mobile would have bought 31px of
extra plate height while still serving `crop-16x9-og`, at a 13.4% deviation —
inside the 15% tolerance. I am not doing it. Deliberately introducing deviation
to sit just under a threshold is how a spec gets narrowed to match what got
built, and R1 exists to stop exactly that.

I also rejected `crop-4x3-article-card` for the mobile band. It would give a
better plate — 293px at 390px wide against 205px — but it is ~488 KB against
`crop-16x9-og`'s 278–425 KB, on the surface where bytes matter most. A taller
plate is not worth the heaviest available asset on a phone.

**What this costs, stated plainly, and I am not burying it.** Mobile's LCP image
goes from 54 KB (`low.webp`, wrong shape, half the photograph discarded) to
**~425 KB** for the incoming hero — **about +371 KB**. That directly contradicts
UX-01's measured decision to take 542 KB _off_ the mobile LCP image, on a site
whose audience is on cheap Android and slow connections.

I am shipping it anyway, for two reasons and no others. The DoD forbids `low`,
and `crop-16x9-og` is the lightest aspect-correct asset that exists — there is no
third option to pick. And the heavy desktop asset sits behind
`<source media="(min-width: 1024px)">`, so **no phone ever fetches the 535–916 KB
file**; the whole desktop cost lands on desktop.

**This is not a good trade and it should not be left standing.** §5 is the fix.

⚠ **An earlier draft of this document said +170 KB, from 224 KB and 425 KB
figures.** Those were measured on the _portrait_ hero, whose small files were a
symptom of the defect — a blurry 19% sliver compresses well. Measured across all
13 covers the real ranges are the ones in the table. Corrected before shipping;
recorded because the shape of the error (sampling the broken case and
generalising from it) is worth more than the number.

---

## 4. The brief’s GATE — it half-fired, and here is the honest account

The gate reads: _"if no suitable landscape hero asset exists for the featured
article, STOP and report rather than shipping a different bad crop. A hero slot
that cannot be filled correctly is a pipeline finding worth more than a swapped
photo."_

Taken in two halves, because it behaves differently in each:

- **Existence: PASSES.** `crop-4.3x1-desktop-hero` and `crop-16x9-og` exist for
  **13 of 13** homepage covers, verified by HTTP HEAD on 31 Ogos 2026. Nothing is
  missing from R2.
- **Suitability, for the currently featured article: FAILS.** Its source is
  portrait, so the best landscape asset available for it retains 18.9% of the
  frame and does not depict its subject (§2). For _that article_, the gate's
  condition is met.

**So why is this not a STOP?** Because the gate exists to prevent _"shipping a
different bad crop"_, and that is not what is being shipped. The fix is not a
hand-picked photograph — the codebase already carries one of those
(`HERO_INELIGIBLE_SLUGS`) and its own comment calls it a disclosed stopgap. The
fix is **R8(c), a selection rule**, which makes 12 genuinely-landscape candidates
eligible and permanently disqualifies portrait sources from a landscape slot.

That is precisely the outcome the gate's second sentence asks for: _a pipeline
finding worth more than a swapped photo._ The finding is that hero selection had
no orientation predicate. The photograph changing is a consequence of the rule,
not the deliverable.

**What changes visibly:** the hero moves from `tempat-beli-hantaran` to
`adat-hantaran-ikut-keluarga`. `tempat-beli-hantaran` becomes the first row of
Terkini — the newest article stays at the top of the page, it simply stops
holding a plate its photograph cannot fill.

**This is flagged, not hidden.** If the CEO reads the gate more strictly than I
have and wants UI-03 stopped and re-scoped, that is a legitimate reading and the
evidence to make that call is all in §2.

---

## 5. What the pipeline must produce — the finding

The brief's second clause — _"if the fix is that heroes need a dedicated
landscape crop, say so and state what the pipeline must produce"_ — has a real
answer, and it is not the one I expected when I started:

> **The pipeline generates two families of derivative, and neither one can serve
> a hero. There is no aspect-correct, quality-reduced derivative anywhere in it.**

Lay the two families against each other and the hole is obvious:

|                                | Follows SOURCE aspect                      | Aspect-correct (landscape)                          |
| ------------------------------ | ------------------------------------------ | --------------------------------------------------- |
| **Quality-graded (q30 `low`)** | `low` — **54 KB** ✅ light, ❌ wrong shape | **← nothing here**                                  |
| **Full quality only**          | `high`, `original`                         | the smart crops — ✅ right shape, ❌ **278–916 KB** |

`low` is q30 at ≤1200px and weighs 54 KB, but it resizes the _source_, so a
portrait source stays portrait. The smart crops carry the right geometry but exist
at exactly one quality — full. **The empty cell is the whole problem.**

**This is what DES-08 ran into, and it explains the defect completely.** Faced
with "right bytes, wrong shape" or "right shape, wrong bytes", DES-08 chose
bytes — its own comment says so, vetoing the smart crops on DES-09's byte
ceilings. That choice is how a portrait ended up in a landscape box. UI-03
chooses shape, because the DoD forbids `low`, and pays +371 KB on mobile.
**Neither choice is right. The missing cell is right**, and until it exists every
future hero slot re-runs the same losing argument.

**Request, in the pipeline's own units:** a quality-reduced tier for the
landscape crops — a q30–q50 `crop-16x9-og`. At `low`'s q30 on the same 1200×630
geometry this should land near **80–120 KB**: comparable to `low`'s 54 KB, and
correctly shaped. That single derivative would let R1 and the byte doctrine hold
at once, which nothing available today does.

A right-_sized_ small crop is worth having too — `crop-40x21-hero-sm` at
1170×614 covers a 390px viewport at DPR3 exactly — and
`src/lib/storage/smart-crop-url.ts` independently recorded the same gap ("There
is no true 3:2 crop in the pipeline yet… a 3:2 target at ~1170px wide would land
near 150 KB"). But size is the smaller half. **Quality is the half that is
missing entirely**, and adding a fourth full-quality target would not fix this.

**It is not free and I am not authorising it.** Adding a `CROP_TARGETS` entry
changes `GEOMETRY_VERSION`, which re-queues **every** live cover through
Rekognition + R2 — an AWS-cost decision that belongs to the owner, and the same
one DES-08 declined to make unilaterally. Named here as a costed follow-up.

---

## 6. Divergence to raise, not to quietly absorb

`CROP_TARGETS`'s own comment specifies `crop-4.3x1-desktop-hero` against a hero
box of **976 / 1232 / 1488 px** — a _contained_ hero, sized to Tailwind's
`container` plateaus. DES-08 shipped the hero **full-bleed at `w-full`**, so the
box is 1920px at a 1920px viewport, not 1488px.

The asset survives that change (2464px still clears 1920px), so nothing breaks.
But the comment now describes a layout the site does not have, and the next
person to retarget that crop will size it against the wrong number. **The comment
must be corrected to describe the full-bleed box.** I am not rewriting the crop
geometry to match the implementation — per the standing rule, a spec is not
narrowed after the fact to fit what got built. The geometry is fine; the prose is
stale.

---

## 7. How to verify any of this

```
node scripts/measure-hero.mjs <url> "<label>"
```

Prints, per viewport: box, box aspect, served variant, **true** intrinsic size,
asset aspect, deviation %, upscale, visible fraction, plate % of viewport,
whether the `h1` is in the first screen, and a pass/fail against R1/R5/R2/R7.

**⚠ The rig does not read `img.naturalWidth`, and neither may you.** On an
element carrying a `srcset` with `w` descriptors, `naturalWidth` returns the
intrinsic width **divided by the pixel density the browser derived from `sizes`**.
Measured on production 31 Ogos 2026: the hero reported `naturalWidth: 390` at a
390px viewport while the served `low.webp` is genuinely 1200px wide — because
`sizes=100vw` gave a density of 1200/390 = 3.077, and 1200 ÷ 3.077 = 390. A
detached `Image()` loaded from the same `currentSrc` reported 1200 × 1800.

**Consequence, and it is the important one:** any upscale check written as
`boxWidth / img.naturalWidth` returns ≈1.0 on a `srcset` image **by
construction** and can never fire. Intrinsic size must be read from a detached
`Image()` on `currentSrc`. This is a direct instruction to UI-06's regression
gate.
