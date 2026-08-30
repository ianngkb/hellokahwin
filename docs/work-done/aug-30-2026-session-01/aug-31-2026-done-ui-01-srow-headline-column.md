# UI-01: the homepage Terkini list gets its rank number back — restoring a design DES-03 drew and DES-08 dropped, and making `.s-row` unable to lose it again — 31 Ogos 2026

**Session:** aug-30-2026-session-01 · **Owner:** creative-director · **Status:** completed
**Plan:** [aug-31-2026-brief-ui-01.md](../../plans/aug-30-2026-session-01/aug-31-2026-brief-ui-01.md)
**Audit:** [aug-31-2026-audit-ui-desktop-mobile.md](../../plans/aug-30-2026-session-01/aug-31-2026-audit-ui-desktop-mobile.md) §1
**Sprint:** 04 · **Item:** `UI-01` · 3 points · track `design` · flags `SEVERE`, `live-in-production`, `owner-reported`
**Evidence folder:** [`ui-01-srow-evidence/`](ui-01-srow-evidence/)

## What was done

All twelve homepage `.s-row` cards rendered their headline in the 44-pixel
rank-number track — 44px wide, 225–307px tall, one word per line, clipped by the
thumbnail. The track is not a mistake: the homepage rendered only two children
and CSS Grid auto-placed the headline into the first free track.

The brief offered two options and the CEO recommended (a). **I took (a), and it
is not a preference — it is a restoration.**

**The evidence that settles it,** `docs/design/des-03-evidence/tpl/05-pages.html`
§5.3 *"Homepage — one hero, then the record of what is new"*, drawing **H1**
(homepage, 1200px, light), lines 571–590:

```html
<div class="s-label" ...>Terkini</div>
<div class="s-row"><span class="s-idx">01</span>
<div class="s-row"><span class="s-idx">02</span>
<div class="s-row" style="border-bottom:0"><span class="s-idx">03</span>
```

The spec's own homepage carries `01`, `02`, `03`. Option (b) — declare a
two-column homepage variant and drop the number — would have been narrowing a
specification after the fact to match what got built, which the
creative-director's hard rule 7 forbids outright. It would also have been the
second time this component lost its number silently.

The number is a **position** claim, not a rank claim, and the spec defends it in
its own words at line 432, the caption to drawing K1: *"The index numbers are not
decoration: the catalogue is ordered, Muat lagi appends to it, and the number is
how a reader knows where they are in 38."* That is true of Terkini too — `01` is
the newest. The label above the list reads **Terkini**, not *Terbaik*, which is
what anchors the number to time rather than to quality.

### Four changes: one fix, three reasons it cannot recur

| File | Change |
|---|---|
| `src/app/(public)/page.tsx` | Terkini rows pass `01`–`12`, zero-padded, matching the two call sites that already worked |
| `src/design-system/components.css` | `.s-row:not(:has(.s-idx))` — **the track count follows the children**. Plus a standing note on the file's real interface (below) |
| `src/design-system/components/content.tsx` | `ListRow.index` becomes required; the component zero-pads it so no caller can get the format wrong |
| `scripts/audit-srow-geometry.mjs` + `package.json` | The committed gate, `pnpm audit:srow <base-url>` |

### The rejected option (c), and why the guard is not it

The CEO measured `grid-column: 2` on the headline wrapper — it works, and it was
rejected because it keeps the 44px track and leaves a permanent empty gutter.

**The guard removes the track instead of filling it**, and the difference is
measured, not argued. Deleting the `.s-idx` from a live row:

```
with number   : cols "44px 412px 176px"  children 3  headline 412 x 78
number removed: cols "484px 176px"       children 2  headline 484 x 78
```

Under option (c) the tracks stay `44px 412px 176px` with 44px of dead space.
Under the guard they become `484px 176px` — the gutter is gone and the headline
gets the space back.

### The gate separates two claims that were being conflated

- **LAYOUT** — at least one row, and every row: width ≥ 350, height ≤ 100,
  carries a `.s-idx`. The item's actual claim; holds at any corpus size.
- **CONTENT** — the homepage renders exactly 12 rows. A claim about how many
  articles are *published*, not about the grid.
