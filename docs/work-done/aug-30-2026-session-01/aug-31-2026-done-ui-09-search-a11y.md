# UI-09: the shipped search field brought up to DES-06 §8 — and the finding that the focus ring was never missing, only 1.98:1 — 31 Ogos 2026

**Session:** aug-30-2026-session-01 · **Owner:** design-systems-engineer · **Status:** completed
**Plan:** [aug-31-2026-brief-ui-09.md](../../plans/aug-30-2026-session-01/aug-31-2026-brief-ui-09.md)
**Spec being built:** [DES-06 §8](../../design/des-06-carian-katalog.html) — *Keyboard, focus and what gets announced*

---

## What was done

`/artikel#cari` is the site's only search surface. DES-06 §8 — a HelloKahwin
document from 28 Ogos — specifies its focus, naming, announcement, target size
and structure. The field that went live meets none of it. This item builds what
was already specified, and nothing beyond it.

Five clauses, each measured on a rendered page at **390 / 768 / 1024 / 1440**
with `innerWidth`, `documentElement.clientWidth` and two `matchMedia` results
asserted on every row:

| # | Clause | Before — production | After — production |
|---|---|---|---|
| 1 | Visible focus indicator on `:focus-visible` | box-shadow ring, 2px, **α 0.30** → rgb(182,181,180) — **1.98:1** | `outline: 2px solid var(--ring)` @ 2px offset → rgb(21,20,18) — **17.81:1** |
| 2 | Programmatic accessible name, not the placeholder | `"Cari artikel..."`, source `[placeholder]` | `"CARI"`, source `[relatedElement, placeholder]` — a real `<label for>` |
| 3 | Live region announcing the count and the empty state | **0** `[aria-live]`, **0** `[role=status]` at first render | **1** `[role=status]` at first render, empty; then `"5 hasil."` / `"Tiada hasil dijumpai."` |
| 4 | `font-size` ≥ 16px so iOS Safari does not zoom | **14px** | **16px** (line-height 24px) |
| 5 | Hit height ≥ 44px | **38px** | **46px** |

Identical at all four widths, before and after. `ALL PASS — 4 widths × 5 clauses`.

Two things beyond the five, both stated rather than smuggled in:

- **The resting boundary.** The field was the one form control on the site still
  drawn in `--border` — rendered rgb(218,217,215), **1.36:1**, where WCAG 2.2
  SC 1.4.11 asks 3:1 of the visual information needed to identify a form
  control. `globals.css` already defines `--border-strong` for exactly this
  (its own comment: *"form-control boundaries — ≥3:1 (WCAG 1.4.11)"*) and the
  category chip already uses it. Changed to `--border-strong` — rgb(147,146,143),
  **3.01:1**. One token the system already had, not a new value invented here.
- **The nested listbox.** DES-06 §8 calls `role="listbox"` inside
  `role="listbox"` invalid and says to flatten it. Was 2 listboxes, nested;
  now 1, with the `<ul>` at `role="none"` so its options are the listbox's
  direct children in the accessibility tree.

---

## The correction: the ring was there

The brief and UI-04 both record the focus ring as *"box-shadow is fully
transparent"* — `rgba(0,0,0,0) 0 0 0 0`. **It is not, and it never was.**

The computed value on production carries five layers:

```
rgba(0, 0, 0, 0) 0px 0px 0px 0px,
rgba(0, 0, 0, 0) 0px 0px 0px 0px,
rgba(0, 0, 0, 0) 0px 0px 0px 0px,
oklab(0.19 0.00034678 0.003989 / 0.3) 0px 0px 0px 2px,   <-- the ring
rgba(0, 0, 0, 0) 0px 0px 0px 0px
```

Four of those are Tailwind's empty placeholder slots. The fifth is a real 2px
ring in `--ring`. **UI-04 truncated the computed string at 60 characters**
(`cs.boxShadow.slice(0, 60)`) and saw only the first three placeholders.

The verdict does not change and the fix does not change — 30% of ink over warm
paper composites to rgb(182,181,180), **1.98:1**, below the 3:1 SC 1.4.11 asks —
but the *finding* changes, and it matters:

