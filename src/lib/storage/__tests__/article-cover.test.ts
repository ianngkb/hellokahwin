import { describe, expect, it } from 'vitest';
import { ARTICLE_COVER_MD, COVER_RENDITIONS, MIDSIZE_COVER } from '../midsize-cover';
import { resolveArticleCoverSource } from '../responsive-cover';

/**
 * UI-16. The article cover figure served `low.webp` in a shaped box on the
 * template that draws ~28% of this site's impressions. Everything asserted here
 * is a rule that was live-red on production on 02 September 2026, or a way the
 * fix could regress without any visible symptom.
 */

const DIR = 'https://images.example.com/inspire/garden-wedding/1787397040017-cover';
const lowUrl = `${DIR}/low.webp`;
const mdUrl = `${DIR}/crop-4x3-article-card-md.webp?v=g48c0b959`;
const smUrl = `${DIR}/crop-4x3-article-card-sm.webp?v=g48c0b959`;
const cardUrl = `${DIR}/crop-4x3-article-card.webp?v=g48c0b959`;
const variants = { low: { url: lowUrl } };

describe('the two rungs are one ladder', () => {
  // DES-18 added its rendition to ingest and to the backfill in two separate
  // edits. A third rung added the same way is a third chance to add it to only
  // one of them, and the symptom — covers ingested after the deploy silently
  // missing the rendition — has no visual signal at all.
  it('COVER_RENDITIONS carries both, and both resize the same stored crop', () => {
    expect(COVER_RENDITIONS.map((r) => r.NAME)).toEqual([
      MIDSIZE_COVER.NAME,
      ARTICLE_COVER_MD.NAME,
    ]);
    for (const r of COVER_RENDITIONS) expect(r.SOURCE_NAME).toBe('crop-4x3-article-card');
  });

  // 792 is not a round number: it is the smallest width that fills this slot's
  // widest measured box (756 CSS px at 1440/1920, production 02 Sept 2026)
  // without upscaling, and it is exactly 1.5x DES-18's rung so the two are one
  // box at two scales. If someone shrinks it to "save bytes", R5 goes red on
  // every article at once and this says so before the deploy does.
  it('the md rung still clears the widest measured box (756 CSS px)', () => {
    expect(ARTICLE_COVER_MD.WIDTH).toBeGreaterThanOrEqual(756);
    expect(ARTICLE_COVER_MD.WIDTH / ARTICLE_COVER_MD.HEIGHT).toBeCloseTo(4 / 3, 5);
    expect(ARTICLE_COVER_MD.WIDTH).toBe(MIDSIZE_COVER.WIDTH * 1.5);
  });

  // The ceiling is DES-03 §6.2's 46,080 B card figure area-scaled to this box.
  // Measured on the corpus the max lands at 100,990 B — 2.6% under — so no live
  // cover exercises the ladder's step-down. A ceiling nothing hits is a ceiling
  // nobody has tested, which is why the arithmetic is asserted rather than the
  // corpus being trusted to keep hitting it.
  it('the ceiling is the area-scaled DES-03 card ceiling, not a fresh guess', () => {
    const areaRatio =
      (ARTICLE_COVER_MD.WIDTH * ARTICLE_COVER_MD.HEIGHT) /
      (MIDSIZE_COVER.WIDTH * MIDSIZE_COVER.HEIGHT);
    expect(areaRatio).toBeCloseTo(2.25, 5);
    expect(ARTICLE_COVER_MD.CEILING_BYTES).toBe(MIDSIZE_COVER.CEILING_BYTES * areaRatio);
  });
});

