import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * `duplicateArticleAction` used to clone only the DB row, so the copy's photos
 * physically lived in the SOURCE article's R2 folder — and deleting the source
 * destroyed them. That is how a published article on The Wedding Notebook lost its cover on
 * 2026-09-08.
 *
 * `duplicate-assets.test.ts` covers the pure helpers. This file covers the half
 * that decides what the admin is TOLD and what gets DELETED on the way out —
 * the two places where a bug is silent rather than loud:
 *
 *  - a copy that did not fully succeed must never be reported as clean;
 *  - the failure rollback must never delete photos belonging to an article that
 *    still exists, which is the very harm this feature was written to prevent.
 */

const h = vi.hoisted(() => ({
  r2Send: vi.fn(),
  deleteR2Objects: vi.fn(() => Promise.resolve()),
  // Rows the action's `db.select(...)` chain resolves to, in call order.
  selectQueue: [] as unknown[][],
  txShouldFail: { value: false },
  // Every `tx.insert(...).values(...)` payload, in call order.
  inserted: [] as unknown[],
}));

vi.mock('@/lib/audit/log', () => ({ logAuditEvent: vi.fn(), logAuditEventAsync: vi.fn() }));
vi.mock('@/lib/auth/admin', () => ({
  requireAdminSectionAction: vi.fn(() => Promise.resolve({ error: null, user: { id: 'admin-1' } })),
  checkIsSuperAdmin: vi.fn(() => Promise.resolve(false)),
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));
vi.mock('@aws-sdk/client-s3', () => ({
  GetObjectCommand: class {
    constructor(public input: unknown) {}
  },
  CopyObjectCommand: class {
    constructor(public input: unknown) {}
  },
  DeleteObjectCommand: class {
    constructor(public input: unknown) {}
  },
  ListObjectsV2Command: class {
    constructor(public input: unknown) {}
  },
}));
vi.mock('@/lib/r2/client', () => ({
  getR2Client: vi.fn(() => ({ send: h.r2Send })),
  getR2Bucket: vi.fn(() => 'inspire-bucket'),
  getR2PublicUrl: vi.fn(() => 'https://r2.dev'),
}));
vi.mock('@/lib/r2/delete', () => ({ deleteR2Objects: h.deleteR2Objects }));
vi.mock('@/lib/storage/image-variants', () => ({
  generateVariants: vi.fn(),
  getDefaultPresets: vi.fn(() => Promise.resolve([])),
}));
vi.mock('@/lib/storage/smart-crop', () => ({
  processSmartCrops: vi.fn(),
  resolveOriginalKey: vi.fn(),
  framingFromStoredOverride: vi.fn(),
}));
vi.mock('@/lib/seo/indexnow', () => ({ submitUrlToIndexNow: vi.fn() }));
vi.mock('@/lib/storage/lqip', () => ({ generateLqipForCover: vi.fn(() => Promise.resolve(null)) }));
vi.mock('@/lib/authors/queries', () => ({
  INSPIRE_AUTHORS_TAG: 'authors',
  listSelectableAuthors: vi.fn(),
}));

vi.mock('@/lib/db/drizzle', () => {
  const next = () => h.selectQueue.shift() ?? [];
  return {
    db: {
      select: () => ({
        from: () => ({
          where: () => {
            const rows = next();
            return Object.assign(Promise.resolve(rows), { limit: () => Promise.resolve(rows) });
          },
        }),
      }),
      transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
        if (h.txShouldFail.value) throw new Error('connection terminated');
        const tx = {
          insert: () => ({
            values: (v: unknown) => {
              h.inserted.push(v);
              return Object.assign(Promise.resolve(), {
                returning: () => Promise.resolve([{ id: 'new-article-1' }]),
                onConflictDoNothing: () => Promise.resolve(),
              });
            },
          }),
          select: () => ({ from: () => ({ where: () => Promise.resolve([]) }) }),
        };
        return fn(tx);
      },
    },
  };
});

import { duplicateArticleAction } from '../actions';
import { requireAdminSectionAction } from '@/lib/auth/admin';
import { logAuditEvent } from '@/lib/audit/log';

const COVER = 'https://r2.dev/inspire/zuan-yuan/1785-cover/high.webp';
const COVER_KEY = 'inspire/zuan-yuan/1785-cover/high.webp';

function article(cover: string | null, status = 'published') {
  return {
    id: 'article-1',
    title: 'Zuan Yuan',
    slug: 'zuan-yuan',
    status,
    content: null,
    coverImageUrl: cover,
    coverImageVariants: null,
    coverImageSmartCrops: null,
    coverImageQuality: 'high',
    coverImageFocalPoint: null,
    coverImageDetectionData: null,
    coverImageFocalPointOverride: null,
    primaryCategoryId: 'cat-1',
  };
}

/** R2 that holds exactly the source cover. */
function r2WithCover() {
  h.r2Send.mockImplementation(async (cmd: { constructor: { name: string } }) =>
    cmd.constructor.name === 'ListObjectsV2Command'
      ? { Contents: [{ Key: COVER_KEY }], IsTruncated: false }
      : {},
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  h.selectQueue.length = 0;
  h.inserted.length = 0;
  h.txShouldFail.value = false;
  h.deleteR2Objects.mockResolvedValue(undefined);
  h.r2Send.mockResolvedValue({ Contents: [], IsTruncated: false });
  vi.mocked(requireAdminSectionAction).mockResolvedValue({
    error: null,
    user: { id: 'admin-1' },
  } as never);
});

