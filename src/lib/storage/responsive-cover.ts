import { getSmartCropRef } from './smart-crop-url';
import { ARTICLE_COVER_MD, MIDSIZE_COVER } from './midsize-cover';

/**
 * The cover source for every card, row and article-cover `<img>` on the public
 * site: `low` (q30, ≤1200px — `src/lib/storage/image-variants.ts`), or the raw
 * `coverImageUrl` when there is no variant record.
 *
 * ── UI-12 S1: THE `srcset` IS GONE, AND IT IS NOT COMING BACK ──────────────
 * `docs/design/card-thumbnail-image-rules.md` §3 S1. This function used to
 * return `${low} 1200w, ${crop-4x3-article-card} 1600w`. Two independent
 * reasons to delete it, either one sufficient:
 *
 * 1. T1 / hero-rules R4 — a `w` descriptor must state the delivered file's REAL
 *    intrinsic width, read from the file. `ImageVariantMeta` is
 *    `{ url, sizeBytes }`: there is no width and no height recorded for `low`,
 *    `high` or `original`, so `1200w` was a constant asserted in place of a
 *    measurement. Measured on production 31 Ogos 2026: `garden-wedding`'s
 *    `low.webp` is genuinely **1024** wide — a 17.2% overstatement, live on the
 *    site's highest-traffic template. A descriptor that cannot be true must not
 *    be written. The smart crops keep theirs, because `getSmartCropRef` returns
 *    stored `width`/`height` or nothing.
 *
 * 2. hero-rules R3 / §0 — the two candidates were `low` (the SOURCE aspect:
 *    1.500, 1.333 or 0.667 depending on the article) and `crop-4x3-article-card`
 *    (1.333, a DIFFERENT photograph shape). Declaring those as interchangeable
 *    width candidates is `srcset` being used to choose a CROP, which is the
 *    exact mechanism UI-03 was written to retire. It was still shipping on
 *    three templates.
 *
 * It is a byte win, not a cost. On the article cover `sizes` resolved to 768px,
 * so every display at DPR ≥ 1.33 — every retina laptop and phone — selected the
 * `1600w` candidate and downloaded **488–946 KB** of a wrongly-shaped crop.
 * It now downloads `low` at **36–80 KB**.
 *
 * Measured effect on `scripts/ui-layout-gate.mjs`: **image-upscale 25 → 0**.
 * Those 25 were never an upscale — the gate reads `img.naturalWidth`, which on
 * a `srcset` element is the intrinsic width divided by the density the browser
 * derived from `sizes`, so a pure aspect mismatch (1.333 box, 1.500 asset) leaks
 * through `object-fit: cover` and surfaces as a 1.13× "upscale" on eleven
 * homepage rows that are in fact downscaling by 6×. Removing the untrue
 * `srcset` clears all 25 without touching a single image file.
 *
 * ⚠️ Callers must also drop their `sizes` attribute. `sizes` with no `srcset` is
 * inert, and an inert attribute that looks like a geometry declaration misleads
 * the next reader — which is how `sizes="176px"` came to be read as the row
 * thumbnail's width in the first place.
 */
export interface CoverSource {
  src: string;
}

type Variants = Record<string, { url: string } | undefined> | null | undefined;

export function resolveCoverSource(
  variants: Variants,
  /* Dead since S1 removed the `srcSet` this was the upgrade candidate for.
     Kept in the signature rather than removed because UI-12 §3 S1 names exactly
     one parameter to delete (`upgradeCropName`), and dropping this one as well
     rewrites the argument list at all six call sites — a wider edit than the
     spec authorises. Raised as a follow-up, not decided here. */
  smartCrops: unknown,
  fallbackUrl: string | null,
): CoverSource | null {
  const low = (variants as Record<string, { url: string } | undefined> | null)?.low?.url;
  const src = low ?? fallbackUrl ?? undefined;
  if (!src) return null;

  return { src };
}

