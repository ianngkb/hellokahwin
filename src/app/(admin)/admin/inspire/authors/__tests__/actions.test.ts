import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Saving an author refreshes every article that author wrote (ported from The
 * Wedding Notebook), on top of the existing tag busts.
 */

const h = vi.hoisted(() => ({
  auth: vi.fn(),
  before: vi.fn(),
  authored: vi.fn(),
  update: vi.fn(),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
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
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: () => ({
      from: () => ({
        // The pre-read of the profile.
        where: () => ({ limit: () => h.before() }),
        // The author's articles, joined to their primary category.
        innerJoin: () => ({ where: () => h.authored() }),
      }),
    }),
    update: () => ({ set: () => ({ where: (...a: unknown[]) => h.update(...a) }) }),
  },
}));

import { updateAuthorProfileAction } from '../actions';

function form(extra: Record<string, string> = {}) {
  const f = new FormData();
  f.set('profileId', 'user_abc');
  f.set('authorSlug', 'aina');
  f.set('isPublicAuthor', 'on');
  for (const [k, v] of Object.entries(extra)) f.set(k, v);
  return f;
}

const BEFORE = {
  role: 'admin',
  firstName: 'Aina',
  lastName: 'Rahman',
  authorSlug: 'aina',
  isPublicAuthor: true,
  authorTitle: null,
  authorBio: null,
  authorWebsiteUrl: null,
  authorInstagramUrl: null,
  authorLinkedinUrl: null,
  avatarUrl: null,
};

describe('updateAuthorProfileAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.auth.mockResolvedValue({ error: null, user: { id: 'admin-1' } });
    h.before.mockResolvedValue([BEFORE]);
    h.update.mockResolvedValue(undefined);
    h.authored.mockResolvedValue([
      { slug: 'majlis-di-taman', categorySlug: 'majlis' },
      { slug: 'baju-nikah', categorySlug: 'fesyen' },
    ]);
  });

  it("revalidates each of the author's article pages after a save", async () => {
    await expect(updateAuthorProfileAction(null, form({ authorBio: 'Hi' }))).resolves.toEqual({
      success: true,
    });
    const paths = h.revalidatePath.mock.calls.map((c) => c[0]);
    expect(paths).toContain('/artikel/majlis/majlis-di-taman');
    expect(paths).toContain('/artikel/fesyen/baju-nikah');
    // The shared tag bust stays — it is what clears the cached page data.
    expect(h.revalidateTag.mock.calls.map((c) => c[0])).toContain('articles');
  });

  it('still reports the save as successful when the article lookup fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.authored.mockRejectedValue(new Error('timeout'));
    await expect(updateAuthorProfileAction(null, form())).resolves.toEqual({ success: true });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('refreshes nothing when the save is refused', async () => {
    h.before.mockResolvedValue([{ ...BEFORE, role: 'couple' }]);
    await expect(updateAuthorProfileAction(null, form())).resolves.toEqual({
      error: 'Only admin accounts can be public authors',
    });
    expect(h.authored).not.toHaveBeenCalled();
    expect(h.revalidatePath).not.toHaveBeenCalled();
  });
});