describe('duplicateArticleAction — access', () => {
  it('refuses a non-admin', async () => {
    vi.mocked(requireAdminSectionAction).mockResolvedValueOnce({
      error: 'Unauthorized',
      user: null,
    } as never);
    expect(await duplicateArticleAction('article-1')).toEqual({ error: 'Unauthorized' });
  });

  it('refuses to duplicate a deleted article', async () => {
    h.selectQueue.push([article(null, 'deleted')]);
    expect(await duplicateArticleAction('article-1')).toEqual({
      error: 'Cannot duplicate a deleted article',
    });
  });
});

describe('duplicateArticleAction — reporting a partial copy', () => {
  it('reports a clean success for a text-only article', async () => {
    h.selectQueue.push([article(null)]);
    expect(await duplicateArticleAction('article-1')).toMatchObject({
      success: true,
      assetsCopied: 0,
      assetsIncomplete: false,
    });
  });

  it('flags the copy as incomplete when a referenced folder holds nothing', async () => {
    // The silent case: the article points at an image directory R2 no longer
    // has. Nothing copies; without a counter the admin is told it succeeded
    // while the copy still shares the source's folder.
    h.selectQueue.push([article(COVER)]);
    h.r2Send.mockResolvedValue({ Contents: [], IsTruncated: false });

    const result = await duplicateArticleAction('article-1');

    expect(result).toMatchObject({ success: true, assetsCopied: 0, assetsIncomplete: true });
    expect(vi.mocked(logAuditEvent).mock.calls[0][0]).toMatchObject({
      action: 'duplicated',
      metadata: expect.objectContaining({ assetsCopied: 0 }),
    });
  });

  it('records copied and failed counts in the audit trail on a clean copy', async () => {
    h.selectQueue.push([article(COVER)]);
    r2WithCover();

    const result = await duplicateArticleAction('article-1');

    expect(result).toMatchObject({ success: true, assetsCopied: 1, assetsIncomplete: false });
    expect(vi.mocked(logAuditEvent).mock.calls[0][0]).toMatchObject({
      metadata: expect.objectContaining({ assetsCopied: 1, assetsFailed: 0 }),
    });
  });
});

describe('duplicateArticleAction — what the copy is made of', () => {
  it("points the copy's cover at its OWN folder, not the source's", async () => {
    h.selectQueue.push([article(COVER)]);
    r2WithCover();

    await duplicateArticleAction('article-1');

    const row = h.inserted[0] as { coverImageUrl: string; slug: string };
    expect(row.coverImageUrl).toMatch(
      /^https:\/\/r2\.dev\/inspire\/zuan-yuan-copy-[a-z0-9]+\/1785-cover\/high\.webp$/,
    );
    expect(row.coverImageUrl).toContain(`/inspire/${row.slug}/`);
    // The copy itself, written server-side within the same bucket.
    const copy = h.r2Send.mock.calls
      .map(([cmd]) => cmd as { constructor: { name: string }; input: Record<string, string> })
      .find((cmd) => cmd.constructor.name === 'CopyObjectCommand');
    expect(copy?.input).toMatchObject({
      Bucket: 'inspire-bucket',
      CopySource: `inspire-bucket/${COVER_KEY}`,
    });
  });

  it("keeps HelloKahwin's provenance rules: same authorship, review reset", async () => {
    h.selectQueue.push([
      { ...article(null), authorship: 'human', isAiGenerated: false, reviewStatus: 'reviewed' },
    ]);

    await duplicateArticleAction('article-1');

    expect(h.inserted[0]).toMatchObject({
      status: 'draft',
      authorship: 'human',
      isAiGenerated: false,
      reviewStatus: 'pending_review',
      humanReviewedAt: null,
    });
  });
});

describe('duplicateArticleAction — failure rollback', () => {
  beforeEach(() => {
    r2WithCover();
    h.txShouldFail.value = true;
  });

  it('returns an error rather than throwing, so the caller can show a toast', async () => {
    // Thrown from a server action awaited bare inside `startTransition`, a
    // rejection surfaces as NO toast at all — silence after real R2 work ran.
    h.selectQueue.push([article(COVER)], []); // source read, then: no survivor
    const result = await duplicateArticleAction('article-1');
    expect(result).toEqual({ error: 'Could not duplicate the article. Nothing was saved.' });
  });

  it('reclaims only the exact keys this run wrote, never a whole prefix', async () => {
    h.selectQueue.push([article(COVER)], []); // no survivor → reclaim
    await duplicateArticleAction('article-1');

    expect(h.deleteR2Objects).toHaveBeenCalledOnce();
    const deleted = h.deleteR2Objects.mock.calls[0][0] as unknown as string[];
    expect(deleted).toHaveLength(1);
    // The destination we copied, not the source and not a prefix. Two
    // duplications of the same title in the same millisecond share a slug, so a
    // prefix-wide delete would wipe the winner's objects.
    expect(deleted[0]).toMatch(/^inspire\/zuan-yuan-copy-[a-z0-9]+\/1785-cover\/high\.webp$/);
    expect(deleted[0]).not.toBe(COVER_KEY);
  });

  it('deletes NOTHING when the article turns out to have committed', async () => {
    // A dropped connection can reject AFTER the server committed. The copy is
    // live; deleting its objects would strip a real article of the very photos
    // we just gave it — the exact harm this feature exists to prevent.
    h.selectQueue.push([article(COVER)], [{ id: 'new-article-1' }]); // survivor found

    await duplicateArticleAction('article-1');

    expect(h.deleteR2Objects).not.toHaveBeenCalled();
  });
});
