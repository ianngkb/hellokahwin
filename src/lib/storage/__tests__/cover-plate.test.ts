import { describe, expect, it } from 'vitest';
import {
  COVER_PLATE,
  coverPlateAspect,
  coverPlateMaxWidth,
  coverPlateWidthPx,
} from '../cover-plate';
import { resolveCoverSource } from '../responsive-cover';

/**
 * CONT-15. Two contracts are asserted here, and each one is a defect this repo
 * has actually shipped, not a hypothetical.
 *
 * The first is the all-three-or-nothing resolver contract. UI-12 S1 deleted a
 * `1200w` descriptor that was a constant asserted in place of a measurement and
 * was 17.2% wrong on a live cover; the article cover figure then shipped
 * `width="1200" height="800"` for 1200×1800 photographs on 14 articles. Both
 * are the same defect: a plausible number standing in for an absent one. A
 * HALF-recorded row is the case that produces it, so it is tested directly.
 *
 * The second is the plate-width expression. Its inputs are the six aspects the
 * production corpus actually contains, and its expected outputs are the widths
 * the specification's table publishes — so if the constants move, the number
 * that moves with them is visible here rather than only on a rendered page.
 */

const LOW = 'https://images.hellokahwin.com/x/low.webp';
const RAW = 'https://images.hellokahwin.com/x/original.jpg';

describe('resolveCoverSource returns all three or none', () => {
  it('returns the recorded dimensions when both are present and numeric', () => {
    const cover = resolveCoverSource({ low: { url: LOW, width: 1200, height: 1800 } }, null, RAW);
    expect(cover).toEqual({ src: LOW, width: 1200, height: 1800 });
  });

  it('returns BOTH null when only width is recorded', () => {
    const cover = resolveCoverSource({ low: { url: LOW, width: 1200 } }, null, RAW);
    expect(cover).toEqual({ src: LOW, width: null, height: null });
  });

  it('returns BOTH null when only height is recorded', () => {
    const cover = resolveCoverSource({ low: { url: LOW, height: 1800 } }, null, RAW);
    expect(cover).toEqual({ src: LOW, width: null, height: null });
  });

  it('returns both null when neither is recorded', () => {
    const cover = resolveCoverSource({ low: { url: LOW } }, null, RAW);
    expect(cover).toEqual({ src: LOW, width: null, height: null });
  });

  // JSONB holds whatever was written into it. A numeric STRING is the shape a
  // hand-run `UPDATE` produces, and `"1200" / "1800"` would divide to the right
  // aspect while being the wrong type — a value that works until it does not.
  it('rejects numeric strings, zero, negatives and non-finite values', () => {
    for (const bad of [
      { width: '1200', height: '1800' },
      { width: 0, height: 1800 },
      { width: 1200, height: 0 },
      { width: -1200, height: 1800 },
      { width: Number.NaN, height: 1800 },
      { width: Number.POSITIVE_INFINITY, height: 1800 },
      { width: null, height: null },
    ]) {
      expect(resolveCoverSource({ low: { url: LOW, ...bad } }, null, RAW)).toEqual({
        src: LOW,
        width: null,
        height: null,
      });
    }
  });

  // The dimensions belong to `low`. When `low` is absent the raw cover URL is
  // served instead, and nothing is recorded about THAT file — borrowing another
  // record's numbers is the exact defect the contract exists to prevent.
  it('does not attach low’s dimensions to the raw-URL fallback', () => {
    const cover = resolveCoverSource({ high: { url: RAW, width: 4000, height: 3000 } }, null, RAW);
    expect(cover).toEqual({ src: RAW, width: null, height: null });
  });

  it('still returns null when there is no source at all', () => {
    expect(resolveCoverSource(null, null, null)).toBeNull();
    expect(resolveCoverSource({}, null, null)).toBeNull();
  });
});

describe('the plate-width expression', () => {
  // The specification's own table, 02 September 2026. Aspects are the six the
  // production corpus contains; the pairs are the real files behind them.
  const CASES: [string, number, number, number][] = [
    // aspect  fileW  fileH  resolved plate width at >= 1440
    ['0.667', 1200, 1800, 387], // 8 covers — the named failing case
    ['0.750', 1200, 1600, 435], // 4 covers
    ['1.255', 1200, 956, 728], // the one landscape plate the ceiling narrows
    ['1.333', 1600, 1200, 756], // full measure
    ['1.500', 1200, 800, 756], // the modal cover, 42 of 92 — pixel-for-pixel unchanged
    ['2.000', 2000, 1000, 756], // the widest cover in the corpus
  ];

  it.each(CASES)('aspect %s (%ix%i) resolves to %ipx', (_aspect, w, h, expected) => {
    expect(Math.round(coverPlateWidthPx(w, h))).toBe(expected);
  });

  it('never exceeds the measure and never exceeds the height ceiling', () => {
    for (const [, w, h] of CASES) {
      const width = coverPlateWidthPx(w, h);
      expect(width).toBeLessThanOrEqual(COVER_PLATE.MEASURE_PX);
      // The painted height is width / aspect, and the ceiling is what bounds it.
      // Sub-pixel tolerance, because the ceiling binds exactly at equality.
      expect(width / (w / h)).toBeLessThanOrEqual(COVER_PLATE.HEIGHT_CEILING_PX + 1e-9);
    }
  });

  // The break between the two constants. It has to sit in the corpus's empty
  // gap between 1.255 and 1.313, or a landscape cover narrows that the
  // specification says keeps full measure.
  it('breaks at 756 / 580 = 1.3034, inside the corpus gap', () => {
    const brk = COVER_PLATE.MEASURE_PX / COVER_PLATE.HEIGHT_CEILING_PX;
    expect(brk).toBeCloseTo(1.3034, 4);
    expect(brk).toBeGreaterThan(1.255);
    expect(brk).toBeLessThan(1.313);
  });

  // The value handed to CSS must stay an EXPRESSION. Pre-rounding it in JS
  // creates a second source of truth for the box width that drifts from
  // `aspect-ratio`, which derives from the same two integers at layout time.
  it('emits an unrounded expression, not a pixel integer', () => {
    expect(coverPlateMaxWidth(1200, 1800)).toBe('min(756px, calc(580px * 1200 / 1800))');
    expect(coverPlateMaxWidth(1200, 1800)).not.toMatch(/\b387px\b/);
  });

  it('emits the file’s own unreduced ratio as the aspect', () => {
    expect(coverPlateAspect(1200, 1800)).toBe('1200 / 1800');
    expect(coverPlateAspect(771, 1024)).toBe('771 / 1024');
  });

  // A negative control: the fallbacks in `.hk-cover-plate` are today's geometry,
  // so the unrecorded case must produce the box that ships right now.
  it('the CSS fallbacks reproduce today’s plate exactly', () => {
    expect(COVER_PLATE.MEASURE_PX).toBe(756);
    // 3 / 2 at 756 wide is 504 tall, which is what production paints today.
    expect(COVER_PLATE.MEASURE_PX / (3 / 2)).toBe(504);
  });
});
