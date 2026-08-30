# UI-08 evidence — the breadcrumb's final crumb

Entry: [`../aug-31-2026-done-ui-08-breadcrumb-crumb-width.md`](../aug-31-2026-done-ui-08-breadcrumb-crumb-width.md)

Everything here was produced against **live production**, in Chrome, with
`innerWidth` and `matchMedia('(width: Npx)')` asserted **inside the page** at
each of 390 / 768 / 1024 / 1440. The launch recipe is copied from UI-04's
`harness/truncation.mjs`.

## harness/

Run from anywhere; paths inside are absolute.

| Script | Use |
|---|---|
| `identify.mjs <base> <out.json>` | Enumerates every horizontally-clipping element and prints its full ancestor chain, `aria-current`, `href` and `outerHTML`. This is what proved the element is a breadcrumb and not an attribution link. Deliberately does **not** filter to leaf nodes — UI-04 recorded that filter as the blind spot that hid a real truncation. |
| `dod.mjs <base> <out.json>` | Asserts UI-08's Definition of Done verbatim; prints `DOD EXIT: 0` or `1`. Records the **final** URL after redirects, a structural control (`h1`, image / link / breadcrumb-`li` / `Kredit:` counts) and a negative control (any *other* ellipsis-clipped element). |
| `shots.mjs <dir>` | The 16 screenshots. `*-after-live` is production; `*-before-reconstructed` re-applies the removed CSS in the browser and is **labelled a reconstruction**, because production no longer carries the defect. |
| `chevron.mjs` | Measures the chevron's box against the first line's client rect. Written because the downscaled screenshot read as misaligned and the measurement said 0.5px. |

```bash
node harness/dod.mjs https://hellokahwin.com /tmp/out.json    # → DOD EXIT: 0
```

## measurements/

| File | What it holds |
|---|---|
| `identify-before-production.json` | The before state: `200px` box, `332px` and `503px` text, identical at all four widths. |
| `dod-after-production.json` | **8 pass / 0 fail, `DOD EXIT: 0`.** |
| `uilint-after-production.txt` | UI-06's `scripts/ui-layout-gate.mjs` on production after the fix — `clipped-text 0`, `viewport-overflow 0` on all three targets. The `image-upscale` / `image-aspect` rows belong to the open image items and are unchanged by UI-08. |
| `article-h1-lengths-31-ogos-2026.tsv` | All 86 article URLs from `sitemap.xml` with their rendered `<h1>` and its length, sortable. Longest is 95 characters; this is what chose the gate's new content-extreme instance. |

## screens/

`<page>-<width>px-<state>.png`, deviceScaleFactor 2, cropped to
`nav[aria-label="Breadcrumb"]`.

The clearest pair is `dewan-kahwin-390px-*`: before shows
`10 Dewan Kahwin Murah di S…`, after shows the whole title wrapped to two lines
with the chevron on the first.

## Two things this evidence is not

- **A status code.** Every run records the final URL, the `x-vercel-cache`
  state, the `x-vercel-id` and the CSS bundle hash. The hash moved
  `58b3f058ca4a06ea` → `fbc0e6fba65a1ae7` → `4f3c021c4479d324` across the two
  deploys, which is how these numbers are known to belong to the build that
  shipped.
- **A single sample.** The before numbers were produced twice, by two tools
  written independently — this item's `identify.mjs` and UI-06's gate — and they
  agree to the pixel.
