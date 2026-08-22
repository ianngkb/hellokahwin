import { asc } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { inspireCategories } from '@/lib/db/schema/articles';
import { requireAdminSection } from '@/lib/auth/admin';
import { getCategoryFallbackNav } from '@/lib/services/inspire-nav';
import { ConsoleBreadcrumb } from '@/components/console/console-breadcrumb';
import { PageHeader } from '@/components/layout/page-header';
import { NavManager } from './nav-manager';
import { listNavItems } from './queries';

export const metadata = { title: 'Navigation | Inspire' };

export default async function InspireNavigationPage() {
  await requireAdminSection('inspire');

  const allItems = await listNavItems();

  // What the public masthead is currently deriving from categories. Read only
  // when the table is empty, because that is the only time
  // `getMastheadCategories()` takes its fallback branch — and the only time the
  // empty state needs to explain it.
  const fallbackNavCount = allItems.length === 0 ? (await getCategoryFallbackNav()).length : 0;

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
      <NavManager
        items={allItems}
        availableCategories={filteredCategories}
        fallbackNavCount={fallbackNavCount}
      />
    </div>
  );
}
