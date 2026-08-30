# UI-10 evidence — the article reading measure, 31 Ogos 2026

Every number here was read out of a real Chromium at a real viewport width with
`innerWidth` asserted at each capture. Nothing here is static CSS analysis, and
nothing here is a screenshot someone eyeballed.

## The rig

Reuses UI-04's arrangement exactly — `playwright` and a Chromium build resolved
by absolute path, because neither is a dependency of the site repo:

```
playwright   C:/Users/Ian Ng/Documents/Code/thepicklebase/node_modules/playwright  (1.58.2)
chromium     C:/Users/Ian Ng/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe
```

```sh
node harness/measure.mjs  <base-url> <outdir> <tag>   # the DoD measurement, 5 widths
node harness/face.mjs     [base-url]                  # which face, what is 1ch worth
node harness/inject.mjs   <outdir>                    # the diff applied to LIVE prod, pre-flight
node harness/compose.mjs  <outdir> before|after       # column edges, 1440 and 1920
node harness/bodyshot.mjs <base-url> <outdir> <tag>   # the reading area in one frame
```

`measure.mjs` asserts `innerWidth` and then asserts the page **structurally**
before believing any measurement — 21 `h2`, 51 `img`, exactly one `h1`, and a
non-null `.inspire-prose`. Set `VERCEL_BYPASS` (vault key
`vercelbypass.hellokahwin`) to reach a preview deployment; without it every
preview URL is a 302 to Vercel's SSO wall.

## What is here

| Path                                  | What it holds                                                                                            |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `measurements/measure-prod-before.json` | Live production before the fix, 390/768/1024/1440/1920 — the baseline                                    |
| `measurements/measure-inject.json`     | The diff's three declarations applied to the live page in-browser — the pre-flight prediction              |
| `measurements/measure-preview-after.json` | The first preview build (my commit on `61a505f`)                                                        |
| `measurements/measure-preview-merged.json` | The preview after merging master's 18 commits — **the DoD evidence**                                   |
| `measurements/gate-prod-before.json`   | `ui-layout-gate` against live production: `reading-measure 5`                                             |
| `measurements/gate-preview-after.json` | The same gate against the merged preview: `reading-measure 0`                                             |
| `screens/prod-before-*`                | Production before                                                                                          |
| `screens/preview-merged-*`             | The shipped build                                                                                          |
| `screens/compose-before-1440px.png` / `compose-after-1440px.png` | Why the header had to move — the cap alone left the headline 216px right of its own body |
| `screens/*-reading-1440px.png`         | Body prose, an in-article photograph and the sidebar in one frame, before and after                       |

## The measurement, as measured

Body paragraphs inside `.inspire-prose`, ≥40 characters, excluding captions and
navigation. `cpl = width / (font-size × 0.5)` — the DoD's own formula.

| Viewport | Before                    | After                       | Band 45–75 |
| -------- | ------------------------- | --------------------------- | ---------- |
| 390      | 350px @ 17px → **41.18**  | 350px @ 17.04px → **41.07** | mobile status quo, not regressed |
| 768      | 704px @ 17px → **82.82**  | 581.27px @ 17.61px → **66.00** | ✓ |
| 1024     | 632px @ 17px → **74.35**  | 593.98px @ 18px → **66.00**  | ✓ |
| 1440     | 888px @ 17px → **104.47** | 594px @ 18px → **66.00**     | ✓ |
| 1920     | 1144px @ 17px → **134.59** | 594px @ 18px → **66.00**    | ✓ |

The per-paragraph range after the fix is 63.33–66.00 at every width from 768 up;
the 63.33 floor is the eight paragraphs nested in list items, which carry 24px of
their own indent.

**1920 was never measured before this item.** UI-04 stopped at 1440. It was the
worst of the five.

## The measure the formula does not report

The DoD's `0.5em` is an assumption about average advance width. Measured through
canvas `measureText` over 6,000 characters of this article's own Malay prose in
its own rendered face, the true average is **0.4636em** — so the formula
under-reports by about 8%.

| Viewport | Formula (DoD) | True glyph count |
| -------- | ------------- | ---------------- |
| 390      | 41.07         | 44.31            |
| 768      | 66.00         | 71.20            |
| 1024     | 66.00         | 71.22            |
| 1440     | 66.00         | 71.18            |
| 1920     | 66.00         | 71.18            |

Both are inside 45–75. Targeting 75 by the formula would have shipped 81 in fact.
That is the whole reason the design target is 66 rather than the ceiling.

## The face, verified rather than assumed

`harness/face.mjs` exists because `measure.mjs` reported the body's computed
family as `Georgia` while `--font-serif` is `'Bodoni Moda', Didot, 'Bodoni MT',
Georgia, serif`, which looks exactly like a webfont that failed to load. It is
not. Measured on production:

- `document.fonts` holds four `Bodoni Moda` faces and one of them is **loaded**.
- The body's computed `font-family` is `Georgia, "Times New Roman", Times, serif`
  — a *different stack*, not a fallback within the same one.
- The source is `globals.css`: `.serif-editorial { --font-serif: var(--font-cormorant) }`
  and `--font-cormorant: Georgia, …`. The comment above that rule calls itself
  "currently a no-op". It is not a no-op; it is what sets every article page's
  serif.

Consequences, raised and **not** fixed here (see the work-done entry):
`.s-h1`'s `font-variation-settings: 'opsz' 11` — DES-13's pinned instance — is
being applied to Georgia, a static face with no axes, on every article page.

- `1ch` in Georgia = **0.6138em** (its zero is an old-style figure, unusually
  wide). This is why the measure token is `em` and not `ch`.
