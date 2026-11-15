import { describe, it, expect, vi } from 'vitest';
import { countOrNull, estimateTotalFromPage } from '../paging';

/**
 * The fallback total the media library shows when the exact count times out.
 * The property that matters is not accuracy — it is that paging never strands
 * the admin before the real end of the list, and never offers a page that is
 * not there. Ported from The Wedding Notebook.
 */
describe('estimateTotalFromPage', () => {
  const PAGE = 48;

  it('claims one more than seen on a full page, so Next stays enabled', () => {
    expect(estimateTotalFromPage(0, 48, PAGE)).toBe(49);
    expect(Math.ceil(estimateTotalFromPage(0, 48, PAGE) / PAGE)).toBe(2);
  });

  it('is exact on a partial page, which is the end of the list', () => {
    expect(estimateTotalFromPage(96, 12, PAGE)).toBe(108);
    expect(Math.ceil(estimateTotalFromPage(96, 12, PAGE) / PAGE)).toBe(3);
  });

  it('is exact on an empty page', () => {
    expect(estimateTotalFromPage(0, 0, PAGE)).toBe(0);
    expect(estimateTotalFromPage(144, 0, PAGE)).toBe(144);
  });

  it('never strands the admin before the real end', () => {
    // Walk a 200-item list with the count failing on every page. The estimate
    // must keep "there is a next page" true until the last partial page.
    const REAL = 200;
    let page = 1;
    for (let guard = 0; guard < 50; guard++) {
      const offset = (page - 1) * PAGE;
      const rows = Math.max(0, Math.min(PAGE, REAL - offset));
      const totalPages = Math.ceil(estimateTotalFromPage(offset, rows, PAGE) / PAGE);
      if (page >= totalPages) break;
      page++;
    }
    // 200 items / 48 = 5 pages (48,48,48,48,8). We must reach page 5, not stop early.
    expect(page).toBe(5);
    const lastOffset = 4 * PAGE;
    expect(estimateTotalFromPage(lastOffset, REAL - lastOffset, PAGE)).toBe(REAL);
  });

  it('is what `??` must guard, because a real 0 is falsy', () => {
    const realCount: number | null = 0;
    expect(realCount ?? estimateTotalFromPage(0, 0, PAGE)).toBe(0);
    const failed: number | null = null;
    expect(failed ?? estimateTotalFromPage(0, 48, PAGE)).toBe(49);
  });
});

describe('countOrNull', () => {
  it('passes a real count through — including an honest 0', async () => {
    expect(await countOrNull(async () => 1234)).toBe(1234);
    expect(await countOrNull(async () => 0)).toBe(0);
  });

  it('turns a rejected count (a statement timeout) into null, and logs it', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await countOrNull(async () => {
      throw new Error('canceling statement due to statement timeout');
    });
    expect(result).toBeNull();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('also catches a count that throws synchronously', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await countOrNull(() => {
      throw new Error('boom');
    });
    expect(result).toBeNull();
    spy.mockRestore();
  });
});
