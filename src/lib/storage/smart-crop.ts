import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import {
  getR2Client,
  getR2Bucket,
  getR2PublicUrl,
  getR2AssetsBucket,
  getR2AssetsPublicUrl,
  extractKeyFromUrl,
} from '@/lib/r2/client';
import { detectFaces, detectLabels } from '@/lib/rekognition/detect';
import type { FaceBoundingBox, LabelInstance } from '@/lib/rekognition/detect';

// ── Types ──────────────────────────────────────────────────────────────

export interface SmartCropTarget {
  name: string;
  aspectRatio: number;
  outputWidth: number;
  outputHeight: number;
}

export type SmartCrops = Record<string, { url: string; width: number; height: number }>;

export interface FocalPoint {
  x: number;
  y: number;
  method: 'faces' | 'labels' | 'saliency';
}

export interface SafeZone {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface CropWindow {
  left: number;
  top: number;
  width: number;
  height: number;
}

// ── Constants ──────────────────────────────────────────────────────────

/**
 * Crop targets are **ceilings, never floors**: `generateSmartCrops` resizes with
 * `fit:'inside', withoutEnlargement:true`, so a crop window smaller than the
 * target yields a smaller — but honest — file rather than an upscaled one.
 *
 * ⚠️ `name` is load-bearing in two places at once: it is the R2 object key
 * (`<dir>/<name>.webp`) AND the key inside the `coverImageSmartCrops` JSONB.
 * Renaming any of these orphans every existing crop in R2 and breaks all render
 * call sites. Change dimensions freely; never change a name.
 */
export const CROP_TARGETS: SmartCropTarget[] = [
  { name: 'crop-4x5-mobile-cover', aspectRatio: 4 / 5, outputWidth: 1920, outputHeight: 2400 },
  // NOTE: this target is **3.52:1**, not the 4.3:1 its name suggests.
  //
  // ⚠️ CORRECTED, UI-03 (31 Ogos 2026). This comment used to describe the hero
  // as sitting at Tailwind `container` width, with three `max-width` plateaus
  // of 976 / 1232 / 1488 px. That layout no longer exists: DES-08 shipped the
  // homepage lead plate **full-bleed at `w-full`**, so the box is the whole
  // viewport — 1920px at a 1920px viewport, not 1488px — and it slides
  // continuously rather than stepping. The next person to retarget this crop
  // would otherwise have sized it against a number the site does not have.
  //
  // The box today (`src/app/(public)/page.tsx`, and every future full-bleed
  // hero, per `docs/design/hero-image-rules.md`):
  //   viewport <1024 → 100vw at 40/21 = 1.905  ← served by crop-16x9-og
  //   viewport ≥1024 → 100vw at 88/25 = 3.520  ← served by THIS target
  // The `88/25` box is this target's own aspect ratio, exactly: the box was
  // derived from the asset rather than chosen first, so aspect deviation is
  // 0.0% and not merely inside tolerance.
  //
  // 2464px still clears a 1920px full-bleed plate without upscaling (0.78×), so
  // the geometry survived the layout change intact — only the prose was stale.
  // It remains a true 2.00× at 1232 CSS px and 1.28× at 1920. 2464 also stays
  // under the 2560px cap that the WordPress ingest path imposes on ~99% of
  // source images.
  //
  // ⚠️ Do NOT retune these numbers to "match" a layout. `GEOMETRY_VERSION` below
  // is derived from this array, so any edit to a dimension re-queues EVERY live
  // cover through Rekognition + R2 — an AWS-cost decision that belongs to the
  // owner. A spec is corrected deliberately, never narrowed after the fact to
  // fit what got built.
  //
  // The `crop-4.3x1-desktop-hero` name is deliberately retained as a stable
  // R2/JSON key — renaming it orphans every existing crop. Do not "fix" it.
  { name: 'crop-4.3x1-desktop-hero', aspectRatio: 88 / 25, outputWidth: 2464, outputHeight: 700 },
  { name: 'crop-4x3-article-card', aspectRatio: 4 / 3, outputWidth: 1600, outputHeight: 1200 },
  // Left at 1200×630: social platforms cap OG images at roughly this size.
  { name: 'crop-16x9-og', aspectRatio: 1200 / 630, outputWidth: 1200, outputHeight: 630 },
];

/**
 * Short hash of the crop geometry, embedded in every stored crop URL.
 *
 * DERIVED, never hand-maintained: a hardcoded token has to be remembered on
 * every retarget, and forgetting it serves stale bytes forever from an
 * immutable CDN URL. It also makes the backfill's resume filter self-correcting
 * — rows written under an older geometry stop matching and are re-queued.
 */
export const GEOMETRY_VERSION = createHash('sha1')
  .update(JSON.stringify(CROP_TARGETS))
  .digest('hex')
  .slice(0, 8);

// ── Pure Functions (no I/O) ────────────────────────────────────────────

export function computeFocalPoint(
  faces: FaceBoundingBox[],
  labels: LabelInstance[],
): FocalPoint | null {
  if (faces.length > 0) {
    let totalWeight = 0;
    let weightedX = 0;
    let weightedY = 0;

    for (const face of faces) {
      const area = face.width * face.height;
      const weight = area * (face.confidence / 100);
      weightedX += (face.left + face.width / 2) * weight;
      weightedY += (face.top + face.height / 2) * weight;
      totalWeight += weight;
    }

    if (totalWeight > 0) {
      return { x: weightedX / totalWeight, y: weightedY / totalWeight, method: 'faces' };
    }
  }

  if (labels.length > 0) {
    // Find the largest bounding box by area
    let largest = labels[0];
    let maxArea = largest.width * largest.height;

    for (let i = 1; i < labels.length; i++) {
      const area = labels[i].width * labels[i].height;
      if (area > maxArea) {
        maxArea = area;
        largest = labels[i];
      }
    }

    return {
      x: largest.left + largest.width / 2,
      y: largest.top + largest.height / 2,
      method: 'labels',
    };
  }

  return null;
}

export function computeSafeZone(faces: FaceBoundingBox[]): SafeZone | null {
  if (faces.length === 0) return null;

  // Compute union of all face bounding boxes
  let unionLeft = Infinity;
  let unionTop = Infinity;
  let unionRight = -Infinity;
  let unionBottom = -Infinity;
  let maxFaceHeight = 0;
  let maxFaceWidth = 0;

  for (const face of faces) {
    unionLeft = Math.min(unionLeft, face.left);
    unionTop = Math.min(unionTop, face.top);
    unionRight = Math.max(unionRight, face.left + face.width);
    unionBottom = Math.max(unionBottom, face.top + face.height);
    maxFaceHeight = Math.max(maxFaceHeight, face.height);
    maxFaceWidth = Math.max(maxFaceWidth, face.width);
  }

  // Apply padding: 30% height above, 80% below, 20% width on sides
  const padTop = maxFaceHeight * 0.3;
  const padBottom = maxFaceHeight * 0.8;
  const padSide = maxFaceWidth * 0.2;

  return {
    left: Math.max(0, unionLeft - padSide),
    top: Math.max(0, unionTop - padTop),
    right: Math.min(1, unionRight + padSide),
    bottom: Math.min(1, unionBottom + padBottom),
  };
}

export function computeCropWindow(
  imageWidth: number,
  imageHeight: number,
  targetRatio: number,
  focalPoint: FocalPoint,
  safeZone?: SafeZone | null,
): CropWindow {
  // 1. Calculate maximum-size crop at target ratio that fits in image
  let cropWidth: number;
  let cropHeight: number;

  if (imageWidth / imageHeight > targetRatio) {
    // Image is wider than target — height-constrained
    cropHeight = imageHeight;
    cropWidth = Math.round(cropHeight * targetRatio);
  } else {
    // Image is taller than target — width-constrained
    cropWidth = imageWidth;
    cropHeight = Math.round(cropWidth / targetRatio);
  }

  // 2. Center crop window on focal point (convert normalized coords to pixels)
  let cropLeft = Math.round(focalPoint.x * imageWidth - cropWidth / 2);
  let cropTop = Math.round(focalPoint.y * imageHeight - cropHeight / 2);

  // 3. If safe zone provided, shift to ensure safe zone is fully contained
  if (safeZone) {
    const szLeft = Math.round(safeZone.left * imageWidth);
    const szTop = Math.round(safeZone.top * imageHeight);
    const szRight = Math.round(safeZone.right * imageWidth);
    const szBottom = Math.round(safeZone.bottom * imageHeight);
    const szWidth = szRight - szLeft;
    const szHeight = szBottom - szTop;

    if (szWidth <= cropWidth && szHeight <= cropHeight) {
      // Safe zone fits entirely — shift crop to contain it
      if (szLeft < cropLeft) cropLeft = szLeft;
      if (szTop < cropTop) cropTop = szTop;
      if (szRight > cropLeft + cropWidth) cropLeft = szRight - cropWidth;
      if (szBottom > cropTop + cropHeight) cropTop = szBottom - cropHeight;
    } else {
      // Safe zone overflows at least one dimension — only adjust
      // the dimension(s) where it fits; keep focal-point centering otherwise
      if (szWidth <= cropWidth) {
        if (szLeft < cropLeft) cropLeft = szLeft;
        if (szRight > cropLeft + cropWidth) cropLeft = szRight - cropWidth;
      }
      if (szHeight <= cropHeight) {
        if (szTop < cropTop) cropTop = szTop;
        if (szBottom > cropTop + cropHeight) cropTop = szBottom - cropHeight;
      }
    }
  }

  // 4. Clamp to image bounds
  cropLeft = Math.max(0, Math.min(cropLeft, imageWidth - cropWidth));
  cropTop = Math.max(0, Math.min(cropTop, imageHeight - cropHeight));

  return { left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight };
}

// ── Saliency Fallback ──────────────────────────────────────────────────

/**
 * Find the normalized centre (0..1) of sharp's attention crop along a single
 * axis. sharp's `fit:'cover', position:'attention'` only trims the axis where
 * the scaled image overflows the target, so each call is only meaningful on
 * the trimmed axis — the other axis collapses to 0.5. Callers must pick a
 * target shape that forces the trim onto the axis they care about.
 */
async function attentionAxis(
  imageBuffer: Buffer,
  imageWidth: number,
  imageHeight: number,
  targetWidth: number,
  targetHeight: number,
  axis: 'x' | 'y',
): Promise<number> {
  const { info } = await sharp(imageBuffer)
    .resize({ width: targetWidth, height: targetHeight, fit: 'cover', position: 'attention' })
    .toBuffer({ resolveWithObject: true });

  // Scale sharp applied before cropping (cover = max, so both dims are covered)
  const scale = Math.max(targetWidth / imageWidth, targetHeight / imageHeight);

  // sharp reports cropOffsetLeft/Top as a negative trim offset; the kept
  // region's start in scaled coords is therefore -cropOffset.
  if (axis === 'x') {
    const scaledWidth = imageWidth * scale;
    const centerX = -(info.cropOffsetLeft ?? 0) + targetWidth / 2;
    return Math.max(0, Math.min(1, centerX / scaledWidth));
  }
  const scaledHeight = imageHeight * scale;
  const centerY = -(info.cropOffsetTop ?? 0) + targetHeight / 2;
  return Math.max(0, Math.min(1, centerY / scaledHeight));
}

export async function detectSaliencyFocalPoint(imageBuffer: Buffer): Promise<FocalPoint> {
  const metadata = await sharp(imageBuffer).metadata();
  const imageWidth = metadata.width ?? 1;
  const imageHeight = metadata.height ?? 1;

  // A single attention crop (e.g. to a square) only trims the source's LONG
  // axis, so the short axis always reports 0.5. That silently breaks the
  // width-constrained desktop-hero crop, which relies entirely on the vertical
  // (y) focal point: landscape sources would always centre-band vertically and
  // clip subjects sitting off-centre.
  //
  // Resolve a true 2D point with two passes whose target shapes force the trim
  // onto a specific axis for any realistic source aspect ratio:
  //   • tall target (0.25:1) → scaled image overflows in width  → salient X
  //   • wide target (5:1)    → scaled image overflows in height → salient Y
  const x = await attentionAxis(imageBuffer, imageWidth, imageHeight, 50, 200, 'x');
  const y = await attentionAxis(imageBuffer, imageWidth, imageHeight, 250, 50, 'y');

  return { x, y, method: 'saliency' };
}

/**
 * Recover `FaceBoundingBox[]` from a persisted `coverImageDetectionData.faces`
 * blob (a raw AWS `DetectFacesCommand` response). Lets callers rebuild a safe
 * zone via `computeSafeZone` from stored data instead of re-calling Rekognition.
 * Returns `[]` for the label/saliency/disabled shapes, which carry no faces.
 */
export function parseStoredFaces(faceData: unknown): FaceBoundingBox[] {
  if (!faceData || typeof faceData !== 'object') return [];
  const details = (faceData as { FaceDetails?: unknown }).FaceDetails;
  if (!Array.isArray(details)) return [];

  const faces: FaceBoundingBox[] = [];
  for (const detail of details) {
    if (!detail || typeof detail !== 'object') continue;
    const box = (detail as { BoundingBox?: unknown }).BoundingBox;
    if (!box || typeof box !== 'object') continue;
    const { Left, Top, Width, Height } = box as Record<string, unknown>;
    if (
      typeof Left !== 'number' ||
      typeof Top !== 'number' ||
      typeof Width !== 'number' ||
      typeof Height !== 'number'
    ) {
      continue;
    }
    const confidence = (detail as { Confidence?: unknown }).Confidence;
    faces.push({
      left: Left,
      top: Top,
      width: Width,
      height: Height,
      confidence: typeof confidence === 'number' ? confidence : 0,
    });
  }
  return faces;
}

/**
 * Build the `processSmartCrops` framing options that reuse a STORED manual
 * focal point, so a regenerate re-cuts at the admin's chosen point instead of
 * silently re-running auto-detection and discarding it.
 *
 * Returns `null` when there is no usable override — the caller's signal to take
 * the normal detection path. That null is also the flag for the `detectionData`
 * asymmetry: `processSmartCrops` returns `detectionData: null` on the override
 * branch, so a caller that took the override path must OMIT `coverImageDetectionData`
 * from its update rather than write that null over the stored face data. Callers
 * do `...(framing ? {} : { coverImageDetectionData: result.detectionData })`.
 *
 * The safe zone is rebuilt from the stored `detectionData.faces` blob via
 * `parseStoredFaces` → `computeSafeZone`, so face-aware framing survives
 * regeneration with ZERO Rekognition calls. Absent or faceless detection data
 * degrades to `safeZoneOverride: null` (pure focal-point centering), never an
 * error.
 *
 * Coordinates must be normalized to 0..1, matching the validation in
 * `applyFocalPointOverrideAction` and the `generate-smart-crops` route. Those
 * two guard the WRITE path, but rows predating them (or written by a backfill)
 * can still hold an out-of-range point, and honouring one would re-cut the crop
 * window off-image on every regenerate. An unusable override degrades to `null`
 * — i.e. the normal detection path — rather than throwing.
 *
 * Lives here — one shared definition — because four separate regenerate sites
 * consume it and had already drifted apart once.
 */
export function framingFromStoredOverride(
  override: unknown,
  detectionData: unknown,
): { focalPointOverride: { x: number; y: number }; safeZoneOverride: SafeZone | null } | null {
  if (!override || typeof override !== 'object') return null;
  const { x, y } = override as { x?: unknown; y?: unknown };
  if (typeof x !== 'number' || typeof y !== 'number') return null;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (x < 0 || x > 1 || y < 0 || y > 1) return null;

  const faces =
    detectionData && typeof detectionData === 'object'
      ? parseStoredFaces((detectionData as { faces?: unknown }).faces)
      : [];

  return {
    focalPointOverride: { x, y },
    safeZoneOverride: computeSafeZone(faces),
  };
}

// ── Safe Accessor ─────────────────────────────────────────────────────

/** Safely extract a smart crop URL from unknown JSONB data */
export function getSmartCropUrl(crops: unknown, targetName: string): string | null {
  if (!crops || typeof crops !== 'object') return null;
  const record = crops as Record<string, unknown>;
  const entry = record[targetName];
  if (!entry || typeof entry !== 'object') return null;
  const { url } = entry as { url?: unknown };
  return typeof url === 'string' ? url : null;
}

// ── Source Key Resolution ─────────────────────────────────────────────

/**
 * Resolve the R2 key of the TRUE original for an entity whose `coverImageUrl`
 * is the downscaled `high` variant. Detecting and extracting from `high` both
 * degrades quality and — because `generateSmartCrops` derives its dirPrefix
 * from the source filename — buries the crops under a `.../high/` namespace
 * that no reader looks in.
 *
 * `variants` is untyped JSONB, so a missing or malformed `original.url` falls
 * back to `coverImageUrl` (which is how pre-variants records behave). A key
 * that lands in a different top-level namespace than `coverImageUrl` counts as
 * malformed too: callers pick their `GetObjectCommand` bucket from the cover
 * URL, while `resolveR2Bucket` picks the write bucket from the key, so trusting
 * a mismatched key would read from one bucket and write crops to another.
 */
export function resolveOriginalKey(variants: unknown, coverImageUrl: string): string {
  const fallbackKey = extractKeyFromUrl(coverImageUrl);

  if (variants && typeof variants === 'object') {
    const original = (variants as Record<string, unknown>).original;
    if (original && typeof original === 'object') {
      const { url } = original as { url?: unknown };
      if (typeof url === 'string' && url.length > 0) {
        const key = extractKeyFromUrl(url);
        const namespace = (k: string) => k.slice(0, k.indexOf('/') + 1);
        if (key.length > 0 && namespace(key) === namespace(fallbackKey)) {
          return key;
        }
      }
    }
  }
  return fallbackKey;
}

// ── Bucket Resolution ─────────────────────────────────────────────────

function resolveR2Bucket(key: string): { bucket: string; publicUrl: string } {
  if (key.startsWith('inspire/')) {
    return { bucket: getR2Bucket(), publicUrl: getR2PublicUrl() };
  }
  return { bucket: getR2AssetsBucket(), publicUrl: getR2AssetsPublicUrl() };
}

// ── Smart Crop Generation (I/O) ───────────────────────────────────────

export async function generateSmartCrops(
  originalBuffer: Buffer,
  originalKey: string,
  focalPoint: FocalPoint,
  safeZone: SafeZone | null,
): Promise<SmartCrops> {
  const r2 = getR2Client();
  const { bucket, publicUrl } = resolveR2Bucket(originalKey);

  // Determine directory prefix from the original key
  let dirPrefix: string;
  if (originalKey.includes('/original.')) {
    dirPrefix = originalKey.substring(0, originalKey.lastIndexOf('/') + 1);
  } else {
    const lastSlash = originalKey.lastIndexOf('/');
    const filename = originalKey.substring(lastSlash + 1).replace(/\.[^.]+$/, '');
    dirPrefix = originalKey.substring(0, lastSlash + 1) + filename + '/';
  }

  const metadata = await sharp(originalBuffer).metadata();
  const imageWidth = metadata.width ?? 1;
  const imageHeight = metadata.height ?? 1;

  // Crops are written to a fixed key under `immutable` year-long caching, so any
  // change to the bytes must change the stored URL or the CDN serves the old
  // image forever. TWO independent things change those bytes, and the token has
  // to carry both or one of them silently goes stale:
  //   · the focal point — per-image, moves the crop window
  //   · CROP_TARGETS    — global, changes every crop's geometry at once
  // Version the URL, not the key, so nothing is orphaned in R2 if this is reverted.
  const version = `${focalPoint.x.toFixed(4)}_${focalPoint.y.toFixed(4)}-g${GEOMETRY_VERSION}`;

  const smartCrops: SmartCrops = {};

  for (const target of CROP_TARGETS) {
    const cropWindow = computeCropWindow(
      imageWidth,
      imageHeight,
      target.aspectRatio,
      focalPoint,
      safeZone,
    );

    // `fit:'inside' + withoutEnlargement` makes the target a ceiling: a crop
    // window at or above the target is downscaled to it, one below it is left
    // at its native size. Never upscale — Sharp interpolating a 1000px window
    // up to 2350px only fabricates pixels, and the browser then resamples again
    // for DPR, stacking two lossy passes.
    const { data: croppedBuffer, info } = await sharp(originalBuffer)
      .extract({
        left: cropWindow.left,
        top: cropWindow.top,
        width: cropWindow.width,
        height: cropWindow.height,
      })
      .resize(target.outputWidth, target.outputHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 100 })
      .toBuffer({ resolveWithObject: true });

    const variantKey = `${dirPrefix}${target.name}.webp`;

    await r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: variantKey,
        Body: croppedBuffer,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    // Persist the ACTUAL encoded dimensions, not the target's claim — the two
    // diverge whenever the source is smaller than the ceiling.
    smartCrops[target.name] = {
      url: `${publicUrl}/${variantKey}?v=${version}`,
      width: info.width,
      height: info.height,
    };
  }

