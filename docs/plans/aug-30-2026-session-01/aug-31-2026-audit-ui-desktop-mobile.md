# UI audit — desktop and mobile, hellokahwin.com

**Status:** COMPLETE — findings feed the re-scoped Sprint 04
**Date:** 31 August 2026
**Run by:** CEO, in-session, against **live production**
**Trigger:** owner, 31 Aug — *"I want you to review the desktop and mobile page.
It looks terrible, fix all of it."*

---

## 0. Method, and the limit of it — read this before the findings

Every finding below is **measured from the live DOM and the live stylesheets**,
not read off a screenshot. That is deliberate: in Sprint 02 planning I brought
five confident visual findings and measurement disproved every one — I called a
lazy-loading image a broken variant, and I counted six pillars where there were
nine because I measured the viewport instead of the DOM.

**That discipline earned its keep three times in this audit.** Findings I formed
and then killed are in §3, because what I withdrew is as useful as what I kept.

### ⚠ THE LIMIT: I could not render a mobile viewport, and I am not going to pretend otherwise

Three attempts, all failed:

| Attempt | Result |
|---|---|
| `resize_window` to 414×896, then 800×700 | Reported success; **`innerWidth` AND `outerWidth` stayed 1920.** The window does not actually resize |
| Same-origin `<iframe>` at 390px | `SecurityError` — the site refuses framing |
| `window.open` at 390×844 | Blocked |

`matchMedia('(max-width:1023px)').matches` returned **false** throughout. **Every
rendered measurement in this document is desktop at 1920px.**

A review that had skipped that check would have "reviewed mobile" at 1920px and
reported it as mobile. **Mobile in §4 is STATIC ANALYSIS of the CSS — real
evidence about what the code does, but not a rendered check.** It needs a human
or an agent with a working browser, and that is item **UI-04**.

---

## 1. The headline finding: the entire homepage article list is broken on desktop

**All 12 cards on the homepage render their headline in a 44-pixel-wide column**,
one word per line, 225–307px tall, with the words clipped by the thumbnail that
sits beside them.

Measured, every `.s-row` on the homepage:

| | Declared columns | Children | Headline column | Headline height |
|---|---|---|---|---|
| All 12 cards | `44px 412px 176px` | **2** | **44px** | 225–307px |

### The root cause — and my first diagnosis was wrong

The 44px column is **not a mistake**. It is for a **rank number**.

I proved this by checking the same component on an article page, where it renders
correctly:

| Page | `.s-row` children | First cell | Result |
|---|---|---|---|
| `/artikel/idea-dan-nasihat/garden-wedding` | **3** | `"01"` — a rank number, 44px × 26px | ✅ **correct** |
| `/` (homepage) | **2** | the *headline*, 44px × 225px | ❌ **broken** |

**Same component, two call sites. The article page passes the number; the homepage
does not.** With the number absent, CSS Grid auto-places the headline wrapper into
the first free cell — the 44px number slot — and the image, which carries an
explicit `grid-column: 3`, stays put. Hence a 44px headline and an empty middle
column.

**I had already "confirmed" a different fix before finding this**, and it is worth
recording because it would have shipped: I set `grid-column: 2` on the headline
wrapper and measured it working — **44px → 412px wide, 225px → 78px tall.** It
does work. But it is a **patch that leaves a permanent empty 44px gutter**, and it
would have quietly discarded a numbered-list design that the article template
still uses. I found that only because I went and checked the component's *other*
call site.

**So the fix is a decision, not a one-liner**, and it belongs to the design team:

- **(a)** the homepage passes the rank number, restoring a numbered "Terkini"
  list — the design the article page still implements; or
- **(b)** the homepage variant declares a two-column grid and drops the number.

**(a) is my recommendation** — it is the design that already exists, and a
numbered latest-articles list is a stronger editorial device than an unnumbered
one. But this is the creative director's call, not mine.

