/**
 * DES-18 — the mid-size cover rendition. The rung that was missing between the
 * `low` thumbnail and the full-frame crop.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * Measured on production, 01 September 2026, over all 86 published covers:
 *
 *   low.webp                 36,964 –    82,110 B   source aspect, no crop
 *   crop-16x9-og            229,204 –   435,506 B
 *   crop-4x3-article-card   111,584 – 1,430,152 B   median 647,354
 *   crop-4x5-mobile-cover   943,320 – 2,086,402 B
 *
 * There was nothing aspect-correct under 100 KB. That gap is what made
 * `docs/design/card-thumbnail-image-rules.md` §4 stop: the `.s-row` thumbnail
 * needed a 4:3 asset, the only 4:3 asset weighed 488–946 KB, and substituting
 * it across the homepage priced at **+8.2 MB**. This module is the rendition
 * that costs bytes instead of spending them — median 17,664 B, which is
 * *lighter* than the `low` those rows fetch today.
 *
 * ── IT IS A RESIZE, NOT A CROP, AND THAT IS THE WHOLE COST MODEL ───────────
 * The source is the already-stored `crop-4x3-article-card`. The crop window and
 * its focal point are computed and persisted; this reads them back as pixels.
 *
 *   · no Rekognition call
 *   · NOT a `CROP_TARGETS` entry, so `GEOMETRY_VERSION` does not change, so
 *     nothing re-queues. Adding a fifth target would re-cut all 86 covers
 *     through Rekognition + R2 — an AWS-cost decision that belongs to the
 *     owner, and one UI-03 and DES-08 both declined to make.
 *
 * ⚠️ `NAME` is load-bearing twice over, exactly like a `CROP_TARGETS` name: it
 * is the R2 object key (`<dir>/<NAME>.webp`) AND the key inside the
 * `coverImageSmartCrops` JSONB. Renaming it orphans every stored rendition and
 * silently drops every `.s-row` back to `low`. Change the box or the ceiling
 * deliberately; never change the name.
 *
 * ── THE BOX ────────────────────────────────────────────────────────────────
 * 528 × 396. The `.s-row` thumbnail is 176 CSS px at ≥1024px
 * (`src/design-system/components.css`), so 528 is DPR 3 exactly — not a round
 * number chosen for looking round. Below 1024px the slot is 80 × 60 and the
 * same file is heavily oversampled; it is still ~3× lighter than the `low` that
 * slot fetched before, so there is no second file to justify.
 *
 * 528 is also the largest useful width that upscales NOTHING. Enumerated across
 * the 86 stored `crop-4x3-article-card` entries on 01 Sept 2026, the source
 * widths are 667, 771, 907, 908, 911, 1032, 1280, 1307, 1365, 1536, 1599, 1600
 * — so 528 clears the smallest by 1.26×, while an 800px box would upscale 5
 * covers and a 1024px box would upscale 9. `withoutEnlargement` means those
 * would be silently short files rather than errors, which is worse.
 *
 * ── THE CEILING, AND WHY IT IS ENFORCED RATHER THAN ASSERTED ───────────────
 * 46,080 B, inherited unchanged from DES-03 §6.2's `crop-4x3-card-sm` ceiling —
 * applied here to a box 21% larger in area, so it is strictly tighter than
 * DES-03 asks for.
 *
 * DES-03 §6.2 reported that box as "measured max 37,708 B — within budget". Its
 * own evidence script says why that verdict was provisional: *"the sources are
 * already downsampled copies … the ceilings are what the DSE must hit, not
 * these numbers."* Re-measured for DES-18 on the real corpus with DES-03's own
 * `derivatives.py` encoder — which reproduces its published 37,708 B exactly on
 * DES-03's eleven — the 86 live covers max at **53,606 B**. One photograph,
 * `songket-tenunan-tangan-atau-cetak`, is 16.3% OVER a ceiling recorded as met.
 * Handwoven songket is close to worst-case entropy for a block encoder, and it
 * was not in the eleven.
 *
 * So a fixed quality cannot honour a byte ceiling on a corpus that grows. The
 * ladder below is the ceiling made executable: encode at `QUALITY_LADDER[0]`
 * (UI-12's specified q50) and step down only on a file that misses. Measured on
 * the corpus of 86: 85 files land on the first rung; exactly one steps.
 */

