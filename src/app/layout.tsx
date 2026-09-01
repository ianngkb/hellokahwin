import type { Metadata } from 'next';
import { SITE_DEFAULT_TITLE, SITE_TITLE_TEMPLATE } from '@/lib/seo/site-title';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hellokahwin.com'),
  // `default` is NOT a harmless placeholder. Next merges page metadata by
  // walking the returned object's own keys, so a page whose `generateMetadata`
  // returns `{}` contributes no `title` key and inherits THIS line verbatim —
  // the homepage title, printed on an article, in the SERP, and frozen into
  // that page's cache entry. That was SEO-07. `@/lib/seo/article-metadata`
  // is what now guarantees the article route can never take this door.
  title: {
    default: SITE_DEFAULT_TITLE,
    template: SITE_TITLE_TEMPLATE,
  },
  description:
    'Idea, tips dan panduan perkahwinan untuk pasangan Malaysia. Rancang majlis impian anda mengikut bajet.',
  // UI-20. Every file here is generated from
  // `public/brand/logos/hellokahwin-monogram.svg` by
  // `scripts/generate-brand-icons.mjs` — run `pnpm brand:icons` after any
  // change to the monogram or to --hk-parchment-100 / --hk-ink-900, and
  // `pnpm brand:icons:check` fails the moment public/ drifts from either.
  //
  // These are DECLARED here rather than dropped into `src/app/` as Next's
  // icon.svg / apple-icon.png file conventions, on purpose: the conventions
  // serve their files from hashed metadata routes (`/icon.svg?<hash>`) and
  // emit no `rel="shortcut icon"` at all. UI-20's DoD names three rel values
  // and two exact URLs, and only the config form can promise both.
  //
  // `/favicon.png` is the retired path and stays wired up: middleware.ts
  // whitelists it by name and HTML cached in the wild still points at it.
  // What it must never again do is serve the mark it served until today — a
  // serif H on #b4326e, a glyph in no registry in a colour in no palette.
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48', type: 'image/x-icon' },
      { url: '/favicon.png', sizes: '48x48', type: 'image/png' },
    ],
    shortcut: [{ url: '/favicon.ico' }],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

// ClerkProvider deliberately does NOT wrap the root: public pages ship zero
// Clerk. It lives in the (admin) layout and the login page instead.
//
// `<Toaster />` now follows the same rule, for the same reason (UX-04). It sat
// here until 27 Aug 2026, which put sonner on every article and every card
// grid: 39,399 bytes decoded / 12,070 compressed, on pages that can never raise
// a toast. Every `toast()` call site in the codebase is under `(admin)` or in an
// admin-only component, so it belongs in the admin layout. Audited by grepping
// every `from 'sonner'` import — if a PUBLIC surface ever needs a toast, mount
// a Toaster in `(public)/layout.tsx` rather than moving this one back up.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ms">
      <body className="bg-background text-foreground min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
