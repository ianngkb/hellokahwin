// Per-path lookup for the WordPress→R2 legacy image redirect map.
//
// twn-new ran this from Edge middleware via the anon Supabase REST client.
// HelloKahwin serves legacy image paths from a Node route handler
// (src/app/wp-content/[...path]/route.ts), so this is a plain indexed Drizzle
// lookup against the unique `wp_url` key — one ~200-byte row per request.

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { legacyImageRedirects } from '@/lib/db/schema/legacy-image-redirects';

export type LegacyImageRedirect = {
  id: string;
  imageDestinationUrl: string;
  articleDestinationUrl: string;
};

/**
 * Look up a single legacy WP image redirect by its source path (`wp_url`).
 *
 * Returns the redirect, or `null` on a miss OR on any error (DB blip,
 * half-populated row). The caller treats `null` as "not a known legacy URL"
 * and falls through to 404 — a transient DB failure never blocks the request.
 */
export async function lookupLegacyImageRedirect(path: string): Promise<LegacyImageRedirect | null> {
  try {
    const [row] = await db
      .select({
        id: legacyImageRedirects.id,
        imageDestinationUrl: legacyImageRedirects.imageDestinationUrl,
        articleDestinationUrl: legacyImageRedirects.articleDestinationUrl,
      })
      .from(legacyImageRedirects)
      .where(eq(legacyImageRedirects.wpUrl, path))
      .limit(1);

    if (!row?.imageDestinationUrl || !row?.articleDestinationUrl) return null;
    return row;
  } catch {
    return null;
  }
}
