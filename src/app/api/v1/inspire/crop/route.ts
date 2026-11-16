import { type NextRequest } from 'next/server';
import { GetObjectCommand, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { requireRole } from '@/lib/api/middleware';
import { apiSuccess, apiError } from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';
import {
  getImageMetadata,
  getMediaTools,
  loadSharp,
  mediaTransform,
  MediaToolsError,
  readObjectBody,
} from '@/lib/media/media-client';
import { getR2Client, getR2Bucket, getR2PublicUrl, extractKeyFromUrl } from '@/lib/r2/client';

const MAX_PIXEL_COUNT = 50_000_000; // 50 megapixels

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['admin']);

    const body = await request.json();
    let { sourceR2Key } = body as { sourceR2Key: string };
    const { croppedAreaPixels, rotation, zoom } = body as {
      sourceR2Key: string;
      croppedAreaPixels: { x: number; y: number; width: number; height: number };
      rotation: number;
      zoom: number;
    };

    // Accept a full R2 URL — extract the key using the shared utility
    const rawKey = sourceR2Key;
    if (sourceR2Key) {
      sourceR2Key = extractKeyFromUrl(sourceR2Key);
    }
    console.log('[crop] raw sourceR2Key:', rawKey?.slice(0, 120));
    console.log('[crop] extracted key:', sourceR2Key);
    console.log('[crop] R2_PUBLIC_URL:', getR2PublicUrl());
    console.log('[crop] bucket:', getR2Bucket());

    // Validate key
    if (!sourceR2Key || !sourceR2Key.startsWith('inspire/') || sourceR2Key.includes('..')) {
      return apiError(
        `Invalid sourceR2Key — must be an inspire/ R2 key or URL (got: ${sourceR2Key?.slice(0, 80)})`,
        400,
      );
    }

    // F1: Validate rotation and zoom types
    if (typeof rotation !== 'number' || !Number.isFinite(rotation)) {
      return apiError('Invalid rotation — must be a finite number', 400);
    }
    if (typeof zoom !== 'number' || !Number.isFinite(zoom) || zoom <= 0) {
      return apiError('Invalid zoom — must be a positive finite number', 400);
    }

    if (
      !croppedAreaPixels ||
      typeof croppedAreaPixels.x !== 'number' ||
      typeof croppedAreaPixels.y !== 'number' ||
      typeof croppedAreaPixels.width !== 'number' ||
      typeof croppedAreaPixels.height !== 'number' ||
      croppedAreaPixels.width <= 0 ||
      croppedAreaPixels.height <= 0
    ) {
      return apiError('Invalid croppedAreaPixels', 400);
    }

    const r2 = getR2Client();
    const bucket = getR2Bucket();
    const publicUrl = getR2PublicUrl().replace(/\/+$/, '');

    // 1. Download source image from R2
    let sourceBuffer: Buffer;
    try {
      const getResponse = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: sourceR2Key }));
      if (!getResponse.Body) {
        return apiError('Source image not found in R2', 404);
      }
      // Vercel: the old full read. Worker: capped at media-tools' 40 MB.
      sourceBuffer = await readObjectBody(getResponse.Body, getResponse.ContentLength);
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'Code' in err &&
        (err as { Code: string }).Code === 'NoSuchKey'
      ) {
        return apiError(`Source image not found in R2: ${sourceR2Key}`, 404);
      }
      throw err;
    }

    // F3: Check source image dimensions before processing to prevent memory bombs
    // STORED dimensions (sharp's `metadata()`); the pipeline below never applies
    // EXIF orientation, on either engine.
    const sourceMeta = await getImageMetadata(sourceBuffer);
    const srcW = sourceMeta.storedWidth;
    const srcH = sourceMeta.storedHeight;
    if (srcW * srcH > MAX_PIXEL_COUNT) {
      return apiError(
        `Source image too large (${srcW}x${srcH} = ${((srcW * srcH) / 1_000_000).toFixed(1)}MP). Max ${MAX_PIXEL_COUNT / 1_000_000}MP.`,
        400,
      );
    }

    // F6: Validate extract area bounds against (potentially rotated) image dimensions.
    // After rotation Sharp auto-expands canvas — compute rotated dimensions.
    let imgW = srcW;
    let imgH = srcH;
    if (rotation !== 0) {
      const rad = Math.abs((rotation * Math.PI) / 180);
      imgW = Math.round(srcW * Math.abs(Math.cos(rad)) + srcH * Math.abs(Math.sin(rad)));
      imgH = Math.round(srcW * Math.abs(Math.sin(rad)) + srcH * Math.abs(Math.cos(rad)));
    }

    const cropX = Math.round(croppedAreaPixels.x);
    const cropY = Math.round(croppedAreaPixels.y);
    const cropW = Math.round(croppedAreaPixels.width);
    const cropH = Math.round(croppedAreaPixels.height);

    if (cropX + cropW > imgW || cropY + cropH > imgH || cropX < 0 || cropY < 0) {
      return apiError(
        `Crop area (${cropX},${cropY} ${cropW}x${cropH}) is outside image bounds (${imgW}x${imgH})`,
        400,
      );
    }

    // 2. rotate -> extract -> WebP q80. On a Worker through media-tools
    //    (`angle` with a transparent fill, then `extract`, stored orientation);
    //    everywhere else with sharp, exactly as before.
    let outputBuffer: Buffer;
    let outputMetadata: { width?: number; height?: number };
    if (getMediaTools()) {
      const out = await mediaTransform(sourceBuffer, {
        orient: false,
        angle: rotation !== 0 ? rotation : undefined,
        extract: `${cropX},${cropY},${cropW},${cropH}`,
        format: 'webp',
        q: 80,
      });
      if (!out) throw new Error('media-tools binding disappeared mid-request');
      outputBuffer = out.data;
      outputMetadata = { width: out.width, height: out.height };
    } else {
      const sharp = await loadSharp();
      let pipeline = sharp(sourceBuffer);
      if (rotation !== 0) {
        pipeline = pipeline.rotate(rotation, {
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        });
      }
      pipeline = pipeline.extract({
        left: cropX,
        top: cropY,
        width: cropW,
        height: cropH,
      });
      outputBuffer = await pipeline.webp({ quality: 80 }).toBuffer();
      outputMetadata = await sharp(outputBuffer).metadata();
    }

    // 3. Determine edit number by listing existing crop files in the R2 directory
    // F5: Paginate ListObjectsV2 for correctness
    const dirPrefix = sourceR2Key.substring(0, sourceR2Key.lastIndexOf('/') + 1);
    let editCount = 0;
    let continuationToken: string | undefined;
    do {
      const listResponse = await r2.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: dirPrefix,
          ContinuationToken: continuationToken,
        }),
      );
      if (listResponse.Contents) {
        for (const obj of listResponse.Contents) {
          if (obj.Key && /-crop\d+/.test(obj.Key)) {
            editCount++;
          }
        }
      }
      continuationToken = listResponse.IsTruncated ? listResponse.NextContinuationToken : undefined;
    } while (continuationToken);

    // F2: Use timestamp suffix alongside edit number to avoid race condition overwrites
    const editNumber = editCount + 1;
    const ts = Date.now().toString(36);

    // 4. Build filename
    // Extract base name from directory name (the {timestamp}-{sanitizedName} part)
    const dirParts = dirPrefix.replace(/\/$/, '').split('/');
    const baseName = dirParts[dirParts.length - 1];

    // F4: Use actual values in filename suffixes instead of edit number
    let filename = `${baseName}-crop${editNumber}-${ts}`;
    if (zoom !== 1) {
      filename += `-s${zoom.toFixed(1)}`;
    }
    if (rotation !== 0) {
      filename += `-r${rotation}`;
    }
    filename += '.webp';

    // 5. Upload to R2
    const r2Key = `${dirPrefix}${filename}`;
    await r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: r2Key,
        Body: outputBuffer,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    const url = `${publicUrl}/${r2Key}`;

    return apiSuccess({
      url,
      r2Key,
      filename,
      width: outputMetadata.width ?? cropW,
      height: outputMetadata.height ?? cropH,
      fileSize: outputBuffer.length,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.statusCode);
    }
    // media-tools refused the file (4xx) or is unavailable (503, retryable).
    if (error instanceof MediaToolsError) {
      return apiError(error.message, error.status);
    }
    console.error('POST /api/v1/inspire/crop error:', error);
    return apiError('Internal server error', 500);
  }
}
