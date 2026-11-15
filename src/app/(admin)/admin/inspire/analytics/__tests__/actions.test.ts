import { describe, it, expect, vi, beforeEach } from 'vitest';

const limit = vi.fn();
const where = vi.fn((cond: unknown) => ({ orderBy: () => ({ limit }), cond }));
const requireAdminSectionAction = vi.fn();

vi.mock('@/lib/db/drizzle', () => ({
  db: { select: () => ({ from: () => ({ where }) }) },
}));
vi.mock('@/lib/auth/admin', () => ({
  requireAdminSectionAction: (s: string) => requireAdminSectionAction(s),
}));
vi.mock('drizzle-orm', async (importOriginal) => ({
  ...(await importOriginal<typeof import('drizzle-orm')>()),
  ilike: (_col: unknown, pattern: string) => ({ pattern }),
}));

import { searchArticlesForPickerAction } from '../actions';

/** The picker's search (R11): inspire-gated, 2+ chars, wildcard-escaped, max 20. */

beforeEach(() => {
  limit.mockReset();
  where.mockClear();
  requireAdminSectionAction.mockReset();
  requireAdminSectionAction.mockResolvedValue({ error: null, user: { id: 'u1' } });
});

describe('searchArticlesForPickerAction', () => {
  it('refuses without the inspire section', async () => {
    requireAdminSectionAction.mockResolvedValue({ error: 'Forbidden', user: null });
    expect(await searchArticlesForPickerAction('garden')).toEqual({ error: 'Forbidden' });
    expect(requireAdminSectionAction).toHaveBeenCalledWith('inspire');
    expect(where).not.toHaveBeenCalled();
  });

  it('returns nothing without querying under 2 characters', async () => {
    expect(await searchArticlesForPickerAction(' g ')).toEqual({ articles: [] });
    expect(where).not.toHaveBeenCalled();
  });

  it('escapes LIKE wildcards and the backslash, and caps at 20', async () => {
    limit.mockResolvedValue([{ id: 'a', title: '50% off\\', status: 'draft' }]);
    const res = await searchArticlesForPickerAction('50%_off\\');
    expect(res).toEqual({ articles: [{ id: 'a', title: '50% off\\', status: 'draft' }] });
    expect(where.mock.calls[0][0]).toEqual({ pattern: '%50\\%\\_off\\\\%' });
    expect(limit).toHaveBeenCalledWith(20);
  });

  it('T4-F7: counts characters in code points — one emoji is not two characters', async () => {
    expect(await searchArticlesForPickerAction('💍')).toEqual({ articles: [] });
    expect(where).not.toHaveBeenCalled();
    limit.mockResolvedValue([]);
    await searchArticlesForPickerAction('💍💍');
    expect(where).toHaveBeenCalledTimes(1);
  });

  it('T4-F7: truncates at 200 code points without splitting an emoji', async () => {
    limit.mockResolvedValue([]);
    await searchArticlesForPickerAction(`${'a'.repeat(199)}💍xyz`);
    const pattern = (where.mock.calls[0][0] as { pattern: string }).pattern;
    expect(pattern).toBe(`%${'a'.repeat(199)}💍%`);
    expect(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(pattern)).toBe(false);
  });

  it('T4-F4: labels a scheduled article (a draft with a publish time) "scheduled"', async () => {
    limit.mockResolvedValue([
      { id: 'a', title: 'Garden', status: 'draft', scheduledPublishAt: new Date('2026-12-01') },
      { id: 'b', title: 'Garden 2', status: 'draft', scheduledPublishAt: null },
    ]);
    expect(await searchArticlesForPickerAction('garden')).toEqual({
      articles: [
        { id: 'a', title: 'Garden', status: 'scheduled' },
        { id: 'b', title: 'Garden 2', status: 'draft' },
      ],
    });
  });

  it('turns a database failure into a friendly error', async () => {
    limit.mockRejectedValue(new Error('boom'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await searchArticlesForPickerAction('garden')).toEqual({
      error: 'Could not search articles — please try again.',
    });
  });
});
