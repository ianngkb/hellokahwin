import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

/**
 * `hk-public` scopes the Editorial Monotone token override (globals.css) to the
 * public directory only — the admin console and the draft-preview surfaces keep
 * their own palettes.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="hk-public flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
