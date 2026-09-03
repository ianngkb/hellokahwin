/**
 * One quality ladder, used by everything in this repo that has to hit a byte
 * ceiling.
 *
 * ── WHY IT IS A LADDER AND NOT A QUALITY NUMBER ────────────────────────────
 * `midsize-cover.ts` already argued this and its argument generalises: a fixed
 * quality cannot honour a byte ceiling on a corpus that grows. DES-18 measured
 * a ceiling recorded as "met" at 37,708 B and then found a real photograph at
 * 53,606 B — handwoven songket, close to worst-case entropy for a block
 * encoder, and simply not in the eleven files the ceiling was set against.
 *
 * So the ceiling is enforced rather than asserted: encode at the first rung,
 * and step down only on a file that misses. The overwhelming majority land on
 * rung 0 and cost one encode.
 *
 * ── WHY IT LIVES HERE RATHER THAN IN `smart-crop.ts` ───────────────────────
 * It was `renderCoverRendition`'s private loop until the `mid` article variant
 * needed the same behaviour. Copying the loop would have been a second ladder
 * to keep in step with the first — the exact failure `COVER_RENDITIONS` was
 * declared to prevent one layer up, where DES-18 added its rung to ingest and
 * to the backfill separately.
 *
 * ⚠️ It takes a PIPELINE FACTORY, not a `sharp` instance. A `sharp` object is
 * consumed by `toBuffer()`; reusing one across rungs silently returns the first
 * rung's bytes for every subsequent attempt, so the ladder would appear to work
 * and never actually step. Each rung gets a fresh pipeline from the callback.
 */
import type sharp from 'sharp';

export interface CeilingSpec {
  /** Bytes. The result is judged against this, never above it if a rung fits. */
  readonly CEILING_BYTES: number;
  /** Tried in order. The first rung that fits wins. */
  readonly QUALITY_LADDER: readonly number[];
}

export interface CeilingResult {
  buffer: Buffer;
  width: number;
  height: number;
  bytes: number;
  /** The rung that won. Recorded so a corpus drifting downward is visible. */
  quality: number;
  /** True when even the last rung missed. Never silently ignored. */
  overCeiling: boolean;
}

/**
 * Encode `build(quality)` at successively lower qualities until the result fits
 * `spec.CEILING_BYTES`.
 *
 * Returns the last attempt flagged `overCeiling` when every rung missed, rather
 * than throwing. A file over budget is a byte problem, not a reason to fail an
 * editor's upload — the callers that DO want it to be fatal (the backfills)
 * turn the flag into a non-zero exit, which is where that decision belongs.
 */
export async function encodeUnderCeiling(
  build: (quality: number) => sharp.Sharp,
  spec: CeilingSpec,
): Promise<CeilingResult> {
  let last: CeilingResult | null = null;

  for (const quality of spec.QUALITY_LADDER) {
    const { data, info } = await build(quality).toBuffer({ resolveWithObject: true });

    last = {
      buffer: data,
      width: info.width,
      height: info.height,
      bytes: data.length,
      quality,
      overCeiling: data.length > spec.CEILING_BYTES,
    };
    if (!last.overCeiling) return last;
  }

  // `QUALITY_LADDER` is typed as a non-empty tuple by every caller's spec, but
  // an empty array would land here with `last` null. Assert rather than return
  // a lie: a ladder with no rungs is a configuration error, not a byte problem.
  if (!last) {
    throw new Error('encodeUnderCeiling: QUALITY_LADDER is empty — nothing was encoded');
  }
  return last;
}
