# UX-03 — the cheap cluster: hero crop, duplicate nav, hidden pillars, empty clusters, search, chip contrast

**Sprint 02 · Agent: Sally (UX Designer) · 2026-08-27**
**Branch:** `feat/seo-05-titles` (the worktree UX-03 was dispatched into)
**Evidence:** `docs/work-done/2026-08-27-ux-03-cheap-cluster-EVIDENCE/`

All six items are done and measured. Every number below was produced in this
session; where the brief's number and mine disagree, both are shown and the
disagreement is named.

---

## Gates

| Gate | Result |
|---|---|
| `pnpm typecheck` | clean |
| `eslint .` | **0 errors**, 151 warnings — all pre-existing (`react-hooks/*`, `no-explicit-any`, downgraded on purpose in `eslint.config.mjs`) |
| `prettier --check` on the 7 files touched | clean |
| `pnpm test` | **296 passed / 296**, 26 files |
| `pnpm build` | **exit 0**, `✓ Compiled successfully in 16.4s`; `/` still `○ (Static) 10m / 1h` |

**`pnpm lint` is RED, and it was red before I started.** It runs
`eslint . && prettier --check .`, and prettier cannot parse
`docs/work-done/2026-08-27-ux-01-mobile-article-header-EVIDENCE/measure-fold-miss-amankila.json`
— the file has a `### FOLD-MISS :: …` markdown header on line 1 but a `.json`
extension. It is on `origin/master` already:

```
$ git show origin/master:docs/work-done/2026-08-27-ux-01-mobile-article-header-EVIDENCE/measure-fold-miss-amankila.json | head -2
### FOLD-MISS :: http://localhost:3201/artikel/glamor-eksklusif/amankila-bali
{
```

Not my item, so I left it (the brief's rule: take it or leave it, never
half-fix). The fix is one of: rename to `.txt`, or add it to `.prettierignore`.
**It blocks `pnpm lint` for every agent on this repo until someone does.**

---

## Item 1 — Hero crop. DONE, but not as a one-line swap.

**CLAIM.** The homepage hero now serves `crop-4.3x1-desktop-hero` at ≥1024px and
keeps `crop-4x3-article-card` below it, art-directed through a real `<picture>`,
and exactly one of the two is ever downloaded.

**Why not the one-line change the brief described.** I measured both presets
against both of the hero's boxes before swapping. The brief's desktop numbers
reproduce exactly — and they invert on a phone:

| box | preset | cover scale | upscale | frame discarded |
|---|---|---|---|---|
| desktop 1905×560 | `crop-4x3-article-card` 1600×1200 | ×1.191 | **+19%** | **60.8%** |
| desktop 1905×560 | `crop-4.3x1-desktop-hero` 2464×700 | ×0.800 | none | **3.4%** |
| mobile 390×293 | `crop-4x3-article-card` 1600×1200 | ×0.244 | none | **0.2%** |
| mobile 390×293 | `crop-4.3x1-desktop-hero` 2464×700 | ×0.418 | none | **62.1%** |

A straight preset swap fixes a 61% waste on desktop by creating a 62% waste on
the phone — on the LCP image, on the device this site's traffic actually uses,
days after UX-01 spent a sprint item on exactly that surface. So the presets are
per-breakpoint, not ranked. Measured after the change, on the live hero asset:

```
desktop 1905x1000 : crop-4.3x1-desktop-hero.webp  2464x700  -> box 1905x560   scale x0.8     discarded 3.4%
mobile   390x844  : crop-4x3-article-card.webp    1600x1200 -> box 390x293    scale x0.2442  discarded 0.2%
desktop-hero fetches — desktop: 1, mobile: 0
```

**`<picture>`, not two `<Image>` blocks — and here is why that mattered.** The
article route already art-directs with a mobile component plus a
`hidden lg:block` desktop block. I measured what that actually costs on a phone
before copying it:

```
=== ARTICLE page mobile :: 390x844 :: /artikel/venue-perancangan/bajet-kahwin
  FETCHED crop-4.3x1-desktop-hero      748 KB  HTTP 200   <- never displayed at 390px
  FETCHED crop-4x3-article-card       1127 KB  HTTP 200
  FETCHED crop-4x3-article-card        641 KB  HTTP 200
```

