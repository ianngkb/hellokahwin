import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Empty / zero-state block (Monochrome Precision) — centered icon, title,
 * description, optional action. Use inside a SectionCard body or a bordered
 * container when a list/table has no rows. Server-component safe.
 */
function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 px-6 py-14 text-center',
        className,
      )}
    >
      {icon ? (
        <div className="text-muted-foreground mb-1 [&>svg]:size-6 [&>svg]:stroke-[1.5]">{icon}</div>
      ) : null}
      <h3 className="text-sm font-semibold">{title}</h3>
      {description != null ? (
        <p className="text-muted-foreground max-w-sm text-[13px]">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

/**
 * Lightweight loading skeleton — `rows` shimmer bars for tables/lists while
 * data streams in. Token-driven (`bg-muted`), server-component safe.
 */
function LoadingRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2 p-4', className)} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-muted h-9 animate-pulse rounded-[8px]" />
      ))}
    </div>
  );
}

export { EmptyState, LoadingRows };