### Blast radius, measured by fetching the HTML of six URLs

| URL | `.s-row` occurrences | State |
|---|---|---|
| `/` | 24 (12 cards) | ❌ all broken |
| `/artikel/ucapan-doa/doa-pengantin-baru` | 2 (1 card) | ✅ renders the number |
| `/artikel/idea-dan-nasihat/garden-wedding` | 2 (1 card) | ✅ verified correct |
| `/dewan-kahwin/` | 2 (1 card) | not individually verified |
| `/artikel/hantaran-mas-kahwin` | 0 | n/a |
| `/artikel` | 0 | n/a |

**It is the homepage that is broken, and it is broken completely.**

### ⚠ Desktop only. The mobile CSS for this component is correct.

```css
.s-row            { grid-template-columns: 80px minmax(0,1fr); gap:14px }   /* base  */
.s-row img        { width:80px; height:80px }
@media (min-width:1024px){
  .s-row          { grid-template-columns: 44px minmax(0,1fr) 176px; gap:28px }
  .s-row img      { order:3; width:176px; height:132px }
}
```

The base rule is **two columns for two children** — correct. The bug is created by
the `min-width: 1024px` block alone.

---

## 2. The other confirmed defects

### 2.1 Two of nine categories are unreachable on a 1920px desktop

The nav measures **1970px wide inside a 1920px viewport**. Measured right edges:

| Category | Right edge |
|---|---|
| Venue, Kos & Perancangan | **1986px** ❌ |
| Sebelum Nikah: Jodoh, Merisik… | **2298px** ❌ |

Both sit past the viewport edge behind a small chevron. **This is not cosmetic:
`Venue, Kos & Perancangan` contains `checklist-kahwin`, which converts at 6.58%
CTR — the third-best rate on the site.** A top-level category that a desktop
visitor cannot see is a navigation failure, not a styling nit.

### 2.2 The hero is a portrait photograph forced into a landscape frame

Measured on the live homepage:

| Property | Value |
|---|---|
| Source | **1200 × 1800** (portrait, aspect 0.67) |
| Rendered | **1905 × 794** (landscape, aspect 2.40) |
| `object-fit` / `object-position` | `cover` / `50% 50%` |
| **Fraction of the image visible** | **≈ 28%** |
| **Upscale** | **1.59×** — a 1200px source stretched to 1905px |
| **Variant served** | **`low.webp`** |

Three compounding problems in the largest element on the site: a 72% centre-crop
of a portrait photo, a 59% upscale that makes it visibly soft, and the **low**
quality variant used for a full-bleed hero. The result is the extreme close-up of
a fruit tray that currently fills the entire first screen, with **no headline over
it** — the title sits below the fold-filling image.

The alt text is *"Tempat beli barang hantaran: lima jenis kedai"* — this is an
**article card image being reused as a full-bleed hero**, which is why its
aspect ratio is wrong for the slot.

### 2.3 Category pages carry zero images

`/artikel/hantaran-mas-kahwin` renders **0 images** — measured, `document
.querySelectorAll('img').length === 0`. It is a clean list of text links with
hairline rules.

Stated honestly: **this is a design judgement, not a bug**, and these pages draw
~16 impressions with zero clicks (decision 86), so nothing here is costing
traffic. But on the most visual vertical there is, a wedding category page with no
photography is a brand decision worth taking deliberately rather than by default.

---

## 3. Findings I formed and then KILLED by measuring

Recorded because the discipline is the point.

