import * as React from 'react';
import { Chip } from '@/components/ui/chip';
import { cn } from '@/lib/utils';

// Small presentational pieces the clusters screens and the editor's Series
// panel share. TWN keeps these in `@/components/admin/analytics-panels` and
// `@/components/admin/article-status-chip`; HelloKahwin has neither yet, so
// they live beside their only callers rather than claiming a shared path.

/** A bordered card section, the clusters screens' one container style. */
export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-card border-hairline rounded-card overflow-hidden border', className)}>
      {children}
    </div>
  );
}

type ChipVariant = 'outline' | 'success' | 'warning' | 'error' | 'solid';

/** Article status in plain words, with the admin articles table's chip colours. */
const STATUS_CHIPS: Record<string, { label: string; variant: ChipVariant }> = {
  draft: { label: 'Draft', variant: 'outline' },
  scheduled: { label: 'Scheduled', variant: 'warning' },
  published: { label: 'Published', variant: 'success' },
  deleted: { label: 'Deleted', variant: 'error' },
};

/**
 * The status an admin should SEE. A scheduled article is stored as a `draft`
 * with `scheduledPublishAt` set — the admin articles table shows it as
 * "Scheduled", so every other article list must too.
 */
export function articleDisplayStatus(
  status: string,
  scheduledPublishAt: Date | string | null | undefined,
): string {
  return status === 'draft' && scheduledPublishAt ? 'scheduled' : status;
}

/** The status chip's label and colour; an unknown status reads as itself. */
export function articleStatusChip(status: string): { label: string; variant: ChipVariant } {
  return STATUS_CHIPS[status] ?? { label: status, variant: 'solid' };
}

/** An article's status as a small chip. Server- and client-component safe. */
export function ArticleStatusChip({ status }: { status: string }) {
  const { label, variant } = articleStatusChip(status);
  return (
    <Chip variant={variant} size="sm">
      {label}
    </Chip>
  );
}
