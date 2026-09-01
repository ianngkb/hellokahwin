# CONT-15 — the article cover plate, and the collision with UI-16

**Item:** CONT-15 · Sprint 06 · design-systems-engineer
**Shipped:** the DATABASE half only — PR #71. The render half was **built, reviewed, verified and deliberately not merged.**
**Reviewer: Claude.** Own adversarial pass, two parallel Claude subagents (correctness hunter + acceptance auditor). **`codex-reviewer` was NOT dispatched**; no OpenAI-backed review path was used, per the owner directive of 02 Sept 2026.

---

## The one-line outcome

**The DoD is MET BY UI-16's ROUTE, not by CONT-15's render change.** CONT-15's
render change is not on production and will not be. Its database half is, and it
is the input the follow-up item needs.

---

## The collision, recorded so it is findable later

Two items changed the same element on the same day from incompatible premises.

| | CONT-15 (creative-director spec) | UI-16 (shipped) |
| --- | --- | --- |
| Who owns the box shape | the **photograph** | the **design** |
| Asset | `low.webp` — correct *because* it preserves the source aspect | a named `crop-4x3-article-card-md`, 792×594 |
| Box | `aspect-ratio: var(--cover-ar)`, the file's own ratio | fixed 4:3 |
| Portrait cover keeps | **100%** of the frame, at 387×580 | **50.0%** |
| Enforcement | — | **blocking** gate checks `shaped-slot-variant` (R2), `shaped-slot-dims` (R6) |

They are mutually exclusive **in code, not merely in taste**. UI-16's R2 fires
whenever `low`/`high`/`original` enters a box carrying an explicit CSS
`aspect-ratio`. CONT-15's `.hk-cover-plate` does exactly that, by design.

Measured — master's gate pointed at the CONT-15 preview build
(`02-master-gate-vs-cont15-preview-R2-fires.log`):

```
shaped-slot-variant 5          ← one per width, all five, BLOCKING
  "served low into a box shaped aspect-ratio: 1200 / 1800 …
   Only a named crop may fill a shaped box."
image-aspect 0                 ← CONT-15 does close the defect it was written for
```

### The ruling, and its reasoning

**UI-16 stands.** The reason is in CONT-15's own brief, which neither item's
author had re-read literally:

> "DO NOT solve it by substituting an existing crop — UI-12 priced that at
> +8.2MB across the homepage and that route stays FORBIDDEN. DES-18's mid-size
> variant shipped in Sprint 05 and is the intended route."

The ban was on the **existing heavy crops**. UI-16 used a **new mid-size named
rendition at −52% bytes**, which is the route the brief named as *intended*.
UI-16 executed CONT-15's brief. The CD's spec — box follows the file, keep
`low` — was a cleverer idea that diverged from the brief it was written to
satisfy. Not a close call once the brief is read literally.

---

## The DoD, verified rather than assumed

`node scripts/ui-layout-gate.mjs --base https://hellokahwin.com`, master, live
production. Full log: `01-sitewide-gate-production-master.log`.

```
totals: empty-content 0 · rail-collapsed 0 · narrow-text-column 0
        reading-measure 0 · clipped-text 0 · viewport-overflow 0
        scroll-container-clip 0 · image-upscale 0 · image-aspect 0
        image-attr-aspect 61 (advisory, does not fail the build)
        image-unmeasurable 0 · shaped-slot-variant 0 · shaped-slot-dims 0
        category-diversity 0 · source-order 0
UILINT EXIT: 0
```

35 measurements, 7 templates × 5 widths, every row `[ ok ]`, cache HITs and build
fingerprints recorded per target.

> ⚠️ **CAVEAT ON THAT GREEN, stated rather than buried.** The sitewide sample
> contains **no portrait cover**. Its article instances are `garden-wedding`
> (1.499) and the longest-title article; neither was ever affected. A green there
> is a green over a population this item was never about. The affected slugs were
> gated directly, separately.

### Re-derived pre-fix count, current corpus

The carried figure was "12 of 86"; the spec said "14 of 92". Re-derived against
the live corpus at 20:18 UTC:

```
corpus                                    102 published covers
PRE-FIX image-aspect violations
  (fixed 3:2 box fed low.webp)             15
  0.667 ×8 · 0.748 ×1 · 0.750 ×5 · 0.753 ×1
```

The 15th is `syarat-wali-nikah`, published *after* the CD measured.

**THE CORPUS MOVED FOUR TIMES DURING THIS ITEM: 92 → 95 → 96 → 102, in one
evening.** Both counts are kept and dated rather than reconciled; reconciling
them would destroy the evidence that it moves.

### Byte cost, content-length measured

Across the 15 affected articles, `low.webp` → `crop-4x3-article-card-md`:

```
1,017,824 B → 369,502 B  =  −648,322 B  (−63.7%)
mean per affected article:  −43,221 B
corpus total: 5,034,824 → 3,296,332 B = −1,738,492 B (−34.5%)
```

That independently reproduces UI-16's own figures to the byte.

---

## What shipped: the database half (PR #71)

`scripts/backfill-cover-intrinsics.mts` — real intrinsics read from each file's
**own header** via a ranged GET, never from `media.width/height` and never from a
neighbouring record. Additive JSONB merge *inside* `cover_image_variants.low`
(a top-level `||` replaces the object and drops `sizeBytes`). No R2 write.
**102 of 102** covers recorded across three production runs; three undo files
committed.

