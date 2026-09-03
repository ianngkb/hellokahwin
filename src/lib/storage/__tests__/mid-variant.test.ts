import { describe, it, expect, vi } from 'vitest';
import { encodeUnderCeiling, type CeilingSpec } from '../byte-ceiling';
import { getArticleVariantUrl } from '../article-image-variant';

/**
 * The Ahrefs image item, 04 September 2026. Each block below is a defect this
 * change could plausibly ship, written as the assertion that catches it —
 * not a restatement of the implementation.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. THE LADDER
//
// A ceiling nothing hits is a ceiling nobody has tested. Production's corpus
// mostly lands on rung 0, so the step-down is proved here rather than by the
// data happening to need it — the same argument `midsize-cover.ts` makes for
// its own ladder.
// ─────────────────────────────────────────────────────────────────────────────

const SPEC: CeilingSpec = { CEILING_BYTES: 1000, QUALITY_LADDER: [72, 60, 48, 36] };

/**
 * A stand-in for a `sharp` pipeline. `bytesAt` decides how big each quality
 * encodes to, so a test can describe a photograph rather than mock a codec.
 */
function fakePipeline(bytesAt: (q: number) => number) {
  const calls: number[] = [];
  const build = (quality: number) => {
    calls.push(quality);
    return {
      toBuffer: async () => ({
        data: Buffer.alloc(bytesAt(quality)),
        info: { width: 1400, height: 933 },
      }),
      // `encodeUnderCeiling` only ever calls `toBuffer`; the cast keeps the
      // fake honest about that rather than stubbing the whole sharp surface.
    } as unknown as import('sharp').Sharp;
  };
  return { build, calls };
}

