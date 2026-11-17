/**
 * The one door from HelloKahwin to the shared media-tools service (ported
 * unchanged in contract from twn-new `src/lib/media/media-client.ts`).
 *
 * When the app runs on Cloudflare Workers, sharp and Ghostscript cannot run
 * in-process, so pixel and PDF work goes to the private `media-tools` Worker
 * over a service binding (API: media-tools `docs/api.md`). Everywhere else —
 * Vercel, `pnpm dev`, tests — the binding is absent and every caller keeps the
 * code it already had. Nothing changes behaviour on Vercel.
 *
 * Bindings, read from the OpenNext Cloudflare context
 * (`globalThis[Symbol.for('__cloudflare-context__')].env`, the object
 * `getCloudflareContext()` returns), declared in `wrangler.jsonc` `env.production`:
 *
 *   - `MEDIA`            service binding (Fetcher) → `media-tools-twn` (the TWN
 *                        Cloudflare account's deploy of media-tools)
 *                        wrangler: `"services": [{ "binding": "MEDIA", "service": "media-tools-twn" }]`
 *   - `MEDIA_TOOLS_KEY`  secret, the same value as the media-tools Worker's own key
 *
 * Failure policy, the contract every caller relies on:
 *   - `MEDIA` absent                     → `null`: the caller runs its local
 *                                          path (Vercel, local, tests).
 *   - `MEDIA` present, key missing       → throws `MediaToolsUnavailableError`
 *                                          (a misconfigured Worker; never sharp).
 *   - network error, 5xx, deadline, or a
 *     body that is empty, malformed or
 *     structurally incomplete            → throws `MediaToolsUnavailableError`
 *                                          (503, retryable). On Workers there is
 *                                          no local engine to fall back to, and
 *                                          this must never read as a bad file.
 *   - a 4xx carrying media-tools' own
 *     `{ error: { code, message } }`     → throws `MediaToolsError` with the
 *                                          service's status, so a user error
 *                                          stays a user error. A 4xx without
 *                                          that envelope is unavailable.
 *   - a source over `MAX_REMOTE_BYTES`   → `MediaToolsError` 413, refused
 *                                          before it is buffered where the
 *                                          caller reads through `readObjectBody`.
 *
 * sharp and Ghostscript are only ever loaded with a dynamic `import()` on the
 * local path, so a Workers bundle never evaluates the native module.
 */

export interface MediaFetcher {
  fetch(input: string, init?: RequestInit): Promise<Response>;
}

export interface MediaTools {
  fetcher: MediaFetcher;
  key: string;
}

/** media-tools refused the input (4xx), or is unavailable (subclass, 503). */
export class MediaToolsError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'MediaToolsError';
    this.status = status;
    this.code = code;
  }
}

/** media-tools could not be reached or answered badly. Retry later; the file is fine. */
export class MediaToolsUnavailableError extends MediaToolsError {
  readonly retryable = true;

  constructor(message: string) {
    super(503, 'media_tools_unavailable', message);
    this.name = 'MediaToolsUnavailableError';
  }
}

export function isMediaToolsUnavailable(err: unknown): err is MediaToolsUnavailableError {
  return err instanceof MediaToolsUnavailableError;
}

const CONTEXT_SYMBOL = Symbol.for('__cloudflare-context__');

/**
 * Largest body sent to media-tools. A Worker isolate has 128 MB and holds both
 * the input and the result, so stay well under half of it.
 */
export const MAX_REMOTE_BYTES = 40 * 1024 * 1024;

/** Each deadline covers the fetch, the body read (2xx or 4xx) and validation together. */
const IMAGE_DEADLINE_MS = 35_000;
const PDF_DEADLINE_MS = 130_000;

const UNAVAILABLE = 'Image processing is unavailable right now. Try again in a moment.';

/**
 * The binding and key when `MEDIA` is bound, `null` when it is not (local
 * path). A bound `MEDIA` without a key is a misconfiguration and throws.
 */
