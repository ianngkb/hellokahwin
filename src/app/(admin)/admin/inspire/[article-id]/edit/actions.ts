'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { PURGE_IMMEDIATELY } from '@/lib/cache/purge';
import { after } from 'next/server';
import { z } from 'zod/v4';
import { eq, ilike, and, inArray, not, sql } from 'drizzle-orm';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { db } from '@/lib/db/drizzle';
import {
  articles,
  articleCategories,
  articleTags,
  articleEditLocks,
  inspireCategories,
  articleCategoryRedirects,
} from '@/lib/db/schema/articles';
import { profiles } from '@/lib/db/schema/profiles';
import { media, mediaArticleUsage } from '@/lib/db/schema/media';
import { redirects } from '@/lib/db/schema/redirects';
import { buildArticleSlugRedirect } from '@/lib/redirects/article-slug-change';
import { requireAdminSectionAction } from '@/lib/auth/admin';
import { logAuditEvent } from '@/lib/audit/log';
import { diffFields } from '@/lib/audit/diff';
import { articleUpdateSchema, formatArticleValidationError } from '@/lib/validations/article';
import { INSPIRE_AUTHORS_TAG, listSelectableAuthors } from '@/lib/authors/queries';
import { isAuthorReattribution } from '@/lib/authors/gate';
import { extractImageUrlsFromContent } from '@/lib/inspire/content-media';
import { getR2Client, getR2Bucket } from '@/lib/r2/client';
import { generateVariants, getDefaultPresets } from '@/lib/storage/image-variants';
import {
  processSmartCrops,
  resolveOriginalKey,
  framingFromStoredOverride,
} from '@/lib/storage/smart-crop';

/** UUID guard for every action that takes an articleId straight from the client.
 * Without it a malformed id reaches Postgres and the 22P02 escapes as an
 * unhandled rejection — the form just shows nothing to the admin. */
function parseArticleId(value: unknown): string | null {
  return typeof value === 'string' && z.string().uuid().safeParse(value).success ? value : null;
}

/**
 * @param options.silent Set by the 60-second autosave (see `use-autosave.ts`).
 * Suppresses ONLY the self-targeted `revalidatePath` on this editor's own path —
 * see the revalidation block near the end of this function. Everything else,
 * including all public invalidation, is unaffected.
 */
