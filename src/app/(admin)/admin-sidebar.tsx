'use client';

import { ConsoleLogo } from '@/components/brand/console-logo';
import { resolveAdminGroups } from './admin-nav-sections';
import { AdminNavContents } from './admin-nav-contents';

/**
 * Desktop console sidebar (Monochrome Precision §5 AppShell) — a fixed 224px
 * rail on `--sidebar` with a hairline right border, sticky to the viewport so
 * long tables scroll under it. Hidden below `lg`, where `AdminMobileNav`
 * renders the identical nav body in a sheet instead.
 */
export function AdminSidebar({ badges }: { badges?: Record<string, number> }) {
  const groups = resolveAdminGroups(badges);

  return (
    <aside className="bg-sidebar border-hairline sticky top-0 hidden h-screen w-56 shrink-0 flex-col overflow-y-auto border-r lg:flex">
      <div className="border-hairline bg-sidebar sticky top-0 z-10 border-b px-4 py-4">
        <ConsoleLogo subtitle="Admin" />
      </div>
      <div className="flex-1 px-3 py-4">
        <AdminNavContents groups={groups} />
      </div>
    </aside>
  );
}
