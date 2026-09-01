'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Measures whether the class on the target inside it actually WON the
 * declarations it makes, on the surface it is standing on, and prints both.
 *
 * DES-15. `.s-h2` declared `font-weight: 600; letter-spacing: -0.01em` and got
 * neither on any public page for as long as both rules existed: at specificity
 * (0,1,0) it lost to `globals.css`'s `.hk-public h2` at (0,1,1). The markup was
 * right, the CSS was right, and the cascade threw the answer away in between —
 * which is why nothing in the source tree could see it and why the reference
 * page's own §02 scale table, being hand-typed, showed the intended numbers
 * happily while production served the other ones.
 *
 * This is the sibling of `TargetProbe` and exists for the same reason: a number
 * a page states cannot be wrong out loud, but a number a page MEASURES can.
 * Give it the claim in the class's own units (`-0.01em`, `600`) and it resolves
 * them against the element's own computed font-size — the type scale here is a
 * fluid `clamp()`, so the px a claim means is different at every width.
 *
 * ⚠ Every reading waits on `document.fonts.ready` and re-reads on resize. A
 * webfont landing after first paint changes every advance width on the page.
 */
type Claim = Record<string, string>;

const PROPS = ['font-weight', 'letter-spacing', 'line-height', 'font-family'] as const;

export function CascadeProbe({
  label,
  claim,
  children,
}: {
  /** Which class, on which surface — both halves matter; that IS the finding. */
  label: string;
  /** The declarations the class makes, verbatim from components.css. */
  claim: Claim;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<{ prop: string; want: string; got: string; ok: boolean }[]>([]);

  useEffect(() => {
    const el = ref.current?.firstElementChild;
    if (!el) return;
    const read = () => {
      const c = getComputedStyle(el);
      const fs = parseFloat(c.fontSize);
      const out: { prop: string; want: string; got: string; ok: boolean }[] = [];
      for (const prop of PROPS) {
        const want = claim[prop];
        if (!want) continue;
        const got = c.getPropertyValue(prop);
        const em = /^(-?[\d.]+)em$/.exec(want);
        if (em) {
          const px = Number(em[1]) * fs;
          out.push({
            prop,
            want: `${want} = ${px.toFixed(3)}px`,
            got,
            ok: Math.abs(parseFloat(got) - px) < 0.05,
          });
        } else if (prop === 'font-family') {
          out.push({ prop, want, got, ok: got.includes(want) });
        } else {
          out.push({ prop, want, got, ok: got === want });
        }
      }
      setRows(out);
    };
    read();
    document.fonts?.ready.then(read).catch(() => {});
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [claim]);

  const lost = rows.filter((r) => !r.ok);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[11px] uppercase">{label}</span>
        {rows.length > 0 && (
          <span
            className={`font-mono text-[11px] ${lost.length ? 'font-bold text-red-700' : 'text-muted-foreground'}`}
          >
            {lost.length
              ? `${lost.length} declaration(s) LOST — the class is asking and the page is not listening`
              : 'wins every declaration it makes'}
          </span>
        )}
      </div>
      <div ref={ref}>{children}</div>
      <table className="w-full max-w-[74ch] font-mono text-[11px] tabular-nums">
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td className="text-muted-foreground py-0.5">measuring…</td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.prop} className={r.ok ? 'text-muted-foreground' : 'font-bold text-red-700'}>
              <td className="py-0.5 pr-3">{r.prop}</td>
              <td className="py-0.5 pr-3">claims {r.want}</td>
              <td className="py-0.5">reader gets {r.got}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
