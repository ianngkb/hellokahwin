'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Measures the rendered box of the target inside it and prints it.
 *
 * UI-11. The reference page's §06 table used to assert that a breadcrumb link
 * had "20px text, 44px hit slop". It never did — the shipped breadcrumb
 * measured 40 x 20 with no slop at all, and the page had been asserting
 * otherwise since it was written, because a hand-typed number in a table cannot
 * be wrong out loud. This component removes the option: it reads
 * `getBoundingClientRect()` off the real element and prints what it finds, so
 * a specimen that stops meeting the floor says so on the page.
 *
 * `min` is the floor to judge against — pass the same number the system's
 * `--tap-min` holds, and the verdict comes from measurement, not from belief.
 */
export function TargetProbe({
  label,
  min = 24,
  children,
}: {
  label: string;
  min?: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = ref.current?.firstElementChild;
    if (!el) return;
    const read = () => {
      const r = el.getBoundingClientRect();
      setBox({ w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 });
    };
    read();
    // Fonts land after first paint and change every advance width and line box.
    document.fonts?.ready.then(read).catch(() => {});
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pass = box ? box.w >= min && box.h >= min : null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[11px] uppercase">{label}</span>
        <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
          {box ? `${box.w} × ${box.h}` : 'measuring…'}
        </span>
        {pass !== null && (
          <span
            className={`font-mono text-[11px] ${pass ? 'text-muted-foreground' : 'font-bold text-red-700'}`}
          >
            {pass ? `≥ ${min}` : `UNDER ${min} — the system is not keeping its own floor`}
          </span>
        )}
      </div>
      {/* The dashed box is the measured element's own edge, drawn so the box a
          reader is being told about is the box they can see. */}
      <div ref={ref} className="[&>*]:outline-dashed [&>*]:outline-1 [&>*]:outline-red-400/70">
        {children}
      </div>
    </div>
  );
}
