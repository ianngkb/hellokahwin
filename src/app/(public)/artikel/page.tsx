import { Fragment } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { eq, desc, count, sql, inArray } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { articles, inspireCategories, articleCategories } from '@/lib/db/schema/articles';
import { ArticleCard } from '@/components/inspire/article-card';
import { getSmartCropUrl } from '@/lib/storage/smart-crop-url';
import { Chip } from '@/components/ui/chip';
import { InspireArticleSearch } from '@/components/inspire/inspire-article-search';

// ISR: getInspireHomeData() is unstable_cache-wrapped, but the page itself
// inherited dynamic rendering from the layout's currentUser() call (now removed).
// 30-min revalidate matches c1c91fc's baseline window for inspire pages.
export const revalidate = 1800;

export const metadata: Metadata = {
  // Brand omitted — root layout's title.template appends it once (was doubled).
  title: 'Artikel',
  description:
    'Idea, tips dan panduan perkahwinan untuk pasangan Malaysia — daripada perancangan bajet hingga hari bahagia anda.',
  alternates: { canonical: '/artikel' },
  openGraph: {
    title: 'Artikel | HelloKahwin',
    description:
      'Idea, tips dan panduan perkahwinan untuk pasangan Malaysia — daripada perancangan bajet hingga hari bahagia anda.',
    type: 'website',
    images: [{ url: '/hellokahwin-logo.png', width: 886, height: 290, alt: 'HelloKahwin' }],
  },
  twitter: {
    card: 'summary',
    title: 'Artikel | HelloKahwin',
    description:
      'Idea, tips dan panduan perkahwinan untuk pasangan Malaysia — daripada perancangan bajet hingga hari bahagia anda.',
    images: ['/hellokahwin-logo.png'],
  },
};

const getInspireHomeData = unstable_cache(
  async () => {
    const articleCountSub = db
      .select({
        categoryId: articleCategories.categoryId,
        count: count().as('article_count'),
      })
      .from(articleCategories)
      .innerJoin(articles, eq(articleCategories.articleId, articles.id))
      .where(eq(articles.status, 'published'))
      .groupBy(articleCategories.categoryId)
      .as('article_count_sub');

    const [latestArticles, allCategories] = await Promise.all([
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
        .innerJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
        .where(eq(articles.status, 'published'))
        .orderBy(desc(articles.publishedAt))
        .limit(12),
      db
        .select({
          id: inspireCategories.id,
          name: inspireCategories.name,
          slug: inspireCategories.slug,
          parentId: inspireCategories.parentId,
          articleCount: sql<number>`COALESCE(${articleCountSub.count}, 0)`,
        })
        .from(inspireCategories)
        .leftJoin(articleCountSub, eq(inspireCategories.id, articleCountSub.categoryId))
        .orderBy(inspireCategories.displayOrder),
    ]);

    // Fetch secondary categories for all articles in one query
    const articleIds = latestArticles.map((a) => a.id);
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

    // Group by article, excluding primary
    const secondaryByArticle = new Map<string, { name: string; slug: string }[]>();
    for (const row of secondaryCategoryRows) {
      const article = latestArticles.find((a) => a.id === row.articleId);
      if (article && row.name === article.categoryName) continue;
      const list = secondaryByArticle.get(row.articleId) ?? [];
      list.push({ name: row.name, slug: row.slug });
      secondaryByArticle.set(row.articleId, list);
    }

    const articlesWithCategories = latestArticles.map((a) => ({
      ...a,
      categories: [
        ...(a.categoryName && a.categorySlug
          ? [{ name: a.categoryName, slug: a.categorySlug }]
          : []),
        ...(secondaryByArticle.get(a.id) ?? []),
      ],
    }));

    return { latestArticles: articlesWithCategories, allCategories };
  },
  ['inspire-home'],
  // See the home page: `revalidatePath('/artikel')` does not evict an
  // `unstable_cache` entry — only the tag does.
  { tags: ['articles', 'inspire-categories'], revalidate: 600 },
);

