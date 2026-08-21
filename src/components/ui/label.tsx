'use client';

import * as React from 'react';
import { Label as LabelPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

// Plum Forward v2 (DESIGN.md · Typography · Micro-label). `default` is the caps
// field micro-label above form inputs; `inline` keeps sentence-case for option
// labels (checkbox/radio/switch text) where caps would read wrong.
const labelBase =
  'flex items-center gap-2 leading-none select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50';

function Label({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root> & {
  variant?: 'default' | 'inline';
}) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      data-variant={variant}
      className={cn(
        labelBase,
        variant === 'inline'
          ? 'text-foreground text-sm font-medium'
          : 'text-muted-foreground text-[11px] font-semibold tracking-[0.1em] uppercase',
        className,
      )}
      {...props}
    />
  );
}

export { Label };
