# UI-18 — the contents list was on 63 of 86 articles, not 0 of 85; it is on 65 now, and something measures it

**Sprint 05 · track `design` · 5 points · owner `design-systems-engineer`**
**Date:** 01 September 2026
**Outcome:** DoD met, not narrowed. Merged to `master`, deployed, verified on production.
**Item exit:** 0

---

## The one-paragraph version

UI-18 was dispatched on a census that fetched every live article, searched each
one for the string `DALAM ARTIKEL INI`, found zero, and concluded the in-article
table of contents "does not exist at all". The string was genuinely absent. The
contents list was not: it rendered on **63 of the 86** articles in the sitemap
that morning, labelled `Isi Kandungan`, carrying **822** anchors of which **none**
were dangling. `.hk-eyebrow` sets `text-transform: uppercase`, so the served text
is uppercase and the source is mixed case — the identical shape the same brief
documents four sections later as the trap that nearly sent an agent hunting for
`REKOD` in a repo that serves it twenty-four times. What was genuinely wrong was
smaller and more specific: the component's floor was **four** `<h2>` rather than
the DoD's two, which withheld the list from exactly two articles; the label was
not DES-03's; and nothing measured any of it. All three are fixed and shipped.
Production now renders it on **65 of 86**, labelled `Dalam artikel ini`, with
**900** anchors and none dangling — see §8 for why that total is not 822 + 24.

---

## 1. The corpus, re-derived at run time

The brief said "85" and told me not to assume it. Measured from
`https://hellokahwin.com/sitemap.xml` at the moment of the run:

```
103 URLs in the sitemap, of which 86 match /artikel/<kategori>/<slug>
```

**86, not 85.** CONT-13 and CONT-16 were moving the number during the same
sprint; CONT-16 stopped at its gate and wrote none, so the count that matters is
the one the gate takes every time it runs. The audit script fetches the sitemap on
every invocation and prints the count in its header. There is no `85` and no `86`
anywhere in it.

## 2. What production actually carried — the BEFORE run

`node scripts/audit-article-toc.mjs`, against `https://hellokahwin.com`,
01 Sept 2026 17:53 UTC, before anything shipped:

```
TOCLINT — corpus re-derived from https://hellokahwin.com/sitemap.xml at run time:
          103 URLs, of which 86 are articles (/artikel/<kategori>/<slug>)

articles measured                       86
articles with >= 2 h2 (must have a TOC)  65
articles rendering a TOC                 63
contents-list labels found              "Isi Kandungan" x63
total contents links checked            822, dangling: 0

articles with NO contents list (23) — what IS on them:
  14 x  none
   2 x  h3=7 h4=5
   1 x  h3=8
   1 x  h3=6 h4=3
   1 x  h3=6 h4=7
   1 x  h3=9 h4=6
   1 x  h3=7 h4=4
   1 x  h2=3 h4=23
   1 x  h2=2 h3=19

VIOLATIONS (2 article(s)):
  https://hellokahwin.com/artikel/hiasan-dekorasi/goodies-kahwin
    MISSING contents list on an article with h2=3 (floor 2). Headings actually present: h2=3 h4=23
  https://hellokahwin.com/artikel/idea-dan-nasihat/tempat-honeymoon-di-malaysia
    MISSING contents list on an article with h2=2 (floor 2). Headings actually present: h2=2 h3=19

build fingerprint (status / x-vercel-cache / x-vercel-id region):
  13 x  200 HIT sin1
  73 x  200 STALE sin1
  measured at 2026-08-31T17:53:10.923Z

TOCLINT EXIT: 1
```

That is a real red run against real production, on the gate as committed. It is
the "before" the DoD asks for, and it is a different before from the one the item
was dispatched with.

**The 63 is the correction.** `docs/boardroom/ceo-memory.md` and
`docs/plans/aug-30-2026-session-01/aug-31-2026-audit-spec-vs-build.md` have both
been corrected at source, and the UI-17 and UI-18 briefs annotated. Four agents
corrected the CEO in Sprint 04; this is the fifth, and the mechanism was the same
one every time: **a check that tests for the thing you assume is there can only
return a number about your assumption.**

## 3. What was actually built

### The floor: four `<h2>` → two

`TOC_MIN_HEADINGS` was 4, on a reasonable-sounding argument written into the
comment — "a three-section article is already visible in one scroll". That is an
argument about a reader who has already arrived at the top of the page, and it
cost two articles their contents list: `/hiasan-dekorasi/goodies-kahwin` (3 h2)
and `/idea-dan-nasihat/tempat-honeymoon-di-malaysia` (2 h2). The DoD says two. It
is two, and the corpus measurement that justifies it is in the comment beside the
constant rather than in a document nobody opens.

### The label: `Isi Kandungan` → `Dalam artikel ini`

DES-03 §5.1 draws the rail with `Rekod`, then `Dalam artikel ini`, then `Sumber`,
and names them in `s-label` — the spec's own uppercase-transforming eyebrow. The
build said `Isi Kandungan`. Changed in the eyebrow and on the `aria-label`
landmark. That also makes UI-17's DoD ("with REKOD, DALAM ARTIKEL INI and SUMBER
in that order inside it") testable as written, which it was not before.

I did not overrule the art direction and did not need to: the spec and the build
disagreed and the spec wins.

### The container contract with UI-17

`ianng89/ui17-rail` was still sitting at `master` with no commits when I started,
so there was nothing to coordinate against in code and I inspected the current
article template instead. The contract I have shipped, and written into both the
CSS and the UI-17 brief:

- **UI-17 owns the rail. UI-18 owns `ArticleToc` and its base CSS.**
- Every contents rule in `globals.css` now carries **two** selectors: the bare
  `nav.article-toc …` that styles the component *anywhere*, and the
  `.inspire-prose nav.article-toc …` twin that out-ranks the prose rules where it
  renders today. One declaration block, two selectors, no duplicated values.
