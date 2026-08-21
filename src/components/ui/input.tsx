import * as React from 'react';

import { cn } from '@/lib/utils';

// Plum Forward v2 (DESIGN.md · Components · Form controls). 44px, radius-control,
// border-strong boundary (≥3:1 — the accessibility gate's fix for the old
// near-invisible border/60), white card fill, 2px plum focus (border + inset
// ring, no offset glow, no layout shift). Error = border→destructive, no ring.
function Input({
  className,
  type,
  variant = 'default',
  ...props
}: React.ComponentProps<'input'> & {
  variant?: 'default' | 'underline';
}) {
  return (
    <input
      type={type}
      data-slot="input"
      data-variant={variant}
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-border-strong bg-surface-raised text-foreground aria-invalid:border-destructive aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:ring-destructive h-11 w-full min-w-0 px-4 py-1 text-sm outline-hidden transition-[border-color,box-shadow] duration-200 ease-out file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'underline'
          ? 'focus-visible:border-primary rounded-none border-0 border-b px-0 focus-visible:border-b-2 focus-visible:ring-0'
          : 'focus-visible:border-primary focus-visible:ring-primary rounded-control border focus-visible:ring-1 focus-visible:ring-inset',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
