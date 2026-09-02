# UI-15 — the grid thumbnail is a named 4:3 crop, and R1/R2 are now blocking checks

**Item:** UI-15 · Sprint 06 · 5 points · `design`
**Owner:** Design Systems Engineer · **Date:** 02 September 2026
**Integration branch:** `master` · **PR:** [#75](https://github.com/ianngkb/hellokahwin/pull/75) · **Merge commit:** `0a618ae`

---

## 1. The finding, and why R1 could never have caught it

The `.s-card` lead plate was fed `low`, which preserves the photographer's
aspect, into a box that **declared no height at all**. `width: 100%` with
`height: auto` means the plate takes whatever shape the file is.

Measured on live production, 02 September 2026, the eight category pages that
render a lead card served **five different plate shapes from one component**:

| page                   | file      | aspect |
| ---------------------- | --------- | ------ |
| `idea-dan-nasihat`     | 1160×680  | 1.706  |
| `pantai-santai`        | 1200×800  | 1.500  |
| `fotografi-videografi` | 1024×683  | 1.499  |
| `glamor-eksklusif`     | 1200×801  | 1.498  |
| `minimalis-mewah`      | 1200×893  | 1.344  |

**Aspect deviation read 0.0% on every one of them**, and that is the finding
rather than a footnote. A slot with no box satisfies "the box follows the asset"
*vacuously*: there is nothing for the asset to disagree with. UI-03 **R1 is
structurally incapable** of seeing this defect. **R2** — only named crop targets
may fill a shaped slot — is the rule that does, which is why this item ships a
variant check and not only an aspect one.

---

## 2. The numbers, derived at run time

The tracker carried **"all 37 pages"**. That was wrong, and so is any single
replacement for it. The sitemap moved three times while this item was in flight:

```
109 entries at 02:00 · 113 at 03:00 · 119 at the pre-fix run
```

— exactly as DES-18 watched 86 become 89 and UI-13 watched 89 become 92. The
**grid-page count was 16 on every one of those readings**: 1 `/artikel` plus 15
category archives. `scripts/gate-grid-pages.sh` derives the list from the live
sitemap every run and prints its derivation, so the next reader watches it move
rather than inheriting a number that was true once. **Nothing is hardcoded.**

### PRE-FIX — live production, merged gate

`docs/work-done/sep-02-2026-session-01/sep-02-2026-ui-15-EVIDENCE/01-prefix-live-gate.txt`

```
sitemap:  119 <loc>  =  1 root + 1 /artikel + 15 category archives + 102 articles
grid pages derived at run time: 16

grid-thumb-variant (R2) total: 40
grid-thumb-aspect  (R1) total: 0
UILINT EXIT: 1
GATE EXIT (read directly, not through a pipe): 1
```

40 = the 8 pages carrying a lead card × 5 viewport widths (390/768/1024/1440/1920).
The **40 / 0 split is the finding restated as a measurement**: the variant rule
sees the defect at every width; the aspect rule sees nothing at any width.

### POST-FIX — live production, same command, same instrument

`docs/work-done/sep-02-2026-session-01/sep-02-2026-ui-15-EVIDENCE/03-postfix-live-gate.txt`

```
sitemap:  119 <loc>  =  1 root + 1 /artikel + 15 category archives + 102 articles
grid pages derived at run time: 16

rows measured: 80          (16 pages x 5 widths)
grid-thumb-variant (R2): 0
grid-thumb-aspect  (R1): 0
[FAIL] rows: 0
UILINT EXIT: 0
GATE EXIT (read directly, not through a pipe): 0
```

**40 → 0**, on **live production**, across **every** category page plus
`/artikel`, at **all five widths including 390px**.

### Verified I measured the build I made

A gate exit of 0 against a stale deploy is the failure mode this repo has already
hit, so the served file was read directly rather than inferred from the exit
code:

```
$ curl -s https://hellokahwin.com/artikel/pantai-santai | grep -oE 'crop-4x3-article-card-md[^"?]*|/low\.webp'
      2 crop-4x3-article-card-md.webp
```

Two hits is **one element** — Next.js serves the page twice in the HTML, so a
plain-text grep returns exactly double. Zero hits for `low.webp` in that slot.
Production deployment **`6214790733`** (`0a618ae`), state `success`.

---

## 3. What shipped

- **`resolveCardSource()`** feeds the plate `crop-4x3-article-card-md` and
  returns the file's **real** intrinsics. Rung 2 is `crop-4x3-article-card-sm`;
  rung 3 (the full crop) is deliberately absent — see §5.
- **`.s-card img`** declares `aspect-ratio: 4/3` **with an explicit `height: auto`
  beside it**. That is not redundant. The `height` attribute R6 requires maps to
  a presentational height hint, and **that hint beats `aspect-ratio` for the used
  height**. On the site Tailwind's preflight happens to set `img { height: auto }`
  so the box came out 4:3 anyway; in a page without preflight the same markup
  paints 600×300 instead of 600×450. Found by fixture case I, which is served
  with no framework reset and exercised a cascade the site does not have — and
  was right to. *A design-system rule that works only because of a reset it does
  not own is a rule waiting for someone to change the reset.*
- **The plate is capped at the file's own intrinsic width** (T3). Four live
  covers carry a 667px 4:3 crop — a 4:3 crop cannot be wider than the photograph
  it came from — and would have upscaled 1.151× in the 768px column. Those four
  render 667 CSS px wide and everything else 768; the shape is 4:3 either way.
  The cost, named rather than presented as free: on those four the plate is
  ~101px narrower than the headline block above it.
- **Two blocking gate checks.** `grid-thumb-variant` (R2) and
  `grid-thumb-aspect` (R1 at 15%, stricter than the gate's own 25% defect
  ceiling — `idea-dan-nasihat`'s 1.706 cover sits at 21.8%: inside the ceiling,
  outside the rule).
- **`scripts/gate-grid-pages.sh`** — derives the page list at run time and
  **refuses to report a clean pass over a list it could not build**.
- **The cpl check now skips heading elements.** It fired seven times on live
  category pages against two-line article headlines in a 610px row. The 45–75
  band is about sustained reading of body copy; a headline is scanned. Holding
  editors' titles to it means shortening real headlines to clear a rule that was
  never about them — the shape of a check somebody switches off.

### R2 is an allow-list, and the first version was a deny-list

Written as `low|high|original`, the rule was blind three ways:

1. **The raw-URL fallback.** `resolveCoverSource` ends `low?.url ?? fallbackUrl`,
   and that fallback is an ingested file named `1724000000-tepak-sirih` — none of
   the three. A cover with no variant record would have painted an uncropped
   source-aspect photograph into a hard 4:3 box **with R2 silent**, and R1 only
   catches past 15%: four of the five measured shapes sit under it. The check
   would have passed the exact defect this item exists to close.
2. **The preset names are a database row.** `image-variants.ts` builds variant
   filenames from `adminSettings.image_quality_presets`, editable from the admin
   UI. Renaming `low` retires a deny-list; it cannot retire an allow-list.
3. **Case and extension.** `LOW.webp` and `low.v2.webp` both evade a literal
   match. Neither evades "must begin with `crop-`".

---

## 4. No production write — and the reason is stronger than "avoid a conflict"

UI-15 independently specified the same rendition, **at 768×576, under the same
name**, and had a backfill ready to run. UI-16 had already shipped it at
**792×594 to all 96 published covers**. The dry run reported
`0 to render / 5 already done` and **that surprising number was checked instead
of accepted**.

Overwriting those 96 objects would not merely have fought UI-16's reader. The R2
objects sit under `Cache-Control: immutable, max-age=31536000` at a key whose
`?v=` token encodes **only** the focal point and `GEOMETRY_VERSION` — **neither
moves when a rendition's size changes**. The CDN would have served a mix of 792-
and 768-pixel bytes under identical URLs for up to a year, with the stored
`width` reporting 792 for all of them: an R4/R6 failure with **no visual symptom
and no cheap purge**.

> **A rendition's size is part of its identity, and the version token does not
> carry it — so a size change needs a new NAME, not a re-encode.**

792 is also the better-argued box: exactly 1.5× `MIDSIZE_COVER`'s 528, so the two
rungs are one box at two scales rather than two independent guesses. **This item
consumes UI-16's rendition and spends zero AWS.**

---

## 5. Rung 3 is deliberately absent

UI-16's ladder ends with the full `crop-4x3-article-card` before `low`. This one
stops at `-sm`, because UI-16 measured what the other choice costs. Its first
version fell from the `-md` rendition straight to the full crop and shipped; on
production hours later, **six articles carried 4,742,962 B of cover, a mean of
790 KB on the LCP element — 12.5× heavier than the code it replaced** — with
every rule green, because **a pure byte defect has no rule behind it**.

`.s-card` is a lead plate in a scrolling list, which is where those bytes hurt
most. So this ladder takes the **visible** R2 hit rather than paying up to 1.4 MB
to hide it. Rung 2 (`-sm`, median 17,664 B) is R2-green because it is a named
crop and R5-green because the call site caps the plate to the asset's width.

---

## 6. Review — Claude, not OpenAI

Per the owner directive of 02 September 2026, **`codex-reviewer` was not
dispatched and no OpenAI-backed path was used**. Review was an adversarial pass
by Claude. Nothing silently reached for the OpenAI reviewer.

It caught a defect no gate would have flagged, because the path is unreachable on
today's corpus:

The fallback wrote `width={cover.width ?? 800} height={cover.height ?? 600}` —
**asserting 800×600 for a file it had not measured**, when the resolver returns
null *precisely because* the dimensions are unrecorded. It launders "we do not
know" into "we do know". `low` is 1200×800 on eleven of twelve covers, so the
assertion is wrong by 50% on width. It is the same restatement of the CSS box
that UI-12 S1 removed, reintroduced as a default value.

Worse: `.s-card img` now carries an explicit `aspect-ratio`, which **is** UI-16's
definition of a shaped slot — so `shaped-slot-dims` (R6) would have compared the
declared pair against the real file and gone red. **The fallback would have
failed another item's check on a page this item had just certified.** The element
now declares nothing when it knows nothing, which is explicitly exempt from R6.

*96 of 96 covers carry the rendition, so this was unreachable in production —
which is exactly why it needed review rather than measurement.*

---

## 7. Verification

| check                  | result                                          |
| ---------------------- | ----------------------------------------------- |
| `pnpm typecheck`       | 0                                               |
| `pnpm test`            | **555 passed**, 42 files                        |
| `pnpm ui:gate:selftest`| **431 passed, 0 failed** — both check families  |
| `pnpm build`           | 0                                               |
| `pnpm lint`            | **0** — closes a finding open since Sprint 05   |
| pre-fix live gate      | **40** `grid-thumb-variant`, 0 `grid-thumb-aspect` |
| post-fix live gate     | **0 and 0**, `GATE EXIT: 0`, 80 rows measured   |

Evidence: `sep-02-2026-ui-15-EVIDENCE/`.

### Known-good, not just known-bad

The gate self-test asserts both directions. `tests/ui-layout-gate/fixtures/grid-thumb.html`
carries ten labelled cases; case **D** is the scope written as an assertion — the
article cover's exact shape, outside `.s-card`/`.s-row`, asserted **silent**,
because the article cover figure is fed a different rung on purpose and a check
that fired there would be red on a correct page from its first run.

---

## 8. Merge reconciliation — 72 commits, four conflicts, one that mattered

Master moved 72 commits while this item was in flight (UI-16, UI-19, UI-20,
PLAT-16, DES-15, COPY-01).

**The dangerous conflict was in `scripts/ui-layout-gate.mjs`.** UI-15's R1 check
ended with `if (!img.matches(GRID_THUMB_SELECTOR)) continue;`. That was safe
while it was the **last** thing in the image loop. UI-16's `shaped-slot-variant`
and `shaped-slot-dims` then merged in **above** it. Had the `continue` survived
in its original position it would have **skipped R2 and R6 for every image that
is not a grid thumbnail** — silently retiring two blocking checks on the article
cover, the exact slot UI-16 shipped them for — while every self-test that does
not render an article cover stayed green.

The scope test is now a **condition on the `if`**, so the loop body has one exit
and a later check cannot be orphaned by position. *This is the second time in one
item that a merge nearly produced a check that measures nothing while reporting
success.*

Also: UI-15's duplicate `ARTICLE_CARD_MD` string is deleted in favour of
`ARTICLE_COVER_MD.NAME`, discharging its own note that whichever item merged
second should do exactly that. **A test now asserts the key is defined once** and
that `responsive-cover.ts` does not restate it.

---

## Retrospective

### What we learned that is not written down

**1. A rendition's size is part of its identity.** The `?v=` token encodes the
focal point and `GEOMETRY_VERSION`, and neither moves when a rendition's box
changes — under `immutable, max-age=31536000` that makes a re-encode at a new
size a year-long, symptomless cache poisoning. Two items independently specified
the same key at different sizes on the same day. **This was one command from
happening and nothing in the codebase said not to.**

**2. A gate check's correctness depends on its POSITION in the loop, and merges
move it.** An early `continue` is a local decision that becomes a global one the
moment someone appends a check below it. Both this item and UI-19 hit the same
class of defect in the same file in the same sprint.

**3. A rule that cannot see a defect is worse than a missing rule**, because it
reports 0. R1 read 0.0% on five differently-shaped plates. The gate was green and
the page was wrong.

### What we did twice

- **Specified the same rendition twice** — UI-15 and UI-16, same name, same day,
  different sizes. Caught by a dry run's surprising number, not by a gate.
- **Nearly orphaned a check by merge position twice** — once in this item's merge
  with UI-16, and UI-19 reported the same shape against UI-16's checks.
- **Measured the page count three times** because the sitemap moved under the
  measurement — the third repetition of a pattern DES-18 and UI-13 both recorded.

### What we nearly shipped, and what caught it

| nearly shipped | caught by |
| --- | --- |
| Overwriting 96 live R2 objects at the wrong size | a dry run reporting `0 to render / 5 already done`, and someone checking a surprising number |
| A `continue` that would silently retire UI-16's R2 and R6 checks | reading the merge conflict instead of accepting either side |
| Asserting `800×600` for an unmeasured file, failing UI-16's R6 | the Claude adversarial review pass — no gate could reach it |

### Which document must change, and who owns the edit

**File: `docs/design/hero-image-rules.md`** · **Owner: Design Systems Engineer**

R1–R8 describe boxes, assets and upscales. **Nothing in them says a rendition's
NAME is immutable with respect to its SIZE.** UI-16 wrote that warning into
`midsize-cover.ts`'s doc comment, where only someone already editing that file
reads it — and UI-15 was not editing that file when it specified a conflicting
768×576 under the same name.

**Prose rules do not fire, so the edit is a gate, not a paragraph.** Shipped in
this item:

`src/lib/storage/__tests__/card-source.test.ts` now asserts the rendition key is
**defined exactly once** in the tree and that `responsive-cover.ts` imports it
rather than restating it. A second module re-declaring the string fails the test
suite. That closes the "two definitions" half.

The remaining half — *changing a rendition's WIDTH without changing its NAME* —
is **not yet gated and is recorded here as open**, because closing it properly
means comparing the spec's `WIDTH`/`HEIGHT` against what is stored in R2 for the
same key, which is `scripts/audit-cover-rendition.mjs`'s territory (UI-16's) and
not something to bolt on from this item without its owner. **Named rather than
quietly left**: the next person to touch `COVER_RENDITIONS` should add a check
that a spec's dimensions have not moved since the objects were written.

