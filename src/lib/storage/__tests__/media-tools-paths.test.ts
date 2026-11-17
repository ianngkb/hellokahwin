// @vitest-environment node
//
// The Cloudflare Worker paths of the admin's image and PDF work: with the
// `MEDIA` binding present, smart crops, the saliency fallback and PDF
// compression go to media-tools (`@/lib/media/media-client`) and never to
// sharp or Ghostscript. Without the binding the existing local paths run; those
// are covered by the files' existing tests.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';

const send = vi.fn();
vi.mock('@/lib/r2/client', () => ({
  getR2Client: () => ({ send }),
  getR2Bucket: () => 'hk-bucket',
  getR2PublicUrl: () => 'https://img.example',
  getR2AssetsBucket: () => 'hk-assets',
  getR2AssetsPublicUrl: () => 'https://assets.example',
  extractKeyFromUrl: (k: string) => k,
}));
const detectFaces = vi.fn();
const detectLabels = vi.fn();
vi.mock('@/lib/rekognition/detect', () => ({
  detectFaces: (...a: unknown[]) => detectFaces(...a),
  detectLabels: (...a: unknown[]) => detectLabels(...a),
}));

import { compressPdf, REMOTE_PDF_PARAMS } from '../pdf-compress';
import {
  CROP_TARGETS,
  detectSaliencyFocalPoint,
  generateSmartCrops,
  processSmartCrops,
} from '../smart-crop';
import { COVER_RENDITIONS } from '../midsize-cover';
import { MediaToolsError, MediaToolsUnavailableError } from '@/lib/media/media-client';

const CTX = Symbol.for('__cloudflare-context__');
const g = globalThis as Record<symbol, unknown>;

type Call = { path: string; query: URLSearchParams; key: string | null };
let calls: Call[];
let WEBP: Buffer;
let JPEG: Buffer;
const SOURCE = Buffer.from('not-decoded-locally');
const PDF_IN = Buffer.from(`%PDF-1.5\n${'x'.repeat(4000)}\n%%EOF\n`, 'latin1');
const PDF_SMALL = Buffer.from('%PDF-1.5\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n', 'latin1');

beforeAll(async () => {
  const base = sharp({ create: { width: 8, height: 6, channels: 3, background: '#c08040' } });
  WEBP = await base.clone().webp().toBuffer();
  JPEG = await base.clone().jpeg().toBuffer();
});

/** A fake media-tools: answers like the real one, records every call. */
function bindMedia(overrides: Record<string, () => Response> = {}) {
  calls = [];
  const fetcher = {
    fetch: vi.fn(async (url: string, init?: RequestInit) => {
      const u = new URL(url);
      const headers = new Headers(init?.headers);
      calls.push({
        path: u.pathname,
        query: u.searchParams,
        key: headers.get('x-media-tools-key'),
      });
      const override = overrides[u.pathname];
      if (override) return override();
      switch (u.pathname) {
        case '/v1/image/metadata':
          return Response.json({
            format: 'jpeg',
            width: 3000,
            height: 2000,
            storedWidth: 3000,
            storedHeight: 2000,
            orientation: 1,
          });
        case '/v1/image/focal':
          return Response.json({ x: 0.3, y: 0.6, width: 3000, height: 2000 });
        case '/v1/image/transform': {
          const jpeg = u.searchParams.get('format') === 'jpeg';
          return new Response(jpeg ? JPEG : WEBP, {
            headers: { 'x-width': '8', 'x-height': '6', 'x-quality': '80' },
          });
        }
        case '/v1/pdf/compress':
          return new Response(PDF_SMALL, { headers: { 'x-kept-original': 'false' } });
        default:
          return Response.json({ error: { code: 'not_found', message: 'no' } }, { status: 404 });
      }
    }),
  };
  g[CTX] = { env: { MEDIA: fetcher, MEDIA_TOOLS_KEY: 'test-key' } };
  return fetcher;
}

beforeEach(() => {
  send.mockReset();
  send.mockResolvedValue({});
  detectFaces.mockReset();
  detectLabels.mockReset();
});
afterEach(() => {
  delete g[CTX];
});

describe('compressPdf on a Worker', () => {
  it('sends the Ghostscript settings to media-tools and keeps a smaller result', async () => {
    bindMedia();
    const { output, compressed } = await compressPdf(PDF_IN);
    expect(compressed).toBe(true);
    expect(output.equals(PDF_SMALL)).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].path).toBe('/v1/pdf/compress');
    expect(calls[0].key).toBe('test-key');
    for (const [k, v] of Object.entries(REMOTE_PDF_PARAMS)) {
      expect(calls[0].query.get(k)).toBe(String(v));
    }
  });

  it('returns the original when media-tools kept it', async () => {
    bindMedia({
      '/v1/pdf/compress': () => new Response(PDF_IN, { headers: { 'x-kept-original': 'true' } }),
    });
    const { output, compressed } = await compressPdf(PDF_IN);
    expect(compressed).toBe(false);
    expect(output).toBe(PDF_IN);
  });

  it('throws a retryable error (never a silent keep) when media-tools is down', async () => {
    bindMedia({ '/v1/pdf/compress': () => new Response('boom', { status: 502 }) });
    await expect(compressPdf(PDF_IN)).rejects.toBeInstanceOf(MediaToolsUnavailableError);
  });

  it('passes a media-tools refusal through with its status', async () => {
    bindMedia({
      '/v1/pdf/compress': () =>
        Response.json({ error: { code: 'bad_pdf', message: 'Not a PDF' } }, { status: 422 }),
    });
    const err = await compressPdf(PDF_IN).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(MediaToolsError);
    expect((err as MediaToolsError).status).toBe(422);
  });
});

