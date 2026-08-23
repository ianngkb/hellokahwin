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
import {
  ARTICLE_AUTHORSHIPS,
  ARTICLE_REVIEW_STATUSES,
  type ArticleAuthorship,
  type ArticleReviewStatus,
  type ArticleStatus,
} from '@/lib/constants';
import { alias } from 'drizzle-orm/pg-core';

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
    // Superseded by `authorship` + `review`, still accepted as an alias so a
    // bookmarked admin URL does not silently widen to "everything".
    source?: string;
    authorship?: string;
    review?: string;
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
  // Two INDEPENDENT filters, replacing the old single four-value `source`
  // select. Independent so that "AI + needs review" — the owner's stated primary
  // workflow — is expressible, and so is "anything needing changes regardless of
  // who wrote it", which the combined control could not express at all.
  //
  // Both are validated against their enum's members before reaching Postgres.
  // The same reason the hiddenTagId filter above is validated: an unvalidated
  // value reaches the driver as an invalid enum literal, raises 22P02, and 500s
  // the page. Anything unrecognised is ignored and the full list renders.
  const { authorship: authorshipParam, review: reviewParam } = params;

  // A bookmarked `?source=` URL keeps working. Mapping it here rather than
  // leaving it dead means an old link narrows the way it always did instead of
  // silently widening to everything — the failure that would quietly show the
  // owner a queue they thought was filtered.
  const SOURCE_ALIASES: Record<string, { authorship?: string; review?: string }> = {
    ai: { authorship: 'ai' },
    human: { authorship: 'human' },
    'ai-unreviewed': { authorship: 'ai', review: 'pending_review' },
    'ai-reviewed': { authorship: 'ai', review: 'reviewed' },
  };
  const sourceAlias = source ? SOURCE_ALIASES[source] : undefined;

  // An explicit param always wins over the alias, so a half-migrated URL
  // carrying both does the thing the newer control says.
  const rawAuthorship = authorshipParam ?? sourceAlias?.authorship;
  const rawReview = reviewParam ?? sourceAlias?.review;

  const activeAuthorship = ARTICLE_AUTHORSHIPS.includes(rawAuthorship as ArticleAuthorship)
    ? (rawAuthorship as ArticleAuthorship)
    : null;
  const activeReview = ARTICLE_REVIEW_STATUSES.includes(rawReview as ArticleReviewStatus)
    ? (rawReview as ArticleReviewStatus)
    : null;

  if (activeAuthorship) {
    conditions.push(eq(articles.authorship, activeAuthorship));
  }
  if (activeReview) {
    conditions.push(eq(articles.reviewStatus, activeReview));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Second join onto profiles for the REVIEWER, distinct from the author join
  // below. LEFT, not INNER: reviewed_by is nullable (nothing is reviewed yet on
  // a fresh database, and ON DELETE SET NULL can clear it later) and an inner
  // join would silently drop every unreviewed article from the list.
  const reviewer = alias(profiles, 'reviewer');

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        coverImageUrl: articles.coverImageUrl,
        hasVariants: sql<boolean>`${articles.coverImageVariants} IS NOT NULL`,
        status: articles.status,
        authorship: articles.authorship,
        reviewStatus: articles.reviewStatus,
        reviewedAt: articles.reviewedAt,
        // NULL when nobody has reviewed it, and also when the reviewer's profile
        // has since been deleted (ON DELETE SET NULL) — the table renders the
        // timestamp without attribution in that case rather than hiding it.
        reviewedByName: sql<
          string | null
        >`NULLIF(TRIM(CONCAT(${reviewer.firstName}, ' ', ${reviewer.lastName})), '')`,
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
      .leftJoin(reviewer, eq(articles.reviewedBy, reviewer.id))
      .where(whereClause)
      // Pending-first, replacing the old plain `created_at DESC`. What the owner
      // opens this page to do is work a review queue, so the queue is what the
      // page opens on: everything awaiting a decision, then everything already
      // settled. Within the pending band, AI above human — that is the queue the
      // owner actually asked for — and newest first inside that.
      .orderBy(
        sql`CASE ${articles.reviewStatus}
              WHEN 'pending_review' THEN 0
              WHEN 'needs_changes'  THEN 1
              ELSE 2
            END`,
        sql`CASE WHEN ${articles.authorship} = 'human' THEN 1 ELSE 0 END`,
        desc(articles.createdAt),
      )
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
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
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
