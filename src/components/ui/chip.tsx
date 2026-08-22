import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

// Plum Forward v2 (DESIGN.md · Components · Chip). The single pill in the whole
// system — replaces the shadcn Badge and the four hand-rolled recipes.
//
// Vertical centring: `leading-normal` + fixed height + `items-center`. This was
// diagnosed in-browser — `leading-none`/`line-height:1` renders the text ~1px
// high at the sm (26px) size; `normal` centres symmetrically at both sizes
// (verified 0.00px delta). Do NOT switch this to leading-none.
const chipVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-full border font-medium leading-normal whitespace-nowrap shrink-0 w-fit transition-[color,background-color,border-color] duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)] outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&>svg]:size-3.5 [&>svg]:shrink-0 [&>svg]:pointer-events-none',
  {
    variants: {
      variant: {
        // interactive filters + static labels; hover only bites on interactive chips
        outline: 'border-border text-foreground bg-transparent',
        // soft neutral fill — counts / secondary metadata
        solid: 'border-transparent bg-surface-raised text-muted-foreground',
        // trust markers — verified, quick-responder
        brass:
          'border-[color-mix(in_oklch,var(--brass)_50%,transparent)] text-brass-deep bg-[oklch(0.78_0.065_85/0.08)]',
        // semantic status tints (admin: live/published/done · review/scheduled · connected · failed/expired)
        success: 'border-transparent bg-success-subtle text-success',
        warning: 'border-transparent bg-warning-subtle text-warning-strong',
        info: 'border-transparent bg-info-subtle text-info',
        error: 'border-transparent bg-error-subtle text-error',
      },
      size: {
        default: 'h-8 px-3.5 text-xs',
        sm: 'h-[26px] px-2.5 text-[11px]',
      },
      interactive: {
        true: 'cursor-pointer',
        false: '',
      },
    },
    compoundVariants: [
      // interactive outline chips warm to plum on hover
      { variant: 'outline', interactive: true, class: 'hover:border-primary hover:text-primary' },
    ],
    defaultVariants: {
      variant: 'outline',
      size: 'default',
      interactive: false,
    },
  },
);

type ChipProps = React.ComponentProps<'span'> &
  Omit<VariantProps<typeof chipVariants>, 'interactive'> & {
    asChild?: boolean;
    /** Plum-filled selected state (filter toggles). Overrides the variant colour. */
    selected?: boolean;
    /** Renders a trailing ✕ with a ≥32px hit-area. Forces non-`sm` per DESIGN.md. */
    onRemove?: () => void;
    removeLabel?: string;
    /**
     * Leading status dot (Monochrome Precision §5 StatusChip). Painted in
     * `currentColor`, so it takes the variant's own status hue with no extra
     * token. Ignored under `asChild`, where Slot permits exactly one child.
     */
    dot?: boolean;
  };

function Chip({
  className,
  variant = 'outline',
  size = 'default',
  selected = false,
  onRemove,
  removeLabel = 'Remove',
  dot = false,
  asChild = false,
  onClick,
  children,
  ...props
}: ChipProps) {
  const Comp = asChild ? Slot.Root : 'span';
  // Interactive when it handles clicks itself, OR when asChild delegates to an
  // interactive child (Link/button) — both want cursor + hover affordance.
  const interactive = asChild || Boolean(onClick);
  // A plain clickable span is not keyboard/AT-accessible on its own; give it
  // button semantics. asChild children carry their own semantics, so skip.
  const asButton = interactive && !asChild;
  // Removable chips are never sm (the ✕ hit-area needs the height) — DESIGN.md.
  const resolvedSize = onRemove ? 'default' : size;

  return (
    <Comp
      data-slot="chip"
      data-variant={variant}
      data-selected={selected || undefined}
      className={cn(
        chipVariants({ variant, size: resolvedSize, interactive }),
        selected &&
          'border-primary bg-primary text-primary-foreground hover:text-primary-foreground',
        className,
      )}
      onClick={onClick}
      {...(asButton
        ? {
            role: 'button',
            tabIndex: 0,
            'aria-pressed': selected,
            onKeyDown: (e: React.KeyboardEvent<HTMLSpanElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.currentTarget.click();
              }
            },
          }
        : {})}
      {...props}
    >
      {/* Slot requires EXACTLY one element child — under asChild, render the
          child alone (onRemove is ignored; even a `false` sibling throws). */}
      {asChild ? (
        children
      ) : (
        <>
          {dot && (
            <span
              aria-hidden="true"
              className="-ml-0.5 size-1.5 shrink-0 rounded-full bg-current opacity-80"
            />
          )}
          {children}
          {onRemove && (
            <button
              type="button"
              aria-label={removeLabel}
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="relative -mr-1.5 ml-0.5 inline-flex size-4 items-center justify-center rounded-full opacity-60 transition-opacity after:absolute after:-inset-2 after:content-[''] hover:opacity-100"
            >
              <svg
                viewBox="0 0 10 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="size-2.5"
              >
                <path d="M1 1l8 8M9 1l-8 8" />
              </svg>
            </button>
          )}
        </>
      )}
    </Comp>
  );
}

export { Chip, chipVariants };
