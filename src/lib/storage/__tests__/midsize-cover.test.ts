import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MIDSIZE_COVER } from '../midsize-cover';
import { resolveRowThumbSource } from '../responsive-cover';

/**
 * DES-18. Three things are asserted here, and each one is a defect this repo
 * has actually shipped or nearly shipped, not a hypothetical.
 */

// ── 1. The re-queue guard ────────────────────────────────────────────────────
//
// The whole cost model of DES-18 is that the mid-size rendition is a RESIZE of
// an existing crop, so `GEOMETRY_VERSION` does not move and no live cover is
// re-cut through Rekognition + R2. That is an AWS-cost decision belonging to
// the owner, and `GEOMETRY_VERSION` is DERIVED — so the way to break it is not
// to edit a constant but to add a fifth `CROP_TARGETS` entry, which looks like
// an ordinary addition in a diff.
//
// The token every live crop URL carries on production, read from the database
// on 01 September 2026, is `g48c0b959`. If this test goes red, whatever changed
// re-queues all 86 covers and needs the owner's sign-off, not a green tick.
describe('GEOMETRY_VERSION is not moved by the mid-size rendition', () => {
  it('still hashes to the token the live crop URLs carry', () => {
    // Parsed from source rather than imported, because importing `smart-crop.ts`
    // pulls in sharp and the AWS SDK for a string comparison.
    const src = readFileSync('src/lib/storage/smart-crop.ts', 'utf8');
    const block = src.match(/export const CROP_TARGETS: SmartCropTarget\[\] = \[([\s\S]*?)\n\];/);
    expect(block, 'CROP_TARGETS array not found — did it move or get renamed?').toBeTruthy();

    const body = block![1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    const targets = [
      ...body.matchAll(
        /\{\s*name:\s*'([^']+)',\s*aspectRatio:\s*([0-9./\s]+),\s*outputWidth:\s*(\d+),\s*outputHeight:\s*(\d+)\s*\}/g,
      ),
    ].map(([, name, ratio, w, h]) => {
      const [num, den] = ratio.split('/').map((n) => Number(n.trim()));
      return {
        name,
        aspectRatio: den === undefined ? num : num / den,
        outputWidth: Number(w),
        outputHeight: Number(h),
      };
    });

    expect(targets.map((t) => t.name)).toEqual([
      'crop-4x5-mobile-cover',
      'crop-4.3x1-desktop-hero',
      'crop-4x3-article-card',
      'crop-16x9-og',
    ]);

    const version = createHash('sha1').update(JSON.stringify(targets)).digest('hex').slice(0, 8);
    expect(version).toBe('48c0b959');
  });

  it('does not list the mid-size rendition as a crop target', () => {
    const src = readFileSync('src/lib/storage/smart-crop.ts', 'utf8');
    const block = src.match(/export const CROP_TARGETS: SmartCropTarget\[\] = \[([\s\S]*?)\n\];/)!;
    expect(block[1]).not.toContain(MIDSIZE_COVER.NAME);
  });
});

// ── 2. The rendition's own contract ──────────────────────────────────────────
describe('MIDSIZE_COVER', () => {
  it('is exactly 4:3, so the .s-row box it feeds deviates 0%', () => {
    expect(MIDSIZE_COVER.WIDTH / MIDSIZE_COVER.HEIGHT).toBeCloseTo(4 / 3, 10);
  });

  it('is DPR 3 of the 176px desktop slot', () => {
    expect(MIDSIZE_COVER.WIDTH).toBe(176 * 3);
    expect(MIDSIZE_COVER.HEIGHT).toBe(132 * 3);
  });

  it('starts its ladder at the quality the art direction costed, and only descends', () => {
    expect(MIDSIZE_COVER.QUALITY_LADDER[0]).toBe(50);
    const rungs = [...MIDSIZE_COVER.QUALITY_LADDER];
    expect(rungs).toEqual([...rungs].sort((a, b) => b - a));
  });

  it('keeps DES-03 §6.2 card ceiling', () => {
    expect(MIDSIZE_COVER.CEILING_BYTES).toBe(46_080);
  });
});

// ── 3. The resolver, including the fallback nobody would notice breaking ─────
//
// `getSmartCropRef` returns all three of url/width/height or nothing. A
// rendition entry whose dimensions were not recorded must therefore degrade to
// `low`, NOT ship with an asserted intrinsic width — that assertion is the
// exact defect hero-rules R4 exists to name, and UI-12 S1 found it live on the
// site's highest-traffic template.
describe('resolveRowThumbSource', () => {
  const lowUrl = 'https://images.example.com/inspire/a/b/low.webp';
  const smUrl = 'https://images.example.com/inspire/a/b/crop-4x3-article-card-sm.webp?v=x';
  const variants = { low: { url: lowUrl } };

  it('prefers the mid-size rendition and returns its REAL intrinsics', () => {
    const got = resolveRowThumbSource(
      variants,
      { [MIDSIZE_COVER.NAME]: { url: smUrl, width: 528, height: 396 } },
      null,
    );
    expect(got).toEqual({ src: smUrl, width: 528, height: 396 });
  });

  it('reports a genuinely smaller rendition at its own size, never at the target', () => {
    // `withoutEnlargement` means a narrow source yields a short file. The stored
    // width is the truth; restating 528 here would be an upscale the gate
    // cannot see.
    const got = resolveRowThumbSource(
      variants,
      { [MIDSIZE_COVER.NAME]: { url: smUrl, width: 400, height: 300 } },
      null,
    );
    expect(got).toEqual({ src: smUrl, width: 400, height: 300 });
  });

  it('falls back to low with NULL dimensions when there is no rendition', () => {
    const got = resolveRowThumbSource(variants, {}, null);
    expect(got).toEqual({ src: lowUrl, width: null, height: null });
  });

  it('falls back to low when the rendition has no recorded dimensions', () => {
    const got = resolveRowThumbSource(variants, { [MIDSIZE_COVER.NAME]: { url: smUrl } }, null);
    expect(got).toEqual({ src: lowUrl, width: null, height: null });
  });

  it('falls back to the raw cover URL when there is no variant record at all', () => {
    const raw = 'https://images.example.com/inspire/a/cover.jpg';
    expect(resolveRowThumbSource(null, null, raw)).toEqual({
      src: raw,
      width: null,
      height: null,
    });
  });

  it('returns null when there is nothing to render', () => {
    expect(resolveRowThumbSource(null, null, null)).toBeNull();
  });
});
