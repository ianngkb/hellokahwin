'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { inspireNavItems, inspireCategories } from '@/lib/db/schema/articles';
import { requireAdminSectionAction } from '@/lib/auth/admin';
import { logAuditEvent } from '@/lib/audit/log';
import { navItemCreateSchema, navItemUpdateSchema } from '@/lib/validations/article';

const REVALIDATE_PATHS = ['/admin/inspire/navigation', '/artikel'];

function revalidateAll() {
  for (const p of REVALIDATE_PATHS) revalidatePath(p);
  // revalidatePath does NOT clear unstable_cache entries — `getInspireNavCategories`
  // feeds the navbar on every public page, not just the two paths above.
  revalidateTag('inspire-nav', 'max');
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
