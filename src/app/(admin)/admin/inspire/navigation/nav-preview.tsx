'use client';

import { InspireNavMenu, type MenuCategory } from '@/components/inspire/inspire-nav-menu';
import type { NavItemData } from './sortable-nav-item';

interface NavPreviewProps {
  items: NavItemData[];
}

export function NavPreview({ items }: NavPreviewProps) {
  const topLevel = items
    .filter((i) => !i.parentId && i.isActive)
    .sort((a, b) => a.position - b.position);

  const menuCategories: MenuCategory[] = topLevel.map((item) => {
    const children = items
      .filter((c) => c.parentId === item.id && c.isActive)
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

  return (
    <div className="bg-card rounded-lg border p-4">
      <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
        Live Preview
      </p>
      {menuCategories.length === 0 ? (
        <p className="text-muted-foreground py-4 text-center text-sm">No active nav items</p>
      ) : (
        <div className="bg-background rounded-lg border px-2 py-3">
          <InspireNavMenu menuCategories={menuCategories} />
        </div>
      )}
    </div>
  );
}