> **DES-06 §8 had this right on 28 Ogos.** It states the ring "composites to
> `#b7b6b4` on `--background #fcfbfa`: 1.96:1", and specifies the fix that this
> item builds. This work reproduces that number independently at 1.98:1 from a
> canvas read-back of the rendered field. The problem was never "there is no
> ring". It was "the ring is too faint to be an indicator" — and those two
> findings have different fixes. "Add a ring" would have been satisfied by
> anything visible at all; "make the indicator clear 3:1" is a number you can
> fail.

Filed as a correction to UI-04 §6, whose other five rows all reproduce exactly.

---

## What this deliberately does NOT build — the gate, checked and not fired

The brief carries a gate: *"If you conclude the fix requires rebuilding search,
STOP and report."* **It did not fire.** All five DoD clauses are properties of
the existing field — a stylesheet rule, a `<label>`, a `role=status` div, a type
size and a padding value. None of them needs the panel rebuilt.

But DES-06 §8 contains more than the DoD does, and the remainder **is** a
rebuild. Recorded here so the next reader does not have to re-derive which half
was built:

| DES-06 §8 requires | Status |
|---|---|
| `/` and `Ctrl/⌘K` opening the panel from anywhere | **not built** — needs the panel |
| `Esc` returning focus to the header trigger | **not built** — the trigger is a link, not a `<button aria-expanded>` |
| `↓ ↑` through results with `aria-activedescendant` | **not built** |
| `Home` / `End` to first and last result | **not built** |
| `Enter` with no row active submitting to `/cari?q=…` | **not built** — `/cari` returns 404; the results page does not exist |
| `Tab` cycling inside the panel, background inert | **not built** — needs Radix Dialog |
| Background scroll locked while open | **not built** |
| Panel entry as a 120ms fade, none under `prefers-reduced-motion` | **not built** |
| The four idle suggestions that teach the corpus | **not built** |

Every one of those is the search **build** item DES-06 §9 says "has not been
sized". Sprint 04 declined it. Starting it quietly inside a 5-point
accessibility item is exactly the thing the gate exists to prevent.

---

## Ship state

**Commits:**
- `2fa3753` UI-09: bring the shipped search field up to DES-06 §8
- `58806ae` UI-09: correct the border numbers to measured values, and stop the rig measuring a page that is not the search surface
- `e369003` UI-09: prettier the rig
- `af22bad` UI-09: clip the evidence screenshots to the search surface
- `8b1ee87` merge: origin/master (UI-05, UI-06 layout gate, UI-07, UI-08) into UI-09
- `bfc8d6c` Merge pull request #24 from ianngkb/ianng89/ui09-search-a11y

**On `origin/master`:** yes — merged 2026-08-30T19:03:44Z as `bfc8d6c`, with a
merge commit (not a squash), because five agents were merging in parallel and
each one's work keeps its own author and message. `origin/master` had moved four
items ahead while this was in flight (UI-05, UI-06's layout gate, UI-07, UI-08);
master was merged in first, `pnpm test` re-run (**453 passed, 33 files**),
`pnpm typecheck` re-run clean, and UI-06's gate self-test re-run (**59 passed,
0 failed, `UILINT EXIT: 0`**) before the PR was merged.
**Deployed:** production deployment `6170165810`, state `success`,
`https://hellokahwin-engw1mayi-thewednotebook.vercel.app`, aliased to
`hellokahwin.com`. **Verified by measurement, not by the deployment state** —
the rig re-run against `https://hellokahwin.com` after the deploy returns
`ALL PASS — 4 widths x 5 clauses` and reads `outline: solid 2px offset 2px
rgb(21,20,18) 17.81:1`, a value that does not exist in the build this replaced.
**Still uncommitted in the tree:** none.

```
$ git status --porcelain -- src/ scripts/
$ git log --oneline origin/master..HEAD
```

Both empty. The only untracked files in this worktree are six
`.claude/agents/*.md` persona files that belong to the shared checkout, not to
this item, and are deliberately not committed.

---

## Evidence

Everything below is reproducible with one committed command.

