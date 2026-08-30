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
        {/* `hk-tap` — the colophon wordmark is a link, and `leading-none` on
            18px serif measured it at 182.8 x 21. It is not in this item's DoD
            list because that list is four illustrations; it is here because
            the audit enumerated every target rather than looking up four. */}
        <Link
          href="/"
          className="hk-tap font-serif text-lg leading-none tracking-[0.22em] uppercase"
        >
          HelloKahwin
        </Link>
        <p className="hk-deck mx-auto mt-4 max-w-md text-[0.9375rem]">
          Idea, tips dan panduan perkahwinan untuk pasangan Malaysia.
        </p>

        <nav
          aria-label="Pautan kaki"
          className="border-border mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t pt-8"
        >
          {/* `hk-tap` — 99.4 x 15.4 and 103.7 x 15.4 before UI-11. The row keeps
              `gap-y-3`, so two 24px targets still read as one quiet line. */}
          <Link href="/" className="hk-eyebrow hk-tap hover:text-foreground transition-colors">
            Laman Utama
          </Link>
          <Link
            href="/artikel"
            className="hk-eyebrow hk-tap hover:text-foreground transition-colors"
          >
            Semua Artikel
          </Link>
        </nav>

        <p className="hk-meta mt-8">© {new Date().getFullYear()} HelloKahwin</p>
      </div>
    </footer>
  );
}
