import * as React from 'react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

/**
 * Compact KPI tile for admin + vendor dashboards (AV-1). Consumed by AV-2
 * (vendor command center) and AV-6 (admin dashboard). Tokens only — the delta
 * trend maps to `--success` / `--error` so it satisfies the no-hardcoded-colours
 * rule. Server-component safe.
 */
interface StatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Optional secondary line under the value (e.g. "▲ 12%"). */
  delta?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  /** Render the value in Geist Mono (default) for column-aligned figures. */
  mono?: boolean;
  /** Drop the card border/background — for use inside <KpiStrip>. */
  plain?: boolean;
  /**
   * Rendered to the right of the label — intended for an info-tooltip trigger
   * explaining what the figure counts.
   *
   * This slot takes a NODE rather than a string of help text on purpose: a
   * tooltip is a client component, and giving StatCard the text would force it
   * to import one, dragging that client chunk into every dashboard that renders
   * a tile. Composing from the caller keeps this file server-only.
   *
   * It sits at `z-10` so it stays clickable ON TOP of the stretched link below.
   */
  hint?: React.ReactNode;
  /**
   * Call-to-action text. Paired with `href` it becomes the tile's link — and
   * that link is STRETCHED (`after:absolute after:inset-0`) so the whole tile is
   * the click target while the accessible name stays this short phrase rather
   * than the tile's entire contents.
   *
   * Deliberately not a whole-tile `<Link>` wrapper: that would nest `hint`'s
   * button inside an anchor, which is invalid HTML and would navigate whenever
   * someone reached for the definition.
   */
  action?: React.ReactNode;
  /** Destination for `action`. Ignored unless `action` is also given. */
  href?: string;
  className?: string;
}

function StatCard({
  label,
  value,
  delta,
  trend = 'neutral',
  icon,
  mono = true,
  plain = false,
  hint,
  action,
  href,
  className,
}: StatCardProps) {
  const linked = href != null && action != null;
  return (
    <div
      className={cn(
        'relative',
        plain ? 'p-5' : 'bg-card rounded-card border-hairline border p-5',
        linked && 'hover:bg-accent/40 transition-colors',
        className,
      )}
    >
      <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
        {icon ? <span className="[&>svg]:size-4 [&>svg]:shrink-0">{icon}</span> : null}
        <span className="truncate">{label}</span>
        {hint ? <span className="relative z-10 ml-auto shrink-0">{hint}</span> : null}
      </div>
      <div
        className={cn(
          'mt-2 text-3xl font-semibold tracking-tight tabular-nums',
          mono && 'font-mono',
        )}
      >
        {value}
      </div>
      {delta != null || linked ? (
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium">
          {delta != null ? (
            <span
              className={cn(
                trend === 'up' && 'text-success',
                trend === 'down' && 'text-error',
                trend === 'neutral' && 'text-muted-foreground',
              )}
            >
              {delta}
            </span>
          ) : null}
          {linked ? (
            /* prefetch={false} matches the admin nav: these all point at
               dynamic, DB-backed pages, and prefetching a strip of them on
               render competes for the 5-wide connection pool. */
            <Link
              href={href}
              prefetch={false}
              className="text-foreground focus-visible:outline-primary underline-offset-4 after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {action} →
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// Static column classes so Tailwind's JIT detects them (no dynamic strings).
const STRIP_COLS: Record<2 | 3 | 4 | 5, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
  5: 'sm:grid-cols-3 lg:grid-cols-5',
};

/**
 * Connected KPI strip — one bordered, rounded container with hairline dividers
 * between the tiles (the mockup's `.kpis` row). Renders `StatCard`s in `plain`
 * mode so the strip owns the border. Pass 2–5 items.
 */
function KpiStrip({ items, className }: { items: StatCardProps[]; className?: string }) {
  const cols = Math.min(Math.max(items.length, 2), 5) as 2 | 3 | 4 | 5;
  return (
    <div
      className={cn(
        'bg-card rounded-card border-hairline grid grid-cols-1 overflow-hidden border',
        STRIP_COLS[cols],
        className,
      )}
    >
      {items.map((item, i) => (
        <StatCard
          key={i}
          {...item}
          plain
          className={cn(
            'border-hairline border-b sm:border-r sm:border-b-0 sm:last:border-r-0',
            item.className,
          )}
        />
      ))}
    </div>
  );
}

export { StatCard, KpiStrip };
export type { StatCardProps };