export default async function InspireHomePage() {
  const { latestArticles, allCategories } = await getInspireHomeData();

  // Build top-level categories with aggregated descendant counts
  const topCategories = allCategories
    .filter((c) => !c.parentId)
    .map((parent) => {
      const children = allCategories.filter((c) => c.parentId === parent.id);
      const grandchildren = allCategories.filter((c) =>
        children.some((ch) => ch.id === c.parentId),
      );
      const totalCount =
        parent.articleCount +
        children.reduce((sum, c) => sum + c.articleCount, 0) +
        grandchildren.reduce((sum, c) => sum + c.articleCount, 0);
      return { ...parent, articleCount: totalCount, children, grandchildren };
    });

  // Sort categories by article count descending for bottom pills
  const bottomCategories = [...topCategories]
    .filter((c) => c.articleCount > 0)
    .sort((a, b) => b.articleCount - a.articleCount);

  const featured = latestArticles.slice(0, 3);
  const latest = latestArticles.slice(3);

  return (
    <div className="inspire-editorial">
      {/* The visible "Inspire · N articles" row was removed to lift the featured
          cover above the fold. Keep an sr-only h1 so this hub still has a
          top-level heading for the document outline and for SEO — without it the
          page would start at h2. */}
      <h1 className="sr-only">Artikel Perkahwinan HelloKahwin</h1>

      <section className="py-2 lg:py-6">
        <div className="container mx-auto px-4 lg:px-6">
          {latestArticles.length > 0 ? (
            <>
              {/* Featured hero section */}
              {featured.length >= 3 ? (
                <div className="mb-1 grid grid-cols-1 gap-4 lg:mb-12 lg:grid-cols-[1.4fr_1fr] lg:grid-rows-2">
                  {/* Main featured article */}
                  <Link
                    href={`/artikel/${featured[0].categorySlug}/${featured[0].slug}`}
                    className="group rounded-card relative min-h-[240px] overflow-hidden lg:row-span-2 lg:min-h-[480px]"
                  >
                    <div className="bg-muted absolute inset-0">
                      {featured[0].coverImageUrl ? (
                        <Image
                          src={
                            getSmartCropUrl(
                              featured[0].coverImageSmartCrops,
                              'crop-4x3-article-card',
                            ) ??
                            (
                              featured[0].coverImageVariants as Record<
                                string,
                                { url: string }
                              > | null
                            )?.high?.url ??
                            featured[0].coverImageUrl
                          }
                          alt={featured[0].title}
                          fill
                          sizes="(max-width: 1024px) 100vw, 60vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          priority
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <span className="text-muted-foreground text-sm">Tiada gambar</span>
                        </div>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute right-0 bottom-0 left-0 p-6 text-white lg:p-8">
                      <span className="inspire-overline text-brand-secondary">
                        {featured[0].categoryName}
                      </span>
                      <h2 className="mt-2 text-xl leading-tight text-white lg:text-[1.75rem]">
                        {featured[0].title}
                      </h2>
                      {featured[0].publishedAt && (
                        <p className="mt-2 text-sm text-white/60">
                          {new Date(featured[0].publishedAt).toLocaleDateString('ms-MY', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                  </Link>

                  {/* Side featured articles */}
                  {featured.slice(1, 3).map((article) => (
                    <Link
                      key={article.id}
                      href={`/artikel/${article.categorySlug}/${article.slug}`}
                      className="group rounded-card relative min-h-[240px] overflow-hidden lg:min-h-[230px]"
                    >
                      <div className="bg-muted absolute inset-0">
                        {article.coverImageUrl ? (
                          <Image
                            src={
                              getSmartCropUrl(
                                article.coverImageSmartCrops,
                                'crop-4x3-article-card',
                              ) ??
                              (article.coverImageVariants as Record<string, { url: string }> | null)
                                ?.low?.url ??
                              article.coverImageUrl
                            }
                            alt={article.title}
                            fill
                            sizes="(max-width: 1024px) 100vw, 40vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <span className="text-muted-foreground text-sm">Tiada gambar</span>
                          </div>
                        )}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute right-0 bottom-0 left-0 p-5 text-white">
                        <span className="inspire-overline text-brand-secondary">
                          {article.categoryName}
                        </span>
                        <h2 className="mt-1.5 text-xl leading-snug text-white lg:text-lg">
                          {article.title}
                        </h2>
                        {article.publishedAt && (
                          <p className="mt-1.5 text-xs text-white/60">
                            {new Date(article.publishedAt).toLocaleDateString('ms-MY', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                /* Fewer than 3 articles — simpler hero */
                <div className="mb-1 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mb-12">
                  {featured.map((article) => (
                    <Link
                      key={article.id}
                      href={`/artikel/${article.categorySlug}/${article.slug}`}
                      className="group rounded-card relative min-h-[280px] overflow-hidden"
                    >
                      <div className="bg-muted absolute inset-0">
                        {article.coverImageUrl ? (
                          <Image
                            src={
                              getSmartCropUrl(
                                article.coverImageSmartCrops,
                                'crop-4x3-article-card',
                              ) ??
                              (article.coverImageVariants as Record<string, { url: string }> | null)
                                ?.low?.url ??
                              article.coverImageUrl
                            }
                            alt={article.title}
                            fill
                            sizes="(max-width: 640px) 100vw, 50vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <span className="text-muted-foreground text-sm">Tiada gambar</span>
                          </div>
                        )}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute right-0 bottom-0 left-0 p-6 text-white">
                        <span className="inspire-overline text-brand-secondary">
                          {article.categoryName}
                        </span>
                        <h2 className="mt-2 text-xl leading-snug text-white">{article.title}</h2>
                      </div>
                    </Link>
                  ))}
                </div>
              )}


              {/* Search — sticky-adjacent, always visible (Mobbin: search + chips) */}
              <div className="mx-auto max-w-xl py-4">
                <InspireArticleSearch />
              </div>

              {/* Latest section */}
              {latest.length > 0 && (
                <>
                  <div className="flex items-center gap-4 py-3">
                    <h2 className="text-2xl whitespace-nowrap">Terkini</h2>
                    <div className="bg-border h-px flex-1" />
                  </div>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {latest.map((article, index) => (
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
                        />
                      </Fragment>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="py-20 text-center">
              <p className="text-lg font-medium">Belum ada artikel</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Idea dan panduan perkahwinan akan datang tidak lama lagi.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Browse by Category — pills sorted by article count */}
      {bottomCategories.length > 0 && (
        <section className="border-border border-t py-12">
          <div className="container mx-auto px-4 lg:px-6">
            <h2 className="inspire-display mb-8 text-center text-2xl">Ikut Kategori</h2>
            <div className="flex flex-wrap justify-center gap-2">
              {bottomCategories.map((cat) => (
                <Chip key={cat.id} variant="outline" asChild>
                  <Link href={`/artikel/${cat.slug}`}>{cat.name}</Link>
                </Chip>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
