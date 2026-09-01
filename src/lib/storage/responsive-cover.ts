import { getSmartCropRef } from './smart-crop-url';
import { MIDSIZE_COVER } from './midsize-cover';

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
 *
 * ── CONT-15: THE MEASURED INTRINSICS ───────────────────────────────────────
 * `width`/`height` are the delivered file's REAL pixels, read out of its own
 * header by `scripts/backfill-cover-intrinsics.mts` and recorded on
 * `cover_image_variants.low`. They are the same all-three-or-nothing contract
 * `getSmartCropRef` honours, and for the same reason: S1 above deleted a
 * `1200w` descriptor that was a constant asserted in place of a measurement and
 * was 17.2% wrong on a live cover. A half-recorded row must degrade to today's
 * geometry, never to a plausible number.
 *
 * So: BOTH numeric and positive, or BOTH null. Never a partial. The article
 * cover's `--cover-ar` / `--cover-max-w` and its `width`/`height` attributes are
 * emitted only on the first case; on the second the CSS fallbacks
 * (`3 / 2`, `756px`) reproduce today's geometry exactly.
 */
export interface CoverSource {
  src: string;
  /** Real intrinsic pixels of `src` when recorded; null when unrecorded. */
  width: number | null;
  height: number | null;
}

type VariantEntry = { url: string; width?: unknown; height?: unknown };

/**
 * The shape of the `cover_image_variants` JSONB as the render path may assume
 * it. `width`/`height` are optional and typed `unknown` on purpose: they are
 * present only on rows CONT-15's backfill has reached, the column is JSONB and
 * can hold anything, and `recordedIntrinsics` is the ONLY place allowed to
 * decide a value is usable. Exported so call sites cast to this rather than to
 * `{ url: string }`, which would silently hide the two new fields from the
 * next reader.
 */
export type CoverVariants = Record<string, VariantEntry | undefined>;

type Variants = CoverVariants | null | undefined;

/** All-or-nothing, matching `getSmartCropRef`'s contract exactly. */
function recordedIntrinsics(
  entry: VariantEntry | undefined,
): { width: number; height: number } | null {
  if (!entry) return null;
  const { width, height } = entry;
  if (typeof width !== 'number' || typeof height !== 'number') return null;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return { width, height };
}

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
  const lowEntry = (variants as Record<string, VariantEntry | undefined> | null | undefined)?.low;
  const low = lowEntry?.url;
  const src = low ?? fallbackUrl ?? undefined;
  if (!src) return null;

  // The dimensions belong to `low`. When `low` is absent and the raw
  // `coverImageUrl` is being served instead, there is nothing recorded about
  // THAT file, and borrowing `low`'s numbers would be the neighbouring-record
  // defect this whole contract exists to prevent.
  const dims = low ? recordedIntrinsics(lowEntry) : null;

  return { src, width: dims?.width ?? null, height: dims?.height ?? null };
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
  // defend.
  //
  // ⚠️ CONT-15 changed the premise, and this line is deliberately NOT changed
  // with it. `low` now DOES carry recorded intrinsics, so `base.width`/
  // `base.height` are usually real numbers here and could be forwarded. CONT-15
  // specifies exactly one consumer of them (the article cover plate) and
  // explicitly does not authorise touching this function; forwarding them would
  // put a portrait `width`/`height` pair on a `.s-row` thumbnail whose box is
  // 4:3, which is a rendering decision for that slot and not a free
  // consequence. Raised as a follow-up, not decided here.
  const base = resolveCoverSource(variants, smartCrops, fallbackUrl);
  return base ? { src: base.src, width: null, height: null } : null;
}
