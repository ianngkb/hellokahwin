import Link from 'next/link';
import { getInspireNavCategories } from '@/lib/services/inspire-nav';
import { InspireNavMenu } from '@/components/inspire/inspire-nav-menu';

/**
 * Public navbar — mobile-first, Malay copy. The category menu is the
 * admin-managed navigation (inspire_nav_items), same mechanism as twn-new.
 */
export async function Navbar() {
  const categories = await getInspireNavCategories();

  return (
    <header className="border-border/60 bg-background/95 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="shrink-0 text-lg font-bold tracking-tight">
          Hello<span className="text-primary">Kahwin</span>
        </Link>
        <InspireNavMenu menuCategories={categories} align="end" />
      </div>
    </header>
  );
}
