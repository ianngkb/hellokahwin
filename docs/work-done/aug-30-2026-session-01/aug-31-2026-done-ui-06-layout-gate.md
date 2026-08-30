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

## Retrospective

### 1. What did we learn that is not written down?

**A gate proven only against known-bad is half-proven, and the missing half is
the one that decides whether anyone can use it.** The DoD asked for a
demonstration of failure on a real defect, and that is necessary — but a check
that flags *everything* also fails on known-bad, and it looks identical in the
log. What separates a working check from a broken one is a **paired** assertion:
fires here, clears there, on inputs that differ in exactly the thing being
tested. The self-test is 59 of those pairs, and building it changed two checks.

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

**A provenance claim that would have been false on anyone else's machine.**
`core.autocrlf` is on, and git would have rewritten LF to CRLF in every captured
fixture on checkout, so the sha256 hashes printed in the README — the whole
basis for "this is the CEO's capture, byte for byte" — would have failed for a
reason with nothing to do with provenance. Caught by reading the
`LF will be replaced by CRLF` warning instead of scrolling past it.
`.gitattributes` pins the fixture tree with `-text`.
