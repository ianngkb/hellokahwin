# UI-19 — Finish the article rail: SUMBER under the CEO ruling, and the two ways the rail can go quiet

**Sprint 06 — _Deepen where the click is_** · `design` · 8 points ·
owner `design-systems-engineer` · 02 September 2026
**Integration branch: `master`** (site space). Nothing in this item touches the
docs line.

**Reviewer: Claude.** No OpenAI-backed reviewer was dispatched — `codex-reviewer`
was not invoked, `/autopilot`'s default reviewer was not reached, and review was
an adversarial self-pass driven by the gate's own paired assertions. Owner
directive, 02 Sept 2026.

---

## What was already true when this item started, and what was not

The rail itself, the `Sumber` block and the 390px stack all shipped with UI-17
and **measure correct on production today**. Reading the DoD as a build item
would have meant rebuilding what already works. Measured before touching
anything (`00-rail-baseline-before.txt`):

```
/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri @1440
  body   left 120  right  876  width 756
  rail   left 940  right 1240  width 300
  VERDICT rail.left 940 >= body.right 876   gap 64px
  counts {"rail":1,"rekod":1,"toc":0,"sumber":1,"h1":1}
RAIL EXIT: 0
```

What did **not** exist is a check that fails when any of that stops. That is the
whole of UI-19's remaining scope, and it is the half of the DoD that had no
instrument behind it.

### Why UI-06's check 10 could not answer the DoD's question

`rail-collapsed` (check 10, UI-17) asks a **relationship**: is the rail right of
the body. It is deliberately **silent when there is no rail**, because a "rail
missing" verdict from a check that runs on seven templates fires on the
homepage, the catalogue and `/brand`. That silence is correct for check 10, and
it is exactly the hole the DoD names:

| Failure shape | check 10 |
| --- | --- |
| rail in column 1, stacked on the body | fires — this is what it is for |
| rail `display:none` | fires **by accident** — a zeroed rect has `left` 0, which is left of the body |
| rail keeps its grid placement and collapses to a sliver or to zero height | **silent** — `rail.left` is still 940 |
| no `[data-hk-rail]` on the article at all | **silent by design** |

Two of the four are the shapes "the rail collapses without SUMBER" actually
takes, and one of the two it does catch, it catches for the wrong reason.

---

## What shipped

> **They are 15 and 16, not 13 and 14.** This item built them as 13 and 14 and
> UI-16 merged first with its own 13 and 14 — `shaped-slot-variant` and
> `shaped-slot-dims`. Renumbered here rather than there: theirs was on `master`,
> and the later branch is the one that moves. The check NAMES never collided,
> which is the argument for a log keyed on names; the ordinals exist only for
> the prose that describes them and are the part that two branches can both
> claim.

### Check 15 — `rail-missing`

Gated on `.hk-article-grid`, the article template's own container. That is what
lets it speak about **absence** where check 10 cannot: enumerated across `src/`
on 02 Sep 2026 it has **one render site**, and it appears in **none** of the
five pre-UI-19 fixtures, so the check is structurally incapable of firing on the
homepage, the catalogue or `/brand`. Asserted silent on all five, at all five
widths.

It fires when the article template renders its grid and there is no rail in it,
or when the rail is `display:none`, `visibility:hidden`, under a **240px** width
floor, or under 1px tall.

**The 240px floor is not the specification, on purpose.** DES-03 §5.1's 300px
stays in `scripts/measure-article-rail.mjs` R2, which runs against the article
template specifically and is the right home for a design figure. 240 sits under
both real widths — 300 in the desktop column, 350 in the body column on a 390px
phone — and far above what a collapse produces, so it separates *gone* from
*there* without giving a design number a second home to drift between.

### Check 16 — `sumber-empty`

Enforces the CEO ruling rather than a layout rule: `Sumber` renders where
sources exist and nowhere else. It fires when a `Sumber` heading **inside the
rail** has nothing under it, asserted twice — from the text residue, and from
the box (`block.height - heading.height <= 1px`), so a list whose items exist
and paint nothing is caught too.

