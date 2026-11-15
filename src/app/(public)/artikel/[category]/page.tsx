import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq, ne, desc, and, inArray, sql } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { withDeadline } from '@/lib/api/timeout';
import { readForCacheablePage } from '@/lib/cache/degraded-render';
import { categoryRenderBudget } from '@/lib/inspire/category-render-budget';
import { articles, inspireCategories, articleCategories } from '@/lib/db/schema/articles';
import { media } from '@/lib/db/schema/media';
import { Pagination } from '@/components/ui/pagination';
import { Breadcrumbs, BreadcrumbJsonLd } from '@/components/common/breadcrumbs';
import { PillarBody } from '@/components/inspire/pillar-body';
import { getPillarView } from '@/lib/inspire/pillar-queries';
import { tagEdgeResponse } from '@/lib/cache/edge-tag';
import { categoryOwnsPublishedArticles } from '@/lib/inspire/category-indexability';
import { categoryRobots, ROBOTS_ON_DEADLINE_MISS } from '@/lib/seo/category-robots';
import { collectionItemList, type CollectionListItem } from '@/lib/seo/collection-jsonld';
import { ArticleCard } from '@/components/inspire/article-card';

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
          coverImageLqip: articles.coverImageLqip,
          publishedAt: articles.publishedAt,
          categoryName: inspireCategories.name,
          categorySlug: inspireCategories.slug,
          // DES-08 / spec §1.2's fifth device, the leading card's credit —
          // same exact-match join the article route relies on.
          coverCredit: media.credit,
          coverCreditUrl: media.creditUrl,
        })
        .from(articles)
        .innerJoin(matchingIds, eq(articles.id, matchingIds.id))
        .leftJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
        .leftJoin(media, eq(media.url, articles.coverImageUrl))
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
  ['inspire-category-articles-v2'],
  { tags: ['articles', 'inspire-categories'], revalidate: false },
);

