'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EmptyState } from '@/components/ui/empty-state';
import { CHART_ACCENT } from '@/lib/constants/chart-colors';
import type { DailyPoint } from '@/lib/analytics/article-performance';

function fmtNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function fmtDay(iso: string, withYear = false): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  });
}

interface TipProps {
  active?: boolean;
  payload?: Array<{ payload: DailyPoint }>;
}

function ChartTip({ active, payload }: TipProps) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  return (
    <div className="bg-popover border-hairline rounded-md border px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold">{fmtDay(p.date, true)}</p>
      <p className="tabular-nums">{p.views.toLocaleString('en-MY')} views</p>
      <p className="text-muted-foreground tabular-nums">
        {p.readers.toLocaleString('en-MY')} readers
      </p>
    </div>
  );
}

/** Daily article views across all articles for the chosen period. */
export function ViewsChart({ daily }: { daily: DailyPoint[] }) {
  if (daily.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState title="No article views in this period" description="Try a longer period." />
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={daily} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="overviewViewsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_ACCENT} stopOpacity={0.25} />
            <stop offset="95%" stopColor={CHART_ACCENT} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={24}
          tickFormatter={(v) => fmtDay(String(v))}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          tickLine={false}
          axisLine={false}
          width={40}
          allowDecimals={false}
          tickFormatter={(v) => fmtNumber(Number(v))}
        />
        <Tooltip
          content={<ChartTip />}
          cursor={{ stroke: CHART_ACCENT, strokeWidth: 1, strokeDasharray: '4 4' }}
        />
        <Area
          type="monotone"
          dataKey="views"
          stroke={CHART_ACCENT}
          strokeWidth={2}
          fill="url(#overviewViewsGradient)"
          dot={false}
          activeDot={{ r: 4, fill: CHART_ACCENT, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
