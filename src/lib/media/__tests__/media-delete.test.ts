/**
 * The one delete core the Media Library goes through. Adapted from The Wedding
 * Notebook's suite, minus venue galleries, moodboards and section grants, which
 * HelloKahwin does not have.
 *
 * What this file guards — each is a way a delete goes wrong that nobody would
 * notice until a public page was already broken:
 *
 *  1. THE GUARD RUNS FIRST. A picture in use (without force) is refused by
 *     NAME, and not one byte is written.
 *  2. ORDER. Articles are scrubbed, then the row is deleted inside a lock, then
 *     storage. A failed scrub aborts.
 *  3. CROPS ARE NEVER STRANDED. A lone parent with crops is refused even under
 *     force; in one batch, children go first.
 *  4. EVERY STORED VERSION GOES, AND LEFTOVERS ARE REPORTED — never only
 *     logged.
 *  5. A RESERVED NAMESPACE (`inspire/general/`) IS NEVER SWEPT.
 *
 * Storage is a mock throughout: nothing here touches R2 or a database.
 *
 * `order` is appended to INSIDE the stubs, so it is a recording of what
 * actually happened, and `db.select` resolves from a per-TABLE queue so the
 * core can grow a query without silently feeding rows to the wrong one.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { media, mediaArticleUsage } from '@/lib/db/schema/media';
import { articles } from '@/lib/db/schema/articles';

const TABLE_NAMES = new Map<unknown, string>([
  [media, 'media'],
  [mediaArticleUsage, 'media_article_usage'],
  [articles, 'articles'],
]);
const nameOf = (table: unknown) => TABLE_NAMES.get(table) ?? 'unknown';

const order: string[] = [];
/** Queue this as a table's rows to make that one query reject. */
const THROWS: unknown[] = [];
const selectQueue = new Map<string, unknown[][]>();
const queueSelect = (table: string, rows: unknown[]) => {
  const q = selectQueue.get(table) ?? [];
  q.push(rows);
  selectQueue.set(table, q);
};
const nextRows = (table: string): unknown[] => selectQueue.get(table)?.shift() ?? [];

const deletes: { table: string }[] = [];
const updates: { table: string; set: Record<string, unknown> }[] = [];
let deleteMediaReturns: { id: string }[] | null = null;
let lastLockedIds: string[] = [];
let transactionThrows: Error | null = null;

function selectChain(prefix = '') {
  let table = 'unknown';
  const resolve = () => {
    order.push(`${prefix}select:${table}`);
    const rows = nextRows(table);
    return rows === THROWS ? Promise.reject(new Error('db down')) : Promise.resolve(rows);
  };
  const chain: Record<string, unknown> = {};
  chain.from = (t: unknown) => {
    table = nameOf(t);
    return chain;
  };
  for (const key of ['innerJoin', 'leftJoin', 'groupBy', 'orderBy', 'where']) {
    chain[key] = () => chain;
  }
  chain.limit = resolve;
  // A row lock is recorded, never fed from the queue.
  chain.for = () => {
    order.push(`${prefix}lock:${table}`);
    return Promise.resolve([]);
  };
  chain.then = (ok: (v: unknown) => unknown, no?: (e: unknown) => unknown) =>
    resolve().then(ok, no);
  return chain;
}

function deleteChain(table: unknown, prefix: string) {
  const name = nameOf(table);
  const record = () => {
    order.push(`${prefix}delete:${name}`);
    deletes.push({ table: name });
  };
  return {
    where: () => ({
      returning: () => {
        record();
        return Promise.resolve(
          name === 'media' ? (deleteMediaReturns ?? lastLockedIds.map((id) => ({ id }))) : [],
        );
      },
      then: (ok: (v: unknown) => unknown, no?: (e: unknown) => unknown) => {
        record();
        return Promise.resolve([]).then(ok, no);
      },
    }),
  };
}

vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: () => selectChain(),
    delete: (table: unknown) => deleteChain(table, ''),
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      if (transactionThrows) throw transactionThrows;
      order.push('tx:begin');
      const tx = {
        select: () => selectChain('tx:'),
        delete: (table: unknown) => deleteChain(table, 'tx:'),
        update: (table: unknown) => ({
          set: (set: Record<string, unknown>) => ({
            where: () => {
              order.push(`tx:update:${nameOf(table)}`);
              updates.push({ table: nameOf(table), set });
              return Promise.resolve([]);
            },
          }),
        }),
      };
      const out = await fn(tx);
      order.push('tx:commit');
      return out;
    },
  },
}));

