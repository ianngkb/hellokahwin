# UI-05 evidence — category pages and photography

Everything here was measured against **live production** on 31 Ogos 2026, at
**390px**, with `playwright-core` driving the installed Chrome at
`C:/Program Files/Google/Chrome/Application/chrome.exe`. Claude-in-Chrome is not
connected in the worktrees.

The decision this evidence supports is at
[`docs/design/ui-05-imej-hab-pilar.html`](../../../design/ui-05-imej-hab-pilar.html).

---

## Start here: re-run the whole premise in one command

```
node harness/census-category-images.mjs [base-url]
```

It discovers every category from `/artikel` (no hardcoded list), counts images,
clusters, empty clusters and links **in the DOM**, prints the table, and **exits
1 if any pillar hub has gained an image** — which would mean UI-05's decision had
been reversed by accident rather than on purpose.

Output on 31 Ogos 2026, after the fix shipped:

```
  categories          44
  carry photography   37
  render zero images  7   (busana-pengantin, hantaran-mas-kahwin, nikah-undang-undang,
                           pelamin-kad-cenderahati, sebelum-nikah, ucapan-doa, venue-perancangan)
  pillar hubs         7
  grid categories     37
  empty clusters      4

OK: no pillar hub renders images (UI-05).
```

**All seven zero-image pages are pillar hubs.** That is the correction to the
ticket's premise, and it is what narrowed the item.

---

## ⚠ The trap that produced a wrong number in this item

**A Next.js App Router document contains the page TWICE** — once as rendered
HTML, and again as the serialised RSC flight payload inside `<script>`. Any
**plain-text** pattern grepped over that document returns exactly **double**.

UI-05's first draft reported *"eight empty clusters across four pillars"* from:

```
grep -o 'akan datang tidak lama lagi' page.html | wc -l
```

The real figure is **four across three**. It read as a plausible number, and it
survived being run a second time — because running the same wrong method twice
agrees with itself. It was caught by the design-systems-engineer's independent
count during the build, then settled by `querySelectorAll` in a real browser.

Patterns anchored to **unescaped attribute syntax** do survive, because the
flight payload writes quotes as `\"`. Verified rather than assumed — grep and
`querySelectorAll` agree exactly on all three:

| Pattern | Safe? | Why |
|---|---|---|
| `<img` | ✅ | Tag syntax; the payload serialises the tag name as `"img"` |
| `id="cluster-` | ✅ | Unescaped attribute quote |
| `href="/artikel/…"` | ✅ | Unescaped attribute quote |
| `akan datang tidak lama lagi` | ❌ | **Plain text — appears in both copies** |

The reliable rule is simply: **count in the DOM, not in the text.**

---

## Harness

| File | What it measures |
|---|---|
| `harness/census-category-images.mjs` | The whole 44-URL census, plus the UI-05 assertion. Exits 1 on violation. |
| `harness/clusters.mjs` | Per-pillar cluster census and the computed geometry of the empty-cluster row (`padding`, `border-top`, `border-bottom`). |
| `harness/typecheck.mjs` | Computed typography of an article title, pillar vs grid, at 390 and 1280. This is what proved the dead `.t` class. |
| `harness/walk390.mjs` | Scroll height, tap-target heights, headline wrap counts, longest rendered headline, horizontal-overflow check. ⚠ Its `imgRendered` field reads `img.naturalWidth` on page elements and is therefore **wrong on any `srcset` image** — see below. Every other field is sound. |
| `harness/dims.mjs` | True intrinsic dimensions of a cover asset. **Loads a detached `Image()` from an explicit URL** — see the `naturalWidth` warning below. |
| `harness/sheet.mjs` + `contact-sheet.html` | Renders a set of covers at the real 80×80 thumbnail treatment. |

---

## Screenshots

| File | What it shows |
|---|---|
| `shots/F-contact-sheet-80px.png` | **The decisive one.** All 38 `hantaran-mas-kahwin` covers at the exact 80×80 `object-fit: cover` treatment a pillar row would use. Two exact duplicate pairs; the state-rate pages illustrated with office buildings, a shopfront and a signboard; one monochrome; four incompatible photographic registers tiled together. |
| `shots/D-pillar-top-390.png` | The pillar opening as it renders: breadcrumb, bronze `PANDUAN` eyebrow, serif h1, deck, hairline, first cluster. |
| `shots/A-pillar-list-390.png` | The pillar's text list mid-scroll. **Note:** captured *before* the fix, so the links here are the unstyled sans that the dead `.t` class produced. |
| `shots/B-grid-rows-390.png` | A grid category page with thumbnails, for comparison. |
| `shots/E-thin-pillar-bottom-390.png` | `sebelum-nikah` ending on two empty clusters, **before** the fix — the promise line tight under its h2 with no rule. |

---

## What was measured, and the numbers

| Measurement | Result | How |
|---|---|---|
| Category URLs carrying photography | 37 of 44 | `census-category-images.mjs` |
| Pillar hubs rendering zero images | 7 of 7 | same |
| Empty clusters live | 4, across 3 pillars | DOM count |
| Pillar page transfer weight | 12,308 B brotli | `curl -H 'Accept-Encoding: br'` |
| The 38 cover assets, total | 2,123,006 B | measured individually against R2 |
| Cover assets, range | 18–252 KB (mean 55 KB) | same |
| `crop-4x3-article-card` upgrade candidate | 552,098–923,392 B | same |
| Cover aspect distribution | 24 × 1.50, 4 × 1.33, 5 × 0.67, 4 × 0.75, 1 × 1.41 | `dims.mjs`, after `onload` |
| Pillar row height / grid row height | 83px / 109–111px (+34%) | `walk390.mjs` |
| Longest rendered Malay title | 70 chars, 3 lines at 390px | `walk390.mjs` |
| Horizontal overflow | none — `scrollWidth === 390` on all seven | `walk390.mjs` |