**It is keyed on a heading in the rail, never on the word.** The committed
fixture `unsourced-ok.html` is why: that real production page carries `Sumber`
**twice** — once in the rail as a contents link `<a href="#sumber">Sumber</a>`,
and once in the prose as `<h2 id="sumber">Sumber</h2>` with a genuine reference
list under it — and has no rail `Sumber` block at all. A check keyed on the word
fires there twice, on a page that is completely correct. The check reports
`sumberSections = 0` on it, which is what makes that zero readable rather than
merely absent.

### Four committed fixtures, and the one-property claim proved rather than stated

`scripts/capture-rail-fixture.mjs` (`pnpm ui:rail:capture`, and `--verify` to
re-fetch and compare without writing) takes two real production pages, one from
each side of the CEO ruling, and derives one known-bad input from each by a
**single contiguous deletion**.

| File | bytes | fires |
| --- | --- | --- |
| `unsourced-ok.html` — `…/ucapan-doa/doa-makan-majlis` | 117,910 | nothing |
| `unsourced-rail-absent.html` — the above minus `<aside data-hk-rail>`, 8,065 bytes at 21015..29080 | 109,845 | `rail-missing` ×1 |
| `sourced-ok.html` — `…/hantaran-mas-kahwin/hantaran-wajib-atau-adat` | 136,981 | nothing (on 15 and 16) |
| `sourced-sumber-empty.html` — the above minus the `<li>` citations, 320 bytes at 24053..24373 | 136,661 | `sumber-empty` ×1 |

`sourced-ok.html` is one of only **7 of 92** live articles carrying Rekod, the
contents list and Sumber together, which is why it is here — see the R3 finding
below.

**The diagonal is the point**, measured at all five widths
(`03-gate-rail-fixtures.txt`):

```
unsourced-ok.html            railgone:0  sumber:0
unsourced-rail-absent.html   railgone:1  sumber:0
sourced-ok.html              railgone:0  sumber:0
sourced-sumber-empty.html    railgone:0  sumber:1
```

Both bad files are article pages with something wrong in the rail. A check that
had drifted into *"something is wrong with this rail"* would fire on both and
look perfectly healthy from a failing run alone. The **off-diagonal zeros** are
what prove these are two checks and not one wearing two names.

---

## A FIX IS NOT VERIFIED UNTIL IT IS RUN AGAINST THE FAILING CASE — three times this item

### 1. My own one-property assertion failed, and it was right to

The first version derived the deleted range by longest common prefix + longest
common suffix and asserted the range **started with** `<aside data-hk-rail=`. It
failed on a correct pair:

```
FAIL  …and that range is the whole <aside data-hk-rail> element, open tag to close
        range starts "aside data-hk-rail=\"true\" class=\"hk-rail" ends "side></div></aside><"
```

A longest-common-prefix boundary is **ambiguous whenever the deleted text and
what follows it share a leading byte**. Both continue `<`, so the prefix ran one
byte into the deletion: the right 8,065 bytes, shifted by one. The byte count
was never wrong; the claim about where the range *starts* was not derivable that
way.

Replaced with a splice: locate the element with the capture script's **own** cut
function — imported, not re-implemented, so the two cannot drift into
disagreeing about what was removed — remove it from the control, and require the
result to equal the committed bad file **byte for byte**. An exact claim with no
boundary to be ambiguous about.

```
rail   splice==bad: true  bytes 8065
sumber splice==bad: true  bytes 320
```

312 of 314 assertions passed on that run. The two that failed were both mine and
both correct.

### 2. A zero on all 92 articles that was a claim about my check

The first corpus census reported **0 rail blocks, 0 contents blocks, 0 Sumber
blocks on every one of 92 articles** — for markup a browser had measured twenty
minutes earlier. Enumerating what was actually there (`data-hk-rail` ×6,
`hk-rail-block` ×10) rather than testing for what I assumed, then reading the
bytes of my own source line, found it: a `\\?` in the regex string had lost a
backslash pair on the way into the file and become a literal `?`, so the pattern
required `data-hk-rail-block=?"rekod`. Rewritten as plain `indexOf` with no
escapes at all — `scripts/audit-article-sources.mjs` carries the incident and the
rule.