⚠ **No persona edit was made.** `.claude/agents/` is gitignored by design and an
edit there reaches nothing; persona edits belong in
`~/Documents/Code/buddy/skillcentral/agents/projects/hellokahwin/`. Nothing in
this item's learnings is persona-shaped — all three are repo facts, and two are
now gates.

---

## Where the work landed

| what | branch | why |
| --- | --- | --- |
| `src/`, `scripts/`, `tests/`, `package.json` | **`master`** | site source |
| `docs/design/card-thumbnail-image-rules.md` | **`master`** | already tracked on `master`; it is the site's binding art direction, not a boardroom record |
| this entry + `sep-02-2026-ui-15-EVIDENCE/` | **`master`** | see the correction below |

### The brief's `docs/` rule, and why this did not follow it literally

The brief states *"Anything under `docs/` → `feat/command-centre-dashboard`"*.
Tested by content rather than by path, that is wrong for `docs/work-done/`, and
**UI-20 already established this and wrote it down** — `docs/work-done/README.md`
says so in its own "Which branch" section. Confirmed independently here rather
than taken on trust: `origin/master` carries **455 files** under
`docs/work-done/`, including this session's entries for **UI-19, UI-20 and
PLAT-16**. Filing this entry on the docs line would have put it where no reader
of the other four items would look.

