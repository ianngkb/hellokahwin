'use server';

import { redirect } from 'next/navigation';
import { revalidatePath, revalidateTag, updateTag } from 'next/cache';
import { PURGE_IMMEDIATELY } from '@/lib/cache/purge';
import { eq, ilike, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { dynamicBlocks, dynamicBlockRules } from '@/lib/db/schema/dynamic-blocks';
import { articles } from '@/lib/db/schema/articles';
import { requireAdminSectionAction } from '@/lib/auth/admin';
import { DYNAMIC_BLOCKS_TAG } from '@/lib/inspire/cached-lists';
import { isUuid } from '@/lib/auth/is-uuid';
import { logAuditEvent } from '@/lib/audit/log';
import {
  dynamicBlockCreateSchema,
  dynamicBlockUpdateSchema,
} from '@/lib/validations/dynamic-block';

export async function createDynamicBlockAction(_prev: unknown, formData: FormData) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  const parsed = dynamicBlockCreateSchema.safeParse({
    name: formData.get('name'),
    placement: formData.get('placement'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const [inserted] = await db
    .insert(dynamicBlocks)
    .values({
      name: parsed.data.name,
      placement: parsed.data.placement,
      status: 'draft',
    })
    .returning({ id: dynamicBlocks.id });

  logAuditEvent({
    entityType: 'dynamic_block',
    entityId: inserted.id,
    action: 'created',
    performedBy: user.id,
    metadata: { name: parsed.data.name, placement: parsed.data.placement },
  });

  revalidatePath('/admin/inspire/dynamic-blocks');
  revalidateTag('articles', PURGE_IMMEDIATELY);
  // The article editor's Insert picker now reads the published-block list from a
  // `cachedJson` entry on this tag, so it stops costing a DB round-trip on every
  // render and every autosave. `updateTag` is the server-action-only variant
  // that gives read-your-own-writes: without it a block the admin just published
  // would be missing from the picker until the 300s TTL expired.
  updateTag(DYNAMIC_BLOCKS_TAG);
  redirect(`/admin/inspire/dynamic-blocks/${inserted.id}/edit`);
}

export async function updateDynamicBlockAction(blockId: string, data: Record<string, unknown>) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  if (!isUuid(blockId)) return { error: 'Invalid block ID' };

  const parsed = dynamicBlockUpdateSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  const validated = parsed.data;

  try {
    const updateSet: Record<string, unknown> = {
      name: validated.name,
      placement: validated.placement,
      status: validated.status,
      isActive: validated.isActive,
      displayOrder: validated.displayOrder,
      updatedAt: new Date(),
    };
    // Only touch content when the caller sent the key — an omitted field must
    // never wipe stored content. Explicit null clears.
    if (validated.content !== undefined) updateSet.content = validated.content;

    const found = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(dynamicBlocks)
        .set(updateSet)
        .where(eq(dynamicBlocks.id, blockId))
        .returning({ id: dynamicBlocks.id });
      if (!updated) return false; // nothing written — safe to commit as no-op

      // Replace-all rules sync (same pattern as article categories/tags).
      await tx.delete(dynamicBlockRules).where(eq(dynamicBlockRules.blockId, blockId));
      const ruleRows = [
        ...[...new Set(validated.categoryIds)].map((categoryId) => ({ blockId, categoryId })),
        ...[...new Set(validated.tagIds)].map((tagId) => ({ blockId, tagId })),
        ...[...new Set(validated.articleIds)].map((articleId) => ({ blockId, articleId })),
      ];
      if (ruleRows.length > 0) {
        await tx.insert(dynamicBlockRules).values(ruleRows);
      }
      return true;
    });
    if (!found) return { error: 'Block not found' };
  } catch (err) {
    // FK violation (a rule-targeted article/category/tag deleted concurrently),
    // unique-index race, timeout, … — return the standard error shape instead
    // of throwing a digest at the client.
    console.error('[dynamic-blocks] update failed:', err);
    return { error: 'Failed to save block. Please retry — a targeted item may have been deleted.' };
  }

  logAuditEvent({
    entityType: 'dynamic_block',
    entityId: blockId,
    action: 'updated',
    performedBy: user.id,
    metadata: {
      name: validated.name,
      placement: validated.placement,
      status: validated.status,
      isActive: validated.isActive,
      ruleCounts: {
        categories: validated.categoryIds.length,
        tags: validated.tagIds.length,
        articles: validated.articleIds.length,
      },
    },
  });

  revalidatePath('/admin/inspire/dynamic-blocks');
  revalidatePath(`/admin/inspire/dynamic-blocks/${blockId}/edit`);
  // Article pages cache forever — without this, block edits never propagate.
  revalidateTag('articles', PURGE_IMMEDIATELY);
  // An edit can flip `status`/`isActive`, which is exactly what decides whether
  // the block appears in the editor's cached picker list.
  updateTag(DYNAMIC_BLOCKS_TAG);
  return { success: true };
}

export async function deleteDynamicBlockAction(blockId: string) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };
  if (!isUuid(blockId)) return { error: 'Invalid block ID' };

  let deleted: { name: string } | undefined;
  try {
    [deleted] = await db
      .delete(dynamicBlocks)
      .where(eq(dynamicBlocks.id, blockId))
      .returning({ name: dynamicBlocks.name });
  } catch (err) {
    console.error('[dynamic-blocks] delete failed:', err);
    return { error: 'Failed to delete block. Please retry.' };
  }
  if (!deleted) return { error: 'Block not found' };

  logAuditEvent({
    entityType: 'dynamic_block',
    entityId: blockId,
    action: 'deleted',
    performedBy: user.id,
    metadata: { name: deleted.name },
  });

  revalidatePath('/admin/inspire/dynamic-blocks');
  revalidateTag('articles', PURGE_IMMEDIATELY);
  // A deleted block must leave the editor's cached picker immediately, or the
  // admin can insert a block that no longer exists.
  updateTag(DYNAMIC_BLOCKS_TAG);
  return { success: true };
}

function escapeLikePattern(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&');
}

// Article search for the rules picker (specific-article targeting).
export async function searchArticlesForRuleAction(query: string) {
  const { error: authError } = await requireAdminSectionAction('inspire');
  if (authError) return [];

  if (!query || query.trim().length < 2) return [];

  const escaped = escapeLikePattern(query.trim());
  return (
    db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        status: articles.status,
      })
      .from(articles)
      .where(ilike(articles.title, `%${escaped}%`))
      // DESC alone is NULLS FIRST in Postgres, which would rank drafts
      // (publishedAt NULL) above recent published articles.
      .orderBy(sql`${articles.publishedAt} DESC NULLS LAST`)
      .limit(10)
  );
}
