// @vitest-environment node
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import {
  getImageMetadata,
  getMediaTools,
  hasMagic,
  isCompleteFile,
  isFocalResult,
  MAX_REMOTE_BYTES,
  mediaPdfCompress,
  mediaToolsCall,
  mediaToolsJson,
  mediaTransform,
  MediaToolsError,
  MediaToolsUnavailableError,
  readObjectBody,
} from '../media-client';

const CONTEXT = Symbol.for('__cloudflare-context__');
const g = globalThis as Record<symbol, unknown>;

function bind(fetchImpl: (url: string, init?: RequestInit) => Promise<Response>, key = 'k-123') {
  const fetcher = { fetch: vi.fn(fetchImpl) };
  g[CONTEXT] = { env: { MEDIA: fetcher, MEDIA_TOOLS_KEY: key } };
  return fetcher;
}

const bytes = Buffer.from([1, 2, 3]);
// Real files, encoded by sharp, so the structural checks see what media-tools sends.
let WEBP: Buffer; // lossy, VP8
let WEBP_LOSSLESS: Buffer; // VP8L
let WEBP_ALPHA: Buffer; // VP8X + ALPH + VP8
let JPEG: Buffer;
let PNG: Buffer;
let AVIF: Buffer;
const PDF = Buffer.from(
  '%PDF-1.5\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n',
  'latin1',
);

beforeAll(async () => {
  const rgb = () =>
    sharp({ create: { width: 16, height: 12, channels: 3, background: '#c08040' } });
  WEBP = await rgb().webp({ quality: 80 }).toBuffer();
  WEBP_LOSSLESS = await rgb().webp({ lossless: true }).toBuffer();
  WEBP_ALPHA = await sharp({
    create: { width: 16, height: 12, channels: 4, background: { r: 1, g: 2, b: 3, alpha: 0.5 } },
  })
    .webp({ quality: 80 })
    .toBuffer();
  JPEG = await rgb().jpeg().toBuffer();
  PNG = await rgb().png().toBuffer();
  AVIF = await rgb().avif().toBuffer();
});

function image(body: Buffer, w = '100', h = '50') {
  return new Response(new Uint8Array(body), { headers: { 'x-width': w, 'x-height': h } });
}

async function rejection(p: Promise<unknown>) {
  return p.then(
    () => {
      throw new Error('expected a rejection');
    },
    (e: unknown) => e,
  );
}

