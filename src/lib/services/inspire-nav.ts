import { eq, asc, and } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import {
  inspireNavItems,
  inspireCategories,
  articles,
  articleCategories,
} from '@/lib/db/schema/articles';
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

/**
 * Top-level categories that actually have published articles, shaped like the
 * admin-managed nav. Used as the masthead fallback: a fresh install (or a
 * WordPress import, which creates categories but no nav_items) would otherwise
 * render a masthead with no navigation at all.
 */
const getCategoryFallbackNav = unstable_cache(
  async (): Promise<MenuCategory[]> => {
    const rows = await db
      .select({
        id: inspireCategories.id,
        name: inspireCategories.name,
        slug: inspireCategories.slug,
        parentId: inspireCategories.parentId,
        displayOrder: inspireCategories.displayOrder,
        articleId: articles.id,
      })
      .from(inspireCategories)
      .leftJoin(articleCategories, eq(articleCategories.categoryId, inspireCategories.id))
      .leftJoin(
        articles,
        and(eq(articles.id, articleCategories.articleId), eq(articles.status, 'published')),
      )
      .orderBy(asc(inspireCategories.displayOrder));

    // Collapse the join back into one row per category + a published count.
    const byId = new Map<
      string,
      { id: string; name: string; slug: string; parentId: string | null; count: number }
    >();
    const order: string[] = [];
    for (const r of rows) {
      let entry = byId.get(r.id);
      if (!entry) {
        entry = { id: r.id, name: r.name, slug: r.slug, parentId: r.parentId, count: 0 };
        byId.set(r.id, entry);
        order.push(r.id);
      }
      if (r.articleId) entry.count += 1;
    }

    const all = order.map((id) => byId.get(id)!);
    return all
      .filter((c) => !c.parentId)
      .map((parent) => {
        const children = all.filter((c) => c.parentId === parent.id && c.count > 0);
        const total = parent.count + children.reduce((sum, c) => sum + c.count, 0);
        return {
          name: parent.name,
          slug: parent.slug,
          total,
          children: children.map((c) => ({ name: c.name, slug: c.slug })),
        };
      })
      .filter((c) => c.total > 0)
      .map(({ name, slug, children }) => ({ name, slug, children }));
  },
  ['hk-nav-category-fallback'],
  { revalidate: 600, tags: ['articles', 'inspire-categories'] },
);

/** The admin-managed nav when it exists, otherwise the category fallback. */
export async function getMastheadCategories(): Promise<MenuCategory[]> {
  const nav = await getInspireNavCategories();
  if (nav.length > 0) return nav;
  return getCategoryFallbackNav();
}
