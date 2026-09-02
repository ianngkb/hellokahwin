import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ARTICLE_COVER_MD, MIDSIZE_COVER } from '../midsize-cover';
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
// It was pinned here as a literal while UI-16 sat unmerged, because UI-15 must
// not import a constant from an unmerged branch and must not define a second
// one either. UI-16 merged first (PR #65), so the literal below is now the
// join between this test and UI-16's `ARTICLE_COVER_MD`, and the assertion is
// that there is exactly ONE definition of the key in the tree.
describe('the card rendition key', () => {
  it('is the exact string production stores and serves', () => {
    expect(ARTICLE_COVER_MD.NAME).toBe(MD);
  });

  // ⚠ THE REGRESSION THIS GUARDS IS A SECOND DEFINITION, NOT A WRONG ONE.
  // `NAME` is the R2 object key AND the `coverImageSmartCrops` key, so a rename
  // has to orphan 96 live objects in one edit to be noticed. It only stays that
  // way while `midsize-cover.ts` is the single place it is written down: a
  // module that re-declares the string is a module that keeps serving the old
  // key after the rename, and half of production follows it.
  it('is defined once — responsive-cover.ts imports it and does not restate it', () => {
    const src = readFileSync('src/lib/storage/responsive-cover.ts', 'utf8');
    expect(
      src.includes(`'${MD}'`),
      'responsive-cover.ts hardcodes the rendition key again — import ARTICLE_COVER_MD.NAME instead',
    ).toBe(false);
    expect(src).toMatch(/import \{[^}]*ARTICLE_COVER_MD[^}]*\} from '\.\/midsize-cover'/);
  });

  // The `.s-card` plate is 768 CSS px at desktop and DES-18's row rendition is
  // 528, so it cannot FILL this slot — which is why there are two rungs and not
  // one. It is still rung 2 here: the call site caps the plate at the asset's
  // own width, so a cover that has only the 528 paints a narrower plate rather
  // than a stretched one. "Too small to fill" and "unusable" are different
  // claims and only the first one is true.
  it('is a different rung from the row thumbnail, and the row rung cannot fill the slot', () => {
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

  // ⚠ THIS ASSERTION USED TO BE ITS OWN OPPOSITE, and the reversal is the
  // finding. It read "does NOT reach for the row thumbnail rendition" and fell
  // straight to `low`, on the reasoning that 528px upscales 1.45x in a 768px
  // column. That reasoning ignored the cap: the call site sets `max-width` to
  // the asset's own width (T3), so the plate NARROWS to 528 CSS px and upscales
  // nothing.
  //
  // What changed the answer was UI-16 measuring the cost of the other choice.
  // Its resolver fell from the `-md` rung to the FULL crop and shipped; on
  // production, hours later, six articles carried 4,742,962 B of cover, a mean
  // of 790 KB on the LCP element, 12.5x heavier than the code it replaced —
  // with every rule green, because a pure byte defect has no rule behind it.
  // Rung 2 is what stands between those two failure modes: 528px at a median
  // 17,664 B, R2-green because it is a named crop, R5-green because of the cap.
  it('falls to the row thumbnail rendition as rung 2, at its own size', () => {
    const got = resolveCardSource(
      variants,
      { [MIDSIZE_COVER.NAME]: { url: smUrl, width: 528, height: 396 } },
      null,
    );
    expect(got).toEqual({ src: smUrl, width: 528, height: 396 });
  });

  // Rung 1 wins when both are present. Asserted rather than assumed: the two
  // rungs differ by 264px of width and an order of magnitude of nothing else,
  // so a reversed loop would be invisible in every other test here.
  it('prefers the card rendition over the row one when both exist', () => {
    const got = resolveCardSource(
      variants,
      {
        [MD]: { url: mdUrl, width: 792, height: 594 },
        [MIDSIZE_COVER.NAME]: { url: smUrl, width: 528, height: 396 },
      },
      null,
    );
    expect(got).toEqual({ src: mdUrl, width: 792, height: 594 });
  });

  // ⚠ THE RUNG THAT IS DELIBERATELY ABSENT. UI-16's ladder ends with the full
  // `crop-4x3-article-card` (111 KB–1.4 MB) before `low`; this one does not,
  // because `.s-card` is a lead plate in a scrolling list. A cover carrying the
  // full crop and neither rendition takes the visible R2 hit instead — the gate
  // reports it — rather than paying up to 1.4 MB to hide it.
  it('does NOT reach for the full crop — that rung belongs to UI-16 and costs 12.5x', () => {
    const full = 'https://images.example.com/inspire/a/b/crop-4x3-article-card.webp?v=x';
    const got = resolveCardSource(
      variants,
      { 'crop-4x3-article-card': { url: full, width: 1600, height: 1200 } },
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
