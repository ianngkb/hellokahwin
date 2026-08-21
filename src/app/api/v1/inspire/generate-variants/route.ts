import { type NextRequest } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client, getR2Bucket, getR2PublicUrl } from '@/lib/r2/client';
import { requireRole } from '@/lib/api/middleware';
import { apiSuccess, apiError } from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';
import {
  generateVariants,
  getDefaultPresets,
  getDefaultQuality,
} from '@/lib/storage/image-variants';

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['admin']);

    const body = await request.json();
    let { originalKey, variantKeys } = body as {
      originalKey: string;
      variantKeys?: string[];
    };

    // Accept a full R2 URL — extract the key from it
    const r2PublicUrl = getR2PublicUrl();
    if (originalKey?.startsWith(r2PublicUrl)) {
      originalKey = originalKey.slice(r2PublicUrl.length + 1); // strip URL prefix + slash
    }

    if (!originalKey || !originalKey.startsWith('inspire/')) {
      return apiError('Invalid originalKey — must be an inspire/ R2 key or URL', 400);
    }

    // Download original from R2
    const response = await getR2Client().send(
      new GetObjectCommand({
        Bucket: getR2Bucket(),
        Key: originalKey,
      }),
    );

    if (!response.Body) {
      return apiError('Original image not found', 404);
    }

    const originalBuffer = Buffer.from(await response.Body.transformToByteArray());

    let presets = await getDefaultPresets();

    // Filter presets when specific variant keys are requested
    if (variantKeys && Array.isArray(variantKeys) && variantKeys.length > 0) {
      const filtered: Record<string, (typeof presets)[string]> = {};
      for (const key of variantKeys) {
        if (typeof key === 'string' && key in presets) {
          filtered[key] = presets[key];
        }
      }
      presets = filtered;
    }

    const variants = await generateVariants(originalBuffer, originalKey, presets);
    const defaultQuality = await getDefaultQuality();

    return apiSuccess({ variants, defaultQuality });
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.statusCode);
    }
    console.error('POST /api/v1/inspire/generate-variants error:', error);
    return apiError('Internal server error', 500);
  }
}
