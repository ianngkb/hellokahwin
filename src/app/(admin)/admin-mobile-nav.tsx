'use client';

import { useState } from 'react';
import { MenuIcon } from 'lucide-react';

import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { resolveAdminGroups } from './admin-nav-sections';
import { AdminNavContents } from './admin-nav-contents';

/**
 * Below `lg`, the sidebar collapses into this sheet. It renders the SAME
 * `AdminNavContents` as the desktop rail — filter, favourites and all — so the
 * two surfaces cannot drift apart.
 *
 * The sheet content deliberately does NOT carry `font-ui-sans`, even though it
 * is portalled content. `sheet.tsx` already portals into `#console-root` via
 * `getConsolePortalContainer()`, so it renders INSIDE the token scope and
 * inherits the console font, the tokens and `data-theme` for free.
 *
 * Re-declaring `font-ui-sans` here actively breaks dark mode, which is why the
 * note is worth keeping: that class is what DEFINES the light token values, and
 * the dark values live on `.font-ui-sans[data-theme='dark']`. A nested
 * `font-ui-sans` with no `data-theme` of its own therefore re-applies the LIGHT
 * block below the dark shell, and the menu renders white inside a dark console.
 * Caught on a dark-mode screenshot, not in review.
 */
export function AdminMobileNav({ badges }: { badges?: Record<string, number> }) {
  const [open, setOpen] = useState(false);
  const groups = resolveAdminGroups(badges);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="hover:bg-accent/50 flex size-9 items-center justify-center rounded-[8px] transition-colors lg:hidden"
          aria-label="Open navigation menu"
        >
          <MenuIcon className="size-5" />
        </button>
      </SheetTrigger>
      {/* `min(20rem,100vw)`, not a bare `w-80`: 320px is wider than a 280px
          Galaxy Fold cover screen or a 320px iPhone SE in landscape zoom, and a
          fixed-width sheet on those viewports pushes its own content off-screen
          with no way to scroll to it horizontally. Clamping to the viewport
          keeps the 20rem design width everywhere it fits and degrades to
          full-bleed where it does not. */}
      <SheetContent
        side="left"
        className="bg-sidebar text-foreground w-[min(20rem,100vw)] max-w-full overflow-y-auto p-0"
      >
        <div className="border-hairline border-b px-5 pt-5 pb-4">
          <SheetTitle className="text-[15px] font-semibold tracking-[-0.02em]">
            HelloKahwin Admin
          </SheetTitle>
        </div>
        <div className="p-4">
          <AdminNavContents groups={groups} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
