import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Shared page header for the admin + vendor surfaces (AV-1). Replaces the
 * hand-rolled `<h1 className="text-3xl font-bold">` + description block that
 * every page re-implemented, so title/description/actions/breadcrumb spacing
 * stays consistent. Server-component safe (no hooks, no "use client").
 */
function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Optional breadcrumb row rendered above the title. */
  breadcrumb?: React.ReactNode;
  /** Optional right-aligned action slot (buttons, filters). */
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-8 flex flex-col gap-3', className)}>
      {breadcrumb ? <div className="text-muted-foreground text-sm">{breadcrumb}</div> : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? <p className="text-muted-foreground mt-1 text-sm">{description}</p> : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}

export { PageHeader };
