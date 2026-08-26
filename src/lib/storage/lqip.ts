import sharp from 'sharp';

/**
 * LQIP — the tiny base64 placeholder that stands in for a cover while the real
 * WebP decodes.
 *
 * Why this exists: cards and covers render over a `bg-muted` plate. Until the
 * cover decoded, that plate was all the reader saw — a flat rectangle where a
 * photograph belongs. Cards 3+ are `loading="lazy"`, so on a slow connection
 * that flat state is most of the scroll. A LQIP replaces it with the actual
 * colours and shapes of the photograph.
 *
 * Deliberately kept at 16px wide. `next/image` wraps the data URL in an SVG
 * with a 20px Gaussian blur before painting it, so anything sharper is detail
 * the reader never sees — it only costs bytes in the HTML, once per card.
 */
const LQIP_WIDTH = 16;
const LQIP_QUALITY = 40;

/** Hard ceiling per placeholder. 13 cards inline on the homepage, so this is
 *  a budget, not a formality: 13 x 800B is ~10KB of HTML. */
export const LQIP_MAX_BYTES = 800;

/** Produces a `data:image/webp;base64,...` URL suitable for `blurDataURL`. */
export async function generateLqip(sourceBuffer: Buffer): Promise<string> {
  const buf = await sharp(sourceBuffer)
    .resize({ width: LQIP_WIDTH, withoutEnlargement: true })
    .webp({ quality: LQIP_QUALITY, effort: 6 })
    .toBuffer();

  return `data:image/webp;base64,${buf.toString('base64')}`;
}

/**
 * Resolves the cover URL a card will actually render, then derives its LQIP.
 *
 * The resolution order here MUST stay identical to `cardImageUrl` in
 * `components/inspire/article-card.tsx`. If the two drift, every card gets a
 * placeholder derived from a different crop than the photograph above it, and
 * the blur will visibly disagree with the image as it resolves.
 */
export async function generateLqipForCover(
  smartCrops: unknown,
  variants: unknown,
  coverImageUrl: string | null,
): Promise<string | null> {
  const crops = smartCrops as Record<string, { url: string }> | null | undefined;
  const vars = variants as Record<string, { url: string }> | null | undefined;
  const url = crops?.['crop-4x3-article-card']?.url ?? vars?.low?.url ?? coverImageUrl;
  if (!url) return null;
  return generateLqipFromUrl(url);
}

/**
 * Fetches an already-uploaded cover and derives its LQIP.
 *
 * Callers pass the URL the card will actually render (the 4:3 smart crop when
 * there is one). The placeholder is painted with the same `object-fit` as the
 * image it stands in for, so deriving it from a differently-cropped source
 * would shift the colours at the edges.
 *
 * Returns null rather than throwing: a missing placeholder degrades to the
 * old flat plate, which is exactly the pre-UX-04 behaviour. A cover upload
 * must never fail because a placeholder could not be produced.
 */
export async function generateLqipFromUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return await generateLqip(buf);
  } catch {
    return null;
  }
}
