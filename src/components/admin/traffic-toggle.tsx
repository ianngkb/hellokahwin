'use client';

import { useCallback, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Users, Bot, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TRAFFIC_MODES, type TrafficMode } from '@/lib/analytics/sql-filters';

interface TrafficToggleProps {
  active: TrafficMode;
  counts: { humans: number; bots: number; total: number };
}

const labels: Record<
  TrafficMode,
  { label: string; Icon: typeof Users; key: keyof TrafficToggleProps['counts'] }
> = {
  human: { label: 'Humans', Icon: Users, key: 'humans' },
  bot: { label: 'Bots', Icon: Bot, key: 'bots' },
  all: { label: 'All', Icon: Layers, key: 'total' },
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function TrafficToggle({ active, counts }: TrafficToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const handleSelect = useCallback(
    (mode: TrafficMode) => {
      if (mode === active) return;
      const params = new URLSearchParams(searchParams.toString());
      if (mode === 'human') {
        params.delete('traffic'); // human is default, keep URLs clean
      } else {
        params.set('traffic', mode);
      }
      const query = params.toString();
      startTransition(() => {
        router.push(query ? `${pathname}?${query}` : pathname);
      });
    },
    [active, router, pathname, searchParams],
  );

  return (
    <div
      role="radiogroup"
      aria-label="Traffic source"
      className={cn(
        'bg-background inline-flex h-8 items-center rounded-md border p-0.5 text-xs',
        pending && 'opacity-60',
      )}
    >
      {TRAFFIC_MODES.map((mode) => {
        const { label, Icon, key } = labels[mode];
        const isActive = mode === active;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => handleSelect(mode)}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-[5px] px-2.5 font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <Icon className="size-3.5" />
            <span>{label}</span>
            <span
              className={cn(
                'tabular-nums',
                isActive ? 'text-primary-foreground/80' : 'text-muted-foreground/70',
              )}
            >
              {formatCount(counts[key])}
            </span>
          </button>
        );
      })}
    </div>
  );
}
