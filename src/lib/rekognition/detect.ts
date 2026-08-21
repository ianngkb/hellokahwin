import { DetectFacesCommand, DetectLabelsCommand } from '@aws-sdk/client-rekognition';
import type { BoundingBox } from '@aws-sdk/client-rekognition';
import { getRekognitionClient, isRekognitionEnabled } from './client';
// Inlined from twn-new's schema/photos.ts — the photos table itself is not ported.
export type RekognitionLabel = {
  name: string;
  confidence: number;
  parents?: string[];
  categories?: string[];
};

export interface FaceBoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
  confidence: number;
}

export interface LabelInstance {
  name: string;
  left: number;
  top: number;
  width: number;
  height: number;
  confidence: number;
}

function parseBoundingBox(
  box: BoundingBox | undefined,
): { left: number; top: number; width: number; height: number } | null {
  if (!box || box.Left == null || box.Top == null || box.Width == null || box.Height == null)
    return null;
  return { left: box.Left, top: box.Top, width: box.Width, height: box.Height };
}

export async function detectFaces(
  imageBuffer: Buffer,
): Promise<{ faces: FaceBoundingBox[]; rawResponse: object }> {
  // Feature switch: when Rekognition is disabled, return no faces so callers
  // fall back gracefully (smart crops use the AWS-free saliency focal point).
  if (!isRekognitionEnabled()) return { faces: [], rawResponse: { disabled: 'rekognition' } };
  const client = getRekognitionClient();

  const response = await client.send(
    new DetectFacesCommand({
      Image: { Bytes: imageBuffer },
      Attributes: ['DEFAULT'],
    }),
  );

  const faces: FaceBoundingBox[] = (response.FaceDetails ?? [])
    .map((face) => {
      const box = parseBoundingBox(face.BoundingBox);
      if (!box) return null;
      return { ...box, confidence: face.Confidence ?? 0 };
    })
    .filter((f): f is FaceBoundingBox => f !== null);

  return { faces, rawResponse: response };
}

export async function detectLabels(
  imageBuffer: Buffer,
): Promise<{ labels: LabelInstance[]; rawResponse: object }> {
  if (!isRekognitionEnabled()) return { labels: [], rawResponse: { disabled: 'rekognition' } };
  const client = getRekognitionClient();

  const response = await client.send(
    new DetectLabelsCommand({
      Image: { Bytes: imageBuffer },
      MaxLabels: 20,
      MinConfidence: 70,
    }),
  );

  const labels: LabelInstance[] = [];

  for (const label of response.Labels ?? []) {
    if (!label.Instances || label.Instances.length === 0) continue;
    for (const instance of label.Instances) {
      const box = parseBoundingBox(instance.BoundingBox);
      if (!box) continue;
      labels.push({
        name: label.Name ?? 'Unknown',
        ...box,
        confidence: instance.Confidence ?? label.Confidence ?? 0,
      });
    }
  }

  return { labels, rawResponse: response };
}

// ── Wedding-relevant category filter ─────────────────────────────────

/** Rekognition categories that are relevant to wedding photography */
const RELEVANT_CATEGORIES = new Set([
  'Events and Attractions',
  'Food and Beverage',
  'Person Description',
  'People and Society',
  'Plants and Flowers',
  'Fashion and Apparel',
  'Home and Indoors',
  'Buildings and Architecture',
  'Furniture and Furnishings',
  'Nature and Outdoors',
  'Leisure and Hobbies',
  'Arts and Entertainment',
]);

/** Labels to always exclude regardless of category (generic/noisy) */
const BLOCKED_LABELS = new Set([
  'Photography',
  'Photo',
  'Camera',
  'Screen',
  'Monitor',
  'Electronics',
  'Hardware',
  'Computer',
  'Laptop',
  'Phone',
  'Mobile Phone',
  'Portrait',
  'Head',
  'Face',
]);

