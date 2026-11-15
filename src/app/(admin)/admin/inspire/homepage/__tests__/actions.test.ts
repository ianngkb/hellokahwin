import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_INSPIRE_HOMEPAGE_CONFIG } from '@/lib/inspire/homepage-curation';

const h = vi.hoisted(() => ({
  auth: vi.fn(),
  insert: vi.fn(),
  upsert: vi.fn(),
  select: vi.fn(),
  selectWhere: vi.fn(),
  remove: vi.fn(),
  deleteWhere: vi.fn(),
  audit: vi.fn(),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}));

vi.mock('@/lib/auth/admin', () => ({
  requireAdminSectionAction: (...args: unknown[]) => h.auth(...args),
}));

vi.mock('@/lib/audit/log', () => ({
  logAuditEventAsync: (...args: unknown[]) => h.audit(...args),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => h.revalidatePath(...args),
  revalidateTag: (...args: unknown[]) => h.revalidateTag(...args),
  updateTag: (...args: unknown[]) => h.updateTag(...args),
}));

vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => {
      h.select(...args);
      return {
        from: () => ({
          where: (...whereArgs: unknown[]) => h.selectWhere(...whereArgs),
        }),
      };
    },
    insert: (...args: unknown[]) => {
      h.insert(...args);
      return {
        values: (value: unknown) => ({
          onConflictDoUpdate: (options: unknown) => h.upsert(value, options),
        }),
      };
    },
    delete: (...args: unknown[]) => {
      h.remove(...args);
      return { where: (...whereArgs: unknown[]) => h.deleteWhere(...whereArgs) };
    },
  },
}));

import {
  resetInspireHomepageAction,
  saveInspireHomepageAction,
  searchInspireHomepageArticlesAction,
} from '../actions';

describe('Inspire homepage actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.auth.mockResolvedValue({ error: null, user: { id: 'admin-1' } });
    h.upsert.mockResolvedValue(undefined);
    h.selectWhere.mockResolvedValue([]);
    h.deleteWhere.mockResolvedValue(undefined);
    h.audit.mockResolvedValue(undefined);
  });

  it('requires the existing Inspire permission for save, reset, and article search', async () => {
    h.auth.mockResolvedValue({ error: 'Forbidden', user: null });

    await expect(saveInspireHomepageAction(DEFAULT_INSPIRE_HOMEPAGE_CONFIG)).resolves.toEqual({
      error: 'Forbidden',
    });
    await expect(resetInspireHomepageAction()).resolves.toEqual({ error: 'Forbidden' });
    await expect(searchInspireHomepageArticlesAction('wedding')).resolves.toEqual({
      error: 'Forbidden',
    });
    expect(h.auth).toHaveBeenCalledTimes(3);
    expect(h.auth).toHaveBeenCalledWith('inspire');
    expect(h.insert).not.toHaveBeenCalled();
    expect(h.remove).not.toHaveBeenCalled();
    expect(h.select).not.toHaveBeenCalled();
  });

  it('rejects invalid configuration before writing', async () => {
    const result = await saveInspireHomepageAction({
      ...DEFAULT_INSPIRE_HOMEPAGE_CONFIG,
      featured: { source: 'category', categoryId: null, pinnedArticleIds: [] },
    });

    expect(result).toEqual({ error: 'Choose a category for every category-based section.' });
    expect(h.insert).not.toHaveBeenCalled();
    expect(h.audit).not.toHaveBeenCalled();
  });

  it('rejects a pinned article that is no longer published with a cover', async () => {
    const result = await saveInspireHomepageAction({
      ...DEFAULT_INSPIRE_HOMEPAGE_CONFIG,
      featured: {
        source: 'latest',
        categoryId: null,
        pinnedArticleIds: ['00000000-0000-4000-8000-000000000001'],
      },
    });

    expect(result).toEqual({
      error:
        'One of the pinned articles is no longer published with a cover. Reload and choose another article.',
    });
    expect(h.select).toHaveBeenCalledOnce();
    expect(h.insert).not.toHaveBeenCalled();
  });

  it('saves the versioned setting, audits it, and invalidates public and admin caches', async () => {
    await expect(saveInspireHomepageAction(DEFAULT_INSPIRE_HOMEPAGE_CONFIG)).resolves.toEqual({
      success: true,
    });

    expect(h.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'inspire_homepage',
        value: DEFAULT_INSPIRE_HOMEPAGE_CONFIG,
      }),
      expect.objectContaining({ target: expect.anything() }),
    );
    expect(h.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: 'inspire_homepage',
        action: 'updated',
        performedBy: 'admin-1',
      }),
    );
    expect(h.revalidatePath).toHaveBeenCalledWith('/artikel');
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/inspire/homepage');
    expect(h.revalidateTag).toHaveBeenCalledWith('inspire-homepage', { expire: 0 });
    expect(h.updateTag).toHaveBeenCalledWith('inspire-homepage');
  });

  it('resets by removing the setting and performs the same immediate invalidation', async () => {
    await expect(resetInspireHomepageAction()).resolves.toEqual({ success: true });

    expect(h.remove).toHaveBeenCalledOnce();
    expect(h.deleteWhere).toHaveBeenCalledOnce();
    expect(h.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: 'inspire_homepage',
        action: 'reset',
        performedBy: 'admin-1',
      }),
    );
    expect(h.revalidatePath).toHaveBeenCalledWith('/artikel');
    expect(h.revalidateTag).toHaveBeenCalledWith('inspire-homepage', { expire: 0 });
    expect(h.updateTag).toHaveBeenCalledWith('inspire-homepage');
  });
});
