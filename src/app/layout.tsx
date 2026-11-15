import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { SITE_DEFAULT_TITLE, SITE_TITLE_TEMPLATE } from '@/lib/seo/site-title';
import './globals.css';

// ─────────────────────────────────────────────────────────────────────────────
// The Wedding Notebook's type, self-hosted from public/_fonts (copied
// byte-for-byte from twn-new, which vendors them with
// `scripts/vendor-google-fonts.ts`). Same faces, same weights, same
// preload/fallback choices as twn-new's root layout, so the public pages set
// type exactly as TWN's /inspire does. Newsreader and Poppins are not ported:
// no HelloKahwin route uses them.
//
// This replaces the system-font stacks HelloKahwin used to declare on :root in
// globals.css; those declarations are gone, because a same-specificity rule
// later in the cascade would put the system stack back over these variables.
// ─────────────────────────────────────────────────────────────────────────────

const geist = localFont({
  src: [{ path: '../../public/_fonts/geist-400-700.woff2', weight: '400 700', style: 'normal' }],
  variable: '--font-geist',
  display: 'swap',
  adjustFontFallback: 'Arial',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
});

// Site serif — Cormorant Garamond. Drives --font-serif / --font-accent.
const cormorant = localFont({
  src: [
    {
      path: '../../public/_fonts/cormorant-garamond-400-600.woff2',
      weight: '400 600',
      style: 'normal',
    },
    {
      path: '../../public/_fonts/cormorant-garamond-400-600-italic.woff2',
      weight: '400 600',
      style: 'italic',
    },
  ],
  variable: '--font-cormorant',
  display: 'swap',
  adjustFontFallback: 'Times New Roman',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
});

// Article-reading face — Now Alt (`--font-prose`). preload: false — article
// body copy, below the fold on most landings.
const nowAlt = localFont({
  src: [
    { path: '../../public/_fonts/now-alt-300.woff2', weight: '300', style: 'normal' },
    { path: '../../public/_fonts/now-alt-regular.woff2', weight: '400', style: 'normal' },
    { path: '../../public/_fonts/now-alt-500.woff2', weight: '500', style: 'normal' },
    { path: '../../public/_fonts/now-alt-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-now-alt',
  display: 'swap',
  preload: false,
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
});

// preload: false — monospace, rarely rendered and never above the fold.
const geistMono = localFont({
  src: [
    { path: '../../public/_fonts/geist-mono-100-900.woff2', weight: '100 900', style: 'normal' },
  ],
  variable: '--font-geist-mono',
  display: 'swap',
  preload: false,
  adjustFontFallback: 'Arial',
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://hellokahwin.com'),
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
    <html
      lang="ms"
      className={`${geist.variable} ${cormorant.variable} ${nowAlt.variable} ${geistMono.variable}`}
    >
      <body className="bg-background text-foreground min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
