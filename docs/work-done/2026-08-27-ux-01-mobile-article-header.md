# UX-01 — Mobile article pages delete the site header. Restored.

**Date:** 27 August 2026
**Agent:** Sally (BMad UX Designer)
**Branch:** `ianng89/pillars-ingest-redirects`
**Worktree:** `C:/Users/Ian Ng/orca/workspaces/hellokahwin-site/pillars-ingest-redirects`
**Brief:** `hellokahwin/docs/plans/aug-23-2026-session-01/aug-26-2026-brief-ux-01.md`
**Status:** 3 of 4 DoD checks met in full. The fourth is met on 28 of 30 articles;
the 2 misses are named below and the item **stays open** for them. The DoD has not
been rewritten.

---

## How everything below was measured

The brief warned that the CEO could not resize its browser below 1920px. I hit a
different wall: the Claude-in-Chrome extension is not connected in this
environment (`Browser extension is not connected`), so there was no interactive
browser at all.

I did not claim a screenshot I could not take. Instead I drove a **real Chrome**
(`C:/Program Files/Google/Chrome/Application/chrome.exe`) through `playwright-core`
at a genuine **390 x 844 viewport, DPR 2, isMobile, hasTouch, iOS UA** — the
iPhone 12/13/14 logical viewport. Every number below is `getComputedStyle` or
`getBoundingClientRect` read off that rendered page, and every screenshot is that
page.

`playwright-core` was installed **in the scratchpad, not the repo** — no browser
binary download, and `package.json` / `pnpm-lock.yaml` are untouched. The scripts
are preserved in the EVIDENCE folder so any of this can be re-run.

Unless stated otherwise, AFTER numbers come from the **production build**
(`next build` + `next start -p 3201`), not the dev server, so nothing here is a
dev-mode artefact.

---

## CLAIM 1 — At 390px an article renders the site header with brand and navigation

**Status: MET.**

**BEFORE** — `/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri` at 390x844:

```
"header": { "display": "none", "rect": { "top": 0, "height": 0, "width": 0 } }
"headerNavA": { "count": 3, "items": [
    { "text": "Real Wedding",          "computedHeight": 0 },
    { "text": "Idea dan nasihat",      "computedHeight": 0 },
    { "text": "Hantaran & Mas Kahwin", "computedHeight": 0 } ] }
"footerTop": 12927
```

The header was in the DOM and computed to `display: none`. The nearest escape was
a footer **12,927px** below — worse than the 10,638px the brief quoted.

**AFTER** — same URL, production build:

```
"header": {
  "display": "block", "visibility": "visible", "position": "sticky",
  "rect": { "top": 0, "height": 102, "width": 390 },
  "brandText": "HelloKahwin", "navCount": 1 }
```

Brand reads `HelloKahwin`, one `<nav>` present, header pinned at `top: 0` and
still pinned after scrolling 2,500px (`headerStillPinned: {top: 0, height: 102,
position: "sticky"}`).

**Screenshots:** `01-BEFORE-390-no-header.png`, `02-AFTER-390-header-restored.png`
**Change:** removed `data-hide-mobile-nav` from the article route. The CSS rule and
the attribute survive for the admin draft-preview surface, which is chromeless on
purpose and is not a landing page.

---

## CLAIM 2 — `header nav a` computes min-height >= 44px

**Status: MET.** Measured 32.5px before (the brief said 33px — same thing, read
off the rendered page).

**AFTER**, collapsed rail:

```
{ "text": "Real Wedding",          "minHeight": "44px", "computedHeight": 44 }
{ "text": "Idea dan nasihat",      "minHeight": "44px", "computedHeight": 44 }
{ "text": "Hantaran & Mas Kahwin", "minHeight": "44px", "computedHeight": 44 }
```

**AFTER**, with the mobile accordion open — the harder case, because tapping a
category adds 18 more anchors:

```
"total": 21, "rendered": 12,
"allDeclareMinHeight44": true,
"minRenderedHeight": 44,
"offenders": []
```

Every anchor under `header nav`, rendered or not, declares `min-height: 44px`.
Zero offenders. The nine unrendered ones are the desktop dropdown (`display:none`
at 390px) and they carry the floor too.

**Screenshot:** `04-AFTER-390-nav-accordion.png`

---

