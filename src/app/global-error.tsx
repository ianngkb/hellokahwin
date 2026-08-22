'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ms">
      <body
        style={{ fontFamily: 'system-ui, sans-serif', padding: '4rem 1rem', textAlign: 'center' }}
      >
        <h1>Ada masalah teknikal</h1>
        <p>Maaf, sesuatu tidak kena. Sila cuba semula sebentar lagi.</p>
        <button onClick={reset} style={{ padding: '0.5rem 1.5rem', cursor: 'pointer' }}>
          Cuba Semula
        </button>
      </body>
    </html>
  );
}
