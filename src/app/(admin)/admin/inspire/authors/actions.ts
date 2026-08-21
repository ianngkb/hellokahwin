'use server';

import { revalidatePath, revalidateTag, updateTag } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { profiles } from '@/lib/db/schema/profiles';
import { requireAdminSectionAction } from '@/lib/auth/admin';
import { logAuditEvent } from '@/lib/audit/log';
import { diffFields } from '@/lib/audit/diff';
import { authorProfileSchema } from '@/lib/validations/article';
import { INSPIRE_AUTHORS_TAG } from '@/lib/authors/queries';
import { authorArchivePath, authorDisplayName } from '@/lib/authors/gate';

/**
 * Postgres unique-violation, raised by the partial unique index
 * `profiles_author_slug_unique`.
 *
 * The index is the real duplicate guard and this is what catches it. There is
 * deliberately NO pre-checking SELECT: two admins saving the same slug in the
 * same second would both pass a pre-check, and the loser would get a raw 500
 * instead of a sentence they can act on. Same arrangement as the credit-type
 * actions.
 */
const PG_UNIQUE_VIOLATION = '23505';

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' && err !== null && 'code' in err && err.code === PG_UNIQUE_VIOLATION
  );
}

/**
 * Bust every surface that renders an author.
 *
 * `revalidateTag('articles', 'max')` is the load-bearing one and is NOT
 * optional. Article pages are `export const revalidate = false` — cached until
 * something busts a tag — and the byline, the avatar and the author box are
 * baked into that cached HTML. Without this, an edited bio or a de-listed
 * author would never reach a reader; the page has no TTL to self-heal on.
 *
 * `updateTag` is the server-action-only variant that gives read-your-own-writes,
 * so the admin who just saved sees the new value on the very next render
 * instead of after the 300s TTL on `listSelectableAuthors`.
 *
 * Archive paths are revalidated for BOTH slugs when a slug changes: the old
 * path must start 404ing and the new one must start existing.
 */
function revalidateAuthorSurfaces(slugs: (string | null | undefined)[]) {
  revalidatePath('/admin/inspire/authors');
  revalidatePath('/artikel');
  revalidateTag(INSPIRE_AUTHORS_TAG, 'max');
  updateTag(INSPIRE_AUTHORS_TAG);
  revalidateTag('articles', 'max');
  for (const slug of new Set(slugs.filter(Boolean) as string[])) {
    revalidatePath(authorArchivePath(slug));
  }
}

/**
 * Save one profile's public-author fields.
 *
 * UPDATE ONLY — this action never inserts or deletes a `profiles` row. There is
 * no "delete author" here by design: de-listing someone is unticking
 * `is_public_author`, which leaves their articles attributed and their history
 * intact while the archive page 404s and every byline reverts to plain text.
 */
export async function updateAuthorProfileAction(_prev: unknown, formData: FormData) {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  const parsed = authorProfileSchema.safeParse({
    profileId: formData.get('profileId'),
    authorSlug: formData.get('authorSlug') ?? '',
    // The checkbox is absent from the payload when unticked, which is exactly
    // the "make this person private again" case — so its absence must read as
    // `false`, never as "field omitted".
    isPublicAuthor: formData.get('isPublicAuthor') === 'on',
    authorTitle: formData.get('authorTitle') ?? '',
    authorBio: formData.get('authorBio') ?? '',
    authorWebsiteUrl: formData.get('authorWebsiteUrl') ?? '',
    authorInstagramUrl: formData.get('authorInstagramUrl') ?? '',
    authorLinkedinUrl: formData.get('authorLinkedinUrl') ?? '',
    avatarUrl: formData.get('avatarUrl') ?? '',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const input = parsed.data;

  // Only staff accounts may become public authors. Checked against the stored
  // row rather than anything the form sent: `profiles` holds every couple and
  // vendor on the site, and a posted `profileId` is just a string.
  const [before] = await db
    .select({
      role: profiles.role,
      firstName: profiles.firstName,
      lastName: profiles.lastName,
      authorSlug: profiles.authorSlug,
      isPublicAuthor: profiles.isPublicAuthor,
      authorTitle: profiles.authorTitle,
      authorBio: profiles.authorBio,
      authorWebsiteUrl: profiles.authorWebsiteUrl,
      authorInstagramUrl: profiles.authorInstagramUrl,
      authorLinkedinUrl: profiles.authorLinkedinUrl,
      avatarUrl: profiles.avatarUrl,
    })
    .from(profiles)
    .where(eq(profiles.id, input.profileId))
    .limit(1);

  if (!before) return { error: 'Profile not found' };
  if (before.role !== 'admin') {
    return { error: 'Only admin accounts can be public authors' };
  }

  // Empty string is the form's "cleared" signal for every optional field; NULL
  // is what the gate and the render sites test against, so normalise here once
  // rather than leaving '' in the column to be falsy-checked forever.
  const updateData = {
    authorSlug: input.authorSlug || null,
    isPublicAuthor: input.isPublicAuthor,
    authorTitle: input.authorTitle || null,
    authorBio: input.authorBio || null,
    authorWebsiteUrl: input.authorWebsiteUrl || null,
    authorInstagramUrl: input.authorInstagramUrl || null,
    authorLinkedinUrl: input.authorLinkedinUrl || null,
    avatarUrl: input.avatarUrl || null,
    updatedAt: new Date(),
  };

  try {
    await db.update(profiles).set(updateData).where(eq(profiles.id, input.profileId));
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { error: `The slug “${input.authorSlug}” is already used by another author` };
    }
    throw err;
  }

  logAuditEvent({
    entityType: 'profile',
    entityId: input.profileId,
    action: 'author_profile_updated',
    performedBy: user.id,
    entityLabel: authorDisplayName(before),
    changes: diffFields(before, updateData, [
      'authorSlug',
      'isPublicAuthor',
      'authorTitle',
      'authorBio',
      'authorWebsiteUrl',
      'authorInstagramUrl',
      'authorLinkedinUrl',
      'avatarUrl',
    ]),
  });

  revalidateAuthorSurfaces([before.authorSlug, updateData.authorSlug]);
  return { success: true };
}
