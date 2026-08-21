import * as React from 'react';

import { ConsoleTableScroller } from '@/components/ui/console-table-scroller';
import { cn } from '@/lib/utils';

/**
 * Console data table (Monochrome Precision). A thin wrapper that applies the
 * `.console-table` skin (see globals.css — uppercase micro thead, hairline
 * rows, hover, `.num` mono cells) to plain semantic table markup, inside a
 * scrollable container. Pages write ordinary `<thead>/<tbody>`.
 *
 *   <ConsoleTable>
 *     <thead><tr><th>Listing</th><th className="num">Views</th></tr></thead>
 *     <tbody>
 *       <tr><td><MediaCell title="Garden Ballroom" subtitle="PJ" /></td>
 *           <td className="num">642</td></tr>
 *     </tbody>
 *   </ConsoleTable>
 *
 * `ConsoleTable` itself is server-component safe; the scroll container it
 * renders (`ConsoleTableScroller`) is a `'use client'` component that adds a
 * synced top horizontal scrollbar and the height-capped scrollport the sticky
 * `thead` needs. Override/extend its classes via `wrapperClassName`.
 */
function ConsoleTable({
  children,
  className,
  wrapperClassName,
}: {
  children: React.ReactNode;
  className?: string;
  wrapperClassName?: string;
}) {
  return (
    <ConsoleTableScroller className={wrapperClassName}>
      <table className={cn('console-table', className)}>{children}</table>
    </ConsoleTableScroller>
  );
}

/**
 * Thumbnail + name/subtitle cell body — the repeating "media row" from the
 * mockup. Pass an image `src` (rendered as a background) or leave it for a
 * neutral placeholder tile.
 */
function MediaCell({
  title,
  subtitle,
  src,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  src?: string | null;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span
        className="bg-muted border-hairline size-9 shrink-0 rounded-[8px] border bg-cover bg-center sm:size-10"
        style={src ? { backgroundImage: `url(${src})` } : undefined}
        aria-hidden="true"
      />
      {/* max-w caps the name so long strings truncate instead of widening the
          whole table (auto table-layout won't truncate an unbounded cell). */}
      <span className="max-w-[150px] min-w-0 sm:max-w-[220px] lg:max-w-[300px]">
        <span className="block truncate font-semibold">{title}</span>
        {subtitle != null ? (
          <span className="text-muted-foreground block truncate text-xs">{subtitle}</span>
        ) : null}
      </span>
    </div>
  );
}

export { ConsoleTable, MediaCell };
