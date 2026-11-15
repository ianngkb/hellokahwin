'use server';

import { revalidatePath, revalidateTag, updateTag } from 'next/cache';
import { and, count, desc, eq, ilike, inArray, ne, sql } from 'drizzle-orm';
import { z } from 'zod/v4';
import { db } from '@/lib/db/drizzle';
import { articles } from '@/lib/db/schema/articles';
import { articleClusterMembers, articleClusters } from '@/lib/db/schema/article-clusters';
import { requireAdminSectionAction } from '@/lib/auth/admin';
import { logAuditEvent } from '@/lib/audit/log';
import { diffFields } from '@/lib/audit/diff';
import { PURGE_IMMEDIATELY } from '@/lib/cache/purge';
import { clusterAnalyticsTag, getClusters } from '@/lib/inspire/clusters';
import {
  getArticleClusterMemberships,
  type ArticleClusterMembership,
} from '@/lib/inspire/article-series';
import type { ArticleStatus } from '@/lib/constants';
import {
  MAX_CLUSTER_MEMBERS,
  clusterAddMembersSchema,
  clusterCreateSchema,
  clusterIdSchema,
  clusterMemberSchema,
  clusterRenameSchema,
  clusterReorderSchema,
  clusterSeriesSettingsSchema,
} from '@/lib/validations/article-cluster';

/**
 * The clusters admin (`/admin/inspire/clusters`): hand-picked, ordered groups
 * of articles that can be shown to readers as a "series". Ported from The
 * Wedding Notebook.
 *
 * Every action is behind the `inspire` admin section, validates its input with
 * zod, writes an `article_cluster` audit row, and revalidates the list, the
 * cluster's own pages and its `cluster-analytics:<id>` cache tag.
 *
 * Every write to an existing cluster (rename, add, remove, reorder, settings)
 * runs in one transaction that first locks the cluster row (`SELECT … FOR
 * UPDATE`), so two admins (or two tabs) changing the same cluster go one after
 * the other and each sees the other's committed change. Audit rows and cache
 * revalidation happen only after the commit, and revalidation is best-effort:
 * a cache hiccup never turns a saved change into a reported failure (which
 * would invite a duplicate retry).
 *
 * The 50-article cap counts the members an admin can SEE — the same set every
 * read in `@/lib/inspire/clusters` shows (article not soft-deleted).
 *
 * ── No public page refresh (yet) ──────────────────────────────────────
 * In TWN a switched-on cluster renders a Series box on each member's public
 * page, so every write there also refreshes those pages. HelloKahwin does not
 * render the box yet (`SERIES_BOX_ON_SITE` is false), so there is no public
 * page whose content depends on a cluster, and these actions refresh admin
 * screens only. The change that ships the public box MUST add the per-member
 * refresh here (members before ∪ after, only when the cluster is on before or
 * after) — see TWN's `revalidateSeriesMembers`.
 */

export type ClusterActionResult = { success: true } | { error: string };

/** One staged article the batch add could not add, and why (shown to the admin). */
export interface ClusterAddFailure {
  articleId: string;
  error: string;
}

/**
 * The batch add's answer. `{ error }` is a cluster-wide refusal (not allowed,
 * cluster gone, bad input, database down) — nothing was added. Otherwise
 * `added` landed (in the order given) and `failed` did not, each with its reason.
 */
export type ClusterAddMembersResult =
  { success: true; added: string[]; failed: ClusterAddFailure[] } | { error: string };

/** One article as the cluster editor's picker shows it. */
export interface ClusterPickerArticle {
  id: string;
  title: string;
  status: string;
}

/** Everything the article editor's Series panel needs, in one call. */
export interface ArticleSeriesPanelData {
  memberships: ArticleClusterMembership[];
  clusters: { id: string; name: string; seriesEnabled: boolean; memberCount: number }[];
}

