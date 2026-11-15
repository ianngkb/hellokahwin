'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { PeriodKey } from '@/lib/analytics/article-period';
import { overviewHref } from './overview-params';

const PRESETS: Array<{ key: Exclude<PeriodKey, 'month'>; label: string }> = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: 'lifetime', label: 'Lifetime' },
];

const pill =
  'border-hairline inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold transition-colors';
const pillOn = 'bg-primary text-primary-foreground border-primary';
const pillOff = 'text-muted-foreground hover:text-foreground hover:bg-accent/50';

/**
 * The period picker: four presets as links, plus a month picker. Every choice
 * is a URL, so a view can be bookmarked or shared and the back button works.
 */
export function PeriodBar({
  params,
  active,
  monthKey,
  monthOptions,
  currentMonthKey,
}: {
  params: Record<string, string>;
  active: PeriodKey;
  monthKey: string | null;
  monthOptions: Array<{ value: string; label: string }>;
  currentMonthKey: string;
}) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Period">
      {PRESETS.map((p) => (
        <Link
          key={p.key}
          href={overviewHref(params, { period: p.key, month: null })}
          aria-current={active === p.key ? 'page' : undefined}
          className={cn(pill, active === p.key ? pillOn : pillOff)}
          prefetch={false}
        >
          {p.label}
        </Link>
      ))}
      <label
        className={cn(
          pill,
          'gap-2 pr-1',
          active === 'month' ? 'border-primary text-foreground' : 'text-muted-foreground',
        )}
      >
        <span>Month</span>
        <select
          aria-label="Choose a month"
          className="bg-transparent py-1 text-xs font-semibold outline-none"
          value={active === 'month' && monthKey ? monthKey : ''}
          onChange={(e) => {
            const value = e.target.value || currentMonthKey;
            router.push(overviewHref(params, { period: 'month', month: value }));
          }}
        >
          <option value="" disabled>
            Select a month
          </option>
          {monthOptions.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
