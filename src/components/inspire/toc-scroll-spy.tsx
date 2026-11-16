'use client';

import { useEffect, useRef } from 'react';

/**
 * Marks the contents-list link for the section being read with
 * `aria-current="location"` (styled in globals.css). Progressive enhancement
 * only: the links are plain server-rendered anchors and work without it.
 *
 * "Being read" = the last heading whose top has passed `offset` pixels from
 * the top of the viewport (the sticky header plus a little air). Before the
 * first heading nothing is marked.
 */
export function TocScrollSpy({
  children,
  offset = 150,
}: {
  children: React.ReactNode;
  offset?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));
    const pairs = links
      .map((link) => {
        const id = decodeURIComponent(link.getAttribute('href')!.slice(1));
        const target = document.getElementById(id);
        return target ? { link, target } : null;
      })
      .filter((pair): pair is { link: HTMLAnchorElement; target: HTMLElement } => pair !== null);
    if (pairs.length === 0) return;

    let frame = 0;
    let current: HTMLAnchorElement | null = null;
    const update = () => {
      frame = 0;
      let next: HTMLAnchorElement | null = null;
      for (const { link, target } of pairs) {
        if (target.getBoundingClientRect().top - offset <= 1) next = link;
        else break;
      }
      if (next === current) return;
      current?.removeAttribute('aria-current');
      next?.setAttribute('aria-current', 'location');
      current = next;
      // Keep the active entry visible when the list is taller than the rail.
      if (next && root.scrollHeight > root.clientHeight) {
        const top = next.offsetTop - root.offsetTop;
        if (top < root.scrollTop || top > root.scrollTop + root.clientHeight - 40) {
          root.scrollTo({ top: Math.max(0, top - root.clientHeight / 3) });
        }
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) cancelAnimationFrame(frame);
      current?.removeAttribute('aria-current');
    };
  }, [offset]);

  return (
    <div ref={ref} className="article-toc-rail-scroll">
      {children}
    </div>
  );
}
