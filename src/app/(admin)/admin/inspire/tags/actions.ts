'use server';

import { revalidatePath, revalidateTag, updateTag } from 'next/cache';
import { PURGE_IMMEDIATELY } from '@/lib/cache/purge';
import { eq, ne, count, sql, inArray, and } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { inspireTags, articleTags, articles } from '@/lib/db/schema/articles';
import { requireAdminSectionAction } from '@/lib/auth/admin';
import {
  INSPIRE_TAGS_TAG,
  INSPIRE_CATEGORIES_TAG,
  DYNAMIC_BLOCKS_TAG,
} from '@/lib/inspire/cached-lists';
import { logAuditEvent } from '@/lib/audit/log';
import { generateSlug } from '@/lib/utils/slug';
import { tagCreateSchema, tagUpdateSchema } from '@/lib/validations/article';
import { groupSimilarTags, type TagWithCounts } from '@/lib/utils/tag-similarity';
import { replaceTagLinksInContent } from '@/lib/utils/tiptap-link-replacer';

export async function createTagAction(_prev: unknown, formData: FormData) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  const parsed = tagCreateSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug') || undefined,
    // Unchecked checkboxes are absent from FormData; checked ones send 'on'.
    isHidden: formData.get('isHidden') === 'on',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const name = parsed.data.name;
  const slug = parsed.data.slug || generateSlug(name);
  // Always a real boolean — the `=== 'on'` above never yields undefined.
  const isHidden = parsed.data.isHidden;

  // Check unique slug
  const [existing] = await db
    .select({ id: inspireTags.id })
    .from(inspireTags)
    .where(eq(inspireTags.slug, slug))
    .limit(1);

  if (existing) return { error: `A tag with slug "${slug}" already exists` };

  const [tag] = await db
    .insert(inspireTags)
    .values({ name, slug, isHidden })
    .returning({ id: inspireTags.id });

  logAuditEvent({
    entityType: 'inspire_tag',
    entityId: tag.id,
    action: 'created',
    performedBy: user.id,
    metadata: { name, slug, isHidden },
  });

  revalidatePath('/admin/inspire/tags');
  revalidatePath('/artikel');
  revalidateTag(INSPIRE_TAGS_TAG, PURGE_IMMEDIATELY);
  // The article editor now reads the tag vocabulary from a `cachedJson` entry on
  // this same tag, so it stops costing a DB round-trip on every render and every
  // autosave. `updateTag` is the server-action-only variant that gives
  // read-your-own-writes: without it a tag the admin just created would not be
  // selectable in the editor until the 300s TTL expired.
  updateTag(INSPIRE_TAGS_TAG);
  // Article cards display tag names — invalidate article caches too.
  revalidateTag('articles', PURGE_IMMEDIATELY);
  return { success: true };
}

export async function updateTagAction(_prev: unknown, formData: FormData) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  const id = formData.get('id') as string;
  if (!id) return { error: 'Tag ID is required' };

  // An unchecked checkbox is absent from FormData, which is indistinguishable
  // from "the caller never submitted this field". The dialog therefore sends an
  // `isHiddenPresent` sentinel; without it we leave the flag alone rather than
  // silently un-hiding the tag.
  const isHiddenSubmitted = formData.get('isHiddenPresent') !== null;

  const parsed = tagUpdateSchema.safeParse({
    name: formData.get('name') || undefined,
    slug: formData.get('slug') || undefined,
    // Unchecked checkboxes are absent from FormData; checked ones send 'on'.
    isHidden: isHiddenSubmitted ? formData.get('isHidden') === 'on' : undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.name) updateData.name = parsed.data.name;
  if (parsed.data.slug) updateData.slug = parsed.data.slug;
  // Written only when submitted — so unchecking still clears the flag (the
  // dialog always sends the sentinel), but an omitting caller can't.
  if (isHiddenSubmitted) updateData.isHidden = parsed.data.isHidden;

  // Slug is UNIQUE. createTagAction pre-checks this; rename must too, or the
  // unique violation escapes as an unhandled rejection and the dialog just
  // shows nothing to the admin.
  if (parsed.data.slug) {
    const [clash] = await db
      .select({ id: inspireTags.id })
      .from(inspireTags)
      .where(and(eq(inspireTags.slug, parsed.data.slug), ne(inspireTags.id, id)))
      .limit(1);
    if (clash) return { error: 'A tag with that slug already exists' };
  }

  await db.update(inspireTags).set(updateData).where(eq(inspireTags.id, id));

  logAuditEvent({
    entityType: 'inspire_tag',
    entityId: id,
    action: 'updated',
    performedBy: user.id,
    metadata: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      // Only recorded when it was actually part of the submission.
      ...(isHiddenSubmitted ? { isHidden: parsed.data.isHidden } : {}),
    },
  });

  revalidatePath('/admin/inspire/tags');
  revalidatePath('/artikel');
  revalidateTag(INSPIRE_TAGS_TAG, PURGE_IMMEDIATELY);
  updateTag(INSPIRE_TAGS_TAG);
  // Article cards display tag names — invalidate article caches too.
  revalidateTag('articles', PURGE_IMMEDIATELY);
  return { success: true };
}

