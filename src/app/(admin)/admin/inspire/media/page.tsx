import type { Metadata } from 'next';
import Link from 'next/link';
import { desc, count, eq, and, ilike, or, inArray } from 'drizzle-orm';
import { requireAdminSection } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { media, mediaArticleUsage } from '@/lib/db/schema/media';
import { articles } from '@/lib/db/schema/articles';
import { profiles } from '@/lib/db/schema/profiles';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { MediaGallery } from '@/components/media/media-gallery';
import type { Media } from '@/lib/db/schema/media';

export const metadata: Metadata = {
  title: 'Media Library - Admin',
};

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; source?: string; page?: string; articleId?: string }>;
}) {
  await requireAdminSection('media_library');

  const params = await searchParams;
  const { search, source } = params;
  const rawPage = parseInt(params.page ?? '1', 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = 48;
  const offset = (page - 1) * pageSize;

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const articleId =
    params.articleId && UUID_RE.test(params.articleId) ? params.articleId : undefined;

  const conditions = [];
  if (source === 'article_upload' || source === 'library_upload') {
    conditions.push(eq(media.source, source));
  }
  if (articleId) {
    // Include media referenced in article content (junction) OR originally uploaded from this article
    const articleMediaIds = db
      .select({ mediaId: mediaArticleUsage.mediaId })
      .from(mediaArticleUsage)
      .where(eq(mediaArticleUsage.articleId, articleId));
    conditions.push(or(inArray(media.id, articleMediaIds), eq(media.originalArticleId, articleId)));
  }
  if (search) {
    const escaped = search.replace(/[%_\\]/g, '\\$&');
    conditions.push(
      or(
        ilike(media.filename, `%${escaped}%`),
        ilike(media.alt, `%${escaped}%`),
        ilike(media.caption, `%${escaped}%`),
      ),
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalResult] = await Promise.all([
    db
      .select()
      .from(media)
      .where(whereClause)
      .orderBy(desc(media.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ count: count() }).from(media).where(whereClause),
  ]);

  const total = totalResult[0]?.count ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  // Look up article name for display when filtering by articleId
  let articleName: string | undefined;
  if (articleId) {
    const [article] = await db
      .select({ title: articles.title })
      .from(articles)
      .where(eq(articles.id, articleId))
      .limit(1);
    articleName = article?.title;
  }

  const serialized = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return (
    <div>
      <PageHeader
        title="Media Library"
        description="Browse, upload, and manage images across all articles."
        actions={
          <Button asChild variant="quiet">
            <Link href="/admin/inspire">Articles</Link>
          </Button>
        }
      />

      <MediaGallery
        initialItems={serialized as unknown as Media[]}
        initialTotal={total}
        currentPage={page}
        totalPages={totalPages}
        searchParams={params}
        articleId={articleId}
        articleName={articleName}
      />
    </div>
  );
}
