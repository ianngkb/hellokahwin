import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { cachedJson } from '@/lib/cache/cached-json';
import { inspireCategories, inspireTags } from '@/lib/db/schema/articles';
import { dynamicBlocks } from '@/lib/db/schema/dynamic-blocks';

/**
 * The three article-INDEPENDENT lists the article editor loads on every render.
 *
 * WHY CACHE THESE SPECIFICALLY. `/admin/inspire/{id}/edit` costs ~13 DB
 * round-trips per render against a 5-wide postgres-js pool, and Next.js
 * re-renders the page inside every Server Action response — so the 60-second
 * autosave pays that bill again, forever. Live Sentry evidence (2026-08-07)
 * shows what that does under load: `deadline_exceeded:auth_findAdminRow` ×128
 * and ~334 `Degraded admin analytics panel` warnings tagged
 * `POST /admin/inspire/{id}/edit`, all while the DB itself was idle (24/90
 * connections, 1 active). The starvation is self-inflicted, so the fix is to
 * cut demand rather than raise supply ([[pool-starvation-acquisition-wait]]).
 *
 * These three reads are the cheapest to remove because their results do not
 * depend on which article is open: every editor session issues the *identical*
 * query and gets the *identical* answer. The category tree, the tag vocabulary
 * and the published dynamic-block list are all admin-curated reference data that
 * changes a few times a week, not a few times a minute. Caching them takes 3
 * round-trips off every render — the ~13 → ~7 the spec is measured against.
 *
 * The five reads that stay live are the article-scoped ones (this article's
 * categories, tags, vendor credits, edit lock, redirect history). Those must
 * never be shared between articles, and their staleness is the thing the
 * degraded-control contract is built to detect.
 *
 * WHY `cachedJson` AND NOT BARE `unstable_cache`. `unstable_cache` persists its
 * value as JSON, so a `Date` in the payload silently becomes a string on a cache
 * HIT while the types still claim `Date` — a bug that only appears in production,
 * only after the TTL warms. `cachedJson` makes that a compile error instead (see
 * `src/lib/cache/json-safe.ts`). All three getters below select scalar columns
 * only, which is why they satisfy it.
 *
 * WHY 300s AND A TAG. The TTL is the backstop, not the mechanism: every admin
 * write path already fires `revalidateTag('inspire-categories')` /
 * `revalidateTag('inspire-tags')` (the public `/artikel` pages have been tagged
 * consumers for a while), so an edit shows up in the editor immediately rather
 * than after the window. 300s only bounds how long a change made OUTSIDE those
 * actions — a direct SQL fix, a script — can stay invisible.
 */

/** Cache tags. Shared with the public `/artikel` routes, which tag on the same keys. */
export const INSPIRE_CATEGORIES_TAG = 'inspire-categories';
export const INSPIRE_TAGS_TAG = 'inspire-tags';
export const DYNAMIC_BLOCKS_TAG = 'dynamic-blocks';

/** How long a change made outside the admin write actions can stay invisible. */
const LIST_REVALIDATE_SECONDS = 300;

export interface InspireCategoryOption {
  id: string;
  name: string;
  parentId: string | null;
  slug: string;
}

export interface InspireTagOption {
  id: string;
  name: string;
  slug: string;
  isHidden: boolean;
}

export interface DynamicBlockOption {
  id: string;
  name: string;
  placement: string;
}

/**
 * The full category tree for the editor's category selects.
 *
 * Column list and `ORDER BY` are kept byte-identical to the query this replaces
 * in `page.tsx` — the editor classifies the article's own category ids into
 * secondary/tertiary by walking `parentId`, so dropping a column or reordering
 * here would change which ids land in which select.
 */
export const getInspireCategoriesCached = cachedJson(
  async (): Promise<InspireCategoryOption[]> =>
    db
      .select({
        id: inspireCategories.id,
        name: inspireCategories.name,
        parentId: inspireCategories.parentId,
        slug: inspireCategories.slug,
      })
      .from(inspireCategories)
      .orderBy(inspireCategories.displayOrder),
  ['inspire-categories-list'],
  { tags: [INSPIRE_CATEGORIES_TAG], revalidate: LIST_REVALIDATE_SECONDS },
);

/**
 * Every selectable tag, hidden ones included.
 *
 * Hidden tags stay in the list on purpose — that is the point of the feature.
 * The editor badges them so admins know they won't render publicly. Filtering
 * them out here would quietly remove the ability to apply one.
 */
export const getInspireTagsCached = cachedJson(
  async (): Promise<InspireTagOption[]> =>
    db
      .select({
        id: inspireTags.id,
        name: inspireTags.name,
        slug: inspireTags.slug,
        isHidden: inspireTags.isHidden,
      })
      .from(inspireTags)
      .orderBy(inspireTags.name),
  ['inspire-tags-list'],
  { tags: [INSPIRE_TAGS_TAG], revalidate: LIST_REVALIDATE_SECONDS },
);

/**
 * Published + active dynamic blocks, for the sidebar's Insert picker.
 *
 * Purely additive in the editor — an empty picker offers nothing to insert but
 * destroys nothing — which is why its fallback stays `[]` rather than the `null`
 * sentinel the destructive reads use.
 */
export const getPublishedDynamicBlocksCached = cachedJson(
  async (): Promise<DynamicBlockOption[]> =>
    db
      .select({
        id: dynamicBlocks.id,
        name: dynamicBlocks.name,
        placement: dynamicBlocks.placement,
      })
      .from(dynamicBlocks)
      .where(and(eq(dynamicBlocks.status, 'published'), eq(dynamicBlocks.isActive, true)))
      .orderBy(dynamicBlocks.displayOrder, dynamicBlocks.createdAt),
  ['inspire-dynamic-blocks-list'],
  { tags: [DYNAMIC_BLOCKS_TAG], revalidate: LIST_REVALIDATE_SECONDS },
);
