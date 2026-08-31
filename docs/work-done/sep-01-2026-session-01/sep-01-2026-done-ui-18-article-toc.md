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