/**
 * DES-18 — what the `.s-row` thumbnail loads, and ONLY the `.s-row` thumbnail.
 *
 * Three call sites must never disagree: the homepage "Terkini" list, the
 * catalogue's `CategoryRow`, and the article page's related list. All three
 * render the same component into the same box — 80×60 below 1024px, 176×132
 * above (`src/design-system/components.css`), both exactly 1.33333.
 *
 * ── WHY THIS IS NOT A CHANGE TO `resolveCoverSource` ───────────────────────
 * `resolveCoverSource` feeds FOUR differently-sized slots, and preferring a
 * 528px file in all of them would be a regression in two:
 *
 *   `.s-row`   80×60 / 176×132   528px is 3.0× at DPR 3      ← this function
 *   `.s-card`  ~328–700px wide   528px UPSCALES on desktop
 *   article cover figure, `aspect-[3/2]`, up to 768 CSS px — 528px upscales at
 *       DPR 1 and is the LCP element on the site's highest-traffic template;
 *       it also wants a 1.500 asset, and this is 1.333.
 *
 * So the mid-size rendition is opted INTO by slot class, not switched on
 * globally. The article cover keeps `low`, which UI-12 S1/S5 measured at a
 * 0.05% aspect deviation in its 3:2 box — it is already right and this must not
 * touch it.
 *
 * ── WHY IT IS A BYTE WIN, NOT A BYTE COST ──────────────────────────────────
 * Measured over all 86 published covers on 01 September 2026:
 *
 *   low.webp                    36,964 – 82,110 B   median ~50,000
 *   crop-4x3-article-card-sm     7,636 – 46,130 B   median  17,664
 *
 * The row that fetched `low` now fetches roughly a third of it AND gets the
 * right shape. `card-thumbnail-image-rules.md` §4 priced the only 4:3 asset
 * that existed at the time — the full 488–946 KB crop — at **+8.2 MB across the
 * homepage**, and correctly refused to spend it.
 *
 * Returns the STORED intrinsic dimensions when the rendition is present, so the
 * caller's `width`/`height` can state the file's real size instead of restating
 * the CSS box (hero-rules R4/R6). `getSmartCropRef` returns all three or
 * nothing, so an entry with unrecorded dimensions degrades to `low` rather than
 * shipping an asserted number — the exact defect R4 exists to name.
 */
export interface RowThumbSource {
  src: string;
  /** Real intrinsic pixels when known; null when falling back to `low`. */
  width: number | null;
  height: number | null;
}

export function resolveRowThumbSource(
  variants: Variants,
  smartCrops: unknown,
  fallbackUrl: string | null,
): RowThumbSource | null {
  const midsize = getSmartCropRef(smartCrops, MIDSIZE_COVER.NAME);
  if (midsize) {
    return { src: midsize.url, width: midsize.width, height: midsize.height };
  }

  // No rendition yet — a cover uploaded before DES-18's backfill, or one whose
  // crops have not regenerated. `low` is exactly what these rows shipped
  // before, so the fallback is the previous behaviour rather than a new one,
  // and `width`/`height` stay null so the caller keeps the box ratio it can
  // defend. `ImageVariantMeta` is `{ url, sizeBytes }` — there is no recorded
  // width for `low` and there never was one to state.
  const base = resolveCoverSource(variants, smartCrops, fallbackUrl);
  return base ? { src: base.src, width: null, height: null } : null;
}

