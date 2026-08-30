# UI-05: the ticket's premise measured and corrected — 37 of 44 category pages already carry photography, the 7 that do not are pillar hubs, and they stay text-only by decision — 31 Ogos 2026

**Session:** aug-30-2026-session-01 · **Owner:** product-designer · **Status:** completed
**Plan:** [aug-31-2026-brief-ui-05.md](../../plans/aug-30-2026-session-01/aug-31-2026-brief-ui-05.md)
**Audit:** [aug-31-2026-audit-ui-desktop-mobile.md](../../plans/aug-30-2026-session-01/aug-31-2026-audit-ui-desktop-mobile.md) §2.3
**Spec:** [ui-05-imej-hab-pilar.html](../../design/ui-05-imej-hab-pilar.html)
**Evidence:** [aug-31-2026-ui-05-EVIDENCE/](aug-31-2026-ui-05-EVIDENCE/)
**Sprint:** 04 · **Item:** `UI-05` · 5 points · track `design` · flags `design-judgement-not-a-bug`, `no-traffic-justification`

## What was done

### The route taken, stated first and on its own

UI-05's DoD is **imagery or rationale**. **I took the rationale route:** category pages
that currently carry no photography — the seven pillar hubs — **stay text-only**, by a
decision argued on the merits and agreed with the `creative-director`, who agreed *that
decision*, not a typography fix. The rejected option was thumbnails on pillar rows.

**The typography and empty-state work in this entry does NOT satisfy the DoD and is not
offered as satisfying it.** It is separate work that rode in the same item; it is sized
and justified in "Scope: what rode in this item and why" below. If the imagery-or-rationale
decision were removed from this entry, the item would not be done.

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

### UI-03's rules landed after the decision — re-measured, and they strengthen it

UI-03 shipped `docs/design/hero-image-rules.md` on 31 Ogos 2026, after this decision was
taken. Its rules are binding on me. I re-measured against them rather than assuming the
decision survived. **They close the imagery route considerably harder than my own argument
did.**

- **R2** makes `low`/`high`/`original` ineligible for any shaped slot. A thumbnail box is a
  shaped slot, so the only legal source is a named landscape crop.
- **R1** requires the box within 15% of the asset aspect. The pipeline defines exactly
  **four** crop targets and **none is square**. Against the 80×80 mobile box:
  `crop-4x5-mobile-cover` 25%, `crop-4x3-article-card` 33%, `crop-16x9-og` 90%,
  `crop-4.3x1-desktop-hero` 252% — **all fail**. So the honest statement is not "expensive";
  it is that **the box has no legal source and I may not create one**, because adding a
  `CROP_TARGETS` entry changes `GEOMETRY_VERSION` and re-queues every live cover through
  Rekognition + R2 — an owner-level AWS cost.
- Reshaping the box to 16:9 *would* be legal, so I measured that cost too. **`crop-16x9-og`
  across all 38 hantaran covers: 11,958,290 B (11.40 MB)**, mean 307 KB, range 142–425 KB,
  **0 missing** — so coverage was never the blocker. That is **5.6×** the `low` figure I had
  already rejected and **971×** the current page.

**Two seats found the same pipeline hole from opposite ends.** My §3.3 reached it from the
thumbnail side; UI-03 §5 reached it from the hero side and states it better: *"The pipeline
generates two families of derivative, and neither one can serve a hero. There is no
aspect-correct, quality-reduced derivative anywhere in it."*

**One thing nobody should conclude:** that UI-03 landing satisfies this item's reversal
condition 2. UI-03 §5 requests a quality-reduced 1200×630 crop at 80–120 KB — across 38
covers, still 3.0–4.6 MB, worse than the 2.02 MB already rejected. A pillar thumbnail needs
an asset ~160–360px *wide*. **Different asks, different slots.** The spec's §8 is updated
to say so explicitly.

**On the coverage question the CEO assigned me:** UI-03's 13/13 verification was the
homepage covers. I measured the category-page set separately — all 38 hantaran covers have
all the named crops, 0 missing. Coverage is fine; bytes and aspect are the blockers.

### Scope: what rode in this item and why, sized

| Work | Points (of 5) | Why it is here |
|---|---|---|
| **The imagery-or-rationale decision, its evidence and the state set** | ~3 | **This is the DoD.** Nothing else in the item satisfies it. |
| The empty-cluster row and the empty-pillar state | ~1 | The `creative-director` ruled these in scope, overruling my assumption that they were out: if the answer is "typography carries these pages", the typography has to hold the page, and the empty cluster is the state that most makes a text-only pillar look unfinished. Shipping the rationale while leaving it broken would approve an argument disproved in the same breath. |
| The `.s-pillar-link` typography fix | ~1 | A defect in the same file, on the same seven pages, found while specifying. Genuinely trivial to carry (one class, one component), and leaving 67 links in the wrong typeface while committing a rationale that says typography carries these pages was the worse option. **Named here rather than absorbed silently.** |

