/**
 * Resize-and-encode, on whichever image engine the host has.
 *
 *   Vercel, `next dev`, the CLI scripts — sharp, exactly as before.
 *   Cloudflare Workers                   — the Cloudflare Images binding
 *                                          (`IMAGES` in wrangler.jsonc).
 *
 * sharp is a native module and cannot load inside a Worker, so it is imported
 * LAZILY here, on the first call that needs it, never at module load. That is
 * what lets the modules that use this one (`image-variants`, `lqip`) be bundled
 * into the Worker at all.
 *
 * Only the plain operation lives here: scale down to a width, encode WebP at a
 * quality. That covers the upload variants (`low`/`high`/`mid`) and the LQIP
 * placeholder. The smart crops (`smart-crop.ts`: attention-based framing,
 * extract regions) and PDF compression (ghostscript) still need
 * sharp/ghostscript and stay on Vercel until the media-tools container exists
 * (docs/cloudflare.md, "What stays on Vercel").
 *
 * The Cloudflare backend is chosen per request from OpenNext's request context
 * (`Symbol.for('__cloudflare-context__')`, read directly so the Vercel build
 * never imports the adapter) — the same switch `@/lib/db/drizzle` uses.
 */
export interface EncodedImage {
  data: Buffer;
  width: number;
  height: number;
}

export interface ResizeToWebp {
  /** Target width; never enlarges. `undefined` keeps the source width. */
  width: number | undefined;
  quality: number;
  /** sharp's CPU effort (0–6). Ignored by Cloudflare Images. */
  effort?: number;
}

/** The slice of the Cloudflare Images binding this module uses. */
interface ImagesBinding {
  input(stream: ReadableStream<Uint8Array>): {
    transform(t: { width?: number; fit?: 'scale-down' }): {
      output(o: { format: 'image/webp'; quality: number }): Promise<{
        response(): Response;
      }>;
    };
  };
  info(stream: ReadableStream<Uint8Array>): Promise<{ width?: number; height?: number }>;
}

export function cloudflareImages(): ImagesBinding | null {
  const ctx = (globalThis as Record<symbol, unknown>)[Symbol.for('__cloudflare-context__')] as
    { env?: { IMAGES?: ImagesBinding } } | undefined;
  return ctx?.env?.IMAGES ?? null;
}

function streamOf(buffer: Buffer): ReadableStream<Uint8Array> {
  return new Response(new Uint8Array(buffer)).body as ReadableStream<Uint8Array>;
}

async function viaCloudflare(images: ImagesBinding, input: Buffer, opts: ResizeToWebp) {
  const out = await images
    .input(streamOf(input))
    .transform(opts.width ? { width: opts.width, fit: 'scale-down' } : {})
    .output({ format: 'image/webp', quality: opts.quality });
  const data = Buffer.from(await out.response().arrayBuffer());
  const info = await images.info(streamOf(data));
  return { data, width: info.width ?? 0, height: info.height ?? 0 };
}

async function viaSharp(input: Buffer, opts: ResizeToWebp): Promise<EncodedImage> {
  const { default: sharp } = await import('sharp');
  const { data, info } = await sharp(input)
    .resize({ width: opts.width, withoutEnlargement: true })
    .webp({ quality: opts.quality, ...(opts.effort !== undefined ? { effort: opts.effort } : {}) })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** Scale `input` down to `width` and encode it as WebP at `quality`. */
export async function resizeToWebp(input: Buffer, opts: ResizeToWebp): Promise<EncodedImage> {
  const images = cloudflareImages();
  return images ? viaCloudflare(images, input, opts) : viaSharp(input, opts);
}
