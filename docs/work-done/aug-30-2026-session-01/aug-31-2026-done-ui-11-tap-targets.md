# UI-11 — Every standalone tap target on the site now measures at least 24 × 24, the four named in the DoD were four of nine, and the space to do it was already there — 31 Ogos 2026

**Session:** aug-30-2026-session-01 · **Owner:** design-systems-engineer · **Status:** completed
**Plan:** [aug-31-2026-brief-ui-11.md](../../plans/aug-30-2026-session-01/aug-31-2026-brief-ui-11.md)
**Audit this follows:** [aug-31-2026-done-ui-04-rendered-audit.md](aug-31-2026-done-ui-04-rendered-audit.md) §8

**Shipped:** PR [#26](https://github.com/ianngkb/hellokahwin/pull/26) (merged
`179a390`) and PR [#27](https://github.com/ianngkb/hellokahwin/pull/27) (merged
`5deb20a`). Both deployed to production and verified there.

---

## The definition of done, and the number

> *Every target that is NOT an inline link inside a sentence measures at least
> 24×24 CSS px in a rendered 390px viewport on homepage, article, category,
> /artikel and /dewan-kahwin.*

**Met, on live production, measured after the deploy:**

| Surface | Targets at 390 | In-sentence (exempt) | Under 24px BEFORE | Under 24px AFTER |
|---|---|---|---|---|
| `/` | 29 | 0 | **4** | **0** |
| `/artikel/idea-dan-nasihat/garden-wedding` | 72 | 3 | **28** | **0** |
| `/artikel/hantaran-mas-kahwin` | 54 | 0 | **5** | **0** |
| `/artikel` | 93 | 0 | **14** | **0** |
| `/dewan-kahwin` | 48 | 2 | **18** | **0** |
| **Total** | **296** | **5** | **69** | **0** |

`pnpm audit:taps` over those five URLs at 390 **exits 0**. The same rig exits 1
on `/dewan-kahwin @1440` and on `--min 44`, so the zero is a measurement and not
a rig that cannot fail. Record:
`aug-31-2026-ui-11-EVIDENCE/measurements/shipped-production-390.txt`.

The five in-sentence exemptions are the ones the DoD names as out of scope —
`pelamin`, `kadar sewaan` and their kin — and they are **still exempt and still
untouched**, which is the other half of the requirement.

---

## 1. The DoD's counts came from a `.slice(0, 25)`

The brief says *"article 25 targets under 24px tall; dewan-kahwin 24"*. UI-04's
harness ends its tap-target block with `.slice(0, 25)`.

**25 was the slice, not the count.** Uncapped, the article carries **28** at
390. Two of the five per-surface numbers in the DoD were the cap reporting
itself.

The other three (`homepage 4`, `category 5`, `artikel-index 14`) reproduced
exactly, which is what made the two that did not worth chasing rather than
shrugging at.

`scripts/audit-tap-targets.mjs` has no cap anywhere, and says so at the top.

## 2. The four named targets were four of nine families

The brief was explicit that *"the four are illustrations, not the list"*. They
were nine, and **four of the five extra families are on templates the four
illustrations never touch**:

| Family | Measured | Where | In the DoD's list? |
|---|---|---|---|
| Breadcrumb links | 40 × 20, 39.7 × 20 | article, category, dewan-kahwin | ✅ |
| Footer links | 99.4 × 15.4, 103.7 × 15.4 | every template | ✅ |
| In-article contents entries | 66.2 × 17 (21 of them) | article, dewan-kahwin | ✅ |
| Card category labels | 181.2 × 15 | /artikel | ✅ |
| Hero credit | 236.9 × 15.6 | homepage | ✅ |
| **Footer wordmark** | **182.8 × 21** | **every template** | ❌ |
| **Sidebar category link** | **35.6 × 17** | article, dewan-kahwin | ❌ |
| **Pillar-up link** | **185.8 × 21** | article, dewan-kahwin | ❌ |
| **Figure-caption credits** | **443–647 × 20** | article, at 768 | ❌ |

