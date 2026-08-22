import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Shared page header for the admin console (AV-1). Replaces the hand-rolled
 * `<h1 className="text-3xl font-bold">` + description block that every page
 * re-implemented, so title/description/actions/breadcrumb spacing stays
 * consistent. Server-component safe (no hooks, no "use client").
 *
 * Type is set to admin-vendor-design-system.md §3 exactly — title 25px/600 at
 * -0.03em, body 13.5px — rather than to the nearest Tailwind step (`text-2xl`
 * = 24px, `text-sm` = 14px), which is what it used before. The console has no
 * type-scale token layer (§7 records this as a known gap), so the scale lives
 * as literals here; concentrating them in the one component every page's title
 * goes through is what stops the scale drifting page to page.
 *
 * Used only by the `(admin)` route group — the public site has its own
 * editorial headings — so these values cannot leak onto a public page.
 */
function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Optional breadcrumb row rendered above the title. */
  breadcrumb?: React.ReactNode;
  /** Optional right-aligned action slot (buttons, filters). */
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-7 flex flex-col gap-2.5', className)}>
      {breadcrumb ? <div className="text-muted-foreground">{breadcrumb}</div> : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[25px] leading-tight font-semibold tracking-[-0.03em]">{title}</h1>
          {description ? (
            <p className="text-muted-foreground mt-1.5 max-w-3xl text-[13.5px] leading-relaxed">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}

export { PageHeader };
