import type { Metadata } from 'next';
import { desc, count, eq, and, ilike, or, inArray } from 'drizzle-orm';
import { requireAdminSection } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { media, mediaArticleUsage } from '@/lib/db/schema/media';
import { articles } from '@/lib/db/schema/articles';
import { ConsoleBreadcrumb } from '@/components/console/console-breadcrumb';
import { PageHeader } from '@/components/layout/page-header';
import { MediaGallery } from '@/components/media/media-gallery';
import { countOrNull, estimateTotalFromPage } from '@/lib/media/paging';
import type { Media } from '@/lib/db/schema/media';

export const metadata: Metadata = {
  title: 'Media Library - Admin',
};

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    source?: string;
    page?: string;
    articleId?: string;
    /**
     * ONE row, opened directly. `?search=<uuid>` could never do this: the
     * search filter is an `ilike` over filename, alt and caption and never
     * looks at `media.id`, so such a link landed on an empty result page.
     */
    mediaId?: string;
  }>;
}) {
  await requireAdminSection('media_library');

  const params = await searchParams;
  const { search, source } = params;
  const rawPage = parseInt(params.page ?? '1', 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = 48;
  const offset = (page - 1) * pageSize;

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const mediaId = params.mediaId && UUID_RE.test(params.mediaId) ? params.mediaId : undefined;
  const articleId =
    params.articleId && UUID_RE.test(params.articleId) ? params.articleId : undefined;

  const conditions = [];
  if (source === 'article_upload' || source === 'library_upload') {
    conditions.push(eq(media.source, source));
  }
  if (mediaId) conditions.push(eq(media.id, mediaId));
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

  // The count must not take the page down: a searched view cannot use an index,
  // so it is the slow half and can hit the statement timeout. A failed count
  // degrades to a paging estimate and the rows still render.
  const [rows, totalResult] = await Promise.all([
    db
      .select()
      .from(media)
      .where(whereClause)
      .orderBy(desc(media.createdAt))
      .limit(pageSize)
      .offset(offset),
    countOrNull(() =>
      db
        .select({ count: count() })
        .from(media)
        .where(whereClause)
        .then((r) => r[0]?.count ?? 0),
    ),
  ]);

  // `??`, never `||` — a real count of 0 is falsy.
  const total = totalResult ?? estimateTotalFromPage(offset, rows.length, pageSize);
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
        breadcrumb={<ConsoleBreadcrumb items={[{ label: 'Admin' }, { label: 'Media library' }]} />}
        title="Media library"
        description="Browse, upload, and manage images across all articles."
      />

      <MediaGallery
        initialItems={serialized as unknown as Media[]}
        initialTotal={total}
        currentPage={page}
        totalPages={totalPages}
        searchParams={params}
        openMediaId={mediaId}
        articleId={articleId}
        articleName={articleName}
      />
    </div>
  );
}
