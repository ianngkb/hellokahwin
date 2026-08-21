import * as React from 'react';
import { cn } from '@/lib/utils';

// Plum Forward v2 (DESIGN.md · Components · Form controls). Mirrors Input's
// recipe; min-height (not fixed) so it grows with content.
const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        data-slot="textarea"
        className={cn(
          'border-border-strong bg-surface-raised text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary aria-invalid:border-destructive aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:ring-destructive rounded-control flex min-h-24 w-full border px-4 py-2.5 text-base outline-hidden transition-[border-color,box-shadow] duration-200 ease-out focus-visible:ring-1 focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
