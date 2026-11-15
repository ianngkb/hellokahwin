import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NO_SLUG_ERROR,
  isReservedCategorySlug,
  isUniqueViolation,
} from '@/lib/inspire/taxonomy-slugs';

/**
 * The category/tag/create-article slug rules ported from The Wedding Notebook
 * (its taxonomy write core), applied inside HelloKahwin's own server actions.
 */

const h = vi.hoisted(() => ({
  selects: [] as unknown[][],
  insert: vi.fn(),
  update: vi.fn(),
  txInsert: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('@/lib/auth/admin', () => ({
  requireAdminSectionAction: vi.fn(async () => ({ error: null, user: { id: 'admin-1' } })),
}));
vi.mock('@/lib/audit/log', () => ({ logAuditEvent: vi.fn() }));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));
vi.mock('next/navigation', () => ({ redirect: (...a: unknown[]) => h.redirect(...a) }));
vi.mock('@/lib/db/drizzle', () => {
  const nextSelect = async () => h.selects.shift() ?? [];
  return {
    db: {
      select: () => ({ from: () => ({ where: () => ({ limit: nextSelect }) }) }),
      insert: () => ({ values: (v: unknown) => ({ returning: () => h.insert(v) }) }),
      update: () => ({
        set: (v: unknown) => {
          const where = () => {
            const p = Promise.resolve().then(() => h.update(v));
            return Object.assign(p, { returning: () => p });
          };
          return { where };
        },
      }),
      execute: async () => [{ depth: 0 }],
      transaction: async (fn: (tx: unknown) => unknown) =>
        fn({
          insert: () => ({
            values: (v: unknown) => ({ returning: () => h.txInsert(v) }),
          }),
        }),
    },
  };
});

import { createCategoryAction, updateCategoryAction } from '../categories/actions';
import { createTagAction, updateTagAction } from '../tags/actions';
import { createArticleAction } from '../create/actions';

const CAT = '33333333-2222-4333-8444-555555555555';
const form = (entries: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
};
const unique = Object.assign(new Error('duplicate key'), { code: '23505' });

beforeEach(() => {
  vi.clearAllMocks();
  h.selects = [];
  h.insert.mockResolvedValue([{ id: 'new-id' }]);
  h.update.mockResolvedValue([{ id: 'c1' }]);
  h.txInsert.mockResolvedValue([{ id: 'a1' }]);
});

describe('slug rule helpers', () => {
  it('reserves the static /artikel routes, whatever shape the slug was typed in', () => {
    for (const s of ['tag', 'Tag', ' author ', 'tag/'])
      expect(isReservedCategorySlug(s)).toBe(true);
    expect(isReservedCategorySlug('tag-ideas')).toBe(false);
    expect(isReservedCategorySlug('majlis')).toBe(false);
  });

  it('recognises a unique violation raw or wrapped by the driver', () => {
    expect(isUniqueViolation({ code: '23505' })).toBe(true);
    expect(isUniqueViolation({ cause: { code: '23505' } })).toBe(true);
    expect(isUniqueViolation({ code: '23503' })).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});

describe('createCategoryAction', () => {
  it('refuses a name that makes no slug, instead of storing an empty one', async () => {
    expect(await createCategoryAction(null, form({ name: '婚礼' }))).toEqual({
      error: NO_SLUG_ERROR,
    });
    expect(h.insert).not.toHaveBeenCalled();
  });

  it('refuses a slug owned by a static /artikel route', async () => {
    const r = await createCategoryAction(null, form({ name: 'Tag' }));
    expect(r).toEqual({ error: expect.stringContaining('"tag" is reserved') });
    expect(h.insert).not.toHaveBeenCalled();
  });

  it('says the slug is taken instead of failing on the unique index', async () => {
    h.selects = [[{ id: 'other' }]];
    expect(await createCategoryAction(null, form({ name: 'Majlis' }))).toEqual({
      error: 'A category with slug "majlis" already exists',
    });
    expect(h.insert).not.toHaveBeenCalled();
  });

  it('turns a race past the pre-check into the same message', async () => {
    h.insert.mockRejectedValue(unique);
    expect(await createCategoryAction(null, form({ name: 'Majlis' }))).toEqual({
      error: 'A category with slug "majlis" already exists',
    });
  });

  it('creates a normal category', async () => {
    expect(await createCategoryAction(null, form({ name: 'Majlis Kahwin' }))).toEqual({
      success: true,
    });
    expect(h.insert).toHaveBeenCalledWith(expect.objectContaining({ slug: 'majlis-kahwin' }));
  });
});

describe('updateCategoryAction', () => {
  it('regenerates a cleared slug from the name instead of writing an empty one', async () => {
    h.selects = [[{ slug: 'old' }], []];
    expect(await updateCategoryAction(null, form({ id: 'c1', name: 'Pelamin Moden' }))).toEqual({
      success: true,
    });
    expect(h.update).toHaveBeenCalledWith(expect.objectContaining({ slug: 'pelamin-moden' }));
  });

  it('refuses to MOVE a category onto a reserved slug', async () => {
    h.selects = [[{ slug: 'old' }]];
    const r = await updateCategoryAction(null, form({ id: 'c1', name: 'X', slug: 'author' }));
    expect(r).toEqual({ error: expect.stringContaining('"author" is reserved') });
    expect(h.update).not.toHaveBeenCalled();
  });

  it('still lets a category that already holds a reserved slug be renamed', async () => {
    h.selects = [[{ slug: 'tag' }], []];
    expect(
      await updateCategoryAction(null, form({ id: 'c1', name: 'Renamed', slug: 'tag' })),
    ).toEqual({ success: true });
  });

  it('says the slug is taken by another category', async () => {
    h.selects = [[{ slug: 'old' }], [{ id: 'c2' }]];
    expect(await updateCategoryAction(null, form({ id: 'c1', name: 'Majlis' }))).toEqual({
      error: 'A category with slug "majlis" already exists',
    });
  });

  it('reports an unknown category without writing', async () => {
    h.selects = [[]];
    expect(await updateCategoryAction(null, form({ id: 'gone', name: 'X' }))).toEqual({
      error: 'Category not found',
    });
    expect(h.update).not.toHaveBeenCalled();
  });
});

describe('tag actions', () => {
  it('create: refuses a name that makes no slug', async () => {
    expect(await createTagAction(null, form({ name: '!!!' }))).toEqual({ error: NO_SLUG_ERROR });
    expect(h.insert).not.toHaveBeenCalled();
  });

  it('create: a race past the pre-check is a sentence, not a 500', async () => {
    h.insert.mockRejectedValue(unique);
    expect(await createTagAction(null, form({ name: 'Rustic' }))).toEqual({
      error: 'A tag with slug "rustic" already exists',
    });
  });

  it('update: a race past the pre-check is a sentence, not a 500', async () => {
    h.update.mockRejectedValue(unique);
    expect(await updateTagAction(null, form({ id: 't1', slug: 'rustic' }))).toEqual({
      error: 'A tag with that slug already exists',
    });
  });

  it('update: an unknown tag is reported, not silently "saved"', async () => {
    h.update.mockResolvedValue([]);
    expect(await updateTagAction(null, form({ id: 'gone', name: 'X' }))).toEqual({
      error: 'Tag not found',
    });
  });
});

describe('createArticleAction', () => {
  it('a title with no a–z/0–9 still gets a slug that does not start with a hyphen', async () => {
    await createArticleAction(null, form({ title: '婚礼', primaryCategoryId: CAT }));
    const values = h.txInsert.mock.calls[0][0] as { slug: string };
    expect(values.slug).toMatch(/^article-[a-z0-9]+$/);
    expect(h.redirect).toHaveBeenCalledWith('/admin/inspire/a1/edit');
  });
});