The footer wordmark is the one that matters most: it is on **every page of the
site**, it is a link, and no amount of care applied to the four named examples
would have reached it. It was found by enumerating every element matching a
target selector and reading its box — the repo's standing "enumerate, don't look
up" rule, which has now paid out in three separate items this sprint.

A tenth was found beyond the DoD's viewport and fixed anyway: the **card title
link**, 466 × 22 and 533 × 22 whenever a short title fits on one line at ≥1024.

---

## 3. The finding: the space was already there

This is the part worth keeping.

The in-article contents list holds **21 entries that each went from 17px to
24px**. The block grew by **1.77px in total.**

| Region | Before | After | Δ |
|---|---|---|---|
| Footer | 321px | 330px | +9 |
| Breadcrumbs | 64px | 68px | +4 |
| **In-article contents** | **845.14px** | **846.91px** | **+1.77** |
| Hero credit | 16px | 24px | +8 |

Measured on production, before and after the deploy, same URLs.

Why: every `<li>` in that list was **already 28.97px tall** — `line-height`
inherited from `.inspire-prose` — while the anchor inside it reported 17px,
because a `display: inline` element's box comes from **font metrics at 13px**,
not from the line box it occupies. The row was always a comfortable target. The
anchor simply never claimed it.

**Generalised: an under-24px target is usually sitting in a row that is already
over 24px.** Giving the anchor a real box is normally free. The instinct to
argue "we cannot afford 24px targets, it will wreck the rhythm" is worth
checking against a measurement before it wins an argument — here it would have
been wrong four times out of four.

---

## 4. What was built

### Tokens, because two 44s were literals

`--tap-min: 24px` (WCAG 2.5.8 AA) and `--tap-comfortable: 44px` (2.5.5 AAA and
spec §10.2) are new in `tokens.css`, with the rule for choosing between them
written beside them: a control the reader is *meant* to hit gets 44; a secondary
standalone link in running chrome gets 24. Forcing 44 on a footer row of 11px
small-caps would triple the height of the colophon to fix a hit area that 24
already fixes.

`components.css` carried `min-height: 44px` as a **literal, twice**
(`.s-chip`, `.s-btn`). The number was right; the fact that it was a literal is
why nothing else in the system inherited it. Both now read the token.

### Two utilities, and why not one

- **`.hk-tap`** — `inline-flex`, `align-items: center`, `min-height`. The
  default. Shrink-to-fit, so it still wraps in its column exactly where the
  inline anchor did.
- **`.hk-tap-flow`** — `inline-block` + `min-height`. For a label whose trailing
  icon must stay after the last word.

The second exists because of a measurement, not a preference. Applied to the
figure-caption credits, `inline-flex` made the trailing ↗ a **second flex item**:
on a wrapped three-line credit at 390 it jumped from **x = 115** (after the last
word) to **x = 317**, hard right and vertically centred against the whole block.
`inline-block` gives the anchor a box without taking its contents out of inline
flow; the icon positions after the change are byte-identical to production
before it (115.23, 158.66, 310.73, 48.47).

**Neither padding nor an `::after` hit-area extender would have worked.** The box
that gets measured is `getBoundingClientRect()` on the anchor. Vertical padding
on a `display: inline` box moves the painted background and not the measured
height; an absolutely-positioned `::after` enlarges the hit area and not the box
either. Both would have left a 15.4px anchor reporting 15.4px.

A third, `.hk-tap-line`, was built, shipped into the merge, and then **deleted**
— see §6.

### The rig

`scripts/audit-tap-targets.mjs` — `pnpm audit:taps <url>`. Enumerates every
target with no cap, decides the WCAG inline exception from rendered geometry,
exits 1 on failure and 2 when it could not reach the site.

**Its inline test was wrong twice before it was right**, and both wrong versions
are recorded at the top of the file next to what they falsely exempted:

