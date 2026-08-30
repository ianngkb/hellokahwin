import { Fragment } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { eq, desc, count, sql, inArray } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { articles, inspireCategories, articleCategories } from '@/lib/db/schema/articles';
import { media } from '@/lib/db/schema/media';
import { ArticleCard } from '@/components/inspire/article-card';
import { getSmartCropRef } from '@/lib/storage/smart-crop-url';
import { pickHeroIndex, resolveHeroCrops } from '@/lib/inspire/hero-frame';
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
          coverImageLqip: articles.coverImageLqip,
          publishedAt: articles.publishedAt,
          categoryName: inspireCategories.name,
          categorySlug: inspireCategories.slug,
          // UI-12 S4 / hero-rules R8(c) — the SOURCE photograph's shape, which
          // is what decides whether an article may hold the lead plate. Same
          // exact-match join the homepage uses (media.url == coverImageUrl).
          // Nullable `integer` columns: null means unknown, and unknown is NOT
          // eligible. Measured against production 31 Ogos 2026 — 60 of 86
          // articles populated, 26 null, and all 26 sit at ranks 58–86 by
          // recency, which this 12-row buffer never reaches.
          coverWidth: media.width,
          coverHeight: media.height,
        })
        .from(articles)
        .innerJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
        .leftJoin(media, eq(media.url, articles.coverImageUrl))
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
  // ⚠️ BUMPED BY UI-12 S4, AND IT IS NOT COSMETIC — the same trap the homepage
  // documents at `hk-home-v4`. This select gained `coverWidth`/`coverHeight`,
  // and the Vercel Data Cache persists an `unstable_cache` entry ACROSS
  // deployments: the key is the only thing that scopes it. Ship a wider query
  // under the old key and the first readers after deploy get the previously
  // cached rows, which carry no width or height; R8(c) then scores every
  // article ineligible and the lead plate silently degrades to the no-`<source>`
  // 40/21 band for up to 600s. Any future change to the SHAPE of this select
  // must bump this again.
  ['inspire-home-v2'],
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

  // ── UI-12 S4 — R8 ELIGIBILITY FOR THE LEAD PLATE ────────────────────────
  // This plate carries `priority` and is the first photograph a reader sees on
  // /artikel: a hero slot in every sense that matters, and
  // `docs/design/hero-image-rules.md` is binding on "every future full-bleed
  // hero slot". It was `latestArticles[0]` — recency order with no orientation
  // predicate, byte for byte the selection defect UI-03 found on the homepage
  // hero, in a second place.
  //
  // The predicate is `resolveHeroCrops` (R8b: both hero crops exist, with their
  // dimensions RECORDED — a crop whose width was never stored cannot state it)
  // AND `isHeroFrameEligible` (R8c: the SOURCE photograph retains ≥33% of its
  // height in a 3.520 box). Both come from `@/lib/inspire/hero-frame`, the same
  // definitions the homepage uses — not a second copy, which would be free to
  // drift while every check stayed green.
  //
  // ⚠️ R8(a) IS APPLIED HERE, AND IT WAS A RULING, NOT A DEFAULT.
  //
  // UI-12 S4 asks for "the first hero-frame-eligible article", which names
  // R8(c) and implies R8(b). R8(a) — the hand-curated class-G slug list — is an
  // EDITORIAL exclusion, so it was raised to the Creative Director rather than
  // decided by the builder. Measured on a local production-data build,
  // 31 Ogos 2026: without R8(a) this plate selected `persiapan-hantaran-kahwin`,
  // the single article that list exists to keep out of a large frame.
  //
  // The ruling, 31 Ogos 2026, made by rendering the 2463×700 crop at the plate's
  // painted 1232×350 and looking at it: apply R8(a). The failure R8(a) guards
  // against is ENLARGEMENT, and 1232×350 is a large frame by any reading, so the
  // reasoning transfers to this surface exactly. Half-inheriting R8 is how the
  // defect returns. All three gates, one definition, both surfaces.
  //
  // That review also found `hantaran-kahwin-bajet` failing the same way and NOT
  // on the list — see the note above `HERO_INELIGIBLE_SLUGS` in
  // `@/lib/inspire/hero-frame`, which is the more important half of this change.
  // THE SECTION FRONT DOES NOT LEAD WITH THE PHOTOGRAPH THE FRONT PAGE IS
  // LEADING WITH. `/artikel` is one click from `/` via "Lihat semua artikel";
  // an identical plate, same crop, same painted size, one click apart does not
  // read as art direction — it reads as a page that failed to load.
  //
  // Two calls, one definition. The first learns what the homepage is holding by
  // running the SAME selection over THIS page's list — deliberately not by
  // reading the homepage's query, because two queries independently computing
  // "the hero" is the defect the deleted homepage category rail is a monument
  // to. The second takes the next eligible article after it. Both lists are
  // `publishedAt desc` over published articles, so the first call names the
  // front page's pick without either page depending on the other; see the
  // warning on `pickHeroIndex` about what breaks if an ordering changes.
  //
  // This costs a reader arriving cold from search nothing: they get the next
  // article down, and this plate is an EDITORIAL slot that already skips
  // articles for three other reasons, not a chronological one.
  const frontPageIndex = pickHeroIndex(latestArticles);
  const leadIndex = pickHeroIndex(latestArticles, frontPageIndex + 1);
  const ordered =
    leadIndex > 0
      ? [latestArticles[leadIndex], ...latestArticles.filter((_, i) => i !== leadIndex)]
      : latestArticles;

  const featured = ordered.slice(0, 3);
  const latest = ordered.slice(3);

  // The two-band assets for the plate, resolved once. `leadCrops` is non-null
  // only when the article ACTUALLY passed R8 — `leadIndex >= 0` — so the
  // desktop `<source>` and the `lg:aspect-[88/25]` box appear together or not
  // at all, and a portrait source can never reach the 3.520 band.
  const leadArticle = featured[0] ?? null;
  const leadCrops =
    leadIndex >= 0 && leadArticle ? resolveHeroCrops(leadArticle.coverImageSmartCrops) : null;
  // R4/R6: the fallback `<img>`'s real intrinsic dimensions, read from the
  // stored crop rather than copied from `CROP_TARGETS` — a target is a CEILING
  // (`fit:'inside', withoutEnlargement:true`), so the delivered file is whatever
  // the crop window rounded to. Measured 1200 × 630 = 1.90476 across the corpus
  // today; nothing guarantees it stays uniform, which is why it is read.
  //
  // Resolved independently of `leadCrops` so the no-eligible-article path still
  // has a correctly-shaped band: 40/21 retains 35.0% even from the corpus's
  // worst source (0.667) and therefore needs no predicate of its own.
  const leadOg = leadArticle
    ? getSmartCropRef(leadArticle.coverImageSmartCrops, 'crop-16x9-og')
    : null;

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
                    {/* ── UI-12 S4 — the lead plate inherits UI-03 §3 ────────
                        R1: the box follows the asset, never the reverse. Two
                        bands, monotonic, each box aspect equal to the served
                        asset's intrinsic aspect — so deviation is ~0.0% rather
                        than merely inside R1's 15%:

                          <1024px  40/21 = 1.90476  ← crop-16x9-og  1200×630
                                                      = 1.90476 → 0.000%
                          ≥1024px  88/25 = 3.52000  ← crop-4.3x1-desktop-hero
                                                      2463×700 = 3.51857 → 0.041%

                        `aspect-[4/3] sm:aspect-[16/9] lg:aspect-[2.4/1]` is
                        gone. 2.4:1 matched NO derivative this pipeline
                        produces — `CROP_TARGETS` yields exactly 0.800, 1.333,
                        1.905 and 3.520 — so per R1 it was a box the site did
                        not have. It was fed `crop-4x3-article-card` (1.333):
                        33% off at 16/9 and 80% off at 2.4/1, three gate
                        failures. A third band would also make the plate shape
                        non-monotonic, so `sm:` goes as well.

                        Box widths and upscale, measured: 358 @390 (0.30×),
                        736 @768 (0.61×), 976 @1024 (0.40×), 1232 @1440
                        (0.50×). It never upscales.

                        BYTES: this is a saving. Mobile's LCP image moves from
                        `crop-4x3-article-card` (488–946 KB across all twelve
                        homepage covers) to `crop-16x9-og` (278–425 KB), and the
                        heavy desktop file sits behind
                        `<source media="(min-width: 1024px)">` so no phone ever
                        fetches it. The plate also shortens from 269px to 188px
                        at 390px wide, handing 81px back to the headline.

                        ⚠️ `lg:aspect-[88/25]` is the same number as
                        `HERO_ASPECT` in `@/lib/inspire/hero-frame`, which
                        derives the R8(c) threshold this plate is selected by.
                        Tailwind needs the literal here so they cannot share one
                        constant: change this and you MUST change that, or the
                        plate widens while the threshold stays put and portrait
                        sources creep back in with every check still green. */}
                    <div
                      className={
                        leadCrops
                          ? 'bg-muted relative aspect-[40/21] w-full overflow-hidden bg-cover bg-center lg:aspect-[88/25]'
                          : 'bg-muted relative aspect-[40/21] w-full overflow-hidden bg-cover bg-center'
                      }
                      style={
                        featured[0].coverImageLqip
                          ? { backgroundImage: `url(${featured[0].coverImageLqip})` }
                          : undefined
                      }
                    >
                      {leadOg ? (
                        <picture>
                          {/* R3: one crop per band, expressed as `<source
                              media>`. Never as a `srcset` width candidate —
                              these are two differently-shaped photographs, and
                              `srcset` chooses a SIZE. R4: the `w` descriptor is
                              the crop's REAL stored width, so it cannot be the
                              54% understatement UI-03 found.

                              Rendered only when the article passed R8: without
                              `leadCrops` the plate is the 40/21 band alone at
                              every width, which retains 35.0% even from the
                              corpus's worst source (0.667). Never degrade to a
                              portrait in a landscape box. */}
                          {leadCrops && (
                            <source
                              media="(min-width: 1024px)"
                              srcSet={`${leadCrops.desktop.url} ${leadCrops.desktop.width}w`}
                              sizes="100vw"
                            />
                          )}
                          {/* No eslint-disable needed: `@next/next/no-img-element`
                              does not fire on an `<img>` inside a `<picture>`,
                              which is the one thing next/image cannot express —
                              it has no art-direction API. `images.unoptimized`
                              is set in next.config.ts anyway, so next/image was
                              never resizing these.

                              `fetchPriority="high"` replaces the `priority` prop
                              this element lost with next/image. Same effect on
                              the LCP candidate, stated on the element the
                              browser actually fetches. The LQIP now paints as
                              the wrapper's `background-image` rather than
                              next/image's `placeholder="blur"`, because a plain
                              `<img>` has no blur API — same asset, same moment,
                              same mechanism the homepage hero already uses. */}
                          <img
                            src={leadOg.url}
                            srcSet={`${leadOg.url} ${leadOg.width}w`}
                            sizes="100vw"
                            alt={featured[0].title}
                            width={leadOg.width}
                            height={leadOg.height}
                            fetchPriority="high"
                            decoding="async"
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                          />
                        </picture>
                      ) : (
                        /* R2: `low`, `high` and `original` all preserve the
                           SOURCE aspect, so none of them may fill this plate at
                           any quality — an article with no recorded
                           `crop-16x9-og` gets the empty state, not a
                           wrongly-shaped photograph. Same rule the homepage hero
                           already enforces. */
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
                          lqip={article.coverImageLqip}
                          priority
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Search — sticky-adjacent, always visible (Mobbin: search + chips).
                  `id="cari"` is the masthead's search link target and is load-bearing:
                  the masthead on every page links to /artikel#cari. scroll-mt has to
                  clear the WHOLE sticky header — wordmark row plus category rail —
                  not just the wordmark row. Measured: 102px at 390px and 118px at
                  1400px, so 112px/128px leaves about 10px of air. Do not trim these
                  to the wordmark height; the anchor then lands under the rail. */}
              <div id="cari" className="mx-auto max-w-xl scroll-mt-28 py-4 lg:scroll-mt-32">
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
                          lqip={article.coverImageLqip}
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