This item adds nothing new to that finding except a fourth confirmation. **The
open action is unchanged and still belongs to the CEO: narrow the rule in the
brief template to `docs/boardroom/`,** because agents keep re-deriving it from
scratch — this is the second sprint in which it has had to be argued.

**No PR was opened into `feat/command-centre-dashboard`.**

### Closing a finding this role already owned

UI-19 raised, and UI-13 raised before it, that **`pnpm lint` is red on `master`**
on three files — owner `design-systems-engineer`, marked *"still OPEN, second
sprint"*. That is this role's finding, so it is closed here rather than reported
a third time:

- `docs/design/card-thumbnail-image-rules.md` — this item's own file, formatted.
- `scripts/measure-above-fold-bytes.mjs` — formatted.
- `src/lib/storage/__tests__/midsize-cover.test.ts` — formatted.

Formatting only; no logic touched. **This is not part of UI-15's DoD** and is not
counted toward it — it is a two-sprint-old finding assigned to this role that
cost one command.

⚠ **The underlying gap is NOT closed and is still open**: there are four gate
workflows and **none that runs `pnpm lint` or `pnpm test`**, which is why these
three files went red on `master` unnoticed in the first place. Formatting them
fixes today's red; it does not stop tomorrow's. **Owner: CEO / platform**, since
adding a CI job is not this item's to add unilaterally.
