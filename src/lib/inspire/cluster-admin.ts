import 'server-only';

import { and, eq, gte, inArray, ne, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { articles, articleCategories, inspireCategories } from '@/lib/db/schema/articles';
import { analyticsEvents } from '@/lib/db/schema/analytics-events';
import { withDeadline } from '@/lib/api/timeout';
import { categoryAnchor } from '@/lib/inspire/pillar-queries';
import { THIN_CLUSTER_LIVE_MIN, compareCodes, isClusterCategory } from '@/lib/inspire/clusters';

/**
 * Reads behind /admin/inspire/clusters. Admin-only and uncached: an editor who
 * just switched a series box on expects to see it switched on.
 *
 * Two structural reads (categories, memberships) plus one bounded analytics
 * read. The analytics read is the only one allowed to fail quietly: views are
 * context, the cluster list is the page.
 */

export type ClusterArticleStatus = 'published' | 'draft' | 'scheduled';

export interface ClusterAdminArticle {
  id: string;
  title: string;
  status: ClusterArticleStatus;
  publishedAt: Date | null;
  scheduledPublishAt: Date | null;
  /** Public path, or null when the article has no primary category. */
  path: string | null;
  /** 28-day pageviews; null when analytics were unavailable. */
  views: number | null;
}

export interface ClusterAdminRow {
  id: string;
  name: string;
  slug: string;
  code: string;
  entityPhrase: string | null;
  anchor: string;
  seriesEnabled: boolean;
  seriesDescription: string | null;
  live: number;
  draft: number;
  scheduled: number;
  lastPublishedAt: Date | null;
  views: number | null;
  thin: boolean;
  articles: ClusterAdminArticle[];
}

export interface PillarAdminRow {
  id: string;
  name: string;
  slug: string;
  code: string | null;
  entityPhrase: string | null;
  anchor: string;
  intro: string | null;
  clusters: ClusterAdminRow[];
  /** Articles linked to the pillar but to none of its clusters. */
  unclustered: ClusterAdminArticle[];
}

export interface ClusterOverview {
  pillars: PillarAdminRow[];
  /** False when the 28-day views could not be read in time. */
  viewsAvailable: boolean;
}

export interface CategoryInput {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  isPillar: boolean;
  pillarCode: string | null;
  entityPhrase: string | null;
  intro: string | null;
  seriesEnabled: boolean;
  seriesDescription: string | null;
  displayOrder: number | null;
}

export interface MembershipInput {
  articleId: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'deleted';
  publishedAt: Date | null;
  scheduledPublishAt: Date | null;
  categorySlug: string | null;
  linkedCategoryId: string;
}

export const VIEWS_WINDOW_DAYS = 28;
const VIEWS_DEADLINE_MS = 4_000;

export function articleStatusOf(m: Pick<MembershipInput, 'status' | 'scheduledPublishAt'>) {
  if (m.status === 'published') return 'published' as const;
  return m.scheduledPublishAt ? ('scheduled' as const) : ('draft' as const);
}

export function articlePath(m: Pick<MembershipInput, 'slug' | 'categorySlug'>): string | null {
  return m.categorySlug ? `/artikel/${m.categorySlug}/${m.slug}` : null;
}

/** Fold the raw reads into the page model. Pure. */
export function buildClusterOverview(
  categories: readonly CategoryInput[],
  memberships: readonly MembershipInput[],
  views: ReadonlyMap<string, number> | null,
): ClusterOverview {
  const byId = new Map(categories.map((c) => [c.id, c]));

  const toArticle = (m: MembershipInput): ClusterAdminArticle => {
    const path = articlePath(m);
    return {
      id: m.articleId,
      title: m.title,
      status: articleStatusOf(m),
      publishedAt: m.publishedAt,
      scheduledPublishAt: m.scheduledPublishAt,
      path,
      views: views ? (path ? (views.get(path) ?? 0) : 0) : null,
    };
  };

  // category id -> its member articles (deduped per category).
  const byCategory = new Map<string, Map<string, MembershipInput>>();
  for (const m of memberships) {
    if (m.status === 'deleted') continue;
    const bucket = byCategory.get(m.linkedCategoryId) ?? new Map<string, MembershipInput>();
    bucket.set(m.articleId, m);
    byCategory.set(m.linkedCategoryId, bucket);
  }

  const newestFirst = (a: ClusterAdminArticle, b: ClusterAdminArticle) =>
    (b.publishedAt?.getTime() ?? b.scheduledPublishAt?.getTime() ?? Number.MAX_SAFE_INTEGER) -
      (a.publishedAt?.getTime() ?? a.scheduledPublishAt?.getTime() ?? Number.MAX_SAFE_INTEGER) ||
    a.title.localeCompare(b.title);

  const pillars = categories
    .filter((c) => c.isPillar)
    .sort((a, b) => compareCodes(a.pillarCode, b.pillarCode) || a.name.localeCompare(b.name))
    .map((pillar): PillarAdminRow => {
      const clusterCats = categories
        .filter((c) => c.parentId === pillar.id && isClusterCategory(c, byId))
        .sort((a, b) => compareCodes(a.pillarCode, b.pillarCode) || a.name.localeCompare(b.name));

      const inAnyCluster = new Set<string>();
      const clusters = clusterCats.map((c): ClusterAdminRow => {
        const members = [...(byCategory.get(c.id)?.values() ?? [])];
        members.forEach((m) => inAnyCluster.add(m.articleId));
        const list = members.map(toArticle).sort(newestFirst);
        const live = list.filter((a) => a.status === 'published');
        const lastPublishedAt = live.reduce<Date | null>(
          (max, a) => (a.publishedAt && (!max || a.publishedAt > max) ? a.publishedAt : max),
          null,
        );
        return {
          id: c.id,
          name: c.name,
          slug: c.slug,
          code: c.pillarCode!,
          entityPhrase: c.entityPhrase,
          anchor: categoryAnchor(c),
          seriesEnabled: c.seriesEnabled,
          seriesDescription: c.seriesDescription,
          live: live.length,
          draft: list.filter((a) => a.status === 'draft').length,
          scheduled: list.filter((a) => a.status === 'scheduled').length,
          lastPublishedAt,
          views: views ? list.reduce((sum, a) => sum + (a.views ?? 0), 0) : null,
          thin: live.length < THIN_CLUSTER_LIVE_MIN,
          articles: list,
        };
      });

      const unclustered = [...(byCategory.get(pillar.id)?.values() ?? [])]
        .filter((m) => !inAnyCluster.has(m.articleId))
        .map(toArticle)
        .sort(newestFirst);

      return {
        id: pillar.id,
        name: pillar.name,
        slug: pillar.slug,
        code: pillar.pillarCode,
        entityPhrase: pillar.entityPhrase,
        anchor: categoryAnchor(pillar),
        intro: pillar.intro,
        clusters,
        unclustered,
      };
    });

  return { pillars, viewsAvailable: views !== null };
}

/**
 * 28-day human pageviews per path. Uses the (pathname, created_at) index: an
 * equality on pathname plus a range on created_at. Resolves to `null` — never
 * throws — when the read fails or overruns its time limit, so the admin page
 * shows "—" instead of an error.
 */
export async function getPathViews(
  paths: readonly string[],
  now: Date = new Date(),
): Promise<Map<string, number> | null> {
  if (paths.length === 0) return new Map();
  const since = new Date(now.getTime() - VIEWS_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  try {
    const rows = await withDeadline(
      db
        .select({
          pathname: analyticsEvents.pathname,
          views: sql<number>`count(*)::int`,
        })
        .from(analyticsEvents)
        .where(
          and(
            inArray(analyticsEvents.pathname, [...new Set(paths)]),
            gte(analyticsEvents.createdAt, since),
            eq(analyticsEvents.eventName, 'pageview'),
            eq(analyticsEvents.isBot, false),
          ),
        )
        .groupBy(analyticsEvents.pathname),
      VIEWS_DEADLINE_MS,
      'cluster-admin:views',
    );
    return new Map(rows.map((r) => [r.pathname ?? '', Number(r.views)]));
  } catch (err) {
    console.warn('[cluster-admin] 28-day views unavailable:', err);
    return null;
  }
}

export async function getClusterOverview(): Promise<ClusterOverview> {
  const categories = await db
    .select({
      id: inspireCategories.id,
      name: inspireCategories.name,
      slug: inspireCategories.slug,
      parentId: inspireCategories.parentId,
      isPillar: inspireCategories.isPillar,
      pillarCode: inspireCategories.pillarCode,
      entityPhrase: inspireCategories.entityPhrase,
      intro: inspireCategories.intro,
      seriesEnabled: inspireCategories.seriesEnabled,
      seriesDescription: inspireCategories.seriesDescription,
      displayOrder: inspireCategories.displayOrder,
    })
    .from(inspireCategories)
    .where(
      or(eq(inspireCategories.isPillar, true), sql`${inspireCategories.pillarCode} IS NOT NULL`),
    );

  const scopeIds = categories.map((c) => c.id);
  const memberships: MembershipInput[] =
    scopeIds.length === 0
      ? []
      : await db
          .select({
            articleId: articles.id,
            title: articles.title,
            slug: articles.slug,
            status: articles.status,
            publishedAt: articles.publishedAt,
            scheduledPublishAt: articles.scheduledPublishAt,
            categorySlug: inspireCategories.slug,
            linkedCategoryId: articleCategories.categoryId,
          })
          .from(articles)
          .innerJoin(articleCategories, eq(articles.id, articleCategories.articleId))
          .leftJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
          .where(
            and(ne(articles.status, 'deleted'), inArray(articleCategories.categoryId, scopeIds)),
          );

  // Only live articles have views worth counting.
  const livePaths = memberships
    .filter((m) => m.status === 'published')
    .map(articlePath)
    .filter((p): p is string => p !== null);
  const views = await getPathViews(livePaths);

  return buildClusterOverview(categories, memberships, views);
}
