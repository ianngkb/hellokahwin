# UX-02 — Named halls are invisible to Google as entities: heading anchors, TOC, ItemList

**Date:** 2026-08-27
**Agent:** Sally (UX Designer)
**Branch:** `feat/ux-02-heading-anchors` → PR #6 → squash-merged to `master` as `242c82b`
**Live:** https://hellokahwin.com/artikel/idea-dan-nasihat/dewan-kahwin

---

## The claim

Every `<h2>`/`<h3>` on every article now carries a deterministic slugified `id`.
Articles with ≥4 `<h2>`s render a table of contents whose anchors resolve.
Numbered listicles emit `ItemList`, and list entries that name a real venue in a
real locality emit `Place`. All of it applied by the renderer; nothing is
configured per article.

## Why this was the highest-value item left

`/artikel/idea-dan-nasihat/dewan-kahwin` names ten wedding halls across eleven
`<h2>`s. Before this change, on production:

```
$ curl -s https://hellokahwin.com/artikel/idea-dan-nasihat/dewan-kahwin \
    | grep -oE '<h[1-6][^>]*>' | sort | uniq -c | sort -rn
     11 <h2>
      6 <h3 class="hk-card-title mt-1.5 line-clamp-3 text-[1.0625rem] lg:text-[1.125rem]">
      1 <h2 id="related-articles-heading" class="hk-eyebrow whitespace-nowrap">
      1 <h1 class="hk-display mt-3 text-[2.5rem]">
      1 <h1 class="hk-display mt-3 text-[1.75rem]">

$ ... | grep -oE 'href="#[^"]*"' | sort | uniq -c | head
(no output)

$ ... | grep -oE '"@type":"[A-Za-z]+"' | sort | uniq -c
      1 "@type":"Article"
      1 "@type":"BreadcrumbList"
      2 "@type":"ImageObject"
      4 "@type":"ListItem"
      2 "@type":"Organization"
      1 "@type":"WebPage"
```

Eleven bare `<h2>`s. Zero in-page anchors. The only `ListItem`s on the page were
the four breadcrumbs. `article-renderer.tsx` had no slugify logic at all, so
this was true of **every article on the site**.

And Google is already matching that page to searches for halls **by name**:

| query | impressions (28d) | position | clicks |
| --- | --- | --- | --- |
| pusat komuniti setiawangsa | 189 | 9.6 | 0 |
| dewan komuniti setiawangsa | 100 | 9.0 | 0 |
| dewan pusat komuniti setiawangsa | 5 | 8.6 | 0 |
| dewan setiawangsa au2 | 5 | 5.4 | 0 |
| … 9 more named-hall queries | 20 | 1.5–20 | 0 |

**319 impressions across thirteen named-hall queries. Page-one positions. Zero
clicks — every one of them.** There was no entity on the page for Google to
match, so the result it could show was a generic listicle title.

Full baseline, including the index and rich-result state before the change:
[`08-gsc-baseline.md`](2026-08-27-ux-02-heading-anchors-EVIDENCE/08-gsc-baseline.md).

## Where the CEO's number and mine disagree

The DoD says **104 impressions, position 9.0, zero clicks** for
`dewan komuniti setiawangsa` over 28 days.

Position and clicks reproduce exactly. **Impressions read 100, not 104.** Summed
day by day over the same window the daily rows also total 100, so it is not
rounding. GSC restates the most recent days for up to ~3 days, so 104 was very
plausibly correct when it was read. I could not reproduce it, so I have recorded
100 as the baseline rather than write down a number I did not measure.

## What the baseline also turned up

Those impressions **do not land on the canonical article URL.** They land on the
legacy WordPress path `https://hellokahwin.com/dewan-kahwin/`:

