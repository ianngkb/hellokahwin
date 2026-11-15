'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod/v4';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { inspireTags } from '@/lib/db/schema/articles';
import { articleVersions } from '@/lib/db/schema/article-versions';
import { requireAdminSectionAction } from '@/lib/auth/admin';
import { logAuditEvent } from '@/lib/audit/log';
import {
  getArticleVersion,
  listArticleVersions,
  readCurrentSnapshot,
  readTagNames,
} from '@/lib/articles/versioning';
import {
  buildRestorePayload,
  compareSnapshots,
  contentToBlocks,
  countWords,
  diffBlocks,
  normaliseVersionLabel,
  snapshotFromRow,
  VERSION_LABEL_MAX,
  type FieldChange,
} from '@/lib/articles/version-snapshot';
import { updateArticleAction } from './actions';

/**
 * Server actions for the versions sheet (ported from The Wedding Notebook's
 * `version-actions.ts`). Kept out of `actions.ts` so the save path and the
 * history panel each have one file.
 *
 * Every action re-checks admin access with HelloKahwin's own guard, exactly as
 * the save actions do, and validates ids before they reach a uuid column.
 */

const uuid = z.string().uuid();

/** One row of the sheet. Dates are ISO strings — this crosses to the client. */
export interface VersionListEntry {
  id: string;
  versionNumber: number;
  actorType: 'human' | 'machine' | 'import';
  label: string | null;
  note: string | null;
  createdByLabel: string | null;
  createdAt: string;
  updatedAt: string;
  title: string;
}

export type ListVersionsResult =
  { error: string } | { success: true; versions: VersionListEntry[] };

export async function listVersionsAction(articleId: string): Promise<ListVersionsResult> {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };
  if (!uuid.safeParse(articleId).success) return { error: 'Invalid article ID' };

  try {
    const rows = await listArticleVersions(articleId);
    return {
      success: true as const,
      versions: rows.map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        actorType: v.actorType,
        label: v.label,
        note: v.note,
        createdByLabel: v.createdByLabel,
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString(),
        title: v.title,
      })),
    };
  } catch (err) {
    // Most likely before the history table exists (code shipped ahead of the
    // migration). The editor itself must keep working, so this is an error
    // state in the sheet, never a thrown action.
    console.error('[versions] list failed:', err);
    return { error: 'Could not load the version history.' };
  }
}

export interface VersionDetail {
  id: string;
  versionNumber: number;
  label: string | null;
  title: string;
  excerpt: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  coverImageUrl: string | null;
  tagNames: string[];
  /** The body as readable blocks (paragraphs, headings, list items). */
  blocks: string[];
  wordCount: number;
  /** Field-by-field differences from the article as it stands now. */
  changes: FieldChange[];
  /** Paragraph-level differences in the body. Capped for the wire. */
  onlyInVersion: string[];
  onlyInCurrent: string[];
  currentWordCount: number;
}

export type VersionDetailResult = { error: string } | { success: true; detail: VersionDetail };

const MAX_DIFF_BLOCKS = 40;

/**
 * Preview + compare for one version. Reads the full row (body included) only
 * when an admin asks for it — the list never does.
 */
export async function getVersionDetailAction(
  articleId: string,
  versionId: string,
): Promise<VersionDetailResult> {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };
  if (!uuid.safeParse(articleId).success || !uuid.safeParse(versionId).success) {
    return { error: 'Invalid ID' };
  }

  try {
    const row = await getArticleVersion(articleId, versionId);
    if (!row) return { error: 'That version no longer exists.' };
    const current = await readCurrentSnapshot(articleId);
    if (!current) return { error: 'Article not found' };

    const version = snapshotFromRow(row);
    const tagNames = await readTagNames([...version.tagIds, ...current.tagIds]);
    const blocks = contentToBlocks(version.content);
    const currentBlocks = contentToBlocks(current.content);
    const { onlyInVersion, onlyInCurrent } = diffBlocks(blocks, currentBlocks);

    return {
      success: true as const,
      detail: {
        id: row.id,
        versionNumber: row.versionNumber,
        label: row.label,
        title: version.title,
        excerpt: version.excerpt,
        metaTitle: version.metaTitle,
        metaDescription: version.metaDescription,
        coverImageUrl: version.coverImageUrl,
        tagNames: version.tagIds.map((id) => tagNames.get(id) ?? '(deleted tag)'),
        blocks,
        wordCount: countWords(blocks),
        changes: compareSnapshots(version, current, tagNames),
        onlyInVersion: onlyInVersion.slice(0, MAX_DIFF_BLOCKS),
        onlyInCurrent: onlyInCurrent.slice(0, MAX_DIFF_BLOCKS),
        currentWordCount: countWords(currentBlocks),
      },
    };
  } catch (err) {
    console.error('[versions] detail failed:', err);
    return { error: 'Could not load that version.' };
  }
}