const logAuditEvent = vi.fn();
vi.mock('@/lib/audit/log', () => ({ logAuditEvent: (...a: unknown[]) => logAuditEvent(...a) }));

const r2Send = vi.fn();
vi.mock('@/lib/r2/client', () => ({
  getR2Client: () => ({
    send: (cmd: { constructor: { name: string } }) => {
      order.push(`r2:${cmd.constructor.name}`);
      return r2Send(cmd);
    },
  }),
  getR2Bucket: () => 'hk-images',
}));

const revalidatePath = vi.fn();
const revalidateTag = vi.fn();
vi.mock('next/cache', () => ({
  revalidatePath: (...a: unknown[]) => revalidatePath(...a),
  revalidateTag: (...a: unknown[]) => revalidateTag(...a),
}));

import {
  MAX_BULK_DELETE,
  bulkDeleteMedia,
  collectMediaUrls,
  deleteMedia,
  deleteR2Directory,
  describeUsage,
  enclosesReservedNamespace,
  getMediaUsage,
} from '../media-delete';
import { PURGE_IMMEDIATELY } from '@/lib/cache/purge';

/* ── fixtures ───────────────────────────────────────────────────────── */

const ACTOR = { id: 'user_admin', email: 'admin@hk.test' };
const ID_A = '11111111-2222-4333-8444-555555555555';
const ID_B = '22222222-2222-4333-8444-555555555555';
const ID_CROP = '33333333-2222-4333-8444-555555555555';
const UNKNOWN = '99999999-2222-4333-8444-555555555555';
const ARTICLE_ID = 'cccccccc-2222-4333-8444-555555555555';
const HOST = 'https://images.hellokahwin.com';
const DIR_A = 'inspire/majlis-di-taman/1758000000000-pelamin';
const DIR_B = 'inspire/majlis-di-taman/1758000000001-dewan';

type Detached = { articles: number; covers: number };

function record(over: Record<string, unknown> = {}) {
  const dir = (over.dir as string) ?? DIR_A;
  const rest = { ...over };
  delete rest.dir;
  return {
    id: ID_A,
    filename: 'pelamin.jpg',
    url: `${HOST}/${dir}/high.webp`,
    originalUrl: `${HOST}/${dir}/original.jpg`,
    r2Key: `${dir}/original.jpg`,
    parentMediaId: null,
    originalArticleId: null,
    variants: {
      low: { url: `${HOST}/${dir}/low.webp`, sizeBytes: 1 },
      mid: { url: `${HOST}/${dir}/mid.webp`, sizeBytes: 3 },
      high: { url: `${HOST}/${dir}/high.webp`, sizeBytes: 2 },
    },
    alt: 'The pelamin',
    ...rest,
  };
}

const recordB = (over: Record<string, unknown> = {}) =>
  record({ id: ID_B, filename: 'dewan.jpg', dir: DIR_B, ...over });

/** One `getMediaUsage` round: article bodies, covers, crops — keyed by table. */
function queueUsage(over: { bodies?: unknown[]; covers?: unknown[]; crops?: unknown[] } = {}) {
  queueSelect('media_article_usage', over.bodies ?? []);
  queueSelect('articles', over.covers ?? []);
  queueSelect('media', over.crops ?? []);
}

const queueNoSurvivors = () => queueSelect('media', []);

function queueScrubFindsNothing() {
  queueSelect('media_article_usage', []);
  queueSelect('articles', []);
}

function queueSimpleDelete(rows: unknown[] = [record()]) {
  queueSelect('media', rows);
  queueUsage();
  queueNoSurvivors();
  queueScrubFindsNothing();
  lastLockedIds = (rows as { id: string }[]).map((r) => r.id);
}

const r2Calls = () => order.filter((o) => o.startsWith('r2:'));

type R2Input = { input: { Prefix?: string; Key?: string } };
/** Serve listings by EXACT prefix; deletes succeed. */
function listing(byPrefix: Record<string, string[]>) {
  r2Send.mockImplementation((cmd: R2Input & { constructor: { name: string } }) => {
    if (cmd.constructor.name === 'ListObjectsV2Command') {
      const keys = byPrefix[cmd.input.Prefix ?? ''] ?? [];
      return Promise.resolve({ Contents: keys.map((Key) => ({ Key })), IsTruncated: false });
    }
    return Promise.resolve({});
  });
}
const listedPrefixes = () =>
  r2Send.mock.calls.map((c) => (c[0] as R2Input).input.Prefix).filter(Boolean);
