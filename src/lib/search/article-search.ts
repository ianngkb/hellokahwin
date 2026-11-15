import 'server-only';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { articles, inspireCategories } from '@/lib/db/schema/articles';
import { cachedJson } from '@/lib/cache/cached-json';
import { getSmartCropUrl } from '@/lib/storage/smart-crop-url';
import type { SearchResponse } from './contract';
import {
  buildSearchIndex,
  publiclyVisible,
  searchIndex,
  type CorpusArticle,
  type SearchIndex,
} from './engine';

/**
 * Article search: the whole published corpus (~100 articles) is loaded once
 * through the Data Cache and searched in memory, so a query costs no database
 * round-trip. The corpus is small enough that this is both faster and more
 * capable than SQL matching (any word order, synonyms, typo correction).
 *
 * Tagged like the other public article reads: every admin save fires
 * `revalidateTag('articles')`, category edits fire 'inspire-categories', so a
 * new or renamed article is searchable at once. 600s is only the backstop for
 * changes made outside those actions.
 *
 * ⚠️ The key scopes the cached shape across deployments; bump it when
 * `CorpusArticle` changes.
 */
export const getSearchCorpus = cachedJson(
  async (): Promise<CorpusArticle[]> => {
    const rows = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
        coverImageUrl: articles.coverImageUrl,
        coverImageVariants: articles.coverImageVariants,
        coverImageSmartCrops: articles.coverImageSmartCrops,
        publishedAt: articles.publishedAt,
        categorySlug: inspireCategories.slug,
        categoryName: inspireCategories.name,
      })
      .from(articles)
      .innerJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
      .where(eq(articles.status, 'published'))
      .orderBy(desc(articles.publishedAt), desc(articles.id));

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      href: `/artikel/${row.categorySlug}/${row.slug}`,
      categorySlug: row.categorySlug,
      categoryName: row.categoryName,
      excerpt: row.excerpt?.trim() || null,
      thumbnailUrl: thumbnailFor(row),
      publishedAt: row.publishedAt ? new Date(row.publishedAt).toISOString() : null,
    }));
  },
  ['search-corpus-v1'],
  { tags: ['articles', 'inspire-categories'], revalidate: 600 },
);

/**
 * The 4:3 thumbnail, as the article card picks it: the smallest stored 4:3
 * smart crop, then the low variant, then the original cover.
 */
function thumbnailFor(row: {
  coverImageUrl: string | null;
  coverImageVariants: unknown;
  coverImageSmartCrops: unknown;
}): string | null {
  return (
    getSmartCropUrl(row.coverImageSmartCrops, 'crop-4x3-article-card-sm') ??
    getSmartCropUrl(row.coverImageSmartCrops, 'crop-4x3-article-card-md') ??
    getSmartCropUrl(row.coverImageSmartCrops, 'crop-4x3-article-card') ??
    (row.coverImageVariants as Record<string, { url?: string }> | null)?.low?.url ??
    (row.coverImageUrl?.trim() || null)
  );
}

/**
 * The index is rebuilt only when the cached corpus changes. The cache hands
 * back a fresh array on every call, so identity cannot be the key; the
 * serialised corpus (~50 KB) can, and comparing it is far cheaper than
 * re-tokenising every article.
 */
let memo: { key: string; index: SearchIndex } | null = null;

function indexFor(corpus: CorpusArticle[]): SearchIndex {
  const key = JSON.stringify(corpus);
  if (memo?.key !== key) memo = { key, index: buildSearchIndex(corpus) };
  return memo.index;
}

/** The cached corpus minus scheduled (future-dated) articles. Use this, never `getSearchCorpus`, for anything a reader sees. */
export async function getVisibleSearchCorpus(now: number = Date.now()): Promise<CorpusArticle[]> {
  return publiclyVisible(await getSearchCorpus(), now);
}

/** Searches live published articles. Throws when the corpus cannot be loaded — callers must not turn that into an empty result. */
export async function searchArticles(
  query: string,
  options: { limit: number; offset: number },
  now: number = Date.now(),
): Promise<SearchResponse> {
  const corpus = await getVisibleSearchCorpus(now);
  return searchIndex(indexFor(corpus), query, options);
}