/**
 * UI-16 — what the ARTICLE COVER FIGURE loads, and only that slot.
 *
 * `figure.hk-article-figure` on `/artikel/[category]/[slug]`. A third resolver
 * beside `resolveCoverSource` and `resolveRowThumbSource` for the reason DES-18
 * gave for the second one: these are four differently-sized slots and a single
 * preference order is a regression in at least one of them.
 *
 * ── THE RULE IT IMPLEMENTS ─────────────────────────────────────────────────
 * hero-image-rules **R2** — `low`, `high` and `original` are never eligible for
 * a shaped slot, at any quality, because they preserve the SOURCE aspect. This
 * slot was serving `low` in an `aspect-[3/2]` box: R1 passed (measured 0.05%
 * deviation, `low` is 1024x683 = 1.4993 on `garden-wedding`) and R2 did not,
 * and no amount of tuning `low` could ever change that.
 *
 * `card-thumbnail-image-rules` T2 already named the destination — "a slot fed a
 * source-aspect variant sets its box to 4:3 … which is where this slot is going
 * the day a small rendition of it exists" — so the box moves once, to 4:3, and
 * the asset becomes the 4:3 crop family. It does not move again.
 *
 * ⚠ This SUPERSEDES `card-thumbnail-image-rules` §6's "the article cover figure
 * keeps `low`", which is DES-18's own paragraph and was written when the only
 * 4:3 rendition was 528 px — a 1.43x upscale in this slot's 756 px box. The
 * sentence was right about the asset that existed; `ARTICLE_COVER_MD` is the
 * asset that did not.
 *
 * ── THE BOX FOLLOWS THE ASSET, LITERALLY ───────────────────────────────────
 * R1's own sentence is "the box follows the asset, never the reverse", and its
 * remedy for a box no derivative can fill is "you do not have that box". So
 * this returns the asset's REAL width and the caller caps the figure at it.
 * Enumerated over the 96 published covers on 02 Sept 2026, four have a
 * `crop-4x3-article-card` only 667 px wide — their source photograph is
 * 800x500, so a 4:3 crop of it is height-constrained and no larger 4:3 asset
 * can exist for them:
 *
 *   sewa-dewan-kahwin · villa-warisan · wedding-planner-terbaik-di-malaysia
 *   · yasaka-shrine
 *
 * Stretching 667 px across the 756 px box would be a 1.13x upscale and would
 * turn R5 red on those four. Capping the box to 667 px instead keeps every rule
 * green and costs those four articles 89 px of plate width at >= 1440. The
 * figure is already left-aligned with a ragged right (UI-10), so a narrower
 * photograph hangs off the same left edge as everything else in the stack.
 *
 * This is a computed condition, never a slug list: the day someone re-uploads a
 * bigger source for `yasaka-shrine`, the cap lifts by itself.
 *
 * ── FALLBACK ORDER, AND WHY `low` IS STILL LAST RATHER THAN GONE ───────────
 *   1. `crop-4x3-article-card-md`  792x594, 12,346–100,990 B  <- the rendition
 *   2. `crop-4x3-article-card`     the full crop, 111 KB–1.4 MB
 *   3. `low`                       R2-failing, and the ONLY thing that renders
 *                                  a cover uploaded before any crop exists
 *
 * Rung 2 is not decoration: a cover ingested between a deploy and a backfill
 * has the crop and not the rendition, and serving the heavy-but-correct file
 * for a few minutes beats serving a wrongly-shaped one. Read back from the
 * database 02 Sept 2026, 96 of 96 published covers carry rung 1 with recorded
 * dimensions and 96 of 96 carry rung 2, so rung 3 is reachable only by a cover
 * with no smart crops at all — which is why it is still here and why
 * `boxAspect` moves with it. Ingest writes rung 1 for every future cover
 * (`generateSmartCrops` loops `COVER_RENDITIONS`), so the gap does not reopen.
 */
export interface ArticleCoverSource {
  src: string;
  /** Real intrinsic pixels. Null only on the `low` fallback, which has none recorded. */
  width: number | null;
  height: number | null;
  /**
   * The box this asset may be painted into. `4/3` for the crop family; `3/2`
   * for the `low` fallback, whose modal source aspect is 1.500 — the shape
   * UI-12 S5 measured at a 0.05% deviation. Returned rather than assumed so the
   * caller cannot pair a 4:3 box with a source-aspect file.
   */
  boxAspect: '4/3' | '3/2';
  /** The variant name, for logs and for the audit script. Never used for layout. */
  variant: string;
}

export function resolveArticleCoverSource(
  variants: Variants,
  smartCrops: unknown,
  fallbackUrl: string | null,
): ArticleCoverSource | null {
  // Both rungs are 4:3 and both carry STORED dimensions, so either satisfies R2
  // and R6. `getSmartCropRef` returns all three fields or nothing, which is what
  // keeps an asserted intrinsic size out of the `width`/`height` attributes.
  for (const name of [ARTICLE_COVER_MD.NAME, ARTICLE_COVER_MD.SOURCE_NAME]) {
    const ref = getSmartCropRef(smartCrops, name);
    if (ref) {
      return {
        src: ref.url,
        width: ref.width,
        height: ref.height,
        boxAspect: '4/3',
        variant: name,
      };
    }
  }

  const base = resolveCoverSource(variants, smartCrops, fallbackUrl);
  if (!base) return null;
  return { src: base.src, width: null, height: null, boxAspect: '3/2', variant: 'low' };
}