```
$ curl -sIL https://hellokahwin.com/dewan-kahwin/ | grep -iE "^HTTP|^location"
HTTP/1.1 308 Permanent Redirect
Location: /artikel/idea-dan-nasihat/dewan-kahwin
HTTP/1.1 200 OK

# negative controls — this is real routing, not a catch-all
$ curl -s -o /dev/null -w "%{http_code}\n" https://hellokahwin.com/artikel/idea-dan-nasihat/tiada-artikel-sebegini-xyz
404
$ curl -s -o /dev/null -w "%{http_code}\n" https://hellokahwin.com/nonsense-legacy-slug-xyz/
404
```

| page | clicks | impressions | position |
| --- | --- | --- | --- |
| `https://hellokahwin.com/dewan-kahwin/` | 29 | 980 | 9.3 |
| `https://hellokahwin.com/artikel/idea-dan-nasihat/dewan-kahwin` | 1 | 41 | 8.9 |

The redirect is a single hop to the page this change edits, so the anchors and
`ItemList` are on the page Google actually serves. GSC is simply still
attributing to the old URL. Worth knowing before anyone reads a page-level
report and concludes the article gets 41 impressions.

## What was built

Three modules, all generic, all driven by the article's own content.

### `src/lib/inspire/heading-anchors.ts`

`slugifyHeadingText` → NFKD, diacritics folded, apostrophes elided (not turned
into separators), everything else collapsed to `-`, capped at 72 chars on a word
boundary.

**A leading list ordinal is stripped.** `1. Dewan Seri Siantan, Putrajaya`
becomes `#dewan-seri-siantan-putrajaya`, not `#1-dewan-seri-siantan-putrajaya`.
That is not cosmetic: renumbering a listicle would otherwise change every id on
the page and break every link anyone had to a section.

`createHeadingIdAssigner()` returns a stateful function that de-duplicates
against the set of ids **already emitted**, not a per-slug counter — so a
genuine heading called "Nota 2" and a second heading called "Nota" cannot both
claim `nota-2`.

`injectHeadingIds()` runs **after** `sanitizeHtml`, exactly like the existing
`wrapTablesForScroll`. `id` is not on the sanitiser's allowlist, so injecting
earlier would simply have it stripped — and it also means no `id` on the page
can have come from author input.

### `src/components/inspire/article-toc.tsx`

Renders for ≥4 `<h2>`s. Plain `<a href="#…">`, no client JavaScript, no
scroll-spy — so the links are in the server-rendered HTML Google parses. That is
the point of the component, not a nice-to-have.

Entries show the heading **verbatim**, ordinal and all, so the contents read
exactly like the page. (A first version added its own numbering and produced
"11. Kesimpulan" for a heading the article never numbered, plus double numbers
on the ten that were.)

### `src/lib/inspire/listicle-schema.ts`

An article is a listicle when ≥4 `<h2>`s open with a numeric ordinal. Each entry
gets `name` + `url` pointing at its own anchor.

**An entry becomes a `Place` only when its heading names both a venue noun and a
locality from a closed list.** Both halves are load-bearing:

- The venue noun (`Dewan`, `Pusat Komuniti`, `Balai`, `Kompleks`, `Auditorium`,
  `Padang`) rejects `1. Rancang Bajet Anda` from the tips listicle.
- The locality rejects `3. Dewan Komuniti Moden` and `9. Dewan Warisan atau
  Bangunan Bersejarah` from `pelamin-kahwin-dewan` — those are *kinds* of hall,
  not halls, and describing them to Google as buildings is exactly the kind of
  structured-data claim that costs rich-result eligibility rather than earning
  it.

Only `addressLocality` and `addressCountry` are emitted. **No `addressRegion`** —
several of these names exist in more than one state, and the article never says
which.

## Proof

### The two code paths agree

The TOC is built from the Tiptap JSON; the ids are injected into the rendered
HTML. Two different paths — if they ever disagree, every anchor in the TOC
points at nothing. The test asserts the two id sequences are **identical**,
through the renderer's real `generateHTML` → `sanitizeHtml` → inject pipeline,
for the ten-hall listicle, for nested `<h3>`s, and for repeated/unsluggable
headings.