## CLAIM 2b — the restored navigation was DEAD ON TOUCH. Found and fixed.

Not in the DoD. Found because restoring the header made me tap it.

**Every parent category in the rail did nothing when tapped.** No navigation, no
menu. All three categories in the live rail have children, so the entire mobile
navigation was inert.

Measured event order on a real touch tap at 390px (`probe.mjs`), before the fix:

```
pointerdown | aria-expanded=false
touchstart  | aria-expanded=false
pointerup   | aria-expanded=false
touchend    | aria-expanded=false
mouseover   | aria-expanded=false
mouseenter  | aria-expanded=false     <-- fires twice (touch compatibility events)
mouseenter  | aria-expanded=false
mousedown   | aria-expanded=false
focus       | aria-expanded=false
click       | aria-expanded=TRUE      <-- already open by the time the tap runs
final aria-expanded: false            <-- the tap handler toggled it shut again
```

`mouseenter` and `focus` opened the menu, then the click handler saw it open and
closed it, while `preventDefault()` suppressed the navigation that would otherwise
have happened. Net effect: nothing.

Fix: `handleEnter` / `handleLeave` now bail out on touch layouts, so hover and
focus stay strictly desktop and the tap toggle owns the touch layout.

**AFTER** (production build, real `touchscreen.tap`):

```
initial:        anchors=3   expanded=["false","false","false"]  accordionMenus=0
after touch tap: anchors=21 expanded=["true", ...]              accordionMenus=2
after 1s settle: anchors=21 expanded=["true", ...]              accordionMenus=2
```

Desktop hover is unaffected — at 1280px, hovering a category still opens the
dropdown: `dropdown rows: {"count":9,"heights":[44]}`.

This is the finding I would most want on the record: **restoring the header would
have shipped a header whose links did not work.** It was invisible only because
the surface that carries the traffic had the header hidden.

---

## CLAIM 3 — The bottom bar offers something other than a photo gallery

**Status: MET.**

**BEFORE:** a full-width `Lihat Semua Foto (4)` button, 69px tall, **zero links**
(`"links": []` — it was a dialog trigger).

**AFTER:**

```
"text": "Baca seterusnyaGubahan Dulang Hantaran 2026 — Susunan, Kos dan Kesilapan Biasa",
"height": 70.14,
"links": [ { "href": "/artikel/hantaran-mas-kahwin/gubahan-dulang-hantaran-2026", "h": 53.14 } ]
```

### The justification the DoD asks for

The old bar was the wrong offer three times over:

1. **It was the same offer twice.** The cover plate already carries a
   `Lihat semua foto (n)` pill about 200px from the top. The bar repeated it in
   the most thumb-reachable position on the screen, so the two most valuable
   slots on a phone said one identical thing.
2. **The gallery is a dead end.** It opens a lightbox over the same article and
   closes back to the same article. It cannot start a second pageview.
3. **Nobody arrives asking it.** A reader lands from a Google result mid-research.

What they *do* need is the thing this whole sprint item is about: an onward
journey. The document is 13,099px tall; the pillar up-link and the related grid
are both buried at the bottom. Until now a phone visit had one destination — this
page.

So the bar now carries **the next article**: thumbnail, `Baca seterusnya` eyebrow,
and the headline, as a real crawlable `<a href>` rather than a dialog trigger,
which also feeds the internal linking the route already cares about elsewhere.

Three deliberate details:

- **It is the same article as the first card in the related grid.** The bar is a
  shortcut to the best next read, not a second opinion about what that is. It
  costs no extra query — `relatedArticles` is already loaded and already
  cluster-scoped, so the bar inherits that relevance for free.
- **It does not steal the fold.** A fixed bar is 64px of viewport permanently
  gone, and the other half of this item is getting prose above the fold. It stays
  translated out of view until the reader is past roughly the first screen.
  Measured at scroll 0: `barTop: 844, intersectsViewport: false,
  ariaHidden: "true"`. After scrolling: `top: 773.86, visibleInViewport: true,
  ariaHidden: "false"`.
- **Reading progress hairline.** In a 13,000px document "how much is left" is
  otherwise unanswerable on a phone. At scroll 2500 of 12255 scrollable it reads
  `matrix(0.203998, 0, 0, 1, 0, 0)` — 20.4%, correct.

