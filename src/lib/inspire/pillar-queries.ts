import { eq, and, desc, inArray, isNotNull, sql } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { articles, inspireCategories, articleCategories } from '@/lib/db/schema/articles';

/**
 * Reads behind the pillar architecture.
 *
 * The whole design goal is that NOBODY maintains a link graph. The plan maps
 * 204 articles across 26 clusters; the pillar page is generated from the
 * category tree on every read, so assigning an article to a cluster is the only
 * act needed for the pillar to list it and for the article to link back up.
 * There is no per-article link table to keep in step and nothing to backfill.
 *
 * Cache tags match the rest of the inspire read layer (`articles`,
 * `inspire-categories`), so the existing admin write paths already invalidate
 * these without knowing they exist.
 */

export interface PillarClusterArticle {
  id: string;
  title: string;
  slug: string;
  categorySlug: string;
  publishedAt: Date | null;
}

export interface PillarCluster {
  id: string;
  name: string;
  slug: string;
  /** Anchor text for links pointing at this cluster. Never empty. */
  entityPhrase: string;
  pillarCode: string | null;
  articles: PillarClusterArticle[];
}

export interface PillarView {
  clusters: PillarCluster[];
  /**
   * Published articles sitting under the pillar but in none of its clusters.
   * Rendered in a "Lain-lain" section so nothing under a pillar is orphaned —
   * the plan's linking rules say no orphans, and silently dropping these would
   * break that in the one place nobody would look.
   */
  unclustered: PillarClusterArticle[];
  totalArticles: number;
}

/** The Malay entity phrase for a category, falling back to its name. */
export function categoryAnchor(cat: { entityPhrase?: string | null; name: string }): string {
  const phrase = cat.entityPhrase?.trim();
  return phrase && phrase.length > 0 ? phrase : cat.name;
}

/**
 * Everything a pillar page renders, in two queries regardless of how many
 * clusters the pillar has.
 *
 * Article → cluster membership comes from `article_categories`, not from
 * `primary_category_id`. That separation is deliberate: the article's PRIMARY
 * category is the pillar (which is what puts it at /artikel/{pillar}/{slug}),
 * while its cluster is an additional link. One article can therefore sit in a
 * pillar URL and a cluster section at the same time without duplicating rows.
 */
export const getPillarView = unstable_cache(
  async (pillarId: string): Promise<PillarView> => {
    const clusterRows = await db
      .select({
        id: inspireCategories.id,
        name: inspireCategories.name,
        slug: inspireCategories.slug,
        entityPhrase: inspireCategories.entityPhrase,
        pillarCode: inspireCategories.pillarCode,
      })
      .from(inspireCategories)
      .where(eq(inspireCategories.parentId, pillarId))
      .orderBy(inspireCategories.displayOrder, inspireCategories.name);

    const clusterIds = clusterRows.map((c) => c.id);

    // Every published article linked to the pillar OR any of its clusters, with
    // the cluster ids it belongs to. One row per (article, category) pair;
    // folded into per-cluster lists below.
    const scopeIds = [pillarId, ...clusterIds];
    const rows = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        publishedAt: articles.publishedAt,
        categorySlug: inspireCategories.slug,
        linkedCategoryId: articleCategories.categoryId,
      })
      .from(articles)
      .innerJoin(articleCategories, eq(articles.id, articleCategories.articleId))
      .leftJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
      .where(and(eq(articles.status, 'published'), inArray(articleCategories.categoryId, scopeIds)))
      .orderBy(desc(articles.publishedAt));

    const byCluster = new Map<string, PillarClusterArticle[]>();
    const seenAnywhere = new Set<string>();
    const clustered = new Set<string>();
    const pillarOnly = new Map<string, PillarClusterArticle>();

    for (const row of rows) {
      const article: PillarClusterArticle = {
        id: row.id,
        title: row.title,
        slug: row.slug,
        // An article with no primary category cannot be linked (there is no
        // canonical path for it), so it is skipped rather than linked to
        // /artikel/null/… — the same guard the article route itself applies.
        categorySlug: row.categorySlug ?? '',
        publishedAt: row.publishedAt,
      };
      if (!article.categorySlug) continue;
      seenAnywhere.add(row.id);

      if (row.linkedCategoryId === pillarId) {
        pillarOnly.set(row.id, article);
        continue;
      }
      clustered.add(row.id);
      const list = byCluster.get(row.linkedCategoryId) ?? [];
      // An article can be linked to the same cluster only once (unique index),
      // so no dedupe is needed inside a cluster.
      list.push(article);
      byCluster.set(row.linkedCategoryId, list);
    }

    const clusters: PillarCluster[] = clusterRows.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      entityPhrase: categoryAnchor(c),
      pillarCode: c.pillarCode,
      articles: byCluster.get(c.id) ?? [],
    }));

    // Under the pillar, in none of its clusters.
    const unclustered = [...pillarOnly.entries()]
      .filter(([id]) => !clustered.has(id))
      .map(([, article]) => article);

    return { clusters, unclustered, totalArticles: seenAnywhere.size };
  },
  ['inspire-pillar-view'],
  { tags: ['articles', 'inspire-categories'], revalidate: false },
);

