#!/usr/bin/env node
/**
 * Reproduce black-on-white tab icons and the round home-screen seal.
 * Tabs use the strengthened unframed HK cut, including in SVG-capable browsers.
 * Run pnpm brand:icons (or --check) after editing scripts/brand/artwork.mjs.
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { smallMonogram, seal, svg, BLACK, WHITE } from './brand/artwork.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const CHECK = process.argv.includes('--check');
const iconSvg = svg(
  64,
  64,
  `<rect width="64" height="64" fill="${WHITE}"/><g transform="translate(3 0) scale(.9 1)">${smallMonogram}</g>`,
  BLACK,
);
const appleSvg = svg(
  500,
  500,
  `<rect width="500" height="500" fill="${WHITE}"/><g transform="translate(50 50) scale(.8)">${seal}</g>`,
  BLACK,
);

async function raster(size, artwork = iconSvg) {
  return sharp(Buffer.from(artwork), { density: 72 * 4 })
    .resize(size, size, { kernel: 'lanczos3', fit: 'fill' })
    .flatten({ background: WHITE })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
}

// BMP/DIB entries keep compatibility with older ICO readers.
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
  ['public/icon.svg', Buffer.from(iconSvg)],
  ['public/favicon.ico', await ico([16, 32, 48])],
  ['public/apple-icon.png', await raster(180, appleSvg)],
  ['public/favicon.png', await raster(48)],
];

let stale = 0;
for (const [rel, buf] of outputs) {
  const abs = path.join(ROOT, rel);
  const same = existsSync(abs) && readFileSync(abs).equals(buf);
  const sha = createHash('sha256').update(buf).digest('hex').slice(0, 12);
  if (!same) {
    stale++;
    if (!CHECK) writeFileSync(abs, buf);
  }
  console.log(
    `${same ? 'ok' : CHECK ? 'STALE' : 'wrote'} ${rel} ${buf.length} bytes sha256:${sha}`,
  );
}
console.log('Black on white; optical HK tabs, round seal home-screen icon.');
if (CHECK && stale) process.exitCode = 1;
