import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="hk-public flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="hk-eyebrow">404</p>
      <h1 className="hk-display mt-4 text-[2rem] lg:text-[2.75rem]">Halaman tidak dijumpai</h1>
      <p className="hk-deck mx-auto mt-4 max-w-md">
        Maaf, halaman yang anda cari tiada. Mungkin ia telah dipindahkan atau dipadam.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="hk-btn">
          Laman Utama
        </Link>
        <Link href="/artikel" className="hk-btn-ghost">
          Semua Artikel
        </Link>
      </div>
    </div>
  );
}
