import * as React from 'react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

export interface ConsoleBreadcrumbItem {
  label: string;
  /** Omit on the trailing item — the current page is not a link to itself. */
  href?: string;
}

/**
 * Console breadcrumb — the uppercase micro-label trail above a page title
 * (Monochrome Precision §3: 10.5–11px, 0.06em tracking, `--sub2`).
 *
 * This replaces the "← Back to Inspire" ghost buttons the sub-pages used to
 * carry. Those existed because the old shell was a single row of top-bar links
 * with no sense of place, so every page had to hand-roll its own way back. The
 * sidebar and the group tab row now do that job, and a back BUTTON in the
 * header reads as an action — the loudest element in a header whose job is to
 * be quiet. A trail states where you are and still offers the same escape
 * hatch on its middle segments.
 *
 * Distinct from `@/components/common/breadcrumbs`, which is the public site's
 * chevron-separated, sentence-case trail. Same idea, different type system —
 * merging them would force one surface to wear the other's typography.
 */
export function ConsoleBreadcrumb({
  items,
  className,
}: {
  items: ConsoleBreadcrumbItem[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-[10.5px] font-semibold tracking-[0.06em] uppercase">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 ? (
                <span aria-hidden="true" className="opacity-60">
                  ·
                </span>
              ) : null}
              {item.href && !isLast ? (
                /* prefetch={false} for the same reason as the rest of the
                   console: every one of these targets is a dynamic, DB-backed
                   page. */
                <Link
                  href={item.href}
                  prefetch={false}
                  className="hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn('max-w-[220px] truncate', isLast && 'text-foreground/70')}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
