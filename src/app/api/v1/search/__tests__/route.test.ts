import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const searchArticles = vi.fn();
vi.mock('@/lib/search/article-search', () => ({
  searchArticles: (...args: unknown[]) => searchArticles(...args),
}));

const { GET } = await import('../route');

function get(qs: string) {
  return GET(new NextRequest(`http://localhost/api/v1/search?${qs}`));
}

const ok = { query: 'hantaran', articles: [], total: 0, mode: 'exact', suggestion: null };

describe('GET /api/v1/search', () => {
  beforeEach(() => {
    searchArticles.mockReset();
    searchArticles.mockResolvedValue(ok);
  });

  it('returns { data: SearchResponse } with the public cache header', async () => {
    const res = await get('q=hantaran');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: ok });
    expect(res.headers.get('Cache-Control')).toBe(
      'public, s-maxage=60, stale-while-revalidate=300',
    );
    expect(searchArticles).toHaveBeenCalledWith('hantaran', { limit: 6, offset: 0 });
  });

  it('clamps limit to 1..20 and offset to ≥0, and tolerates type', async () => {
    await get('q=hantaran&limit=100&offset=-5&type=articles');
    expect(searchArticles).toHaveBeenLastCalledWith('hantaran', { limit: 20, offset: 0 });
    await get('q=hantaran&limit=abc&offset=40');
    expect(searchArticles).toHaveBeenLastCalledWith('hantaran', { limit: 6, offset: 40 });
  });

  it('answers a query under two characters with mode none, without searching', async () => {
    const res = await get('q=%20a%20');
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({
      query: 'a',
      articles: [],
      total: 0,
      mode: 'none',
      suggestion: null,
    });
    expect(searchArticles).not.toHaveBeenCalled();
  });

  it('caps the query at 100 characters', async () => {
    await get(`q=${'a'.repeat(150)}`);
    expect(searchArticles.mock.calls[0]![0]).toHaveLength(100);
  });

  it('returns 500, not an empty 200, when the search fails (DES-06 F1)', async () => {
    searchArticles.mockRejectedValue(new Error('db down'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await get('q=hantaran');
    expect(res.status).toBe(500);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).not.toHaveProperty('data');
    spy.mockRestore();
  });
});
