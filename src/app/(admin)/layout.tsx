import Link from 'next/link';
import { ClerkProvider, UserButton } from '@clerk/nextjs';
import { requireAdmin } from '@/lib/auth/admin';

const NAV_ITEMS = [
  { href: '/admin/inspire', label: 'Articles' },
  { href: '/admin/inspire/categories', label: 'Categories' },
  { href: '/admin/inspire/tags', label: 'Tags' },
  { href: '/admin/inspire/authors', label: 'Authors' },
  { href: '/admin/inspire/navigation', label: 'Navigation' },
  { href: '/admin/inspire/dynamic-blocks', label: 'Dynamic Blocks' },
  { href: '/admin/inspire/media', label: 'Media' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <ClerkProvider>
      <div className="min-h-screen">
        <header className="border-border bg-background sticky top-0 z-40 border-b">
          <div className="flex h-12 items-center gap-6 px-4">
            <Link href="/admin/inspire" className="text-sm font-bold">
              HelloKahwin Admin
            </Link>
            <nav className="flex flex-1 items-center gap-4 overflow-x-auto text-sm">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground whitespace-nowrap"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <UserButton />
          </div>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </ClerkProvider>
  );
}
