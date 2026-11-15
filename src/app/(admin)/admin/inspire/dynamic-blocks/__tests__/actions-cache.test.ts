import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The lighter cache rule ported from The Wedding Notebook: a dynamic-block
 * write busts the dynamic-blocks tag (plus read-your-own-writes `updateTag`),
 * and NEVER the shared `articles` tag behind every public /artikel page.
 */

const BLOCK = '0b7c4f8e-1111-4222-8333-444455556666';

const h = vi.hoisted(() => ({
  auth: vi.fn(),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
  redirect: vi.fn(),
  insertReturning: vi.fn(),
  deleteReturning: vi.fn(),
  txUpdateReturning: vi.fn(),
}));

vi.mock('@/lib/auth/admin', () => ({
  requireAdminSectionAction: (...args: unknown[]) => h.auth(...args),
}));
vi.mock('@/lib/audit/log', () => ({ logAuditEvent: vi.fn() }));
vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => h.revalidatePath(...args),
  revalidateTag: (...args: unknown[]) => h.revalidateTag(...args),
  updateTag: (...args: unknown[]) => h.updateTag(...args),
  unstable_cache: (fn: unknown) => fn,
}));
vi.mock('next/navigation', () => ({ redirect: (...args: unknown[]) => h.redirect(...args) }));
vi.mock('@/lib/db/drizzle', () => {
  const tx = {
    update: () => ({ set: () => ({ where: () => ({ returning: () => h.txUpdateReturning() }) }) }),
    delete: () => ({ where: async () => undefined }),
    insert: () => ({ values: async () => undefined }),
  };
  return {
    db: {
      insert: () => ({ values: () => ({ returning: () => h.insertReturning() }) }),
      delete: () => ({ where: () => ({ returning: () => h.deleteReturning() }) }),
      transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
    },
  };
});

import {
  createDynamicBlockAction,
  deleteDynamicBlockAction,
  updateDynamicBlockAction,
} from '../actions';
import { DYNAMIC_BLOCKS_TAG } from '@/lib/inspire/cached-lists';
import { PURGE_IMMEDIATELY } from '@/lib/cache/purge';

function expectLighterRule() {
  expect(h.revalidateTag).toHaveBeenCalledWith(DYNAMIC_BLOCKS_TAG, PURGE_IMMEDIATELY);
  expect(h.updateTag).toHaveBeenCalledWith(DYNAMIC_BLOCKS_TAG);
  expect(h.revalidateTag.mock.calls.map((c) => c[0])).not.toContain('articles');
  expect(h.updateTag.mock.calls.map((c) => c[0])).not.toContain('articles');
}

describe('dynamic-block writes use the lighter cache rule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.auth.mockResolvedValue({ error: null, user: { id: 'admin-1' } });
    h.insertReturning.mockResolvedValue([{ id: BLOCK }]);
    h.deleteReturning.mockResolvedValue([{ name: 'Promo' }]);
    h.txUpdateReturning.mockResolvedValue([{ id: BLOCK }]);
  });

  it('create', async () => {
    const form = new FormData();
    form.set('name', 'Promo');
    form.set('placement', 'end');
    await createDynamicBlockAction(null, form);
    expect(h.redirect).toHaveBeenCalledWith(`/admin/inspire/dynamic-blocks/${BLOCK}/edit`);
    expectLighterRule();
  });

  it('update', async () => {
    const result = await updateDynamicBlockAction(BLOCK, {
      name: 'Promo',
      placement: 'start',
      status: 'published',
      isActive: true,
      displayOrder: 0,
      categoryIds: [],
      tagIds: [],
      articleIds: [],
    });
    expect(result).toEqual({ success: true });
    expectLighterRule();
  });

  it('delete', async () => {
    await expect(deleteDynamicBlockAction(BLOCK)).resolves.toEqual({ success: true });
    expectLighterRule();
  });

  it('a refused write busts nothing', async () => {
    h.deleteReturning.mockResolvedValue([]);
    await expect(deleteDynamicBlockAction(BLOCK)).resolves.toEqual({ error: 'Block not found' });
    expect(h.revalidateTag).not.toHaveBeenCalled();
    expect(h.updateTag).not.toHaveBeenCalled();
  });
});
