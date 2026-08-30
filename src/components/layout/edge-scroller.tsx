'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * A horizontal scroller that admits it is scrollable.
 *
 * The masthead rail hides its scrollbar (`scrollbar-width: none`) so the
 * masthead stays a hairline. The cost, measured on production 2026-08-26 at a
 * 1400px viewport: `scrollWidth` 1986 against `clientWidth` 1136, so 850px of
 * the rail — three of the nine pillars, entirely — sat off-screen with nothing
 * on the page suggesting they existed. A rail that is both clipped and
 * scrollbar-less is indistinguishable from a rail that is complete.
 *
 * WHY THIS IS STATEFUL rather than a permanent CSS fade. An always-on right
 * fade lies as soon as the reader reaches the end, and on a phone that is most
 * of the time. An affordance that is wrong half the time trains people to
 * ignore it, which is worse than not having one. So the two edges are measured
 * and the fades follow: `data-overflow-start` / `data-overflow-end` on the
 * wrapper, painted by `.hk-edge` in globals.css.
 *
 * It observes the children as well as the container, because the rail's width
 * changes when a nav item's accordion opens below it, not only when the window
 * resizes.
 */
export function EdgeScroller({
  children,
  staticFrom,
}: {
  children: ReactNode;
  /**
   * Above this breakpoint the content no longer overflows — it wraps — so the
   * scroller stops scrolling and the edge cues stop painting (`.hk-edge
   * [data-static]` in globals.css, matched at the same 1024px).
   *
   * `overflow: visible` there is not cosmetic. `overflow-x: auto` forces
   * `overflow-y` to `auto` as well, which makes this element a clip box for
   * the category dropdowns positioned inside it — measured on live production
   * 2026-08-31, where the desktop dropdown's 44px rows extended past a 60px
   * clip and the scroller silently grew a vertical scroll. Wrapping removes
   * the need for the clip, so the clip goes.
   */
  staticFrom?: 'lg';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // 1px of slack: fractional scroll positions never land exactly on the max.
    const max = el.scrollWidth - el.clientWidth;
    const next = { start: el.scrollLeft > 1, end: el.scrollLeft < max - 1 };
    setEdges((prev) => (prev.start === next.start && prev.end === next.end ? prev : next));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => {
      el.removeEventListener('scroll', measure);
      ro.disconnect();
    };
  }, [measure]);

  return (
    /* The -mx-2 lives on the WRAPPER, not on the scroller. It used to sit on the
       scroller, which made the scroller 8px wider than the wrapper at each edge —
       and since the fades are the wrapper's pseudo-elements, 8px of chip text
       rendered past them and sat there uncovered next to the chevron. Same box,
       same edges, or the affordance does not line up with what it is hiding. */
    <div
      className="hk-edge relative -mx-2"
      data-static={staticFrom}
      data-overflow-start={edges.start || undefined}
      data-overflow-end={edges.end || undefined}
    >
      {/* No aria-label here. This is a plain <div>; an aria-label on an element
          with no role is dropped on the floor by assistive tech, and a decorative
          one is worse than none because it reads as solved. The accessible name
          belongs on the <nav> InspireNavMenu renders, which is what it labels. */}
      <div
        ref={ref}
        className={`overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          staticFrom === 'lg' ? 'lg:overflow-visible' : ''
        }`}
      >
        {children}
      </div>
    </div>
  );
}
