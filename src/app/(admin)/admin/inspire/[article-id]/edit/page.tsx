import type { Metadata } from 'next';
import Link from 'next/link';
import { eq, desc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { ArrowLeftIcon } from 'lucide-react';
import { requireAdminSection } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import {
  articles,
  articleCategories,
  articleTags,
  articleEditLocks,
  articleCategoryRedirects,
} from '@/lib/db/schema/articles';
import { auth } from '@clerk/nextjs/server';
import { resolveDynamicBlocks } from '@/lib/inspire/dynamic-blocks';
import {
  getInspireCategoriesCached,
  getInspireTagsCached,
  getPublishedDynamicBlocksCached,
} from '@/lib/inspire/cached-lists';
import { safePanel } from '@/lib/admin/safe-panel';
import { listSelectableAuthors, type SelectableAuthor } from '@/lib/authors/queries';
import { authorDisplayName } from '@/lib/authors/gate';
import { profiles } from '@/lib/db/schema/profiles';
import { resolveDegradedControls } from './degraded-controls';
import { ArticleEditorLoader } from './article-editor';

export const metadata: Metadata = {
  title: 'Edit Article - Admin',
};

interface EditPageProps {
  params: Promise<{ 'article-id': string }>;
}

export default async function EditArticlePage({ params }: EditPageProps) {
  await requireAdminSection('inspire');

  const { 'article-id': articleId } = await params;

  const [article] = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);

  if (!article) notFound();

  const { userId } = await auth();

  // These eight reads are mutually independent, but they used to run one after
  // another — eight serial round-trips to a DB in another region before the
  // page could render at all. They are issued in two batches of four instead:
  // parallel enough to cut the wall-clock ~4x, still under the five-connection
  // postgres-js pool so this page can't starve it (the admin sidebar prefetches
  // sibling routes against the same pool — see the /admin/leads 30s hang).
  //
  // Every one of them is wrapped in `safePanel`, because `Promise.all` rejects
  // the whole batch the instant any single member does: one connection blip on
  // the tag list (`read ETIMEDOUT`, the reported signature) used to take the
  // entire editor down and render "Something went wrong". Only the `articles`
  // row above is genuinely load-bearing; everything below degrades.
  //
  // The fallback is deliberately NOT uniform. Two of the four reads whose
  // result feeds a delete-then-insert junction write fall back to `null`, not
  // `[]` — `updateArticleCategoriesAction` / `updateArticleTagsAction` clear
  // the article's rows and re-insert whatever the client sends, so an empty
  // array from a *failed* read is indistinguishable from "the admin removed
  // them all" and the next autosave would silently wipe the real values.
  // `null` means "couldn't load", the client disables that control, and the
  // save payload omits the field. `[]` is reserved for reads whose emptiness
  // is harmless (the lock check, and the insert picker / history below).
  //
  // Three of the eight (`inspireCategories`, `inspireTags`, `dynamicBlocks`) now
  // read through `cachedJson` instead of hitting the DB — see
  // `@/lib/inspire/cached-lists`. They are the article-INDEPENDENT ones: every
  // editor session was issuing the identical query for the identical answer,
  // and Next re-renders this page inside every Server Action response, so the
  // 60s autosave paid for them again forever. That is what took one render from
  // ~13 round-trips to ~7 against a 5-wide pool. The wrappers, labels and
  // fallbacks below are deliberately unchanged: caching must not alter WHICH
  // values can be `null`, or "cache miss" could launder into "the admin cleared
  // this" — the exact data loss the sentinels exist to prevent.
  const [lockRows, allCategories, artCats, allTags] = await Promise.all([
    // Graceful degradation if the lock table isn't ready. No lock row simply
    // means "not locked", which is the safe reading either way.
    safePanel(
      'articleEditLocks',
      () =>
        db
          .select()
          .from(articleEditLocks)
          .where(eq(articleEditLocks.articleId, articleId))
          .limit(1),
      [] as (typeof articleEditLocks.$inferSelect)[],
    ),
    // Cached (see `cached-lists.ts`): article-independent, so every editor
    // session was re-issuing the identical query for the identical answer. Still
    // inside `safePanel` with the same `null` sentinel — a cache MISS that then
    // throws must degrade exactly as a live read would, or the degraded-control
    // contract would quietly change meaning depending on cache state.
    safePanel('inspireCategories', getInspireCategoriesCached, null),
    safePanel(
      'articleCategories',
      () =>
        db
          .select({ categoryId: articleCategories.categoryId })
          .from(articleCategories)
          .where(eq(articleCategories.articleId, articleId)),
      null,
    ),
    // Hidden tags stay selectable here — that is the point of the feature. The
    // editor badges them so admins know they won't render publicly. Cached for
    // the same reason as the category tree above; same `null` sentinel.
    safePanel('inspireTags', getInspireTagsCached, null),
  ]);

  const [artTags, publishedDynamicBlocks, redirectHistory] = await Promise.all([
    safePanel(
      'articleTags',
      () =>
        db
          .select({ tagId: articleTags.tagId })
          .from(articleTags)
          .where(eq(articleTags.articleId, articleId)),
      null,
    ),
    // Dynamic blocks: full published+active list for the sidebar's Insert
    // picker, plus the subset auto-attached to this article via rules. Purely
    // additive — an empty picker offers nothing to insert but destroys nothing.
    // Cached too — the picker list is the same for every article. Fallback stays
    // `[]`, NOT the `null` sentinel: an empty picker offers nothing to insert but
    // destroys nothing, so it never needs to disable a control.
    safePanel(
      'dynamicBlocks',
      getPublishedDynamicBlocksCached,
      [] as { id: string; name: string; placement: string }[],
    ),
    // Read-only history of past category moves — informational, never written
    // back, so an empty list just omits the section.
    safePanel(
      'articleCategoryRedirects',
      () =>
        db
          .select({
            id: articleCategoryRedirects.id,
            fromCategorySlug: articleCategoryRedirects.fromCategorySlug,
            toCategorySlug: articleCategoryRedirects.toCategorySlug,
            changedByName: articleCategoryRedirects.changedByName,
            createdAt: articleCategoryRedirects.createdAt,
          })
          .from(articleCategoryRedirects)
          .where(eq(articleCategoryRedirects.articleId, articleId))
          .orderBy(desc(articleCategoryRedirects.createdAt)),
      [] as {
        id: string;
        fromCategorySlug: string;
        toCategorySlug: string;
        changedByName: string;
        createdAt: Date;
      }[],
    ),
  ]);

  // Who this article may be attributed to. Issued separately for the same
  // reason as the credit taxonomy above — the two batches are sized at four to
  // stay under the five-connection pool — and it is an `unstable_cache` read
  // that only touches the DB on a cold entry.
  //
  // Degrades to `[]` on ANY failure, total catch included: losing the author
  // dropdown must never cost an admin the whole editor. An empty list renders
  // the picker with only the article's CURRENT author in it (see
  // `selectableAuthors` handling in article-editor.tsx), so the save simply
  // re-sends the value already stored — it can never blank out an attribution.
  const selectableAuthors = await safePanel(
    'selectableAuthors',
    listSelectableAuthors,
    [] as SelectableAuthor[],
  ).catch((err) => {
    console.error('[article-editor] selectable authors read failed; falling back to empty', err);
    return [] as SelectableAuthor[];
  });

  // The article's current author, so the picker can show it even when that
  // person is not (or is no longer) in the selectable list.
  const [currentAuthor] = await db
    .select({ id: profiles.id, firstName: profiles.firstName, lastName: profiles.lastName })
    .from(profiles)
    .where(eq(profiles.id, article.authorId))
    .limit(1);

  const [lock] = lockRows;
  const lockStatus: { locked: boolean; lockedByName?: string; expiresAt?: string } =
    lock && lock.expiresAt >= new Date() && lock.lockedBy !== userId
      ? {
          locked: true,
          lockedByName: lock.lockedByName,
          expiresAt: lock.expiresAt.toISOString(),
        }
      : { locked: false };

  // `primaryCategoryId` is passed because it is classified through the same
  // (now cached, therefore possibly stale) tree as the junction rows, and lands
  // in the same delete-then-insert sync payload. See `hasUnknownCategoryId`.
  const degraded = resolveDegradedControls({
    allCategories,
    artCats,
    allTags,
    artTags,
    primaryCategoryId: article.primaryCategoryId,
  });

  let autoAttachedDynamicBlocks: typeof publishedDynamicBlocks = [];
  try {
    const resolved = await resolveDynamicBlocks({
      articleId,
      categoryIds: [
        ...new Set([
          ...(article.primaryCategoryId ? [article.primaryCategoryId] : []),
          ...(artCats ?? []).map((c) => c.categoryId),
        ]),
      ],
      tagIds: (artTags ?? []).map((t) => t.tagId),
    });
    const matchedIds = new Set(resolved.filter((b) => b.matchesRules).map((b) => b.id));
    autoAttachedDynamicBlocks = publishedDynamicBlocks.filter((b) => matchedIds.has(b.id));
  } catch (err) {
    console.warn('Dynamic block auto-attach lookup failed:', err);
  }

  const serializedArticle = {
    id: article.id,
    title: article.title,
    slug: article.slug,
    content: article.content ?? { type: 'doc', content: [{ type: 'paragraph' }] },
    coverImageUrl: article.coverImageUrl,
    coverImageVariants: article.coverImageVariants,
    coverImageQuality: article.coverImageQuality,
    coverImageFocalPoint: article.coverImageFocalPoint,
    coverImageDetectionData: article.coverImageDetectionData,
    coverImageSmartCrops: article.coverImageSmartCrops,
    coverImageFocalPointOverride: article.coverImageFocalPointOverride,
    metaTitle: article.metaTitle,
    metaDescription: article.metaDescription,
    pinterestBoardName: article.pinterestBoardName,
    status: article.status,
    isAiGenerated: article.isAiGenerated,
    humanReviewedAt: article.humanReviewedAt?.toISOString() ?? null,
    primaryCategoryId: article.primaryCategoryId,
    authorId: article.authorId,
    publishedAt: article.publishedAt?.toISOString() ?? null,
    scheduledPublishAt: article.scheduledPublishAt?.toISOString() ?? null,
    updatedAt: article.updatedAt.toISOString(),
  };

  return (
    <div>
      <Link
        href="/admin/inspire"
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center text-sm transition-colors"
      >
        <ArrowLeftIcon className="mr-1 size-4" />
        Back to Inspire
      </Link>
      <ArticleEditorLoader
        article={serializedArticle}
        categories={allCategories ?? []}
        articleCategoryIds={(artCats ?? []).map((c) => c.categoryId)}
        allTags={allTags ?? []}
        articleTagIds={(artTags ?? []).map((t) => t.tagId)}
        selectableAuthors={
          // The current author is always an option, even when the list read
          // failed or they have since been de-listed. Without this the Select
          // would render with no matching item and show a blank trigger, which
          // reads as "no author" on an article that certainly has one.
          selectableAuthors.some((a) => a.id === article.authorId)
            ? selectableAuthors
            : [
                ...selectableAuthors,
                {
                  id: article.authorId,
                  name: currentAuthor ? authorDisplayName(currentAuthor) : 'Current author',
                  slug: null,
                  isPublicAuthor: false,
                  isHouseAccount: false,
                },
              ]
        }
        degraded={degraded}
        lockStatus={lockStatus}
        userId={userId ?? ''}
        redirectHistory={redirectHistory.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        }))}
        publishedDynamicBlocks={publishedDynamicBlocks}
        autoAttachedDynamicBlocks={autoAttachedDynamicBlocks}
      />
    </div>
  );
}