export async function deleteTagAction(tagId: string) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  // Check if tag has articles assigned
  const [result] = await db
    .select({ count: count() })
    .from(articleTags)
    .where(eq(articleTags.tagId, tagId));

  if (result && result.count > 0) {
    return { error: `Cannot delete: ${result.count} article(s) are using this tag` };
  }

  await db.delete(inspireTags).where(eq(inspireTags.id, tagId));

  logAuditEvent({
    entityType: 'inspire_tag',
    entityId: tagId,
    action: 'deleted',
    performedBy: user.id,
  });

  revalidatePath('/admin/inspire/tags');
  revalidatePath('/artikel');
  revalidateTag(INSPIRE_TAGS_TAG, PURGE_IMMEDIATELY);
  updateTag(INSPIRE_TAGS_TAG);
  // Article cards display tag names — invalidate article caches too.
  revalidateTag('articles', PURGE_IMMEDIATELY);
  return { success: true };
}

/**
 * Manually flush the inspire caches. Needed when tag/article data is changed
 * outside the app (SQL migrations, backfills, bulk cleanups) — those bypass the
 * server actions above and so never fire revalidateTag themselves, leaving the
 * forever-cached (`revalidate = false`) /inspire pages stale.
 *
 * It flushes all THREE editor list caches, not just tags. This is the admin-facing
 * "flush inspire cache" button, and the article editor's category tree, tag
 * vocabulary and dynamic-block picker are now each served from a 300-second
 * `cachedJson` entry whose documented backstop for out-of-band edits is exactly
 * this action. Flushing only the tag cache would leave an admin who had just
 * fixed categories via SQL pressing the button, seeing "cache flushed", and
 * still being served the stale tree — and a stale category tree is not merely
 * cosmetic in the editor: it can silently drop an article's category on the next
 * autosave (see `resolveDegradedControls`).
 */
export async function flushInspireCacheAction() {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  revalidatePath('/admin/inspire/tags');
  revalidatePath('/artikel');
  revalidateTag(INSPIRE_TAGS_TAG, PURGE_IMMEDIATELY);
  updateTag(INSPIRE_TAGS_TAG);
  revalidateTag(INSPIRE_CATEGORIES_TAG, PURGE_IMMEDIATELY);
  updateTag(INSPIRE_CATEGORIES_TAG);
  revalidateTag(DYNAMIC_BLOCKS_TAG, PURGE_IMMEDIATELY);
  updateTag(DYNAMIC_BLOCKS_TAG);
  revalidateTag('articles', PURGE_IMMEDIATELY);

  logAuditEvent({
    entityType: 'inspire_tag',
    entityId: 'cache',
    action: 'cache_flushed',
    performedBy: user.id,
  });

  return { success: true };
}

// ── Tag Merge Analysis & Execution ──────────────────────────────────────────

