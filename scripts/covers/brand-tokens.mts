/**
 * Read the site's real brand tokens out of `src/app/globals.css` and convert
 * them to sRGB hex, so a generated graphic cannot drift into a second visual
 * language.
 *
 * The palette is authored entirely in `oklch()` and there is no
 * `tailwind.config.*` — Tailwind v4, CSS-first — so there is no JS object to
 * import. Rather than copy hex approximations into this script (which is how a
 * second palette gets born), we parse the ONE authoritative block and convert.
 *
 * The block we read is `:root,\n.ds-surface-public { … }`. Three other palettes
 * live in the same file and none of them is ours:
 *   - `.dark`                              — unwired, no ThemeProvider exists
 *   - `.font-ui-sans, .ds-surface-console` — the admin console, hue 0 neutral
 *   - `.ds-surface-landing`                — dead leftover from twn-new
 * Taking the first match in file order would still land on the right block
 * today, but only by accident, so the block is delimited explicitly.
 */
import { readFile } from 'node:fs/promises';

/** The tokens this template needs. Missing any one is a hard failure. */
export const REQUIRED_TOKENS = [
  'primary', // Midnight plum — the band
  'brand-secondary', // Champagne brass — figures and rules
  'brass-deep', // Text-legible brass, light surfaces only
  'background', // Warm off-white — the top field
  'surface-subtle', // Warm cream — the bottom field
  'foreground', // Warm near-black — titles
  'muted-foreground', // Warm medium — secondary copy
  'hairline', // Decorative rules
  'plum-deep-foreground', // Text on plum (15.2:1)
  'plum-deep-muted', // Secondary text on plum (12.2:1)
] as const;

export type TokenName = (typeof REQUIRED_TOKENS)[number];
export type BrandTokens = Record<TokenName, string>;

/**
 * The two font stacks the site declares. `globals.css` maps `--font-sans` to a
 * system sans stack and `--font-serif` to Georgia — HelloKahwin ships zero
 * webfont bytes on purpose ("an audience on cheap Android + slow connections"),
 * so there is no brand font FILE in this repo to embed. librsvg resolves these
 * against fonts installed on the host, which is the one part of this generator
 * that is machine-dependent; see the README note in generate-cover-graphics.
 */
export const FONT_SANS = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
export const FONT_SERIF = "Georgia, 'Times New Roman', Times, serif";

/** oklch() → sRGB hex. Straight Björn Ottosson OKLab, then gamma-encode. */
export function oklchToHex(L: number, C: number, hDeg: number): string {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];

  const channel = (x: number) => {
    const encoded = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(Math.max(x, 0), 1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, encoded)) * 255)
      .toString(16)
      .padStart(2, '0');
  };

  return `#${linear.map(channel).join('')}`;
}

/** Mix two hex colours in sRGB. Used only for hairlines over a solid field. */
export function mix(a: string, b: string, t: number): string {
  const parse = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const c = (x: number, y: number) =>
    Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, '0');
  return `#${c(ar, br)}${c(ag, bg)}${c(ab, bb)}`;
}

export async function loadBrandTokens(globalsCssPath: string): Promise<BrandTokens> {
  const css = await readFile(globalsCssPath, 'utf8');

  const start = css.indexOf(':root,\n.ds-surface-public {');
  const startCrlf = css.indexOf(':root,\r\n.ds-surface-public {');
  const blockStart = start >= 0 ? start : startCrlf;
  if (blockStart < 0) {
    throw new Error(
      `Could not find the ":root, .ds-surface-public" palette block in ${globalsCssPath}. ` +
        'The public palette moved or was renamed — fix this parser rather than hardcoding hex.',
    );
  }
  const blockEnd = css.indexOf('\n}', blockStart);
  const block = css.slice(blockStart, blockEnd);

  const tokens = {} as BrandTokens;
  const missing: string[] = [];
  for (const name of REQUIRED_TOKENS) {
    const match = new RegExp(
      `--${name.replace(/[-]/g, '\\-')}:\\s*oklch\\(\\s*([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)\\s*\\)`,
    ).exec(block);
    if (!match) {
      missing.push(name);
      continue;
    }
    tokens[name] = oklchToHex(Number(match[1]), Number(match[2]), Number(match[3]));
  }

  if (missing.length > 0) {
    throw new Error(
      `Brand tokens missing from the public palette: ${missing.join(', ')}. ` +
        'Do not invent replacements — find where they moved.',
    );
  }

  return tokens;
}