describe('resolveArticleCoverSource', () => {
  // R2: `low`/`high`/`original` are never eligible for a shaped slot. This is
  // the assertion the live defect would have failed.
  it('prefers the md rendition and never returns low when a crop exists', () => {
    const got = resolveArticleCoverSource(
      variants,
      {
        [ARTICLE_COVER_MD.NAME]: { url: mdUrl, width: 792, height: 594 },
        [ARTICLE_COVER_MD.SOURCE_NAME]: { url: cardUrl, width: 911, height: 683 },
      },
      null,
    );
    expect(got).toEqual({
      src: mdUrl,
      width: 792,
      height: 594,
      boxAspect: '4/3',
      variant: ARTICLE_COVER_MD.NAME,
    });
  });

  // ── THE REGRESSION THIS TEST EXISTS FOR ──────────────────────────────────
  //
  // The first version of this resolver fell from the md rendition STRAIGHT to
  // the full crop. Measured on production hours after it shipped: six articles
  // re-ingested from a checkout without this commit lost the `-md` key (ingest
  // REPLACES the whole crops object), landed on the full crop, and served
  // 4,742,962 B of cover — a mean of 790 KB on the LCP element, 12.5x the
  // `low` this item replaced. Every rule stayed green: 4:3 box, 4:3 file,
  // downscaling, and a named crop, so aspect, upscale and R2 all read zero.
  //
  // `-sm` is DES-18's 528px rung and every one of those six HAD it. Preferring
  // it costs a narrower plate for the minutes a cover is un-backfilled and
  // saves ~768,000 bytes an article.
  it('prefers the SMALL rendition over the full crop when md is missing', () => {
    const got = resolveArticleCoverSource(
      variants,
      {
        [MIDSIZE_COVER.NAME]: { url: smUrl, width: 528, height: 396 },
        [ARTICLE_COVER_MD.SOURCE_NAME]: { url: cardUrl, width: 1600, height: 1200 },
      },
      null,
    );
    expect(got?.variant).toBe(MIDSIZE_COVER.NAME);
    expect(got?.width).toBe(528);
    expect(got?.boxAspect).toBe('4/3');
  });

  // Rung 3 survives for the one case rung 2 cannot serve: the full crop and
  // neither rendition. Heavy-but-correct still beats wrongly-shaped, and beats
  // `low` by R2 outright.
  it('falls back to the full 4:3 crop, not to low, when both renditions are absent', () => {
    const got = resolveArticleCoverSource(
      variants,
      { [ARTICLE_COVER_MD.SOURCE_NAME]: { url: cardUrl, width: 911, height: 683 } },
      null,
    );
    expect(got?.variant).toBe(ARTICLE_COVER_MD.SOURCE_NAME);
    expect(got?.width).toBe(911);
    expect(got?.boxAspect).toBe('4/3');
  });

  // `withoutEnlargement` means a narrow source yields a short file. Read back
  // from production after the backfill, the 96 renditions are 91 at 792x594,
  // FOUR at 667x500 (an 800x500 source photograph) and one at 771x578. The stored
  // width is the truth and the caller caps the box to it; restating 792 here
  // would be a 1.19x upscale the gate reports as R5 and nobody sees.
  it('reports a short rendition at its own size, never at the target', () => {
    const got = resolveArticleCoverSource(
      variants,
      { [ARTICLE_COVER_MD.NAME]: { url: mdUrl, width: 667, height: 500 } },
      null,
    );
    expect(got?.width).toBe(667);
    expect(got?.height).toBe(500);
  });

  // `getSmartCropRef` returns url/width/height or nothing. An entry with no
  // recorded dimensions must degrade rather than ship an asserted intrinsic
  // size — hero-rules R4, and the exact defect UI-12 S1 found live.
  it('skips a rendition whose dimensions were never recorded', () => {
    const got = resolveArticleCoverSource(
      variants,
      {
        [ARTICLE_COVER_MD.NAME]: { url: mdUrl },
        [ARTICLE_COVER_MD.SOURCE_NAME]: { url: cardUrl, width: 911, height: 683 },
      },
      null,
    );
    expect(got?.variant).toBe(ARTICLE_COVER_MD.SOURCE_NAME);
  });

  // The `low` fallback is reachable only by a cover with no smart crops at all
  // (zero of 96 published covers on 02 Sept 2026). It must NOT drag a 4:3 box
  // with it: `low` preserves the source aspect, and pairing it with 4/3 is the
  // R1 failure this item's box change would otherwise have introduced.
  it('carries the 3:2 box, and null dimensions, down to the low fallback', () => {
    const got = resolveArticleCoverSource(variants, {}, null);
    expect(got).toEqual({
      src: lowUrl,
      width: null,
      height: null,
      boxAspect: '3/2',
      variant: 'low',
    });
  });

  it('falls back to the raw cover URL when there is no variant record at all', () => {
    const raw = 'https://images.example.com/inspire/a/cover.jpg';
    expect(resolveArticleCoverSource(null, null, raw)?.src).toBe(raw);
  });

  it('returns null when there is nothing to render', () => {
    expect(resolveArticleCoverSource(null, null, null)).toBeNull();
  });
});