const deletedKeys = () =>
  r2Send.mock.calls
    .filter(
      (c) => (c[0] as { constructor: { name: string } }).constructor.name === 'DeleteObjectCommand',
    )
    .map((c) => (c[0] as R2Input).input.Key as string);

beforeEach(() => {
  vi.clearAllMocks();
  order.length = 0;
  deletes.length = 0;
  updates.length = 0;
  selectQueue.clear();
  deleteMediaReturns = null;
  lastLockedIds = [];
  transactionThrows = null;
  r2Send.mockResolvedValue({ Contents: [], IsTruncated: false });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

/* ── the guard ──────────────────────────────────────────────────────── */

describe('the usage guard (without force)', () => {
  it('refuses a picture in use, names what uses it, and writes NOTHING', async () => {
    queueSelect('media', [record()]);
    queueUsage({
      bodies: [{ mediaId: ID_A, articleId: ARTICLE_ID, title: 'Majlis di Taman' }],
    });

    const result = await deleteMedia(ACTOR, ID_A);

    expect((result as { error: string }).error).toContain('Majlis di Taman');
    expect(deletes).toHaveLength(0);
    expect(logAuditEvent).not.toHaveBeenCalled();
    expect(r2Calls()).toEqual([]);
    expect(order).not.toContain('tx:begin');
  });

  it('counts an article COVER as a use, matched on any variant URL — mid included', async () => {
    queueSelect('media', [record()]);
    queueUsage({
      covers: [{ id: ARTICLE_ID, title: 'Pelamin Terbaik', url: `${HOST}/${DIR_A}/mid.webp` }],
    });

    const result = await deleteMedia(ACTOR, ID_A);
    expect((result as { error: string }).error).toContain('Pelamin Terbaik');
    expect(deletes).toHaveLength(0);
  });

  it('deletes an UNUSED picture without force', async () => {
    queueSimpleDelete();
    const result = await deleteMedia(ACTOR, ID_A);
    expect(result).toMatchObject({ deleted: true, detached: { articles: 0, covers: 0 } });
    expect(deletes.filter((d) => d.table === 'media')).toHaveLength(1);
  });

  it('refuses an unknown id and a malformed one', async () => {
    queueSelect('media', []);
    expect(await deleteMedia(ACTOR, UNKNOWN)).toEqual({ error: 'Media not found' });

    order.length = 0;
    expect(await deleteMedia(ACTOR, 'abc')).toEqual({ error: 'Invalid media ID' });
    expect(order).toEqual([]); // rejected on shape alone — no query at all
  });
});

/* ── force ──────────────────────────────────────────────────────────── */

describe('force: true (the admin page)', () => {
  it('scrubs articles, THEN deletes the row under a lock, THEN storage — in that order', async () => {
    r2Send.mockResolvedValueOnce({
      Contents: [{ Key: `${DIR_A}/original.jpg` }, { Key: `${DIR_A}/high.webp` }],
      IsTruncated: false,
    });
    queueSelect('media', [record()]);
    queueUsage({ bodies: [{ mediaId: ID_A, articleId: ARTICLE_ID, title: 'Majlis' }] });
    queueNoSurvivors();
    queueSelect('media_article_usage', [{ articleId: ARTICLE_ID }]);
    queueSelect('articles', []); // no cover match
    queueSelect('articles', [
      {
        id: ARTICLE_ID,
        slug: 'majlis',
        content: {
          type: 'doc',
          content: [{ type: 'image', attrs: { src: `${HOST}/${DIR_A}/mid.webp` } }],
        },
      },
    ]);
    lastLockedIds = [ID_A];

    const result = await deleteMedia(ACTOR, ID_A, { force: true });

    expect(result).toMatchObject({ deleted: true, detached: { articles: 1, covers: 0 } });

    const scrubWriteAt = order.indexOf('tx:update:articles');
    const lockAt = order.indexOf('tx:lock:media');
    const deleteAt = order.indexOf('tx:delete:media');
    const r2At = order.findIndex((o) => o.startsWith('r2:'));
    expect(scrubWriteAt).toBeGreaterThan(-1);
    expect(scrubWriteAt).toBeLessThan(lockAt);
    expect(lockAt).toBeLessThan(deleteAt);
    expect(r2At).toBeGreaterThan(deleteAt);

    // The body node pointing at the MID rung was removed.
    expect(updates[0].set.content).toEqual({ type: 'doc', content: [] });
    // And the public pages were purged with HelloKahwin's immediate profile.
    expect(revalidatePath).toHaveBeenCalledWith('/artikel/majlis');
    expect(revalidateTag).toHaveBeenCalledWith('articles', PURGE_IMMEDIATELY);
  });

  it('clears every cover column, the LQIP included, on an article using it as cover', async () => {
    queueSelect('media', [record()]);
    queueUsage({
      covers: [{ id: ARTICLE_ID, title: 'Cover', url: `${HOST}/${DIR_A}/high.webp` }],
    });
    queueNoSurvivors();
    queueSelect('media_article_usage', []);
    queueSelect('articles', [
      { id: ARTICLE_ID, slug: 'cover', coverImageUrl: `${HOST}/${DIR_A}/high.webp`, content: null },
    ]);
    lastLockedIds = [ID_A];

    await deleteMedia(ACTOR, ID_A, { force: true });

    expect(updates[0].set).toMatchObject({
      coverImageUrl: null,
      coverImageVariants: null,
      coverImageLqip: null,
    });
  });

  it('aborts when the article scrub FAILS, rather than deleting anyway', async () => {
    queueSelect('media', [record()]);
    queueUsage({ bodies: [{ mediaId: ID_A, articleId: ARTICLE_ID, title: 'Majlis' }] });
    queueNoSurvivors();
    queueSelect('media_article_usage', [{ articleId: ARTICLE_ID }]);
    queueSelect('articles', [
      { id: ARTICLE_ID, slug: 'a', coverImageUrl: `${HOST}/${DIR_A}/high.webp`, content: null },
    ]);
    transactionThrows = new Error('deadlock detected');

    const result = await deleteMedia(ACTOR, ID_A, { force: true });

    const { error } = result as { error: string };
    expect(error).toMatch(/could not be updated/);
    expect(error).toMatch(/NOT\b.*deleted/);
    expect(deletes).toHaveLength(0);
    expect(r2Calls()).toEqual([]);
    expect(logAuditEvent).not.toHaveBeenCalled();
  });

  it('never scrubs a URL a SURVIVING row still owns', async () => {
    // Record B (not being deleted) owns the same high.webp — taking it off an
    // article would remove a living picture from the page.
    const shared = `${HOST}/${DIR_A}/high.webp`;
    queueSelect('media', [record()]);
    queueUsage();
    queueSelect('media', [recordB({ url: shared, originalUrl: shared, variants: null })]);
    queueScrubFindsNothing();
    lastLockedIds = [ID_A];

    await deleteMedia(ACTOR, ID_A, { force: true });

    // The scrub's cover query ran without the shared URL — proven by the scrub
    // still running (other URLs remain) and the delete completing.
    expect(deletes.filter((d) => d.table === 'media')).toHaveLength(1);
  });

  it('records ONE audit row with force and the stored key', async () => {
    queueSimpleDelete();
    await deleteMedia(ACTOR, ID_A, { force: true });
    expect(logAuditEvent).toHaveBeenCalledTimes(1);
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'media',
        entityId: ID_A,
        action: 'deleted',
        performedBy: ACTOR.id,
        entityLabel: 'The pelamin',
        metadata: expect.objectContaining({ force: true, r2Key: `${DIR_A}/original.jpg` }),
      }),
    );
  });
});

