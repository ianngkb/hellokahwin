'use server';

import { redirect } from 'next/navigation';
import { db } from '@/lib/db/drizzle';
import { articles, articleCategories } from '@/lib/db/schema/articles';
import { requireAdminSectionAction } from '@/lib/auth/admin';
import { logAuditEvent } from '@/lib/audit/log';
import { generateSlug } from '@/lib/utils/slug';
import { articleCreateSchema, formatArticleValidationError } from '@/lib/validations/article';

export async function createArticleAction(_prev: unknown, formData: FormData) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  const parsed = articleCreateSchema.safeParse({
    title: formData.get('title'),
    primaryCategoryId: formData.get('primaryCategoryId'),
    additionalCategoryIds: formData.getAll('additionalCategoryIds').filter(Boolean),
  });
  if (!parsed.success) return { error: formatArticleValidationError(parsed.error) };

  const { title, primaryCategoryId, additionalCategoryIds } = parsed.data;
  const slug = generateSlug(title) + '-' + Date.now().toString(36);

  const newArticle = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(articles)
      .values({
        title,
        slug,
        status: 'draft' as const,
        authorId: user.id,
        primaryCategoryId,
        publishedAt: null,
      })
      .returning({ id: articles.id });

    // Insert primary category junction
    const categoryIds = [primaryCategoryId, ...(additionalCategoryIds ?? [])];
    const uniqueCategoryIds = [...new Set(categoryIds)];

    if (uniqueCategoryIds.length > 0) {
      await tx.insert(articleCategories).values(
        uniqueCategoryIds.map((categoryId) => ({
          articleId: inserted.id,
          categoryId,
        })),
      );
    }

    return inserted;
  });

  logAuditEvent({
    entityType: 'article',
    entityId: newArticle.id,
    action: 'created',
    performedBy: user.id,
    metadata: { title, slug, status: 'draft' },
  });

  redirect(`/admin/inspire/${newArticle.id}/edit`);
}