### 3. The fixture that was measured in a fallback face

The first capture vendored **one** `woff2`, not four. The stylesheet writes
`url(../media/…)` relative to `/_next/static/chunks/`; the pattern looked for
the absolute `/_next/static/media/…` shape the HTML uses in its single
`<link rel=preload>`. The three unmatched faces would have been served as an
empty 200 and **every text geometry in the fixture would have been a fallback
stack nobody sees**. Fixed by resolving each `url()` against the stylesheet's own
URL. All four are now vendored and were compared with `cmp` against the
`2026-09-01-pre-rail/` set — identical, checked rather than assumed.

---

## Production measurement — the DoD, at 1024/1440/1920 and at 390

Run with `pnpm ui:rail --base https://hellokahwin.com`. Full output in
`02-rail-production-after.txt`; build fingerprints are printed per target and
there is no flag to turn that off.

Five articles, spanning both sides of the CEO ruling and both ends of the
corpus by length. **`RAIL EXIT: 0`, 0 violations, 10 observations** (every one of
them `R3-sumber-absent` or `R3-toc-missing`, which are reported and never fatal).
Build fingerprint on every target: `HTTP 200`, `cache HIT`, css
`e754448c3010263a · 19b83a0982f1e330 · ece0345a72e045ca` — the DES-15/UI-20
deployment, not the one this session started on.

### The rail is right of the body, and the gap is the specified one

Identical on all five articles at each width, so one row per width says it all:

| width | body | rail | verdict | gap |
| --- | --- | --- | --- | --- |
| 1024 | 40..620 (580px) | 684..984 (**300px**) | `rail.left 684 >= body.right 620` | **64px** |
| 1440 | 120..876 (756px) | 940..1240 (**300px**) | `rail.left 940 >= body.right 876` | **64px** |
| 1920 | 232..988 (756px) | 1052..1352 (**300px**) | `rail.left 1052 >= body.right 988` | **64px** |

756 + 64 + 300 is DES-03 §5.1's own frame, and at 1024 the container is 944 so
column 1 absorbs the shortfall to 580 while the rail holds 300 — as designed.

### The order, observed whole for the first time

REKOD → contents → SUMBER, by ascending computed `top` at 1440:

| article | rekod | contents | sumber |
| --- | --- | --- | --- |
| `…/hantaran-mas-kahwin/hantaran-wajib-atau-adat` | 266 | 554 | **1126** |
| `…/ucapan-doa/doa-pengantin-baru` | 266 | 554 | **1179** |
| `…/hantaran-mas-kahwin/mas-kahwin-ikut-negeri` | 266 | — | 554 |
| `…/idea-dan-nasihat/garden-wedding` | 266 | 554 | — |
| `…/glamor-eksklusif/grand-hyatt-kuala-lumpur` | 266 | — | — |

The first two are the first time this rig has ever measured all three blocks on
one page — see the R3 finding below.

### One article from each set, as the DoD requires

**Sources exist** — `…/hantaran-mas-kahwin/hantaran-wajib-atau-adat`:
`counts {"rail":1,"rekod":1,"toc":1,"sumber":1,"h1":1}` at every width, SUMBER at
`940..1240 × 300px, inner 268` at 1440.

**No sources** — `…/glamor-eksklusif/grand-hyatt-kuala-lumpur`, the shortest
article on the site: `counts {"rail":1,"rekod":1,"toc":0,"sumber":0,"h1":1}`, and
the rail still measures **`940..1240, width 300, gap 64px`** at 1440 — present,
in column 2, at full specified width, with no `Sumber` heading anywhere in it.
That is both halves of *"the rail still renders and does NOT collapse, and no
empty SUMBER heading is printed"*, from computed geometry rather than markup.
`…/idea-dan-nasihat/garden-wedding`, the **longest** page on the site, is the
same at every width.

### 390px — full width, same reading order

Every present block at `left 20, right 370, width 350` — the body column's own
left edge and width — and the reading order preserved by ascending `top`:

