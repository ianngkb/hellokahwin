import { getSmartCropUrl } from '@/lib/storage/smart-crop-url';

/**
 * DES-08 — a real `srcset`/`sizes` declaration built from derivatives the
 * pipeline ALREADY generates for every cover (no backfill).
 *
 * `low` (q30, ≤1200px — `src/lib/storage/image-variants.ts`) is the base for
 * every card/row/hero on the redesigned pages: it already clears DES-09's
 * G19/G21 byte ceilings on the samples DES-09 measured (71–252 KB, against a
 * 200–400 KB budget), where the pipeline's smart-crop derivatives at full
 * quality do not (median 823,997 B). The matching smart crop (correct aspect,
 * larger) is offered as the sole `2x`/wide upgrade candidate — never `high`
 * or `original`, which are exactly the assets DES-09 vetoed.
 *
 * This is a deliberate, disclosed partial fix. The RIGHT-sized derivatives
 * DES-03 §6.2 specifies (crop-4x5-mobile-cover-sm, crop-3x2-column-md,
 * crop-4x3-card-sm, crop-1x1-row-sm) do not exist yet — generating them means
 * a production Rekognition+R2 backfill against every live cover image, a real
 * AWS-cost decision the owner has not authorised in this item. Named as a
 * follow-up in the DES-08 work-done entry, not silently substituted.
 */
export interface CoverSource {
  src: string;
  srcSet?: string;
}

type Variants = Record<string, { url: string } | undefined> | null | undefined;

export function resolveCoverSource(
  variants: Variants,
  smartCrops: unknown,
  fallbackUrl: string | null,
  upgradeCropName: string = 'crop-4x3-article-card',
): CoverSource | null {
  const low = (variants as Record<string, { url: string } | undefined> | null)?.low?.url;
  const src = low ?? fallbackUrl ?? undefined;
  if (!src) return null;

  const upgrade = getSmartCropUrl(smartCrops, upgradeCropName);
  const srcSet = upgrade && upgrade !== src ? `${src} 1200w, ${upgrade} 1600w` : `${src} 1200w`;

  return { src, srcSet };
}