export async function updateArticleAction(
  articleId: string,
  data: Record<string, unknown>,
  options?: { silent?: boolean },
) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };
  if (!parseArticleId(articleId)) return { error: 'Invalid article ID' };

  const parsed = articleUpdateSchema.safeParse(data);
  if (!parsed.success) return { error: formatArticleValidationError(parsed.error) };
  const validated = parsed.data;

  // Pinterest Board Name is compulsory for real-wedding articles (the outbound
  // export needs a < 50-char board title). Resolve the effective primary category
  // — the incoming value, else the article's current one — and enforce required.
  if ('pinterestBoardName' in data) {
    const effectiveCategoryId =
      validated.primaryCategoryId ??
      (
        await db
          .select({ primaryCategoryId: articles.primaryCategoryId })
          .from(articles)
          .where(eq(articles.id, articleId))
          .limit(1)
      )[0]?.primaryCategoryId ??
      null;

    if (effectiveCategoryId) {
      const [cat] = await db
        .select({ slug: inspireCategories.slug, parentId: inspireCategories.parentId })
        .from(inspireCategories)
        .where(eq(inspireCategories.id, effectiveCategoryId))
        .limit(1);
      let isRealWedding = cat?.slug === 'real-weddings';
      if (!isRealWedding && cat?.parentId) {
        const [parent] = await db
          .select({ slug: inspireCategories.slug })
          .from(inspireCategories)
          .where(eq(inspireCategories.id, cat.parentId))
          .limit(1);
        isRealWedding = parent?.slug === 'real-weddings';
      }
      if (isRealWedding && !validated.pinterestBoardName?.trim()) {
        return { error: 'Pinterest Board Name is required for Real Weddings articles.' };
      }
    }
  }

  // "Last Updated" is editor-controlled (WYSIWYG): honor an explicit value when
  // the client sends one, otherwise fall back to now(). updated_at is NOT NULL,
  // so a null/absent value never persists null. This replaces the old blind
  // `updatedAt = new Date()` bump that fired on every save (incl. trivial edits).
  const updateData: Record<string, unknown> = {
    updatedAt: validated.updatedAt ? new Date(validated.updatedAt) : new Date(),
  };

  if (validated.title) updateData.title = validated.title;
  if (validated.slug) updateData.slug = validated.slug;
  if ('content' in validated) {
    updateData.content = validated.content;
  }
  if ('coverImageUrl' in validated) updateData.coverImageUrl = validated.coverImageUrl || null;
  if ('coverImageVariants' in validated)
    updateData.coverImageVariants = validated.coverImageVariants ?? null;
  if ('coverImageQuality' in validated)
    updateData.coverImageQuality = validated.coverImageQuality || null;
  if ('coverImageFocalPoint' in validated)
    updateData.coverImageFocalPoint = validated.coverImageFocalPoint ?? null;
  if ('coverImageDetectionData' in validated)
    updateData.coverImageDetectionData = validated.coverImageDetectionData ?? null;
  if ('coverImageSmartCrops' in validated)
    updateData.coverImageSmartCrops = validated.coverImageSmartCrops ?? null;
  if ('coverImageFocalPointOverride' in validated)
    updateData.coverImageFocalPointOverride = validated.coverImageFocalPointOverride ?? null;

  // SEO meta — preserve a user-provided override; otherwise clear it so the
  // public page falls back to the clean `title`. We must NOT auto-append the
  // brand here: the page strips brand + the root title.template adds the single
  // " | HelloKahwin". The old `${title} | HelloKahwin`.slice(70)
  // truncated mid-brand and rendered doubled/garbled titles.
  if ('metaTitle' in validated) {
    updateData.metaTitle = validated.metaTitle ? validated.metaTitle : null;
  }
  if ('metaDescription' in validated) {
    if (validated.metaDescription) {
      updateData.metaDescription = validated.metaDescription;
    } else {
      updateData.metaDescription = null;
    }
  }
  if ('pinterestBoardName' in validated) {
    updateData.pinterestBoardName = validated.pinterestBoardName?.trim() || null;
  }
  // Handle scheduledPublishAt first — always respect the explicit value from the client
  if ('scheduledPublishAt' in validated) {
    updateData.scheduledPublishAt = validated.scheduledPublishAt
      ? new Date(validated.scheduledPublishAt)
      : null;
  }
  if (validated.status) {
    updateData.status = validated.status;
    if (validated.status === 'published') {
      // Manual publish — always clear any pending schedule
      updateData.scheduledPublishAt = null;
      // Use explicit publishedAt if provided, otherwise auto-set on first publish
      if ('publishedAt' in validated && validated.publishedAt) {
        updateData.publishedAt = new Date(validated.publishedAt);
      } else {
        const [current] = await db
          .select({ status: articles.status, publishedAt: articles.publishedAt })
          .from(articles)
          .where(eq(articles.id, articleId))
          .limit(1);
        if (current && (current.status !== 'published' || !current.publishedAt)) {
          updateData.publishedAt = new Date();
        }
      }
    } else if (validated.status === 'draft') {
      updateData.publishedAt = null;
      // Note: don't clear scheduledPublishAt here — the client controls it via the explicit field above
    }
  } else if ('publishedAt' in validated && validated.publishedAt) {
    // Status unchanged but date explicitly updated
    updateData.publishedAt = new Date(validated.publishedAt);
  }
  // Author re-attribution from the editor's picker.
  //
  // Membership of `listSelectableAuthors()` is the authorisation check, not a
  // convenience: `articles.author_id` FKs to `profiles`, which holds every
  // couple and vendor on the site, so without this an admin could post any
  // profile id and mint a byline for a stranger. The list is the opted-in
  // public authors PLUS the house account — the latter is what lets an article
  // be moved back to the unattributed house byline.
  //
  // The check is on the CHANGE, not on the value. The editor always re-sends
  // `authorId` — the manual save and the 60-second autosave both post the
  // whole form, seeded from the article's stored author — so validating the
  // value unconditionally made every save of an article whose author is not
  // (or is no longer) in the selectable list fail, including every imported
  // article on the house byline. Comparing against the stored author first
  // keeps the authorisation property intact: minting a byline requires MOVING
  // the article onto a profile, and that still has to clear the list.
  let authorChanged = false;
  if (validated.authorId) {
    const [currentAuthorRow] = await db
      .select({ authorId: articles.authorId })
      .from(articles)
      .where(eq(articles.id, articleId))
      .limit(1);

    if (isAuthorReattribution(validated.authorId, currentAuthorRow?.authorId)) {
      const selectable = await listSelectableAuthors();
      if (!selectable.some((a) => a.id === validated.authorId)) {
        return { error: 'That author is not available for attribution.' };
      }
      updateData.authorId = validated.authorId;
      authorChanged = true;
    }
  }

  // Track category change for redirect toast + cache revalidation
  let redirectedFrom: string | undefined;
  let redirectedTo: string | undefined;
  let articleSlug: string | undefined;

  if (validated.primaryCategoryId) {
    // Query old category slug + article slug before updating
    const [current] = await db
      .select({
        slug: articles.slug,
        oldCategorySlug: inspireCategories.slug,
        oldCategoryId: articles.primaryCategoryId,
      })
      .from(articles)
      .leftJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
      .where(eq(articles.id, articleId))
      .limit(1);

    if (current) {
      articleSlug = current.slug;
      if (current.oldCategoryId !== validated.primaryCategoryId) {
        // Category is actually changing — look up new category slug
        const [newCat] = await db
          .select({ slug: inspireCategories.slug })
          .from(inspireCategories)
          .where(eq(inspireCategories.id, validated.primaryCategoryId))
          .limit(1);

        if (current.oldCategorySlug && newCat?.slug) {
          redirectedFrom = current.oldCategorySlug;
          redirectedTo = newCat.slug;
        }
      }
    }

    updateData.primaryCategoryId = validated.primaryCategoryId;
  }

  // Pre-save snapshot for the audit diff. Deliberately a curated set of scalar
  // columns rather than the whole row: `content` is a full Tiptap document
  // running to tens of KB, and pulling it back on every save purely to diff it
  // would cost more than the save itself. These are the fields an admin would
  // actually ask "who changed this?" about.
  const [beforeRow] = await db
    .select({
      title: articles.title,
      slug: articles.slug,
      status: articles.status,
      metaTitle: articles.metaTitle,
      metaDescription: articles.metaDescription,
      primaryCategoryId: articles.primaryCategoryId,
      publishedAt: articles.publishedAt,
      scheduledPublishAt: articles.scheduledPublishAt,
      pinterestBoardName: articles.pinterestBoardName,
      coverImageUrl: articles.coverImageUrl,
      authorId: articles.authorId,
    })
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);

  // Auto-301 on slug change: if the slug of a previously-published article is
  // changing, write a redirect row atomically with the slug change. The
  // current-state read runs INSIDE the transaction so a concurrent save can't
  // make us record a source path that was never live. Never-published drafts
  // get no redirect — their old URL was never public.
  if (validated.slug) {
    // Captured outside the closure — TS property narrowing doesn't survive
    // into the async transaction callback.
    const newSlug = validated.slug;
    let slugRedirect: { sourcePath: string; destinationPath: string } | null = null;
    try {
      slugRedirect = await db.transaction(async (tx) => {
        const [current] = await tx
          .select({
            slug: articles.slug,
            status: articles.status,
            publishedAt: articles.publishedAt,
            categorySlug: inspireCategories.slug,
          })
          .from(articles)
          .leftJoin(inspireCategories, eq(articles.primaryCategoryId, inspireCategories.id))
          .where(eq(articles.id, articleId))
          .limit(1);

        const isOrWasPublished =
          current?.status === 'published' ||
          validated.status === 'published' ||
          current?.publishedAt != null;

        let redirect: { sourcePath: string; destinationPath: string } | null = null;
        if (current?.categorySlug && current.slug !== newSlug && isOrWasPublished) {
          // Category slug of the DESTINATION: the new primary category when it's
          // changing in this same save, otherwise the current one. The SOURCE
          // always uses the old category — that's where the old URL lived.
          let newCategorySlug = current.categorySlug;
          if (validated.primaryCategoryId) {
            const [newCat] = await tx
              .select({ slug: inspireCategories.slug })
              .from(inspireCategories)
              .where(eq(inspireCategories.id, validated.primaryCategoryId))
              .limit(1);
            if (newCat?.slug) newCategorySlug = newCat.slug;
          }
          redirect = buildArticleSlugRedirect({
            oldCategorySlug: current.categorySlug,
            oldSlug: current.slug,
            newCategorySlug,
            newSlug,
          });
        }

        await tx.update(articles).set(updateData).where(eq(articles.id, articleId));

        if (!redirect) return null;
        const { sourcePath, destinationPath } = redirect;

        // Upsert old path → new path (re-renaming reuses the same source row).
        await tx
          .insert(redirects)
          .values({
            sourcePath,
            destinationPath,
            statusCode: 301,
            isActive: true,
            note: `auto: article slug change ${articleId}`,
          })
          .onConflictDoUpdate({
            target: redirects.sourcePath,
            set: {
              destinationPath,
              statusCode: 301,
              isActive: true,
              note: `auto: article slug change ${articleId}`,
              updatedAt: new Date(),
            },
          });

        // Chain flattening: rows that pointed at the old path (x→y when y→z)
        // now point directly at the new path (x→z), never through the middle.
        // Also match the trailing-slash variant — the middleware normalizes
        // source paths on load, but destinations are stored verbatim.
        await tx
          .update(redirects)
          .set({ destinationPath, updatedAt: new Date() })
          .where(inArray(redirects.destinationPath, [sourcePath, `${sourcePath}/`]));

        // Loop guard: nothing may redirect away from the article's new live
        // path (covers rename A→B then back B→A). The trailing-slash variant
        // normalizes to the same middleware map key, so deactivate it too.
        await tx
          .update(redirects)
          .set({ isActive: false, updatedAt: new Date() })
          .where(inArray(redirects.sourcePath, [destinationPath, `${destinationPath}/`]));

        return redirect;
      });
    } catch {
      // Rollback keeps the old slug and redirects intact; surface the standard
      // error shape (most likely cause: the new slug is already taken).
      return {
        error:
          'Failed to save changes. If you changed the slug, the new slug may already be in use.',
      };
    }

    if (slugRedirect) {
      // After commit only — logAuditEvent is fire-and-forget via after(), so it
      // could never join the transaction; post-commit means no log on rollback.
      logAuditEvent({
        entityType: 'article',
        entityId: articleId,
        action: 'slug_redirect_created',
        performedBy: user.id,
        metadata: { from: slugRedirect.sourcePath, to: slugRedirect.destinationPath },
      });
    }
  } else {
    await db.update(articles).set(updateData).where(eq(articles.id, articleId));
  }

  // Sync the derived indexes (media_article_usage, whatsapp_link_placements)
  // when content changes. Both are reporting data rebuilt from the article's
  // content, never article content itself — so they were already non-fatal, and
  // there is no reason to make the author wait for them. Deferring to after()
  // takes them off the response's critical path (and out of the window where
  // they contend with the save for the same 5-lane pool); `logAuditEvent` below
  // is the existing precedent. The try/catch stays INSIDE the callback so a
  // failure is still logged and still cannot fail the save.
  if ('content' in validated && validated.content) {
    const articleContent = validated.content;

    const syncDerivedIndexes = async () => {
      try {
        await syncMediaUsage(articleId, articleContent);
      } catch (err) {
        console.warn('Failed to sync media usage:', err);
      }
    };

    // after() throws outside a request scope (e.g. unit tests); fall back to
    // running inline so the reconcile still happens. Mirrors lib/audit/log.ts.
    try {
      after(syncDerivedIndexes);
    } catch {
      await syncDerivedIndexes();
    }
  }

  // Diff against the pre-save row rather than listing what the client sent.
  // The editor PUTs every column on every save, so `Object.keys(validated)`
  // recorded the same 17 field names whether the author retitled the article or
  // fixed one typo — 57% of all audit rows, none of them saying anything.
  // Restrict the diff to the columns actually snapshotted above; anything else
  // in updateData (content, cover-image blobs) has no `old` to compare against.
  const changes = diffFields(beforeRow, updateData, Object.keys(beforeRow ?? {}));

  logAuditEvent({
    entityType: 'article',
    entityId: articleId,
    action: 'updated',
    performedBy: user.id,
    entityLabel: (updateData.title as string | undefined) ?? beforeRow?.title ?? null,
    changes,
  });

  // Does this save change anything a public reader can see? Only if the article
  // is published now or was published before (an unpublish must still clear the
  // stale public page). A draft that was never published has no public surface,
  // so revalidating `/artikel` for it forced a public re-render storm that
  // contended for the same 5-lane pool the save was already holding — logs
  // showed 57014 on public /inspire/... pages in the same second as the save.
  const affectsPublic = beforeRow?.status === 'published' || updateData.status === 'published';

  // Admin-only path. Skipped on autosave, and only on autosave.
  //
  // Next.js re-renders this page inside the Server Action's response, so this
  // line makes the 60-second autosave *pay for its own cache bust*: it throws
  // away the entry the very next render has to rebuild, at ~13 DB round-trips
  // against a 5-wide pool, forever. That is the loop behind the live Sentry
  // evidence — `deadline_exceeded:auth_findAdminRow` ×128 and ~334 degraded
  // panels, all tagged `POST /admin/inspire/{id}/edit`, while the DB sat idle.
  //
  // Nothing is lost by skipping it here. An autosave's write came FROM this
  // editor's own client state, so the admin is already looking at the newest
  // values; there is no other reader of this path to inform. An explicit save
  // still revalidates, which is what keeps "save, then navigate away and back"
  // showing the write. Public invalidation below is deliberately NOT gated on
  // `silent` — a published article's readers must see an autosaved edit.
  if (!options?.silent) revalidatePath(`/admin/inspire/${articleId}/edit`);
  if (affectsPublic) revalidatePath('/artikel');

  // Revalidate both old and new category article paths so the redirect works
  // immediately. Same public-visibility gate: a never-published draft has no
  // page at either path, so there is nothing to re-render. The redirect-history
  // insert below is NOT gated — that record is admin reporting data and must be
  // written whether or not the article was ever public.
  if (redirectedFrom && redirectedTo && articleSlug) {
    if (affectsPublic) {
      revalidatePath(`/artikel/${redirectedFrom}/${articleSlug}`);
      revalidatePath(`/artikel/${redirectedTo}/${articleSlug}`);
    }

    // Persist redirect history
    const [profile] = await db
      .select({ firstName: profiles.firstName, lastName: profiles.lastName })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);
    const changedByName = profile
      ? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || 'Admin'
      : 'Admin';

    await db.insert(articleCategoryRedirects).values({
      articleId,
      fromCategorySlug: redirectedFrom,
      toCategorySlug: redirectedTo,
      changedByName,
    });
  }

  // Tag invalidation runs LAST so all DB writes (including the
  // articleCategoryRedirects insert above) are visible by the time a
  // public re-render reads them. Putting it earlier would race the
  // redirect insert against the cache rebuild. Gated on the same
  // public-visibility test as `/artikel` above.
  if (affectsPublic) revalidateTag('articles', PURGE_IMMEDIATELY);

  // Moving an article between authors changes BOTH archives — the one it left
  // and the one it joined — and those are cached on the author tag, not the
  // article tag. Fired whenever the picker sent a value (even if it matched the
  // stored one): the cost is one extra cache bust, and the alternative is
  // reasoning about whether `beforeRow` was read before or after the write.
  if (authorChanged && affectsPublic) revalidateTag(INSPIRE_AUTHORS_TAG, PURGE_IMMEDIATELY);

  // `affectsPublic` is returned so the caller can pass it to the sibling
  // actions it fires as part of the same save (see
  // `updateArticleCategoriesAction`). Without that, those actions' own
  // unconditional `revalidateTag` would re-trigger the very public re-render
  // storm this gate exists to prevent — silently undoing the fix.
  return { success: true, redirectedFrom, redirectedTo, affectsPublic };
}

