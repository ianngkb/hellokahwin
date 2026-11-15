'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronDown, MenuIcon } from 'lucide-react';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { InspireNavMenu, type MenuCategory } from '@/components/inspire/inspire-nav-menu';
import { InspireNavDropdown } from '@/components/layout/inspire-nav-dropdown';
import { SearchTrigger } from '@/components/search/search-trigger';

interface NavbarClientProps {
  categories: MenuCategory[];
  /** The HelloKahwin wordmark, rendered on the server (it reads the SVG from disk). */
  wordmark: React.ReactNode;
}

const navLinks = [{ href: '/artikel', label: 'Artikel' }] as const;

/**
 * Port of twn-new's NavbarClient, minus everything HelloKahwin does not have
 * (sign-in, accounts, "Submit a Wedding", the venue catalogue). Search opens
 * HelloKahwin's own search screen (components/search). The structure, heights and type are TWN's:
 *
 *   ┌ top bar ─ 40px (41px md) ─ white, hairline below ──────────────────────┐
 *   │ [ARTIKEL] (left, desktop on artikel pages)                     CARI   │
 *   ├ main nav ─ 56px (65px md) ─ surface-subtle, hairline below ───────────┤
 *   │ LOGO │ category bar (artikel pages) / Artikel ▾ (elsewhere)  [search] │
 *   └──────────────────────────────────────────────────────────────── ☰ ───┘
 *
 * Below `md` every link collapses into the ☰ sheet, exactly as on TWN. That
 * replaces HelloKahwin's old horizontally-scrolling category rail, whose
 * scroll container (no visible edge) could clip links at 390px.
 *
 * Colours stay HelloKahwin's: every colour here is a token class
 * (`text-foreground`, `bg-surface-subtle`, `border-hairline`…) resolved by the
 * `.hk-public` palette. The sheet portals to <body>, outside that wrapper, so
 * its content carries `hk-public` itself to pick the same palette up.
 */
