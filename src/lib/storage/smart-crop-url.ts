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
 * The same lookup, but returning the crop's STORED intrinsic dimensions
 * alongside its URL — all three or nothing.
 *
 * UI-03 R4 ("every `w` descriptor states the asset's REAL intrinsic width") and
 * R6 ("`width`/`height` on the `<img>` state the default source's real
 * intrinsic dimensions") cannot be satisfied from a `CROP_TARGETS` number,
 * because a target is a CEILING, not a promise: `generateSmartCrops` resizes
 * with `fit:'inside', withoutEnlargement:true`, so the delivered file is
 * whatever the crop window rounded to.
 *
 * That is not hypothetical. Measured across the homepage's 20-article buffer on
 * production, 31 Ogos 2026: `crop-4.3x1-desktop-hero` is **2463×700 for 12 of
 * the 20 and 2464×700 for the other 8**. A hardcoded `2464w` is therefore a
 * 1px overstatement on the majority of articles — small, but R4 exists
 * precisely because the previous descriptor understated the same asset by 54%,
 * and "close enough" is the habit that produced it. `crop-16x9-og` happens to
 * be a uniform 1200×630 today; nothing guarantees it stays that way.
 *
 * Returns null when the entry is absent OR its dimensions are unrecorded.
 * Callers must treat unrecorded as unusable rather than substituting a nominal
 * value — an asserted intrinsic width is the exact defect R4 names.
 */
export interface SmartCropRef {
  url: string;
  width: number;
  height: number;
}

export function getSmartCropRef(crops: unknown, targetName: string): SmartCropRef | null {
  if (!crops || typeof crops !== 'object') return null;
  const entry = (crops as Record<string, unknown>)[targetName];
  if (!entry || typeof entry !== 'object') return null;
  const { url, width, height } = entry as { url?: unknown; width?: unknown; height?: unknown };
  if (typeof url !== 'string' || typeof width !== 'number' || typeof height !== 'number') {
    return null;
  }
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return { url, width, height };
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
 * IT IS ALSO A LARGE BANDWIDTH WIN, which is why the order matters more than a
 * crop preference normally would. `next.config.ts` sets
 * `images: { unoptimized: true }` — there is no request-time resizing, so the raw
 * file IS what the phone downloads. Measured on a production cover asset:
 *
 *   crop-4x5-mobile-cover   1920x2400   1209 KB   <- what mobile used to fetch
 *   crop-4x3-article-card   1600x1200    667 KB   <- what it fetches now
 *   crop-16x9-og            1200x630     254 KB
 *
 * for a plate that occupies 780x520 device px at DPR2. Preferring the landscape
 * crop takes 542 KB off the LCP image on the surface that receives essentially
 * all of this site's search traffic, on phones. 16:9 is lighter still, but it
 * costs a 21% horizontal crop (vs 11% vertical for 4:3) and drops to 948px of
 * usable width, which upscales on a DPR3 phone.
 *
 * There is no true 3:2 crop in the pipeline yet, and every existing target is
 * far larger than 780x520 — a 3:2 target at ~1170px wide would land near 150 KB
 * and beat all of these. When one is added, put it at the head of this list and
 * both callers pick it up together.
 */
export function getMobileCoverUrl(crops: unknown, fallbackUrl: string): string {
  return (
    getSmartCropUrl(crops, 'crop-4x3-article-card') ??
    getSmartCropUrl(crops, 'crop-16x9-og') ??
    getSmartCropUrl(crops, 'crop-4x5-mobile-cover') ??
    fallbackUrl
  );
}
