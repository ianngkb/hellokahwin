import { cookies } from 'next/headers';
import { Geist } from 'next/font/google';
import { ClerkProvider, UserButton } from '@clerk/nextjs';

import { requireAdmin } from '@/lib/auth/admin';
import { ConsoleThemeToggle } from '@/components/console/console-theme-toggle';
import { AdminCommandPalette } from './admin-command-palette';
import { AdminGroupTabs } from './admin-group-tabs';
import { AdminMobileNav } from './admin-mobile-nav';
import { AdminSidebar } from './admin-sidebar';

/**
 * The console's typeface, per the design system. Loaded in THIS layout rather
 * than the root one so the font is requested on `/admin/*` only: the public
 * site deliberately ships zero webfont bytes for an audience on cheap Android
 * and slow connections, and that budget stays intact. `globals.css` points the
 * console's `--font-geist` at this variable, with the old system stack as the
 * fallback.
 */
const geist = Geist({
  subsets: ['latin'],
  // `swap`, not `block`: an admin staring at an empty screen while a webfont
  // loads is worse than one frame of the system stack.
  display: 'swap',
  variable: '--font-geist-console',
});

/**
 * Admin console shell — "Monochrome Precision" (see
 * `admin-vendor-design-system.md` in the twn-new reference repo).
 *
 * The load-bearing line here is `className="font-ui-sans"` on the root wrapper.
 * `globals.css` already carried the entire console token layer — the neutral
 * ramp, the status chroma, the chart ramp, the `.console-table` skin and the
 * console button metrics — scoped to that class, but nothing in the app had
 * ever applied it, so every admin page rendered in the public site's Plum
 * Forward palette. Adding the class re-resolves every `bg-card` /
 * `text-foreground` / `border` / status utility inside this subtree to the
 * monochrome ramp, without touching `:root` and therefore without any risk to
 * the public site.
 *
 * `id="console-root"` is equally load-bearing, and not decoration:
 * `@/lib/ui/console-portal` hands this element to Radix as the portal
 * container, which is what keeps dialogs, sheets, dropdowns, popovers and
 * selects inside the token scope instead of escaping to `document.body` and
 * rendering in the public theme.
 *
 * Dark mode is console-only and cookie-driven. The cookie is read HERE, on the
 * server, so `data-theme` is already correct in the first HTML byte — there is
 * no post-hydration correction and therefore no flash.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  const consoleTheme = (await cookies()).get('console-theme')?.value === 'dark' ? 'dark' : 'light';

  return (
    <ClerkProvider>
      <div
        id="console-root"
        data-theme={consoleTheme}
        className={`${geist.variable} font-ui-sans bg-background text-foreground flex min-h-screen`}
      >
        <AdminSidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="border-hairline bg-background/95 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-30 flex items-center gap-3 border-b px-3 py-2 backdrop-blur sm:px-4 lg:px-8">
            <AdminMobileNav />
            <AdminCommandPalette />
            <div className="ml-auto flex items-center gap-2">
              <ConsoleThemeToggle initialTheme={consoleTheme} />
              <UserButton />
            </div>
          </div>
          <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <AdminGroupTabs />
            {children}
          </div>
        </main>
      </div>
    </ClerkProvider>
  );
}
