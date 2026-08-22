import Link from 'next/link';
import { getMastheadCategories } from '@/lib/services/inspire-nav';
import { InspireNavMenu, type MenuCategory } from '@/components/inspire/inspire-nav-menu';
import { withDeadline } from '@/lib/api/timeout';

/**
 * Public masthead — Editorial Monotone.
 *
 * A magazine masthead, not an app bar: the wordmark is centred and set in the
 * serif voice with wide tracking, sitting between two hairlines, with the
 * category rail on the line below. On mobile that rail scrolls horizontally
 * (no hamburger, no overlay) so the whole taxonomy stays one thumb-swipe away
 * — the audience is mostly low-end Android and a menu sheet is a tap tax.
 *
 * The rail uses the admin-managed navigation (inspire_nav_items) and falls
 * back to top-level categories with published articles.
 *
 * SOFT-FAIL, DELIBERATELY. This component sits in the public layout, so it
 * renders on every public page — an unhandled throw here does not lose the
 * navigation, it 500s the entire site. A DB blip, a cold pool or a stalled
 * connection must cost us the category rail and nothing else, which is the
 * same `withDeadline` + swallow pattern the article pages already use.
 */
export async function Navbar() {
  let categories: MenuCategory[] = [];
  try {
    categories = await withDeadline(getMastheadCategories(), 3000, 'masthead-categories');
  } catch (err) {
    console.error('[navbar] category rail unavailable:', err);
  }

  return (
    <header className="border-border bg-background sticky top-0 z-40 border-b">
      <div className="border-border/70 border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-center px-4 lg:h-[4.5rem]">
          <Link
            href="/"
            className="font-serif text-[1.35rem] leading-none tracking-[0.22em] uppercase lg:text-[1.6rem]"
          >
            HelloKahwin
          </Link>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="mx-auto max-w-6xl px-2 lg:px-4">
          <div className="-mx-2 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max justify-start lg:justify-center">
              <InspireNavMenu menuCategories={categories} align="center" />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
