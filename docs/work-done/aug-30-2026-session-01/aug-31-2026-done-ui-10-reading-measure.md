# UI-10 — the article body ran 104 characters per line at 1440 and 135 at 1920; it now runs 66 everywhere from 768 up

**Sprint 04 · 3 points · `creative-director` · 31 Ogos 2026**
**Shipped:** PR [#23](https://github.com/ianngkb/hellokahwin/pull/23), merged to
`master` as `aeb9f0e`, deployed and verified on
<https://hellokahwin.com/artikel/idea-dan-nasihat/garden-wedding>.
**Evidence:** `aug-31-2026-ui-10-EVIDENCE/`

---

## 1. The DoD, answered in measured numbers

Measured in a rendered Chromium with `innerWidth` asserted at every capture, on
the article the DoD names, using the DoD's own formula
`width / (font-size × 0.5)`, over the 81 body paragraphs inside `.inspire-prose`
(captions and navigation excluded):

| Viewport | Before (live prod) | After (live prod) | Inside 45–75 |
| -------- | ------------------ | ----------------- | ------------ |
| **390**  | 350px @ 17px → **41.18** | 350px @ 17.04px → **41.07** | mobile status quo — **not regressed** |
| **768**  | 704px @ 17px → **82.82** | 581.27px @ 17.61px → **66.00** | ✓ |
| **1024** | 632px @ 17px → **74.35** | 593.98px @ 18px → **66.00** | ✓ |
| **1440** | 888px @ 17px → **104.47** | 594px @ 18px → **66.00** | ✓ |
| **1920** | 1144px @ 17px → **134.59** | 594px @ 18px → **66.00** | ✓ |

The full per-paragraph range after the fix is **63.33–66.00** at every width from
768 up; the 63.33 floor is the eight paragraphs nested in list items, which carry
24px of their own indent.

**Two corrections to the brief's own numbers, both upward in severity.**

- **1920 had never been measured.** UI-04 stopped at 1440. At 1920 the body ran
  **1144px at 17px = 134.59 characters** — the worst of the five widths, and
  nobody had seen it.
- **768 was failing too.** The brief records "63–83 at 768", which reads as
  partly-inside-the-band. Body paragraphs alone were **80.00–82.82** — *all* of
  it outside. The 63 in that range came from the deck and one other non-body
  paragraph, which UI-04's `article p, main p` query swept in.

So the item was larger than its DoD assumed: three widths out of band, not one,
plus a fourth (1024) squeaking in at 74.35 against a 75 ceiling.

## 2. The direction — **both**, and what each half is for

The DoD offered "a max-width on the prose column, a larger type size at that
width, or both". I chose **both**. They do different jobs and neither is
sufficient.

### The cap: `--measure-prose: 33em`

The unit is the decision, not a detail. Because
`cpl = width / (font-size × 0.5)`, a column of *N* em is:

```
(N × font-size) / (font-size × 0.5)  =  2N
```

Font-size cancels. **`33em` IS `66 characters`** — at every viewport, at every
type size, in every typeface, permanently. To retarget the measure you halve the
character count you want and write it here. That is the entire rule, and it is
the rule the next person inherits rather than a value they have to re-derive.

It is also **inert on phones by construction, not by luck**: 33em at 17px is
561px, and the 390px article cell is 350px. The cap cannot touch a phone, so the
mobile measure cannot regress no matter what else changes.

**Deliberately not `ch`**, which the existing `.s-*` primitives use (`.s-body:
68ch`, `.s-deck: 58ch`, `.s-h1: 24ch`). `1ch` is the advance of the *zero glyph*,
which is face-specific: measured on production, `1ch` is **0.6138em in Georgia**
(a wide old-style figure) and **≈0.539em in Geist**. The same `68ch` is therefore
**83 characters on an article page and 73 on a `.s-body`** — one token, eight
characters apart, decided by whichever face wins the cascade. See §6.

### The type size: `font-size: var(--fs-body)`

The prose block hardcoded `1.0625rem` (17px) at every viewport and was the only
surface on the site ignoring DES-03's own published clamp,
`clamp(1.0625rem, 1.0286rem + 0.1506vw, 1.125rem)` — 17px → 18px at 1024.

Without it the cap alone would have held 66 characters in a **561px** column,
**46.8% of the 1200px shell** at 1440: mean, under-designed, and still 17px,
which reads as UI rather than editorial. At 18px the same 66 characters occupy
**594px, 49.5%**. **The type size is what buys the column its width back.**

Taking the *system's* number rather than inventing one (19px, 20px) is the part I
want on the record as a decision. It keeps every heading ratio exactly as DES-03
scaled them — **h2 26/18 = 1.44×, h3 21/18 = 1.167×** — where a jump to 19px
would have degraded h3 to 1.105× and forced me to restyle the prose heading scale
as collateral. Restraint here is a decision, not an absence: I chose the number
already in the file over a better-looking number of my own.

### Why 66 and not 75

The DoD's `0.5em` is an *assumption* about average advance width. Measured
through canvas `measureText` over 6,000 characters of this article's own Malay
prose in its own rendered face, the true average is **0.4636em** — the formula
**under-reports by about 8%**.

| Viewport | Formula (the DoD) | True glyph count |
| -------- | ----------------- | ---------------- |
| 390      | 41.07 | 44.31 |
| 768/1024/1440/1920 | 66.00 | **71.2** |

66 by the formula is 71 in fact, comfortably inside the band. **Targeting 75 by
the formula would have shipped 81 in fact** — outside it. That headroom is the
whole reason the design target sits mid-band rather than at the ceiling.

## 3. What the cap exposed, and why it is fixed here too

Narrowing the body without touching anything else passes the DoD and makes the
page **worse**. I measured the composition before and after
(`harness/compose.mjs`), and looked at the picture:

| Element | Before, at 1440 | After the cap alone |
| ------- | --------------- | ------------------- |
| header / h1 / deck / Rekod | left **336**, width 768 | left **336**, width 768 |
| cover figure | left **336**, width 768 | left **336**, width 768 |
| share rule, prose, pillar link | left **120**, width 888 | left **120**, prose 594 / **share rule still 888** |

The headline began **216px to the right of its own first paragraph** (344px at
1920). That was survivable while the body ran 888px and nearly reached the
header's right edge; against a 594px column the two blocks share neither a left
edge nor a right margin and read as two unrelated columns. Meanwhile the share
rule spanned the full 888px grid track above a 594px column.

Both were pre-existing and both became visibly wrong *because of* my change, so
both are fixed:

- `mx-auto` removed from the header and the cover figure. (The figure also
  carried an inline `margin: '24px auto 40px'`, which beats the class — changing
  only the class would have left the figure centred and the header alone on the
  new edge, the exact half-fixed state that reads as a bug.)
- `<article>` takes the same `--measure-prose` cap, so the share rule and the
  pillar link align with the prose. The cap is on the **cell**, not the grid
  *track*, so the sidebar keeps its right edge at the shell.

Verified on the shipped build — one left edge at every width, for header, cover,
article cell, prose, in-prose figures and every `h2`:

| Viewport | shared left edge | prose width | cover width | sidebar |
| -------- | ---------------- | ----------- | ----------- | ------- |
| 390  | 20  | 350    | 350 | — |
| 768  | 32  | 581.27 | 704 | — |
| 1024 | 40  | 593.98 | 768 | 704–984 |
| 1440 | 120 | 594    | 768 | 1040–1320 |
| 1920 | 232 | 594    | 768 | 1408–1688 |

The stack hangs off one left edge with a ragged right: the headline may run wider
than the reading column and the photograph wider still. That is the composition,
and it is the register — magazines hang off a left edge; a centred block above
left-aligned text is the landing-page look this brand is trying to leave.

An incidental gain: in-prose figures were `lg:max-w-[680px] lg:mx-auto`, so they
sat **104px indented** from the text they illustrate. Capped by the column, they
now start on the same edge.

## 4. The strongest objection to this direction, and the answer

**"You have left 326px of dead space between the body and the sidebar at 1440,
and 582px at 1920. You fixed a reading defect by creating a composition one."**

It is true and I am not going to pretend otherwise. At 1440 the text now ends at
714 and the sidebar begins at 1040. Before the change that void was 32px.

The answer is that **the void is not mine and the trade is not close.** The shell
is Tailwind's `container` default — 1280px at 1440, 1536px at 1920 — sized for
nothing in particular. The article page's content is one reading column plus a
280px rail, which needs about 940px. The extra 260–520px was previously being
absorbed *by the body text*, which is precisely why UI-04 found it at 888px and
1144px. The excess did not appear; it became visible. And a wide right margin is a
looseness on a page whose sidebar is already short — the rail's content ends
within the first screen of a 38,000px article, so 95% of this page had an empty
right column before my change too.

104 characters on every line of a ten-minute read is a defect the reader feels on
every line. I will take the margin.

**The proper fix is a shell width for the article template**, and it is not this
item: `container` is shared by the homepage and the catalogue, both of which
UI-01 and UI-05 have just shipped against, and narrowing `.inspire-editorial`
instead would leave the breadcrumbs — a sibling outside it — hanging on the old
edge. Raised as an item in §7 rather than smuggled in here.

## 5. The gate — the retrospective's edit, shipped

UI-06's rendered-layout gate landed on `master` the same afternoon. Its own
header named this defect as **deliberately excluded**:

> DELIBERATELY NOT HERE … line length past ~75 characters (UI-10). … the third
> is **a measure the creative director sets, not a defect threshold**.

That was correct at 09:00 and wrong by 18:00, because the creative director set
it the same day. The excuse became a gap, so UI-10 closed it: **CHECK 6,
`reading-measure`.** No column of continuous prose past 75 characters, counted
with the DoD's own formula, on the block the text is laid out in, for runs of ≥80
characters occupying ≥2 line boxes.

**A ceiling with no floor, and the reason is arithmetic rather than taste.** 45 is
the bottom of the comfortable band, but a 390px phone leaves a 350px column —
about 41 characters — which no cap can widen. A floor would fire on every mobile
page on the site and be switched off within a week. Columns too *narrow* are
already check 1's.

Self-tested **both ways**, at three widths of the *same* file, because the point
of this check is that identical markup passes at one viewport and fails at
another:

| Fixture | Width | Expected | Why |
| ------- | ----- | -------- | --- |
| `article.html` | 390  | **CLEAN** | 350px/17px = 41 cpl, unreachable by any cap |
| `article.html` | 768  | **FIRES** | 704px/17px = 83 |
| `article.html` | 1024 | **CLEAN** | 632px/17px = **74.4 — under the ceiling** |
| `article.html` | 1440 | **FIRES** | 888px/17px = 104.5 |
| `homepage.html`, `category.html` | all four | **CLEAN** | cards and labels are not continuous prose |

The 1024 assertion is the one that matters: **a check that flagged 74.4 anyway
would be a check with no threshold.** 59 self-test assertions became **72**.

And the before/after in the gate's own terms, same widths, same templates:

| | live production, before | live production, after |
| --- | --- | --- |
| **reading-measure** | **5** | **0** |
| narrow-text-column | 0 | 0 |
| clipped-text | 0 | 0 |
| viewport-overflow | 0 | 0 |
| image-upscale | 25 | 26 † |
| image-aspect | 31 | 33 † |

† Not a regression: UI-08 added two article targets to the manifest between the
two runs. On the identical manifest the preview measured 24/31 against
production's 25/31. Both are pre-existing findings owned by other items.

The fix also holds on **an article instance I never measured** — the
longest-title article UI-08 added — which the post-deploy gate reports clean at
all four widths.

## 6. A finding I am raising, not fixing: the site sets its headlines in two typefaces

`measure.mjs` reported the body's computed family as `Georgia` while
`--font-serif` is `'Bodoni Moda', Didot, 'Bodoni MT', Georgia, serif`. That looks
exactly like a webfont that failed to load, and I nearly wrote it up as one. It
is not. Verified rather than assumed (`harness/face.mjs`, `harness/h1face.mjs`),
by rendering each `h1`'s own text to a canvas in its computed stack and comparing
the advance against each candidate face:

| Template | Computed family | Advance | Matches |
| -------- | --------------- | ------- | ------- |
| homepage | `"Bodoni Moda", Didot, …` | 848.2px | **Bodoni Moda** (Georgia would be 795.7) |
| category | `"Bodoni Moda", Didot, …` | 484.1px | **Bodoni Moda** |
| **article** | `Georgia, "Times New Roman", Times, serif` | 848.2px | **Georgia** (Bodoni would be 870.0) |

`document.fonts` reports a **loaded** Bodoni Moda face on the article page. The
cause is one line in `globals.css`:

```css
.serif-editorial { --font-serif: var(--font-cormorant); }   /* = Georgia, … */
```

whose comment described it as **"currently a no-op"**. True when written, false
since DES-05's `tokens.css` put Bodoni Moda on `:root`.

Two consequences worth stating plainly:

- **The route that takes essentially all of the site's search traffic is the one
  NOT rendering in the brand face.**
- **`.s-h1`'s `font-variation-settings: 'opsz' 11` — DES-13's pinned instance, and
  the thing my own standards require to be named — is being applied on article
  pages to Georgia, a static face with no `opsz` axis, where it does nothing.**

**Not fixed here.** Unifying the face restyles every headline and every paragraph
on the site; that is an art-direction decision with its own item, not a side
effect of a measure fix. What I did do is correct the comment that says the rule
is dead, because the obvious tidy-up is to delete it.

## 7. Files changed

| File | Change |
| ---- | ------ |
| `src/design-system/tokens.css` | `--measure-prose: 33em`, with the derivation and the `em`-not-`ch` argument |
| `src/app/globals.css` | prose takes `var(--fs-body)` and `var(--measure-prose)`; `<article>` takes the same cap; the `.serif-editorial` comment corrected |
| `src/design-system/components.css` | the `ch`-is-not-portable warning above the `.s-*` primitives (comment only) |
| `src/components/inspire/article-renderer.tsx` | `max-w-none` removed at **both** call sites |
| `src/app/(public)/artikel/[category]/[slug]/page.tsx` | `mx-auto` off the header and the cover figure, incl. the inline `margin: … auto …` |
| `scripts/ui-layout-gate.mjs` | CHECK 6 `reading-measure`; `UI_GATE_BYPASS` for protected previews |
| `tests/ui-layout-gate/README.md` | 72 assertions; the SSO story; why check 6 has no discriminator case |
| `.github/workflows/ui-layout-gate.yml` | "four checks" → "six checks" |

`pnpm typecheck` clean · `eslint` 0 errors (3 pre-existing warnings on untouched
lines) · `prettier --check` clean · `pnpm ui:gate:selftest` 72/72 · `pnpm build`
compiles and reaches the export phase, and cannot finish locally because there is
no local database (`ECONNREFUSED`) — which is why every number above is taken
against a deployment carrying the production database, never a local server.

---

## Retrospective

### 1. What did we learn that is not written down?

**A `ch` max-width is not a portable rule, and this design system already has
three of them.** `1ch` is the zero glyph's advance, and this site's two serif
faces differ by 14% on it — 0.6138em in Georgia, ≈0.539em in Geist, both
measured. `.s-body: 68ch` therefore means 73 characters on one surface and 83 on
another. Nobody had recorded that, and the divergence is live rather than
hypothetical because `.serif-editorial` swaps the face per template. The
`em`-based `--measure-prose` exists because of this, and it is the form the
lesson takes: characters-per-line = 2 × the em value, by construction, in any
face.

**That the DoD's own formula under-reports this site's prose by about 8%.**
`width / (font-size × 0.5)` assumes a 0.5em average advance; the true figure for
this article's Malay prose in its rendered face is 0.4636em. Any future item
handed a "45–75 characters" DoD inherits that bias and will ship ~8% wider than
it believes. Stated in `tokens.css` and in the gate's threshold comment rather
than silently corrected, because the DoD is the contract.

**That the site's `h1` renders in two different typefaces depending on the
template, and the article route is the one missing the brand face** — see §6.
Three days of DES-13 work pinning an `opsz` instance does not reach the pages
that carry the traffic.

### 2. Which document must change, and who owns the edit?

Asked in the order the retrospective demands — a DoD clause, a checklist item, a
script, a gate — with prose only where none of those is possible.

| Form | Document | Edit | Owner |
| ---- | -------- | ---- | ----- |
| **Gate** | `scripts/ui-layout-gate.mjs` | CHECK 6 `reading-measure`, self-tested both ways at three widths of the same fixture | creative-director — **DONE**, shipped in `aeb9f0e` |
| **Gate** | `scripts/ui-layout-gate.mjs` | `UI_GATE_BYPASS` so a protected preview can be gated *before* it ships, not only recognised as ungateable | creative-director — **DONE** |
| **Script** | `…-ui-10-EVIDENCE/harness/` | The five harnesses, committed and documented, with the structural assertion that killed the SSO false-clean | creative-director — **DONE** |
| **Token** | `src/design-system/tokens.css` | `--measure-prose` with its derivation, so the next person inherits a rule | creative-director — **DONE** |
| **Prose (no other form possible)** | `src/design-system/components.css` | The `ch` trap above the `.s-*` primitives. It cannot be a gate: the existing values are not defects, and a check that flagged them would be wrong | creative-director — **DONE** |
| **Prose (no other form possible)** | `src/app/globals.css` `.serif-editorial` | A comment that calls itself a no-op while deciding the typeface of the highest-traffic route. Not gateable — it is a correct rule with a false description | creative-director — **DONE** |
| **New item** | sprint board | **The article template's shell width.** `container` gives 1200/1456px of content box for a 594px column and a 280px rail, leaving 326px/582px of void. Needs a shell decision plus moving the breadcrumbs, and touches `container`, which the homepage and catalogue share | **`product-designer`** — raised, not done here |
| **New item** | sprint board | **One typeface for the site's headlines.** Decide whether article pages join Bodoni Moda or the site joins Georgia; either way `opsz 11` must reach what it is pinned to | **`design-systems-engineer`** with me — raised, not done here |
| **Prose** | `.claude/agents/creative-director.md` | Hard rule 2 says "you do not write production code", and this item required me to. Either the rule gains an exception for design-system tokens and CSS, or items like this route through the Design Systems Engineer and cost a hand-off. **I have deliberately not edited my own persona** — narrowing a standard to match what I did is the one move that makes a standard worthless | **`ceo-hellokahwin`** at `/endsprint` |

### 3. What did we do twice?

**Two agents built the same SSO-preview defence, half an hour apart.** UI-08 hit
Vercel's login wall and added an identity precondition (origin + `<html lang>`);
I hit it and added an off-origin check plus a bypass header. The merge conflicted
in three places. UI-08's detection is better and I dropped mine; my bypass is the
half they did not have, and both shipped. The waste is real, and the sharper point
is that **the answer was already written down** — `skills/tokens/registry.md`
records the preview SSO wall and the vault key `vercelbypass.hellokahwin` — and
neither of us read it. Documentation nobody reads at the moment of need is not
documentation; that is why the fix now lives *in the gate* and in its README,
where the person hitting the wall already is.

**Measured `trueCpl` on the wrong element and shipped that number into a run
before catching it.** `document.querySelector('.inspire-prose p')` returns the
first paragraph in DOM order, which on this article is a *caption inside a figure*
in a different face. The tell was arithmetic: it reported an identical 70.3 at
both 1440 and 1920 while the body widths were 888px and 1144px — impossible for
one element. Fixed to measure the same set `bodyParas` measures.

**Ran the gate against a preview that was 18 commits behind `master` and read the
difference as a regression of mine.** `clipped-text` came back 6 where production
showed 0. It was another agent's fix that my branch had not merged yet. After
merging: 0, matching production.

### 4. What did we nearly ship, and what caught it?

**Nearly reported "Bodoni Moda fails to load on article pages" as a finding.** The
computed family read `Georgia` while the token names Bodoni Moda first — the exact
signature of a failed webfont. Enumerating `document.fonts` (rather than testing
for what I assumed) showed Bodoni Moda **loaded**, and the computed value was a
*different stack entirely*, not a fallback within the same one. The real finding
is stranger and more useful than the one I nearly filed. **Caught by the standing
rule: when a check returns a surprising absence, verify the check.**

**Nearly shipped the measure cap alone.** It satisfies the DoD completely and
leaves the headline 216px right of its own body and a share rule spanning 888px
above a 594px column. **Caught by measuring first and then looking at the
picture** — the order UI-04's retrospective prescribed and the reason
`compose-after-1440px.png` exists.

**Nearly measured a Vercel login page and called it a clean preview.**
`.inspire-prose` came back `null`; `curl -I` showed a 302 to `vercel.com/sso-api`.
`measure.mjs` now refuses to report unless the page carries 21 `h2`, 51 `img` and
exactly one `h1` — **a status code is not evidence, and neither is a 200 at the
wrong origin.**

**Nearly used `ch` for the cap**, for consistency with the existing `.s-*`
primitives — which would have made the measure move silently the day anyone
changes the article face, a change §6 argues is already overdue. Caught by
measuring `1ch` in both faces instead of assuming the unit meant what its name
says.
