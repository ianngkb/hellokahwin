import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { and, eq, isNotNull, lte } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { articles, inspireCategories } from '@/lib/db/schema/articles';
import { auditLogs } from '@/lib/db/schema/audit-logs';
import { submitUrlToIndexNow } from '@/lib/seo/indexnow';

/**
 * Flips due scheduled articles to published. The editor writes
 * `scheduled_publish_at` on a draft (see edit/actions.ts); twn-new's cron for
 * this lived outside the inspire tree, so this worker is new here.
 *
 * Invoked by Vercel Cron (vercel.json) with `Authorization: Bearer $CRON_SECRET`.
 * A missed run self-heals: the WHERE picks up anything past due on the next tick.
 */
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const due = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      scheduledPublishAt: articles.scheduledPublishAt,
      categorySlug: inspireCategories.slug,
    })
    .from(articles)
    .leftJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
    .where(
      and(
        eq(articles.status, 'draft'),
        isNotNull(articles.scheduledPublishAt),
        lte(articles.scheduledPublishAt, now),
      ),
    );

  if (due.length === 0) return NextResponse.json({ published: 0 });

  const published: string[] = [];
  for (const article of due) {
    // Guarded update: only flips the row if it is still a due, scheduled draft —
    // an admin publishing (or unscheduling) mid-run loses nothing.
    const updated = await db
      .update(articles)
      .set({
        status: 'published',
        publishedAt: article.scheduledPublishAt ?? now,
        scheduledPublishAt: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(articles.id, article.id),
          eq(articles.status, 'draft'),
          isNotNull(articles.scheduledPublishAt),
          lte(articles.scheduledPublishAt, now),
        ),
      )
      .returning({ id: articles.id });
    if (updated.length === 0) continue;
    published.push(article.id);

    // Direct insert rather than logAuditEvent: `performed_by` is an FK to
    // profiles, and the cron has no profile — null + a label keeps the row
    // attributable without violating the constraint.
    try {
      await db.insert(auditLogs).values({
        entityType: 'article',
        entityId: article.id,
        action: 'status_changed',
        performedBy: null,
        performedByLabel: 'cron:publish-scheduled',
        changes: { status: { old: 'draft', new: 'published' } },
      });
    } catch (err) {
      console.error('[publish-scheduled] audit log failed:', err);
    }

    if (article.categorySlug) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hellokahwin.com';
      const canonicalUrl = `${baseUrl}/artikel/${article.categorySlug}/${article.slug}`;
      void submitUrlToIndexNow(canonicalUrl, article.id).catch((err) => {
        console.error('[indexnow] submit failed for', canonicalUrl, err);
      });
    }
  }

  if (published.length > 0) {
    revalidatePath('/artikel');
    revalidatePath('/sitemap.xml');
    revalidateTag('articles', 'max');
  }

  return NextResponse.json({ published: published.length });
}
