import sharp from 'sharp';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client, getR2Bucket, getR2PublicUrl } from '@/lib/r2/client';
import { db } from '@/lib/db/drizzle';
import { adminSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { encodeUnderCeiling, type CeilingSpec } from './byte-ceiling';

export type ImageVariantMeta = { url: string; sizeBytes: number };

export type ImageVariants = Record<'low' | 'high' | 'original', ImageVariantMeta> & {
  /** The 680px article-body rung. See `MID_PRESET`. */
  mid?: ImageVariantMeta;
  /** @deprecated No longer generated, but may exist on older records */
  medium?: ImageVariantMeta;
};

export type QualityPreset = { quality: number; maxWidth: number };

/**
 * The article-body rung, and the reason this module grew a ceiling.
 *
 * -- THE MEASUREMENT --------------------------------------------------------
 * `high` is q80 at 2400px. `next.config.ts` sets `images.unoptimized = true`,
 * so Vercel's optimizer never touches it and the browser is handed the file as
 * stored. Every inline figure and every single-column gallery cell in
 * `article-renderer.tsx` paints into a `max-w-[680px]` box.
 *
 * The Ahrefs crawl of 28 August 2026 flagged 39 images over budget. Read back
 * from the database on 04 September 2026, across the 1,074 media rows carrying
 * a `high`: 318 are over 350 KB, 174 over 500 KB, 35 over 1 MB, and the largest
 * is 2,221,708 B. Confirmed live on `amankila-bali`, whose body figures are
 * 1,423,024 B each -- 1.4 MB downloaded to paint 680 CSS px.
 *
 * -- 1400px, NOT 1360 -------------------------------------------------------
 * 680 x 2 = 1360 is the exact 2x retina requirement. 1400 clears it with a 3%
 * margin so the figure is never resampled UP on a 2x display. `withoutEnlargement`
 * means a source narrower than 1400 stays at its own size rather than being
 * fabricated wider -- an honest short file, the same reasoning `smart-crop.ts`
 * gives for its own crop boxes.
 *
 * -- q72 IS RUNG 0, AND THE CEILING IS WHAT ACTUALLY BINDS -------------------
 * A fixed quality cannot honour a byte ceiling on a corpus that grows -- the
 * argument is `byte-ceiling.ts`'s and it applies here unchanged. q72 at 1400px
 * fits 350 KB for the overwhelming majority; a high-entropy photograph steps
 * down until it fits rather than shipping over budget.
 */
export const MID_PRESET: QualityPreset & CeilingSpec = {
  quality: 72,
  maxWidth: 1400,
  CEILING_BYTES: 350_000,
  QUALITY_LADDER: [72, 66, 60, 54, 48, 42, 36, 30] as const,
};

/**
 * Byte ceilings by preset name. A preset absent from this map is encoded at its
 * declared quality with no ladder, which is the pre-existing behaviour for
 * `low` and `high` and is deliberately left alone: `high` is the archival rung
 * the media library and the admin quality picker read, and capping it would
 * quietly change what "high" means everywhere it is already stored.
 */
const PRESET_CEILINGS: Record<string, CeilingSpec> = {
  mid: MID_PRESET,
};

/**
 * The ladder to actually encode `preset` with.
 *
 * ⚠️ Rung 0 comes from the EFFECTIVE preset, not from the constant. The ceiling
 * spec's own `QUALITY_LADDER` starts at the hardcoded 72, so passing it
 * unchanged would honour an admin's `maxWidth` (which `build` reads from the
 * preset) while silently ignoring their `quality` — a row of
 * `{"mid": {"quality": 60, "maxWidth": 1500}}` would produce a q72 file, LARGER
 * than the one asked for, with nothing logged to say so. The settings row exists
 * to retune these; a retune that does nothing is worse than no row at all.
 *
 * Rungs at or above the requested quality are dropped rather than reordered:
 * the ladder's contract is that the FIRST rung that fits wins, so a higher rung
 * left in front would hand back a bigger file than the admin asked for.
 */
export function ladderFor(preset: QualityPreset, ceiling: CeilingSpec): CeilingSpec {
  const below = ceiling.QUALITY_LADDER.filter((q) => q < preset.quality);
  return { CEILING_BYTES: ceiling.CEILING_BYTES, QUALITY_LADDER: [preset.quality, ...below] };
}

const DEFAULT_PRESETS: Record<string, QualityPreset> = {
  low: { quality: 30, maxWidth: 1200 },
  mid: { quality: MID_PRESET.quality, maxWidth: MID_PRESET.maxWidth },
  high: { quality: 80, maxWidth: 2400 },
};

const DEFAULT_QUALITY = 'high';

/**
 * Merge an admin row over the defaults PER FIELD, not per preset name.
 *
 * A shallow `{ ...DEFAULT_PRESETS, ...row }` protects a MISSING preset, which is
 * most of the point — but it replaces a PRESENT one wholesale. A row carrying
 * `mid: { quality: 90 }` and no `maxWidth` would then reach `generateVariants`
 * as `resize({ width: undefined })`, which sharp reads as "do not resize at
 * all": `mid.webp` would be written at the source's full width (2400+) and the
 * ladder would grind quality down to 30 trying to fit 350 KB. That is the exact
 * oversized body figure this whole change exists to remove, reintroduced by a
 * half-filled settings row.
 *
 * A preset in the row that is not an object at all is ignored rather than
 * merged — the column is JSONB and nothing validates what an admin writes into
 * it.
 */
export function mergePresets(
  overrides: Record<string, Partial<QualityPreset>>,
): Record<string, QualityPreset> {
  const merged: Record<string, QualityPreset> = { ...DEFAULT_PRESETS };
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) return merged;

  for (const [name, value] of Object.entries(overrides)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;

    const base = DEFAULT_PRESETS[name];
    const quality = typeof value.quality === 'number' ? value.quality : base?.quality;
    const maxWidth = typeof value.maxWidth === 'number' ? value.maxWidth : base?.maxWidth;

    // A preset the code does not know, supplied with only half its fields, has
    // no default to fall back on. Dropping it is the only safe reading: half a
    // preset generates a variant nobody specified.
    if (typeof quality !== 'number' || typeof maxWidth !== 'number') continue;

    merged[name] = { quality, maxWidth };
  }
  return merged;
}

