/**
 * Typed registry of every HelloKahwin brand asset surfaced on /brand.
 * Single source of truth — the page iterates this rather than hard-coding
 * paths in JSX.
 *
 * WHY SVG AND NOT PNG EXPORTS
 * The wordmark is type-set, not drawn, so every file here is an OUTLINED
 * SVG: letterforms converted to paths, no <text>, no font dependency.
 * Two consequences worth knowing —
 *   1. Every mark is `fill="currentColor"`, so ONE file serves ink, white
 *      and gold. There is no separate export per colour.
 *   2. The largest file is under 3 KB, so marks can be inlined rather
 *      than fetched.
 *
 * PROPORTION
 * The primary lockup is 10.0:1, matching the register this direction was
 * chosen from. Regenerate rather than rescale if the tracking changes.
 */

export interface BrandLogo {
  /** Stable slug — React key and download filename. */
  id: string;
  name: string;
  /** One line: what it is and when to reach for it. */
  description: string;
  src: string;
  width: number;
  height: number;
  /** Rendered ratio, stated so a misuse is obvious against the page. */
  ratio: string;
  /** Smallest height in px at which this mark stays legible. */
  minHeight: number;
}

export const MASTER_LOGOS: BrandLogo[] = [
  {
    id: 'horizontal',
    name: 'Horizontal — primary',
    description:
      'The default mark. Reach for this first on every surface wide enough to hold it.',
    src: '/brand/logos/hellokahwin-horizontal.svg',
    width: 18000,
    height: 1800,
    ratio: '10.0 : 1',
    minHeight: 18,
  },
  {
    id: 'horizontal-wide',
    name: 'Horizontal — wide',
    description:
      'Looser tracking for footers, print and anywhere the mark can run long. Never in a header.',
    src: '/brand/logos/hellokahwin-horizontal-wide.svg',
    width: 22283,
    height: 1800,
    ratio: '12.4 : 1',
    minHeight: 22,
  },
  {
    id: 'vertical',
    name: 'Vertical — stacked',
    description:
      'HELLO set above KAHWIN. For narrow columns, portrait social and anywhere the horizontal will not fit.',
    src: '/brand/logos/hellokahwin-vertical.svg',
    width: 10835,
    height: 3930,
    ratio: '2.8 : 1',
    minHeight: 34,
  },
];

export const SHORT_LOGOS: BrandLogo[] = [
  {
    id: 'shortmark',
    name: 'Shortmark',
    description:
      'KAHWIN alone. Only where HelloKahwin is already established on the same surface — never as a first introduction.',
    src: '/brand/logos/hellokahwin-shortmark.svg',
    width: 12208,
    height: 1800,
    ratio: '6.8 : 1',
    minHeight: 16,
  },
  {
    id: 'monogram',
    name: 'Monogram',
    description:
      'HK. The only mark that survives a favicon, an app icon or a social avatar.',
    src: '/brand/logos/hellokahwin-monogram.svg',
    width: 3334,
    height: 1800,
    ratio: '1.9 : 1',
    minHeight: 14,
  },
];

export interface BrandColour {
  token: string;
  hex: string;
  name: string;
  use: string;
  /** Measured against the page ground of the theme it belongs to. */
  contrast?: string;
}

export const BRAND_COLOURS: BrandColour[] = [
  {
    token: '--hk-ink-900',
    hex: '#16130F',
    name: 'Ink',
    use: 'The mark, and body text on light grounds. Warm bias — never pure black.',
    contrast: '15.4 : 1 on parchment',
  },
  {
    token: '--hk-sand-050',
    hex: '#EDEAE1',
    name: 'Parchment',
    use: 'The light ground. Olive bias, chosen against the default cream.',
  },
  {
    token: '--hk-gold-700',
    hex: '#725825',
    name: 'Songket gold',
    use: 'Accent and labels on light grounds. Corrected to pass AA.',
    contrast: '4.56 : 1 on raised',
  },
  {
    token: '--hk-gold-500',
    hex: '#A8823C',
    name: 'Thread',
    use: 'Structural hairlines only. Never text — it does not pass at body size.',
  },
  {
    token: '--hk-night-800',
    hex: '#14110D',
    name: 'Night',
    use: 'The dark ground. The mark reverses to parchment on this.',
  },
  {
    token: '--hk-blood-700',
    hex: '#6B2130',
    name: 'Oxblood',
    use: 'Warnings and gates. Never decorative.',
    contrast: '9.26 : 1 on parchment',
  },
];

export interface BrandDont {
  title: string;
  detail: string;
}

export const BRAND_DONTS: BrandDont[] = [
  {
    title: 'Do not re-set the wordmark in another typeface',
    detail:
      'The mark is outlined paths. Typing HELLOKAHWIN in a different face is a different logo, not the same one.',
  },
  {
    title: 'Do not change the tracking',
    detail:
      'The 10:1 proportion is the mark. Compressing or expanding it produces something that reads as a near-miss of the real thing.',
  },
  {
    title: 'Do not use the horizontal below 18px tall',
    detail:
      'Below that the letterforms close up. Use the monogram — that is what it is for.',
  },
  {
    title: 'Do not add a stroke, shadow, gradient or outline',
    detail:
      'The system carries no elevation at all. A shadow on the mark contradicts every surface it sits on.',
  },
  {
    title: 'Do not place it on a busy photograph',
    detail:
      'It is a hairline-weight mark. It needs a flat ground or a heavily darkened image, not a portrait.',
  },
  {
    title: 'Do not recolour it outside the palette',
    detail:
      'Ink, parchment or gold. The files are currentColor, so a wrong colour is a one-line mistake and just as easy to avoid.',
  },
];