| Candidate finding | What measurement showed | Verdict |
|---|---|---|
| *"9 of 13 homepage images are broken"* — 9 reported `naturalWidth: 0` | They are **below the fold and lazy-loading**. Exactly the error I made in Sprint 02, when I watched an image decode and named a bug | **WITHDRAWN** |
| *"The category h1 is off-axis from the body column"* — it looks misaligned | `h1.left === paragraph.left` (both **569px**). The h1 is `text-align:center` in a 654px box, the body is `text-align:start` in 625px. Deliberate, not a defect | **WITHDRAWN** |
| *"12 of 13 images have empty alt — an accessibility defect"* | The empty-alt images are **card thumbnails inside links that carry the headline as accessible text**. Empty alt is **correct** there; a filled alt would double-announce | **WITHDRAWN** |
| *"`order:3` on the image is the bug — grid `order` doesn't move items to columns"* | Computed style showed `order:0`, `grid-column-start:3`. **The image was already in column 3.** My candidate fix changed nothing | **WITHDRAWN — see §1** |
| *"`Terkini` section not found"* — my selector returned zero | The DOM text is `"Terkini"`, uppercased by CSS; my match was **case-sensitive**. The check was wrong, not the page | **CHECK CORRECTED** |

Two of those five would have sent an agent to fix something that was working.

---

## 4. Mobile — static analysis only, NOT a rendered check

I could not render mobile (§0). What the CSS says:

| Check | Result |
|---|---|
| Viewport meta | ✅ `width=device-width, initial-scale=1` |
| Breakpoints declared | `390px`, `768px`, `1024px`, `max-767px` — coherent, mobile-first |
| Fixed widths > 390px in mobile-reachable rules | **1** — `.dsref-dk` at 1200px, and that is the **internal design-system reference page**, not the public site |
| `.s-row` at base width | ✅ two columns, two children — **correct** |

**On this evidence mobile is structurally sound and the severe defect in §1 is
desktop-only.** I am flagging a tension rather than resolving it: **the owner said
desktop *and* mobile look terrible, and I cannot reproduce a mobile problem from
the code.** Three possibilities, and I am not guessing between them:

1. What was seen was the desktop homepage, which is genuinely broken.
2. There is a mobile defect that static CSS analysis cannot see — a rendered
   overflow, a font-loading shift, a tap-target problem, a real-device bug.
3. The complaint is about **art direction** rather than layout — the hero crop,
   the plain category pages — which applies at every width.

**UI-04 resolves this with a real device, and the owner's own screenshots would
settle it in seconds.**

---

## 5. The structural finding: Sprint 03's retro predicted exactly this, and it shipped anyway

DES-08 implemented these templates. Every automated check passed. Sprint 03's
retrospective recorded, in its own words:

> *"NO AUTOMATED CHECK IN THIS COMPANY COMPARES A COMPUTED COLOUR OR A CONTRAST
> RATIO… `structural-diff.py`, the DES-09 checker and its own overflow script all
> compare structure, never a pixel or a CSS value."*

**A 44px-wide headline column is a computed-layout value.** The DOM structure is
valid, the HTML diffs clean, every element is present, and the page renders
without error. **Nothing we own looks at the number 44.**

That retro also caught a near-identical near-miss — a CSS token collision that
would have shipped invisible gold text sitewide with every check green — and it
was caught **by a person looking at one crop at one breakpoint**, which the retro
itself called "not a mechanism".

**This is the same failure, one sprint later, and this time nobody looked.** That
is why **UI-06 is in the sprint and is not optional**: a rendered-layout
regression gate that asserts computed values — no text column narrower than
~120px, no element past the viewport edge, no image upscaled beyond 1.1× — and
fails the build. Prose in a retro did not stop this. A script that fails a build
would have.

---

## 6. What this costs, stated plainly so nobody scores it wrong later

**The homepage earned 4 clicks from 5 impressions in the last 7 days.** Fixing it
will not move the click target, and neither will the hero crop or the category
pages.

This work is a **brand and credibility bet**, exactly as the Sprint 03 redesign
was — and decision 102 recorded that same tension for that sprint so a later
meeting would not score it against traffic. **The same protection applies here.**

What makes it urgent is not traffic. It is that **the front page of the company is
visibly broken in production**, and it has been since DES-08 shipped.
