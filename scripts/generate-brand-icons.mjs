#!/usr/bin/env node
/**
 * UI-20 — generate the browser/app icon set from the COMMITTED monogram.
 *
 * WHY THIS IS A SCRIPT AND NOT FIVE HAND-EXPORTED FILES
 * The favicon this replaces was a 48x48 PNG of a serif capital H on #b4326e —
 * a mark that is in no registry, in a colour that is in no palette, and that
 * survived the 27 Aug re-skin (78cd345) because nothing regenerated it. Hand
 * exports drift silently. This script derives every icon from
 * `public/brand/logos/hellokahwin-monogram.svg` and reads its two colours out
 * of `src/design-system/tokens.css`, so there is no hex and no artwork in this
 * file that a palette change could leave behind.
 *
 *   node scripts/generate-brand-icons.mjs          # write public/
 *   node scripts/generate-brand-icons.mjs --check  # fail if public/ is stale
 *
 * DECISIONS, each measured rather than preferred — see
 * docs/work-done/sep-02-2026-session-01/ui-20-favicon-monogram.md
 *
 * 1. THE MARK is the committed monogram, used as-is. It is the `opsz 6` cut
 *    (f4a09d2, "re-cut all five lockups at opsz 6, not the font default 11"),
 *    which is the cut brand-assets.ts says the small sizes depend on. Nothing
 *    here re-draws, re-strokes or re-tracks it; the only transforms applied are
 *    a uniform scale and a translate.
 *
 * 2. PAPER GROUND, INK MARK — not the reverse. Both polarities were rendered at
 *    16px and read off the pixels: on the ink ground the H crossbar came back at
 *    0.29 of full ink and the K collapsed; on paper the same crossbar holds at
 *    0.92 and both glyphs survive. Light-on-dark loses hairlines to
 *    antialiasing at this size; dark-on-light does not.
 *
 * 3. INK_FRACTION 0.88 — the mark ink box spans 88% of the tile width. Chosen
 *    as the largest value whose outermost pixel columns still read as ground at
 *    16px (0.02 of full ink at 0.88; 0.24 and 0.19 at 0.92). Bigger loses the
 *    margin, smaller loses the crossbar.
 *
 * 4. SQUARE TILE, NO RADIUS. `--radius: 0` is the system stated value
 *    (tokens.css), so a rounded icon would be the only rounded object the brand
 *    owns. iOS applies its own mask to the apple icon; nothing here fights it.
 *
 * 5. NO `prefers-color-scheme` SWITCH in icon.svg, deliberately. An SVG favicon
 *    can theme itself and the obvious move — night ground in dark mode — is
 *    wrong: a dark tab strip is exactly where a dark tile disappears. The paper
 *    tile is the high-contrast choice against BOTH chromes, so the ground does
 *    not move.
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const MONOGRAM = 'public/brand/logos/hellokahwin-monogram.svg';
const TOKENS = 'src/design-system/tokens.css';

/** The fraction of the tile width the mark ink box fills. See decision 3. */
const INK_FRACTION = 0.88;
/** One composition, every size. The SVG tile is authored at 64 for readability. */
const TILE = 64;

const CHECK = process.argv.includes('--check');