Image weight is **not** measurable from `scripts/measure-page.mjs` in the site
repo: cross-origin resources on `images.hellokahwin.com` report 0 bytes without
`Timing-Allow-Origin`. Measure assets against R2 directly, as done here.

---

## Ship

| | |
|---|---|
| Commit | `02c7d77`, merged via `c1632d1` |
| PR | [#18](https://github.com/ianngkb/hellokahwin/pull/18) — **MERGED** to `master` at `d4cefed` |
| Deployment | `6169816759`, Production, success |

Verified on the live URLs after deploy, independently of the engineer's own
report: pillar link `-apple-system` → `Bodoni Moda` at both breakpoints, 67 links
no longer carrying the dead `.t`, empty-cluster wrapper gaining
`border-top: 1px` / `margin-top: 20px` and the promise line gaining
`padding: 13px 0` / `border-bottom: 1px`, **`<img>` still 0 on all seven pillar
hubs**, and the grid pages unchanged at 15 and 14 images.


---

## ⚠ Never read `img.naturalWidth` on a page element

**On an element carrying a `srcset` with `w` descriptors, `naturalWidth` returns
the intrinsic width DIVIDED by the pixel density the browser derived from
`sizes`.** It is wrong even when the image is fully loaded.

This item's first pass read `176x88` for assets that are genuinely `1200x800`
and attributed it to reading mid-decode. **That reason was wrong.** UI-03 found
the real one, and I re-tested it here rather than adopting it on trust — on the
live grid page, with every image reporting `complete: true` and three seconds
past decode:

| `sizes` | box | element `naturalWidth` | detached `Image()` | implied density |
|---|---|---|---|---|
| `176px` | 80×80 | **176×88** | 1200×600 | 6.818 = 1200÷176 |
| `176px` | 80×80 | **176×117** | 1200×800 | 6.818 |
| `176px` | 80×80 | **117×73** | 800×500 | 6.838 |
| `(min-width:1024px) 400px, 100vw` | 350×205 | **377×220** | 1160×680 | 3.077 = 1200÷390 |

**Read intrinsic size from a detached `Image()` on `currentSrc`.**

**The consequence that matters:** any upscale check written as
`boxWidth / img.naturalWidth` returns ≈1.0 **by construction** and can never
fire. That is a direct instruction to UI-06's regression gate.

Getting the *reason* wrong was worse than getting the number wrong. The
measurements here were always sound, because `dims.mjs` loads assets by URL with
no `srcset`. But a reader following "wait for decode" would have waited and still
got wrong numbers forever.

---

## UI-03's image rules, measured against this decision

UI-03 shipped `docs/design/hero-image-rules.md` after this decision was taken.
Re-measured rather than assumed. **The rules close the imagery route harder than
this item's own argument did.**

- **R2** makes `low`/`high`/`original` ineligible for any shaped slot, so the
  only legal source for a thumbnail is a named landscape crop.
- **R1** requires the box within 15% of the asset aspect. The pipeline defines
  exactly **four** crop targets and **none is square**. Against an 80×80 box:
  `crop-4x5-mobile-cover` 25%, `crop-4x3-article-card` 33%, `crop-16x9-og` 90%,
  `crop-4.3x1-desktop-hero` 252% — **all fail**. Creating a square target is
  forbidden (it changes `GEOMETRY_VERSION` and re-queues every cover through
  Rekognition + R2, an owner-level AWS cost).
- Reshaping the box to 16:9 would be legal, so I measured the cost:
  **`crop-16x9-og` across all 38 hantaran covers = 11,958,290 B (11.40 MB)**,
  mean 307 KB, range 142–425 KB, **0 missing**. That is 5.6× the `low` figure
  this document already rejected, and **971×** the current page.
- **UI-03 §5's pipeline request does not satisfy this item's reversal condition
  2.** It asks for a quality-reduced 1200×630 crop at 80–120 KB — across 38
  covers still 3.0–4.6 MB. A pillar thumbnail needs an asset ~160–360px *wide*.
  Different asks, different slots.

### Grid category pages violate R1 and R2 today — outside this item's DoD

Measured on `/artikel/idea-dan-nasihat`, `.s-row` thumbnails, intrinsic read
from a detached `Image()`:

| Viewport | Box | Asset | Deviation | R1 | R2 |
|---|---|---|---|---|---|
| 390px | 80×80 (1.000) | 1200×600 (2.000) | 50.0% | FAIL | FAIL |
| 390px | 80×80 | 800×500 (1.600) | 37.5% | FAIL | FAIL |
| 390px | 80×80 | 1200×800 (1.500) | 33.3% | FAIL | FAIL |
| 390px | 80×80 | **1200×1800 (0.667)** | 50.0% | FAIL | FAIL |
| 1920px | 176×132 (1.333) | 1200×600 | 33.3% | FAIL | FAIL |
| 1920px | 176×132 | **1200×1800** | **100.0%** | FAIL | FAIL |
| 1920px | 176×132 | 1200×800 | 11.1% | PASS | FAIL |

**5 of 5 fail R1 at 390px; 3 of 5 fail at 1920px; 5 of 5 fail R2 at both.** All
serve `low.webp`, and the `width`/`height` attributes read `176x132` on every
one regardless of the asset.

The lead `.s-card` figure is a different case and **passes R1** — it sets no
fixed aspect, so box and asset agree at 0.0% — but it still fails R2 (`low`) and
R6 (attributes `800x600` = 1.333 against a real 1160×680 = 1.706).

**This is on the 37 grid pages, not the 7 this item decided, so it is outside
UI-05's DoD.** Raised as a proposed item rather than absorbed.