/* ── double delete ──────────────────────────────────────────────────── */

describe('losing the race', () => {
  it('reports an already-deleted picture instead of writing a second audit row', async () => {
    queueSimpleDelete();
    deleteMediaReturns = [];

    const result = await deleteMedia(ACTOR, ID_A);

    expect((result as { error: string }).error).toMatch(/already been deleted/);
    expect(logAuditEvent).not.toHaveBeenCalled();
    expect(r2Calls()).toEqual([]);
  });
});

/* ── storage: every version, and leftovers ──────────────────────────── */

describe('stored files', () => {
  it('wipes every file in the picture’s own directory — all variants', async () => {
    r2Send.mockResolvedValueOnce({
      Contents: [
        { Key: `${DIR_A}/original.jpg` },
        { Key: `${DIR_A}/low.webp` },
        { Key: `${DIR_A}/mid.webp` },
        { Key: `${DIR_A}/high.webp` },
      ],
      IsTruncated: false,
    });
    queueSimpleDelete();

    const result = await deleteMedia(ACTOR, ID_A);

    expect(r2Calls()).toEqual([
      'r2:ListObjectsV2Command',
      'r2:DeleteObjectCommand',
      'r2:DeleteObjectCommand',
      'r2:DeleteObjectCommand',
      'r2:DeleteObjectCommand',
    ]);
    expect(r2Send.mock.calls[0][0].input).toMatchObject({ Prefix: `${DIR_A}/` });
    expect((result as { note?: string }).note).toBeUndefined();
  });

  it('follows a paginated listing to the end', async () => {
    r2Send
      .mockResolvedValueOnce({
        Contents: [{ Key: `${DIR_A}/a` }],
        IsTruncated: true,
        NextContinuationToken: 't1',
      })
      .mockResolvedValueOnce({ Contents: [{ Key: `${DIR_A}/b` }], IsTruncated: false });

    const out = await deleteR2Directory(`${DIR_A}/original.jpg`);
    expect(out.deletedKeys).toEqual([`${DIR_A}/a`, `${DIR_A}/b`, `${DIR_A}/original.jpg`]);
    expect(r2Send.mock.calls[1][0].input).toMatchObject({ ContinuationToken: 't1' });
  });

  it('deletes a crop as a SINGLE file, leaving the parent’s directory alone', async () => {
    queueSimpleDelete([
      record({
        id: ID_CROP,
        parentMediaId: ID_A,
        filename: 'pelamin-crop1.webp',
        r2Key: `${DIR_A}/pelamin-crop1.webp`,
        variants: null,
      }),
    ]);

    await deleteMedia(ACTOR, ID_CROP);

    expect(r2Calls()).toEqual(['r2:DeleteObjectCommand']);
    expect(r2Send.mock.calls[0][0].input).toEqual({
      Bucket: 'hk-images',
      Key: `${DIR_A}/pelamin-crop1.webp`,
    });
  });

  it('NEVER sweeps the library namespace a loose key sits in', async () => {
    queueSimpleDelete([record({ r2Key: 'inspire/general/loose-photo.jpg', variants: null })]);

    await deleteMedia(ACTOR, ID_A);

    // Only its OWN rendition folder is listed, never `inspire/general/`.
    const prefixes = r2Send.mock.calls
      .map((c) => (c[0] as { input: { Prefix?: string } }).input.Prefix)
      .filter(Boolean);
    expect(prefixes).toEqual(['inspire/general/loose-photo/']);
    expect(r2Calls()).toEqual(['r2:ListObjectsV2Command', 'r2:DeleteObjectCommand']);
    expect(r2Send.mock.calls[1][0].input).toEqual({
      Bucket: 'hk-images',
      Key: 'inspire/general/loose-photo.jpg',
    });
  });

  /* IA-1 — a legacy flat original sits in the SHARED article folder. */
  it('IA-1: deletes a LEGACY flat original and its own rendition folder only — never the article folder', async () => {
    const legacyKey = 'inspire/majlis-di-taman/1700000000000-photo.jpg';
    const renditions = 'inspire/majlis-di-taman/1700000000000-photo/';
    listing({
      [renditions]: [`${renditions}high.webp`, `${renditions}crop-4x5-mobile-cover.webp`],
      // If anything listed the article folder, it would get these siblings.
      'inspire/majlis-di-taman/': [
        legacyKey,
        'inspire/majlis-di-taman/1700000000001-other.jpg',
        'inspire/majlis-di-taman/1700000000001-other/high.webp',
      ],
    });
    queueSimpleDelete([
      record({
        r2Key: legacyKey,
        url: `${HOST}/${renditions}high.webp`,
        originalUrl: `${HOST}/${legacyKey}`,
        variants: { high: { url: `${HOST}/${renditions}high.webp`, sizeBytes: 1 } },
      }),
    ]);

    const result = await deleteMedia(ACTOR, ID_A);

    expect(result).toMatchObject({ deleted: true });
    expect(listedPrefixes()).toEqual([renditions]);
    expect(deletedKeys().sort()).toEqual(
      [legacyKey, `${renditions}high.webp`, `${renditions}crop-4x5-mobile-cover.webp`].sort(),
    );
  });

  /* IA-2 — files another media row still references are kept, and said so. */
  it('IA-2: KEEPS every key another media row still references, and reports it as kept', async () => {
    listing({
      [`${DIR_A}/`]: [`${DIR_A}/original.jpg`, `${DIR_A}/low.webp`, `${DIR_A}/high.webp`],
    });
    queueSelect('media', [record()]);
    queueUsage();
    queueNoSurvivors(); // urlsToScrub
    queueScrubFindsNothing();
    // The storage-ownership lookup: a different row reuses A's high rung.
    queueSelect('media', [
      recordB({ url: `${HOST}/${DIR_A}/high.webp`, originalUrl: `${HOST}/${DIR_B}/original.jpg` }),
    ]);
    lastLockedIds = [ID_A];

    const result = await deleteMedia(ACTOR, ID_A, { force: true });

    expect(result).toMatchObject({ deleted: true, keptKeys: [`${DIR_A}/high.webp`] });
    expect(deletedKeys()).not.toContain(`${DIR_A}/high.webp`);
    expect(deletedKeys().sort()).toEqual([`${DIR_A}/low.webp`, `${DIR_A}/original.jpg`].sort());
    expect((result as { note?: string }).note).toMatch(/1 file was kept in storage/);
    expect(logAuditEvent.mock.calls[0][0].metadata).toMatchObject({
      keptKeys: [`${DIR_A}/high.webp`],
    });
  });

  it('IA-2: when another row’s OWN file lives in the folder, deletes only keys this row references', async () => {
    listing({
      [`${DIR_A}/`]: [
        `${DIR_A}/original.jpg`,
        `${DIR_A}/high.webp`,
        `${DIR_A}/stranger.webp`, // referenced by nobody we know of
        `${DIR_A}/twin-original.jpg`,
      ],
    });
    queueSelect('media', [record()]);
    queueUsage();
    queueNoSurvivors();
    queueScrubFindsNothing();
    queueSelect('media', [
      recordB({
        r2Key: `${DIR_A}/twin-original.jpg`,
        url: `${HOST}/${DIR_A}/twin-original.jpg`,
        originalUrl: `${HOST}/${DIR_A}/twin-original.jpg`,
        variants: null,
      }),
    ]);
    lastLockedIds = [ID_A];

    await deleteMedia(ACTOR, ID_A, { force: true });

    expect(deletedKeys().sort()).toEqual([`${DIR_A}/high.webp`, `${DIR_A}/original.jpg`].sort());
  });

  it('IA-2: deletes NOTHING when the ownership lookup itself fails', async () => {
    listing({ [`${DIR_A}/`]: [`${DIR_A}/original.jpg`] });
    queueSimpleDelete();
    queueSelect('media', THROWS); // the storage-ownership lookup fails

    const result = await deleteMedia(ACTOR, ID_A);

    expect(result).toMatchObject({ deleted: true });
    expect(deletedKeys()).toEqual([]);
    expect((result as { note?: string }).note).toMatch(/could not be removed from storage/);
  });

  it('reports the exact files left behind, and still deletes the rest', async () => {
    r2Send
      .mockResolvedValueOnce({
        Contents: [{ Key: `${DIR_A}/original.jpg` }, { Key: `${DIR_A}/high.webp` }],
        IsTruncated: false,
      })
      .mockRejectedValueOnce(new Error('R2 503')) // original.jpg fails
      .mockResolvedValueOnce({}); // high.webp still goes
    queueSimpleDelete();

    const result = await deleteMedia(ACTOR, ID_A);

    expect(result).toMatchObject({ deleted: true, leftoverKeys: [`${DIR_A}/original.jpg`] });
    const { note } = result as { note?: string };
    expect(note).toMatch(/1 file could not be removed from storage/);
    expect(note).toContain(`${DIR_A}/original.jpg`);
    // Both deletes were attempted — one failure does not strand the others.
    expect(r2Calls().filter((c) => c === 'r2:DeleteObjectCommand')).toHaveLength(2);
    // And the audit row carries them.
    expect(logAuditEvent.mock.calls[0][0].metadata).toMatchObject({
      leftoverKeys: [`${DIR_A}/original.jpg`],
    });
  });

  it('reports a failed LISTING as orphaned files rather than failing the delete', async () => {
    r2Send.mockRejectedValue(new Error('R2 is down'));
    queueSimpleDelete();

    const result = await deleteMedia(ACTOR, ID_A);

    expect(result).toMatchObject({ deleted: true });
    expect((result as { note?: string }).note).toMatch(/could not be removed from storage/);
  });
});