A hidden `<img>` still downloads. `<picture>` + `<source media>` lets the browser
pick one and fetch one, which the 0/1 counts above confirm. Nothing is lost by
dropping `next/image` here: `next.config.ts` sets `images: { unoptimized: true }`,
so it was never resizing these, and `fill` only supplied an absolute inset.

`crop-4.3x1-desktop-hero` is also the **smaller** file — 623 KB vs 793 KB on the
measured asset (both fetched directly from R2 and their intrinsic dimensions read
out of the WebP header), so desktop gets a better frame for 170 KB less.

**HANDOVER — not my item, deliberately untouched.** The 748 KB above is a real,
live waste on `/artikel/[category]/[slug]`, the site's highest-traffic surface.
It is larger than the 542 KB UX-01 just saved. The route's two-block hero needs
the same `<picture>` treatment. I did not touch it: the brief fenced
`article-renderer.tsx` for UX-02 and this is adjacent enough that a second pair
of hands in that file tonight is how collisions happen. **This is unowned.**

Files: `src/app/(public)/page.tsx`.

---

## Item 2 — Duplicate homepage rail. DELETED.

**CLAIM.** The homepage rail is gone, along with the category query and the
article-count subquery that fed it. The masthead is now the only category
navigation on the site.

**The measurement that made this easy.** The two rails were not duplicates —
they *disagreed*. From the live homepage HTML, 2026-08-26:

```
=== SET COMPARISON ===
  in BOTH         : 6
  ONLY in rail    : 4 (child categories that were never pillars)
      - /artikel/perancangan               | Perancangan
      - /artikel/gubahan-dulang-hantaran   | Gubahan & dulang hantaran
      - /artikel/mas-kahwin-ikut-negeri-panduan | Mas kahwin ikut negeri
      - /artikel/nisbah-dulang-duit-hantaran    | Nisbah dulang, duit hantaran & etika
  ONLY in masthead: 3
      - /artikel/busana-pengantin
      - /artikel/pelamin-kad-cenderahati
      - /artikel/sebelum-nikah
```

Two navigations within ~200px of each other, sharing 6 of their links, one of
them promoting 4 child categories to pillar status and silently hiding 3 real
pillars. After:

```
homepage rail nav[aria-label="Kategori"] outside header : gone
navs outside <header>/<footer> on homepage              : 0
```

Bonus: the homepage lost a whole `inspire_categories` query plus its
`article_count` subquery. The `'inspire-categories'` cache tag **stays** — the
remaining article query still joins `inspire_categories` for `name`/`slug`, so a
category rename must still bust this entry.

Files: `src/app/(public)/page.tsx`.

---

## Item 3 — Nine pillars, and the affordance. DONE.

**CLAIM.** All nine pillars are reachable at 1400px, and both edges of the rail
now announce themselves — only when there is actually something there.

**BEFORE** (production, 1400px) — the brief reproduces exactly:

```
scrollWidth 1986  clientWidth 1136  -> 850px OFF-SCREEN
scrollbar-width: none   parent max-width: 1152px
right-edge cue: ::after=none  background-image=none  mask=none
pillars: 9, fully visible without scrolling: 5
   6. HIDDEN  [ 1051.. 1306] Busana & Penampilan Pengantin      <- clipped
   7. HIDDEN  [ 1310.. 1580] Pelamin, Kad & Cenderahati Majlis  <- entirely off-screen
   8. HIDDEN  [ 1584.. 1798] Venue, Kos & Perancangan           <- entirely off-screen
   9. HIDDEN  [ 1802.. 2110] Sebelum Nikah: Jodoh, Merisik…     <- entirely off-screen
search in masthead: NONE
```

The brief said "three pillars are invisible" and that is precisely right: three
start beyond the clip edge, a fourth is cut in half.

**AFTER** (`max-w-6xl` → `max-w-7xl`, plus `<EdgeScroller>`):

```
1400px  scrollWidth 1986  clientWidth 1264  -> 722px off-screen
        data-overflow-end=true   ::after opacity=1 width=48px chevron=yes
        data-overflow-start=null ::before opacity=0
 390px  scrollWidth 2130  clientWidth 390   -> data-overflow-end=true
after scrolling fully right (scrollLeft=722):
        data-overflow-start=true   data-overflow-end=null
        fully visible: Busana… | Pelamin… | Venue… | Sebelum Nikah: Jodoh, Merisik…
```

