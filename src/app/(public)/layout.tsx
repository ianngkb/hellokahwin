import { Suspense } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { AnalyticsTracker } from '@/components/analytics/analytics-tracker';
import { Footer } from '@/components/layout/footer';
import '@/design-system/tokens.css';

/**
 * `hk-public` scopes the Editorial Monotone token override (globals.css) to the
 * public directory only — the admin console and the draft-preview surfaces keep
 * their own palettes.
 *
 * `tokens.css` is imported HERE, not per-page, because the header it wraps is
 * shared by every public route. Before DES-12 the file was only pulled in by
 * the three pages DES-08 migrated (home, catalogue, article) — a page outside
 * that set (`/brand` among them) rendered the masthead with `--fs-wordmark`
 * undefined, and a percentage-sized SVG height against an undefined (`auto`)
 * parent height resolves to a rendered 0×0 mark. Caught by measuring the
 * rendered header, not by reading the component. Only `:root`/`.hk-dark`
 * variables live in this file (no selectors), and `.hk-dark` is never applied
 * on a public route, so importing it site-wide paints nothing new.
 *
 * `AnalyticsTracker` is a `<Suspense>` SIBLING of `{children}`, never a
 * wrapper: wrapping the page tree would let HTML flush before a page's
 * `notFound()` runs and turn real 404s into soft 404s. It returns early on
 * `/draft/*`, the one non-visit route in this group.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="hk-public flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Suspense>
        <AnalyticsTracker />
      </Suspense>
      <Footer />
    </div>
  );
}
