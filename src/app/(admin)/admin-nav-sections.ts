import {
  BookOpenIcon,
  ImageIcon,
  LayoutTemplateIcon,
  TagsIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react';

// ── Admin nav registry ─────────────────────────────────────────────
// One source of truth for three consumers: the sidebar (one row per group),
// the shell-level group tab bar, and the ⌘K command palette (flattened over
// every tab + nested child, so every destination stays searchable).
//
// Deliberately a plain constant, unlike The Wedding Notebook's equivalent:
// HelloKahwin gates the console with a Clerk email allowlist in which every
// admin is a super-admin (`checkIsSuperAdmin` delegates to `checkIsAdmin`), so
// there are no per-section permissions to filter on and a permissions
// parameter would be dead weight. Page-level `requireAdminSection()` calls are
// unaffected — this registry is chrome, never authorisation.

export interface AdminNavChild {
  label: string;
  href: string;
  /** Extra search terms for ⌘K, beyond the label. */
  keywords?: string;
}

export interface AdminNavTab {
  label: string;
  href: string;
  keywords?: string;
  /**
   * Match this href exactly instead of by prefix. Required where an href is a
   * prefix of its siblings — `/admin/inspire` is a prefix of every other admin
   * route, so without this it would swallow all of them.
   */
  exact?: boolean;
  /**
   * Second-level destinations reachable from the tab's own page (a "New …"
   * button, a review screen). They stay OUT of the tab bar on purpose — that
   * row is for peer destinations, not for actions — but they are indexed so
   * ⌘K and the sidebar filter can still reach them.
   */
  children?: AdminNavChild[];
}

export interface AdminNavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  tabs: AdminNavTab[];
  /**
   * Route prefixes the group claims when no tab or child matches — e.g. the
   * article editor at `/admin/inspire/<id>/edit`, whose id segment cannot be
   * enumerated. Lowest matching priority, so a more specific tab always wins.
   */
  extraPrefixes?: string[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: 'articles',
    label: 'Articles',
    icon: BookOpenIcon,
    // Articles MUST stay first: `/admin` redirects here, and a sidebar group
    // row links to `tabs[0].href`, so reordering these silently moves where
    // clicking the group lands.
    tabs: [
      {
        label: 'All articles',
        href: '/admin/inspire',
        // REQUIRED, not tidiness: this href prefixes every other admin route.
        exact: true,
        keywords: 'posts content publish draft scheduled inspire',
      },
      {
        label: 'New article',
        href: '/admin/inspire/create',
        keywords: 'write compose add post',
      },
    ],
    // Claims the editor (`/admin/inspire/<id>/edit`) and its preview/PDF
    // siblings, which have no enumerable href.
    extraPrefixes: ['/admin/inspire'],
  },
  {
    id: 'taxonomy',
    label: 'Taxonomy',
    icon: TagsIcon,
    tabs: [
      {
        label: 'Categories',
        href: '/admin/inspire/categories',
        keywords: 'section topic taxonomy',
      },
      {
        label: 'Tags',
        href: '/admin/inspire/tags',
        keywords: 'label keyword taxonomy hidden',
        children: [
          {
            label: 'Merge tags',
            href: '/admin/inspire/tags/merge',
            keywords: 'duplicate combine dedupe consolidate',
          },
        ],
      },
    ],
  },
  {
    id: 'authors',
    label: 'Authors',
    icon: UsersIcon,
    tabs: [
      {
        label: 'Authors',
        href: '/admin/inspire/authors',
        keywords: 'writer byline contributor avatar profile',
      },
    ],
  },
  {
    id: 'media',
    label: 'Media',
    icon: ImageIcon,
    tabs: [
      {
        label: 'Media library',
        href: '/admin/inspire/media',
        keywords: 'image photo upload asset file library',
      },
    ],
  },
  {
    id: 'site',
    label: 'Site structure',
    icon: LayoutTemplateIcon,
    tabs: [
      {
        label: 'Navigation',
        href: '/admin/inspire/navigation',
        keywords: 'menu nav header links order',
      },
      {
        label: 'Dynamic blocks',
        href: '/admin/inspire/dynamic-blocks',
        keywords: 'module widget promo embed reusable',
        children: [
          {
            label: 'New dynamic block',
            href: '/admin/inspire/dynamic-blocks/create',
            keywords: 'add create module widget',
          },
        ],
      },
    ],
  },
];

/** A group with its computed link target and (optional) rolled-up badge. */
export interface AdminNavGroupResolved extends AdminNavGroup {
  href: string;
  badge?: number;
  tabs: (AdminNavTab & { badge?: number })[];
}

/**
 * Resolve the registry for rendering: each group gains the href its row links
 * to (its first tab) and, when `badges` supplies counts by href, per-tab badges
 * plus a group total.
 *
 * `badges` is a hook for future count chrome (unread, pending). It is optional
 * and unused today — passing nothing yields a registry with no badges rather
 * than putting an aggregate query on the critical path of every admin page.
 */