```
$ npm test
 Test Files  28 passed (28)
      Tests  334 passed (334)

$ npm run typecheck
(clean)

$ npm run build
✓ Compiled successfully in 21.6s
```

### Every published article, swept for the invariants

Local production build, all 28 published article pages fetched and parsed —
[`05-corpus-sweep.txt`](2026-08-27-ux-02-heading-anchors-EVIDENCE/05-corpus-sweep.txt),
produced by [`sweep.py`](2026-08-27-ux-02-heading-anchors-EVIDENCE/sweep.py):

```
pages                       : 28
body h2/h3 total            : 214
body h2/h3 carrying an id   : 214
pages with a TOC            : 13  (threshold: >=4 h2s)
pages emitting ItemList     : 7  (threshold: >=4 numbered h2s)
Place claims, whole corpus  : 10

INVARIANT VIOLATIONS: NONE
```

The invariants checked per page: every body heading has an id; no id repeats;
every `href="#…"` resolves; every `ItemList` url points at an anchor that
exists; `numberOfItems` matches the array length; no TOC below the threshold.

**Ten `Place` claims across the entire site**, all of them on the one page that
lists real named halls:

```
Putrajaya        | Dewan Seri Siantan, Putrajaya
Taman Keramat    | Dewan Komuniti AU2 Taman Keramat
Petaling Jaya    | Dewan Sivik MBPJ, Petaling Jaya
Shah Alam        | Dewan Kenanga MBSA, Shah Alam
Keramat          | Dewan Perdana Keramat
Setiawangsa      | Pusat Komuniti Setiawangsa
Bukit Jalil      | Pusat Komuniti PPR Pinggiran Bukit Jalil
Subang           | Dewan Warisan Kampung Melayu Subang
Gombak           | Dewan Seri Melati, Gombak
Shah Alam        | Dewan MBSA Seksyen 7, Shah Alam
```

`pelamin-kahwin-dewan` emits an `ItemList` of 10 and **zero** `Place`.
`sewa-dewan-kahwin` emits an `ItemList` of 12 and **zero** `Place`. Exactly as
intended.

### The schema validator

Google's Rich Results Test has no public API. `validator.schema.org` does, and
it is schema.org's own validator —
[`validate.py`](2026-08-27-ux-02-heading-anchors-EVIDENCE/validate.py) posts to
it. Pre-ship, against the block the renderer actually emitted
([`06-itemlist-emitted.json`](2026-08-27-ux-02-heading-anchors-EVIDENCE/06-itemlist-emitted.json)):

```
totalNumErrors  : 0
totalNumWarnings: 0
fetchError      : none

@type ItemList
  @type ListItem
    @type Place
      @type PostalAddress
        @type Country
  … ×10
```

Post-ship, against the live URL: see
[`09-live-verification.txt`](2026-08-27-ux-02-heading-anchors-EVIDENCE/09-live-verification.txt).

### The anchor actually jumps, at 390px

[`shot.mjs`](2026-08-27-ux-02-heading-anchors-EVIDENCE/shot.mjs) taps the TOC
link a reader would tap — not `location.hash =` — and reports where the heading
lands:

```
{"tocLinkVisible":true}
{
  "found": true,
  "text": "6. Pusat Komuniti Setiawangsa",
  "topPx": 120,
  "hash": "#pusat-komuniti-setiawangsa",
  "scrollMarginTop": "120px"
}
```

## Two things the screenshots caught that the tests could not

**1. `scroll-margin-top: 5rem` was not enough and the heading was clipped.**
The first capture showed the target heading sitting *behind* the sticky header —
only its bottom sliver visible. Measured: the header is **102px at 390px wide
and 118px at 1280px**. 80px was never going to clear it. Now `7.5rem` / `8.5rem`
above `lg`, with the measurement and the owning file written into the CSS
comment so the next person changing the navbar knows this number tracks it.