Screenshots `01-BEFORE-1400-nav.png` → `02-AFTER-1400-nav.png` →
`03-AFTER-1400-nav-scrolled.png`, and `04-AFTER-390-nav.png` for the phone.

`max-w-7xl` buys back 128px of the 850. It does not, and cannot, make nine
pillars fit — **the affordance is the fix; the width is only a help.** The cue is
stateful on purpose: an always-on right fade lies the moment a reader reaches the
end, which on a phone is most of the time, and an affordance that is wrong half
the time teaches people to ignore it.

**A defect I introduced and caught by looking at the render.** The first version
pinned the fades to the wrapper while the scroller carried `-mx-2`, so the
scroller was 8px wider at each edge and a stray glyph rendered *past* the
chevron. Measured (`overhangRight: 8`), moved the negative margin onto the
wrapper, re-measured `overhangRight: 0`. It is in the component's comment so the
next person does not re-do it.

Files: `src/components/layout/navbar.tsx`, `src/components/layout/edge-scroller.tsx` (new), `src/app/globals.css`.

---

## Item 4 — Empty clusters sort below real content. DONE — and the brief was right about `venue-perancangan`.

**I checked first, as instructed.** Census of all nine live pillar pages,
2026-08-26 21:21Z:

```
TOTAL: 6 empty clusters across 4 of 9 pillars
MISORDERED (empty above real content): pelamin-kad-cenderahati, sebelum-nikah, venue-perancangan
```

- **The brief was right that Hantaran is clear.** `hantaran-mas-kahwin`: 5
  clusters, **0 empty**, 26 articles. CONT-06/08 did what the brief said.
- **The brief was right about `venue-perancangan`**, which I nearly reported as
  wrong. My first parser said both of its clusters were empty, which would have
  meant the sort could not help that page at all. That was **my bug**: I bounded
  each cluster by "start of the next section" instead of by `</section>`, so the
  last cluster on every page swallowed the RSC flight payload — which
  re-serialises the string `akan datang tidak lama lagi` — and got flagged empty.
  Bounding at `</section>` and cutting the document at `</main>` fixed it, and
  the corrected per-cluster counts then cross-checked exactly against an
  independent count of article links per page (3, 26, 4, 3, 3, 5, 4). The real
  shape of that page was: **`Dewan & venue majlis` (empty) above
  `Kos, bajet & checklist perkahwinan` (4 articles)** — exactly the defect the
  brief described, with the empty cluster being the search-demand one.

**AFTER** (all three fixed, nothing else moved):

```
venue-perancangan        1.[ 4 ] Kos, bajet & checklist    2.[EMPTY] Dewan & venue majlis
sebelum-nikah            1.[ 1 ] 2.[ 1 ] 3.[ 1 ]           4.[EMPTY] 5.[EMPTY]
pelamin-kad-cenderahati  1.[ 1 ] 2.[ 1 ] 3.[ 1 ]           4.[EMPTY]
nikah-undang-undang      1.[ 1 ] 2.[ 3 ]                   3.[EMPTY] 4.[EMPTY]   (was already correct)
hantaran-mas-kahwin      1.[ 8 ] 2.[ 6 ] 3.[ 8 ] 4.[ 8 ] 5.[ 8 ]                 (no empties)
misordered pillars after: 0
```

Empty clusters still *render* — that was deliberate in the original design (the
pillar page is the map; a named-but-empty cluster is a commitment) and I kept it.
They just no longer go first. `Array#sort` is stable per spec, so within each
group the editorial `display_order` is untouched.

Files: `src/components/inspire/pillar-body.tsx`.

---

## Item 5 — Search reachable from the masthead. DONE.

**CLAIM.** Every page's masthead now has a 44px search control that lands the
reader on the existing typeahead **with the caret already in it**.

Search was built and working; it had no door. Placement, as the brief said — I
built nothing new, I linked to what exists and made the landing not be a dead
end. Verified by *clicking the masthead link from a pillar page*, not by loading
the URL:

```
 390px -> {"url":".../artikel#cari","headerBottom":102,"inputTop":128,"clearsHeader":true,"gapPx":26,"inputFocused":true,"scrollMarginTop":"112px"}
1400px -> {"url":".../artikel#cari","headerBottom":118,"inputTop":144,"clearsHeader":true,"gapPx":26,"inputFocused":true,"scrollMarginTop":"128px"}
```