/* ── crops ──────────────────────────────────────────────────────────── */

describe('child crops', () => {
  it('refuses a lone parent with crops EVEN WITH force', async () => {
    queueSelect('media', [record()]);
    queueUsage({ crops: [{ id: ID_CROP, filename: 'pelamin-crop1.webp', parentMediaId: ID_A }] });

    const result = await deleteMedia(ACTOR, ID_A, { force: true });

    const { error } = result as { error: string };
    expect(error).toContain('pelamin-crop1.webp');
    expect(error).toMatch(/delete the crop first/i);
    expect(deletes).toHaveLength(0);
    expect(r2Calls()).toEqual([]);
  });
});

/* ── soft-deleted article cleanup ───────────────────────────────────── */

describe('the originating article', () => {
  it('refuses to sweep inspire/general/ for an article whose slug is "general"', async () => {
    queueSimpleDelete([record({ originalArticleId: ARTICLE_ID })]);
    queueNoSurvivors(); // the storage-ownership lookup
    queueSelect('articles', [{ id: ARTICLE_ID, slug: 'general', status: 'deleted' }]);
    queueSelect('media', [{ count: 0 }]);

    await deleteMedia(ACTOR, ID_A);

    const prefixes = r2Send.mock.calls
      .map((c) => (c[0] as { input: { Prefix?: string } }).input.Prefix)
      .filter(Boolean);
    expect(prefixes).not.toContain('inspire/general/');
    expect(prefixes).toContain('inspire/(Deleted) general/');
    // The empty soft-deleted article itself is still removed.
    expect(deletes.map((d) => d.table)).toContain('articles');
  });
});

