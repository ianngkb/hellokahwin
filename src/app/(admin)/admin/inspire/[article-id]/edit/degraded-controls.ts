/**
 * Which of the article editor's controls lost their source data on this render.
 *
 * The edit page fans out nine DB reads; eight of them are wrapped in
 * `safePanel`, so a transient failure resolves to a fallback instead of
 * rejecting the whole `Promise.all` and killing the page. For most reads the
 * fallback is `[]` and nothing more is needed. For four of them it is `null`,
 * because their values feed *delete-then-insert* junction writes
 * (`updateArticleCategoriesAction`, `updateArticleTagsAction`) or a list the
 * admin manages by removal (vendor credits) — there, an empty array from a
 * failed read is indistinguishable from "the admin cleared this", and the next
 * autosave would persist the emptiness over real data.
 *
 * So `null` means "couldn't load". This module turns those sentinels into the
 * three per-control booleans the client component needs, and is the single
 * place that decides what "degraded" means for each control:
 *
 *   - `categories` — needs BOTH the full category tree (to render the selects,
 *     and to classify the article's own ids into secondary/tertiary by
 *     `parentId`) and the article's current category ids. Missing either one
 *     yields the wrong id set, so either failing degrades the control. It also
 *     needs the two to AGREE — see `hasUnknownCategoryId` below.
 *   - `tags` — same pairing: the selectable tag list and the article's current
 *     tag ids.
 *   - `vendorCredits` — a single read; its own list.
 *
 * A degraded control renders disabled with a "couldn't load" notice, and its
 * field is omitted from the save payload (see `buildCategorySyncPayload` /
 * `shouldWriteTags`).
 */
export interface DegradedControls {
  categories: boolean;
  tags: boolean;
  vendorCredits: boolean;
}

export const NO_DEGRADED_CONTROLS: DegradedControls = {
  categories: false,
  tags: false,
  vendorCredits: false,
};

/**
 * Does the article sit in a category the loaded tree has never heard of?
 *
 * A MISS is loud: the read failed, `safePanel` hands back `null`, and every
 * guard below fires. STALENESS is silent, and that is the whole problem. The
 * category tree now comes from a 300-second cache (`@/lib/inspire/cached-lists`),
 * so it can be a *complete, non-null, perfectly plausible* list that simply
 * predates a category created moments ago in another tab. Nothing about it looks
 * broken.
 *
 * The editor classifies the article's stored ids into the secondary/tertiary
 * selects by looking each one up in that tree (`categories.find(c => c.id === id)`).
 * An id the tree doesn't contain matches nothing, so it lands in NEITHER list and
 * is simply gone from the client's state. That derived-and-now-shorter set is
 * what `buildCategorySyncPayload` sends to `updateArticleCategoriesAction`, which
 * is delete-then-insert: it wipes the article's category rows and re-inserts only
 * what it was handed. The missing id is not re-inserted. The article silently
 * drops off that category's page — on an AUTOSAVE, with no admin action and no
 * toast, and it stays dropped.
 *
 * So a stale tree is a second laundering path into the exact data loss the `null`
 * sentinel already blocks: "we couldn't classify this" turning into "the admin
 * removed it". Detecting it here routes it into the machinery that already
 * exists — disabled controls, omitted payload, preserved dirty state, the
 * manual-save warning — instead of needing a parallel set of guards.
 *
 * Deliberately conservative: any unknown id degrades. A false positive costs one
 * reload; a false negative permanently loses a category assignment.
 */
function hasUnknownCategoryId(
  allCategories: { id: string }[],
  artCats: { categoryId: string }[],
  primaryCategoryId: string | null | undefined,
): boolean {
  const known = new Set(allCategories.map((c) => c.id));
  // The primary lives on the article row rather than the junction table, but it
  // is classified through the same tree and included in the same sync payload,
  // so an unknown primary is just as destructive.
  if (primaryCategoryId && !known.has(primaryCategoryId)) return true;
  return artCats.some((c) => !known.has(c.categoryId));
}