export type RestoreVersionResult =
  { error: string } | { success: true; versionNumber: number; skippedTagCount: number };

/**
 * Restore a version by SAVING it through `updateArticleAction` — the same path
 * as the editor's Save button — rather than writing `articles` directly.
 *
 * That is the point: every HelloKahwin save rule applies to a restore exactly
 * as to a save. The blob-preview guard refuses an old body with a broken
 * upload in it; the Pinterest-board rule still holds for real weddings; the
 * cover's blur placeholder is rebuilt; the audit diff is written; caches are
 * busted for a published article. Slug, category, status, author and dates are
 * not in the payload, so a restore never moves the URL, never mints a
 * redirect, and never publishes or unpublishes.
 *
 * The capture trigger then records the restored state as a NEW version named
 * "Restored from vN" — so a restore is itself undoable from the same list.
 */
export async function restoreVersionAction(
  articleId: string,
  versionId: string,
): Promise<RestoreVersionResult> {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };
  if (!uuid.safeParse(articleId).success || !uuid.safeParse(versionId).success) {
    return { error: 'Invalid ID' };
  }

  let row;
  try {
    row = await getArticleVersion(articleId, versionId);
  } catch (err) {
    console.error('[versions] restore read failed:', err);
    return { error: 'Could not read that version. Nothing was changed.' };
  }
  if (!row) return { error: 'That version no longer exists. Nothing was changed.' };

  const snapshot = snapshotFromRow(row);
  const existing = snapshot.tagIds.length
    ? await db
        .select({ id: inspireTags.id })
        .from(inspireTags)
        .where(inArray(inspireTags.id, snapshot.tagIds))
    : [];
  const { data, skippedTagIds } = buildRestorePayload(snapshot, new Set(existing.map((t) => t.id)));

  let result: Awaited<ReturnType<typeof updateArticleAction>>;
  try {
    result = await updateArticleAction(articleId, data, {
      versionLabel: `Restored from v${row.versionNumber}`,
    });
  } catch (err) {
    console.error('[versions] restore save failed:', err);
    return { error: 'Could not restore that version. Nothing was changed.' };
  }
  if ('error' in result && result.error) {
    return { error: `Could not restore v${row.versionNumber}: ${result.error}` };
  }

  logAuditEvent({
    entityType: 'article',
    entityId: articleId,
    action: 'version_restored',
    performedBy: user.id,
    entityLabel: snapshot.title,
    metadata: { versionId, versionNumber: row.versionNumber, skippedTagIds },
  });

  return {
    success: true as const,
    versionNumber: row.versionNumber,
    skippedTagCount: skippedTagIds.length,
  };
}

export type RenameVersionResult = { error: string } | { success: true; label: string | null };

/**
 * Rename a version. Touches only the version row — renaming is not an edit of
 * the article, so it must not go through the save path, bump "Last updated"
 * or bust a public cache. Scoped to the article so a crafted call cannot
 * rename another article's history.
 */
export async function renameVersionAction(
  articleId: string,
  versionId: string,
  label: string,
): Promise<RenameVersionResult> {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };
  if (!uuid.safeParse(articleId).success || !uuid.safeParse(versionId).success) {
    return { error: 'Invalid ID' };
  }
  if (typeof label !== 'string' || label.trim().length > VERSION_LABEL_MAX) {
    return { error: `A version name is limited to ${VERSION_LABEL_MAX} characters.` };
  }
  const next = normaliseVersionLabel(label);

  const [updated] = await db
    .update(articleVersions)
    .set({ label: next })
    .where(and(eq(articleVersions.id, versionId), eq(articleVersions.articleId, articleId)))
    .returning({ versionNumber: articleVersions.versionNumber });
  if (!updated) return { error: 'That version no longer exists. Reload the list.' };

  logAuditEvent({
    entityType: 'article',
    entityId: articleId,
    action: 'version_renamed',
    performedBy: user.id,
    metadata: { versionId, versionNumber: updated.versionNumber, label: next },
  });

  revalidatePath(`/admin/inspire/${articleId}/edit`);
  return { success: true as const, label: next };
}