| article | rekod | contents | sumber |
| --- | --- | --- | --- |
| `hantaran-wajib-atau-adat` | 495 | 777 | **1297** |
| `doa-pengantin-baru` | 523 | 805 | **1347** |
| `mas-kahwin-ikut-negeri` | 360 | — | 642 |
| `garden-wedding` | 468 | 750 | — |
| `grand-hyatt-kuala-lumpur` | 468 | — | — |

### Reading measure — UI-10's 45–75, stated at each width

| width | measure | column | font-size | cpl |
| --- | --- | --- | --- | --- |
| 1024 | inside the band | 580px | 17.9997px | **64.4** |
| 1440 | inside the band | 594px | 18px | **66.0** |
| 1920 | inside the band | 594px | 18px | **66.0** |

Identical on all five articles. 390px measures **41.1 cpl** and is printed, never
asserted, for the reason UI-10 wrote down: a 350px column at any legible size is
about 41 characters, so a floor there would fire on every mobile page on the
site. The formula is the DoD's own `width / (font-size × 0.5)`; that 0.5em
**under-reports by about 8%** against this site's rendered Malay (measured
0.4636em through canvas `measureText`), so 66 by the formula is nearer 71 in
fact — still inside the band, and stated rather than silently corrected.

---

## Findings raised, not taken sideways

### The rail speaks for exactly half the sourced corpus

`pnpm ui:sources`, over all 92 articles, 02 Sep 2026:

```
rail Sumber block rendered            13
body "## Sumber" section              13
both                                   0
the text "Sumber:" anywhere in body   35
sourced by EITHER convention          26
sourced by NEITHER                    66
```

The first two sets are **disjoint**. Thirteen articles — `borang-nikah`,
`syarat-sah-nikah`, `lafaz-akad-nikah`, `rukun-nikah`, `doa-jodoh`,
`cincin-tunang`, `taaruf-maksud`, `lafaz-taklik`, `doa-makan-majlis`,
`doa-selamat-majlis`, `doa-penutup-majlis`, `doa-majlis-pertunangan`,
`ucapan-ulang-tahun-perkahwinan` — show a reader a full reference list in the
body and say **nothing** in the rail. Every one is in P1 Nikah, P3 Ucapan or P7
Sebelum Nikah, which is to say the authority pillars.

