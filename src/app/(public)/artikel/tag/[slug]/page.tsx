import { Fragment } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { eq, desc, and, sql, inArray } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { withDeadline } from '@/lib/api/timeout';
import {
  articles,
  inspireTags,
  articleTags,
  inspireCategories,
  articleCategories,
} from '@/lib/db/schema/articles';
import { ArticleCard } from '@/components/inspire/article-card';
import { Pagination } from '@/components/ui/pagination';
import { Breadcrumbs, BreadcrumbJsonLd } from '@/components/common/breadcrumbs';
import { buildTagDescription, TAG_ROBOTS } from '@/lib/seo/tag-metadata';
import { collectionItemList } from '@/lib/seo/collection-jsonld';

// Cache forever; invalidate on admin write via revalidateTag('articles') /
// revalidateTag(`inspire-tag:${slug}`). Time-based ISR was the cause of bot-
// crawl stampedes — see spec-inspire-catalog-bot-resilience.md.
export const revalidate = false;

// Hard 5s ceiling — see inspire/[category]/[slug]/page.tsx for rationale.
export const maxDuration = 5;

interface TagPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

const getTagBySlugCached = unstable_cache(
  async (slug: string) => {
    // Hidden tags are admin-only: resolving them to null makes both
    // generateMetadata and the page notFound() — a 404 archive for free.
    const [tag] = await db
      .select()
      .from(inspireTags)
      .where(and(eq(inspireTags.slug, slug), eq(inspireTags.isHidden, false)))
      .limit(1);
    return tag ?? null;
  },
  ['inspire-tag-by-slug'],
  { tags: ['inspire-tags'], revalidate: false },
);

const ARTICLES_PER_PAGE = 16;
const ARTICLES_PER_PAGE_WITH_ADS = 14;

const getTagArticles = unstable_cache(
  async (tagId: string, page: number, perPage: number) => {
    const offset = (page - 1) * perPage;
    const [data, totalResult] = await Promise.all([
      db
        .select({
          id: articles.id,
          title: articles.title,
          slug: articles.slug,
          coverImageUrl: articles.coverImageUrl,
          coverImageVariants: articles.coverImageVariants,
          coverImageSmartCrops: articles.coverImageSmartCrops,
          coverImageLqip: articles.coverImageLqip,
          publishedAt: articles.publishedAt,
          categoryName: inspireCategories.name,
          categorySlug: inspireCategories.slug,
        })
        .from(articles)
        .innerJoin(articleTags, eq(articles.id, articleTags.articleId))
        .leftJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
        .where(and(eq(articles.status, 'published'), eq(articleTags.tagId, tagId)))
        .orderBy(desc(articles.publishedAt))
        .limit(perPage)
        .offset(offset),
      db
        .select({ count: sql<number>`COUNT(DISTINCT ${articles.id})` })
        .from(articles)
        .innerJoin(articleTags, eq(articles.id, articleTags.articleId))
        .where(and(eq(articles.status, 'published'), eq(articleTags.tagId, tagId))),
    ]);
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
  ['inspire-tag-articles'],
  { tags: ['articles', 'inspire-tags'], revalidate: false },
);

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { slug } = await params;
  // EVERY exit of this function carries `robots`, including the failure ones.
  // D6 says no tag is indexable; a `return {}` on a deadline miss says nothing,
  // and "nothing" is Google's word for "index it". These routes cache with
  // `revalidate: false`, so one slow render would have pinned an indexable tag
  // page in the cache for the life of the entry.
  let tag;
  try {
    tag = await withDeadline(getTagBySlugCached(slug), 3_000, `inspire-tag-meta:${slug}`);
  } catch {
    return { robots: TAG_ROBOTS };
  }
  if (!tag) return { title: 'Not Found', robots: TAG_ROBOTS };

  // Empty-tag detection in metadata so we return minimal head BEFORE any
  // streaming begins. Returning full Open Graph + canonical metadata for an
  // empty-tag URL was triggering Next.js to flush the response head — by the
  // time the page render's `notFound()` fired, the HTTP status was already
  // locked at 200 and Google read the not-found UI body as a Soft 404. The
  // article-slug page uses the same pattern (returns `{ title: 'Not Found' }`
  // on missing pageData) and 404s correctly.
  // Deadline-failure trade-off: when the count query fails, default to
  // `{ title: 'Not Found' }` rather than full metadata. Returning full
  // metadata on uncertainty would silently re-introduce the soft-404 bug
  // exactly when GSC notices it (DB load). Briefly 404'ing a real tag
  // during a DB blip is the safer failure mode for SEO.
  let articlesData: Awaited<ReturnType<typeof getTagArticles>>;
  try {
    articlesData = await withDeadline(
      getTagArticles(tag.id, 1, 1),
      3_000,
      `inspire-tag-meta-count:${slug}`,
    );
  } catch {
    return { title: 'Not Found', robots: TAG_ROBOTS };
  }
  if (articlesData.total === 0) return { title: 'Not Found', robots: TAG_ROBOTS };

  // ONE description, used for `<meta name="description">`, `og:description`
  // and the JSON-LD alike. The route used to emit three near-variants of a
  // 26-character sentence; `buildTagDescription` is bounded to 120-155 chars
  // and unit-tested over the whole input space.
  const description = buildTagDescription(tag.name, Number(articlesData.total));

  // Title omits ` | HelloKahwin` because the root layout's
  // title.template appends it. Open Graph and Twitter titles include it
  // explicitly because those tags are emitted as-is (no template).
  return {
    title: `${tag.name} | Inspire`,
    description,
    alternates: { canonical: `/artikel/tag/${slug}` },
    // Every tag, not just the thin ones — decision D6. Revisit the blanket
    // rule when tags routinely carry five or more articles.
    robots: TAG_ROBOTS,
    openGraph: {
      title: `${tag.name} | Artikel | HelloKahwin`,
      description,
      type: 'website',
      url: `/artikel/tag/${slug}`,
      images: [{ url: '/hellokahwin-logo.png', width: 886, height: 290, alt: 'HelloKahwin' }],
    },
    twitter: {
      card: 'summary',
      title: `${tag.name} | Artikel | HelloKahwin`,
      description,
      images: ['/hellokahwin-logo.png'],
    },
  };
}

