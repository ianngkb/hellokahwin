import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The versions sheet's server actions. The key property under test: a restore
 * is a SAVE through `updateArticleAction` — the editor's own save path — so
 * every HelloKahwin save rule (blob guard, Pinterest rule, LQIP, audit,
 * redirects, cache) applies to it. The database and the save are mocked.
 */

const ARTICLE_ID = '11111111-1111-4111-8111-111111111111';
const VERSION_ID = '44444444-4444-4444-8444-444444444444';
const TAG_A = '22222222-2222-4222-8222-222222222222';
const TAG_GONE = '33333333-3333-4333-8333-333333333333';

const h = vi.hoisted(() => ({
  auth: vi.fn(),
  audit: vi.fn(),
  update: vi.fn(),
  getVersion: vi.fn(),
  list: vi.fn(),
  current: vi.fn(),
  tagNames: vi.fn(),
  selectResults: [] as unknown[][],
  updateSets: [] as unknown[],
  returning: [] as unknown[][],
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock('@/lib/auth/admin', () => ({
  requireAdminSectionAction: (...a: unknown[]) => h.auth(...a),
}));
vi.mock('@/lib/audit/log', () => ({ logAuditEvent: (...a: unknown[]) => h.audit(...a) }));
vi.mock('../actions', () => ({ updateArticleAction: (...a: unknown[]) => h.update(...a) }));
vi.mock('@/lib/articles/versioning', () => ({
  getArticleVersion: (...a: unknown[]) => h.getVersion(...a),
  listArticleVersions: (...a: unknown[]) => h.list(...a),
  readCurrentSnapshot: (...a: unknown[]) => h.current(...a),
  readTagNames: (...a: unknown[]) => h.tagNames(...a),
}));
vi.mock('@/lib/db/drizzle', () => {
  const chain = (result: () => unknown) => {
    const self: Record<string, unknown> = {};
    for (const m of ['from', 'where', 'limit']) self[m] = () => self;
    self.set = (v: unknown) => {
      h.updateSets.push(v);
      return self;
    };
    self.returning = () => Promise.resolve(h.returning.shift() ?? []);
    self.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve(result()).then(res, rej);
    return self;
  };
  return {
    db: {
      select: () => chain(() => h.selectResults.shift() ?? []),
      update: () => chain(() => []),
    },
  };
});

import {
  getVersionDetailAction,
  listVersionsAction,
  renameVersionAction,
  restoreVersionAction,
} from '../version-actions';

function versionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: VERSION_ID,
    articleId: ARTICLE_ID,
    versionNumber: 3,
    actorType: 'human',
    createdBy: 'admin-1',
    createdByLabel: 'ed@hk.test',
    label: null,
    note: null,
    title: 'Old title',
    excerpt: 'Old blurb',
    content: {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Old words here' }] }],
    },
    coverImageUrl: 'https://images.hellokahwin.com/old.webp',
    coverImageVariants: null,
    coverImageQuality: 'high',
    coverImageFocalPoint: null,
    coverImageDetectionData: null,
    coverImageSmartCrops: null,
    coverImageFocalPointOverride: null,
    metaTitle: null,
    metaDescription: 'Old description',
    pinterestBoardName: 'Old board',
    tagIds: [TAG_A, TAG_GONE],
    createdAt: new Date('2026-11-01T00:00:00Z'),
    updatedAt: new Date('2026-11-01T00:10:00Z'),
    createdTxid: 1,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  h.selectResults.length = 0;
  h.updateSets.length = 0;
  h.returning.length = 0;
  h.auth.mockResolvedValue({ error: null, user: { id: 'admin-1', email: 'ed@hk.test' } });
  h.update.mockResolvedValue({ success: true, affectsPublic: true });
});

describe('every action uses HelloKahwin admin auth', () => {
  it('refuses a signed-out caller before touching anything', async () => {
    h.auth.mockResolvedValue({ error: 'Unauthorized', user: null });
    expect(await listVersionsAction(ARTICLE_ID)).toEqual({ error: 'Unauthorized' });
    expect(await restoreVersionAction(ARTICLE_ID, VERSION_ID)).toEqual({ error: 'Unauthorized' });
    expect(await getVersionDetailAction(ARTICLE_ID, VERSION_ID)).toEqual({ error: 'Unauthorized' });
    expect(await renameVersionAction(ARTICLE_ID, VERSION_ID, 'x')).toEqual({
      error: 'Unauthorized',
    });
    expect(h.getVersion).not.toHaveBeenCalled();
    expect(h.update).not.toHaveBeenCalled();
  });

  it('rejects malformed ids before they reach a uuid column', async () => {
    expect(await restoreVersionAction('nope', VERSION_ID)).toEqual({ error: 'Invalid ID' });
    expect(await restoreVersionAction(ARTICLE_ID, 'nope')).toEqual({ error: 'Invalid ID' });
    expect(h.getVersion).not.toHaveBeenCalled();
  });
});

describe('restoreVersionAction', () => {
  it('restores through the normal save, named "Restored from vN", leaving URL/status/category alone', async () => {
    h.getVersion.mockResolvedValue(versionRow());
    h.selectResults.push([{ id: TAG_A }]); // TAG_GONE was deleted since

    const result = await restoreVersionAction(ARTICLE_ID, VERSION_ID);

    expect(result).toEqual({ success: true, versionNumber: 3, skippedTagCount: 1 });
    expect(h.update).toHaveBeenCalledTimes(1);
    const [articleId, data, options] = h.update.mock.calls[0];
    expect(articleId).toBe(ARTICLE_ID);
    expect(options).toEqual({ versionLabel: 'Restored from v3' });
    expect(data).toMatchObject({
      title: 'Old title',
      excerpt: 'Old blurb',
      metaTitle: '',
      metaDescription: 'Old description',
      pinterestBoardName: 'Old board',
      coverImageUrl: 'https://images.hellokahwin.com/old.webp',
      tagIds: [TAG_A],
    });
    for (const key of ['slug', 'status', 'primaryCategoryId', 'authorId', 'publishedAt']) {
      expect(data).not.toHaveProperty(key);
    }
    expect(h.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'version_restored',
        performedBy: 'admin-1',
        metadata: expect.objectContaining({ versionNumber: 3, skippedTagIds: [TAG_GONE] }),
      }),
    );
  });

  it("surfaces the save's own refusal (e.g. the blob-preview guard) and logs no restore", async () => {
    h.getVersion.mockResolvedValue(versionRow({ tagIds: [] }));
    h.update.mockResolvedValue({
      error: '1 image (Dress.jpg) has not finished uploading. Wait for it to finish.',
    });

    const result = await restoreVersionAction(ARTICLE_ID, VERSION_ID);

    expect(result).toEqual({
      error:
        'Could not restore v3: 1 image (Dress.jpg) has not finished uploading. Wait for it to finish.',
    });
    expect(h.audit).not.toHaveBeenCalled();
  });

  it('a version of another article (or a deleted one) is refused before any save', async () => {
    h.getVersion.mockResolvedValue(null);
    const result = await restoreVersionAction(ARTICLE_ID, VERSION_ID);
    expect(result).toEqual({ error: 'That version no longer exists. Nothing was changed.' });
    expect(h.getVersion).toHaveBeenCalledWith(ARTICLE_ID, VERSION_ID);
    expect(h.update).not.toHaveBeenCalled();
  });

  it('a save that throws becomes an error, never an unhandled rejection', async () => {
    h.getVersion.mockResolvedValue(versionRow({ tagIds: [] }));
    h.update.mockRejectedValue(new Error('pool exhausted'));
    expect(await restoreVersionAction(ARTICLE_ID, VERSION_ID)).toEqual({
      error: 'Could not restore that version. Nothing was changed.',
    });
  });
});

