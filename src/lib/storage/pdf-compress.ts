/**
 * Server-side "balanced" PDF compression via Ghostscript-WASM.
 *
 * Downsamples embedded images to ~150 DPI (screen quality) while leaving text
 * and vector graphics untouched — so brochures shrink dramatically but stay
 * sharp and selectable. The same engine backs the on-upload compress route
 * (`/api/v1/storage/compress-pdf`) and the `backfill-compress-pdfs` script.
 *
 * Node-only (uses `node:fs` to load the 16MB wasm). Safe in a `runtime='nodejs'`
 * route and in tsx scripts; never imported into client/browser code.
 *
 * Ghostscript is AGPL-3.0 (accepted, in-process). gs stamps a
 * `/Producer (... Ghostscript ...)` Info entry, which `isGhostscriptOutput`
 * uses for idempotency so re-runs never re-compress (and re-degrade) our output.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

// The emscripten factory is loaded at runtime (turbopackIgnore) rather than
// statically imported, so the production Turbopack build doesn't follow gs.mjs
// into gs.js + the 16MB gs.wasm (whose 'env'/'wasi_snapshot_preview1' imports
// aren't bundleable). The package is in `serverExternalPackages` and traced into
// the compress-pdf function, so it resolves from node_modules at runtime.
// (`typeof import(...)` is a type-only reference — it emits no runtime import.)
type InitGhostscript = typeof import('@jspawn/ghostscript-wasm/gs.mjs').default;
let initGhostscriptPromise: Promise<InitGhostscript> | null = null;
function loadInitGhostscript(): Promise<InitGhostscript> {
  if (!initGhostscriptPromise) {
    initGhostscriptPromise = import(
      /* turbopackIgnore: true */ '@jspawn/ghostscript-wasm/gs.mjs'
    ).then((m) => m.default);
  }
  return initGhostscriptPromise;
}

// Balanced profile: downsample raster images to screen resolution, keep text/vectors.
const BALANCED_FLAGS = [
  '-sDEVICE=pdfwrite',
  '-dCompatibilityLevel=1.5',
  '-dPDFSETTINGS=/ebook',
  '-dDownsampleColorImages=true',
  '-dColorImageResolution=150',
  '-dDownsampleGrayImages=true',
  '-dGrayImageResolution=150',
  '-dDownsampleMonoImages=true',
  '-dMonoImageResolution=300',
  '-dNOPAUSE',
  '-dBATCH',
  '-dQUIET',
];

let wasmBytes: Buffer | null = null;
let compiledModule: WebAssembly.Module | null = null;

function getWasmBytes(): Buffer {
  if (wasmBytes) return wasmBytes;
  let wasmPath: string;
  // Specifier assembled at runtime so the bundler doesn't treat gs.wasm as a module.
  const wasmSpecifier = ['@jspawn', 'ghostscript-wasm', 'gs.wasm'].join('/');
  try {
    wasmPath = require.resolve(wasmSpecifier);
  } catch {
    // Fallback for bundled runtimes where require.resolve can't see the chunk's node_modules.
    wasmPath = path.join(process.cwd(), 'node_modules', '@jspawn', 'ghostscript-wasm', 'gs.wasm');
  }
  wasmBytes = readFileSync(wasmPath);
  return wasmBytes;
}

// Compile the 16MB wasm once; instantiate a fresh module per run (gs is not re-entrant).
async function getCompiledModule(): Promise<WebAssembly.Module> {
  if (!compiledModule) {
    // new Uint8Array(...) yields a BufferSource backed by a plain ArrayBuffer
    // (Node's Buffer<ArrayBufferLike> isn't directly assignable).
    compiledModule = await WebAssembly.compile(new Uint8Array(getWasmBytes()));
    wasmBytes = null; // only the compiled module is needed now — free the 16MB source.
  }
  return compiledModule;
}

function isPdf(buf: Uint8Array): boolean {
  return buf.length > 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46; // %PDF
}

/** A complete PDF ends with a %%EOF trailer — guards against a smaller-but-truncated gs output. */
function endsWithEof(buf: Buffer): boolean {
  return buf
    .subarray(Math.max(0, buf.length - 1024))
    .toString('latin1')
    .includes('%%EOF');
}

/** True if the PDF was produced by Ghostscript (used to skip already-compressed files). */
export function isGhostscriptOutput(buf: Buffer): boolean {
  // The Info dict /Producer is plaintext and lives near the trailer (end) or, less
  // often, near the head. Scan only bounded head+tail windows: legacy brochures can
  // exceed 0.5GB, and buf.toString() over the whole thing throws ERR_STRING_TOO_LONG.
  const PRODUCER_RE = /\/Producer\s*\([^)]*Ghostscript[^)]*\)/i;
  const WINDOW = 1024 * 1024; // 1MB
  if (PRODUCER_RE.test(buf.subarray(0, Math.min(buf.length, WINDOW)).toString('latin1')))
    return true;
  if (buf.length > WINDOW) {
    if (PRODUCER_RE.test(buf.subarray(buf.length - WINDOW).toString('latin1'))) return true;
  }
  return false;
}

/** Runs gs over `input` with the balanced flags. Returns the output bytes, or null on failure. */
async function runGhostscript(input: Buffer): Promise<Buffer | null> {
  const compiled = await getCompiledModule();
  const log: string[] = [];

  const initGhostscript = await loadInitGhostscript();
  const Module = await initGhostscript({
    noInitialRun: true,
    instantiateWasm(imports, receiveInstance) {
      WebAssembly.instantiate(compiled, imports).then((instance) => receiveInstance(instance));
      return {};
    },
    print: (line) => log.push(line),
    printErr: (line) => log.push(line),
  });

  Module.FS.writeFile('in.pdf', input);

  let exitCode = 0;
  try {
    exitCode = Module.callMain([...BALANCED_FLAGS, '-o', 'out.pdf', 'in.pdf']);
  } catch (err) {
    // Emscripten throws ExitStatus only when the runtime exits; treat as the exit code.
    if (err && (err as { name?: string }).name === 'ExitStatus') {
      exitCode = (err as { status?: number }).status ?? 1;
    } else {
      throw err;
    }
  }

  if (exitCode !== 0) {
    console.error(`pdf-compress: ghostscript exited ${exitCode}: ${log.join(' ').slice(0, 300)}`);
    return null;
  }

  try {
    return Buffer.from(Module.FS.readFile('out.pdf'));
  } catch {
    return null;
  }
}

/**
 * Compress a PDF. Only ever shrinks: if gs fails, errors, or produces output that
 * is not a smaller valid PDF, the original is returned untouched (`compressed: false`).
 */
export async function compressPdf(input: Buffer): Promise<{ output: Buffer; compressed: boolean }> {
  try {
    const output = await runGhostscript(input);
    if (output && output.length < input.length && isPdf(output) && endsWithEof(output)) {
      return { output, compressed: true };
    }
  } catch (err) {
    console.error('pdf-compress: compression failed, keeping original', err);
  }
  return { output: input, compressed: false };
}
