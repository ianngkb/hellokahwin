'use server';

import { revalidatePath, revalidateTag, updateTag } from 'next/cache';
import { PURGE_IMMEDIATELY } from '@/lib/cache/purge';
import { and, eq, ne, count, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { inspireCategories, articleCategories } from '@/lib/db/schema/articles';
import { requireAdminSectionAction } from '@/lib/auth/admin';
import { INSPIRE_CATEGORIES_TAG } from '@/lib/inspire/cached-lists';
import { logAuditEvent } from '@/lib/audit/log';
import { generateSlug } from '@/lib/utils/slug';
import { categoryCreateSchema } from '@/lib/validations/article';
import {
  NO_SLUG_ERROR,
  isReservedCategorySlug,
  isUniqueViolation,
  reservedCategorySlugError,
} from '@/lib/inspire/taxonomy-slugs';

async function categorySlugTaken(slug: string, exceptId?: string): Promise<boolean> {
  const [row] = await db
    .select({ id: inspireCategories.id })
    .from(inspireCategories)
    .where(
      exceptId
        ? and(eq(inspireCategories.slug, slug), ne(inspireCategories.id, exceptId))
        : eq(inspireCategories.slug, slug),
    )
    .limit(1);
  return !!row;
}

/** Returns the depth (1-based) of a category by walking its ancestor chain. */
async function getCategoryDepth(categoryId: string): Promise<number> {
  const result = await db.execute<{ depth: number }>(sql`
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_id, 1 AS depth
      FROM inspire_categories WHERE id = ${categoryId}
      UNION ALL
      SELECT ic.id, ic.parent_id, a.depth + 1
      FROM inspire_categories ic
      JOIN ancestors a ON ic.id = a.parent_id
    )
    SELECT COALESCE(MAX(depth), 0) AS depth FROM ancestors
  `);
  return Number(result[0]?.depth ?? 0);
}

/** Returns the max depth of descendants below a category (0 if no children). */
async function getMaxDescendantDepth(categoryId: string): Promise<number> {
  const result = await db.execute<{ depth: number }>(sql`
    WITH RECURSIVE desc_tree AS (
      SELECT id, 1 AS depth FROM inspire_categories WHERE parent_id = ${categoryId}
      UNION ALL
      SELECT ic.id, dt.depth + 1 FROM inspire_categories ic JOIN desc_tree dt ON ic.parent_id = dt.id
    )
    SELECT COALESCE(MAX(depth), 0) AS depth FROM desc_tree
  `);
  return Number(result[0]?.depth ?? 0);
}

/** Checks if targetId is a descendant of categoryId. */
async function isDescendant(categoryId: string, targetId: string): Promise<boolean> {
  const result = await db.execute(sql`
    WITH RECURSIVE descendants AS (
      SELECT id FROM inspire_categories WHERE parent_id = ${categoryId}
      UNION ALL
      SELECT ic.id FROM inspire_categories ic JOIN descendants d ON ic.parent_id = d.id
    )
    SELECT 1 FROM descendants WHERE id = ${targetId} LIMIT 1
  `);
  return Array.from(result).length > 0;
}

export async function createCategoryAction(_prev: unknown, formData: FormData) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  const parsed = categoryCreateSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug') || undefined,
    description: formData.get('description') || undefined,
    parentId: formData.get('parentId') || '',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const name = parsed.data.name;
  const description = parsed.data.description || null;
  const rawParentId = parsed.data.parentId;
  const parentId = rawParentId && rawParentId !== 'none' ? rawParentId : null;
  const slug = parsed.data.slug || generateSlug(name);
  // Slug rules ported from The Wedding Notebook: never store an empty slug,
  // never shadow a static `/artikel/*` route, and say so when it is taken
  // instead of letting the unique index surface as a 500.
  if (!slug) return { error: NO_SLUG_ERROR };
  if (isReservedCategorySlug(slug)) return { error: reservedCategorySlugError(slug) };
  if (await categorySlugTaken(slug)) {
    return { error: `A category with slug "${slug}" already exists` };
  }

  // Validate depth: new category would be at parentDepth + 1
  if (parentId) {
    const parentDepth = await getCategoryDepth(parentId);
    if (parentDepth >= 3) {
      return { error: 'Cannot create category: maximum depth of 3 levels reached' };
    }
  }

  let category: { id: string };
  try {
    [category] = await db
      .insert(inspireCategories)
      .values({
        name,
        slug,
        description,
        parentId: parentId || null,
      })
      .returning({ id: inspireCategories.id });
  } catch (err) {
    // Raced another create of the same slug past the pre-check.
    if (isUniqueViolation(err)) return { error: `A category with slug "${slug}" already exists` };
    throw err;
  }

  logAuditEvent({
    entityType: 'inspire_category',
    entityId: category.id,
    action: 'created',
    performedBy: user.id,
    metadata: { name, slug, parentId },
  });

  revalidatePath('/admin/inspire/categories');
  revalidatePath('/artikel');
  revalidateTag(INSPIRE_CATEGORIES_TAG, PURGE_IMMEDIATELY);
  // The article editor now reads the category tree from a `cachedJson` entry on
  // this same tag, so that it stops costing a DB round-trip on every render and
  // every autosave. `updateTag` is the server-action-only variant that gives
  // read-your-own-writes: without it the admin who just renamed a category would
  // keep seeing the old name in the editor's selects until the 300s TTL expired.
  updateTag(INSPIRE_CATEGORIES_TAG);
  // Article cards display category names — invalidate article caches too.
  revalidateTag('articles', PURGE_IMMEDIATELY);
  return { success: true };
}

