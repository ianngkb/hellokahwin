# UI-17 — the 300px desktop right rail, built and measured on live production

**Sprint 05 · track `design` · 8 points · `design-systems-engineer` · 01 September 2026**

**Shipped:** PR [#47](https://github.com/ianngkb/hellokahwin/pull/47), merge commit `646b030`,
merged `2026-08-31T19:13:20Z`, production deploy READY.
Retrospective fix: PR [#53](https://github.com/ianngkb/hellokahwin/pull/53), merge `ff50701`.

---

## What was wrong, measured before anything changed

DES-03 §5.1 draws a 300px rail beside the article body and states it in words:
*"On desktop the panel is the 300 px rail; on a phone it is a full-width block in
the same place in the reading order."* Production rendered the phone treatment at
every desktop width.

`scripts/measure-article-rail.mjs --base https://hellokahwin.com`, three articles ×
five widths, before the change — build `sin1::sin1::xmf5x-1788198799269`, cache HIT,
css `[d0eb02e81ca49aac 19b83a0982f1e330 eaa300a9560545ab]`:

| width | body column | Rekod panel | rail |
| ----- | ----------- | ----------- | ---- |
| 1024 | `40..633.98` | `40..808` | **absent** |
| 1440 | `120..714` | `120..888` | **absent** |
| 1920 | `232..826` | `232..1000` | **absent** |

The Rekod panel started at the body column's own left edge at every width.
**27 violations, 9 of them `R1-no-rail`.** At 1440 that left 846px of the viewport
as margin, which is the number in the brief and it is correct.

**The markup was never missing, and that is why nothing caught it.** The page
already served `<aside>` twice and `Rekod` on every article. Every structural check
this company owns was green. An element in the wrong COLUMN is a computed value
that does not exist until CSS is applied at a real width in a real browser.

---

## What is true now, on live production

`node scripts/measure-article-rail.mjs --base https://hellokahwin.com` →
**`RAIL EXIT: 0`**, 0 violations. Build `sin1::sin1::s4ljn-1788203720766`, cache HIT,
css `[8e7508183b8deda1 19b83a0982f1e330 93b060e57eb15691]`.

### The DoD's own relationship, `rail.left >= body.right`

| width | body column | rail | gap | verdict |
| ----- | ----------- | ---- | --- | ------- |
| 1024 | `40..620` | `684..984` w300 | 64px | PASS |
| 1440 | `120..876` | `940..1240` w300 | 64px | PASS |
| 1920 | `232..988` | `1052..1352` w300 | 64px | PASS |

Identical on all three articles. At 390 and 768 the rail IS the body column —
`20..370` w350 and `32..736` w704 — full width, same left edge, which is the
specification below the breakpoint rather than a defect.

### All three blocks, in order, on one page

The first three URLs measured could not prove the whole clause: `mas-kahwin-ikut-negeri`
has zero `<h2>` so it gets no contents list, and the other two carry no citations so
they get no `Sumber`. Three further articles carry all three:

| article | bytes | h2 | citations | rekod.top | toc.top | sumber.top | order |
| ------- | ----- | -- | --------- | --------- | ------- | ---------- | ----- |
| `duit-hantaran-kahwin` | 129,064 | 5 | 11 | 266 | 554 | 1102 | OK |
| `doa-pengantin-baru` | 132,155 | 5 | 4 | 266 | 554 | 1179 | OK |
| `cara-tetapkan-duit-hantaran` | 123,152 | 4 | 7 | 266 | 554 | 1081 | OK |

(document coordinates at 1440; ascending `top` = REKOD → DALAM ARTIKEL INI → SUMBER).
**0 violations, 0 observations** across all three at all five widths, on production.

### Body measure — UI-10's 45–75 band, stated at each width the DoD names

| width | column | font-size | chars/line | in band |
| ----- | ------ | --------- | ---------- | ------- |
| 1024 | 580px | 17.9997px | **64.4** | yes |
| 1440 | 594px | 18px | **66.0** | yes |
| 1920 | 594px | 18px | **66.0** | yes |

Identical on all three articles. (390 is 41.1 — below the floor by arithmetic, not by
design: a 390px viewport leaves a 350px column and no cap can widen it. UI-10 wrote
that down and this script asserts the ceiling only.)

### Rail inner width, for UI-18

`getBoundingClientRect` on the rail and its child, production, after merge:

```
@1024  rail 684..984    w 300.00   child content box 268.00
@1440  rail 940..1240   w 300.00   child content box 268.00
@1920  rail 1052..1352  w 300.00   child content box 268.00
@390   rail 20..370     w 350.00   child content box 350.00
```

**268px** is the number a tap-target or truncation check inside the rail must use.
I had told UI-18 **318** for mobile and that was wrong — below 1024 the rail cancels
its own 16px horizontal padding so a block still shares the prose's left edge. A 16px
inset on a phone would put Rekod 16px right of the headline, which is the
two-unrelated-columns defect UI-10 fixed on the header. Mobile is 350; withdrawn and
corrected.

---

## How it is built

- **`.hk-article-grid`** — `max-width: 1120px`, `minmax(0,1fr) 300px`, `column-gap: 64px`.
  Past a 1120px container the first column computes to **756.00px** and the rail to
  **300.00px**: DES-03 §5.1's own frame, reached by its own arithmetic rather than by
  three hard-coded numbers. Below a 1120px container the first column absorbs the
  shortfall and the rail stays at 300.
- **Explicit grid placement, not source order.** The rail sits between the deck and the
  photograph in the DOM — where a phone needs the record, "so the reader searching mas
  kahwin Perak has the answer before the photograph loads" — and is lifted into column 2
  spanning all three rows at ≥1024px. **One node, two positions.**
- **`<ArticleSidebar>` folded into the rail and mounted once.** It was rendered twice,
  `hidden lg:block` plus a separate `lg:hidden` copy, which is why every article served
  two `<aside>` elements with one measuring 0×0 at every width. That is the same two-copy
  idiom that put two `<h1>`s on 85 of 85 articles (DES-09 G01).
- **The old inner `lg:grid-cols-[minmax(0,1fr)_280px]` is gone** — a second right-hand
  column, 280px wide, beside a 300px rail that did not exist.
- **The hand-rolled Rekod markup replaced with the design system's `RekodPanel`.** The
  copy had drifted to a bare `<span className="s-label">` where the component uses
  `<Label muted>`, so the panel on the live article and the panel on the reference page
  were two different components wearing the same class.

### Where the spec loses to a measurement, deliberately and on the record

§5.1 fills its 756px column with prose. 756px at 18px is **84 characters per line** by
the DoD's own formula. UI-10 capped continuous prose at `--measure-prose` (33em = 66cpl)
after measuring the uncapped column at 104.5. So column 1 is 756px **wide** and the prose
inside it stops at 594px — UI-10's stated ragged right, *"the headline may run wider than
the reading column, and the photograph wider still"*. This item's DoD settles it:
*"Body measure stays within UI-10's 45-75 characters per line"*. The measure governs.

---

## SUMBER: what the block can honestly contain — and the part of the DoD this does not meet

**There is no sources column on `articles` and there never has been.** Verified against
`src/lib/db/schema/articles.ts`: no `sources`, no `rujukan`, no `citations`. DES-03 §5.1
draws three source lines in the rail; nothing in the database holds them.

So the block reads the article's own `Sumber:` citations and nothing else.
`Sumber:` is already this site's fact-citation convention and is already load-bearing —
`image-credit-label.ts` refuses to rewrite it precisely because it cites a FACT and not a
photograph.

**The corpus, measured whole rather than sampled** (all 86 article URLs in `sitemap.xml`,
counted on the served response and halved because Next.js carries the markup twice):

```
citations   0   1   2   3   4   5   6   7  11
articles   52  14   8   6   1   2   1   1   1
```

**34 of 86 carry a citation; 52 carry none.** On those 52 the block does not render,
because an empty `Sumber` heading asserts that an article is sourced when it is not.

**This is the one clause of the DoD that is not fully met, and I am not narrowing it.**
The DoD says the rail renders "REKOD, DALAM ARTIKEL INI and SUMBER in that order inside
it". On the 52 articles with no citations that is unachievable without inventing a source,
and on a site whose entire claim is that its numbers carry sources, a plausible fabrication
is the worst outcome available and the hardest to detect later. It is proven on every
article that has the content (three of them tabulated above) and it is impossible on the
rest. **That is a CONTENT gap owned by the editorial seat, not a layout gap**, and it is
reported by the instrument on every single run — a second, non-fatal sink prints
`R3-sumber-absent` with the corpus figure attached, so it is loud, permanent, and cannot
be read as "fine". **For the CEO to decide:** either a sources field on `articles`, or an
editorial pass adding citations, or an explicit decision that §5.1's Sumber block applies
only to sourced articles.

---

## Coordination with UI-18, and three changes of mind worth recording

UI-18 built the contents list; UI-17 owns the container. The contract took four rounds and
**heading ownership changed three times**, which is in `article-rail.tsx` as a sequence
rather than as a conclusion, because the intermediate position looked finished and was wrong:

1. **Container owns the heading** — right about mounting (a single mount is the only place
   that can guarantee exactly one instance), but never tested against UI-18's gate.
2. **Component owns it** — correct *at the time*: the component already rendered §5.1's
   exact string and TOCLINT read the label out of `.hk-eyebrow`, so taking the heading
   would have doubled the words on screen AND turned their gate red on a correct article.
3. **Container owns it again** — because UI-18 then shipped `labelledBy` together with a
   gate that resolves the accessible name through `aria-label` → `aria-labelledby` →
   `.hk-eyebrow`, plus a `bad-toc-two-headings` fixture. That makes container-owned both
   safe AND checkable from production, which position 1 never was.

**I deleted my own duplicates rather than defending them.** My branch had grown a
`variant="rail"` prop doing the same job as their `labelledBy`, and a document-wide
widening of TOCLINT doing the same job as their PR #45. Two props doing one job is the
drift; the tested one survived and mine went.

**I conceded the `<nav>`, and their argument was better than mine.** `ArticleToc` is
reached on four surfaces and only one has a rail — the admin preview, the PDF and the
public `/draft/[token]` link an editor sends a client all have none. A bare `<ol>` would
strip the landmark, the accessible name and the `article-toc` class from three of them.

**The relocation is one gate, not three deletions.** `ArticleRenderer` builds `const toc`
once and every return path renders that same variable, so `showToc` (default true) closes
the plain path, the gallery/figure path and the banner-split path together, with no path to
miss. The article template passes `false`; the preview, the PDF and the draft link are
untouched.

**Cross-checked against UI-18's own gate, not just mine:**
`audit-article-toc.mjs --base <my preview>` → `TOCLINT EXIT: 0`, `VIOLATIONS: none` over
90 articles, 85 MISS / 5 HIT, sin1. Their gate is green against my relocation.

`RAIL_TOC_HEADING_ID` is exported from `article-rail.tsx` so the heading's `id` and the
prop's value cannot drift into the dangling-`aria-labelledby` violation their gate catches.

> **Provisional:** the label `Dalam artikel ini` is live on 68 articles but the rename is
> not settled — an owner instruction re-scoping it arrived truncated. Every check in this
> item keys on `article-toc` and `[data-hk-rail-block="toc"]`, never on the string, so the
> rename cannot break them. `tests/article-toc/UNDO-label-rename.sh` reverts it in two
> files and four lines with no database write.

---

## The gate, and both halves of its proof

`ui-layout-gate.mjs` **check 10, `rail-collapsed`**: at ≥1024, a rail that exists must
begin at or after the body column's right edge; and a `.s-rekod` sharing the body column's
left edge with no `[data-hk-rail]` anywhere is the collapsed shape and fires too.

Absence of a rail is deliberately NOT reported here — that would fire on the homepage, the
catalogue and `/brand`. Presence is `measure-article-rail.mjs`'s R1, which runs against the
article template specifically.

**The committed negative control:** `tests/ui-layout-gate/fixtures/2026-09-01-pre-rail/`,
production frozen before the fix, from `/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri`
— the article DES-03 §5.1 drew its own frames from.
`article.html` sha256 `8553372a88d3b379…`, 145,191 bytes, captured at
`x-vercel-id sin1::sin1::xr226-1788200226176`, cache MISS. Three CSS chunks and four woff2
faces vendored; the faces were **checked** byte-identical to the 31 Aug fixture's rather
than assumed, because a measure taken in a fallback face is a measure of a page nobody sees.

It is a *collapsed* fixture, not an *absent* one, and the distinction is the point: Rekod at
the body's own left edge, no `[data-hk-rail]`, and a **narrower 280px** sidebar further
right — two right-hand columns of different widths and the specified one not among them.

```
pnpm ui:gate --pre-rail            rail-collapsed 3   (1024, 1440, 1920)
pnpm ui:gate --pre-rail --green    rail-collapsed 0
```

`fixtures/rail-green-control.css` is the smallest edit that makes the SAME page pass the
SAME check — it moves the panel clear of the body column and changes nothing else.
**It is not the fix and must not be cited as one:** a margin displaces a block, it does not
create a second column.

Also asserted **silent** at 390 and 768, where a stacked block IS the specification, and
silent on all three 31 Aug fixtures at all five widths. **24 new assertions;
`pnpm ui:gate:selftest` is 155 passed, 0 failed.**

`node scripts/ui-layout-gate.mjs --base https://hellokahwin.com` → **`UILINT EXIT: 0`**
across all seven templates, `rail:0` everywhere.

### The instrument fails closed, proven rather than asserted

```
node scripts/measure-article-rail.mjs --url https://hellokahwin.com/artikel/does-not/exist-ui17-probe
…
0 violation(s)
RAIL EXIT: 2
```

`0 violation(s)` and `RAIL EXIT: 2` printed together. Any fetch error, non-200, or
identity-precondition failure sets `hardError`, so a page the script never saw can never
contribute to a clean verdict.

### Scope: chosen, not solved

Targets are a hardcoded committed list (`DEFAULT_PATHS`), so the "corpus gains a new page
shape" trap UI-18 found in their sitemap classifier cannot reach it. The opposite failure
mode is real and unsolved: a hardcoded manifest goes stale as the corpus grows.
**I have not solved staleness, I have chosen it**, and it is stated in the file header
rather than implied.

---

## Two defects the preview caught that the diff did not

**1. An empty wrapper is not a block — the page.** `<ArticleToc>` returns null below its
two-heading floor, but *a React element is truthy even when it renders nothing*, so
`{toc && <div>{toc}</div>}` left the rail's wrapper standing. Measured on the preview:
`toc h0` on `mas-kahwin-ikut-negeri` at all five widths — a 0px-tall block still worth
56px of `gap: var(--sp-9)` between Rekod and Sumber. Every presence check I had was green.

Fixed by asking before rendering: `hasArticleToc()`, exported from `article-toc.tsx` so the
floor keeps ONE definition. Counting `<h2>`s in the caller would have been a second copy of
a rule that has already moved once, from four to two. Made executable as **check R8**,
which fails any rail block that is present and 0px tall — run against the failing build it
fired 5× on that article and was **silent on the two whose contents list renders**.

**2. `R6-double-mount` was the check, not the page — the instrument.** It reported
`rekod appears 2x` on all three articles at all five widths. There was no second Rekod:
`RekodPanel` renders `<div class="s-rekod">` INSIDE the rail's `<div data-hk-rail-block>`,
so the union selector matched one nested pair twice. Same shape as the `hk-navrail-item`
count that returned 10 on a rail with nine links. **A selector that can match an element
and its own ancestor is counting the markup, not the page.**

---

## Corrections to things other documents assert

1. **The brief's "SUMBER ×20" is not 20 source citations.** On
   `mas-kahwin-ikut-negeri` those 20 are one `Sumber:` citation plus nine uses of the
   ordinary Malay noun *sumber*, each doubled by Next.js's double render. On
   `garden-wedding` the count is 4 `Rekod` and **0** `Sumber`. The scaffolding the brief
   describes as "partly there" was Rekod only.

2. **"DALAM ARTIKEL INI is on 0 of 85 articles" was a true number answering the wrong
   question.** A contents list already existed on production, inline inside
   `.inspire-prose`, with its heading reading `Isi Kandungan`. The string count was right;
   testing for the label you expect can only ever return a number about your expectation.
   (Found and corrected jointly with UI-18.)

3. **`scripts/measure/count-in-html.sh` was not on site master.** The brief calls it "the
   committed helper"; it was committed to `feat/command-centre-dashboard` only. It is on
   master now.

4. **The `grep -o -i -F` bug does not reproduce in this session's shell.** Same GNU grep
   3.0, same Git Bash, both documented cases:

   ```
   printf 'artikel artikel ARTIKEL' > f
   grep -oiF artikel f   ->  3      (documented: 0)
   grep -oi  artikel f   ->  3

   grep -oiF artikel <a 205,660-byte live article page>  ->  121
   grep -oi  artikel <the same page>                     ->  121
   ```

   `-oiF`, `-oFi`, `-iFo`, `-o -i -F` and `-oaiF` all return 121. The recorded **cause** is
   wrong or environment-specific — the second time a confident diagnosis of this zero has
   not survived being run. The helper is **not** reverted; escaping the pattern rather than
   relying on `-F` is still right. But the text states as fact something that does not
   reproduce, and **a rule people cannot reproduce is a rule they stop believing.**
   Raised in PR #53 for whoever owns that text to re-derive or restate as unexplained.

---

## Retrospective

**What we learned that is not written down.** Three gates were wrong today on pages that
were fine — my `R6` union selector, UI-18's `.inspire-prose` scoping that would have gone
false-red on all 68 articles the morning this relocated, and their gate reading its own
threshold out of the component it audits. The common cause is not carelessness: **all three
were written from the author's mental model of the markup rather than from the served DOM.**
Sabotage testing does not catch this, because sabotage tests the checks you thought of
against the world you assumed. All three were caught by someone asking a question the
author had not.

**What we did twice that we should never repeat.** Two sessions independently built the
same prop (`variant` / `labelledBy`) and the same TOCLINT widening, because we agreed a
contract in prose and then both implemented it. A contract between two items should name
the file and the symbol that will carry it *before* either side writes code, not the
behaviour both sides should produce.

**What we nearly shipped, and what caught it.** A rail carrying a 0px-tall wrapper with
56px of dead space on every article below the heading floor. Nothing in the diff showed it
and every presence check was green. It was caught because the measurement script records
block **height** as well as position — a field added for completeness, not for a check.

**Which document must change, who owns the edit, and the edit itself.**
`scripts/measure/count-in-html.sh` — mine, and **done**, shipped as PR #53. That script
exists because a check tested for the casing somebody assumed; its `--enumerate` mode, the
half whose entire job is *enumerate what IS there*, was `grep -oaE` with no `-i` while its
counting mode has always been `-oai`. The two modes disagreed about the same pattern on the
same file:

```
count-in-html.sh <page> SUMBER                 ->  20
count-in-html.sh --enumerate <page> 'SUMBER:'  ->  (none)
```

on a page carrying `Sumber:`. The script's own headline failure, inside the script. Also
fixed: the mode is ERE while its documented example was valid in both dialects, so a
BRE-style bound matched literally and returned a confident `(none)` — now named on stderr.

Run against the failing cases, because understanding a cause is not a test:
`'SUMBER:'` `(none)` → `2 Sumber:`; `--case-sensitive` still `(none)`, so the flag
discriminates and the new default is not merely "match everything"; the backslashed brace
now prints a diagnosis; the ERE form returns `2 Sumber: Warta`; counting mode unchanged
at 20.

**Prose rules do not fire.** The rule *"enumerate, never test for the casing you assume"*
was already written in three places including that file's own header, and the tool those
documents point at still could not do it.

---

## Commands a reader can re-run

```bash
# the rail's geometry on live production
node scripts/measure-article-rail.mjs --base https://hellokahwin.com

# all three blocks in order, on articles that carry all three
node scripts/measure-article-rail.mjs \
  --url https://hellokahwin.com/artikel/hantaran-mas-kahwin/duit-hantaran-kahwin \
  --url https://hellokahwin.com/artikel/ucapan-doa/doa-pengantin-baru \
  --url https://hellokahwin.com/artikel/hantaran-mas-kahwin/cara-tetapkan-duit-hantaran

# the gate, both halves, on the committed known-bad capture
pnpm ui:gate --pre-rail            # rail-collapsed 3
pnpm ui:gate --pre-rail --green    # rail-collapsed 0
pnpm ui:gate:selftest              # 155 passed, 0 failed
node scripts/ui-layout-gate.mjs --base https://hellokahwin.com   # UILINT EXIT: 0

# the instrument fails closed
node scripts/measure-article-rail.mjs --url https://hellokahwin.com/artikel/does-not/exist
#   0 violation(s)   RAIL EXIT: 2

# UI-18's gate against this relocation
node scripts/audit-article-toc.mjs --base https://hellokahwin.com   # TOCLINT EXIT: 0
```

`measure-article-rail.mjs` needs `playwright-core` and the installed Chrome —
deliberately not an app dependency, same arrangement as `ui-layout-gate.mjs`:
`npm i --no-save playwright-core@1.58.2`.

---

## Status

**Not marked done — the CEO closes it.** Evidence recorded above and on the tracker.

**Met:** the rail at 300px to the right of the body at 1024/1440/1920 on three articles,
by computed `getBoundingClientRect`, gap 64; full-width in the same reading order at 390;
body measure 64.4/66.0/66.0 cpl, inside UI-10's band at all three widths; the UI-06 gate
carries `rail-collapsed` with a committed pre-fix fixture, proven to fire on it and clear
on a control differing in exactly that one property.

**Not met, not narrowed:** `SUMBER` inside the rail is proven on articles that carry a
citation and is unachievable on the 52 of 86 that carry none. That needs a CEO decision on
sources — a field, an editorial pass, or an explicit scoping of §5.1's block to sourced
articles.