afterEach(() => {
  delete g[CONTEXT];
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('getMediaTools', () => {
  it('is null when MEDIA is not bound (Vercel, local, tests)', () => {
    expect(getMediaTools()).toBeNull();
  });

  it('throws when MEDIA is bound but the key is missing — never the local path', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    bind(async () => new Response('x'), '');
    expect(() => getMediaTools()).toThrow(MediaToolsUnavailableError);
  });

  it('returns the binding and key when both are present', () => {
    const fetcher = bind(async () => new Response('x'));
    expect(getMediaTools()).toEqual({ fetcher, key: 'k-123' });
  });
});

describe('mediaTransform', () => {
  it('binding absent → null, so the caller runs its local path', async () => {
    expect(await mediaTransform(bytes, { w: 100, format: 'webp' })).toBeNull();
  });

  it('binding present → calls media-tools with the key and returns bytes and size', async () => {
    const fetcher = bind(async () => image(WEBP));
    const out = await mediaTransform(bytes, {
      w: 100,
      fit: 'inside',
      format: 'webp',
      q: 30,
      orient: false,
    });
    expect(out).toEqual({ data: WEBP, width: 100, height: 50 });

    const [url, init] = fetcher.fetch.mock.calls[0];
    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/v1/image/transform');
    expect(Object.fromEntries(parsed.searchParams)).toEqual({
      w: '100',
      fit: 'inside',
      format: 'webp',
      q: '30',
      orient: '0',
    });
    expect(init?.method).toBe('POST');
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect((init?.headers as Record<string, string>)['x-media-tools-key']).toBe('k-123');
  });

  it('5xx → retryable MediaToolsUnavailableError, not a local fallback', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    bind(async () => new Response('{"error":{"code":"busy","message":"busy"}}', { status: 503 }));
    const err = await rejection(mediaTransform(bytes, { w: 100 }));
    expect(err).toBeInstanceOf(MediaToolsUnavailableError);
    expect(err).toMatchObject({ status: 503, retryable: true });
  });

  it('network failure → MediaToolsUnavailableError', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    bind(async () => {
      throw new TypeError('fetch failed');
    });
    expect(await rejection(mediaTransform(bytes, { w: 100 }))).toBeInstanceOf(
      MediaToolsUnavailableError,
    );
  });

  it('4xx → MediaToolsError with the service status and message, not "unavailable"', async () => {
    bind(
      async () =>
        new Response(
          JSON.stringify({
            error: { code: 'bad_request', message: 'extract area is outside the image' },
          }),
          { status: 400 },
        ),
    );
    const err = await rejection(mediaTransform(bytes, { extract: '0,0,9,9' }));
    expect(err).toBeInstanceOf(MediaToolsError);
    expect(err).not.toBeInstanceOf(MediaToolsUnavailableError);
    expect(err).toMatchObject({
      status: 400,
      code: 'bad_request',
      message: 'extract area is outside the image',
    });
  });

  it('a 200 whose bytes are not the requested format → unavailable', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    bind(async () => image(JPEG));
    expect(await rejection(mediaTransform(bytes, { format: 'webp' }))).toBeInstanceOf(
      MediaToolsUnavailableError,
    );
  });

  it('a 200 with an empty body → unavailable', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    bind(async () => image(Buffer.alloc(0)));
    expect(await rejection(mediaTransform(bytes, { format: 'webp' }))).toBeInstanceOf(
      MediaToolsUnavailableError,
    );
  });

  it('a 200 without size headers → unavailable', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    bind(async () => new Response(new Uint8Array(WEBP)));
    expect(await rejection(mediaTransform(bytes, { format: 'webp' }))).toBeInstanceOf(
      MediaToolsUnavailableError,
    );
  });

  it('refuses inputs over the Worker memory cap before sending them', async () => {
    const fetcher = bind(async () => image(WEBP));
    const big = new Uint8Array(MAX_REMOTE_BYTES + 1);
    const err = await rejection(mediaTransform(big, { w: 100 }));
    expect(err).toMatchObject({ status: 413, code: 'file_too_large' });
    expect(fetcher.fetch).not.toHaveBeenCalled();
  });
});

describe('deadline', () => {
  it('a fetch that never answers (and ignores the signal) → unavailable', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    bind(() => new Promise<Response>(() => {}));
    const err = await rejection(mediaToolsCall('/v1/image/focal', {}, bytes, (d) => d, 20));
    expect(err).toBeInstanceOf(MediaToolsUnavailableError);
  });

  it('a parse that never finishes → unavailable', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    bind(async () => new Response('{}'));
    const err = await rejection(
      mediaToolsCall('/v1/image/focal', {}, bytes, () => new Promise(() => {}), 20),
    );
    expect(err).toBeInstanceOf(MediaToolsUnavailableError);
  });
});

describe('mediaToolsJson', () => {
  it('returns a JSON result that passes the shape check', async () => {
    bind(async () => Response.json({ x: 0.25, y: 0.75, width: 10, height: 10 }));
    expect(await mediaToolsJson('/v1/image/focal', {}, bytes, isFocalResult)).toMatchObject({
      x: 0.25,
      y: 0.75,
    });
  });

  it('a JSON result with the wrong shape → unavailable', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    bind(async () => Response.json({ x: 'left' }));
    expect(
      await rejection(mediaToolsJson('/v1/image/focal', {}, bytes, isFocalResult)),
    ).toBeInstanceOf(MediaToolsUnavailableError);
  });

  it('a body that is not JSON → unavailable', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    bind(async () => new Response('<html>'));
    expect(
      await rejection(mediaToolsJson('/v1/image/focal', {}, bytes, isFocalResult)),
    ).toBeInstanceOf(MediaToolsUnavailableError);
  });
});

describe('mediaPdfCompress', () => {
  it('returns the PDF and the kept-original flag', async () => {
    bind(async () => new Response(new Uint8Array(PDF), { headers: { 'x-kept-original': 'true' } }));
    expect(await mediaPdfCompress(PDF, {})).toEqual({ data: PDF, keptOriginal: true });
  });

  it('a 200 that is not a PDF → unavailable', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    bind(async () => new Response('oops'));
    expect(await rejection(mediaPdfCompress(PDF, {}))).toBeInstanceOf(MediaToolsUnavailableError);
  });
});