/**
 * @param affectsPublic Whether this save changes anything a public reader can
 * see. Pass the value returned by `updateArticleAction` when this runs as part
 * of the same save. Defaults to `true` so any other caller keeps the old,
 * always-invalidate behaviour.
 * @param options.silent Set by the 60-second autosave, exactly as on
 * `updateArticleAction`. Suppresses ONLY the self-targeted `revalidatePath` on
 * this editor's own path; public invalidation is unaffected.
 */
export async function updateArticleCategoriesAction(
  articleId: string,
  categoryIds: string[],
  affectsPublic = true,
  options?: { silent?: boolean },
) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };
  if (!parseArticleId(articleId)) return { error: 'Invalid article ID' };

  await db.transaction(async (tx) => {
    await tx.delete(articleCategories).where(eq(articleCategories.articleId, articleId));

    if (categoryIds.length > 0) {
      await tx.insert(articleCategories).values(
        categoryIds.map((categoryId) => ({
          articleId,
          categoryId,
        })),
      );
    }
  });

  // Same gate as `updateArticleAction`, for the same reason — and it has to be
  // here too or the fix is only half-applied. The editor fires this action
  // immediately after every save INCLUDING autosave, so leaving it
  // unconditional means the autosave still busts the editor's own cache on the
  // common path: `updateArticleAction` politely skips its `revalidatePath`, and
  // then this call throws the entry away one line later anyway.
  if (!options?.silent) revalidatePath(`/admin/inspire/${articleId}/edit`);
  if (affectsPublic) revalidateTag('articles', PURGE_IMMEDIATELY);
  return { success: true };
}

