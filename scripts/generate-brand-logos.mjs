#!/usr/bin/env node
/** Reproduce every downloadable logo, bundled wordmark and compatibility PNG. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { format } from 'prettier';
import { wordmark, seal, smallMonogram, svg, BLACK, WHITE } from './brand/artwork.mjs';

const root = path.resolve(import.meta.dirname, '..');
const check = process.argv.includes('--check');
const lockups = {
  horizontal: [720, 112, wordmark],
  'horizontal-wide': [
    912,
    150,
    `<g transform="scale(.3)">${seal}</g><g transform="translate(192 19)">${wordmark}</g>`,
  ],
  vertical: [
    720,
    600,
    `<g transform="translate(140 0) scale(.88)">${seal}</g><g transform="translate(0 488)">${wordmark}</g>`,
  ],
  monogram: [500, 500, seal],
  shortmark: [500, 500, seal], // Retain the old URL as a seal, never a split name.
  'monogram-small': [64, 64, smallMonogram],
};
const outputs = [];
for (const [name, args] of Object.entries(lockups)) {
  outputs.push([`public/brand/logos/hellokahwin-${name}.svg`, svg(...args)]);
  outputs.push([`public/brand/logos/hellokahwin-${name}-white.svg`, svg(...args, WHITE)]);
}
const horizontal = svg(...lockups.horizontal);
outputs.push([
  'src/components/brand/horizontal-mark-svg.ts',
  await format(
    `// GENERATED from public/brand/logos/hellokahwin-horizontal.svg — do not edit by hand.\n// Regenerate: pnpm brand:logos\nexport const HORIZONTAL_MARK_SVG = ${JSON.stringify(horizontal)};\n`,
    { parser: 'typescript', singleQuote: true, printWidth: 96 },
  ),
]);
// Preserve the URL and 886×290 metadata contract used by sharing and JSON-LD.
const compatibility = svg(
  886,
  290,
  `<rect width="886" height="290" fill="${WHITE}"/><g transform="translate(83 89)">${wordmark}</g>`,
  BLACK,
);
outputs.push([
  'public/hellokahwin-logo.png',
  await sharp(Buffer.from(compatibility)).png().toBuffer(),
]);

let stale = 0;
for (const [file, content] of outputs) {
  const target = path.join(root, file);
  const bytes = Buffer.from(content);
  const same = existsSync(target) && readFileSync(target).equals(bytes);
  if (!same) {
    stale++;
    if (!check) writeFileSync(target, bytes);
  }
  console.log(`${same ? 'ok' : check ? 'STALE' : 'wrote'} ${file}`);
}
if (check && stale) process.exitCode = 1;
