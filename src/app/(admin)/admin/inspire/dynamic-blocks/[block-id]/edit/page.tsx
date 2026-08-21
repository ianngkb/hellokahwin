import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { ArrowLeftIcon } from 'lucide-react';
import { requireAdminSection } from '@/lib/auth/admin';
import { isUuid } from '@/lib/auth/is-uuid';
import { db } from '@/lib/db/drizzle';
import { dynamicBlocks, dynamicBlockRules } from '@/lib/db/schema/dynamic-blocks';
import { articles, inspireCategories, inspireTags } from '@/lib/db/schema/articles';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { BlockEditorLoader } from './block-editor';

export const metadata: Metadata = {
  title: 'Edit Dynamic Block - Admin',
};

interface EditBlockPageProps {
  params: Promise<{ 'block-id': string }>;
}

export default async function EditDynamicBlockPage({ params }: EditBlockPageProps) {
  await requireAdminSection('inspire');

  const { 'block-id': blockId } = await params;
  if (!isUuid(blockId)) notFound();

  const [block] = await db
    .select()
    .from(dynamicBlocks)
    .where(eq(dynamicBlocks.id, blockId))
    .limit(1);
  if (!block) notFound();

  const [rules, allCategories, allTags] = await Promise.all([
    db
      .select({
        categoryId: dynamicBlockRules.categoryId,
        tagId: dynamicBlockRules.tagId,
        articleId: dynamicBlockRules.articleId,
        articleTitle: articles.title,
      })
      .from(dynamicBlockRules)
      .leftJoin(articles, eq(dynamicBlockRules.articleId, articles.id))
      .where(eq(dynamicBlockRules.blockId, blockId)),
    db
      .select({
        id: inspireCategories.id,
        name: inspireCategories.name,
        parentId: inspireCategories.parentId,
      })
      .from(inspireCategories)
      .orderBy(inspireCategories.displayOrder),
    db
      .select({ id: inspireTags.id, name: inspireTags.name })
      .from(inspireTags)
      .orderBy(inspireTags.name),
  ]);

  return (
    <div>
      <PageHeader
        breadcrumb={
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href="/admin/inspire/dynamic-blocks">
              <ArrowLeftIcon className="mr-1 size-4" />
              Back to Dynamic Blocks
            </Link>
          </Button>
        }
        title="Edit Dynamic Block"
        description="Content, placement and targeting rules for this block."
      />
      <BlockEditorLoader
        block={{
          id: block.id,
          name: block.name,
          content: block.content ?? { type: 'doc', content: [{ type: 'paragraph' }] },
          placement: block.placement === 'start' ? 'start' : 'end',
          status: block.status === 'published' ? 'published' : 'draft',
          isActive: block.isActive,
          displayOrder: block.displayOrder,
        }}
        categories={allCategories}
        allTags={allTags}
        initialCategoryIds={rules.flatMap((r) => (r.categoryId ? [r.categoryId] : []))}
        initialTagIds={rules.flatMap((r) => (r.tagId ? [r.tagId] : []))}
        initialArticleRules={rules.flatMap((r) =>
          r.articleId ? [{ id: r.articleId, title: r.articleTitle ?? 'Untitled article' }] : [],
        )}
      />
    </div>
  );
}