/**
 * MERGES over `DEFAULT_PRESETS`; it does not replace them.
 *
 * This used to return the `admin_settings.image_quality_presets` row verbatim,
 * which made every preset in the code optional at runtime: a row written before
 * `mid` existed -- or one an admin edits down to a single entry -- would
 * silently remove `mid` from generation, and `article-renderer.tsx` asks for
 * `mid.webp` by name. Every body figure on the site would 404 with nothing in
 * the code to explain it.
 *
 * Read on production 04 September 2026: there is NO `image_quality_presets` row
 * at all (zero `image_%` keys in `admin_settings`), so the live site has always
 * been running `DEFAULT_PRESETS`. The merge is what stops a row appearing later
 * from deleting a rung the render path depends on; an admin can still retune
 * any preset's quality or width, which is what the row is for.
 */
export async function getDefaultPresets(): Promise<Record<string, QualityPreset>> {
  try {
    const row = await db
      .select()
      .from(adminSettings)
      .where(eq(adminSettings.key, 'image_quality_presets'))
      .limit(1);

    if (row.length > 0 && row[0].value) {
      return mergePresets(row[0].value as Record<string, Partial<QualityPreset>>);
    }
  } catch {
    // Table may not exist yet - return defaults
  }
  return DEFAULT_PRESETS;
}

export async function getDefaultQuality(): Promise<string> {
  try {
    const row = await db
      .select()
      .from(adminSettings)
      .where(eq(adminSettings.key, 'image_quality_default'))
      .limit(1);

    if (row.length > 0 && row[0].value) {
      return row[0].value as string;
    }
  } catch {
    // Table may not exist yet — return defaults
  }
  return DEFAULT_QUALITY;
}

export async function generateVariants(
  originalBuffer: Buffer,
  originalKey: string,
  presets: Record<string, QualityPreset>,
  options?: { bucket?: string; publicUrl?: string },
): Promise<ImageVariants> {
  const r2 = getR2Client();
  const bucket = options?.bucket ?? getR2Bucket();
  const publicUrl = options?.publicUrl ?? getR2PublicUrl();

  // For new-format keys (inspire/id/timestamp-name/original.ext), dirPrefix is the directory.
  // For old-format keys (inspire/slug/timestamp-name.ext), create a subdirectory from the filename.
  let dirPrefix: string;
  if (originalKey.includes('/original.')) {
    dirPrefix = originalKey.substring(0, originalKey.lastIndexOf('/') + 1);
  } else {
    // Strip extension from filename to create a directory
    const lastSlash = originalKey.lastIndexOf('/');
    const filename = originalKey.substring(lastSlash + 1).replace(/\.[^.]+$/, '');
    dirPrefix = originalKey.substring(0, lastSlash + 1) + filename + '/';
  }

  const variants: Partial<ImageVariants> = {};

  // Original
  variants.original = {
    url: `${publicUrl}/${originalKey}`,
    sizeBytes: originalBuffer.length,
  };

  // Generate each preset variant
  for (const [name, preset] of Object.entries(presets)) {
    // A preset with a declared ceiling steps down until it fits; one without is
    // encoded at its quality exactly as before. `PRESET_CEILINGS` is the whole
    // list of presets whose behaviour changed.
    const ceiling = PRESET_CEILINGS[name];
    const build = (quality: number) =>
      sharp(originalBuffer)
        .resize({ width: preset.maxWidth, withoutEnlargement: true })
        .webp({ quality });

    let variantBuffer: Buffer;
    if (ceiling) {
      const encoded = await encodeUnderCeiling(build, ladderFor(preset, ceiling));
      variantBuffer = encoded.buffer;
      if (encoded.overCeiling) {
        // Loud, not thrown -- the same contract `smart-crop.ts` uses. An
        // oversized variant must not fail an editor's upload; the backfill
        // turns this signal into a non-zero exit.
        console.warn(
          `[variant] ${dirPrefix}${name}.webp is ${encoded.bytes} B at q${encoded.quality} - over the ${ceiling.CEILING_BYTES} B ceiling`,
        );
      }
    } else {
      variantBuffer = await build(preset.quality).toBuffer();
    }

    const variantKey = `${dirPrefix}${name}.webp`;

    await r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: variantKey,
        Body: variantBuffer,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    variants[name as keyof ImageVariants] = {
      url: `${publicUrl}/${variantKey}`,
      sizeBytes: variantBuffer.length,
    };
  }

  return variants as ImageVariants;
}
