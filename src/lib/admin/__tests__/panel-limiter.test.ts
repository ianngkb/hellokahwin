import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@sentry/nextjs', () => ({ captureMessage: vi.fn(), captureException: vi.fn() }));

const { createPanelLimiter } = await import('../panel-limiter');

/** A read that settles only when told to. */
function pending<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('createPanelLimiter', () => {
  // I-F13: with runBatched + safePanel the second batch started at the 6 s
  // deadline while batch 1's statements were still running → 5 in flight.
  it('I-F13: a timed-out read keeps its slot until it really settles', async () => {
    const reads = Array.from({ length: 5 }, () => pending<string>());
    const started: number[] = [];
    const panel = createPanelLimiter(3);
    const all = Promise.all(
      reads.map((r, i) =>
        panel(
          `p${i}`,
          () => {
            started.push(i);
            return r.promise;
          },
          'fallback',
        ),
      ),
    );
    await flush();
    expect(started).toEqual([0, 1, 2]);

    // Past safePanel's 6 s deadline: panels 0-2 give up (fallback) …
    await vi.advanceTimersByTimeAsync(6_100);
    // … but their statements are still running, so nothing else may start.
    expect(started).toEqual([0, 1, 2]);

    // Panels 3-4 waited in the queue past the same deadline, so they gave up
    // too (2026-11-12) and never start, even once the stalled slots free.
    const out = await all;
    expect(out).toEqual(['fallback', 'fallback', 'fallback', 'fallback', 'fallback']);
    reads[0].reject(new Error('canceling statement due to statement timeout'));
    reads[1].resolve('late');
    reads[2].resolve('late');
    await flush();
    expect(started).toEqual([0, 1, 2]);
  });

  it('never has more than `limit` reads in flight and returns results in call order', async () => {
    let inFlight = 0;
    let peak = 0;
    const panel = createPanelLimiter(2);
    const all = Promise.all(
      [30, 10, 20, 5, 15].map((ms, i) =>
        panel(
          `p${i}`,
          async () => {
            inFlight++;
            peak = Math.max(peak, inFlight);
            await new Promise((r) => setTimeout(r, ms));
            inFlight--;
            return i;
          },
          -1,
        ),
      ),
    );
    await vi.advanceTimersByTimeAsync(200);
    expect(await all).toEqual([0, 1, 2, 3, 4]);
    expect(peak).toBe(2);
  });

  it('a read that throws synchronously frees its slot and surfaces (non-transient)', async () => {
    const panel = createPanelLimiter(1);
    await expect(
      panel(
        'boom',
        () => {
          throw new Error('bug');
        },
        null,
      ),
    ).rejects.toThrow('bug');
    expect(await panel('next', async () => 'ok', null)).toBe('ok');
  });

  // 2026-11-12: a stalled DB connection held every slot, and the panels queued
  // behind them waited for a slot forever — the Compare tab hung to Vercel's 60 s.
  it('a queued panel still gives up at its deadline and never starts its read', async () => {
    const stalled = Array.from({ length: 3 }, () => pending<string>());
    const late = vi.fn(() => Promise.resolve('late'));
    const panel = createPanelLimiter(3);
    const results = Promise.all([
      ...stalled.map((r, i) => panel(`p${i}`, () => r.promise, 'fallback')),
      panel('queued', late, 'fallback'),
    ]);
    await flush();
    await vi.advanceTimersByTimeAsync(6_000);
    await flush();
    expect(await results).toEqual(['fallback', 'fallback', 'fallback', 'fallback']);
    // The stalled reads settle later: the queued read must not run after all.
    stalled.forEach((r) => r.resolve('x'));
    await flush();
    expect(late).not.toHaveBeenCalled();
  });
});
