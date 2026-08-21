import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Bordered content card with an optional titled header row + right-aligned
 * action slot (AV-1). Lighter than the editorial `Card` (which pads 8 and uses
 * a serif title) — this is the utility-surface workhorse for dashboards and
 * detail panels. Server-component safe.
 */
function SectionCard({
  title,
  headerAction,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  /** Right-aligned slot in the header (e.g. a "View all →" link). */
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={cn('bg-card rounded-card border-hairline overflow-hidden border', className)}>
      {title != null ? (
        <div className="border-hairline flex items-center gap-3 border-b px-5 py-3.5">
          <h2 className="text-sm font-semibold">{title}</h2>
          {headerAction ? <div className="ml-auto">{headerAction}</div> : null}
        </div>
      ) : null}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </div>
  );
}

export { SectionCard };
