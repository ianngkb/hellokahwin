import * as React from 'react';

import { Chip } from '@/components/ui/chip';

/**
 * Slim port of twn-new's StatusChip. The HelloKahwin call sites all pass
 * explicit `variant` + `label`, so the listing/vendor/inquiry status maps of
 * the original are gone — this is just the dot-chip rendering.
 */
export type ChipVariant = 'success' | 'warning' | 'info' | 'error' | 'solid' | 'outline' | 'brass';

export function StatusChip({
  variant = 'solid',
  label,
  size = 'sm',
  dot = true,
  className,
}: {
  status?: string;
  variant?: ChipVariant;
  label?: string;
  size?: 'default' | 'sm';
  /** Leading status dot (Monochrome Precision motif). */
  dot?: boolean;
  className?: string;
}) {
  return (
    <Chip variant={variant} size={size} className={className}>
      {dot ? (
        <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
      ) : null}
      {label}
    </Chip>
  );
}
