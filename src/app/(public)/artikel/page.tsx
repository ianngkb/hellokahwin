import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { unstable_cache } from 'next/cache';
import { ArticleCard } from '@/components/inspire/article-card';
import { InspireArticleSearch } from '@/components/inspire/inspire-article-search';
import { Chip } from '@/components/ui/chip';
import { getSmartCropUrl } from '@/lib/storage/smart-crop-url';
import { flattenCategoriesByArticleCount } from '@/lib/inspire/category-tree';
import { getInspireHomepageResolvedData } from '@/lib/inspire/homepage-queries';
import { INSPIRE_HOMEPAGE_CACHE_TAG } from '@/lib/inspire/homepage-curation';

// ISR: getInspireHomeData() is unstable_cache-wrapped, but the page itself
// inherited dynamic rendering from the layout's currentUser() call (now removed).
// 30-min revalidate matches c1c91fc's baseline window for inspire pages.
export const revalidate = 1800;

export const metadata: Metadata = {
  // Brand omitted — root layout's title.template appends it once (was doubled).
  title: 'Artikel',
  description:
    'Idea, tips dan panduan perkahwinan untuk pasangan di Malaysia: perancangan dan bajet, hantaran, venue, busana, dan hari akad itu sendiri.',
  alternates: { canonical: '/artikel' },
  openGraph: {
    title: 'Artikel | HelloKahwin',
    description:
      'Idea, tips dan panduan perkahwinan untuk pasangan di Malaysia: perancangan dan bajet, hantaran, venue, busana, dan hari akad itu sendiri.',
    type: 'website',
    // The fourth tag Ahrefs requires, and the one this route was missing while
    // the homepage and the category hubs were being fixed. Relative on purpose:
    // `metadataBase` in the root layout resolves it, and it matches the
    // `alternates.canonical` above rather than restating a host.
    url: '/artikel',
    images: [{ url: '/hellokahwin-logo.png', width: 886, height: 290, alt: 'HelloKahwin' }],
  },
  twitter: {
    card: 'summary',
    title: 'Artikel | HelloKahwin',
    description:
      'Idea, tips dan panduan perkahwinan untuk pasangan di Malaysia: perancangan dan bajet, hantaran, venue, busana, dan hari akad itu sendiri.',
    images: ['/hellokahwin-logo.png'],
  },
};

// Layout ported from The Wedding Notebook's /inspire (Nov 2026): a 3-story
// featured grid with overlaid headlines, a "Terkini" grid, and category pills
// at the foot. What leads the page is now curated at /admin/inspire/homepage
// (pins + newest-or-category auto-fill, stored in `admin_settings`); with
// nothing saved it is simply the newest articles with a cover.
//
// ⚠️ The cache key is NOT cosmetic. The Vercel Data Cache persists an
// `unstable_cache` entry ACROSS deployments and the key is the only thing that
// scopes it. The returned shape changed completely from `inspire-home-v2`
// (flat `latestArticles` → `resolution`), so reusing the old key would hand
// the first readers after deploy an object this page cannot read. Bump it
// again whenever the shape of `getInspireHomepageResolvedData()` changes.
const getInspireHomeData = unstable_cache(getInspireHomepageResolvedData, ['artikel-home-v3'], {
  revalidate: 600,
  // `revalidatePath('/artikel')` does not evict an `unstable_cache` entry —
  // only a tag does. The curation save purges INSPIRE_HOMEPAGE_CACHE_TAG.
  tags: [INSPIRE_HOMEPAGE_CACHE_TAG, 'articles', 'inspire-categories'],
});

function formatTarikh(value: Date | string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString('ms-MY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function InspireHomePage() {
  const { resolution, allCategories } = await getInspireHomeData();
  const featured = resolution.featured.map(({ article }) => article);
  const latest = resolution.latest.map(({ article }) => article);
  const resolvedArticles = [...featured, ...latest];

  // Bottom browse index: every category that actually has something to read,
  // counted with its full subtree, busiest first. twn lists top-level
  // categories only; that rendered a two-chip row against HelloKahwin's
  // imported WordPress taxonomy, where nearly all the depth sits one level
  // down, so the flattening stays while the markup follows twn.
  const bottomCategories = flattenCategoriesByArticleCount(allCategories);

  return (
    <div className="inspire-editorial">
      {/* The visible "Artikel · N artikel" row was removed to lift the featured
          cover above the fold. Keep an sr-only h1 so this hub still has a
          top-level heading for the document outline and for SEO — without it the
          page would start at h2. */}
      <h1 className="sr-only">Artikel Perkahwinan HelloKahwin</h1>

      <section className="py-2 lg:py-6">
        <div className="container mx-auto px-4 lg:px-6">
          {resolvedArticles.length > 0 ? (
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
                          {formatTarikh(featured[0].publishedAt)}
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
                            {formatTarikh(article.publishedAt)}
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

              {/* Search — sits where twn places its above-grid banner (banners
                  are out of scope here). `id="cari"` is load-bearing: the
                  masthead on every page links to /artikel#cari, and this is the
                  site's only search surface. scroll-mt clears the whole sticky
                  header — wordmark row plus category rail. */}
              <div id="cari" className="mx-auto max-w-xl scroll-mt-28 py-4 lg:scroll-mt-32">
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
        <section className="border-border mt-6 border-t py-12">
          <div className="container mx-auto px-4 lg:px-6">
            <h2 className="inspire-display mb-8 text-center text-2xl">Teroka Ikut Kategori</h2>
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
