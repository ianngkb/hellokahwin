'use client';

import Link from 'next/link';
import { ArrowLeftIcon, PrinterIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * On-screen escape hatch for the print page (spec-article-draft-client-review).
 *
 * `AutoPrint` opens the dialog once, on mount. If the admin cancels it — or the
 * browser suppresses it, which happens when the tab isn't focused at the moment
 * `window.print()` fires — the tab is left on a chrome-free page with no navbar,
 * no back button and no way to try again short of a manual reload. This gives
 * them both: reprint, and a way back to the editor.
 *
 * It renders OUTSIDE `.article-print-root`, which is what keeps it off paper:
 * the `@media print` block hides `body *` and re-shows only the print root's
 * subtree. `visibility: hidden` alone still reserves the element's box though,
 * so globals.css also `display: none`s `[data-print-toolbar]` — otherwise this
 * bar would open a blank strip at the top of page 1.
 */
export function PrintToolbar({ articleId }: { articleId: string }) {
  return (
    <div
      data-print-toolbar
      className="border-border bg-background sticky top-0 z-10 flex items-center justify-between gap-3 border-b px-4 py-2"
    >
      <Button variant="quiet" size="sm" asChild>
        <Link href={`/admin/inspire/${articleId}/edit`}>
          <ArrowLeftIcon className="mr-1 size-3.5" />
          Back to editor
        </Link>
      </Button>

      <Button variant="quiet" size="sm" onClick={() => window.print()}>
        <PrinterIcon className="mr-1 size-3.5" />
        Print
      </Button>
    </div>
  );
}
