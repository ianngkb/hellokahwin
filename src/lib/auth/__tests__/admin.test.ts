import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const authMock = vi.fn();
const currentUserMock = vi.fn();
vi.mock('@clerk/nextjs/server', () => ({
  auth: (...args: unknown[]) => authMock(...args),
  currentUser: (...args: unknown[]) => currentUserMock(...args),
}));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));

// ensureAdminProfile writes through this — capture the insert instead of hitting a DB.
const onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
const values = vi.fn(() => ({ onConflictDoNothing }));
const insert = vi.fn(() => ({ values }));
vi.mock('@/lib/db/drizzle', () => ({ db: { insert: (...a: unknown[]) => insert(...a) } }));
vi.mock('@/lib/db/schema/profiles', () => ({ profiles: { id: 'id' } }));

import {
  isAllowlistedEmail,
  requireAdmin,
  requireAdminAction,
  requireAdminSectionAction,
  checkIsSuperAdmin,
} from '../admin';

/** Clerk user whose addresses are all verified unless flagged otherwise. */
function clerkUser(emails: Array<string | { email: string; verified: boolean }>, id = 'user_1') {
  return {
    id,
    firstName: 'Test',
    lastName: 'Admin',
    emailAddresses: emails.map((e) =>
      typeof e === 'string'
        ? { emailAddress: e, verification: { status: 'verified' } }
        : { emailAddress: e.email, verification: { status: e.verified ? 'verified' : 'unverified' } },
    ),
  };
}

describe('admin allowlist shim', () => {
  beforeEach(() => {
    process.env.ADMIN_EMAILS = 'Me@ian.ng, other@hellokahwin.com';
    authMock.mockResolvedValue({ userId: 'user_1' });
    currentUserMock.mockResolvedValue(clerkUser(['me@ian.ng']));
  });
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.ADMIN_EMAILS;
  });

  it('matches allowlist emails case-insensitively', () => {
    expect(isAllowlistedEmail('ME@IAN.NG')).toBe(true);
    expect(isAllowlistedEmail('stranger@example.com')).toBe(false);
    expect(isAllowlistedEmail(null)).toBe(false);
  });

  it('is closed when ADMIN_EMAILS is unset', () => {
    delete process.env.ADMIN_EMAILS;
    expect(isAllowlistedEmail('me@ian.ng')).toBe(false);
  });

  it('requireAdmin returns the twn-compatible user shape for an allowlisted admin', async () => {
    // Unique id per test — ensureAdminProfile memoizes provisioning per process.
    currentUserMock.mockResolvedValue(clerkUser(['me@ian.ng'], 'user_shape'));
    const { user } = await requireAdmin();
    expect(user).toEqual({
      id: 'user_shape',
      email: 'me@ian.ng',
      app_metadata: { role: 'admin' },
    });
  });

  it('provisions a profiles row for the Clerk admin (FK target for authorId/locks/media/audit)', async () => {
    currentUserMock.mockResolvedValue(clerkUser(['me@ian.ng'], 'user_provision'));
    await requireAdmin();
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user_provision', email: 'me@ian.ng', role: 'admin' }),
    );
    expect(onConflictDoNothing).toHaveBeenCalled();
  });

  it('requireAdmin redirects to /login when signed out', async () => {
    authMock.mockResolvedValue({ userId: null });
    await expect(requireAdmin()).rejects.toThrow('REDIRECT:/login');
  });

  it('sends a signed-in but non-allowlisted user to /no-access, NOT /login', async () => {
    // /login would bounce an active Clerk session straight back to /admin — an
    // infinite redirect loop. This is the regression guard for that.
    currentUserMock.mockResolvedValue(clerkUser(['stranger@example.com']));
    await expect(requireAdmin()).rejects.toThrow('REDIRECT:/no-access');
  });

  it('ignores an UNVERIFIED allowlisted address', async () => {
    // Anyone can attach admin@… to their own Clerk account and stop before
    // verifying; matching it would hand out admin.
    currentUserMock.mockResolvedValue(clerkUser([{ email: 'me@ian.ng', verified: false }]));
    await expect(requireAdmin()).rejects.toThrow('REDIRECT:/no-access');
    expect(await checkIsSuperAdmin()).toBe(false);
  });

  it('matches any verified address on the Clerk user, not just the primary', async () => {
    currentUserMock.mockResolvedValue(
      clerkUser(['personal@gmail.com', 'other@hellokahwin.com'], 'user_secondary'),
    );
    const { user } = await requireAdmin();
    expect(user.email).toBe('other@hellokahwin.com');
  });

  it('requireAdminAction returns errors instead of redirecting', async () => {
    authMock.mockResolvedValue({ userId: null });
    expect(await requireAdminAction()).toEqual({ error: 'Unauthorized', user: null });

    authMock.mockResolvedValue({ userId: 'user_1' });
    currentUserMock.mockResolvedValue(clerkUser(['stranger@example.com']));
    expect(await requireAdminAction()).toEqual({ error: 'Forbidden', user: null });
  });

  it('requireAdminSectionAction ignores the section argument', async () => {
    currentUserMock.mockResolvedValue(clerkUser(['me@ian.ng'], 'user_section'));
    const result = await requireAdminSectionAction('anything');
    expect(result.error).toBeNull();
    expect(result.user?.email).toBe('me@ian.ng');
  });

  it('every allowlisted admin is a super-admin', async () => {
    expect(await checkIsSuperAdmin()).toBe(true);
    currentUserMock.mockResolvedValue(clerkUser(['stranger@example.com']));
    expect(await checkIsSuperAdmin()).toBe(false);
  });
});