export async function updateArticleTagsAction(articleId: string, tagIds: string[]) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };
  if (!parseArticleId(articleId)) return { error: 'Invalid article ID' };

  await db.transaction(async (tx) => {
    await tx.delete(articleTags).where(eq(articleTags.articleId, articleId));

    if (tagIds.length > 0) {
      await tx.insert(articleTags).values(
        tagIds.map((tagId) => ({
          articleId,
          tagId,
        })),
      );
    }
  });

  logAuditEvent({
    entityType: 'article',
    entityId: articleId,
    action: 'tags_updated',
    performedBy: user.id,
    metadata: { tagIds },
  });

  revalidatePath(`/admin/inspire/${articleId}/edit`);
  revalidateTag('articles', PURGE_IMMEDIATELY);
  return { success: true };
}

/**
 * `articleId` reaches these actions as raw client input and is bound straight
 * into a `uuid` column. Without this guard a malformed value reaches Postgres
 * and throws 22P02, which escapes as an unhandled server-action rejection —
 * `useActionState` never receives an `{ error }`, so the form shows nothing at
 * all. That silent-failure mode is the exact bug this whole change removes.
 */
export async function regenerateArticleImagesAction(articleId: string) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };
  if (!parseArticleId(articleId)) return { error: 'Invalid article ID' };

  const [article] = await db
    .select({
      id: articles.id,
      coverImageUrl: articles.coverImageUrl,
      coverImageVariants: articles.coverImageVariants,
      coverImageFocalPointOverride: articles.coverImageFocalPointOverride,
      coverImageDetectionData: articles.coverImageDetectionData,
    })
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);

  if (!article) return { error: 'Article not found' };
  if (!article.coverImageUrl) return { error: 'No cover image' };

  const r2Key = resolveOriginalKey(article.coverImageVariants, article.coverImageUrl);

  // Download original from R2
  const r2 = getR2Client();
  const bucket = getR2Bucket();
  const response = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: r2Key }));

  if (!response.Body) return { error: 'Original image not found in R2' };
  const originalBuffer = Buffer.from(await response.Body.transformToByteArray());

  // Generate variants
  const presets = await getDefaultPresets();
  const variants = await generateVariants(originalBuffer, r2Key, presets);

  // Generate smart crops (pass buffer to avoid redundant R2 download).
  // A stored manual focal point is REUSED rather than re-detected — otherwise
  // regenerating variants silently discards the admin's chosen point while
  // leaving the override column populated.
  const framing = framingFromStoredOverride(
    article.coverImageFocalPointOverride,
    article.coverImageDetectionData,
  );
  const { focalPoint, detectionData, smartCrops } = await processSmartCrops(r2Key, {
    ...framing,
    originalBuffer,
  });

  // Update DB
  await db
    .update(articles)
    .set({
      coverImageVariants: variants,
      coverImageQuality: 'high',
      coverImageFocalPoint: focalPoint,
      coverImageSmartCrops: smartCrops,
      // The override branch returns `detectionData: null`; persisting it would
      // destroy the stored faces that safe-zone rebuilds depend on.
      ...(framing ? {} : { coverImageDetectionData: detectionData }),
      updatedAt: new Date(),
    })
    .where(eq(articles.id, articleId));

  logAuditEvent({
    entityType: 'article',
    entityId: articleId,
    action: 'images_regenerated',
    performedBy: user.id,
  });

  revalidatePath(`/admin/inspire/${articleId}/edit`);
  revalidatePath('/admin/inspire');
  revalidatePath('/artikel');
  revalidateTag('articles', PURGE_IMMEDIATELY);
  return { success: true, variants, smartCrops };
}

