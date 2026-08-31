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