export interface PillarUpLink {
  slug: string;
  name: string;
  /** Anchor text — the pillar's Malay entity phrase. */
  anchor: string;
  /** The cluster this article sits in, when it has one. */
  cluster: { id: string; slug: string; name: string; anchor: string } | null;
}

/**
 * The article page's link back UP to its pillar.
 *
 * The plan's rule is that nothing publishes without an inbound editorial link
 * from its pillar, and that every article links back up with the pillar's
 * entity phrase as anchor text. Deriving that from the category tree makes it
 * structural: it cannot be forgotten on an article, and it cannot rot when a
 * pillar is renamed.
 *
 * Resolves whether the article's primary category IS a pillar or sits UNDER
 * one, so it keeps working if the editorial team later decides articles should
 * live at /artikel/{cluster}/{slug} instead.
 */
export const getPillarUpLink = unstable_cache(
  async (articleId: string): Promise<PillarUpLink | null> => {
    // Every category this article is linked to that participates in the pillar
    // architecture, plus its parent when it has one.
    const rows = await db
      .select({
        id: inspireCategories.id,
        slug: inspireCategories.slug,
        name: inspireCategories.name,
        entityPhrase: inspireCategories.entityPhrase,
        isPillar: inspireCategories.isPillar,
        parentId: inspireCategories.parentId,
        parentSlug: sql<string | null>`parent.slug`,
        parentName: sql<string | null>`parent.name`,
        parentEntityPhrase: sql<string | null>`parent.entity_phrase`,
        parentIsPillar: sql<boolean | null>`parent.is_pillar`,
      })
      .from(articleCategories)
      .innerJoin(inspireCategories, eq(articleCategories.categoryId, inspireCategories.id))
      .leftJoin(sql`inspire_categories AS parent`, sql`parent.id = ${inspireCategories.parentId}`)
      .where(
        and(eq(articleCategories.articleId, articleId), isNotNull(inspireCategories.pillarCode)),
      );

    if (rows.length === 0) return null;

    // The cluster, if the article is in one.
    const clusterRow = rows.find((r) => !r.isPillar && r.parentIsPillar === true);
    // The pillar: the cluster's parent, or a directly-linked pillar.
    const pillarRow = rows.find((r) => r.isPillar);

    const pillar = clusterRow
      ? {
          slug: clusterRow.parentSlug!,
          name: clusterRow.parentName!,
          anchor: clusterRow.parentEntityPhrase?.trim() || clusterRow.parentName!,
        }
      : pillarRow
        ? {
            slug: pillarRow.slug,
            name: pillarRow.name,
            anchor: categoryAnchor(pillarRow),
          }
        : null;

    if (!pillar) return null;

    return {
      ...pillar,
      cluster: clusterRow
        ? {
            id: clusterRow.id,
            slug: clusterRow.slug,
            name: clusterRow.name,
            anchor: categoryAnchor(clusterRow),
          }
        : null,
    };
  },
  ['inspire-pillar-uplink'],
  { tags: ['articles', 'inspire-categories'], revalidate: false },
);

/**
 * Sibling articles inside the same CLUSTER, for the related-articles block.
 *
 * The existing block used "same primary category", which under the pillar model
 * would mean "anything in the whole pillar" — up to 38 articles wide, and
 * exactly the loose association the plan's sideways-linking rule is meant to
 * avoid ("siblings link sideways two to four times inside their own cluster").
 * Callers fall back to the old behaviour when an article has no cluster, so the
 * 29 legacy articles keep the related block they have today.
 */
export const getClusterSiblings = unstable_cache(
  async (clusterId: string, excludeArticleId: string, limit: number) => {
    return db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        coverImageUrl: articles.coverImageUrl,
        coverImageVariants: articles.coverImageVariants,
        coverImageSmartCrops: articles.coverImageSmartCrops,
        categorySlug: inspireCategories.slug,
        publishedAt: articles.publishedAt,
      })
      .from(articles)
      .innerJoin(articleCategories, eq(articles.id, articleCategories.articleId))
      .leftJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
      .where(
        and(
          eq(articleCategories.categoryId, clusterId),
          eq(articles.status, 'published'),
          sql`${articles.id} <> ${excludeArticleId}`,
        ),
      )
      .orderBy(desc(articles.publishedAt))
      .limit(limit);
  },
  ['inspire-cluster-siblings'],
  { tags: ['articles', 'inspire-categories'], revalidate: false },
);