// ── Client share link ──────────────────────────────────────────────────

/**
 * Mint (or return) the client review link for a draft.
 *
 * Deliberately NOT a rotate: if the article already has a token, the same URL
 * comes back. An admin who opens the dialog twice must not silently break the
 * link they already emailed the client — revoking is the explicit, separate
 * action below.
 *
 * Mirrors the moodboard precedent (`(couple)/moodboard/[boardId]/actions.ts`),
 * with this file's admin-section guard and audit logging.
 *
 * The mint is ONE statement — `COALESCE(share_token, $new)` — not a read
 * followed by a write. Read-then-write is a check-then-act race: two admins (or
 * one admin double-clicking, or a re-mounting effect) both read NULL, both mint
 * a fresh UUID, and the second UPDATE overwrites the first — silently killing a
 * URL the first admin may already have emailed. The unique index does not save
 * us, because two *different* UUIDs both satisfy it. COALESCE makes the
 * "already has a token" branch a property of the write itself, so whichever
 * transaction lands second observes the winner's token and returns it. The
 * RETURNING value — never the locally generated UUID — is what builds the path.
 */
export async function generateArticleShareLinkAction(articleId: string) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };
  if (!parseArticleId(articleId)) return { error: 'Invalid article ID' };

  const [existing] = await db
    .select({ status: articles.status, shareToken: articles.shareToken })
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);

  if (!existing) return { error: 'Article not found' };

  // Defence in depth: the editor only offers "Share with client" on a draft, so
  // reaching here with anything else means a stale tab or a hand-rolled call.
  // A published article has a real public URL; a deleted one has no content to
  // review. Neither should be handed a review link.
  if (existing.status !== 'draft') {
    return { error: 'Only draft articles can be shared for review' };
  }

  const candidate = crypto.randomUUID();

  const [updated] = await db
    .update(articles)
    .set({ shareToken: sql`COALESCE(${articles.shareToken}, ${candidate})` })
    .where(eq(articles.id, articleId))
    .returning({ shareToken: articles.shareToken });

  if (!updated?.shareToken) return { error: 'Article not found' };

  // Only log a mint when this call is the one that actually created the token —
  // returning an existing link is a read, not a state change.
  if (updated.shareToken === candidate) {
    logAuditEvent({
      entityType: 'article',
      entityId: articleId,
      action: 'share_link_generated',
      performedBy: user.id,
    });
  }

  revalidatePath(`/admin/inspire/${articleId}/edit`);
  return { success: true, shareUrl: `/draft/${updated.shareToken}` };
}

