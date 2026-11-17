import { getMastheadCategories } from '@/lib/services/inspire-nav';
import { type MenuCategory } from '@/components/inspire/inspire-nav-menu';
import { NavbarClient } from '@/components/layout/navbar-client';
import { withDeadline } from '@/lib/api/timeout';
import { SiteWordmark } from '@/components/brand/site-wordmark';
import { SiteSeal } from '@/components/brand/site-seal';

/**
 * Public masthead — The Wedding Notebook's navbar, HelloKahwin's brand.
 *
 * Structure, heights and type are a port of twn-new's `<Navbar>` /
 * `<NavbarClient>`: 40/41px top bar + 56/65px main nav (96px below `md`,
 * 106px from `md`). The logo is HelloKahwin's own outlined wordmark.
 *
 * STICKY, NOT FIXED — the one structural difference from TWN. TWN fixes the
 * header and pads `<main>` by 96/106px, which only works while the category
 * bar fits in one or two rows. HelloKahwin's nine category names are long
 * (~1,650px of 11px caps) and wrap to three rows at 1440px, so the main nav
 * grows past 65px; a fixed header would then sit on top of the page. Sticky
 * keeps the header in flow, so whatever height it wraps to, nothing is
 * covered — and it looks identical to TWN whenever the bar is one row.
 *
 * Categories come from the admin-managed navigation (inspire_nav_items),
 * falling back to top-level categories with published articles — the same
 * source the old category rail used.
 *
 * SOFT-FAIL, DELIBERATELY. This component sits in the public layout, so it
 * renders on every public page — an unhandled throw here does not lose the
 * navigation, it 500s the entire site. A DB blip must cost us the category
 * menu and nothing else.
 */
export async function Navbar() {
  let categories: MenuCategory[] = [];
  try {
    categories = await withDeadline(getMastheadCategories(), 3000, 'masthead-categories');
  } catch (err) {
    console.error('[navbar] category menu unavailable:', err);
  }

  return (
    <header className="sticky top-0 z-[var(--z-nav)]">
      <NavbarClient
        categories={categories}
        wordmark={
          <span className="inline-flex items-center gap-2 md:gap-3">
            <SiteSeal className="size-10 md:size-12" />
            <SiteWordmark />
          </span>
        }
      />
    </header>
  );
}
