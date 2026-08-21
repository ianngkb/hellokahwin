import { NextResponse, type NextRequest } from 'next/server';
import { and, eq, ilike, or, desc, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { articles, inspireCategories } from '@/lib/db/schema/articles';

/**
 * Lightweight article search backing InspireArticleSearch. twn-new ran a
 * hybrid fts+embedding search across listings and articles here; HelloKahwin
 * has ~dozens of articles, so a title/excerpt ILIKE with a title-match-first
 * ordering is honest and fast. Response shape matches the client:
 * `{ data: { articles: [{ id, title, slug, category_slug, excerpt }] } }`.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  const limitParam = Number(request.nextUrl.searchParams.get('limit') ?? 5);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(1, limitParam), 20) : 5;

  if (q.length < 2 || q.length > 100) {
    return NextResponse.json({ data: { articles: [] } });
  }

  const escaped = q.replace(/[%_\\]/g, (m) => `\\${m}`);
  const pattern = `%${escaped}%`;

  try {
    const rows = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        category_slug: inspireCategories.slug,
        excerpt: articles.excerpt,
      })
      .from(articles)
      .innerJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
      .where(
        and(
          eq(articles.status, 'published'),
          or(ilike(articles.title, pattern), ilike(articles.excerpt, pattern)),
        ),
      )
      .orderBy(
        // Title matches rank above excerpt-only matches; newest first within each.
        sql`CASE WHEN ${articles.title} ILIKE ${pattern} THEN 0 ELSE 1 END`,
        desc(articles.publishedAt),
      )
      .limit(limit);

    return NextResponse.json(
      { data: { articles: rows } },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
    );
  } catch (err) {
    console.error('[search] query failed:', err);
    return NextResponse.json({ data: { articles: [] } }, { status: 200 });
  }
}
