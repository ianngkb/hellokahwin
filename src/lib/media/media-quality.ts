/**
 * Reading a media row's stored versions honestly — ported in part from The
 * Wedding Notebook's `lib/media/media-quality.ts`.
 *
 * Only the two pieces the media library needs are here: `normalizeVariants`
 * (the delete core uses it to find every URL a row can be addressed by) and
 * `displayFileSize` (the gallery and detail panel use it so an unmeasured file
 * reads "—" rather than "0 B"). TWN's quality resolver and download helpers are
 * deliberately NOT ported: they depend on TWN's variant-naming module and its
 * download route, neither of which HelloKahwin has.
 *
 * PURE ON PURPOSE. No `db`, no `sharp`, no AWS SDK — a client component can
 * import it, and a unit test needs no mocks. In particular this must never
 * import `@/lib/storage/image-variants` for anything but a type: that module
 * pulls in sharp and the R2 client.
 */
import type { ImageVariants } from '@/lib/storage/image-variants';

/**
 * Every rung a `variants` map can hold, smallest first. `mid` is HelloKahwin's
 * 680px article-body rung (see `MID_PRESET`); `medium` is deprecated and no
 * longer generated, but older rows may still carry one.
 */
const VARIANT_NAMES = ['low', 'mid', 'medium', 'high', 'original'] as const;

/**
 * The `variants` column as an OBJECT, whatever shape the row holds.
 *
 * A historical writer stringified the map twice, so some rows store `variants`
 * as a JSON *string*. Passed through unnormalised, `variants.low.url` is
 * undefined and every reader silently skips that row's real URLs — which, for
 * the delete core, means an article node pointing at `low.webp` is never
 * scrubbed.
 */
export function normalizeVariants(variants: unknown): ImageVariants | null {
  let value = variants;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as ImageVariants;
}

/** A recorded size, or `null`. `0` is "never measured", not "empty file". */
function cleanSize(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.trunc(n);
}

/**
 * The size to SHOW for a row, or `null` for "—".
 *
 * Imported rows can carry `file_size = 0` because the import never measured
 * them. Rendering that as "0 B" is a confident lie about a multi-megabyte
 * photograph, so a zero falls back to the biggest size any variant records,
 * and then to nothing at all.
 */
export function displayFileSize(media: {
  fileSize?: number | null;
  variants?: unknown;
}): number | null {
  const own = cleanSize(media.fileSize);
  if (own !== null) return own;

  const variants = normalizeVariants(media.variants);
  if (!variants) return null;

  let largest: number | null = null;
  for (const name of VARIANT_NAMES) {
    const size = cleanSize(
      (variants[name as keyof ImageVariants] as { sizeBytes?: unknown } | undefined)?.sizeBytes,
    );
    if (size !== null && (largest === null || size > largest)) largest = size;
  }
  return largest;
}