// Not exported: a 'use server' file may only export async functions.
const ALREADY_IN_CLUSTER = 'Already in this cluster';
const ARTICLE_GONE = 'That article no longer exists.';
const CLUSTER_GONE = 'This cluster no longer exists — reload the page.';
const STALE_ORDER = 'The article list is out of date — reload the page and try again.';
const FULL = `A cluster can hold up to ${MAX_CLUSTER_MEMBERS} articles`;
/** `article_clusters.slug` is UNIQUE; 23505 is the only way an admin meets it. */
const DUPLICATE_SLUG = 'Another cluster already uses that web address name';
/** The picker's search term cap, in characters (matches the homepage picker). */
const PICKER_MAX_TERM_CHARS = 120;
const PICKER_RESULT_LIMIT = 20;

const LIST_PATH = '/admin/inspire/clusters';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Thrown inside the reorder transaction to roll it back as "stale". */
class StaleOrderError extends Error {}

function hasPgCode(err: unknown, code: string): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === code || e?.cause?.code === code;
}

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? 'Invalid input';
}

/**
 * Refresh everything that shows this cluster. `updateTag` gives the admin
 * read-your-own-writes (server actions only); `revalidateTag` with
 * `PURGE_IMMEDIATELY` covers every other cached copy.
 *
 * Called only AFTER the write has committed, and never throws.
 */
function revalidateCluster(clusterId?: string) {
  try {
    revalidatePath(LIST_PATH);
    if (!clusterId) return;
    revalidatePath(`${LIST_PATH}/${clusterId}`);
    revalidatePath(`${LIST_PATH}/${clusterId}/analytics`);
    const tag = clusterAnalyticsTag(clusterId);
    revalidateTag(tag, PURGE_IMMEDIATELY);
    updateTag(tag);
  } catch (err) {
    console.error('[clusters] revalidation failed after a saved change:', err);
  }
}

/**
 * Locks the cluster row for the rest of the transaction. Empty when it is gone.
 * One lock helper, so no write can take a weaker lock than its siblings.
 */
function lockCluster(tx: Tx, clusterId: string) {
  return tx
    .select({
      id: articleClusters.id,
      name: articleClusters.name,
      slug: articleClusters.slug,
      description: articleClusters.description,
      eyebrow: articleClusters.eyebrow,
      seriesEnabled: articleClusters.seriesEnabled,
    })
    .from(articleClusters)
    .where(eq(articleClusters.id, clusterId))
    .for('update');
}

/** Creates an empty cluster (series box off — the column default). */
export async function createClusterAction(input: {
  name: string;
}): Promise<{ success: true; id: string } | { error: string }> {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  const parsed = clusterCreateSchema.safeParse({ name: input?.name });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  let row: { id: string; name: string } | undefined;
  try {
    [row] = await db
      .insert(articleClusters)
      .values({ name: parsed.data.name, slug: parsed.data.slug ?? null })
      .returning({ id: articleClusters.id, name: articleClusters.name });
  } catch (err) {
    console.error('[clusters] create failed:', err);
    return { error: 'Could not create the cluster — please try again.' };
  }
  if (!row) return { error: 'Could not create the cluster — please try again.' };

  logAuditEvent({
    entityType: 'article_cluster',
    entityId: row.id,
    entityLabel: row.name,
    action: 'created',
    performedBy: user.id,
  });
  revalidateCluster(row.id);
  return { success: true, id: row.id };
}

/**
 * Renames the cluster. The old name is read under the cluster row's lock, so
 * a second rename racing this one waits, then sees (and audits) THIS rename's
 * name as its "old" value. The name IS the series heading readers see.
 */
