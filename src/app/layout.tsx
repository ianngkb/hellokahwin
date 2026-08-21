import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';
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
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ms">
      <body className="bg-background text-foreground min-h-screen font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