/**
 * Kill the client review link. The old URL 404s immediately and permanently —
 * a later regenerate mints a brand-new token, it never resurrects this one.
 */
export async function revokeArticleShareLinkAction(articleId: string) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };
  if (!parseArticleId(articleId)) return { error: 'Invalid article ID' };

  // `.returning()` is what makes "did anything actually happen?" answerable: a
  // bogus id updates zero rows, which a bare UPDATE reports as success. That
  // would tell the admin the client's link is dead while it stays live, and
  // write an audit entry claiming a revoke that never occurred.
  const [revoked] = await db
    .update(articles)
    .set({ shareToken: null })
    .where(eq(articles.id, articleId))
    .returning({ id: articles.id });

  if (!revoked) return { error: 'Article not found' };

  logAuditEvent({
    entityType: 'article',
    entityId: articleId,
    action: 'share_link_revoked',
    performedBy: user.id,
  });

  revalidatePath(`/admin/inspire/${articleId}/edit`);
  return { success: true };
}

// ── Edit lock actions ──────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function acquireLockAction(articleId: string) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };
  if (!UUID_RE.test(articleId)) return { error: 'Invalid article ID' };

  const [profile] = await db
    .select({ firstName: profiles.firstName, lastName: profiles.lastName })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);
  const lockedByName = profile
    ? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || 'Admin'
    : 'Admin';

  // Atomic upsert: only succeeds if no lock, own lock, or expired lock
  const [acquired] = await db
    .insert(articleEditLocks)
    .values({
      articleId,
      lockedBy: user.id,
      lockedByName,
      lockedAt: sql`now()`,
      expiresAt: sql`now() + interval '5 minutes'`,
    })
    .onConflictDoUpdate({
      target: articleEditLocks.articleId,
      set: {
        lockedBy: user.id,
        lockedByName,
        lockedAt: sql`now()`,
        expiresAt: sql`now() + interval '5 minutes'`,
      },
      where: sql`${articleEditLocks.lockedBy} = ${user.id} OR ${articleEditLocks.expiresAt} < now()`,
    })
    .returning({ id: articleEditLocks.id });

  if (!acquired) {
    // Lock is held by someone else and not expired — read who holds it
    const [existing] = await db
      .select({
        lockedByName: articleEditLocks.lockedByName,
        expiresAt: articleEditLocks.expiresAt,
      })
      .from(articleEditLocks)
      .where(eq(articleEditLocks.articleId, articleId))
      .limit(1);
    return {
      error: 'locked' as const,
      lockedByName: existing?.lockedByName ?? 'Another admin',
      expiresAt: existing?.expiresAt?.toISOString() ?? '',
    };
  }

  return { success: true };
}