export default async function InspireTagPage({ params, searchParams }: TagPageProps) {
  const { slug } = await params;
  const sp = await searchParams;

  const tag = await withDeadline(getTagBySlugCached(slug), 3_000, `inspire-tag:${slug}`);
  if (!tag) notFound();

  const rawPage = parseInt(sp.page ?? '1', 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const showAds = false;
  const perPage = showAds ? ARTICLES_PER_PAGE_WITH_ADS : ARTICLES_PER_PAGE;

  // Soft-fail the article-listing query — render empty state on deadline
  // rather than crashing the page. `null` is the "fetch failed" sentinel
  // (transient DB blip); a successful fetch returning zero articles is a
  // different signal and triggers notFound() below.
  let articlesData: Awaited<ReturnType<typeof getTagArticles>> | null = null;
  try {
    articlesData = await withDeadline(
      getTagArticles(tag.id, page, perPage),
      3_000,
      `inspire-tag-articles:${slug}`,
    );
  } catch (err) {
    console.error(`[inspire-tag:${slug}] articles fetch failed:`, err);
  }

  // Tag exists in DB but has zero published articles → soft-404 to Google.
  // The migration imported the WP `inspire_tags` rows wholesale, including
  // tags that no surviving article references. Rendering the "No articles
  // found" empty-state UI with HTTP 200 was parking ~208 such URLs in the
  // GSC Soft 404 bucket. Calling notFound() returns a real 404 so the URL
  // drops from the index cleanly. Drafts (status !== 'published') are
  // intentionally invisible: they count toward 0 here and the URL 404s for
  // the public until an article goes live. Only triggers when the fetch
  // SUCCEEDED — a transient DB failure still falls through to the empty
  // UI (better UX than a flicker 404 during a Supabase blip).
  if (articlesData && articlesData.total === 0) {
    notFound();
  }

  const { data, total } = articlesData ?? { data: [], total: 0 };
  const totalPages = Math.ceil(total / perPage);

  const breadcrumbItems = [
    { label: 'Utama', href: '/' },
    { label: 'Artikel', href: '/artikel' },
    { label: tag.name },
  ];

  return (
    <div className="container mx-auto px-4 py-8 lg:px-6">
      <BreadcrumbJsonLd items={breadcrumbItems} />
      {total > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'CollectionPage',
              name: tag.name,
              description: buildTagDescription(tag.name, Number(total)),
              url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hellokahwin.com'}/artikel/tag/${slug}`,
              // `numberOfItems` is an ItemList property, not a CollectionPage
              // one — see `@/lib/seo/collection-jsonld` for the 366 schema.org
              // notices that came of saying it here.
              mainEntity: collectionItemList(
                Number(total),
                data.map((article) => ({
                  name: article.title,
                  url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hellokahwin.com'}/artikel/${article.categorySlug ?? 'uncategorized'}/${article.slug}`,
                })),
                (page - 1) * perPage + 1,
              ),
              provider: {
                '@type': 'Organization',
                name: 'HelloKahwin',
              },
            }).replace(/</g, '\\u003c'),
          }}
        />
      )}
      <Breadcrumbs items={breadcrumbItems} />

      <div>
        <header className="border-border mx-auto max-w-3xl border-b pt-4 pb-10 text-center">
          <span className="hk-eyebrow">Tag</span>
          <h1 className="hk-display mt-3 text-[2rem] lg:text-[2.75rem]">{tag.name}</h1>
        </header>

        {data.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 pt-10 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-14">
              {data.map((article, index) => (
                <Fragment key={article.id}>
                  <ArticleCard
                    title={article.title}
                    slug={article.slug}
                    categorySlug={article.categorySlug ?? 'uncategorized'}
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
                    lqip={article.coverImageLqip}
                  />
                </Fragment>
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                baseHref={`/artikel/tag/${slug}`}
                searchParams={{}}
              />
            )}
          </>
        ) : (
          <div className="py-24 text-center">
            <h2 className="hk-display text-2xl">Tiada artikel dijumpai</h2>
            <p className="hk-deck mt-3">
              Artikel bertag {tag.name.toLowerCase()} akan datang tidak lama lagi.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
