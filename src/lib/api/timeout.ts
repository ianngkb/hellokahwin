// Hard client-side deadline wrapper for awaited promises.
//
// Why we need this in addition to postgres-js's own `connect_timeout` /
// `statement_timeout` (set in src/lib/db/drizzle.ts): the 2026-05-03 prod
// log slice showed `/api/v1/analytics/collect` and `/api/v1/banners/track`
// running the full 300s Vercel function timeout despite the 8s drizzle
// settings. The most likely failure mode is a TCP write blackhole on a
// borrowed connection — kernel never returns an error, postgres-js never
// sees a fault, and `connect_timeout` doesn't apply (the connection was
// already borrowed). This helper wraps the await in `Promise.race` against
// `setTimeout`, so the deadline is enforced regardless of what the
// underlying client does.
//
// Edge-runtime safe: uses only `setTimeout` / `clearTimeout`. No Node
// APIs, no AbortController plumbing into the wrapped promise (the
// underlying postgres-js call won't be cancelled — it just becomes
// orphaned and the function returns its 5xx response).

export class DeadlineExceededError extends Error {
  readonly label: string;
  readonly timeoutMs: number;
  constructor(label: string, timeoutMs: number) {
    super(`deadline_exceeded:${label}`);
    this.name = 'DeadlineExceededError';
    this.label = label;
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Starts a shared deadline budget and returns a function giving the time left.
 *
 * Use this when ONE render issues several sequential DB reads. Giving each read
 * its own `withDeadline(q, 3000)` bounds each query but NOT the page: five
 * sequential reads then permit 5×3s = 15s, which largely defeats the point.
 * Threading `budgetLeft()` through them bounds the whole unit of work instead.
 *
 *   const budgetLeft = startDeadlineBudget(6000);
 *   const a = await withDeadline(getA(), budgetLeft(), 'a');
 *   const b = await withDeadline(getB(), budgetLeft(), 'b'); // 6000 minus a's elapsed
 *
 * Floors at `minMs` (default 250ms) so a late read still gets a real attempt
 * rather than an already-expired 0ms deadline that rejects before the query
 * could ever have answered.
 */
export function startDeadlineBudget(totalMs: number, minMs = 250): () => number {
  const startedAt = Date.now();
  return () => Math.max(minMs, totalMs - (Date.now() - startedAt));
}

export function withDeadline<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new DeadlineExceededError(label, ms)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== null) clearTimeout(timer);
  });
}