- **v1** — *"is there other text in my block?"* The footer's two links share one
  `<nav class="flex">` whose `textContent` is `"Laman UtamaSemua Artikel"`.
  Other text: yes. **Both exempted** — the canonical standalone case, waved
  through. Fix: ignore text belonging to another target.
- **v2** — *"…and is it inline-level?"*, via `display.startsWith('inline')`.
  **Exempted the homepage credit** (`inline-block`) **and the footer wordmark**
  (`inline`, alone on its line, inside a `<div>` that also holds a tagline two
  lines away). An `inline-block` is an atomic inline with its own box and is
  constrained by nobody's line-height, which is the entire premise of the
  exception; and "somewhere in the same block" is not "in a sentence".
- **v3, shipped** — strictly `display: inline` **and** some non-target text
  rendered on the **same line**, decided by overlapping the target's box against
  each text node's `Range` rects. Geometry, not DOM shape.

Had v2 shipped, this item would have reported **2 failures on the homepage
instead of 4** and called itself done. The DoD's own `homepage 4` is what
exposed it.

---

## 5. Not fixed, and said so

**The `Artikel Lain:` bullet lists inside imported article HTML.**
`ul > li > p > a`, **20px tall**, 13 of them across the article and
`/dewan-kahwin`, at **768, 1024 and 1440**. They wrap at 390 and pass there,
which is the viewport the DoD names.

They are **editorial body content**, imported from WordPress, and a CSS rule
narrow enough to catch them cannot be written: `.inspire-prose li > p > a` also
matches an in-sentence link inside a bullet, and `:only-child` tests element
siblings, not text nodes. The rule that fixes 13 links would change the line
rhythm of every bulleted paragraph in the corpus to buy 4px on desktop.

The durable fix is that those lists are a **related-links component wearing body
copy**, and rendering them as one is a renderer/ingest item, not a CSS patch.
Raised as a follow-up rather than guessed at.

**A pre-existing defect found while working, not introduced here:** the homepage
hero nests an `<a>` (the cover credit) inside the `<Link>` that wraps the whole
hero. That is invalid HTML and it produces a hydration failure on production
today — React error #418, visible in the console on `/`. Confirmed present on
the base commit `61a505f` (the `<Link>` opens at line 290 and closes at 405; the
credit `<a>` is at 397). Out of this item's scope — the fix changes what the
hero's click target is, which is a creative-director call.

---

## 6. What the merge changed, and the variant that got deleted

`master` moved four items while this was in flight. UI-07 landed the finding
that the card's category label **must wrap and never truncate** — `truncate` hid
10px of `Hantaran & Mas Kahwin` in the 171px column, and the two longest live
labels lose 81px at 1024.

UI-11 had put the floor on that same label with **`.hk-tap-line`**, a block with
a 24px line box, built specifically so `text-overflow: ellipsis` kept working —
`text-overflow` needs a block container and a flex container is not one.

With truncation gone, that variant had **no consumer**. It was deleted from
`globals.css` and from the reference page in the merge commit rather than left
standing. A design system that keeps a variant nothing uses is the drift it
exists to prevent, and the next component to find it would have used it.

The label takes plain `.hk-tap`. UI-08's breadcrumb change and this one are in
the same component and merged cleanly — they touch different elements of it.

---

## 7. The reference page was asserting something that was never true

`/admin/design-system` §06 contained the row:

> `Breadcrumb link` — `20px text, 44px hit slop` — *"Text stays 14px; the hit
> area is padded, not the type grown"*

**There was no hit slop.** The shipped breadcrumb measured **40 × 20**, and the
page had been claiming otherwise for as long as it existed. Nobody lied; a
number typed into a table simply cannot be wrong out loud.

That row is gone. In its place, four live specimens measured at render time by a
new **`TargetProbe`** client component, which reads `getBoundingClientRect()` off
the real element and prints the box and a pass/fail against the floor — **including
one deliberately untreated link that is expected to fail**, kept so the
difference is visible rather than described. The table's height column now reads
`var(--tap-min)` / `var(--tap-comfortable)` rather than a transcribed number.

