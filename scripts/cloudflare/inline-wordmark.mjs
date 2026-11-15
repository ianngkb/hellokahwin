// Regenerate src/components/brand/horizontal-mark-svg.ts from the public SVG.
// Run after changing public/brand/logos/hellokahwin-horizontal.svg.
import { readFileSync, writeFileSync } from 'node:fs';
const svg = readFileSync('public/brand/logos/hellokahwin-horizontal.svg', 'utf8');
const header = readFileSync('src/components/brand/horizontal-mark-svg.ts', 'utf8').split(
  'export const',
)[0];
writeFileSync(
  'src/components/brand/horizontal-mark-svg.ts',
  `${header}export const HORIZONTAL_MARK_SVG = ${JSON.stringify(svg)};\n`,
);
