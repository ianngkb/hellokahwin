/**
 * Lightweight accessor for smart crop URLs — no heavy dependencies (sharp, AWS SDK).
 * Import this instead of smart-crop.ts when you only need to read crop URLs.
 */

export type SmartCrops = Record<string, { url: string; width: number; height: number }>;

/** Safely extract a smart crop URL from unknown JSONB data */
export function getSmartCropUrl(crops: unknown, targetName: string): string | null {
  if (!crops || typeof crops !== 'object') return null;
  const record = crops as Record<string, unknown>;
  const entry = record[targetName];
  if (!entry || typeof entry !== 'object') return null;
  const { url } = entry as { url?: unknown };
  return typeof url === 'string' ? url : null;
}

/**
 * The crop the mobile article cover actually renders, in preference order.
 *
 * ONE definition, because there are two callers that must never disagree: the
 * `<Image>` inside ArticleCoverMobile, and the `ReactDOM.preload(...)` LCP hint
 * the article route emits during HTML parse. If those two resolve to different
 * URLs the browser downloads both at high priority and the preload stops being
 * a preload — a silent regression on the site's highest-traffic surface, with
 * no visual symptom to catch it.
 *
 * The mobile plate is 3:2 (UX-01). `crop-4x5-mobile-cover` is a PORTRAIT crop
 * an editor framed to be tall, so a 3:2 window keeps only its middle 53% and
 * discards the composition they chose. The landscape crops the pipeline already
 * produces survive that window nearly intact, nearest ratio first: 4:3 (1.33),
 * then 16:9 (1.78), against a target of 1.5. The 4:5 crop stays last as a
 * fallback for older articles that have nothing else.
 *
 * There is no true 3:2 crop in the pipeline yet. When one is added, put it at
 * the head of this list and both callers pick it up together.
 */
export function getMobileCoverUrl(crops: unknown, fallbackUrl: string): string {
  return (
    getSmartCropUrl(crops, 'crop-4x3-article-card') ??
    getSmartCropUrl(crops, 'crop-16x9-og') ??
    getSmartCropUrl(crops, 'crop-4x5-mobile-cover') ??
    fallbackUrl
  );
}