export async function generateMetadata({
  params,
  searchParams,
}: CategoryPageProps): Promise<Metadata> {
  const { category: categorySlug } = await params;
  // ONE shared budget for the whole render. `generateMetadata` and the page
  // component run CONCURRENTLY (see `@/lib/inspire/category-render-budget`),
  // so both chains draw down the same clock and the render as a whole stays
  // inside `maxDuration` instead of each read separately promising not to
  // exceed a third of it.
  const budgetLeft = categoryRenderBudget();
  let cat;
  try {
    cat = await withDeadline(
      getCategoryBySlugCached(categorySlug),
      budgetLeft(),
      `inspire-category-meta:${categorySlug}`,
    );
  } catch {
    // NOT `{}`. Next merges by walking the returned object's own keys, so an
    // empty object contributes no Open Graph at all and the hub ships with none
    // of og:title / og:type / og:image / og:url — the exact defect this run is
    // closing, re-created by the error path. Everything below is knowable
    // WITHOUT the category row: the slug is a route parameter.
    return {
      openGraph: {
        title: 'Artikel | HelloKahwin',
        type: 'website',
        url: `/artikel/${categorySlug}`,
        images: [{ url: '/hellokahwin-logo.png', width: 886, height: 290, alt: 'HelloKahwin' }],
      },
      robots: ROBOTS_ON_DEADLINE_MISS,
    };
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
    // Explicit `index, follow` rather than an absent tag. Same meaning to
    // Google; a different meaning to us. `generateMetadata` also returns `{}`
    // when the category lookup blows its deadline, so "no robots meta" used to
    // be indistinguishable from "metadata render failed" on the wire — and
    // RISK-07 is precisely a robots state nobody could read off the live HTML.
    // Every branch below that wants something else overrides this key.
    robots: ROBOTS_ON_DEADLINE_MISS,
    openGraph: {
      title: `${cat.name} | Artikel | HelloKahwin`,
      description,
      // Ahrefs requires all four of og:title, og:type, og:image and og:url;
      // this route was serving two of them. `url` stays relative — the root
      // layout's `metadataBase` resolves it — so the `?sub=` and paginated
      // variants all point at the same canonical hub the `alternates` key does.
      type: 'website',
      url: `/artikel/${categorySlug}`,
      images: [{ url: '/hellokahwin-logo.png', width: 886, height: 290, alt: 'HelloKahwin' }],
    },
    twitter: {
      card: 'summary',
      title: `${cat.name} | Artikel | HelloKahwin`,
      description,
      images: ['/hellokahwin-logo.png'],
    },
  };

  // Child/grandchild category hubs are USUALLY reached in-app only via the
  // parent's `?sub=` form (which canonicalises to the parent), which makes
  // their standalone /artikel/{childSlug} URL an orphaned duplicate of the
  // parent view — noindex,follow so signals consolidate onto the parent hub
  // while crawlers still follow the article links here.
  //
  // THE EXCEPTION, and it is not a small one. A child category that is the
  // PRIMARY category of a published article has its slug baked into that
  // article's canonical URL: /artikel/hiasan-dekorasi/hantaran-kahwin. It is
  // not an orphan; it is the folder every one of those articles lives in.
  // Measured on production 23 Aug 2026, six such hubs were serving 200 while
  // telling Google not to index them — hiasan-dekorasi, moden-kontemporari,
  // fotografi-videografi, glamor-eksklusif, minimalis-mewah and pantai-santai.
  // See lib/inspire/category-indexability.ts.
  if (cat.parentId) {
    // FAIL OPEN on a timeout. `revalidate: false` means whatever this returns
    // is cached indefinitely, so a transient DB blip during one render would
    // otherwise pin `noindex` on a hub that owns live article URLs — the exact
    // defect this whole block exists to fix, re-created by its own error path.
    // An over-indexed thin hub is recoverable; a stuck noindex is the thing
    // that costs rankings.
    let ownsArticles = true;
    try {
      ownsArticles = await withDeadline(
        categoryOwnsPublishedArticles(cat.id),
        budgetLeft(),
        `inspire-category-owns:${categorySlug}`,
      );
    } catch {
      // Left as `true` — see above.
    }
    return {
      ...baseMeta,
      robots: categoryRobots({ view: 'child-hub', ownsPublishedArticles: ownsArticles }),
    };
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
      budgetLeft(),
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
        budgetLeft(),
        `inspire-category-base-articles-meta:${categorySlug}`,
      );
      return {
        ...baseMeta,
        robots: categoryRobots({ view: 'base-hub', subtreeArticleCount: Number(total) }),
      };
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
    return { ...baseMeta, robots: categoryRobots({ view: 'invalid-sub' }) };
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
      budgetLeft(),
      `inspire-category-sub-articles-meta:${categorySlug}`,
    );
    return {
      ...baseMeta,
      robots: categoryRobots({ view: 'valid-sub', subtreeArticleCount: Number(total) }),
    };
  } catch {
    // Couldn't determine count within deadline — default to indexable.
  }

  return baseMeta;
}

type CategoryRow = NonNullable<Awaited<ReturnType<typeof getCategoryBySlugCached>>>;

/**
 * The pillar layout. Separate function, same route — see the call site.
 *
 * PLAT-16: the pillar view is NOT soft-failed. It used to be — a blown
 * deadline left `view` at `{ clusters: [], … }` and the page rendered UI-05's
 * "Panduan ini masih kosong" empty state with HTTP 200, which is both a lie to
 * the reader and a cacheable one. See `@/lib/cache/degraded-render` for the
 * full reasoning and for why "a short revalidate window on the degraded path"
 * is not a lever a server component holds.
 */
