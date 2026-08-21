import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { articles, articleCategories, inspireCategories } from '@/lib/db/schema/articles';
import { lookupRedirect } from '@/lib/redirects/lookup';
import { normalizePathname } from '@/lib/redirects/patterns';

/**
 * Legacy WordPress root-slug resolver. hellokahwin.com's WP served every post
 * at /{slug}; the imported articles live at /artikel/{category}/{slug}. This
 * catch-all keeps every old Google-indexed post URL resolving with a 301.
 * Unknown slugs fall through to the redirects table, then 404.
 */
export const dynamic = 'force-dynamic';

async function canonicalArticlePath(slug: string): Promise<string | null> {
  const [article] = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      primaryCategoryId: articles.primaryCategoryId,
    })
    .from(articles)
    .where(and(eq(articles.slug, slug), eq(articles.status, 'published')))
    .limit(1);
  if (!article) return null;

  let categorySlug: string | null = null;
  if (article.primaryCategoryId) {
    const [cat] = await db
      .select({ slug: inspireCategories.slug })
      .from(inspireCategories)
      .where(eq(inspireCategories.id, article.primaryCategoryId))
      .limit(1);
    categorySlug = cat?.slug ?? null;
  }
  if (!categorySlug) {
    const [linked] = await db
      .select({ slug: inspireCategories.slug })
      .from(articleCategories)
      .innerJoin(inspireCategories, eq(articleCategories.categoryId, inspireCategories.id))
      .where(eq(articleCategories.articleId, article.id))
      .limit(1);
    categorySlug = linked?.slug ?? null;
  }
  if (!categorySlug) return null;
  return `/artikel/${categorySlug}/${article.slug}`;
}

export default async function LegacySlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;

  // Preserve UTM / attribution params across the redirect, exactly as the
  // middleware pattern redirects do — these are the highest-traffic legacy
  // URLs on the site and dropping their query string loses the attribution.
  const withQuery = (path: string) => {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (Array.isArray(value)) value.forEach((v) => qs.append(key, v));
      else if (value !== undefined) qs.set(key, value);
    }
    const search = qs.toString();
    return search ? `${path}?${search}` : path;
  };

  // Only well-formed WP-ish slugs get a DB lookup; junk 404s straight away.
  if (/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    const canonical = await canonicalArticlePath(slug);
    if (canonical) permanentRedirect(withQuery(canonical));
  }

  const dbRedirect = await lookupRedirect(`/${slug}`);
  if (dbRedirect) {
    // Self-referential row (or one that normalizes back to this same path) —
    // following it would bounce this route against itself forever. The
    // chain-flattening in the editor only guards rows it writes under /artikel.
    if (normalizePathname(dbRedirect.destinationPath) === `/${slug}`) notFound();

    if (dbRedirect.statusCode === 301 || dbRedirect.statusCode === 308) {
      permanentRedirect(withQuery(dbRedirect.destinationPath));
    }
    redirect(withQuery(dbRedirect.destinationPath));
  }

  notFound();
}
