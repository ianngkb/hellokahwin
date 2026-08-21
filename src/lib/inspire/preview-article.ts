/**
 * Shared preview fetch (spec-article-draft-client-review).
 *
 * One fetch feeding three routes — the admin preview
 * (`/admin/inspire/[article-id]/preview`), the client share link
 * (`/draft/[token]`) and the print/PDF view — so all three render byte-identical
 * output from byte-identical data. Extracted verbatim from the admin preview
 * page; the two entry points differ ONLY in how the article row is located
 * (by id vs by share token).
 *
 * Both queries are deliberately status-UNFILTERED: previewing a draft is the
 * whole point. The share route is what decides 404-vs-redirect from the
 * `status` it gets back — this module never makes that call.
 */
import { cache } from 'react';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { withDeadline } from '@/lib/api/timeout';
import {
  articles,
  inspireCategories,
  articleCategories,
  articleTags,
  inspireTags,
} from '@/lib/db/schema/articles';
import { profiles } from '@/lib/db/schema/profiles';
import {
  resolveDynamicBlocks,
  mergeDynamicBlocks,
  collectEmbeddedBlockIds,
} from '@/lib/inspire/dynamic-blocks';

/**
 * The article row every preview surface renders from. Explicit column list —
 * never a bare `.select()`, which would expand to every column in the schema
 * object and force a migrate-before-deploy on any future column.
 */
const articleColumns = {
  id: articles.id,
  title: articles.title,
  slug: articles.slug,
  content: articles.content,
  coverImageUrl: articles.coverImageUrl,
  coverImageSmartCrops: articles.coverImageSmartCrops,
  coverImageVariants: articles.coverImageVariants,
  status: articles.status,
  publishedAt: articles.publishedAt,
  updatedAt: articles.updatedAt,
  authorId: articles.authorId,
  primaryCategoryId: articles.primaryCategoryId,
  categoryName: inspireCategories.name,
  categorySlug: inspireCategories.slug,
  authorFirstName: profiles.firstName,
  authorLastName: profiles.lastName,
} as const;

/** Everything `ArticlePreviewView` needs to render. */
export interface PreviewArticleData {
  article: {
    id: string;
    title: string;
    slug: string;
    content: unknown;
    coverImageUrl: string | null;
    coverImageSmartCrops: unknown;
    coverImageVariants: unknown;
    status: 'draft' | 'published' | 'deleted';
    publishedAt: Date | null;
    updatedAt: Date;
    authorId: string;
    primaryCategoryId: string | null;
    categoryName: string | null;
    categorySlug: string | null;
    authorFirstName: string | null;
    authorLastName: string | null;
  };
  renderContent: unknown;
  tags: { id: string; name: string; slug: string }[];
  secondaryCategories: { id: string; name: string; slug: string }[];
}

/**
 * The related rows + dynamic-block merge, shared by both entry points.
 * Split out so the by-id and by-token lookups differ only in their WHERE.
 */
async function buildPreviewData(
  article: PreviewArticleData['article'],
  logLabel: string,
): Promise<PreviewArticleData> {
  const [tags, secondaryCategories] = await Promise.all([
    db
      .select({
        id: inspireTags.id,
        name: inspireTags.name,
        slug: inspireTags.slug,
      })
      .from(articleTags)
      .innerJoin(inspireTags, eq(articleTags.tagId, inspireTags.id))
      // Mirrors the public article page — preview must match what readers see.
      .where(and(eq(articleTags.articleId, article.id), eq(inspireTags.isHidden, false)))
      .orderBy(inspireTags.name),
    db
      .select({
        id: inspireCategories.id,
        name: inspireCategories.name,
        slug: inspireCategories.slug,
      })
      .from(articleCategories)
      .innerJoin(inspireCategories, eq(articleCategories.categoryId, inspireCategories.id))
      .where(eq(articleCategories.articleId, article.id))
      .orderBy(inspireCategories.name),
  ]);

  // Preview WYSIWYG: merge dynamic blocks exactly like the public page (also
  // strips manual embed nodes, which generateHTML can't render).
  let renderContent = article.content;
  try {
    const blocks = await resolveDynamicBlocks({
      articleId: article.id,
      categoryIds: [
        ...(article.primaryCategoryId ? [article.primaryCategoryId] : []),
        ...secondaryCategories.map((c) => c.id),
      ],
      tagIds: tags.map((t) => t.id),
      embeddedBlockIds: collectEmbeddedBlockIds(article.content),
    });
    renderContent = mergeDynamicBlocks(article.content, blocks);
  } catch (err) {
    console.error(`[${logLabel}] dynamic-block merge failed:`, err);
  }

  return { article, renderContent, tags, secondaryCategories };
}

/**
 * Admin preview fetch, by article id. All statuses — an admin previewing a
 * draft is the entire point of the route.
 *
 * `cache()`d so `generateMetadata` and the page body share one round trip.
 */
export const getPreviewArticleData = cache(
  async (articleId: string): Promise<PreviewArticleData | null> => {
    const [article] = await db
      .select(articleColumns)
      .from(articles)
      .leftJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
      .leftJoin(profiles, eq(articles.authorId, profiles.id))
      .where(eq(articles.id, articleId))
      .limit(1);

    if (!article) return null;

    return buildPreviewData(article, `inspire-preview:${articleId}`);
  },
);

/**
 * Client share-link fetch, by `articles.share_token`.
 *
 * Returns the same shape as `getPreviewArticleData` — `slug`, `status` and
 * `categorySlug` are already in the shared column list, which is what lets the
 * caller decide between rendering (draft), redirecting to the live URL
 * (published) and 404ing (deleted).
 *
 * A revoked link is `share_token IS NULL`; because the token is never empty and
 * the DB index is unique-where-not-null, a NULL/blank token can never match a
 * row here. Returns `null` when nothing matches.
 */
export const getArticleByShareToken = cache(
  async (token: string): Promise<PreviewArticleData | null> => {
    if (!token) return null;

    const [article] = await db
      .select(articleColumns)
      .from(articles)
      .leftJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
      .leftJoin(profiles, eq(articles.authorId, profiles.id))
      .where(eq(articles.shareToken, token))
      .limit(1);

    if (!article) return null;

    return buildPreviewData(article, `inspire-share:${article.id}`);
  },
);
