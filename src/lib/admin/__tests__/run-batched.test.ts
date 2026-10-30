// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { runBatched } from '../run-batched';

describe('runBatched', () => {
  it('preserves order and caps concurrency at the batch size', async () => {
    let inFlight = 0;
    let peak = 0;
    const thunk = (value: number) => async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return value;
    };
    const out = await runBatched([thunk(1), thunk(2), thunk(3), thunk(4), thunk(5)] as const, 2);
    expect(out).toEqual([1, 2, 3, 4, 5]);
    expect(peak).toBe(2);
  });
});
