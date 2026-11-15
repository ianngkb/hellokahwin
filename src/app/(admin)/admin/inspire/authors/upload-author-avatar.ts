const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Longest edge of the stored headshot: 3× the largest display size (~96px on
 * the archive header). Ported from The Wedding Notebook, where an unresized
 * 1254×1254 PNG — 2 MB, loaded on every article by that author — was flagged
 * by Ahrefs as "image file size too large" (2026-10-30).
 */
export const AVATAR_MAX_EDGE = 288;

/**
 * Downscale and re-encode to WebP in the browser before upload. Returns the
 * original file untouched when the browser cannot decode or encode it, so an
 * unusual format still uploads rather than failing.
 */
export async function shrinkAvatar(file: File): Promise<File> {
  try {
    // Apply the EXIF orientation while decoding, or a portrait phone photo is
    // drawn — and stored — on its side.
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, AVATAR_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    // No 2D context means nothing gets drawn, and the canvas would encode a
    // blank transparent square. Upload the original instead.
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.85),
    );
    // Safari before 14 silently returns PNG for an unsupported type.
    if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
  } catch {
    return file;
  }
}

/**
 * Upload an author headshot to R2 and return its public URL.
 *
 * Shrinks to 288px WebP in the browser, presigns via `POST /api/v1/inspire/upload`
 * (admin-only), then a direct PUT to the signed URL. ONE size, no variants and
 * no smart crops — this is a
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

  // Validation above runs on what the admin picked; what goes up is the
  // shrunk copy (or the original, if the browser could not shrink it).
  const upload = await shrinkAvatar(file);
  const ext = upload.name.split('.').pop() ?? 'jpg';

  // HelloKahwin's admin presign route. (The Wedding Notebook presigns through
  // `/api/v1/storage/upload-url`, which does not exist here — the old call to it
  // could never succeed.) With no slug or article id the route files the object
  // under `inspire/general/{timestamp}-{name}/original.{ext}`: the timestamp
  // busts any CDN cache on re-upload, and the profile id in the name keeps a
  // headshot findable. The route only presigns — no `media` row is written, so
  // the photo does not appear in the media library.
  const presignRes = await fetch('/api/v1/inspire/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: `author-${profileId}.${ext}`,
      contentType: upload.type,
      fileSize: upload.size,
    }),
  });

  if (!presignRes.ok) {
    const body = await presignRes.json().catch(() => null);
    throw new Error(body?.error?.message ?? 'Failed to get upload URL');
  }

  const { data } = await presignRes.json();

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', data.uploadUrl);
    xhr.setRequestHeader('Content-Type', upload.type);

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
    xhr.send(upload);
  });

  onProgress?.(100);

  return data.publicUrl as string;
}