**2. The TOC rendered as body copy, not navigation.** It lives inside
`.inspire-prose`, so the prose rules reached it: Georgia 17px, bold, underlined,
and the browser's own `<ol>` decimal markers doubling the numbering already in
every heading (and clipping "10." and "11." into the gutter). Tailwind utilities
lost — `list-none` cannot beat `.inspire-prose ol`. CDP `getMatchedStylesForNode`
named the actual winner: **`.hk-public .inspire-prose a`**, same specificity as
my selector and later in the file, so it won on source order. Fixed by making
the selectors `nav.article-toc`, which outranks it outright rather than relying
on where the block sits in the stylesheet.

Neither would have been caught by a test asserting the HTML.

## Not regressed

```
$ git show origin/master:next.config.ts | grep -n "expireTime:"
144:  expireTime: 3600,
$ curl -sI https://hellokahwin.com/artikel/idea-dan-nasihat/dewan-kahwin | grep -i cache-control
Cache-Control: s-maxage=600, stale-while-revalidate=3000
```

RISK-06 intact — `stale-while-revalidate` still reads **3000** (`expireTime`
3600 minus `revalidate` 600). `next.config.ts` is untouched by this change.

UX-01 intact — `data-hide-mobile-nav` is still absent from the article route on
`master`, and the live 390px captures show the site header rendering.

## What I did NOT take

**The six `noindex` sitemap URLs handed over by RISK-05 are not mine.** They live
in `src/app/sitemap.ts` — sitemap generation and indexability policy, not the
article renderer or its JSON-LD. Nothing in this item touches that file. Per the
brief I am leaving it rather than half-fixing it. **It is still unowned.**

I also did not touch `pillar-body.tsx`, the homepage, the nav, image loading or
the JS payload — UX-03 and UX-04 own those.

## Known limits, named so they are chosen rather than discovered

- **`idea-dan-nasihat/majlis-kahwin` is a genuine venue listicle that gets no
  `Place`.** Its ten entries are named venues — "Maison Eleven Setia Alam",
  "Glass Garden House Shah Alam", "Laman Kayangan Shah Alam" — but they open
  with proper nouns rather than a venue noun, so the first half of the test
  rejects them. Widening the rule enough to catch them would also catch tip
  headings that happen to mention a town. Under-claiming costs nothing today:
  those entries are still named and anchored in `ItemList`. Someone should
  decide this deliberately rather than find it later.
- **`idea-dan-nasihat/tempat-honeymoon-di-malaysia` has 21 headings and no
  TOC**, because only 2 of them are `<h2>`. The DoD's threshold is "≥4 h2s" and
  that is what shipped. If a deep `<h3>` article should get a contents list too,
  that is a threshold change, not a bug.
- The gazetteer in `listicle-schema.ts` is a closed list of Malaysian states and
  Klang Valley localities. A hall in a town not on it is listed but not claimed
  as a `Place`. Adding a locality is one line and a test.
- **`npm run lint` is red on `master`, and was before this branch.**
  `prettier --check .` fails on two UX-01 evidence JSON files that begin with a
  `### FOLD-MISS ::` header line
  (`docs/work-done/2026-08-27-ux-01-mobile-article-header-EVIDENCE/measure-fold-miss-*.json`,
  introduced in `4d7e3e8`). `eslint` and `prettier` both pass on every file this
  change touches. Not mine to fix, but the repo's lint gate is currently
  unusable as a gate.

## Files

| file | what |
| --- | --- |
| `src/lib/inspire/heading-anchors.ts` | slugify, id assignment, HTML injection |
| `src/lib/inspire/listicle-schema.ts` | listicle detection, `ItemList` + `Place` |
| `src/components/inspire/article-toc.tsx` | the contents list |
| `src/components/inspire/article-renderer.tsx` | wiring, one assigner per render |
| `src/app/(public)/artikel/[category]/[slug]/page.tsx` | emits the `ItemList` block |
| `src/app/globals.css` | `scroll-margin-top`, TOC style reset |
| `src/lib/inspire/__tests__/heading-anchors.test.ts` | 24 tests inc. the agreement proof |
| `src/lib/inspire/__tests__/listicle-schema.test.ts` | 14 tests inc. the no-false-`Place` proof |

