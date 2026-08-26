import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { eq, desc, count, sql } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { articles, inspireCategories, articleCategories } from '@/lib/db/schema/articles';
import { ArticleCard } from '@/components/inspire/article-card';
import { getSmartCropUrl } from '@/lib/storage/smart-crop-url';
import { flattenCategoriesByArticleCount } from '@/lib/inspire/category-tree';

// ISR — same cadence as the artikel hub.
export const revalidate = 1800;

export const metadata: Metadata = {
  title: 'HelloKahwin — Idea & Panduan Perkahwinan Malaysia',
  description:
    'Idea, tips dan panduan perkahwinan untuk pasangan Malaysia. Rancang majlis impian anda mengikut bajet — semuanya dalam Bahasa Melayu.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'HelloKahwin — Idea & Panduan Perkahwinan Malaysia',
    description:
      'Idea, tips dan panduan perkahwinan untuk pasangan Malaysia. Rancang majlis impian anda mengikut bajet.',
    type: 'website',
  },
};

/**
 * Home = the article directory front door.
 *
 * Editorial Monotone layout (Mobbin 2026-08-22 — Julienne, UNIQLO LifeWear,
 * NYTimes): a single full-bleed lead plate with the headline set BELOW the
 * image (never over it), a hairline-flat category rail, then the two-column
 * title-below-image grid. No save icons, no timestamps on cards, no onboarding
 * gate — content within one tap.
 */
const getHomeData = unstable_cache(
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

    const [latestArticles, categories] = await Promise.all([
      db
        .select({
          id: articles.id,
          title: articles.title,
          slug: articles.slug,
          excerpt: articles.excerpt,
          coverImageUrl: articles.coverImageUrl,
          coverImageVariants: articles.coverImageVariants,
          coverImageSmartCrops: articles.coverImageSmartCrops,
          coverImageLqip: articles.coverImageLqip,
          publishedAt: articles.publishedAt,
          categoryName: inspireCategories.name,
          categorySlug: inspireCategories.slug,
        })
        .from(articles)
        .innerJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
        .where(eq(articles.status, 'published'))
        .orderBy(desc(articles.publishedAt))
        .limit(13),
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

    // The rail is a browse affordance, not a taxonomy view: every category
    // that actually has something to read, counted with its full subtree,
    // busiest first — capped at ten so it stays a swipe rather than a scroll.
    // Listing only top-level categories left a two-chip rail on the imported
    // WordPress taxonomy, where almost all the depth lives one level down.
    // `/artikel`'s bottom index shares the helper and differs only in having
    // no cap, because that section is a full browse index.
    const topCategories = flattenCategoriesByArticleCount(categories).slice(0, 10);

    return { latestArticles, topCategories };
  },
  ['hk-home'],
  // Tagged, not just time-boxed: every admin write path and the scheduled-
  // publish cron fire `revalidateTag('articles')`. `revalidatePath` does NOT
  // invalidate an `unstable_cache` entry, so without these tags a publish (or
  // an unpublish of content that must come down) would sit in the front-door
  // hero for up to 10 minutes while every other page updated instantly.
  { tags: ['articles', 'inspire-categories'], revalidate: 600 },
);

export default async function HomePage() {
  const { latestArticles, topCategories } = await getHomeData();
  const [hero, ...rest] = latestArticles;

  return (
    <div>
      <h1 className="sr-only">HelloKahwin — Idea &amp; Panduan Perkahwinan Malaysia</h1>

      {/* --- Lead story ---------------------------------------------------
          Full-bleed plate, headline below the image. Text is never set over
          the photograph: it keeps the wedding imagery intact and keeps the
          headline legible on a cheap screen in daylight. */}
      <section className="pt-6 lg:pt-10">
        {hero ? (
          <article>
            <Link href={`/artikel/${hero.categorySlug}/${hero.slug}`} className="group block">
              <div className="bg-muted relative aspect-[4/3] w-full overflow-hidden sm:aspect-[16/9] lg:aspect-[21/9] lg:max-h-[560px]">
                {hero.coverImageUrl ? (
                  <Image
                    src={
                      getSmartCropUrl(hero.coverImageSmartCrops, 'crop-4x3-article-card') ??
                      (hero.coverImageVariants as Record<string, { url: string }> | null)?.high
                        ?.url ??
                      hero.coverImageUrl
                    }
                    alt={hero.title}
                    fill
                    sizes="100vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                    priority
                    {...(hero.coverImageLqip
                      ? { placeholder: 'blur' as const, blurDataURL: hero.coverImageLqip }
                      : {})}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="hk-meta">Tiada gambar</span>
                  </div>
                )}
              </div>

              <div className="mx-auto max-w-3xl px-4 pt-6 text-center lg:pt-10">
                <span className="hk-eyebrow">{hero.categoryName}</span>
                <h2 className="hk-display mt-3 text-[1.75rem] sm:text-4xl lg:text-[3rem]">
                  <span className="decoration-border-strong underline-offset-[0.14em] group-hover:underline">
                    {hero.title}
                  </span>
                </h2>
                {hero.excerpt && <p className="hk-deck mt-4 line-clamp-3">{hero.excerpt}</p>}
              </div>
            </Link>
          </article>
        ) : (
          <div className="border-border mx-4 border border-dashed p-12 text-center">
            <p className="hk-deck">
              Belum ada artikel. Kandungan akan datang tidak lama lagi — jumpa lagi!
            </p>
          </div>
        )}
      </section>

      {/* --- Category rail — flat chips, 44px targets, horizontal scroll --- */}
      {topCategories.length > 0 && (
        <nav aria-label="Kategori" className="border-border mt-10 border-y lg:mt-14">
          <div className="mx-auto max-w-6xl">
            <div className="flex gap-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {topCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/artikel/${cat.slug}`}
                  className="hk-chip shrink-0 border-y-0 border-l-0 last:border-r-0"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      )}

      {/* --- Latest grid --------------------------------------------------- */}
      {rest.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-10 lg:px-6 lg:pt-16">
          <div className="hk-rule pb-8">
            <h2 className="hk-eyebrow whitespace-nowrap">Terkini</h2>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-14">
            {rest.map((article, i) => (
              <ArticleCard
                key={article.id}
                title={article.title}
                slug={article.slug}
                categorySlug={article.categorySlug ?? 'artikel'}
                categories={
                  article.categoryName && article.categorySlug
                    ? [{ name: article.categoryName, slug: article.categorySlug }]
                    : []
                }
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
                priority={i < 2}
                lqip={article.coverImageLqip}
              />
            ))}
          </div>
          <div className="pt-12 text-center lg:pt-16">
            <Link href="/artikel" className="hk-btn-ghost">
              Lihat Semua Artikel
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