export async function analyzeTagsForMergeAction() {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized', groups: [] };

  // Fetch all tags
  const allTags = await db
    .select({
      id: inspireTags.id,
      name: inspireTags.name,
      slug: inspireTags.slug,
      isHidden: inspireTags.isHidden,
    })
    .from(inspireTags);

  // Article counts per tag
  const articleCounts = await db
    .select({ tagId: articleTags.tagId, count: count() })
    .from(articleTags)
    .groupBy(articleTags.tagId);
  const articleCountMap = new Map(articleCounts.map((r) => [r.tagId, r.count]));

  // No vendor listings in HelloKahwin — tag counts are article counts only.
  const listingCountMap = new Map<string, number>();

  // Build tags with counts
  const tagsWithCounts: TagWithCounts[] = allTags.map((t) => ({
    ...t,
    articleCount: articleCountMap.get(t.id) ?? 0,
    listingCount: listingCountMap.get(t.slug) ?? 0,
  }));

  const groups = groupSimilarTags(tagsWithCounts);

  return { error: null, groups };
}

export interface MergeInstruction {
  winnerId: string;
  loserIds: string[];
}

export interface MergeSummary {
  groupsMerged: number;
  tagsRemoved: number;
  articlesReassigned: number;
  listingsUpdated: number;
  contentLinksPatched: number;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function escapeLike(s: string): string {
  return s.replace(/[%_\\]/g, '\\$&');
}

export async function executeTagMergeAction(
  mergeInstructions: MergeInstruction[],
): Promise<{ error: string | null; summary: MergeSummary }> {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user)
    return {
      error: authError ?? 'Unauthorized',
      summary: {
        groupsMerged: 0,
        tagsRemoved: 0,
        articlesReassigned: 0,
        listingsUpdated: 0,
        contentLinksPatched: 0,
      },
    };

  // F2: Server-side input validation
  for (const inst of mergeInstructions) {
    if (!UUID_RE.test(inst.winnerId)) {
      return {
        error: `Invalid winnerId: ${inst.winnerId}`,
        summary: {
          groupsMerged: 0,
          tagsRemoved: 0,
          articlesReassigned: 0,
          listingsUpdated: 0,
          contentLinksPatched: 0,
        },
      };
    }
    if (!Array.isArray(inst.loserIds) || inst.loserIds.length === 0) {
      return {
        error: 'Each merge group must have at least one loser tag',
        summary: {
          groupsMerged: 0,
          tagsRemoved: 0,
          articlesReassigned: 0,
          listingsUpdated: 0,
          contentLinksPatched: 0,
        },
      };
    }
    for (const id of inst.loserIds) {
      if (!UUID_RE.test(id)) {
        return {
          error: `Invalid loserId: ${id}`,
          summary: {
            groupsMerged: 0,
            tagsRemoved: 0,
            articlesReassigned: 0,
            listingsUpdated: 0,
            contentLinksPatched: 0,
          },
        };
      }
    }
    if (inst.loserIds.includes(inst.winnerId)) {
      return {
        error: 'winnerId must not be included in loserIds',
        summary: {
          groupsMerged: 0,
          tagsRemoved: 0,
          articlesReassigned: 0,
          listingsUpdated: 0,
          contentLinksPatched: 0,
        },
      };
    }
  }

  const summary: MergeSummary = {
    groupsMerged: 0,
    tagsRemoved: 0,
    articlesReassigned: 0,
    listingsUpdated: 0,
    contentLinksPatched: 0,
  };

