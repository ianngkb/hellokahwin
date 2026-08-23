import type { MetadataRoute } from 'next';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { articles, inspireCategories } from '@/lib/db/schema/articles';
import { getSitemapAuthors } from '@/lib/authors/queries';
import { authorArchivePath } from '@/lib/authors/gate';
import { getIndexableCategoryIds, getSitemapCategories } from '@/lib/inspire/category-indexability';

// ISR: cache the rendered sitemap for 1h. Googlebot fetches the cached XML
// directly from the edge — DB queries only run on background regeneration.
// (Carried over from twn-new: transient DB blips otherwise bubbled up as HTML
// 500 pages and produced "Sitemap could not be read" in Search Console.)
export const revalidate = 3600;
// Explicit budget for the regeneration path (vercel.json's function-level
// maxDuration only matches page.tsx / route.ts, not sitemap.ts).
export const maxDuration = 30;

// Sitemap freshness floor — the WP articles imported from hellokahwin.com keep
// their original `updated_at`, but these URLs only began existing on this app
// at the migration date. A stale lastmod signals "low crawl priority"; floor
// it at the migration date so imported content looks genuinely fresh until it
// is actually edited post-migration. (Same lesson as twn-new's 2026-04-21
// re-import.)
const SITEMAP_FRESHNESS_FLOOR = new Date('2026-08-21T00:00:00.000Z');

function freshLastModified(updatedAt: Date | null | undefined): Date {
  if (!updatedAt) return SITEMAP_FRESHNESS_FLOOR;
  return updatedAt > SITEMAP_FRESHNESS_FLOOR ? updatedAt : SITEMAP_FRESHNESS_FLOOR;
}

// Largest of a set of dates, floored at the freshness floor — a *truthful*
// lastModified for aggregate pages (homepage, category hubs), never
// `new Date()`, which would falsely signal "modified just now" hourly.
function newestDate(dates: Date[]): Date {
  return dates.reduce((max, d) => (d > max ? d : max), SITEMAP_FRESHNESS_FLOOR);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hellokahwin.com';

  // Article detail pages (published only), joined to their primary category.
  const publishedArticles = await db
    .select({
      slug: articles.slug,
      updatedAt: articles.updatedAt,
      categorySlug: inspireCategories.slug,
    })
    .from(articles)
    .innerJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
    .where(eq(articles.status, 'published'));

  // Category hubs. The rule USED to be "top-level only", on the reasoning that
  // child categories are orphaned duplicates reached via `?sub=`. Two things
  // were wrong with it, and they have to be fixed together:
  //
  //  1. A child category that is the PRIMARY category of a published article is
  //     not an orphan — its slug is the middle segment of that article's
  //     canonical URL. Six such hubs existed on production on 23 Aug 2026
  //     (hiasan-dekorasi, moden-kontemporari, fotografi-videografi,
  //     glamor-eksklusif, minimalis-mewah, pantai-santai) and none was listed.
  //     The Phase 1 audit reported four of them; it missed the last two.
  //  2. A hub with NO published articles was listed anyway when it happened to
  //     be top-level, while the route emitted `noindex` for it — advertising a
  //     noindex URL, which is a permanent Search Console error. That matters
  //     more now than it did: the seven pillars start empty by design.
  //
  // The rule is now the same one the route uses to decide `noindex`: include a
  // hub when it owns at least one published article, or when it is a pillar
  // with at least one published article anywhere beneath it. See
  // lib/inspire/category-indexability.ts.
  const [allCategories, indexableCategoryIds] = await Promise.all([
    getSitemapCategories(),
    getIndexableCategoryIds(),
  ]);
  const childrenByParent = new Map<string, string[]>();
  for (const cat of allCategories) {
    if (!cat.parentId) continue;
    const list = childrenByParent.get(cat.parentId) ?? [];
    list.push(cat.id);
    childrenByParent.set(cat.parentId, list);
  }
  /** Does this category, or anything beneath it, own a live article URL? */
  const hasLiveArticles = (categoryId: string, depth = 0): boolean => {
    if (indexableCategoryIds.has(categoryId)) return true;
    // Depth guard: the tree is two levels by design, but a bad parent_id could
    // make it cyclic and a sitemap render must not be the thing that finds out.
    if (depth >= 3) return false;
    return (childrenByParent.get(categoryId) ?? []).some((childId) =>
      hasLiveArticles(childId, depth + 1),
    );
  };
  const categoryRows = allCategories.filter((cat) => hasLiveArticles(cat.id));

  const articleDatesByCategory = new Map<string, Date[]>();
  const articlePages: MetadataRoute.Sitemap = publishedArticles.map((article) => {
    const lastModified = freshLastModified(article.updatedAt);
    const arr = articleDatesByCategory.get(article.categorySlug) ?? [];
    arr.push(lastModified);
    articleDatesByCategory.set(article.categorySlug, arr);
    return {
      url: `${baseUrl}/artikel/${article.categorySlug}/${article.slug}`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    };
  });

  const allArticleDates = articlePages.map((p) => p.lastModified as Date);

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: newestDate(allArticleDates),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/artikel`,
      lastModified: newestDate(allArticleDates),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];

  const categoryPages: MetadataRoute.Sitemap = categoryRows.map((cat) => ({
    url: `${baseUrl}/artikel/${cat.slug}`,
    lastModified: newestDate(articleDatesByCategory.get(cat.slug) ?? []),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  // Author archives — same gate as the route (isLinkableAuthor as SQL) AND
  // inner-joined to published articles, so every listed URL actually resolves.
  const authorPages: MetadataRoute.Sitemap = (await getSitemapAuthors()).map((author) => ({
    url: `${baseUrl}${authorArchivePath(author.slug)}`,
    lastModified: freshLastModified(
      author.latestPublishedAt ? new Date(author.latestPublishedAt) : null,
    ),
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }));

  return [...staticPages, ...categoryPages, ...authorPages, ...articlePages];
}
