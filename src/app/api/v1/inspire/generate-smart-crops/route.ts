import { type NextRequest } from 'next/server';
import { requireRole } from '@/lib/api/middleware';
import { apiSuccess, apiError } from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';
import { extractKeyFromUrl } from '@/lib/r2/client';
import { processSmartCrops } from '@/lib/storage/smart-crop';

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['admin']);

    const body = await request.json();
    let { originalKey, focalPointOverride } = body as {
      originalKey: string;
      focalPointOverride?: { x: number; y: number };
    };

    // Accept a full R2 URL — extract the key from it. Shared with every other
    // caller so legacy hosts and the `?v=` cache-bust token are handled the
    // same way here as they are on the revert/delete path.
    if (originalKey) originalKey = extractKeyFromUrl(originalKey);

    if (!originalKey || !originalKey.startsWith('inspire/') || originalKey.includes('..')) {
      return apiError('Invalid originalKey — must be an inspire/ R2 key or URL', 400);
    }

    // The override is client-supplied and now ends up in the persisted crop URL
    // as the `?v=` cache-bust token, so a non-finite or out-of-range value would
    // be stored as an un-bustable `?v=NaN_NaN` rather than failing loudly.
    if (focalPointOverride !== undefined && focalPointOverride !== null) {
      const { x, y } = focalPointOverride;
      const inRange = (n: unknown) =>
        typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;
      if (!inRange(x) || !inRange(y)) {
        return apiError('Invalid focalPointOverride — x and y must be finite numbers in 0..1', 400);
      }
    }

    const result = await processSmartCrops(originalKey, {
      focalPointOverride: focalPointOverride ?? undefined,
    });

    return apiSuccess(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.statusCode);
    }
    console.error('POST /api/v1/inspire/generate-smart-crops error:', error);
    return apiError('Internal server error', 500);
  }
}
