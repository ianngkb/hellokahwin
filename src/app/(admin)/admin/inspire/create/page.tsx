import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';
import { requireAdminSection } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { inspireCategories } from '@/lib/db/schema/articles';
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
        title="New Article"
        breadcrumb={
          <Link
            href="/admin/inspire"
            className="text-muted-foreground hover:text-foreground inline-flex items-center transition-colors"
          >
            <ArrowLeftIcon className="mr-1 size-4" />
            Back to Inspire
          </Link>
        }
      />
      <CreateArticleForm categories={categories} />
    </div>
  );
}
