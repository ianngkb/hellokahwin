import { safeHref } from '@/lib/utils/safe-href';

/**
 * The visible credit for an image — owner-level requirement, board 23 Aug 2026:
 * "ALWAYS credit the original image source so it can be traced back."
 *
 * In-article images carry their credit in the figure caption, which the article
 * renderer already emits. The COVER image has no figcaption, which is why this
 * exists: it is the largest and most prominent photograph on the page and would
 * otherwise be the one image with no attribution anywhere.
 *
 * The link is deliberately FOLLOWED (no `nofollow`). The approved visual-asset
 * strategy is explicit that a nofollow credit is worth much less to the vendor,
 * and vendor goodwill is what keeps the photography programme supplied.
 * `target="_blank"` still needs `noopener` for the security reason, which is a
 * different thing entirely from `nofollow`.
 *
 * Renders nothing when there is no credit — the 682 imported library images
 * have none and never will, and an empty "Foto oleh" line helps nobody.
 */
export function ImageCredit({
  credit,
  creditUrl,
  className,
}: {
  credit: string | null | undefined;
  creditUrl?: string | null;
  className?: string;
}) {
  const text = credit?.trim();
  if (!text) return null;

  const href = creditUrl ? safeHref(creditUrl) : null;

  return (
    <p className={className ?? 'text-muted-foreground mt-2 text-xs'}>
      {href ? (
        <a
          href={href}
          className="underline underline-offset-2 transition-opacity hover:opacity-80"
          target="_blank"
          rel="noopener noreferrer"
        >
          {text}
        </a>
      ) : (
        text
      )}
    </p>
  );
}
