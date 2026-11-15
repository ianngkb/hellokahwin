import { and, asc, count, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { adminSettings } from '@/lib/db/schema/settings';
import { articleCategories, articles, inspireCategories } from '@/lib/db/schema/articles';
import {
  categoryTreeIds,
  DEFAULT_INSPIRE_HOMEPAGE_CONFIG,
  INSPIRE_HOMEPAGE_SETTING_KEY,
  parseInspireHomepageConfig,
  resolveInspireHomepage,
  type InspireHomepageArticle,
  type InspireHomepageConfig,
} from './homepage-curation';

export interface InspireHomepageCategory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  displayOrder: number | null;
  articleCount: number;
}

export interface InspireHomepagePickerArticle {
  id: string;
  title: string;
  status: 'Published';
}

const articleSelection = {
  id: articles.id,
  title: articles.title,
  slug: articles.slug,
  coverImageUrl: articles.coverImageUrl,
  coverImageVariants: articles.coverImageVariants,
  coverImageSmartCrops: articles.coverImageSmartCrops,
  publishedAt: articles.publishedAt,
  categoryName: inspireCategories.name,
  categorySlug: inspireCategories.slug,
};

function eligibleArticleWhere() {
  return and(
    eq(articles.status, 'published'),
    isNotNull(articles.coverImageUrl),
    sql`length(trim(${articles.coverImageUrl})) > 0`,
  );
}

function asEligibleArticle(row: unknown): InspireHomepageArticle {
  return row as unknown as InspireHomepageArticle;
}

async function getLatestEligibleArticles(limit: number): Promise<InspireHomepageArticle[]> {
  const rows = await db
    .select(articleSelection)
    .from(articles)
    .innerJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
    .where(eligibleArticleWhere())
    .orderBy(desc(articles.publishedAt), desc(articles.id))
    .limit(limit);
  return rows.map(asEligibleArticle);
}

async function getEligibleArticlesByIds(ids: string[]): Promise<InspireHomepageArticle[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select(articleSelection)
    .from(articles)
    .innerJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
    .where(and(eligibleArticleWhere(), inArray(articles.id, ids)))
    .orderBy(desc(articles.publishedAt), desc(articles.id));
  return rows.map(asEligibleArticle);
}

async function getCategoryEligibleArticles(
  categoryIds: string[],
  limit: number,
): Promise<InspireHomepageArticle[]> {
  if (categoryIds.length === 0) return [];
  const matching = db
    .selectDistinct({ id: articleCategories.articleId })
    .from(articleCategories)
    .where(inArray(articleCategories.categoryId, categoryIds))
    .as('homepage_category_articles');
  const rows = await db
    .select(articleSelection)
    .from(articles)
    .innerJoin(matching, eq(articles.id, matching.id))
    .innerJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
    .where(eligibleArticleWhere())
    .orderBy(desc(articles.publishedAt), desc(articles.id))
    .limit(limit);
  return rows.map(asEligibleArticle);
}

export async function getInspireHomepageConfig(): Promise<{
  config: InspireHomepageConfig;
  invalid: boolean;
}> {
  const [row] = await db
    .select({ value: adminSettings.value })
    .from(adminSettings)
    .where(eq(adminSettings.key, INSPIRE_HOMEPAGE_SETTING_KEY))
    .limit(1);
  if (!row) return { config: DEFAULT_INSPIRE_HOMEPAGE_CONFIG, invalid: false };
  return parseInspireHomepageConfig(row.value);
}

/**
 * The public /artikel read: a curation that cannot be read must never take the
 * page down. Vercel PREVIEW builds connect as `hk_preview_ro`, which may read
 * articles, categories and media but not `admin_settings`, so the build-time
 * prerender of /artikel failed with "permission denied". Any failure here falls
 * back to the automatic layout (newest articles) — the same page production
 * shows before anyone curates. The admin screen keeps the strict read.
 */
export async function getInspireHomepageConfigOrDefault(): Promise<{
  config: InspireHomepageConfig;
  invalid: boolean;
}> {
  try {
    return await getInspireHomepageConfig();
  } catch (err) {
    console.warn('[inspire-homepage] curation unreadable, using the automatic layout:', err);
    return { config: DEFAULT_INSPIRE_HOMEPAGE_CONFIG, invalid: false };
  }
}