If the CEO would rather the typography fix had been its own item, it is cleanly separable
in the record: commit `02c7d77`, the `.s-pillar-link` class and its two call sites.

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
| **The `.s-row` thumbnails on the 37 grid category pages violate UI-03's R1 and R2.** Measured on `/artikel/idea-dan-nasihat` with intrinsic read from a detached `Image()`: at 390px, **5 of 5 fail R1** (deviation 33–50%); at 1920px, **3 of 5 fail** (one portrait 1200×1800 cover deviates **100%** in the 176×132 box); **5 of 5 fail R2** at both widths, all serving `low.webp`, with `width`/`height` attributes reading `176x132` regardless of the asset. The lead `.s-card` passes R1 (no fixed aspect) but fails R2 and R6. **Outside UI-05's DoD — that covers the 7 zero-image pages, not the 37 — so raised, not absorbed.** | proposed to the CEO as a new item |
| **The `garden-wedding` article cover** — UI-03 measured `box 768x320 / boxAR 2.400 / low.webp / intrinsic 1024x683 / assetAR 1.499 / deviation 60.1% / attrs "1200x500"` at `artikel/[category]/[slug]/page.tsx:1036`, and explicitly declined to widen its item to cover it. It is on the **article** page, not the category page, so it is outside UI-05's DoD too. Same root cause as UI-03 and as the row above: `low` in a shaped box plus `width`/`height` describing neither box nor asset. **I did not absorb it.** My own rig timed out on that URL and I did not reproduce UI-03's exact figures, so I am passing their numbers through attributed to them rather than restating them as mine. | proposed to the CEO as a new item |
| **`.s-h2`'s `font-weight: 600` and `letter-spacing: -0.01em` are dead on every public page.** `.hk-public h1,h2,h3,h4 { font-weight: 400 }` is (0,1,1) and beats the bare class at (0,1,0). Verified live at both breakpoints: the cluster `h2` computes **400**, not 600. Same class of defect as the dead `.t`, different mechanism — a rule that matches and never wins, versus a class matching no rule — so UI-14's check will not catch it. Raised as **`DES-15`**. | `design-systems-engineer` |
| **Optical size runs backwards.** `.s-h1` pins `"opsz" 11`; `.s-h2`, `.s-h3`, `.hk-card-title`, `.s-row .t` and `.s-pillar-link` all compute `font-variation-settings: normal` with `optical-sizing: auto`, so opsz tracks font-size. The h1 at 30–44px gets a sturdier cut than the h2 at 22–26px. Also means one article title is two different Bodoni cuts across breakpoints. Raised by the `design-systems-engineer` during the build, owned by the `creative-director`, as **`DES-16`**. | `creative-director` |
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
| The spec, both evidence READMEs, and `harness/walk390.mjs` | **The `naturalWidth` correction.** The wrong reason ("mid-decode") removed from all three documents, replaced with the srcset-density mechanism and the live re-test that proves it; the committed rig that uses the bad method carries the warning at the exact field | product-designer — **DONE** |
| UI-06's gate | **`boxWidth / img.naturalWidth` returns ≈1.0 by construction on any `srcset` image and can never fire.** An upscale gate built that way is green forever. Read intrinsic size from a detached `Image()` on `currentSrc` | `design-systems-engineer` — handed over, and UI-03 issued the same instruction independently |
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

**And a wrong number I explained wrongly, then had to correct twice.** I read
`naturalWidth` on live page elements and got `176x88` for assets that are really
`1200x800`. I attributed it to reading mid-decode, wrote that reason into the spec and two
READMEs, and shipped it. **The reason was wrong.** UI-03 found the real one — on an element
carrying a `srcset` with `w` descriptors, `naturalWidth` returns intrinsic width *divided
by the density derived from `sizes`* — and I re-tested it here rather than adopting it on
trust: with every image reporting `complete: true` three seconds past decode, `sizes="176px"`
on a 1200px asset still reports 176, because 1200 ÷ (1200÷176) = 176.

My conclusion and my measurements were right either way, because `dims.mjs` loads assets by
URL with no `srcset`. **But a reader following my stated reason would have waited for decode
and got wrong numbers forever.** Getting the reason wrong was worse than getting the number
wrong, and it is the second time in this item that a plausible explanation survived because
nothing tested it.

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

**And a second one, caught by UI-03 rather than by me: a wrong *reason* published in three
files.** "Reading `naturalWidth` mid-decode returns nonsense" is false — it returns the
divided value whether or not decode has finished. That sentence was committed to the spec
and two evidence READMEs before UI-03's rules doc exposed it. **A wrong explanation attached
to a right number is the hardest kind of error to catch**, because the number checks out and
nobody re-examines the sentence next to it. What caught it was another seat writing down the
mechanism, and what confirmed it was re-running the test with `complete: true` asserted.
All three files are corrected, and the committed rig that uses the bad method
(`walk390.mjs`) now carries the warning at the exact field that would repeat it.

**And a third, caught by the creative director against their own earlier answer.** The
reason recorded in the spec for the pillar link's weight — that weight separation between
the cluster `h2` (600) and its links (400) was doing structural work — **was false.**
`.s-h2`'s 600 never wins on a public page; the heading renders 400, same as the link. I
verified that on the live artefact before editing rather than accepting either the original
reason or its retraction. The conclusion survived and got stronger: at 600 the entries
would be *heavier than the heading above them*. **A correct conclusion resting on a false
reason is the same failure as the `naturalWidth` correction above, twice in one item** —
and both times the number was right, which is exactly why nobody re-read the sentence.

**And one I caught myself:** an argument resting on UI-03's "rendered aspect within 15% of
source" rule to condemn 80px thumbnails. That rule was written for a full-bleed hero at
1905px where a 72% centre-crop destroys the photograph; a square crop at 80px is a
legitimate editorial device. The numbers are still in the spec, but the decision explicitly
does **not** rest on them, and the caveat is written against my own argument in §3.4.
Weaponising a hero rule against thumbnails would have been a percentage standing in for a
design judgement.
