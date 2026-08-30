'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

export interface MenuCategory {
  name: string;
  slug: string;
  url?: string;
  children: { name: string; slug: string; url?: string }[];
}

interface InspireNavMenuProps {
  menuCategories: MenuCategory[];
  /** Horizontal alignment of the item row — 'start' in the navbar filters slot, 'end' beside a left title. */
  align?: 'start' | 'center' | 'end';
  /** Accessible name for the <nav>. The page has two landmarks — this one and
   *  the footer's "Pautan kaki" — and an unnamed one is just "navigation" in a
   *  screen reader's landmark list, which is not a choice anyone can make. */
  ariaLabel?: string;
}

/**
 * The breakpoint the rail switches interaction model at: hover/focus opens the
 * dropdown above it, tap toggles the inline accordion below it. Matches the
 * `md:` boundary the markup already uses.
 */
const isTouchLayout = () => window.matchMedia('(max-width: 767px)').matches;

export function InspireNavMenu({
  menuCategories,
  align = 'center',
  ariaLabel,
}: InspireNavMenuProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const leaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLeaveTimeout = useCallback(() => {
    if (leaveTimeout.current) {
      clearTimeout(leaveTimeout.current);
      leaveTimeout.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearLeaveTimeout();
  }, [clearLeaveTimeout]);

  // Desktop: hover open.
  //
  // The touch-layout bail-out is load-bearing, not defensive. A tap on a phone
  // emits compatibility mouse events, so `mouseenter` (twice) and `focus` all
  // fire BEFORE `click` — measured, on a real touch tap at 390px. Each of them
  // used to open the menu, so by the time the tap handler ran it saw the menu
  // already open and toggled it shut, while preventDefault() suppressed the
  // navigation that would otherwise have happened. The result was that every
  // parent category in the rail did NOTHING when tapped, and every category in
  // the live rail has children.
  //
  // Nobody noticed because article pages hid the header entirely below 767px,
  // so on the surface that receives essentially all of the site's search
  // traffic this navigation was not on screen at all. Restoring the header
  // (UX-01) makes it the primary navigation on a phone, so hover and focus must
  // stay strictly desktop and leave the touch layout to the tap toggle below.
  const handleEnter = useCallback(
    (slug: string) => {
      if (isTouchLayout()) return;
      clearLeaveTimeout();
      setActiveMenu(slug);
    },
    [clearLeaveTimeout],
  );

  // Desktop: hover close with delay
  const handleLeave = useCallback(() => {
    if (isTouchLayout()) return;
    leaveTimeout.current = setTimeout(() => {
      setActiveMenu(null);
    }, 150);
  }, []);

  const handleClose = useCallback(() => {
    setActiveMenu(null);
  }, []);

  // Mobile: tap to toggle
  const handleToggle = useCallback((slug: string, hasChildren: boolean, e: React.MouseEvent) => {
    if (!hasChildren) return; // no children — let the link navigate
    // On mobile, prevent navigation and toggle dropdown
    if (isTouchLayout()) {
      e.preventDefault();
      setActiveMenu((prev) => (prev === slug ? null : slug));
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setActiveMenu(null);
    }
  }, []);

  return (
    /* Every anchor in here is `.hk-navrail-item`, which is where the rail's
       geometry now lives — `--navrail-target` (44px), `--navrail-item-pad` and
       the focus ring, all in globals.css. The 44px is deliberate: the rail is
       set in 11px type, which on its own gives a 32.5px target — measured, at
       390px — and 44px is the floor the rest of the design system already
       meets. This is the site's only navigation on a phone once an article
       stops hiding the header, so the targets have to be thumb-sized. Do not
       trade the min-height back for a tighter masthead.

       `.hk-navrail-items` wraps (UI-02). Below `lg` the navbar keeps it on one
       line inside a scroller; at `lg` and up it is allowed to run to a second
       row so that no category is ever off-screen. */
    <nav
      aria-label={ariaLabel}
      className=""
      style={{ fontFamily: 'var(--font-geist)' }}
      onKeyDown={handleKeyDown}
    >
      <div
        className={`hk-navrail-items text-[11px] ${
          align === 'end' ? 'justify-end' : align === 'start' ? 'justify-start' : 'justify-center'
        }`}
      >
        {menuCategories.map((cat) => {
          const isCustomLink = !!cat.url;
          const isActive = activeMenu === cat.slug;
          const hasChildren = cat.children.length > 0;

          if (isCustomLink && !hasChildren) {
            return (
              <Link
                key={cat.slug}
                href={cat.url!}
                className="hk-navrail-item text-muted-foreground hover:text-foreground text-[length:inherit] font-medium tracking-[1.1px] uppercase transition-colors"
              >
                {cat.name}
              </Link>
            );
          }

          return (
            <div
              key={cat.slug}
              className="relative"
              onMouseEnter={() => handleEnter(cat.slug)}
              onMouseLeave={handleLeave}
            >
              <Link
                href={cat.url ?? `/artikel/${cat.slug}`}
                className={`hk-navrail-item text-[length:inherit] font-medium tracking-[1.1px] uppercase transition-colors ${
                  isActive
                    ? 'text-foreground inspire-nav-item-active'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-haspopup={hasChildren ? 'true' : undefined}
                aria-expanded={hasChildren ? isActive : undefined}
                onClick={(e) => handleToggle(cat.slug, hasChildren, e)}
                onFocus={() => handleEnter(cat.slug)}
                onBlur={handleLeave}
              >
                {cat.name}
                {hasChildren && (
                  <ChevronDown
                    className={`h-3 w-3 transition-transform md:hidden ${isActive ? 'rotate-180' : ''}`}
                  />
                )}
              </Link>

              {hasChildren && isActive && (
                <>
                  {/* Mobile: inline accordion */}
                  <div className="w-full px-2 py-2 md:hidden" role="menu">
                    <div className="flex flex-wrap gap-1.5">
                      {cat.children.map((child) => (
                        <Link
                          key={child.slug}
                          href={child.url ?? `/artikel/${cat.slug}?sub=${child.slug}`}
                          className="border-border text-foreground hover:border-primary hover:text-primary inline-flex min-h-11 items-center rounded-full border px-3 py-1 text-[11px] font-medium tracking-[1.1px] uppercase transition-colors"
                          role="menuitem"
                          onClick={handleClose}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                    <Link
                      href={`/artikel/${cat.slug}`}
                      className="text-brand-secondary hover:text-foreground mt-2 inline-flex min-h-11 items-center px-1 text-[11px] font-medium tracking-wider uppercase transition-colors"
                      role="menuitem"
                      onClick={handleClose}
                    >
                      Lihat Semua {cat.name} →
                    </Link>
                  </div>

                  {/* Desktop: absolute dropdown */}
                  <div
                    className="inspire-nav-dropdown bg-popover absolute top-full left-0 z-50 mt-1 hidden w-max px-6 py-4 md:block"
                    role="menu"
                    onMouseEnter={() => handleEnter(cat.slug)}
                    onMouseLeave={handleLeave}
                    onFocus={() => handleEnter(cat.slug)}
                    onBlur={handleLeave}
                  >
                    <div
                      className={`grid gap-y-0.5 ${
                        cat.children.length > 8
                          ? 'grid-cols-3 gap-x-10'
                          : cat.children.length > 4
                            ? 'grid-cols-2 gap-x-10'
                            : 'grid-cols-1'
                      }`}
                    >
                      {cat.children.map((child) => (
                        <Link
                          key={child.slug}
                          href={child.url ?? `/artikel/${cat.slug}?sub=${child.slug}`}
                          className="text-muted-foreground hover:text-foreground hover:bg-accent flex min-h-11 items-center rounded-sm px-3 py-1.5 text-sm whitespace-nowrap transition-colors"
                          role="menuitem"
                          onClick={handleClose}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                    <div className="border-border mt-3 border-t pt-2">
                      <Link
                        href={`/artikel/${cat.slug}`}
                        className="text-muted-foreground hover:text-foreground flex min-h-11 items-center px-3 py-1 text-xs font-medium tracking-wider uppercase transition-colors"
                        role="menuitem"
                        onClick={handleClose}
                      >
                        Lihat Semua {cat.name}
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
