import type { MetadataRoute } from 'next';
import { eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { articles, inspireCategories } from '@/lib/db/schema/articles';
import { getSitemapAuthors } from '@/lib/authors/queries';
import { authorArchivePath } from '@/lib/authors/gate';

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

  // Category hubs — TOP-LEVEL ONLY. Child categories are surfaced in-app via
  // the `?sub=` form (which canonicalises to the parent) and emit `noindex`;
  // listing them here would advertise orphaned duplicates.
  const categoryRows = await db
    .select({ slug: inspireCategories.slug })
    .from(inspireCategories)
    .where(isNull(inspireCategories.parentId));

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