async function renderPillarPage(
  category: CategoryRow,
  categorySlug: string,
  budgetLeft: () => number,
) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hellokahwin.com';

  const view = await readForCacheablePage(
    getPillarView(category.id),
    budgetLeft(),
    `inspire-pillar:${categorySlug}`,
  );

  const breadcrumbItems = [
    { label: 'Utama', href: '/' },
    { label: 'Artikel', href: '/artikel' },
    { label: category.name },
  ];

  // Every article the pillar renders, in document order, once each. An article
  // linked to two clusters is rendered twice on the page but is ONE item of the
  // collection, which is what `view.totalArticles` already counts — so the list
  // is deduplicated by id to keep `numberOfItems` and `itemListElement` telling
  // the same story.
  const seenArticleIds = new Set<string>();
  const pillarItems: CollectionListItem[] = [];
  for (const article of [...view.clusters.flatMap((c) => c.articles), ...view.unclustered]) {
    if (seenArticleIds.has(article.id)) continue;
    seenArticleIds.add(article.id);
    pillarItems.push({
      name: article.title,
      url: `${baseUrl}/artikel/${article.categorySlug}/${article.slug}`,
    });
  }

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
            description: category.description ?? `Artikel ${category.name} di HelloKahwin.`,
            url: `${baseUrl}/artikel/${categorySlug}`,
            // `numberOfItems` belongs to ItemList, NOT to CollectionPage —
            // emitting it here directly is what failed schema.org validation on
            // 183 URLs (Ahrefs crawl 2026-08-28). `@/lib/seo/collection-jsonld`
            // carries the whole diagnosis.
            mainEntity: collectionItemList(view.totalArticles, pillarItems),
            // The clusters, declared as parts of the pillar. This is the
            // machine-readable half of the same statement the headings make:
            // these sub-topics belong to this entity.
            hasPart: view.clusters.map((cluster) => ({
              '@type': 'CollectionPage',
              name: cluster.name,
              url: `${baseUrl}/artikel/${categorySlug}#cluster-${cluster.id}`,
            })),
            provider: { '@type': 'Organization', name: 'HelloKahwin' },
          }).replace(/</g, '\\u003c'),
        }}
      />
      <Breadcrumbs items={breadcrumbItems} />

      <div className="inspire-editorial">
        <div className="mb-8">
          <span className="inspire-overline text-brand-secondary">Panduan</span>
          <h1 className="inspire-display mt-2 text-3xl">{category.name}</h1>
        </div>

        {/* PillarBody's own h2-per-cluster outline: the pillar hubs go
            h1 h2 h2 … (DES-09 §3.2). */}
        <PillarBody view={view} intro={category.intro} />
      </div>
    </div>
  );
}

