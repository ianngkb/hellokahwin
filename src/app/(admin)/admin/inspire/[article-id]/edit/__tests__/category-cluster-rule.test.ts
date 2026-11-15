// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  auth: { error: null, user: { id: 'admin-1' } } as { error: string | null; user: unknown },
  results: [] as unknown[],
  inserted: [] as unknown[],
}));

vi.mock('@/lib/auth/admin', () => ({
  requireAdminSectionAction: vi.fn(async () => h.auth),
}));
vi.mock('@/lib/audit/log', () => ({ logAuditEvent: vi.fn() }));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));
vi.mock('@/lib/db/drizzle', () => {
  const chain = (): Record<string, unknown> => {
    const b: Record<string, unknown> = {};
    for (const m of ['from', 'where', 'limit']) b[m] = vi.fn(() => b);
    b.values = vi.fn((v: unknown) => {
      h.inserted.push(v);
      return b;
    });
    b.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve(h.results.shift() ?? []).then(res, rej);
    return b;
  };
  const db = {
    select: vi.fn(() => chain()),
    delete: vi.fn(() => chain()),
    insert: vi.fn(() => chain()),
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(db)),
  };
  return { db };
});

const { updateArticleCategoriesAction } = await import('../actions');
const { db } = await import('@/lib/db/drizzle');

const ARTICLE = '33333333-3333-4333-8333-333333333333';
const pillar = { id: 'p1', parentId: null, isPillar: true, pillarCode: 'P1', name: 'Pillar' };
const c11 = { id: 'c11', parentId: 'p1', isPillar: false, pillarCode: 'C1.1', name: 'A' };
const c12 = { id: 'c12', parentId: 'p1', isPillar: false, pillarCode: 'C1.2', name: 'B' };
const plain = { id: 'x', parentId: 'p1', isPillar: false, pillarCode: null, name: 'Legacy' };

beforeEach(() => {
  vi.clearAllMocks();
  h.auth = { error: null, user: { id: 'admin-1' } };
  h.results = [];
  h.inserted = [];
});

describe('updateArticleCategoriesAction — one cluster per article', () => {
  it('rejects a non-admin before reading anything', async () => {
    h.auth = { error: 'Unauthorized', user: null };
    expect(await updateArticleCategoriesAction(ARTICLE, ['p1', 'c11'])).toEqual({
      error: 'Unauthorized',
    });
    expect(db.select).not.toHaveBeenCalled();
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('refuses two clusters and writes nothing', async () => {
    h.results = [[pillar, c11, c12], [pillar]];
    expect(await updateArticleCategoriesAction(ARTICLE, ['p1', 'c11', 'c12'])).toEqual({
      error: 'An article can be in one cluster at most.',
    });
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('accepts one cluster alongside the pillar and an ordinary category', async () => {
    h.results = [[pillar, c11, plain], [pillar]];
    expect(await updateArticleCategoriesAction(ARTICLE, ['p1', 'c11', 'x'])).toEqual({
      success: true,
    });
    expect(h.inserted[0]).toEqual([
      { articleId: ARTICLE, categoryId: 'p1' },
      { articleId: ARTICLE, categoryId: 'c11' },
      { articleId: ARTICLE, categoryId: 'x' },
    ]);
  });

  it('skips the cluster check for a single category', async () => {
    expect(await updateArticleCategoriesAction(ARTICLE, ['p1'])).toEqual({ success: true });
    expect(db.select).not.toHaveBeenCalled();
  });
});
