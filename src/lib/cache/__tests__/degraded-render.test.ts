import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readForCacheablePage, RenderDataUnavailableError } from '../degraded-render';
import { DeadlineExceededError } from '@/lib/api/timeout';

/**
 * PLAT-16.
 *
 * The paired assertion these tests exist to hold: the SAME helper must let a
 * genuinely empty result through untouched and refuse to let a FAILED read
 * become a rendered page. Those two cases produced identical UI before this
 * change, which is the whole defect — a check that only ever proves one of
 * them proves nothing about the other.
 */
describe('readForCacheablePage', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('passes a resolved value straight through', async () => {
    await expect(
      readForCacheablePage(Promise.resolve({ clusters: [1] }), 1_000, 'x'),
    ).resolves.toEqual({
      clusters: [1],
    });
  });

  it('passes a GENUINELY EMPTY result through — empty is not failure', async () => {
    const empty = { clusters: [], unclustered: [], totalArticles: 0 };
    await expect(readForCacheablePage(Promise.resolve(empty), 1_000, 'x')).resolves.toEqual(empty);
  });

  it('throws RenderDataUnavailableError when the read rejects', async () => {
    const cause = new Error('connection terminated');
    await expect(
      readForCacheablePage(Promise.reject(cause), 1_000, 'inspire-pillar:hantaran-mas-kahwin'),
    ).rejects.toBeInstanceOf(RenderDataUnavailableError);
  });

  it('throws when the read blows its deadline, and keeps the deadline error as the cause', async () => {
    const never = new Promise<never>(() => {});
    const promise = readForCacheablePage(never, 20, 'inspire-pillar:hantaran-mas-kahwin');
    await expect(promise).rejects.toMatchObject({
      name: 'RenderDataUnavailableError',
      label: 'inspire-pillar:hantaran-mas-kahwin',
      message: 'render_data_unavailable:inspire-pillar:hantaran-mas-kahwin',
    });
    await promise.catch((err: RenderDataUnavailableError) => {
      expect(err.cause).toBeInstanceOf(DeadlineExceededError);
    });
  });

  it('logs exactly once, at the helper, not at the call site', async () => {
    const spy = vi.spyOn(console, 'error');
    await readForCacheablePage(Promise.reject(new Error('boom')), 1_000, 'label-a').catch(() => {});
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).toContain('[label-a]');
    expect(String(spy.mock.calls[0][0])).toContain('failing the render');
  });
});
