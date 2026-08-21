import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { eq, desc, count, sql } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { articles, inspireCategories, articleCategories } from '@/lib/db/schema/articles';
import { ArticleCard } from '@/components/inspire/article-card';
import { getSmartCropUrl } from '@/lib/storage/smart-crop-url';
import { Chip } from '@/components/ui/chip';

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
 * Home = the article directory front door, per the Mobbin research:
 * hero featured article (Flipboard pattern) → horizontally scrolling category
 * chips (Pinterest pattern) → 2-column title-below-image card grid (Tasty
 * pattern). No save icons, no timestamps on cards, no onboarding gate —
 * content within one tap.
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

    // Top-level categories with articles, busiest first — these become the chips.
    const topCategories = categories
      .filter((c) => !c.parentId)
      .map((parent) => {
        const children = categories.filter((c) => c.parentId === parent.id);
        const total =
          parent.articleCount + children.reduce((sum, c) => sum + c.articleCount, 0);
        return { id: parent.id, name: parent.name, slug: parent.slug, articleCount: total };
      })
      .filter((c) => c.articleCount > 0)
      .sort((a, b) => b.articleCount - a.articleCount);

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
    <div className="inspire-editorial">
      <h1 className="sr-only">HelloKahwin — Idea &amp; Panduan Perkahwinan Malaysia</h1>

      <section className="container mx-auto px-4 py-4 lg:px-6 lg:py-8">
        {hero ? (
          <Link
            href={`/artikel/${hero.categorySlug}/${hero.slug}`}
            className="group rounded-card relative block min-h-[260px] overflow-hidden lg:min-h-[420px]"
          >
            <div className="bg-muted absolute inset-0">
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
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-muted-foreground text-sm">Tiada gambar</span>
                </div>
              )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute right-0 bottom-0 left-0 p-5 text-white lg:p-8">
              <span className="inspire-overline text-brand-secondary">{hero.categoryName}</span>
              <h2 className="mt-2 max-w-2xl text-2xl leading-tight text-white lg:text-3xl">
                {hero.title}
              </h2>
            </div>
          </Link>
        ) : (
          <div className="border-border rounded-card border border-dashed p-10 text-center">
            <p className="text-muted-foreground">
              Belum ada artikel. Kandungan akan datang tidak lama lagi — jumpa lagi!
            </p>
          </div>
        )}
      </section>

      {/* Category chips — horizontally scrolling, always visible, 44px targets. */}
      {topCategories.length > 0 && (
        <nav aria-label="Kategori" className="container mx-auto px-4 lg:px-6">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {topCategories.map((cat) => (
              <Chip
                key={cat.id}
                asChild
                variant="outline"
                className="min-h-[44px] shrink-0 items-center px-4 text-sm"
              >
                <Link href={`/artikel/${cat.slug}`}>{cat.name}</Link>
              </Chip>
            ))}
          </div>
        </nav>
      )}

      {/* Latest grid — 2 columns on mobile, title below image (Tasty pattern). */}
      {rest.length > 0 && (
        <section className="container mx-auto px-4 py-6 lg:px-6">
          <div className="flex items-center gap-4 pb-4">
            <h2 className="text-2xl whitespace-nowrap">Terkini</h2>
            <div className="bg-border h-px flex-1" />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-4 lg:gap-6">
            {rest.map((article) => (
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
              />
            ))}
          </div>
          <div className="pt-8 text-center">
            <Link
              href="/artikel"
              className="bg-primary text-primary-foreground inline-flex min-h-[44px] items-center rounded-full px-8 text-sm font-semibold"
            >
              Lihat Semua Artikel
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
