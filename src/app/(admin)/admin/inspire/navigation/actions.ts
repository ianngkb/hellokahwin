'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { inspireNavItems, inspireCategories } from '@/lib/db/schema/articles';
import { requireAdminSectionAction } from '@/lib/auth/admin';
import { logAuditEvent } from '@/lib/audit/log';
import { navItemCreateSchema, navItemUpdateSchema } from '@/lib/validations/article';
import { getCategoryFallbackNav } from '@/lib/services/inspire-nav';
import { listNavItems } from './queries';

const REVALIDATE_PATHS = ['/admin/inspire/navigation', '/artikel'];

/**
 * Advisory-lock key for `seedNavFromCategoriesAction`. Arbitrary but fixed —
 * every caller of that action must contend on the same number for the lock to
 * mean anything.
 */
const NAV_SEED_LOCK_KEY = 4820771;

function revalidateAll() {
  for (const p of REVALIDATE_PATHS) revalidatePath(p);
  // revalidatePath does NOT clear unstable_cache entries — `getInspireNavCategories`
  // feeds the navbar on every public page, not just the two paths above.
  revalidateTag('inspire-nav', 'max');
}

/**
 * Seed `inspire_nav_items` from the category menu the public site is already
 * rendering.
 *
 * A WordPress import creates categories but no nav items, so the masthead has
 * been falling back to `getCategoryFallbackNav()` while this admin screen —
 * which reads the table directly and has no fallback — showed nothing. That
 * reads as "the site has no navigation" when in fact it has one that simply
 * isn't editable. Seeding writes the fallback down as real rows, so the menu
 * readers see is the menu this screen manages, and `getMastheadCategories()`
 * stops taking the fallback branch from the next request on.
 *
 * REFUSES to run when the table already has rows. It is a one-time handover,
 * not a reset: re-running it over a hand-curated nav would duplicate every
 * item and resurrect entries an admin had deliberately deleted.
 */
export async function seedNavFromCategoriesAction() {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  const fallback = await getCategoryFallbackNav();
  if (fallback.length === 0) {
    return { error: 'No categories with published articles to seed from.' };
  }

  // The fallback is shaped for rendering and carries slugs, not ids; nav rows
  // FK to `inspire_categories`, so resolve them back here in one read.
  const categories = await db
    .select({ id: inspireCategories.id, slug: inspireCategories.slug })
    .from(inspireCategories);
  const idBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  let seeded = 0;
  let alreadySeeded = false;

  await db.transaction(async (tx) => {
    // The emptiness check has to happen INSIDE the transaction, behind a lock.
    // Two admins clicking "Seed from categories" at the same time would both
    // pass a check made outside it and both insert the full menu, leaving a
    // duplicated navigation that nothing in the UI would explain.
    //
    // A transaction-scoped advisory lock rather than a row lock: there are no
    // rows to lock in the case this guards (the table is empty), so
    // SELECT ... FOR UPDATE has nothing to take. The lock is released on
    // COMMIT or ROLLBACK, so a failed seed cannot wedge the next attempt. The
    // key is an arbitrary constant private to this action.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${NAV_SEED_LOCK_KEY}::bigint)`);

    const [existing] = await tx.select({ id: inspireNavItems.id }).from(inspireNavItems).limit(1);
    if (existing) {
      alreadySeeded = true;
      return;
    }

    for (const [position, parent] of fallback.entries()) {
      const parentCategoryId = idBySlug.get(parent.slug);
      // A slug with no row can only mean the category was deleted between the
      // cached fallback being built and this seed running. Skipping keeps the
      // rest of the menu rather than failing the whole handover.
      if (!parentCategoryId) continue;

      const [inserted] = await tx
        .insert(inspireNavItems)
        .values({
          type: 'category' as const,
          label: parent.name,
          categoryId: parentCategoryId,
          position,
        })
        .returning({ id: inspireNavItems.id });
      seeded++;

      const children = (parent.children ?? [])
        .map((child, i) => ({ child, i }))
        .filter(({ child }) => idBySlug.has(child.slug));
      if (children.length > 0) {
        await tx.insert(inspireNavItems).values(
          children.map(({ child, i }) => ({
            type: 'category' as const,
            label: child.name,
            categoryId: idBySlug.get(child.slug)!,
            parentId: inserted.id,
            position: i,
          })),
        );
        seeded += children.length;
      }
    }
  });

  // Reported from outside the transaction so the early `return` above rolls
  // nothing back and writes no audit entry — the loser of a race did nothing.
  if (alreadySeeded) {
    return { error: 'Navigation already has items - seeding is only for an empty navigation.' };
  }

  logAuditEvent({
    entityType: 'inspire_nav_item',
    entityId: 'root',
    action: 'seeded',
    performedBy: user.id,
    metadata: { source: 'category_fallback', seeded },
  });

  revalidateAll();
  // The manager keeps `items` in local state, so hand back the seeded list
  // rather than leaving it to a refresh the mounted `useState` would ignore.
  return { success: true, seeded, items: await listNavItems() };
}

