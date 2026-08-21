import { type NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db/drizzle';
import { articleEditLocks } from '@/lib/db/schema/articles';
import { isAllowlistedEmail } from '@/lib/auth/admin';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(null, { status: 401 });
    }
    // Allowlist gate — HelloKahwin admins carry no Clerk publicMetadata role
    // (that was twn-new's RBAC); the ADMIN_EMAILS allowlist is the authority.
    const clerkUser = await currentUser();
    const allowlisted = clerkUser?.emailAddresses.some(
      (e) => e.verification?.status === 'verified' && isAllowlistedEmail(e.emailAddress),
    );
    if (!allowlisted) {
      return new Response(null, { status: 401 });
    }

    const body = await request.json();
    const articleId = body?.articleId as string | undefined;
    if (!articleId || !UUID_RE.test(articleId)) {
      return new Response(null, { status: 400 });
    }

    await db
      .delete(articleEditLocks)
      .where(and(eq(articleEditLocks.articleId, articleId), eq(articleEditLocks.lockedBy, userId)));

    return new Response(null, { status: 200 });
  } catch (err) {
    console.error('release-lock error:', err);
    return new Response(null, { status: 500 });
  }
}
