import { differenceInCalendarDays, format, isAfter, isValid, parse, subDays } from 'date-fns';

/**
 * Shared KL-calendar date handling for admin dashboards. Ported verbatim from
 * The Wedding Notebook.
 *
 * An admin reporting page (today: `site-analytics`) reads a `?from`/`?to` pair
 * of `yyyy-MM-dd` strings and treats them as **Asia/Kuala_Lumpur calendar
 * days**, not UTC days — the business reads its numbers in KL time.
 */

/** The wire format for `?from`/`?to` params, and the shape `DateRange` carries. */
const DATE_FORMAT = 'yyyy-MM-dd';

export interface DateRange {
  from: string; // yyyy-MM-dd
  to: string; // yyyy-MM-dd
}

/** Current date in Asia/Kuala_Lumpur timezone */
export function getKLToday(): Date {
  const klDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
  return parse(klDateStr, DATE_FORMAT, new Date());
}

/**
 * A `?from`/`?to` param → Date, falling back on anything not exactly `yyyy-MM-dd`.
 *
 * The round-trip re-`format` is the overflow guard. date-fns `parse` ROLLS OVER
 * out-of-range components rather than rejecting them, so `2026-13-45` does not
 * come back invalid — it silently becomes a real date in early 2027, and
 * `isValid` happily waves it through. The page then renders a window the user
 * never asked for, labelled with dates that do not match the querystring.
 * Formatting the result back with the same mask and demanding it equal the input
 * catches exactly that: a well-formed real date is its own round-trip and is
 * completely unaffected, while any rolled-over or loosely-shaped input (`2026-7-1`,
 * `2026-02-30`) fails the comparison and takes the fallback.
 *
 * A repeated key (`?from=a&from=b`) reaches a page's `searchParams` as an ARRAY,
 * which date-fns `parse` throws on — erroring the whole page. Anything that is
 * not a single string takes the fallback too.
 */
export function parseDateParam(value: string | string[] | undefined, fallback: Date): Date {
  if (typeof value !== 'string' || !value) return fallback;
  const parsed = parse(value, DATE_FORMAT, new Date());
  if (!isValid(parsed)) return fallback;
  return format(parsed, DATE_FORMAT) === value ? parsed : fallback;
}

/**
 * Compute the previous period of equal length for comparison.
 *
 * The `Z` suffixes are load-bearing. These are date-only strings doing date-only
 * arithmetic, so both ends must agree on a zone. Without `Z`, `new Date(…)`
 * parses at LOCAL midnight while `toISOString()` formats in UTC — on any
 * positive offset (e.g. UTC+8, where this app is developed) every returned date
 * came back one day early, so `prev.to` sat TWO days before `from` and a full
 * day of data fell into the gap, counted in neither window. Anchoring both to
 * UTC makes the result host-independent; on a UTC host (Vercel and CI) this is
 * a strict no-op, which is why site-analytics never surfaced the bug.
 */
export function getPreviousPeriod(from: string, to: string): DateRange {
  const fromDate = new Date(from + 'T00:00:00Z');
  const toDate = new Date(to + 'T00:00:00Z');
  const diffMs = toDate.getTime() - fromDate.getTime();
  const prevTo = new Date(fromDate.getTime() - 24 * 60 * 60 * 1000);
  const prevFrom = new Date(prevTo.getTime() - diffMs);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(prevFrom), to: fmt(prevTo) };
}

