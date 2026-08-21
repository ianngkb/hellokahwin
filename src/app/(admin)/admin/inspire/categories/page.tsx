import type { Metadata } from 'next';
import Link from 'next/link';
import { eq, count, sql } from 'drizzle-orm';
import { requireAdminSection } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { inspireCategories, articleCategories } from '@/lib/db/schema/articles';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from 'lucide-react';
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
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href="/admin/inspire">
              <ArrowLeftIcon className="mr-1 size-4" />
              Back to Inspire
            </Link>
          </Button>
        }
        title="Inspire Categories"
        description="Manage article categories and taxonomy."
      />

      <CategoryManager categories={rows} />
    </div>
  );
}
