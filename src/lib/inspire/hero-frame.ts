import { getSmartCropRef, type SmartCropRef } from '@/lib/storage/smart-crop-url';

/**
 * ══════════════════════════════════════════════════════════════════════════
 * HERO-FRAME ELIGIBILITY — hero-rules R8, in ONE place.
 * `docs/design/hero-image-rules.md` R8 · `docs/design/card-thumbnail-image-rules.md` §3 S4
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Lifted out of `src/app/(public)/page.tsx` by UI-12 S4, unchanged, because a
 * SECOND surface now runs the same predicate: `/artikel`'s featured lead plate.
 *
 * That plate was `latestArticles[0]`, selected by recency with no orientation
 * predicate — byte for byte the selection bug UI-03 found on the homepage hero,
 * in a second place. Two copies of this rule would be two copies free to drift,
 * and the failure mode is silent: every check stays green while a portrait
 * photograph sits in a 3.52:1 box.
 *
 * ⚠️ `HERO_ASPECT` is tied to the Tailwind literal `lg:aspect-[88/25]` on BOTH
 * plates — the homepage hero and the `/artikel` lead plate. Tailwind needs the
 * literal at the call site, so the three cannot share one constant. Change this
 * number and you MUST change both classes, and vice versa: if a plate widens
 * while the threshold stays put, portrait sources creep back in with every
 * check still green. That is the entire reason this is written as a derivation
 * rather than as a bare `>= 1.15`.
 */

/**
 * R8(a) — THE HAND-CURATED CLASS-G SLUG LIST.
 *
 * Moved here from `src/app/(public)/page.tsx` by UI-12 C1. The Creative
 * Director's ruling, 31 Ogos 2026: this list is NOT a property of the homepage.
 * The failure it guards against is ENLARGEMENT, so it transfers to any large
 * frame — and `/artikel`'s lead plate paints 1232×350 at a 1440 viewport, which
 * is a large frame by any reading. Half-inheriting R8 is how the defect
 * returns, so both surfaces now run all three gates off this one definition.
 *
 * The DES-08 reasoning below is preserved verbatim. Read it before adding an
 * entry; read the UI-12 note after it before adding a THIRD.
 */

/**
 * Spec §6.1/§6.3: a class-G cover (a wide documentary frame — a procession, a
 * crowd at a distance) is never assigned as the homepage hero, DES-08's
 * largest single frame — "if the only candidate photograph for a new article
 * is class G, the article ships with the no-cover layout… rather than an
 * enlarged class-G frame."
 *
 * This is NOT automated. `coverImageDetectionData` (AWS Rekognition
 * faces/labels, meant to give exactly this signal) is EMPTY for the entire
 * recent corpus checked here — `REKOGNITION_ENABLED` was off at ingest, so
 * there is no face count, no label, nothing to threshold on. Image aspect
 * ratio doesn't discriminate either (every `low` derivative resizes to the
 * same ~1.5:1 regardless of subject — checked against 8 recent covers).
 *
 * So this is a hand-curated, disclosed stopgap: the one cover visually
 * confirmed as a wide group/procession shot (13 people across a street,
 * DES-02's exact failure mode) is named here by slug and skipped for hero
 * placement only — it still displays normally as a small "Terkini" row,
 * where enlargement isn't the risk. A real fix needs either Rekognition
 * turned back on for new ingests or an editorial cover-class field (spec
 * §6.1: "cover class is an editorial selection input") — named as a
 * follow-up in the DES-08 work-done entry, not invented here.
 */

/**
 * ⚠️ UI-12 C2 — SECOND ENTRY, AND THE SECOND ENTRY IS THE FINDING.
 *
 * `hantaran-kahwin-bajet` was added on 31 Ogos 2026 after the Creative Director
 * rendered its `crop-4.3x1-desktop-hero` (2463×700) at the plate's PAINTED size
 * — 1232×350 at a 1440 viewport — and looked at it rather than reading a
 * comment about it. Judged class G: an even wider line of people across a yard,
 * faces smaller than `persiapan-hantaran-kahwin`'s. Same failure mode, and it
 * was not on the list.
 *
 * THAT IS WORTH MORE THAN THE FIX. DES-08 described this list as a stopgap with
 * one entry. Twelve covers on the front page contain at least TWO class-G
 * frames, so the list is not merely a stopgap — it is an INCOMPLETE one, and
 * nothing in the pipeline can tell us how incomplete. A curated list that grows
 * this fast is evidence it must be REPLACED, not extended indefinitely: either
 * `REKOGNITION_ENABLED` back on at ingest so `coverImageDetectionData` carries a
 * face count and a label to threshold on, or the editorial cover-class field
 * spec §6.1 already calls for ("cover class is an editorial selection input").
 *
 * Before you add a third entry, raise the replacement instead.
 */
