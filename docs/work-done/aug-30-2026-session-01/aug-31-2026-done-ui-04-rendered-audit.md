# UI-04 — Every public template rendered at 390 / 768 / 1024 / 1440 with the breakpoint proven at each width: mobile is NOT the problem, one mobile-only defect exists and it is 10 pixels wide — 31 Ogos 2026

**Session:** aug-30-2026-session-01 · **Owner:** product-designer · **Status:** completed
**Plan:** [aug-31-2026-brief-ui-04.md](../../plans/aug-30-2026-session-01/aug-31-2026-brief-ui-04.md)
**Audit this follows:** [aug-31-2026-audit-ui-desktop-mobile.md](../../plans/aug-30-2026-session-01/aug-31-2026-audit-ui-desktop-mobile.md)

Design only. No site code was touched. Every fix named here belongs to another
item or to a new one, and the new ones are already on the board.

> **⚠ The title's phrase "one mobile-only defect" is CORRECTED below** — see
> [§1's correction block](#1-new-the-one-mobile-only-defect--artikel-card-labels-clip-at-390px).
> The 10px at 390px is real; "mobile-only" is not. The same element hid 81px at
> 1024 and 17px at 1440 on the longest live category names, which no article in
> the measured grid happened to carry. Found by `design-systems-engineer` while
> shipping UI-07, 31 Ogos 2026. Every other finding in this document stands.

---

## The answer the item was raised to give

> *Explicitly answer: is there a mobile-only defect, yes or no, with evidence
> either way.*

**Yes — one, and it is small.** On `/artikel` at 390px, **9 of the 11 card
category labels are clipped mid-word**: the label box computes to **171px** and
the label text to **181px**, so **10px is hidden** behind an ellipsis and
`HANTARAN & MAS KAHWIN` renders as `HANTARAN & MAS KAH…`. At 768, 1024 and 1440
the same eleven labels clip **zero** times.

**Everything else the owner can see on a phone is also visible on a desktop, and
the severe defect is desktop-only.** The homepage `.s-row` bug renders correctly
at 390 and 768 and breaks at 1024 and above — measured, not assumed.

**So the honest reading of the owner's "desktop and mobile look terrible" is
possibility 1 combined with possibility 3 from §4 of the CEO's audit:** what was
seen was the genuinely broken desktop homepage, plus art-direction problems —
the hero crop above all — that apply at *every* width and are therefore just as
visible on a phone. It was not a mobile layout collapse. There isn't one.

**This does not make the sprint smaller.** The audit found **five new defects**
that the desktop-at-1920 pass could not have found, and they are on the board as
UI-07 … UI-11.

---

## The blocker that created this item is gone, and here is the proof

The CEO could not resize a viewport: `resize_window` reported success while
`innerWidth` and `outerWidth` stayed 1920, an iframe was refused, `window.open`
was blocked, and `matchMedia('(max-width:1023px)')` returned `false` throughout.

This audit drives a **real Chromium through Playwright** (1.58.2, chromium-1208),
one browser context per width. **`matchMedia` is evaluated at every width and
stored next to every screenshot**, so the breakpoint is proven rather than
believed. Identical at all six templates:

| Requested | `innerWidth` | `outerWidth` | `(max-width:1023px)` | `(min-width:1024px)` | `(min-width:768px)` |
|---|---|---|---|---|---|
| **390** | **390** | **390** | ✅ true | false | false |
| **768** | **768** | **768** | ✅ true | false | ✅ true |
| **1024** | **1024** | **1024** | false | ✅ true | ✅ true |
| **1440** | **1440** | **1440** | false | ✅ true | ✅ true |

Full record: `aug-31-2026-ui-04-EVIDENCE/measurements/measurements.json` → any of
the 24 entries → `.mq` and `.innerWidth`.

### The screenshots

**24 viewport captures — one per template per breakpoint — plus 24 full-page
captures, 8 search-state captures and 4 404 captures. 57 files, 7.9 MB, all
committed.**

`docs/work-done/aug-30-2026-session-01/aug-31-2026-ui-04-EVIDENCE/screens/`

| Template | URL |
|---|---|
| `homepage` | `/` |
| `article` | `/artikel/idea-dan-nasihat/garden-wedding` |
| `category` | `/artikel/hantaran-mas-kahwin` |
| `artikel-index` | `/artikel` |
| `dewan-kahwin` | `/dewan-kahwin` — **308 → `/artikel/idea-dan-nasihat/dewan-kahwin`**, it is an article, not a sixth template |
| `search` | `/artikel#cari` — **the only search surface. `/cari`, `/search` and `/carian` all return 404** |

---

## 1. New: the one mobile-only defect — `/artikel` card labels clip at 390px

**→ UI-07, 3pt, `design-systems-engineer`**

| Width | Label box (`clientWidth`) | Label text (`scrollWidth`) | Hidden | Labels clipped |
|---|---|---|---|---|
| **390** | **171px** | **181px** | **10px** | **9 of 11** |
| 768 | 352 / 360px | 181px | 0 | 0 of 11 |
| 1024 | 220 / 464px | 181px | 0 | 0 of 11 |
| 1440 | 284 / 592px | 181px | 0 | 0 of 11 |

`p.hk-eyebrow.truncate` is `white-space: nowrap; overflow: hidden; text-overflow:
ellipsis` at 11px. In the two-up card grid the column is 171px and the longest
live category label needs 181px. **10 pixels.** The affected label is
`Hantaran & Mas Kahwin`; `Pelamin, Kad & Cenderahati Majlis` and `Sebelum Nikah:
Jodoh, Merisik & Tunang` are longer still and will clip harder as those
categories fill.

This is precisely the class of defect static analysis cannot reach: the CSS is
correct, the breakpoints are coherent, no fixed width exceeds 390px, and the
page still renders a truncated word.

Evidence: `harness/eyebrow3.mjs`, `screens/search-390px-state-empty.png` (the
grid is visible below the panel), `screens/artikel-index-390px-fullpage.jpg`.

> ### Correction, 31 Ogos 2026 — added by `design-systems-engineer` while shipping UI-07
>
> **Every number in this section is reproducible. The words "mobile-only" are
> not, and they should not have been written as a finding.**
>
> The measurement above reads the labels the page HAPPENED to render. All eleven
> articles in that grid carry the same category, `Hantaran & Mas Kahwin`, at
> 181px — and `/artikel` links **44** one-segment category destinations. So 768,
> 1024 and 1440 came back clean because the long labels were not on screen, not
> because the component fits them.
>
> Injecting the longest live labels into the same element on production, before
> the UI-07 fix:
>
> | Width | Card column | `Sebelum Nikah: Jodoh, Merisik & Tunang` (301px) | `Pelamin, Kad & Cenderahati Majlis` (259px) |
> |---|---|---|---|
> | 390 | 171px | 130px hidden | 88px hidden |
> | 768 | 352px | fits | fits |
> | **1024** | **220px** | **81px hidden** | **39px hidden** |
> | **1440** | **284px** | **17px hidden** | fits |
>
> The defect was **content-bound, not width-bound**. It would have appeared at
> 1024 and 1440 the day an editor filed an article in a different category. This
> section's own prose predicted it — "will clip harder as those categories fill"
> — and the headline conclusion contradicted the prediction.
>
> This matters beyond one item: the sprint brief carried "the ONLY mobile-only
> defect on the site" forward to UI-07 as settled fact, and the obvious
> mobile-scoped fix (`sm:truncate`) would have shipped 81px and 17px of hidden
> text at desktop widths with every check in this document green.
>
> **What is still true:** the 390px reading, the 9-of-11 count, and the answer to
> the CEO's question — mobile is not the problem. **What is not:** that this
> defect was confined to mobile.
>
> The lesson is now a gate rather than a paragraph: `pnpm audit:labels`
> (`scripts/audit-label-fit.mjs`, shipped with UI-07) runs the rendered pass AND
> a worst-case pass over the category names read from the page itself, so it
> gets harder on its own as the corpus grows.
>
> `harness/eyebrow3.mjs` is unchanged and still correct for what it measures.
> After UI-07 it reports `ellipsis-capable: 0` on `/artikel`, because the fix
> removed the truncation rather than widening the box — a zero there now means
> "nothing truncates", not "nothing was checked".

---

## 2. The severe defect starts at **1024**, not 1920 — UI-01 must be tested there

**→ UI-01, `creative-director`, already in flight**

The CEO measured the `.s-row` bug at 1920 only. It begins one breakpoint earlier.

| Width | `grid-template-columns` | Headline wrapper | Verdict |
|---|---|---|---|
| **390** | `80px 256px` | **256 × 62.8px** | ✅ correct |
| **768** | `80px 610px` | **610 × 43.3px** | ✅ correct |
| **1024** | `44px 412px 176px` | **44 × 225.3px** | ❌ **broken** |
| **1440** | `44px 412px 176px` | **44 × 225.3px** | ❌ **broken** |

All 12 cards, both broken widths. The narrowest is a `h3.t` at **44 × 163.8px**,
ratio **3.72**, at 21px type; the tallest headline wrapper is **44 × 307.2px**,
ratio **6.98**, at 18px. At 390 and 768 the count of text elements narrower than
120px is **zero**.

**What UI-01 needs from this:** whichever fix is chosen — pass the rank number,
or declare a two-column variant — **it has to be verified at 1024, not only at a
wide desktop**, and it must not regress 390/768, which are correct today.

---

## 3. The hero is cropped at every width, and worst on desktop — UI-03

**→ UI-03, `creative-director`, already in flight**

The CEO measured 28% visible at 1920. Across the four breakpoints:

| Width | Source served | Rendered box | Aspect src → box | Source visible | Upscale |
|---|---|---|---|---|---|
| 390 | 390 × 585 | 390 × 292.5 | 0.67 → 1.33 | **50.0%** | 1.00× |
| 768 | 768 × 1152 | 768 × 432 | 0.67 → 1.78 | **37.5%** | 1.00× |
| 1024 | 1200 × 1800 | 1024 × 426.7 | 0.67 → 2.40 | **27.8%** | 0.85× |
| 1440 | 1200 × 1800 | 1440 × 600 | 0.67 → 2.40 | **27.8%** | **1.20×** |

**The `low.webp` variant is served at all four widths**, including the one where
it is being enlarged 1.2×.

One correction to the CEO's finding, and it matters for how UI-03 is judged:
**the hero headline is above the fold on a phone and below it on a short desktop
window.** `h1` top at 390 is **471px** in an 844px viewport; at 1440 it is
**829px** in a 900px viewport — and below the 794px window the CEO measured in.

The article cover has the same shape of problem at ≥1024: a 655 × 437 source
(`low.webp`) rendered at 768 × 320 — **1.17× upscale, 62.5% of the source
visible, 1.5 → 2.40 aspect**.

---

## 4. Category pages carry zero images at all four widths — UI-05

**→ UI-05, `product-designer` (me), already in flight**

`/artikel/hantaran-mas-kahwin`: `document.querySelectorAll('img').length === 0`
at **390, 768, 1024 and 1440**. Page height 4,654px at 390 and 3,728px at 1440 —
a scroll of pure text links on the most visual vertical there is. The rendered
check adds nothing to the CEO's diagnosis except that it holds on a phone too.

---

## 5. New: the source-attribution link hides up to 60% of its own text, at every width

**→ UI-08, 2pt, `design-systems-engineer`**

A fixed **200px** box with `text-overflow: ellipsis` at 14px, unchanged from 390
to 1440 — so on a 1440px desktop with 888px of column available, most of the
attribution is thrown away:

| Page | Text needs | Box | Hidden | Renders as |
|---|---|---|---|---|
| `article` | **332px** | 200px | **132px (40%)** | `20 Venue Garden Wedding Paling Cantik di Ma…` |
| `dewan-kahwin` | **503px** | 200px | **303px (60%)** | `10 Dewan Kahwin Murah di Selangor & KL – Ses…` |

Identical at 390, 768, 1024 and 1440. This is a **credit line**, and RIGHTS work
is live in this same sprint — an attribution that is 60% invisible is a rights
problem wearing a layout costume.

---

## 6. New: the shipped search field fails the spec we already wrote for it

**→ UI-09, 5pt, `design-systems-engineer`**

`/artikel#cari` is the only search surface. DES-06 (28 Ogos) specified this
surface including §8 keyboard, focus order and screen-reader announcement. **None
of §8 is in the shipped field.** Measured, identically at all four widths:

| Property | Measured | Consequence |
|---|---|---|
| `outline` on `:focus-visible` | **`none`, 0px** — and `box-shadow` is `rgba(0,0,0,0) 0 0 0 0`; only a static 1px border remains | **No visible focus indicator. WCAG 2.4.7 (AA) failure.** Every other link on the site shows `outline: auto 1px` or `solid 2px rgb(22,19,15)` — the input is the only element that suppresses it |
| accessible name | no `<label for>`, no `aria-label`, no `id` | The name comes only from the placeholder `Cari artikel...`, which disappears the moment you type |
| result announcement | **zero `[aria-live]` and zero `[role="status"]` on the page** | Results appearing, and `Tiada hasil dijumpai`, are silent to a screen reader |
| `<form>` ancestor | **none** | No implicit submit; no `enterkeyhint` |
| `font-size` | **14px** | **Below 16px, so iOS Safari zooms the page when the field receives focus.** See the caveat below |
| height × width | **38 × 320px**, fixed at every breakpoint | Under the 44px touch target; and the field does not grow on a 1440px page |

**The iOS caveat, stated because the condition belongs in the claim:** the 14px
is a *measured computed value*; the zoom-on-focus is *documented iOS Safari
behaviour*. The captures ran in Chromium with `isMobile`/`hasTouch` and an
Android UA. **I did not render iOS Safari and I am not claiming I did.**

> **Correction, 31 Ogos 2026 — UI-09, design-systems-engineer.**
> The first row of that table is wrong in one respect and the error travelled
> into UI-09's brief. `box-shadow` on the focused field is **not**
> `rgba(0,0,0,0) 0 0 0 0`. The computed value carries five layers, four of them
> Tailwind's empty placeholders and the fifth a real 2px ring:
> `oklab(0.19 0.00034678 0.003989 / 0.3) 0px 0px 0px 2px`. This audit's rig read
> it as `cs.boxShadow.slice(0, 60)` and saw only the placeholders.
>
> **The verdict does not change** — at 30% alpha over `--background` the ring
> composites to rgb(182,181,180), **1.98:1**, below the 3:1 WCAG 2.2 SC 1.4.11
> asks of a focus indicator — and neither does the fix. But the *finding* does:
> DES-06 §8 had already measured this correctly on 28 Ogos ("composites to
> `#b7b6b4` … 1.96:1") and specified the remedy. "There is no ring" is closed by
> anything visible; "the indicator is 1.98:1 against a 3:1 floor" is closed only
> by a number. The other five rows of the table reproduce exactly.
>
> Measured by `scripts/measure-search-a11y.mjs` at 390/768/1024/1440, colours
> canvas-resolved and alpha flattened over the real ground. See
> [UI-09](aug-31-2026-done-ui-09-search-a11y.md).

Two things about this surface that are **correct** and should not be
"fixed": clicking the header `Cari` link **does** move focus into the input
(`document.activeElement === input` at 390 and 1440), and the no-results state
does render `Tiada hasil dijumpai`. States captured at all four widths:
`screens/search-<width>px.png`, `-state-results.png`, `-state-empty.png`.

---

## 7. New: 104 characters per line in the article body at 1440

**→ UI-10, 3pt, `creative-director`**

| Width | Body paragraph width | Font size | Approx. characters per line |
|---|---|---|---|
| 390 | 316 – 350px | 18.1px | **37 – 41** ✅ |
| 768 | 601 – 704px | 19.2px | 63 – 83 |
| 1024 | 598 – 632px | 20.0px | 63 – 74 |
| **1440** | **888px** | **17px** | **104** ❌ |

At 1440 the article body escapes the measure it holds at every other width, and
does it while dropping to 17px. Forty paragraphs on the garden-wedding article
sit at exactly 888px. Comfortable measure is 45–75 characters; mobile is well
inside it and the widest desktop is 39% past it.

---

## 8. New: standalone tap targets below 24px, sitewide

**→ UI-11, 3pt, `design-systems-engineer`**

Identical geometry at 390 and 1440 — so this is not a mobile-only defect, it is a
sitewide one that **only hurts on touch**:

| Target | Size | Where |
|---|---|---|
| `Utama` / `Artikel` / `Venue` breadcrumbs | **40 × 20**, 39.7 × 20, 35.6 × 17 | article, dewan-kahwin, category |
| `Laman Utama` / `Semua Artikel` footer links | **99.4 × 15.4**, 103.7 × 15.4 | every template |
| `Kesimpulan` and the in-article TOC | **66.2 × 17** | article, dewan-kahwin |
| card category labels on `/artikel` | **181.2 × 15** × 8 | artikel-index |
| `Kredit: mohd hasan / Pexels` | **215.1 × 15.6** | homepage |

WCAG 2.5.8 (AA) asks for 24 × 24 for targets that are not inline in a sentence.
All of the above are standalone UI. Counted per template at 390: article **25**
under 44px of which **25** are under 24px tall; dewan-kahwin 25 / 24;
artikel-index 17 / 14; category 6 / 5; homepage 5 / 4. In-sentence links such as
`pelamin` and `kadar sewaan` are exempt and are excluded from the fix.

The nav links themselves are **fine** — `min-h-11` gives them a 44px hit height
at every width.

---

## 9. What was checked and came back CLEAN — the negative results are half the value

| Check | Result across all six templates × four widths |
|---|---|
| **Horizontal overflow** | **0px, everywhere.** `documentElement.scrollWidth === innerWidth` at 390, 768, 1024, 1440; zero elements past the viewport edge outside a deliberate scroller |
| **Wide content** (`table`, `pre`, `figure`, `iframe`, `blockquote`, lists) | **zero** elements overflowing their box, at 390 or 1440 |
| **WCAG AA contrast** | **zero** text nodes below AA on homepage, article, category, artikel-index and dewan-kahwin, at 390 and 1440 — including the gold standfirst, which passes. Sprint 03's "invisible gold text" near-miss has **not** recurred |
| **`.s-row` on mobile** | correct at 390 (`80px 256px`) and 768 (`80px 610px`) — the CEO's static reading was right |
| **Viewport meta / zoom** | present and correct; no `user-scalable=no`, no `maximum-scale` |
| **Console errors** | **0** on every page at every width |
| **Sticky header budget** | 102px at 390 (12.1% of 844) and 118px at 1440 (13.1% of 900) — proportionate |
| **Anchor landing** | `#cari` clears the sticky header (`scroll-mt-28`); the input lands at top 128px at 390 and 144px at 1440 |
| **Focus indicators on links** | present everywhere — `outline: auto 1px`, and `solid 2px rgb(22,19,15)` on homepage cards. Only the search input suppresses it |

---

## 10. Findings I formed and then KILLED by measuring

Recorded in full, because two of them were one command away from being reported,
and one of them was **my check being wrong, not the page**.

| Candidate | What measurement showed | Verdict |
|---|---|---|
| *"The nav is 2114px wide in a 390px viewport — 7 of 9 categories unreachable on a phone"* | The nav sits inside `div.overflow-x-auto` with `clientWidth 390 / scrollWidth 2130`, and the 390px capture shows the `›` affordance at the right edge. **Swipeable, and keyboard focus auto-scrolls items into view.** The desktop half of this is real and is UI-02 | **WITHDRAWN** |
| *"3–10 network requests fail on every page load"* | All of them are `?_rsc=` Next.js prefetches reporting `ERR_ABORTED`. Fetched directly: **HTTP 200, 37,660 and 37,380 bytes.** Prefetch cancellation, not failure | **WITHDRAWN** |
| *"The gold standfirst on cream fails contrast"* — formed by looking at the 390px screenshot | Measured every text node on five templates at two widths: **zero AA failures**. The exact thing Sprint 03 nearly shipped, and it is not here | **WITHDRAWN** |
| *"Image captions render white-on-cream at 1.2:1"* | The `figcaption` carries `linear-gradient(to top, oklab(0 0 0 / 0.7), transparent)` and `text-shadow`. **My contrast walker read `background-color: transparent` and climbed past the scrim to the page background.** The check was wrong; crop committed at `screens/evidence-figcaption-scrim-390px.png` | **WITHDRAWN — MY CHECK WAS WRONG** |
| *"`/artikel`'s h1 is 1px wide with 232px of text truncated"* | `class="sr-only"`, `clip-path: inset(50%)`, `position: absolute`. A deliberate screen-reader heading | **WITHDRAWN** |
| *"The header `Cari` link jumps to the search box without focusing it"* | After a real click: `document.activeElement === input`, at both 390 and 1440. It focuses correctly | **WITHDRAWN** |
| *"Nav links are skipped in the mobile tab order"* — 4 of 9 reported `inView: false` | The scroller smooth-scrolls the focused item into view; the readings were taken mid-animation. Re-read after settling: in view | **WITHDRAWN — MY CHECK WAS WRONG** |

And the five the CEO killed on 31 Aug — lazy `naturalWidth: 0`, empty `alt` on
card thumbnails, the centred category `h1`, `order: 3` on the `.s-row` image, and
the case-sensitive `Terkini` selector — **were not re-reported**, and the first
two were re-confirmed harmless in this run.

---

## Ship state

Docs and evidence only. No site code touched, no `src/` or `scripts/` change
belongs to this item.

**Commit:** see below
**On `origin/master`:** the docs repo works on `feat/command-centre-dashboard`; pushed
**Deployed:** n/a — nothing was built
**Still uncommitted in the tree:** other agents' in-flight work only —
`scripts/git-hooks/` and `scripts/seo/serp-shape-census.py` (untracked) and
`docs/work-done/aug-30-2026-session-01/serp-shape-census.csv` (modified) belong
to **SEO-11 and RISK-09**, which are running concurrently in this same checkout.
**I did not stage, commit, revert or stash any of them.**

## Evidence

Everything a reader needs to check this without having been here:

- `docs/work-done/aug-30-2026-session-01/aug-31-2026-ui-04-EVIDENCE/README.md` — how to re-run it
- `…/screens/` — **57 captures**, 24 of them the DoD's one-per-template-per-breakpoint set
- `…/measurements/measurements.json` — every computed value behind every number above, including `matchMedia` per capture
- `…/measurements/contrast.json`, `…/truncation.json`
- `…/harness/*.mjs` — the eight scripts, exactly as run

## What it changed

- **The owner's mobile report is resolved.** It was not a mobile layout
  collapse; it was the desktop homepage plus width-independent art direction.
  Nobody has to guess between the CEO's three possibilities any more.
- **UI-01's fix now has a test width.** The bug starts at 1024. A fix verified
  only on a wide desktop would have left a broken 1024.
- **The sprint grew by five items and 16 points**, from a pass that could not
  have produced them at 1920.
- **A rendered-measurement harness now exists in the repo** and is handed to
  UI-06.

## Follow-ups

| Item | Points | Owner | What |
|---|---|---|---|
| **UI-07** | 3 | `design-systems-engineer` | `/artikel` card labels clip at 390 — 171px box, 181px text |
| **UI-08** | 2 | `design-systems-engineer` | Attribution link fixed at 200px hides up to 303px (60%) |
| **UI-09** | 5 | `design-systems-engineer` | Search field: no focus indicator, no accessible name, no live region, 14px, 38px tall |
| **UI-10** | 3 | `creative-director` | Article body 888px / ~104 cpl at 1440 |
| **UI-11** | 3 | `design-systems-engineer` | Standalone tap targets below 24px, sitewide |

All five are on the board as `todo` in sprint 4. **Scoping them in or out is the
CEO's call, not mine** — I added them so the discovery is not lost, not to
enlarge the sprint by decree.

**Handed to UI-06 (`design-systems-engineer`):** the harness in
`aug-31-2026-ui-04-EVIDENCE/harness/`. `audit.mjs` already computes every value
UI-06's brief names — narrowest text column, elements past the viewport edge,
image upscale ratio — across four widths, and asserts `matchMedia` at each. It is
a measurement script, not a gate: it has no thresholds and no exit code. **Adding
those is UI-06's item and I have not done it**, because a gate lives in the site
repo's CI and I do not write production code.

**Not in scope of this item, deliberately, so nobody has to guess:** no fix was
made to anything above; `/artikel`'s visually hidden `h1` was noted and left
alone (it is a deliberate `sr-only`, and whether the catalogue should show a
visible title is a creative-director question, not a defect); the 11px nav label
size is identical at every width and is therefore art direction, not a rendered
defect; and no iOS Safari device was rendered.

---

## Retrospective

### 1. What did we learn that is not written down?

**That "I could not render mobile" was a tooling gap with a fix already on this
machine, and the whole company lost a day to it.** Playwright and four Chromium
builds have been installed at `~/AppData/Local/ms-playwright/` throughout. The
CEO tried three variants of the *browser-extension* approach — `resize_window`,
an iframe, `window.open` — and correctly stopped when all three failed, but
"drive a headless browser instead" was never on the list, because nothing in this
company's documents says a real viewport is obtainable or how.

**And a second one: a rendered audit produces false findings at a higher rate
than a static one, not a lower one.** Seven candidates died here against the
CEO's five, and **two of the seven died because my own check was wrong** — a
contrast walker that ignored a scrim gradient, and a truncation check that could
not see `display: inline` elements or elements whose text lives in a child.
Rendering gives you more to be wrong about.

### 2. Which document must change, and who owns the edit?

| Document | Edit | Owner |
|---|---|---|
| `docs/work-done/aug-30-2026-session-01/aug-31-2026-ui-04-EVIDENCE/harness/` | **The harness itself, committed and documented.** The lesson's strongest available form is a script, not prose | product-designer — **DONE** |
| `docs/work-done/aug-30-2026-session-01/aug-31-2026-ui-04-EVIDENCE/README.md` | The exact `playwright` and `chromium` paths on this machine, and the one-line reason `matchMedia` is recorded next to every capture | product-designer — **DONE** |
| `docs/plans/aug-30-2026-session-01/aug-31-2026-audit-ui-desktop-mobile.md` | §0's "it needs a human or an agent with a working browser" resolved in place, and §4's three possibilities closed with the answer | product-designer — **DONE**, see §0 and §4 of that file |
| `docs/work-done/README.md` | This entry in the index | product-designer — **DONE** |
| UI-06's gate | Thresholds and an exit code on top of `audit.mjs` | `design-systems-engineer` — handed over, not done here |
| `skillcentral/skills/startsprint/SKILL.md` (buddy) | **`sprint add --title` mangles any argument starting with `/`.** Run from Git Bash, `--title "/artikel card labels…"` was stored as `C:/Program Files/Git/artikel card labels…` — MSYS path conversion, silent, and it landed on the board that way. Re-running `add` from PowerShell fixed it (`add` upserts). The fix is `MSYS_NO_PATHCONV=1`, or PowerShell, in the skill's own example block | **NOT DONE BY ME, deliberately** — that file is open in PLAT-15's hands right now (`git status` in buddy shows it modified alongside `scripts/sprint.ts` and `sprint-cli.ts`). Editing it would be a second writer in a shared checkout, which is the exact hazard RISK-09 is in this sprint to close. **Handed to `BMAD`/PLAT-15** |

### 3. What did we do twice that we should never repeat?

**Formed a finding by looking at a screenshot, then having to kill it by
measuring — twice** (the gold standfirst, the white figcaption). Both times the
picture was persuasive and wrong. The order that works is measure → then look at
the picture to understand *why*; the order that wastes a cycle is look → measure
→ withdraw.

**And a small one that cost a round trip: pasting a leading-slash URL path into a
shell argument.** `sprint add --title "/artikel …"` from Git Bash silently became
`C:/Program Files/Git/artikel …` and reached the board. Caught by reading the
board back after writing to it — which is the only reason it was caught at all.

**And, at the company level, this is the second sprint running in which the
central failure is a computed value nobody looked at.** Sprint 03's retro said
so in prose. Prose did not fire. UI-06 is the mechanism, and it is the right
shape.

### 4. What did we nearly ship, and what caught it?

**A WCAG contrast failure on every image caption on the site.** `1.2:1` on white
text, on two templates, at both widths — an unambiguous, quotable, false number.
What caught it was refusing to report a computed value without asking what
produced it: `backgroundColor` came back `rgba(0,0,0,0)`, my walker climbed to
the nearest opaque ancestor, and it climbed **straight past a
`linear-gradient(to top, oklab(0 0 0 / 0.7), transparent)` scrim and a
`text-shadow`.** The proof is a 732 × 248 crop of the real caption, committed at
`screens/evidence-figcaption-scrim-390px.png` — legible white on a dark scrim.

**A check that walks `background-color` cannot see a background-image scrim, and
a check that reads `scrollWidth` cannot see an inline element.** Both of those
are now in the harness as comments at the exact line that would otherwise repeat
the mistake — which is the only form that fires.
