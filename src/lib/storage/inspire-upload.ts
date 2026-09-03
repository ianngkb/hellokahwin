import type { UploadStage } from './upload';
import type { ImageVariants } from './image-variants';
import type { SmartCrops, FocalPoint } from './smart-crop';

export interface InspireUploadResult {
  url: string;
  originalUrl: string;
  path: string;
  variants: ImageVariants;
  defaultQuality: string;
  smartCrops: SmartCrops | null;
  focalPoint: FocalPoint | null;
  detectionData: object | null;
  mediaId?: string;
  /**
   * True when the R2 object exists but its `media` row could not be written.
   *
   * The insert is deliberately non-fatal — the image IS uploaded, and taking the
   * whole upload down over its bookkeeping would be worse — but it used to be
   * invisible: a `console.warn` on a machine nobody is watching, and a green
   * tick in the dialog. The caller is now told, so it can say so.
   *
   * NOT the whole fix. The orphaned R2 object is still left behind; reaping it
   * needs a delete path and a retry story, which is a larger change than this
   * batch. Named in the run's result file.
   */
  mediaRecordFailed?: boolean;
}

export type InspireUploadOptions = {
  slug?: string;
  articleId?: string;
  /** Skip smart crops (Rekognition + 4 crop variants). Omit or set `true` to skip; set `false` to generate. */
  skipSmartCrops?: boolean;
} & (
  | {
      /** No media row is written, so there is nothing to hang an alt on. */
      skipMediaRecord: true;
      alt?: never;
    }
  | {
      skipMediaRecord?: false;
      /**
       * REQUIRED, not optional, and that is the point.
       *
       * This call writes a `media` row, and the alt on that row is what every
       * later insert of the image into an article inherits. When the parameter
       * was optional, four of the five call sites simply did not mention it and
       * the omission was invisible — which is how 172 images reached production
       * with no alt text. Making it required does not conjure a description out
       * of nothing; it forces each call site to SAY which case it is in, so an
       * empty string is a decision somebody can grep for and argue with rather
       * than a field nobody remembered.
       *
       * `BulkUploadDialog` — the surface that has somewhere to type one — will
       * not start an upload until every queued image has a non-blank alt. The
       * drag, paste, figure-block and cover paths have no alt input to offer
       * yet, so they pass `''` and warn; building that input is a feature, not
       * part of this batch.
       */
      alt: string;
    }
);

/**
 * Upload an image to R2 with variant generation and smart crops.
 * Accepts either options object (new) or a plain articleId string (legacy compat).
 */
export async function uploadInspireImage(
  optionsOrArticleId: InspireUploadOptions | string,
  file: File,
  onProgress?: (stage: UploadStage, progress: number) => void,
): Promise<InspireUploadResult> {
  // Normalize options: support both legacy string param and new object param
  const options: InspireUploadOptions =
    typeof optionsOrArticleId === 'string'
      ? { articleId: optionsOrArticleId, alt: '' }
      : optionsOrArticleId;

  // Build request body for the upload API
  const uploadBody: Record<string, unknown> = {
    fileName: file.name,
    contentType: file.type,
    fileSize: file.size,
  };

  if (options.slug) {
    uploadBody.slug = options.slug;
  }
  if (options.articleId) {
    uploadBody.articleId = options.articleId;
  }

  // Get presigned URL
  const response = await fetch('/api/v1/inspire/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(uploadBody),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message ?? 'Failed to get upload URL');
  }

  const { data } = await response.json();
  const { uploadUrl, publicUrl, key } = data as {
    uploadUrl: string;
    publicUrl: string;
    key: string;
  };

  // Upload original to R2 via presigned URL with progress tracking
  onProgress?.('uploading', 0);
  await uploadToR2(uploadUrl, file, (p) => onProgress?.('uploading', p));

  // Generate quality variants server-side
  onProgress?.('generating', 0);
  const variantResponse = await fetch('/api/v1/inspire/generate-variants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ originalKey: key }),
  });

  if (!variantResponse.ok) {
    const error = await variantResponse.json();
    throw new Error(error.error?.message ?? 'Failed to generate variants');
  }

  const { data: variantData } = await variantResponse.json();
  const { variants, defaultQuality } = variantData as {
    variants: ImageVariants;
    defaultQuality: string;
  };

  // Generate smart crops server-side (only when skipSmartCrops is explicitly false)
  let smartCrops: SmartCrops | null = null;
  let focalPoint: FocalPoint | null = null;
  let detectionData: object | null = null;

  const shouldGenerateSmartCrops = options.skipSmartCrops === false;

  if (shouldGenerateSmartCrops) {
    onProgress?.('smart-cropping', 0);
    try {
      const smartCropResponse = await fetch('/api/v1/inspire/generate-smart-crops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalKey: key }),
      });

      if (smartCropResponse.ok) {
        const { data: smartCropData } = await smartCropResponse.json();
        smartCrops = smartCropData.smartCrops ?? null;
        focalPoint = smartCropData.focalPoint ?? null;
        detectionData = smartCropData.detectionData ?? null;
      }
    } catch {
      // Smart crop failure is non-blocking — the upload still succeeds
      console.warn('Smart crop generation failed, continuing without');
    }
  }

  onProgress?.('done', 100);

  const result: InspireUploadResult = {
    url: variants[defaultQuality as keyof ImageVariants]?.url ?? variants.high.url,
    originalUrl: publicUrl,
    path: key,
    variants,
    defaultQuality,
    smartCrops,
    focalPoint,
    detectionData,
  };

  // Create media record in the database (unless skipped, e.g. for cover images)
  if (!options.skipMediaRecord) {
    try {
      const { createMediaRecordAction } = await import('@/app/(admin)/admin/inspire/media/actions');

      const source = options.articleId || options.slug ? 'article_upload' : 'library_upload';
      const mediaResult = await createMediaRecordAction({
        filename: file.name,
        alt: options.alt ?? null,
        r2Key: key,
        url: result.url,
        originalUrl: publicUrl,
        mimeType: file.type,
        fileSize: file.size,
        variants,
        defaultQuality,
        smartCrops,
        focalPoint,
        detectionData,
        source,
        originalArticleId: options.articleId ?? null,
      });

      if (mediaResult.data) {
        result.mediaId = mediaResult.data.id;
      } else {
        // The action returns `{ error }` rather than throwing on an auth or
        // insert failure, so this branch is the common one and used to be
        // silently indistinguishable from success.
        result.mediaRecordFailed = true;
        console.warn('Failed to create media record:', mediaResult.error);
      }
    } catch (err) {
      // Media record creation failure is non-blocking — but no longer silent.
      result.mediaRecordFailed = true;
      console.warn('Failed to create media record:', err);
    }
  }

  return result;
}

function uploadToR2(
  url: string,
  file: File,
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
