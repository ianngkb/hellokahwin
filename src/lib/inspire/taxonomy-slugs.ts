import { generateSlug } from '@/lib/utils/slug';

/**
 * Slug rules for Inspire categories and tags, ported from The Wedding
 * Notebook's taxonomy write core. Only the RULES are ported — HelloKahwin keeps
 * its own server actions rather than TWN's shared write module.
 *
 * Pure (no DB), so the rules are unit-testable on their own.
 */

/**
 * Slugs a category may not take, because a STATIC route segment under
 * `/artikel/` already owns them. Next resolves `/artikel/tag` to the static
 * `tag` directory before it ever reaches `[category]`, so a category slugged
 * `tag` would save happily and then be permanently unreachable. Keep in step
 * with the folders in `src/app/(public)/artikel/`.
 */
export const RESERVED_CATEGORY_SLUGS: ReadonlySet<string> = new Set(['author', 'tag']);

/**
 * Is this slug one of the reserved ones, whatever shape it was typed in?
 * Compares what the URL will actually be (`Tag`, `" tag"`, `tag/` all count).
 */
export function isReservedCategorySlug(slug: string): boolean {
  return RESERVED_CATEGORY_SLUGS.has(generateSlug(slug) || slug.trim().toLowerCase());
}

export const reservedCategorySlugError = (slug: string) =>
  `"${slug}" is reserved by another page on the site — pick a different slug, e.g. "${slug}-ideas".`;

/** A name with no a–z/0–9 (e.g. "婚礼") generates an empty slug. */
export const NO_SLUG_ERROR =
  'Could not make a URL slug from this name (it needs at least one letter a–z or digit) — ' +
  'enter a slug, e.g. "garden-weddings".';

/** Postgres unique-violation (23505), raw or wrapped by the driver. */
export function isUniqueViolation(err: unknown): boolean {
  return (
    !!err &&
    typeof err === 'object' &&
    ((err as { code?: string }).code === '23505' ||
      (err as { cause?: { code?: string } }).cause?.code === '23505')
  );
}