/**
 * Turns an inclusive KL calendar-day range into a **half-open** `[start,
 * endExclusive)` pair of exact UTC instants.
 *
 * Why a hardcoded `+08:00` is correct: Malaysia observes UTC+8 year-round and
 * has **no DST**, so a KL calendar day always maps to the same fixed UTC
 * instant. There is no zone-rule lookup to get wrong, and no ambiguous or
 * skipped local midnight to handle.
 *
 * Why half-open: `to` is an *inclusive* calendar day, so the boundary is
 * midnight at the start of the day *after* `to`. That captures every row
 * stamped during `to` — including `23:59:59.999` — without an off-by-one and
 * without the `<= end-of-day` fractional-second traps.
 *
 * **Callers must compare the bare timestamp column against these bounds** —
 * `created_at >= $start AND created_at < $endExclusive`. Do NOT write
 * `created_at AT TIME ZONE 'Asia/Kuala_Lumpur' >= …`: wrapping the column in a
 * function makes it a non-sargable expression, so Postgres cannot use the
 * plain b-tree index on that column (e.g. `idx_analytics_events_created_at`) and falls
 * back to a full scan. On these admin pages that is exactly the drift that
 * crosses the 8s role-level `statement_timeout` and 500s the page. Shifting the
 * *bounds* into UTC instead of the *column* into KL keeps the index usable.
 *
 * ⚠️ **ISO STRINGS, NOT `Date`s — the return type is load-bearing.** These
 * values exist to be bound into raw Drizzle `sql` templates, and a `Date` bound
 * that way throws at bind time:
 * `The "string" argument must be of type string … Received an instance of Date`
 * (`ERR_INVALID_ARG_TYPE`). `drizzle-orm/postgres-js/driver.js` overwrites
 * postgres-js's serialisers for every date/timestamp OID (1184/1082/1083/1114
 * and more, plus 114/3802 for json/jsonb — so a raw object has the same
 * problem) with an identity function, so Drizzle's column mappers own formatting.
 * The query BUILDER is therefore fine — it maps `Date` → string before binding —
 * but a raw `sql` template carries no column type info, so the `Date` sails
 * through the identity serialiser into postgres-js's `Bind`, which calls
 * `str()` on it and throws. That took an admin report down in The Wedding
 * Notebook on 2026-08-02.
 *
 * A cast in the SQL text does NOT save you — `sql\`… ${aDate}::timestamptz\``
 * fails identically, because the throw happens client-side before the server
 * ever sees the cast. A string, by contrast, binds as type-unspecified and
 * Postgres resolves it from context (`created_at >= $1` → `timestamptz`).
 * Do not "simplify" this back to returning `Date`s.
 */
export function toUtcRange(range: { from: string; to: string }): {
  start: string;
  endExclusive: string;
} {
  const start = new Date(`${range.from}T00:00:00+08:00`);
  // The day after `to`, computed on the KL calendar: take KL midnight of `to`,
  // add exactly 24h. Safe as fixed arithmetic precisely because there is no DST.
  const toStart = new Date(`${range.to}T00:00:00+08:00`);
  const endExclusive = new Date(toStart.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), endExclusive: endExclusive.toISOString() };
}

/**
 * The longest range one admin report view may span. With no rollups every
 * site-analytics panel scans raw `analytics_events` over the range, so this is
 * what bounds the cost of a query.
 */
export const MAX_RANGE_DAYS = 366;

/** Default window: the last 30 KL days, today included. */
const DEFAULT_RANGE_DAYS = 30;

/**
 * The `?from`/`?to` params → the range a report actually shows, as KL
 * `yyyy-MM-dd` days. Every clamp lives here so it is testable:
 *
 *   - a malformed or rolled-over param falls back (see `parseDateParam`);
 *   - a future `to` clamps to today;
 *   - `from` after `to` resets to the default last-30-days window;
 *   - a span over MAX_RANGE_DAYS keeps `to` and pulls `from` forward.
 */
export function resolveRange(
  params: { from?: string | string[]; to?: string | string[] },
  today: Date,
): DateRange {
  const defaultFrom = subDays(today, DEFAULT_RANGE_DAYS - 1);
  let from = parseDateParam(params.from, defaultFrom);
  let to = parseDateParam(params.to, today);
  if (isAfter(to, today)) to = today;
  if (isAfter(from, to)) {
    from = defaultFrom;
    to = today;
  }
  if (differenceInCalendarDays(to, from) + 1 > MAX_RANGE_DAYS) {
    from = subDays(to, MAX_RANGE_DAYS - 1);
  }
  return { from: format(from, DATE_FORMAT), to: format(to, DATE_FORMAT) };
}

/**
 * True when `from..to` is a valid, ordered range of at most MAX_RANGE_DAYS
 * whole KL days. For callers that must REJECT rather than clamp (server
 * actions, which have no URL to correct).
 */
export function isBoundedRange(from: string, to: string): boolean {
  const invalid = new Date(Number.NaN);
  const f = parseDateParam(from, invalid);
  const t = parseDateParam(to, invalid);
  if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime())) return false;
  if (isAfter(f, t)) return false;
  return differenceInCalendarDays(t, f) + 1 <= MAX_RANGE_DAYS;
}
