import * as React from 'react';
import Link from 'next/link';

import { Chip } from '@/components/ui/chip';
import { cn } from '@/lib/utils';

/**
 * Console filter bar (Monochrome Precision §5 "Filter pills") — a row of
 * link-backed pills, ghost when idle and ink-filled when active.
 *
 * Link-backed on purpose: every filter in this console is already URL state
 * (`?status=`, `?categoryId=`), so a pill is a navigation, not a toggle. That
 * keeps filters shareable and back-button-correct, and keeps this component
 * server-renderable — no `'use client'`, no state, no hydration cost on pages
 * that are otherwise entirely server-rendered.
 */
export interface FilterPillOption {
  label: React.ReactNode;
  /** Destination for this option, already carrying the filter query string. */
  href: string;
  /** Optional trailing count, rendered in tabular figures. */
  count?: number;
  active?: boolean;
}

function FilterPills({
  options,
  label,
  className,
}: {
  options: FilterPillOption[];
  /** Optional micro-label rendered before the row (e.g. "Status"). */
  label?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {label != null ? (
        <span className="text-muted-foreground mr-1 text-[10.5px] font-semibold tracking-[0.06em] uppercase">
          {label}
        </span>
      ) : null}
      {options.map((option) => (
        <Chip
          key={option.href}
          asChild
          size="sm"
          variant="outline"
          selected={option.active}
          className={cn(!option.active && 'bg-muted/50 border-transparent')}
        >
          {/* prefetch={false} matches the rest of the console: filter targets
              are dynamic, DB-backed renders of the same page, and prefetching
              a whole filter row would fan out a query per pill on render. */}
          <Link
            href={option.href}
            prefetch={false}
            aria-current={option.active ? 'true' : undefined}
          >
            {option.label}
            {option.count != null ? (
              <span className="ml-1 text-[10.5px] tabular-nums opacity-70">{option.count}</span>
            ) : null}
          </Link>
        </Chip>
      ))}
    </div>
  );
}

export { FilterPills };
