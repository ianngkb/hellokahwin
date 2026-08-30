# UI-04 evidence — rendered audit, 31 Ogos 2026

Everything here was produced against **live production** (`https://hellokahwin.com`)
on 31 August 2026, in a real Chromium at real viewport widths. Nothing here is
static CSS analysis.

## How to reproduce it

The harness needs Playwright and a Chromium build. Both are already on this
machine; neither is a dependency of the site repo, so the scripts resolve them
by absolute path:

```
playwright        C:/Users/Ian Ng/Documents/Code/thepicklebase/node_modules/playwright  (1.58.2)
chromium          C:/Users/Ian Ng/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe
```

```sh
node harness/audit.mjs      <outdir>          # 6 templates x 4 widths, screenshots + measurements.json
node harness/contrast.mjs   <out.json>        # every text node, WCAG AA, at 390 and 1440
node harness/truncation.mjs <out.json>        # every ellipsis/line-clamp, per breakpoint
node harness/eyebrow3.mjs                     # every element that ACTUALLY clips, per breakpoint
node harness/search.mjs     <shotdir>         # search: default / results / no-results, per breakpoint
node harness/searchfocus.mjs                  # arrive via the header "Cari" link, then keyboard
node harness/focus.mjs                        # tab order and focus indicators
node harness/wide.mjs                         # table/pre/figure overflow, header and fold budget
```

**`audit.mjs` records `matchMedia` at every width alongside every screenshot.**
That is the point of the harness and it is not optional: the 31 Aug CEO audit
believed it was at 414px while `innerWidth` was 1920, and every "mobile" finding
it produced was desktop. See `measurements.json` → any entry → `.mq`.

## What is here

| Path | What it holds |
|---|---|
| `screens/<template>-<width>px.png` | The viewport ("fold") capture. **24 of these — one per template per breakpoint. This is the DoD set.** |
| `screens/<template>-<width>px-fullpage.jpg` | The whole page, half-scale JPEG. Article pages are capped at 14,000 source px because the full article is 38,300px tall. |
| `screens/search-<width>px-state-results.png` | Search with the query `hantaran` |
| `screens/search-<width>px-state-empty.png` | Search with the query `zzzqqqxyz` — the no-results state |
| `screens/not-found-<width>px.png` | What `/cari` actually returns (404) |
| `screens/evidence-figcaption-scrim-390px.png` | The crop that killed candidate K4 |
| `measurements/measurements.json` | Every computed value, per template per breakpoint: `mq`, overflow, past-edge elements, narrow text, every `img` with natural vs rendered size, tap targets, nav geometry, `.s-row` grid, reading measure |
| `measurements/contrast.json` | WCAG AA pass/fail per text node, 390 and 1440 |
| `measurements/truncation.json` | Ellipsis and line-clamp state per breakpoint |
| `harness/*.mjs` | The scripts, exactly as run |

## The templates captured

| Key | URL | Note |
|---|---|---|
| `homepage` | `/` | |
| `article` | `/artikel/idea-dan-nasihat/garden-wedding` | the negative control from the CEO's audit |
| `category` | `/artikel/hantaran-mas-kahwin` | |
| `artikel-index` | `/artikel` | |
| `dewan-kahwin` | `/dewan-kahwin` | **308 → `/artikel/idea-dan-nasihat/dewan-kahwin`** — it is an article, not its own template |
| `search` | `/artikel#cari` | the only search surface on the site; `/cari`, `/search` and `/carian` all return **404** |

## A caveat that belongs in the claim

The 390px and 768px captures run with `isMobile: true`, `hasTouch: true` and an
Android Chrome user-agent. **Chromium is not iOS Safari.** One finding below
(the search input's 14px font size triggering iOS focus-zoom) is a *measured CSS
value* plus documented iOS behaviour — it is not a rendered iOS observation, and
it is labelled that way wherever it appears.

## ⚠ Never count a plain-text phrase by grepping the served HTML

Added 31 Ogos 2026 by UI-05, which got a number wrong this way.

**A Next.js App Router document contains the page TWICE** — once as rendered
HTML, and again as the serialised RSC flight payload inside `<script>`. Any
**plain-text** pattern grepped over that document returns exactly **double**.

UI-05 reported *"eight empty clusters across four pillars"* from:

```
grep -o 'akan datang tidak lama lagi' page.html | wc -l
```

The real figure is **four across three**. It read as plausible, and it survived
being run a second time — because running the same wrong method twice agrees
with itself. It was caught only when a different agent counted it a different
way.

Patterns anchored to **unescaped attribute syntax** do survive, because the
flight payload writes quotes as `\"`. Verified against the DOM rather than
assumed — grep and `querySelectorAll` agree exactly on all three:

| Pattern | Safe? | Why |
|---|---|---|
| `<img` | ✅ | Tag syntax; the payload serialises the tag name as `"img"` |
| `id="cluster-` | ✅ | Unescaped attribute quote |
| `href="/artikel/…"` | ✅ | Unescaped attribute quote |
| any bare phrase of page copy | ❌ | **Appears in both copies** |

"Some text patterns are safe and some are not" is not a rule anyone applies
correctly under pressure. **Count in the DOM** — this harness already gives you
a browser, so use `querySelectorAll` rather than `grep`.

A worked example that also asserts its result:
[`../aug-31-2026-ui-05-EVIDENCE/harness/census-category-images.mjs`](../aug-31-2026-ui-05-EVIDENCE/harness/census-category-images.mjs)