export async function renameClusterAction(input: {
  id: string;
  name: string;
}): Promise<ClusterActionResult> {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  const parsed = clusterRenameSchema.safeParse({ id: input?.id, name: input?.name });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { id, name } = parsed.data;

  let outcome: { kind: 'gone' } | { kind: 'unchanged' } | { kind: 'renamed'; oldName: string };
  try {
    outcome = await db.transaction(async (tx) => {
      const [before] = await lockCluster(tx, id);
      if (!before) return { kind: 'gone' as const };
      if (before.name === name) return { kind: 'unchanged' as const };

      await tx
        .update(articleClusters)
        .set({ name, updatedAt: new Date() })
        .where(eq(articleClusters.id, id));
      return { kind: 'renamed' as const, oldName: before.name };
    });
  } catch (err) {
    console.error('[clusters] rename failed:', err);
    return { error: 'Could not rename the cluster — please try again.' };
  }

  if (outcome.kind === 'gone') return { error: CLUSTER_GONE };
  if (outcome.kind === 'unchanged') return { success: true };

  logAuditEvent({
    entityType: 'article_cluster',
    entityId: id,
    entityLabel: name,
    action: 'updated',
    performedBy: user.id,
    changes: { name: { old: outcome.oldName, new: name } },
  });
  revalidateCluster(id);
  return { success: true };
}

/**
 * Deletes the cluster. Its membership rows go with it (FK cascade); the
 * articles themselves are not touched. Deleting a cluster that is already
 * gone (a double click, a second tab) succeeds without a second audit row.
 */
export async function deleteClusterAction(clusterId: string): Promise<ClusterActionResult> {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  const parsed = clusterIdSchema.safeParse(clusterId);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const id = parsed.data;

  let row: { id: string; name: string } | undefined;
  try {
    [row] = await db
      .delete(articleClusters)
      .where(eq(articleClusters.id, id))
      .returning({ id: articleClusters.id, name: articleClusters.name });
  } catch (err) {
    console.error('[clusters] delete failed:', err);
    return { error: 'Could not delete the cluster — please try again.' };
  }

  if (row) {
    logAuditEvent({
      entityType: 'article_cluster',
      entityId: id,
      entityLabel: row.name,
      action: 'deleted',
      performedBy: user.id,
    });
  }
  revalidateCluster(id);
  return { success: true };
}

/**
 * Adds several articles to the end of the cluster, in the order given, in ONE
 * transaction with ONE revalidation afterwards.
 *
 * Under the cluster row's lock it reads, once each: the picked articles
 * (`FOR SHARE`, so a soft-delete racing this add waits until we commit), which
 * of them are already members, the VISIBLE member count and the last position.
 * Then each pick, in order, is either added or refused with its own reason:
 *
 *   - the article is gone or soft-deleted → "That article no longer exists."
 *   - it is already a member → "Already in this cluster" (checked BEFORE the
 *     cap, so a duplicate on a full cluster still says what it is)
 *   - the cluster has no room left → the 50-article cap message.
 *
 * Refusals are per article and never undo the others.
 */