- The rail renders `<ArticleToc headings={extractHeadings(article.content)} />`
  and it arrives styled.
- The component returns `null` below the floor, so the "empty TOC slot" the UI-17
  brief asks the rail to accept is already the behaviour — 21 of 86 articles
  render no contents list and the rail has to lay out without one.

The specificity is why the twin is not optional: `.hk-public .inspire-prose a` is
(0,2,1) and sets the serif face, 17px and an underline; `nav.article-toc a` is
(0,1,2) — more elements, fewer classes — so it loses. `.inspire-prose
nav.article-toc a` is (0,2,2) and wins.

**Why this shape rather than the tidier ancestor-scoped one:** DES-12 rendered a
**0×0** wordmark on `/brand` because a token was scoped to the migrated surfaces
only, and UI-02 hit the identical shape because `<InspireNavMenu>` also renders in
the admin nav preview. A component whose only styling lives under an ancestor
selector arrives unstyled at its second call site. The rail is that second call
site and it does not exist yet, which is exactly when the mistake is cheap to
prevent and invisible to catch.

### The reference page, in the same change

`/admin/design-system` renders the component three times. The placement is the
point: that surface is `(admin)` and carries **neither `.hk-public` nor
`.inspire-prose`**, so what renders there is the component styled by its bare
rules alone. Re-scope those rules and this block loses its type, its spacing and
its 24px tap floor **there**, on the page people open to check taste, months
before the rail ships. Three renders because two of them are states nobody asks
for: a 96-character heading that must wrap rather than truncate at the 300px rail
measure, an article whose sections nest, and one below the floor — which must
render nothing at all rather than an empty bordered box.

The fixtures are Tiptap docs fed through `extractHeadings`, not hand-written
`ArticleHeading[]`. An id typed by hand there would be an id the reference page
invented; this way every `href="#…"` on it was produced by the shipped slug rules.

### UX-02's anchors: already there, nothing regenerated

The brief told me to check before generating new ids. `extractHeadings()` and
`injectHeadingIds()` already existed in `src/lib/inspire/heading-anchors.ts`, both
consumers already walk the document forwards through one assigner, and
`heading-anchors.test.ts` already asserts the two sequences are identical. Across
all 86 live articles: **h2 without an id: 0. h3 without an id: 0.** I generated
nothing and changed nothing in that file. Every one of the 822 anchors before and
the 900 after resolves to an id in its own document — that is the evidence the
contract holds under a changed floor.

## 4. Tap targets — UI-11's 24px floor, measured not asserted

`min-height: 24px` in a stylesheet is an intention. Vertical padding on a
`display: inline` box moves the paint and not the measured box, which is how a
padded inline link still reports 15.4px. So `--geometry` loads the real pages in
real Chrome at `deviceScaleFactor: 1`, waits on `document.fonts.ready` (a webfont
changes every advance width on the page), and reads
`getBoundingClientRect()` on each anchor:

```
goodies-kahwin              @390  toc=1 anchors=3  height min=24 max=37.7 display=inline-flex  under 24px: 0
goodies-kahwin              @768/1024/1440        min=24 max=24         inline-flex           under 24px: 0
tempat-honeymoon-di-malaysia @390/768/1024/1440   anchors=21  min=24 max=24  inline-flex      under 24px: 0
hantaran-kahwin             @390/768/1024/1440    anchors=13  min=24 max=24  inline-flex      under 24px: 0

148 contents anchor(s) measured, 0 under 24px
TOCLINT EXIT: 0
```

**And the paired half, because a check seen only passing is half-proven.** At
`--tap-min 30` on the same page, the same run: 2 of the 3 anchors flagged at 24px
and the 37.7px wrapped one cleared. That is discrimination on real values from one
page, not a threshold nobody has watched move.

## 5. The gate, and the three ways it was wrong before it was right

`scripts/audit-article-toc.mjs` — `pnpm audit:toc`, `pnpm audit:toc:selftest`.
It parses the DOM with `jsdom` (already a devDependency), never greps for a
string, and asserts a relationship: a contents list **if and only if** the body
carries ≥ 2 `<h2>`, with every `href="#…"` resolved by `getElementById` against
the document that served it. Every article it finds without a contents list is
printed with its heading census beside it, so an absence here never arrives bare.

### 5a. It read its own threshold from the code it was auditing

The first draft read `TOC_MIN_HEADINGS` out of `article-toc.tsx` and judged
production by whatever it found. Tidy, and worthless: raising the constant back to
four would have moved the gate's definition of correct with it and the run would
have gone **green on the exact regression the gate exists to catch**. I found it
by sabotaging the constant and watching the gate stay green — not by reading the
code, which I had just written and believed.

`DOD_FLOOR = 2` is now a number in the gate, quoting the DoD. The component's
constant is still read, but only to be compared; disagreement is exit 2 with a
message naming which document decides. CI exercises that path rather than
asserting it.

### 5b. It reported `VIOLATIONS: none · EXIT 0` over a corpus of zero

Found by pointing the gate at this branch's own Vercel preview. Three defects in
one line of output, each of which produced a *reassuring* result:

1. **The bypass header went on the page fetches and not on the sitemap fetch.** An
   unauthenticated request to a preview's `/sitemap.xml` returns **HTTP 200** —
   from vercel.com's login page. Zero `<loc>` elements, zero articles.
2. **An empty corpus exited 0.** "No article breaks the rule" and "I found no
   articles" printed the same line and meant opposite things. I had written
   exactly this guard for `--geometry` an hour earlier and not carried it across.
3. **`sitemap.ts` emits absolute PRODUCTION URLs**, so a preview's sitemap lists
   `https://hellokahwin.com/…`. Walking them verbatim would have measured
   production and reported the numbers as the preview's verdict — a green preview
   run that had never loaded the preview.

