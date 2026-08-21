import { ClerkProvider, SignIn } from '@clerk/nextjs';

export const metadata = { title: 'Log Masuk' };

export default function LoginPage() {
  return (
    <ClerkProvider>
      <div className="flex min-h-screen items-center justify-center p-4">
        <SignIn routing="path" path="/login" fallbackRedirectUrl="/admin/inspire" />
      </div>
    </ClerkProvider>
  );
}
