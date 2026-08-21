/**
 * Article inline-figure URLs (stored in Tiptap content) end in `/high.webp`,
 * the same pattern as listing images. Variant generation writes `low.webp` and
 * `high.webp` siblings on R2 at the same path.
 *
 * Article *cover* URLs are different — they live at `/{timestamp}-cover.{ext}`
 * with variants at `/{timestamp}-cover/low.webp` (subdirectory). For covers,
 * always prefer `articles.coverImageVariants` JSONB (which holds the correct
 * variant URLs); this helper is for inline figures only.
 *
 * Audit on 2026-05-03 confirmed every R2 article inline figure has a
 * low.webp sibling. See scripts/check-article-low-variants.ts.
 */
export type ArticleImageVariant = 'low' | 'high';

const VARIANT_PATTERN = /\/(?:(?:high|low)\.webp|original\.(?:webp|jpe?g|png))(\?.*)?$/i;

export function getArticleVariantUrl(url: string, variant: ArticleImageVariant): string {
  if (!VARIANT_PATTERN.test(url)) return url;
  return url.replace(VARIANT_PATTERN, (_match, query) => `/${variant}.webp${query ?? ''}`);
}
