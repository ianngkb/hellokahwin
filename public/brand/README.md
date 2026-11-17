# HelloKahwin — Refined Classic

Ian selected A on 17 November 2026. The artwork is redrawn as original Bézier
paths in `scripts/brand/artwork.mjs`, using the approved
`artifacts/2026-11-17-logo-redesign-options/astra-a-refined-classic.png` seal and
the right-hand Fashion Publication wordmark in `wordmark-options.png` as visual
references. Both were inspected before drawing. No font or third-party glyph
outline is embedded; the supplied concept images are references, not traced
bitmaps inside the assets.

The primary mark is the unified mixed-case name, with a short K. The display
seal has a round frame and gently curved connecting crossbar. A strengthened,
unframed HK cut preserves the connection in browser tabs at 16, 32 and 48px.
The home-screen icon uses the display seal. Use black on light surfaces and
white on dark surfaces; other site colours are not logo colours.

Reproduce from the repository root:

```sh
pnpm brand:logos
pnpm brand:icons
pnpm brand:logos:check
pnpm brand:icons:check
pnpm audit:favicon:local
pnpm audit:favicon:selftest
```

The logo generator writes the download SVGs, bundled inline wordmark and
`hellokahwin-logo.png`. That PNG retains its 886×290 dimensions and URL for
existing sharing metadata and publisher JSON-LD. Existing SVG URLs remain
valid: `horizontal-wide` is now the side-by-side seal/name lockup, `vertical`
is the seal above the complete name, and `shortmark` is a compatibility alias
of the seal. Each SVG has a white export for use through ordinary image tags.
`scripts/cloudflare/inline-wordmark.mjs` remains a compatibility command for
the complete logo generator.

Minimum display heights: wordmark 20px, side-by-side lockup 40px, stacked
lockup 120px, display seal 48px, optical HK 16px. The website masthead scales
from 24 to 30px; console and footer use their own compact heights.