describe('encodeUnderCeiling', () => {
  it('stops at the first rung that fits and never encodes again', async () => {
    const { build, calls } = fakePipeline(() => 800);
    const result = await encodeUnderCeiling(build, SPEC);

    expect(result.bytes).toBe(800);
    expect(result.quality).toBe(72);
    expect(result.overCeiling).toBe(false);
    // The overwhelming majority of the corpus is this case. One encode, not four.
    expect(calls).toEqual([72]);
  });

  it('steps down only as far as it has to', async () => {
    // Over at 72 and 60, fits at 48. `songket-tenunan-tangan-atau-cetak` is the
    // real photograph shaped like this — handwoven cloth is close to worst-case
    // entropy for a block encoder.
    const { build, calls } = fakePipeline((q) => (q >= 60 ? 1400 : 900));
    const result = await encodeUnderCeiling(build, SPEC);

    expect(result.quality).toBe(48);
    expect(result.bytes).toBe(900);
    expect(result.overCeiling).toBe(false);
    expect(calls).toEqual([72, 60, 48]);
  });

  it('builds a FRESH pipeline for every rung', async () => {
    // The trap the module header names: a `sharp` object is consumed by
    // `toBuffer()`. Reusing one would return rung 0's bytes forever, so the
    // ladder would look like it worked and never actually step. Distinct sizes
    // per quality can only come back if `build` was called again.
    const seen: number[] = [];
    const build = (quality: number) => {
      seen.push(quality);
      return {
        toBuffer: async () => ({
          data: Buffer.alloc(quality * 20),
          info: { width: 10, height: 10 },
        }),
      } as unknown as import('sharp').Sharp;
    };

    const result = await encodeUnderCeiling(build, {
      CEILING_BYTES: 1000,
      QUALITY_LADDER: [72, 48],
    });

    expect(seen).toEqual([72, 48]);
    expect(result.bytes).toBe(960); // 48 * 20 — the SECOND encode, not the first.
  });

  it('returns the last attempt flagged rather than throwing when every rung misses', async () => {
    // Deliberate: an oversized file must not fail an editor's upload. The
    // backfills are what turn this flag into a non-zero exit.
    const { build, calls } = fakePipeline(() => 5000);
    const result = await encodeUnderCeiling(build, SPEC);

    expect(result.overCeiling).toBe(true);
    expect(result.quality).toBe(36); // the last rung
    expect(calls).toEqual([72, 60, 48, 36]);
  });

  it('throws on a ladder with no rungs', async () => {
    // A configuration error, not a byte problem — returning a null result here
    // would surface as an unreadable crash much further downstream.
    const { build } = fakePipeline(() => 10);
    await expect(
      encodeUnderCeiling(build, { CEILING_BYTES: 1000, QUALITY_LADDER: [] }),
    ).rejects.toThrow(/QUALITY_LADDER is empty/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. THE PRESET NUMBERS
//
// Asserted as INVARIANTS rather than as the literals, so the test says why each
// number has to hold instead of restating it.
// ─────────────────────────────────────────────────────────────────────────────

describe('MID_PRESET', () => {
  it('clears 2x retina for the 680px article figure', async () => {
    const { MID_PRESET } = await import('../image-variants');
    // Every body figure and single-column gallery cell in `article-renderer.tsx`
    // paints into `max-w-[680px]`. Below 1360 the image is resampled UP on a 2x
    // display, which is the one thing this rung must never do.
    expect(MID_PRESET.maxWidth).toBeGreaterThanOrEqual(680 * 2);
  });

  it('starts its ladder at its own declared quality', async () => {
    const { MID_PRESET } = await import('../image-variants');
    // Otherwise `quality` is a decorative field: generation would use the
    // ladder's first rung and the preset would advertise a number it never uses.
    expect(MID_PRESET.QUALITY_LADDER[0]).toBe(MID_PRESET.quality);
  });

  it('has a strictly descending ladder', async () => {
    const { MID_PRESET } = await import('../image-variants');
    // `encodeUnderCeiling` returns the FIRST rung that fits. An out-of-order
    // rung would hand back a smaller file than necessary and silently throw
    // away quality the ceiling was willing to pay for.
    const ladder = [...MID_PRESET.QUALITY_LADDER];
    expect(ladder).toEqual([...ladder].sort((a, b) => b - a));
    expect(new Set(ladder).size).toBe(ladder.length);
  });

  it('is meaningfully under the 500 KB the audit calls a body-image failure', async () => {
    const { MID_PRESET } = await import('../image-variants');
    expect(MID_PRESET.CEILING_BYTES).toBeLessThan(500_000);
  });
});

describe('CROP_CEILING', () => {
  it('starts at q100 so an under-budget crop is byte-identical to before', async () => {
    // This is the entire blast-radius argument for adding a ceiling to crops
    // that already exist on production. q100 was the encoder setting before the
    // ceiling; if rung 0 moves off it, every crop on the site re-encodes and
    // the change stops being surgical.
    const { CROP_CEILING } = await import('../smart-crop');
    expect(CROP_CEILING.QUALITY_LADDER[0]).toBe(100);
  });

  it('is a descending ladder under the audit ceiling', async () => {
    const { CROP_CEILING } = await import('../smart-crop');
    const ladder = [...CROP_CEILING.QUALITY_LADDER];
    expect(ladder).toEqual([...ladder].sort((a, b) => b - a));
    expect(CROP_CEILING.CEILING_BYTES).toBe(300_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. PRESET SELECTION
//
// `getDefaultPresets` merges over the defaults. Before this change it returned
// the admin row verbatim, and `article-renderer.tsx` now asks for `mid.webp` by
// NAME — so a row that omits `mid` used to be able to delete the rung the whole
// article body depends on, with a 404 as the only symptom.
// ─────────────────────────────────────────────────────────────────────────────

const limit = vi.fn();
vi.mock('@/lib/db/drizzle', () => ({
  db: { select: () => ({ from: () => ({ where: () => ({ limit }) }) }) },
}));
vi.mock('@/lib/db/schema', () => ({ adminSettings: { key: 'key' } }));

describe('getDefaultPresets', () => {
  // No `beforeEach(mockReset)`: every test below sets `limit`'s implementation
  // itself, so the reset bought nothing — and combining it with the throwing
  // implementation in the last test makes Vitest 4 surface that throw as an
  // unhandled test error even though `getDefaultPresets` demonstrably catches
  // it (verified: the call returns the defaults and raises nothing). The reset
  // is the quirk's trigger, not the throw.

  it('returns the code defaults when no admin row exists', async () => {
    // The live state on production, read 04 September 2026: zero `image_%` keys
    // in `admin_settings`.
    limit.mockResolvedValue([]);
    const { getDefaultPresets } = await import('../image-variants');
    const presets = await getDefaultPresets();

    expect(Object.keys(presets).sort()).toEqual(['high', 'low', 'mid']);
    expect(presets.mid).toEqual({ quality: 72, maxWidth: 1400 });
  });

  it('keeps mid when an admin row omits it', async () => {
    // The regression this merge exists to prevent. A row written before `mid`
    // existed is exactly this shape.
    limit.mockResolvedValue([
      { value: { low: { quality: 30, maxWidth: 1200 }, high: { quality: 80, maxWidth: 2400 } } },
    ]);
    const { getDefaultPresets } = await import('../image-variants');
    const presets = await getDefaultPresets();

    expect(presets.mid).toEqual({ quality: 72, maxWidth: 1400 });
  });

  it('still lets an admin retune a preset, which is what the row is for', async () => {
    limit.mockResolvedValue([{ value: { mid: { quality: 60, maxWidth: 1500 } } }]);
    const { getDefaultPresets } = await import('../image-variants');
    const presets = await getDefaultPresets();

    expect(presets.mid).toEqual({ quality: 60, maxWidth: 1500 });
    expect(presets.low).toEqual({ quality: 30, maxWidth: 1200 }); // untouched
  });

  it('falls back to the defaults when the settings read throws', async () => {
    // A synchronous throw rather than `mockRejectedValue`: the latter leaves a
    // rejected promise parked on the mock that vitest reports as unhandled even
    // though `getDefaultPresets` catches the one it actually awaits. Both reach
    // the same `catch`; this one does not make the suite lie.
    limit.mockImplementation(() => {
      throw new Error('relation "admin_settings" does not exist');
    });
    const { getDefaultPresets } = await import('../image-variants');
    const presets = await getDefaultPresets();

    expect(presets.mid).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3b. THE SETTINGS ROW IS UNVALIDATED JSONB
//
// Every case below was a live defect found in review, not a hypothetical: the
// merge was one level deep and the ladder ignored the merged quality, so an
// admin row could either reintroduce the oversized figure this change removes,
// or silently do nothing at all.
// ─────────────────────────────────────────────────────────────────────────────

describe('mergePresets', () => {
  it('fills a half-written preset from the default, field by field', async () => {
    const { mergePresets } = await import('../image-variants');
    // A shallow spread would leave `maxWidth` undefined here, and sharp reads
    // `resize({ width: undefined })` as "do not resize" — a full-resolution
    // `mid.webp` with the ladder grinding to q30 trying to fit 350 KB.
    const merged = mergePresets({ mid: { quality: 60 } });
    expect(merged.mid).toEqual({ quality: 60, maxWidth: 1400 });
  });

  it('ignores a row that is not an object', async () => {
    const { mergePresets } = await import('../image-variants');
    // The column is JSONB; nothing validates what is written into it. Spreading
    // a string would add numeric keys `0`, `1`, … as presets, and generation
    // would PUT `<dir>/0.webp` to R2 and record it in `media.variants`.
    for (const junk of ['abc', ['low', 'high'], 42, null] as unknown[]) {
      const merged = mergePresets(junk as Record<string, never>);
      expect(Object.keys(merged).sort()).toEqual(['high', 'low', 'mid']);
    }
  });

  it('ignores a preset whose value is not an object', async () => {
    const { mergePresets } = await import('../image-variants');
    const merged = mergePresets({ mid: 'nonsense' as unknown as { quality: number } });
    expect(merged.mid).toEqual({ quality: 72, maxWidth: 1400 });
  });

  it('drops an unknown preset that has no default to complete it', async () => {
    const { mergePresets } = await import('../image-variants');
    // Half a preset nobody declared generates a variant nobody specified.
    const merged = mergePresets({ tiny: { quality: 20 } });
    expect(merged.tiny).toBeUndefined();
  });

  it('accepts an unknown preset that is fully specified', async () => {
    const { mergePresets } = await import('../image-variants');
    const merged = mergePresets({ tiny: { quality: 20, maxWidth: 320 } });
    expect(merged.tiny).toEqual({ quality: 20, maxWidth: 320 });
  });
});

describe('ladderFor', () => {
  it('starts at the effective preset quality, not the constant', async () => {
    const { ladderFor, MID_PRESET } = await import('../image-variants');
    // The defect: `encodeUnderCeiling` was handed `MID_PRESET` directly, whose
    // ladder starts at 72. An admin row asking for q60 got `maxWidth` honoured
    // and `quality` ignored — a LARGER file than requested, silently.
    const ladder = ladderFor({ quality: 60, maxWidth: 1500 }, MID_PRESET);
    expect(ladder.QUALITY_LADDER[0]).toBe(60);
  });

  it('drops rungs at or above the requested quality', async () => {
    const { ladderFor, MID_PRESET } = await import('../image-variants');
    // The first rung that fits wins, so a higher rung left in front would hand
    // back a bigger file than was asked for.
    const ladder = ladderFor({ quality: 60, maxWidth: 1500 }, MID_PRESET);
    expect(ladder.QUALITY_LADDER.every((q, i) => i === 0 || q < 60)).toBe(true);
    expect(ladder.QUALITY_LADDER).toEqual([60, 54, 48, 42, 36, 30]);
  });

  it('keeps the ceiling it was given', async () => {
    const { ladderFor, MID_PRESET } = await import('../image-variants');
    expect(ladderFor({ quality: 60, maxWidth: 1500 }, MID_PRESET).CEILING_BYTES).toBe(
      MID_PRESET.CEILING_BYTES,
    );
  });

  it('leaves the default preset on its declared ladder', async () => {
    const { ladderFor, MID_PRESET } = await import('../image-variants');
    const ladder = ladderFor(
      { quality: MID_PRESET.quality, maxWidth: MID_PRESET.maxWidth },
      MID_PRESET,
    );
    expect(ladder.QUALITY_LADDER).toEqual([...MID_PRESET.QUALITY_LADDER]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. THE URL REWRITE
// ─────────────────────────────────────────────────────────────────────────────

describe('getArticleVariantUrl', () => {
  const base = 'https://images.hellokahwin.com/inspire/amankila-bali/1787396290573-RW-10-683x1';

  it('rewrites high to mid', () => {
    expect(getArticleVariantUrl(`${base}/high.webp`, 'mid')).toBe(`${base}/mid.webp`);
  });

  it('rewrites an original of any extension to mid', () => {
    for (const ext of ['webp', 'jpg', 'jpeg', 'png']) {
      expect(getArticleVariantUrl(`${base}/original.${ext}`, 'mid')).toBe(`${base}/mid.webp`);
    }
  });

  it('is idempotent, so a mid URL survives a second pass', () => {
    // `mid` had to be added to the match pattern as well as the union type.
    // Without that, re-rewriting a `mid.webp` would fall through unchanged —
    // harmless here, but it would silently break a later `mid` → `low` step.
    expect(getArticleVariantUrl(`${base}/mid.webp`, 'mid')).toBe(`${base}/mid.webp`);
    expect(getArticleVariantUrl(`${base}/mid.webp`, 'low')).toBe(`${base}/low.webp`);
  });

  it('preserves a query string', () => {
    expect(getArticleVariantUrl(`${base}/high.webp?v=2`, 'mid')).toBe(`${base}/mid.webp?v=2`);
  });

  it('leaves a URL it does not recognise alone', () => {
    // Covers live at `/{timestamp}-cover.{ext}` and must come from
    // `coverImageVariants`, never from this helper.
    const cover = 'https://images.hellokahwin.com/inspire/amankila-bali/1787396256716-cover.jpg';
    expect(getArticleVariantUrl(cover, 'mid')).toBe(cover);
  });
});
