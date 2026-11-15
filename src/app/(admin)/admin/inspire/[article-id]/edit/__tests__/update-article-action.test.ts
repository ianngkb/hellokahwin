import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `updateArticleAction` — the three behaviours ported from The Wedding
 * Notebook's editor: the excerpt write, the refusal to store a `blob:` upload
 * preview, and tags that persist only as part of a save (in the same
 * transaction as the article row). The database is mocked as a recorder: no
 * test here reaches Postgres.
 */

const ARTICLE_ID = '11111111-1111-4111-8111-111111111111';
const TAG_A = '22222222-2222-4222-8222-222222222222';
const TAG_B = '33333333-3333-4333-8333-333333333333';

type Call = { op: string; table?: unknown; args?: unknown; via: 'db' | 'tx' };

const h = vi.hoisted(() => ({
  auth: vi.fn(),
  audit: vi.fn(),
  selectResults: [] as unknown[][],
  calls: [] as { op: string; table?: unknown; args?: unknown; via: 'db' | 'tx' }[],
  transactions: 0,
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock('next/server', () => ({ after: vi.fn() }));
vi.mock('@/lib/auth/admin', () => ({
  requireAdminSectionAction: (...args: unknown[]) => h.auth(...args),
}));
vi.mock('@/lib/audit/log', () => ({ logAuditEvent: (...a: unknown[]) => h.audit(...a) }));
vi.mock('@/lib/authors/queries', () => ({
  INSPIRE_AUTHORS_TAG: 'inspire-authors',
  listSelectableAuthors: vi.fn(async () => []),
}));
vi.mock('@/lib/r2/client', () => ({ getR2Client: vi.fn(), getR2Bucket: vi.fn() }));
vi.mock('@/lib/storage/image-variants', () => ({
  generateVariants: vi.fn(),
  getDefaultPresets: vi.fn(),
}));
vi.mock('@/lib/storage/lqip', () => ({ generateLqipForCover: vi.fn(async () => null) }));
vi.mock('@/lib/storage/smart-crop', () => ({
  processSmartCrops: vi.fn(),
  resolveOriginalKey: vi.fn(),
  framingFromStoredOverride: vi.fn(),
}));

vi.mock('@/lib/db/drizzle', () => {
  // A chain whose every builder method returns itself and which resolves to
  // `result` when awaited — enough to stand in for any drizzle query shape.
  const chain = (result: () => unknown, record: (op: string, args: unknown) => void) => {
    const self: Record<string, unknown> = {};
    for (const m of [
      'from',
      'where',
      'limit',
      'leftJoin',
      'innerJoin',
      'orderBy',
      'returning',
      'onConflictDoUpdate',
      'onConflictDoNothing',
    ]) {
      self[m] = () => self;
    }
    self.set = (args: unknown) => {
      record('set', args);
      return self;
    };
    self.values = (args: unknown) => {
      record('values', args);
      return self;
    };
    self.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(result()).then(resolve, reject);
    return self;
  };

  const api = (via: 'db' | 'tx') => ({
    select: () =>
      chain(
        () => h.selectResults.shift() ?? [],
        () => {},
      ),
    update: (table: unknown) =>
      chain(
        () => [],
        (op, args) => h.calls.push({ op: `update.${op}`, table, args, via }),
      ),
    insert: (table: unknown) =>
      chain(
        () => [],
        (op, args) => h.calls.push({ op: `insert.${op}`, table, args, via }),
      ),
    delete: (table: unknown) => {
      h.calls.push({ op: 'delete', table, via });
      return chain(
        () => [],
        () => {},
      );
    },
  });

  return {
    db: {
      ...api('db'),
      transaction: async (fn: (tx: unknown) => unknown) => {
        h.transactions++;
        return fn(api('tx'));
      },
    },
  };
});

import { updateArticleAction } from '../actions';
import { articles, articleTags } from '@/lib/db/schema/articles';

const BLOB = 'blob:https://hellokahwin.com/77ad2be3-ae0f-44e6-9c64-c463853cd622';

function articleSets(): Record<string, unknown>[] {
  return h.calls
    .filter((c: Call) => c.op === 'update.set' && c.table === articles)
    .map((c: Call) => c.args as Record<string, unknown>);
}

beforeEach(() => {
  vi.clearAllMocks();
  h.calls.length = 0;
  h.selectResults.length = 0;
  h.transactions = 0;
  h.auth.mockResolvedValue({ error: null, user: { id: 'admin-1' } });
});

describe('blob: upload previews are never stored', () => {
  it('refuses content carrying a blob: image src before any write', async () => {
    const result = await updateArticleAction(ARTICLE_ID, {
      content: {
        type: 'doc',
        content: [{ type: 'figureBlock', attrs: { src: BLOB, alt: 'Dress.jpg' } }],
      },
    });
    expect(result.error).toMatch(/^1 image \(Dress\.jpg\) has not finished uploading\./);
    expect(h.calls).toEqual([]);
    expect(h.transactions).toBe(0);
  });

  it('refuses a cover image that is still a blob: preview', async () => {
    const result = await updateArticleAction(ARTICLE_ID, { coverImageUrl: BLOB });
    expect(result.error).toMatch(/cover image has not finished uploading/);
    expect(h.calls).toEqual([]);
  });

  it('saves content whose images are real URLs', async () => {
    h.selectResults.push([{ title: 'T', status: 'draft' }]);
    const result = await updateArticleAction(ARTICLE_ID, {
      content: {
        type: 'doc',
        content: [{ type: 'image', attrs: { src: 'https://images.hellokahwin.com/a.webp' } }],
      },
    });
    expect(result).toMatchObject({ success: true });
    expect(articleSets()).toHaveLength(1);
  });
});

describe('excerpt', () => {
  it('writes a trimmed excerpt', async () => {
    h.selectResults.push([{ title: 'T', status: 'draft' }]);
    await updateArticleAction(ARTICLE_ID, { excerpt: '  A short blurb.  ' });
    expect(articleSets()[0]).toMatchObject({ excerpt: 'A short blurb.' });
  });

  it('stores an emptied box as NULL, not an empty string', async () => {
    h.selectResults.push([{ title: 'T', status: 'draft' }]);
    await updateArticleAction(ARTICLE_ID, { excerpt: '   ' });
    expect(articleSets()[0]).toHaveProperty('excerpt', null);
  });

  it('leaves the column alone when the save does not send it', async () => {
    h.selectResults.push([{ title: 'T', status: 'draft' }]);
    await updateArticleAction(ARTICLE_ID, { title: 'New title' });
    expect(articleSets()[0]).not.toHaveProperty('excerpt');
  });
});

describe('tags persist only as part of a save', () => {
  it('writes a changed tag set in the SAME transaction as the article row', async () => {
    h.selectResults.push([{ title: 'T', status: 'published' }]); // audit snapshot
    h.selectResults.push([{ id: TAG_A }]); // stored tags
    const result = await updateArticleAction(ARTICLE_ID, { tagIds: [TAG_A, TAG_B, TAG_B] });

    expect(result).toMatchObject({ success: true });
    expect(h.transactions).toBe(1);
    const txOps = h.calls.filter((c: Call) => c.via === 'tx').map((c: Call) => c.op);
    expect(txOps).toEqual(['update.set', 'delete', 'insert.values']);
    const inserted = h.calls.find((c: Call) => c.op === 'insert.values' && c.table === articleTags);
    // Duplicates collapse to one row each.
    expect(inserted?.args).toEqual([
      { articleId: ARTICLE_ID, tagId: TAG_A },
      { articleId: ARTICLE_ID, tagId: TAG_B },
    ]);
    expect(h.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'tags_updated', metadata: { tagIds: [TAG_A, TAG_B] } }),
    );
  });

  it('an empty list really clears the tags', async () => {
    h.selectResults.push([{ title: 'T', status: 'draft' }]);
    h.selectResults.push([{ id: TAG_A }]);
    await updateArticleAction(ARTICLE_ID, { tagIds: [] });
    const txOps = h.calls.filter((c: Call) => c.via === 'tx').map((c: Call) => c.op);
    expect(txOps).toEqual(['update.set', 'delete']);
  });

  it('an unchanged set (the autosave case) rewrites nothing', async () => {
    h.selectResults.push([{ title: 'T', status: 'draft' }]);
    h.selectResults.push([{ id: TAG_B }, { id: TAG_A }]);
    await updateArticleAction(ARTICLE_ID, { tagIds: [TAG_A, TAG_B] }, { silent: true });
    expect(h.transactions).toBe(0);
    expect(h.calls.some((c: Call) => c.table === articleTags)).toBe(false);
    expect(h.audit).not.toHaveBeenCalledWith(expect.objectContaining({ action: 'tags_updated' }));
  });

  it('omitted tagIds (a degraded tag read) never touches the tag rows', async () => {
    h.selectResults.push([{ title: 'T', status: 'draft' }]);
    await updateArticleAction(ARTICLE_ID, { title: 'x' });
    expect(h.calls.some((c: Call) => c.table === articleTags)).toBe(false);
    expect(h.selectResults).toEqual([]);
  });

  it('rejects a tag id that is not a uuid, naming the field', async () => {
    const result = await updateArticleAction(ARTICLE_ID, { tagIds: ['not-a-uuid'] });
    expect(result.error).toMatch(/^Tags/);
    expect(h.calls).toEqual([]);
  });
});
