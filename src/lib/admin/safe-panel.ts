import { withDeadline } from '@/lib/api/timeout';

// No Sentry in HelloKahwin — degrade the tripwire to console warnings.
const Sentry = {
  captureException: (err: unknown, ctx?: unknown) => console.error('[safe-panel]', err, ctx),
  captureMessage: (msg: string, ctx?: unknown) => console.warn('[safe-panel]', msg, ctx),
};
import { isTransientDbError } from '@/lib/db/errors';

/**
 * Hardened data fetch for a single admin-dashboard "panel" (one aggregation in
 * a fan-out). Three defenses, so no one slow query can take down a whole page —
 * the recurring site-analytics failure mode ([[site-analytics-fanout-timeout]]):
 *
 *   1. **Fail fast** — `withDeadline` rejects at `deadlineMs` (default 6s, under
 *      the 8s role-level `statement_timeout`) so a wedged query stops being
 *      awaited before it rides all the way to the DB cancel + Promise.all reject.
 *   2. **Tripwire** — if the fetch takes longer than `slowMs` (default 4s, half
 *      the DB cap) it emits a Sentry warning + `[analytics-slow]` log while there
 *      is still margin, so a query trending toward the cliff is visible BEFORE it
 *      becomes an outage. This is the early-warning we lacked.
 *   3. **Degrade** — a *transient* failure (statement-timeout / pooler blip, per
 *      `isTransientDbError`) resolves to `fallback` so that panel renders empty
 *      instead of 500-ing the page. Non-transient errors (real bugs, and the
 *      `notFound()` / `redirect()` control-flow signals) re-throw unchanged so
 *      they still surface.
 *
 * Compose it inside `Promise.all` / `runBatched` fan-outs:
 *   () => safePanel('trafficCounts', () => getCachedTrafficCounts(range), EMPTY)
 */
const DEFAULT_DEADLINE_MS = 6_000;
const DEFAULT_SLOW_MS = 4_000;

export async function safePanel<T>(
  label: string,
  run: () => Promise<T>,
  fallback: T,
  opts?: { deadlineMs?: number; slowMs?: number },
): Promise<T> {
  const deadlineMs = opts?.deadlineMs ?? DEFAULT_DEADLINE_MS;
  const slowMs = opts?.slowMs ?? DEFAULT_SLOW_MS;
  const t0 = Date.now();

  try {
    const result = await withDeadline(run(), deadlineMs, `panel:${label}`);
    const ms = Date.now() - t0;
    if (ms >= slowMs) {
      console.warn(
        `[analytics-slow] ${label} ${ms}ms (slow>=${slowMs}ms, deadline=${deadlineMs}ms)`,
      );
      Sentry.captureMessage(`Slow admin analytics panel: ${label} (${ms}ms)`, {
        level: 'warning',
        tags: { area: 'admin-analytics', panel: label },
        extra: { ms, slowMs, deadlineMs },
      });
    }
    return result;
  } catch (err) {
    const ms = Date.now() - t0;
    if (isTransientDbError(err)) {
      console.error(`[analytics-degrade] ${label} failed after ${ms}ms; serving empty panel:`, err);
      Sentry.captureMessage(`Degraded admin analytics panel: ${label}`, {
        level: 'warning',
        tags: { area: 'admin-analytics', panel: label },
        extra: { ms },
      });
      return fallback;
    }
    // Real bug or Next.js control-flow (notFound/redirect) — must surface.
    throw err;
  }
}