  return smartCrops;
}

// ── Shared Orchestration ───────────────────────────────────────────────

const MAX_REKOGNITION_DIMENSION = 4096;
const MAX_REKOGNITION_BYTES = 5 * 1024 * 1024; // 5 MB

export async function processSmartCrops(
  originalKey: string,
  options?: {
    focalPointOverride?: { x: number; y: number };
    /**
     * Reuse a previously-computed safe zone alongside `focalPointOverride`.
     * Only meaningful with an override (the detection path derives its own).
     * Lets the backfill preserve face-aware framing with zero Rekognition calls.
     */
    safeZoneOverride?: SafeZone | null;
    originalBuffer?: Buffer;
  },
): Promise<{
  focalPoint: FocalPoint;
  detectionData: { faces: object; labels: object } | null;
  smartCrops: SmartCrops;
}> {
  // 1. Use provided buffer or download original from R2
  let originalBuffer: Buffer;
  if (options?.originalBuffer) {
    originalBuffer = options.originalBuffer;
  } else {
    const r2 = getR2Client();
    const { bucket: sourceBucket } = resolveR2Bucket(originalKey);
    const response = await r2.send(
      new GetObjectCommand({
        Bucket: sourceBucket,
        Key: originalKey,
      }),
    );

    if (!response.Body) throw new Error('Original image not found in R2');
    originalBuffer = Buffer.from(await response.Body.transformToByteArray());
  }

  let focalPoint: FocalPoint;
  let detectionData: { faces: object; labels: object } | null = null;
  let safeZone: SafeZone | null = null;

  // 2. If override provided, skip detection entirely — including building the
  //    detection buffer, which is pure waste when nothing will consume it.
  if (options?.focalPointOverride) {
    focalPoint = {
      x: options.focalPointOverride.x,
      y: options.focalPointOverride.y,
      method: 'faces', // manual override, method is informational
    };
    safeZone = options.safeZoneOverride ?? null;
  } else {
    // Prepare a detection-safe buffer for Rekognition (JPEG only, ≤4096px, ≤5MB).
    // Always re-encode through sharp to normalise colour space (CMYK→sRGB),
    // strip unsupported formats (WebP/AVIF/HEIC), and enforce size limits.
    const metadata = await sharp(originalBuffer).metadata();
    const needsResize =
      (metadata.width && metadata.width > MAX_REKOGNITION_DIMENSION) ||
      (metadata.height && metadata.height > MAX_REKOGNITION_DIMENSION);

    let pipeline = sharp(originalBuffer);
    if (needsResize) {
      pipeline = pipeline.resize({
        width: MAX_REKOGNITION_DIMENSION,
        height: MAX_REKOGNITION_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
    let detectionBuffer = await pipeline.jpeg({ quality: 90 }).toBuffer();

    // Re-encode at lower quality if still over the 5 MB Rekognition limit
    if (detectionBuffer.length > MAX_REKOGNITION_BYTES) {
      detectionBuffer = await sharp(detectionBuffer).jpeg({ quality: 80 }).toBuffer();
    }

    // 3. DetectFaces
    const faceResult = await detectFaces(detectionBuffer);

    if (faceResult.faces.length > 0) {
      focalPoint = computeFocalPoint(faceResult.faces, [])!;
      safeZone = computeSafeZone(faceResult.faces);
      detectionData = { faces: faceResult.rawResponse, labels: {} };
    } else {
      // 4. DetectLabels
      const labelResult = await detectLabels(detectionBuffer);
      const computed = computeFocalPoint([], labelResult.labels);

      if (computed) {
        focalPoint = computed;
        detectionData = { faces: faceResult.rawResponse, labels: labelResult.rawResponse };
      } else {
        // 5. Saliency fallback
        focalPoint = await detectSaliencyFocalPoint(detectionBuffer);
        detectionData = { faces: faceResult.rawResponse, labels: labelResult.rawResponse };
      }
    }
  }

  // 6. Generate smart crops using the original full-res buffer for best quality
  const smartCrops = await generateSmartCrops(originalBuffer, originalKey, focalPoint, safeZone);

  return { focalPoint, detectionData, smartCrops };
}