describe('hasMagic', () => {
  it('recognises each format and rejects the others', () => {
    expect(hasMagic(WEBP, 'webp')).toBe(true);
    expect(hasMagic(JPEG, 'jpeg')).toBe(true);
    expect(hasMagic(PDF, 'pdf')).toBe(true);
    expect(hasMagic(JPEG, 'webp')).toBe(false);
    expect(hasMagic(WEBP, 'pdf')).toBe(false);
  });
});

describe('getImageMetadata', () => {
  it('uses media-tools when bound', async () => {
    const meta = {
      format: 'jpeg',
      width: 50,
      height: 100,
      storedWidth: 100,
      storedHeight: 50,
      orientation: 6,
    };
    bind(async () => Response.json(meta));
    expect(await getImageMetadata(bytes)).toEqual(meta);
  });
});

// ── F1: every body read under one deadline; only a real envelope is a user error ──

/** A body that never yields a byte; records whether the reader was cancelled. */
function stalledBody() {
  const cancel = vi.fn();
  const stream = new ReadableStream<Uint8Array>({
    pull: () => new Promise<void>(() => {}),
    cancel,
  });
  return { stream, cancel };
}

describe('mediaToolsCall — 4xx bodies', () => {
  const call = () => mediaToolsCall('/v1/image/metadata', {}, bytes, (d) => d, 1_000);

  it('a 4xx whose body stalls is cancelled at the deadline and the fetch aborted → unavailable', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { stream, cancel } = stalledBody();
    let signal: AbortSignal | undefined;
    bind(async (_url, init) => {
      signal = init?.signal ?? undefined;
      return new Response(stream, { status: 400 });
    });

    const pending = rejection(call());
    await vi.advanceTimersByTimeAsync(999);
    expect(cancel).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    const err = await pending;

    expect(err).toBeInstanceOf(MediaToolsUnavailableError);
    expect(err).toMatchObject({ status: 503, retryable: true });
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(signal?.aborted).toBe(true);
  });

  it('a 4xx whose body breaks off mid-read → unavailable', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    bind(
      async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(c) {
              c.enqueue(new TextEncoder().encode('{"error":{"co'));
              c.error(new Error('connection reset'));
            },
          }),
          { status: 400 },
        ),
    );
    expect(await rejection(call())).toBeInstanceOf(MediaToolsUnavailableError);
  });

  it.each([
    ['an empty body', ''],
    ['malformed JSON', '{"error":{"code":"bad_request",'],
    ['an HTML error page', '<html><body>404 Not Found</body></html>'],
    ['JSON without the error envelope', '{"message":"not found"}'],
    ['an envelope missing its message', '{"error":{"code":"bad_request"}}'],
    ['an envelope with an empty code', '{"error":{"code":"","message":"x"}}'],
    ['an envelope with non-string fields', '{"error":{"code":400,"message":["x"]}}'],
  ])('a 4xx with %s → unavailable, never a user error', async (_label, body) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    bind(async () => new Response(body, { status: 404 }));
    const err = await rejection(call());
    expect(err).toBeInstanceOf(MediaToolsUnavailableError);
  });

  it('a 4xx body over the envelope cap is cancelled → unavailable', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const cancel = vi.fn();
    bind(
      async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            pull(c) {
              c.enqueue(new Uint8Array(16 * 1024).fill(0x20));
            },
            cancel,
          }),
          { status: 400 },
        ),
    );
    expect(await rejection(call())).toBeInstanceOf(MediaToolsUnavailableError);
    expect(cancel).toHaveBeenCalled();
  });

  it('a well-formed media-tools 4xx stays a user error with its status, code and message', async () => {
    bind(
      async () =>
        new Response(JSON.stringify({ error: { code: 'file_too_large', message: 'Too big.' } }), {
          status: 413,
        }),
    );
    const err = await rejection(call());
    expect(err).toBeInstanceOf(MediaToolsError);
    expect(err).not.toBeInstanceOf(MediaToolsUnavailableError);
    expect(err).toMatchObject({ status: 413, code: 'file_too_large', message: 'Too big.' });
  });
});

