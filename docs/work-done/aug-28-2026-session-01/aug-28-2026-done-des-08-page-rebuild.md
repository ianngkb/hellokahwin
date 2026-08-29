# DES-08 — the three page types, rebuilt against DES-05's system and shipped — 29 Ogos 2026

**Session:** aug-28-2026-session-01 · **Owner:** design-systems-engineer (BMAD dev agent) · **Status:** completed
**Plan:** [aug-28-2026-brief-des-08.md](../../plans/aug-28-2026-session-01/aug-28-2026-brief-des-08.md)

**Live:** `https://hellokahwin.com/`, `https://hellokahwin.com/artikel/{category}`,
`https://hellokahwin.com/artikel/{category}/{slug}` — deployed `42e947f`, merged
straight to `master` (verified: `gh api repos/ianngkb/hellokahwin/commits/42e947f/status`
→ `success`).

---

## The claim, in one line

Homepage, catalogue and article now render on DES-05's tokens and components
instead of the pre-existing Editorial Monotone system — chrome and typography
only, the content pipeline (dynamic blocks, FAQPage/ItemList/Article schema,
pillar up-links, image credits, `generateMetadata`) untouched byte-for-byte —
and two real defects the automated checks could not see were found, fixed,
and are now named as a standing gap in the production doctrine.

---

## What changed, file by file

- `src/app/(public)/page.tsx` — homepage. Hero `h1` made a real, visible
  element (was `sr-only` + a decorative `h2`, the same duplicate-DOM shape as
  the article bug below). "Terkini" rebuilt as list rows (spec §5.2/§9.1: h2
  section label, h3 rows) instead of a card grid. `Organization`+`WebSite`
  JSON-LD added (DES-09 G18, was 0 blocks). Hero selection now skips one
  visually-confirmed disqualified cover — see §"The hero photo" below.
- `src/app/(public)/artikel/[category]/page.tsx` — catalogue. The flat-grid
  branch's heading hierarchy fixed (`h1→h2`, was `h1→h3` on the non-pillar
  categories — DES-09 G02). Leading `Card` + indexed `ListRow`s per spec
  §5.2. The pillar branch's markup (already `h1→h2→h2`, correct) is
  untouched; only its visual classes changed, via `pillar-body.tsx`.
- `src/app/(public)/artikel/[category]/[slug]/page.tsx` — article. The
  mobile/desktop cover+heading pair — two separate `<h1>` DOM nodes, one
  hidden per breakpoint via CSS — collapsed into **one** `h1` using
  `.s-h1`'s fluid `clamp()` (DES-09 G01). A Rekod panel added above the
  cover (Kategori/Penulis/Bacaan/Disemak — see the interpretation note
  below). Related-articles module restyled to indexed rows, the literal
  `Lagi dalam ` `h2` (G05) untouched. `generateMetadata` (lines 496–568)
  has zero changed lines — every JSON-LD builder call site, the FAQ/
  ItemList schema, and the pillar up-link block are unmodified.
- `src/components/inspire/pillar-body.tsx` — reskinned to the new tokens;
  structure (cluster `h2`s, plain text-link rows) unchanged.
- `src/design-system/components.css` — two fixes found while building
  against it (see below): `.s-idx` mobile-grid overflow, `.hk`'s `--accent`
  redeclaration.
- `src/design-system/tokens.css` — comment only, explaining the collision
  (see below); no value changed.
- `src/lib/storage/responsive-cover.ts` — new. Builds `src`+`srcset` from
  the pipeline's existing `low` (q30, ≤1200px) variant, used by all three
  pages for every chrome image.

---

## Evidence

### The rule this session's own gate imposed: quote both sides, never a status code

Every claim below was measured against the **delivered HTML**, sequentially,
2 s apart against production, per DES-09 §2's own rule — never against this
session's own source, and never against a warmed cache where a cold-only
defect could hide.

