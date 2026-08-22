'use client';

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">Ada masalah teknikal</h1>
      <p className="text-muted-foreground max-w-md">
        Maaf, sesuatu tidak kena. Sila cuba semula sebentar lagi.
      </p>
      <button
        onClick={reset}
        className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 text-sm font-semibold"
      >
        Cuba Semula
      </button>
    </div>
  );
}
