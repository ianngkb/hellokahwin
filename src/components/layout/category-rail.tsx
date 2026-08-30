import { InspireNavMenu, type MenuCategory } from '@/components/inspire/inspire-nav-menu';
import { EdgeScroller } from '@/components/layout/edge-scroller';

/**
 * The masthead category rail — the site's ONLY category navigation.
 *
 * It exists as its own component so the `/admin/design-system` reference page
 * can render the real thing rather than a copy of it. A reference page that
 * re-declares the container, the scroller and the wrapper by hand agrees with
 * the masthead exactly once: on the day it is written.
 *
 * ── UI-02: IT WRAPS ON DESKTOP, IT DOES NOT SCROLL ──────────────────────
 *
 * Measured on live production 2026-08-31 with
 * `node scripts/measure-nav-overflow.mjs https://hellokahwin.com/`, before
 * this change:
 *
 *   viewport 1280 — 3 of 9 category links ended past the viewport edge
 *   viewport 1440 — 3 of 9
 *   viewport 1920 — 2 of 9  (right edges 1993.94 and 2305.53)
 *
 * and the scroller's own client box was 1264px at ALL THREE widths, so on a
 * 1920px monitor three of the nine were clipped by a container with no visible
 * boundary. The only advertisement that they existed was a 3rem gradient and a
 * chevron glyph. One of the hidden ones, `Venue, Kos & Perancangan`, holds
 * `checklist-kahwin` — 6.58% CTR, third best on the site.
 *
 * At `lg` and up the scroller is switched off and the items wrap. Nine plain
 * links in source order: no JavaScript, nothing to open, nothing behind a
 * hover. Below `lg` the horizontal scroller and its edge cues stay exactly as
 * UX-01 built them — nine wrapped rows is a menu page, not a masthead, and the
 * one-swipe rail was chosen over a hamburger deliberately for an audience on
 * low-end Android.
 *
 * The cost, measured: the sticky header grows from 118px to 170px at ≥1152px
 * (two rows) and to 222px at 1024–1151px (three rows). That is the price of
 * every category being on the page, and it was taken deliberately.
 */
export function CategoryRail({ categories }: { categories: MenuCategory[] }) {
  if (categories.length === 0) return null;

  return (
    <div className="hk-navrail">
      <EdgeScroller staticFrom="lg">
        {/* `min-w-max` is what forces the items onto one line for the scroller
            below `lg`. At `lg` the wrapper becomes a plain block so the nav
            fills the measure and `.hk-navrail-items` wraps inside it — which
            is the whole fix. */}
        <div className="flex min-w-max justify-start lg:block lg:min-w-0">
          <InspireNavMenu menuCategories={categories} align="center" ariaLabel="Kategori" />
        </div>
      </EdgeScroller>
    </div>
  );
}
