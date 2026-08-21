/**
 * Compile-time guard for values that round-trip through Next's data cache.
 *
 * WHY THIS EXISTS. `unstable_cache` persists its return value as JSON. A `Date`
 * therefore survives a cache **MISS** unchanged — the function's real return
 * value is handed straight back — but comes back as a **string** on every cache
 * **HIT**. Nothing warns you: the types still say `Date`, so a consumer happily
 * calls `.getTime()` / `formatDistanceToNow()` and throws
 * `TypeError: x.getTime is not a function` or `RangeError: Invalid time value`.
 *
 * The failure mode is maximally hostile to catch:
 *   - local dev almost always MISSES (server restarts, short TTLs) → looks fine;
 *   - production almost always HITS (one shared cache, many admins) → always broken;
 *   - it appears only *after* the TTL warms, so the deploy looks green.
 *
 * So we model it in the type system instead of trusting a comment. `JsonSafe<T>`
 * maps any `Date` to `never`, which makes an offending getter fail to satisfy the
 * `cachedJson` signature. Type errors don't fail `next build` here
 * (`typescript.ignoreBuildErrors` is on) but they DO fail the `typecheck` CI job,
 * which is the gate that matters.
 *
 * If you genuinely need a timestamp in a cached payload, return an ISO string
 * (`d.toISOString()`) and revive it at the consumer. That is explicit, and it
 * behaves identically on a hit and a miss.
 */
export type JsonSafe<T> = T extends Date
  ? never
  : T extends (infer U)[]
    ? JsonSafe<U>[]
    : T extends object
      ? { [K in keyof T]: JsonSafe<T[K]> }
      : T;
