import { Fragment } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq, ne, desc, and, inArray, sql } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { withDeadline } from '@/lib/api/timeout';
import { articles, inspireCategories, articleCategories } from '@/lib/db/schema/articles';
import { ArticleCard } from '@/components/inspire/article-card';
import { Pagination } from '@/components/ui/pagination';
import { Breadcrumbs, BreadcrumbJsonLd } from '@/components/common/breadcrumbs';

// Cache forever; invalidate via `revalidateTag('articles')` /
// `revalidateTag('inspire-categories')` from admin write paths. See
// inspire/[category]/[slug]/page.tsx for the rationale.
export const revalidate = false;

// Hard 5s ceiling — see inspire/[category]/[slug]/page.tsx for rationale.
export const maxDuration = 5;

interface CategoryPageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string; sub?: string }>;
}

const getCategoryBySlugCached = unstable_cache(
  async (slug: string) => {
    const [cat] = await db
      .select()
      .from(inspireCategories)
      .where(eq(inspireCategories.slug, slug))
      .limit(1);
    return cat ?? null;
  },
  ['inspire-category-by-slug'],
  { tags: ['inspire-categories'], revalidate: false },
);

// Children + grandchildren under a given category. Cached so the page render
// AND generateMetadata's `?sub=` validation share one DB round-trip per
// category per ISR window.
const getCategoryHierarchyCached = unstable_cache(
  async (categoryId: string) => {
    const [children, grandchildren] = await Promise.all([
      db
        .select({
          id: inspireCategories.id,
          name: inspireCategories.name,
          slug: inspireCategories.slug,
          parentId: inspireCategories.parentId,
        })
        .from(inspireCategories)
        .where(eq(inspireCategories.parentId, categoryId))
        .orderBy(inspireCategories.displayOrder),
      db
        .select({
          id: inspireCategories.id,
          name: inspireCategories.name,
          slug: inspireCategories.slug,
          parentId: inspireCategories.parentId,
        })
        .from(inspireCategories)
        .where(
          sql`${inspireCategories.parentId} IN (
          SELECT id FROM inspire_categories WHERE parent_id = ${categoryId}
        )`,
        )
        .orderBy(inspireCategories.displayOrder),
    ]);
    return { children, grandchildren };
  },
  ['inspire-category-hierarchy'],
  { tags: ['inspire-categories'], revalidate: false },
);

const ARTICLES_PER_PAGE = 16;
const ARTICLES_PER_PAGE_WITH_ADS = 14;

const getCategoryArticles = unstable_cache(
  async (categoryIds: string[], page: number, perPage: number) => {
    const offset = (page - 1) * perPage;

    // Subquery: get distinct article IDs matching the category filter
    const matchingIds = db
      .selectDistinct({ id: articles.id })
      .from(articles)
      .innerJoin(articleCategories, eq(articles.id, articleCategories.articleId))
      .where(
        and(eq(articles.status, 'published'), inArray(articleCategories.categoryId, categoryIds)),
      )
      .as('matching');

    const [data, totalResult] = await Promise.all([
      db
        .select({
          id: articles.id,
          title: articles.title,
          slug: articles.slug,
          coverImageUrl: articles.coverImageUrl,
          coverImageVariants: articles.coverImageVariants,
          coverImageSmartCrops: articles.coverImageSmartCrops,
          publishedAt: articles.publishedAt,
          categoryName: inspireCategories.name,
          categorySlug: inspireCategories.slug,
        })
        .from(articles)
        .innerJoin(matchingIds, eq(articles.id, matchingIds.id))
        .leftJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
        .orderBy(desc(articles.publishedAt))
        .limit(perPage)
        .offset(offset),
      db
        .select({ count: sql<number>`COUNT(DISTINCT ${articles.id})` })
        .from(articles)
        .innerJoin(articleCategories, eq(articles.id, articleCategories.articleId))
        .where(
          and(eq(articles.status, 'published'), inArray(articleCategories.categoryId, categoryIds)),
        ),
    ]);
    // Fetch secondary categories for all articles on this page
    const articleIds = data.map((a) => a.id);
    const secondaryCategoryRows =
      articleIds.length > 0
        ? await db
            .select({
              articleId: articleCategories.articleId,
              name: inspireCategories.name,
              slug: inspireCategories.slug,
            })
            .from(articleCategories)
            .innerJoin(inspireCategories, eq(articleCategories.categoryId, inspireCategories.id))
            .where(inArray(articleCategories.articleId, articleIds))
            .orderBy(inspireCategories.name)
        : [];

    const secondaryByArticle = new Map<string, { name: string; slug: string }[]>();
    for (const row of secondaryCategoryRows) {
      const article = data.find((a) => a.id === row.articleId);
      if (article && row.name === article.categoryName) continue;
      const list = secondaryByArticle.get(row.articleId) ?? [];
      list.push({ name: row.name, slug: row.slug });
      secondaryByArticle.set(row.articleId, list);
    }

    const articlesWithCategories = data.map((a) => ({
      ...a,
      categories: [
        ...(a.categoryName && a.categorySlug
          ? [{ name: a.categoryName, slug: a.categorySlug }]
          : []),
        ...(secondaryByArticle.get(a.id) ?? []),
      ],
    }));

    return { data: articlesWithCategories, total: totalResult[0]?.count ?? 0 };
  },
  ['inspire-category-articles'],
  { tags: ['articles', 'inspire-categories'], revalidate: false },
);