export function getMediaTools(): MediaTools | null {
  const ctx = (globalThis as Record<symbol, unknown>)[CONTEXT_SYMBOL] as
    { env?: Record<string, unknown> } | undefined;
  const env = ctx?.env;
  const fetcher = env?.MEDIA as MediaFetcher | undefined;
  if (!fetcher || typeof fetcher.fetch !== 'function') return null;
  const key = env?.MEDIA_TOOLS_KEY;
  if (typeof key !== 'string' || key.length === 0) {
    console.error('[media-tools] MEDIA is bound but MEDIA_TOOLS_KEY is missing');
    throw new MediaToolsUnavailableError(UNAVAILABLE);
  }
  return { fetcher, key };
}

export type MediaParams = Record<string, string | number | boolean | undefined | null>;

function toQuery(params: MediaParams): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    q.set(k, typeof v === 'boolean' ? (v ? '1' : '0') : String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

/** Largest error envelope read from a 4xx; real ones are a few hundred bytes. */
const MAX_ERROR_BODY_BYTES = 64 * 1024;

class DeadlineError extends Error {
  constructor() {
    super('media-tools deadline exceeded');
    this.name = 'DeadlineError';
  }
}

/**
 * Read `stream` into one `Uint8Array`, never holding more than `cap` bytes.
 * Returns `null` once the stream passes `cap`. `expectedBytes` (a declared
 * length) sizes the buffer up front so a well-behaved body is never copied.
 *
 * Every read is raced against `deadline` when one is given. On overflow,
 * expiry or a read error the reader is cancelled (so nothing keeps pulling
 * bytes) and `onAbort` runs (so the caller can abort its fetch).
 */
export async function readStreamCapped(
  stream: ReadableStream<Uint8Array> | null | undefined,
  cap: number,
  opts: { expectedBytes?: number; deadline?: Promise<never>; onAbort?: () => void } = {},
): Promise<Uint8Array | null> {
  if (!stream) return new Uint8Array(0);
  const reader = stream.getReader();
  const expected = opts.expectedBytes;
  let buf = new Uint8Array(
    expected !== undefined && expected >= 0 && expected <= cap
      ? expected
      : Math.min(cap, 64 * 1024),
  );
  let total = 0;
  const stop = (reason: unknown) => {
    opts.onAbort?.();
    reader.cancel(reason).catch(() => {});
  };
  try {
    for (;;) {
      const next = reader.read();
      const { done, value } = opts.deadline
        ? await Promise.race([next, opts.deadline])
        : await next;
      if (done) break;
      if (!value || value.byteLength === 0) continue;
      const needed = total + value.byteLength;
      if (needed > cap) {
        stop(new Error('stream exceeds the size cap'));
        return null;
      }
      if (needed > buf.byteLength) {
        const grown = new Uint8Array(Math.min(cap, Math.max(needed, buf.byteLength * 2)));
        grown.set(buf.subarray(0, total));
        buf = grown;
      }
      buf.set(value, total);
      total = needed;
    }
  } catch (err) {
    stop(err);
    throw err;
  }
  return buf.subarray(0, total);
}

/** The error a caller sees when a source is over the media-tools memory cap. */
export function remoteTooLargeError(bytes?: number): MediaToolsError {
  const size = bytes !== undefined ? ` (${Math.ceil(bytes / 1024 / 1024)} MB)` : '';
  return new MediaToolsError(
    413,
    'file_too_large',
    `This file is too large to process on this server${size}; ` +
      `the limit is ${MAX_REMOTE_BYTES / 1024 / 1024} MB.`,
  );
}

/** The parts of an S3/R2 `GetObject` body this module uses. */
export interface ObjectBody {
  transformToByteArray(): Promise<Uint8Array>;
  transformToWebStream(): ReadableStream<Uint8Array>;
}

/**
 * Read an R2 object body whose bytes may be sent to media-tools.
 *
 * `MEDIA` not bound (Vercel, local, tests): exactly the old read,
 * `Buffer.from(await body.transformToByteArray())`.
 *
 * `MEDIA` bound (Workers, 128 MB isolate): a declared length over
 * `MAX_REMOTE_BYTES` is refused without reading a byte; otherwise the body is
 * read through a capped reader that stops as soon as it passes the cap (the
 * length can be absent or wrong), into one buffer that is wrapped, not copied.
 * Over the cap → `MediaToolsError` 413 `file_too_large`; the stored object is
 * untouched.
 */
export async function readObjectBody(
  body: ObjectBody,
  contentLength: number | undefined,
): Promise<Buffer> {
  if (!getMediaTools()) return Buffer.from(await body.transformToByteArray());
  if (contentLength !== undefined && contentLength > MAX_REMOTE_BYTES) {
    try {
      body
        .transformToWebStream()
        .cancel()
        .catch(() => {});
    } catch {
      // Releasing the connection is best-effort; nothing was read either way.
    }
    throw remoteTooLargeError(contentLength);
  }
  const data = await readStreamCapped(body.transformToWebStream(), MAX_REMOTE_BYTES, {
    expectedBytes: contentLength,
  });
  if (!data) throw remoteTooLargeError();
  return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
}

/**
 * A media-tools 4xx envelope, `{ "error": { "code": "...", "message": "..." } }`
 * with both strings non-empty. Anything else is not a media-tools user error.
 */
function parseErrorEnvelope(data: Uint8Array): { code: string; message: string } | null {
  if (data.byteLength === 0) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data));
  } catch {
    return null;
  }
  const error = (parsed as { error?: unknown } | null)?.error as
    { code?: unknown; message?: unknown } | null | undefined;
  if (!error || typeof error !== 'object') return null;
  const { code, message } = error;
  if (typeof code !== 'string' || code.length === 0) return null;
  if (typeof message !== 'string' || message.length === 0) return null;
  return { code, message };
}

