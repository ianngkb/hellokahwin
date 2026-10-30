// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const auth = vi.hoisted(() => ({
  result: { error: null, user: { id: 'u' } } as { error: string | null; user: unknown },
}));

vi.mock('@/lib/auth/admin', () => ({
  requireAdminSectionAction: vi.fn(async () => auth.result),
}));
vi.mock('../queries', () => ({
  searchPages: vi.fn(async () => ['/artikel']),
}));
vi.mock('@/lib/analytics/resolve-page-titles', () => ({
  resolvePageTitles: vi.fn(async () => new Map([['/artikel', 'Semua Artikel']])),
}));

const { searchPagesAction } = await import('../actions');
const { searchPages } = await import('../queries');

beforeEach(() => {
  vi.clearAllMocks();
  auth.result = { error: null, user: { id: 'u' } };
});

describe('searchPagesAction', () => {
  it('returns results for an admin with a valid range', async () => {
    expect(await searchPagesAction('artikel', '2026-10-01', '2026-10-30', 'human')).toEqual([
      { pathname: '/artikel', title: 'Semua Artikel' },
    ]);
  });

  it('returns [] and never queries when auth fails', async () => {
    auth.result = { error: 'Unauthorized', user: null };
    expect(await searchPagesAction('artikel', '2026-10-01', '2026-10-30', 'human')).toEqual([]);
    expect(searchPages).not.toHaveBeenCalled();
  });

  it('returns [] for a malformed date', async () => {
    expect(await searchPagesAction('artikel', '2026-13-45', '2026-10-30', 'human')).toEqual([]);
    expect(searchPages).not.toHaveBeenCalled();
  });

  it('returns [] for a reversed or over-long range', async () => {
    expect(await searchPagesAction('artikel', '2026-10-30', '2026-10-01', 'human')).toEqual([]);
    expect(await searchPagesAction('artikel', '2020-01-01', '2026-10-30', 'human')).toEqual([]);
    expect(searchPages).not.toHaveBeenCalled();
  });
});