export function resolveAdminGroups(badges?: Record<string, number>): AdminNavGroupResolved[] {
  return ADMIN_NAV_GROUPS.map((group) => {
    const tabs = group.tabs.map((tab) => {
      const own = badges?.[tab.href] ?? 0;
      const fromChildren = (tab.children ?? []).reduce(
        (sum, c) => sum + (badges?.[c.href] ?? 0),
        0,
      );
      const total = own + fromChildren;
      return total > 0 ? { ...tab, badge: total } : tab;
    });
    const groupTotal = tabs.reduce((sum, t) => sum + ('badge' in t ? (t.badge ?? 0) : 0), 0);
    return {
      ...group,
      tabs,
      // Non-null assertion is safe: every group above declares at least one tab,
      // and the interface requires it.
      href: tabs[0]!.href,
      ...(groupTotal > 0 ? { badge: groupTotal } : {}),
    };
  });
}

function matchesHref(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The group owning a route — drives sidebar highlighting and picks which tab
 * row the shell renders.
 *
 * Two passes, most-specific-first: every tab and child href is considered and
 * the LONGEST match wins, so `/admin/inspire/tags/merge` resolves to Taxonomy
 * rather than to whichever group happened to be declared first. Only if
 * nothing matches do group `extraPrefixes` apply, which is what lets Articles
 * claim the editor without swallowing its siblings.
 */
export function findGroupForPath(
  groups: AdminNavGroupResolved[],
  pathname: string,
): AdminNavGroupResolved | null {
  let best: AdminNavGroupResolved | null = null;
  let bestLength = -1;

  for (const group of groups) {
    for (const tab of group.tabs) {
      if (matchesHref(pathname, tab.href, tab.exact) && tab.href.length > bestLength) {
        best = group;
        bestLength = tab.href.length;
      }
      for (const child of tab.children ?? []) {
        if (matchesHref(pathname, child.href) && child.href.length > bestLength) {
          best = group;
          bestLength = child.href.length;
        }
      }
    }
  }
  if (best) return best;

  for (const group of groups) {
    for (const prefix of group.extraPrefixes ?? []) {
      if (matchesHref(pathname, prefix) && prefix.length > bestLength) {
        best = group;
        bestLength = prefix.length;
      }
    }
  }
  return best;
}

/**
 * The tab within a group that a route belongs to, by longest match. Children
 * resolve to their PARENT tab, so `/…/tags/merge` highlights "Tags" instead of
 * leaving the row with nothing selected.
 *
 * Returns null when the route is under the group's `extraPrefixes` only (the
 * article editor), which correctly renders the row with no tab active.
 */
export function findActiveTabHref(group: AdminNavGroupResolved, pathname: string): string | null {
  let best: string | null = null;
  let bestLength = -1;

  for (const tab of group.tabs) {
    if (matchesHref(pathname, tab.href, tab.exact) && tab.href.length > bestLength) {
      best = tab.href;
      bestLength = tab.href.length;
    }
    for (const child of tab.children ?? []) {
      if (matchesHref(pathname, child.href) && child.href.length > bestLength) {
        best = tab.href;
        bestLength = child.href.length;
      }
    }
  }
  return best;
}

export interface AdminNavFlatItem {
  label: string;
  href: string;
  icon?: LucideIcon;
  badge?: number;
  /** Group label, shown as context on search results and pinned favourites. */
  context: string;
  keywords?: string;
}

/** Every destination — tabs plus nested children — as one searchable list. */
export function flattenAdminNav(groups: AdminNavGroupResolved[]): AdminNavFlatItem[] {
  const items: AdminNavFlatItem[] = [];
  const seen = new Set<string>();

  for (const group of groups) {
    for (const tab of group.tabs) {
      if (!seen.has(tab.href)) {
        seen.add(tab.href);
        items.push({
          label: tab.label,
          href: tab.href,
          icon: group.icon,
          badge: tab.badge,
          context: group.label,
          keywords: tab.keywords,
        });
      }
      for (const child of tab.children ?? []) {
        if (!seen.has(child.href)) {
          seen.add(child.href);
          items.push({
            label: child.label,
            href: child.href,
            context: group.label,
            keywords: child.keywords,
          });
        }
      }
    }
  }
  return items;
}

/**
 * Rank destinations for the sidebar filter and the ⌘K palette. Both surfaces
 * call THIS function so they return an identical, identically-ordered set —
 * a search that disagrees with itself between two panes is worse than no
 * search at all.
 *
 * Scoring, highest first: exact label · label prefix · label substring ·
 * context (group) match · keyword match. Ties break on label length then
 * alphabetically, so a short generic label outranks a long qualified one.
 */
export function searchAdminNav(flat: AdminNavFlatItem[], query: string): AdminNavFlatItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return flat;

  const scored: { item: AdminNavFlatItem; score: number }[] = [];
  for (const item of flat) {
    const label = item.label.toLowerCase();
    let score = 0;
    if (label === q) score = 100;
    else if (label.startsWith(q)) score = 80;
    else if (label.includes(q)) score = 60;
    else if (item.context.toLowerCase().includes(q)) score = 40;
    else if (item.keywords?.toLowerCase().includes(q)) score = 20;
    if (score > 0) scored.push({ item, score });
  }

  scored.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.item.label.length !== b.item.label.length) {
      return a.item.label.length - b.item.label.length;
    }
    return a.item.label.localeCompare(b.item.label);
  });

  return scored.map((s) => s.item);
}
