import sharp from 'sharp';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client, getR2Bucket, getR2PublicUrl } from '@/lib/r2/client';
import { db } from '@/lib/db/drizzle';
import { adminSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export type ImageVariantMeta = { url: string; sizeBytes: number };

export type ImageVariants = Record<'low' | 'high' | 'original', ImageVariantMeta> & {
  /** @deprecated No longer generated, but may exist on older records */
  medium?: ImageVariantMeta;
};

export type QualityPreset = { quality: number; maxWidth: number };

const DEFAULT_PRESETS: Record<string, QualityPreset> = {
  low: { quality: 30, maxWidth: 1200 },
  high: { quality: 80, maxWidth: 2400 },
};

const DEFAULT_QUALITY = 'high';

export async function getDefaultPresets(): Promise<Record<string, QualityPreset>> {
  try {
    const row = await db
      .select()
      .from(adminSettings)
      .where(eq(adminSettings.key, 'image_quality_presets'))
      .limit(1);

    if (row.length > 0 && row[0].value) {
      return row[0].value as Record<string, QualityPreset>;
    }
  } catch {
    // Table may not exist yet — return defaults
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
    const variantBuffer = await sharp(originalBuffer)
      .resize({ width: preset.maxWidth, withoutEnlargement: true })
      .webp({ quality: preset.quality })
      .toBuffer();

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
