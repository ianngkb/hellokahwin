'use client';

import { useLayoutEffect, useRef, type HTMLAttributes, type RefObject } from 'react';

/**
 * Ported from twn-new (`src/hooks/use-viewport-clamp.ts` +
 * `src/components/layout/viewport-clamped.tsx`), merged into one file because
 * HelloKahwin has no `src/hooks` directory and this is its only consumer.
 */

/** Breathing room kept between a clamped panel and the viewport edges, in px. */
export const VIEWPORT_GUTTER = 16;

/**
 * Pure geometry behind {@link useViewportClamp}: how far to shift a panel
 * horizontally, and how tall it may be, so it stays inside the viewport.
 *
 * `rect` is the panel's box measured with NO shift applied. The shift only ever
 * moves the panel LEFT, never so far that its left edge crosses the left
 * gutter. Whole pixels are rounded AWAY from the edge being guarded.
 */
export function computeViewportClamp(
  rect: { left: number; right: number; top: number },
  viewport: { width: number; height: number },
  gutter = VIEWPORT_GUTTER,
): { shiftX: number; maxHeight: number } {
  let shiftX = Math.floor(Math.min(0, viewport.width - gutter - rect.right));
  const leftLimit = Math.min(0, Math.ceil(gutter - rect.left));
  if (shiftX < leftLimit) shiftX = leftLimit;
  const maxHeight = Math.max(0, Math.floor(viewport.height - rect.top - gutter));
  return { shiftX: shiftX === 0 ? 0 : shiftX, maxHeight };
}

/**
 * Keeps an absolutely-positioned dropdown panel fully on-screen while it is
 * mounted: slides it left when it would run off the right edge, and caps its
 * height to the space below its top so the panel scrolls instead of running
 * off the bottom. Writes `transform` and `max-height` straight onto the
 * element — no state, so opening the panel costs no extra render.
 */
export function useViewportClamp(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    let appliedShift = 0;
    const apply = () => {
      const rect = el.getBoundingClientRect();
      // `hidden md:flex` panels measure 0×0 below md — nothing to clamp.
      if (rect.width === 0) return;
      const { shiftX, maxHeight } = computeViewportClamp(
        { left: rect.left - appliedShift, right: rect.right - appliedShift, top: rect.top },
        { width: document.documentElement.clientWidth, height: window.innerHeight },
      );
      appliedShift = shiftX;
      el.style.transform = shiftX !== 0 ? `translateX(${shiftX}px)` : '';
      el.style.maxHeight = `${maxHeight}px`;
    };

    let frame = 0;
    const schedule = (e?: Event) => {
      if (e?.target instanceof Node && el.contains(e.target)) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, { capture: true, passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, { capture: true });
      el.style.transform = '';
      el.style.maxHeight = '';
    };
  }, [ref]);
}

/**
 * A `<div>` that keeps itself inside the viewport while mounted. Render it only
 * while its dropdown is open: each instance owns its own ref.
 */
export function ViewportClamped(props: HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  useViewportClamp(ref);
  return <div ref={ref} {...props} />;
}