**Honest limitation:** `/admin/design-system` is behind `requireAdminSection`
and returns 307 → `/login` to an unauthenticated client, so this page was
verified by typecheck, by the production build including it, and by the same
utility classes being measured on the public pages — **not** by a rendered
screenshot of the reference page itself. Stated rather than implied.

---

## 8. Ship state

**Commits:** `893f915` (the fix), `b060c84` (merge of `origin/master`),
`f62f109` (the preview guard).
**On `origin/master`:** yes — `179a390` and `5deb20a`.
**Deployed:** yes, both, production, verified after each.
**Gate:** `pnpm audit:taps <five urls> --widths 390` exits 0 on production.
**Checks:** `pnpm typecheck` clean · `pnpm test` 453 passed · `pnpm lint` 0
errors (146 pre-existing warnings) · `pnpm ui:gate:selftest` (UI-06's blocking
gate) 59 passed, 0 failed · `pnpm build` succeeds.

Three prettier warnings remain on `brand.css`, `brand/page.tsx` and
`brand-assets.ts` — all three are **unmodified in this tree** (`git diff` is
empty for them), so they are pre-existing on `61a505f` and were left alone.

**Not staged, not committed:** the six untracked `.claude/agents/*.md` files
that were in the worktree at session start. They are not this item's.

## Evidence

`docs/work-done/aug-30-2026-session-01/aug-31-2026-ui-11-EVIDENCE/`

- `README.md` — how to re-run it, including the preview-bypass invocation
- `measurements/before-production-390-1440.txt` — the full enumeration before
- `measurements/after-production-390-768-1024-1440.txt` — after, four widths
- `measurements/shipped-production-390.txt` — the gate run, exit 0
- `screens/<region>-before-390px.png` / `-after-390px.png` — footer,
  breadcrumbs, contents, hero credit, cards; same URLs, either side of the deploy

---

## Retrospective

### 1. What did we learn that is not written down?

**That the vertical space for a 24px target is usually already allocated, and
only the anchor is failing to claim it.** 21 contents entries went 17 → 24 and
cost 1.77px, because each `<li>` was already 28.97px. Nothing in this company's
documents says that, and the absence of it is what makes "we can't afford bigger
targets on a dense page" sound reasonable. It is checkable in one line, and it
was wrong on all four regions here.

**And that `getBoundingClientRect()` on a `display: inline` element does not
measure the space it occupies.** It measures font metrics. Every one of the
nine families was a link that *looked* correctly spaced on screen and reported a
15–21px box. That single fact is why the defect existed at all and why the fix
is `display`, not padding.

### 2. Which document must change, and who owns the edit?