describe('mediaToolsCall — 2xx bodies', () => {
  it('a 2xx whose body stalls is cancelled at the deadline → unavailable', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { stream, cancel } = stalledBody();
    let signal: AbortSignal | undefined;
    bind(async (_url, init) => {
      signal = init?.signal ?? undefined;
      return new Response(stream, { headers: { 'x-width': '1', 'x-height': '1' } });
    });

    const pending = rejection(mediaToolsCall('/v1/image/transform', {}, bytes, (d) => d, 500));
    await vi.advanceTimersByTimeAsync(500);
    expect(await pending).toBeInstanceOf(MediaToolsUnavailableError);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(signal?.aborted).toBe(true);
  });

  it('clears its deadline timer once the call settles', async () => {
    vi.useFakeTimers();
    bind(async () => Response.json({ x: 0.5, y: 0.5 }));
    await mediaToolsJson('/v1/image/focal', {}, bytes, isFocalResult);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('a 3xx → unavailable', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    bind(async () => new Response(null, { status: 302, headers: { location: '/x' } }));
    expect(await rejection(mediaToolsCall('/v1/image/focal', {}, bytes, (d) => d))).toBeInstanceOf(
      MediaToolsUnavailableError,
    );
  });
});

// ── F3: structural validation per format ────────────────────────────────

/** Copy `b` and overwrite a little-endian u32 at `at`. */
function patchU32LE(b: Buffer, at: number, value: number): Buffer {
  const c = Buffer.from(b);
  c.writeUInt32LE(value >>> 0, at);
  return c;
}
function patchU32BE(b: Buffer, at: number, value: number): Buffer {
  const c = Buffer.from(b);
  c.writeUInt32BE(value >>> 0, at);
  return c;
}

describe('isCompleteFile — complete files pass', () => {
  it('accepts every real encoding', () => {
    expect(isCompleteFile(WEBP, 'webp')).toBe(true);
    expect(isCompleteFile(WEBP_LOSSLESS, 'webp')).toBe(true);
    expect(isCompleteFile(WEBP_ALPHA, 'webp')).toBe(true);
    expect(isCompleteFile(JPEG, 'jpeg')).toBe(true);
    expect(isCompleteFile(PNG, 'png')).toBe(true);
    expect(isCompleteFile(AVIF, 'avif')).toBe(true);
    expect(isCompleteFile(PDF, 'pdf')).toBe(true);
  });

  it('rejects a complete file of another format', () => {
    expect(isCompleteFile(JPEG, 'webp')).toBe(false);
    expect(isCompleteFile(WEBP, 'jpeg')).toBe(false);
    expect(isCompleteFile(PNG, 'pdf')).toBe(false);
    expect(isCompleteFile(PDF, 'png')).toBe(false);
  });
});

describe('isCompleteFile — WebP', () => {
  it('rejects the first 16 bytes of a real WebP (the reviewed repro)', () => {
    expect(hasMagic(WEBP.subarray(0, 16), 'webp')).toBe(true);
    expect(isCompleteFile(WEBP.subarray(0, 16), 'webp')).toBe(false);
  });

  it.each([1, 2, 7, 20])('rejects a WebP truncated by %i bytes', (cut) => {
    expect(isCompleteFile(WEBP.subarray(0, WEBP.length - cut), 'webp')).toBe(false);
    expect(isCompleteFile(WEBP_ALPHA.subarray(0, WEBP_ALPHA.length - cut), 'webp')).toBe(false);
  });

  it('rejects a RIFF size that lies about the file length', () => {
    expect(isCompleteFile(patchU32LE(WEBP, 4, WEBP.length), 'webp')).toBe(false);
    expect(isCompleteFile(patchU32LE(WEBP, 4, WEBP.length - 10), 'webp')).toBe(false);
  });

  it('rejects a truncated WebP whose RIFF size was rewritten to match, because the chunk size still lies', () => {
    const cut = Buffer.from(WEBP.subarray(0, WEBP.length - 10));
    cut.writeUInt32LE(cut.length - 8, 4);
    expect(isCompleteFile(cut, 'webp')).toBe(false);
  });

  it('rejects a first chunk size larger than the buffer', () => {
    expect(isCompleteFile(patchU32LE(WEBP, 16, 0x7fffffff), 'webp')).toBe(false);
  });

  it('rejects a first chunk that is not VP8/VP8L/VP8X', () => {
    const c = Buffer.from(WEBP);
    c.write('JUNK', 12, 'latin1');
    expect(isCompleteFile(c, 'webp')).toBe(false);
  });
});

