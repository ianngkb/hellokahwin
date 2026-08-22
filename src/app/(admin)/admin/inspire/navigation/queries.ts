import 'server-only';
import { eq, sql, asc, count } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { inspireNavItems, inspireCategories, articleCategories } from '@/lib/db/schema/articles';

/**
 * Every nav item, in position order, with the category slug and published
 * article count each row displays.
 *
 * Shared by the page and by `seedNavFromCategoriesAction` so the rows the seed
 * hands back to the client are byte-for-byte what a reload would render — the
 * manager holds `items` in local state seeded from props, so a server action
 * that changes the table has to return the new list rather than rely on a
 * revalidation the already-mounted `useState` would ignore.
 */
export async function listNavItems() {
  const articleCountSub = db
    .select({
      categoryId: articleCategories.categoryId,
      count: count().as('article_count'),
    })
    .from(articleCategories)
    .groupBy(articleCategories.categoryId)
    .as('article_count_sub');

  return db
    .select({
      id: inspireNavItems.id,
      type: inspireNavItems.type,
      label: inspireNavItems.label,
      categoryId: inspireNavItems.categoryId,
      categorySlug: inspireCategories.slug,
      url: inspireNavItems.url,
      parentId: inspireNavItems.parentId,
      position: inspireNavItems.position,
      isActive: inspireNavItems.isActive,
      articleCount: sql<number>`COALESCE(${articleCountSub.count}, 0)`.as('article_count'),
    })
    .from(inspireNavItems)
    .leftJoin(inspireCategories, eq(inspireNavItems.categoryId, inspireCategories.id))
    .leftJoin(articleCountSub, eq(inspireNavItems.categoryId, articleCountSub.categoryId))
    .orderBy(asc(inspireNavItems.position));
}
