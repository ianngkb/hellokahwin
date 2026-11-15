import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';

/**
 * The two cluster reads the cluster analytics page needs, written as raw SQL
 * against the clusters model the Clusters admin (#90) defines.
 *
 * THE MODEL. A cluster is NOT its own table: it is an `inspire_categories` row
 * that is not a pillar, carries a `pillar_code`, and whose parent IS a pillar —
 * the exact rule `isClusterCategory` (`@/lib/inspire/clusters`) and
 * `getPillarUpLink` use. Its members are the articles linked to it through
 * `article_categories`. The "Dalam siri ini" switch is the category's
 * `series_enabled` column. There is no stored member order, so members are
 * listed newest first — the order the public series box and the related grid
 * use (`getClusterSiblings`).
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The cache tag a cluster's analytics are stored under. Until the clusters
 * admin actions `revalidateTag` it on a membership change, entries expire on
 * the 600 s timer.
 */
export function clusterAnalyticsTag(clusterId: string): string {
  return `cluster-analytics:${clusterId}`;
}

export interface ClusterMembersRead {
  id: string;
  name: string;
  seriesEnabled: boolean;
  /** Live (not deleted) members, newest first. */
  members: Array<{ articleId: string; slug: string; title: string }>;
}

/**
 * One cluster and its live members, newest first. Null when the id is not a
 * cluster (a pillar, a plain category, or nothing at all). Soft-deleted
 * articles are left out, as the Clusters admin leaves them out.
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
    FROM inspire_categories c
    JOIN inspire_categories p ON p.id = c.parent_id AND p.is_pillar = TRUE
    LEFT JOIN article_categories ac ON ac.category_id = c.id
    LEFT JOIN articles a ON a.id = ac.article_id AND a.status <> 'deleted'
    WHERE c.id = ${clusterId}::uuid
      AND c.is_pillar = FALSE
      AND c.pillar_code IS NOT NULL
    ORDER BY a.published_at DESC NULLS LAST, a.created_at DESC NULLS LAST, a.id ASC
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
 * For each given article, the ONE cluster whose "Dalam siri ini" box it shows:
 * the cluster it is linked to (one per article in practice — the editor's
 * cluster picker sets one), provided that cluster has the box switched on.
 * Ties, if an article were ever in two clusters, go to the lowest cluster id so
 * the answer is stable. Articles in no switched-on cluster get no entry. Used
 * to stop two clusters claiming the same box impressions.
 */
export async function getShownSeriesForArticles(
  articleIds: readonly string[],
): Promise<Map<string, { clusterId: string }>> {
  const ids = [...new Set(articleIds.filter((id) => UUID_RE.test(id)))];
  const out = new Map<string, { clusterId: string }>();
  if (ids.length === 0) return out;
  const rows = await db.execute<{ article_id: string; cluster_id: string }>(sql`
    SELECT s.article_id, s.cluster_id
    FROM (
      SELECT DISTINCT ON (ac.article_id)
             ac.article_id::text AS article_id, c.id::text AS cluster_id, c.series_enabled
      FROM article_categories ac
      JOIN inspire_categories c ON c.id = ac.category_id
      JOIN inspire_categories p ON p.id = c.parent_id AND p.is_pillar = TRUE
      WHERE ac.article_id IN (${sql.join(
        ids.map((id) => sql`${id}::uuid`),
        sql`, `,
      )})
        AND c.is_pillar = FALSE
        AND c.pillar_code IS NOT NULL
      ORDER BY ac.article_id, c.id ASC
    ) s
    WHERE s.series_enabled = TRUE
  `);
  const byLower = new Map(ids.map((id) => [id.toLowerCase(), id]));
  for (const r of rows) {
    const original = byLower.get(r.article_id.toLowerCase());
    if (original) out.set(original, { clusterId: r.cluster_id });
  }
  return out;
}