### The rig

`scripts/measure-search-a11y.mjs`, in the site repo, run as:

```
NODE_PATH=<...>/node_modules \
  node scripts/measure-search-a11y.mjs https://hellokahwin.com \
    --shots <dir> --json <file>
```

It exits non-zero if any clause fails at any width, so it is a gate and not a
report. Four decisions inside it are load-bearing, and three of them exist
because the naive version of that decision produced a wrong answer first:

1. **Colours are resolved through a 1×1 canvas, never parsed from
   `getComputedStyle`.** Every token here is authored in `oklch()`; Chrome hands
   those back as `oklab()` / `lab()`. An `rgb()` parser pointed at one of those
   does not fail — it reports confident garbage.
2. **Alpha is flattened over the real ground before any ratio is computed.**
   Unflattened, the shipped ring's colour is rgb(22,20,18) and scores
   **17.64:1** — a number that would have declared the defect fixed. Flattened
   at its actual 30%, it is rgb(182,181,180) and **1.98:1**. This single step is
   the difference between passing the field and failing it.
3. **The computed style is snapshotted into plain strings before anything is
   derived from it.** `getComputedStyle` returns a *live* declaration and the
   field transitioned its shadow, so reading `boxShadow` twice in one function
   returned two different values mid-transition. The rig printed "no ring" one
   line after printing the ring.
4. **The field is reached by `Tab` from the first focusable element in the
   document**, not by `.focus()`. `/artikel#cari` focuses the field on arrival,
   so the obvious version — blur, then Tab — reported "reached in 1 press" and
   proved nothing. It is 18 presses at 390px and 62 at 1440px.

### Before / after

| | file |
|---|---|
| Production, before | `aug-31-2026-ui-09-EVIDENCE/before/report.txt`, `before/measurements.json` |
| Preview build of the merge commit | `aug-31-2026-ui-09-EVIDENCE/preview/report.txt`, `preview/measurements.json` |
| Production, after merge | `aug-31-2026-ui-09-EVIDENCE/after/report.txt`, `after/measurements.json` |

Screenshots per width, clipped to the search surface at 1:1 so a 2px ring is
legible: `-a-focus.png` (focused), `-b-results.png` (five results),
`-c-empty.png` (*Tiada hasil dijumpai*), `-z-page.png` (viewport, for context).

### Negative control

The rig refuses to measure a page that is not the search surface. It quotes
`#cari`, the final URL, the document title and the count of `/artikel/<cat>/<slug>`
links, and exits 2 if `#cari` is absent — because that check was added *after*
it silently measured Vercel's SSO login form. Vercel deployment protection
answers a preview URL with a 302 to a page that has an `<input>` on it, the rig
fell back to `document.body`, found that input, and reported numbers for it.
A status code is not evidence, and neither is "there was an input on the page".

### UI-06's layout gate, run against production after the merge

`node scripts/ui-layout-gate.mjs --base https://hellokahwin.com`, saved as
`after/ui-layout-gate.txt`. Across six templates × four widths:

```
totals: narrow-text-column 0 · clipped-text 0 · viewport-overflow 0
        image-upscale 25 · image-aspect 31
UILINT EXIT: 1
```

**The three categories this item could possibly have moved are all zero.**
Adding a label above a field and growing it by 8px can produce a narrow column,
a clipped label or an overflow; it cannot produce an upscaled or wrongly-cropped
photograph.

**The gate does exit 1, and none of it is this item's.** Proven by enumeration
rather than asserted: these four commits touch exactly four files —
`scripts/measure-search-a11y.mjs`, `src/app/globals.css`,
`src/app/(admin)/admin/design-system/page.tsx` and
`src/components/inspire/inspire-article-search.tsx`. No image, no image
component, no cover pipeline. The violations are 12 per width on the homepage
(which this item does not touch at all), 1 on `/artikel`, and 1–2 on the article
template. Recorded as follow-up #6 so that the next person to see a red live
gate does not spend the morning suspecting the search field.

### Gates

- `pnpm typecheck` — clean
- `pnpm build` — `✓ Compiled successfully in 9.2s` (prerender then fails on a
  placeholder `DATABASE_URL`; no local DB in this worktree)