export async function createNavItemAction(input: {
  type: string;
  label: string;
  categoryId?: string;
  url?: string;
  parentId?: string;
}) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  const parsed = navItemCreateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const { type, label } = parsed.data;
  const categoryId = parsed.data.categoryId || null;
  const url = parsed.data.url || null;
  const parentId = parsed.data.parentId || null;

  // Prevent duplicate category entries at the same level
  if (type === 'category' && categoryId) {
    const [existing] = await db
      .select({ id: inspireNavItems.id })
      .from(inspireNavItems)
      .where(
        and(
          eq(inspireNavItems.categoryId, categoryId),
          parentId
            ? eq(inspireNavItems.parentId, parentId)
            : sql`${inspireNavItems.parentId} IS NULL`,
        ),
      )
      .limit(1);
    if (existing) return { error: 'This category is already in the navigation' };
  }

  // Get next position at this level
  const [maxPos] = await db
    .select({ max: sql<number>`COALESCE(MAX(${inspireNavItems.position}), -1)` })
    .from(inspireNavItems)
    .where(
      parentId ? eq(inspireNavItems.parentId, parentId) : sql`${inspireNavItems.parentId} IS NULL`,
    );

  const position = (maxPos?.max ?? -1) + 1;

  const [item] = await db
    .insert(inspireNavItems)
    .values({ type, label, categoryId, url, parentId, position })
    .returning({ id: inspireNavItems.id });

  // If adding a category, auto-populate its subcategories as children
  if (type === 'category' && categoryId) {
    const subcategories = await db
      .select({
        id: inspireCategories.id,
        name: inspireCategories.name,
        displayOrder: inspireCategories.displayOrder,
      })
      .from(inspireCategories)
      .where(eq(inspireCategories.parentId, categoryId))
      .orderBy(inspireCategories.displayOrder);

    if (subcategories.length > 0) {
      await db.insert(inspireNavItems).values(
        subcategories.map((sub, i) => ({
          type: 'category' as const,
          label: sub.name,
          categoryId: sub.id,
          parentId: item.id,
          position: sub.displayOrder ?? i,
        })),
      );
    }
  }

  logAuditEvent({
    entityType: 'inspire_nav_item',
    entityId: item.id,
    action: 'created',
    performedBy: user.id,
    metadata: { type, label, categoryId, url, parentId },
  });

  revalidateAll();
  return { success: true };
}

export async function updateNavItemAction(id: string, input: Record<string, unknown>) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  const parsed = navItemUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.label !== undefined) updates.label = parsed.data.label;
  if (parsed.data.url !== undefined) updates.url = parsed.data.url || null;
  if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;

  await db.update(inspireNavItems).set(updates).where(eq(inspireNavItems.id, id));

  logAuditEvent({
    entityType: 'inspire_nav_item',
    entityId: id,
    action: 'updated',
    performedBy: user.id,
    metadata: updates,
  });

  revalidateAll();
  return { success: true };
}

export async function deleteNavItemAction(id: string) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  // CASCADE will delete children
  await db.delete(inspireNavItems).where(eq(inspireNavItems.id, id));

  logAuditEvent({
    entityType: 'inspire_nav_item',
    entityId: id,
    action: 'deleted',
    performedBy: user.id,
  });

  revalidateAll();
  return { success: true };
}

export async function toggleNavItemActiveAction(id: string) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  const [item] = await db
    .select({ isActive: inspireNavItems.isActive })
    .from(inspireNavItems)
    .where(eq(inspireNavItems.id, id));

  if (!item) return { error: 'Nav item not found' };

  await db
    .update(inspireNavItems)
    .set({ isActive: !item.isActive, updatedAt: new Date() })
    .where(eq(inspireNavItems.id, id));

  logAuditEvent({
    entityType: 'inspire_nav_item',
    entityId: id,
    action: 'toggled_active',
    performedBy: user.id,
    metadata: { isActive: !item.isActive },
  });

  revalidateAll();
  return { success: true };
}

export async function reorderNavItemsAction(orderedIds: string[], parentId: string | null) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(inspireNavItems)
        .set({ position: i, updatedAt: new Date() })
        .where(eq(inspireNavItems.id, orderedIds[i]));
    }
  });

  logAuditEvent({
    entityType: 'inspire_nav_item',
    entityId: parentId ?? 'root',
    action: 'reordered',
    performedBy: user.id,
    metadata: { orderedIds, parentId },
  });

  revalidateAll();
  return { success: true };
}
