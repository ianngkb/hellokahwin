import type { Metadata } from 'next';
import { requireAdminSection } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { inspireCategories } from '@/lib/db/schema/articles';
import { ConsoleBreadcrumb } from '@/components/console/console-breadcrumb';
import { PageHeader } from '@/components/layout/page-header';
import { CreateArticleForm } from './create-article-form';

export const metadata: Metadata = {
  title: 'New Article - Admin',
};

export default async function CreateArticlePage() {
  await requireAdminSection('inspire');

  const categories = await db
    .select({
      id: inspireCategories.id,
      name: inspireCategories.name,
      parentId: inspireCategories.parentId,
    })
    .from(inspireCategories)
    .orderBy(inspireCategories.displayOrder);

  return (
    <div>
      <PageHeader
        title="New article"
        description="Title and category start the draft — everything else is set in the editor."
        breadcrumb={
          <ConsoleBreadcrumb
            items={[
              { label: 'Admin' },
              { label: 'Inspire', href: '/admin/inspire' },
              { label: 'New article' },
            ]}
          />
        }
      />
      <CreateArticleForm categories={categories} />
    </div>
  );
}
