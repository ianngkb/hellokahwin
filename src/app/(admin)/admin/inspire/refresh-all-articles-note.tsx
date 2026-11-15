import Link from 'next/link';

/** Shown on screens whose changes reach live articles only on refresh. */
export function RefreshAllArticlesNote() {
  return (
    <p className="text-muted-foreground text-sm">
      Already-published articles pick this up when they are next saved, or when you press{' '}
      <Link
        href="/admin/inspire"
        className="text-foreground font-medium underline underline-offset-4"
      >
        Refresh all articles
      </Link>{' '}
      on the Articles page.
    </p>
  );
}
