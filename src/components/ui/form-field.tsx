import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Form field layout wrapper (Monochrome Precision) — label + control slot +
 * hint/error. It does NOT render the control; drop the existing Input/Select/
 * Textarea inside so field spacing and label/hint styling stay consistent
 * across every console form. Server-component safe.
 *
 *   <FormField label="Listing name" htmlFor="name" hint="Shown to couples.">
 *     <Input id="name" defaultValue="…" />
 *   </FormField>
 */
function FormField({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label != null ? (
        <label htmlFor={htmlFor} className="text-[12.5px] font-semibold">
          {label}
          {required ? <span className="text-error ml-0.5">*</span> : null}
        </label>
      ) : null}
      {children}
      {error != null ? (
        <p className="text-error text-[11.5px]">{error}</p>
      ) : hint != null ? (
        <p className="text-muted-foreground text-[11.5px]">{hint}</p>
      ) : null}
    </div>
  );
}

export { FormField };
