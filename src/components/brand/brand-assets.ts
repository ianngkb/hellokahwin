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
 *
 * OPTICAL SIZE — cut at `opsz 6`, NOT the font's default 11 (DES-13).
 * Bodoni Moda's opsz axis barely touches the stems (the H stem moves 181 ->
 * 179 units across the whole 6..96 range, 1.1%) but it nearly erases the
 * HAIRLINE. Every mark here is used SMALL — an 18px header, a 16px favicon —
 * and at opsz 11 the hairline thins out at that size. At opsz 6 the 18px mark
 * composites to #33302C, 10.91:1, which is what makes the stated minimum
 * heights below true rather than aspirational.
 *
 * The article <h1> webfont is a different surface at 30-44px and stays pinned
 * at opsz 11. Do not unify them.
 *
 * Tracking was RE-SOLVED for the cut, not carried over: opsz 6 widens the set
 * width of HELLOKAHWIN, so the primary needed 0.092em rather than 0.126em to
 * hold 10.0:1.
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
    description: 'The default mark. Reach for this first on every surface wide enough to hold it.',
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
    width: 22951,
    height: 1800,
    ratio: '12.8 : 1',
    minHeight: 22,
  },
  {
    id: 'vertical',
    name: 'Vertical — stacked',
    description:
      'HELLO set above KAHWIN. For narrow columns, portrait social and anywhere the horizontal will not fit.',
    src: '/brand/logos/hellokahwin-vertical.svg',
    width: 11139,
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
    width: 12572,
    height: 1800,
    ratio: '7.0 : 1',
    minHeight: 16,
  },
  {
    id: 'monogram',
    name: 'Monogram',
    description: 'HK. The only mark that survives a favicon, an app icon or a social avatar.',
    src: '/brand/logos/hellokahwin-monogram.svg',
    width: 3434,
    height: 1800,
    ratio: '1.9 : 1',
    minHeight: 14,
  },
];

export interface BrandIcon {
  id: string;
  name: string;
  description: string;
  src: string;
  /** The size a browser or OS actually paints this file at, in CSS px. The
   *  /brand page renders each one at exactly this size — an icon shown at
   *  200px is a picture of an icon, not a test of one. */
  renderedAt: number;
}

/**
 * THE APP ICON SET — UI-20, 02 September 2026.
 *
 * Generated, not drawn: `node scripts/generate-brand-icons.mjs` composes every
 * file below from `hellokahwin-monogram.svg` and reads its two colours out of
 * `src/design-system/tokens.css`. Re-run it after any change to the monogram
 * or to --hk-parchment-100 / --hk-ink-900; `pnpm brand:icons:check` fails when
 * public/ has drifted from either.
 *
 * WHAT THIS REPLACED, so nobody re-introduces it: a 48x48 PNG of a serif
 * capital H on #b4326e. That H is not a mark in this registry, and #b4326e is
 * in no palette file in this repo — not even the retired Plum Forward one in
 * globals.css, whose plum is oklch(0.22 0.055 310). It survived the 27 Aug
 * re-skin because nothing regenerated it and nothing checked it.
 *
 * The monogram is the mark that survives this surface, and its minHeight of 14
 * is why: at a 16px favicon the mark is ~6.4px tall, below that minimum, and it
 * is legible there only because the lockups were re-cut at `opsz 6` (f4a09d2).
 * `pnpm audit:favicon` asserts the 16px result rather than trusting it.
 */
export const APP_ICONS: BrandIcon[] = [
  {
    id: 'tab-16',
    name: 'Browser tab, 16px',
    description:
      'The hardest size the mark has to hold. Both glyphs still separate, and the H keeps its crossbar — asserted by pnpm audit:favicon, not assumed.',
    src: '/icon.svg',
    renderedAt: 16,
  },
  {
    id: 'tab-32',
    name: 'Tab at 2x, 32px',
    description:
      'What a retina tab strip and a pinned Windows taskbar icon use. The serifs come back at this size.',
    src: '/icon.svg',
    renderedAt: 32,
  },
  {
    id: 'raster-48',
    name: 'Raster fallback, 48px',
    description:
      '/favicon.png — the legacy path, kept wired up because middleware whitelists it and HTML cached in the wild still points at it.',
    src: '/favicon.png',
    renderedAt: 48,
  },
  {
    id: 'apple-180',
    name: 'iOS home screen, 180px',
    description:
      'apple-touch-icon. Full-bleed parchment: iOS applies its own corner mask, and the system carries no radius of its own to fight it with.',
    src: '/apple-icon.png',
    renderedAt: 180,
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
    detail: 'Below that the letterforms close up. Use the monogram — that is what it is for.',
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