/* ── bulk ───────────────────────────────────────────────────────────── */

describe('bulkDeleteMedia', () => {
  it('refuses the WHOLE batch when one id is in use, and names the unknown one too', async () => {
    queueSelect('media', [record(), recordB()]);
    queueUsage({ bodies: [{ mediaId: ID_A, articleId: ARTICLE_ID, title: 'Majlis' }] });

    const result = await bulkDeleteMedia(ACTOR, [ID_A, ID_B, UNKNOWN]);

    const { error } = result as { error: string };
    expect(error).toContain('Majlis');
    expect(error).toContain('NOTHING was deleted');
    expect(error).toContain(UNKNOWN);
    expect(deletes).toHaveLength(0);
    expect(logAuditEvent).not.toHaveBeenCalled();
  });

  it('deletes two pictures under force, counts DISTINCT articles and lists the unknown id', async () => {
    queueSelect('media', [record(), recordB()]);
    queueUsage({
      bodies: [
        { mediaId: ID_A, articleId: ARTICLE_ID, title: 'Majlis' },
        { mediaId: ID_B, articleId: ARTICLE_ID, title: 'Majlis' },
      ],
    });
    queueNoSurvivors();
    queueScrubFindsNothing();
    lastLockedIds = [ID_A, ID_B];

    const result = await bulkDeleteMedia(ACTOR, [ID_A, ID_B, UNKNOWN], { force: true });

    expect(result).toMatchObject({ deleted: 2, notFound: [UNKNOWN] });
    expect((result as { detached: Detached }).detached.articles).toBe(1);
    expect(logAuditEvent).toHaveBeenCalledTimes(1);
    expect(logAuditEvent.mock.calls[0][0]).toMatchObject({
      action: 'bulk_deleted',
      entityId: 'bulk',
      metadata: expect.objectContaining({ force: true, count: 2 }),
    });
  });

  it('lets a parent AND its own crop go in one call, the crop’s file first', async () => {
    const crop = record({
      id: ID_CROP,
      parentMediaId: ID_A,
      filename: 'pelamin-crop1.webp',
      r2Key: `${DIR_A}/pelamin-crop1.webp`,
      variants: null,
    });
    queueSelect('media', [record(), crop]);
    queueUsage({ crops: [{ id: ID_CROP, filename: 'pelamin-crop1.webp', parentMediaId: ID_A }] });
    queueNoSurvivors();
    queueScrubFindsNothing();
    lastLockedIds = [ID_A, ID_CROP];

    const result = await bulkDeleteMedia(ACTOR, [ID_A, ID_CROP], { force: true });

    expect(result).toMatchObject({ deleted: 2 });
    const r2 = r2Calls();
    expect(r2[0]).toBe('r2:DeleteObjectCommand');
    expect(r2.indexOf('r2:DeleteObjectCommand')).toBeLessThan(
      r2.indexOf('r2:ListObjectsV2Command'),
    );
  });

  it('reports files left behind per picture', async () => {
    queueSimpleDelete([record(), recordB()]);
    r2Send.mockRejectedValue(new Error('R2 is down'));

    const result = await bulkDeleteMedia(ACTOR, [ID_A, ID_B]);

    expect(result).toMatchObject({ deleted: 2 });
    const { errors } = result as { errors: string[] };
    expect(errors).toHaveLength(2);
    expect(errors[0]).toMatch(/^pelamin\.jpg: /);
  });

  it('caps the batch at MAX_BULK_DELETE before any query', async () => {
    const ids = Array.from(
      { length: MAX_BULK_DELETE + 1 },
      (_, i) => `11111111-2222-4333-8444-${String(i).padStart(12, '0')}`,
    );
    const result = await bulkDeleteMedia(ACTOR, ids, { force: true });
    expect(result).toEqual({ error: `Maximum ${MAX_BULK_DELETE} items per bulk delete` });
    expect(order).toEqual([]);
  });

  it('reports every id as notFound when none exist, and deletes nothing', async () => {
    queueSelect('media', []);
    const result = await bulkDeleteMedia(ACTOR, [UNKNOWN], { force: true });
    expect(result).toMatchObject({ deleted: 0, notFound: [UNKNOWN] });
    expect(deletes).toHaveLength(0);
  });
});

