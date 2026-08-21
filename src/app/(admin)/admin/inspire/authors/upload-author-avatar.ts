const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Upload an author headshot to R2 and return its public URL.
 *
 * Mirrors the banner-image upload: presign via `POST /api/v1/storage/upload-url`
 * (the `avatars` category, which maps to the public assets bucket) then a direct
 * PUT to the signed URL. ONE size, no variants and no smart crops — this is a
 * small circular headshot rendered at ~64px in the author box and ~96px on the
 * archive header, so the article-cover pipeline's variant/face-detection work
 * would cost several seconds and a Rekognition call to produce nothing anyone
 * can see.
 *
 * Invokes `onProgress` with 0-100 during the PUT. Throws `Error` with a
 * user-facing message on validation or upload failure.
 */
export async function uploadAuthorAvatar(
  profileId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Only JPG, PNG, and WEBP images are allowed');
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('Photo must be under 5MB');
  }

  onProgress?.(0);

  const ext = file.name.split('.').pop() ?? 'jpg';
  // `avatars/{profileId}/…` is the convention the presign route validates
  // ownership against for non-admins. Admins bypass that check, but keeping the
  // shape means a headshot is findable by the same rule as every other avatar.
  // The timestamp segment busts any CDN cache on re-upload.
  const path = `avatars/${profileId}/author-${Date.now()}.${ext}`;

  const presignRes = await fetch('/api/v1/storage/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bucket: 'avatars',
      path,
      contentType: file.type,
      fileSize: file.size,
    }),
  });

  if (!presignRes.ok) throw new Error('Failed to get upload URL');

  const { data } = await presignRes.json();

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', data.uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);

    xhr.upload.addEventListener('progress', (ev) => {
      if (ev.lengthComputable) {
        onProgress?.(Math.round((ev.loaded / ev.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed with status ${xhr.status}`));
    });

    xhr.addEventListener('error', () => reject(new Error('Upload failed')));
    xhr.send(file);
  });

  onProgress?.(100);

  return data.publicUrl as string;
}