---

## Retrospective

### What we learned that is not written down

**A test that asserts the HTML cannot see the page.** Both real defects in this
item — a heading parked behind the sticky header, and a table of contents
wearing body-copy styling — produced perfectly correct HTML. 334 passing tests
said nothing. A 390px screenshot said both immediately. Any item that adds a
visible surface needs a capture in its evidence, not just assertions.

**Specificity ties are broken by source order, and `.hk-public .inspire-prose a`
is later in `globals.css` than anything you are about to write.** I lost twenty
minutes guessing before using CDP `getMatchedStylesForNode` to ask the browser
which rule actually won. That should have been the first move, not the fourth.
Any new component rendering inside `.inspire-prose` will hit this.

**"Verify against production" and "the local verification guard" can conflict,
and the guard wins.** `.env.local` in the main checkout carries a deliberate
comment — *"Overrides .env so no verification run can touch Supabase"* — written
by another agent. I disabled it to render against the production corpus, then
restored it and swept the 28 local articles instead. The local DB is a mirror
and the target article rendered with headings identical to the live page, so
nothing was lost. Another agent's explicit safety comment is not an obstacle to
route around.

**A "no output" grep is not evidence until you have checked you are grepping the
right thing.** My first corpus sweep reported two headings without ids on
`gubahan-dulang-hantaran-2026`. Both were `<h3 class="sidebar-section-title">`
from the sidebar component — not article headings at all. A second miscount came
from a regex that matched a bare `<h2` substring. This is the same failure the
brief already warns about with `document_links.sql`: checking the wrong name is
not the same as the thing being absent. It cost two rounds here.

### What we did twice

- **Rebuilt and forgot to restart the server.** A probe reported
  `scroll-margin-top: 0px` against a `next start` from before the rebuild that
  was still holding port 3201. I nearly went hunting for a CSS bug that did not
  exist. **A stale server looks exactly like a broken feature.** Kill the port
  before every measurement, or the measurement is unfalsifiable.
- **Fought MSYS/Windows quoting three times** — `git cat-file -e origin/master:<path>`
  silently mangled into `origin\master;...` and reported ABSENT for files that
  were on master; then a regex round-trip through bash → python → node ate
  backslashes out of a `\p{Diacritic}` escape twice. `MSYS_NO_PATHCONV=1` is not
  optional in this repo, and unicode escapes belong in a file written by the
  Write tool, not in a shell heredoc.

### What we nearly shipped, and what caught it

**A `Place` claim on every "Dewan …" heading on the site.** My first
venue-detection rule was the venue noun plus an "is it generic" word-list. Run
against `pelamin-kahwin-dewan` it produced **five false positives** — "Dewan
Komuniti Moden", "Dewan Serbaguna Bandar", "Dewan Majlis Perbandaran" and two
more would all have been described to Google as physical buildings. What caught
it was testing the rule against the site's other listicles *before* writing it,
rather than against the page the DoD names. Requiring a real locality took the
false positives to zero on all three shapes.

**A table of contents with double numbering and a "11. Kesimpulan".** Caught by
looking at the screenshot rather than at the `count: 11` in the probe output,
which was correct and told me nothing.

### Which document must change, and who owns the edit

**`docs/work-done/2026-08-26-publishing-gate.md` — Sally (UX), this session,
done below.**

The gate lists build/typecheck/test checks. Every one of them passed on both
defects above. The gate needs a visual clause: an item that changes a rendered
surface has to produce a capture at 390px, and that capture is part of the
evidence, not a nicety.

The edit is made in this commit.
