import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

// Plum Forward v2 (DESIGN.md · Components · Button). Rectangular caps buttons;
// labels are authored sentence-case and rendered uppercase via CSS so the
// accessible name stays natural. min-height (not fixed height) lets long labels
// (e.g. Malay) wrap and grow instead of truncating. `ghost` is the one retained
// deviation from the six ratified variants — 149 borderless/icon call sites have
// no home among primary/outline/quiet/text/inverse/destructive.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-control text-[11px] font-medium uppercase tracking-[0.14em] leading-tight transition-[color,background-color,border-color,box-shadow] duration-[250ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:bg-surface-raised disabled:text-muted-foreground disabled:border-transparent disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground border-0 hover:bg-plum-hover active:bg-plum-hover',
        outline:
          'bg-transparent border border-primary text-primary hover:bg-primary hover:text-primary-foreground',
        quiet:
          'bg-transparent border border-border-strong text-foreground hover:border-primary hover:text-primary',
        // Standalone only — never inline with prose (in prose, use a link).
        text: 'rounded-none border-0 border-b border-brand-secondary bg-transparent px-0 text-primary hover:border-primary',
        // For plum-deep / photographic surfaces where a plum fill would vanish.
        inverse: 'bg-background text-primary border-0 hover:bg-surface-subtle',
        destructive:
          'bg-destructive text-white border-0 hover:bg-destructive/85 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
        // Retained 7th variant — borderless subtle / icon actions.
        ghost:
          'border-0 bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent/40',
      },
      size: {
        default: 'min-h-11 px-7 py-2.5 has-[>svg]:px-6',
        sm: 'min-h-9 px-5 py-2 text-[10px] has-[>svg]:px-4',
        lg: 'min-h-[52px] px-10 py-3 has-[>svg]:px-8',
        icon: 'size-10 p-0',
        // Retained dense-UI sizes (admin tables, calendar nav).
        xs: "min-h-6 gap-1 px-2 py-0.5 text-[10px] has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8 p-0',
        'icon-xs': "size-6 p-0 [&_svg:not([class*='size-'])]:size-3",
      },
    },
    compoundVariants: [
      // `text` is an inline-link look — keep it flush regardless of size, since
      // cva applies size padding (px-7 etc.) after the variant's px-0 otherwise.
      { variant: 'text', class: 'px-0 has-[>svg]:px-0' },
    ],
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'primary',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
