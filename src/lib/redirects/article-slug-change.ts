// Pure path-building rules for automatic article slug-change redirects — no
// side effects, no DB calls, safe to import from anywhere (server actions,
// tests, etc.) without pulling Drizzle + Clerk machinery into the consumer's
// bundle. Mirrors the style of `patterns.ts`.
//
// `updateArticleAction` uses these to compute the old → new canonical article
// paths when an admin renames a published article's slug; the resulting row is
// written to the `redirects` table and served site-wide by the middleware's
// exact-match DB lookup (no new routing code).

export type ArticleSlugRedirect = {
  sourcePath: string;
  destinationPath: string;
};

// Canonical article path shape: /inspire/{categorySlug}/{slug} — no trailing
// slash, matching `normalizePathname`'s lookup form in the middleware.
export function buildArticlePath(categorySlug: string, slug: string): string {
  return `/artikel/${categorySlug}/${slug}`;
}

// Returns the redirect pair for a slug (and possibly category) change, or null
// when the old and new canonical paths are identical (nothing to redirect).
// The source ALWAYS uses the OLD category slug — that's where the old URL lived.
export function buildArticleSlugRedirect({
  oldCategorySlug,
  oldSlug,
  newCategorySlug,
  newSlug,
}: {
  oldCategorySlug: string;
  oldSlug: string;
  newCategorySlug: string;
  newSlug: string;
}): ArticleSlugRedirect | null {
  const sourcePath = buildArticlePath(oldCategorySlug, oldSlug);
  const destinationPath = buildArticlePath(newCategorySlug, newSlug);
  if (sourcePath === destinationPath) return null;
  return { sourcePath, destinationPath };
}
