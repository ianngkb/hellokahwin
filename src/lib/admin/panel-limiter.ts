import { safePanel } from './safe-panel';

/**
 * `safePanel` reads with a TRUE concurrency cap: at most `limit` underlying
 * reads in flight, counted until each read actually SETTLES — not until its
 * panel gives up.
 *
 * WHY NOT `runBatched(…, n)` + `safePanel` (integration review I-F13). A batch
 * finishes when every `safePanel` in it resolves, and `safePanel` resolves to
 * its fallback at the 6 s deadline while the statement itself keeps running on
 * the database (nothing cancels it; the 8 s role `statement_timeout` does,
 * later). The next batch then starts on top of it, so a page that meant "three
 * statements at a time" can briefly hold five or six — exactly the pool storm
 * the cap exists to prevent. Here a slot is released only when the read's own
 * promise settles, so a timed-out statement keeps its slot until the database
 * is really done with it; the panel still shows "couldn't load" at 6 s.
 *
 * Usage — every call shares the limiter's slots; start them all at once:
 *   const panel = createPanelLimiter(3);
 *   const [a, b, c, d] = await Promise.all([
 *     panel('x:a', () => getA(), null), …
 *   ]);
 * Reads start in call order (FIFO).
 */
export function createPanelLimiter(limit: number) {
  const size = Math.max(1, Math.trunc(limit) || 1);
  let inFlight = 0;
  const waiting: Array<() => void> = [];

  const acquire = (): Promise<void> => {
    if (inFlight < size) {
      inFlight++;
      return Promise.resolve();
    }
    return new Promise((resolve) => waiting.push(resolve));
  };
  const release = (): void => {
    const next = waiting.shift();
    // The slot passes straight to the next waiting read, or is given back.
    if (next) next();
    else inFlight--;
  };

  return async function limitedPanel<T>(
    label: string,
    read: () => Promise<T>,
    fallback: T,
    opts?: Parameters<typeof safePanel>[3],
  ): Promise<T> {
    // The deadline covers the wait for a slot too (2026-11-12): when the reads
    // ahead stall, a queued panel must still give up at its deadline instead of
    // waiting for a slot that frees only when the database answers. A panel
    // that gave up while queued never starts its read.
    let gaveUp = false;
    const run = async (): Promise<T> => {
      await acquire();
      if (gaveUp) {
        release();
        return fallback;
      }
      let underlying: Promise<T>;
      try {
        underlying = read();
      } catch (err) {
        release();
        throw err;
      }
      // Released when the READ settles, however long after the deadline.
      underlying.then(release, release);
      return underlying;
    };
    try {
      return await safePanel(label, run, fallback, opts);
    } finally {
      gaveUp = true;
    }
  };
}