/**
 * POST raw bytes to a media-tools endpoint. One `AbortController` and one
 * timer cover the whole call: the fetch, the body read (2xx and 4xx alike) and
 * `parse`. On expiry the fetch is aborted and the body reader cancelled.
 * Returns `null` only when `MEDIA` is not bound.
 *
 * - network error, 5xx, deadline, a body over the cap, or anything `parse`
 *   throws → `MediaToolsUnavailableError` (retryable).
 * - 4xx with a well-formed media-tools error envelope → `MediaToolsError`
 *   with that status, code and message (a user error).
 * - 4xx whose body is missing, malformed, oversized, stalled or fails to read
 *   → `MediaToolsUnavailableError`: it did not come from media-tools' own
 *   handler, so it says nothing about the file.
 */
export async function mediaToolsCall<T>(
  path: string,
  params: MediaParams,
  body: Uint8Array,
  parse: (data: Uint8Array, headers: Headers) => T | Promise<T>,
  deadlineMs: number = IMAGE_DEADLINE_MS,
): Promise<T | null> {
  const tools = getMediaTools();
  if (!tools) return null;

  if (body.byteLength > MAX_REMOTE_BYTES) throw remoteTooLargeError(body.byteLength);

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new DeadlineError();
      controller.abort(err);
      reject(err);
    }, deadlineMs);
  });
  deadline.catch(() => {}); // observed by the races below; never an unhandled rejection
  const abort = () => controller.abort();

  try {
    let res: Response;
    try {
      res = await Promise.race([
        tools.fetcher.fetch(`https://media-tools${path}${toQuery(params)}`, {
          method: 'POST',
          headers: {
            'x-media-tools-key': tools.key,
            'content-type': 'application/octet-stream',
          },
          body: body as BodyInit,
          signal: controller.signal,
        }),
        deadline,
      ]);
    } catch (err) {
      console.warn(`[media-tools] ${path} unreachable`, err);
      abort();
      throw new MediaToolsUnavailableError(UNAVAILABLE);
    }

    if (res.status < 200 || (res.status >= 300 && res.status < 400) || res.status >= 500) {
      console.warn(`[media-tools] ${path} returned ${res.status}`);
      res.body?.cancel().catch(() => {});
      abort();
      throw new MediaToolsUnavailableError(UNAVAILABLE);
    }

    if (res.status >= 400) {
      let envelope: { code: string; message: string } | null = null;
      try {
        const data = await readStreamCapped(res.body, MAX_ERROR_BODY_BYTES, {
          deadline,
          onAbort: abort,
        });
        envelope = data ? parseErrorEnvelope(data) : null;
      } catch (err) {
        console.warn(`[media-tools] ${path} ${res.status} body could not be read`, err);
      }
      if (!envelope) {
        console.warn(`[media-tools] ${path} returned ${res.status} without a valid error body`);
        throw new MediaToolsUnavailableError(UNAVAILABLE);
      }
      throw new MediaToolsError(res.status, envelope.code, envelope.message);
    }

    try {
      const data = await readStreamCapped(res.body, MAX_REMOTE_BYTES, {
        deadline,
        onAbort: abort,
      });
      if (!data) throw new Error(`response is larger than ${MAX_REMOTE_BYTES} bytes`);
      return await Promise.race([Promise.resolve().then(() => parse(data, res.headers)), deadline]);
    } catch (err) {
      console.warn(`[media-tools] ${path} returned an unusable response`, err);
      throw new MediaToolsUnavailableError(UNAVAILABLE);
    }
  } finally {
    clearTimeout(timer);
  }
}

