import { and, asc, count, eq, ne, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { articles, inspireCategories } from '@/lib/db/schema/articles';
import { articleClusterMembers, articleClusters } from '@/lib/db/schema/article-clusters';
import type { ArticleStatus } from '@/lib/constants';

/**
 * Reads for hand-picked article clusters (`/admin/inspire/clusters`, its
 * editor, and the article editor's Series panel). Writes live in the clusters
 * admin actions. Ported from The Wedding Notebook.
 *
 * A soft-deleted article (`status = 'deleted'`, which is what the admin
 * "delete" does) keeps its membership row — no cascade fires — so both reads
 * hide it: it is neither counted nor listed. A hard delete removes the row
 * through the FK cascade.
 */

/**
 * The cache tag every cached cluster-analytics read carries. The clusters
 * admin actions revalidate it on any change to a cluster, so the analytics
 * page never shows a stale member list.
 */
export function clusterAnalyticsTag(clusterId: string): string {
  return `cluster-analytics:${clusterId}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ClusterSummary {
  id: string;
  name: string;
  slug: string | null;
  /** The reader-facing Series box: intro, optional small label, and the switch. */
  description: string | null;
  eyebrow: string | null;
  seriesEnabled: boolean;
  /** Members whose article is not soft-deleted. */
  memberCount: number;
  createdAt: Date;
}

export interface ClusterMember {
  /** The membership row's id. */
  memberId: string;
  articleId: string;
  title: string;
  slug: string;
  status: ArticleStatus;
  /** A scheduled article is a draft with this set; the editor shows "Scheduled". */
  scheduledPublishAt: Date | null;
  /** Primary category slug — the `/artikel/<category>/<slug>` segment. Null if unset. */
  categorySlug: string | null;
  position: number;
}

export interface ClusterWithMembers {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  eyebrow: string | null;
  seriesEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  /** In `position` order (ties: oldest membership first). */
  members: ClusterMember[];
}

/** Every cluster with its live member count, alphabetical by name. */
export async function getClusters(): Promise<ClusterSummary[]> {
  const counts = db
    .select({
      clusterId: articleClusterMembers.clusterId,
      n: count().as('n'),
    })
    .from(articleClusterMembers)
    .innerJoin(articles, eq(articles.id, articleClusterMembers.articleId))
    .where(ne(articles.status, 'deleted' as ArticleStatus))
    .groupBy(articleClusterMembers.clusterId)
    .as('counts');

  const rows = await db
    .select({
      id: articleClusters.id,
      name: articleClusters.name,
      slug: articleClusters.slug,
      description: articleClusters.description,
      eyebrow: articleClusters.eyebrow,
      seriesEnabled: articleClusters.seriesEnabled,
      createdAt: articleClusters.createdAt,
      memberCount: sql<number>`coalesce(${counts.n}, 0)`.mapWith(Number),
    })
    .from(articleClusters)
    .leftJoin(counts, eq(counts.clusterId, articleClusters.id))
    .orderBy(asc(articleClusters.name), asc(articleClusters.id));

  return rows.map((r) => ({ ...r, memberCount: Number(r.memberCount) || 0 }));
}

/**
 * One cluster and its members in `position` order, or null when the id is not
 * a uuid (no query is sent — Postgres would reject the cast) or no such
 * cluster exists.
 *
 * ONE statement, so the cluster and its member list come from the same
 * snapshot. The cluster is the outer row; each membership is LEFT JOINed onto
 * it, so an empty cluster still yields one row (member columns null). The
 * soft-delete filter sits in the article join's ON clause, not WHERE, so a
 * cluster whose only members are soft-deleted still comes back (empty) instead
 * of looking missing; those rows arrive with a null article and are dropped.
 */
export async function getClusterWithMembers(id: string): Promise<ClusterWithMembers | null> {
  if (!UUID_RE.test(id)) return null;

  const rows = await db
    .select({
      id: articleClusters.id,
      name: articleClusters.name,
      slug: articleClusters.slug,
      description: articleClusters.description,
      eyebrow: articleClusters.eyebrow,
      seriesEnabled: articleClusters.seriesEnabled,
      createdAt: articleClusters.createdAt,
      updatedAt: articleClusters.updatedAt,
      memberId: articleClusterMembers.id,
      articleId: articles.id,
      title: articles.title,
      articleSlug: articles.slug,
      status: articles.status,
      scheduledPublishAt: articles.scheduledPublishAt,
      categorySlug: inspireCategories.slug,
      position: articleClusterMembers.position,
    })
    .from(articleClusters)
    .leftJoin(articleClusterMembers, eq(articleClusterMembers.clusterId, articleClusters.id))
    .leftJoin(
      articles,
      and(
        eq(articles.id, articleClusterMembers.articleId),
        ne(articles.status, 'deleted' as ArticleStatus),
      ),
    )
    .leftJoin(inspireCategories, eq(inspireCategories.id, articles.primaryCategoryId))
    .where(eq(articleClusters.id, id))
    .orderBy(
      asc(articleClusterMembers.position),
      asc(articleClusterMembers.createdAt),
      asc(articleClusterMembers.id),
    );

  const first = rows[0];
  if (!first) return null;

  const members: ClusterMember[] = [];
  for (const r of rows) {
    // No membership (empty cluster), or its article is soft-deleted.
    if (r.memberId === null || r.articleId === null) continue;
    members.push({
      memberId: r.memberId,
      articleId: r.articleId,
      title: r.title ?? '',
      slug: r.articleSlug ?? '',
      status: r.status as ArticleStatus,
      scheduledPublishAt: r.scheduledPublishAt ?? null,
      categorySlug: r.categorySlug ?? null,
      position: r.position ?? 0,
    });
  }

  return {
    id: first.id,
    name: first.name,
    slug: first.slug,
    description: first.description,
    eyebrow: first.eyebrow,
    seriesEnabled: first.seriesEnabled,
    createdAt: first.createdAt,
    updatedAt: first.updatedAt,
    members,
  };
}