export async function renewLockAction(articleId: string) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };
  if (!UUID_RE.test(articleId)) return { error: 'Invalid article ID' };

  // Atomic: single UPDATE with RETURNING to confirm ownership
  const [renewed] = await db
    .update(articleEditLocks)
    .set({ expiresAt: sql`now() + interval '5 minutes'` })
    .where(and(eq(articleEditLocks.articleId, articleId), eq(articleEditLocks.lockedBy, user.id)))
    .returning({ id: articleEditLocks.id });

  if (!renewed) {
    return { error: 'lock_lost' as const };
  }

  return { success: true };
}

export async function releaseLockAction(articleId: string) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };
  if (!UUID_RE.test(articleId)) return { error: 'Invalid article ID' };

  await db
    .delete(articleEditLocks)
    .where(and(eq(articleEditLocks.articleId, articleId), eq(articleEditLocks.lockedBy, user.id)));

  return { success: true };
}

export async function checkLockAction(articleId: string) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { locked: false as const };
  if (!UUID_RE.test(articleId)) return { locked: false as const };

  const [lock] = await db
    .select()
    .from(articleEditLocks)
    .where(eq(articleEditLocks.articleId, articleId))
    .limit(1);

  if (!lock || lock.expiresAt < new Date()) {
    return { locked: false as const };
  }

  if (lock.lockedBy === user.id) {
    return { locked: false as const, ownLock: true };
  }

  return {
    locked: true as const,
    lockedByName: lock.lockedByName,
    expiresAt: lock.expiresAt.toISOString(),
  };
}

