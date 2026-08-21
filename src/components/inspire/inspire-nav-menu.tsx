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
}

export function InspireNavMenu({ menuCategories, align = 'center' }: InspireNavMenuProps) {
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

  // Desktop: hover open
  const handleEnter = useCallback(
    (slug: string) => {
      clearLeaveTimeout();
      setActiveMenu(slug);
    },
    [clearLeaveTimeout],
  );

  // Desktop: hover close with delay
  const handleLeave = useCallback(() => {
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
    if (window.matchMedia('(max-width: 767px)').matches) {
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
    <nav className="" style={{ fontFamily: 'var(--font-geist)' }} onKeyDown={handleKeyDown}>
      <div
        className={`flex flex-wrap gap-x-1 gap-y-2 text-[11px] ${
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
                className="text-muted-foreground hover:text-foreground px-4 py-2 text-[length:inherit] font-medium tracking-[1.1px] uppercase transition-colors"
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
                className={`inline-flex items-center gap-1 px-4 py-2 text-[length:inherit] font-medium tracking-[1.1px] uppercase transition-colors ${
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
                          className="border-border text-foreground hover:border-primary hover:text-primary rounded-full border px-3 py-1 text-[11px] font-medium tracking-[1.1px] uppercase transition-colors"
                          role="menuitem"
                          onClick={handleClose}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                    <Link
                      href={`/artikel/${cat.slug}`}
                      className="text-brand-secondary hover:text-foreground mt-2 inline-block px-1 text-[11px] font-medium tracking-wider uppercase transition-colors"
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
                          className="text-muted-foreground hover:text-foreground hover:bg-accent block rounded-sm px-3 py-1.5 text-sm whitespace-nowrap transition-colors"
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
                        className="text-muted-foreground hover:text-foreground block px-3 py-1 text-xs font-medium tracking-wider uppercase transition-colors"
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
