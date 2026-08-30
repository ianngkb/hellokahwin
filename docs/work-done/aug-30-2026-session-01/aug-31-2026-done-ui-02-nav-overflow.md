# UI-02 — the masthead rail wraps on desktop instead of hiding three categories

**Sprint:** 04 — *Fix what shipped — the front page is broken in production*
**Item:** `UI-02` · 3 points · track `design`
**Owner:** `design-systems-engineer`
**Status:** **SHIPPED** — merged to `master`, deployed, verified on the live URL
**Date:** 31 August 2026

| | |
|---|---|
| PR | https://github.com/ianngkb/hellokahwin/pull/15 (merged with a merge commit, not a squash) |
| Commit | `d934570` |
| Merge commit | `e8860c2` |
| Base | `105e79d` (origin/master — DES-08 + DES-12) |
| Production deployment | GitHub deployment `6169580519`… → `e8860c2`, state `success` |
| Live URL | https://hellokahwin.com/ |

---

## The defect, measured

The rig is committed: **`scripts/measure-nav-overflow.mjs`**, playwright-core +
the installed system Chrome, `deviceScaleFactor: 1`, `document.fonts.ready`
awaited before every read. Re-run it with:

```
npm i playwright-core --prefix /some/scratch
NODE_PATH=/some/scratch/node_modules node scripts/measure-nav-overflow.mjs https://hellokahwin.com/
```

It **enumerates** every top-level anchor in the masthead `<nav>` and prints
text + `getBoundingClientRect()` for each. It does not look up nine names it
expects to find — this sprint's own audit was burned by the opposite habit,
when a grep for `Kredit` returned zero on a page carrying forty credits
labelled in English.

### BEFORE — live production, 31 Aug 2026, before the merge

