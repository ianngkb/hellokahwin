# UI-05: the ticket's premise measured and corrected — 37 of 44 category pages already carry photography, the 7 that do not are pillar hubs, and they stay text-only by decision — 31 Ogos 2026

**Session:** aug-30-2026-session-01 · **Owner:** product-designer · **Status:** completed
**Plan:** [aug-31-2026-brief-ui-05.md](../../plans/aug-30-2026-session-01/aug-31-2026-brief-ui-05.md)
**Audit:** [aug-31-2026-audit-ui-desktop-mobile.md](../../plans/aug-30-2026-session-01/aug-31-2026-audit-ui-desktop-mobile.md) §2.3
**Spec:** [ui-05-imej-hab-pilar.html](../../design/ui-05-imej-hab-pilar.html)
**Evidence:** [aug-31-2026-ui-05-EVIDENCE/](aug-31-2026-ui-05-EVIDENCE/)
**Sprint:** 04 · **Item:** `UI-05` · 5 points · track `design` · flags `design-judgement-not-a-bug`, `no-traffic-justification`

## What was done

### The premise was wrong, and correcting it is most of the value

UI-05 was raised from one measurement: `/artikel/hantaran-mas-kahwin` renders zero
images. That measurement is correct. The generalisation — *"category pages render zero
images"* — is not.

I fetched **all 44 live category URLs** and counted in the DOM:

| | |
|---|---|
| Category URLs | **44** |
| Already carry photography | **37** (1–15 images each) |
| Render zero images | **7** |
| Of those 7, pillar hubs | **7 of 7** |

The seven are not category listings that lost their pictures. They are **pillar hubs**,
rendering through `src/components/inspire/pillar-body.tsx` — a different component,
reached by a different branch (`if (category.isPillar)`), fed by a different query whose
row type `PillarClusterArticle` carries **no image field at all**. The other 37 render
through `CategoryCard`/`CategoryRow`, which already emit `<img>` with `srcset`.

**I verified the absence before believing it.** A grep returning zero is a claim about the
regex, so I enumerated every tag rather than testing for the one I expected: 56 `<a>`,
34 `<script>`, 30 `<div>`, 13 `<svg>`, 5 `<h2>`, **0 `<img>`**, 0 `<picture>`. The only
two `img` strings on the page are `role="img"` on the wordmark SVG.

Six of the seven hubs carry **three to seven articles**. Only `hantaran-mas-kahwin` (38)
is large enough for a grid treatment to be a question at all — and the ticket looked at
the one page where that is least true.

### The decision: the seven pillar hubs stay text-only

Taken on the merits, argued from the live site, and **agreed with the creative director**
as the DoD requires. The rationale is deliberately **conditional**, not a permanent
claim that topic hubs never carry images — §8 of the spec names the three conditions
that reverse it.

**The decisive evidence was the asset library, not taste.** I rendered all 38
`hantaran-mas-kahwin` covers at the exact treatment a pillar row would use — 80×80,
`object-fit: cover` — and looked at the sheet:

- **Two exact duplicate pairs**: `dulang-hantaran` = `tempat-beli-hantaran`;
  `hantaran-tempah-atau-buat-sendiri` = `nisbah-hantaran`.
- **The highest-value content is illustrated with architecture.** The state-by-state mas
  kahwin rate articles carry a white low-rise block across water (`mas-kahwin-perak`), a
  terracotta shophouse with a black car (`mas-kahwin-sabah-sarawak`), a blue-tiled
  signboard (`mas-kahwin-pahang-negeri-sembilan`), and men in hi-vis carrying kompang
  (`mas-kahwin-johor`). `cincin-tunang` is a red "KEDAI EMAS" shopfront.
- One cover is **monochrome** against 37 colour.
- Roughly a third are crowd shots that turn to mush at 80px.

A cover must depict its subject. Inside an article a weak cover is one image beside 1,500
words that do the depicting; **in a thumbnail grid the image *is* the entry.** So the grid
would promote precisely the covers that fail that rule into the position where the failure
is most visible, on the most-searched pages on the site.

Supporting measurements:

| | |
|---|---|
| Pillar page transfer today | **12,308 B** (brotli, live) |
| The 38 cover assets | **2,123,006 B** |
| Increase to add thumbnails | **173×** |
| `crop-4x3-article-card` upgrade candidate | **552–923 KB each** |
| Pipeline variants that exist | `low` (q30, ≤1200px) and `high` (q80, ≤2400px) — **nothing sized for an 80px slot** |
| Cover aspects | 24 × 1.50, 4 × 1.33, **9 portrait (0.67/0.75)**, 1 × 1.41 |
| Scroll cost per row | 83px → 111px (**+34%**) |

Lazy loading is stated honestly: it **defers** that cost, it does not avoid it. A reader
who scans the whole map — the entire purpose of a pillar page — pays all 2.02 MB.

**Nothing here is argued from SEO**, per the brief. Decision 86 measured these pages at
~16 impressions and zero clicks.

### Two defects found while specifying, and both shipped

Because the answer is *"typography carries these pages instead of imagery"*, the
typography has to actually hold the page. The creative director overruled my assumption
that this was out of scope, and they were right: shipping the rationale while leaving
these broken would be approving an argument disproved in the same breath.

**1. The article title on a pillar page was not styled at all.** `PillarBody` put
`className="t"` on every article link. The only `.t` rules in the codebase are
`.s-row .t` — descendant selectors — and `pillar-body.tsx` contains no `s-row`. So `.t`
matched nothing and the links fell through to inherited body sans. Found by the creative
director during their review; **I verified it independently** in source and then on the
live artefact at both breakpoints before accepting it:

| Element | Width | family | size | weight | tracking |
|---|---|---|---|---|---|
| Pillar link `a.t` | 390px | `-apple-system` | 17.04px | 400 | normal |
| Grid row title `.s-row h2.t` | 390px | `Bodoni Moda` | 15px | 600 | −0.27px |

Same class name, two typographic identities, decided by which page you found the article
on. This also means **the photography-versus-text comparison was made against text that
had lost its weight, size and typeface** — recorded in the spec rather than quietly
benefiting the conclusion. The image arguments stand on their own.

**2. The empty-cluster row had no structural rule.** A populated cluster gets
`marginTop: 20` and `border-top`; an empty one got `mt-4` and nothing — *less* air than a
populated cluster, and no rule to say the body starts. The promise line read as a subtitle
bolted to the h2.

**3. The empty-pillar state did not exist.** With no clusters and no articles, `PillarBody`
rendered the intro and then an empty `<div>`. Now renders the design system's existing
`EmptyState` with a way out. New copy passed `/humanizer` — see below.

### The copy, and what `/humanizer` caught

My draft for the empty-pillar state was heading *"Panduan ini belum bermula."* / body
*"Kami sedang menyiapkan artikel untuk topik ini. Sementara itu, lihat artikel lain."*
It failed on two counts: **"Kami sedang menyiapkan" is the same undatable promise in
different words**, asserting activity a reader cannot verify and that may not be true; and
"Sementara itu" is filler that exists only to attach to that promise.

Shipped: **"Panduan ini masih kosong."** / **"Belum ada artikel di bawah topik ini."** plus
a link labelled **"Semua artikel"** (already live in the footer, so not new copy). Both
state a fact and promise nothing, and they reuse the construction of the approved sibling
`"Kategori ini masih kosong."`

## Ship state

