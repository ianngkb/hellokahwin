import type { Metadata } from 'next';
import Link from 'next/link';
import { eq, ne, and, ilike, desc, sql, count, isNotNull, isNull } from 'drizzle-orm';
import { requireAdminSection } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import {
  articles,
  inspireCategories,
  articleCategories,
  articleTags,
  inspireTags,
} from '@/lib/db/schema/articles';
import { inArray } from 'drizzle-orm';
import { profiles } from '@/lib/db/schema/profiles';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { ArticlesTable } from './articles-table';
import { listSelectableAuthors, type SelectableAuthor } from '@/lib/authors/queries';
import type { ArticleStatus } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Inspire - Admin',
};

export default async function AdminInspirePage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    categoryId?: string;
    source?: string;
    hiddenTagId?: string;
    page?: string;
  }>;
}) {
  await requireAdminSection('inspire');

  const params = await searchParams;
  const { search, status, categoryId, source, hiddenTagId } = params;
  const rawPage = parseInt(params.page ?? '1', 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  // 25, not 50: a full page of 50 rows scrolled far past the filter bar, so
  // re-filtering meant scrolling back to the top every time.
  const limit = 25;
  const offset = (page - 1) * limit;

  // Fetched up-front (rather than alongside the other option lists below)
  // because the hiddenTagId filter is validated against it. Only hidden tags —
  // there are hundreds of tags, so a full list would be unusable. See the
  // spec's Design Notes.
  const hiddenTags = await db
    .select({ id: inspireTags.id, name: inspireTags.name })
    .from(inspireTags)
    .where(eq(inspireTags.isHidden, true))
    .orderBy(inspireTags.name);

  // Targets for the bulk "Change author" control. Degrades to `[]` on any
  // failure — the control simply doesn't render — because losing one bulk
  // action must never cost an admin the whole article list. It is an
  // `unstable_cache` read that only touches the DB on a cold entry.
  const selectableAuthors = await listSelectableAuthors().catch((err) => {
    console.error('[admin-inspire] selectable authors read failed:', err);
    return [] as SelectableAuthor[];
  });

  const conditions = [ne(articles.status, 'deleted' as ArticleStatus)];
  if (status === 'scheduled') {
    conditions.push(eq(articles.status, 'draft' as ArticleStatus));
    conditions.push(isNotNull(articles.scheduledPublishAt));
  } else if (status === 'draft') {
    conditions.push(eq(articles.status, 'draft' as ArticleStatus));
    conditions.push(isNull(articles.scheduledPublishAt));
  } else if (status) {
    conditions.push(eq(articles.status, status as ArticleStatus));
  }
  if (categoryId) {
    const articleIdsInCategory = db
      .select({ articleId: articleCategories.articleId })
      .from(articleCategories)
      .where(eq(articleCategories.categoryId, categoryId));
    conditions.push(inArray(articles.id, articleIdsInCategory));
  }
  // Only honour the param when it names an actually-hidden tag. The column is a
  // uuid, so an unparseable value would otherwise raise a Postgres 22P02 and
  // 500 the page; and a *public* tag's id would silently work, contradicting
  // the filter's name. Anything else (malformed, unknown, or newly-unhidden) is
  // ignored and the full list renders.
  const activeHiddenTagId =
    hiddenTagId && hiddenTags.some((t) => t.id === hiddenTagId) ? hiddenTagId : null;
  if (activeHiddenTagId) {
    const articleIdsWithTag = db
      .select({ articleId: articleTags.articleId })
      .from(articleTags)
      .where(eq(articleTags.tagId, activeHiddenTagId));
    conditions.push(inArray(articles.id, articleIdsWithTag));
  }
  if (search) {
    const escaped = search.replace(/[%_\\]/g, '\\$&');
    conditions.push(ilike(articles.title, `%${escaped}%`));
  }
  if (source === 'ai') {
    conditions.push(eq(articles.isAiGenerated, true));
  } else if (source === 'human') {
    conditions.push(eq(articles.isAiGenerated, false));
  } else if (source === 'ai-unreviewed') {
    conditions.push(eq(articles.isAiGenerated, true));
    conditions.push(isNull(articles.humanReviewedAt));
  } else if (source === 'ai-reviewed') {
    conditions.push(eq(articles.isAiGenerated, true));
    conditions.push(isNotNull(articles.humanReviewedAt));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        coverImageUrl: articles.coverImageUrl,
        hasVariants: sql<boolean>`${articles.coverImageVariants} IS NOT NULL`,
        status: articles.status,
        isAiGenerated: articles.isAiGenerated,
        humanReviewedAt: articles.humanReviewedAt,
        categoryName: inspireCategories.name,
        // Primary category slug — the first segment of the article's CANONICAL
        // live URL (/inspire/{categorySlug}/{slug}). The public route matches on
        // slug alone and only uses this segment to redirect to the canonical
        // form, so it isn't required to reach the article — it is what lets the
        // list link to the right one. Same source the editor's "View Live"
        // button uses, so both agree.
        categorySlug: inspireCategories.slug,
        authorName: sql<string>`CONCAT(${profiles.firstName}, ' ', ${profiles.lastName})`,
        publishedAt: articles.publishedAt,
        scheduledPublishAt: articles.scheduledPublishAt,
        createdAt: articles.createdAt,
        updatedAt: articles.updatedAt,
      })
      .from(articles)
      .leftJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
      .innerJoin(profiles, eq(articles.authorId, profiles.id))
      .where(whereClause)
      .orderBy(desc(articles.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(articles).where(whereClause),
  ]);

  const total = totalResult[0]?.count ?? 0;
  const totalPages = Math.ceil(total / limit);

  const articleIds = rows.map((r) => r.id);

  const [allCategories, secondaryCategoryRows] = await Promise.all([
    db
      .select({ id: inspireCategories.id, name: inspireCategories.name })
      .from(inspireCategories)
      .orderBy(sql`lower(${inspireCategories.name}) asc`),
    articleIds.length > 0
      ? db
          .select({
            articleId: articleCategories.articleId,
            categoryName: inspireCategories.name,
          })
          .from(articleCategories)
          .innerJoin(inspireCategories, eq(articleCategories.categoryId, inspireCategories.id))
          .where(inArray(articleCategories.articleId, articleIds))
          .orderBy(inspireCategories.name)
      : Promise.resolve([]),
  ]);

  // Group secondary categories by article, excluding the primary
  const secondaryCategoriesByArticle = new Map<string, string[]>();
  for (const row of secondaryCategoryRows) {
    const article = rows.find((r) => r.id === row.articleId);
    // Skip if this category name matches the primary (already shown in primary column)
    if (article && row.categoryName === article.categoryName) continue;
    const existing = secondaryCategoriesByArticle.get(row.articleId) ?? [];
    existing.push(row.categoryName);
    secondaryCategoriesByArticle.set(row.articleId, existing);
  }

  const serialized = rows.map((r) => ({
    ...r,
    hasVariants: Boolean(r.hasVariants),
    secondaryCategories: secondaryCategoriesByArticle.get(r.id) ?? [],
    humanReviewedAt: r.humanReviewedAt?.toISOString() ?? null,
    publishedAt: r.publishedAt?.toISOString() ?? null,
    scheduledPublishAt: r.scheduledPublishAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  // Media / Categories / Navigation / Tags are deliberately NOT repeated in the
  // header actions: the Inspire group tabs (admin-nav-sections.ts) already link
  // all four, so duplicating them here rendered every destination twice.
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={
          <span className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
            Admin · Inspire
          </span>
        }
        title="Articles"
        description="Manage editorial articles and content."
        actions={
          <Button asChild>
            <Link href="/admin/inspire/create">New Article</Link>
          </Button>
        }
      />

      <ArticlesTable
        articles={serialized}
        categories={allCategories}
        hiddenTags={hiddenTags}
        selectableAuthors={selectableAuthors.map((a) => ({
          id: a.id,
          name: a.name,
          isHouseAccount: a.isHouseAccount,
        }))}
        searchParams={params}
        currentPage={page}
        totalPages={totalPages}
        total={total}
        pageSize={limit}
      />
    </div>
  );
}