**The gallery is not lost.** It is demoted to a secondary 44x44 button beside the
link (`galleryButton: {label: "Lihat semua foto (4)", w: 44, h: 44}`) and stays
primary on the cover, where the offer is in context.

**Fallback, and it fires in the wild.** On an article with no siblings, the bar
degrades to the gallery-only variant. That is real: `hiasan-dekorasi/goodies-kahwin`
has zero related articles (no `related-articles-heading` block, zero same-category
links) so it renders the gallery variant at 61px. Worth noting that this is a
content gap — an orphan article — showing through the UI, not a UI bug.

**Screenshot:** `03-AFTER-390-read-next-bar.png`

---

## CLAIM 4 — Mobile cover no taller than aspect-[3/2], first paragraph above the fold

**Status: PARTIALLY MET — 28 of 30 articles. The 2 misses are named. This half of
the item stays open.**

### The plate: MET on all 30

```
"cover": { "aspectRatioCss": "3 / 2", "width": 390, "height": 260, "ratioWbyH": 1.5 }
```

Was `aspect-[4/5]` — 487px tall at 390px wide, a portrait plate on a portrait
screen. Now 260px. **227px handed back to the words.** The 30-article sweep shows
`ratio 1.5` on every single one.

### The fold: MET on 28 of 30

First paragraph top, against an 844px fold:

- **BEFORE:** 793px — 50.75px above the fold. Above it by the letter, invisible in practice.
- **AFTER, typical:** 636-729px. On the reference article, **667.75px, 176.25px above the fold.**

**The 2 that miss:**

| Article | First paragraph top |
|---|---|
| `glamor-eksklusif/amankila-bali` | 931px |
| `moden-kontemporari/jw-marriott-kuala-lumpur` | 930px |

**Cause — identical on both, and it is not layout.** The article *body* starts at
`top=668` on both, exactly as it does on the 28 that pass. What sits at 668 on
these two is an editor-placed inline image, 239px tall, before any prose:

```
div.inspire-prose  top=668  h=16977 :: Kisah cinta Leeana dan Tim bermula denga
  div.group.relative top=668 h=239 ::           <-- leading body image
    img.h-auto.w-full top=668 h=239 ::
  div top=931 h=462 :: Kisah cinta Leeana dan Tim bermula denga
```

The layout hands the body the fold at y=668 on **every one of the 30 articles**,
176px above the fold. These two spend that 176px on a second photograph.

**Why I did not fix it.** The fix is either editorial (do not open a body with an
image when the page already has a cover) or a rule in the body renderer that
suppresses a leading image on mobile. The body renderer is `article-renderer` /
`pillar-body.tsx` — and the brief explicitly assigns `pillar-body.tsx` to UX-03,
which may be running concurrently. Per the brief I am saying so rather than
racing. **This is the open half of UX-01.**

**Screenshots:** `02-AFTER-390-header-restored.png` (pass),
`06-AFTER-390-fold-miss-amankila.png` (miss)

---

## The cover crop had to change with the plate, and it has a cost

The plate went from 4:5 to 3:2, which makes `crop-4x5-mobile-cover` the wrong
source: it is a PORTRAIT crop an editor framed to be 487px tall, and a 3:2 window
keeps only the middle ~53% of that framing. The composition they chose is the
part that gets thrown away.

Measured inventory (`crop-weights-and-dimensions.txt`) — the plate renders
390x260 CSS px = **780x520 device px at DPR2**:

```
crop-16x9-og              564x296    ratio=1.905     59848 bytes
crop-4.3x1-desktop-hero   564x160    ratio=3.525     33336 bytes
crop-4x3-article-card     564x423    ratio=1.333     90910 bytes
crop-4x5-mobile-cover     338x423    ratio=0.799     60150 bytes
```

Preference is now `4x3 -> 16x9 -> 4x5 -> original`, via one shared helper
(`getMobileCoverUrl`). The sweep shows it resolving to `crop-4x3-article-card` on
29 of 30 articles and falling through to the original on the one with no smart
crops.

**The honest trade-off, stated rather than buried:**

- 4:3 loses 11% vertically in the 3:2 window; 16:9 would lose 21% horizontally.
- 4:3 uses its full 564px of width against a 780px plate — a 1.38x upscale.
  The old 4:5 crop was **338px wide**, a **2.31x upscale**. The hero was blurry
  before, on the highest-traffic surface on the site.