  for (const instruction of mergeInstructions) {
    try {
      // F3: Accumulate per-group results inside transaction, only add to summary after commit
      const groupResult = await db.transaction(async (tx) => {
        // Fetch winner tag
        const [winner] = await tx
          .select({ id: inspireTags.id, name: inspireTags.name, slug: inspireTags.slug })
          .from(inspireTags)
          .where(eq(inspireTags.id, instruction.winnerId))
          .limit(1);
        if (!winner) throw new Error(`Winner tag ${instruction.winnerId} not found`);

        // Fetch loser tags
        const losers = await tx
          .select({ id: inspireTags.id, name: inspireTags.name, slug: inspireTags.slug })
          .from(inspireTags)
          .where(inArray(inspireTags.id, instruction.loserIds));
        if (losers.length === 0) throw new Error('No loser tags found');

        let groupArticlesReassigned = 0;
        let groupListingsUpdated = 0;
        let groupContentLinksPatched = 0;

        const slugReplacements = new Map<string, string>();
        for (const loser of losers) {
          slugReplacements.set(loser.slug, winner.slug);
        }

        for (const loser of losers) {
          // (a) Reassign article_tags
          const loserArticleTags = await tx
            .select({ id: articleTags.id, articleId: articleTags.articleId })
            .from(articleTags)
            .where(eq(articleTags.tagId, loser.id));

          for (const row of loserArticleTags) {
            // Check if winner already assigned to this article
            const [existing] = await tx
              .select({ id: articleTags.id })
              .from(articleTags)
              .where(
                and(eq(articleTags.articleId, row.articleId), eq(articleTags.tagId, winner.id)),
              )
              .limit(1);

            if (existing) {
              // Duplicate — delete the loser's row
              await tx.delete(articleTags).where(eq(articleTags.id, row.id));
            } else {
              // Reassign to winner
              await tx
                .update(articleTags)
                .set({ tagId: winner.id })
                .where(eq(articleTags.id, row.id));
              groupArticlesReassigned++;
            }
          }

          // (b) No vendor listings in HelloKahwin — nothing to re-tag here.
        }

        // (c) Patch article content — F6: escape LIKE wildcards in slug
        for (const loser of losers) {
          const safeSlug = escapeLike(loser.slug);
          const affectedArticles = await tx
            .select({ id: articles.id, content: articles.content })
            .from(articles)
            .where(
              // `/artikel/tag/…` — the public tag path in this app. Must stay in
              // step with TAG_SLUG_REGEX in lib/utils/tiptap-link-replacer.ts,
              // which is what actually rewrites the matched links; a mismatch
              // silently leaves dead links to the merged-away tag.
              sql`${articles.content}::text LIKE ${'%/artikel/tag/' + safeSlug + '%'} ESCAPE '\\'`,
            );

          for (const article of affectedArticles) {
            if (!article.content) continue;
            const { content: patchedContent, replacedCount } = replaceTagLinksInContent(
              article.content,
              slugReplacements,
            );
            if (replacedCount > 0) {
              await tx
                .update(articles)
                .set({ content: patchedContent, updatedAt: new Date() })
                .where(eq(articles.id, article.id));
              groupContentLinksPatched += replacedCount;
            }
          }
        }

        // (d) Delete loser tags (cascade cleans up any remaining article_tags)
        await tx.delete(inspireTags).where(inArray(inspireTags.id, instruction.loserIds));

        return {
          tagsRemoved: losers.length,
          articlesReassigned: groupArticlesReassigned,
          listingsUpdated: groupListingsUpdated,
          contentLinksPatched: groupContentLinksPatched,
          winner,
          losers,
        };
      });

      // F3: Only update summary after transaction committed successfully
      summary.groupsMerged++;
      summary.tagsRemoved += groupResult.tagsRemoved;
      summary.articlesReassigned += groupResult.articlesReassigned;
      summary.listingsUpdated += groupResult.listingsUpdated;
      summary.contentLinksPatched += groupResult.contentLinksPatched;

      // F4: Audit log moved outside transaction — only fires for committed merges
      logAuditEvent({
        entityType: 'inspire_tag_merge',
        entityId: groupResult.winner.id,
        action: 'merged',
        performedBy: user.id,
        metadata: {
          winnerTag: {
            id: groupResult.winner.id,
            name: groupResult.winner.name,
            slug: groupResult.winner.slug,
          },
          loserTags: groupResult.losers.map((l) => ({ id: l.id, name: l.name, slug: l.slug })),
          articlesReassigned: groupResult.articlesReassigned,
          listingsUpdated: groupResult.listingsUpdated,
          contentLinksPatched: groupResult.contentLinksPatched,
        },
      });
    } catch (err) {
      console.error(`[tag-merge] Failed to merge group (winner: ${instruction.winnerId}):`, err);
      // Continue with other groups — AC7: individual group failure doesn't block others
    }
  }

  revalidatePath('/admin/inspire/tags');
  revalidatePath('/artikel');
  revalidateTag(INSPIRE_TAGS_TAG, PURGE_IMMEDIATELY);
  updateTag(INSPIRE_TAGS_TAG);
  // Article cards display tag names — invalidate article caches too.
  revalidateTag('articles', PURGE_IMMEDIATELY);
  return { error: null, summary };
}
