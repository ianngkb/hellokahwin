import { Fragment } from 'react';
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
import {
  resolveCoverSource,
  resolveRowThumbSource,
  type CoverVariants,
} from '@/lib/storage/responsive-cover';
import { EmptyCategoryState } from '@/design-system/components';
import '@/design-system/tokens.css';
import '@/design-system/components.css';

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
    return {};
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
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hellokahwin.com';

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

  return (
    <div className="hk s-pad mx-auto max-w-6xl py-8">
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
            numberOfItems: view.totalArticles,
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

      <header className="mx-auto max-w-3xl pt-4 pb-10 text-center">
        <span className="s-label" style={{ color: 'var(--accent)' }}>
          Panduan
        </span>
        <h1 className="s-h1 mx-auto mt-3">{category.name}</h1>
      </header>

      {/* PillarBody's own h2-per-cluster outline is already correct (DES-09
          §3.2: the seven pillar hubs go h1 h2 h2 …, unlike the eight
          non-pillar categories fixed below) — left untouched. */}
      <PillarBody view={view} intro={category.intro} />
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

  // The first item of the set is a Card (full-width figure + heading), the
  // rest are ListRows — spec §5.2: twelve full-width cards runs ~4,000px of
  // scroll, twelve rows ~1,150px. Card only on page 1 — pages 2+ are all rows,
  // matching the spec's "index · title · thumbnail" desktop drawing.
  const [firstArticle, ...restArticles] = data;
  const leadIsCard = page === 1 && Boolean(firstArticle);

  return (
    <div className="hk s-pad mx-auto max-w-6xl py-8">
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: category.name,
            description: category.description ?? `Artikel ${category.name} di HelloKahwin.`,
            url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hellokahwin.com'}/artikel/${categorySlug}`,
            numberOfItems: Number(total),
            provider: {
              '@type': 'Organization',
              name: 'HelloKahwin',
            },
          }).replace(/</g, '\\u003c'),
        }}
      />
      <Breadcrumbs items={breadcrumbItems} />

      <div className="mx-auto max-w-3xl">
        {/* h1 = the category name, exactly one — spec §9.1. The article count
            + "Disemak" (checked) fields are the record §7.1's "category counts
            available at render time" build dependency asks for; `total` is
            already computed above for pagination, so this is free. */}
        <header>
          <span className="s-label" style={{ color: 'var(--accent)' }}>
            Kategori
          </span>
          <h1 className="s-h1 mt-3">{category.name}</h1>
          {category.description && <p className="s-deck mt-4">{category.description}</p>}
        </header>
        <div
          style={{
            display: 'flex',
            gap: 28,
            borderTop: '2px solid var(--fg)',
            marginTop: 18,
            paddingTop: 12,
          }}
        >
          <div>
            <div className="s-label" style={{ color: 'var(--fg-muted)', marginBottom: 5 }}>
              Artikel
            </div>
            <div className="s-val" style={{ fontSize: 17 }}>
              {total}
            </div>
          </div>
        </div>

        {/* Subcategory filter chips — real <a> navigation, not a JS toggle:
            `?sub=` is a real crawlable URL, per DES-09 E1's anchor-only rule.
            `.s-chip`'s [aria-pressed] fill is for the standalone Chip button;
            here the active state is `aria-current="page"` (the correct ARIA
            role for "the page I'm already on"), styled the same way. */}
        {children.length > 0 && (
          <div className="s-chiprow" style={{ marginTop: 20 }}>
            <Link
              href={`/artikel/${categorySlug}`}
              className="s-chip"
              aria-current={!sp.sub ? 'page' : undefined}
              style={
                !sp.sub
                  ? { background: 'var(--fg)', color: 'var(--bg)', borderColor: 'var(--fg)' }
                  : undefined
              }
            >
              Semua
            </Link>
            {children.map((child) => {
              const isActive = activeChild?.id === child.id;
              return (
                <Link
                  key={child.id}
                  href={`/artikel/${categorySlug}?sub=${child.slug}`}
                  className="s-chip"
                  aria-current={isActive ? 'page' : undefined}
                  style={
                    isActive
                      ? { background: 'var(--fg)', color: 'var(--bg)', borderColor: 'var(--fg)' }
                      : undefined
                  }
                >
                  {child.name}
                </Link>
              );
            })}
          </div>
        )}
        {activeChild &&
          (() => {
            const childGrandchildren = grandchildren.filter((g) => g.parentId === activeChild!.id);
            if (childGrandchildren.length === 0) return null;
            return (
              <div className="s-chiprow" style={{ marginTop: 8, paddingLeft: 8 }}>
                <Link
                  href={`/artikel/${categorySlug}?sub=${activeChild.slug}`}
                  className="s-chip"
                  aria-current={!activeGrandchild ? 'page' : undefined}
                  style={
                    !activeGrandchild
                      ? { background: 'var(--fg)', color: 'var(--bg)', borderColor: 'var(--fg)' }
                      : undefined
                  }
                >
                  Semua {activeChild.name}
                </Link>
                {childGrandchildren.map((gc) => {
                  const isActive = activeGrandchild?.id === gc.id;
                  return (
                    <Link
                      key={gc.id}
                      href={`/artikel/${categorySlug}?sub=${gc.slug}`}
                      className="s-chip"
                      aria-current={isActive ? 'page' : undefined}
                      style={
                        isActive
                          ? {
                              background: 'var(--fg)',
                              color: 'var(--bg)',
                              borderColor: 'var(--fg)',
                            }
                          : undefined
                      }
                    >
                      {gc.name}
                    </Link>
                  );
                })}
              </div>
            );
          })()}

        {/* List — spec §5.2/§9.1: every row/card title is h2 (this page's own
            h1 is the category name, so the list is the page's only h2 level). */}
        {data.length > 0 ? (
          <>
            <div style={{ paddingTop: 20 }}>
              {leadIsCard && firstArticle && (
                <CategoryCard key={firstArticle.id} article={firstArticle} />
              )}
              {(leadIsCard ? restArticles : data).map((article, i) => (
                <Fragment key={article.id}>
                  <CategoryRow
                    article={article}
                    index={leadIsCard ? i + 2 : (page - 1) * data.length + i + 1}
                  />
                </Fragment>
              ))}
            </div>

            <div
              style={{
                borderTop: '2px solid var(--fg)',
                marginTop: 6,
                paddingTop: 14,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span className="s-meta">
                Menunjukkan {data.length} daripada {total}
              </span>
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
          <div style={{ paddingTop: 20 }}>
            <EmptyCategoryState />
          </div>
        )}
      </div>
    </div>
  );
}