- **Cost: 90,910 bytes vs 60,150 — +31KB, +51%, on the LCP image**, for an
  audience the brief describes as mostly low-end Android.

I judged sharpness worth 31KB given the previous image was a 2.3x upscale, but
**the real fix is neither**: a purpose-built 3:2 crop at >=780px would be both
sharper and lighter than 90KB. Flagged below.

**A drift trap I closed on the way.** The route emits an LCP `ReactDOM.preload`
hint for the mobile cover. Changing the crop in the component alone would have
left the preload fetching a *different* URL — a duplicate high-priority download
and a silently voided LCP hint, with no visual symptom. Both callers now resolve
through the same helper. Verified from the rendered page:

```
rendered <img> currentSrc crop : crop-4x3-article-card.webp
mobile preload crop            : crop-4x3-article-card.webp
MATCH: true
```

---

## The back arrow is gone, deliberately

With the masthead restored, the cover's overlay back arrow was the weaker of two
navigation affordances sitting 60px apart: the category rail offers every
category, the arrow offered one — and the brief notes its destination on
venue-perancangan is an `akan datang tidak lama lagi` empty state. The share
button stays; on this audience a share is the highest-value action on the plate.

---

## Files changed

| File | Change |
|---|---|
| `src/app/(public)/artikel/[category]/[slug]/page.tsx` | Removed `data-hide-mobile-nav` (with a guard comment). Swapped `MobilePhotoBar` -> `MobileArticleBar`. Built `nextArticle` from the already-loaded `relatedArticles[0]`. Preload hint routed through `getMobileCoverUrl`. |
| `src/components/inspire/article-cover-mobile.tsx` | `aspect-[4/5]` -> `aspect-[3/2]`; `data-mobile-cover` hook; back arrow removed; gallery pill to `bottom-3` and 44px; crop via `getMobileCoverUrl`. |
| `src/components/inspire/inspire-nav-menu.tsx` | `min-h-11` on every anchor; `isTouchLayout()` guard in `handleEnter`/`handleLeave` that fixes the dead touch nav. |
| `src/components/inspire/mobile-article-bar.tsx` | **New.** The read-next bottom bar. |
| `src/lib/storage/smart-crop-url.ts` | **New** `getMobileCoverUrl` — one definition shared by the `<img>` and the preload hint. |
| `src/app/globals.css` | Comment on the mobile-nav block recording that article pages must never opt in. |

**`mobile-photo-bar.tsx` was deliberately left in place and unchanged.**
`article-preview-view.tsx` imports it, and that file is not in my owned set. A new
component was added rather than mutating a shared one, so nothing raced.

### Ownership boundary — respected

Owned and edited: the article route, the `globals.css` mobile-nav block,
`article-cover-mobile.tsx`, `inspire-nav-menu.tsx`.
Owned but intentionally untouched: `mobile-photo-bar.tsx`.
**Not touched:** `page.tsx` (homepage), `navbar.tsx`, `pillar-body.tsx` — UX-03's.

One file outside the listed set was edited: `src/lib/storage/smart-crop-url.ts`,
an additive-only new export. It was the only way to stop the `<img>` and the LCP
preload drifting apart. No existing behaviour changed. Saying so rather than
racing, per the brief.

---

## Gates

```
pnpm typecheck   -> clean, no output
npx eslint .     -> 0 errors, 187 warnings (all pre-existing; none in changed files)
prettier --check -> all 6 changed files: "All matched files use Prettier code style!"
pnpm build       -> Compiled successfully in 25.3s; 27/27 static pages generated
pnpm test        -> Test Files 25 passed (25) | Tests 272 passed (272)
```

The repo-wide `pnpm lint` fails on 77 pre-existing Prettier violations, almost all
in `docs/work-done/` written by other agents. None are mine. I did not reformat
them — a 77-file sweep would collide with sessions sharing this tree.

The single build warning (`pdf-compress.ts` / `Can't resolve <dynamic>`) is
pre-existing and unrelated.

---

## What I could NOT verify, and what would verify it