All three fixed; the empty-corpus guard now covers both the sitemap walk and the
`--url` path. `x-vercel-set-bypass-cookie: true` alongside the bypass header also
turned out to make the edge answer with a `Set-Cookie` redirect that undici
follows into `redirect count exceeded`; the header alone is enough.

### 5c. The self-test is paired, and its fixtures are captures

Seven fixtures, generated by
`node tests/article-toc/fixtures/make-fixtures.mjs` from a real production
article, each differing from the green control in **exactly one feature** — which
is the only reason a `PASS` on a `bad-` case means the check discriminates rather
than merely fires:

```
TOCLINT SELFTEST — floor 2, 7 paired cases

  PASS  ok-four-h2.html              expected clean     got clean     — four h2 and a matching contents list
  PASS  ok-below-floor-no-toc.html   expected clean     got clean     — one h2 and NO contents list — the absent branch
  PASS  bad-missing-toc.html         expected violation got violation — four h2, contents list removed
  PASS  bad-toc-below-floor.html     expected violation got violation — one h2 with a contents list
  PASS  bad-dangling-anchor.html     expected violation got violation — one href pointing at an id nothing carries
  PASS  bad-empty-shell.html         expected error     got error     — a 200 with no article body
  PASS  bad-wrong-site.html          expected error     got error     — the Vercel SSO login page
  PASS  (floor sensitivity)          same doc: floor 2 -> 0 violation(s), floor 1 -> 1

0 of 8 case(s) failed
TOCLINT EXIT: 0
```

Each `bad-` case produces exactly one message and it is the right one — verified
with `TOCLINT_VERBOSE=1`, not assumed from the exit code.

### 5d. It is a blocking CI job, and I read its log

`.github/workflows/article-toc-gate.yml`, on the shape `ui-layout-gate.yml`
settled on: a hermetic **blocking** self-test on every push and PR, and a
**scheduled, non-blocking** walk of the live corpus that files a labelled issue.
`set -o pipefail` is carried deliberately — without it a step's exit status is
`tee`'s, which is always 0, and that is how the layout gate's own first CI run
reported SUCCESS while printing `UILINT EXIT: 1`.

A green tick is not evidence a gate ran, so, from the runner's log:

```
2026-08-31T18:09:25Z  TOCLINT SELFTEST — floor 2, 7 paired cases
2026-08-31T18:09:25Z    PASS  bad-dangling-anchor.html  expected violation got violation
2026-08-31T18:09:25Z  TOCLINT EXIT: 0
2026-08-31T18:09:26Z  TOCLINT: FLOOR MISMATCH. src/components/inspire/article-toc.tsx sets TOC_MIN_HEADINGS = 4
2026-08-31T18:09:26Z  TOCLINT EXIT: 2
```

The second block is the CI step that raises the floor in a scratch copy and
**requires the gate to refuse the run**. The forward slash in that path is the
runner's, not this machine's.

## 6. Verification against what a reader receives

- **Local production artefact.** `next build` (against the live database, read
  only) + `next start -p 3218`, then TOCLINT against the built pages: both
  previously-failing articles rendered the list, labelled `Dalam artikel ini`,
  0 dangling.
- **The Vercel preview**, with `vercelbypass.hellokahwin`: 86 articles, 65 with
  ≥ 2 h2, **65 rendering a contents list**, `"Dalam artikel ini" x65`, **846**
  links checked, **0** dangling, `86 x 200 MISS sin1`.
- **Production after merge:** see §8.
- Tests: **459 passing**, including 6 new ones on the rendered component. The new
  file was watched failing on purpose — reverting the label and the floor turns 4
  of the 6 red with the assertion text quoted.
- `pnpm typecheck` clean. `prettier --check` clean on everything this item
  touched; the three `src/app/(public)/brand/*` files it still reports were red on
  `master` before this branch existed and are untouched here.

### The structural check, with a negative control

A 200 proves nothing, so each of these quotes content only the real page carries:

```
/artikel/hiasan-dekorasi/goodies-kahwin            200 REVALIDATED sin1::pdh5k-1788200949113
  body h2: 4 | nav.article-toc: 1
  label: "Dalam artikel ini" | aria-label: "Dalam artikel ini"
    #23-idea-doorgift-kahwin-menarik-praktikal-disukai-tetamu -> H2 "23 Idea Doorgift Kahwin Menarik, Praktikal &"
    #hadiah-yang-wajar-dielakkan                             -> H2 "Hadiah yang Wajar Dielakkan"
    #soalan-lazim                                            -> H2 "Soalan lazim"
    #kesimpulan                                              -> H2 "Kesimpulan"

/artikel/idea-dan-nasihat/tempat-honeymoon-di-malaysia   200 REVALIDATED sin1::kcp5l-1788200949519
  body h2: 3 | nav.article-toc: 1
  label: "Dalam artikel ini" | aria-label: "Dalam artikel ini"
    #senarai-tempat-honeymoon-di-malaysia-paling-best -> H2 "Senarai Tempat Honeymoon di Malaysia Paling "
    #soalan-lazim                                     -> H2 "Soalan lazim"
    #kesimpulan                                       -> H2 "Kesimpulan"

NEGATIVE CONTROL
/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri  200 REVALIDATED sin1::vxlrf-1788200950038
  body h2: 0 | nav.article-toc: 0
  headings actually present: H3 H3 H3 H3 H3 H3 H3 H4 H4 H4 H4 H4
```

