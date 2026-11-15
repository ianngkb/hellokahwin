'use client';

import { InfoIcon } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * A KPI label with an info affordance explaining how the figure is calculated.
 *
 * Pass as `StatCard.label` (which takes a ReactNode). The icon carries the
 * definition as `aria-label` too, so the explanation is reachable without a
 * hover — the tooltip alone would hide it from touch and screen readers.
 */
export function StatHint({ label, hint }: { label: string; hint: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="truncate">{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`${label}: ${hint}`}
            className="text-muted-foreground/70 hover:text-foreground focus-visible:ring-ring shrink-0 rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <InfoIcon className="size-3.5" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent>{hint}</TooltipContent>
      </Tooltip>
    </span>
  );
}