export async function getInspireHomepageCategories(): Promise<InspireHomepageCategory[]> {
  const articleCountSub = db
    .select({
      categoryId: articleCategories.categoryId,
      count: count().as('article_count'),
    })
    .from(articleCategories)
    .innerJoin(articles, eq(articleCategories.articleId, articles.id))
    .where(eq(articles.status, 'published'))
    .groupBy(articleCategories.categoryId)
    .as('article_count_sub');

  return db
    .select({
      id: inspireCategories.id,
      name: inspireCategories.name,
      slug: inspireCategories.slug,
      parentId: inspireCategories.parentId,
      displayOrder: inspireCategories.displayOrder,
      articleCount: sql<number>`COALESCE(${articleCountSub.count}, 0)`.mapWith(Number),
    })
    .from(inspireCategories)
    .leftJoin(articleCountSub, eq(inspireCategories.id, articleCountSub.categoryId))
    .orderBy(asc(inspireCategories.displayOrder), asc(inspireCategories.name));
}

/**
 * Loads enough candidates to fill twelve spaces without scanning thousands of
 * full article rows. Explicit pins are fetched separately, so an old story can
 * still be curated even though automatic pools stay bounded.
 */
export async function getInspireHomepageResolvedData() {
  const [{ config, invalid }, allCategories] = await Promise.all([
    getInspireHomepageConfigOrDefault(),
    getInspireHomepageCategories(),
  ]);
  const allPinnedIds = [
    ...new Set([...config.featured.pinnedArticleIds, ...config.latest.pinnedArticleIds]),
  ];
  const featuredCategoryIds = categoryTreeIds(config.featured.categoryId, allCategories);
  const latestCategoryIds = categoryTreeIds(config.latest.categoryId, allCategories);

  const [globalLatest, pinnedArticles, featuredCategory, latestCategory] = await Promise.all([
    getLatestEligibleArticles(36),
    getEligibleArticlesByIds(allPinnedIds),
    config.featured.source === 'category'
      ? getCategoryEligibleArticles(featuredCategoryIds, 24)
      : Promise.resolve([]),
    config.latest.source === 'category'
      ? getCategoryEligibleArticles(latestCategoryIds, 30)
      : Promise.resolve([]),
  ]);

  const resolution = resolveInspireHomepage({
    config,
    globalLatest,
    pinnedById: new Map(pinnedArticles.map((article) => [article.id, article])),
    featuredCategory,
    latestCategory,
    categoryExists: new Set(allCategories.map((category) => category.id)),
  });
  if (invalid) {
    resolution.warnings.unshift(
      'The saved homepage settings were invalid, so the automatic layout is being used.',
    );
  }

  const resolved = [...resolution.featured, ...resolution.latest];
  const resolvedIds = resolved.map(({ article }) => article.id);
  const secondaryRows =
    resolvedIds.length === 0
      ? []
      : await db
          .select({
            articleId: articleCategories.articleId,
            name: inspireCategories.name,
            slug: inspireCategories.slug,
          })
          .from(articleCategories)
          .innerJoin(inspireCategories, eq(articleCategories.categoryId, inspireCategories.id))
          .where(inArray(articleCategories.articleId, resolvedIds))
          .orderBy(asc(inspireCategories.name));
  const secondaryByArticle = new Map<string, Array<{ name: string; slug: string }>>();
  for (const row of secondaryRows) {
    const primary = resolved.find(({ article }) => article.id === row.articleId)?.article;
    if (primary?.categorySlug === row.slug) continue;
    const list = secondaryByArticle.get(row.articleId) ?? [];
    list.push({ name: row.name, slug: row.slug });
    secondaryByArticle.set(row.articleId, list);
  }
  for (const item of resolved) {
    item.article.categories = [
      ...(item.article.categoryName && item.article.categorySlug
        ? [{ name: item.article.categoryName, slug: item.article.categorySlug }]
        : []),
      ...(secondaryByArticle.get(item.article.id) ?? []),
    ];
  }

  return { config, allCategories, resolution, pinnedArticles };
}

export function pickerArticlesForConfig(
  config: InspireHomepageConfig,
  articlesById: ReadonlyMap<string, InspireHomepageArticle>,
) {
  const pick = (ids: string[]): InspireHomepagePickerArticle[] =>
    ids.flatMap((id) => {
      const article = articlesById.get(id);
      return article
        ? [{ id: article.id, title: article.title, status: 'Published' as const }]
        : [];
    });
  return {
    featured: pick(config.featured.pinnedArticleIds),
    latest: pick(config.latest.pinnedArticleIds),
  };
}
