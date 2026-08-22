import type { Metadata } from 'next';
import { eq, and, ilike, count, sql } from 'drizzle-orm';
import { requireAdminSection } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { inspireTags, articleTags } from '@/lib/db/schema/articles';
import { ConsoleBreadcrumb } from '@/components/console/console-breadcrumb';
import { PageHeader } from '@/components/layout/page-header';
import { TagManager } from './tag-manager';

export const metadata: Metadata = {
  title: 'Inspire Tags - Admin',
};

export default async function AdminInspireTagsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  await requireAdminSection('inspire');

  const params = await searchParams;
  const rawPage = parseInt(params.page ?? '1', 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = 100;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (params.search) {
    const escaped = params.search.replace(/[%_\\]/g, '\\$&');
    conditions.push(ilike(inspireTags.name, `%${escaped}%`));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const articleCountSub = db
    .select({
      tagId: articleTags.tagId,
      count: count().as('article_count'),
    })
    .from(articleTags)
    .groupBy(articleTags.tagId)
    .as('article_count_sub');

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: inspireTags.id,
        name: inspireTags.name,
        slug: inspireTags.slug,
        wpId: inspireTags.wpId,
        isHidden: inspireTags.isHidden,
        articleCount: sql<number>`COALESCE(${articleCountSub.count}, 0)`.as('article_count'),
      })
      .from(inspireTags)
      .leftJoin(articleCountSub, eq(inspireTags.id, articleCountSub.tagId))
      .where(whereClause)
      .orderBy(inspireTags.name)
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(inspireTags).where(whereClause),
  ]);

  const total = totalResult[0]?.count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <PageHeader
        breadcrumb={
          <ConsoleBreadcrumb
            items={[
              { label: 'Admin' },
              { label: 'Inspire', href: '/admin/inspire' },
              { label: 'Tags' },
            ]}
          />
        }
        title="Tags"
        description="Manage article tags for taxonomy and filtering."
      />

      <TagManager
        tags={rows}
        searchParams={params}
        currentPage={page}
        totalPages={totalPages}
        totalCount={total}
      />
    </div>
  );
}