describe('isCompleteFile — JPEG', () => {
  it.each([1, 2, 50])('rejects a JPEG truncated by %i bytes (no EOI)', (cut) => {
    expect(isCompleteFile(JPEG.subarray(0, JPEG.length - cut), 'jpeg')).toBe(false);
  });

  it('rejects a JPEG cut inside its headers even with an EOI glued on', () => {
    const cut = Buffer.concat([JPEG.subarray(0, 40), Buffer.from([0xff, 0xd9])]);
    expect(isCompleteFile(cut, 'jpeg')).toBe(false);
  });

  it('rejects a segment whose declared length runs past the buffer', () => {
    // JPEG[2..3] is the first marker (APP0/DQT); its length is at [4..5].
    const c = Buffer.from(JPEG);
    c.writeUInt16BE(0xfff0, 4);
    expect(isCompleteFile(c, 'jpeg')).toBe(false);
  });

  it('rejects a segment length below 2', () => {
    const c = Buffer.from(JPEG);
    c.writeUInt16BE(1, 4);
    expect(isCompleteFile(c, 'jpeg')).toBe(false);
  });

  it('rejects SOI and EOI with nothing between', () => {
    expect(
      isCompleteFile(Buffer.from([0xff, 0xd8, 0xff, 0xd9, 0xff, 0xd9, 0xff, 0xd9]), 'jpeg'),
    ).toBe(false);
  });
});

describe('isCompleteFile — PNG', () => {
  it.each([1, 12, 30])('rejects a PNG truncated by %i bytes (no IEND at the end)', (cut) => {
    expect(isCompleteFile(PNG.subarray(0, PNG.length - cut), 'png')).toBe(false);
  });

  it('rejects a PNG cut mid-IDAT with an IEND glued on', () => {
    const iend = PNG.subarray(PNG.length - 12);
    const cut = Buffer.concat([PNG.subarray(0, PNG.length - 20), iend]);
    expect(isCompleteFile(cut, 'png')).toBe(false);
  });

  it('rejects an IHDR whose length lies', () => {
    expect(isCompleteFile(patchU32BE(PNG, 8, 0x7fffffff), 'png')).toBe(false);
    expect(isCompleteFile(patchU32BE(PNG, 8, 12), 'png')).toBe(false);
  });

  it('rejects bytes after IEND', () => {
    expect(isCompleteFile(Buffer.concat([PNG, Buffer.from([0])]), 'png')).toBe(false);
  });
});

describe('isCompleteFile — AVIF', () => {
  it.each([1, 10])('rejects an AVIF truncated by %i bytes', (cut) => {
    expect(isCompleteFile(AVIF.subarray(0, AVIF.length - cut), 'avif')).toBe(false);
  });

  it('rejects a box size that runs past the buffer', () => {
    expect(isCompleteFile(patchU32BE(AVIF, 0, AVIF.length + 1), 'avif')).toBe(false);
  });
});

describe('isCompleteFile — PDF', () => {
  it('rejects a PDF with no %%EOF trailer', () => {
    expect(isCompleteFile(PDF.subarray(0, PDF.length - 7), 'pdf')).toBe(false);
  });

  it('rejects a PDF whose only %%EOF is far from the end (truncated after an update)', () => {
    const body = Buffer.concat([PDF, Buffer.alloc(4096, 0x20)]);
    expect(isCompleteFile(body, 'pdf')).toBe(false);
  });

  it('rejects a body that only starts like a PDF', () => {
    expect(isCompleteFile(Buffer.from('%PDF\n%%EOF\n........', 'latin1'), 'pdf')).toBe(false);
  });
});

describe('truncated responses never become variants', () => {
  it.each([
    ['webp', () => WEBP],
    ['jpeg', () => JPEG],
    ['png', () => PNG],
    ['avif', () => AVIF],
  ] as const)('a truncated %s transform response → unavailable', async (format, file) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const full = file();
    bind(async () => image(full.subarray(0, full.length - 5)));
    expect(await rejection(mediaTransform(bytes, { format }))).toBeInstanceOf(
      MediaToolsUnavailableError,
    );
  });

  it('each complete transform response is accepted', async () => {
    for (const [format, file] of [
      ['webp', WEBP],
      ['jpeg', JPEG],
      ['png', PNG],
      ['avif', AVIF],
    ] as const) {
      bind(async () => image(file));
      expect((await mediaTransform(bytes, { format }))?.data).toEqual(file);
    }
  });

  it('a truncated PDF compress response → unavailable', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    bind(async () => new Response(new Uint8Array(PDF.subarray(0, PDF.length - 7))));
    expect(await rejection(mediaPdfCompress(PDF, {}))).toBeInstanceOf(MediaToolsUnavailableError);
  });
});