// ── Media usage sync ───────────────────────────────────────────────────

async function syncMediaUsage(articleId: string, content: unknown) {
  const imageUrls = extractImageUrlsFromContent(content);

  // Resolve the URLs to media rows BEFORE opening the transaction. This read
  // needs no transactional scope — it only maps content URLs to ids — and
  // running it inside one held a pool lane open for the whole lookup. That is
  // what converted "slow" into "hung": with only 5 lanes, a save monopolising
  // one across this scan starved concurrent requests, and postgres-js leaves
  // connection acquisition unbounded so they rode to the 30s function ceiling
  // instead of failing fast. See migration 20260802161833_media_url_index.sql.
  const mediaRecords = imageUrls.length
    ? await db
        .select({ id: media.id, url: media.url })
        .from(media)
        .where(inArray(media.url, imageUrls))
    : [];

  const mediaIds = new Set(mediaRecords.map((r) => r.id));

  // The reconcile itself stays transactional so concurrent saves of the same
  // article can't interleave into a half state.
  await db.transaction(async (tx) => {
    if (imageUrls.length === 0) {
      // No images — remove all usage records for this article
      await tx.delete(mediaArticleUsage).where(eq(mediaArticleUsage.articleId, articleId));
      return;
    }

    // Get current usage records
    const currentUsages = await tx
      .select({ mediaId: mediaArticleUsage.mediaId })
      .from(mediaArticleUsage)
      .where(eq(mediaArticleUsage.articleId, articleId));

    const currentMediaIds = new Set(currentUsages.map((u) => u.mediaId));

    // Insert new usages
    const toInsert = [...mediaIds].filter((id) => !currentMediaIds.has(id));
    if (toInsert.length > 0) {
      await tx
        .insert(mediaArticleUsage)
        .values(toInsert.map((mediaId) => ({ mediaId, articleId })))
        .onConflictDoNothing();
    }

    // Remove stale usages
    const toRemove = [...currentMediaIds].filter((id) => !mediaIds.has(id));
    if (toRemove.length > 0) {
      await tx
        .delete(mediaArticleUsage)
        .where(
          and(
            eq(mediaArticleUsage.articleId, articleId),
            inArray(mediaArticleUsage.mediaId, toRemove),
          ),
        );
    }
  });
}

export async function deleteRedirectAction(redirectId: string, articleId: string) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  await db
    .delete(articleCategoryRedirects)
    .where(
      and(
        eq(articleCategoryRedirects.id, redirectId),
        eq(articleCategoryRedirects.articleId, articleId),
      ),
    );

  logAuditEvent({
    entityType: 'article',
    entityId: articleId,
    action: 'redirect_deleted',
    performedBy: user.id,
    metadata: { redirectId },
  });

  revalidatePath(`/admin/inspire/${articleId}/edit`);
  return { success: true };
}
