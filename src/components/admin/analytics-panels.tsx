import * as React from 'react';

import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

/**
 * Shared building blocks for the admin analytics dashboards (the per-article
 * page, the article comparison page, cluster analytics). Server- and
 * client-component safe: no hooks.
 */

/** The bordered card every analytics panel sits in. */
export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-card border-hairline rounded-card overflow-hidden border', className)}>
      {children}
    </div>
  );
}

/**
 * One headline number with its label, and an optional plain-language hint
 * under it (the technical term, or how the figure is worked out).
 */
export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Panel className="p-4">
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{label}</p>
      <p className="text-foreground mt-1 font-mono text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {hint && <p className="text-muted-foreground mt-1 text-[11px]">{hint}</p>}
    </Panel>
  );
}

/**
 * What a panel shows when its data could not be read (its `safePanel` fallback
 * was `null`: a timeout or a transient database error). Deliberately a
 * different sentence from every "No … yet" empty state, so a failed read can
 * never pass for "this article has no data".
 */
export function PanelFailed({ className }: { className?: string }) {
  return (
    <div className={cn('p-4', className)} role="status">
      <EmptyState title="This panel couldn't load" description="Refresh the page to try again." />
    </div>
  );
}
