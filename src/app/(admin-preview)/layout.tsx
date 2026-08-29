import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import '@/design-system/tokens.css';

/** `tokens.css` for `--fs-wordmark` — see `(public)/layout.tsx`. This surface
 * renders the same shared `<Navbar>` outside `.hk-public`, on the root
 * (possibly dark) tokens, which is the header's second real ground. */
export default function AdminPreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pt-24 md:pt-[106px]">{children}</main>
      <Footer />
    </div>
  );
}
