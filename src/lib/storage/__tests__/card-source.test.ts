import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MIDSIZE_COVER } from '../midsize-cover';
import { resolveCardSource, resolveRowThumbSource } from '../responsive-cover';

/**
 * UI-15 — the `.s-card` lead plate's source.
 *
 * Every case below is a defect this repo shipped, nearly shipped, or came
 * within one command of causing.
 */

const MD = 'crop-4x3-article-card-md';

// ── 1. The key is a shared production asset, and the name is load-bearing ────
//
// `crop-4x3-article-card-md` is UI-16's rendition, already live on all 96
// published covers. It is the R2 object key AND the `coverImageSmartCrops` key.
// If it is renamed on either side, every `.s-card` silently falls back to `low`
// and the R2 violation this item closed comes back with no error.
//
// It is pinned here as a literal on purpose: UI-15 must not import a constant
// from an unmerged branch, and it must not define a second one either. This
// test is the join between the two.
describe('the card rendition key', () => {
  it('is the exact string production stores and serves', () => {
    const src = readFileSync('src/lib/storage/responsive-cover.ts', 'utf8');
    const m = src.match(/const ARTICLE_CARD_MD = '([^']+)'/);
    expect(m, 'ARTICLE_CARD_MD not found — was it renamed or inlined?').toBeTruthy();
    expect(m![1]).toBe(MD);
  });

  // The `.s-card` plate is 768 CSS px at desktop. Reaching for DES-18's row
  // rendition here would upscale 1.45x on every desktop category page — which
  // is exactly why there are two rungs and not one.
  it('is a different rung from the row thumbnail, and the row rung is too small', () => {
    expect(MD).not.toBe(MIDSIZE_COVER.NAME);
    expect(768 / MIDSIZE_COVER.WIDTH).toBeGreaterThan(1.1);
  });
});

// ── 2. The resolver ─────────────────────────────────────────────────────────
describe('resolveCardSource', () => {
  const lowUrl = 'https://images.example.com/inspire/a/b/low.webp';
  const mdUrl = 'https://images.example.com/inspire/a/b/crop-4x3-article-card-md.webp?v=x';
  const smUrl = 'https://images.example.com/inspire/a/b/crop-4x3-article-card-sm.webp?v=x';
  const variants = { low: { url: lowUrl } };

  it('prefers the card rendition and returns its REAL intrinsics', () => {
    const got = resolveCardSource(
      variants,
      { [MD]: { url: mdUrl, width: 792, height: 594 } },
      null,
    );
    expect(got).toEqual({ src: mdUrl, width: 792, height: 594 });
  });

  // The four covers whose 4:3 crop is only 667px wide — a 4:3 crop cannot be
  // wider than the photograph it came from. `withoutEnlargement` gives a short
  // file; the stored width is the truth and the call site caps `max-width` at
  // it (T3). Restating 792 here would be a 1.19x upscale that the gate would
  // catch and a reader would not.
  it('reports a genuinely smaller rendition at its own size, never at the target', () => {
    const got = resolveCardSource(
      variants,
      { [MD]: { url: mdUrl, width: 667, height: 500 } },
      null,
    );
    expect(got).toEqual({ src: mdUrl, width: 667, height: 500 });
  });

  it('does NOT reach for the row thumbnail rendition when the card one is absent', () => {
    const got = resolveCardSource(
      variants,
      { [MIDSIZE_COVER.NAME]: { url: smUrl, width: 528, height: 396 } },
      null,
    );
    expect(got).toEqual({ src: lowUrl, width: null, height: null });
  });

  // The fallback is the PREVIOUS behaviour, and it is still an R2 violation.
  // The gate reads the served filename, not this function's intent, so a cover
  // that lands here goes red rather than passing quietly.
  it('falls back to low with NULL dimensions when there is no rendition', () => {
    expect(resolveCardSource(variants, {}, null)).toEqual({
      src: lowUrl,
      width: null,
      height: null,
    });
  });

  // `getSmartCropRef` returns url + width + height or nothing. An entry with
  // unrecorded dimensions must degrade rather than ship an asserted intrinsic
  // width — the exact defect hero-rules R4 exists to name, found live on the
  // site's highest-traffic template by UI-12 S1.
  it('falls back to low when the rendition has no recorded dimensions', () => {
    expect(resolveCardSource(variants, { [MD]: { url: mdUrl } }, null)).toEqual({
      src: lowUrl,
      width: null,
      height: null,
    });
  });

  // ⚠ THIS PATH IS THE ONE AN ADVERSARIAL REVIEW CAUGHT, and it is why the
  // gate's R2 check is an allow-list. The raw ingested cover's filename is
  // `1724000000-tepak-sirih` — none of `low`, `high` or `original` — so a
  // deny-list of those three names is SILENT on it, while the file is an
  // uncropped source-aspect photograph going into a hard 4:3 box. R1 only
  // catches it past 15%, and four of the five plate shapes measured on
  // production (1.500, 1.499, 1.498, 1.344) sit under that.
  //
  // The resolver's behaviour here is correct and unchanged — degrading to the
  // raw file is better than rendering nothing. What had to change was the
  // check, which now requires a `crop-*` stem.
  it('falls back to the raw cover URL when there is no variant record at all', () => {
    const raw = 'https://images.example.com/inspire/a/1724000000-tepak-sirih.jpg';
    expect(resolveCardSource(null, null, raw)).toEqual({ src: raw, width: null, height: null });
    // The stem the gate will read off that URL, spelled out so the join between
    // this resolver and `grid-thumb-variant` is visible from either side.
    const stem = new URL(raw).pathname
      .split('/')
      .pop()!
      .replace(/\.[a-z0-9]+$/i, '');
    expect(stem).toBe('1724000000-tepak-sirih');
    expect(stem.toLowerCase().startsWith('crop-')).toBe(false);
  });

  it('returns null when there is nothing to render', () => {
    expect(resolveCardSource(null, null, null)).toBeNull();
  });

  // The two resolvers feed two different boxes and must not converge.
  it('is independent of resolveRowThumbSource on the same article', () => {
    const crops = {
      [MD]: { url: mdUrl, width: 792, height: 594 },
      [MIDSIZE_COVER.NAME]: { url: smUrl, width: 528, height: 396 },
    };
    expect(resolveCardSource(variants, crops, null)!.src).toBe(mdUrl);
    expect(resolveRowThumbSource(variants, crops, null)!.src).toBe(smUrl);
  });
});
