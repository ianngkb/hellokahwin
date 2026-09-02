import { getSmartCropRef } from './smart-crop-url';
import { MIDSIZE_COVER } from './midsize-cover';

/**
 * ⚠ UI-15 CONSUMES A RENDITION IT DOES NOT OWN, AND THE OWNERSHIP IS THE NOTE.
 *
 * `crop-4x3-article-card-md` is UI-16's, produced for the ARTICLE COVER FIGURE,
 * and it was already backfilled to production — an R2 object and a
 * `coverImageSmartCrops` key on all 96 published articles — before UI-15 looked.
 * Read back off the production pooler on 02 September 2026: **792x594 on 91
 * covers, 667x500 on 4, 771x578 on 1.**
 *
 * UI-15 specified the same rendition independently, at 768x576, under the same
 * name, and was one command away from overwriting 96 live objects with a
 * different-sized file. The dry run said `0 to render · 5 already done` and
 * that number was checked instead of accepted. 792 is also the better box: it
 * is exactly 1.5x `MIDSIZE_COVER`'s 528, so the two rungs are one box at two
 * scales rather than two guesses.
 *
 * So this is a STRING, not an import: UI-16's constant lives on an unmerged
 * branch, and a duplicate definition of the same key in two modules is how a
 * rename orphans half of production. Whichever item merges second should delete
 * this and import the constant.
 *
 * If UI-16 is reverted, or its undo file applied, this key disappears and the
 * `.s-card` falls back to `low` — or, on a cover with no variant record at all,
 * to the RAW ingested file. The layout gate reports both as R2 violations
 * rather than passing quietly, because `grid-thumb-variant` requires a `crop-*`
 * stem rather than forbidding three named ones. That is the intended failure
 * mode, and it only works because the rule is an allow-list: a raw cover is
 * called `1724000000-tepak-sirih`, which no deny-list of variant names would
 * ever have matched.
 */
const ARTICLE_CARD_MD = 'crop-4x3-article-card-md';

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
 * UI-15 — what the `.s-card` LEAD PLATE loads, and only that slot.
 *
 * Three call sites render `.s-card`: the catalogue's `CategoryCard`, the
 * design-system reference page, and the `Card` component both go through. All
 * three paint the same box — `width: 100%` inside a column that measures 350
 * CSS px at 390 and 768 CSS px at 1024 and above.
 *
 * ── WHY IT IS NOT `resolveRowThumbSource` AND NOT `resolveCoverSource` ─────
 * DES-18 already wrote the reason down, one slot over:
 *
 *     `.s-row`   80x60 / 176x132   528px is 3.0x at DPR 3   ← midsize
 *     `.s-card`  ~350-768px wide   528px UPSCALES on desktop ← THIS function
 *
 * 768 / 528 = 1.45x, past hero-rules R5's 1.1x ceiling. And `resolveCoverSource`
 * returns `low`, which is what UI-03 R2 forbids in a shaped slot and what this
 * item exists to remove: measured on production 02 Sept 2026 the eight category
 * pages with a lead plate served FIVE different plate shapes — 1.706, 1.500,
 * 1.499, 1.498, 1.344 — because `low` carries the photographer's aspect and
 * this box had no height of its own to argue with it. Aspect deviation read
 * 0.0% on every one of them, which is why R2 and not R1 is the rule that
 * catches it.
 *
 * So the rendition is opted INTO by slot class, not switched on globally — the
 * same arrangement, for the same reason, as the row thumbnail. The article
 * cover figure is UI-16's, not this function's.
 *
 * ── THIS ITEM WROTE NOTHING TO PRODUCTION, AND THAT IS THE POINT ───────────
 * UI-15 specified an identical rendition at 768x576 under this exact name and
 * had a backfill ready to run. It was not needed and it would have been
 * destructive: see the note on `ARTICLE_CARD_MD` above. The asset was already
 * live on every cover, at a better-argued box, so this item consumes it and
 * spends zero AWS.
 *
 * ── THE FALLBACK IS THE PREVIOUS BEHAVIOUR, NOT A NEW ONE ──────────────────
 * `getSmartCropRef` returns url + width + height or nothing, so a cover whose
 * rendition has not been generated degrades to `low` with `width`/`height`
 * null, exactly as this slot shipped before. An entry with unrecorded
 * dimensions is treated as unusable rather than having a nominal width
 * asserted for it — hero-rules R4, and the defect it was written against.
 *
 * ── THE CALLER MUST CAP THE PLATE AT `width` ──────────────────────────────
 * Five of the 96 live covers cannot fill the rendition's 792px box, because a
 * 4:3 crop cannot be wider than the photograph it came from: four deliver
 * 667x500 and one 771x578. The `.s-card` plate is 768 CSS px at desktop, so the
 * four 667s would be a **1.151x upscale** — red on the gate, and correctly so.
 * `card-thumbnail-image-rules.md` T3 — *an image is never painted wider than
 * its own intrinsic width* — is why `width` is returned rather than assumed,
 * and `max-width` at the call site is where it is spent. Those four render 667
 * CSS px wide, everything else 768, and the SHAPE is 4:3 either way.
 */
export interface CardSource {
  src: string;
  /** Real intrinsic pixels when known; null when falling back to `low`. */
  width: number | null;
  height: number | null;
}

export function resolveCardSource(
  variants: Variants,
  smartCrops: unknown,
  fallbackUrl: string | null,
): CardSource | null {
  const cardsize = getSmartCropRef(smartCrops, ARTICLE_CARD_MD);
  if (cardsize) {
    return { src: cardsize.url, width: cardsize.width, height: cardsize.height };
  }

  // No rendition yet — a cover uploaded before UI-15's backfill, or one whose
  // crops have not regenerated. `low` is what this plate shipped before, so the
  // fallback is the previous behaviour rather than a new one, and
  // `width`/`height` stay null because there is no recorded width for `low` and
  // there never was one to state.
  //
  // ⚠ IT IS STILL AN R2 VIOLATION, and the gate says so rather than letting it
  // pass: `grid-thumb-variant` reads the SERVED filename, not this function's
  // intent. Deliberate — a fallback that goes green is a fallback nobody
  // notices has become load-bearing.
  const base = resolveCoverSource(variants, smartCrops, fallbackUrl);
  return base ? { src: base.src, width: null, height: null } : null;
}