export async function updateCategoryAction(_prev: unknown, formData: FormData) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  const id = formData.get('id') as string;
  if (!id) return { error: 'Category ID is required' };

  const parsed = categoryCreateSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug') || undefined,
    description: formData.get('description') || undefined,
    parentId: formData.get('parentId') || '',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const name = parsed.data.name;
  // A cleared slug is regenerated from the name (ported from The Wedding
  // Notebook) — it used to be written as '' and leave the category at no URL.
  const slug = parsed.data.slug || generateSlug(name);
  const description = parsed.data.description || null;
  const rawParentId = parsed.data.parentId;
  const parentId = rawParentId && rawParentId !== 'none' ? rawParentId : null;

  if (!slug) return { error: NO_SLUG_ERROR };

  const [existing] = await db
    .select({ slug: inspireCategories.slug })
    .from(inspireCategories)
    .where(eq(inspireCategories.id, id))
    .limit(1);
  if (!existing) return { error: 'Category not found' };

  // The reserved rule applies only when the slug CHANGES: the edit dialog
  // resubmits the stored slug on every save, so a category that already holds
  // one must still be renameable.
  if (existing.slug !== slug && isReservedCategorySlug(slug)) {
    return { error: reservedCategorySlugError(slug) };
  }
  if (await categorySlugTaken(slug, id)) {
    return { error: `A category with slug "${slug}" already exists` };
  }

  // Validate depth constraints when parent is changing
  if (parentId) {
    // Prevent self-reference
    if (parentId === id) {
      return { error: 'A category cannot be its own parent' };
    }

    // Prevent circular reference
    if (await isDescendant(id, parentId)) {
      return { error: 'Cannot set parent: would create circular reference' };
    }

    // Check new parent depth
    const parentDepth = await getCategoryDepth(parentId);
    if (parentDepth >= 3) {
      return { error: 'Cannot move category: maximum depth of 3 levels reached' };
    }

    // Check descendants won't exceed depth 3
    const maxDescDepth = await getMaxDescendantDepth(id);
    if (parentDepth + 1 + maxDescDepth > 3) {
      return { error: 'Cannot move category: descendants would exceed maximum depth of 3 levels' };
    }
  }

  try {
    await db
      .update(inspireCategories)
      .set({ name, slug, description, parentId: parentId || null, updatedAt: new Date() })
      .where(eq(inspireCategories.id, id));
  } catch (err) {
    if (isUniqueViolation(err)) return { error: `A category with slug "${slug}" already exists` };
    throw err;
  }

  logAuditEvent({
    entityType: 'inspire_category',
    entityId: id,
    action: 'updated',
    performedBy: user.id,
    metadata: { name, slug },
  });

  revalidatePath('/admin/inspire/categories');
  revalidatePath('/artikel');
  revalidateTag(INSPIRE_CATEGORIES_TAG, PURGE_IMMEDIATELY);
  updateTag(INSPIRE_CATEGORIES_TAG);
  // Article cards display category names — invalidate article caches too.
  revalidateTag('articles', PURGE_IMMEDIATELY);
  return { success: true };
}

export async function deleteCategoryAction(categoryId: string) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  // Check if category has articles assigned
  const [result] = await db
    .select({ count: count() })
    .from(articleCategories)
    .where(eq(articleCategories.categoryId, categoryId));

  if (result && result.count > 0) {
    return { error: `Cannot delete: ${result.count} article(s) are assigned to this category` };
  }

  // Check for child categories
  const [children] = await db
    .select({ count: count() })
    .from(inspireCategories)
    .where(eq(inspireCategories.parentId, categoryId));

  if (children && children.count > 0) {
    return { error: 'Cannot delete: this category has subcategories. Remove them first.' };
  }

  await db.delete(inspireCategories).where(eq(inspireCategories.id, categoryId));

  logAuditEvent({
    entityType: 'inspire_category',
    entityId: categoryId,
    action: 'deleted',
    performedBy: user.id,
  });

  revalidatePath('/admin/inspire/categories');
  revalidatePath('/artikel');
  revalidateTag(INSPIRE_CATEGORIES_TAG, PURGE_IMMEDIATELY);
  updateTag(INSPIRE_CATEGORIES_TAG);
  // Article cards display category names — invalidate article caches too.
  revalidateTag('articles', PURGE_IMMEDIATELY);
  return { success: true };
}

export async function reorderCategoriesAction(orderedIds: string[]) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(inspireCategories)
        .set({ displayOrder: i })
        .where(eq(inspireCategories.id, orderedIds[i]));
    }
  });

  revalidatePath('/admin/inspire/categories');
  revalidatePath('/artikel');
  revalidateTag(INSPIRE_CATEGORIES_TAG, PURGE_IMMEDIATELY);
  updateTag(INSPIRE_CATEGORIES_TAG);
  // Article cards display category names — invalidate article caches too.
  revalidateTag('articles', PURGE_IMMEDIATELY);
  return { success: true };
}