- **CONTROL** — asserts the article page's first row still reads `01` in a 44×26
  box, so a fix that repairs the homepage by breaking the shared rule fails.

The split came from `ui03-hero-91`'s review: `rows.length === 12` holds only
while at least 13 articles exist, so a bulk unpublish would turn it red while
pointing at a grid rendering perfectly — the same "tested a proxy for the thing
you mean" failure the audit's §3 recorded five times. Both must be green to ship;
a red now says which. The DoD's 12 was **not** dropped.

The gate also refuses to run below 1024px and fails on zero rows — a preview
returning 200 with no articles would otherwise pass vacuously, since "every row
is well-formed" is true of no rows.

## Ship state

**Commit:** `9e81bc8` — *UI-01: restore the homepage Terkini rank number, and make .s-row unable to lose it again*
**Merge:** `ef1716e` — *merge: origin/master (UI-02 nav rail) into UI-01* (merge commit, not squash, so UI-02 keeps its authorship)
**PR:** [#16](https://github.com/ianngkb/hellokahwin/pull/16) → master `750d7e7`
**On `origin/master`:** yes — `git merge-base --is-ancestor 9e81bc8 origin/master` returns true
**Deployed:** GitHub deployment `6169629855`, ref `750d7e78`, environment Production, state **success**
**Still uncommitted in the tree:** `.claude/agents/*.md` (six persona files, untracked, **not UI-01's** — they belong to whichever session copied the personas in; left alone deliberately)

## Evidence

### Before — live production, 1440px, 31 Ogos 2026

[`2026-08-31-before-gate-production.txt`](ui-01-srow-evidence/2026-08-31-before-gate-production.txt) ·
[`2026-08-31-before-homepage-terkini-1440.png`](ui-01-srow-evidence/2026-08-31-before-homepage-terkini-1440.png)

```
   #  chld  idx   headline W x H   grid-template-columns
   1     2    —       44 x 225  FAIL  44px 412px 176px
   2     2    —       44 x 307  FAIL  44px 412px 176px
  ...  all 12 identical in kind, 225-307px tall
  numbered check: 0/12 rows carry .s-idx
GATE: FAIL (13 failing conditions)
```

Article page, same component, same run — the negative control:
`3 children, idx "01" at 44x26, headline 924x27` — **PASS**.

### After — live production, 1440px, `x-vercel-cache: HIT`

[`2026-08-31-after-gate-production.txt`](ui-01-srow-evidence/2026-08-31-after-gate-production.txt) ·
[`2026-08-31-after-homepage-terkini-1440.png`](ui-01-srow-evidence/2026-08-31-after-homepage-terkini-1440.png) ·
[`2026-08-31-after-article-control-1440.png`](ui-01-srow-evidence/2026-08-31-after-article-control-1440.png)

```
   #  chld  idx  idx WxH   headline W x H   rowH   grid-template-columns
   1     3   01   44x26      412 x 78   PASS   173  44px 412px 176px
  ...  all 12 identical: 412 x 78, ranks 01-12 in order
  LAYOUT : PASS — 12/12 rows in the headline box, 12/12 numbered
  CONTENT: PASS — 12 rows, expected 12
  CONTROL: PASS — asserted first row idx="01" w 40-48px, h <= 40px; got 01 at 44x26
  RIG    : PASS
GATE: PASS
```

Reproduce: `pnpm audit:srow https://hellokahwin.com` (needs `playwright-core`
installed out of tree and the system Chrome — deliberately not an app dependency,
same convention as `scripts/measure-page.mjs`).

Independently confirmed from the raw HTML, without the rig, by **enumerating
rather than testing for**:

```
$ grep -o 'class="s-row"' prod-after.html | wc -l   ->  12
$ grep -o 'class="s-idx"' prod-after.html | wc -l   ->  12
$ ranks -> 01 02 03 04 05 06 07 08 09 10 11 12
```

The pattern was proved on the article page (returns 1) before the homepage count
was believed. `ui03-hero-91` independently reproduced the same result and found
that **`grep -c 's-idx'` returns 1 on this page** — the HTML is a single line, so
`-c` counts lines, not occurrences. `grep -o … | wc -l` is the form that answers
the question.

### The guard, proven rather than asserted

[`2026-08-31-guard-proof-localhost.txt`](ui-01-srow-evidence/2026-08-31-guard-proof-localhost.txt)

Every call site now passes a number, so `:not(:has(.s-idx))` never fires in
normal operation. Removing a live row's number forces it:

```
guard fires (3 tracks -> 2):        true
no empty 44px gutter left behind:   true
headline still wide (>=350px):      true (484px)
RESULT: GUARD PROVEN
```

`:has()` is Baseline since December 2023 and the repo already shipped it —
`src/app/globals.css:953`, `body:has([data-hide-mobile-nav])`.

### Desktop only — mobile proven unchanged

[`2026-08-31-mobile-390px-unchanged.txt`](ui-01-srow-evidence/2026-08-31-mobile-390px-unchanged.txt)

At 390px, production-before and post-fix are geometrically identical:

| | cols | headline | image | overflowX |
|---|---|---|---|---|
| production, pre-fix | `80px 256px` | 256 × 63 | 80 × 80 | false |
| post-fix | `80px 256px` | 256 × 63 | 80 × 80 | false |

The added `.s-idx` is present in the DOM with `display: none` and a 0px box.

### The threshold finding — the DoD's 100px is tighter than the design's own tolerance

[`2026-08-31-production-titles-in-fixed-grid.txt`](ui-01-srow-evidence/2026-08-31-production-titles-in-fixed-grid.txt)

A local run failed one row at 412 × **106**. Chased rather than tuned:

```
`.t` at desktop        21px / 27.3px line-height
correct row            412 x 78    (2 lines)
defective row           44 x 225-307
three lines            412 x 106
four lines             412 x ~131
the row's own height   173px = 132px thumbnail + 20px padding x2
```

The row is `align-items: start`, so **its height is set by the thumbnail, not the
text**. The headline wrapper is free to grow to ~132px — four lines — before it
adds one pixel to the row. A three-line title at 106px costs nothing visually.

So `<= 100px` is a *defect detector*, not the design's constraint. It cleanly
separates the 44px-track population (225–307px) from the correct one (78px), and
it holds on the live corpus: **all twelve of production's real Terkini titles
render 2 lines at 412 × 78**, measured by substituting them into the shipped grid.
The 106px row was a TWN-imported title present only in the local database.

**The threshold was not moved.** `MAX_HEADLINE_H` stays at the DoD's 100. The
gate now carries `DESIGN_CEILING_H = 132` as printed context, so a row between
101 and 132 reports as *"over the 100px DoD threshold, under the 132px design
ceiling — threshold question, not a layout defect"* rather than as a bare FAIL.
**Whether to move it to 132 is the CEO's call, not mine, and it is open.**

### Build verification

| Check | Result |
|---|---|
| `pnpm typecheck` | PASS (exit 0), before and after the master merge |
| `pnpm build` | PASS (exit 0), before and after the master merge |
| `pnpm audit:srow` vs production | **PASS** — all four layers |
| `pnpm lint` | **FAIL — pre-existing on `origin/master`, not ours.** See below |

**The lint failure is not UI-01's and the check was verified before the claim
was made.** Three files: `src/app/(public)/brand/brand.css`,
`src/app/(public)/brand/page.tsx`, `src/components/brand/brand-assets.ts`. All
three are untouched in this item's tree; all six of UI-01's changed files pass
`prettier --check` cleanly; and running `prettier --check` against
`git show origin/master:<path>` copies reproduces the same failure on master
itself. **`pnpm lint` was already red at `105e79d`.** Owner: whoever owns
`/brand` (last touched by `f4a09d2`, in the `2d78c95` wordmark merge).

## What it changed

- The front page of the company stopped being visibly broken. Twelve headlines
  went from **44px wide and 225–307px tall, clipped** to **412 × 78 and legible**.
- The site's three list surfaces — homepage, catalogue, article related — now
  read in one register instead of two.
- `.s-row` acquired a failure mode it did not have: **none**. A call site that
  omits the number now gets a correct two-track row rather than a 44px headline.
- The repo gained a rendered-geometry gate. Static checks — typecheck, lint,
  structural diff, the DES-09 guardrail sweep — were all green while this
  shipped. Nothing in the repo could have caught it before `pnpm audit:srow`.

**This is a brand and credibility item, not a traffic one**, and it must not be
scored on SEO: the homepage earned 4 clicks from 5 impressions last week.

## Follow-ups

1. **`ListRow` has no public caller — convert the three hand-rolled call sites.**
   Needs its own item. Owner: `design-systems-engineer`. Until then the required
   `index` prop guards a component no shipping page calls. Recorded in
   `src/design-system/components.css`'s header so the next reader cannot miss it.
2. **The 100px vs 132px threshold is open and belongs to the CEO.** A legitimately
   three-line Terkini headline will turn `pnpm audit:srow` red on a row that is
   rendering correctly. Not urgent — zero of production's twelve titles are near
   it — but it will fire eventually.
3. **`pnpm lint` is red on `origin/master`** in three `/brand` files. Every agent
   this sprint will see a red lint and either ignore it (bad) or "fix" files they
   do not own (worse — guaranteed conflicts).
4. **`docs/work-done/README.md`'s pre-flight command does not catch a red lint or
   a red gate**, only uncommitted work. See the retrospective.

## Retrospective

### 1. What did we learn that is not written down?

**`ListRow` — the design-system component that owns this device — has no public
caller.** Verified: `grep -rn "ListRow" --include=*.tsx src/` returns
`/admin/design-system` and two comments. All three public list surfaces hand-roll
`<a className="s-row">` markup: `(public)/page.tsx:280`,
`artikel/[category]/page.tsx:770`, `artikel/[category]/[slug]/page.tsx:1196`.

**So the homepage did not forget to pass a prop. There was no prop to forget.**
The design system's components are specimens on a reference page; the pages are
three independent copies of their markup, free to drift. That is how "the same
component" could be correct on two surfaces and broken on a third, and it is the
actual root cause of this item.

**Second: UI-01 is the other half of a defect DES-08 already fixed half of.**
DES-08's own retrospective
([`aug-28-2026-done-des-08-page-rebuild.md`](../aug-28-2026-session-01/aug-28-2026-done-des-08-page-rebuild.md),
§3, lines 386–394) records finding `.s-idx` overflowing the two-track *mobile*
grid — a child with no track — and fixing it with `display:none` below 1024px. It
then shipped the mirror image: **a track with no child, on desktop.** Same
component, same disagreement between track count and child count, opposite sign,
one breakpoint apart — and the fix for the first half sits in the same CSS block
as the bug for the second. Nobody looked at the other side of the symmetry.

**Third, contributed by `ui03-hero-91` and worth stating once rather than twice:
this sprint produced three instances of the same failure — a value derived by
POSITION rather than by IDENTITY.** Mine was CSS Grid auto-placing the headline
into the number track because no child *claimed* it. Theirs was
`filter((_, i) => i !== heroIndex)` matching by index after the eligibility
predicate could shift which index the hero occupies. Both are silent: neither
throws, neither fails a structural diff, both render a page.

> **When the set can be reordered or filtered, address elements by identity,
> never by position. Position-derived references stay valid right up until the
> pool changes, and then fail without an error.**

**This is no longer a paragraph in two retrospectives — it is
[production doctrine §5.9, "Address by identity, never by position"](../../plans/aug-23-2026-session-01/aug-23-2026-production-doctrine.md),
written jointly with UI-03 and shipped in `0f59dc7`.** It tabulates three
instances from this sprint, not two: mine, UI-03's `heroIndex` filter, and a
third UI-03 found while writing it up — `HERO_MIN_SOURCE_ASPECT = 1.15`, a
threshold *positioned* relative to a hero aspect ratio it did not reference, so
widening the plate would silently stop it matching. All three are silent: nothing
throws, nothing fails a structural diff, the page renders and the HTML is valid.

Read §5.9 rather than this section. The fixes it records are three code changes
and no prose, which is the ratio it is asking the next person to reach for.

### 2. Which document must change, and who owns the edit?

| Document | Edit | Owner | Status |
|---|---|---|---|
| `src/design-system/components.css` | The `:not(:has(.s-idx))` guard — the rule as code, not prose — **and** a standing header note that `ListRow`/`Card` have no public caller, so this file is the real interface and `content.tsx` is documentation | design-systems-engineer | **DONE**, shipped in `9e81bc8` |
| `src/design-system/components/content.tsx` | `index` required, zero-padded in the component | design-systems-engineer | **DONE**, shipped in `9e81bc8` |
| `scripts/audit-srow-geometry.mjs` (new) | The gate: rendered geometry, a negative control, LAYOUT/CONTENT split, refuses to run below 1024px | design-systems-engineer | **DONE**, shipped in `9e81bc8` |
| `docs/plans/aug-30-2026-session-01/aug-31-2026-dispatch-map.md` | A second "rule this produces": **a brief may not assert file isolation** — it is measurable, so measure it and name the shared paths and line ranges | creative-director | **DONE**, this session |
| `docs/plans/aug-23-2026-session-01/aug-23-2026-production-doctrine.md` | New **§5.9 "Address by identity, never by position"** — the one lesson behind three of this sprint's silent defects | creative-director (UI-01) + UI-03, jointly | **DONE**, shipped in `0f59dc7` |
| Sprint backlog | An item to convert the three hand-rolled `.s-row` call sites to `ListRow` | ceo-hellokahwin to schedule, design-systems-engineer to build | **FILED as `DES-14`** — follow-up 1 |

Four of the six edits are code, a script, or a tracker item. That is deliberate: **Sprint 03's
central finding is that prose rules do not fire and gates and scripts do.** The
one lesson that could only be prose — the dispatch map's isolation rule — is
written as a command to run, not as an exhortation to be careful.

### 3. What did we do twice that we should never repeat?

**Fixed one half of a symmetrical grid defect and shipped the other half.**
DES-08 fixed "child with no track" on mobile and shipped "track with no child" on
desktop, in the same component, in adjacent CSS, three days apart.

The repeatable form: **when you fix a disagreement between a grid's track count
and its child count, check the other breakpoint and the other sign before you
close it.** That is now enforced rather than remembered — the gate measures a
numbered surface and an unnumbered one in the same run, and refuses to run at a
width where the other breakpoint's rules apply.

**Also done twice, and structurally:** three hand-rolled copies of one component's
markup. That is follow-up 1.

### 4. What did we nearly ship, and what caught it?

**(a) A design-system component whose own reference page contradicted every page
that ships it.** With `index` made required, `ListRow` still rendered `{index}`
raw — so the reference page would have shown `2`, `3`, `4` while the homepage,
catalogue and related lists all show `02`, `03`, `04`. Caught by reading the diff
against the spec's drawings rather than against the ticket; the ticket says
nothing about padding. It matters because `.s-idx` sets
`font-variant-numeric: tabular-nums` precisely so the numbers form a straight
left edge, and unpadded that edge breaks exactly where a 12-item list crosses
9 → 10 — which is the homepage. Fixed inside the component, so no caller can get
it wrong.

**(b) A gate that printed its control instead of asserting it.** The first
version of `audit-srow-geometry.mjs` printed the article control's `01` and its
44×26 box in the table, and asserted only that a `.s-idx` element existed. **A
control that is not asserted is a screenshot.** The next person to run it in CI
would have got a green from a row reading `—`. Caught by re-reading the DoD's
actual words — *"proving the numbered variant STILL renders 01 correctly"* —
against what the script would actually exit non-zero on.

**(c) Tuning a threshold instead of understanding a failure.** The obvious move
when row 11 failed at 106px was to raise `MAX_HEADLINE_H` to 120 and go green.
That is precisely the forbidden narrowing. Chasing it instead produced the 132px
design ceiling, the fact that row height is set by the thumbnail rather than the
text, and the measurement that all twelve production titles render two lines —
none of which was known before, and the last of which is what made shipping safe.
The threshold did not move.

**(d) Believing a red build was ours.** `pnpm build` failed at "Generating static
pages" on `ECONNREFUSED 127.0.0.1:5433`. It was the local WSL Postgres cluster,
`Stopped` after idling — not the code, which had already compiled successfully.
`pnpm lint`'s red was similarly not ours, and that one was *verified* rather than
assumed, by reproducing it against `git show origin/master:<path>` copies of the
three files. A red check is a claim about your environment until you have proved
otherwise.
