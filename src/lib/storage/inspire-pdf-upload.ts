export interface InspirePdfUploadResult {
  /** Public URL of the uploaded PDF (article's R2 folder). */
  url: string;
  /** R2 object key. */
  key: string;
  /** Byte size at upload time (before async compression). */
  fileSize: number;
  /** Media library record id, if one was created. */
  mediaId?: string;
}

export type InspirePdfUploadOptions = {
  slug?: string;
  articleId?: string;
};

/**
 * Upload a PDF to the article's R2 folder, record it in the media library, and
 * fire off server-side compression (best-effort, non-blocking). Unlike the image
 * uploader this skips variant/smart-crop generation — PDFs have neither.
 */
export async function uploadInspirePdf(
  options: InspirePdfUploadOptions,
  file: File,
  onProgress?: (progress: number) => void,
): Promise<InspirePdfUploadResult> {
  // 1. Get a presigned PUT URL + the eventual public URL / key.
  const response = await fetch('/api/v1/inspire/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size,
      ...(options.slug ? { slug: options.slug } : {}),
      ...(options.articleId ? { articleId: options.articleId } : {}),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message ?? 'Failed to get upload URL');
  }

  const { data } = await response.json();
  const { uploadUrl, publicUrl, key } = data as {
    uploadUrl: string;
    publicUrl: string;
    key: string;
  };

  // 2. Upload the file to R2.
  await uploadToR2(uploadUrl, file, onProgress);

  const result: InspirePdfUploadResult = { url: publicUrl, key, fileSize: file.size };

  // 3. Record it in the media library (best-effort — failure never blocks insert).
  try {
    const { createMediaRecordAction } = await import('@/app/(admin)/admin/inspire/media/actions');
    const source = options.articleId || options.slug ? 'article_upload' : 'library_upload';
    const mediaResult = await createMediaRecordAction({
      filename: file.name,
      r2Key: key,
      url: publicUrl,
      originalUrl: publicUrl,
      mimeType: file.type,
      fileSize: file.size,
      source,
      originalArticleId: options.articleId ?? null,
    });
    if (mediaResult.data) result.mediaId = mediaResult.data.id;
  } catch (err) {
    console.warn('Failed to create media record for PDF:', err);
  }

  // 4. Fire-and-forget server-side compression (overwrites the key in place).
  void fetch('/api/v1/inspire/compress-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  }).catch(() => {
    // Compression is best-effort; the original remains served.
  });

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