function readToken(css, name) {
  const m = css.match(new RegExp(`${name}\\s*:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) {
    throw new Error(
      `${TOKENS} does not declare ${name} as a 6-digit hex. The icon set takes ` +
        `its colour from the token module and has no literal to fall back on.`,
    );
  }
  return m[1].toLowerCase();
}

const css = readFileSync(path.join(ROOT, TOKENS), 'utf8');
const GROUND = readToken(css, '--hk-parchment-100'); // the light ground
const MARK = readToken(css, '--hk-ink-900'); // the mark

const monogramSrc = readFileSync(path.join(ROOT, MONOGRAM), 'utf8');
const viewBox = monogramSrc.match(/viewBox="0 0 (\d+) (\d+)"/);
if (!viewBox) throw new Error(`${MONOGRAM}: expected a "0 0 W H" viewBox.`);
const VBW = Number(viewBox[1]);
const VBH = Number(viewBox[2]);
/** Everything inside the svg element — the two glyph paths and their flip group. */
const glyphs = monogramSrc
  .replace(/^[\s\S]*?<g /, '<g ')
  .replace(/<\/svg>\s*$/, '')
  .trim();

/**
 * The ink box, MEASURED off a rasterisation rather than parsed out of the path
 * data. The paths sit inside a `translate(0 1650) scale(1 -1)` group, so the
 * numbers in the `d` attribute are not the numbers on screen — reading them
 * directly is how you get a mark centred on the wrong axis.
 */
async function inkBox() {
  const probe = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VBW} ${VBH}" fill="#000">${glyphs}</svg>`;
  const { data, info } = await sharp(Buffer.from(probe))
    .resize(VBW, VBH, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * info.channels + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error(`${MONOGRAM} rasterised to nothing.`);
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

const bb = await inkBox();
const scale = (TILE * INK_FRACTION) / bb.w;
const dx = (TILE - bb.w * scale) / 2 - bb.x0 * scale;
const dy = (TILE - bb.h * scale) / 2 - bb.y0 * scale;

const iconSvg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TILE} ${TILE}" width="${TILE}" height="${TILE}" role="img" aria-label="HelloKahwin">\n` +
  `  <title>HelloKahwin</title>\n` +
  `  <rect width="${TILE}" height="${TILE}" fill="${GROUND}"/>\n` +
  `  <g transform="translate(${dx.toFixed(4)} ${dy.toFixed(4)}) scale(${scale.toFixed(6)})" fill="${MARK}">${glyphs}</g>\n` +
  `</svg>\n`;

/**
 * Rasterise the tile. Supersampled then filtered down, which is what a browser
 * does to a 32px entry it displays at 16 — rendering straight at 16 gives
 * librsvg its own antialiasing and a visibly weaker crossbar.
 */
async function raster(size) {
  return sharp(Buffer.from(iconSvg), { density: 72 * 16 })
    .resize(size, size, { kernel: 'lanczos3', fit: 'fill' })
    .flatten({ background: GROUND }) // no alpha anywhere: an icon has a ground
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
}

/**
 * ICO, written by hand because sharp has no .ico encoder. BMP/DIB entries
 * rather than the PNG-in-ICO form: PNG entries need Vista or later, DIB entries
 * are read by everything, and at these sizes the difference is 6 KB.
 */
async function ico(sizes) {
  const images = [];
  for (const size of sizes) {
    const { data } = await sharp(await raster(size))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const xor = Buffer.alloc(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const s = (y * size + x) * 4;
        const d = ((size - 1 - y) * size + x) * 4; // DIB rows run bottom-up
        xor[d] = data[s + 2];
        xor[d + 1] = data[s + 1];
        xor[d + 2] = data[s];
        xor[d + 3] = data[s + 3];
      }
    }
    const maskStride = Math.ceil(size / 32) * 4;
    const and = Buffer.alloc(maskStride * size); // fully opaque -> all zero
    const header = Buffer.alloc(40);
    header.writeUInt32LE(40, 0);
    header.writeInt32LE(size, 4);
    header.writeInt32LE(size * 2, 8); // XOR rows + AND rows
    header.writeUInt16LE(1, 12);
    header.writeUInt16LE(32, 14);
    header.writeUInt32LE(0, 16);
    header.writeUInt32LE(xor.length + and.length, 20);
    images.push({ size, body: Buffer.concat([header, xor, and]) });
  }
  const dir = Buffer.alloc(6 + 16 * images.length);
  dir.writeUInt16LE(0, 0);
  dir.writeUInt16LE(1, 2);
  dir.writeUInt16LE(images.length, 4);
  let offset = dir.length;
  images.forEach((img, i) => {
    const e = 6 + i * 16;
    dir.writeUInt8(img.size >= 256 ? 0 : img.size, e);
    dir.writeUInt8(img.size >= 256 ? 0 : img.size, e + 1);
    dir.writeUInt8(0, e + 2);
    dir.writeUInt8(0, e + 3);
    dir.writeUInt16LE(1, e + 4);
    dir.writeUInt16LE(32, e + 6);
    dir.writeUInt32LE(img.body.length, e + 8);
    dir.writeUInt32LE(offset, e + 12);
    offset += img.body.length;
  });
  return Buffer.concat([dir, ...images.map((i) => i.body)]);
}

const outputs = [
  ['public/icon.svg', Buffer.from(iconSvg, 'utf8')],
  ['public/favicon.ico', await ico([16, 32, 48])],
  ['public/apple-icon.png', await raster(180)],
  // The legacy path. It stays WIRED UP rather than deleted: middleware.ts
  // whitelists it by name and any cached HTML in the wild still points at it,
  // so the one thing it must not do is keep serving the retired magenta.
  ['public/favicon.png', await raster(48)],
];

let stale = 0;
for (const [rel, buf] of outputs) {
  const abs = path.join(ROOT, rel);
  const before = existsSync(abs) ? readFileSync(abs) : null;
  const same = Boolean(before && before.equals(buf));
  const sha = createHash('sha256').update(buf).digest('hex').slice(0, 12);
  if (CHECK) {
    if (!same) stale++;
    console.log(`${same ? 'ok   ' : 'STALE'} ${rel.padEnd(24)} ${buf.length} bytes  sha256:${sha}`);
  } else {
    if (!same) writeFileSync(abs, buf);
    console.log(`${same ? 'same ' : 'wrote'} ${rel.padEnd(24)} ${buf.length} bytes  sha256:${sha}`);
  }
}
console.log(`\nground ${GROUND} (--hk-parchment-100)   mark ${MARK} (--hk-ink-900)`);
console.log(
  `mark ink box ${bb.w}x${bb.h} of ${VBW}x${VBH}, ${(bb.w / bb.h).toFixed(3)}:1, at ${INK_FRACTION} of the tile`,
);
if (CHECK && stale) {
  console.error(`\nGENERATE EXIT: 1 — ${stale} icon file(s) do not match the monogram + tokens.`);
  process.exit(1);
}
console.log(`\nGENERATE EXIT: 0`);