/** A JSON endpoint whose result must pass `isValid`. `null` = local path. */
export async function mediaToolsJson<T>(
  path: string,
  params: MediaParams,
  body: Uint8Array,
  isValid: (value: unknown) => value is T,
): Promise<T | null> {
  return mediaToolsCall(path, params, body, (data) => {
    const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data));
    if (!isValid(value)) throw new Error(`unexpected JSON shape from ${path}`);
    return value;
  });
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export type MagicFormat = 'webp' | 'jpeg' | 'png' | 'avif' | 'pdf';

/** Does `data` start with the file signature of `format`? Signature only; see `isCompleteFile`. */
export function hasMagic(data: Uint8Array, format: MagicFormat): boolean {
  const ascii = (from: number, to: number) => String.fromCharCode(...data.subarray(from, to));
  switch (format) {
    case 'webp':
      return data.length > 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';
    case 'jpeg':
      return data.length > 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
    case 'png':
      return data.length > 8 && data[0] === 0x89 && ascii(1, 4) === 'PNG';
    case 'avif':
      return data.length > 12 && ascii(4, 8) === 'ftyp';
    case 'pdf':
      return data.length > 4 && ascii(0, 4) === '%PDF';
  }
}

// ── Structural validation ──────────────────────────────────────────────
//
// A signature says what a file claims to be; these walks check that it is
// whole. Each container is walked from the start, every declared length must
// land inside the buffer, and the file must end where its structure says it
// does. A truncated or length-lying response fails here and is treated as
// media-tools being unavailable, so it never becomes a stored variant.

const latin1 = (d: Uint8Array, from: number, to: number) =>
  String.fromCharCode(...d.subarray(from, to));
const u32le = (d: Uint8Array, i: number) =>
  (d[i] | (d[i + 1] << 8) | (d[i + 2] << 16) | (d[i + 3] << 24)) >>> 0;
const u32be = (d: Uint8Array, i: number) =>
  ((d[i] << 24) | (d[i + 1] << 16) | (d[i + 2] << 8) | d[i + 3]) >>> 0;
const u16be = (d: Uint8Array, i: number) => (d[i] << 8) | d[i + 1];

/**
 * WebP: `RIFF` + little-endian size equal to `length - 8` + `WEBP`, a first
 * chunk of VP8/VP8L/VP8X, and chunks that tile the rest of the file exactly,
 * each declared size inside the buffer, with at least one image chunk.
 */
function isCompleteWebp(d: Uint8Array): boolean {
  if (d.length < 20 || latin1(d, 0, 4) !== 'RIFF' || latin1(d, 8, 12) !== 'WEBP') return false;
  if (u32le(d, 4) !== d.length - 8) return false;
  const first = latin1(d, 12, 16);
  if (first !== 'VP8 ' && first !== 'VP8L' && first !== 'VP8X') return false;
  let pos = 12;
  let hasImage = false;
  while (pos < d.length) {
    if (pos + 8 > d.length) return false;
    const type = latin1(d, pos, pos + 4);
    const size = u32le(d, pos + 4);
    if (pos + 8 + size > d.length) return false;
    if ((type === 'VP8 ' || type === 'VP8L' || type === 'ANMF') && size > 0) hasImage = true;
    const next = pos + 8 + size + (size & 1);
    // Only the last chunk may stop short of its pad byte.
    if (next > d.length && pos + 8 + size !== d.length) return false;
    pos = Math.min(next, d.length);
  }
  return hasImage;
}

