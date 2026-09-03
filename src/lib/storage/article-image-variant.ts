/**
 * Article inline-figure URLs (stored in Tiptap content) end in `/high.webp`,
 * the same pattern as listing images. Variant generation writes `low.webp`,
 * `mid.webp` and `high.webp` siblings on R2 at the same path.
 *
 * Article *cover* URLs are different — they live at `/{timestamp}-cover.{ext}`
 * with variants at `/{timestamp}-cover/low.webp` (subdirectory). For covers,
 * always prefer `articles.coverImageVariants` JSONB (which holds the correct
 * variant URLs); this helper is for inline figures only.
 *
 * Audit on 2026-05-03 confirmed every R2 article inline figure has a
 * low.webp sibling. See scripts/check-article-low-variants.ts.
 *
 * ⚠️ THIS IS A STRING REWRITE, NOT A LOOKUP. It never asks the database or R2
 * whether the variant it names exists — it swaps the last path segment and
 * returns. So naming a variant here is a PROMISE that the object is already on
 * R2 for every image the site renders, and the only thing that can keep that
 * promise is a completed backfill.
 *
 * The standing requirement for `mid`, added 04 September 2026: it must not be
 * rendered until `scripts/backfill-image-mid.mts` has written a `mid.webp` for
 * every media row and `scripts/audit-mid-coverage.mts` reports zero misses.
 * That coverage check reads the article CONTENT, not rendered pages — a page
 * that has not yet had the render change deployed still emits `high.webp`, so
 * scraping production could never prove `mid` coverage ahead of the deploy.
 * A render change that lands before its backfill 404s every figure on the site.
 */
export type ArticleImageVariant = 'low' | 'mid' | 'high';

const VARIANT_PATTERN = /\/(?:(?:high|mid|low)\.webp|original\.(?:webp|jpe?g|png))(\?.*)?$/i;

export function getArticleVariantUrl(url: string, variant: ArticleImageVariant): string {
  if (!VARIANT_PATTERN.test(url)) return url;
  return url.replace(VARIANT_PATTERN, (_match, query) => `/${variant}.webp${query ?? ''}`);
}
