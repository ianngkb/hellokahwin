import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AVATAR_MAX_EDGE, shrinkAvatar, uploadAuthorAvatar } from '../upload-author-avatar';

/**
 * The 288px WebP shrink ported from The Wedding Notebook, and the upload going
 * through HelloKahwin's own admin presign route. jsdom has no real image
 * decoder or canvas encoder, so both are stubbed.
 */

function bigPng(bytes = 2_000_000) {
  return new File([new Uint8Array(bytes)], 'Headshot.PNG', { type: 'image/png' });
}

let drawn: { width: number; height: number } | null;
let encoded: Blob | null;
let context: object | null;

beforeEach(() => {
  drawn = null;
  encoded = new Blob([new Uint8Array(20_000)], { type: 'image/webp' });
  context = {
    drawImage: (_b: unknown, _x: number, _y: number, width: number, height: number) => {
      drawn = { width, height };
    },
  };
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({ width: 1254, height: 836, close: vi.fn() })),
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => context as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (cb) {
    cb(encoded);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('shrinkAvatar', () => {
  it('scales the longest edge to 288px and re-encodes as WebP', async () => {
    const out = await shrinkAvatar(bigPng());
    expect(AVATAR_MAX_EDGE).toBe(288);
    expect(drawn).toEqual({ width: 288, height: 192 });
    expect(out.type).toBe('image/webp');
    expect(out.name).toBe('Headshot.webp');
    expect(out.size).toBe(20_000);
  });

  it('honours EXIF orientation while decoding', async () => {
    await shrinkAvatar(bigPng());
    expect(createImageBitmap).toHaveBeenCalledWith(expect.any(File), {
      imageOrientation: 'from-image',
    });
  });

  it('never upscales a small photo', async () => {
    vi.mocked(createImageBitmap).mockResolvedValueOnce({
      width: 120,
      height: 100,
      close: vi.fn(),
    } as unknown as ImageBitmap);
    await shrinkAvatar(bigPng());
    expect(drawn).toEqual({ width: 120, height: 100 });
  });

  it('keeps the original when the browser cannot decode it', async () => {
    vi.mocked(createImageBitmap).mockRejectedValueOnce(new Error('unsupported'));
    const file = bigPng();
    expect(await shrinkAvatar(file)).toBe(file);
  });

  it('keeps the original when there is no 2D context (would encode a blank square)', async () => {
    context = null;
    const file = bigPng();
    expect(await shrinkAvatar(file)).toBe(file);
  });

  it('keeps the original when the browser silently encodes PNG instead of WebP', async () => {
    encoded = new Blob([new Uint8Array(20_000)], { type: 'image/png' });
    const file = bigPng();
    expect(await shrinkAvatar(file)).toBe(file);
  });

  it('keeps the original when the "shrunk" copy is not smaller', async () => {
    const file = bigPng(10_000);
    expect(await shrinkAvatar(file)).toBe(file);
  });
});

describe('uploadAuthorAvatar', () => {
  it("presigns the shrunk WebP through HelloKahwin's admin upload route and PUTs it", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: { uploadUrl: 'https://r2.example/signed', publicUrl: 'https://cdn.example/a.webp' },
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const sent: { body?: unknown; headers: Record<string, string> } = { headers: {} };
    class FakeXhr {
      status = 200;
      upload = { addEventListener: vi.fn() };
      private listeners: Record<string, () => void> = {};
      open = vi.fn();
      setRequestHeader(k: string, v: string) {
        sent.headers[k] = v;
      }
      addEventListener(type: string, cb: () => void) {
        this.listeners[type] = cb;
      }
      send(body: unknown) {
        sent.body = body;
        this.listeners.load?.();
      }
    }
    vi.stubGlobal('XMLHttpRequest', FakeXhr);

    const url = await uploadAuthorAvatar('user_abc', bigPng());

    expect(url).toBe('https://cdn.example/a.webp');
    const [route, init] = fetchMock.mock.calls[0] as unknown as [string, { body: string }];
    expect(route).toBe('/api/v1/inspire/upload');
    expect(JSON.parse(init.body)).toEqual({
      fileName: 'author-user_abc.webp',
      contentType: 'image/webp',
      fileSize: 20_000,
    });
    expect(sent.headers['Content-Type']).toBe('image/webp');
    expect((sent.body as File).type).toBe('image/webp');
  });

  it('rejects a file type the route would refuse before doing any work', async () => {
    const gif = new File([new Uint8Array(10)], 'a.gif', { type: 'image/gif' });
    await expect(uploadAuthorAvatar('user_abc', gif)).rejects.toThrow(/JPG, PNG, and WEBP/);
    expect(createImageBitmap).not.toHaveBeenCalled();
  });

  it("surfaces the route's own error message", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ error: { message: 'Forbidden' } }),
      })),
    );
    await expect(uploadAuthorAvatar('user_abc', bigPng())).rejects.toThrow('Forbidden');
  });
});