/**
 * JPEG: `FF D8 FF` at the start, `FF D9` at the end, and a walk of the
 * segment markers to SOS with every declared length inside the buffer, a
 * frame header before the scan, and scan data after it.
 */
function isCompleteJpeg(d: Uint8Array): boolean {
  if (d.length < 8 || d[0] !== 0xff || d[1] !== 0xd8 || d[2] !== 0xff) return false;
  if (d[d.length - 2] !== 0xff || d[d.length - 1] !== 0xd9) return false;
  let pos = 2;
  let hasFrame = false;
  while (pos < d.length) {
    if (d[pos] !== 0xff) return false;
    while (pos < d.length && d[pos] === 0xff) pos++; // fill bytes
    if (pos >= d.length) return false;
    const marker = d[pos];
    pos++;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue; // no length field
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x00) return false;
    if (pos + 2 > d.length) return false;
    const len = u16be(d, pos);
    if (len < 2 || pos + len > d.length) return false;
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      hasFrame = true;
    }
    if (marker === 0xda) return hasFrame && pos + len < d.length - 2;
    pos += len;
  }
  return false;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * PNG: the 8-byte signature, IHDR first (13 bytes), every chunk's declared
 * length inside the buffer, IDAT present, and a zero-length IEND that ends
 * the file exactly.
 */
function isCompletePng(d: Uint8Array): boolean {
  if (d.length < 8 + 25 + 12 || PNG_SIGNATURE.some((b, i) => d[i] !== b)) return false;
  let pos = 8;
  let first = true;
  let hasData = false;
  while (pos < d.length) {
    if (pos + 12 > d.length) return false;
    const len = u32be(d, pos);
    const type = latin1(d, pos + 4, pos + 8);
    const end = pos + 12 + len;
    if (end > d.length) return false;
    if (first && (type !== 'IHDR' || len !== 13)) return false;
    first = false;
    if (type === 'IDAT') hasData = true;
    if (type === 'IEND') return len === 0 && end === d.length && hasData;
    pos = end;
  }
  return false;
}

/** AVIF (ISO-BMFF): `ftyp` first, boxes tiling the file exactly, `meta` and `mdat` present. */
function isCompleteAvif(d: Uint8Array): boolean {
  if (d.length < 16 || latin1(d, 4, 8) !== 'ftyp') return false;
  let pos = 0;
  const seen = new Set<string>();
  while (pos < d.length) {
    if (pos + 8 > d.length) return false;
    let size = u32be(d, pos);
    const type = latin1(d, pos + 4, pos + 8);
    if (size === 1) {
      if (pos + 16 > d.length || u32be(d, pos + 8) !== 0) return false;
      size = u32be(d, pos + 12);
      if (size < 16) return false;
    } else if (size === 0) {
      size = d.length - pos; // runs to the end of the file
    } else if (size < 8) {
      return false;
    }
    if (pos + size > d.length) return false;
    seen.add(type);
    pos += size;
  }
  return seen.has('meta') && seen.has('mdat');
}

/** PDF: `%PDF-` at the start and `%%EOF` in the last 1 KB. */
function isCompletePdf(d: Uint8Array): boolean {
  if (d.length < 16 || latin1(d, 0, 5) !== '%PDF-') return false;
  return latin1(d, Math.max(0, d.length - 1024), d.length).includes('%%EOF');
}

/**
 * Is `data` a structurally complete file of `format`? Checked on every
 * media-tools file response; `false` there means media-tools is unavailable.
 */
export function isCompleteFile(data: Uint8Array, format: MagicFormat): boolean {
  switch (format) {
    case 'webp':
      return isCompleteWebp(data);
    case 'jpeg':
      return isCompleteJpeg(data);
    case 'png':
      return isCompletePng(data);
    case 'avif':
      return isCompleteAvif(data);
    case 'pdf':
      return isCompletePdf(data);
    default:
      return false;
  }
}

/** Wrap, never copy, the bytes read from media-tools. */
const asBuffer = (d: Uint8Array) => Buffer.from(d.buffer, d.byteOffset, d.byteLength);

