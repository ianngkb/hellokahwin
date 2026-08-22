'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { type LucideIcon, SearchIcon, StarIcon, XIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  findGroupForPath,
  flattenAdminNav,
  searchAdminNav,
  type AdminNavGroupResolved,
} from './admin-nav-sections';
import { useFavourites } from './use-admin-nav-state';

interface NavRef {
  label: string;
  href: string;
  icon?: LucideIcon;
  badge?: number;
  /** Group label, shown as context on search results and favourites. */
  context?: string;
}

// Declared at module scope, NOT nested inside AdminNavContents: a nested
// declaration gets a fresh component identity on every render, so React would
// unmount and remount the whole result list on each keystroke (flicker, lost
// hover state). Everything it would have closed over arrives as props.
function NavRow({
  item,
  active,
  showContext = false,
  onNavigate,
  isFavourite,
  toggleFavourite,
}: {
  item: NavRef;
  active: boolean;
  showContext?: boolean;
  onNavigate?: () => void;
  isFavourite: (href: string) => boolean;
  toggleFavourite: (href: string) => void;
}) {
  const Icon = item.icon;
  const pinned = isFavourite(item.href);

  return (
    <div className="group/row relative">
      {/* prefetch={false}: every admin destination is a dynamic, DB-backed
          page, so the default viewport prefetch would make merely RENDERING
          the sidebar fan out a request per destination. Admin nav is
          deliberate clicking, not browsing — the prefetch is not worth it. */}
      <Link
        href={item.href}
        prefetch={false}
        onClick={() => onNavigate?.()}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'focus-visible:outline-primary flex items-center gap-2.5 rounded-[8px] py-2 pr-9 pl-2.5 text-[13.5px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
          active
            ? 'bg-accent text-foreground'
            : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
        )}
      >
        {Icon ? (
          <Icon
            className={cn(
              'size-4 shrink-0 transition-colors',
              active ? 'text-foreground' : 'text-muted-foreground group-hover/row:text-foreground',
            )}
          />
        ) : (
          <span
            className={cn(
              'ml-0.5 size-1 shrink-0 rounded-full',
              active ? 'bg-foreground' : 'bg-border',
            )}
            aria-hidden="true"
          />
        )}
        <span className="min-w-0 flex-1 truncate">
          {item.label}
          {showContext && item.context ? (
            <span className="text-muted-foreground ml-1.5 text-[11px] font-normal">
              {item.context}
            </span>
          ) : null}
        </span>
        {item.badge != null && item.badge > 0 ? (
          <span className="bg-foreground text-background flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums">
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        ) : null}
      </Link>
      <button
        type="button"
        onClick={() => toggleFavourite(item.href)}
        aria-label={
          pinned ? `Unpin ${item.label} from favourites` : `Pin ${item.label} to favourites`
        }
        aria-pressed={pinned}
        className={cn(
          'hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-1 transition-opacity focus-visible:opacity-100 focus-visible:ring-2 focus-visible:outline-none',
          pinned
            ? 'text-foreground opacity-100'
            : 'text-muted-foreground opacity-0 group-hover/row:opacity-100',
        )}
      >
        <StarIcon className={cn('size-3.5', pinned && 'fill-current')} />
      </button>
    </div>
  );
}

/**
 * The shared body of both nav surfaces — the desktop sidebar and the mobile
 * sheet render this same component, so the two can never drift.
 *
 * Shows one row per GROUP normally; typing in the filter drills into the full
 * flattened destination list (tabs + nested children) so nothing in the console
 * is unreachable from here.
 */
export function AdminNavContents({
  groups,
  onNavigate,
}: {
  groups: AdminNavGroupResolved[];
  /** Called after a link is followed — e.g. to close the mobile sheet. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { favourites, isFavourite, toggleFavourite } = useFavourites();

  const filtering = query.trim().length > 0;

  const activeGroupId = useMemo(
    () => findGroupForPath(groups, pathname)?.id ?? null,
    [groups, pathname],
  );

  const flat = useMemo(() => flattenAdminNav(groups), [groups]);

  // href → ref, for resolving pinned favourites. Self-heals when a destination
  // is renamed or removed: an unknown href simply resolves to undefined and
  // drops out rather than rendering a dead row.
  const byHref = useMemo(() => {
    const map = new Map<string, NavRef>();
    for (const item of flat) {
      map.set(item.href, {
        label: item.label,
        href: item.href,
        icon: item.icon,
        badge: item.badge,
        context: item.context,
      });
    }
    return map;
  }, [flat]);

  const favouriteItems = useMemo(
    () => favourites.map((h) => byHref.get(h)).filter((v): v is NavRef => v != null),
    [favourites, byHref],
  );

  // Ranked by the SAME `searchAdminNav` the ⌘K palette uses, so both surfaces
  // return an identical, identically-ordered result set.
  const searchResults = useMemo(() => {
    if (!filtering) return [];
    return searchAdminNav(flat, query)
      .map((i) => byHref.get(i.href))
      .filter((v): v is NavRef => v != null);
  }, [filtering, flat, query, byHref]);

  const firstMatchHref = searchResults[0]?.href ?? null;

  return (
    <div className="flex flex-col gap-5">
      <div className="relative">
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && firstMatchHref) {
              e.preventDefault();
              router.push(firstMatchHref);
              onNavigate?.();
            }
          }}
          placeholder="Filter menu…"
          aria-label="Filter navigation"
          className="border-hairline bg-muted/40 placeholder:text-muted-foreground focus:border-primary h-9 w-full rounded-[8px] border pr-8 pl-9 text-[13.5px] outline-none"
        />
        {query.length > 0 ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear filter"
            className="hover:text-foreground text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5"
          >
            <XIcon className="size-3.5" />
          </button>
        ) : null}
      </div>

      {favouriteItems.length > 0 && !filtering ? (
        <div>
          <p className="text-muted-foreground mb-2 px-2.5 text-[11px] font-medium tracking-[0.14em] uppercase">
            Favourites
          </p>
          <div className="flex flex-col gap-0.5">
            {favouriteItems.map((item) => (
              <NavRow
                key={`fav-${item.href}`}
                item={item}
                active={pathname === item.href}
                showContext
                onNavigate={onNavigate}
                isFavourite={isFavourite}
                toggleFavourite={toggleFavourite}
              />
            ))}
          </div>
        </div>
      ) : null}

      {filtering ? (
        <nav className="flex flex-col gap-0.5" aria-label="Admin search results">
          {searchResults.length === 0 ? (
            <p className="text-muted-foreground px-2.5 py-2 text-[13.5px]">No pages found</p>
          ) : (
            searchResults.map((item) => (
              <NavRow
                key={item.href}
                item={item}
                active={pathname === item.href}
                showContext
                onNavigate={onNavigate}
                isFavourite={isFavourite}
                toggleFavourite={toggleFavourite}
              />
            ))
          )}
        </nav>
      ) : (
        <nav className="flex flex-col gap-0.5" aria-label="Admin navigation">
          {groups.map((group) => (
            <NavRow
              key={group.id}
              item={{
                label: group.label,
                href: group.href,
                icon: group.icon,
                badge: group.badge,
              }}
              active={activeGroupId === group.id}
              onNavigate={onNavigate}
              isFavourite={isFavourite}
              toggleFavourite={toggleFavourite}
            />
          ))}
        </nav>
      )}
    </div>
  );
}
