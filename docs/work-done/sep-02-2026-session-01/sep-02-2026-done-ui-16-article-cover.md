# UI-16 — the article cover is a named 792×594 crop in a 4:3 box, and the gate now checks R2 and R6

**Sprint 06 · `design` · 3 points · `design-systems-engineer` · 02 September 2026**
**Merged:** `5c18c74` (PR [#65](https://github.com/ianngkb/hellokahwin/pull/65)) and PR [#67](https://github.com/ianngkb/hellokahwin/pull/67) → `master`
**Live:** <https://hellokahwin.com/artikel/idea-dan-nasihat/garden-wedding>
**Reviewer: Claude** — this session's adversarial pass plus the paired self-test. **Not `codex-reviewer`**, per the owner directive of 02 September 2026.

---

## The correction that comes first, because the item's own title is wrong

The tracker says *"R1, R2 and R6 failing at once"*. **R1 was already green**, and had been since UI-12 S5 deleted the `lg:aspect-[2.4/1]` box on 31 August. Measured on live production before anything changed:

| rule | verdict | the number |
| --- | --- | --- |
| **R1** — box within 15% of the asset's aspect | **PASS** | `low` is 1024×683 = 1.4993 against a 1.5 box — **0.05%** |
| **R2** — `low`/`high`/`original` never fill a shaped slot | **FAIL** | it is `low` |
| **R6** — declared `width`/`height` are the file's | **FAIL** | declared 1200×800 for a 1024×683 file — **17.2%** out |

**R1 passing is the finding, not the reassurance.** `low.webp` is a resize of the SOURCE, so its aspect is the photographer's. This slot passed R1 because `garden-wedding` happens to have been shot at 3:2. Eleven of the twelve front-page covers are 3:2 and one is 2:3; the day an editor filed a portrait into this template, the same markup measured **99.9%** off. A slot whose geometry is decided by the camera is not a slot anyone designed — which is the entire reason R2 exists, and why fixing R1 alone left the defect in place.

**R6 was invisible to every check this company owned.** 1200/800 and 1024/683 are both 1.50:1 to two decimal places, so `image-attr-aspect` — the only declared-box check that existed — read **zero** on it for a month.

---

## Pre-fix, on the live URL, before the deploy

```
[FAIL] /artikel/idea-dan-nasihat/garden-wedding @390  2 violation(s)  … R2:1 R6:1 …
[FAIL] … @768   2 violation(s)   [FAIL] … @1024  2 violation(s)
[FAIL] … @1440  2 violation(s)   [FAIL] … @1920  2 violation(s)
        shaped-slot-variant 5
        shaped-slot-dims 5
UILINT EXIT: 1

shaped-slot-variant ×1
  served low into a box shaped aspect-ratio: 3 / 2 (… > figure.hk-article-figure >
  div.bg-muted.relative.aspect-[3/2]) - hero-rules R2: low/high/original preserve the
  SOURCE aspect, so this slot's shape is decided by the photograph rather than by the
  design. Only a named crop may fill a shaped box.
    "lokahwin.com/inspire/garden-wedding/1787397040017-cover/low.webp"

shaped-slot-dims ×1
  declared width="1200" height="800" for a default source that is genuinely 1024x683
  — 17.2% out on width, 17.1% on height. hero-rules R6 asks for the FILE's own
  dimensions, not for a ratio: check 4b compares 1.50:1 against 1.50:1 and can be
  green while this is not.
```

> ⚠ **This block is quoted from the run, not re-capturable.** The defect is gone from production, so `--url …/garden-wedding` cannot reproduce it today. Both checks are reproducible offline against the committed fixture — `pnpm ui:gate --shaped-slot`, case A — which is the same defect with the same numbers and does not depend on a deployment.

## Post-fix, same command, same URL

`02-gate-production-AFTER.txt`, deployment `5c18c74`:

```
[ ok ] /artikel/idea-dan-nasihat/garden-wedding @390  0 violation(s)  … R2:0 R6:0 …
[ ok ] … @768   [ ok ] … @1024   [ ok ] … @1440   [ ok ] … @1920
        shaped-slot-variant 0
        shaped-slot-dims 0
UILINT EXIT: 0
```

And across the whole template manifest, `--base https://hellokahwin.com`: **`UILINT EXIT: 0`** on all seven.

Geometry read from a detached `Image()` on `currentSrc` (`04-geometry-production-AFTER.txt`):

| viewport | box | asset | deviation | scale | declared |
| --- | --- | --- | --- | --- | --- |
| 390 | 350×262.5 | 792×594 | **0.00%** | 0.442× | 792×594 |
| 768 | 704×528 | 792×594 | **0.00%** | 0.889× | 792×594 |
| 1024 | 580×435 | 792×594 | **0.00%** | 0.732× | 792×594 |
| 1440 | 756×567 | 792×594 | **0.00%** | 0.955× | 792×594 |
| 1920 | 756×567 | 792×594 | **0.00%** | 0.955× | 792×594 |

---

## The bytes, before and after, as the item asked

Measured by HTTP HEAD on the objects the backfill actually wrote, against the `low.webp` this slot served before it.

> ⚠ **The corpus moved from 92 to 96 to 97 while it was being measured** — articles published mid-item, the same way DES-18 watched 86 become 89. Every number below is the **96**-cover run at the time of the backfill; the 97th is accounted for separately under *What nearly went wrong* below.

| | total | min | median | max |
| --- | --- | --- | --- | --- |
| `low.webp` (before) | 5,034,824 B | 15,184 | 49,856 | 252,352 |
| `crop-4x3-article-card-md` (after) | **3,296,332 B** | 12,346 | 30,716 | 100,990 |
| **delta** | **−1,738,492 B — −34.5%** | | | |

**On `garden-wedding` — the page drawing ~28% of all site impressions — the LCP image goes 33,574 B → 26,936 B: −6,638 B, −19.8%.**

Four covers get **heavier**, by 1,630 / 2,250 / 2,404 / 2,742 B. They are the four whose 4:3 crop is only 667px wide: their `low` is an 800×500 file at q30 and the rendition is 667×500 at q50, so it is a quality trade on the four smallest photographs on the site, not a regression anyone can see. Named rather than averaged away: `sewa-dewan-kahwin`, `villa-warisan`, `wedding-planner-terbaik-di-malaysia`, `yasaka-shrine`.

---

## What shipped

**`ARTICLE_COVER_MD` — `crop-4x3-article-card-md`, 792 × 594.** 792 is not a round number: it is the smallest width that fills this slot's widest **measured** box (756 CSS px at 1440/1920) with no upscale, and it is exactly 1.5× DES-18's 528px rung, so the two rungs are one box at two scales rather than two independent guesses. Ceiling **103,680 B** — DES-03 §6.2's card figure area-scaled to a box 2.25× larger; measured max 100,990 B, `over ceiling 0`.

Same cost model as DES-18: a **resize of the already-stored `crop-4x3-article-card`**, so no Rekognition call, and deliberately **not** a `CROP_TARGETS` entry, so `GEOMETRY_VERSION` does not move and no live cover is re-cut. The committed test still asserts the token hashes to `48c0b959`.

**DES-18's encoder is generalised, not copied.** `renderMidsizeCover(buf)` → `renderCoverRendition(buf, spec)`, and `generateSmartCrops` now loops `COVER_RENDITIONS`. DES-18 added its rung to ingest and to the backfill in two separate edits; a third rung added the same way would be a third chance to add it to only one of them, and the symptom — a cover ingested after the deploy silently missing the rendition — has no visual signal at all.

**`resolveArticleCoverSource`** — md → the full 4:3 crop → `low`. Three things it does that the previous resolver did not:

1. **`boxAspect` comes back *with* the asset.** A `low` fallback cannot be paired with a 4:3 box, which is the R1 failure this box change would otherwise have introduced on its own fallback path.
2. **The figure is capped to the asset's real stored width.** R1's own sentence — *"the box follows the asset, never the reverse"* — applied literally, and its stated remedy for a box no derivative can fill: *"you do not have that box"*. The four 667px covers have 800×500 source photographs, so their 4:3 crop is height-constrained and **no larger 4:3 asset can exist for them**. Stretching 667 across 756 would be a 1.13× upscale and R5 would go red on four articles. Measured on live production, `yasaka-shrine`: box 667×500.25 at 768/1440/1920, scale **1.000×**. The cap is computed from the stored width, never a slug list, so it lifts itself the day a bigger source is uploaded.
3. **`width`/`height` are the file's**, read from the stored crop entry. They were the constant `1200×800`, chosen by UI-12 S5 as *"`low`'s modal intrinsic across the corpus"* — a statement about most articles rather than about this one. A modal value is still an asserted one.

**The LCP preload moved in the SAME edit.** `ReactDOM.preload` and the figure both call `resolveArticleCoverSource`. Left on the old resolver the preload would have fetched `low.webp` at high priority while the figure fetched the rendition — two photographs, no visible symptom, and precisely the drift the existing comment on that line warns about.

**The reference page gained the slot in the same change** (maintenance contract): `/admin/design-system` renders both the 792px case and the 667px capped case, with the dimensions **imported from `ARTICLE_COVER_MD`** rather than retyped, so a change to the rendition moves the entry with it.

---

## The gate now checks R2 and R6 — and it is proved to clear, not only to fire

Two new **blocking** checks in `scripts/ui-layout-gate.mjs`, scoped to slots where a designer set an explicit CSS `aspect-ratio`:

- **`shaped-slot-variant`** (R2) — `low`/`high`/`original` may not fill a shaped box. Read from `currentSrc`, so a `<picture>` serving an ineligible variant in one band is caught in that band.
- **`shaped-slot-dims`** (R6) — declared `width`/`height` against the **default source's** real dimensions (±1px), probed from `src` and never `currentSrc`, because on a `<picture>` the attributes describe the fallback. That is what R6 names, and it is why the homepage hero — declaring 1200×630 for `crop-16x9-og` while the 2464×700 desktop crop renders — is correctly green.

**The `auto ` prefix test is load-bearing.** The UA stylesheet gives every `<img>` with width/height attributes a computed `aspect-ratio: auto 1200 / 800`. Without excluding that form, check 13 becomes "every image on the site" and check 14 becomes a restatement of the advisory 4b — which would blocking-fail the eleven in-body prose images whose declared box is boilerplate.

**Every shaped slot on the site, enumerated across the whole template manifest rather than assumed:**

| slot | fed | declared | verdict |
| --- | --- | --- | --- |
| homepage + catalogue lead plate | `crop-16x9-og` | 1200×630 = the file | green, both bands |
| `ArticleCard` 4:3 plate (`/artikel`, tag archives) | `crop-4x3-article-card` | nothing — `next/image` `fill` | green |
| **article cover figure ×2 instances** | **`low`** | **1200×800 for 1024×683** | **red** |

**The paired fixture.** `tests/ui-layout-gate/fixtures/shaped-slot/` — `pnpm ui:gate --shaped-slot`. Eight labelled cases, **five of which must produce exactly nothing**, served offline from three generated solid plates whose *dimensions* are the whole point.

- **Case A** is the live defect, and it is **invisible to check 4b** — which is the gap check 14 exists to fill.
- **Case C** is a named crop with a false declared size: fires R6 alone, proving the two checks are independent.
- **Case E/F** are the same defects with no designer box, which must stay silent or the scope predicate has widened.
- **Case G** records a KNOWN LIMIT: a shaped ancestor four levels up is past the three-hop walk and is not caught.

**Self-test: 250 → 270 assertions, 0 failed**, read from CI's own output rather than from the green tick:

```
270 passed, 0 failed
UILINT EXIT: 0
  PASS  shaped-slot @1440: shaped-slot-variant = 2 … got 2 [Case A,Case H]
  PASS  shaped-slot @1440: shaped-slot-dims = 2 … got 2 [Case A,Case C]
  PASS  shaped-slot @1440: check 4b reads ZERO on this whole fixture … got 0
  PASS  homepage.html @390: R2 FIRES once on the 31 Aug capture — UI-03's original
        finding caught retroactively
  PASS  category.html @390: R2 and R6 CLEAR on the same known-bad capture — no shaped
        image slot, so neither check follows the crowd
```

**I asserted these checks were CLEAN on `homepage.html` and the run said otherwise five times.** It was right: the pre-fix homepage hero is `low.webp` — a 1200×1800 PORTRAIT source — in a 2.4:1 box declaring 1200×500. So these checks reach back and catch **UI-03's original finding** on a capture taken a month before either check existed. The assertion was corrected to what the fixtures actually contain, and it is a stronger assertion for it.

**Ten new unit tests** for the resolver, run against the pre-fix behaviour: **4 go red**. A test suite that has never failed is a claim about its own condition.

---

## ⚠ What nearly went wrong, and what caught it

### 1. The deploy was green and the page was still wrong

UI-16 merged, Vercel reported READY, and the gate printed `UILINT EXIT: 0` with `shaped-slot-variant 0` and `shaped-slot-dims 0` across all seven templates. **Every one of those numbers was correct and the page was serving the wrong file** — `crop-4x3-article-card` at 213,556 B instead of the rendition at 26,936 B. **+186,620 B on the site's highest-traffic template, indefinitely**, with the item's own byte claim false by 8×.

Both files are named 4:3 crops with recorded dimensions, so both satisfy R1, R2, R5 and R6. **The gate could not tell them apart and should not try.** What put the fallback on the page: `ARTICLE_PAGE_CACHE_KEY` caches the article payload with `revalidate: false`, and the backfill wrote the database **directly, from outside the running app**, so none of the admin paths that call `revalidateTag` fired. `article-cache.ts` documents this exact failure mode — for a payload **shape** change. This was a **data** change under an unchanged shape, which the version-bump rule does not cover.

Caught by re-reading `currentSrc` on the live page after the gate went green — i.e. by suspecting a comfortable number. `POST /api/cron/revalidate-content` fixed it in one call; `X-Vercel-Cache: REVALIDATED` and the rendition appeared. **Six article titles were checked immediately afterwards** for the known post-purge metadata failure (a cached `generateMetadata` miss putting the root default `<title>` on an article) — all six correct.

### 2. The ingest fix does not reach the ingest that matters

`generateSmartCrops` now writes both rungs, so every future cover gets the rendition — **from the deployed app**. But `scripts/ingest-article.mts` runs from an **agent's own checkout**, not from production. `doa-untuk-isteri` was published after the deploy, by another session on an older branch, and arrived with **no rendition**. Found by re-running the audit rather than by trusting the ingest change.

Re-ran the backfill (re-runnable, skips completed rows): `97 published … 1 to render · 96 already done`, wrote `doa-untuk-isteri 792x594 q50 26048 B`, purged, and the live page now serves it. **Until every worktree carries this commit, a backfill pass is still needed after a batch publish** — recorded here rather than assumed away.

### 3. The Vercel failure, where I was right in outcome and wrong in mechanism

The first preview build failed with `ERR_PNPM_IGNORED_BUILDS` on `pnpm install`, listing packages that **are** in `package.json`'s `onlyBuiltDependencies`. The same failure hit `master`'s production deploy at `0f2a4c9` and CONT-15's branch. A retry passed, unchanged, and five green builds followed on unchanged config — which a version-bump cause cannot produce. Relayed to the CONT-15 session, which had authorised a repo-wide "fix" (adding `pnpm-workspace.yaml`, pinning `packageManager`) and **withdrew it**. Their words: *"I had found where the failures started and never checked whether they stopped."*

> ⚠ **I called it "transient infrastructure, not either of our diffs" and half of that was wrong.** The retry advice was right and `master` recovered with no pin, which settles the immediate question. But CONT-15 then found the actual mechanism: **Vercel resolves `pnpm@11` by a project-creation-date heuristic, and pnpm 11 ignores `package.json#pnpm.onlyBuiltDependencies`.** So it was neither random flakiness (my reading) nor something a pin retroactively fixed (they are not claiming that). They are landing the pin as a **separate PR on forward-looking merit only** — a heuristic that moved under us once can move again — described as hardening. Recorded here so that PR is not read as a retroactive credit claim, and so my own "transient" is not left standing as the explanation. **"It stopped happening" locates a window; it does not name a cause.**

---

## The collision with CONT-15 — raised, ruled on, and settled

> **RULING, 02 September 2026: UI-16 STANDS.** CONT-15's render path is not merged,
> nothing here is reverted, and both new gate checks stay blocking. Recorded with
> the reasoning, because a ruling without its argument is just an outcome.

**CONT-15 (PR [#63](https://github.com/ianngkb/hellokahwin/pull/63), open) rewrites this same figure to the opposite rule**, and the two are not compatible.

| | CONT-15 | UI-16 |
| --- | --- | --- |
| asset | keeps `low.webp` | a named 4:3 crop |
| box | follows the file, per article (`--cover-ar`) | 4:3, capped to the asset's width |
| R1 | by construction, including portraits | 0.00% on 97 covers |
| R2 | **fails** — `low` in a slot with an explicit `aspect-ratio` | passes |
| bytes | zero new | −34.5% corpus, −19.8% on `garden-wedding` |

Both PRs touch the same three files. **Whichever merges second silently reverts the other**, and under UI-16's new blocking R2 check, CONT-15's plate fails the build on every article.

**Where CONT-15 is right, and my item does not answer it.** Its named case `tempat-beli-hantaran` is a 1200×1800 portrait. Under UI-16 it gets the 4:3 crop and keeps **50% of the frame** — clear of UI-03 R8(c)'s 33% floor, measured 0.00% deviation, 0.955× scale, and 54,814 B → 26,042 B (−52%). Every rule is green and it is cheaper. It is still half a photograph an editor deliberately framed tall, and that is an editorial objection a measurement cannot refute.

**The deciding argument was in CONT-15's own brief, and neither session had read it that way.** Verbatim: *"DO NOT solve it by substituting an existing crop — UI-12 priced that at +8.2 MB… DES-18's mid-size variant shipped in Sprint 05 and is the intended route."* The ban was on substituting the **existing heavy crops**. A 792×594 rendition at **−52% bytes** is not that — it is the mid-size route the brief named as intended. The ruling's basis is that UI-16 executed CONT-15's brief more faithfully than CONT-15's own spec did; it is not a preference between two tastes.

**The synthesis is carried forward as a NAMED item, not closed.** The two positions are not actually opposed: *the box follows the asset* **and** *the asset is a named crop*. UI-16 already caps the figure to the asset's stored **width**; extending that to **aspect** — driving the box from the rendition's stored `width`/`height` instead of a hardcoded `4/3` — gives portrait covers a portrait plate without ever serving `low`. It needs a portrait rendition at a sane weight, since `crop-4x5-mobile-cover` is the right shape at 943 KB–2.0 MB and so needs the same DES-18 resize rung. Both sessions independently measured the same **50.0%** retained frame on `tempat-beli-hantaran`. Scoped, not built.

**CONT-15's database half stays live and is the input that synthesis needs**: 96/96 covers now carry real measured intrinsics on `cover_image_variants.low`, with its undo committed. Their item is the foundation for the follow-up rather than a dead end.

**What was verified independently rather than taken on report**: that `ADVISORY` contains only `image-attr-aspect`, so `shaped-slot-variant` and `shaped-slot-dims` are genuinely blocking; that PR #65 merged at 19:49:56; that `master` `5c18c74` deployed green at 19:51. CONT-15 has been explicitly forbidden from relaxing, removing or narrowing either check.

### A second finding, from UI-15

The `ui15-grid` session had independently specified a rendition **under the same name at a different size (768×576)** and was about to back-fill over mine. It caught the collision because its dry run said *"0 to render / 5 already done"* and it checked the surprising number instead of accepting it. It has dropped its rendition and now consumes this one.

**The general rule that came out of it, and it is worth more than the incident:** the R2 objects sit under `Cache-Control: immutable, max-age=31536000` at a key whose `?v=` token encodes only the focal point and `GEOMETRY_VERSION` — **neither moves when a rendition's SIZE changes**. So re-encoding 96 objects at a new size under the same name would have left the CDN serving a mix of 792px and 768px bytes under identical URLs for up to a year, with the stored `width` claiming 792 for all of them. **A rendition's size is part of its identity: a size change needs a new NAME, not a re-encode.**

---

## Production writes, and the undo

Both writes are **additive**; nothing existing was overwritten or deleted.

| | what | rows/objects |
| --- | --- | --- |
| R2 | `PUT <cover-dir>/crop-4x3-article-card-md.webp` — a new key | 96 + 1 catch-up |
| DB | `cover_image_smart_crops \|\| '{"crop-4x3-article-card-md": …}'` | 96 + 1 catch-up |

Undo dumps, with every row id and each row's prior `cover_image_smart_crops`: [`sep-02-2026-ui-16-UNDO.json`](sep-02-2026-ui-16-UNDO.json) (96 rows) and [`sep-02-2026-ui-16-UNDO-catchup.json`](sep-02-2026-ui-16-UNDO-catchup.json) (1 row). Reversal:

```sql
UPDATE articles
   SET cover_image_smart_crops = cover_image_smart_crops - 'crop-4x3-article-card-md'
 WHERE id IN (<the ids listed in the undo files>);
```

The orphaned R2 objects after a reversal are ~3.3 MB and cost nothing; they are listed in the undo files so they *can* be deleted, but leaving them is safe because no code path reads a key absent from the JSONB. **⚠ Reverting this now also breaks UI-15's `.s-card`, which consumes the same key.**

---

## Evidence

Everything under [`sep-02-2026-ui-16-EVIDENCE/`](sep-02-2026-ui-16-EVIDENCE/), reproducible by a reader who was not here:

| file | what it is | how to reproduce |
| --- | --- | --- |
| `02-gate-production-AFTER.txt` | the DoD's own instrument, green on the named URL | `node scripts/ui-layout-gate.mjs --url https://hellokahwin.com/artikel/idea-dan-nasihat/garden-wedding` |
| `03-shaped-slot-discriminator.txt` | the R2/R6 pair firing on A/C/H and silent on B/D/E/F/G | `pnpm ui:gate --shaped-slot` |
| `04-geometry-production-AFTER.txt` | box, asset, deviation, scale and declared dims at five widths, on `garden-wedding` and on the 667px capped case | the probe in the entry above |
| `05-rendition-audit-PASS.txt` | **97 checked, 0 mismatched, `RENDITION EXIT: 0`** | `pnpm audit:rendition --db "<url>"` |
| `06-rendition-audit-NEGATIVE-CONTROL.txt` | **97 checked, 97 mismatched, `RENDITION EXIT: 1`** | the same, `--expect crop-4x3-article-card-sm` |

---

## Retrospective

**What we learned that was not written down.** *A merged, deployed, gate-green change can be not-live.* The article payload caches with `revalidate: false`, and every direct database write in this repo — the ingest CLI and every backfill script — bypasses the `revalidateTag` calls the admin paths make. `article-cache.ts` documents this for a payload **shape** change and prescribes a cache-key bump; it says nothing about a **data** change under an unchanged shape, which is what a backfill is. The gap cost ~186 KB per pageview on the highest-traffic template for the length of one deploy, and it was invisible to every existing check because *both* candidate assets were rule-compliant.

**What we did twice.** Measured the corpus. The first pass said 92 covers and produced a full set of byte totals; four articles published mid-item and every number had to be re-derived at 96, then a 97th arrived before the entry was written. This is the third sprint running that a corpus has moved under a measurement (DES-18: 86 → 89; UI-13: 89 → 92). **The habit that survives is stating the n beside every total** — which the CEO's UI-13 correction already established and which this entry follows.

**What we nearly shipped, and what caught it.** Three things:

1. A byte claim that was false by 8× — caught by re-reading `currentSrc` on the live page *after* the gate went green, i.e. by distrusting a comfortable zero.
2. A repo-wide pnpm "fix" for a transient Vercel failure — caught by checking whether the failure window had a **closing** edge, not just an opening one.
3. A second session backfilling over these 96 objects at a different size under the same name — caught by its dry run's surprising count being checked rather than accepted.

**Which document must change, and who owns the edit — and the edit is made.**

| file | owner | change | state |
| --- | --- | --- | --- |
| `docs/design/card-thumbnail-image-rules.md` | `design-systems-engineer` (me — §6 is my own DES-18 paragraph) | new **§7** superseding "the article cover figure keeps `low`", plus inline markers at S5 and §6; records the R1-passing trap, the numbers, and the open CD question | ✅ shipped, `master` |
| `scripts/backfill-midsize-cover.mts` | `design-systems-engineer` | header gains **"⚠ THE RUN IS NOT FINISHED WHEN THIS EXITS 0"** with the purge command and the audit command, at the point of use | ✅ shipped, `master` |

**Prose rules do not fire, so the real deliverable is a script.**

`scripts/audit-cover-rendition.mjs` (`pnpm audit:rendition --db "<url>"`): for every published article, assert that the cover `<img>` on the **live page** loads the URL *and* the width/height the **database** says it should. A cross-layer assertion is the only kind that can see a stale cache, and it also catches a half-run backfill, a resolver regression that reorders preference, and a re-cut that moved the `?v=` token without the page following it.

Proved **both ways** on production, because a checker that reads the DB, builds the expected URL and then finds it in the page is one typo away from comparing a string to itself:

```
(no flag)                            97 checked,  0 mismatched   RENDITION EXIT: 0
--expect crop-4x3-article-card-sm    97 checked, 97 mismatched   RENDITION EXIT: 1
```

The preference order is **restated** in the script rather than imported from `resolveArticleCoverSource`. Importing it would make the checker agree with the render path by construction and copy any ordering bug into the check; two independent statements of one rule is the point. It is deliberately **not** folded into `ui-layout-gate.mjs`, which runs in CI on every push against committed fixtures and takes no credentials — this one needs the production database URL, and putting a secret in the path of the always-on check is the worse trade.

**No persona edit was needed.** Every rule this item leaned on — *a comfortable number deserves the same suspicion as a zero*, *read the intrinsic from a detached `Image()` on `currentSrc`*, *a check that cannot fail is worse than no check*, *the local database is not production* — was already in the `design-systems-engineer` persona and each one earned its place again today. The one thing it does not say is the finding above, and that now lives in a script and in a script header rather than in a persona, because those are what the next operator actually reads. (Persona edits go to `~/Documents/Code/buddy/skillcentral/agents/projects/hellokahwin/`, never to a worktree's `.claude/agents/`, which is gitignored by design.)
