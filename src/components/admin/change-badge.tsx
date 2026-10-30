// Deliberately NOT 'use client': no hooks, state or handlers, just props in and
// markup out, so a server-rendered report can use it without shipping it to the
// client. Importing it FROM a client component (the site-analytics dashboard)
// still works.
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';

/**
 * Period-over-period delta pill for admin KPI tiles. Ported from The Wedding
 * Notebook.
 *
 * `higherIsBetter` decouples *direction* from *sentiment*: an up-arrow is
 * green for "Unique visitors" but red for "Bounce rate".
 *
 * A zero previous period renders an em-dash rather than a percentage — there
 * is no meaningful growth rate off a base of 0, and the naive division would
 * surface `Infinity`/`NaN` in the UI.
 */
export function ChangeBadge({
  current,
  previous,
  higherIsBetter,
}: {
  current: number;
  previous: number;
  higherIsBetter: boolean;
}) {
  if (previous === 0) return <span className="text-muted-foreground text-xs">—</span>;
  const diff = current - previous;
  const pct = Math.abs(Math.round((diff / previous) * 100));
  const isUp = diff > 0;
  const isNeutral = diff === 0;

  if (isNeutral) {
    return <span className="text-muted-foreground text-xs">0%</span>;
  }

  const isGood = higherIsBetter ? isUp : !isUp;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        isGood ? 'text-success' : 'text-error'
      }`}
    >
      {isUp ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />}
      {pct}%
    </span>
  );
}