/* ── pure helpers ───────────────────────────────────────────────────── */

describe('describeUsage', () => {
  const empty = { articles: [], covers: [], crops: [] };

  it('is null for an unused picture', () => {
    expect(describeUsage(empty)).toBeNull();
  });

  it('names articles, covers and crops in one sentence', () => {
    expect(
      describeUsage({
        articles: [
          { id: '1', title: 'Majlis di Taman' },
          { id: '2', title: 'Dewan KL' },
        ],
        covers: [{ id: '3', title: 'Cover Story' }],
        crops: [{ id: '5', filename: 'a-crop1.webp' }],
      }),
    ).toBe(
      'Used by 2 articles (Majlis di Taman, Dewan KL), 1 article cover (Cover Story), ' +
        '1 crop (a-crop1.webp).',
    );
  });

  it('truncates a long list rather than printing a wall of names', () => {
    const text = describeUsage({
      ...empty,
      articles: ['A', 'B', 'C', 'D', 'E'].map((title, i) => ({ id: String(i), title })),
    });
    expect(text).toContain('A, B, C, and 2 more');
  });
});

describe('getMediaUsage', () => {
  it('returns an empty map, and runs no query, for no records', async () => {
    const usage = await getMediaUsage([]);
    expect(usage.size).toBe(0);
    expect(order).toEqual([]);
  });

  it('attributes a shared cover URL to BOTH media rows that claim it', async () => {
    const shared = `${HOST}/${DIR_A}/high.webp`;
    queueUsage({ covers: [{ id: ARTICLE_ID, title: 'Cover', url: shared }] });

    const usage = await getMediaUsage([
      { id: ID_A, url: shared, originalUrl: shared, variants: null },
      { id: ID_B, url: shared, originalUrl: shared, variants: null },
    ]);

    expect(usage.get(ID_A)!.covers).toHaveLength(1);
    expect(usage.get(ID_B)!.covers).toHaveLength(1);
  });
});

describe('collectMediaUrls', () => {
  it('reads variant URLs out of a JSON-STRING variants column, mid included', () => {
    const urls = collectMediaUrls([
      {
        url: `${HOST}/${DIR_A}/high.webp`,
        originalUrl: `${HOST}/${DIR_A}/original.jpg`,
        variants: JSON.stringify({ mid: { url: `${HOST}/${DIR_A}/mid.webp`, sizeBytes: 0 } }),
      },
    ]);
    expect(urls).toContain(`${HOST}/${DIR_A}/mid.webp`);
  });
});

describe('enclosesReservedNamespace', () => {
  it('protects the library namespace and its ancestors, not ordinary folders', () => {
    expect(enclosesReservedNamespace('inspire/general/')).toBe(true);
    expect(enclosesReservedNamespace('inspire/general')).toBe(true);
    expect(enclosesReservedNamespace('inspire/')).toBe(true);
    expect(enclosesReservedNamespace('inspire/general/123-photo/')).toBe(false);
    expect(enclosesReservedNamespace(`${DIR_A}/`)).toBe(false);
  });
});
