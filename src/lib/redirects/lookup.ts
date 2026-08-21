import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { redirects } from '@/lib/db/schema/redirects';
import { normalizePathname } from '@/lib/redirects/patterns';

/**
 * Exact-match lookup in the `redirects` table (slug/category changes written
 * by the admin editor). twn-new served these from Edge middleware with an
 * in-memory map; HelloKahwin's volume doesn't warrant that — one indexed read
 * on the 404 path only, from Node route/page code.
 */
export async function lookupRedirect(
  pathname: string,
): Promise<{ destinationPath: string; statusCode: number } | null> {
  try {
    const [row] = await db
      .select({
        destinationPath: redirects.destinationPath,
        statusCode: redirects.statusCode,
        isActive: redirects.isActive,
      })
      .from(redirects)
      .where(eq(redirects.sourcePath, normalizePathname(pathname)))
      .limit(1);
    if (!row || row.isActive === false) return null;
    return { destinationPath: row.destinationPath, statusCode: row.statusCode ?? 301 };
  } catch {
    // A DB blip on a redirect lookup degrades to 404 — never a 500.
    return null;
  }
}
