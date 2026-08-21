import { formatDistance } from 'date-fns';

/**
 * Canonical date formatting for the admin + vendor console.
 *
 * House format is `Jul 31 '26` — month-name based, so it reads unambiguously
 * to both UK (dd/mm) and US (mm/dd) readers.
 *
 * Everything is pinned to `Asia/Kuala_Lumpur`. Without the pin, a date rendered
 * in a Server Component follows the *server's* clock (UTC on Vercel), which
 * shows the wrong calendar day for any timestamp after 16:00 UTC.
 *
 * These helpers never throw and never emit `Invalid Date` — bad input renders
 * an em-dash so a single malformed row can't blow up a table.
 */

const TIME_ZONE = 'Asia/Kuala_Lumpur';

/** Rendered for null, undefined, empty, or unparseable input. */
export const EMPTY_DATE = '—';

export type DateInput = Date | string | number | null | undefined;

/** A Postgres `date` column arrives as a plain `YYYY-MM-DD` string. */
const CALENDAR_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type Resolved = { date: Date; timeZone: string };

/**
 * Normalise input to a Date plus the zone it should be read in.
 *
 * A bare `YYYY-MM-DD` is a *calendar* date, not an instant — it has no time or
 * zone of its own. We anchor it at UTC midnight and read it back in UTC so the
 * calendar day can never shift, whatever the display zone is.
 */
function resolve(value: DateInput): Resolved | null {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'string' && CALENDAR_DATE_RE.test(value)) {
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? null : { date, timeZone: 'UTC' };
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : { date, timeZone: TIME_ZONE };
}

function partsOf(
  { date, timeZone }: Resolved,
  options: Intl.DateTimeFormatOptions,
): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat('en-GB', { timeZone, ...options }).formatToParts(
    date,
  )) {
    parts[part.type] = part.value;
  }
  return parts;
}

/** `Jul 31 '26` — the house format for any date cell. */
export function formatDate(value: DateInput): string {
  const resolved = resolve(value);
  if (!resolved) return EMPTY_DATE;

  const p = partsOf(resolved, { day: '2-digit', month: 'short', year: '2-digit' });
  return `${p.month} ${p.day} '${p.year}`;
}

/**
 * `Fri, Jul 31 '26` — the house format with the day of week in front.
 *
 * For wedding dates and scheduling views, where Saturday-vs-Tuesday is real
 * information rather than decoration. Use `formatDate` everywhere else.
 */
export function formatDateWithWeekday(value: DateInput): string {
  const resolved = resolve(value);
  if (!resolved) return EMPTY_DATE;

  const p = partsOf(resolved, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
  return `${p.weekday}, ${p.month} ${p.day} '${p.year}`;
}

/** `Jul 31 '26, 14:32` — for cells that need the time of day. */
export function formatDateTime(value: DateInput): string {
  const resolved = resolve(value);
  if (!resolved) return EMPTY_DATE;

  const p = partsOf(resolved, {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return `${p.month} ${p.day} '${p.year}, ${p.hour}:${p.minute}`;
}

/** `31 July 2026, 14:32` — long form, for tooltips and detail headers. */
export function formatDateFull(value: DateInput): string {
  const resolved = resolve(value);
  if (!resolved) return EMPTY_DATE;

  const p = partsOf(resolved, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return `${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute}`;
}

/**
 * A short date for display plus a long date and relative age for a `title`
 * tooltip — e.g. `Jul 31 '26` hovering to `31 July 2026, 14:32 · 2 days ago`.
 *
 * The design system has no Tooltip component, so callers hang `title` on the
 * cell. That costs no client JS and works from a Server Component.
 *
 * ⚠️ This is the ONLY non-pure export here: the relative half depends on the
 * current time. Pass `now` to make it deterministic. Do not call it from a
 * cached (`unstable_cache` / `use cache`) render without pinning `now`, or the
 * "2 days ago" fragment will be frozen at cache-fill time.
 */
export function formatDateWithRelative(
  value: DateInput,
  now: Date = new Date(),
): {
  display: string;
  title: string | undefined;
} {
  const resolved = resolve(value);
  if (!resolved) return { display: EMPTY_DATE, title: undefined };

  return {
    display: formatDate(value),
    title: `${formatDateFull(value)} · ${formatDistance(resolved.date, now, { addSuffix: true })}`,
  };
}
