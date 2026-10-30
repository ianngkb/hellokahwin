/**
 * Runs an ordered tuple of async thunks in fixed-size batches, preserving
 * order in the returned tuple. Caps peak concurrency at `size` without
 * changing the shape of the result vs a single `Promise.all`.
 */
export async function runBatched<T extends readonly (() => Promise<unknown>)[]>(
  thunks: T,
  size: number,
): Promise<{ -readonly [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  // `i += size` never advances for 0, a negative or NaN — an infinite loop.
  if (!(size >= 1)) throw new RangeError('size must be >= 1');
  const out: unknown[] = [];
  for (let i = 0; i < thunks.length; i += size) {
    const chunk = thunks.slice(i, i + size) as Array<() => Promise<unknown>>;
    out.push(...(await Promise.all(chunk.map((run) => run()))));
  }
  return out as { -readonly [K in keyof T]: Awaited<ReturnType<T[K]>> };
}
