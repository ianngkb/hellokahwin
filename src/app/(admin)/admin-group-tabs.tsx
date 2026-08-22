'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
 */
export function AdminGroupTabs({ badges }: { badges?: Record<string, number> }) {
  const pathname = usePathname();
  const groups = resolveAdminGroups(badges);
  const group = findGroupForPath(groups, pathname);

  if (!group || group.tabs.length < 2) return null;

  const activeHref = findActiveTabHref(group, pathname);

  return (
    <Tabs value={activeHref ?? ''} className="mb-6">
      <TabsList variant="line" className="max-w-full overflow-x-auto">
        {group.tabs.map((tab) => (
          <TabsTrigger key={tab.href} value={tab.href} asChild>
            {/* These are navigation links, not a tab-panel widget (there is no
                TabsContent), so the current PAGE must be announced with
                aria-current — Radix's aria-selected points at no panel.
                prefetch={false} for the same reason as the sidebar: these
                siblings are dynamic, DB-backed pages. */}
            <Link
              href={tab.href}
              prefetch={false}
              aria-current={tab.href === activeHref ? 'page' : undefined}
            >
              {tab.label}
              {tab.badge != null && tab.badge > 0 ? (
                <span className="text-muted-foreground ml-1.5 tracking-normal normal-case tabular-nums">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              ) : null}
            </Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