**Commit:** `02c7d77` — *UI-05: give the pillar hubs the typography and the states they were missing* (merged via `c1632d1`)
**On `origin/master`:** **yes** — PR [#18](https://github.com/ianngkb/hellokahwin/pull/18) merged at `d4cefed`; `git merge-base --is-ancestor 02c7d77 origin/master` confirms
**Deployed:** `6169816759`, Production, **success**
**Still uncommitted in the tree:** none

```
$ git status --porcelain -- src/ scripts/
$ git log --oneline origin/master..HEAD
```

Both empty.

Files changed (built by `design-systems-engineer` to my specification; I do not write
production code):

- `src/components/inspire/pillar-body.tsx`
- `src/design-system/components.css` — new `.s-pillar-link` + its 1024px override
- `src/app/(admin)/admin/design-system/page.tsx` — reference-page entries
- `src/components/inspire/__tests__/pillar-body.test.tsx` — new, 9 assertions

## Evidence

Everything measured at 390px against live production with `playwright-core` + installed
Chrome. Full index and re-run instructions:
[`aug-31-2026-ui-05-EVIDENCE/README.md`](aug-31-2026-ui-05-EVIDENCE/README.md).

**Re-run the entire premise in one command:**

```
node docs/work-done/aug-30-2026-session-01/aug-31-2026-ui-05-EVIDENCE/harness/census-category-images.mjs
```

It discovers every category from `/artikel`, counts in the DOM, prints the table, and
**exits 1 if any pillar hub has gained an image**. Run after the deploy:

```
  categories 44 · carry photography 37 · render zero images 7 · pillar hubs 7 · empty clusters 4
  OK: no pillar hub renders images (UI-05).
```

Verified live after deploy, independently of the engineer's own report:

| Check | Before | After |
|---|---|---|
| Pillar link at 390px | `-apple-system` 17.04px / 400 | `Bodoni Moda` 17px / 400 / −0.204px |
| Pillar link at 1280px | `-apple-system` 18px / 400 | `Bodoni Moda` 21px (`--fs-h3`) / 400 |
| Links carrying the dead `.t` | 67 | **0** |
| Empty-cluster wrapper | `border-top: none`, `margin-top: 0` | `border-top: 1px`, `margin-top: 20px` |
| Promise line | no padding, no bottom rule | `padding 13px/13px`, `border-bottom 1px` |
| **`<img>` on all seven pillar hubs** | **0** | **0** |
| Grid pages `idea-dan-nasihat` / `real-wedding` | 15 / 14 images | 15 / 14, unchanged |

The `<img>` row matters most: this item's decision is that these pages carry no
photography, so a pillar hub *gaining* an image would mean the build had contradicted the
specification.

## What it changed

- **The item's premise is corrected on the record.** "Category pages render zero images"
  was 7 of 44, not 44 of 44, and the 7 are a structurally different template. Any future
  work that starts from the original phrasing would have been scoped wrong.
- **A design decision is taken deliberately and written down**, with the evidence and the
  reversal conditions, instead of persisting by default.
- **67 article links on seven live pages got their specified typography**, having rendered
  in the wrong typeface, size and weight since DES-08.
- **Two missing/broken states now render**: the empty cluster and the empty pillar.
- **The measurement is now a script that anyone can re-run and that fails loudly**, rather
  than a number in a document.

## Follow-ups

| What | Owner |
|---|---|
| **The pillar plate** — one editorial photograph after the deck. Wanted by the creative director; blocked on UI-03 because the only variant is `low` (q30, ≤1200px) and a plate needs ~780px at 390×2 DPR. Full direction recorded in spec §7 so it is not relitigated. Per-pillar editorial select, never a template default. | `creative-director`, depends on UI-03 |
| **A soft-failed pillar render is cached forever.** `renderPillarPage` catches a failed `getPillarView` and renders *successfully* with `clusters: []`; the route declares `revalidate = false`, so Next caches the empty page indefinitely until a tag revalidation. One DB blip can pin an empty pillar. Spec state P7. Mitigated by the new empty state, not fixed. | `design-systems-engineer` |
| **"akan datang tidak lama lagi" is still live** on 4 empty clusters. DES-03 §7.2 C says its approved copy "already replaced production's undatable line". It did not. DES-07 escalated exactly this and it was never answered. **Note the state distinction**: §7.2 C's copy is for a *fully empty category*, not an empty cluster inside a populated pillar, so it is not a drop-in substitute. | `managing-editor` |
| **A class used with no matching CSS rule should fail a build.** `.t` on pillar links matched nothing for the life of DES-08 and no check saw it. This is the same shape as UI-06's rendered-layout gate and belongs with it. | `design-systems-engineer`, UI-06 |
| **Every category thumbnail on the 37 grid pages serves `low` (q30)** into a 176px/80px slot with no correctly-sized derivative in the pipeline. Real, measured, and larger than this item. | `creative-director`, with UI-03's pipeline finding |
| Three files fail `prettier --check` on `master` and were already failing at base `105e79d`: `src/app/(public)/brand/brand.css`, `src/app/(public)/brand/page.tsx`, `src/components/brand/brand-assets.ts`. Not from this item. `pnpm lint` keeps failing for everyone until someone formats them. | unassigned |

---

## Retrospective

### 1. What did we learn that is not written down?

**A Next.js App Router document contains the page twice, so any plain-text grep over it
returns exactly double.** Once as rendered HTML, once as the serialised RSC flight payload
inside `<script>`. Nothing in this company's documents said so, and it produced a wrong
number in this very item: the first draft reported *"eight empty clusters across four
pillars"* when the truth is **four across three**.

The distinction is subtle enough to be dangerous. Patterns anchored to **unescaped
attribute syntax** — `<img`, `id="cluster-`, `href="…"` — *do* survive, because the flight
payload writes quotes as `\"`. I verified that against the DOM rather than assuming it, and
grep and `querySelectorAll` agree exactly on all three. So the rest of the 44-URL census
stands. But "some text patterns are safe and some are not" is not a rule anyone will apply
correctly under pressure. The rule is: **count in the DOM.**

**And a second one: a design decision can be blocked by the asset library rather than by
taste, and nobody had ever looked at the covers as a set.** The single most decisive
artefact in this item was a contact sheet — 38 images at the size they would actually be
used. It took minutes to make and it settled a question that could have been argued from
adjectives indefinitely. Two of the 38 are duplicates and four illustrate rate articles
with photographs of buildings; none of that is visible one article at a time.

### 2. Which document must change, and who owns the edit?

| Document | Edit | Owner |
|---|---|---|
| `docs/work-done/.../aug-31-2026-ui-05-EVIDENCE/harness/census-category-images.mjs` | **The census as a script that exits 1 when a pillar hub gains an image.** The lesson's strongest available form is an assertion, not prose | product-designer — **DONE**, and proven by running it |
| `docs/work-done/.../aug-31-2026-ui-05-EVIDENCE/README.md` | The double-document trap, with the safe/unsafe pattern table and the wrong number it produced | product-designer — **DONE** |
| `docs/work-done/.../aug-31-2026-ui-04-EVIDENCE/README.md` | The same trap, written next to the harness people actually reuse for this site | product-designer — **DONE** |
| `docs/design/ui-05-imej-hab-pilar.html` | The decision, the state set, the reversal conditions, and the corrected numbers with the error recorded in place | product-designer — **DONE** |
| `docs/work-done/README.md` | This entry in the index | product-designer — **DONE** |
| UI-06's gate | **A class used with no matching CSS rule fails the build.** `.t` matched nothing for the life of DES-08 and every check passed | `design-systems-engineer` — handed over, not done here |

**On form.** Sprint 03's finding was that prose rules do not fire and scripts do. The
central lesson here took the script form: `census-category-images.mjs` does not describe
the decision, it **asserts** it, and it fails loudly if a future change reverses it by
accident. The trap that caused the wrong number is documented as prose in two READMEs
*and* embedded as a comment at the top of the script that would otherwise repeat it —
which is the only placement that fires.

### 3. What did we do twice that we should never repeat?

**Ran the same wrong counting method twice and took the agreement as confirmation.** I
counted the empty-cluster promise lines by grepping served HTML before the deploy and
again after, got 8 and 8, and treated the consistency as evidence. It was not evidence; it
was the same bug reproducing. **A measurement repeated with the same method is one
measurement.** What broke it was a *different* method (`querySelectorAll`) run by a
*different* agent.

**And a near-repeat of a trap the audit had already recorded:** I read `naturalWidth` while
images were still decoding and got `176x88` for assets that are really `1200x800`. §3 of
the UI audit withdrew a finding for exactly this. I caught it because the numbers were
absurd for a 55 KB file, but I should have reached for `onload` first — the trap was
written down and I still walked into it once.

### 4. What did we nearly ship, and what caught it?

**A rationale document with a number that was double the truth.** "Eight empty clusters
across four pillars" was in the spec, in the brief I sent the creative director, and in the
brief I sent the engineer. **What caught it was the engineer refusing to accept a figure in
their own instructions** — they counted independently, got 2 for `sebelum-nikah` where I
had said 4, and said so plainly instead of building to the number they were given. I then
verified in the DOM and found they were right and I was wrong.

That is worth naming precisely: the check that worked was **an agent contradicting the
spec they were handed**. Had they built to my number without comment, the document would
have shipped with inflated evidence supporting a correct conclusion, which is the most
corrosive kind of error because nothing downstream would ever surface it.

**And one I caught myself:** an argument resting on UI-03's "rendered aspect within 15% of
source" rule to condemn 80px thumbnails. That rule was written for a full-bleed hero at
1905px where a 72% centre-crop destroys the photograph; a square crop at 80px is a
legitimate editorial device. The numbers are still in the spec, but the decision explicitly
does **not** rest on them, and the caveat is written against my own argument in §3.4.
Weaponising a hero rule against thumbnails would have been a percentage standing in for a
design judgement.
