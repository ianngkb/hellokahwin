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
import { flattenCategoriesByArticleCount } from '@/lib/inspire/category-tree';
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

  // Bottom browse index: every category that actually has something to read,
  // counted with its full subtree, busiest first. Uncapped — unlike the home
  // rail, this is a full index rather than a one-swipe row. Restricting it to
  // top-level categories rendered a two-chip row against the imported
  // WordPress taxonomy, where nearly all the depth sits one level down.
  const bottomCategories = flattenCategoriesByArticleCount(allCategories);

  const featured = latestArticles.slice(0, 3);
  const latest = latestArticles.slice(3);

  return (
    <div>
      {/* The visible "Inspire · N articles" row was removed to lift the featured
          cover above the fold. Keep an sr-only h1 so this hub still has a
          top-level heading for the document outline and for SEO — without it the
          page would start at h2. */}
      <h1 className="sr-only">Artikel Perkahwinan HelloKahwin</h1>

      <section className="py-2 lg:py-6">
        <div className="container mx-auto px-4 lg:px-6">
          {latestArticles.length > 0 ? (
            <>
              {/* Featured — Editorial Monotone.
                  One lead plate, then two supporting stories. Every headline
                  sits BELOW its photograph: overlaying type on a wedding photo
                  fights the imagery and drops contrast on a cheap screen in
                  daylight, which is most of this audience. */}
              {featured.length > 0 && (
                <div className="mb-12 lg:mb-16">
                  <Link
                    href={`/artikel/${featured[0].categorySlug}/${featured[0].slug}`}
                    className="group block"
                  >
                    <div className="bg-muted relative aspect-[4/3] w-full overflow-hidden sm:aspect-[16/9] lg:aspect-[2.4/1]">
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
                          sizes="100vw"
                          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                          priority
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <span className="hk-meta">Tiada gambar</span>
                        </div>
                      )}
                    </div>
                    <div className="mx-auto max-w-3xl pt-6 text-center lg:pt-8">
                      <span className="hk-eyebrow">{featured[0].categoryName}</span>
                      <h2 className="hk-display mt-3 text-[1.625rem] sm:text-3xl lg:text-[2.5rem]">
                        <span className="decoration-border-strong underline-offset-[0.14em] group-hover:underline">
                          {featured[0].title}
                        </span>
                      </h2>
                    </div>
                  </Link>

                  {featured.length > 1 && (
                    <div className="border-border mt-12 grid grid-cols-1 gap-8 border-t pt-10 sm:grid-cols-2 lg:mt-16 lg:gap-12">
                      {featured.slice(1, 3).map((article) => (
                        <ArticleCard
                          key={article.id}
                          title={article.title}
                          slug={article.slug}
                          categorySlug={article.categorySlug ?? 'artikel'}
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
                          priority
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Search — sticky-adjacent, always visible (Mobbin: search + chips) */}
              <div className="mx-auto max-w-xl py-4">
                <InspireArticleSearch />
              </div>

              {/* Latest section */}
              {latest.length > 0 && (
                <>
                  <div className="hk-rule py-8">
                    <h2 className="hk-eyebrow whitespace-nowrap">Terkini</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-14">
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
            <div className="py-24 text-center">
              <h2 className="hk-display text-2xl">Belum ada artikel</h2>
              <p className="hk-deck mt-3">
                Idea dan panduan perkahwinan akan datang tidak lama lagi.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Browse by Category — pills sorted by article count */}
      {bottomCategories.length > 0 && (
        <section className="border-border mt-16 border-t py-14">
          <div className="container mx-auto px-4 lg:px-6">
            <div className="hk-rule pb-8">
              <h2 className="hk-eyebrow whitespace-nowrap">Ikut Kategori</h2>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {bottomCategories.map((cat) => (
                <Link key={cat.id} href={`/artikel/${cat.slug}`} className="hk-chip">
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