export const HERO_INELIGIBLE_SLUGS = new Set<string>([
  // DES-08: 13 people across a street, DES-02's exact failure mode.
  'persiapan-hantaran-kahwin',
  // UI-12 C2: a wider line of people across a yard, faces smaller still.
  'hantaran-kahwin-bajet',
]);

/**
 * R8(c) — RETAINED FRAME. This is the rule the whole of UI-03 turned on.
 *
 * Having the right-shaped crop is not the same as having the right PHOTOGRAPH.
 * The hero target is wider than every source in this corpus, so
 * `computeCropWindow` always takes the width-constrained branch, and the
 * surviving fraction of the source's height is exactly
 * `sourceAspect / HERO_ASPECT`. Measured on production 31 Ogos 2026:
 *
 *   source 1.500 (12 of 13 homepage covers) → 42.6% retained → a photograph
 *   source 1.333 (4:3, 10 articles)         → 37.9% retained → a photograph
 *   source 0.667 (the one that shipped)     → 18.9% retained → a texture
 *   threshold 1.1616                        → 33.0% retained → the line
 *
 * Below roughly a third of the frame a crop stops reading as a photograph of
 * its subject. That 33% is the Creative Director's judgement, owned as
 * judgement — a defensible line, not a derived constant. Everything else here
 * IS derived.
 *
 * ⚠️ The derived rule is marginally STRICTER than the `1.15` constant it
 * replaced, and 1.15 is NOT the threshold. At 88/25 the exact boundary is
 * `sourceAspect >= 1.1616`, so a source at exactly 1.15 retains 32.67% and
 * fails where the old hardcode passed it. Nothing in the corpus sits between
 * 0.753 and 1.333, so this changes no verdict today — the derived form was
 * verified to reproduce the same 48 pass / 12 fail split.
 *
 * Corpus, verified against production 31 Ogos 2026 (86 published articles):
 *   0.667 ×6 · 0.748 ×1 · 0.750 ×4 · 0.753 ×1   → 12 disqualified
 *   1.333 ×10 · 1.339 ×1 · 1.414 ×1 · 1.494 ×1 · 1.500 ×33 · 1.504 ×2 → 48 pass
 *
 * ⚠️ NULLABLE, AND UNKNOWN COUNTS AS INELIGIBLE. Defaulting unknown to eligible
 * is precisely how this defect shipped. 60 of 86 articles have width/height
 * populated; 26 are null — and every one of those 26 is in the oldest tail
 * (ranks 58–86 by recency), which neither the homepage's 20-article buffer nor
 * `/artikel`'s 12-article buffer ever reaches. That is a data fact about where
 * the nulls sit, not a property of this rule. If either buffer ever deepens
 * past ~57 articles this starts excluding real candidates, and the fix then is
 * to backfill `media.width`/`height`, not to loosen the rule.
 */
export const HERO_ASPECT = 88 / 25; // 3.520 — MUST stay in sync with every `lg:aspect-[88/25]`.
export const MIN_RETAINED_FRAME = 0.33; // A hero crop must keep a third of the source frame.

export function isHeroFrameEligible(width: number | null, height: number | null): boolean {
  if (width == null || height == null || height <= 0) return false;
  return width / height / HERO_ASPECT >= MIN_RETAINED_FRAME;
}

/**
 * R8(b) — BOTH hero crops must exist.
 *
 * `resolveCoverSource()` falls back to `low`/`coverImageUrl` when a smart crop
 * is missing, which is right for a 176px row and wrong for a full-bleed plate —
 * it is exactly how a 0.667 portrait ended up stretched across a 2.40 box on
 * production. Per R2, `low`, `high` and `original` all preserve the SOURCE
 * aspect ratio, so none of them can fill a landscape hero at any quality. Only
 * a named landscape crop may.
 *
 * `getSmartCropRef` (not `getSmartCropUrl`) because R4 and R6 need each crop's
 * REAL stored width and height, and a crop whose dimensions were never recorded
 * cannot state them. Same rule as (c): unknown is ineligible, never a nominal
 * value asserted in its place.
 *
 * Lifted alongside the predicate by UI-12 S4 for the same reason: `/artikel`'s
 * lead plate renders the identical two-band `<picture>` and must resolve its
 * assets from the same definition, not from a second copy of it.
 */
export function resolveHeroCrops(
  smartCrops: unknown,
): { desktop: SmartCropRef; og: SmartCropRef } | null {
  const desktop = getSmartCropRef(smartCrops, 'crop-4.3x1-desktop-hero');
  const og = getSmartCropRef(smartCrops, 'crop-16x9-og');
  return desktop && og ? { desktop, og } : null;
}