Widening `extractSources()` to harvest `## Sumber` sections is a design decision
with a real cost: those entries are full bibliographic references
(*"Jabatan Mufti Wilayah Persekutuan, Irsyad al-Hadith Siri ke-575: Adakah Doa
Sebelum Dan Selepas Makan…"*) and a rail child lays out in a measured 268px. It
also changes what *"where sources exist"* means in the ruling this item ships
under. **Raised with its number rather than taken inside a layout item** — owner:
CEO with editorial and the creative-director.

### `narrow-text-column` reports table cells as text columns on live articles

`hantaran-wajib-atau-adat` fires check 1 **15× at 390 and 6× at 1024/1440/1920**
on production, unchanged by this item: `<td><p>` cells 72.7–117.3px wide in the
article's own comparison table. Verified on the live URL as well as the fixture,
identical counts (`04-gate-live-sourced-article.txt`). Every article carrying a
comparison table therefore fails the gate on a defect nobody introduced.

The fixture keeps it rather than swapping in a tidier article. **Picking the
fixture that hides an existing finding is how a suite starts lying about what it
covers.** It needs either a table-cell exclusion with its own discriminator case
or a mobile treatment for tables — its own item, not a sideways narrowing of
check 1 inside a rail item.

### Two items wrote `docs/work-done/README.md` in the same sprint

UI-20 shipped it first and theirs is the better file — it carries the four
things an entry has to contain, and a "where does this go" table. Mine lost the
merge and was dropped, which is the right outcome; it is recorded here only
because the alternative is a retrospective that claims a closure it did not
make. The finding had been filed three times by three agents (PLAT-19, DES-18,
and this item), which is itself the signal: **a standing rule that names a file
nobody has created will be reported instead of followed, once per agent, until
somebody writes the file.**

### `pnpm lint` is red on `master` today, and nothing in CI runs it

Three files fail `prettier --check` on `origin/master` at `0129797`, verified by
checking out each file's `origin/master` version in isolation:
`docs/design/card-thumbnail-image-rules.md`,
`scripts/measure-above-fold-bytes.mjs`,
`src/lib/storage/__tests__/midsize-cover.test.ts`. None is touched by this item.

This is the same gap UI-13 named and left open to the design-systems-engineer as
a repo-wide decision: **four gate workflows and no workflow that runs `pnpm lint`
or `pnpm test`.** Left open, with this as new evidence that it is not theoretical.

---

## Checks run

| Command | Result |
| --- | --- |
| `pnpm test` | **517 passed, 37 files** |
| `pnpm typecheck` | clean |
| `npx eslint` on the four changed scripts | clean |
| `npx prettier --check .` | 3 pre-existing failures, none in this diff (see finding) |
| `pnpm ui:gate:rail` | `RAIL_FIXTURES_RC=1` — the two controls `railgone:0 sumber:0`, the two derived exactly one each, at all five widths |
| `pnpm ui:gate:selftest` | **`314 passed, 0 failed` · `UILINT EXIT: 0`** — **99** of the 314 are UI-19's (counted, not estimated: lines naming one of the four fixtures or one of the two new checks) |
| `pnpm ui:rail --base https://hellokahwin.com` | `RAIL EXIT: 0` — 5 articles × 5 widths, 0 violations |
| `node scripts/capture-rail-fixture.mjs --verify` | `CAPTURE EXIT: 0` — every file re-derived SAME |
| `pnpm ui:sources` | `SOURCES EXIT: 0`, 92 of 92 fetched |

`.github/workflows/ui-layout-gate.yml` needed no new job — the two checks live
inside `--selftest`, which is already blocking on every push and PR. Its
`timeout-minutes` is raised 15 → 25, because four more fixture pages at five
widths is 20 more page loads on a job whose cost is network-bound, and a timeout
that trips is indistinguishable in the log from a gate that hung.

**That raise was necessary rather than precautionary, and the number says so.**
The blocking job on this PR — run `33551557077`, `ubuntu-latest` — took
**14m17s**. Against the old 15-minute ceiling that is **43 seconds** of headroom,
and it would have tripped on any slower runner.

The CI log carries all 99 of UI-19's assertions, not a tick:

```
PASS  …and splicing the whole <aside data-hk-rail> element, open tag to close out of
      unsourced-ok.html reproduces unsourced-rail-absent.html byte for byte (8065 bytes at [21015, 29080))
PASS  unsourced-ok.html @390: ZERO Sumber sections seen in the rail — the contents link
      and the body <h2 id="sumber"> are both correctly not one
PASS  unsourced-rail-absent.html @390: rail-missing FIRES once — got 1
PASS  unsourced-ok.html @1024: rail-missing CLEAR — production renders the rail (300x1130px, 1 mount)
314 passed, 0 failed
UILINT EXIT: 0
```

(The rail measures 300×**1130**px on the Ubuntu runner and 300×1084px locally —
a font-rendering difference, and the reason the height is recorded in `notes`
and never asserted.)

---

## Undo

Nothing was written to production, to the database, or to the CDN. This item is
code and committed fixtures only. To reverse it completely:

```
git revert --no-commit <merge commit of this PR>
```

The four fixture files and the two vendored CSS chunks under
`tests/ui-layout-gate/fixtures/2026-09-02-rail/` go with the revert. Nothing
outside the repository holds state from this item.

---

## Retrospective

### What we learned that is not written down

**A gate can be silent on a failure mode by design and that silence can be
mistaken for coverage.** Check 10's "the absence of a rail is not reported here"
is a correct, well-argued decision with three paragraphs behind it — and it was
read for a sprint as *the rail is gated*. The comment that explains why a check
does not fire is the comment most likely to be read as a reason it need not.
What closes that is not a better comment; it is a second check, gated on a
narrower precondition, that can say the thing the first one is right to refuse
to say.

**A module with side effects at import time cannot be imported for anything.**
One `node -e "import(…)"` for two pure functions re-ran a capture script's
top-level code, silently re-fetched production and overwrote all four fixtures
from a **newer deployment** — DES-15 and UI-20 had merged and deployed in the
intervening two hours, so the CSS chunk hashes changed, two orphaned stylesheets
were left on disk and every sha256 in the fixture README went stale. Nothing was
lost, because the capture is reproducible and prints its provenance. It would
have been lost if the fixtures had been files somebody saved.

**The corpus figure in a source comment has a shelf life of about a day.** Three
places in this repo carried "86 articles"; the corpus is 92. Four consecutive
sessions have now found a carried figure wrong.

### Which document must change, and who owns the edit

| File | Edit | Owner | State |
| --- | --- | --- | --- |
| `scripts/capture-rail-fixture.mjs` | a direct-run guard, so importing it cannot re-capture | design-systems-engineer | **done** |
| `scripts/audit-article-sources.mjs` | the corpus figure gets a script instead of three prose homes | design-systems-engineer | **done** |
| `src/lib/inspire/article-sources.ts`, `src/design-system/components/article-rail.tsx` | stale "34 of 86" / "52 of 86" replaced with a pointer to that script | design-systems-engineer | **done** |
| `scripts/measure-article-rail.mjs` | `DEFAULT_PATHS` — the old three could not exercise R3 | design-systems-engineer | **done** |
| `docs/work-done/README.md` | it did not exist; three agents filed the same finding | UI-20 | **done — by UI-20, not by this item.** I wrote one too and it lost the merge, correctly: theirs is the better file. Recorded because "I closed that" and "that got closed" are different claims |
| `.github/workflows/` — a job that runs `pnpm lint` and `pnpm test` | still absent; lint is red on master right now | design-systems-engineer | **OPEN**, second sprint, named rather than taken inside a design item |
| `docs/design/des-03-spesifikasi.html` §5.1 (docs line) | §5.1 draws the rail's three blocks but says nothing about which are conditional; the CEO ruling that Sumber is conditional now has an executable gate and no home in the spec | creative-director | **OPEN** — the spec is docs space and not mine to edit |

Every completed edit above is a script, a gate or a measured table. None is a
prose rule, for the reason H6 spent two sprints proving.

### What we did twice

- **Captured the fixtures twice**, the second time by accident, and the second
  set is the one committed — production had deployed underneath the first.
- **Wrote the one-property assertion twice.** The first was derivable-looking
  and wrong at the boundary; only running it produced that.
- **Censused the corpus twice**, because the first census returned a calm,
  confident zero on all 92 articles.
- **Ran the self-test twice**, deliberately: once to find those two failures, and
  once against the merged tree so the numbers quoted here belong to the commit
  that shipped.

### What we nearly shipped, and what caught it

**A fixture pair whose "differs in exactly one property" claim was only a
comment.** The first version asserted the byte range's *shape* using a boundary
that the algorithm could not actually locate, and it went red. Had the deleted
element happened to be followed by a byte other than `<`, the same unsound
assertion would have passed, and the README would have carried a proof nobody
could reproduce. What caught it was writing the assertion at all instead of
describing the diff in prose — and the persona rule underneath that is the one
that keeps earning its place: **a gate you have only seen fail is half-proven,
and the missing half is the one that decides whether anyone can use it.**

**A control that was quietly not a control.** `sourced-ok.html` was labelled a
clean production control in the first draft of the fixture README and of the
`--rail` run label. It is not clean: it fires `narrow-text-column` 6–15 times.
Both were corrected to say what is actually true — it is a control **for checks
13 and 14** — before anything was committed. The tempting alternative was to
swap in a tidier article, and that would have removed a standing production
finding from view by choosing a different fixture, which is the quietest way a
suite starts lying about what it covers.

The near-miss that did *not* happen is worth naming for the opposite reason.
`rail-missing` needs a precondition that means "this page is the article
template", and `.inspire-prose` and `[data-hk-body-col]` were both on the table.
`.hk-article-grid` was chosen only after enumerating every render site of each
in `src/` and confirming the winner appears in **none** of the five existing
fixtures — before writing the selector, not after. That is cheap, and the
alternative has already cost this repo twice: `.hk-public` in DES-12 and
`<InspireNavMenu>` in UI-02.
