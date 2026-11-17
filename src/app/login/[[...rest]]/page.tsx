import { ClerkProvider, SignIn } from '@clerk/nextjs';
import Link from 'next/link';
import { SiteWordmark } from '@/components/brand/site-wordmark';

export const metadata = { title: 'Log Masuk' };

export default function LoginPage() {
  return (
    <ClerkProvider>
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-4">
        <Link href="/" aria-label="HelloKahwin — Laman utama">
          <SiteWordmark className="h-8" />
        </Link>
        <SignIn
          routing="path"
          path="/login"
          fallbackRedirectUrl="/admin/inspire"
          appearance={{ elements: { logoBox: 'hidden' } }}
        />
      </div>
    </ClerkProvider>
  );
}
