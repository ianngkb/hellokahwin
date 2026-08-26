import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hellokahwin.com'),
  title: {
    default: 'HelloKahwin — Idea & Panduan Perkahwinan Malaysia',
    template: '%s | HelloKahwin',
  },
  description:
    'Idea, tips dan panduan perkahwinan untuk pasangan Malaysia. Rancang majlis impian anda mengikut bajet.',
  icons: { icon: '/favicon.png' },
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
