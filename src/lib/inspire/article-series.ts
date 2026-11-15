import { and, asc, eq, exists, inArray, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { db } from '@/lib/db/drizzle';
import { articles, inspireCategories } from '@/lib/db/schema/articles';
import { articleClusterMembers, articleClusters } from '@/lib/db/schema/article-clusters';
import { MAX_CLUSTER_MEMBERS } from '@/lib/validations/article-cluster';
import type { ArticleStatus } from '@/lib/constants';

/**
 * THE one place that answers "which series does this article show" — ported
 * from The Wedding Notebook, where the public article page, the cluster editor
 * and the article editor's Series panel all read it so they can never disagree.
 *
 * HelloKahwin has the two ADMIN reads only. The public box (TWN's
 * `loadArticleSeries`) is not built yet; when it is, it must be added HERE and
 * reuse the helpers below, so the reader and the editor keep one rule.
 *
 * ── R2, the one-series rule ───────────────────────────────────────────
 * An article may sit in several clusters. It shows AT MOST ONE series: among
 * the clusters it is a member of that are READER-FACING (the switch on AND a
 * non-blank intro — `readerFacingCluster`), the one whose MEMBERSHIP ROW WAS
 * CREATED FIRST (`article_cluster_members.created_at`, then `id` as the
 * tie-break). "First joined" never changes under a rename or a reorder.
 *
 * That choice is made WITHOUT looking at whether the winning cluster has
 * anything to list: when the winner has no publishable sibling the answer is
 * "no box", NEVER "show the next cluster instead".
 *
 * ── R3, what the box lists ────────────────────────────────────────────
 * Every OTHER member of the winning cluster whose article is `published` AND
 * has a primary category (without one there is no `/artikel/<category>/<slug>`
 * URL to link to). An empty list means no box.
 *
 * ── "Switched on" is not the same as "readers see it" ─────────────────
 * Every answer reports BOTH: what the admin set (`seriesEnabled` /
 * `isFirstEnabled`) and what a reader would get (`isShown` / `rendersBox`). An
 * admin screen must label the second, never infer it from the first. (While
 * `SERIES_BOX_ON_SITE` is false, "would get" is what readers WILL get once the
 * box ships; the screens say so.)
 *
 * Each read is ONE statement, so "which cluster wins" and "does it render"
 * come from one snapshot. RLS stays on with no policies: every read here runs
 * server-side as `postgres`.
 */

/** The reader-facing series an article has — and whether a box would render. */
export interface ShownSeries {
  clusterId: string;
  name: string;
  /**
   * True when the box would really render on this article: this article is
   * published AND the cluster has at least one OTHER member that is published
   * and categorised. False means the reader sees NOTHING — and no other
   * cluster takes over.
   */
  rendersBox: boolean;
}

/** Which clusters an article belongs to, and which one readers would see. */
export interface ArticleClusterMembership {
  clusterId: string;
  name: string;
  /** The switch alone (`article_clusters.series_enabled`). */
  seriesEnabled: boolean;
  /**
   * The R2 winner: the first-joined cluster that is switched on AND has an
   * intro. At most one entry is ever true.
   */
  isFirstEnabled: boolean;
  /**
   * What a READER would get on this article. At most one entry is ever true,
   * and every entry can be false even when one is switched on — including
   * while this article is still a draft.
   */
  isShown: boolean;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `UUID_RE` accepts either case, but Postgres renders a uuid lowercase. Every
 * id is folded here before it is used as a key or compared with a row.
 */
function normaliseId(id: string): string {
  return id.toLowerCase();
}

/**
 * Most articles ONE STATEMENT may ask about. A per-statement batch size, NOT a
 * cap on the caller: a longer list is split and the answers merged, so no id
 * is ever silently dropped and reported back as "no series".
 */
export const SERIES_LOOKUP_BATCH_SIZE = MAX_CLUSTER_MEMBERS;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Valid, de-duplicated ids, with a way back to the spelling the caller used. */
function prepareIds(articleIds: readonly string[]): {
  lowered: string[];
  originalByLowered: Map<string, string>;
} {
  const originalByLowered = new Map<string, string>();
  for (const id of articleIds) {
    if (!UUID_RE.test(id)) continue;
    const lower = normaliseId(id);
    if (!originalByLowered.has(lower)) originalByLowered.set(lower, id);
  }
  return { lowered: [...originalByLowered.keys()], originalByLowered };
}

/**
 * Every character `String.prototype.trim()` strips — the exact set zod's
 * `.trim()` applies to the intro before it is stored. `btrim(x)` with no
 * second argument strips SPACES ONLY, so an intro of a lone tab or newline
 * would otherwise count as "written".
 */
const JS_WHITESPACE_FOR_BTRIM =
  ' \\t\\n\\v\\f\\r\\u00A0\\u1680\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006' +
  '\\u2007\\u2008\\u2009\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000\\uFEFF';

/** The one article status whose members the box may link to (R3). */
const PUBLISHED: ArticleStatus = 'published';

/** The three cluster columns the shared rules need — base table or alias. */
type ClusterLike = {
  id: AnyPgColumn;
  seriesEnabled: AnyPgColumn;
  description: AnyPgColumn;
};

/** "This cluster is reader-facing": the switch is on AND the intro is not blank. */
export function readerFacingCluster(seriesEnabledCol: AnyPgColumn, descriptionCol: AnyPgColumn) {
  return sql`${seriesEnabledCol} = true and btrim(coalesce(${descriptionCol}, ''), ${sql.raw(
    `E'${JS_WHITESPACE_FOR_BTRIM}'`,
  )}) <> ''`;
}

/** The cluster join every read uses: this membership's cluster, reader-facing. */
function readerFacingClusterJoin(clusters: ClusterLike, memberClusterIdCol: AnyPgColumn) {
  return and(
    eq(clusters.id, memberClusterIdCol),
    readerFacingCluster(clusters.seriesEnabled, clusters.description),
  );
}

/** R2's tie-break order, over whichever membership table the caller uses. */
function firstJoinedOrder(createdAtCol: AnyPgColumn, idCol: AnyPgColumn) {
  return [asc(createdAtCol), asc(idCol)] as const;
}

/** "This membership row's article is publishable" — the ONE definition (R3). */
function publishedMemberOn(memberArticleIdCol: AnyPgColumn) {
  return and(eq(articles.id, memberArticleIdCol), eq(articles.status, PUBLISHED));
}
function primaryCategoryOn() {
  return eq(inspireCategories.id, articles.primaryCategoryId);
}

/** "Does this cluster have anything to list on this article?" — R3 as a boolean. */
function hasPublishableSibling(clusterIdCol: AnyPgColumn, excludeArticleIdCol: AnyPgColumn) {
  const sibling = articleClusterMembers;
  return exists(
    db
      .select({ one: sql`1` })
      .from(sibling)
      .innerJoin(articles, publishedMemberOn(sibling.articleId))
      .innerJoin(inspireCategories, primaryCategoryOn())
      .where(and(eq(sibling.clusterId, clusterIdCol), ne(sibling.articleId, excludeArticleIdCol))),
  );
}

/**
 * "Is the article we are ASKING ABOUT published?" A draft has no page, so no
 * reader can see a box on it however complete the cluster is. Its own alias,
 * so it cannot collide with the `articles` row the sibling test joins.
 */
function subjectIsPublished(subjectArticleIdCol: AnyPgColumn) {
  const subject = alias(articles, 'subject_article');
  return exists(
    db
      .select({ one: sql`1` })
      .from(subject)
      .where(and(eq(subject.id, subjectArticleIdCol), eq(subject.status, PUBLISHED))),
  );
}

/** Would a reader on THIS article actually meet this cluster's box? */
function rendersBoxFor(clusterIdCol: AnyPgColumn, subjectArticleIdCol: AnyPgColumn) {
  return sql<boolean>`(${subjectIsPublished(subjectArticleIdCol)} AND ${hasPublishableSibling(
    clusterIdCol,
    subjectArticleIdCol,
  )})`;
}

/**
 * For each given article, the ONE reader-facing cluster R2 picks (or no entry
 * at all), and whether its box would render there. Used by the cluster editor
 * ("readers see “<other series>” on this article").
 *
 * ONE STATEMENT per batch: `DISTINCT ON (article_id)` over the R2 order picks
 * each article's first-joined reader-facing cluster, and the sibling test
 * rides along as an `EXISTS` column. The ORDER BY touches only membership
 * columns, so sibling existence cannot choose the cluster.
 *
 * Keyed by the id the CALLER passed, whatever its case.
 */
export async function getShownSeriesForArticles(
  articleIds: readonly string[],
): Promise<Map<string, ShownSeries>> {
  const { lowered, originalByLowered } = prepareIds(articleIds);
  const out = new Map<string, ShownSeries>();
  if (lowered.length === 0) return out;

  const own = alias(articleClusterMembers, 'own_members');
  const winners = new Map<string, ShownSeries>();

  for (const batch of chunk(lowered, SERIES_LOOKUP_BATCH_SIZE)) {
    const rows = await db
      .selectDistinctOn([own.articleId], {
        articleId: own.articleId,
        clusterId: articleClusters.id,
        name: articleClusters.name,
        rendersBox: rendersBoxFor(articleClusters.id, own.articleId),
      })
      .from(own)
      .innerJoin(articleClusters, readerFacingClusterJoin(articleClusters, own.clusterId))
      .where(inArray(own.articleId, batch))
      // DISTINCT ON needs its expression first; the rest is R2's order.
      .orderBy(asc(own.articleId), ...firstJoinedOrder(own.createdAt, own.id));

    for (const row of rows) {
      winners.set(normaliseId(row.articleId), {
        clusterId: row.clusterId,
        name: row.name,
        rendersBox: row.rendersBox === true,
      });
    }
  }

  for (const [lower, original] of originalByLowered) {
    const winner = winners.get(lower);
    if (!winner) continue; // in no reader-facing cluster — no entry at all
    out.set(original, winner);
  }
  return out;
}

/**
 * Every cluster one article belongs to (switched on or not), alphabetical by
 * name, with `isFirstEnabled` marking the R2 winner and `isShown` marking what
 * a reader would get. The article editor's Series panel renders this.
 *
 * ONE STATEMENT: the membership list, "which one is the R2 winner" (a scalar
 * subquery with `LIMIT 1` over the R2 order — sibling-blind) and "does it have
 * anything to list" all come from one snapshot.
 */
export async function getArticleClusterMemberships(
  articleId: string,
): Promise<ArticleClusterMembership[]> {
  if (!UUID_RE.test(articleId)) return [];
  const id = normaliseId(articleId);

  const own = alias(articleClusterMembers, 'own_members');
  const winnerMembers = alias(articleClusterMembers, 'winner_members');
  const winnerClusters = alias(articleClusters, 'winner_clusters');

  const winnerClusterId = db
    .select({ clusterId: winnerMembers.clusterId })
    .from(winnerMembers)
    .innerJoin(winnerClusters, readerFacingClusterJoin(winnerClusters, winnerMembers.clusterId))
    .where(eq(winnerMembers.articleId, id))
    .orderBy(...firstJoinedOrder(winnerMembers.createdAt, winnerMembers.id))
    .limit(1);

  const rows = await db
    .select({
      clusterId: articleClusters.id,
      name: articleClusters.name,
      seriesEnabled: articleClusters.seriesEnabled,
      isFirstEnabled: sql<boolean>`${articleClusters.id} = (${winnerClusterId})`,
      rendersBox: rendersBoxFor(articleClusters.id, own.articleId),
    })
    .from(own)
    .innerJoin(articleClusters, eq(articleClusters.id, own.clusterId))
    .where(eq(own.articleId, id))
    .orderBy(asc(articleClusters.name), asc(articleClusters.id));

  return rows.map((r) => {
    const isFirstEnabled = r.isFirstEnabled === true;
    return {
      clusterId: r.clusterId,
      name: r.name,
      seriesEnabled: r.seriesEnabled,
      isFirstEnabled,
      isShown: isFirstEnabled && r.rendersBox === true,
    };
  });
}
