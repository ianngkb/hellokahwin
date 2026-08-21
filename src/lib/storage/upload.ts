import imageCompression from 'browser-image-compression';
import type { ImageVariants } from './image-variants';

export type { ImageVariants } from './image-variants';

export interface UploadResult {
  url: string;
  path: string;
  variants?: ImageVariants;
}

export type UploadStage =
  | 'compressing'
  | 'uploading'
  | 'generating'
  | 'smart-cropping'
  | 'done'
  | 'error';

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 2400,
  useWebWorker: true,
  fileType: 'image/webp' as const,
};

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

export async function compressImage(file: File): Promise<File> {
  if (file.size < 500 * 1024) return file;
  return withTimeout(
    imageCompression(file, COMPRESSION_OPTIONS),
    30_000,
    'Image compression timed out. Please try a smaller image.',
  );
}

async function getPresignedUploadUrl(
  bucket: string,
  path: string,
  contentType: string,
  fileSize: number,
): Promise<{ uploadUrl: string; publicUrl: string | null; key: string }> {
  const response = await fetch('/api/v1/storage/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucket, path, contentType, fileSize }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message ?? 'Failed to get upload URL');
  }

  const { data } = await response.json();
  return data;
}

function uploadToR2(
  url: string,
  file: File | Blob,
  onProgress?: (progress: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload failed')));
    xhr.send(file);
  });
}

async function requestVariantGeneration(
  originalKey: string,
): Promise<{ variants: ImageVariants; defaultQuality: string }> {
  const response = await fetch('/api/v1/storage/generate-variants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ originalKey }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message ?? 'Failed to generate variants');
  }

  const { data } = await response.json();
  return data;
}

export async function uploadListingImage(
  listingId: string,
  slug: string,
  file: File,
  onProgress?: (stage: UploadStage, progress: number) => void,
): Promise<UploadResult> {
  // Stage 1: Compress
  onProgress?.('compressing', 0);
  const compressed = await compressImage(file);
  onProgress?.('compressing', 100);

  const ext = compressed.type === 'image/webp' ? 'webp' : (file.name.split('.').pop() ?? 'jpg');
  const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^.]+$/, '');
  const path = `listings/${slug}/${Date.now()}-${sanitized}/original.${ext}`;

  // Stage 2: Upload to R2 via presigned URL
  onProgress?.('uploading', 0);
  const { uploadUrl, publicUrl, key } = await getPresignedUploadUrl(
    'listings',
    path,
    compressed.type,
    compressed.size,
  );

  await uploadToR2(uploadUrl, compressed, (p) => onProgress?.('uploading', p));

  // Stage 3: Generate variants
  onProgress?.('generating', 0);
  const { variants } = await requestVariantGeneration(key);
  onProgress?.('generating', 100);

  onProgress?.('done', 100);

  return { url: publicUrl ?? '', path: key, variants };
}

const MAX_BROCHURE_SIZE = 100 * 1024 * 1024; // 100MB

export async function uploadBrochure(
  listingId: string,
  file: File,
  onProgress?: (stage: UploadStage, progress: number) => void,
): Promise<UploadResult> {
  if (file.size > MAX_BROCHURE_SIZE) {
    throw new Error('Brochure must be under 100MB');
  }

  const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^.]+$/, '');
  const path = `documents/${listingId}/brochure-${Date.now()}-${sanitized}.pdf`;

  onProgress?.('uploading', 0);
  const { uploadUrl, key } = await getPresignedUploadUrl(
    'documents',
    path,
    'application/pdf',
    file.size,
  );

  await uploadToR2(uploadUrl, file, (p) => onProgress?.('uploading', p));

  // Best-effort server-side compression: gs downsamples embedded images and
  // overwrites the SAME key in place. Fire-and-forget with keepalive so it
  // survives the subsequent form submit/navigation; any failure is non-fatal —
  // the original PDF is already stored at `key` and remains usable, and the
  // backfill script is the safety net. (No 'compressing' progress stage: the
  // call isn't awaited, so it would resolve to 'done' instantly and mislead.)
  void fetch('/api/v1/storage/compress-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
    keepalive: true,
  }).catch(() => {});

  onProgress?.('done', 100);

  // Documents use presigned download URLs, not public URLs
  return { url: key, path: key };
}

export function isR2StorageUrl(url: string): boolean {
  const assetsUrl = process.env.NEXT_PUBLIC_R2_ASSETS_PUBLIC_URL?.replace(/\/+$/, '');
  if (!assetsUrl) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        'NEXT_PUBLIC_R2_ASSETS_PUBLIC_URL is not set — isR2StorageUrl will always return false',
      );
    }
    return false;
  }
  return url.startsWith(assetsUrl + '/');
}

export function extractStoragePath(url: string): string | null {
  const assetsUrl = process.env.NEXT_PUBLIC_R2_ASSETS_PUBLIC_URL?.replace(/\/+$/, '');
  if (assetsUrl && url.startsWith(assetsUrl + '/')) {
    return url.slice(assetsUrl.length + 1);
  }
  return null;
}

export async function deleteListingImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return;

  const response = await fetch('/api/v1/storage/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucket: 'listings', paths }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message ?? 'Failed to delete images');
  }
}
