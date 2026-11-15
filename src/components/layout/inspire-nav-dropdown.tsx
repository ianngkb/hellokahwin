'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { type MenuCategory } from '@/components/inspire/inspire-nav-menu';
import { ViewportClamped } from '@/components/layout/viewport-clamped';

interface InspireNavDropdownProps {
  menuCategories: MenuCategory[];
}

/**
 * Port of twn-new's navbar "Inspire" dropdown, as HelloKahwin's "Artikel".
 *
 * Desktop navbar link with a single hover/focus panel listing every top-level
 * category (from the admin-managed inspire_nav_items, or the category fallback)
 * and its children. The trigger stays a real <Link href="/artikel"> — the panel
 * is additive, so a click always navigates. With no categories it degrades to
 * that plain link.
 */
export function InspireNavDropdown({ menuCategories }: InspireNavDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const leaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLAnchorElement>(null);

  const clearLeaveTimeout = useCallback(() => {
    if (leaveTimeout.current) {
      clearTimeout(leaveTimeout.current);
      leaveTimeout.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearLeaveTimeout();
  }, [clearLeaveTimeout]);

  const handleEnter = useCallback(() => {
    clearLeaveTimeout();
    setIsOpen(true);
  }, [clearLeaveTimeout]);

  // Delayed close so the pointer can travel from the trigger into the panel.
  const handleLeave = useCallback(() => {
    clearLeaveTimeout();
    leaveTimeout.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  }, [clearLeaveTimeout]);

  const handleClose = useCallback(() => {
    clearLeaveTimeout();
    setIsOpen(false);
  }, [clearLeaveTimeout]);

  // Escape lives on the document: a hover-opened panel has no focus inside it.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const focusWasInside = wrapperRef.current?.contains(document.activeElement);
      handleClose();
      if (focusWasInside) triggerRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleClose]);

  const linkClassName =
    'px-4 py-2.5 text-[11px] font-medium tracking-[1.1px] text-foreground uppercase transition-opacity hover:opacity-50';

  if (menuCategories.length === 0) {
    return (
      <Link href="/artikel" className={linkClassName}>
        Artikel
      </Link>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <Link
        ref={triggerRef}
        href="/artikel"
        className={`inline-flex items-center gap-1 ${linkClassName}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        onFocus={handleEnter}
        onBlur={handleLeave}
        onClick={handleClose}
      >
        Artikel
        <ChevronDown
          className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </Link>

      {isOpen && (
        <ViewportClamped
          className="absolute top-full left-0 z-50 hidden flex-col pt-1 md:flex"
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          onFocus={handleEnter}
          onBlur={handleLeave}
        >
          <div
            className="inspire-nav-dropdown bg-popover min-h-0 overflow-y-auto px-6 py-5"
            style={{
              width: `min(56rem, calc(100vw - 3rem), ${
                menuCategories.length >= 4 ? 56 : menuCategories.length * 12.5 + 0.5
              }rem)`,
            }}
            role="menu"
            aria-label="Kategori artikel"
          >
            <div className="columns-[10rem] gap-x-10">
              {menuCategories.map((cat) => (
                <div key={cat.slug} className="mb-5 break-inside-avoid">
                  <Link
                    href={cat.url ?? `/artikel/${cat.slug}`}
                    className="text-foreground hover:text-muted-foreground block px-1 pb-2 text-[11px] font-medium tracking-[1.1px] break-words uppercase transition-colors"
                    role="menuitem"
                    onClick={handleClose}
                  >
                    {cat.name}
                  </Link>
                  {cat.children.length > 0 && (
                    <div className="grid gap-y-0.5">
                      {cat.children.map((child) => (
                        <Link
                          key={child.slug}
                          href={child.url ?? `/artikel/${cat.slug}?sub=${child.slug}`}
                          className="text-muted-foreground hover:text-foreground hover:bg-accent block rounded-sm px-1 py-1 text-sm break-words transition-colors"
                          role="menuitem"
                          onClick={handleClose}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="border-border mt-1 border-t pt-3">
              <Link
                href="/artikel"
                className="text-muted-foreground hover:text-foreground block px-1 text-xs font-medium tracking-wider uppercase transition-colors"
                role="menuitem"
                onClick={handleClose}
              >
                Lihat semua artikel →
              </Link>
            </div>
          </div>
        </ViewportClamped>
      )}
    </div>
  );
}