describe('detectSaliencyFocalPoint on a Worker', () => {
  it('asks media-tools for the attention focal point', async () => {
    bindMedia();
    expect(await detectSaliencyFocalPoint(SOURCE)).toEqual({ x: 0.3, y: 0.6, method: 'saliency' });
    expect(calls.map((c) => c.path)).toEqual(['/v1/image/focal']);
  });

  it('treats a malformed focal answer as unavailable', async () => {
    bindMedia({ '/v1/image/focal': () => Response.json({ x: 3, y: 'no' }) });
    await expect(detectSaliencyFocalPoint(SOURCE)).rejects.toBeInstanceOf(
      MediaToolsUnavailableError,
    );
  });
});

describe('generateSmartCrops on a Worker', () => {
  it('cuts every target and rendition through media-tools on the stored pixels', async () => {
    bindMedia();
    const crops = await generateSmartCrops(
      SOURCE,
      'inspire/2026/cover/original.jpg',
      { x: 0.5, y: 0.5, method: 'saliency' },
      null,
    );

    const transforms = calls.filter((c) => c.path === '/v1/image/transform');
    expect(calls[0].path).toBe('/v1/image/metadata');
    expect(transforms).toHaveLength(CROP_TARGETS.length + COVER_RENDITIONS.length);
    for (const t of transforms) {
      expect(t.query.get('orient')).toBe('0');
      expect(t.query.get('format')).toBe('webp');
      expect(t.query.get('fit')).toBe('inside');
      expect(t.query.get('enlarge')).toBe('0');
    }
    // The crops carry a source window; the renditions resize a crop.
    const cropCalls = transforms.filter((t) => t.query.has('extract'));
    expect(cropCalls).toHaveLength(CROP_TARGETS.length);
    for (const c of cropCalls) {
      const [x, y, w, h] = c.query.get('extract')!.split(',').map(Number);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(3000);
      expect(y + h).toBeLessThanOrEqual(2000);
    }

    for (const t of CROP_TARGETS) {
      expect(crops[t.name]).toMatchObject({ width: 8, height: 6 });
      expect(crops[t.name].url).toContain(`inspire/2026/cover/${t.name}.webp?v=`);
    }
    expect(send).toHaveBeenCalledTimes(CROP_TARGETS.length + COVER_RENDITIONS.length);
  });
});

describe('processSmartCrops on a Worker', () => {
  it('builds the Rekognition JPEG through media-tools, then falls back to saliency', async () => {
    bindMedia();
    detectFaces.mockResolvedValue({ faces: [], rawResponse: { FaceDetails: [] } });
    detectLabels.mockResolvedValue({ labels: [], rawResponse: { Labels: [] } });

    const result = await processSmartCrops('inspire/2026/cover/original.jpg', {
      originalBuffer: SOURCE,
    });

    const detection = calls.find(
      (c) => c.path === '/v1/image/transform' && c.query.get('format') === 'jpeg',
    )!;
    expect(detection.query.get('w')).toBe('4096');
    expect(detection.query.get('h')).toBe('4096');
    expect(detection.query.get('q')).toBe('90');
    expect(detection.query.get('orient')).toBe('0');
    expect((detectFaces.mock.calls[0][0] as Buffer).equals(JPEG)).toBe(true);
    expect(result.focalPoint).toEqual({ x: 0.3, y: 0.6, method: 'saliency' });
    expect(calls.some((c) => c.path === '/v1/image/focal')).toBe(true);
  });

  it('reads the original from R2 with the 40 MB cap when no buffer is passed', async () => {
    bindMedia();
    send.mockImplementation(async (cmd: { constructor: { name: string } }) => {
      if (cmd.constructor.name === 'GetObjectCommand') {
        return {
          ContentLength: 41 * 1024 * 1024,
          Body: {
            transformToByteArray: async () => new Uint8Array(0),
            transformToWebStream: () => new ReadableStream(),
          },
        };
      }
      return {};
    });
    const err = await processSmartCrops('inspire/2026/cover/original.jpg', {
      focalPointOverride: { x: 0.5, y: 0.5 },
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(MediaToolsError);
    expect((err as MediaToolsError).status).toBe(413);
    expect(calls).toHaveLength(0);
  });
});
