'use server';

import { revalidatePath, revalidateTag, updateTag } from 'next/cache';
import { eq } from 'drizzle-orm';
import { PURGE_IMMEDIATELY } from '@/lib/cache/purge';
import { db } from '@/lib/db/drizzle';
import { inspireCategories } from '@/lib/db/schema/articles';
import { requireAdminSectionAction } from '@/lib/auth/admin';
import { INSPIRE_CATEGORIES_TAG } from '@/lib/inspire/cached-lists';
import { logAuditEvent } from '@/lib/audit/log';
import { generateSlug } from '@/lib/utils/slug';
import { nextClusterCode } from '@/lib/inspire/clusters';
import { clusterCreateSchema, clusterSettingsSchema } from './validation';

export type ClusterActionState = { error: string } | { success: true } | null;

/**
 * Same invalidation set as the category actions (`../categories/actions.ts`):
 * the category tag (editor selects, pillar view, up-link), the articles tag
 * (every article page carries the series box and the up-link), and the paths
 * an admin is looking at.
 */
function invalidate() {
  revalidatePath('/admin/inspire/clusters', 'layout');
  revalidatePath('/admin/inspire/categories');
  revalidatePath('/artikel');
  revalidateTag(INSPIRE_CATEGORIES_TAG, PURGE_IMMEDIATELY);
  updateTag(INSPIRE_CATEGORIES_TAG);
  revalidateTag('articles', PURGE_IMMEDIATELY);
}

function str(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === 'string' ? v : undefined;
}

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === '23505' || e?.cause?.code === '23505';
}

/**
 * Edit a pillar's or a cluster's settings. Which fields apply is decided from
 * the stored row, never from the form: a pillar takes the linking phrase and
 * intro, a cluster takes the linking phrase and its series-box settings.
 */
export async function updateClusterSettingsAction(
  _prev: unknown,
  formData: FormData,
): Promise<ClusterActionState> {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  const parsed = clusterSettingsSchema.safeParse({
    id: str(formData, 'id'),
    entityPhrase: str(formData, 'entityPhrase') ?? '',
    intro: str(formData, 'intro') ?? '',
    seriesDescription: str(formData, 'seriesDescription') ?? '',
    seriesEnabled: formData.get('seriesEnabled') === 'on',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  const input = parsed.data;

  const [row] = await db
    .select({
      id: inspireCategories.id,
      name: inspireCategories.name,
      isPillar: inspireCategories.isPillar,
      pillarCode: inspireCategories.pillarCode,
      parentId: inspireCategories.parentId,
    })
    .from(inspireCategories)
    .where(eq(inspireCategories.id, input.id))
    .limit(1);
  if (!row) return { error: 'That pillar or cluster no longer exists.' };

  let changes: Partial<typeof inspireCategories.$inferInsert>;
  if (row.isPillar) {
    changes = { entityPhrase: input.entityPhrase, intro: input.intro };
  } else {
    // Confirm it really is a cluster — a pillar code and a pillar parent — so
    // this form can never be used to edit an ordinary category.
    const parent = row.parentId
      ? (
          await db
            .select({ isPillar: inspireCategories.isPillar })
            .from(inspireCategories)
            .where(eq(inspireCategories.id, row.parentId))
            .limit(1)
        )[0]
      : undefined;
    if (!row.pillarCode || parent?.isPillar !== true) {
      return { error: 'Only pillars and clusters can be edited here.' };
    }
    changes = {
      entityPhrase: input.entityPhrase,
      seriesEnabled: input.seriesEnabled,
      seriesDescription: input.seriesDescription,
    };
  }

  await db
    .update(inspireCategories)
    .set({ ...changes, updatedAt: new Date() })
    .where(eq(inspireCategories.id, row.id));

  logAuditEvent({
    entityType: 'inspire_category',
    entityId: row.id,
    action: 'updated',
    performedBy: user.id,
    metadata: { name: row.name, kind: row.isPillar ? 'pillar' : 'cluster', ...changes },
  });

  invalidate();
  return { success: true };
}

/**
 * Add a cluster under a pillar. The cluster code (`C3.5`) is assigned here:
 * without one the article page does not treat the category as a cluster, so a
 * code-less "cluster" would look created and silently do nothing.
 */
export async function createClusterAction(
  _prev: unknown,
  formData: FormData,
): Promise<ClusterActionState> {
  const { error: authError, user } = await requireAdminSectionAction('inspire');
  if (authError || !user) return { error: authError ?? 'Unauthorized' };

  const parsed = clusterCreateSchema.safeParse({
    pillarId: str(formData, 'pillarId'),
    name: str(formData, 'name') ?? '',
    slug: str(formData, 'slug') || undefined,
    entityPhrase: str(formData, 'entityPhrase') ?? '',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  const input = parsed.data;

  const [pillar] = await db
    .select({
      id: inspireCategories.id,
      isPillar: inspireCategories.isPillar,
      pillarCode: inspireCategories.pillarCode,
    })
    .from(inspireCategories)
    .where(eq(inspireCategories.id, input.pillarId))
    .limit(1);
  if (!pillar?.isPillar) return { error: 'Choose a pillar to add the cluster under.' };

  const siblings = await db
    .select({
      pillarCode: inspireCategories.pillarCode,
      displayOrder: inspireCategories.displayOrder,
    })
    .from(inspireCategories)
    .where(eq(inspireCategories.parentId, pillar.id));

  const code = nextClusterCode(
    pillar.pillarCode,
    siblings.map((s) => s.pillarCode),
  );
  if (!code) {
    return { error: 'This pillar has no pillar code (P1–P7), so clusters cannot be added to it.' };
  }

  const slug = input.slug || generateSlug(input.name);
  if (!slug) return { error: 'Enter a name made of letters or numbers.' };
  const displayOrder = siblings.reduce((max, s) => Math.max(max, s.displayOrder ?? 0), -1) + 1;

  let created: { id: string } | undefined;
  try {
    [created] = await db
      .insert(inspireCategories)
      .values({
        name: input.name,
        slug,
        parentId: pillar.id,
        pillarCode: code,
        entityPhrase: input.entityPhrase,
        isPillar: false,
        displayOrder,
      })
      .returning({ id: inspireCategories.id });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return {
        error: `A category with the web address "${slug}" already exists. Try another name.`,
      };
    }
    throw err;
  }

  logAuditEvent({
    entityType: 'inspire_category',
    entityId: created!.id,
    action: 'created',
    performedBy: user.id,
    metadata: { name: input.name, slug, parentId: pillar.id, pillarCode: code, kind: 'cluster' },
  });

  invalidate();
  return { success: true };
}
