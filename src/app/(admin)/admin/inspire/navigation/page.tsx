import { eq, sql, isNull, asc, count } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { inspireNavItems, inspireCategories, articleCategories } from '@/lib/db/schema/articles';
import { requireAdminSection } from '@/lib/auth/admin';
import { ConsoleBreadcrumb } from '@/components/console/console-breadcrumb';
import { PageHeader } from '@/components/layout/page-header';
import { NavManager } from './nav-manager';

export const metadata = { title: 'Navigation | Inspire' };

export default async function InspireNavigationPage() {
  await requireAdminSection('inspire');

  // Article count subquery
  const articleCountSub = db
    .select({
      categoryId: articleCategories.categoryId,
      count: count().as('article_count'),
    })
    .from(articleCategories)
    .groupBy(articleCategories.categoryId)
    .as('article_count_sub');

  // Fetch all nav items with category slugs and article counts
  const allItems = await db
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

  // Fetch all categories (primary + secondary) for the "Add Category" dropdown
  // Only exclude categories already used as top-level nav items
  const usedTopLevelCategoryIds = new Set(
    allItems
      .filter((i) => i.type === 'category' && i.categoryId && !i.parentId)
      .map((i) => i.categoryId!),
  );

  const allCategories = await db
    .select({
      id: inspireCategories.id,
      name: inspireCategories.name,
      slug: inspireCategories.slug,
      parentId: inspireCategories.parentId,
    })
    .from(inspireCategories)
    .orderBy(asc(inspireCategories.name));

  const filteredCategories = allCategories.filter((c) => !usedTopLevelCategoryIds.has(c.id));

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={
          <ConsoleBreadcrumb
            items={[{ label: 'Admin' }, { label: 'Site structure' }, { label: 'Navigation' }]}
          />
        }
        title="Navigation"
        description="Manage the navigation menu on the Inspire page. Drag to reorder, toggle visibility, or add new items."
      />
      <NavManager items={allItems} availableCategories={filteredCategories} />
    </div>
  );
}