Nine top-level anchors, enumerated. `layout width` is
`documentElement.clientWidth`, not `window.innerWidth`. **`OVER`** = right edge
past the viewport (the DoD's test). **`CLIP`** = right edge past the scroll
container's own client box, which is a box with no visible boundary.

**1280 px** — nav content 1970px, scroller client box **1264px**, header 118px, 1 row

| # | Category | right | left | |
|---:|---|---:|---:|---|
| 1 | Idea dan nasihat | 165.25 | 16 | ok |
| 2 | Real Wedding | 294.30 | 169.25 | ok |
| 3 | Nikah & Undang-undang | 500.34 | 298.30 | ok |
| 4 | Hantaran & Mas Kahwin | 703.64 | 504.34 | ok |
| 5 | Ucapan, Doa & Adab Majlis | 922.73 | 707.64 | ok |
| 6 | Busana & Penampilan Pengantin | 1182.16 | 926.73 | ok |
| 7 | Pelamin, Kad & Cenderahati Majlis | **1455.77** | 1186.16 | **OVER + CLIP** |
| 8 | Venue, Kos & Perancangan | **1673.94** | 1459.77 | **OVER + CLIP** |
| 9 | Sebelum Nikah: Jodoh, Merisik & Tunang | **1985.53** | 1677.94 | **OVER + CLIP** |

→ **3 of 9 past the viewport edge; 3 of 9 clipped** (scroller right edge 1272)

**1440 px** — nav content 1970px, scroller client box **1264px**, header 118px, 1 row

| # | Category | right | left | |
|---:|---|---:|---:|---|
| 1 | Idea dan nasihat | 245.25 | 96 | ok |
| 2 | Real Wedding | 374.30 | 249.25 | ok |
| 3 | Nikah & Undang-undang | 580.34 | 378.30 | ok |
| 4 | Hantaran & Mas Kahwin | 783.64 | 584.34 | ok |
| 5 | Ucapan, Doa & Adab Majlis | 1002.73 | 787.64 | ok |
| 6 | Busana & Penampilan Pengantin | 1262.16 | 1006.73 | ok |
| 7 | Pelamin, Kad & Cenderahati Majlis | **1535.77** | 1266.16 | **OVER + CLIP** |
| 8 | Venue, Kos & Perancangan | **1753.94** | 1539.77 | **OVER + CLIP** |
| 9 | Sebelum Nikah: Jodoh, Merisik & Tunang | **2065.53** | 1757.94 | **OVER + CLIP** |

→ **3 of 9 past the viewport edge; 3 of 9 clipped** (scroller right edge 1352)

**1920 px** — nav content 1970px, scroller client box **1264px**, header 118px, 1 row

| # | Category | right | left | |
|---:|---|---:|---:|---|
| 1 | Idea dan nasihat | 485.25 | 336 | ok |
| 2 | Real Wedding | 614.30 | 489.25 | ok |
| 3 | Nikah & Undang-undang | 820.34 | 618.30 | ok |
| 4 | Hantaran & Mas Kahwin | 1023.64 | 824.34 | ok |
| 5 | Ucapan, Doa & Adab Majlis | 1242.73 | 1027.64 | ok |
| 6 | Busana & Penampilan Pengantin | 1502.16 | 1246.73 | ok |
| 7 | Pelamin, Kad & Cenderahati Majlis | 1775.77 | 1506.16 | **CLIP** (inside the viewport, still invisible) |
| 8 | Venue, Kos & Perancangan | **1993.94** | 1779.77 | **OVER + CLIP** |
| 9 | Sebelum Nikah: Jodoh, Merisik & Tunang | **2305.53** | 1997.94 | **OVER + CLIP** |

→ **2 of 9 past the viewport edge; 3 of 9 clipped** (scroller right edge 1592)

### The finding the item did not know it had

**The scroller's client box was 1264px at 1280, 1440 AND 1920 px of viewport.**
The rail was capped at `max-w-7xl` and never grew, so the number of hidden
categories did not fall as the monitor got wider — it stayed at three. At
1920px, `Pelamin, Kad & Cenderahati Majlis` ended at 1775.77px, comfortably
inside a 1920px viewport, **and was invisible anyway**, because it was 183px
past the right edge of a container the reader cannot see.

The DoD's test — *right edge ≤ viewport width* — reports 2 failures at 1920px.
The truth is 3. **See the retrospective: this is a DoD clause UI-06 needs.**

The tracker's own figures (1986 / 2298) match this rail measured at a slightly
different width; the shape of the defect is identical and the item is the same
one.

---

## The fix, and why it is not a "Lagi" menu

At `lg` (1024px) and up the horizontal scroller is switched off and the rail
**wraps**. Below `lg` the scroller and its edge cues are untouched.

The DoD allowed either — everything fits, or a deliberate, visible,
keyboard-accessible overflow affordance. An overflow menu was rejected on the
evidence, not on taste:

- **It preserves the defect in a discoverable form.** The category that was
  hidden, `Venue, Kos & Perancangan`, holds `checklist-kahwin` at 6.58% CTR,
  third best on the site. Moving it from "behind a chevron" to "behind a
  button" keeps it in a second tier. Wrapping abolishes the tier.
- **Wrapping needs no JavaScript**, so it survives a failed hydration, a
  blocked script and a cheap Android that gave up on the bundle.
- **Its failure mode is a row, not a link.** The rail is admin-managed
  (`inspire_nav_items`); an editor can rename a category to something longer at
  any time. A layout that depends on nine labels fitting is a layout that
  breaks silently the first time someone types a long one.

**Below `lg` nothing changed.** Nine wrapped rows of 44px is a menu page, not a
masthead, and UX-01 chose the one-swipe rail over a hamburger deliberately for
an audience on low-end Android.

### Cost, stated rather than discovered later

The sticky header grows:

| viewport | rows | header height |
|---|---|---|
| before, any width | 1 (3 hidden) | **118px** |
| 1024–1099 | 3 | **222px** |
| ≥1100 | 2 | **170px** |

That is the price of every category being on the page. It was taken
deliberately. 1024–1099px is the only band that costs three rows, and the item
padding change below is what pulled 1100–1279 down from three rows to two.

---

## AFTER — live production, after `e8860c2` deployed

Same rig, same widths, same enumeration.

**1280 px** — nav content 1248px, scroller `overflow-x: visible`, header 170px, **2 rows**

| # | Category | right | left | row (top) | |
|---:|---|---:|---:|---:|---|
| 1 | Idea dan nasihat | 222.17 | 80.92 | 73 | ok |
| 2 | Real Wedding | 343.22 | 226.17 | 73 | ok |
| 3 | Nikah & Undang-undang | 541.27 | 347.22 | 73 | ok |
| 4 | Hantaran & Mas Kahwin | 736.56 | 545.27 | 73 | ok |
| 5 | Ucapan, Doa & Adab Majlis | 947.66 | 740.56 | 73 | ok |
| 6 | Busana & Penampilan Pengantin | 1199.08 | 951.66 | 73 | ok |
| 7 | Pelamin, Kad & Cenderahati Majlis | 513.92 | 252.31 | 125 | ok |
| 8 | Venue, Kos & Perancangan | 724.09 | 517.92 | 125 | ok |
| 9 | Sebelum Nikah: Jodoh, Merisik & Tunang | 1027.69 | 728.09 | 125 | ok |

→ **0 of 9 past the viewport edge; 0 of 9 clipped**

**1440 px** — nav content 1248px, `overflow-x: visible`, header 170px, **2 rows**

| # | Category | right | left | row (top) | |
|---:|---|---:|---:|---:|---|
| 1 | Idea dan nasihat | 302.17 | 160.92 | 73 | ok |
| 2 | Real Wedding | 423.22 | 306.17 | 73 | ok |
| 3 | Nikah & Undang-undang | 621.27 | 427.22 | 73 | ok |
| 4 | Hantaran & Mas Kahwin | 816.56 | 625.27 | 73 | ok |
| 5 | Ucapan, Doa & Adab Majlis | 1027.66 | 820.56 | 73 | ok |
| 6 | Busana & Penampilan Pengantin | 1279.08 | 1031.66 | 73 | ok |
| 7 | Pelamin, Kad & Cenderahati Majlis | 593.92 | 332.31 | 125 | ok |
| 8 | Venue, Kos & Perancangan | 804.09 | 597.92 | 125 | ok |
| 9 | Sebelum Nikah: Jodoh, Merisik & Tunang | 1107.69 | 808.09 | 125 | ok |

→ **0 of 9 past the viewport edge; 0 of 9 clipped**

**1920 px** — nav content 1248px, `overflow-x: visible`, header 170px, **2 rows**

| # | Category | right | left | row (top) | |
|---:|---|---:|---:|---:|---|
| 1 | Idea dan nasihat | 542.17 | 400.92 | 73 | ok |
| 2 | Real Wedding | 663.22 | 546.17 | 73 | ok |
| 3 | Nikah & Undang-undang | 861.27 | 667.22 | 73 | ok |
| 4 | Hantaran & Mas Kahwin | 1056.56 | 865.27 | 73 | ok |
| 5 | Ucapan, Doa & Adab Majlis | 1267.66 | 1060.56 | 73 | ok |
| 6 | Busana & Penampilan Pengantin | 1519.08 | 1271.66 | 73 | ok |
| 7 | **Pelamin, Kad & Cenderahati Majlis** | **833.92** | 572.31 | 125 | ok |
| 8 | **Venue, Kos & Perancangan** | **1044.09** | 837.92 | 125 | ok |
| 9 | **Sebelum Nikah: Jodoh, Merisik & Tunang** | **1347.69** | 1048.09 | 125 | ok |

→ **0 of 9 past the viewport edge; 0 of 9 clipped**

### Widths between and beyond the three the DoD names

The DoD names three widths; a rail that only works at three widths is not
fixed. Live production, same rig:

| viewport | rows | header | past viewport | clipped |
|---|---|---|---|---|
| 1024 | 3 | 222px | 0 of 9 | 0 of 9 |
| 1100 | 2 | 170px | 0 of 9 | 0 of 9 |
| 1152 | 2 | 170px | 0 of 9 | 0 of 9 |
| 1200 | 2 | 170px | 0 of 9 | 0 of 9 |
| 1366 | 2 | 170px | 0 of 9 | 0 of 9 |
| 1600 | 2 | 170px | 0 of 9 | 0 of 9 |
| 1728 | 2 | 170px | 0 of 9 | 0 of 9 |
| 2560 | 2 | 170px | 0 of 9 | 0 of 9 |

`document.documentElement.scrollWidth` equals the viewport width at every one
of them — the page itself never scrolls horizontally.

And the rail is site-wide, so it was checked on a second template:
`https://hellokahwin.com/artikel/idea-dan-nasihat/garden-wedding` at 1920px —
2 rows, header 170px, **0 of 9 past the edge, 0 of 9 clipped.**

---

## Keyboard, focus, and the states nobody asked for

All of the following measured on **live production after the deploy**, not on a
dev server and not on source.

**Tab order — 1280, 1440 and 1920 px, identical at each:**

- First rail link reached after **3 Tab presses** from the document start.
- **9 of 9** rail links focused by Tab alone — no Shift, no arrow keys.
- `order matches source: true` at all three widths.
- Every one reported `IN-VIEWPORT` at the moment it held focus.
- **51 Tab presses** to walk the whole rail, of which **40 landed inside an
  open dropdown**. Focusing a rail link opens its dropdown, and the dropdown's
  own items are in the tab order between one rail link and the next. That is
  pre-existing behaviour, unchanged by this item — recorded as a finding, not
  fixed here (see *Not done*).

**Focus visibility:** `outline: solid 2px`, `outline-offset: 2px`,
`var(--foreground)`.

**Contrast — canvas-sampled and composited, not `getComputedStyle` strings.**
Every public token is `oklch()`, so Chrome hands back `lab()` and an `rgb()`
parser reports confident garbage. The sample paints the paper first, then the
colour on top, so any alpha is composited exactly as the screen composites it:

| pairing | sRGB | ratio | floor |
|---|---|---|---|
| rail link, resting, on paper | rgb(89,88,85) on rgb(252,251,250) | **6.88:1** | AA text 4.5:1 ✅ |
| rail link, focused/active, on paper | rgb(21,20,18) on rgb(252,251,250) | **17.81:1** | AA text 4.5:1 ✅ |
| focus ring on paper | rgb(21,20,18) on rgb(252,251,250) | **17.81:1** | WCAG 1.4.11 non-text 3:1 ✅ |

**Enter activates:** focused the first rail link, pressed Enter,
`https://hellokahwin.com/` → `/artikel/idea-dan-nasihat`.

**No JavaScript** (`javaScriptEnabled: false`, geometry read over the DevTools
protocol rather than by in-page script, 1280px): all nine links render, **2
rows**, top 73 and 125, max right 1199.08, **none past the edge**.

**`prefers-reduced-motion: reduce`** (1280px): `reduced: true`, 2 rows, max
right 1199, layout width 1280 — layout identical.

**390px, the phone, where the scroller is deliberately retained:**
`overflow-x: auto`, `scrollWidth` 2058 against `clientWidth` 390. Focusing the
ninth link scrolls it into view — `scrollLeft` 0 → **1668**, its right edge
2050 → **382** inside a scroller whose right edge is 390. `visible: true`.

**Long Malay labels:** the longest live label, `Sebelum Nikah: Jodoh, Merisik &
Tunang`, is 307.59px at the old padding and 299.59px at the new one — it is the
label the whole layout is sized around, and it is the ninth item in both rows
tables above.

---

## What changed in the code

| File | |
|---|---|
| `src/app/globals.css` | `--navrail-*` tokens on `:root`; `.hk-navrail`, `.hk-navrail-items`, `.hk-navrail-item` and its focus ring; `.hk-edge[data-static='lg']` suppression |
| `src/components/layout/category-rail.tsx` | **new** — the rail extracted as one component |
| `src/components/layout/navbar.tsx` | renders `<CategoryRail>` |
| `src/components/layout/edge-scroller.tsx` | `staticFrom="lg"` prop |
| `src/components/inspire/inspire-nav-menu.tsx` | anchors consume `.hk-navrail-item`; row consumes `.hk-navrail-items` |
| `src/app/(admin)/admin/design-system/page.tsx` | **§07 Masthead category rail** — new |
| `scripts/measure-nav-overflow.mjs` | **new** — the rig |

**Tokens before components.** `--navrail-measure` (80rem),
`--navrail-gutter`, `--navrail-item-pad`, `--navrail-item-gap-x`,
`--navrail-item-gap-y`, `--navrail-target` (44px).

They are on **`:root`, not `.hk-public`**, because `<InspireNavMenu>` also
renders inside the admin navigation preview, which never gets the public
wrapper. **DES-12 lost a wordmark to exactly this**: `--fs-wordmark` was
defined only on the surfaces DES-08 had migrated, so `/brand` resolved it to
nothing and rendered the mark 0×0.

`--navrail-item-pad` went 16px → 12px. **Measured, not estimated:** the nine
live labels carry 1,649.53px of text between them; at 16px of inline padding
each the row is 1,969.53px, at 12px it is 1,897.53px. The 72px is what takes
1100–1279px from three rows to two. Targets stay ≥141px wide and 44px tall.

**No hex literal was added** — the tokens are lengths, and every colour the
rail touches is an existing semantic token.

`overflow: visible` at `lg` is not cosmetic. **`overflow-x: auto` forces
`overflow-y` to `auto`**, which made the scroller a clip box for the category
dropdowns positioned inside it. Wrapping removes the need for the clip, so the
clip goes.

### The reference page, in the same change

`/admin/design-system` §07 renders **`<CategoryRail>` fed by
`getMastheadCategories()`** — the same component and the same query the public
masthead uses, so the page cannot show a rail the site does not have. That is
why the rail was extracted into its own file at all: a reference page that
re-declares the container, the scroller and the wrapper by hand agrees with the
masthead exactly once, on the day it is written. The section also carries the
`--navrail-*` token table and the before-numbers.

**Condition on this claim:** `/admin/design-system` is behind
`requireAdminSection('inspire')`. An anonymous request to it on the built
artefact returned `307 → /login`, which proves the route exists and is gated;
it does **not** prove what it renders. The section typechecks, builds and
imports the same component the masthead imports — verified by the import graph,
not by a rendered screenshot. **An admin needs to open it to confirm the visual.**

---

## Verification of the live URL — and a negative control

Per the standing rule, a status code is not evidence. The production HTML at
`https://hellokahwin.com/` (`X-Vercel-Cache: PRERENDER`, `Age: 0`) was checked
structurally:

| check | result |
|---|---|
| `class="hk-navrail"` container | 1 |
| `data-static="lg"` | 1 |
| `lg:overflow-visible` | 1 |
| rail anchors enumerated by label | **9**, exactly the nine in the tables above |

**Negative control — strings the OLD rail carried, which the new one must not:**

| string | occurrences |
|---|---|
| `justify-start lg:justify-center` (the old one-line wrapper) | **0** |
| `gap-x-1 gap-y-2` (the old items row) | **0** |

**A check I got wrong and caught.** `grep -o 'hk-navrail-item' \| wc -l`
returned **10** on a rail with nine links. The tenth is the container class
`hk-navrail-items`, which contains `hk-navrail-item` as a substring. The count
was wrong, not the page — found by enumerating the labels instead of trusting
the count, which is the same discipline the audit's `Kredit` grep failure
taught.

---

## Not done, and why

- **The dropdown tab burden.** Reaching the ninth rail link costs 51 Tab
  presses because each rail link opens its dropdown on focus and the dropdown's
  items sit in the tab order. Every link is reachable, so the DoD is met, but
  this is a real keyboard-ergonomics problem. It is pre-existing, it belongs to
  the rail's menu interaction rather than its overflow, and inventing a
  roving-tabindex menu pattern inside a 3-point overflow item would have been
  scope I was not given. **Raised as a finding for `product-designer`.**
- **`pnpm lint` fails on three files this item never touched** —
  `src/app/(public)/brand/brand.css`, `src/app/(public)/brand/page.tsx`,
  `src/components/brand/brand-assets.ts` fail `prettier --check` on `105e79d`,
  before any change of mine. ESLint is clean (0 errors, 146 pre-existing
  warnings). Not fixed here: `/brand` is DES-12's surface and another agent may
  be holding it this sprint. **Raised for whoever owns `/brand`.**
- **The Vercel preview deployment was not measured.** It returned `302` to
  Vercel SSO. A number that needs a secret session to reproduce does not go in
  a claim, so the after-table is taken from the built artefact
  (`next build && next start`) and from live production, both of which anyone
  can reproduce.

---

## Retrospective

### 1. What did we learn that is not written down?

**"Right edge ≤ viewport width" is the weaker test, and it under-reports.**
An element can sit inside the viewport and be invisible because a scroll
container with no visible boundary clips it. On this rail at 1920px the
viewport test found 2 failures; there were 3. The stronger test is the right
edge of the nearest scroll container.

**A `.hk-public`-scoped token is a trap whenever the component has a second
call site.** `<InspireNavMenu>` renders in the admin nav preview as well as the
masthead. This is the second time the same shape has bitten: DES-12 rendered a
0×0 wordmark on `/brand` for exactly this reason.

**`overflow-x: auto` is not a horizontal-only decision.** It forces
`overflow-y` to `auto`, so any container that scrolls sideways is also a clip
box for everything positioned inside it — dropdowns included.

**Following the "measure contrast on a canvas" rule is not sufficient if you
drop the alpha.** See question 4.

### 2. Which document must change, and who owns the edit?

| Document | Change | Owner | Done |
|---|---|---|---|
| `docs/plans/aug-30-2026-session-01/aug-31-2026-brief-ui-06.md` | Its DoD says the gate must fail on *"any element whose right edge exceeds the viewport width"*. On the known-bad input that clause finds 2 of 3 failures at 1920px. It needs a second assertion against the nearest scroll container's client box. **Written in as a dated addendum by this item** | `ui-06` agent | ✅ edited |
| `skillcentral/agents/projects/hellokahwin/Design/design-systems-engineer.md` | "Measure, do not assert" now names the two ways a measurement lies in this codebase: a contrast read that drops the alpha channel, and a `grep -c` on a class name whose container class contains it as a substring | `design-systems-engineer` (me) | ✅ edited |
| `scripts/measure-nav-overflow.mjs` (site repo) | The lesson in script form: the rig reports **both** verdicts per link, permanently, so nobody has to remember the distinction | `design-systems-engineer` (me) | ✅ committed in `d934570` |

### 3. What did we do twice that we should never repeat?

**Measured the before-table twice.** The first rig reported only the viewport
verdict. Adding the scroller-clip column meant re-running the whole before pass
against production. **Form of the fix:** the column is now permanent in the
committed rig, so the second pass cannot be needed again.

**Ran the accessibility proof twice.** The first run recorded a dropdown's own
items as if they were rail links (`order matches source: false`) and read the
focus ring on the same frame as `.focus()`, catching it mid-transition. Both
were bugs in the check, not the page — and *"when a check returns a surprising
result, verify the check before believing it"* is the sprint's own rule,
applied here in the direction that costs an hour rather than a false report.

**Chased a local database that was down.** Roughly forty minutes went into
seeding a local Postgres that turned out to be refusing connections, to render
nine categories that the local DB never had — it serves **three**. The rig's
enumeration is what caught that: a rail measurement over three items would have
"passed" the DoD and proved nothing. **Form of the fix:** the memory note
*"The local DB is not a copy of production"* is extended with the
`.env` / `.env.local` hazard below.

### 4. What did we nearly ship, and what caught it?

**A contrast number that was confident garbage.** The focus ring was first
measured at **17.85:1** by sampling `outlineColor` onto a canvas and slicing
the alpha channel off the returned bytes. The ring at that moment was
`oklab(0.19 … / 0.5)` — half transparent, mid-transition, and about 3:1 in
reality. Caught by reading the `/ 0.5` in the declared string and asking why it
was there. The follow-through found a second, real defect: **`transition-colors`
lists `outline-color`, so the focus ring was fading in over 150ms.** A focus
indicator that animates is a focus indicator that is not yet there.
`outline-color` is now excluded from the item's transition list, and the proof
composites over the paper and waits before reading.

**A "nine links, verified" claim built on a count of ten.**
`grep -c 'hk-navrail-item'` on the production HTML returned 10. The tenth was
the container class `hk-navrail-items`. Caught by enumerating the labels
instead of trusting the number.

**A production write, narrowly.** `.env` in these worktrees points at the
**production** Supabase pooler; `.env.local` points at a local Postgres and
overrides it in Next. A seed script written to give the local database nine
categories would have deleted and rewritten `inspire_nav_items` — and had it
read `.env` instead, it would have done that to production. It was given a hard
loopback guard and an undo dump before it was ever run, and in the end it never
ran at all because the local database was down. **The guard is the lesson, not
the luck.**
