import type { Metadata } from 'next';
import { eq, count, sql } from 'drizzle-orm';
import { requireAdminSection } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { inspireCategories, articleCategories } from '@/lib/db/schema/articles';
import { ConsoleBreadcrumb } from '@/components/console/console-breadcrumb';
import { PageHeader } from '@/components/layout/page-header';
import { CategoryManager } from './category-manager';

export const metadata: Metadata = {
  title: 'Inspire Categories - Admin',
};

export default async function AdminInspireCategoriesPage() {
  await requireAdminSection('inspire');

  // Fetch categories with article counts
  const articleCountSub = db
    .select({
      categoryId: articleCategories.categoryId,
      count: count().as('article_count'),
    })
    .from(articleCategories)
    .groupBy(articleCategories.categoryId)
    .as('article_count_sub');

  const rows = await db
    .select({
      id: inspireCategories.id,
      name: inspireCategories.name,
      slug: inspireCategories.slug,
      description: inspireCategories.description,
      parentId: inspireCategories.parentId,
      displayOrder: inspireCategories.displayOrder,
      wpId: inspireCategories.wpId,
      articleCount: sql<number>`COALESCE(${articleCountSub.count}, 0)`.as('article_count'),
    })
    .from(inspireCategories)
    .leftJoin(articleCountSub, eq(inspireCategories.id, articleCountSub.categoryId))
    .orderBy(inspireCategories.displayOrder);

  return (
    <div>
      <PageHeader
        breadcrumb={
          <ConsoleBreadcrumb
            items={[
              { label: 'Admin' },
              { label: 'Inspire', href: '/admin/inspire' },
              { label: 'Categories' },
            ]}
          />
        }
        title="Categories"
        description="Manage article categories and taxonomy."
      />

      <CategoryManager categories={rows} />
    </div>
  );
}
