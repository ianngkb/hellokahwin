import { getSmartCropRef } from './smart-crop-url';
import { ARTICLE_COVER_MD, MIDSIZE_COVER } from './midsize-cover';

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
 * This was a STRING here while UI-16 sat on an unmerged branch, with the note
 * "whichever item merges second should delete this and import the constant".
 * UI-16 merged first (PR #65, 02 Sept 2026), so that debt is settled: the name
 * is now `ARTICLE_COVER_MD.NAME` and there is exactly ONE definition of the key
 * in the codebase. A duplicate definition is how a rename orphans half of
 * production, and `midsize-cover.ts` is where the rename would be made.
 *
 * If that key ever disappears, the `.s-card` falls back — and the layout gate
 * reports the last rung as an R2 violation rather than passing quietly, because
 * `grid-thumb-variant` requires a `crop-*` stem rather than forbidding three
 * named ones. That is the intended failure mode, and it only works because the
 * rule is an allow-list: a raw cover is called `1724000000-tepak-sirih`, which
 * no deny-list of variant names would ever have matched.
 */

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
  // Two rungs, then `low`. Both rungs are 4:3 and both carry STORED dimensions,
  // so each satisfies R2 and R6, and the caller caps the plate to `width` — so
  // the 528px rung paints 528 CSS px rather than upscaling 1.45x into the 768px
  // column.
  //
  // ⚠ RUNG 2 IS HERE BECAUSE UI-16 MEASURED WHAT ITS ABSENCE COSTS, and rung 3
  // is deliberately ABSENT for the same reason. UI-16's first version fell from
  // the `-md` rendition straight to the full `crop-4x3-article-card`, on the
  // reasonable-sounding logic that a heavy-but-correct file beats a wrongly
  // shaped one. Measured on production hours after it shipped: six articles,
  // 4,742,962 B of cover, a mean of 790 KB on the LCP element — 12.5x heavier
  // than the code it replaced, with every rule green, because a pure byte
  // defect has no rule behind it. The full crop runs 111 KB–1.4 MB and this is
  // a LEAD PLATE in a scrolling list, which is where those bytes hurt most. So
  // this ladder stops at `-sm` (median 17,664 B) and then takes the R2 hit
  // visibly rather than paying 1.4 MB to hide it.
  for (const name of [ARTICLE_COVER_MD.NAME, MIDSIZE_COVER.NAME]) {
    const ref = getSmartCropRef(smartCrops, name);
    if (ref) {
      return { src: ref.url, width: ref.width, height: ref.height };
    }
  }

  // Neither rendition — a cover with no smart crops at all. `low` is what this
  // plate shipped before, so the fallback is the previous behaviour rather than
  // a new one, and `width`/`height` stay null because there is no recorded
  // width for `low` and there never was one to state.
  //
  // ⚠ IT IS STILL AN R2 VIOLATION, and the gate says so rather than letting it
  // pass: `grid-thumb-variant` reads the SERVED filename, not this function's
  // intent. Deliberate — a fallback that goes green is a fallback nobody
  // notices has become load-bearing.
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
 * ── FALLBACK ORDER, AND THE 12.5x CLIFF THAT USED TO BE RUNG 2 ─────────────
 *   1. `crop-4x3-article-card-md`  792x594,  12,346–100,990 B  <- the rendition
 *   2. `crop-4x3-article-card-sm`  528x396,   7,636– 46,130 B  <- DES-18's rung
 *   3. `crop-4x3-article-card`     the full crop,  111 KB–1.4 MB
 *   4. `low`                       R2-failing, and the ONLY thing that renders
 *                                  a cover uploaded before any crop exists
 *
 * ⚠ **RUNG 2 IS HERE BECAUSE OF A LIVE REGRESSION, NOT BECAUSE IT IS TIDY.**
 * The first version of this function fell straight from rung 1 to rung 3, on the
 * reasoning that a heavy-but-correct file beats a wrongly-shaped one for the few
 * minutes between a deploy and a backfill. Measured on production 02 September
 * 2026, hours after this shipped: **six articles, 4,742,962 B of cover, a mean
 * of 790 KB on the LCP element**, against 378,182 B of `low` for the same six —
 * **12.5x heavier than the code this item replaced.** That is the +8.2 MB route
 * `card-thumbnail-image-rules` §4 priced and refused, reached as a FALLBACK
 * rather than chosen.
 *
 * Every rule stayed green while it happened, and that is the part worth keeping:
 * the box is 4:3 and the file is 4:3 so `image-aspect` reads 0; it is a
 * downscale so `image-upscale` reads 0; it IS a named crop so `shaped-slot-
 * variant` passes. **A pure byte defect has no rule behind it, so no rule can
 * see it** — which is why `scripts/audit-cover-rendition.mjs` now carries a byte
 * ceiling as well as a URL comparison.
 *
 * `-sm` is only 528px, so on its own it would upscale 1.43x in this slot's 756px
 * box. It does not, because the caller caps the figure to the asset's stored
 * width: the plate narrows to 528 CSS px and R1, R2, R5 and R6 all stay green at
 * **22,906 B** instead of 790,000. A narrower photograph for the minutes a cover
 * is un-backfilled is a trade this site has already made — UI-03 §3, "a taller
 * plate is not worth the heaviest available asset on a phone".
 *
 * Rung 3 survives for the one case rung 2 cannot serve: a cover carrying the
 * full crop and neither rendition.
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
  // Every rung is 4:3 and every one carries STORED dimensions, so each satisfies
  // R2 and R6. `getSmartCropRef` returns all three fields or nothing, which is
  // what keeps an asserted intrinsic size out of the `width`/`height` attributes.
  //
  // Ordered LARGEST-THAT-IS-STILL-BUDGETED first, not simply largest. The
  // difference is rung 2, and it is worth 768,000 bytes an article — see the
  // note above.
  for (const name of [ARTICLE_COVER_MD.NAME, MIDSIZE_COVER.NAME, ARTICLE_COVER_MD.SOURCE_NAME]) {
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
