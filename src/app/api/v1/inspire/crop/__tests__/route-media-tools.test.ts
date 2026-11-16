// @vitest-environment node
//
// The manual crop on a Cloudflare Worker: media-tools only accepts whole
// degrees, so the route rounds the angle BEFORE the bounds check and sends the
// rounded angle, so the extract box is validated against the canvas
// media-tools will actually produce. (The sharp path keeps the exact angle.)
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { NextRequest } from 'next/server';

vi.mock('@/lib/api/middleware', () => ({ requireRole: vi.fn(async () => ({ id: 'admin' })) }));
const send = vi.fn();
vi.mock('@/lib/r2/client', () => ({
  getR2Client: () => ({ send }),
  getR2Bucket: () => 'hk-bucket',
  getR2PublicUrl: () => 'https://img.example',
  extractKeyFromUrl: (k: string) => k,
}));

const { POST } = await import('../route');

const CTX = Symbol.for('__cloudflare-context__');
const g = globalThis as Record<symbol, unknown>;
let WEBP: Buffer;
let transformQuery: URLSearchParams | null;

beforeAll(async () => {
  WEBP = await sharp({ create: { width: 8, height: 6, channels: 3, background: '#808080' } })
    .webp()
    .toBuffer();
});

beforeEach(() => {
  transformQuery = null;
  vi.spyOn(console, 'log').mockImplementation(() => {});
  send.mockReset();
  send.mockImplementation(async (cmd: { constructor: { name: string } }) => {
    if (cmd.constructor.name === 'GetObjectCommand') {
      const bytes = new Uint8Array([1, 2, 3]);
      return {
        ContentLength: bytes.byteLength,
        Body: {
          transformToByteArray: async () => bytes,
          transformToWebStream: () => new Response(bytes).body,
        },
      };
    }
    if (cmd.constructor.name === 'ListObjectsV2Command') return { Contents: [] };
    return {};
  });
  // A 1000x500 source (stored orientation), and a transform that echoes the call.
  g[CTX] = {
    env: {
      MEDIA_TOOLS_KEY: 'k',
      MEDIA: {
        fetch: async (url: string) => {
          const u = new URL(url);
          if (u.pathname === '/v1/image/metadata') {
            return Response.json({
              format: 'jpeg',
              width: 1000,
              height: 500,
              storedWidth: 1000,
              storedHeight: 500,
              orientation: 1,
            });
          }
          transformQuery = u.searchParams;
          return new Response(WEBP, { headers: { 'x-width': '8', 'x-height': '6' } });
        },
      },
    },
  };
});
afterEach(() => {
  delete g[CTX];
  vi.restoreAllMocks();
});

const crop = (rotation: number, area: { x: number; y: number; width: number; height: number }) =>
  POST(
    new NextRequest('https://hellokahwin.com/api/v1/inspire/crop', {
      method: 'POST',
      body: JSON.stringify({
        sourceR2Key: 'inspire/2026/photo/original.jpg',
        croppedAreaPixels: area,
        rotation,
        zoom: 1,
      }),
    }),
  );

describe('POST /api/v1/inspire/crop through media-tools', () => {
  it('rounds 15.5 to 16 degrees and validates the box against the 16-degree canvas', async () => {
    // 16 deg canvas of 1000x500: 1099 x 756. (15.5 deg would be 1097 x 749, so
    // this box is only valid once the angle is rounded first.)
    const res = await crop(15.5, { x: 0, y: 0, width: 1099, height: 756 });
    expect(res.status).toBe(200);
    expect(transformQuery?.get('angle')).toBe('16');
    expect(transformQuery?.get('extract')).toBe('0,0,1099,756');
    expect(transformQuery?.get('orient')).toBe('0');
    const body = (await res.json()) as { data?: { filename?: string } };
    expect(JSON.stringify(body)).toContain('-r16');
  });

  it('refuses a box outside the rounded canvas before calling the transform', async () => {
    const res = await crop(15.5, { x: 0, y: 0, width: 1100, height: 756 });
    expect(res.status).toBe(400);
    expect(transformQuery).toBeNull();
  });

  it('sends whole-degree angles unchanged and omits a zero angle', async () => {
    expect((await crop(90, { x: 0, y: 0, width: 500, height: 1000 })).status).toBe(200);
    expect(transformQuery?.get('angle')).toBe('90');
    expect((await crop(0.4, { x: 0, y: 0, width: 1000, height: 500 })).status).toBe(200);
    expect(transformQuery?.has('angle')).toBe(false);
  });
});
