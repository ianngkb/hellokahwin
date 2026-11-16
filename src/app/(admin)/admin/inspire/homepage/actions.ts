'use server';

import { and, desc, eq, ilike, inArray, isNotNull, sql } from 'drizzle-orm';
import { revalidatePath, revalidateTag, updateTag } from 'next/cache';
import { PURGE_IMMEDIATELY } from '@/lib/cache/purge';
import { db } from '@/lib/db/drizzle';
import { adminSettings } from '@/lib/db/schema/settings';
import { articles, inspireCategories } from '@/lib/db/schema/articles';
import { requireAdminSectionAction } from '@/lib/auth/admin';
import { logAuditEventAsync } from '@/lib/audit/log';
import {
  DEFAULT_INSPIRE_HOMEPAGE_CONFIG,
  HOMEPAGE_SURFACES,
  inspireHomepageConfigSchema,
  parseHomepageSurface,
  type HomepageSurface,
  type InspireHomepageConfig,
} from '@/lib/inspire/homepage-curation';
import type { InspireHomepagePickerArticle } from '@/lib/inspire/homepage-queries';

export type InspireHomepageActionResult = { success: true } | { error: string };

/**
 * Ported from The Wedding Notebook's Inspire homepage manager. It curates two
 * public surfaces — the site homepage `/` and the `/artikel` hub — each saved
 * under its own `admin_settings` key (see `HOMEPAGE_SURFACES`); the surface
 * arrives as an untrusted argument and is narrowed by `parseHomepageSurface`. The
 * tag is purged with HelloKahwin's the tag is purged with HelloKahwin's
 * `PURGE_IMMEDIATELY` convention rather than twn's `'max'` (stale-while-
 * revalidate): an editor who pins a story expects the next reader to see it.
 * `revalidatePath` alone does not evict an `unstable_cache` entry — only the
 * tag does — so both are needed.
 */
function refreshInspireHomepage(surface: HomepageSurface) {
  const { path, cacheTag } = HOMEPAGE_SURFACES[surface];
  revalidatePath(path);
  revalidatePath('/admin/inspire/homepage');
  revalidateTag(cacheTag, PURGE_IMMEDIATELY);
  updateTag(cacheTag);
}

async function validateReferences(config: InspireHomepageConfig): Promise<string | null> {
  const categoryIds = [config.featured, config.latest]
    .filter((zone) => zone.source === 'category')
    .flatMap((zone) => (zone.categoryId ? [zone.categoryId] : []));
  if (categoryIds.length > 0) {
    const rows = await db
      .select({ id: inspireCategories.id })
      .from(inspireCategories)
      .where(inArray(inspireCategories.id, [...new Set(categoryIds)]));
    if (rows.length !== new Set(categoryIds).size) {
      return 'One of the selected categories no longer exists. Reload and choose another category.';
    }
  }

  const pinnedIds = [...config.featured.pinnedArticleIds, ...config.latest.pinnedArticleIds];
  if (pinnedIds.length > 0) {
    const rows = await db
      .select({ id: articles.id })
      .from(articles)
      .where(
        and(
          inArray(articles.id, pinnedIds),
          eq(articles.status, 'published'),
          isNotNull(articles.coverImageUrl),
          sql`length(trim(${articles.coverImageUrl})) > 0`,
        ),
      );
    if (rows.length !== pinnedIds.length) {
      return 'One of the pinned articles is no longer published with a cover. Reload and choose another article.';
    }
  }
  return null;
}

export async function saveInspireHomepageAction(
  input: unknown,
  surfaceInput: unknown = 'artikel',
): Promise<InspireHomepageActionResult> {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };
  const surface = parseHomepageSurface(surfaceInput);
  const { settingKey, auditLabel } = HOMEPAGE_SURFACES[surface];

  const parsed = inspireHomepageConfigSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid settings' };
  const referenceError = await validateReferences(parsed.data);
  if (referenceError) return { error: referenceError };

  try {
    await db
      .insert(adminSettings)
      .values({
        key: settingKey,
        value: parsed.data,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: adminSettings.key,
        set: { value: parsed.data, updatedAt: new Date() },
      });
    await logAuditEventAsync({
      entityType: 'settings',
      entityId: settingKey,
      entityLabel: auditLabel,
      action: 'updated',
      performedBy: user.id,
      metadata: parsed.data as unknown as Record<string, unknown>,
    });
  } catch (error) {
    console.error('[artikel-homepage] save failed:', error);
    return { error: 'Could not save the articles homepage — please try again.' };
  }

  refreshInspireHomepage(surface);
  return { success: true };
}

export async function resetInspireHomepageAction(
  surfaceInput: unknown = 'artikel',
): Promise<InspireHomepageActionResult> {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };
  const surface = parseHomepageSurface(surfaceInput);
  const { settingKey, auditLabel } = HOMEPAGE_SURFACES[surface];

  try {
    await db.delete(adminSettings).where(eq(adminSettings.key, settingKey));
    await logAuditEventAsync({
      entityType: 'settings',
      entityId: settingKey,
      entityLabel: auditLabel,
      action: 'reset',
      performedBy: user.id,
      metadata: DEFAULT_INSPIRE_HOMEPAGE_CONFIG as unknown as Record<string, unknown>,
    });
  } catch (error) {
    console.error('[artikel-homepage] reset failed:', error);
    return { error: 'Could not reset the articles homepage — please try again.' };
  }

  refreshInspireHomepage(surface);
  return { success: true };
}

export async function searchInspireHomepageArticlesAction(
  query: string,
): Promise<{ articles: InspireHomepagePickerArticle[] } | { error: string }> {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };
  const term = Array.from(typeof query === 'string' ? query.trim() : '')
    .slice(0, 120)
    .join('');
  if (Array.from(term).length < 2) return { articles: [] };
  const escaped = term.replace(/[\\%_]/g, '\\$&');

  try {
    const rows = await db
      .select({ id: articles.id, title: articles.title })
      .from(articles)
      .where(
        and(
          eq(articles.status, 'published'),
          isNotNull(articles.coverImageUrl),
          sql`length(trim(${articles.coverImageUrl})) > 0`,
          ilike(articles.title, `%${escaped}%`),
        ),
      )
      .orderBy(desc(articles.publishedAt), desc(articles.id))
      .limit(20);
    return { articles: rows.map((row) => ({ ...row, status: 'Published' as const })) };
  } catch (error) {
    console.error('[artikel-homepage] article search failed:', error);
    return { error: 'Could not search articles — please try again.' };
  }
}
