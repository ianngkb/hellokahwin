'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { MAX_RANGE_DAYS } from '@/lib/admin/date-range';

/**
 * KL-calendar date-range picker for admin reports: presets plus two native
 * date inputs, writing `?from=yyyy-MM-dd&to=yyyy-MM-dd`.
 *
 * Ported from The Wedding Notebook's picker with its calendar swapped for
 * native `<input type="date">` (no `react-day-picker`). Every date here is a
 * `yyyy-MM-dd` STRING naming an Asia/Kuala_Lumpur day, never a `Date`: the
 * browser's own zone is irrelevant, so an admin abroad sees the same "Today"
 * the server queries.
 *
 * The range the page is ACTUALLY showing (after the server's fallbacks and
 * clamps) arrives as props, rather than being re-derived from the URL — on a
 * default load the URL has no params, and the label must still be right.
 */

type Ymd = string;

/** Shift a `yyyy-MM-dd` by whole days, in UTC arithmetic (no zone involved). */
function addDays(day: Ymd, n: number): Ymd {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Inclusive number of days in `from..to`. */
export function spanDays(from: Ymd, to: Ymd): number {
  return (
    Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1
  );
}

function startOfMonth(day: Ymd): Ymd {
  return `${day.slice(0, 7)}-01`;
}

interface Preset {
  label: string;
  range: (today: Ymd) => { from: Ymd; to: Ymd };
}

const PRESETS: Preset[] = [
  { label: 'Today', range: (t) => ({ from: t, to: t }) },
  { label: 'Last 7 days', range: (t) => ({ from: addDays(t, -6), to: t }) },
  { label: 'Last 30 days', range: (t) => ({ from: addDays(t, -29), to: t }) },
  { label: 'Last 90 days', range: (t) => ({ from: addDays(t, -89), to: t }) },
  { label: 'This month', range: (t) => ({ from: startOfMonth(t), to: t }) },
  {
    label: 'Last month',
    range: (t) => {
      const lastOfPrev = addDays(startOfMonth(t), -1);
      return { from: startOfMonth(lastOfPrev), to: lastOfPrev };
    },
  },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtDay(day: Ymd, withYear: boolean): string {
  const [y, m, d] = day.split('-');
  const base = `${Number(d)} ${MONTHS[Number(m) - 1]}`;
  return withYear ? `${base} ${y}` : base;
}

export function DateRangePicker({
  from,
  to,
  today,
}: {
  /** Effective range the page is showing, as KL `yyyy-MM-dd` days. */
  from: Ymd;
  to: Ymd;
  /** Today in KL, resolved server-side so presets match the server's clamp. */
  today: Ymd;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);

  const apply = (next: { from: Ymd; to: Ymd }) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('from', next.from);
    params.set('to', next.to);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
    setOpen(false);
  };

  const activePreset = PRESETS.find((p) => {
    const r = p.range(today);
    return r.from === from && r.to === to;
  })?.label;

  const label =
    activePreset ??
    (from === to
      ? fmtDay(from, true)
      : `${fmtDay(from, from.slice(0, 4) !== to.slice(0, 4))} – ${fmtDay(to, true)}`);

  // Same cap the page clamps to (resolveRange); refusing here means the admin
  // never gets silently handed a shorter range than they picked.
  const tooLong = Boolean(draftFrom && draftTo) && spanDays(draftFrom, draftTo) > MAX_RANGE_DAYS;
  const customValid = Boolean(
    draftFrom && draftTo && draftFrom <= draftTo && draftTo <= today && !tooLong,
  );

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setDraftFrom(from);
          setDraftTo(to);
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'bg-background hover:bg-accent inline-flex h-8 items-center gap-2 rounded-md border px-2.5 text-xs font-medium transition-colors',
            pending && 'opacity-60',
          )}
        >
          <CalendarIcon className="size-3.5" />
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end" sideOffset={8}>
        <div className="flex">
          <div className="min-w-[140px] space-y-0.5 border-r p-2">
            <p className="text-muted-foreground px-2 py-1.5 text-xs font-medium">Quick select</p>
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => apply(preset.range(today))}
                className={cn(
                  'w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                  activePreset === preset.label
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent text-foreground',
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <form
            className="flex flex-col gap-3 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (customValid) apply({ from: draftFrom, to: draftTo });
            }}
          >
            <p className="text-muted-foreground text-xs font-medium">Custom range (KL time)</p>
            <label className="flex flex-col gap-1 text-xs">
              From
              <input
                type="date"
                value={draftFrom}
                max={draftTo || today}
                onChange={(e) => setDraftFrom(e.target.value)}
                className="bg-background h-8 rounded-md border px-2 text-xs"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              To
              <input
                type="date"
                value={draftTo}
                min={draftFrom || undefined}
                max={today}
                onChange={(e) => setDraftTo(e.target.value)}
                className="bg-background h-8 rounded-md border px-2 text-xs"
              />
            </label>
            {tooLong ? (
              <p role="alert" className="text-error text-xs">
                Max {MAX_RANGE_DAYS} days
              </p>
            ) : null}
            <button
              type="submit"
              disabled={!customValid}
              className="bg-primary text-primary-foreground h-8 rounded-md px-3 text-xs font-medium disabled:opacity-50"
            >
              Apply
            </button>
          </form>
        </div>
      </PopoverContent>
    </Popover>
  );
}
