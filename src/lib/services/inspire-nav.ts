import { eq, asc } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { inspireNavItems, inspireCategories } from '@/lib/db/schema/articles';
import type { MenuCategory } from '@/components/inspire/inspire-nav-menu';

export const getInspireNavCategories = unstable_cache(
  async (): Promise<MenuCategory[]> => {
    const navItems = await db
      .select({
        id: inspireNavItems.id,
        type: inspireNavItems.type,
        label: inspireNavItems.label,
        categorySlug: inspireCategories.slug,
        url: inspireNavItems.url,
        parentId: inspireNavItems.parentId,
        position: inspireNavItems.position,
      })
      .from(inspireNavItems)
      .leftJoin(inspireCategories, eq(inspireNavItems.categoryId, inspireCategories.id))
      .where(eq(inspireNavItems.isActive, true))
      .orderBy(asc(inspireNavItems.position));

    const topLevelNav = navItems.filter((n) => !n.parentId).sort((a, b) => a.position - b.position);

    return topLevelNav.map((item) => {
      const children = navItems
        .filter((n) => n.parentId === item.id)
        .sort((a, b) => a.position - b.position)
        .map((c) => ({
          name: c.label,
          slug: c.categorySlug ?? c.id,
          url: c.type === 'custom_link' ? (c.url ?? undefined) : undefined,
        }));

      return {
        name: item.label,
        slug: item.categorySlug ?? item.id,
        url: item.type === 'custom_link' ? (item.url ?? undefined) : undefined,
        children,
      };
    });
  },
  ['inspire-nav-categories'],
  // This feeds the global navbar on every public page, so an admin nav edit
  // would otherwise take up to 600s to appear. The tag lets the nav actions
  // invalidate it immediately.
  { revalidate: 600, tags: ['inspire-nav'] },
);