`scripts/audit-cover-intrinsics.mjs` — **the Stage 9 retrospective edit, as a
gate rather than a paragraph.**

### Why that gate exists

`generateVariants` writes `ImageVariantMeta = { url, sizeBytes }` and was not
changed. Intrinsics are written by **backfill only**, and a value only a backfill
writes decays the moment the backfill ends. That took **24 minutes**:

```
19:08  backfill        96 of 96 recorded
19:32  re-check        4 unrecorded — three newly published, and
                       `syarat-wali-nikah` REGENERATED in admin: its low.url
                       moved …558718… → …708079… and its intrinsics stayed
                       attached to the old file
20:18  re-check        corpus 102, SIX unrecorded
20:23  after catch-up  102 of 102
```

**Verified as a PAIR, not merely seen failing.** Run 1 against production: exit 1,
six rows named. Ran the backfill. Run 2: the low column goes 96 → **102/102
GREEN** while the md column **stays 96/102 RED**. It discriminates between two
failure modes rather than reporting "something is wrong".

---

## Findings raised, not absorbed

1. **A LIVE 4.7 MB BYTE REGRESSION ON UI-16's FALLBACK PATH.** Six articles
   ingested 20:14–20:16 UTC — *after* UI-16 deployed at 19:51 — carry every other
   crop including DES-18's `-sm` but **not** UI-16's `-md`, so
   `resolveArticleCoverSource` falls through to the **full** `crop-4x3-article-card`.
   Measured live: `doa-pembuka-majlis` serves **770,140 B** at 1600×1200, painted
   350.0×262.5 @390 — a **4.57× downscale**; the control `garden-wedding` serves
   792×594 at 2.26×. All six total **4,742,962 B** (mean 790 KB on the LCP
   element) where their `low` totals 378,182 B — **~12.5×**. That is the +8.2 MB
   route UI-12 forbade, reached as a *fallback* rather than as a choice.
   **No blocking check catches it**: box 4:3, file 4:3 → `image-aspect` 0; a
   downscale → `image-upscale` 0; a named crop → R2 passes. A pure byte defect
   with no rule. Cause not asserted — belongs to UI-16's owner.

2. **The editorial defect, carried forward as a named item** (below).

3. **`.inspire-prose` body images** still declare a hard-coded `width="1200"
   height="800"` for e.g. a 1527×2264 file — 122% off. Advisory
   (`image-attr-aspect` 61 sitewide). Different element, different item.

4. **I could not read the specification artifact.** The Artifact tool returned
   *"not found — it may have been deleted, or it has not been shared with you"*
   and it was absent from a `scope=all` listing. Built from
   `_cont15-build-artifact.mjs` + `_cont15-plates.json` (its generator). If any
   number was hand-edited into the artifact after generation, the spec I built
   against was stale and nothing would have revealed it.

---

## NEXT ITEM, scoped not built: the synthesis

**Name:** `CONT-17 — the cover box follows the RENDITION, not a hardcoded 4/3`

Both CONT-15 and UI-16 independently reached the same synthesis and both said it
should not be built the same night. Agreed; named and scoped here.

**The defect it closes.** `tempat-beli-hantaran` (1200×1800) discards **50.0%** of
a photograph an editor deliberately framed tall. It clears R8(c)'s 33% floor, so
it is **not a rule violation** — it is a taste defect, and the reason it needs an
item rather than a gate change.

**The change.** Drive `--cover-ar` from the rendition's **stored `width`/`height`**
instead of a hardcoded `4/3`. The box then follows the asset *and* the asset is a
named crop — satisfying UI-16's R2 and the CD's principle at once, with no rule
relaxed.

**What it needs first, and why it is not one line.** A **portrait rendition at
sane weight**. `crop-4x5-mobile-cover` is 943 KB – 2.0 MB and is not usable on the
LCP element; it needs the DES-18 resize rung that produced 792×594 —
`renderCoverRendition` + a `COVER_RENDITIONS` entry, no new Rekognition call and
no `GEOMETRY_VERSION` move.

**Its input already exists**, and that is what CONT-15's database half is for:
102/102 covers now carry measured source intrinsics, so *which* covers need a
portrait rung is a query rather than a guess.

**Do not start it** until finding 1 above is resolved — it touches the same
fallback chain.

---

## Not merged, and why

**PR #63** carries the render half — `.hk-cover-plate`, `cover-plate.ts`, the
article-page change, the reference-page section, the `CoverSource`
width/height change. It is green on all four blocking checks and verified at
**0.00% deviation at all five widths** (350.0×525.0 @390, 386.7×580.0 @768/1024/
1440/1920; landscape control pixel-for-pixel unchanged at 756.0×504.2). It
**loses to UI-16** and should be closed rather than merged.

**The pnpm pin** (`ianng89/pnpm-pin-hardening`, `f32d2b0`) was taken off this
branch and **no PR was opened**. PLAT-16's `f49b8ec` (PR #66) superseded it and
found the thing the pin never had to confront: in pnpm 11 `onlyBuiltDependencies`
was not merely relocated, it was **renamed to `allowBuilds` and changed from a
list to a map**, so moving the key verbatim fails byte-identically. Pinning to
pnpm 10 would make PLAT-16's `pnpm-workspace.yaml` inert and leave the pnpm 11
path untested — a regression of a fix that landed twenty minutes earlier,
dressed as hardening.
