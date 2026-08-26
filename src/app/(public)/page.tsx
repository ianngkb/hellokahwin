import type { Metadata } from 'next';
import Link from 'next/link';
import { eq, desc } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { articles, inspireCategories } from '@/lib/db/schema/articles';
import { ArticleCard } from '@/components/inspire/article-card';
import { getSmartCropUrl } from '@/lib/storage/smart-crop-url';

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
    const latestArticles = await db
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
      .limit(13);

    return { latestArticles };
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
  const { latestArticles } = await getHomeData();
  const [hero, ...rest] = latestArticles;

  // --- Hero sources, art-directed ------------------------------------------
  // ONE crop per viewport, and only one is ever fetched (see the <picture>
  // below). Measured against this page's own hero box:
  //
  //   desktop box 1905x560 (w-full, lg:aspect-[21/9] capped by lg:max-h-[560px])
  //     crop-4x3-article-card   1600x1200 -> cover scales x1.191 (a 19% UPSCALE)
  //                                          and discards 60.8% of the frame
  //     crop-4.3x1-desktop-hero 2464x700  -> cover scales x0.800 (no upscale)
  //                                          and discards 3.4% of the frame
  //   mobile box 390x293 (aspect-[4/3])
  //     crop-4x3-article-card   1600x1200 -> exact ratio match, 0% discarded
  //     crop-4.3x1-desktop-hero 2464x700  -> discards 62.1% of the frame
  //
  // So the two presets are not ranked, they are per-breakpoint: the wide crop
  // is right for the wide box and wrong for the tall one, and the reverse. A
  // straight swap would have moved a 61% waste off the desktop and onto the
  // phone, which is where this site's traffic actually is. The desktop crop is
  // also the smaller file on the measured hero asset (623 KB vs 793 KB), which
  // matters because next.config.ts sets `images: { unoptimized: true }` — the
  // raw file IS what the browser downloads.
  const heroFallback = hero
    ? ((hero.coverImageVariants as Record<string, { url: string }> | null)?.high?.url ??
      hero.coverImageUrl)
    : null;
  const heroDesktopSrc =
    hero && heroFallback
      ? (getSmartCropUrl(hero.coverImageSmartCrops, 'crop-4.3x1-desktop-hero') ?? heroFallback)
      : null;
  const heroMobileSrc =
    hero && heroFallback
      ? (getSmartCropUrl(hero.coverImageSmartCrops, 'crop-4x3-article-card') ?? heroFallback)
      : null;

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
              <div
                className="bg-muted relative aspect-[4/3] w-full overflow-hidden bg-cover bg-center sm:aspect-[16/9] lg:aspect-[21/9] lg:max-h-[560px]"
                style={
                  // UX-04's blur placeholder, carried onto the container because
                  // next/image's placeholder="blur" cannot ride on a <picture>.
                  // Same effect and no JS: the stored LQIP is a ~190-byte WebP a
                  // few pixels wide, so cover-scaling it to 1905px IS the blur. It
                  // sits behind the <img>, so it is gone the moment the hero paints.
                  hero.coverImageLqip
                    ? { backgroundImage: `url(${hero.coverImageLqip})` }
                    : undefined
                }
              >
                {heroDesktopSrc && heroMobileSrc ? (
                  /* A plain <picture>, deliberately, not next/image.
                     next/image renders exactly one <img> and cannot carry a
                     <source media>, so art-directing with it takes two elements
                     — and the hidden one still downloads. That is not
                     theoretical: measured on production at 390x844, the article
                     route's two-block hero fetches BOTH crops and spends 748 KB
                     on a desktop plate the phone never displays. <picture> lets
                     the browser choose one and fetch one. Nothing is given up by
                     dropping next/image here: `images: { unoptimized: true }`
                     means it was never resizing these, and `fill` was only
                     supplying the absolute inset, which is one class. */
                  <picture>
                    <source media="(min-width: 1024px)" srcSet={heroDesktopSrc} />
                    <img
                      src={heroMobileSrc}
                      alt={hero.title}
                      fetchPriority="high"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                    />
                  </picture>
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

      {/* The homepage used to carry its own category rail here. It is gone on
          purpose. It was a SECOND navigation, built from a different query than
          the masthead's — article counts vs. the admin-managed
          `inspire_nav_items` — and the two disagreed. Measured on production
          2026-08-26 they shared only 6 of their links: the rail promoted 4
          child categories that were never pillars (`perancangan`,
          `gubahan-dulang-hantaran`, `mas-kahwin-ikut-negeri-panduan`,
          `nisbah-dulang-duit-hantaran`) and silently omitted 3 real ones
          (`busana-pengantin`, `pelamin-kad-cenderahati`,
          `sebelum-nikah`). Two rails within ~200px of each other, telling a
          reader two different stories about what this site contains. The
          masthead is the one navigation. Deleting this also takes a whole
          category query and its article-count subquery off the homepage. */}

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