**A defect I introduced and caught by measuring.** My first `scroll-mt-20`
(80px) was sized to the wordmark row, not the whole sticky header (102px at
390px, 118px at 1400px), so the search box landed *under* the masthead —
`clearsHeader:false`. Now `scroll-mt-28 lg:scroll-mt-32`, 26px of air at both
widths. The header height is written into the comment so it is not re-guessed.

The wordmark row became a `grid-cols-[1fr_auto_1fr]` so the wordmark stays
optically centred with the search at the right edge; a `justify-between` would
have pushed it off-centre by the width of the control. The label is icon-only
below `sm`.

Files: `src/components/layout/navbar.tsx`, `src/app/(public)/artikel/page.tsx`, `src/components/inspire/inspire-article-search.tsx`.

---

## Item 6 — `hk-chip` border contrast. DONE.

**CLAIM.** `.hk-chip` now draws its boundary in `--border-strong`:
**3.011:1**, clearing WCAG 1.4.11's 3:1. It was 1.365:1.

Computed independently from the `oklch()` tokens before the change (the
converter validated against the codebase's own recorded `6.89:1` for
`--muted-foreground`):

```
token                  oklch                    rgb            vs paper
--border               oklch(0.885 0.003 85)    rgb(218,217,215)  1.365:1  FAIL 1.4.11
--border-strong        oklch(0.66 0.004 85)     rgb(147,146,143)  3.006:1  PASS
```

Then measured in Chrome on the real chips at `/artikel` after the change:

```
chipBorderCss : lab(60.5763 0.109702 1.52209)
chipBorderRGB : rgb(147,146,143)
pageBgRGB     : rgb(252,251,250)
contrast      : 3.011      chipCount: 42      minHeight: 44px
```

**A false negative worth recording.** My first in-browser probe reported
**1.276:1 — a fail — on code that was already correct.** Chrome returns computed
colours in the authored colour space (`lab(...)` here, because the tokens are
`oklch`), and my contrast function assumed `rgb()` and parsed the L\*a\*b\*
numbers as if they were RGB. The fix is to paint the colour onto a 1×1 canvas
and read the pixel back, which is true sRGB regardless of authored space. **Any
future contrast check on this codebase must do that** — this design system is
written entirely in `oklch`, so the naive `getComputedStyle` + regex approach
will silently produce garbage every time.

`--border-strong` already existed for exactly this ("form-control boundaries"),
so this is a token swap, not a new colour. Hover/active still go to
`--foreground` (18.2:1), so the interaction ladder is unchanged — only the
resting state stops being invisible.

Files: `src/app/globals.css`.

---

## The `noindex` sitemap defect — NOT taken.

The brief offered it if it fell inside my item. It does not: it is
`src/app/sitemap.ts`, a crawling concern with no UX surface, and none of my six
items touch that file. **Still unowned.**

---

## Regression checks the brief named

| Guard | Result |
|---|---|
| UX-01 mobile header | `data-hide-mobile-nav` absent from the article route (only a comment recording its removal; the one live use is `article-preview-view.tsx`, an admin surface) |
| UX-01 44px tap targets | `min-h-11` ×7 still in `inspire-nav-menu.tsx`, untouched |
| RISK-06 `stale-while-revalidate` | `expireTime: 3600` in `next.config.ts` → swr = 3600−600 = **3000**. `git diff next.config.ts` is **empty** — I never touched it |

---

## What I could NOT verify from outside, and what would verify it

- **Everything above was measured against a dev server on the production
  database, not against `hellokahwin.com`.** These are code changes that are not
  deployed yet, so production still serves the old markup. What would verify it:
  re-run `verify.mjs` against `https://hellokahwin.com` after the deploy — it
  takes a base URL as `argv[2]` for exactly that reason.
- **The 1400px pillar counts move as content lands.** `cont07-hantaran` is
  publishing into the Hantaran pillar in a sibling worktree as I write; the dev
  server already showed 38 article links there against production's cached 26.
  The cluster-order fix is content-independent, but the *census numbers* are a
  timestamped snapshot, not a constant.

---

## Retrospective

### What we learned that is not written down

