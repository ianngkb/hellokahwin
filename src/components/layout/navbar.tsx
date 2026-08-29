import Link from 'next/link';
import { Search } from 'lucide-react';
import { getMastheadCategories } from '@/lib/services/inspire-nav';
import { InspireNavMenu, type MenuCategory } from '@/components/inspire/inspire-nav-menu';
import { EdgeScroller } from '@/components/layout/edge-scroller';
import { withDeadline } from '@/lib/api/timeout';
import { SiteWordmark } from '@/components/brand/site-wordmark';

/**
 * Public masthead — Editorial Monotone.
 *
 * A magazine masthead, not an app bar: the wordmark is centred — the real
 * DES-13 outlined mark (`<SiteWordmark>`), not typeset text, fluid-sized off
 * `--fs-wordmark` (18px floor at 360px, DES-12) — sitting between two
 * hairlines, with the category rail on the line below. On mobile that rail
 * scrolls horizontally
 * (no hamburger, no overlay) so the whole taxonomy stays one thumb-swipe away
 * — the audience is mostly low-end Android and a menu sheet is a tap tax.
 *
 * The rail uses the admin-managed navigation (inspire_nav_items) and falls
 * back to top-level categories with published articles. It is the ONLY
 * category navigation on the site — the homepage used to render a second,
 * differently-sourced rail 200px below this one, and the two disagreed about
 * what the site's pillars were. That rail is gone; do not reintroduce one.
 *
 * The rail is wrapped in <EdgeScroller> because it hides its scrollbar and
 * genuinely does overflow: nine pillars measure 1986px against a 1136px
 * viewport at 1400px, so without an edge cue three of them were invisible and
 * unadvertised. The container is max-w-7xl rather than the masthead's
 * max-w-6xl for the same reason — it buys 128px of the rail back. It does not
 * buy all of it; the rail still scrolls, which is why the cue is the fix and
 * the width is only a help.
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
        {/* Three columns, not a centred flex row: the wordmark has to stay
            optically centred while the search sits at the right edge, and a
            plain justify-between would push it off-centre by the width of the
            search control. The empty first cell is the counterweight. */}
        <div className="mx-auto grid h-14 max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-4 lg:h-[4.5rem]">
          <span aria-hidden="true" />
          <Link href="/" aria-label="HelloKahwin — Laman utama" className="text-foreground">
            <SiteWordmark />
          </Link>
          {/* Search was already built and already working — it just had no door.
              The typeahead lives on /artikel and nothing in the masthead pointed
              at it, so on every other page of the site search did not appear to
              exist. This is the door: it lands on the search block by id and
              that block focuses itself on arrival, so one tap from any page puts
              the caret in the field. 44px minimum target, per the rail below. */}
          <Link
            href="/artikel#cari"
            aria-label="Cari artikel"
            className="text-muted-foreground hover:text-foreground inline-flex min-h-11 min-w-11 items-center justify-center gap-2 justify-self-end transition-colors"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            <span className="hk-eyebrow hidden sm:inline">Cari</span>
          </Link>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="mx-auto max-w-7xl px-2 lg:px-4">
          <EdgeScroller>
            <div className="flex min-w-max justify-start lg:justify-center">
              <InspireNavMenu menuCategories={categories} align="center" ariaLabel="Kategori" />
            </div>
          </EdgeScroller>
        </div>
      )}
    </header>
  );
}
