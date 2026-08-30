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
| `harness/walk390.mjs` | Scroll height, tap-target heights, headline wrap counts, longest rendered headline, horizontal-overflow check. |
| `harness/dims.mjs` | True intrinsic dimensions of a cover asset. **Reads `naturalWidth` after `onload`** — reading it during decode returns small wrong numbers, which is the trap §3 of the UI audit withdrew a finding for, and which this item's first pass fell into. |
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