// ── F4: size checked before buffering; capped read; no second copy ───────

/** A fake R2 GetObject body that counts what it hands out. */
function objectBody(total: number, chunk = 1024 * 1024) {
  let served = 0;
  const cancel = vi.fn();
  const transformToByteArray = vi.fn(async () => new Uint8Array(total));
  const transformToWebStream = vi.fn(
    () =>
      new ReadableStream<Uint8Array>({
        pull(c) {
          if (served >= total) return c.close();
          const n = Math.min(chunk, total - served);
          served += n;
          c.enqueue(new Uint8Array(n).fill(7));
        },
        cancel,
      }),
  );
  return {
    body: { transformToByteArray, transformToWebStream },
    cancel,
    transformToByteArray,
    served: () => served,
  };
}

describe('readObjectBody', () => {
  it('MEDIA not bound: exactly the old full read', async () => {
    const o = objectBody(100);
    const out = await readObjectBody(o.body, 100);
    expect(out).toEqual(Buffer.alloc(100));
    expect(o.transformToByteArray).toHaveBeenCalledTimes(1);
    expect(o.body.transformToWebStream).not.toHaveBeenCalled();
  });

  it('MEDIA not bound: no cap, even over 40 MB', async () => {
    const o = objectBody(MAX_REMOTE_BYTES + 1);
    expect((await readObjectBody(o.body, MAX_REMOTE_BYTES + 1)).length).toBe(MAX_REMOTE_BYTES + 1);
  });

  it('MEDIA bound: a declared length over the cap → 413 without reading a byte', async () => {
    const fetcher = bind(async () => new Response('x'));
    const o = objectBody(MAX_REMOTE_BYTES + 1);
    const err = await rejection(readObjectBody(o.body, MAX_REMOTE_BYTES + 1));
    expect(err).toBeInstanceOf(MediaToolsError);
    expect(err).not.toBeInstanceOf(MediaToolsUnavailableError);
    expect(err).toMatchObject({ status: 413, code: 'file_too_large' });
    expect(o.transformToByteArray).not.toHaveBeenCalled();
    expect(o.served()).toBe(0);
    expect(fetcher.fetch).not.toHaveBeenCalled();
  });

  it('MEDIA bound: no declared length → stops reading as soon as the cap is passed', async () => {
    bind(async () => new Response('x'));
    const o = objectBody(MAX_REMOTE_BYTES * 3);
    const err = await rejection(readObjectBody(o.body, undefined));
    expect(err).toMatchObject({ status: 413, code: 'file_too_large' });
    expect(o.transformToByteArray).not.toHaveBeenCalled();
    // At most one chunk past the cap was pulled, then the stream was cancelled.
    expect(o.served()).toBeLessThanOrEqual(MAX_REMOTE_BYTES + 2 * 1024 * 1024);
    expect(o.cancel).toHaveBeenCalled();
  });

  it('MEDIA bound: a declared length that understates the body is still capped', async () => {
    bind(async () => new Response('x'));
    const o = objectBody(MAX_REMOTE_BYTES * 2);
    const err = await rejection(readObjectBody(o.body, 1024));
    expect(err).toMatchObject({ status: 413 });
    expect(o.served()).toBeLessThanOrEqual(MAX_REMOTE_BYTES + 2 * 1024 * 1024);
  });

  it('MEDIA bound: a body within the cap is read whole into one buffer', async () => {
    bind(async () => new Response('x'));
    const size = 3 * 1024 * 1024 + 17;
    const o = objectBody(size, 64 * 1024);
    const out = await readObjectBody(o.body, size);
    expect(out.length).toBe(size);
    expect(out.every((b) => b === 7)).toBe(true);
    // Wrapped, not copied: the Buffer is a view over exactly `size` bytes.
    expect(out.buffer.byteLength).toBe(size);
    expect(o.transformToByteArray).not.toHaveBeenCalled();
  });
});