export async function addClusterMembersAction(input: {
  clusterId: string;
  articleIds: string[];
}): Promise<ClusterAddMembersResult> {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  const parsed = clusterAddMembersSchema.safeParse({
    clusterId: input?.clusterId,
    articleIds: input?.articleIds,
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { clusterId, articleIds } = parsed.data;

  type Added = { articleId: string; title: string };
  let outcome:
    | { kind: 'gone' }
    | { kind: 'done'; clusterName: string; added: Added[]; failed: ClusterAddFailure[] };
  try {
    outcome = await db.transaction(async (tx) => {
      const [cluster] = await lockCluster(tx, clusterId);
      if (!cluster) return { kind: 'gone' as const };

      const found = await tx
        .select({ id: articles.id, title: articles.title, status: articles.status })
        .from(articles)
        .where(inArray(articles.id, articleIds))
        .for('share');
      const byId = new Map(found.map((a) => [a.id, a]));

      // ANY membership row, visible or not: re-adding an article whose old row
      // is still there would hit the unique key, so it is "already in".
      const existing = await tx
        .select({ articleId: articleClusterMembers.articleId })
        .from(articleClusterMembers)
        .where(
          and(
            eq(articleClusterMembers.clusterId, clusterId),
            inArray(articleClusterMembers.articleId, articleIds),
          ),
        );
      const already = new Set(existing.map((r) => r.articleId));

      // The cap counts what the editor shows: members whose article is live.
      const [size] = await tx
        .select({ n: count() })
        .from(articleClusterMembers)
        .innerJoin(articles, eq(articles.id, articleClusterMembers.articleId))
        .where(
          and(
            eq(articleClusterMembers.clusterId, clusterId),
            ne(articles.status, 'deleted' as ArticleStatus),
          ),
        );

      // After the current last member (hidden ones included, so positions
      // never collide with a row that might come back).
      const [last] = await tx
        .select({
          max: sql<number>`coalesce(max(${articleClusterMembers.position}), -1)`.mapWith(Number),
        })
        .from(articleClusterMembers)
        .where(eq(articleClusterMembers.clusterId, clusterId));

      let room = MAX_CLUSTER_MEMBERS - Number(size?.n ?? 0);
      let next = Number(last?.max ?? -1) + 1;
      const failed: ClusterAddFailure[] = [];
      const rows: { clusterId: string; articleId: string; position: number }[] = [];
      const titles = new Map<string, string>();

      for (const articleId of articleIds) {
        const article = byId.get(articleId);
        if (!article || article.status === ('deleted' as ArticleStatus)) {
          failed.push({ articleId, error: ARTICLE_GONE });
        } else if (already.has(articleId)) {
          failed.push({ articleId, error: ALREADY_IN_CLUSTER });
        } else if (room <= 0) {
          failed.push({ articleId, error: FULL });
        } else {
          rows.push({ clusterId, articleId, position: next++ });
          titles.set(articleId, article.title);
          room--;
        }
      }

      let inserted: { articleId: string }[] = [];
      if (rows.length > 0) {
        inserted = await tx
          .insert(articleClusterMembers)
          .values(rows)
          // Cannot fire under the lock (we just checked); kept so a duplicate
          // is never a 500.
          .onConflictDoNothing({
            target: [articleClusterMembers.clusterId, articleClusterMembers.articleId],
          })
          .returning({ articleId: articleClusterMembers.articleId });
      }
      const landed = new Set(inserted.map((r) => r.articleId));
      for (const r of rows) {
        if (!landed.has(r.articleId)) {
          failed.push({ articleId: r.articleId, error: ALREADY_IN_CLUSTER });
        }
      }

      return {
        kind: 'done' as const,
        clusterName: cluster.name,
        added: rows
          .filter((r) => landed.has(r.articleId))
          .map((r) => ({ articleId: r.articleId, title: titles.get(r.articleId) ?? '' })),
        // Back in the order the admin picked them.
        failed: articleIds.flatMap((id) => failed.filter((f) => f.articleId === id)),
      };
    });
  } catch (err) {
    // Belt and braces: ON CONFLICT already absorbs the duplicate, but a
    // constraint renamed under the target would surface as a raw 23505.
    if (hasPgCode(err, '23505')) return { error: ALREADY_IN_CLUSTER };
    // An article or the cluster was hard-deleted between the checks and the insert.
    if (hasPgCode(err, '23503')) return { error: 'That article or cluster no longer exists.' };
    console.error('[clusters] add members failed:', err);
    return { error: 'Could not add the articles — please try again.' };
  }

  if (outcome.kind === 'gone') return { error: CLUSTER_GONE };

  for (const a of outcome.added) {
    logAuditEvent({
      entityType: 'article_cluster',
      entityId: clusterId,
      entityLabel: outcome.clusterName,
      action: 'cluster_member_added',
      performedBy: user.id,
      metadata: { articleId: a.articleId, articleTitle: a.title },
    });
  }
  if (outcome.added.length > 0) revalidateCluster(clusterId);
  return {
    success: true,
    added: outcome.added.map((a) => a.articleId),
    failed: outcome.failed,
  };
}

/**
 * Adds one article at the end of the cluster — the batch add with one pick.
 * Used by the article editor's Series panel.
 */
export async function addClusterMemberAction(input: {
  clusterId: string;
  articleId: string;
}): Promise<ClusterActionResult> {
  const parsed = clusterMemberSchema.safeParse({
    clusterId: input?.clusterId,
    articleId: input?.articleId,
  });
  if (!parsed.success) {
    // Auth first, exactly like every other action: a non-admin learns nothing
    // about the input.
    const { error: authError, user } = await requireAdminSectionAction('inspire');
    if (authError || !user) return { error: authError ?? 'Unauthorized' };
    return { error: firstIssue(parsed.error) };
  }

  const result = await addClusterMembersAction({
    clusterId: parsed.data.clusterId,
    articleIds: [parsed.data.articleId],
  });
  if ('error' in result) return { error: result.error };
  if (result.failed.length > 0) return { error: result.failed[0]!.error };
  return { success: true };
}

/**
 * Removes one article from the cluster (the article itself is untouched).
 * Takes the same cluster lock as reorder and add. Removing one that is not a
 * member any more succeeds without an audit row.
 */
export async function removeClusterMemberAction(input: {
  clusterId: string;
  articleId: string;
}): Promise<ClusterActionResult> {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  const parsed = clusterMemberSchema.safeParse({
    clusterId: input?.clusterId,
    articleId: input?.articleId,
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { clusterId, articleId } = parsed.data;

  let outcome: { kind: 'gone' } | { kind: 'done'; clusterName: string; removed: boolean };
  try {
    outcome = await db.transaction(async (tx) => {
      const [cluster] = await lockCluster(tx, clusterId);
      if (!cluster) return { kind: 'gone' as const };

      const removed = await tx
        .delete(articleClusterMembers)
        .where(
          and(
            eq(articleClusterMembers.clusterId, clusterId),
            eq(articleClusterMembers.articleId, articleId),
          ),
        )
        .returning({ id: articleClusterMembers.id });
      return { kind: 'done' as const, clusterName: cluster.name, removed: removed.length > 0 };
    });
  } catch (err) {
    console.error('[clusters] remove member failed:', err);
    return { error: 'Could not remove the article — please try again.' };
  }

  if (outcome.kind === 'gone') return { error: CLUSTER_GONE };
  if (outcome.removed) {
    logAuditEvent({
      entityType: 'article_cluster',
      entityId: clusterId,
      entityLabel: outcome.clusterName,
      action: 'cluster_member_removed',
      performedBy: user.id,
      metadata: { articleId },
    });
  }
  revalidateCluster(clusterId);
  return { success: true };
}

/**
 * Saves a new member order. `orderedArticleIds` must be exactly the cluster's
 * VISIBLE members. A list from a stale page is refused rather than applied
 * partially. Every renumbering UPDATE must hit exactly one row; if one does
 * not, the whole transaction rolls back and the list is reported out of date.
 */
export async function reorderClusterMembersAction(input: {
  clusterId: string;
  orderedArticleIds: string[];
}): Promise<ClusterActionResult> {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  const parsed = clusterReorderSchema.safeParse({
    clusterId: input?.clusterId,
    orderedArticleIds: input?.orderedArticleIds,
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { clusterId, orderedArticleIds } = parsed.data;

  let outcome: { kind: 'gone' } | { kind: 'stale' } | { kind: 'done'; clusterName: string };
  try {
    outcome = await db.transaction(async (tx) => {
      const [cluster] = await lockCluster(tx, clusterId);
      if (!cluster) return { kind: 'gone' as const };

      const current = await tx
        .select({ articleId: articleClusterMembers.articleId })
        .from(articleClusterMembers)
        .innerJoin(articles, eq(articles.id, articleClusterMembers.articleId))
        .where(
          and(
            eq(articleClusterMembers.clusterId, clusterId),
            ne(articles.status, 'deleted' as ArticleStatus),
          ),
        );

      const currentIds = new Set(current.map((r) => r.articleId));
      const submitted = new Set(orderedArticleIds);
      const stale =
        currentIds.size !== submitted.size ||
        orderedArticleIds.length !== submitted.size ||
        orderedArticleIds.some((id) => !currentIds.has(id));
      if (stale) return { kind: 'stale' as const };

      for (let i = 0; i < orderedArticleIds.length; i++) {
        const hit = await tx
          .update(articleClusterMembers)
          .set({ position: i })
          .where(
            and(
              eq(articleClusterMembers.clusterId, clusterId),
              eq(articleClusterMembers.articleId, orderedArticleIds[i]!),
            ),
          )
          .returning({ id: articleClusterMembers.id });
        // Throwing rolls back every position already written.
        if (hit.length !== 1) throw new StaleOrderError();
      }
      return { kind: 'done' as const, clusterName: cluster.name };
    });
  } catch (err) {
    if (err instanceof StaleOrderError) return { error: STALE_ORDER };
    console.error('[clusters] reorder failed:', err);
    return { error: 'Could not save the new order — please try again.' };
  }

  if (outcome.kind === 'gone') return { error: CLUSTER_GONE };
  if (outcome.kind === 'stale') return { error: STALE_ORDER };

  logAuditEvent({
    entityType: 'article_cluster',
    entityId: clusterId,
    entityLabel: outcome.clusterName,
    action: 'reordered',
    performedBy: user.id,
    metadata: { orderedArticleIds },
  });
  revalidateCluster(clusterId);
  return { success: true };
}

/**
 * Saves the cluster's reader-facing "Series box" settings: the intro text, the
 * optional small label above the title, the web address name (slug) and the
 * on/off switch. The heading is the cluster's `name`, saved by
 * `renameClusterAction`.
 *
 *   · Validation first: the switch cannot be turned on while the intro is
 *     blank — refused with the next thing to do, and NOTHING is written.
 *   · One transaction holding the cluster row's lock, so two admins saving at
 *     once go one after the other and each audits the other's committed values
 *     as its "old" ones.
 *   · ONE `article_cluster` / `updated` audit row listing only the fields that
 *     really moved. Written after the commit, like every other action here
 *     (HK's `logAuditEvent`; TWN writes this one inside the transaction with a
 *     helper HelloKahwin does not have). A save that changes nothing writes and
 *     audits nothing.
 *   · A web address name another cluster already uses (23505) comes back as a
 *     sentence an admin can act on, never a 500.
 */
export async function updateClusterSeriesAction(input: {
  id: string;
  description: string;
  eyebrow: string;
  slug: string;
  seriesEnabled: boolean;
}): Promise<ClusterActionResult> {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  const parsed = clusterSeriesSettingsSchema.safeParse({
    id: input?.id,
    description: input?.description,
    eyebrow: input?.eyebrow,
    slug: input?.slug,
    seriesEnabled: input?.seriesEnabled,
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { id, description, eyebrow, slug, seriesEnabled } = parsed.data;

  let outcome:
    | { kind: 'gone' }
    | { kind: 'unchanged' }
    | { kind: 'saved'; name: string; changes: NonNullable<ReturnType<typeof diffFields>> };
  try {
    outcome = await db.transaction(async (tx) => {
      const [before] = await lockCluster(tx, id);
      if (!before) return { kind: 'gone' as const };

      // Plain-language keys, not column names: these land in the activity
      // feed, where an admin reads them.
      const changes = diffFields(
        {
          introText: before.description,
          smallLabel: before.eyebrow,
          webAddressName: before.slug,
          seriesBoxShownToReaders: before.seriesEnabled,
        },
        {
          introText: description,
          smallLabel: eyebrow,
          webAddressName: slug,
          seriesBoxShownToReaders: seriesEnabled,
        },
      );
      if (!changes) return { kind: 'unchanged' as const };

      await tx
        .update(articleClusters)
        .set({ description, eyebrow, slug, seriesEnabled, updatedAt: new Date() })
        .where(eq(articleClusters.id, id));

      return { kind: 'saved' as const, name: before.name, changes };
    });
  } catch (err) {
    // `article_clusters.slug` is UNIQUE. Checking first would still race, so
    // the constraint is the check and this is its message.
    if (hasPgCode(err, '23505')) return { error: DUPLICATE_SLUG };
    console.error('[clusters] series settings save failed:', err);
    return { error: 'Could not save the series settings — please try again.' };
  }

  if (outcome.kind === 'gone') return { error: CLUSTER_GONE };
  if (outcome.kind === 'unchanged') return { success: true };

  logAuditEvent({
    entityType: 'article_cluster',
    entityId: id,
    entityLabel: outcome.name,
    action: 'updated',
    performedBy: user.id,
    changes: outcome.changes,
  });
  revalidateCluster(id);
  return { success: true };
}

/**
 * Title search for the cluster editor's "Add articles" picker. Any status but
 * soft-deleted (a cluster may be built ahead of publishing), newest first,
 * capped at 20. The term is capped at 120 characters and its LIKE wildcards
 * are escaped, so what the admin typed is what is matched.
 */
export async function searchClusterArticlesAction(
  query: string,
): Promise<{ articles: ClusterPickerArticle[] } | { error: string }> {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  const term = Array.from(typeof query === 'string' ? query.trim() : '')
    .slice(0, PICKER_MAX_TERM_CHARS)
    .join('');
  if (Array.from(term).length < 2) return { articles: [] };
  const escaped = term.replace(/[\\%_]/g, '\\$&');

  try {
    const rows = await db
      .select({
        id: articles.id,
        title: articles.title,
        status: articles.status,
        scheduledPublishAt: articles.scheduledPublishAt,
      })
      .from(articles)
      .where(
        and(ne(articles.status, 'deleted' as ArticleStatus), ilike(articles.title, `%${escaped}%`)),
      )
      .orderBy(desc(articles.updatedAt), desc(articles.id))
      .limit(PICKER_RESULT_LIMIT);
    return {
      articles: rows.map((r) => ({
        id: r.id,
        title: r.title,
        status: r.status === 'draft' && r.scheduledPublishAt ? 'scheduled' : r.status,
      })),
    };
  } catch (err) {
    console.error('[clusters] article search failed:', err);
    return { error: 'Could not search articles — please try again.' };
  }
}

/**
 * Everything the article editor's **Series** panel needs, in one call.
 *
 * Read by the panel ITSELF, on mount — deliberately NOT by the edit page's
 * server render and NOT part of the article save payload: a slow or broken
 * series read can never delay the editor opening or degrade the save, and
 * membership is saved the moment it is picked (through the actions above),
 * so the 60-second autosave never rewrites it.
 *
 * `{ error }` on any failure, which the panel shows as its own "couldn't load"
 * state.
 */
export async function getArticleSeriesPanelAction(
  articleId: string,
): Promise<ArticleSeriesPanelData | { error: string }> {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  const parsed = z.string().uuid().safeParse(articleId);
  if (!parsed.success) return { error: 'Invalid article ID' };

  try {
    // Two independent reads, in parallel: this article's memberships and the
    // full cluster list for the picker. Each is one statement.
    const [memberships, clusters] = await Promise.all([
      getArticleClusterMemberships(parsed.data),
      getClusters(),
    ]);
    return {
      memberships,
      clusters: clusters.map((c) => ({
        id: c.id,
        name: c.name,
        seriesEnabled: c.seriesEnabled,
        memberCount: c.memberCount,
      })),
    };
  } catch (err) {
    console.error('[clusters] series panel read failed for article', articleId, err);
    return { error: "Couldn't load series — refresh to try again" };
  }
}