export function resolveDegradedControls(reads: {
  allCategories: { id: string }[] | null;
  artCats: { categoryId: string }[] | null;
  allTags: unknown[] | null;
  artTags: unknown[] | null;
  /** The article row's own `primary_category_id`, classified through the same tree. */
  primaryCategoryId?: string | null;
}): DegradedControls {
  return {
    categories:
      reads.allCategories === null ||
      reads.artCats === null ||
      hasUnknownCategoryId(reads.allCategories, reads.artCats, reads.primaryCategoryId),
    tags: reads.allTags === null || reads.artTags === null,
    vendorCredits: false,
  };
}

/**
 * The category-sync call that follows every successful save. Returns `null`
 * when the category controls are degraded, meaning: skip the call entirely.
 *
 * `updateArticleCategoriesAction` deletes every `article_categories` row for
 * the article and re-inserts the ids it is handed. With a degraded read the
 * client's derived id set is empty — not because the admin emptied it, but
 * because the source never arrived — so sending it would drop the article off
 * every category page it belongs to. Skipping leaves the existing rows exactly
 * as they are, which is the only safe reading of "we don't know".
 */
export function buildCategorySyncPayload(
  degraded: Pick<DegradedControls, 'categories'>,
  ids: { primaryCategoryId: string; secondaryCategoryIds: string[]; tertiaryCategoryIds: string[] },
): string[] | null {
  if (degraded.categories) return null;
  return [
    ...new Set([
      ...(ids.primaryCategoryId ? [ids.primaryCategoryId] : []),
      ...ids.secondaryCategoryIds,
      ...ids.tertiaryCategoryIds,
    ]),
  ];
}

/**
 * Whether a save may include `primaryCategoryId` in the article-row update.
 *
 * `updateArticleAction` only writes the column when the value is truthy, so an
 * omitted field is a no-op rather than a null-out — but it also derives the
 * slug-change 301 redirect from it, so feeding it a stale/blank value while the
 * category tree is unknown would be wrong in a way that outlives the request.
 */
export function shouldWriteCategories(degraded: Pick<DegradedControls, 'categories'>): boolean {
  return !degraded.categories;
}

/**
 * Whether a tag edit may be persisted. `updateArticleTagsAction` is likewise
 * delete-then-insert, so a degraded tag read must never reach it.
 */
export function shouldWriteTags(degraded: Pick<DegradedControls, 'tags'>): boolean {
  return !degraded.tags;
}

/** The three category fields tracked by the editor's dirty check. */
export interface CategoryDirtyFields {
  primaryCategoryId: string;
  secondaryCategoryIds: string;
  tertiaryCategoryIds: string;
}

/**
 * Fold a completed save's values into the editor's `initialValues` baseline —
 * the snapshot `isDirty` compares against.
 *
 * The subtlety is the category fields. When the category reads failed we skip
 * both the article-row `primaryCategoryId` write and the junction sync, so
 * whatever the admin picked in the (disabled, but portal-reachable) selects was
 * NEVER persisted. Folding those values into the baseline anyway would mark
 * them clean: the dirty dot clears, `beforeunload` stops warning, the toast says
 * "Article saved" — and the category change is silently lost on navigate-away.
 *
 * So when the sync was skipped, the previous category baseline is carried
 * forward unchanged. The fields stay dirty, which is the truth: they are
 * pending, unwritten edits.
 *
 * @param previous the baseline as it stood before this save
 * @param saved    the values this save actually sent
 * @param wroteCategories whether the category writes went through
 */
export function foldSavedValuesIntoBaseline<T extends CategoryDirtyFields>(
  previous: T,
  saved: T,
  wroteCategories: boolean,
): T {
  if (wroteCategories) return saved;
  return {
    ...saved,
    primaryCategoryId: previous.primaryCategoryId,
    secondaryCategoryIds: previous.secondaryCategoryIds,
    tertiaryCategoryIds: previous.tertiaryCategoryIds,
  };
}

/**
 * The warning a MANUAL save must show when it completed but silently dropped
 * the admin's category edits. `null` on the autosave path (which must not spam
 * toasts) and whenever the categories were actually written.
 *
 * A save that reports plain "Article saved" while having discarded a field the
 * admin just changed is worse than the crash this whole change replaced — the
 * admin has no way to know, and navigates away.
 */
export function categorySkipWarning(opts: {
  wroteCategories: boolean;
  silent: boolean;
}): string | null {
  if (opts.wroteCategories || opts.silent) return null;
  return "Saved, but category changes weren't applied — the category list failed to load. Reload the page and set them again.";
}
