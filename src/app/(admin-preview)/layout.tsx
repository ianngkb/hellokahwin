import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export default function AdminPreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pt-24 md:pt-[106px]">{children}</main>
      <Footer />
    </div>
  );
}
