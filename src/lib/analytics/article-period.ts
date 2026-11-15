import { addDays, format, parse, startOfMonth, subDays, subMonths } from 'date-fns';
import { getPreviousPeriod, type DateRange } from '@/lib/admin/date-range';
import { monthWindow } from '@/lib/admin/month-window';

/**
 * The reporting period for the Article Analytics overview — `?period=` and
 * `?month=` resolved into the window the page reports on and the window its
 * changes compare against.
 *
 * PLAIN FUNCTIONS, no React, no `server-only`: the server page and the client
 * period bar both import from here, and an export of a client module reaches
 * the server as a reference proxy rather than a callable (the month-window.ts
 * lesson, Sentry TWN-NEW-5D).
 *
 * KL CALENDAR THROUGHOUT. `today` is always `getKLToday()`; every `from`/`to`
 * is a KL calendar day, fed to `toUtcRange` or compared with rollup `day`s.
 */

/**
 * HelloKahwin's own page-view tracking starts here (first-party analytics,
 * PR #83, live 30 Oct 2026) — "Lifetime" means since this day.
 */
export const VIEWS_TRACKING_SINCE = '2026-10-30';

export const PERIOD_KEYS = ['7d', '30d', '90d', 'month', 'lifetime'] as const;
export type PeriodKey = (typeof PERIOD_KEYS)[number];
export const DEFAULT_PERIOD: PeriodKey = '30d';

const ROLLING_DAYS: Record<'7d' | '30d' | '90d', number> = { '7d': 7, '30d': 30, '90d': 90 };

const DATE_FORMAT = 'yyyy-MM-dd';
const MONTH_FORMAT = 'yyyy-MM';

export interface ArticlePeriod {
  key: PeriodKey;
  /** Only for `month`: the resolved `yyyy-MM`. */
  monthKey: string | null;
  range: DateRange;
  /** What changes compare against; `null` for lifetime (nothing before it). */
  prevRange: DateRange | null;
  /** "Last 30 days", "Oct 2026", "Lifetime (since 12 Apr 2026)". */
  label: string;
  /** "vs the 30 days before" / "vs Sep 2026"; `null` when there is no comparison. */
  comparisonLabel: string | null;
}

function firstValue(raw: string | string[] | undefined): string | undefined {
  const first = Array.isArray(raw) ? raw[0] : raw;
  return typeof first === 'string' ? first : undefined;
}

export function parsePeriodKey(raw: string | string[] | undefined): PeriodKey {
  const value = firstValue(raw);
  return (PERIOD_KEYS as readonly string[]).includes(value ?? '')
    ? (value as PeriodKey)
    : DEFAULT_PERIOD;
}

/** The month the picker's oldest option is: the month tracking began. */
export function trackingFloorMonth(): string {
  return VIEWS_TRACKING_SINCE.slice(0, 7);
}

/**
 * `?month=` → a usable `yyyy-MM`. Anything malformed, in the future, or before
 * tracking began falls back to the current month — never an error, matching
 * how every other admin report treats a nonsensical date param.
 */
export function parseArticleMonth(raw: string | string[] | undefined, today: Date): string {
  const current = format(today, MONTH_FORMAT);
  const value = firstValue(raw);
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return current;
  const parsed = parse(value, MONTH_FORMAT, new Date());
  if (Number.isNaN(parsed.getTime()) || format(parsed, MONTH_FORMAT) !== value) return current;
  if (value > current || value < trackingFloorMonth()) return current;
  return value;
}

/** The month picker's options, newest first, back to the month tracking began. */
export function articleMonthOptions(today: Date): Array<{ value: string; label: string }> {
  const out: Array<{ value: string; label: string }> = [];
  const floor = trackingFloorMonth();
  let month = startOfMonth(today);
  for (let i = 0; i < 60; i++) {
    const value = format(month, MONTH_FORMAT);
    if (value < floor) break;
    out.push({
      value,
      label: i === 0 ? `${format(month, 'MMMM yyyy')} (so far)` : format(month, 'MMMM yyyy'),
    });
    month = subMonths(month, 1);
  }
  return out;
}

/** "12 Apr 2026" from a `yyyy-MM-dd`. */
export function formatDay(day: string): string {
  return format(parse(day, DATE_FORMAT, new Date()), 'd MMM yyyy');
}

export function resolveArticlePeriod(
  params: { period?: string | string[]; month?: string | string[] },
  today: Date,
): ArticlePeriod {
  const key = parsePeriodKey(params.period);
  const todayStr = format(today, DATE_FORMAT);

  if (key === 'lifetime') {
    return {
      key,
      monthKey: null,
      range: { from: VIEWS_TRACKING_SINCE, to: todayStr },
      prevRange: null,
      label: `Lifetime (since ${formatDay(VIEWS_TRACKING_SINCE)})`,
      comparisonLabel: null,
    };
  }

  if (key === 'month') {
    const monthKey = parseArticleMonth(params.month, today);
    const w = monthWindow(monthKey, today);
    // The month before tracking began has no data, so comparing April 2026 with
    // an empty March would print "+100%" on every tile.
    const hasPrev = w.prevRange.to >= VIEWS_TRACKING_SINCE;
    return {
      key,
      monthKey,
      range: w.range,
      prevRange: hasPrev ? w.prevRange : null,
      label: w.label,
      comparisonLabel: hasPrev ? `vs ${w.comparisonLabel.split(' vs ')[1]}` : null,
    };
  }

  const days = ROLLING_DAYS[key];
  const from = format(subDays(today, days - 1), DATE_FORMAT);
  const prev = getPreviousPeriod(from, todayStr);
  return {
    key,
    monthKey: null,
    range: { from, to: todayStr },
    prevRange: prev.to >= VIEWS_TRACKING_SINCE ? prev : null,
    label: `Last ${days} days`,
    comparisonLabel: prev.to >= VIEWS_TRACKING_SINCE ? `vs the ${days} days before` : null,
  };
}

/** The later of two `yyyy-MM-dd` days. */
export function laterDay(a: string, b: string): string {
  return a > b ? a : b;
}

/** `day` plus `n` calendar days, as `yyyy-MM-dd`. */
export function shiftDay(day: string, n: number): string {
  return format(addDays(parse(day, DATE_FORMAT, new Date()), n), DATE_FORMAT);
}

/** Inclusive number of days in a range. */
export function daysIn(range: DateRange): number {
  const a = parse(range.from, DATE_FORMAT, new Date()).getTime();
  const b = parse(range.to, DATE_FORMAT, new Date()).getTime();
  return Math.round((b - a) / 86_400_000) + 1;
}