**And the caveat that goes with it, because the corpus moved underneath the
item.** Both articles had grown by the time of this check: `goodies-kahwin` read
`h2=3` at 17:53 and `h2=4` now, `tempat-honeymoon` read `h2=2` and reads `h2=3`.
At 4 `<h2>`, `goodies-kahwin` would satisfy the OLD floor as well, so it is no
longer proof on its own. `tempat-honeymoon` at 3 still is: it is above the new
floor and below the old one, and it renders the contents list. The invariant the
gate enforces does not depend on either article staying where it was.

### What I could not verify, and why

`/admin/design-system` is behind `requireAdminSection('inspire')` and I have no
admin session. Against the local production build it answers **307 → /login**,
which proves the route builds and renders rather than throwing, and the component
itself is asserted by six unit tests on its rendered markup. I have not looked at
the three specimens with my own eyes, and I am not claiming to have.

### Seven minutes later the corpus was 89, and the rule still held

The best evidence that the number is re-derived and not remembered is that it
moved again while I was writing this up. Same committed script, same production,
18:31:48 UTC:

```
TOCLINT — corpus re-derived from https://hellokahwin.com/sitemap.xml at run time:
          106 URLs, of which 89 are articles (/artikel/<kategori>/<slug>)

articles measured                       89
articles with >= 2 h2 (must have a TOC)  68
articles rendering a TOC                 68
contents-list labels found              "Dalam artikel ini" x68
total contents links checked            1026, dangling: 0
VIOLATIONS: none.
  79 x 200 MISS sin1 · 10 x 200 HIT sin1
TOCLINT EXIT: 0
```

86 → 89 articles and 65 → 68 eligible, in thirty-eight minutes, with no code
change. Three new articles arrived carrying two or more `<h2>` and each got a
contents list without anyone touching anything. **That is the difference between
shipping a fix to two articles and shipping a rule.** The 21 with no contents
list are the same 21, shape for shape.

## 6b. The UI-17 coordination, after this item had already shipped

Four messages arrived from UI-17 via the team lead after PR #38 was merged and
deployed. Three things came out of them, one of which was a defect in what I had
already shipped.

### The gate would have gone sitewide red the morning the rail lands

`TOCLINT` looked for `nav.article-toc` **inside `.inspire-prose`**. UI-17 moves
that node into the 300px rail, which is outside it. On the day the relocation
deploys, my gate would have reported `MISSING contents list` on all 68 eligible
articles at once — a sitewide red run caused entirely by the gate's own
assumption about which box the component lives in. The DoD says a contents list
renders on the article; it does not say where.

Fixed in PR #45, paired rather than asserted: the lookup is document-wide,
`.article-toc` is still the signal, exactly one per document is still required,
and anchor targets must still resolve inside `.inspire-prose` because the
headings do not move when the nav does. The accessible name now resolves the way
a screen reader does — `aria-label`, then `aria-labelledby`, then the
component's own `.hk-eyebrow` — because heading ownership is moving to the rail
and a gate that only knew the third form would have failed every article the day
the second shipped. Three new fixtures from the same production capture:
`ok-toc-in-rail` (must be clean), `bad-toc-duplicated`, `bad-toc-two-headings`.
Self-test 8 cases → 11.

### The container contract is a prop, not an agreement

UI-17 decided the rail renders `Dalam artikel ini` itself. That is right and the
heading is theirs. But the label is already live on 68 articles from this item,
so between their merge and the relocation there is a window where BOTH render it.
PR #46 makes that unreachable: `<ArticleToc headings={…} labelledBy="…" />` drops
the heading, the `aria-label` and the box chrome together, and passing the prop
is the only way to get the bare form. `aria-label` is dropped rather than kept
alongside `aria-labelledby`, because an `aria-label` here would override the
rail's heading as the landmark's accessible name.

### Tap targets at the rail's inner measure, before the rail exists

`--clamp <px>` measures the shipped node at a width the shipped page does not yet
impose. On production: **268px** (the 300px column less 16px padding each side)
gave 79 anchors across three articles, min **24.0**, max 37.7, **0 under 24**;
**318px** gave 27 anchors, min 24.0, max 34.8, 0 under 24 — **but 318 is a width
that does not occur; see §6f, it is 350.** The control is what
makes those numbers mean anything: the same page at the same viewport
**unclamped** reports max **24.0**, every entry on one line. The clamp really
narrows the box, so the 37.7 is wrapping and not an artefact of the flag. **None
of this is a measurement of the rail** and it must not be quoted as one.

### Two claims in those messages that were stale, and one that was wrong

- *"`DALAM ARTIKEL INI` genuinely is on 0 articles."* True before 18:22 UTC. It
  has been on the page since: **68 of 89** as I write. UI-17's fetch predates the
  merge. The count is no longer usable as a negative control.
- *"`mas-kahwin-ikut-negeri` has article-toc 0 — if it carries ≥ 2 h2 then
  generation is also needed."* It carries **zero** `<h2>` (`h3=7 h4=5`), so it is
  correctly excluded and is not a coverage gap. The three numbers the message
  asked for, measured rather than sampled: 86 articles → 65 with ≥ 2 h2 → **63**
  had a contents list. It was two articles of generation and it is done.
- *"You should merge second."* I had already merged first, four hours earlier.

## 6c. The `<nav>` question, settled by counting render sites

UI-17 asked for the bare `<ol>`: *"I supply the `<nav>`, the `aria-labelledby`
and the heading."* I am holding the `<nav>`, and the reason is a count rather
than a preference.

`ArticleRenderer` — and therefore `ArticleToc` — renders on **four** surfaces.
Exactly one of them gets the rail:

| surface | rail? |
|---|---|
| `src/app/(public)/artikel/[category]/[slug]/page.tsx` | **yes** |
| `src/app/(admin-preview)/admin/inspire/[article-id]/preview/page.tsx` | no |
| `src/app/(print)/admin/inspire/[article-id]/pdf/page.tsx` | no |
| `src/app/(public)/draft/[token]/page.tsx` | no — and this one is **public**, the link an editor sends a client |