export const MIDSIZE_COVER = {
  /** R2 object key stem AND the `coverImageSmartCrops` key. Never rename. */
  NAME: 'crop-4x3-article-card-sm',
  /** The crop this is a rendition OF. Not re-cropped, only resized. */
  SOURCE_NAME: 'crop-4x3-article-card',
  WIDTH: 528,
  HEIGHT: 396,
  /** Bytes. DES-03 §6.2's card ceiling, on a 21% larger box. */
  CEILING_BYTES: 46_080,
  /**
   * First rung that fits the ceiling wins. q50 is the quality
   * `card-thumbnail-image-rules.md` §4 costed; the rest only ever run on a
   * photograph q50 cannot fit.
   */
  QUALITY_LADDER: [50, 46, 42, 38, 34, 30] as const,
} as const;

/**
 * The shape `renderMidsizeCover` returns. Declared here, next to the numbers it
 * is judged against, and implemented in `smart-crop.ts` where `sharp` already
 * lives — the same heavy/light split as `smart-crop-url.ts`, so render-path
 * code can import `MIDSIZE_COVER` without pulling in sharp and the AWS SDK.
 */
export interface MidsizeRendition {
  buffer: Buffer;
  width: number;
  height: number;
  bytes: number;
  /** The rung that won. Recorded so a corpus drifting downward is visible. */
  quality: number;
  /** True when even the last rung missed the ceiling. Never silently ignored. */
  overCeiling: boolean;
}

