import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  auth: vi.fn(),
  recent: vi.fn(),
  audit: vi.fn(),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  order: [] as string[],
}));

vi.mock('@/lib/auth/admin', () => ({
  requireAdminSectionAction: (...args: unknown[]) => h.auth(...args),
}));
vi.mock('@/lib/audit/log', () => ({
  logAuditEventAsync: async (...args: unknown[]) => {
    h.order.push('audit');
    return h.audit(...args);
  },
}));
vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => h.revalidatePath(...args),
  revalidateTag: (...args: unknown[]) => {
    h.order.push('revalidateTag');
    return h.revalidateTag(...args);
  },
}));
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({ orderBy: () => ({ limit: () => h.recent() }) }),
      }),
    }),
  },
}));

import { refreshAllArticlesAction } from '../refresh-all-actions';
import { PURGE_IMMEDIATELY } from '@/lib/cache/purge';

describe('refreshAllArticlesAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.order.length = 0;
    h.auth.mockResolvedValue({ error: null, user: { id: 'admin-1' } });
    h.recent.mockResolvedValue([]);
    h.audit.mockResolvedValue(undefined);
  });

  it('requires the Inspire admin permission and does nothing without it', async () => {
    h.auth.mockResolvedValue({ error: 'Forbidden', user: null });
    await expect(refreshAllArticlesAction()).resolves.toEqual({ error: 'Forbidden' });
    expect(h.auth).toHaveBeenCalledWith('inspire');
    expect(h.audit).not.toHaveBeenCalled();
    expect(h.revalidateTag).not.toHaveBeenCalled();
  });

  it('records the run in audit_logs BEFORE purging every article page', async () => {
    await expect(refreshAllArticlesAction()).resolves.toEqual({ ok: true });
    expect(h.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'article',
        action: 'articles_refresh_all',
        performedBy: 'admin-1',
      }),
    );
    expect(h.revalidateTag).toHaveBeenCalledWith('articles', PURGE_IMMEDIATELY);
    expect(h.revalidatePath).toHaveBeenCalledWith('/artikel');
    expect(h.order).toEqual(['audit', 'revalidateTag']);
  });

  it('refuses a second run inside the 10-minute cooldown, with no purge and no audit row', async () => {
    h.recent.mockResolvedValue([{ createdAt: new Date('2026-11-15T02:05:00Z') }]);
    const result = await refreshAllArticlesAction();
    expect(result).toMatchObject({ lastRunAt: '2026-11-15T02:05:00.000Z' });
    // 02:05Z is 10:05 in Kuala Lumpur — shown to the admin in local time.
    expect('error' in result && result.error).toMatch(/already refreshed at 10:05/);
    expect('error' in result && result.error).toMatch(/10 minutes/);
    expect(h.audit).not.toHaveBeenCalled();
    expect(h.revalidateTag).not.toHaveBeenCalled();
  });

  it('does not purge when the guard row cannot be written', async () => {
    h.audit.mockRejectedValue(new Error('db down'));
    await expect(refreshAllArticlesAction()).rejects.toThrow('db down');
    expect(h.revalidateTag).not.toHaveBeenCalled();
  });
});
