import {
  addMonths,
  format,
  getDaysInMonth,
  isValid,
  parse,
  startOfMonth,
  subMonths,
} from 'date-fns';
import type { DateRange } from './date-range';

/**
 * The Lead report's MONTHLY period mode — "September vs August", the comparison
 * a business owner means when they say month on month.
 *
 * The weekly report compares a window against the equal-length rolling window
 * before it (`getPreviousPeriod`), which is the right answer for "this week vs
 * last" and the wrong one for a calendar month: on 9 Oct, "This month" there
 * compares Oct 1–9 against Sep 22–30. These helpers resolve a `?month=YYYY-MM`
 * param into the two windows the report actually wants, plus the words that say
 * which two they are.
 *
 * ALL PLAIN FUNCTIONS, no React, no `'use client'`. The server page calls every
 * one of them, and an export of a client module arrives on the server as a
 * client-reference proxy rather than a callable — which is exactly how
 * `describeWindow` 500'd `/admin/leads/report` (Sentry TWN-NEW-5D). The guard
 * test in `__tests__/month-window.test.ts` pins that.
 *
 * KL CALENDAR THROUGHOUT. `today` is always `getKLToday()`, the month strings
 * are KL calendar months, and the `from`/`to` days they produce are fed to
 * `toUtcRange` exactly like the picker's own days — so the SQL stays on bare
 * `created_at` bounds and keeps its index.
 */

/** How many months the picker offers, counting the current one. */
export const MONTH_PICKER_MONTHS = 18;

const MONTH_FORMAT = 'yyyy-MM';
const DATE_FORMAT = 'yyyy-MM-dd';

export interface MonthWindow {
  /** The resolved `yyyy-MM`, which may differ from what the URL asked for. */
  monthKey: string;
  /** The month itself, clipped to today when it is the running month. */
  range: DateRange;
  /** What the deltas compare against — the PREVIOUS calendar month. */
  prevRange: DateRange;
  /** Is this the month we are currently in (so `range.to` is today)? */
  running: boolean;
  /** "Sep 2026", or "Oct 2026 (month to date)" for the running month. */
  label: string;
  /** "Sep 2026 vs Aug 2026" / "Oct 1–9 vs Sep 1–9 (month to date)". */
  comparisonLabel: string;
}

/** `yyyy-MM` of the KL month we are in. */
export function currentMonthKey(today: Date): string {
  return format(today, MONTH_FORMAT);
}

/** The oldest month the picker offers — `MONTH_PICKER_MONTHS` back, inclusive. */
export function monthFloorKey(today: Date): string {
  return format(subMonths(startOfMonth(today), MONTH_PICKER_MONTHS - 1), MONTH_FORMAT);
}

/**
 * Is `?period=` asking for the monthly view?
 *
 * Anything else — absent, `week`, junk, a repeated key whose first value is not
 * `month` — is the weekly report, unchanged. Takes `string | string[]` because
 * Next hands a repeated key to the page as an array and the first value wins,
 * the same rule the lead book's own params follow.
 */
export function isMonthlyPeriod(raw: string | string[] | undefined): boolean {
  return firstValue(raw) === 'month';
}

function firstValue(raw: string | string[] | undefined): string | undefined {
  const first = Array.isArray(raw) ? raw[0] : raw;
  return typeof first === 'string' ? first : undefined;
}

/**
 * `?month=` → a usable `yyyy-MM`, falling back to the current month.
 *
 * Nonsense never errors and never redirects, matching how this page already
 * treats a nonsensical `from`/`to`: it renders the default window. Rejected
 * here are a wrong shape (`2026-9`, `Sep`), an impossible month (`2026-13`), a
 * month in the future, and anything older than the picker's floor — a URL the
 * picker cannot represent would strand the reader on a month its own arrows
 * could not move off.
 *
 * The round-trip re-`format` is the overflow guard `parseDateParam` documents:
 * date-fns `parse` ROLLS OVER out-of-range components, so `2026-13` comes back
 * as a valid January 2027 rather than invalid.
 */
export function parseMonthParam(raw: string | string[] | undefined, today: Date): string {
  const current = currentMonthKey(today);
  const value = firstValue(raw);
  if (!value) return current;
  const parsed = parse(value, MONTH_FORMAT, new Date());
  if (!isValid(parsed) || format(parsed, MONTH_FORMAT) !== value) return current;
  // `yyyy-MM` sorts lexically in month order, so the bounds are string compares.
  if (value > current || value < monthFloorKey(today)) return current;
  return value;
}

/** The two windows, and the words for them, for one `yyyy-MM`. */
export function monthWindow(monthKey: string, today: Date): MonthWindow {
  const start = parse(`${monthKey}-01`, DATE_FORMAT, new Date());
  const running = monthKey === currentMonthKey(today);
  // A completed month runs to its last day; the running one stops at today, so
  // the tiles count what has actually happened rather than a month with a hole
  // at the end.
  const lastDay = running ? today.getDate() : getDaysInMonth(start);

  const prevStart = subMonths(start, 1);
  // Day-count parity is the only honest month-to-date baseline: on the 9th, a
  // full-September comparison makes every October tile read as a collapse. The
  // clamp is for the one case parity cannot hold — 30 Mar has no 30 Feb.
  const prevLastDay = running
    ? Math.min(lastDay, getDaysInMonth(prevStart))
    : getDaysInMonth(prevStart);

  const range = { from: dayIn(start, 1), to: dayIn(start, lastDay) };
  const prevRange = { from: dayIn(prevStart, 1), to: dayIn(prevStart, prevLastDay) };

  return {
    monthKey,
    range,
    prevRange,
    running,
    label: monthLabel(start, running),
    comparisonLabel: running
      ? `${daySpan(start, lastDay)} vs ${daySpan(prevStart, prevLastDay)} (month to date)`
      : `${format(start, 'MMM yyyy')} vs ${format(prevStart, 'MMM yyyy')}`,
  };
}

/** The picker's options, newest first, ending on the month we are in. */
export function monthOptions(today: Date): Array<{ value: string; label: string }> {
  const current = startOfMonth(today);
  return Array.from({ length: MONTH_PICKER_MONTHS }, (_, i) => {
    const month = subMonths(current, i);
    return { value: format(month, MONTH_FORMAT), label: monthLabel(month, i === 0) };
  });
}

/**
 * The months either side, or `null` where the arrow must be disabled: there is
 * no data for a month that has not happened, and nothing the picker can show
 * below its floor.
 */
export function adjacentMonths(
  monthKey: string,
  today: Date,
): { prev: string | null; next: string | null } {
  const start = parse(`${monthKey}-01`, DATE_FORMAT, new Date());
  const prev = format(subMonths(start, 1), MONTH_FORMAT);
  const next = format(addMonths(start, 1), MONTH_FORMAT);
  return {
    prev: prev < monthFloorKey(today) ? null : prev,
    next: next > currentMonthKey(today) ? null : next,
  };
}

function monthLabel(monthStart: Date, running: boolean): string {
  const name = format(monthStart, 'MMM yyyy');
  return running ? `${name} (month to date)` : name;
}

/** `Oct 1–9`, or just `Oct 1` on the first of the month — never "Oct 1–1". */
function daySpan(monthStart: Date, lastDay: number): string {
  const month = format(monthStart, 'MMM');
  return lastDay <= 1 ? `${month} 1` : `${month} 1–${lastDay}`;
}

function dayIn(monthStart: Date, day: number): string {
  return `${format(monthStart, MONTH_FORMAT)}-${String(day).padStart(2, '0')}`;
}
