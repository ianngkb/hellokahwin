import type { Metadata } from 'next';
import Link from 'next/link';
import { and, count, eq, sql } from 'drizzle-orm';
import { ArrowLeftIcon } from 'lucide-react';
import { requireAdminSection } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { profiles } from '@/lib/db/schema/profiles';
import { articles } from '@/lib/db/schema/articles';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { authorDisplayName } from '@/lib/authors/gate';
import { generateSlug } from '@/lib/utils/slug';
import { AuthorsManager } from './authors-manager';

export const metadata: Metadata = {
  title: 'Inspire Authors - Admin',
};

export default async function AdminInspireAuthorsPage() {
  await requireAdminSection('inspire');

  // Admin accounts only. `profiles` also holds every couple and vendor, and
  // offering one of those here would suggest they could be opted in — they
  // cannot: `isLinkableAuthor` rejects any non-admin role regardless of what
  // the columns say, so a vendor row in this list would be a control that
  // silently does nothing.
  const publishedCounts = db
    .select({
      authorId: articles.authorId,
      count: count().as('published_article_count'),
    })
    .from(articles)
    .where(eq(articles.status, 'published'))
    .groupBy(articles.authorId)
    .as('published_counts');

  const rows = await db
    .select({
      id: profiles.id,
      firstName: profiles.firstName,
      lastName: profiles.lastName,
      email: profiles.email,
      avatarUrl: profiles.avatarUrl,
      authorSlug: profiles.authorSlug,
      isPublicAuthor: profiles.isPublicAuthor,
      authorTitle: profiles.authorTitle,
      authorBio: profiles.authorBio,
      authorWebsiteUrl: profiles.authorWebsiteUrl,
      authorInstagramUrl: profiles.authorInstagramUrl,
      authorLinkedinUrl: profiles.authorLinkedinUrl,
      publishedArticleCount: sql<number>`COALESCE(${publishedCounts.count}, 0)`.as(
        'published_article_count',
      ),
    })
    .from(profiles)
    .leftJoin(publishedCounts, eq(profiles.id, publishedCounts.authorId))
    .where(and(eq(profiles.role, 'admin')))
    // Authors who have actually written something first — the list is otherwise
    // dominated by admins who will never appear on an article.
    .orderBy(sql`COALESCE(${publishedCounts.count}, 0) DESC`, profiles.email);

  const authors = rows.map((r) => ({
    id: r.id,
    name: authorDisplayName(r),
    email: r.email,
    avatarUrl: r.avatarUrl,
    authorSlug: r.authorSlug,
    // Derived here rather than in the dialog: `generateSlug` lives in a module
    // that lazily imports the place inventory (and through it the postgres
    // driver), so importing it from a client component breaks the build.
    suggestedSlug: generateSlug(authorDisplayName(r)),
    isPublicAuthor: r.isPublicAuthor,
    authorTitle: r.authorTitle,
    authorBio: r.authorBio,
    authorWebsiteUrl: r.authorWebsiteUrl,
    authorInstagramUrl: r.authorInstagramUrl,
    authorLinkedinUrl: r.authorLinkedinUrl,
    publishedArticleCount: Number(r.publishedArticleCount),
  }));

  return (
    <div>
      <PageHeader
        breadcrumb={
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href="/admin/inspire">
              <ArrowLeftIcon className="mr-1 size-4" />
              Back to Inspire
            </Link>
          </Button>
        }
        title="Authors"
        description="Photo, bio and socials for the people credited on articles. An author is only public once they are explicitly published."
      />

      <AuthorsManager authors={authors} />
    </div>
  );
}