- `pnpm lint` — 0 errors, 146 warnings. `prettier --check` fails on
  `src/app/(public)/brand/brand.css`, `src/app/(public)/brand/page.tsx` and
  `src/components/brand/brand-assets.ts` — **all three already unformatted at
  `61a505f`** and untouched by this item. Verified by running
  `prettier --check` against those three paths alone. The lint gate was red on
  master before this branch existed.

---

## What it changed

- **Every iPhone visitor who taps search stops getting the page zoomed.** 14px →
  16px is the whole of that fix, and mobile is 79% of this site's clicks. It is
  the one clause here with a cost every single day.
- **A keyboard user can now see where they are.** 1.98:1 → 17.81:1.
- **A screen-reader user is told what happened.** Zero live regions → one,
  present from first paint, announcing `5 hasil.` and `Tiada hasil dijumpai.`
  once per settled query and nothing during typing or loading.
- **The field has a name that survives typing.** It was the placeholder, which
  disappears on the first keystroke.
- **The touch target clears the floor** — 38px → 46px.
- The `/artikel` search field is no longer the site's only WCAG 1.4.11 failure
  on a form boundary.

---

## Follow-ups

| # | Item | Owner |
|---|---|---|
| 1 | **The search build** — everything in the DES-06 §8 table above marked *not built*: the panel, the shortcuts, arrow navigation, `/cari?q=…`. DES-06 §9 says it "has not been sized". It needs sizing before it can be scheduled. | product-designer to size, design-systems-engineer to build |
| 2 | **`/cari` returns 404** and DES-06 §3.2 makes it a real URL that `Enter` submits to. Until it exists, `Enter` in the field does nothing, which is why no `enterkeyhint="search"` was added — labelling a key "search" when it does nothing is worse than not labelling it. | blocked on #1 |
| 3 | **The accessible name computes as `"CARI"`, in caps**, because `.hk-eyebrow` applies `text-transform: uppercase` and Chrome exposes the transformed text. The DOM text is `Cari`. Real-world risk is low (NVDA/JAWS/VoiceOver read a 4-letter word, they do not spell it) and it was left rather than papered over with an `aria-label` that would then be a second source able to drift. Worth a decision if the site ever gains a longer eyebrow label used as a control name. | design-systems-engineer |
| 4 | **The field stays 320px wide at 1440.** UI-04 flagged it in the same row as the five clauses; it is not one of them, and widening it is an art-direction call, not an accessibility one. | creative-director |
| 5 | **`prettier --check` is red on `master`** — three `brand/*` files, pre-dating this branch. Whoever owns `brand/` should format them; leaving the gate red trains everyone to ignore it. | unassigned |
| 6 | **UI-06's live layout gate exits 1 on production** — `image-upscale 25`, `image-aspect 31`, zero of the three layout categories. Pre-dates this item and is untouched by it (see above). The scheduled job has never run green, so the first person to look at it will find a red gate that nothing in this sprint caused. Either the image findings get an item, or the gate needs a documented baseline; a permanently-red gate is a gate nobody reads. | creative-director (the findings) / design-systems-engineer (the baseline decision) |

---

## Retrospective

### What we learned that is not written down

**A defect can be re-found with the wrong shape, and the wrong shape survives
into the fix.** DES-06 measured this ring correctly on 28 Ogos: *present, 2px,
1.96:1, below the 3:1 floor.* UI-04 re-measured it on 31 Ogos through a rig that
truncated the computed value at 60 characters, and reported *absent*. The brief
inherited "absent". Three documents, one of them the specification itself, and
the most recent one was the least accurate.

Nothing bad happened here because the fix for "absent" and the fix for "1.98:1"
happen to be the same line of CSS. That is luck. A finding of "no focus ring" is
closed by *anything visible*; a finding of "1.98:1 against a 3:1 floor" is closed
only by a number. Had the fix been a 1px hairline, the first framing would have
accepted it.

**Three of this item's own checks were wrong before they were right**, and every
one was caught by two of my own outputs disagreeing rather than by a test:

1. A regex inside a template-literal helper string lost its backslashes —
   `[\d.]+px` became `[d.]+px` — so the shadow parser matched nothing and the
   rig reported "no ring" one line after printing the ring.
2. `getComputedStyle` returns a *live* declaration. Reading `boxShadow` twice
   during a 150ms transition returned two different values, one of them a
   half-drawn ring.
3. The rig fell back to `document.body` when `#cari` was missing, so when Vercel's
   deployment protection answered with an SSO page, it measured the login form's
   password field and reported numbers without complaint.

### Which document must change, and who owns the edit

| Document | Edit | Owner |
|---|---|---|
| `docs/work-done/aug-30-2026-session-01/aug-31-2026-done-ui-04-rendered-audit.md` | §6's focus-ring row says the box-shadow is `rgba(0,0,0,0) 0 0 0 0`. It is a 2px ring at α 0.30 → 1.98:1. **Done in this item** — see the correction note appended there. | design-systems-engineer (done) |
| `src/app/(admin)/admin/design-system/page.tsx` §06 | The reference page said `ring-ring/30` at 1.95:1 was a defect *DES-07 flagged inside this module*. It was also live on the public site. **Done in this item**: §06 now carries the UI-09 measurement and the 44px table gains the search field's 46px row. | design-systems-engineer (done) |
| `docs/plans/aug-23-2026-production-doctrine.md` | Gains the truncation rule below. | ceo-hellokahwin |

### What we did twice

Measured the same focus ring three times across three documents (DES-06, UI-04,
UI-09) and got two different answers from the same production CSS. The
duplication was not the waste — the *disagreement going unnoticed for three days*
was.

### What we nearly shipped, and what caught it

Two things, both caught by an output contradicting another output of mine:

- **A rig that reports "no focus ring" on a page that has one.** Caught because
  it printed the raw `box-shadow` string next to its own verdict and the two
  disagreed. Had I printed only the verdict, this item would have "confirmed"
  UI-04's finding and quietly buried DES-06's more accurate one.
- **A measurement of Vercel's login form presented as a measurement of the
  search field.** Caught because a Playwright locator for `#cari input` timed
  out where my own `document.body` fallback had not.

And one thing that shipped in a first draft and was corrected before merge: the
`--border` / `--border-strong` comment in `globals.css` carried sRGB triples I
had computed *by hand* from the oklch tokens. Both were wrong — rgb(226,225,222)
vs a measured rgb(218,217,215), rgb(174,172,169) vs a measured rgb(147,146,143).
Estimating a colour I had a rig sitting right there to measure.

### The form the lesson takes

Not prose. Three of these are mechanical:

1. **A script, already committed** — `scripts/measure-search-a11y.mjs`, which
   exits non-zero on any failing clause at any width, refuses to measure a page
   without `#cari`, and prints the raw value beside every verdict it derives.
   The next person re-runs it; they do not rewrite it, and they do not
   re-discover its three bugs.
2. **A rule for the production doctrine**, stated so it can be checked:
   > **Never truncate a value you are about to judge.** `slice(0, n)` on a
   > computed style, a header, or a query result turns "I did not look" into "it
   > is not there". If the output is too long to print, print its length and a
   > parsed summary — never a prefix. In this sprint a 60-character truncation
   > turned a measured 1.96:1 focus ring into a reported "fully transparent",
   > and the wrong finding reached a brief.
3. **A DoD clause for any future contrast or indicator item**, because "the
   ring is present" and "the ring is an indicator" are different claims:
   > A colour claim states the **flattened** sRGB triple, the ground it was
   > flattened over, and the ratio. A translucent colour quoted at its own
   > opacity is not a measurement. `ring/30` reads 17.64:1 unflattened and
   > 1.98:1 flattened; only one of those is what a reader sees.
4. **Prose, only because no other form fits it** — the DES-06 / UI-04
   disagreement is a documentation-currency problem, not a code one, and it
   belongs to the editorial-verification-lead's currency register if that
   register is ever extended to cover internal specifications as well as
   published FACTs. Raised here; not decided here.