export async function generateMetadata({
  params,
  searchParams,
}: CategoryPageProps): Promise<Metadata> {
  const { category: categorySlug } = await params;
  let cat;
  try {
    cat = await withDeadline(
      getCategoryBySlugCached(categorySlug),
      3_000,
      `inspire-category-meta:${categorySlug}`,
    );
  } catch {
    return {};
  }
  if (!cat) return { title: 'Not Found' };

  const description = cat.description ?? `Artikel ${cat.name} di HelloKahwin.`;
  // Title omits ` | HelloKahwin` because the root layout's
  // title.template appends it. Open Graph and Twitter titles include it
  // explicitly because those tags are emitted as-is (no template).
  const baseMeta: Metadata = {
    title: `${cat.name} | Inspire`,
    description,
    alternates: { canonical: `/artikel/${categorySlug}` },
    openGraph: {
      title: `${cat.name} | Artikel | HelloKahwin`,
      description,
      images: [{ url: '/hellokahwin-logo.png', width: 886, height: 290, alt: 'HelloKahwin' }],
    },
    twitter: {
      card: 'summary',
      title: `${cat.name} | Artikel | HelloKahwin`,
      description,
      images: ['/hellokahwin-logo.png'],
    },
  };

  // Child/grandchild category hubs are reached in-app only via the parent's
  // `?sub=` form (which canonicalises to the parent) and are excluded from the
  // sitemap. Their standalone /inspire/{childSlug} URL is therefore an orphaned
  // duplicate of the parent view — noindex,follow so signals consolidate onto
  // the parent hub while crawlers still follow the article links here.
  if (cat.parentId) {
    return { ...baseMeta, robots: { index: false, follow: true } };
  }

  // Soft-404 prevention for `?sub=` URLs (~3 in the May 2026 GSC bucket):
  // - Invalid sub slug → noindex,nofollow (page itself will 404 on render).
  // - Valid sub slug with zero matching articles → noindex,follow (real
  //   navigation surface, but nothing here for Google to index).
  const sp = await searchParams;
  // Next.js types these as `string | string[] | undefined`. Repeated keys
  // (`?sub=a&sub=b`) yield arrays; without normalisation `.find` compares a
  // slug to an array reference and never matches, so a valid first slug would
  // be misclassified as invalid and noindex,nofollow'd.
  const first = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v[0] : v;
  const subParam = first(sp.sub);

  let hierarchy;
  try {
    hierarchy = await withDeadline(
      getCategoryHierarchyCached(cat.id),
      3_000,
      `inspire-category-hierarchy-meta:${categorySlug}`,
    );
  } catch {
    return baseMeta;
  }

  // Base hub (no `?sub=`): noindex,follow when the category — aggregated across
  // all descendants — has zero published articles. Mirrors the tag-page
  // handling and keeps thin/empty category hubs out of the index. Defaults to
  // indexable if the count can't be determined within the deadline.
  if (!subParam) {
    try {
      const allCategoryIds = [
        cat.id,
        ...hierarchy.children.map((c) => c.id),
        ...hierarchy.grandchildren.map((g) => g.id),
      ];
      const { total } = await withDeadline(
        getCategoryArticles(allCategoryIds, 1, ARTICLES_PER_PAGE),
        3_000,
        `inspire-category-base-articles-meta:${categorySlug}`,
      );
      if (Number(total) === 0) {
        return { ...baseMeta, robots: { index: false, follow: true } };
      }
    } catch {
      // Couldn't determine count within deadline — default to indexable.
    }
    return baseMeta;
  }

  const activeChild = hierarchy.children.find((c) => c.slug === subParam);
  const activeGrandchild = activeChild
    ? undefined
    : hierarchy.grandchildren.find((g) => g.slug === subParam);

  if (!activeChild && !activeGrandchild) {
    return { ...baseMeta, robots: { index: false, follow: false } };
  }

  const subCategoryIds = activeChild
    ? [
        activeChild.id,
        ...hierarchy.grandchildren.filter((g) => g.parentId === activeChild.id).map((g) => g.id),
      ]
    : [activeGrandchild!.id];

  const rawPage = parseInt(first(sp.page) ?? '1', 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  try {
    const { total } = await withDeadline(
      getCategoryArticles(subCategoryIds, page, ARTICLES_PER_PAGE),
      3_000,
      `inspire-category-sub-articles-meta:${categorySlug}`,
    );
    if (total === 0) {
      return { ...baseMeta, robots: { index: false, follow: true } };
    }
  } catch {
    // Couldn't determine count within deadline — default to indexable.
  }

  return baseMeta;
}

export default async function InspireCategoryPage({ params, searchParams }: CategoryPageProps) {
  const { category: categorySlug } = await params;
  const sp = await searchParams;

  const category = await withDeadline(
    getCategoryBySlugCached(categorySlug),
    3_000,
    `inspire-category:${categorySlug}`,
  );
  if (!category) notFound();

  // Children + grandchildren — shared cache with generateMetadata.
  const { children, grandchildren } = await getCategoryHierarchyCached(category.id);

  // Determine which category IDs to include (this category + all descendants)
  const childIds = children.map((c) => c.id);
  let categoryIds = [category.id, ...childIds, ...grandchildren.map((g) => g.id)];

  // Active subcategory filter
  let activeChild: (typeof children)[number] | undefined;
  let activeGrandchild: (typeof grandchildren)[number] | undefined;

  if (sp.sub) {
    // Check if it's a child slug
    activeChild = children.find((c) => c.slug === sp.sub);
    if (activeChild) {
      // Include this child + its grandchildren
      const gcIds = grandchildren.filter((g) => g.parentId === activeChild!.id).map((g) => g.id);
      categoryIds = [activeChild.id, ...gcIds];
    } else {
      // Check if it's a grandchild slug
      activeGrandchild = grandchildren.find((g) => g.slug === sp.sub);
      if (activeGrandchild) {
        categoryIds = [activeGrandchild.id];
        // Set the parent child as active for UI display
        activeChild = children.find((c) => c.id === activeGrandchild!.parentId);
      } else {
        // ?sub= was supplied but doesn't match any child or grandchild slug.
        // Returning HTTP 200 with the unfiltered grid was being read by Google
        // as soft-404 / duplicate-content. Real 404 is the cleaner signal.
        notFound();
      }
    }
  }

  const rawPage = parseInt(sp.page ?? '1', 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const showAds = false;
  const perPage = showAds ? ARTICLES_PER_PAGE_WITH_ADS : ARTICLES_PER_PAGE;

  // Soft-fail the article-listing query: if it stalls past the 3s deadline,
  // render the empty-state UI rather than a 5xx. Far better UX during a DB
  // blip than a hard error page.
  let articlesData: Awaited<ReturnType<typeof getCategoryArticles>> = { data: [], total: 0 };
  try {
    articlesData = await withDeadline(
      getCategoryArticles(categoryIds, page, perPage),
      3_000,
      `inspire-category-articles:${categorySlug}`,
    );
  } catch (err) {
    console.error(`[inspire-category:${categorySlug}] articles fetch failed:`, err);
  }
  const { data, total } = articlesData;

  const totalPages = Math.ceil(total / perPage);

  const breadcrumbItems = [
    { label: 'Utama', href: '/' },
    { label: 'Inspire', href: '/artikel' },
    ...(sp.sub && activeChild
      ? [
          { label: category.name, href: `/artikel/${categorySlug}` },
          ...(activeGrandchild
            ? [
                {
                  label: activeChild.name,
                  href: `/artikel/${categorySlug}?sub=${activeChild.slug}`,
                },
                { label: activeGrandchild.name },
              ]
            : [{ label: activeChild.name }]),
        ]
      : [{ label: category.name }]),
  ];

  return (
    <div className="container mx-auto px-4 py-8 lg:px-6">
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: category.name,
            description:
              category.description ?? `Artikel ${category.name} di HelloKahwin.`,
            url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hellokahwin.com'}/artikel/${categorySlug}`,
            numberOfItems: Number(total),
            provider: {
              '@type': 'Organization',
              name: 'HelloKahwin',
            },
          }).replace(/</g, '\\u003c'),
        }}
      />
      <Breadcrumbs items={breadcrumbItems} />

      <div className="inspire-editorial">
        <div className="mb-8">
          <h1 className="inspire-display text-3xl">{category.name}</h1>
          {category.description && (
            <p className="text-muted-foreground mt-2">{category.description}</p>
          )}
        </div>

        {/* Subcategory filter chips */}
        {children.length > 0 && (
          <div className="mb-8 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/artikel/${categorySlug}`}
                className={`rounded-full border px-4 py-1.5 text-xs font-medium tracking-wider uppercase transition-colors ${
                  !sp.sub
                    ? 'bg-foreground text-background border-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:border-foreground'
                }`}
                style={{ fontFamily: 'var(--font-geist)' }}
              >
                All
              </Link>
              {children.map((child) => (
                <Link
                  key={child.id}
                  href={`/artikel/${categorySlug}?sub=${child.slug}`}
                  className={`rounded-full border px-4 py-1.5 text-xs font-medium tracking-wider uppercase transition-colors ${
                    activeChild?.id === child.id
                      ? 'bg-foreground text-background border-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:border-foreground'
                  }`}
                  style={{ fontFamily: 'var(--font-geist)' }}
                >
                  {child.name}
                </Link>
              ))}
            </div>
            {/* Level-3 grandchild chips (shown when a level-2 child is selected) */}
            {activeChild &&
              (() => {
                const childGrandchildren = grandchildren.filter(
                  (g) => g.parentId === activeChild!.id,
                );
                if (childGrandchildren.length === 0) return null;
                return (
                  <div className="flex flex-wrap gap-2 pl-2">
                    <Link
                      href={`/artikel/${categorySlug}?sub=${activeChild.slug}`}
                      className={`rounded-full border px-3 py-1 text-[11px] font-medium tracking-wider uppercase transition-colors ${
                        !activeGrandchild
                          ? 'bg-foreground text-background border-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:border-foreground'
                      }`}
                      style={{ fontFamily: 'var(--font-geist)' }}
                    >
                      All {activeChild.name}
                    </Link>
                    {childGrandchildren.map((gc) => (
                      <Link
                        key={gc.id}
                        href={`/artikel/${categorySlug}?sub=${gc.slug}`}
                        className={`rounded-full border px-3 py-1 text-[11px] font-medium tracking-wider uppercase transition-colors ${
                          activeGrandchild?.id === gc.id
                            ? 'bg-foreground text-background border-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:border-foreground'
                        }`}
                        style={{ fontFamily: 'var(--font-geist)' }}
                      >
                        {gc.name}
                      </Link>
                    ))}
                  </div>
                );
              })()}
          </div>
        )}

        {/* Article grid */}
        {data.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.map((article, index) => (
                <Fragment key={article.id}>
                  <ArticleCard
                    title={article.title}
                    slug={article.slug}
                    categorySlug={article.categorySlug ?? categorySlug}
                    categories={article.categories}
                    coverImageUrl={article.coverImageUrl}
                    coverImageVariants={
                      article.coverImageVariants as Record<
                        string,
                        { url: string; sizeBytes: number }
                      > | null
                    }
                    smartCrops={
                      article.coverImageSmartCrops as Record<
                        string,
                        { url: string; width: number; height: number }
                      > | null
                    }
                    publishedAt={null}
                  />
                </Fragment>
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                baseHref={`/artikel/${categorySlug}`}
                searchParams={Object.fromEntries(
                  Object.entries(sp).filter(([, v]) => v !== undefined) as [string, string][],
                )}
              />
            )}
          </>
        ) : (
          <div className="py-20 text-center">
            <p className="text-lg font-medium">Tiada artikel dijumpai</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Artikel {category.name.toLowerCase()} akan datang tidak lama lagi.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
