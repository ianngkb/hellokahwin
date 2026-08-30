/**
 * The cover source for every card, row and article-cover `<img>` on the public
 * site: `low` (q30, ≤1200px — `src/lib/storage/image-variants.ts`), or the raw
 * `coverImageUrl` when there is no variant record.
 *
 * ── UI-12 S1: THE `srcset` IS GONE, AND IT IS NOT COMING BACK ──────────────
 * `docs/design/card-thumbnail-image-rules.md` §3 S1. This function used to
 * return `${low} 1200w, ${crop-4x3-article-card} 1600w`. Two independent
 * reasons to delete it, either one sufficient:
 *
 * 1. T1 / hero-rules R4 — a `w` descriptor must state the delivered file's REAL
 *    intrinsic width, read from the file. `ImageVariantMeta` is
 *    `{ url, sizeBytes }`: there is no width and no height recorded for `low`,
 *    `high` or `original`, so `1200w` was a constant asserted in place of a
 *    measurement. Measured on production 31 Ogos 2026: `garden-wedding`'s
 *    `low.webp` is genuinely **1024** wide — a 17.2% overstatement, live on the
 *    site's highest-traffic template. A descriptor that cannot be true must not
 *    be written. The smart crops keep theirs, because `getSmartCropRef` returns
 *    stored `width`/`height` or nothing.
 *
 * 2. hero-rules R3 / §0 — the two candidates were `low` (the SOURCE aspect:
 *    1.500, 1.333 or 0.667 depending on the article) and `crop-4x3-article-card`
 *    (1.333, a DIFFERENT photograph shape). Declaring those as interchangeable
 *    width candidates is `srcset` being used to choose a CROP, which is the
 *    exact mechanism UI-03 was written to retire. It was still shipping on
 *    three templates.
 *
 * It is a byte win, not a cost. On the article cover `sizes` resolved to 768px,
 * so every display at DPR ≥ 1.33 — every retina laptop and phone — selected the
 * `1600w` candidate and downloaded **488–946 KB** of a wrongly-shaped crop.
 * It now downloads `low` at **36–80 KB**.
 *
 * Measured effect on `scripts/ui-layout-gate.mjs`: **image-upscale 25 → 0**.
 * Those 25 were never an upscale — the gate reads `img.naturalWidth`, which on
 * a `srcset` element is the intrinsic width divided by the density the browser
 * derived from `sizes`, so a pure aspect mismatch (1.333 box, 1.500 asset) leaks
 * through `object-fit: cover` and surfaces as a 1.13× "upscale" on eleven
 * homepage rows that are in fact downscaling by 6×. Removing the untrue
 * `srcset` clears all 25 without touching a single image file.
 *
 * ⚠️ Callers must also drop their `sizes` attribute. `sizes` with no `srcset` is
 * inert, and an inert attribute that looks like a geometry declaration misleads
 * the next reader — which is how `sizes="176px"` came to be read as the row
 * thumbnail's width in the first place.
 */
export interface CoverSource {
  src: string;
}

type Variants = Record<string, { url: string } | undefined> | null | undefined;

export function resolveCoverSource(
  variants: Variants,
  /* Dead since S1 removed the `srcSet` this was the upgrade candidate for.
     Kept in the signature rather than removed because UI-12 §3 S1 names exactly
     one parameter to delete (`upgradeCropName`), and dropping this one as well
     rewrites the argument list at all six call sites — a wider edit than the
     spec authorises. Raised as a follow-up, not decided here. */
  smartCrops: unknown,
  fallbackUrl: string | null,
): CoverSource | null {
  const low = (variants as Record<string, { url: string } | undefined> | null)?.low?.url;
  const src = low ?? fallbackUrl ?? undefined;
  if (!src) return null;

  return { src };
}