/**
 * UI-16 — the ARTICLE COVER rendition. The second rung on the same ladder, and
 * it exists because the first one cannot reach this slot.
 *
 * ── THE SLOT, MEASURED RATHER THAN ASSUMED ─────────────────────────────────
 * `figure.hk-article-figure` on the article template, measured on production
 * 02 September 2026 at deviceScaleFactor 1 with `scripts/audit-article-cover.mjs`:
 *
 *   viewport   390   768   1024  1440  1920
 *   box width  350   704   580   756   756      <- the widest box is 756 CSS px
 *
 * `MIDSIZE_COVER` is 528 px. In a 756 px box that is a **1.43x upscale**, which
 * is why DES-18 wrote "the article cover keeps `low`" and excluded this slot by
 * name. That exclusion was correct for the asset that existed and is what this
 * rung retires — the tracker's phrase "DES-18's mid-size variant is the
 * affordable route" is true of its MECHANISM, not of its 528 px box.
 *
 * ── WHY THIS SLOT COULD NOT STAY ON `low` ──────────────────────────────────
 * hero-image-rules R2: `low`, `high` and `original` are never eligible for a
 * shaped slot, at any quality, because they preserve the SOURCE aspect — which
 * is the photographer's, not the designer's. `card-thumbnail-image-rules` T2
 * already named 4:3 as where this slot goes "the day a small rendition of it
 * exists (§5)". It exists now, so this is that day.
 *
 * ── 792 x 594, AND WHY NOT SOMETHING ROUNDER ───────────────────────────────
 * 792 is 756 x 1.048 — the smallest width that clears the widest box with no
 * upscale at all, and it is exactly 1.5x `MIDSIZE_COVER`, so the two rungs are
 * the same box at two scales rather than two independent guesses.
 *
 * Enumerated across the 96 stored `crop-4x3-article-card` entries on
 * 02 Sept 2026, source widths are 667, 771, 907, 908, 911, 1032, 1280, 1307,
 * 1365, 1536, 1599, 1600. `withoutEnlargement` means five render SHORT of 792:
 * one at 771 (clears the 756 box at 0.98x) and four at 667. Those four are the
 * finding this item reports rather than hides — see `resolveArticleCoverSource`,
 * which caps the box to the asset instead of stretching the asset to the box.
 *
 * Delivered, read back from the database after the backfill: **91 at 792x594,
 * 4 at 667x500, 1 at 771x578**. The prediction and the corpus agree exactly,
 * which is the only reason the four are a finding rather than a surprise.
 *
 * ── BYTES: THIS IS A SAVING, MEASURED OVER THE WHOLE CORPUS ────────────────
 * Measured by HTTP HEAD on the objects this backfill actually wrote, against
 * the `low.webp` the cover figure served before it — all 96 published covers,
 * 02 September 2026:
 *
 *   low.webp        total 5,034,824 B    (min 15,184  max 252,352  median 49,856)
 *   this rendition  total 3,296,332 B    (min 12,346  max 100,990  median 30,716)
 *                   delta  -1,738,492 B  = -34.5%, and only 4 covers get heavier
 *
 * ⚠ The corpus moved from 92 to 96 WHILE this was being measured — four
 * articles published mid-item, the same way DES-18 watched 86 become 89. Every
 * number above is the 96-cover run; an earlier draft of this comment quoted the
 * 92-cover one and was corrected rather than left to read as authoritative.
 *
 * The four that get heavier are the four 667px covers, by 1,630 / 2,250 /
 * 2,404 / 2,742 B: their `low` is an 800x500 file at q30 and this is 667x500 at
 * q50, so it is a quality trade on the four smallest photographs on the site,
 * not a regression anyone can see.
 *
 * On `garden-wedding` — the page the item names, ~28% of all site impressions —
 * 33,574 B becomes 26,936 B: **-6,638 B, -19.8%**, on the LCP element.
 *
 * ── THE CEILING ────────────────────────────────────────────────────────────
 * 103,680 B = DES-03 §6.2's 46,080 B card ceiling scaled by area (792x594 is
 * 2.25x the area of 528x396). Scaling it is the honest reading: DES-18 applied
 * the same constant to a box 21% larger and called that strictly tighter, and
 * the same argument at 2.25x would be a ceiling nothing could ever meet.
 *
 * Measured, the corpus max is 100,990 B (`songket-tenunan-tangan-atau-cetak`,
 * the same worst-case photograph that made DES-18's ladder necessary) — 2.6%
 * under, so every one of the 96 lands on the first rung and the backfill
 * reported `over ceiling 0`. A ceiling nothing hits is a ceiling nobody has
 * tested, so the ladder's step-down is proved by the unit test rather than by
 * the corpus happening to need it.
 */
export const ARTICLE_COVER_MD = {
  /** R2 object key stem AND the `coverImageSmartCrops` key. Never rename. */
  NAME: 'crop-4x3-article-card-md',
  /** The crop this is a rendition OF. Not re-cropped, only resized. */
  SOURCE_NAME: 'crop-4x3-article-card',
  WIDTH: 792,
  HEIGHT: 594,
  /** Bytes. DES-03 §6.2's card ceiling, area-scaled to this box. */
  CEILING_BYTES: 103_680,
  QUALITY_LADDER: [50, 46, 42, 38, 34, 30] as const,
} as const;

/**
 * The shape both rungs share, so `renderCoverRendition` takes a spec rather
 * than a name and a new rung cannot be added with a field missing.
 */
export interface CoverRenditionSpec {
  readonly NAME: string;
  readonly SOURCE_NAME: string;
  readonly WIDTH: number;
  readonly HEIGHT: number;
  readonly CEILING_BYTES: number;
  readonly QUALITY_LADDER: readonly number[];
}

/**
 * Every rendition `generateSmartCrops` writes and `backfill-midsize-cover.mts`
 * can target. Declared in ONE place so ingest and the backfill cannot drift:
 * DES-18 added its rung to ingest and to the backfill separately, and a third
 * rung added the same way would be a third opportunity to add it to only one.
 */
export const COVER_RENDITIONS: readonly CoverRenditionSpec[] = [MIDSIZE_COVER, ARTICLE_COVER_MD];