Plus `/admin/design-system`. If the component hands over a bare `<ol>` and
`article-toc` moves onto the rail's `<nav>`, then on those three surfaces the
contents list has **no landmark, no accessible name, and no `article-toc`
class** — so `nav.article-toc a` in `globals.css` matches nothing and the list
renders as body copy, in the PDF and in the draft a client opens. That is
DES-12's 0×0 wordmark and UI-02's admin nav preview for the third time, and it is
the specific mistake this component's dual-selector CSS was written to prevent.

Keeping the `<nav>` costs UI-17 nothing they asked for: `labelledBy` already
points the landmark at their heading, so they own the visible string and the
accessible name either way, and their gate's `nav.article-toc` inside
`[data-hk-rail]` finds my nav inside their wrapper. It also avoids nesting two
`nav` landmarks if either of us forgets.

**If they overrule this, it is buildable but it is not free:** the class moves to
their `<nav>`, and the three non-rail surfaces need a landmark and a name from
somewhere else. That is a separate item, not a line in their wiring commit.

## 6d. The undo, because the rename is provisional

The owner's re-scope arrived **truncated**. Its surviving fragment reads *"…st
rename to match a spec that may itself be wrong"* — most plausibly *"must NOT
just rename"*. The rename to `Dalam artikel ini` is therefore provisional until
the full text arrives, and it is live on 68 articles.

