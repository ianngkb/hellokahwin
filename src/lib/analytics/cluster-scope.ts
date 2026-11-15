import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';

/**
 * The two cluster reads the cluster analytics page needs, written against the
 * TABLES (`article_clusters`, `article_cluster_members`) rather than the
 * clusters admin's TypeScript helpers.
 *
 * WHY HERE. In The Wedding Notebook these live in `@/lib/inspire/clusters`
 * and `@/lib/inspire/article-series`. HelloKahwin's clusters/series port is
 * built in parallel with this analytics port, so this module depends only on
 * the table and column names TWN's migrations define (20261107175319 +
 * 20261109181637): `article_clusters (id, name, description, series_enabled)`
 * and `article_cluster_members (cluster_id, article_id, position, created_at,
 * id)`. If the series port renames any of them, this file is the one place to
 * follow. Once both have landed, these can be swapped for the clusters
 * module's own helpers.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The cache tag a cluster's analytics are stored under. The clusters admin
 * actions should `revalidateTag` it on every membership change (TWN does);
 * until they do, entries still expire on the 600 s timer.
 */
export function clusterAnalyticsTag(clusterId: string): string {
  return `cluster-analytics:${clusterId}`;
}

export interface ClusterMembersRead {
  id: string;
  name: string;
  seriesEnabled: boolean;
  /** Live (not deleted) members, in the cluster's order. */
  members: Array<{ articleId: string; slug: string; title: string }>;
}

/**
 * One cluster and its live members, in member order (position, then join
 * order). Null when the id is not a cluster. Soft-deleted articles are left
 * out, exactly as TWN's `getClusterWithMembers` does.
 */
export async function loadClusterMembers(clusterId: string): Promise<ClusterMembersRead | null> {
  if (!UUID_RE.test(clusterId)) return null;
  const rows = await db.execute<{
    id: string;
    name: string;
    series_enabled: boolean | null;
    article_id: string | null;
    slug: string | null;
    title: string | null;
  }>(sql`
    SELECT c.id::text AS id, c.name, c.series_enabled,
           a.id::text AS article_id, a.slug, a.title
    FROM article_clusters c
    LEFT JOIN article_cluster_members m ON m.cluster_id = c.id
    LEFT JOIN articles a ON a.id = m.article_id AND a.status <> 'deleted'
    WHERE c.id = ${clusterId}::uuid
    ORDER BY m.position ASC NULLS LAST, m.created_at ASC, m.id ASC
  `);
  const first = rows[0];
  if (!first) return null;
  return {
    id: first.id,
    name: first.name,
    seriesEnabled: first.series_enabled === true,
    members: rows.flatMap((r) =>
      r.article_id && r.slug
        ? [{ articleId: r.article_id, slug: r.slug, title: r.title ?? '' }]
        : [],
    ),
  };
}

/**
 * For each given article, the ONE reader-facing cluster whose Series box it
 * shows (TWN's rule R2): among the clusters it belongs to that are switched on
 * and have an intro written, the one it joined FIRST. Articles in no
 * reader-facing cluster get no entry. Used to stop two clusters claiming the
 * same box impressions.
 */
export async function getShownSeriesForArticles(
  articleIds: readonly string[],
): Promise<Map<string, { clusterId: string }>> {
  const ids = [...new Set(articleIds.filter((id) => UUID_RE.test(id)))];
  const out = new Map<string, { clusterId: string }>();
  if (ids.length === 0) return out;
  const rows = await db.execute<{ article_id: string; cluster_id: string }>(sql`
    SELECT DISTINCT ON (m.article_id) m.article_id::text AS article_id, c.id::text AS cluster_id
    FROM article_cluster_members m
    JOIN article_clusters c ON c.id = m.cluster_id
    WHERE m.article_id IN (${sql.join(
      ids.map((id) => sql`${id}::uuid`),
      sql`, `,
    )})
      AND c.series_enabled = TRUE
      AND NULLIF(btrim(c.description), '') IS NOT NULL
    ORDER BY m.article_id, m.created_at ASC, m.id ASC
  `);
  const byLower = new Map(ids.map((id) => [id.toLowerCase(), id]));
  for (const r of rows) {
    const original = byLower.get(r.article_id.toLowerCase());
    if (original) out.set(original, { clusterId: r.cluster_id });
  }
  return out;
}
