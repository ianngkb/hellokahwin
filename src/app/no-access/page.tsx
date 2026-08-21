import Link from 'next/link';
import { ClerkProvider, SignOutButton } from '@clerk/nextjs';

export const metadata = { title: 'Tiada Akses' };

/**
 * Landing spot for a signed-in Clerk user whose email is not in ADMIN_EMAILS.
 * Deliberately its own page (not /login): Clerk's SignIn bounces an active
 * session straight back to /admin, which would loop forever.
 */
export default function NoAccessPage() {
  return (
    <ClerkProvider>
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">403</p>
        <h1 className="text-2xl font-bold">Akaun ini tiada akses admin</h1>
        <p className="text-muted-foreground max-w-md">
          Anda telah log masuk, tetapi akaun ini tidak disenaraikan sebagai admin HelloKahwin.
        </p>
        <div className="flex gap-3">
          <SignOutButton redirectUrl="/">
            <button className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 text-sm font-semibold">
              Log Keluar
            </button>
          </SignOutButton>
          <Link
            href="/"
            className="border-border rounded-full border px-6 py-2.5 text-sm font-semibold"
          >
            Laman Utama
          </Link>
        </div>
      </div>
    </ClerkProvider>
  );
}
