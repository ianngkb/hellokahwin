import Link from 'next/link';

/**
 * Public footer — Editorial Monotone. Centred colophon: wordmark, one line of
 * positioning copy, a hairline, then the small-caps link row. Nothing else —
 * the last thing a reader sees should be quiet.
 */
export function Footer() {
  return (
    <footer className="border-border mt-20 border-t">
      <div className="mx-auto max-w-6xl px-4 py-12 text-center lg:py-16">
        <Link href="/" className="font-serif text-lg leading-none tracking-[0.22em] uppercase">
          HelloKahwin
        </Link>
        <p className="hk-deck mx-auto mt-4 max-w-md text-[0.9375rem]">
          Idea, tips dan panduan perkahwinan untuk pasangan Malaysia.
        </p>

        <nav
          aria-label="Pautan kaki"
          className="border-border mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t pt-8"
        >
          <Link href="/" className="hk-eyebrow hover:text-foreground transition-colors">
            Laman Utama
          </Link>
          <Link href="/artikel" className="hk-eyebrow hover:text-foreground transition-colors">
            Semua Artikel
          </Link>
        </nav>

        <p className="hk-meta mt-8">© {new Date().getFullYear()} HelloKahwin</p>
      </div>
    </footer>
  );
}
