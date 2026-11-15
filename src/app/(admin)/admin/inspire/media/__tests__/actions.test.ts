/**
 * The Media Library's admin door: the list degrades instead of crashing when
 * its count fails, and the delete actions go through the shared core and pass
 * its leftover-file report on to the person. Nothing touches a real database
 * or storage.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  auth: vi.fn(),
  rows: [] as unknown[],
  countImpl: (() => Promise.resolve([{ count: 0 }])) as () => Promise<unknown>,
  deleteMedia: vi.fn(),
  bulkDeleteMedia: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/auth/admin', () => ({
  requireAdminSectionAction: (...args: unknown[]) => h.auth(...args),
}));
vi.mock('@/lib/audit/log', () => ({ logAuditEvent: vi.fn() }));
vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => h.revalidatePath(...args),
  revalidateTag: vi.fn(),
}));
vi.mock('@/lib/media/media-delete', () => ({
  deleteMedia: (...args: unknown[]) => h.deleteMedia(...args),
  bulkDeleteMedia: (...args: unknown[]) => h.bulkDeleteMedia(...args),
}));

/**
 * `select({...fields})` with a `leftJoin` is the rows query; a bare
 * `select({ count })` is the count. Each resolves on its own.
 */
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: (fields: Record<string, unknown>) => {
      const isCount = Object.keys(fields).length === 1 && 'count' in fields;
      const chain: Record<string, unknown> = {};
      for (const k of ['from', 'leftJoin', 'where', 'orderBy', 'limit']) chain[k] = () => chain;
      chain.offset = () => Promise.resolve(h.rows);
      chain.then = (ok: (v: unknown) => unknown, no?: (e: unknown) => unknown) =>
        (isCount ? h.countImpl() : Promise.resolve(h.rows)).then(ok, no);
      return chain;
    },
  },
}));

import { bulkDeleteMediaAction, deleteMediaAction, getMediaListAction } from '../actions';

const USER = { id: 'user_admin', email: 'admin@hk.test' };
const ID = '11111111-2222-4333-8444-555555555555';

beforeEach(() => {
  vi.clearAllMocks();
  h.auth.mockResolvedValue({ error: null, user: USER });
  h.rows = [];
  h.countImpl = () => Promise.resolve([{ count: 0 }]);
});

describe('getMediaListAction — the count may fail, the page may not', () => {
  it('returns the rows with a paging estimate when the count times out', async () => {
    h.rows = Array.from({ length: 48 }, (_, i) => ({ id: String(i) }));
    h.countImpl = () => Promise.reject(new Error('canceling statement due to statement timeout'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await getMediaListAction({ search: 'pelamin', page: 1, pageSize: 48 });

    expect(result.error).toBeUndefined();
    expect(result.data?.items).toHaveLength(48);
    // A full page claims one more, so "Next" stays enabled.
    expect(result.data?.total).toBe(49);
    spy.mockRestore();
  });

  it('keeps an honest zero when the count succeeds with 0', async () => {
    h.countImpl = () => Promise.resolve([{ count: 0 }]);
    const result = await getMediaListAction({});
    expect(result.data?.total).toBe(0);
  });

  it('uses the real count when it arrives', async () => {
    h.rows = [{ id: 'a' }];
    h.countImpl = () => Promise.resolve([{ count: 731 }]);
    const result = await getMediaListAction({});
    expect(result.data?.total).toBe(731);
  });
});

describe('deleteMediaAction', () => {
  it('goes through the shared core with force, as the acting admin', async () => {
    h.deleteMedia.mockResolvedValue({ deleted: true, media: {}, detached: {} });

    expect(await deleteMediaAction(ID)).toEqual({});
    expect(h.deleteMedia).toHaveBeenCalledWith(USER, ID, { force: true });
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/inspire/media');
  });

  it('passes a leftover-files note on as a warning instead of dropping it', async () => {
    h.deleteMedia.mockResolvedValue({
      deleted: true,
      media: {},
      detached: {},
      note: 'The library row is gone, but 1 file could not be removed from storage (x).',
    });

    const result = await deleteMediaAction(ID);
    expect(result.warning).toMatch(/could not be removed from storage/);
    expect(result.error).toBeUndefined();
  });

  it('returns the core’s refusal as an error', async () => {
    h.deleteMedia.mockResolvedValue({ error: 'This picture has 1 crop' });
    expect(await deleteMediaAction(ID)).toEqual({ error: 'This picture has 1 crop' });
  });

  it('refuses without an admin session and never reaches the core', async () => {
    h.auth.mockResolvedValue({ error: 'Unauthorized', user: null });
    expect(await deleteMediaAction(ID)).toEqual({ error: 'Unauthorized' });
    expect(h.deleteMedia).not.toHaveBeenCalled();
  });
});

describe('bulkDeleteMediaAction', () => {
  it('reports the whole outcome: deleted, already gone, and files left behind', async () => {
    h.bulkDeleteMedia.mockResolvedValue({
      deleted: 2,
      medias: [],
      detached: {},
      notFound: ['x'],
      errors: ['a.jpg: left 1 file', 'b.jpg: left 1 file'],
      leftoverKeys: ['k1', 'k2'],
    });

    const result = await bulkDeleteMediaAction([ID, ID]);

    expect(h.bulkDeleteMedia).toHaveBeenCalledWith(USER, [ID, ID], { force: true });
    expect(result).toMatchObject({ deleted: 2, notFound: 1 });
    expect(result.warning).toMatch(/^2 of them left files behind in storage/);
  });

  it('is a no-op for an empty selection', async () => {
    expect(await bulkDeleteMediaAction([])).toEqual({ deleted: 0 });
    expect(h.bulkDeleteMedia).not.toHaveBeenCalled();
  });
});
