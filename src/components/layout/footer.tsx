import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-border/60 mt-16 border-t">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} HelloKahwin. Idea &amp; panduan perkahwinan untuk pasangan
          Malaysia.
        </p>
        <nav className="flex gap-4">
          <Link href="/artikel" className="hover:text-foreground">
            Artikel
          </Link>
        </nav>
      </div>
    </footer>
  );
}
