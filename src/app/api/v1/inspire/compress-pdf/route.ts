import { type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client, getR2Bucket } from '@/lib/r2/client';
import { requireRole } from '@/lib/api/middleware';
import { apiSuccess, apiError } from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';
import { compressPdf } from '@/lib/storage/pdf-compress';
import { db } from '@/lib/db/drizzle';
import { media } from '@/lib/db/schema/media';

// gs-wasm needs Node APIs; never run on the edge runtime.
export const runtime = 'nodejs';

// Same reasoning as the storage/compress-pdf sibling: without an in-file
// declaration this route inherits vercel.json's broad `src/app/**/route.ts: 30`
// (and it has no specific entry there at all). Article PDFs are capped at 25MB
// — smaller than brochures — so 60s is ample, but 30s is not guaranteed to be.
export const maxDuration = 60;

const MAX_COMPRESS_SOURCE_SIZE = 50 * 1024 * 1024; // headroom over the 25MB upload cap

/**
 * Best-effort server-side compression for article PDF attachments. Downloads the
 * PDF from the PUBLIC inspire bucket, runs balanced Ghostscript compression, and
 * overwrites the SAME key in place — article PDFs are direct-linked by their
 * public URL, so keeping a stable key matters more than preserving the original.
 * `compressPdf` only ever shrinks (returns the original if it can't), so an
 * in-place write is always ≤ the original. Called fire-and-forget after upload.
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['admin']);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError('Request body must be valid JSON', 400);
    }

    const key = (body as { key?: unknown })?.key;
    if (typeof key !== 'string' || !key.startsWith('inspire/') || !/\.pdf$/i.test(key)) {
      return apiError('A valid inspire PDF key is required', 400);
    }

    const bucket = getR2Bucket();
    const obj = await getR2Client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!obj.Body) return apiError('PDF not found', 404);
    if (obj.ContentLength && obj.ContentLength > MAX_COMPRESS_SOURCE_SIZE) {
      return apiError('PDF too large to compress', 413);
    }

    const input = Buffer.from(await obj.Body.transformToByteArray());
    if (input.length > MAX_COMPRESS_SOURCE_SIZE) {
      return apiError('PDF too large to compress', 413);
    }

    const { output, compressed } = await compressPdf(input);

    if (compressed) {
      await getR2Client().send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: output,
          ContentType: 'application/pdf',
        }),
      );

      // Keep the media library's reported size in sync (best-effort).
      try {
        await db
          .update(media)
          .set({ fileSize: output.length, updatedAt: new Date() })
          .where(eq(media.r2Key, key));
      } catch (err) {
        console.warn('Failed to update media fileSize after PDF compression:', err);
      }
    }

    return apiSuccess({
      compressed,
      key,
      bytesBefore: input.length,
      bytesAfter: output.length,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.statusCode);
    }
    if ((error as { name?: string })?.name === 'NoSuchKey') {
      return apiError('PDF not found', 404);
    }
    console.error('POST /api/v1/inspire/compress-pdf error:', error);
    return apiError('Internal server error', 500);
  }
}
