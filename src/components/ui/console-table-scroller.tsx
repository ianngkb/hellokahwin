'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Scroll container for console tables (Monochrome Precision). Does two things
 * the old plain `overflow-x-auto` wrapper could not:
 *
 * 1. Renders a synced horizontal scrollbar ABOVE the table (a 1px "phantom"
 *    spacer sized to the table's scrollWidth), so wide tables can be panned
 *    without first scrolling to the bottom. Shown only when the table actually
 *    overflows sideways. The strip's own width is pinned to the scrollport's
 *    clientWidth so both bars share the exact same scroll range even when a
 *    vertical scrollbar steals gutter width from the scrollport.
 * 2. Caps its own height (`max-h`) and scrolls both axes, making it a real
 *    vertical scrollport — `position: sticky; top: 0` on `thead th` (see the
 *    `.console-table` skin in globals.css) anchors to the nearest scrollport,
 *    and the admin shell scrolls the window, so without this the sticky
 *    headers would be inert. Print gets an escape hatch (`print:max-h-none
 *    print:overflow-visible`) so paper output is never clipped to one screen.
 *
 * Both bars live inside one plain wrapper `<div>` so the component stays a
 * single layout item for flex/grid/`space-y` parents. Scrolling either bar
 * mirrors `scrollLeft` onto the other; setting `scrollLeft` to its current
 * value is a no-op, so the two-way sync cannot oscillate. Measurement runs
 * after every render (tables re-render exactly when their content changes)
 * plus on resize via a ResizeObserver on the scrollport and its current inner
 * `<table>`. Callers merge/override the default classes (incl. the height
 * cap) via `className` — `cn` uses tailwind-merge, so caller classes win.
 */
function ConsoleTableScroller({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const topRef = React.useRef<HTMLDivElement | null>(null);
  const mainRef = React.useRef<HTMLDivElement | null>(null);
  const [measure, setMeasure] = React.useState({
    scrollWidth: 0,
    clientWidth: 0,
    overflowing: false,
  });

  // No dependency array on purpose: re-measuring and re-observing on every
  // render keeps the observer bound to the CURRENT <table> node even if a
  // caller remounts it (keyed re-render, empty-state swap).
  React.useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    const update = () => {
      const scrollWidth = main.scrollWidth;
      const clientWidth = main.clientWidth;
      const overflowing = scrollWidth > clientWidth;
      setMeasure((prev) =>
        prev.scrollWidth === scrollWidth &&
        prev.clientWidth === clientWidth &&
        prev.overflowing === overflowing
          ? prev
          : { scrollWidth, clientWidth, overflowing },
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(main);
    const table = main.querySelector('table');
    if (table) observer.observe(table);
    return () => observer.disconnect();
  });

  const syncFromTop = () => {
    if (topRef.current && mainRef.current) {
      mainRef.current.scrollLeft = topRef.current.scrollLeft;
    }
  };
  const syncFromMain = () => {
    if (topRef.current && mainRef.current) {
      topRef.current.scrollLeft = mainRef.current.scrollLeft;
    }
  };

  return (
    <div className="w-full">
      {measure.overflowing ? (
        <div
          ref={topRef}
          aria-hidden="true"
          // Chrome makes scrollable containers with no focusable children
          // keyboard-focusable; an aria-hidden tab stop is a WCAG failure.
          tabIndex={-1}
          onScroll={syncFromTop}
          className="overflow-x-auto overflow-y-hidden print:hidden"
          style={{ width: measure.clientWidth }}
        >
          <div style={{ height: 1, width: measure.scrollWidth }} />
        </div>
      ) : null}
      <div
        ref={mainRef}
        onScroll={syncFromMain}
        className={cn(
          'w-full overflow-auto isolate max-h-[calc(100dvh-8rem)] print:max-h-none print:overflow-visible',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export { ConsoleTableScroller };