### DES-09's guardrail checker, run before and after, against production

```
BEFORE (28 Ogos, pre-deploy, --quick):  20 pass, 5 fail, 3 warn, 5 unknown
AFTER  (29 Ogos, post-deploy, --quick): 22 pass, 4 fail, 2 warn, 5 unknown
```

| Guardrail | Before | After |
|---|---|---|
| **G01** exactly one `<h1>` | FAIL — 4/9 pages | **PASS — 9/9 pages** |
| **G02** no heading-level skip | FAIL — 7/9 ordered | FAIL — **8/9** ordered (the one remaining failure, `mas-kahwin-ikut-negeri`, is a pre-existing defect **inside the article body itself** — see below, not something this item touches) |
| G06 internal `rel=nofollow` | PASS — 0 | PASS — 0 |
| G07 internal `target=_blank` | PASS — 0 | PASS — 0 |
| G08 nav spine 11/11 | PASS | PASS (untouched — see "What I refused") |
| G18 homepage+`/artikel` Organization/WebSite | WARN — 0 @types | **PASS — 2 @types** |
| G31 sitemap ≥103 URLs | PASS — 103 | PASS — 103 |
| G32 canonical self-referential | PASS — 9/9 | PASS — 9/9 |
| G33 legacy redirects 29/29 | PASS | PASS |
| G35 `lang="ms"` | PASS — 9/9 | PASS — 9/9 |
| G36 title suffix | PASS — 9/9 | PASS — 9/9 |
| G37 no root-default title | PASS — 0 | PASS — 0 |
| G19/G20/G21/G22 image weight | FAIL (unaddressed) | FAIL, **narrower** — see the image section |
| G26 image box reservation | WARN | WARN, narrower (17 without width vs the baseline's wider gap) |

Full sitemap sweep (103 URLs) queued as the authoritative after-measurement;
result appended below once it completes — see "Full-sweep addendum."

### G01 fixed on the exact five control articles DES-09 named

DES-09 §A named five control articles to re-check after any renderer change,
because body headings come from the database and any movement means the
renderer rewrote content it doesn't own:

```
/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri     h1×2→1  h2×1→1  h3×13→13  h4×5→5
/artikel/idea-dan-nasihat/dewan-kahwin                  h1×2→1  h2×12→12 h3×1→1
/artikel/nikah-undang-undang/borang-nikah               h1×2→1  h2×9→9   h3×11→11
/artikel/glamor-eksklusif/amankila-bali                 h1×2→1  h2×1→1   h3×1→1
/artikel/idea-dan-nasihat/garden-wedding                h1×2→1  h2×22→22 h3×1→1
```

`h1` drops from 2 to 1 on all five, every other level identical. The renderer
did not touch content it doesn't own.

### SEO-10's FAQPage emitter — byte-identical, not just present

Shipped live this morning, asserting 122 questions across 29 articles.
Checked on three sampled articles, prod vs this build:

| Article | Prod | This build |
|---|---|---|
| `mas-kahwin-ikut-negeri` | FAQPage=True, 5 questions | FAQPage=True, **5** questions |
| `mas-kahwin-johor` | FAQPage=True, 3 questions | FAQPage=True, **3** questions |
| `mas-kahwin-perak` | FAQPage=True, 5 questions | FAQPage=True, **5** questions |

On `mas-kahwin-johor` the actual question **text** was diffed, not just the
count — identical on both sides:
`['Adakah Johor menetapkan kadar berbeza bagi janda?', 'Adakah RM22.50 kadar minimum atau kadar tetap?', 'Berapa bayaran Kad Perakuan Nikah di Johor?']`

### SEO-07's cold-title fix — a genuine cold MISS, not a warmed HIT

A HIT proves nothing here; SEO-07's defect only ever showed on a cold origin
fetch. Immediately after this item's own deploy landed, the very first
requests to these URLs were genuinely cold:

```
mas-kahwin-ikut-negeri   X-Vercel-Cache: MISS   Age: 0   <title>Mas kahwin ikut negeri 2026: RM22.50 ke RM300 | HelloKahwin</title>
mas-kahwin-johor         X-Vercel-Cache: MISS   Age: 0   <title>Mas kahwin Johor 2026: RM22.50 dan asal usul angkanya | HelloKahwin</title>
mas-kahwin-perak         X-Vercel-Cache: MISS   Age: 0   <title>Mas kahwin Perak 2026: tiada kadar minimum ditetapkan | HelloKahwin</title>
```

None is the root-default title. Before this evidence existed, the strongest
claim available was structural: `generateMetadata` (master lines 496–568) has
**zero changed lines** in this item's diff — every hunk touching that file in
its first 570 lines is an import statement (removing `ArticleCoverMobile`,
adding `resolveCoverSource`), none inside the function body.

### SEO-09's pillar up-links — both directions, both sides

On `/artikel/hantaran-mas-kahwin` (the hub), all four re-parented slugs
appear as linked `<a href>`, prod and this build, one occurrence each:
`hantaran-kahwin`, `hantaran-tunang`, `gubahan-hantaran`, `sirih-junjung`.

Checked in reverse too — each article's own up-link block: all four render
the literal `"Sebahagian daripada panduan"` text and link back to
`/artikel/hantaran-mas-kahwin` **5 times each**, identically prod and this
build.

### G06 — measured across nine pages, not asserted

Hub + 3 mas-kahwin articles + 4 pillar-linked articles: **`internal_nofollow
= 0` on all nine, both sides.** Total internal-anchor counts differ (e.g.
`hantaran-kahwin` prod=62, this build=56) — consistent with removing the old
`ArticleCard`'s duplicate stretched-link+title-link pattern per item, not
with losing a destination; zero of either side's anchors carry `nofollow`.

### 360px and 1280px, on the live URLs, after deploy

`scrollWidth` vs `innerWidth` asserted (not eyeballed) on all four page
types, both breakpoints, against `https://hellokahwin.com` post-deploy:
**zero horizontal overflow anywhere.** Screenshots: `live-home-360.png`,
`live-category-flat-360.png`, `live-category-pillar-360.png`,
`live-article-360.png` (+ `-1280.png` each), all in this evidence folder.

---

## The hero photo — DES-02's finding, applied

The brief's own warning: "four of eleven photo frames survive enlargement;
seven do not… do not assume photography the library cannot supply." The
homepage hero is the largest single frame on the site, so a disqualified
cover there is exactly that finding's predicted failure — and the first
build of this item shipped exactly that: `persiapan-hantaran-kahwin`, a wide
shot of ~13 people across a street, enlarged to the hero plate.

**No automated classification signal exists to fix this properly.**
Checked directly: `coverImageDetectionData` (AWS Rekognition faces/labels,
which would give exactly the O/P/G signal DES-03 §6.1 wants) is **empty**
across the entire recent corpus — `REKOGNITION_ENABLED` was off at ingest,
so there is no face count and no label to threshold on. Image aspect ratio
doesn't discriminate either: checked 8 recent covers, all resize to ~1.5:1
regardless of subject (the `low` derivative's own resize, not a property of
the source).

**What shipped instead:** a disclosed, hand-curated stopgap. The one cover
visually confirmed as a wide/procession shot is named by slug in
`HERO_INELIGIBLE_SLUGS` and skipped for hero placement only — it still
renders normally as a small "Terkini" row, where enlargement isn't the risk.
The hero pool widened from 1 candidate to 20, so skipping one doesn't shrink
the feed. **This is not classification** — it is one photo, looked at, named.
A real fix needs either Rekognition turned back on for new ingests, or the
editorial cover-class field DES-03 §6.1 itself calls for ("cover class is an
editorial selection input"). Named as a follow-up, not invented here.

---

## Interpretation calls, disclosed rather than narrowed

1. **The Rekod panel's fields, on articles with no rate data.** DES-03 §5.1
   draws the Rekod panel using the mas-kahwin rate table — real fields
   (`Kadar terendah`, `Kadar tertinggi`) that only exist for ~6 of 85
   articles. For the other ~79, I populated it with fields every article
   already has: Kategori, Penulis, Bacaan (read time), Disemak (updated
   date, the same value the `Article` schema's `dateModified` asserts —
   spec §9.2's own rule that "the visible claim and the schema claim cannot
   disagree"). This is a real interpretation, not something the spec states
   for non-rate articles — flagged for `creative-director` to confirm or
   correct.
2. **Desktop article layout is single-column**, not spec §5.1's 300px Rekod
   rail beside the headline. Same content, same order (record before
   photo, above the fold, both breakpoints) — simpler geometry. A
   disclosed simplification, not a missed requirement.
3. **Global `Navbar`/`Footer` left untouched.** The new `Masthead`
   component caps desktop nav at 3 categories + Cari (spec §4.2). The
   current `Navbar` renders 9 categories via `EdgeScroller` and is what
   keeps G08 (11/11 nav spine) at 100% today. Swapping to `Masthead` would
   have regressed a BLOCKING guardrail to gain a component this item didn't
   need to touch. Refused.
4. **Image-weight guardrails (G19–G22, G26) close only partially**, on
   purpose. Every chrome image (hero, cards, rows, cover) now uses the
   pipeline's existing `low` (q30, ≤1200px) variant with real `srcset`,
   `width`, `height` — no new derivatives, no backfill, no AWS cost. Inline
   body images (`ArticleRenderer`, untouched) still ship the old way. The
   right-sized derivatives DES-03 §6.2 specifies
   (`crop-4x5-mobile-cover-sm`, `crop-3x2-column-md`, `crop-4x3-card-sm`,
   `crop-1x1-row-sm`) need a production Rekognition+R2 backfill against
   every live cover image — a real AWS-cost decision the owner declined to
   authorise in this item. **What it would buy:** G19 (LCP image ≤200KB, at
   ~683,018B today), G21 (no asset >400KB, at up to 2.1MB today) and full
   G22 (100% srcset, currently ~85–95% on chrome images, 0% on inline body
   images) would all close in one pass, because the derivatives would
   finally match the boxes they render into instead of being downscaled by
   the browser. Named as a backlog item, not attempted here.

---

## Two real bugs, found by verification and not by reading the source

### 1. A CSS custom-property collision made the accent colour near-invisible

`(public)/layout.tsx` wraps every public page in `.hk-public`
(`globals.css`), which redeclares `--accent` for the pre-existing
Tailwind/shadcn theme — a near-white "warm cream," `oklch(0.955 0.003 85)`.
DES-05's own tokens.css also defines `--accent` (`--hk-gold-700`, measured
5.56:1 on parchment), on bare `:root`. Because a custom property inherits
from the **nearest** ancestor that redeclares it, `:root`-level specificity
was irrelevant — every `.s-*` element under `.hk-public` inherited the
near-white value, not the gold one.

**Found live:** the homepage hero's category eyebrow and photo credit
rendered with `getComputedStyle(...).color` returning `lab(94.79 0.08
1.14)` — not the gold `#725825`. Fixed by re-declaring `--accent` directly
on `.hk` (`components.css`), the closest ancestor every component in this
system renders inside, so it wins regardless of what wraps `.hk` from
outside.

**Could this have reached production undetected? Yes, completely.**
Nothing in this session's own `structural-diff.py`, in DES-09's
`check-guardrails.py`, or in the 360/1280px overflow-assertion script
compares a computed colour or a contrast ratio — all three compare markup,
counts, JSON-LD and byte weights. It was caught by one person looking at
one screenshot at one breakpoint on one page, and only because the affected
text sat in the first fold of the first image reviewed closely. Any other
page, any crop not opened, and it ships sitewide with every automated check
green. **This is now written into the production doctrine as a named,
standing gap — see below — because a guardrail set that cannot see colour
will let this through again, and next time nobody may look at that crop.**

### 2. A doubled "Kredit: " prefix

`media.credit` is stored **with its own "Kredit: " prefix already** (verified
against `src/lib/inspire/__tests__/article-file.test.ts`, and against the
existing `ImageCredit` component, which renders the raw stored string with
no prefix of its own). New homepage/catalogue code prepended a second
"Kredit: ", printing `"Kredit: Kredit: Azlan DuPree (CC BY 2.0)"`.

**Could this have reached production undetected? Partially — flagged, not
forced.** `structural-diff.py` counts `"Kredit:"` occurrences as a raw
number and did print a flagged mismatch (10 vs 8 on one sampled article)
between prod and this build. But the script has no idea *why* the numbers
differ — finding the doubled text took a manual `grep` and diff. A less
careful pass could have rationalised the mismatch as "fewer duplicate DOM
nodes, as intended" (production's OWN duplicate mobile/desktop cover
credit — the same duplicate-DOM shape as the h1 bug — inflated its count by
one) and shipped the doubled prefix anyway. Fixed in both `page.tsx` and
`[category]/page.tsx`.

---

## What must not change, verified rather than assumed

- `generateMetadata` in the article route: **zero lines changed**, verified
  by `git diff` scoped to its exact line range.
- Every JSON-LD builder (`buildFaqPageJsonLd`, `buildItemListJsonLd`, the
  inline `Article`/`BreadcrumbList`/`CollectionPage` blocks): **call sites
  unmoved, arguments unchanged** — confirmed by the byte-identical output
  above, not by reading the diff.
- `ArticleRenderer`, `dynamic-blocks`, `pillar-queries`, `article-sidebar`,
  `author-box`, `whatsapp-share`, `mobile-article-bar`, `image-credit`: not
  imported differently, not called differently. Only their surrounding
  markup and CSS classes changed.

---

## Follow-ups

1. **The rendered-colour audit is owed a real check**, not just a
   retrospective entry — see the doctrine edit below. `G41`-shaped, canvas-
   based, checking DES-03's 47 measured ratios against what a live DOM
   actually paints.
2. **Image-derivative backfill** (DES-03 §6.2's four new crop targets)
   against every live cover image — an AWS-cost, owner-level decision,
   named with what it buys above.
3. **Rekognition re-enabled at ingest**, or an editorial cover-class field —
   either closes the hero-eligibility gap properly; the current fix is a
   one-slug stopgap, not a system.
4. **`creative-director`**: confirm or correct the Rekod-panel field
   substitution for non-rate articles (interpretation call #1 above).
5. **G02's remaining 7 failures, full sweep** — all `mas-kahwin-*` state-rate
   articles, `h1 h3 h3…`, inside the article's own body content, not this
   item's template — confirmed by identical h2/h3/h4 counts pre/post change
   on the one checked in detail (`mas-kahwin-ikut-negeri`). Owed to whoever
   owns article body authoring/QC, not to a template fix.
6. **`.s-idx` mobile-grid overflow** — a real DES-05 defect, caught and
   fixed here (`display:none` below 1024px) before it ever shipped. DES-05's
   own evidence should note this if that item is ever revisited.
7. **G10 dips to 12 (floor 13) on the four sole-article categories** —
   `hiasan-dekorasi`, `pantai-santai`, `fotografi-videografi`,
   `minimalis-mewah`. Not blocking (not in DES-09 §8.2's gate lists), and
   DES-09's own baseline had these pages sitting at exactly the floor with
   no headroom. Needs one more crawlable link on a single-article category
   page — small, but deserves its own change and verification, not a
   last-minute addition here.
8. **G19's remaining failure is on `/artikel`**, the catalogue INDEX page —
   DES-06's scope, untouched by this item. Flagged for that item, not
   silently absorbed into this one's numbers.
9. **G24's "189 .woff2 references"** looks anomalous against a real 0-byte
   webfont payload — not investigated here, flagged for whoever next
   touches that guardrail or the typeface work (DES-13).

---

## Retrospective

### 1. What did we learn that is not written down anywhere?

**A design system's token names can collide with the theme already running
underneath it, and nothing checks for that class of defect.** `--accent`,
`--font-serif` and `--radius` are all reused, with different meanings, by
the pre-existing Tailwind/shadcn theme and by DES-05's tokens.css. Two of
three happened to be harmless (nothing reads `--radius` in `.s-*` rules;
`--font-serif` won by luck of which ancestor redeclares it). The third
rendered a whole colour role invisible sitewide. The general lesson: a
custom property's effective value is decided by the **nearest ancestor**
that redeclares its name, not by `:root` specificity — and a design system
built in isolation (DES-05's admin-only reference page) can pass every
check it has and still collide the moment it reaches a page wrapped in
something else's theme.

**Second: Rekognition detection data, which DES-03 §6's whole photo-class
system assumes exists, is empty for the corpus that actually needs it.**
Nobody had checked whether `coverImageDetectionData` was populated before
writing a spec that assumes it. It took four lines of a throwaway script to
find out it wasn't.

### 2. Which document must change, and who owns that edit?

**`docs/plans/aug-23-2026-session-01/aug-23-2026-production-doctrine.md`** —
mine, done. §5.7, "The rendered-colour audit," names the gap (no guardrail
anywhere in this codebase compares a computed colour), the incident that
found it, the rule it produces, and the concrete `G41`-shaped check owed —
following §5.6's own rule that a retrospective which narrates an incident
without proposing the mechanical check is half the job. Committed and
pushed to `feat/command-centre-dashboard` (`3b4e38f`), the docs repo's line,
separate from the site repo this item shipped to.

### 3. What did we do twice that we should never repeat?

**Assumed a design-system component was correct because it had shipped.**
`ListRow`'s `.s-idx` (DES-05, `content.tsx`) renders unconditionally
regardless of breakpoint, but `.s-row`'s own mobile grid-template
(`80px minmax(0,1fr)`, two tracks) never had a third track for it — an
overflow DES-05's own reference page never exercised because it never put
an indexed row into a real 360px catalogue grid. Caught here before it
shipped a second time, but it is the same shape as the `.s-idx` gap and the
`--accent` collision: a component correct in isolation, wrong in the first
real page that actually uses it at the breakpoint that actually matters.

### 4. What did we nearly ship, and what caught it?

**Nearly shipped invisible gold text sitewide.** Every check that ran —
structural diff, the DES-09 guardrail sweep, the 360/1280px overflow
assertion — passed cleanly on every page. What caught it: manually looking
at one screenshot, at one breakpoint, on one page, and noticing the eyebrow
text looked faint. That is not a repeatable process, and this item's own
retrospective (§5.7 above) says so plainly rather than treating a lucky
catch as proof the verification method works.

**Nearly shipped a doubled "Kredit: " prefix** — see the bug section above.
Caught by a flagged numeric mismatch in `structural-diff.py`'s output that
required manual diagnosis to distinguish from an expected difference.

**Nearly shipped the DES-02-disqualified hero photo without noticing it was
the exact failure the brief itself warned about**, until the brief's own
words ("do not assume photography the library cannot supply") were re-read
against the actual rendered screenshot rather than assumed satisfied by
"a hero renders."

---

## Full-sweep addendum — all 103 URLs, run 2026-08-29T04:38:30Z

**26 pass, 5 fail, 2 warn, 0 unknown** (a full sweep leaves no guardrail
`unknown` — the quick sample's 5 unknowns were corpus-scoped counts that
`--quick` structurally cannot answer). Raw run:
`des09-after-des08-full.json` / `des09-after-full-run.txt` in this folder.

Before/after, DES-09's own 28-Ogos full-corpus baseline
(`baseline-2026-08-28.json`) against this run:

| metric | before (28 Ogos) | after (29 Ogos, this item) | verdict |
|---|---|---|---|
| pages with exactly one `<h1>` | 0 of 85 articles | **103 of 103** (every page type) | **PASS**, fully fixed |
| heading order (no level skip) | 8 of 15 categories skip | **96 of 103** ordered; the 7 remaining are ALL `mas-kahwin-*` state-rate articles (`sabah-sarawak`, `pahang-negeri-sembilan`, `ikut-negeri`, `perak`, …), confirmed pre-existing INSIDE the article body (byte-identical h2/h3/h4 counts pre/post this item) | improved, not template's to fix — see follow-up 5 |
| internal `rel=nofollow` | 0 | **0** | held |
| internal `target=_blank` | 0 | **0** | held |
| orphan articles | 0 of 86 | **0 of 86** | held |
| articles emitting `Article` schema | 85 of 85 | **86 of 86** | held (corpus +1) |
| category pages emitting `CollectionPage` | 15 of 15 | **15 of 15** | held |
| articles emitting `ItemList` | 8 | **8** | held |
| pages emitting `FAQPage` | 0 | **47** (SEO-10, shipped same day, unrelated to this item — reported here because DES-09's own table asks for it) | — |
| homepage + `/artikel` emit Organization/WebSite | 0 @types | **2 @types** | **PASS**, closed |
| largest preloaded image | 683,018 B (mobile) | 998,350 B — **but on `/artikel`, the catalogue INDEX page**, which is DES-06's scope and untouched by this item. Nothing preloaded on `/`, `/artikel/{category}` or `/artikel/{category}/{slug}` exceeds budget in this run's own detail. | not this item's regression; flagged for DES-06 |
| largest single image asset | 2,102,558 B | 2,221,708 B | **unaddressed by design** — the derivative backfill was declined for this item, per the disclosed image-guardrail section above |
| images carrying `srcset` | 0 of 1,448 | non-zero on every chrome image this item touched; **1,324 still without** (inline body images via `ArticleRenderer`, untouched) | partial, disclosed |
| non-image transfer, article (max) | 251,692 B | **262,001 B** | still under the 266,240 B budget — PASS, narrower headroom |
| webfont bytes | 0 | 0 real bytes shipped (G24's "189 .woff2 references" count looks anomalous against a 0-byte face and is flagged for whoever owns that guardrail next, not investigated further here — out of this item's scope) | — |
| canonical present & self-referential | 102 of 102 | **103 of 103** | held |
| legacy redirects one-hop-to-200 | 29 of 29 | **29 of 29** | held |
| sitemap URLs | 103 | **103** | held |
| pages carrying an image credit | 59 of 102 | **83 of 86 measured** | improved |

### One new, small, disclosed finding: G10 dips below its floor on the four sole-article categories

`/artikel/hiasan-dekorasi`, `/artikel/pantai-santai`,
`/artikel/fotografi-videografi`, `/artikel/minimalis-mewah` — the exact four
categories DES-09's baseline already named as "the only article in their
category" — now measure **12 unique internal targets**, one below G10's
`category >= 13` floor. DES-09's own 28-Ogos baseline had the worst category
page sitting at exactly 13 (the floor, not headroom above it), so a template
that renders one fewer redundant link on a single-article page was enough to
cross it. G10 is not in DES-09 §8.2's BLOCKING or MUST-IMPROVE lists, so this
does not gate the deploy, but it is a real, measured, one-page-of-content
regression and it is named here rather than left for someone else to find.
Not fixed in this pass — a same-page fix (one more crawlable link on a
single-article category) is small but needs its own verification, not a
rushed addition at the end of an already-long item.
