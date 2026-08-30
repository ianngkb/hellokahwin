# UI-06 — A rendered-layout gate that reads computed values, and that has been watched failing on the real 44px column, the real 1,970px nav, and on itself — 31 Ogos 2026

**Session:** aug-30-2026-session-01 · **Owner:** design-systems-engineer · **Status:** completed, merged, running
**Plan:** [aug-31-2026-brief-ui-06.md](../../plans/aug-30-2026-session-01/aug-31-2026-brief-ui-06.md)
**Audit this follows:** [aug-31-2026-audit-ui-desktop-mobile.md](../../plans/aug-30-2026-session-01/aug-31-2026-audit-ui-desktop-mobile.md)

**Shipped:** PR [#19](https://github.com/ianngkb/hellokahwin/pull/19) merged as
`a7ae51f`, PR [#21](https://github.com/ianngkb/hellokahwin/pull/21) merged as
`c2215ba`, both merge commits on `master`.

| Artefact | Path on `master` |
|---|---|
| The gate | `scripts/ui-layout-gate.mjs` |
| Its own regression suite | `--selftest`, 59 assertions |
| Known-bad input | `tests/ui-layout-gate/fixtures/2026-08-31-pre-ui-fix/` |
| Discriminator fixture | `tests/ui-layout-gate/fixtures/discriminator.html` |
| Green control | `tests/ui-layout-gate/fixtures/green-control.css` |
| CI | `.github/workflows/ui-layout-gate.yml` — `gh workflow list` → **UI layout gate · active · 346059333** |
| How to read any of it | `tests/ui-layout-gate/README.md` |

```
pnpm ui:gate:selftest                        # 59 assertions; blocking in CI
pnpm ui:gate:fixtures                        # the pre-fix capture; exits 1
pnpm ui:gate --base https://hellokahwin.com  # every public template, 4 widths
```

Prints `UILINT EXIT: <n>` at the start of a line and exits with it.

---

## What it checks, and the rule each one actually applies

Four thresholds came from the tracker. The fifth came from UI-04.

| # | Check | Fails when |
|---|---|---|
| 1 | `narrow-text-column` | text occupying **≥ 2 line boxes** sits in a block under **120px** |
| 2 | `viewport-overflow` | an element is painted past the right edge of the viewport |
| 3 | `image-upscale` | an image is painted at more than **1.1×** its decoded pixels |
| 4 | `image-aspect` | rendered aspect is more than **25%** from the decoded source's |
| 5 | `clipped-text` | a string is truncated by its own box |

**The two-line clause in check 1 is the entire discriminator and it is
load-bearing.** A single line of text in a 44px box is a label — a rank number,
a badge, a date. Text that *wraps* in a 44px box is a column, and a 44px column
is broken. That is what lets the gate flag the homepage and leave the article
page alone, which is the property the negative control exists to enforce.

Check 2 carries one deliberate exemption, and its shape changed once during this
item (see the retrospective). The nearest ancestor that decides the fate of the
overflow answers the question: if it **clips** and sits inside the viewport,
nothing is painted past the edge and check 2 says nothing — the lost text is
check 5's, reported in pixels. If it **scrolls** and sits inside the viewport,
the overflow is exempt below 1024px, because a swipeable rail is a legitimate
mobile pattern, and not exempt at or above it, because a mouse has no swipe and
this site hides its scrollbar.

### What it will never report, because measurement killed it first

§3 of the CEO's audit disproved five candidate findings. Two would have sent
someone to fix something that was working. They are **designed out**, not
filtered afterwards:

- Lazy images reporting `naturalWidth: 0` — every page is scrolled end to end
  and given time to decode; anything still at 0 is **counted and printed as
  skipped**, and can never become a violation. On the pre-fix homepage that
  count is **0 of 13** at all four widths, so the exclusion is not hiding
  anything.
- Empty `alt` on a card thumbnail — there is no alt check.
- A centred `h1` sharing its left edge with body text — there is no alignment
  check.
- `order: 3` on the `.s-row` image — there is no `order` check.

---

## Proof it catches the real bugs

The DoD asked for the **current production homepage**. By the time the gate ran,
UI-01 and UI-02 had shipped and that state was gone. The known-bad input is the
CEO's 31 Ogos capture, copied into the repo **byte for byte** —
`homepage.html` sha256 `0c80c2c948a2e279…`, verified against the index with
`git cat-file -p :<path> | sha256sum`, and pinned with `.gitattributes` so
Windows checkouts cannot rewrite the line endings out from under the hash.

**The three CSS chunks and four `woff2` faces are vendored beside the HTML.**
Without them the capture is inert: the 44px column does not exist until
`@media (min-width:1024px)` applies `grid-template-columns: 44px minmax(0,1fr)
176px`. Content-hashed chunks stop being served once the deployment that made
them is superseded, and that happened the same afternoon.

`pnpm ui:gate:fixtures` — exit **1**:

| | @390 | @768 | @1024 | @1440 |
|---|---|---|---|---|
| `homepage.html` narrow-text-column | 0 | 0 | **13** | **13** |
| `homepage.html` viewport-overflow | 0 | 0 | **5** | **4** |
| `homepage.html` image-upscale | 0 | 0 | **12** | **13** |
| `homepage.html` image-aspect | **13** | **13** | **1** | **1** |
| **`article.html` narrow-text-column** | **0** | **0** | **0** | **0** |
| `category.html` narrow-text-column | 0 | 0 | 0 | 0 |

What it says, in its own words:

```
narrow-text-column ×13
  44.0px column, 9 lines, box 44x246px (floor 120px)
    a.s-row > div > h3.t
    "Adat hantaran kahwin ikut keluarga: bila dua senarai bertembung"
viewport-overflow ×4
  right edge 2065.5px in a 1440px viewport (element 1969.5px wide, 625.5px past)
    div.overflow-x-auto.px-2 > div.flex.min-w-max.justify-start
  right edge 1753.9px in a 1440px viewport (element 214.2px wide, 313.9px past)
    "Venue, Kos & Perancangan"
image-upscale ×13
  1.20x — 1200x1800 decoded, painted 1440x600 (object-fit: cover, ceiling 1.1x)
image-aspect ×1
  260% off — source 0.67:1 (1200x1800), painted 2.40:1 (1440x600),
  ~28% of the frame kept (ceiling 25%)
```

**1,969.5px against the CEO's 1,970px. ~28% of the frame kept against the
CEO's ≈28% visible.** Two instruments, two operators, the same numbers.

### The negative control holds — for the check it exists to discipline

`article.html` reports **zero** narrow-text-column violations at every width.
The same `.s-row` component with its rank number present renders a correct
44 × 26px `01`, and a check that flagged it would be matching on the wrong
thing.

**One thing a reader should know before reading any other row of that file.**
The `<header>` element is **byte-identical in all three fixtures** — 9,910
bytes, sha256 `482784ef8bc43159…`, verified. The 1,970px nav rail is therefore
present on the negative control *by construction*, and any correct overflow
check reports it on all three files. That is a property of the capture, not of
the check, and I am not going to relax a true positive to make a page look
clean. `article.html` also carries its own upscaled cover (655px decoded into a
768px box, 1.17×). The control disciplines the `.s-row` check. It was captured
for that, and for that it is exact.

## Proof it passes on the fixed build

Same three templates, live, after UI-01 and UI-02 deployed:

| check | pre-fix capture | live, fixed |
|---|---|---|
| narrow-text-column | **26** | **0** |
| viewport-overflow | **27** | **0** |

Both to zero across all twelve page × width combinations. The image checks are
unchanged at 28 and 30, because the hero was never in UI-01's or UI-02's scope.

And the whole gate reaching **exit 0** is demonstrated, not hoped for:
`--fixtures --green --only category.html` injects **one** override rule
(`header .min-w-max { min-width: 0 }`, released so the rail wraps) and the page
goes to **0 violations at all four widths**, `UILINT EXIT: 0`. That rule is a
measurement control, not a proposed fix, and it should not be cited in a design
decision.

## The gate's own regression suite — 59 assertions

A gate proven only against known-bad is half-proven: **a check that flags
everything also fails on known-bad.** `--selftest` asserts each check both
**fires** where the defect is and **clears** where it is not, against the
capture and against `discriminator.html`, a hand-built page with a true positive
next to a plausible false positive for every check. **Fourteen labelled cases;
seven must produce exactly nothing.**

Green on Linux in CI, quoted from the run rather than from its tick:

```
PASS  homepage.html @1024: a 44px column is among them (widths seen: 44)
PASS  homepage.html @1440: viewport-overflow fires on the nav rail
      (furthest right edge 2138.9px)
PASS  article.html @1440: narrow-text-column CLEAN — the 44x26px "01"
      rank cell is a label, not a column
PASS  discriminator @1440: image-upscale = 1 (G at 2.0x; H is 1.0x under
      cover and I is 1:1) — got 1
PASS  GREEN CONTROL category.html @1440: 0 violations (got 0)
59 passed, 0 failed
UILINT EXIT: 0
```
— [run 33328888406](https://github.com/ianngkb/hellokahwin/actions/runs/33328888406)

Note the nav's right edge: **2138.9px on the Linux runner, 2065.5px on Windows
Chrome.** Text metrics differ between platforms, which is why the assertions
test relationships and not remembered pixel values.

---

## The fifth check, and the two ways it was wrong first

The brief said the four thresholds were a starting set and to add anything that
would have caught something UI-04 found. UI-04 found two defects of exactly the
same class — invisible to every structural check we own:

- `/artikel` card labels: **181px of text in a 171px box**, 9 of 11 clipped, on
  a phone.
- The photo credit: a fixed **200px** box throwing away **40%** of its string
  at 1440px.

`clipped-text` reports both, scoped to the truncation idiom exactly
(`text-overflow: ellipsis`, or `overflow-x: hidden|clip` with `white-space:
nowrap`), so clipping wrappers and deliberate vertical line-clamps stay out.
Identical labels collapse to one entry **with a count**, because a report that
said "1" where nine cards clip would understate a defect ninefold:

```
clipped-text ×1
  10px of text hidden — needs 181px, box is 171px (6% of the string), in 9 places
```

That is UI-04's measurement, reproduced by a different instrument. It also found
the same clip in **6 places on the tag archive**, which UI-04 did not measure.

**Deliberately not here, and named rather than left silent:** tap targets under
24 × 24 (UI-11), missing `:focus-visible` indicators (UI-09), and 104-character
lines at 1440 (UI-10). The first two are WCAG conformance and want a different
report shape; the third is a measure the creative director sets, not a defect
threshold. All three are real and all three are owned.

---

## Coverage, stated rather than implied

Six public templates are gated at four widths: homepage, catalogue index,
category archive, article, tag archive, brand page. **Two are not, and the gate
prints both every run under `NOT COVERED`:**

- **`/artikel/author/[slug]` has no reachable instance.** Measured: no page on
  the site links to an author archive, articles carry
  `"author": {"@type":"Organization"}` rather than a person, and four probed
  slugs returned 404. `--author-slug <slug>` gates it the day one exists.
- **`/[slug]` renders no template.** It is the legacy WordPress resolver and
  301s.

## Every result carries the build it was measured against

```
homepage /
  200 HIT age=274 sin1::vrg2t-… css=[fbc0e6fba65a1ae7.css a21d9bc70c9be05f.css 0b7b6677a7ad9134.css]
category archive /artikel/hantaran-mas-kahwin
  200 HIT age=4 sin1::pcl2x-… css=[354a3ebb2207e017.css a21d9bc70c9be05f.css 0b7b6677a7ad9134.css]
```

Two runs twelve minutes apart disagreed about the nav on three pages. Nothing
was flaky: UI-01 and UI-02 deployed between them and the edge was serving a mix
of old and new HTML. The fingerprint is why that reads as a deploy rather than
as an unreliable instrument — and the run above shows two different CSS chunks
across pages at the same moment, so the mixing is still happening and is now
visible.

## What the gate says about production right now

`pnpm ui:gate --base https://hellokahwin.com` — exit **1**, and every remaining
violation is a known open item, not a new one:

| check | count | what |
|---|---|---|
| narrow-text-column | **0** | UI-01 fixed it |
| viewport-overflow | **0** | UI-02 fixed it |
| clipped-text | 1 (×9 places) | `/artikel` labels — UI-07, merged, edge still mixed |
| image-upscale | 25 | card thumbnails painted 176×132 from a 176×117 source, **1.13×** |
| image-aspect | 31 | the same thumbnails, and the article cover at 1024/1440 |

**The card thumbnail is a finding this item does not own and will not quietly
absorb.** A 176 × 117 source in a 176 × 132 frame is a 1.13× vertical stretch on
every card on the front page, and on a phone the same source goes into an 80 ×
80 square — 34% off its aspect, a third of the photograph discarded. That is
either an art-direction decision the creative director should take deliberately
or a variant that should be generated at the frame's aspect. **It is not a
reason to move the 1.1× or 25% thresholds**, which are the item's DoD.

---

## Corrections after shipping — three of them, and the gate was wrong twice

Three measurements arrived from other seats after PRs #19 and #21 merged. Each
was re-verified here before being acted on; two of the three found the gate
wrong. PR [#30](https://github.com/ianngkb/hellokahwin/pull/30), merged
`af7d21f`.

### 1. The upscale check could not fire at 390 or 768 — `img.naturalWidth` is not the file

UI-03 measured it on production; I re-verified it on this repo's own fixture,
whose hero file is **1200 x 1800**:

| viewport | `img.naturalWidth` | detached probe on `currentSrc` | ratio from naturalWidth |
|---|---|---|---|
| 390 | **390 x 585** | 1200 x 1800 | **1.000** |
| 768 | **768 x 1152** | 1200 x 1800 | **1.000** |
| 1024 | 1200 x 1800 | 1200 x 1800 | 0.853 |
| 1440 | 1200 x 1800 | 1200 x 1800 | 1.200 |
| 1920 | 1200 x 1800 | 1200 x 1800 | 1.600 |

On a `srcset` carrying `w` descriptors the spec divides `naturalWidth` by the
candidate's derived pixel density, so `box.width / naturalWidth` is **1.000 by
construction**. At 1024 and above the two columns agree **by coincidence** —
`sizes` happens to resolve to 1200px and the chosen candidate is 1200w, so the
density is 1.0.

**So the check fired correctly at 1440 and was structurally incapable of firing
at 390 and 768** — and this item's own self-test asserted, in these words,
*"homepage.html @390: 13 decoded images, zero upscale violations — the check is
not firing on everything"*. That assertion measured a blind spot and called it
cleanliness. It is the single worst thing in the first version of this gate,
because it is a proof of discrimination that was itself undiscriminating.

The intrinsic size now comes from a detached `Image()` loaded from
`currentSrc` — never `src`, which on a `<picture>` is the fallback and can be a
different crop from the one that rendered. A probe that fails is reported as
`image-unmeasurable`; it is never a pass.

**It cut both ways, which is the part that would not have been guessed.** The 25
"1.13x thumbnail upscales" this gate reported on live production were the same
artefact and are gone. And the trap does not merely hide an upscale, it
**inverts** it: `discriminator.html` case O is a 200x100 file painted 300px wide
— a real **1.5x upscale** that `naturalWidth` reports as **0.21x**, an apparent
downscale, at 1440.

### 2. The nav check was finding two of the three hidden categories

The brief gained a dated addendum after I was handed it, written by this seat
while shipping UI-02. Its measurement, reproduced on my known-bad input at the
1920px width it added:

| verdict | catches |
|---|---|
| `viewport-overflow` (the DoD clause) | **2** — `Venue, Kos & Perancangan` at 1993.9px, `Sebelum Nikah…` at 2305.5px |
| `scroll-container-clip` (the addendum) | **3** — those two, **plus `Pelamin, Kad & Cenderahati Majlis` at 1775.8px** |

`Pelamin` ends **144.2px inside** a 1920px window and is invisible anyway,
because the rail's scroller client box ends at **1592.0px**. The addendum
measured 1775.77px and a 1264px scroller with a different script; the two agree
to a rounding. **1920 is added as a fifth width, never a substitution for one of
the four.**

**The addendum's "unless that ancestor carries a deliberate, visible affordance"
clause is implemented, but not literally, and the argument is measured.** This
site's `EdgeScroller` sets `data-overflow-end` and paints a fade whenever the
rail has more to the right, so a literal reading would have exempted the exact
defect the addendum was written about. On live production, 31 Ogos:

| viewport | `.hk-edge` | scroller |
|---|---|---|
| 390 | `data-overflow-end="true"` | 390 client / 2058 scroll, `overflow-x: auto` |
| 1440 | absent | 1264 / 1264, **`overflow-x: visible`** |

The second row is UI-02's shipped fix, and it is the argument: handed a clipped
desktop rail *with* the fade, UI-02 made the rail wrap rather than rely on it.
So the exemption applies **below 1024 only**, where a swipe reaches the content —
which is also exactly what the addendum's own clause does on the live page,
since the attribute is set at 390. The capture cannot run the JavaScript that
sets it, so exempting a contained rail below the breakpoint reproduces on the
fixture what the clause does on the site. **The affordance state is printed
either way**, so nothing hides behind a judgement call.

### 3. The gate could not fail on a page that rendered nothing

`--empty-shell` serves a real captured page with everything inside `<main>`
removed — header, footer, nav and stylesheets intact. At **390 and 768,
`empty-content` is the only violation produced**, which is the measurement
proving every other check in the file passes on a page containing nothing.

### What was NOT added, and why

- **No headline-height floor.** UI-01 measured a legitimate three-line title at
  **106px** against a broken row's 225–307px, and the row's height is set by its
  **132px** thumbnail rather than by its text (`align-items: start`), so a 100px
  floor would go red on a good row. The DoD's assertion is about **width**,
  where 44 and 412 do not overlap with a wide margin either side.
- **`image-attr-aspect` is ADVISORY and prints as such in the totals.** UI-03
  suggested it with an explicit acceptance condition — add it if it stays clean
  on the negative control — and it does not. `article.html` declares a
  boilerplate `width="1200" height="800"` on **11 of its 51 images**, five of
  them **684 x 1024 portrait** photographs, so the box reserved before load is
  125% wrong. Those are true positives and they are printed in full, but the
  condition I was handed was not met and promoting the check to blocking anyway
  is not a call to make alone. **It should become blocking once the declarations
  are corrected** — that is a finding for a new item, not a threshold to move.
- **No advisory 0.15 aspect band.** The DoD's 25% is the binding number and a
  second threshold with no failure semantics adds noise, not signal.

### Two other seats' work went into the same file, and none of it was dropped

The merge was resolved as a union, verified by running both suites: UI-10's
`reading-measure` check with its 15 assertions still fires 3x on the pre-fix
article at 768 and 1440 and stays silent at 390 and 1024; UI-08's origin and
`<html lang="ms">` precondition — which stops the gate reporting a clean run
over somebody else's login page — is intact, along with `UI_GATE_BYPASS`.
**Self-test: 59 assertions at first ship, 132 now**, green on Linux in CI
([run 33331247381](https://github.com/ianngkb/hellokahwin/actions/runs/33331247381)).

One line was deleted rather than merged: this file's "deliberately not here"
list had excused line length as *"a measure the creative director sets, not a
defect threshold"*. UI-10 set it the same day, which turned the excuse into a
gap, and it is now CHECK 6.

### What the gate says about production after all of it

`pnpm ui:gate --base https://hellokahwin.com`, 30 page × width runs:

| check | count |
|---|---|
| empty-content, narrow-text-column, clipped-text, viewport-overflow, scroll-container-clip, image-unmeasurable | **0** |
| image-upscale | **1** |
| image-aspect | 34 |
| image-attr-aspect | 63 *(advisory)* |

The 25 upscale violations reported before were the `naturalWidth` artefact. What
remains is the card-thumbnail geometry finding already on the board and the
declared-box advisory above.

---

## Retrospective

### 1. What did we learn that is not written down?

**A gate proven only against known-bad is half-proven, and the missing half is
the one that decides whether anyone can use it.** The DoD asked for a
demonstration of failure on a real defect, and that is necessary — but a check
that flags *everything* also fails on known-bad, and it looks identical in the
log. What separates a working check from a broken one is a **paired** assertion:
fires here, clears there, on inputs that differ in exactly the thing being
tested. The self-test is 59 of those pairs, and building it changed two checks.

**A COMFORTABLE number is as suspect as a zero, and harder to notice.** The
zero was caught within hours. The `1.000` was not: `box.width / naturalWidth`
returned exactly 1.000 at 390 and 768 and looked like a clean page, and the
self-test then *asserted* that zero as proof the check discriminated. A number
that sits precisely on the boundary of "nothing to see" deserves the same
suspicion as an absence — and `1.000` to three decimal places, at two widths, on
thirteen images, was a value produced by arithmetic rather than by the page.

**A zero is a claim about your condition until it has been run against a
positive somebody else measured by hand.** The clipped-text check returned
**zero** on `/artikel`, the exact page where UI-04 had counted **nine** clipped
labels four hours earlier. The label is a `<p class="truncate">` wrapping an
`<a>`; the text was one node deeper than the condition reached. The number was
wrong and looked completely calm. Nothing but the cross-check would have found
it — I already had the "verify the check when it returns a surprising absence"
rule and it still took a hand-measured positive to fire.

**A rendered measurement belongs to a build, not to a URL.** Production changed
under this item three times in one afternoon. Two runs twelve minutes apart
disagreed about the nav on three pages, and my first instinct was that the gate
was flaky. It was not: UI-01 and UI-02 had deployed. Without the deployment id,
the cache state and the CSS chunk hashes printed beside every result, a true
finding is indistinguishable from an unreliable instrument — and the instrument
is the one that gets blamed.

### 2. Which document must change, and who owns the edit?

Two files, both mine, both edited in this item:

1. **`skillcentral/agents/projects/hellokahwin/Design/design-systems-engineer.md`**
   — the seat that will build the next gate. Two rules added, both shaped as
   things that fire rather than things to remember, and deployed to
   `.claude/agents/` with the diff verified, because a persona edit that is only
   committed reaches nobody.
2. **`docs/boardroom/ceo-memory.md` § Measurement rules** — the file every seat
   reads before measuring anything. One rule: a rendered measurement without its
   deployment fingerprint is not a measurement.

**And the form matters more than the words.** The durable version of lesson one
is not prose at all — it is `--selftest`, blocking in CI on every push and PR,
which fails the moment a check stops discriminating. Sprint 03's finding was
that prose rules do not fire and scripts do; this lesson took the script form
and the prose is only the pointer to it.

### 3. What did we do twice that we should never repeat?

**Trusted a browser API to mean what its name says, twice in one file.**
`naturalWidth` is not the natural width of the file, and `innerWidth` is not the
width available for layout — both were wrong here for the same reason, that the
name describes the intent and the spec describes something narrower. The second
one was already written down in `scripts/measure-nav-overflow.mjs`, in this
repo, on `master`, when I wrote `window.innerWidth`. Reading the neighbouring
rig before writing a new one would have cost ten minutes.


**Ran the live gate four times without being able to tell a code change from a
flaky check.** Three of those runs are now unattributable: I did not record what
was deployed when they ran, so their numbers cannot be tied to a build and are
worth nothing as evidence. That is the second time this project has produced
numbers that were individually correct and collectively unreadable — the FCP /
cache-state finding in UX-04 was the first. Fixed in the tool, not in a habit:
the gate now prints the deployment id, cache state and CSS hashes with every
result, and there is no flag to turn that off.

### 4. What did we nearly ship, and what caught it?

**A blocking CI check that could not fail.** `node … | tee gate.log` reports
`tee`'s exit status. On its very first run the job went **green** while the gate
printed `UILINT EXIT: 1` with one assertion failed
([run 33328162507](https://github.com/ianngkb/hellokahwin/actions/runs/33328162507)).
A green tick that means nothing is the precise shape of the thing this whole
item exists to prevent, and it was in the item itself. Caught by reading the
run's log instead of its status — the rule this company already wrote down after
a 200 that rendered zero articles. `set -o pipefail` on both steps.

**A gate that reported an invisible element as painted past the viewport
edge.** The overflow check treated `overflow-x: hidden|clip` as never exempt,
conflating "this text is unreachable" with "this is painted off-screen" — two
defects with two different fixes. Caught by the gate's own self-test **on
Linux**, where wider system fonts made a 408px inline `<a>` inside a 120px
clipping box report as 30px past a 390px viewport. The same element is 38px
narrower under Windows text metrics, so it fitted, and every local run passed.
Case N in the discriminator fixture now pins it with a fixed 2000px box that
cannot depend on a font.

**A false positive on the first production run: `h1.sr-only` reported as a 1px
text column.** Screen-reader-only text hides through `clip-path: inset(50%)` in
a 1×1 box, which no `display`/`visibility`/`opacity` test sees. That is exactly
the noise that gets a gate switched off in its first week. **The threshold was
not touched; the visibility test was.**

**An upscale check that could not detect an upscale at two of its five
widths, and a self-test that certified the blind spot as proof of correctness.**
Caught by UI-03 measuring `naturalWidth` against a detached probe on production,
relayed, and re-verified here on a fixture whose answer was already known. This
is the most serious near-miss in the item: not a check that was noisy or a check
that was silent, but a check that was silent *and had a green assertion saying
its silence was meaningful*. Nothing inside this item would have found it,
because every input it had agreed with itself.

**A nav check that found two of the three hidden categories, and looked red
either way.** Caught by the brief's own dated addendum — which I only saw
because I was told to re-read a document I had already read. Two of three still
shows up as a failure, so there was no signal to notice.

**A provenance claim that would have been false on anyone else's machine.**
`core.autocrlf` is on, and git would have rewritten LF to CRLF in every captured
fixture on checkout, so the sha256 hashes printed in the README — the whole
basis for "this is the CEO's capture, byte for byte" — would have failed for a
reason with nothing to do with provenance. Caught by reading the
`LF will be replaced by CRLF` warning instead of scrolling past it.
`.gitattributes` pins the fixture tree with `-text`.