type CategoryArticle = Awaited<ReturnType<typeof getCategoryArticles>>['data'][number];

/** The first item of the set — spec §5.2's `.s-card`. */
function CategoryCard({ article }: { article: CategoryArticle }) {
  const cover = resolveCoverSource(
    article.coverImageVariants as CoverVariants | null,
    article.coverImageSmartCrops,
    article.coverImageUrl,
  );
  const credit = article.coverCredit;
  const href = `/artikel/${article.categorySlug ?? ''}/${article.slug}`;
  return (
    <a href={href} className="s-card" style={{ textDecoration: 'none', color: 'inherit' }}>
      <figure style={{ margin: 0 }}>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element -- see responsive-cover.ts
          /* UI-12 S1: `srcSet` gone (its `1200w` descriptor was a constant, not
             a measurement — measured 17.2% wrong on `garden-wedding`), and
             `sizes` with it, because `sizes` without a `srcset` is inert. */
          <img src={cover.src} alt="" width={800} height={600} loading="lazy" decoding="async" />
        )}
        <figcaption style={{ paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h2 className="s-h3" style={{ fontSize: 19 }}>
            {article.title}
          </h2>
          {/* `credit` already carries its "Kredit: " prefix — see page.tsx's
              hero note; do not prepend a second one. */}
          {credit && <span className="s-cred">{credit}</span>}
        </figcaption>
      </figure>
    </a>
  );
}

/** Every subsequent item — spec §5.2's `.s-row`, with the desktop index
 * number (§5.2: "the catalogue is ordered… the number is how a reader knows
 * where they are"). */
function CategoryRow({ article, index }: { article: CategoryArticle; index: number }) {
  const cover = resolveRowThumbSource(
    article.coverImageVariants as CoverVariants | null,
    article.coverImageSmartCrops,
    article.coverImageUrl,
  );
  const href = `/artikel/${article.categorySlug ?? ''}/${article.slug}`;
  return (
    <a
      href={href}
      className={cover ? 's-row' : 's-imgless'}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <span className="s-idx">{String(index).padStart(2, '0')}</span>
      {cover && (
        /* Before the text in source order; `.s-row img` takes `order:3` at
           desktop, which is where the spec puts the thumbnail. */
        // eslint-disable-next-line @next/next/no-img-element
        /* UI-12 S1/S2: no `srcSet`, no `sizes`. 176×132 = 1.33333 is the ratio
           `.s-row img` now sets in BOTH bands (80×60 below 1024px), so the
           attributes and the CSS box state the same shape. */
        /* DES-18: the mid-size rendition, 528x396 — the 4:3 asset this slot
           has wanted since UI-12 S2 made the box 4:3 at every width. UI-12
           could not serve one because the only 4:3 file was the 488-946 KB
           full crop; `crop-4x3-article-card-sm` is a median 17,664 B, lighter
           than the `low` this row fetched before. `width`/`height` are the
           file's REAL intrinsics when the rendition is present (hero-rules
           R4/R6), falling back to the CSS box's own 176x132 = 1.33333. */
        <img
          src={cover.src}
          alt=""
          width={cover.width ?? 176}
          height={cover.height ?? 132}
          loading="lazy"
          decoding="async"
        />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <h2 className="t">{article.title}</h2>
        {article.categories[0] && (
          <span className="s-dim" style={{ fontSize: 13 }}>
            {article.categories[0].name}
          </span>
        )}
      </div>
    </a>
  );
}