export interface TransformParams extends MediaParams {
  w?: number;
  h?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: string;
  fx?: number;
  fy?: number;
  /** `x,y,w,h` source crop, applied after orientation and `angle`. */
  extract?: string;
  angle?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'avif';
  q?: number;
  enlarge?: boolean;
  /** Apply EXIF orientation. media-tools defaults to true; sharp without `.rotate()` does not. */
  orient?: boolean;
}

export interface TransformResult {
  data: Buffer;
  width: number;
  height: number;
}

/** `/v1/image/transform`. `null` = local path. */
export async function mediaTransform(
  input: Uint8Array,
  params: TransformParams,
): Promise<TransformResult | null> {
  const format = params.format ?? 'webp';
  return mediaToolsCall('/v1/image/transform', params, input, (data, headers) => {
    if (!isCompleteFile(data, format)) {
      throw new Error(`response is not a complete ${format} image`);
    }
    const width = Number(headers.get('x-width'));
    const height = Number(headers.get('x-height'));
    if (!(width > 0 && height > 0)) throw new Error('response is missing x-width/x-height');
    return { data: asBuffer(data), width, height };
  });
}

export interface PdfCompressResult {
  data: Buffer;
  keptOriginal: boolean;
}

/** `/v1/pdf/compress`. `null` = local path. */
export async function mediaPdfCompress(
  input: Uint8Array,
  params: MediaParams,
): Promise<PdfCompressResult | null> {
  return mediaToolsCall(
    '/v1/pdf/compress',
    params,
    input,
    (data, headers) => {
      if (!isCompleteFile(data, 'pdf')) throw new Error('response is not a complete PDF');
      return { data: asBuffer(data), keptOriginal: headers.get('x-kept-original') === 'true' };
    },
    PDF_DEADLINE_MS,
  );
}

export interface ImageMetadata {
  format: string | undefined;
  /** Width after EXIF orientation. */
  width: number;
  /** Height after EXIF orientation. */
  height: number;
  /** Stored pixel width — what sharp's `metadata().width` reports. */
  storedWidth: number;
  /** Stored pixel height — what sharp's `metadata().height` reports. */
  storedHeight: number;
  orientation: number;
}

function isImageMetadata(v: unknown): v is ImageMetadata {
  const m = v as Partial<ImageMetadata> | null;
  return (
    !!m &&
    isNum(m.width) &&
    isNum(m.height) &&
    isNum(m.storedWidth) &&
    isNum(m.storedHeight) &&
    m.width > 0 &&
    m.height > 0 &&
    m.storedWidth > 0 &&
    m.storedHeight > 0
  );
}

/**
 * `/v1/image/metadata`, or sharp in-process when `MEDIA` is not bound; the
 * same shape either way. Throws on an unreadable image.
 */
export async function getImageMetadata(input: Buffer): Promise<ImageMetadata> {
  const remote = await mediaToolsJson('/v1/image/metadata', {}, input, isImageMetadata);
  if (remote) {
    return { ...remote, orientation: isNum(remote.orientation) ? remote.orientation : 1 };
  }

  const sharp = await loadSharp();
  const m = await sharp(input).metadata();
  const storedWidth = m.width ?? 0;
  const storedHeight = m.height ?? 0;
  const orientation = m.orientation ?? 1;
  const swap = orientation >= 5;
  return {
    format: m.format,
    width: swap ? storedHeight : storedWidth,
    height: swap ? storedWidth : storedHeight,
    storedWidth,
    storedHeight,
    orientation,
  };
}

/** Shape check for `/v1/image/focal`. */
export function isFocalResult(v: unknown): v is { x: number; y: number } {
  const f = v as { x?: unknown; y?: unknown } | null;
  return !!f && isNum(f.x) && isNum(f.y) && f.x >= 0 && f.x <= 1 && f.y >= 0 && f.y <= 1;
}

/** sharp, loaded only on the local path so a Workers bundle never evaluates it. */
export async function loadSharp(): Promise<typeof import('sharp')> {
  const mod = (await import('sharp')) as unknown as {
    default?: typeof import('sharp');
  } & typeof import('sharp');
  return mod.default ?? mod;
}
