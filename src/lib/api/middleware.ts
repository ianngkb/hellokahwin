import { auth, currentUser } from '@clerk/nextjs/server';
import { ROLES, type UserRole } from '@/lib/auth/roles';
import { isAllowlistedEmail } from '@/lib/auth/admin';
import { ApiError, ForbiddenError, UnauthorizedError } from './errors';
import { apiError } from './response';
import type { NextRequest } from 'next/server';

export async function requireAuth(request?: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    throw new UnauthorizedError();
  }

  const user = await currentUser();
  if (!user) {
    throw new UnauthorizedError();
  }

  // HelloKahwin: role comes from the ADMIN_EMAILS allowlist, not Clerk metadata.
  // VERIFIED addresses only — an unverified address is attacker-attachable.
  const allowlisted = user.emailAddresses.some(
    (e) => e.verification?.status === 'verified' && isAllowlistedEmail(e.emailAddress),
  );

  return {
    id: user.id,
    email: user.primaryEmailAddress?.emailAddress,
    app_metadata: {
      role: allowlisted ? ROLES.ADMIN : undefined,
    },
  };
}

export async function requireRole(request: NextRequest, roles: UserRole[]) {
  const user = await requireAuth(request);
  const userRole = user.app_metadata?.role as UserRole | undefined;

  if (!userRole || !roles.includes(userRole)) {
    throw new ForbiddenError();
  }

  return user;
}

export function withErrorHandler(
  handler: (request: NextRequest, context?: unknown) => Promise<Response>,
) {
  return async (request: NextRequest, context?: unknown) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof ApiError) {
        return apiError(error.message, error.statusCode, error.code);
      }
      console.error('Unhandled API error:', error);
      return apiError('Internal server error', 500);
    }
  };
}
