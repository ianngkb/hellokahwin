'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { and, desc, eq, gt } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { auditLogs } from '@/lib/db/schema/audit-logs';
import { requireAdminSectionAction } from '@/lib/auth/admin';
import { logAuditEventAsync } from '@/lib/audit/log';
import { PURGE_IMMEDIATELY } from '@/lib/cache/purge';

/**
 * "Refresh all articles" — ported from The Wedding Notebook's Inspire admin.
 *
 * Kept in its own module rather than `../actions.ts` so the two can change
 * independently; the button imports it from here.
 *
 * Every published article page is cached until something busts the shared
 * `articles` tag, and some of what that page shows is captured from OTHER
 * screens — dynamic blocks above all, which no longer bust article pages on
 * every save (see `dynamic-blocks/actions.ts`). This is the explicit escape
 * hatch: one press rebuilds every article on its next visit.
 *
 * The 10-minute cooldown is recorded in `audit_logs` (no new table, no
 * migration): the last `articles_refresh_all` row is the guard. The row is
 * written BEFORE the purge, so a second click that lands immediately after a
 * completed first one sees it and is refused. Two clicks racing inside the
 * same instant can both pass — the cost of that is one extra purge, which is
 * harmless, so it is not worth a lock.
 */

// Not exported: a 'use server' module may export async functions only.
const REFRESH_ALL_ACTION = 'articles_refresh_all';
/** Audit row key. Not a uuid, which the audit label resolver tolerates. */
const REFRESH_ALL_ENTITY_ID = 'inspire-articles-all';
const REFRESH_ALL_COOLDOWN_MS = 10 * 60 * 1000;

export async function refreshAllArticlesAction(): Promise<
  { ok: true } | { error: string; lastRunAt?: string }
> {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  const [recentRun] = await db
    .select({ createdAt: auditLogs.createdAt })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.action, REFRESH_ALL_ACTION),
        gt(auditLogs.createdAt, new Date(Date.now() - REFRESH_ALL_COOLDOWN_MS)),
      ),
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(1);
  if (recentRun) {
    // Malaysia time, readable — TWN shows a raw ISO timestamp here.
    const at = recentRun.createdAt.toLocaleTimeString('en-MY', {
      timeZone: 'Asia/Kuala_Lumpur',
      hour: 'numeric',
      minute: '2-digit',
    });
    return {
      error: `All articles were already refreshed at ${at}. Try again after 10 minutes.`,
      lastRunAt: recentRun.createdAt.toISOString(),
    };
  }

  // Persist the guard before invalidating, so a completed first click is
  // visible to the next request even if it arrives immediately afterwards.
  await logAuditEventAsync({
    entityType: 'article',
    entityId: REFRESH_ALL_ENTITY_ID,
    action: REFRESH_ALL_ACTION,
    performedBy: user.id,
    entityLabel: 'All Inspire articles',
  });

  // `articles` is the tag every public article page entry carries
  // (`ARTICLE_PAGE_CACHE_TAGS`), so this one call is the whole corpus.
  revalidateTag('articles', PURGE_IMMEDIATELY);
  revalidatePath('/artikel');
  revalidatePath('/admin/inspire');

  console.log(`[inspire] refresh-all-articles by ${user.id}`);
  return { ok: true };
}