- **The admin draft-preview surface** (`article-preview-view.tsx`) renders
  `ArticleCoverMobile`, so it inherits the 3:2 plate and the removed back arrow.
  It is auth-gated and I did not render it. Per the brief's rule, a status code on
  an auth-gated app proves nothing, so I am not claiming one. What I verified:
  the component's exported name and prop interface are unchanged (`categorySlug`
  is still accepted, just no longer read), the project typechecks, and the
  production build succeeds. **What would verify it:** an authenticated load of a
  draft preview at 390px, confirming the cover renders 3:2 with no back arrow.
- **Production traffic behaviour.** Nothing here is deployed. All measurements are
  against a local production build.
- **The 34-of-43-clicks figure** from the tracker. GSC for
  `https://hellokahwin.com/` over the trailing 28 days returns 2 clicks total, so
  I could not reproduce that number and am not restating it as measured. What I
  did confirm is the shape the item rests on: article-page impressions are
  overwhelmingly `MOBILE` (e.g. `mas-kahwin-perak` 31 mobile / 2 desktop;
  `mas-kahwin-kelantan-terengganu` 18 / 2; `mas-kahwin-ikut-negeri` 15 / 6).

---

## Handover — open items with named owners

1. **The 2 fold misses.** `amankila-bali`, `jw-marriott-kuala-lumpur`. Cause:
   body opens with a 239px inline image. Owner: whoever holds `pillar-body.tsx` /
   `article-renderer` (UX-03), or Content for an editorial rule. **UX-01 stays
   open on this.**
2. **No true 3:2 cover crop exists.** Add one at >=780px wide to the crop
   pipeline and put it at the head of `getMobileCoverUrl`; both callers pick it
   up together. It would be sharper *and* lighter than today's 90KB 4:3.
   Owner: whoever owns CONT-09's cover standard + the smart-crop generator.
3. **Phones download the desktop hero they never see.** At 390px Chrome fetches
   `crop-4.3x1-desktop-hero.webp` (33,336 bytes) because the desktop hero `<img>`
   sits inside `hidden lg:block` with `priority`, and `display:none` does not stop
   an eager fetch. Both `ReactDOM.preload` hints are correctly media-gated — this
   is the Image component's own preload. **Pre-existing, untouched by UX-01.**
   Owner: article route performance.
4. **The nav accordion overflows horizontally.** Now that tapping a category
   actually opens it, its pill row sits inside the rail's `overflow-x-auto`
   wrapper and extends past the viewport (reachable by the same swipe, but
   awkward). The wrapper is in `navbar.tsx` — **UX-03's file**, so I did not
   touch it. Newly *visible*, not newly broken.

---

## Undo

`docs/work-done/2026-08-27-ux-01-mobile-article-header-UNDO.md`. Code-only change;
no database writes, no deploys, no cache purges. Fully reversible with `git`.

---

## Retrospective

### What did we learn that is not written down

**Hiding a surface hides its bugs, and the bill comes due all at once.** The
mobile navigation had been completely dead to touch — every parent category, no
navigation, no menu — and nobody knew, because the one route that receives
essentially all of the site's search traffic had the header set to `display: none`
below 767px. Removing one attribute did not just restore the header; it exposed a
second defect that had been sitting behind it. **When you un-hide a surface, budget
for auditing it, not just for rendering it.** I found this only because I tapped
the thing I had just restored instead of screenshotting it and calling it done.

**A DoD written in computed values is worth more than one written in adjectives.**
"`header nav a` computes min-height >= 44px" cannot be argued with, cannot be
satisfied by a screenshot that looks about right, and told me immediately that
32.5px was the real number. Every check in this brief was falsifiable, which is
why the two failures were findable at all. More briefs should be written this way.

**"Above the fold" is not a layout property, it is a layout property plus a
content shape.** The layout is uniform: the body starts at y=668 on all 30
articles. Two of them still fail the DoD because an editor put a photograph in
that space. A layout fix cannot close a content-shaped gap, and pretending
otherwise is how a DoD quietly becomes a lie.

**Two callers resolving the "same" URL independently is a silent-failure
generator.** The `<img>` and the LCP preload hint would have drifted the moment I
changed the crop in one place — costing a duplicate high-priority download and
voiding the preload, with *no visual symptom at all*. There was nothing to see and
no test to fail. Any pair of call sites that must agree on a derived value should
share one function, and the reason belongs in a comment at that function.

