import { eq, sql } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { articles, inspireCategories } from '@/lib/db/schema/articles';

/**
 * Which category hubs are real, indexable destinations.
 *
 * THE PROBLEM THIS FIXES. The sitemap listed top-level categories only, on the
 * reasoning that child categories are reached in-app through the parent's
 * `?sub=` form and are therefore orphaned duplicates. That reasoning was right
 * for a child category nobody links to. It was wrong for a child category whose
 * slug appears in a live article URL.
 *
 * Measured against production, 23 Aug 2026: `/artikel/hiasan-dekorasi`,
 * `/artikel/moden-kontemporari`, `/artikel/fotografi-videografi`,
 * `/artikel/glamor-eksklusif`, `/artikel/minimalis-mewah` and
 * `/artikel/pantai-santai` all return 200, all appear as the middle segment of
 * article URLs that ARE in the sitemap — and all six emitted
 * `<meta name="robots" content="noindex, follow">`. Google was being sent to
 * `/artikel/hiasan-dekorasi/hantaran-kahwin` while being told the folder above
 * it does not exist.
 *
 * (The Phase 1 audit reported four of these. It missed `minimalis-mewah` and
 * `pantai-santai`, which each hold one published article.)
 *
 * THE RULE. A category hub is indexable when it is the PRIMARY category of at
 * least one published article — which is exactly when its slug is part of a
 * live article URL. That covers top-level hubs, the six child hubs above, and
 * any future cluster that starts holding articles, without a hand-maintained
 * list. Everything else (a hub with no articles of its own, an empty pillar
 * waiting for its first cluster) stays noindex AND stays out of the sitemap.
 *
 * Both halves matter together. Listing a noindex URL in a sitemap is a Search
 * Console error, so adding the six hubs without narrowing the noindex rule
 * would have made the site's technical SEO worse, not better.
 */

/** Category ids that own at least one published article as its primary category. */
export const getIndexableCategoryIds = unstable_cache(
  async (): Promise<Set<string>> => {
    const rows = await db
      .selectDistinct({ id: articles.primaryCategoryId })
      .from(articles)
      .where(eq(articles.status, 'published'));
    return new Set(rows.map((r) => r.id).filter((id): id is string => Boolean(id)));
  },
  ['inspire-indexable-category-ids'],
  { tags: ['articles', 'inspire-categories'], revalidate: false },
);

/**
 * Does this one category own a live article URL? Single-category form for the
 * category route's `generateMetadata`, which cannot afford the full set query
 * inside its 3s deadline budget.
 */
export const categoryOwnsPublishedArticles = unstable_cache(
  async (categoryId: string): Promise<boolean> => {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(articles)
      .where(
        sql`${articles.primaryCategoryId} = ${categoryId} AND ${articles.status} = 'published'`,
      );
    return (row?.n ?? 0) > 0;
  },
  ['inspire-category-owns-articles'],
  { tags: ['articles', 'inspire-categories'], revalidate: false },
);

/** Every category with the two facts the sitemap needs to decide inclusion. */
export const getSitemapCategories = unstable_cache(
  async () => {
    return db
      .select({
        id: inspireCategories.id,
        slug: inspireCategories.slug,
        parentId: inspireCategories.parentId,
        isPillar: inspireCategories.isPillar,
      })
      .from(inspireCategories);
  },
  ['inspire-sitemap-categories'],
  { tags: ['inspire-categories'], revalidate: false },
);
