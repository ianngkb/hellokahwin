'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import { findActiveTabHref, findGroupForPath, resolveAdminGroups } from './admin-nav-sections';

/**
 * The single owner of the second-level tab row for the whole console.
 * Rendered once in the layout (between the sticky command bar and the page), it
 * resolves the active group from the pathname and shows that group's tabs — so
 * no page carries its own top-level tab chrome.
 *
 * Renders nothing when the route maps to no group, or when the group has only
 * ONE destination: a tab bar with a single tab is decoration, not navigation.
 * (The Wedding Notebook keeps single-tab bars because a restricted role there
 * can be left with one permitted tab and deserves the same positional chrome;
 * HelloKahwin has no per-section roles, so a one-tab group is one-tab for
 * everyone, always, and the row would never be anything but noise.)
 *
 * A `<nav>` of links, NOT a Radix `Tabs`. It looks like a tab strip, but there
 * are no tabpanels here — each "tab" is a route, and following one replaces the
 * whole page. Dressing that up in `role="tablist"`/`role="tab"` promises a
 * widget contract the markup cannot keep: assistive tech announces "tab, 2 of
 * 4" and then finds no `tabpanel` to move into, and Radix's roving tabindex
 * takes the arrow keys hostage so only one link is reachable by Tab. Plain
 * links restore the ordinary link contract — Tab through them, Enter follows,
 * middle-click opens a new tab — and `aria-current="page"` states which one you
 * are on. The `line`-variant look is reproduced with the same utilities the
 * Radix triggers carried, so nothing changes visually.
 */
export function AdminGroupTabs({ badges }: { badges?: Record<string, number> }) {
  const pathname = usePathname();
  const groups = resolveAdminGroups(badges);
  const group = findGroupForPath(groups, pathname);

  if (!group || group.tabs.length < 2) return null;

  const activeHref = findActiveTabHref(group, pathname);

  return (
    <nav
      aria-label={`${group.label} sections`}
      className="border-hairline mb-6 flex max-w-full items-center overflow-x-auto border-b"
    >
      {group.tabs.map((tab) => {
        const active = tab.href === activeHref;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'focus-visible:outline-ring relative inline-flex items-center justify-center gap-1.5 px-5 py-3 text-xs font-medium tracking-[0.08em] whitespace-nowrap uppercase transition-colors focus-visible:outline-1',
              'after:bg-primary after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:opacity-0 after:transition-opacity',
              active
                ? 'text-primary after:opacity-100'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
            {tab.badge != null && tab.badge > 0 ? (
              <span className="text-muted-foreground ml-1.5 tracking-normal normal-case tabular-nums">
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