| Document | Edit | Owner |
|---|---|---|
| `src/design-system/tokens.css` | `--tap-min` / `--tap-comfortable` with the rule for choosing — **the strongest form available is a token, not a sentence** | design-systems-engineer — **DONE** |
| `src/design-system/components.css` | Two `min-height: 44px` literals now read the token | design-systems-engineer — **DONE** |
| `src/app/(admin)/admin/design-system/page.tsx` §06 | The false "44px hit slop" row replaced with specimens measured at render time, one of them deliberately failing | design-systems-engineer — **DONE** |
| `scripts/audit-tap-targets.mjs` | The rig, and the gate. **The lesson's form is a script with an exit code** | design-systems-engineer — **DONE** |
| `scripts/audit-tap-targets.mjs` header | The two wrong inline tests, recorded next to what each falsely exempted, at the line that would repeat the mistake | design-systems-engineer — **DONE** |
| `docs/work-done/README.md` | This entry in the index | design-systems-engineer — **DONE** |
| Article renderer / ingest | `Artikel Lain:` lists rendered as a related-links component instead of body `ul` | **NOT DONE — raised as a follow-up.** Needs a content decision, not a CSS rule |
| Homepage hero | The nested `<a>` inside `<Link>` (hydration error #418 on production today) | **NOT DONE — raised.** `creative-director`; it changes what the hero's click target is |

### 3. What did we do twice that we should never repeat?

**Walked into Vercel's SSO wall and got a confident green off its login page —
and this was the THIRD time in one day.** UI-09 found an `<input>` that was
Vercel's login field. UI-08 found a page with nothing wrong with it, and
**wrote the lesson into its work-done entry, naming the vault key
`vercelbypass.hellokahwin`.** UI-11 then hit the identical wall — five 200s,
five clean sweeps, zero failures, none of them this site — and did not find that
note until afterwards.

That is the sprint's recurring shape in its purest form: **prose that was
correct, present, and written the same day did not fire.** So it is not prose
now. PR #27 puts both halves into the rig:

- a **precondition** — final origin must match the requested origin, and
  `<html lang>` must be `ms` *or* the root must carry `#__next_error__` — that
  ERRORs with **exit 2**, never a clean run;
- and the **way through it**, `VERCEL_PROTECTION_BYPASS` sent as
  `x-vercel-protection-bypass`, so the guard is a checkpoint and not a locked
  door.

Proven four ways: protected preview without the secret → exit 2 quoting
`landed on https://vercel.com`, title `"Login – Vercel"`; **with** the secret →
29 targets on `/` and 93 on `/artikel`, identical to production; production →
exit 0; production 404 → exit 0, admitted on `#__next_error__`.

That last case is worth its own line: the **first draft of the precondition
would have rejected the site's own 404 page**, which has no `lang` attribute at
all. A guard that cries wolf on a real page gets disabled within a week.

**And a smaller one, done three times in this item:** wrote a check, got a
surprising answer, believed it. A `grep -E "^   (ok|FAIL"` missed every passing
row because ` ok ` is padded to four characters, and reported a 4-line file as a
complete inventory. Twice more the inline classifier exempted the wrong things.
All three were caught by re-reading the check, never by the check.

### 4. What did we nearly ship, and what caught it?

**A version of this item that fixed the homepage's four targets and reported two
of them.** Classifier v2 exempted the hero credit and the footer wordmark, and
would have printed a clean, quotable, wrong "2 → 0 on the homepage".

**What caught it was the DoD's own number.** The brief says *homepage 4*. The
rig said 2. Two of the five per-surface counts in that brief turned out to be a
`.slice(0, 25)` artefact and were wrong — but the three that were right are
exactly what made the disagreement visible. **A brief carrying its own
measurements is a negative control, and this one earned its keep.**

**Also nearly shipped: a visual regression in every figure caption on the site.**
`inline-flex` looked correct on the single-line captions the audit flagged at
768. At 390 the same captions wrap, and the trailing ↗ silently relocated 200px
to the right. Caught by screenshotting the state the audit had *not* flagged —
the widths where the target already passed — which is the opposite of where the
attention naturally goes.

### 5. What form should each lesson take?

Asked deliberately, because prose has now failed three times in this sprint.

| Lesson | Form it took | Why not prose |
|---|---|---|
| The 24px floor | **A token** (`--tap-min`) + **two utilities** | A component reaching for a number cannot reach for a paragraph |
| Which floor to use where | **A comment at the token**, unavoidably | This one is genuinely a judgement; the token makes the judgement visible at the point of use |
| "Every standalone target is ≥24" | **A gate with an exit code** (`pnpm audit:taps`) | Sprint 03's retro said "nothing looks at computed values" in prose; UI-06 exists because that did not fire |
| "The preview is measurable" | **A precondition in the rig + the bypass wired in** | UI-08 wrote it in prose the same day and UI-11 still lost an hour to it |
| The two wrong inline tests | **Comments at the exact line**, since a test cannot assert a definition | Nearest available form; the alternative was silence |
| The reference page's claims | **A component that measures** (`TargetProbe`) | A typed number cannot be wrong out loud |