**The environment will not be the one the brief assumed, and the answer is a
different instrument, not a weaker claim.** The brief expected a browser-resize
problem. I got no browser at all. Driving real Chrome headless at a true 390x844
DPR2 touch viewport produced *better* evidence than an interactive session would
have — repeatable, scriptable, and it made the 30-article sweep possible, which is
the only reason the two fold misses were found rather than assumed away.

### Which document must change, and who owns the edit

**`src/app/globals.css`** — the `data-hide-mobile-nav` block. **Owner: me, Sally.
Done in this change.** The rule now carries the reason it exists, the explicit
prohibition on opting a public `/artikel/` page in, and the consequence if you do.
This was the single highest-traffic defect in the sprint and it was one attribute;
the guard belongs where the attribute is read.

**`src/components/inspire/inspire-nav-menu.tsx`** — **Owner: me, Sally. Done in
this change.** Two comments that did not exist: why every anchor carries
`min-h-11`, and the measured touch event order that makes the `isTouchLayout()`
bail-out load-bearing rather than defensive. Without the second one, the next
person to "simplify" those two guards will silently kill the mobile navigation
again, and it will be just as invisible as it was the first time.

**`src/lib/storage/smart-crop-url.ts`** — **Owner: me, Sally. Done in this
change.** `getMobileCoverUrl` exists to stop two callers drifting, and the docblock
says so, names both callers, and states what breaks if you split them.

**The cover standard (CONT-09).** **Owner: Content / whoever owns CONT-09.** Two
edits it needs and I cannot make: (1) the mobile cover plate is 3:2 now, not 4:5,
so the standard's guidance on framing mobile covers is out of date the moment this
ships; (2) it should require a purpose-built 3:2 crop at >=780px, because every
existing crop is <=564px wide against a 780px device-pixel plate — **every mobile
cover on this site is upscaled, and was upscaled 2.3x before today.**

### What did we do twice

**I fixed the dead-tap bug at the wrong altitude first.** I guarded `onFocus`/
`onBlur` at the two call sites, re-measured, and it was still dead — because
`mouseenter` (twice, from touch compatibility events) was doing the same thing
from a third place. I had guessed at a cause from a partial probe that only
watched focus-family events. The second pass guarded `handleEnter`/`handleLeave`
at their source and caught every path at once. **Lesson: when several event paths
mutate one piece of state, guard the state mutator, not the callers** — and probe
the full event set before writing the fix, not the subset you already suspect.

**I wrote the crop preference twice** — inline in the component, then extracted to
a shared helper about ninety seconds later when I remembered the route's preload
hint. That one was cheap because I caught it immediately, but the trigger is worth
naming: *the moment a derived value is computed in a component, ask who else
computes it.*

Three small rig bugs also cost a round-trip each (a heredoc eating Windows
backslashes, `closest()` on an unescaped Tailwind `lg:hidden` selector, an extra
`page.evaluate` argument). Cheap, but the rig should have been smoke-tested on one
URL before being pointed at thirty.

### What did we nearly ship, and what caught it

**A header whose navigation did not work.** This is the big one. Three of the four
DoD checks would have passed — header renders, brand present, `navCount: 1`, all
anchors 44px — and every parent category would still have been a dead tap. The
screenshot looks perfect. The computed values look perfect. **What caught it was
tapping it**, in the one test the DoD did not ask for. A DoD that says "renders
navigation" and a page that renders navigation which does nothing is exactly the
gap between a measurement and a user.

**A silently voided LCP preload plus a duplicate 90KB download** on the site's
highest-traffic surface, for phone users, with no visual symptom. Caught by asking
"who else builds this URL?" before finishing the crop change — and then proved,
not assumed, by reading `currentSrc` off the rendered page against the emitted
preload href.

**A blurrier-or-heavier hero, chosen without knowing which.** I nearly took the
4:3 crop purely on aspect ratio. Measuring the files first showed the real
trade-off — the old crop was 338px wide against a 780px plate (2.3x upscale), and
the new one costs +31KB — which turned a silent regression into a stated,
reviewable decision plus a named follow-up.

**Rewriting the fourth DoD check to fit 28 of 30.** The temptation was real: the
plate is 3:2 everywhere, the body clears the fold everywhere, and the two misses
are "not really a layout problem". The brief is explicit that this is the one
thing that makes velocity a lie. The 30-article sweep is what made the honest
answer available at all — without it I would have measured one article, seen
667.75px, and reported the check MET.
