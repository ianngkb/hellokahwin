/**
 * The token registry, in JS — the companion to tokens.css.
 *
 * This file exists for exactly one reason: the reference page needs to
 * PRINT hex values and contrast ratios as reader-facing text (a swatch
 * label, a "Foreground / Ground / Ratio" table), and a React component
 * cannot read a CSS custom property's literal value at render time without
 * either re-declaring it (a second copy to drift) or querying the DOM
 * (which only works after paint, defeating server rendering). So this
 * module is the second, deliberate home for the same primitive hex values
 * tokens.css declares — nowhere else in `src/` may a hex literal appear.
 * See the work-done entry's evidence section for the grep that checks it.
 *
 * The ratios below are COMPUTED here, at build/render time, by the same
 * WCAG 2.x relative-luminance formula as
 * docs/design/des-03-evidence/contrast.py — not copied from that script's
 * output. If a primitive above drifts, this table drifts with it and stops
 * matching contrast-2026-08-28.txt, which is the point: a silent colour
 * change cannot pass review with the numbers unchanged.
 */

// ── WCAG 2.x relative luminance — mirrors des-03-evidence/contrast.py ──
function srgbToLinear(c: number): number {
  const cs = c / 255;
  return cs <= 0.04045 ? cs / 12.92 : ((cs + 0.055) / 1.055) ** 2.4;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/** WCAG contrast ratio between two hex colours, (L1+0.05)/(L2+0.05). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** source-over composite of `fg` at `alpha` (0–1) onto opaque `bg`. */
export function compositeOver(fg: string, bg: string, alpha: number): string {
  const [fr, fgc, fb] = hexToRgb(fg);
  const [br, bgc, bb] = hexToRgb(bg);
  const r = Math.round(fr * alpha + br * (1 - alpha));
  const g = Math.round(fgc * alpha + bgc * (1 - alpha));
  const bl = Math.round(fb * alpha + bb * (1 - alpha));
  const toHex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}

function grade(ratio: number, floor: number): 'AAA' | 'AA' | 'FAIL' {
  if (ratio >= 7) return 'AAA';
  if (ratio >= floor) return 'AA';
  return 'FAIL';
}

// ── primitives — MUST match tokens.css exactly; this is the one other
// place in `src/` a hex literal may appear. ──
export const PRIMITIVES = {
  'parchment-100': '#EDEAE1',
  'parchment-200': '#E3DFD4',
  'parchment-300': '#C9C3B6',
  'parchment-400': '#A89C88',
  'ink-900': '#16130F',
  'ink-600': '#4A443C',
  'ink-500': '#5A5348',
  'gold-700': '#725825',
  'gold-400': '#C9A253',
  'oxblood-700': '#6B2130',
  'oxblood-300': '#D98C7A',
  'night-900': '#14110D',
  'night-800': '#1E1A15',
  'thread-500': '#A8823C',
} as const;

export const PRIMITIVE_SWATCHES: { token: string; hex: string; job: string; usedBy: string }[] = [
  {
    token: '--hk-parchment-100',
    hex: PRIMITIVES['parchment-100'],
    job: 'Light ground',
    usedBy: '--bg light, --fg dark',
  },
  {
    token: '--hk-parchment-200',
    hex: PRIMITIVES['parchment-200'],
    job: 'Light raised surface',
    usedBy: '--bg-raised light',
  },
  {
    token: '--hk-parchment-300',
    hex: PRIMITIVES['parchment-300'],
    job: 'Dark muted text',
    usedBy: '--fg-muted dark',
  },
  {
    token: '--hk-parchment-400',
    hex: PRIMITIVES['parchment-400'],
    job: 'Dark dim text',
    usedBy: '--fg-dim dark',
  },
  {
    token: '--hk-ink-900',
    hex: PRIMITIVES['ink-900'],
    job: 'Light ink',
    usedBy: '--fg light, --focus light',
  },
  {
    token: '--hk-ink-600',
    hex: PRIMITIVES['ink-600'],
    job: 'Light muted text',
    usedBy: '--fg-muted light',
  },
  {
    token: '--hk-ink-500',
    hex: PRIMITIVES['ink-500'],
    job: 'Light dim text',
    usedBy: '--fg-dim light',
  },
  {
    token: '--hk-gold-700',
    hex: PRIMITIVES['gold-700'],
    job: 'Light accent',
    usedBy: '--accent light',
  },
  {
    token: '--hk-gold-400',
    hex: PRIMITIVES['gold-400'],
    job: 'Dark accent',
    usedBy: '--accent dark',
  },
  {
    token: '--hk-oxblood-700',
    hex: PRIMITIVES['oxblood-700'],
    job: 'Light alert',
    usedBy: '--alert light',
  },
  {
    token: '--hk-oxblood-300',
    hex: PRIMITIVES['oxblood-300'],
    job: 'Dark alert',
    usedBy: '--alert dark',
  },
  {
    token: '--hk-night-900',
    hex: PRIMITIVES['night-900'],
    job: 'Dark ground',
    usedBy: '--bg dark',
  },
  {
    token: '--hk-night-800',
    hex: PRIMITIVES['night-800'],
    job: 'Dark raised surface',
    usedBy: '--bg-raised dark',
  },
  {
    token: '--hk-thread-500',
    hex: PRIMITIVES['thread-500'],
    job: 'Decorative hairline ONLY — fails the 3:1 boundary floor',
    usedBy: 'nothing consumes this as a boundary or as text',
  },
];

export interface ContrastRow {
  pairing: string;
  fgToken: string;
  fgHex: string;
  bgHex: string;
  ratio: number;
  grade: 'AAA' | 'AA' | 'FAIL';
  floor: number;
  where: string;
}

const P = PRIMITIVES;

function textRow(
  pairing: string,
  fgToken: string,
  fgHex: string,
  bgHex: string,
  where: string,
  floor = 4.5,
): ContrastRow {
  const ratio = contrastRatio(fgHex, bgHex);
  return { pairing, fgToken, fgHex, bgHex, ratio, grade: grade(ratio, floor), floor, where };
}

/** Every text-on-background pairing the system specifies, computed live. */
export const CONTRAST_LIGHT: ContrastRow[] = [
  textRow(
    'Body, headings',
    '--fg',
    P['ink-900'],
    P['parchment-100'],
    'All running text, h1–h3, table cells',
  ),
  textRow(
    'Deck, caption, credit',
    '--fg-muted',
    P['ink-600'],
    P['parchment-100'],
    'Decks, figcaptions, Rekod field names',
  ),
  textRow(
    'Meta, timestamp',
    '--fg-dim',
    P['ink-500'],
    P['parchment-100'],
    'Floor for small text. Chip counts, list index',
  ),
  textRow(
    'Label, eyebrow, link',
    '--accent',
    P['gold-700'],
    P['parchment-100'],
    '13px labels, credits, category eyebrow',
  ),
  textRow('Alert text', '--alert', P['oxblood-700'], P['parchment-100'], 'Error blocks only'),
  textRow('Body on raised', '--fg', P['ink-900'], P['parchment-200'], 'Reserved — nothing today'),
  textRow(
    'Deck on raised',
    '--fg-muted',
    P['ink-600'],
    P['parchment-200'],
    'Reserved — nothing today',
  ),
  textRow(
    'Label on raised',
    '--accent',
    P['gold-700'],
    P['parchment-200'],
    'Reserved — nothing today',
  ),
];

export const CONTRAST_DARK: ContrastRow[] = [
  textRow('Body, headings', '--fg', P['parchment-100'], P['night-900'], 'All running text'),
  textRow(
    'Deck, caption, credit',
    '--fg-muted',
    P['parchment-300'],
    P['night-900'],
    'Decks, figcaptions, field names',
  ),
  textRow(
    'Meta, timestamp',
    '--fg-dim',
    P['parchment-400'],
    P['night-900'],
    'Floor for small text',
  ),
  textRow(
    'Label, eyebrow, link',
    '--accent',
    P['gold-400'],
    P['night-900'],
    '13px labels, credits',
  ),
  textRow('Alert text', '--alert', P['oxblood-300'], P['night-900'], 'Error blocks only'),
  textRow('Body on raised', '--fg', P['parchment-100'], P['night-800'], 'Reserved — nothing today'),
  textRow(
    'Deck on raised',
    '--fg-muted',
    P['parchment-300'],
    P['night-800'],
    'Reserved — nothing today',
  ),
  textRow('Label on raised', '--accent', P['gold-400'], P['night-800'], 'Reserved — nothing today'),
];

export interface BoundaryRow {
  label: string;
  compositedHex: string;
  bgHex: string;
  ratio: number;
  pass: boolean;
  note: string;
}

function boundaryRow(
  label: string,
  fg: string,
  bg: string,
  alphaPct: number,
  note: string,
): BoundaryRow {
  const composited = compositeOver(fg, bg, alphaPct / 100);
  const ratio = contrastRatio(composited, bg);
  return { label, compositedHex: composited, bgHex: bg, ratio, pass: ratio >= 3, note };
}

/** Rules, stripes and boundaries — alphas of the ink/parchment, composited then measured. */
export const BOUNDARY_TINTS: BoundaryRow[] = [
  boundaryRow(
    'Light table stripe — ink @ 5%',
    P['ink-900'],
    P['parchment-100'],
    5,
    'Zebra fill. Carries no meaning alone.',
  ),
  boundaryRow(
    'Light field separator — ink @ 12%',
    P['ink-900'],
    P['parchment-100'],
    12,
    'Rekod row rules, list-row rules',
  ),
  boundaryRow(
    'Light section rule — ink @ 22%',
    P['ink-900'],
    P['parchment-100'],
    22,
    'Masthead rule, section boundaries',
  ),
  boundaryRow(
    'Light control boundary — ink @ 47%',
    P['ink-900'],
    P['parchment-100'],
    47,
    'Every input, chip and button border',
  ),
  boundaryRow(
    'Dark table stripe — parchment @ 5%',
    P['parchment-100'],
    P['night-900'],
    5,
    'Zebra fill',
  ),
  boundaryRow(
    'Dark field separator — parchment @ 11%',
    P['parchment-100'],
    P['night-900'],
    11,
    'Row rules',
  ),
  boundaryRow(
    'Dark section rule — parchment @ 20%',
    P['parchment-100'],
    P['night-900'],
    20,
    'Section boundaries',
  ),
  boundaryRow(
    'Dark control boundary — parchment @ 37%',
    P['parchment-100'],
    P['night-900'],
    37,
    'Every input, chip and button border',
  ),
];

/** Disqualified pairings — kept on the page so nobody re-proposes them. */
export const DISQUALIFIED: BoundaryRow[] = [
  {
    label: 'Thread gold as a control boundary',
    compositedHex: P['thread-500'],
    bgHex: P['parchment-100'],
    ratio: contrastRatio(P['thread-500'], P['parchment-100']),
    pass: false,
    note: 'Fails SC 1.4.11. Decorative rule and nothing else.',
  },
  {
    label: 'Thread gold as text',
    compositedHex: P['thread-500'],
    bgHex: P['parchment-100'],
    ratio: contrastRatio(P['thread-500'], P['parchment-100']),
    pass: false,
    note: 'Never text, at any size.',
  },
];

/** Focus ring — full-opacity --focus, the fix for the shipped ring/30 defect (DES-07 §10.4). */
export const FOCUS_RING = {
  light: {
    fg: P['ink-900'],
    bg: P['parchment-100'],
    ratio: contrastRatio(P['ink-900'], P['parchment-100']),
  },
  dark: {
    fg: P['parchment-100'],
    bg: P['night-900'],
    ratio: contrastRatio(P['parchment-100'], P['night-900']),
  },
};