export function NavbarClient({ categories, wordmark }: NavbarClientProps) {
  const pathname = usePathname() ?? '';
  const isActiveLink = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  // Exact-segment match: a bare startsWith('/artikel') would also claim a
  // future /artikel-something route.
  const isArtikel = pathname === '/artikel' || pathname.startsWith('/artikel/');
  // The category bar only supersedes the standard links when there ARE
  // categories — the server falls back to [] on any DB error.
  const showArtikelBar = isArtikel && categories.length > 0;

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  // Controlled so the search row in the menu can close it before opening search.
  const [menuOpen, setMenuOpen] = useState(false);
  const handleCategoryToggle = useCallback((slug: string) => {
    setExpandedCategory((prev) => (prev === slug ? null : slug));
  }, []);

  return (
    <>
      {/* ── Top Bar ── */}
      <div className="border-hairline flex h-10 items-center border-b bg-white px-4 md:h-[41px] md:px-[50px]">
        {/* On artikel pages the main deck is taken over by the category bar, so
            the standard links relocate here (desktop only) — must stay in
            lockstep with the main-deck ternary below. */}
        {showArtikelBar && (
          <div className="mr-auto hidden items-center 2xl:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-foreground px-3 text-[11px] tracking-[1.1px] uppercase transition-opacity hover:opacity-60 ${
                  isActiveLink(link.href)
                    ? 'font-semibold underline underline-offset-4'
                    : 'font-medium'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
        {/* Right-aligned utility link — the slot TWN gives "Login or Join".
            HelloKahwin has no accounts, so it carries the search door instead,
            which keeps search one tap away on phones too. */}
        <div className={`ml-auto flex items-center ${showArtikelBar ? '2xl:ml-0' : ''}`}>
          <SearchTrigger variant="topbar" header />
        </div>
      </div>

      {/* ── Main Nav ── */}
      <nav
        aria-label="Navigasi utama"
        className="border-hairline bg-surface-subtle flex min-h-14 items-center justify-between border-b px-4 md:min-h-[65px] md:px-[50px] md:py-1.5"
      >
        <Link
          href="/"
          aria-label="HelloKahwin — Laman utama"
          className="text-foreground flex shrink-0 items-center"
        >
          {wordmark}
        </Link>

        {showArtikelBar && (
          /* Artikel layout: Logo | divider | category bar | Search. From `2xl`
             (1536px) only: HelloKahwin's nine category names carry ~1,650px of
             11px caps, far more than TWN's seven. Measured with the local rig
             on 15 Nov 2026, the bar wrapped to 5 rows at 1024 and 3 rows at
             1280 and 1440 (a 155px header), even at 10px item padding. Between
             `md` and `2xl` the standard layout below (Artikel ▾ panel) shows
             instead — TWN's own non-Inspire navbar, so still TWN's design. */
          <div className="ml-4 hidden min-w-0 flex-1 items-center 2xl:flex">
            <div className="bg-hairline mr-4 h-7 w-px shrink-0" />
            <div className="min-w-0 flex-1">
              <InspireNavMenu
                menuCategories={categories}
                align="start"
                ariaLabel="Kategori artikel"
              />
            </div>
            <div className="ml-3 shrink-0">
              <SearchTrigger variant="navbar" compact header />
            </div>
          </div>
        )}
        {
          /* Standard layout: nav links + search */
          <div className={`hidden items-center md:flex ${showArtikelBar ? '2xl:hidden' : ''}`}>
            {navLinks.map((link) =>
              link.href === '/artikel' && categories.length > 0 ? (
                <InspireNavDropdown key={link.href} menuCategories={categories} />
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-foreground px-4 py-2.5 text-[11px] tracking-[1.1px] uppercase transition-opacity hover:opacity-50 ${
                    isActiveLink(link.href)
                      ? 'font-semibold underline underline-offset-4'
                      : 'font-medium'
                  }`}
                >
                  {link.label}
                </Link>
              ),
            )}
            <div className="ml-5 shrink-0">
              <SearchTrigger variant="navbar" header />
            </div>
          </div>
        }

        {/* Phone: search beside the menu, the way a phone reader looks for it. */}
        <div className="-mr-2 ml-auto flex items-center md:hidden">
          <SearchTrigger variant="icon" />
        </div>

        {/* Mobile hamburger */}
        <Sheet
          open={menuOpen}
          onOpenChange={(open) => {
            setMenuOpen(open);
            if (!open) setExpandedCategory(null);
          }}
        >
          <SheetTrigger asChild>
            <button
              type="button"
              className="text-foreground flex items-center p-2 md:hidden"
              aria-label="Menu"
            >
              <MenuIcon className="size-[22px]" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="hk-public w-[300px] border-0 p-0"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SheetDescription className="sr-only">Navigasi laman dan carian</SheetDescription>

            <div className="border-hairline shrink-0 border-b px-6 pt-5 pb-3 pr-12">
              <SearchTrigger
                variant="navbar-mobile"
                onBeforeOpen={() => {
                  setMenuOpen(false);
                  setExpandedCategory(null);
                }}
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <nav aria-label="Navigasi mudah alih" className="flex flex-col">
                {categories.length > 0 && (
                  <div className="border-hairline border-b">
                    <div className="px-6 pt-3 pb-1.5">
                      <span className="text-muted-foreground text-[11px] font-medium tracking-[1.1px] uppercase">
                        Artikel
                      </span>
                    </div>
                    {categories.map((cat) => {
                      const hasChildren = cat.children.length > 0;
                      const isExpanded = expandedCategory === cat.slug;

                      if (!hasChildren) {
                        return (
                          <SheetClose asChild key={cat.slug}>
                            <Link
                              href={cat.url ?? `/artikel/${cat.slug}`}
                              className={`hover:bg-surface-subtle flex items-center px-6 py-3 text-[15px] transition-colors ${
                                cat.url ? 'text-primary font-medium' : 'text-foreground'
                              }`}
                            >
                              {cat.name}
                            </Link>
                          </SheetClose>
                        );
                      }

                      return (
                        <div key={cat.slug}>
                          <button
                            type="button"
                            onClick={() => handleCategoryToggle(cat.slug)}
                            className="hover:bg-surface-subtle text-foreground flex w-full items-center justify-between px-6 py-3 text-left text-[15px] transition-colors"
                            aria-expanded={isExpanded}
                          >
                            {cat.name}
                            <ChevronDown
                              className={`text-muted-foreground size-4 transition-transform ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                          {isExpanded && (
                            <div className="px-6 pb-2">
                              <div className="flex flex-wrap gap-1.5">
                                {cat.children.map((child) => (
                                  <SheetClose asChild key={child.slug}>
                                    <Link
                                      href={child.url ?? `/artikel/${cat.slug}?sub=${child.slug}`}
                                      className="text-muted-foreground hover:text-foreground hover:border-foreground rounded-full border px-3 py-1 text-[11px] font-medium tracking-wider uppercase transition-colors"
                                    >
                                      {child.name}
                                    </Link>
                                  </SheetClose>
                                ))}
                              </div>
                              <SheetClose asChild>
                                <Link
                                  href={`/artikel/${cat.slug}`}
                                  className="text-brand-secondary hover:text-foreground mt-2 inline-block text-[11px] font-medium tracking-wider uppercase transition-colors"
                                >
                                  Lihat semua {cat.name} →
                                </Link>
                              </SheetClose>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <SheetClose asChild>
                  <Link
                    href="/"
                    className={`hover:bg-surface-subtle text-foreground flex items-center justify-between px-6 py-3.5 text-[15px] transition-colors ${
                      pathname === '/' ? 'bg-surface-subtle font-semibold' : ''
                    }`}
                  >
                    Laman Utama
                  </Link>
                </SheetClose>
                {navLinks.map((link) => (
                  <SheetClose asChild key={link.href}>
                    <Link
                      href={link.href}
                      className={`hover:bg-surface-subtle text-foreground flex items-center justify-between px-6 py-3.5 text-[15px] transition-colors ${
                        pathname === link.href ? 'bg-surface-subtle font-semibold' : ''
                      }`}
                    >
                      Semua Artikel
                    </Link>
                  </SheetClose>
                ))}
              </nav>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </>
  );
}