describe('listVersionsAction', () => {
  it('returns dates as ISO strings for the client', async () => {
    h.list.mockResolvedValue([
      {
        id: VERSION_ID,
        versionNumber: 2,
        actorType: 'human',
        label: 'Before refresh',
        note: null,
        createdByLabel: 'ed@hk.test',
        createdAt: new Date('2026-11-01T00:00:00Z'),
        updatedAt: new Date('2026-11-01T00:10:00Z'),
        title: 'T',
      },
    ]);
    const result = await listVersionsAction(ARTICLE_ID);
    expect(result).toMatchObject({
      success: true,
      versions: [{ versionNumber: 2, updatedAt: '2026-11-01T00:10:00.000Z' }],
    });
  });

  it('degrades to an error (not a throw) when the history table is missing', async () => {
    h.list.mockRejectedValue(new Error('relation "article_versions" does not exist'));
    expect(await listVersionsAction(ARTICLE_ID)).toEqual({
      error: 'Could not load the version history.',
    });
  });
});

describe('getVersionDetailAction', () => {
  it('compares the version with the article now', async () => {
    h.getVersion.mockResolvedValue(versionRow({ tagIds: [TAG_A] }));
    h.current.mockResolvedValue({
      ...versionRow({ tagIds: [TAG_A] }),
      title: 'New title',
      content: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'New words' }] }],
      },
    });
    h.tagNames.mockResolvedValue(new Map([[TAG_A, 'Pelamin']]));

    const result = await getVersionDetailAction(ARTICLE_ID, VERSION_ID);
    if (!('success' in result)) throw new Error(result.error);
    const { detail } = result;
    expect(detail.changes.map((c) => c.label)).toEqual(['Title', 'Body']);
    expect(detail.onlyInVersion).toEqual(['Old words here']);
    expect(detail.onlyInCurrent).toEqual(['New words']);
    expect(detail.tagNames).toEqual(['Pelamin']);
    expect(detail.wordCount).toBe(3);
  });
});

describe('renameVersionAction', () => {
  it('renames only the version row, scoped to the article', async () => {
    h.returning.push([{ versionNumber: 3 }]);
    const result = await renameVersionAction(ARTICLE_ID, VERSION_ID, '  Before   refresh ');
    expect(result).toEqual({ success: true, label: 'Before refresh' });
    expect(h.updateSets).toEqual([{ label: 'Before refresh' }]);
    expect(h.update).not.toHaveBeenCalled(); // not a save of the article
  });

  it('refuses a name over 80 characters', async () => {
    const result = await renameVersionAction(ARTICLE_ID, VERSION_ID, 'x'.repeat(81));
    expect(result).toEqual({ error: 'A version name is limited to 80 characters.' });
    expect(h.updateSets).toEqual([]);
  });
});
