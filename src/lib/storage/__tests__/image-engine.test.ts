import { afterEach, describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { resizeToWebp } from '../image-engine';

const CTX = Symbol.for('__cloudflare-context__');

async function photo(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 200, g: 80, b: 40 } } })
    .png()
    .toBuffer();
}

afterEach(() => {
  delete (globalThis as Record<symbol, unknown>)[CTX];
});

describe('resizeToWebp', () => {
  it('uses sharp off Cloudflare: scales down, never up, and encodes WebP', async () => {
    const down = await resizeToWebp(await photo(1200, 800), { width: 600, quality: 70 });
    expect([down.width, down.height]).toEqual([600, 400]);
    expect(down.data.subarray(8, 12).toString('ascii')).toBe('WEBP');

    const kept = await resizeToWebp(await photo(300, 200), { width: 600, quality: 70 });
    expect(kept.width).toBe(300);
  });

  it('uses the Cloudflare Images binding inside a Worker request and passes width and quality', async () => {
    const calls: unknown[] = [];
    const encoded = new Uint8Array([1, 2, 3, 4]);
    (globalThis as Record<symbol, unknown>)[CTX] = {
      env: {
        IMAGES: {
          input: () => ({
            transform: (t: unknown) => {
              calls.push(t);
              return {
                output: async (o: unknown) => {
                  calls.push(o);
                  return { response: () => new Response(encoded) };
                },
              };
            },
          }),
          info: async () => ({ width: 640, height: 427 }),
        },
      },
    };
    const out = await resizeToWebp(Buffer.from('not-an-image'), { width: 640, quality: 72 });
    expect(calls).toEqual([
      { width: 640, fit: 'scale-down' },
      { format: 'image/webp', quality: 72 },
    ]);
    expect([...out.data]).toEqual([1, 2, 3, 4]);
    expect([out.width, out.height]).toEqual([640, 427]);
  });
});
