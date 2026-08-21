import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">404</p>
      <h1 className="text-2xl font-bold">Halaman tidak dijumpai</h1>
      <p className="text-muted-foreground max-w-md">
        Maaf, halaman yang anda cari tiada. Mungkin ia telah dipindahkan atau dipadam.
      </p>
      <Link
        href="/"
        className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 text-sm font-semibold"
      >
        Kembali ke Laman Utama
      </Link>
    </div>
  );
}