export default async function InspireCategoryPage({ params, searchParams }: CategoryPageProps) {
  const { category: categorySlug } = await params;
  const sp = await searchParams;

  // Make this page's CDN entry deletable by name. The `Vercel-CDN-Cache-Control`
  // in next.config.ts keeps a copy of this HTML at the edge for five minutes,
  // which is five minutes in which a freshly ingested article is missing from
  // its own pillar and the hub still says `noindex`. Tagging it lets ingest
  // delete exactly this page. Stamped before the reads below because the tag
  // belongs to the response either way — including the `notFound()` path, whose
  // 404 is cacheable too. See `@/lib/cache/edge-tag`.
  await tagEdgeResponse(`/artikel/${categorySlug}`);

  // The same shared clock `generateMetadata` is drawing on — see
  // `@/lib/inspire/category-render-budget`.
  const budgetLeft = categoryRenderBudget();

  const category = await withDeadline(
    getCategoryBySlugCached(categorySlug),
    budgetLeft(),
    `inspire-category:${categorySlug}`,
  );
  if (!category) notFound();

  // A PILLAR renders as the map of its pillar — every cluster, and every
  // article under each cluster — instead of a flat reverse-chronological grid.
  // It stays on this route rather than becoming seven static pages so that
  // pillars remain ordinary categories: same breadcrumbs, same sitemap logic,
  // same admin category picker, and one code path instead of two that drift.
  if (category.isPillar) {
    return renderPillarPage(category, categorySlug, budgetLeft);
  }

  // Children + grandchildren — shared cache with generateMetadata.
  //
  // PLAT-16: this read had NO deadline at all, which made the grid path's
  // worst case unbounded rather than 6s — a stall on `inspire_categories`
  // (as opposed to `articles`) hung the render with no error, no label and no
  // log until the platform killed it. It is also a CONTENT read: its result
  // decides `categoryIds`, so a soft-failed one would silently narrow the
  // article set and render a smaller category as if it were the whole thing.
  const { children, grandchildren } = await readForCacheablePage(
    getCategoryHierarchyCached(category.id),
    budgetLeft(),
    `inspire-category-hierarchy:${categorySlug}`,
  );

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

  // PLAT-16: NOT soft-failed, for the same reason the pillar above is not.
  // This one carried the identical exposure — a blown deadline rendered the
  // grid's empty state at HTTP 200 with `numberOfItems: 0` in the
  // CollectionPage JSON-LD, on a hub `generateMetadata` had just failed OPEN
  // to `index, follow`. `@/lib/cache/degraded-render` carries the argument.
  const { data, total } = await readForCacheablePage(
    getCategoryArticles(categoryIds, page, perPage),
    budgetLeft(),
    `inspire-category-articles:${categorySlug}`,
  );

  const totalPages = Math.ceil(total / perPage);

  const breadcrumbItems = [
    { label: 'Utama', href: '/' },
    { label: 'Artikel', href: '/artikel' },
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

  // The chip row, as on The Wedding Notebook: "Semua" plus one chip per
  // sub-category, active chip filled. Every chip is a real crawlable `?sub=`
  // link (DES-09 E1's anchor-only rule), with `aria-current="page"` on the one
  // the reader is standing on.
  const chipClass = (active: boolean, size: 'lg' | 'sm') =>
    `rounded-full border ${
      size === 'lg' ? 'px-4 py-1.5 text-xs' : 'px-3 py-1 text-[11px]'
    } font-medium tracking-wider uppercase transition-colors ${
      active
        ? 'bg-foreground text-background border-foreground'
        : 'text-muted-foreground hover:text-foreground hover:border-foreground'
    }`;
  const childGrandchildren = activeChild
    ? grandchildren.filter((g) => g.parentId === activeChild!.id)
    : [];

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
            description: category.description ?? `Artikel ${category.name} di HelloKahwin.`,
            url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://hellokahwin.com'}/artikel/${categorySlug}`,
            // See the pillar view above, and `@/lib/seo/collection-jsonld`:
            // `numberOfItems` is an ItemList property and was invalid here.
            // `position` continues across pages, so page 2's first card is not
            // also described as item 1 of the collection.
            mainEntity: collectionItemList(
              Number(total),
              data.map((article) => ({
                name: article.title,
                url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://hellokahwin.com'}/artikel/${article.categorySlug ?? categorySlug}/${article.slug}`,
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
      <Breadcrumbs items={breadcrumbItems} />

      <div className="inspire-editorial">
        {/* h1 = the category name, exactly one — spec §9.1. */}
        <div className="mb-8">
          <h1 className="inspire-display text-3xl">{category.name}</h1>
          {category.description && (
            <p className="text-muted-foreground mt-2">{category.description}</p>
          )}
        </div>

        {/* Sub-category chips */}
        {children.length > 0 && (
          <div className="mb-8 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/artikel/${categorySlug}`}
                aria-current={!sp.sub ? 'page' : undefined}
                className={chipClass(!sp.sub, 'lg')}
                style={{ fontFamily: 'var(--font-geist)' }}
              >
                Semua
              </Link>
              {children.map((child) => {
                const isActive = activeChild?.id === child.id;
                return (
                  <Link
                    key={child.id}
                    href={`/artikel/${categorySlug}?sub=${child.slug}`}
                    aria-current={isActive ? 'page' : undefined}
                    className={chipClass(isActive, 'lg')}
                    style={{ fontFamily: 'var(--font-geist)' }}
                  >
                    {child.name}
                  </Link>
                );
              })}
            </div>
            {/* One level down: the active child's own sections. */}
            {activeChild && childGrandchildren.length > 0 && (
              <div className="flex flex-wrap gap-2 pl-2">
                <Link
                  href={`/artikel/${categorySlug}?sub=${activeChild.slug}`}
                  aria-current={!activeGrandchild ? 'page' : undefined}
                  className={chipClass(!activeGrandchild, 'sm')}
                  style={{ fontFamily: 'var(--font-geist)' }}
                >
                  Semua {activeChild.name}
                </Link>
                {childGrandchildren.map((gc) => {
                  const isActive = activeGrandchild?.id === gc.id;
                  return (
                    <Link
                      key={gc.id}
                      href={`/artikel/${categorySlug}?sub=${gc.slug}`}
                      aria-current={isActive ? 'page' : undefined}
                      className={chipClass(isActive, 'sm')}
                      style={{ fontFamily: 'var(--font-geist)' }}
                    >
                      {gc.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Article grid */}
        {data.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.map((article, index) => (
                <ArticleCard
                  key={article.id}
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
                  publishedAt={
                    article.publishedAt ? new Date(article.publishedAt).toISOString() : null
                  }
                  lqip={article.coverImageLqip}
                  priority={index < 2}
                />
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
            <p className="text-lg font-medium">Kategori ini masih kosong.</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Belum ada artikel {category.name} diterbitkan.{' '}
              <Link href="/artikel" className="hover:text-foreground underline underline-offset-2">
                Lihat semua artikel
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
