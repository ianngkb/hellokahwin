/**
 * Pure maths for title tests: which days count as "before" and "after" a
 * Google-title change, and what the numbers say.
 *
 * No database, no React, no `server-only` — unit-tested directly; the
 * thresholds below are the whole definition of the verdict.
 */
import { expectedCtr } from './article-leaderboard';
import { daysIn, shiftDay } from './article-period';

/** The after window stops growing at this many days. */
export const TITLE_TEST_MAX_DAYS = 28;
/** No verdict before this many full reported days after the change… */
export const TITLE_TEST_MIN_DAYS = 7;
/** …or before both sides have been seen this many times on Google. */
export const TITLE_TEST_MIN_IMPRESSIONS = 300;
/** A position-adjusted click-rate change this large (either way) is a result. */
export const TITLE_TEST_LIFT = 0.2;

/**
 * Search Console dates its days in US Pacific time, so the change is placed on
 * Google's calendar, not ours. A change at 02:14 on 13 Nov in Malaysia is
 * 10:14 on 12 Nov in California: Google's 12 Nov is half old title, half new.
 */
export function googleDay(at: Date): string {
  // en-CA formats as yyyy-MM-dd.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

export interface TitleTestWindows {
  /** Google's day the title changed on — mixed, so in neither window. */
  changeDay: string;
  /** Full reported days after the change (0 = none yet). */
  days: number;
  after: { from: string; to: string } | null;
  before: { from: string; to: string } | null;
}

/**
 * After = every full day after the change that Google has reported, up to
 * TITLE_TEST_MAX_DAYS (and not past the day an ended test stopped). Before =
 * the same number of days immediately before the change day.
 */
export function titleTestWindows(
  startedAt: Date,
  endedAt: Date | null,
  dailyThrough: string | null,
): TitleTestWindows {
  const changeDay = googleDay(startedAt);
  const from = shiftDay(changeDay, 1);
  let to = shiftDay(changeDay, TITLE_TEST_MAX_DAYS);
  if (dailyThrough && dailyThrough < to) to = dailyThrough;
  if (endedAt) {
    // The end day is mixed too.
    const lastFull = shiftDay(googleDay(endedAt), -1);
    if (lastFull < to) to = lastFull;
  }
  if (!dailyThrough || to < from) return { changeDay, days: 0, after: null, before: null };
  const days = daysIn({ from, to });
  return {
    changeDay,
    days,
    after: { from, to },
    before: { from: shiftDay(changeDay, -days), to: shiftDay(changeDay, -1) },
  };
}

export interface GoogleSide {
  clicks: number;
  impressions: number;
  /** position × impressions, summed over days. */
  positionSum: number;
}

export interface SideStats extends GoogleSide {
  ctr: number | null;
  position: number | null;
  /** Click rate ÷ the rate that position usually earns (1 = par). */
  score: number | null;
}

export function sideStats(s: GoogleSide): SideStats {
  if (s.impressions <= 0) return { ...s, ctr: null, position: null, score: null };
  const ctr = s.clicks / s.impressions;
  const position = s.positionSum / s.impressions;
  return { ...s, ctr, position, score: ctr / expectedCtr(position) };
}

export type TitleTestVerdict =
  | { kind: 'waiting'; reason: string }
  | { kind: 'winning' | 'losing' | 'flat'; lift: number; text: string };

export function titleTestVerdict(
  days: number,
  before: SideStats,
  after: SideStats,
): TitleTestVerdict {
  if (days < TITLE_TEST_MIN_DAYS) {
    return {
      kind: 'waiting',
      reason:
        days === 0
          ? 'Google has not reported a full day since the change yet.'
          : `Only ${days} full day${days === 1 ? '' : 's'} of Google data since the change; a verdict needs ${TITLE_TEST_MIN_DAYS}.`,
    };
  }
  if (
    before.impressions < TITLE_TEST_MIN_IMPRESSIONS ||
    after.impressions < TITLE_TEST_MIN_IMPRESSIONS
  ) {
    return {
      kind: 'waiting',
      reason: `Too few Google views to judge yet (each side needs ${TITLE_TEST_MIN_IMPRESSIONS}).`,
    };
  }
  const b = before.score ?? 0;
  const a = after.score ?? 0;
  // No clicks at all before: any clicks after is a clear win.
  const lift = b === 0 ? (a > 0 ? 1 : 0) : a / b - 1;
  const pct = `${Math.round(Math.abs(lift) * 100)}%`;
  if (lift >= TITLE_TEST_LIFT) {
    return {
      kind: 'winning',
      lift,
      text: `New title is winning: about ${pct} more clicks than its Google position would usually get, compared with the old title.`,
    };
  }
  if (lift <= -TITLE_TEST_LIFT) {
    return {
      kind: 'losing',
      lift,
      text: `Old title was better: the new one gets about ${pct} fewer clicks for its Google position.`,
    };
  }
  return {
    kind: 'flat',
    lift,
    text: 'No clear difference yet: both titles get about the same clicks for their Google position.',
  };
}
