import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { ArticleCard } from '@/components/inspire/article-card';
import { Chip } from '@/components/ui/chip';
import { getSmartCropUrl } from '@/lib/storage/smart-crop-url';
import type { InspireHomepageArticle } from '@/lib/inspire/homepage-curation';
import { cn } from '@/lib/utils';

/**
 * The Wedding Notebook /inspire layout, shared by HelloKahwin's two curated
 * pages: the site homepage `/` and the `/artikel` hub. A 3-story featured mosaic
 * with headlines over the photograph, a "Terkini" card grid, and category pills
 * at the foot. Which stories fill it is decided by the curation for that page
 * (`/admin/inspire/homepage`); this component only draws what it is given.
 *
 * Moved verbatim from `/artikel/page.tsx` so the two pages cannot drift apart.
 */

export interface FeaturedHubCategory {
  id: string;
  name: string;
  slug: string;
}

export function formatTarikh(value: Date | string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString('ms-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function articleHref(article: InspireHomepageArticle) {
  return `/artikel/${article.categorySlug}/${article.slug}`;
}

function coverSrc(article: InspireHomepageArticle, variant: 'high' | 'low') {
  return (
    getSmartCropUrl(article.coverImageSmartCrops, 'crop-4x3-article-card') ??
    (article.coverImageVariants as Record<string, { url: string }> | null)?.[variant]?.url ??
    article.coverImageUrl
  );
}

function FeaturedTile({
  article,
  className,
  sizes,
  variant,
  priority = false,
  size,
}: {
  article: InspireHomepageArticle;
  className: string;
  sizes: string;
  variant: 'high' | 'low';
  priority?: boolean;
  size: 'lead' | 'side' | 'even';
}) {
  const date = formatTarikh(article.publishedAt);
  return (
    <Link
      href={articleHref(article)}
      className={cn('group rounded-card relative overflow-hidden', className)}
    >
      <div className="bg-muted absolute inset-0">
        {article.coverImageUrl ? (
          <Image
            src={coverSrc(article, variant)}
            alt={article.title}
            fill
            sizes={sizes}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            priority={priority}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-muted-foreground text-sm">Tiada gambar</span>
          </div>
        )}
      </div>
      {/* Deeper and longer than TWN's 70% scrim: the UI audit (17 Nov 2026)
          found white headlines set straight across faces on light photos. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
      <div
        className={cn(
          'absolute right-0 bottom-0 left-0 text-white',
          size === 'lead' ? 'p-6 lg:p-8' : size === 'side' ? 'p-5' : 'p-6',
        )}
      >
        <span className="inspire-overline on-photo">{article.categoryName}</span>
        <h2
          className={cn(
            'text-white',
            size === 'lead'
              ? 'mt-2 text-xl leading-tight lg:text-[1.75rem]'
              : size === 'side'
                ? 'mt-1.5 text-xl leading-snug lg:text-lg'
                : 'mt-2 text-xl leading-snug',
          )}
        >
          {article.title}
        </h2>
        {date && size !== 'even' && (
          <p className={cn('text-white/60', size === 'lead' ? 'mt-2 text-sm' : 'mt-1.5 text-xs')}>
            {date}
          </p>
        )}
      </div>
    </Link>
  );
}

export function FeaturedHub({
  featured,
  latest,
  categories,
  latestHeading = 'Terkini',
  latestGridClassName = 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  afterFeatured,
  afterLatest,
  emptyBody = 'Idea dan panduan perkahwinan akan datang tidak lama lagi.',
}: {
  featured: InspireHomepageArticle[];
  latest: InspireHomepageArticle[];
  /** Pills at the foot, already sorted. Empty hides the section. */
  categories: FeaturedHubCategory[];
  latestHeading?: string;
  latestGridClassName?: string;
  afterFeatured?: ReactNode;
  afterLatest?: ReactNode;
  emptyBody?: string;
}) {
  const hasArticles = featured.length + latest.length > 0;
  return (
    <>
      <section className="py-2 lg:py-6">
        <div className="container mx-auto px-4 lg:px-6">
          {hasArticles ? (
            <>
              {featured.length >= 3 ? (
                <div className="mb-1 grid grid-cols-1 gap-4 lg:mb-12 lg:grid-cols-[1.4fr_1fr] lg:grid-rows-2">
                  <FeaturedTile
                    article={featured[0]}
                    className="min-h-[240px] lg:row-span-2 lg:min-h-[480px]"
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    variant="high"
                    priority
                    size="lead"
                  />
                  {featured.slice(1, 3).map((article) => (
                    <FeaturedTile
                      key={article.id}
                      article={article}
                      className="min-h-[240px] lg:min-h-[230px]"
                      sizes="(max-width: 1024px) 100vw, 40vw"
                      variant="low"
                      size="side"
                    />
                  ))}
                </div>
              ) : (
                /* Fewer than 3 articles — simpler hero */
                <div className="mb-1 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mb-12">
                  {featured.map((article, index) => (
                    <FeaturedTile
                      key={article.id}
                      article={article}
                      className="min-h-[280px]"
                      sizes="(max-width: 640px) 100vw, 50vw"
                      variant="low"
                      priority={index === 0}
                      size="even"
                    />
                  ))}
                </div>
              )}

              {afterFeatured}

              {latest.length > 0 && (
                <>
                  <div className="flex items-center gap-4 py-3">
                    <h2 className="text-2xl whitespace-nowrap">{latestHeading}</h2>
                    <div className="bg-border h-px flex-1" />
                  </div>
                  <div className={cn('grid grid-cols-1 gap-6', latestGridClassName)}>
                    {latest.map((article) => (
                      <ArticleCard
                        key={article.id}
                        title={article.title}
                        slug={article.slug}
                        categorySlug={article.categorySlug ?? 'uncategorized'}
                        categories={article.categories ?? []}
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
                        publishedAt={
                          article.publishedAt ? new Date(article.publishedAt).toISOString() : null
                        }
                      />
                    ))}
                  </div>
                </>
              )}

              {afterLatest}
            </>
          ) : (
            <div className="py-20 text-center">
              <p className="text-lg font-medium">Belum ada artikel</p>
              <p className="text-muted-foreground mt-1 text-sm">{emptyBody}</p>
            </div>
          )}
        </div>
      </section>

      {categories.length > 0 && (
        <section className="border-border mt-6 border-t py-12">
          <div className="container mx-auto px-4 lg:px-6">
            <h2 className="inspire-display mb-8 text-center text-2xl">Teroka Ikut Kategori</h2>
            <div className="flex flex-wrap justify-center gap-2">
              {categories.map((cat) => (
                <Chip key={cat.id} variant="outline" asChild>
                  <Link href={`/artikel/${cat.slug}`}>{cat.name}</Link>
                </Chip>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

/**
 * TWN's pill rule, exactly: top-level categories, each counting its children's
 * and grandchildren's articles, sorted by that total, empty ones dropped.
 */
export function bottomCategoryPills(
  allCategories: ReadonlyArray<{
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
    articleCount: number;
  }>,
): FeaturedHubCategory[] {
  return allCategories
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
      return { id: parent.id, name: parent.name, slug: parent.slug, articleCount: totalCount };
    })
    .filter((c) => c.articleCount > 0)
    .sort((a, b) => b.articleCount - a.articleCount)
    .map(({ id, name, slug }) => ({ id, name, slug }));
}