/** Labels to always keep regardless of category (wedding-specific) */
const WEDDING_ALLOWLIST = new Set([
  'Wedding',
  'Bride',
  'Groom',
  'Bouquet',
  'Ring',
  'Veil',
  'Cake',
  'Champagne',
  'Toast',
  'Dance',
  'Altar',
  'Ceremony',
  'Reception',
  'Aisle',
  'Chapel',
  'Church',
  'Invitation',
  'Floral',
  'Corsage',
  'Boutonniere',
  'Tiara',
  'Tuxedo',
  'Gown',
  'Centerpiece',
  'Candelabra',
  'Table Setting',
]);

function isWeddingRelevant(label: { name: string; categories?: string[] }): boolean {
  if (BLOCKED_LABELS.has(label.name)) return false;
  if (WEDDING_ALLOWLIST.has(label.name)) return true;
  // Keep if any of the label's categories is relevant
  return label.categories?.some((cat) => RELEVANT_CATEGORIES.has(cat)) ?? false;
}

// ── Rekognition color deduplication ──────────────────────────────────

interface RekognitionColor {
  Red?: number;
  Green?: number;
  Blue?: number;
  HexCode?: string;
  CSSColor?: string;
  SimplifiedColor?: string;
  PixelPercent?: number;
}

function deduplicateColors(
  colors: RekognitionColor[],
  maxColors = 6,
  minHueDistance = 30,
): RekognitionColor[] {
  if (colors.length === 0) return [];

  const withHsl = colors.map((c) => ({
    color: c,
    hsl: rgbToHsl(c.Red ?? 0, c.Green ?? 0, c.Blue ?? 0),
  }));

  const selected: typeof withHsl = [];
  for (const candidate of withHsl) {
    if (selected.length >= maxColors) break;
    const tooClose = selected.some((s) => {
      let dh = Math.abs(candidate.hsl.h - s.hsl.h);
      if (dh > 180) dh = 360 - dh;
      const ds = Math.abs(candidate.hsl.s - s.hsl.s);
      const dl = Math.abs(candidate.hsl.l - s.hsl.l);
      const avgS = (candidate.hsl.s + s.hsl.s) / 2;
      return avgS < 0.15
        ? dl * 100 < minHueDistance
        : dh * 0.6 + ds * 50 + dl * 40 < minHueDistance;
    });
    if (!tooClose) selected.push(candidate);
  }

  return selected.map((s) => s.color);
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h: h * 360, s, l };
}

/**
 * Detect labels and image properties for moodboard photo intelligence.
 * Filters labels to wedding-relevant categories and deduplicates colors.
 */
export async function detectLabelsForMoodboard(
  imageBuffer: Buffer,
): Promise<{ labels: RekognitionLabel[]; imageProperties: object | null; rawResponse: object }> {
  if (!isRekognitionEnabled())
    return { labels: [], imageProperties: null, rawResponse: { disabled: 'rekognition' } };
  const client = getRekognitionClient();

  const response = await client.send(
    new DetectLabelsCommand({
      Image: { Bytes: imageBuffer },
      MaxLabels: 30,
      MinConfidence: 70,
      Features: ['GENERAL_LABELS', 'IMAGE_PROPERTIES'],
    }),
  );

  const allLabels: RekognitionLabel[] = (response.Labels ?? []).map((label) => ({
    name: label.Name ?? 'Unknown',
    confidence: label.Confidence ?? 0,
    parents: label.Parents?.map((p) => p.Name ?? '').filter(Boolean) ?? [],
    categories: label.Categories?.map((c) => c.Name ?? '').filter(Boolean) ?? [],
  }));

  // Filter to wedding-relevant labels only
  const labels = allLabels.filter(isWeddingRelevant);

  // Deduplicate image properties colors for diversity
  const rawProps = response.ImageProperties;
  let imageProperties: object | null = null;
  if (rawProps) {
    const fgColors = (rawProps.Foreground?.DominantColors ?? []) as RekognitionColor[];
    const bgColors = (rawProps.Background?.DominantColors ?? []) as RekognitionColor[];
    imageProperties = {
      Quality: rawProps.Quality ?? null,
      Foreground: { DominantColors: deduplicateColors(fgColors) },
      Background: { DominantColors: deduplicateColors(bgColors) },
    };
  }

  return { labels, imageProperties, rawResponse: response };
}