`tests/article-toc/UNDO-label-rename.sh` (PR #50, merged `3020408`). Two files,
four lines. **Run for real against the working tree before it was committed, not
described:** it applied, `vitest` on the component suite came back **8 passed**
with the label reverted, and `audit-article-toc.mjs --selftest` stayed **11/11**
— which is the executable proof of the owner's directive that `.article-toc` is
the signal and never a label string, since the gate does not move when the string
does. Then reverted.

**There is no production write to undo.** Not one database row was touched by
this item: the label is a string literal in a React component, the ids are
derived at render time by `heading-anchors.ts`, and everything shipped is
read-only against the corpus. The undo is a code change plus a deploy.

**Reverting PR #38 would be the wrong undo**, and the script says so. That PR
also lowered `TOC_MIN_HEADINGS` from 4 to 2 — the DoD's number, and what puts a
contents list on `goodies-kahwin` and `tempat-honeymoon-di-malaysia` — and
shipped the gate, the CI job and the reference-page entries.

## 6e. The corpus filter was right by accident — the same shape, one layer up

Asked directly whether the walker's exclusion of the non-article sitemap URLs was
deliberate or incidental. **Incidental.** The 17 it excluded on 01 Sept were the
homepage, `/artikel` and 15 category hubs — all correctly excluded, and correctly
excluded by luck.

The filter was *three path segments under `/artikel/`*. Measured rather than
reasoned about:

```
/artikel/tag/duit-hantaran         HTTP 200 | .inspire-prose = 0 | matches the article regex = true
/artikel/tag/duit-hantaran-kahwin  HTTP 200 | .inspire-prose = 0 | matches the article regex = true
```

Live, linked from a production article, article-shaped, and **not in the sitemap
today**. The day tag pages are added to the sitemap — an ordinary SEO change —
every one is classified as an article, the `.inspire-prose` precondition fires
`NOT AN ARTICLE BODY`, and the gate exits 2 across the whole corpus pointing at a
change that was correct. That is the `.inspire-prose` scoping failure again, one
layer up, found the same way: by someone asking rather than by a test.

The classification is now positive and derived at run time, the way the count
already was: **a 3-segment `/artikel/<a>/<b>` is an article iff `<a>` also appears
in the same sitemap as a 2-segment `/artikel/<a>`.** `author` and `tag` are named
explicitly rather than left to fall out of the rule. Anything else article-shaped
whose first segment is not a known hub is an **error that stops the run** —
dropping it silently would under-count the corpus, and a green run about the
wrong set of pages is the failure this gate exists to avoid. The filter prints
its own arithmetic on every run, so the exclusion is visible rather than
inferred.

### And the self-test was miscounting itself

It printed **`0 of 11`** on a run that had just executed **fourteen** cases,
because the total was `cases.length + 1` — a claim maintained separately from the
run, stale the moment anyone added a case. In a self-test, of all places. It
counts now, and was watched going red and back green by pointing one fixture's
`aria-labelledby` at an id nothing carries: `1 of 14 case(s) failed · TOCLINT
EXIT: 1`.

## 6f. The rail exists now, so the clamp is superseded — and my 318 was wrong

UI-17 built the relocation and measured it. Three corrections and one
confirmation, all against their preview `ab10b40` with the protection-bypass
header.

### The 318px row was a width that does not occur. Correction.

I measured the mobile inner box at **318px** — the 350px body column less 16px of
padding each side. That 32px came from applying the desktop rail's padding to the
mobile case, and it was mine to check and I did not. **The rail cancels its own
horizontal padding below 1024** so a block shares the prose's left edge, and the
measured inner box at 390 is **350.00**. The 318 row is withdrawn, not adjusted.

### And the clamp is superseded entirely, because the real thing now exists

`--clamp` measured the shipped node at a width the shipped page did not impose.
That was the right tool while the rail was hypothetical and it is the wrong one
now. Measured on the REAL rail, no clamp, `getBoundingClientRect` on every
contents anchor:

| width | layout | anchors | min | max | under 24 |
|---|---|---|---|---|---|
| 390 | 390 | 63 | **24.0** | 34.8 | **0** |
| 1024 | 1024 | 63 | **24.0** | 37.7 | **0** |
| 1440 | 1440 | 63 | **24.0** | 37.7 | **0** |
| 1920 | 1920 | 63 | **24.0** | 37.7 | **0** |

**252 contents anchors across three articles at four widths, none under 24px**,
`display: inline-flex` throughout. The 37.7 the real 268px column produces is the
same figure the clamp predicted, which is a pleasant result and is not why the
number is trustworthy — the reason is that nothing simulated it.

**Still a PREVIEW, not production.** This replaces the clamped rows for the rail
widths; it does not close the item's tap-target clause, which needs the same run
against production once UI-17 merges.

### The relocation, verified against my own fixtures rather than their report

UI-17 replaced the three deletions I specified with ONE nulled variable —
`const toc = showToc ? <ArticleToc …/> : null` — on the argument that every
return path renders that same variable. **I doubted it in writing**, because I
had told the team lead that `renderOriginal` takes `toc` as a parameter and could
default or reconstruct it. Checked rather than argued: `<ArticleToc` is
constructed **once** in that file, `renderOriginal`'s signature is
`toc?: React.ReactNode` with **no default**, and its single call site passes the
nulled variable through. The premise holds and their shape is better than mine —
three deletions can be two-thirds done; one variable cannot.

The fixture decided it, which is what fixtures are for. On their preview:

```
/artikel/hantaran-mas-kahwin/duit-hantaran-kahwin   navs=1  inProse=0  inRail=1
  aria-labelledby="hk-rail-toc-heading"  aria-label=null  ownEyebrow=false  class="article-toc"
  name resolves to: H2 "Dalam artikel ini"
/artikel/idea-dan-nasihat/garden-wedding            navs=1  inProse=0  inRail=1
```

That is `ok-toc-in-rail` exactly, on a real build, and `bad-toc-duplicated`'s
condition does not fire. My own walk of their preview, independently:
**90 articles, 69 eligible, 69 rendering, 1037 links, 0 dangling,
`TOCLINT EXIT: 0`.**

### Their green preview was authenticated — checked, not assumed

I found the trap where an unauthenticated preview answers `/sitemap.xml` with
**HTTP 200 from vercel.com's login page**, so I checked theirs rather than
trusting a plausible number. Their preview **is** protected — unauthenticated it
returns `200 → vercel.com/login` with **0** `<loc>` elements. A 90-article result
is therefore impossible without the bypass, and my own bypassed walk reproduces
their 90 exactly.

### `hasArticleToc` — another session edited my file, and it is right

UI-17 added and exported `hasArticleToc(headings)` from `article-toc.tsx` because
`<ArticleToc>` returning null still left their wrapper `<div>` standing, costing
56px of gap on articles below the floor. A React element is truthy even when it
renders nothing.

```ts
export function hasArticleToc(headings: ArticleHeading[]): boolean {
  return groupHeadings(headings).length >= TOC_MIN_HEADINGS;
}
```

It is not a second definition of the floor — it is **the** definition, and they
rewired the component's own guard to call it (`if (!hasArticleToc(headings))
return null`). One expression, one constant, both consumers. That is better than
what I shipped, where the guard was inline and a caller had no way to ask. It
keeps the `<h2>`-groups semantics exactly: orphan `<h3>`s are dropped before the
count, so an article of seven `<h3>`s and no `<h2>` still scores zero. No
conflict with `labelledBy`, which they left intact.

## 6g. The rail shipped, and this is the run that closes the item

UI-17 merged PR #47 (`646b030`) at 19:13:20Z. Everything below is production,
after that deploy.

```
TOCLINT — corpus filter: 15 category hub(s) read from this sitemap; 92 article(s) kept,
          17 URL(s) not article-shaped (home, /artikel, category hubs), 0 reserved-route
TOCLINT — corpus re-derived from https://hellokahwin.com/sitemap.xml at run time:
          109 URLs, of which 92 are articles

articles measured                     92
articles with >= 2 h2 (must have a TOC) 71
articles rendering a TOC              71
contents list placement              71 outside .inspire-prose, 0 inside
accessible name comes from           aria-labelledby #hk-rail-toc-heading x71
contents-list labels found           "Dalam artikel ini" x71
total contents links checked         1057, dangling: 0

VIOLATIONS: none.
  49 x 200 MISS sin1 · 8 x 200 STALE sin1 · 35 x 200 HIT sin1
  measured at 2026-08-31T19:24:32.922Z

TOCLINT EXIT: 0
```

**71 of 71, outside the prose, 0 inside — counted, not sampled.** The two
placement lines were added for this run and stay for every future one: a
relocation that is 69-of-71 done violates nothing *per article* and is invisible
in a per-article verdict, so the report says `MIXED` when both counts are
non-zero. All 71 landmarks take their name from the rail's `<h2>`; not one
carries a leftover `aria-label`.

### The tap floor, on production, on the real rail, unclamped

| width | inner box | anchors | min | max | under 24 |
|---|---|---|---|---|---|
| 390 | 350.00 | 90 | **24.0** | 34.8 | **0** |
| 768 | 704.00 | 90 | **24.0** | 24.0 | **0** |
| 1024 | 268.00 | 90 | **24.0** | 37.7 | **0** |
| 1440 | 268.00 | 90 | **24.0** | 37.7 | **0** |
| 1920 | 268.00 | 90 | **24.0** | 37.7 | **0** |

**450 contents anchors across four articles at five widths, none under 24px**,
`display: inline-flex` throughout. The clamped rows are withdrawn and this
replaces them. The shape cross-checks UI-17's independently measured geometry
without either of us having seen the other's numbers first: 24.0 max at 768 where
the inner box is 704 and nothing wraps, 37.7 from 1024 up where it is 268 and the
longest entries wrap to two lines.

**The 318 is corrected with its reason.** Below 1024 the rail cancels its own
16px horizontal padding so a block shares the prose's left edge — a 16px inset on
a phone would put Rekod to the right of the headline, the two-unrelated-columns
defect UI-10 fixed on the header. The mobile inner box is **350.00**, not 318.
My 318 came from applying the desktop padding to the mobile case.

## 7. Not in scope, raised rather than absorbed

**21 of 86 articles carry zero `<h2>`, and 7 of them are a real defect.** Fourteen
have no headings at all and correctly get no contents list. The other seven use
`<h3>` as their section level with no `<h2>` above it — e.g.
`/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri`, which has `h3=7 h4=5` and
is the page DES-03 §5.1 draws the rail on. An `<h1>` followed by an `<h3>` is a
skipped heading level, an accessibility defect in its own right, and it is what is
costing those seven articles a contents list.

I did **not** widen the component to group `<h3>`s on those pages. The DoD says
present on ≥ 2 `<h2>` **and absent on the rest**; widening would have made my own
required script fail, and it would have papered over a heading-level defect rather
than fixing it. This is a content item, not a TOC item, and it should be filed as
one.

## 8. Shipped

| | |
|---|---|
| PR | https://github.com/ianngkb/hellokahwin/pull/38 |
| Commits | `fbc21e3`, `686e886` |
| Merge | `b38b730` — merge commit, 01 Sept 18:22 UTC |
| Live URL | https://hellokahwin.com/artikel/hiasan-dekorasi/goodies-kahwin |
| Gate | `pnpm audit:toc` · `pnpm audit:toc:selftest` |
| CI | `.github/workflows/article-toc-gate.yml` |

**Production run after deploy:**

```
TOCLINT — corpus re-derived from https://hellokahwin.com/sitemap.xml at run time:
          103 URLs, of which 86 are articles (/artikel/<kategori>/<slug>)
TOCLINT — floor 2, fixed here by UI-18's definition of done and confirmed to match
          TOC_MIN_HEADINGS in src/components/inspire/article-toc.tsx

articles measured                       86
articles with >= 2 h2 (must have a TOC)  65
articles rendering a TOC                 65
contents-list labels found              "Dalam artikel ini" x65
total contents links checked            900, dangling: 0

articles with NO contents list (21) — what IS on them:
  14 x  none
   2 x  h3=7 h4=5
   1 x  h3=8
   1 x  h3=6 h4=3
   1 x  h3=6 h4=7
   1 x  h3=9 h4=6
   1 x  h3=7 h4=4

VIOLATIONS: none.

build fingerprint (status / x-vercel-cache / x-vercel-id region):
  84 x  200 MISS sin1
   2 x  200 HIT sin1
  measured at 2026-08-31T18:24:02.252Z

TOCLINT EXIT: 0
```

Re-run two minutes later, `86 x 200 HIT sin1` — same 86 / 65 / 65 / 900 / 0. The
state is settled, not a mid-deploy reading.

**The link total moved 822 → 900 and only 24 of that is this item.** The two
articles the floor was withholding it from contribute 3 + 21 = 24 links; the rest
is the corpus itself changing under a live site. Measured, not inferred:
`goodies-kahwin` read `h2=3 h4=23` at 17:53 and `h2=4 h3=5 h4=23` at 18:24, so an
editor added a section during the window. The 17:53 run was also served **73 of 86
STALE** while the after-runs were MISS then HIT — a byte count taken across a
changing corpus at two different cache states is not a like-for-like number and is
not quoted as one. `hantaran-kahwin` is the control: 13 links in the pre-fix
capture and 13 now.

What is like-for-like, and what the DoD actually asks for, holds at every reading:
**65 of 65 articles with ≥ 2 `<h2>` render a contents list, 0 articles below the
floor render one, and 0 anchors dangle.**

---

## Retrospective

**What we learned that is not written down.**

A gate that reads its threshold out of the thing it is auditing cannot fail. This
is a distinct failure from the ones the company has already tabulated — it is not
a proxy, not an untested pattern, not a check nobody watched go red. My self-test
was fully paired and passed; the CI job ran and printed real output; the live run
found and named two genuine violations. Everything looked like a working gate.
Raising `TOC_MIN_HEADINGS` back to 4 would have taken the contents list off two
articles and the gate would have printed `VIOLATIONS: none · TOCLINT EXIT: 0`,
because it had adopted the component's opinion as its own definition of correct. A
gate must hold a number that comes from somewhere the code under test cannot
reach.

The second lesson is narrower and has already bitten twice in one day: **I wrote
the "measuring nothing is not a pass" guard for one mode of my own script and did
not carry it to the other.** An hour later the mode without it reported
`VIOLATIONS: none · EXIT 0` over a corpus of zero articles. Knowing the rule is
not the same as having applied it everywhere it applies.

**Which document must change, and who owns the edit.**

`docs/boardroom/ceo-memory.md`, owner `ceo-hellokahwin`, edited by me at source in
this item — the `DALAM ARTIKEL INI` bullet now records that the contents list was
on 63 of 86 and what was actually wrong.
`docs/plans/aug-30-2026-session-01/aug-31-2026-audit-spec-vs-build.md`, same
owner, corrected in place with the original claim struck rather than deleted.
Both UI-17 and UI-18 briefs annotated.

**But prose rules do not fire, so the edit that matters is executable:**

1. `DOD_FLOOR = 2` inside `scripts/audit-article-toc.mjs`, with the gate refusing
   to run at exit 2 when the component disagrees with it — and
   `.github/workflows/article-toc-gate.yml` step *"Does the gate refuse a build
   whose floor is not the DoD's?"*, which raises the constant in a scratch copy on
   every PR and fails the job unless the gate refuses. Narrowing this DoD now
   requires editing a line that says it is the DoD, in a commit CI will argue
   with.
2. The empty-corpus and `NOTHING MEASURED` guards, on all three paths, so no run
   of this gate can ever report a clean bill of health without having judged an
   article.
3. `/admin/design-system` renders `ArticleToc` on a surface with no
   `.inspire-prose`, so re-scoping its CSS breaks visibly on the taste page rather
   than silently in UI-17's rail.

**What we did twice that we should never repeat.**

Searched the live HTML for the exact string we expected and reported the zero as
an absence. This is the **third** instance in one day (the brief itself documents
`REKOD` and `SUMBER`, and it is in my own persona file), and this time it reached
a sprint item, a board memory entry and two briefs before anyone enumerated. The
gate this item ships never tests for a string: it prints the label it reads out of
the DOM and the heading census of every article it finds without one, so the same
mistake produces a *different-looking* number instead of a matching zero.

**Two of the three things we nearly shipped were found by coordination rather
than by testing, and they are the same mistake at two scopes.**

The second was the corpus filter: `three segments under /artikel/` classified
`/artikel/tag/<slug>` — a live 200 with no article body — as an article. Not in
the sitemap today, so the gate was correct by luck, and would have gone red
across the corpus on the day someone added tag pages to the sitemap.

**The rule both of them break, and it is now the thing to check on any new
filter: a scope that is correct only because of what does not exist yet is not a
scope, it is a coincidence with a deadline.** Both were caught by another seat
describing work they had not done yet. Neither was caught by sabotage, because
sabotage tests the checks you thought of against the world you assumed.

**And the count for the day: FOUR separate checks were wrong in a way the pages
were not — and the fourth was the REVIEWER'S.**

The team lead audited all 92 articles independently, with curl and grep rather
than my script, and reproduced 92 / 71 / 71 and `71 outside .inspire-prose, 0
inside` exactly. Their one disagreement — 77 eligible against my 71 — was their
own defect, and it is the same error a fourth time with a fourth author: they
counted `<h2>` document-wide and subtracted only the rail's TOC heading, so every
article carrying a rail scored two phantom headings (`Sumber` from the rail,
`Lagi dalam …` from the footer). Measured on `mas-kahwin-ikut-negeri`:
document-wide 2, inside `.inspire-prose` 0.

**That matters more than the three before it, because the reviewer's check failed
the same way the authors' did.** It is not carelessness by one person. It is a
property of writing a selector from a mental model of where a thing sits, and the
model is always a little out of date — page chrome grew `<h2>`s the day the rail
shipped, and nobody's mental model updated. Now written into the gate's header
(PR #55) with the two derivations named: eligibility comes from the Tiptap JSON
and cannot see chrome; the gate counts the served DOM scoped to `.inspire-prose`;
and `topLevelEntries !== h2` is what asserts they agree rather than trust doing
it.

**And note what caught it — not sabotage, and not a fixture.** A result that
disagreed with a number already established, on an article whose zero-`<h2>`
status had been measured hours earlier. That is the cheapest detector anyone used
today, it needs no rig, and it is available to a reviewer who cannot run your
code. **Establish the number first; then a later disagreement is a free check on
whichever measurement is newer.**

The earlier three, for the record: Mine twice — the `.inspire-prose` scoping and the article-shape
corpus filter — and UI-17's `measure-article-rail.mjs` once, whose mount-count
double-counted `Rekod` because `[data-hk-rail-block="rekod"], .s-rekod` matched a
nested pair twice. Three false reds and zero real defects between them, on a day
when every page involved was fine. A gate that is wrong about a correct page is
not a smaller failure than one that misses a defect; it is the one that teaches
people the gates are noise. **All three were the same error: a selector or a
filter that described where the author expected the thing to be, rather than what
the rule actually says.**

**And the other half of the pattern, which is a trade rather than a bug.**
UI-17's rail gate takes a HARDCODED target list; mine derives its targets from
the sitemap. My #51 trap — an article-shaped URL that is not an article — cannot
reach theirs. Their failure mode is the opposite and they named it rather than
solved it: a manifest goes stale as the corpus grows, so a new article is simply
never checked, silently, forever. **Neither choice is safe on its own, and the
two failures are invisible to each other:** a derived list can admit the wrong
pages, a fixed list can omit the right ones. Ours are complementary today by
accident, not by design. The rule worth keeping is that whichever you pick, the
run must PRINT its own target arithmetic — mine prints the corpus filter's
counts, theirs should print how many of the live corpus its manifest covers, so
staleness shows up as a number rather than as silence.

**The first of the two.**

My own gate scoped `nav.article-toc` to inside `.inspire-prose`. UI-17's rail
sits outside it. **The morning the relocation deployed, TOCLINT would have
reported `MISSING contents list` on all 68 eligible articles at once — a
sitewide red run on a completely correct change.** That is worse than a gate that
misses a defect: a false red is what teaches a team to stop reading gates, and it
would have arrived on the day someone else's correct work landed, pointing at
them.

Neither sabotage found it, because sabotage tests the checks you thought of
against the world you assumed. It was found by another seat describing a change
they had not made yet. **The generalisable rule, and it is now in the file as a
comment beside the lookup: a gate asserts what the DoD says, at the scope the DoD
says it. The DoD said a contents list renders on the article. It never said which
box, and neither should the check.** Three paired fixtures now hold that —
`ok-toc-in-rail` must be clean, `bad-toc-duplicated` and `bad-toc-two-headings`
must fire.

**What we nearly shipped, and what caught it.**

Two things, neither caught by reading.

A gate incapable of failing on the regression it was written for — caught by
sabotaging `TOC_MIN_HEADINGS` and watching the gate stay green, i.e. by running
the fix against the failing case rather than by understanding the cause.

And a green run over nothing at all — caught by pointing the gate at a Vercel
preview, which returned **HTTP 200** from vercel.com's login page for
`/sitemap.xml` and produced `articles measured 0 · VIOLATIONS: none · TOCLINT
EXIT: 0`. Had I only ever run it against production, where the sitemap always
answers, that path would have shipped and the first person to run it against a
preview would have been told their branch was fine.