**1. `.env.local` in this repo points at a local scratch database, and Next
loads it ahead of `.env`.** I ran a full census against `127.0.0.1:5433/hklocal`
believing it was production, and it told me the Hantaran pillar had 4 articles
when the live site had 26. It also showed a published article with a
`local://…` cover and no smart crops, which I was one step away from reporting
as an imminent broken homepage hero. It was local-only noise. The tell was
cheap and I should have looked for it first: **the live site disagreed with the
"production" query by a factor of six.**

There is a second trap stacked on the first: after re-pointing at `.env`, the
dev server *still* served the local numbers, because `unstable_cache` had
persisted them into `.next/cache` during the first run. `rm -rf .next` was
required. A DB swap in this repo is not complete until the cache is cleared.

**2. Contrast cannot be measured with `getComputedStyle` on this codebase.**
Every colour token is `oklch()`, and Chrome returns computed colours in the
authored space. A regex expecting `rgb()` parses `lab(60.57 0.11 1.52)` as
RGB and returns confident nonsense — mine said 1.276:1 for a value that is
3.011:1. Paint to a 1×1 canvas and read the pixel.

**3. A hidden `<img>` still downloads.** The `hidden lg:block` art-direction
pattern in this codebase costs a phone 748 KB per article view. That is not a
style preference; it is measurable and it is larger than the saving UX-01
shipped this week.

### Which document must change, and who owns the edit

1. **`docs/work-done/2026-08-27-ux-01-mobile-article-header-EVIDENCE/measure-fold-miss-amankila.json`**
   — rename to `.txt` or add to `.prettierignore`. It makes `pnpm lint` fail for
   everyone. **Owner: whoever runs the next ship gate** (it is a 10-second fix
   and it is blocking a repo-wide gate; I left it because it is UX-01's artifact
   and the brief forbids half-fixing another item's files).
2. **`src/lib/storage/smart-crop-url.ts`** — its docstring is the best writing in
   this repo about crop choice, and it is where the next person will look. It
   should carry the two facts this session established: that a hidden `<img>`
   still downloads (so art direction needs `<picture>`, not two blocks), and that
   the correct crop is *per-box*, not a ranked list. **Owner: whoever takes the
   article-route `<picture>` handover** — the note and the fix belong in one
   change, and writing it before that fix exists would document an intention
   rather than a behaviour.
3. **A repo-level note on `.env.local` vs `.env`** — belongs in `README.md`
   beside the dev-server instructions: which DB each points at, that Next
   prefers `.env.local`, and that `rm -rf .next` is required after switching.
   **Owner: me, in this change** — see below.

### What we did twice

- **Parsed the pillar pages twice**, because the first parser was wrong in a way
  that produced plausible output. It did not crash; it returned a *believable*
  census that happened to contradict the brief. I only caught it because I chased
  the contradiction instead of reporting it, and because a second, independent
  count (article links per page) disagreed with the first. Two independent
  measurements of the same quantity is what caught it — one would not have.
- **Measured the site twice**, once against the wrong database (above).
- **Positioned the edge fade twice** — the first attempt was pinned to the wrong
  box and I found it by looking at the screenshot, not by reading the numbers.
  The numbers said `data-overflow-end=true`, which was true and useless.

### What we nearly shipped, and what caught it

| Nearly shipped | Caught by |
|---|---|
| A hero swap that traded a 61% desktop crop for a **62% mobile crop** on the LCP image | Doing the cover math for *both* boxes before editing, instead of only the one the brief described |
| **"The brief is wrong about `venue-perancangan`"** — a false accusation, from a parser bug | Cross-checking the cluster census against an independent per-page link count; they disagreed |
| **"`hk-chip` still fails at 1.276:1"** — a false failure report on correct code | Noticing the reported colour was `lab(...)`, not `rgb(...)` |
| A search link landing the reader **under the sticky header** | Verifying by *clicking the link*, not by loading the URL, and asserting `inputTop >= headerBottom` |
| A stray glyph rendering past the chevron | Opening the screenshot instead of trusting the passing assertion |
| Reporting a **broken production homepage hero** that only existed in a local DB | Checking the live URL, which 404'd, and then checking which database I was on |

Five of those six would have shipped green. The assertions passed in every case;
what caught them was a second measurement of the same thing by a different
route, and looking at the picture.
