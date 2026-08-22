import 'server-only';
import { redirect } from 'next/navigation';
import { auth, currentUser } from '@clerk/nextjs/server';
import type { User } from '@clerk/nextjs/server';
import { db } from '@/lib/db/drizzle';
import { profiles } from '@/lib/db/schema/profiles';

/**
 * HelloKahwin admin auth — a deliberate simplification of twn-new's
 * roles/permissions system. Admission is a comma-separated email allowlist
 * (`ADMIN_EMAILS`); every allowlisted admin is a super-admin. The exported
 * surface mirrors the four functions the ported Inspire code calls so call
 * sites did not need rewriting. The `section` parameter is accepted and
 * ignored — there is exactly one admin section worth of product here.
 */

export type AdminSection = string;

export interface AdminAuthUser {
  id: string;
  email: string;
  app_metadata: { role: 'admin' };
}

function allowlist(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowlistedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return allowlist().includes(email.toLowerCase());
}

/**
 * VERIFIED email addresses only. An unverified address is attacker-attachable
 * (anyone can add `admin@…` to their own Clerk account and stop at the
 * verification step), so matching it would hand out admin.
 */
function verifiedEmails(user: User): string[] {
  return user.emailAddresses
    .filter((e) => e.verification?.status === 'verified')
    .map((e) => e.emailAddress.toLowerCase());
}

function allowlistedEmailFor(user: User): string | null {
  const emails = verifiedEmails(user);
  const list = allowlist();
  return emails.find((e) => list.includes(e)) ?? null;
}

/**
 * Ensure a `profiles` row exists for this Clerk admin. Several ported tables
 * FK to profiles (`articles.author_id`, `article_edit_locks.locked_by`,
 * `media.uploaded_by`, `audit_logs.performed_by`) and twn-new provisioned
 * profiles at sign-up — HelloKahwin has no sign-up flow, so the first
 * authenticated admin action provisions the row instead. Per-instance memo
 * keeps this to one INSERT per admin per lambda.
 */
const ensuredProfiles = new Set<string>();
async function ensureAdminProfile(user: User, email: string): Promise<void> {
  if (ensuredProfiles.has(user.id)) return;
  await db
    .insert(profiles)
    .values({
      id: user.id,
      role: 'admin',
      email,
      firstName: user.firstName ?? 'Admin',
      lastName: user.lastName,
    })
    .onConflictDoNothing({ target: profiles.id });
  ensuredProfiles.add(user.id);
}

/** Server components / pages. Redirects to /login (signed out) or /no-access (signed in, not allowlisted). */
export async function requireAdmin(): Promise<{ user: AdminAuthUser }> {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  const user = await currentUser();
  if (!user) redirect('/login');

  const email = allowlistedEmailFor(user);
  // A signed-in but non-allowlisted user must NOT bounce to /login — Clerk's
  // SignIn sends active sessions straight back to /admin, which loops forever.
  if (!email) redirect('/no-access');

  await ensureAdminProfile(user, email);

  return {
    user: { id: user.id, email, app_metadata: { role: 'admin' as const } },
  };
}

/** Server actions — returns an error instead of redirecting. */
export async function requireAdminAction(): Promise<
  { error: null; user: AdminAuthUser } | { error: 'Unauthorized' | 'Forbidden'; user: null }
> {
  const { userId } = await auth();
  if (!userId) return { error: 'Unauthorized' as const, user: null };

  const user = await currentUser();
  if (!user) return { error: 'Unauthorized' as const, user: null };

  const email = allowlistedEmailFor(user);
  if (!email) return { error: 'Forbidden' as const, user: null };

  await ensureAdminProfile(user, email);

  return {
    error: null,
    user: { id: user.id, email, app_metadata: { role: 'admin' as const } },
  };
}

export interface AdminUser {
  email: string;
  isSuperAdmin: boolean;
  sections: AdminSection[];
}

/** Server components. `section` is ignored — see module docblock. */
export async function requireAdminSection(
  _section: AdminSection,
): Promise<{ user: AdminAuthUser; adminUser: AdminUser }> {
  const { user } = await requireAdmin();
  return { user, adminUser: { email: user.email, isSuperAdmin: true, sections: [] } };
}

/** Server actions. `section` is ignored — see module docblock. */
export async function requireAdminSectionAction(
  _section: AdminSection,
): Promise<
  { error: null; user: AdminAuthUser } | { error: 'Unauthorized' | 'Forbidden'; user: null }
> {
  return requireAdminAction();
}

export async function checkIsAdmin(): Promise<boolean> {
  const user = await currentUser();
  if (!user) return false;
  return allowlistedEmailFor(user) !== null;
}

/** Every allowlisted admin is a super-admin in HelloKahwin. */
export async function checkIsSuperAdmin(): Promise<boolean> {
  return checkIsAdmin();
}
