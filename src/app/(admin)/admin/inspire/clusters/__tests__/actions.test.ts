import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';

/**
 * The clusters admin actions (R14) against a hand-rolled Drizzle double.
 *
 * Each builder (`select`, `insert`, `update`, `delete`) returns a chain that
 * records every method called on it and resolves to the next queued result for
 * its kind. That is enough to prove what each action refuses, what it writes,
 * what it audits and what it revalidates — without a database.
 *
 * Cascade expectations (enforced by the FKs in
 * `migrations-pending/series.sql`, so documented here rather than
 * mocked): `deleteClusterAction` deletes ONLY the `article_clusters` row — the
 * membership rows go with it through `ON DELETE CASCADE`, and no `articles`
 * row is ever written. The tests below assert that no statement touches
 * `articles` beyond reading it.
 */

const h = vi.hoisted(() => ({
  auth: { error: null as string | null, user: { id: 'admin-1' } as { id: string } | null },
  queue: {
    select: [] as unknown[][],
    insert: [] as unknown[][],
    update: [] as unknown[][],
    delete: [] as unknown[][],
  },
  calls: [] as { kind: string; table: string; methods: { name: string; args: unknown[] }[] }[],
  throwOn: null as null | { kind: string; error: unknown },
  transactions: 0,
}));

vi.mock('@/lib/auth/admin', () => ({
  requireAdminSectionAction: vi.fn(() => Promise.resolve(h.auth)),
}));
vi.mock('@/lib/audit/log', () => ({ logAuditEvent: vi.fn() }));
vi.mock('@/lib/inspire/article-series', () => ({ getArticleClusterMemberships: vi.fn() }));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}));

function tableName(t: unknown): string {
  if (!t || typeof t !== 'object') return 'unknown';
  const sym = Object.getOwnPropertySymbols(t).find((s) => String(s) === 'Symbol(drizzle:Name)');
  return sym ? String((t as Record<symbol, unknown>)[sym]) : 'unknown';
}

vi.mock('@/lib/db/drizzle', () => {
  function chain(kind: 'select' | 'insert' | 'update' | 'delete', table: unknown) {
    const call = {
      kind,
      table: tableName(table),
      methods: [] as { name: string; args: unknown[] }[],
    };
    h.calls.push(call);
    const proxy: Record<string, unknown> = new Proxy(
      {},
      {
        get(_t, prop) {
          if (prop === 'then') {
            return (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
              if (h.throwOn && h.throwOn.kind === kind) {
                const err = h.throwOn.error;
                h.throwOn = null;
                return Promise.reject(err).then(resolve, reject);
              }
              return Promise.resolve(h.queue[kind].shift() ?? []).then(resolve, reject);
            };
          }
          return (...args: unknown[]) => {
            call.methods.push({ name: String(prop), args });
            // `select().from(table)` names its table in `from`.
            if (prop === 'from' || prop === 'innerJoin') {
              if (call.table === 'unknown' && prop === 'from') call.table = tableName(args[0]);
            }
            return proxy;
          };
        },
      },
    );
    return proxy;
  }
  const db = {
    select: () => chain('select', undefined),
    insert: (t: unknown) => chain('insert', t),
    update: (t: unknown) => chain('update', t),
    delete: (t: unknown) => chain('delete', t),
    transaction: async (fn: (tx: unknown) => unknown) => {
      h.transactions++;
      return fn(db);
    },
  };
  return { db };
});

import { requireAdminSectionAction } from '@/lib/auth/admin';
import { logAuditEvent } from '@/lib/audit/log';
import { revalidatePath, revalidateTag, updateTag } from 'next/cache';
import {
  addClusterMemberAction,
  addClusterMembersAction,
  createClusterAction,
  deleteClusterAction,
  removeClusterMemberAction,
  renameClusterAction,
  reorderClusterMembersAction,
  getArticleSeriesPanelAction,
  searchClusterArticlesAction,
  updateClusterSeriesAction,
} from '../actions';
import { getArticleClusterMemberships } from '@/lib/inspire/article-series';
import {
  CLUSTER_DESCRIPTION_MAX,
  CLUSTER_EYEBROW_MAX,
  MAX_CLUSTER_MEMBERS,
} from '@/lib/validations/article-cluster';
import { PURGE_IMMEDIATELY } from '@/lib/cache/purge';

const CLUSTER = '11111111-1111-4111-8111-111111111111';
const A1 = '22222222-2222-4222-8222-222222222222';
const A2 = '33333333-3333-4333-8333-333333333333';
const A3 = '44444444-4444-4444-8444-444444444444';

function pgError(code: string) {
  return Object.assign(new Error(`pg ${code}`), { code });
}

/** Every statement that WROTE something (not a read). */
const writes = () => h.calls.filter((c) => c.kind !== 'select');
const methodNames = (i: number) => h.calls[i].methods.map((m) => m.name);
const arg = (i: number, method: string) => h.calls[i].methods.find((m) => m.name === method)?.args;

/** A Drizzle condition rendered to the SQL Postgres would receive. */
const dialect = new PgDialect();
function render(cond: unknown): { sql: string; params: unknown[] } {
  return dialect.sqlToQuery(cond as SQL);
}
/** The live-article predicate every visible-member read must carry. */
function expectHidesSoftDeleted(cond: unknown) {
  const q = render(cond);
  const marker = '"articles"."status" <> $';
  const at = q.sql.indexOf(marker);
  expect(at, q.sql).toBeGreaterThanOrEqual(0);
  const n = Number(q.sql.slice(at + marker.length).match(/^\d+/)?.[0]);
  expect(q.params[n - 1]).toBe('deleted');
}

beforeEach(() => {
  vi.clearAllMocks();
  h.auth = { error: null, user: { id: 'admin-1' } };
  h.queue = { select: [], insert: [], update: [], delete: [] };
  h.calls = [];
  h.throwOn = null;
  h.transactions = 0;
});

afterEach(() => {
  // Undo every vi.spyOn (e.g. the silenced console.error) so a no-op spy never
  // leaks into a later test and hides a real error there.
  vi.restoreAllMocks();
});

describe('auth', () => {
  const calls: [string, () => Promise<unknown>][] = [
    ['create', () => createClusterAction({ name: 'Budget' })],
    ['rename', () => renameClusterAction({ id: CLUSTER, name: 'Budget' })],
    ['delete', () => deleteClusterAction(CLUSTER)],
    ['add', () => addClusterMemberAction({ clusterId: CLUSTER, articleId: A1 })],
    ['remove', () => removeClusterMemberAction({ clusterId: CLUSTER, articleId: A1 })],
    ['reorder', () => reorderClusterMembersAction({ clusterId: CLUSTER, orderedArticleIds: [A1] })],
  ];

  it.each(calls)('%s refuses a non-admin before touching the database', async (_n, run) => {
    h.auth = { error: 'Unauthorized', user: null };
    expect(await run()).toEqual({ error: 'Unauthorized' });
    expect(h.calls).toHaveLength(0);
    expect(logAuditEvent).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each(calls)('%s checks the inspire section', async (_n, run) => {
    h.auth = { error: 'Forbidden', user: null };
    await run();
    expect(requireAdminSectionAction).toHaveBeenCalledWith('inspire');
  });
});

describe('createClusterAction', () => {
  it.each(['', '   ', undefined as unknown as string])(
    'refuses a blank name (%j) with "Cluster name is required"',
    async (name) => {
      expect(await createClusterAction({ name })).toEqual({ error: 'Cluster name is required' });
      expect(h.calls).toHaveLength(0);
    },
  );

  it('inserts the trimmed name with no slug, audits and revalidates', async () => {
    h.queue.insert.push([{ id: CLUSTER, name: 'Budget weddings' }]);
    const result = await createClusterAction({ name: '  Budget weddings  ' });
    expect(result).toEqual({ success: true, id: CLUSTER });

    expect(h.calls).toHaveLength(1);
    expect(h.calls[0].table).toBe('article_clusters');
    const values = h.calls[0].methods.find((m) => m.name === 'values')?.args[0];
    expect(values).toEqual({ name: 'Budget weddings', slug: null });

    expect(logAuditEvent).toHaveBeenCalledWith({
      entityType: 'article_cluster',
      entityId: CLUSTER,
      entityLabel: 'Budget weddings',
      action: 'created',
      performedBy: 'admin-1',
    });
    expect(revalidatePath).toHaveBeenCalledWith('/admin/inspire/clusters');
  });

  it('a database failure is a friendly message, not a throw, and is not audited', async () => {
    h.throwOn = { kind: 'insert', error: new Error('connection reset') };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await createClusterAction({ name: 'Budget' })).toEqual({
      error: 'Could not create the cluster — please try again.',
    });
    expect(logAuditEvent).not.toHaveBeenCalled();
  });
});

describe('renameClusterAction', () => {
  it('refuses a blank name', async () => {
    expect(await renameClusterAction({ id: CLUSTER, name: ' ' })).toEqual({
      error: 'Cluster name is required',
    });
    expect(h.calls).toHaveLength(0);
  });

  it('refuses a malformed id without querying', async () => {
    expect(await renameClusterAction({ id: 'nope', name: 'X' })).toEqual({
      error: 'Invalid cluster ID',
    });
    expect(h.calls).toHaveLength(0);
  });

  it('renames, audits old → new and revalidates the cluster pages and tag', async () => {
    h.queue.select.push([{ id: CLUSTER, name: 'Old' }]);
    expect(await renameClusterAction({ id: CLUSTER, name: 'New' })).toEqual({ success: true });

    // The old name is read under the cluster row's lock, in the same
    // transaction as the write, so a racing rename waits and then audits THIS
    // name as its old value instead of silently overwriting it.
    expect(h.transactions).toBe(1);
    expect(h.calls[0]).toMatchObject({ kind: 'select', table: 'article_clusters' });
    expect(arg(0, 'for')?.[0]).toBe('update');

    const update = h.calls.find((c) => c.kind === 'update');
    expect(update?.table).toBe('article_clusters');
    expect(update?.methods.find((m) => m.name === 'set')?.args[0]).toMatchObject({ name: 'New' });

    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'article_cluster',
        entityId: CLUSTER,
        action: 'updated',
        changes: { name: { old: 'Old', new: 'New' } },
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/inspire/clusters/${CLUSTER}`);
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/inspire/clusters/${CLUSTER}/analytics`);
    expect(revalidateTag).toHaveBeenCalledWith(`cluster-analytics:${CLUSTER}`, PURGE_IMMEDIATELY);
  });

  it('the same name writes nothing and audits nothing', async () => {
    h.queue.select.push([{ id: CLUSTER, name: 'Same' }]);
    expect(await renameClusterAction({ id: CLUSTER, name: ' Same ' })).toEqual({ success: true });
    expect(writes()).toHaveLength(0);
    expect(logAuditEvent).not.toHaveBeenCalled();
  });

  it('a cluster that is gone says so', async () => {
    h.queue.select.push([]);
    const result = await renameClusterAction({ id: CLUSTER, name: 'New' });
    expect(result).toEqual({ error: expect.stringContaining('no longer exists') });
    expect(writes()).toHaveLength(0);
  });
});

describe('revalidation is best-effort after the commit', () => {
  it('a revalidation throw after a saved rename still reports success, and is audited', async () => {
    h.queue.select.push([{ id: CLUSTER, name: 'Old' }]);
    vi.mocked(revalidateTag).mockImplementationOnce(() => {
      throw new Error('cache backend down');
    });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await renameClusterAction({ id: CLUSTER, name: 'New' })).toEqual({ success: true });
    expect(logAuditEvent).toHaveBeenCalledTimes(1);
    expect(err).toHaveBeenCalledWith(
      '[clusters] revalidation failed after a saved change:',
      expect.any(Error),
    );
  });

  it.each([
    [
      'create',
      () => {
        h.queue.insert.push([{ id: CLUSTER, name: 'Budget' }]);
        return createClusterAction({ name: 'Budget' });
      },
      { success: true, id: CLUSTER },
    ],
    [
      'delete',
      () => {
        h.queue.delete.push([{ id: CLUSTER, name: 'Budget' }]);
        return deleteClusterAction(CLUSTER);
      },
      { success: true },
    ],
    [
      'remove',
      () => {
        h.queue.select.push([{ id: CLUSTER, name: 'Budget' }]);
        h.queue.delete.push([{ id: 'member-1' }]);
        return removeClusterMemberAction({ clusterId: CLUSTER, articleId: A1 });
      },
      { success: true },
    ],
  ] as [string, () => Promise<unknown>, unknown][])(
    '%s: a revalidatePath throw after the write is still success',
    async (_n, run, expected) => {
      vi.mocked(revalidatePath).mockImplementationOnce(() => {
        throw new Error('boom');
      });
      vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(await run()).toEqual(expected);
      expect(logAuditEvent).toHaveBeenCalledTimes(1);
    },
  );
});

describe('deleteClusterAction', () => {
  it('deletes only the cluster row (members cascade in the DB), audits with its name', async () => {
    h.queue.delete.push([{ id: CLUSTER, name: 'Budget' }]);
    expect(await deleteClusterAction(CLUSTER)).toEqual({ success: true });

    expect(writes()).toHaveLength(1);
    expect(writes()[0]).toMatchObject({ kind: 'delete', table: 'article_clusters' });
    // Articles are never written: no statement of any kind names them.
    expect(h.calls.some((c) => c.table === 'articles')).toBe(false);

    expect(logAuditEvent).toHaveBeenCalledWith({
      entityType: 'article_cluster',
      entityId: CLUSTER,
      entityLabel: 'Budget',
      action: 'deleted',
      performedBy: 'admin-1',
    });
    expect(revalidateTag).toHaveBeenCalledWith(`cluster-analytics:${CLUSTER}`, PURGE_IMMEDIATELY);
    expect(updateTag).toHaveBeenCalledWith(`cluster-analytics:${CLUSTER}`);
  });

  it('a second delete (double click) succeeds without a second audit row', async () => {
    h.queue.delete.push([]);
    expect(await deleteClusterAction(CLUSTER)).toEqual({ success: true });
    expect(logAuditEvent).not.toHaveBeenCalled();
  });

  it('refuses a malformed id without querying', async () => {
    expect(await deleteClusterAction('../etc')).toEqual({ error: 'Invalid cluster ID' });
    expect(h.calls).toHaveLength(0);
  });
});

describe('addClusterMemberAction (one article)', () => {
  /**
   * The reads, in order: cluster (locked), the picked articles (FOR SHARE),
   * which of them are already members, the VISIBLE member count, the last
   * position.
   */
  function queueReads({
    found = [{ id: A1, title: 'Venues under RM50k', status: 'published' }],
    existing = [] as { articleId: string }[],
    visible = 0,
    maxPosition = -1,
  }: {
    found?: { id: string; title: string; status: string }[];
    existing?: { articleId: string }[];
    visible?: number;
    maxPosition?: number;
  } = {}) {
    h.queue.select.push([{ id: CLUSTER, name: 'Budget' }]);
    h.queue.select.push(found);
    h.queue.select.push(existing);
    h.queue.select.push([{ n: visible }]);
    h.queue.select.push([{ max: maxPosition }]);
  }

  it('adds at the end inside one locked transaction, audits and revalidates the tag', async () => {
    queueReads({ visible: 2, maxPosition: 4 });
    h.queue.insert.push([{ articleId: A1 }]);
    expect(await addClusterMemberAction({ clusterId: CLUSTER, articleId: A1 })).toEqual({
      success: true,
    });

    expect(h.transactions).toBe(1);
    // The cluster row is locked first, so concurrent adds serialise.
    expect(h.calls[0]).toMatchObject({ kind: 'select', table: 'article_clusters' });
    expect(arg(0, 'for')?.[0]).toBe('update');

    const insert = h.calls.find((c) => c.kind === 'insert');
    expect(insert?.table).toBe('article_cluster_members');
    expect(insert?.methods.map((m) => m.name)).toContain('onConflictDoNothing');
    // After the last position (4), hidden members included.
    expect(insert?.methods.find((m) => m.name === 'values')?.args[0]).toEqual([
      { clusterId: CLUSTER, articleId: A1, position: 5 },
    ]);

    expect(logAuditEvent).toHaveBeenCalledWith({
      entityType: 'article_cluster',
      entityId: CLUSTER,
      entityLabel: 'Budget',
      action: 'cluster_member_added',
      performedBy: 'admin-1',
      metadata: { articleId: A1, articleTitle: 'Venues under RM50k' },
    });
    expect(revalidateTag).toHaveBeenCalledWith(`cluster-analytics:${CLUSTER}`, PURGE_IMMEDIATELY);
    expect(updateTag).toHaveBeenCalledWith(`cluster-analytics:${CLUSTER}`);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/inspire/clusters');
  });

  it('locks the picked article rows (FOR SHARE) so a racing soft-delete waits for the commit', async () => {
    queueReads();
    h.queue.insert.push([{ articleId: A1 }]);
    await addClusterMemberAction({ clusterId: CLUSTER, articleId: A1 });
    expect(h.calls[1]).toMatchObject({ kind: 'select', table: 'articles' });
    expect(arg(1, 'for')?.[0]).toBe('share');
  });

  it('a member already in the cluster is a no-op: "Already in this cluster", not audited', async () => {
    queueReads({ existing: [{ articleId: A1 }], visible: 1 });
    expect(await addClusterMemberAction({ clusterId: CLUSTER, articleId: A1 })).toEqual({
      error: 'Already in this cluster',
    });
    expect(writes()).toHaveLength(0);
    expect(logAuditEvent).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('a duplicate on an exactly full cluster says "Already in this cluster", not "full"', async () => {
    queueReads({ existing: [{ articleId: A1 }], visible: MAX_CLUSTER_MEMBERS });
    expect(await addClusterMemberAction({ clusterId: CLUSTER, articleId: A1 })).toEqual({
      error: 'Already in this cluster',
    });
  });

  it('ON CONFLICT swallowing the insert still answers "Already in this cluster"', async () => {
    queueReads();
    h.queue.insert.push([]); // ON CONFLICT DO NOTHING → nothing returned
    expect(await addClusterMemberAction({ clusterId: CLUSTER, articleId: A1 })).toEqual({
      error: 'Already in this cluster',
    });
    expect(logAuditEvent).not.toHaveBeenCalled();
  });

  it('a raw unique violation (23505) is still the friendly message, never a 500', async () => {
    queueReads();
    h.throwOn = { kind: 'insert', error: pgError('23505') };
    expect(await addClusterMemberAction({ clusterId: CLUSTER, articleId: A1 })).toEqual({
      error: 'Already in this cluster',
    });
  });

  it('a driver-wrapped 23505 (cause.code) is the friendly message too', async () => {
    queueReads();
    h.throwOn = {
      kind: 'insert',
      error: Object.assign(new Error('wrapped'), { cause: { code: '23505' } }),
    };
    expect(await addClusterMemberAction({ clusterId: CLUSTER, articleId: A1 })).toEqual({
      error: 'Already in this cluster',
    });
  });

  it(`refuses past ${MAX_CLUSTER_MEMBERS} VISIBLE members without inserting`, async () => {
    queueReads({ visible: MAX_CLUSTER_MEMBERS });
    expect(await addClusterMemberAction({ clusterId: CLUSTER, articleId: A1 })).toEqual({
      error: `A cluster can hold up to ${MAX_CLUSTER_MEMBERS} articles`,
    });
    expect(writes()).toHaveLength(0);
  });

  it('the cap counts only members whose article is live (soft-deleted rows take no place)', async () => {
    queueReads({ visible: MAX_CLUSTER_MEMBERS - 1 });
    h.queue.insert.push([{ articleId: A1 }]);
    expect(await addClusterMemberAction({ clusterId: CLUSTER, articleId: A1 })).toEqual({
      success: true,
    });
    // The count query is the 4th read: it must join articles and drop deleted ones.
    expect(h.calls[3]).toMatchObject({ kind: 'select', table: 'article_cluster_members' });
    expect(methodNames(3)).toContain('innerJoin');
    expectHidesSoftDeleted(arg(3, 'where')?.[0]);
  });

  it('refuses a soft-deleted article', async () => {
    queueReads({ found: [{ id: A1, title: 'Gone', status: 'deleted' }] });
    expect(await addClusterMemberAction({ clusterId: CLUSTER, articleId: A1 })).toEqual({
      error: 'That article no longer exists.',
    });
    expect(writes()).toHaveLength(0);
  });

  it('refuses a cluster that is gone', async () => {
    h.queue.select.push([]);
    const result = await addClusterMemberAction({ clusterId: CLUSTER, articleId: A1 });
    expect(result).toEqual({ error: expect.stringContaining('no longer exists') });
    expect(writes()).toHaveLength(0);
  });

  it('refuses malformed ids without querying', async () => {
    expect(await addClusterMemberAction({ clusterId: CLUSTER, articleId: 'x' })).toEqual({
      error: 'Invalid article ID',
    });
    expect(h.calls).toHaveLength(0);
  });

  it('refuses malformed ids from a non-admin with "Unauthorized", not the input error', async () => {
    h.auth = { error: 'Unauthorized', user: null };
    expect(await addClusterMemberAction({ clusterId: CLUSTER, articleId: 'x' })).toEqual({
      error: 'Unauthorized',
    });
  });
});

describe('addClusterMembersAction (the editor batch add)', () => {
  const T = (id: string, title: string, status = 'published') => ({ id, title, status });

  function queueReads(opts: {
    found: { id: string; title: string; status: string }[];
    existing?: { articleId: string }[];
    visible?: number;
    maxPosition?: number;
  }) {
    h.queue.select.push([{ id: CLUSTER, name: 'Budget' }]);
    h.queue.select.push(opts.found);
    h.queue.select.push(opts.existing ?? []);
    h.queue.select.push([{ n: opts.visible ?? 0 }]);
    h.queue.select.push([{ max: opts.maxPosition ?? -1 }]);
  }

  it('adds every pick in order in ONE transaction, ONE insert and ONE revalidation', async () => {
    queueReads({ found: [T(A1, 'One'), T(A2, 'Two'), T(A3, 'Three')], maxPosition: 1 });
    h.queue.insert.push([{ articleId: A3 }, { articleId: A1 }, { articleId: A2 }]);
    expect(await addClusterMembersAction({ clusterId: CLUSTER, articleIds: [A3, A1, A2] })).toEqual(
      { success: true, added: [A3, A1, A2], failed: [] },
    );

    expect(h.transactions).toBe(1);
    const inserts = h.calls.filter((c) => c.kind === 'insert');
    expect(inserts).toHaveLength(1);
    expect(inserts[0].methods.find((m) => m.name === 'values')?.args[0]).toEqual([
      { clusterId: CLUSTER, articleId: A3, position: 2 },
      { clusterId: CLUSTER, articleId: A1, position: 3 },
      { clusterId: CLUSTER, articleId: A2, position: 4 },
    ]);
    expect(logAuditEvent).toHaveBeenCalledTimes(3);
    expect(revalidateTag).toHaveBeenCalledTimes(1);
    expect(updateTag).toHaveBeenCalledTimes(1);
  });

  it('partial: adds what fits, and reports each refusal with its own reason', async () => {
    queueReads({
      found: [T(A1, 'Dup'), T(A2, 'Fits'), T(A3, 'Over')],
      existing: [{ articleId: A1 }],
      visible: MAX_CLUSTER_MEMBERS - 1,
    });
    h.queue.insert.push([{ articleId: A2 }]);
    expect(await addClusterMembersAction({ clusterId: CLUSTER, articleIds: [A1, A2, A3] })).toEqual(
      {
        success: true,
        added: [A2],
        failed: [
          { articleId: A1, error: 'Already in this cluster' },
          { articleId: A3, error: `A cluster can hold up to ${MAX_CLUSTER_MEMBERS} articles` },
        ],
      },
    );
    expect(logAuditEvent).toHaveBeenCalledTimes(1);
  });

  it('nothing added (all refused) writes nothing and revalidates nothing', async () => {
    queueReads({ found: [T(A1, 'Gone', 'deleted')], visible: 3 });
    expect(await addClusterMembersAction({ clusterId: CLUSTER, articleIds: [A1, A2] })).toEqual({
      success: true,
      added: [],
      failed: [
        { articleId: A1, error: 'That article no longer exists.' },
        { articleId: A2, error: 'That article no longer exists.' },
      ],
    });
    expect(writes()).toHaveLength(0);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('a cluster-wide refusal (cluster gone) is ONE error with nothing written', async () => {
    h.queue.select.push([]);
    expect(await addClusterMembersAction({ clusterId: CLUSTER, articleIds: [A1, A2, A3] })).toEqual(
      { error: expect.stringContaining('no longer exists') },
    );
    expect(h.calls).toHaveLength(1);
  });

  it('a non-admin is refused once, before any query', async () => {
    h.auth = { error: 'Unauthorized', user: null };
    expect(await addClusterMembersAction({ clusterId: CLUSTER, articleIds: [A1, A2] })).toEqual({
      error: 'Unauthorized',
    });
    expect(h.calls).toHaveLength(0);
  });

  it('a database failure is one friendly error, not audited', async () => {
    queueReads({ found: [T(A1, 'One')] });
    h.throwOn = { kind: 'insert', error: new Error('connection reset') };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await addClusterMembersAction({ clusterId: CLUSTER, articleIds: [A1] })).toEqual({
      error: 'Could not add the articles — please try again.',
    });
    expect(logAuditEvent).not.toHaveBeenCalled();
  });

  it.each([
    ['an empty list', [] as string[], 'Pick at least one article'],
    ['a repeated id', [A1, A1], 'The same article was picked twice'],
    ['a malformed id', [A1, 'x'], 'Invalid article ID'],
  ])('refuses %s without querying', async (_why, articleIds, message) => {
    expect(await addClusterMembersAction({ clusterId: CLUSTER, articleIds })).toEqual({
      error: message,
    });
    expect(h.calls).toHaveLength(0);
  });
});

describe('removeClusterMemberAction', () => {
  it('deletes only the membership row, audits and revalidates the tag', async () => {
    h.queue.select.push([{ id: CLUSTER, name: 'Budget' }]);
    h.queue.delete.push([{ id: 'member-1' }]);
    expect(await removeClusterMemberAction({ clusterId: CLUSTER, articleId: A1 })).toEqual({
      success: true,
    });
    expect(writes()).toEqual([
      expect.objectContaining({ kind: 'delete', table: 'article_cluster_members' }),
    ]);
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'article_cluster',
        entityId: CLUSTER,
        action: 'cluster_member_removed',
        metadata: { articleId: A1 },
      }),
    );
    expect(revalidateTag).toHaveBeenCalledWith(`cluster-analytics:${CLUSTER}`, PURGE_IMMEDIATELY);
  });

  it('takes the SAME cluster lock as reorder, in one transaction, before deleting', async () => {
    h.queue.select.push([{ id: CLUSTER, name: 'Budget' }]);
    h.queue.delete.push([{ id: 'member-1' }]);
    await removeClusterMemberAction({ clusterId: CLUSTER, articleId: A1 });
    expect(h.transactions).toBe(1);
    expect(h.calls[0]).toMatchObject({ kind: 'select', table: 'article_clusters' });
    expect(arg(0, 'for')?.[0]).toBe('update');
    expect(h.calls[1]).toMatchObject({ kind: 'delete', table: 'article_cluster_members' });
  });

  it('a cluster that is gone says so and deletes nothing', async () => {
    h.queue.select.push([]);
    expect(await removeClusterMemberAction({ clusterId: CLUSTER, articleId: A1 })).toEqual({
      error: expect.stringContaining('no longer exists'),
    });
    expect(writes()).toHaveLength(0);
  });

  it('removing a non-member (double click) succeeds without an audit row', async () => {
    h.queue.select.push([{ id: CLUSTER, name: 'Budget' }]);
    h.queue.delete.push([]);
    expect(await removeClusterMemberAction({ clusterId: CLUSTER, articleId: A1 })).toEqual({
      success: true,
    });
    expect(logAuditEvent).not.toHaveBeenCalled();
  });
});

describe('reorderClusterMembersAction', () => {
  it('caps the array at MAX_CLUSTER_MEMBERS without querying', async () => {
    const ids = Array.from(
      { length: MAX_CLUSTER_MEMBERS + 1 },
      (_, i) => `${String(i).padStart(8, '0')}-0000-4000-8000-000000000000`,
    );
    expect(
      await reorderClusterMembersAction({ clusterId: CLUSTER, orderedArticleIds: ids }),
    ).toEqual({
      error: `A cluster can hold up to ${MAX_CLUSTER_MEMBERS} articles`,
    });
    expect(h.calls).toHaveLength(0);
  });

  it('refuses an empty list', async () => {
    expect(
      await reorderClusterMembersAction({ clusterId: CLUSTER, orderedArticleIds: [] }),
    ).toEqual({
      error: 'Nothing to reorder',
    });
  });

  it('renumbers every member 0..n-1 in one locked transaction and audits', async () => {
    h.queue.select.push([{ id: CLUSTER, name: 'Budget' }]);
    h.queue.select.push([{ articleId: A1 }, { articleId: A2 }, { articleId: A3 }]);
    h.queue.update.push([{ id: 'm3' }], [{ id: 'm1' }], [{ id: 'm2' }]);
    expect(
      await reorderClusterMembersAction({ clusterId: CLUSTER, orderedArticleIds: [A3, A1, A2] }),
    ).toEqual({ success: true });

    expect(h.transactions).toBe(1);
    expect(h.calls[0].methods.find((m) => m.name === 'for')?.args[0]).toBe('update');
    const updates = h.calls.filter((c) => c.kind === 'update');
    expect(updates).toHaveLength(3);
    expect(updates.every((u) => u.table === 'article_cluster_members')).toBe(true);
    expect(updates.map((u) => u.methods.find((m) => m.name === 'set')?.args[0])).toEqual([
      { position: 0 },
      { position: 1 },
      { position: 2 },
    ]);
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'article_cluster',
        action: 'reordered',
        metadata: { orderedArticleIds: [A3, A1, A2] },
      }),
    );
    expect(revalidateTag).toHaveBeenCalledWith(`cluster-analytics:${CLUSTER}`, PURGE_IMMEDIATELY);
  });

  it.each([
    ['a member is missing', [A1]],
    ['an extra id is sent', [A1, A2, A3]],
    ['an id is repeated', [A1, A1]],
    ['an id is swapped for a non-member', [A1, A3]],
  ])('refuses a stale list when %s, writing nothing', async (_why, ids) => {
    h.queue.select.push([{ id: CLUSTER, name: 'Budget' }]);
    h.queue.select.push([{ articleId: A1 }, { articleId: A2 }]);
    const result = await reorderClusterMembersAction({
      clusterId: CLUSTER,
      orderedArticleIds: ids,
    });
    expect(result).toEqual({ error: expect.stringContaining('out of date') });
    expect(writes()).toHaveLength(0);
    expect(logAuditEvent).not.toHaveBeenCalled();
  });

  it('compares against VISIBLE members only (the status <> deleted predicate is sent)', async () => {
    h.queue.select.push([{ id: CLUSTER, name: 'Budget' }]);
    h.queue.select.push([{ articleId: A1 }]);
    h.queue.update.push([{ id: 'm1' }]);
    await reorderClusterMembersAction({ clusterId: CLUSTER, orderedArticleIds: [A1] });
    expect(methodNames(1)).toContain('innerJoin');
    // Rendered to SQL: removing the filter (or flipping it) fails this.
    expectHidesSoftDeleted(arg(1, 'where')?.[0]);
    expect(render(arg(1, 'where')?.[0]).params).toContain(CLUSTER);
  });

  it('an UPDATE that hits no row (member removed mid-reorder) rolls back as "out of date", unaudited', async () => {
    h.queue.select.push([{ id: CLUSTER, name: 'Budget' }]);
    h.queue.select.push([{ articleId: A1 }, { articleId: A2 }]);
    h.queue.update.push([{ id: 'm1' }], []); // the second member vanished
    const result = await reorderClusterMembersAction({
      clusterId: CLUSTER,
      orderedArticleIds: [A1, A2],
    });
    expect(result).toEqual({ error: expect.stringContaining('out of date') });
    expect(logAuditEvent).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe('updateClusterSeriesAction — the gate and the input', () => {
  const INTRO = 'Everything you need to choose your pelamin.';
  function settings(over: Partial<Parameters<typeof updateClusterSeriesAction>[0]> = {}) {
    return { id: CLUSTER, description: INTRO, eyebrow: '', slug: '', seriesEnabled: true, ...over };
  }
  function clusterRow(over: Record<string, unknown> = {}) {
    return {
      id: CLUSTER,
      name: 'Budget',
      slug: null,
      description: null,
      eyebrow: null,
      seriesEnabled: false,
      ...over,
    };
  }

  it('refuses a non-admin before touching the database', async () => {
    h.auth = { error: 'Unauthorized', user: null };
    expect(await updateClusterSeriesAction(settings())).toEqual({ error: 'Unauthorized' });
    expect(h.calls).toHaveLength(0);
    expect(logAuditEvent).not.toHaveBeenCalled();
  });

  it('refuses a malformed cluster id without querying', async () => {
    expect(await updateClusterSeriesAction(settings({ id: 'nope' }))).toEqual({
      error: 'Invalid cluster ID',
    });
    expect(h.calls).toHaveLength(0);
  });

  it.each(['', '   ', '\t\n'])(
    'refuses switching on with a blank intro (%j) and writes NOTHING',
    async (description) => {
      expect(
        await updateClusterSeriesAction(settings({ description, seriesEnabled: true })),
      ).toEqual({
        error: 'Add the intro text readers will see before switching the series box on',
      });
      expect(h.calls).toHaveLength(0);
      expect(logAuditEvent).not.toHaveBeenCalled();
    },
  );

  it('refuses an intro or a label past its cap', async () => {
    expect(
      await updateClusterSeriesAction(
        settings({ description: 'a'.repeat(CLUSTER_DESCRIPTION_MAX + 1) }),
      ),
    ).toEqual({ error: `Intro text must be ${CLUSTER_DESCRIPTION_MAX} characters or fewer` });
    expect(
      await updateClusterSeriesAction(settings({ eyebrow: 'e'.repeat(CLUSTER_EYEBROW_MAX + 1) })),
    ).toEqual({ error: `Small label must be ${CLUSTER_EYEBROW_MAX} characters or fewer` });
    expect(h.calls).toHaveLength(0);
  });

  it('refuses a web address name that is not a url slug', async () => {
    const result = await updateClusterSeriesAction(settings({ slug: 'Not A Slug' }));
    expect(result).toEqual({ error: expect.stringContaining('lowercase') });
    expect(h.calls).toHaveLength(0);
  });

  it('saves all four fields under the cluster row lock, trimmed, blank → NULL', async () => {
    h.queue.select.push([clusterRow()]);
    expect(
      await updateClusterSeriesAction(
        settings({ description: `  ${INTRO}  `, eyebrow: '  ', slug: '  ' }),
      ),
    ).toEqual({ success: true });
    expect(h.transactions).toBe(1);
    expect(h.calls[0]).toMatchObject({ kind: 'select', table: 'article_clusters' });
    expect(arg(0, 'for')?.[0]).toBe('update');
    const update = writes().find((c) => c.kind === 'update');
    expect(update?.table).toBe('article_clusters');
    expect(update?.methods.find((m) => m.name === 'set')?.args[0]).toMatchObject({
      description: INTRO,
      eyebrow: null,
      slug: null,
      seriesEnabled: true,
    });
    expect(revalidateTag).toHaveBeenCalledWith(`cluster-analytics:${CLUSTER}`, PURGE_IMMEDIATELY);
  });

  it('switching OFF with a blank intro is allowed (the rule is only about ON)', async () => {
    h.queue.select.push([clusterRow({ description: INTRO, seriesEnabled: true })]);
    expect(
      await updateClusterSeriesAction(settings({ description: '', seriesEnabled: false })),
    ).toEqual({ success: true });
    const update = writes().find((c) => c.kind === 'update');
    expect(update?.methods.find((m) => m.name === 'set')?.args[0]).toMatchObject({
      description: null,
      seriesEnabled: false,
    });
  });

  it('writes ONE audit row naming only the fields that moved, in plain-language keys', async () => {
    h.queue.select.push([
      clusterRow({ description: 'Old intro', eyebrow: 'Pelamin', seriesEnabled: false }),
    ]);
    await updateClusterSeriesAction(settings({ description: INTRO, eyebrow: 'Pelamin' }));
    expect(logAuditEvent).toHaveBeenCalledTimes(1);
    expect(logAuditEvent).toHaveBeenCalledWith({
      entityType: 'article_cluster',
      entityId: CLUSTER,
      entityLabel: 'Budget',
      action: 'updated',
      performedBy: 'admin-1',
      changes: {
        introText: { old: 'Old intro', new: INTRO },
        seriesBoxShownToReaders: { old: false, new: true },
      },
    });
  });

  it('a save that changes nothing writes nothing and audits nothing', async () => {
    h.queue.select.push([
      clusterRow({ description: INTRO, eyebrow: 'Pelamin', slug: 'pelamin', seriesEnabled: true }),
    ]);
    expect(
      await updateClusterSeriesAction(
        settings({ description: INTRO, eyebrow: 'Pelamin', slug: 'pelamin', seriesEnabled: true }),
      ),
    ).toEqual({ success: true });
    expect(writes()).toHaveLength(0);
    expect(logAuditEvent).not.toHaveBeenCalled();
  });

  it('a cluster that is gone says so and writes nothing', async () => {
    h.queue.select.push([]);
    expect(await updateClusterSeriesAction(settings())).toEqual({
      error: expect.stringContaining('no longer exists'),
    });
    expect(writes()).toHaveLength(0);
  });

  it.each([
    ['a raw 23505', pgError('23505')],
    ['a driver-wrapped 23505', Object.assign(new Error('wrapped'), { cause: { code: '23505' } })],
  ])('%s on the web address name is the friendly message, never a 500', async (_why, error) => {
    h.queue.select.push([clusterRow()]);
    h.throwOn = { kind: 'update', error };
    expect(await updateClusterSeriesAction(settings({ slug: 'taken' }))).toEqual({
      error: 'Another cluster already uses that web address name',
    });
    expect(logAuditEvent).not.toHaveBeenCalled();
  });

  it('any other database failure is a friendly message, not a throw, and is not audited', async () => {
    h.queue.select.push([clusterRow()]);
    h.throwOn = { kind: 'update', error: new Error('connection reset') };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await updateClusterSeriesAction(settings())).toEqual({
      error: 'Could not save the series settings — please try again.',
    });
    expect(logAuditEvent).not.toHaveBeenCalled();
  });
});

describe('no public page is refreshed while the series box is not on the site', () => {
  it('only the cluster-analytics tag is purged — never a broad article tag', async () => {
    h.queue.select.push([{ id: CLUSTER, name: 'Old', seriesEnabled: true }]);
    await renameClusterAction({ id: CLUSTER, name: 'New' });
    h.queue.delete.push([{ id: CLUSTER, name: 'Budget' }]);
    await deleteClusterAction(CLUSTER);
    const tags = vi.mocked(revalidateTag).mock.calls.map((c) => c[0]);
    expect(tags.length).toBeGreaterThan(0);
    expect(tags.every((t) => t.startsWith('cluster-analytics:'))).toBe(true);
  });
});

describe('searchClusterArticlesAction', () => {
  it('refuses a non-admin before querying', async () => {
    h.auth = { error: 'Unauthorized', user: null };
    expect(await searchClusterArticlesAction('pelamin')).toEqual({ error: 'Unauthorized' });
    expect(h.calls).toHaveLength(0);
  });

  it('answers nothing, without querying, for fewer than two characters', async () => {
    expect(await searchClusterArticlesAction(' p ')).toEqual({ articles: [] });
    expect(h.calls).toHaveLength(0);
  });

  it('searches live articles by title, wildcards escaped, and reads a scheduled draft as scheduled', async () => {
    h.queue.select.push([
      { id: A1, title: 'Pelamin 100%', status: 'published', scheduledPublishAt: null },
      { id: A2, title: 'Pelamin draft', status: 'draft', scheduledPublishAt: new Date() },
      { id: A3, title: 'Pelamin idea', status: 'draft', scheduledPublishAt: null },
    ]);
    expect(await searchClusterArticlesAction('  100%_ ')).toEqual({
      articles: [
        { id: A1, title: 'Pelamin 100%', status: 'published' },
        { id: A2, title: 'Pelamin draft', status: 'scheduled' },
        { id: A3, title: 'Pelamin idea', status: 'draft' },
      ],
    });
    const q = render(arg(0, 'where')?.[0]);
    expect(q.params).toContain('deleted');
    expect(q.params).toContain('%100\\%\\_%');
    expect(arg(0, 'limit')?.[0]).toBe(20);
  });

  it('a database failure is a "could not search" message, never an empty result', async () => {
    h.throwOn = { kind: 'select', error: new Error('down') };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await searchClusterArticlesAction('pelamin')).toEqual({
      error: 'Could not search articles — please try again.',
    });
  });
});

describe('getArticleSeriesPanelAction', () => {
  it('refuses a non-admin, and a malformed id, before reading', async () => {
    h.auth = { error: 'Unauthorized', user: null };
    expect(await getArticleSeriesPanelAction(A1)).toEqual({ error: 'Unauthorized' });
    h.auth = { error: null, user: { id: 'admin-1' } };
    expect(await getArticleSeriesPanelAction('nope')).toEqual({ error: 'Invalid article ID' });
    expect(getArticleClusterMemberships).not.toHaveBeenCalled();
    expect(h.calls).toHaveLength(0);
  });

  it('returns the memberships and the cluster list for the picker', async () => {
    const membership = {
      clusterId: CLUSTER,
      name: 'Budget',
      seriesEnabled: true,
      isFirstEnabled: true,
      isShown: false,
    };
    vi.mocked(getArticleClusterMemberships).mockResolvedValueOnce([membership]);
    // getClusters: one statement through the db double.
    h.queue.select.push([
      {
        id: CLUSTER,
        name: 'Budget',
        slug: null,
        description: 'x',
        eyebrow: null,
        seriesEnabled: true,
        createdAt: new Date(),
        memberCount: 2,
      },
    ]);
    expect(await getArticleSeriesPanelAction(A1)).toEqual({
      memberships: [membership],
      clusters: [{ id: CLUSTER, name: 'Budget', seriesEnabled: true, memberCount: 2 }],
    });
    expect(getArticleClusterMemberships).toHaveBeenCalledWith(A1);
  });

  it('a failed read is its own error, never an empty "no series" answer', async () => {
    vi.mocked(getArticleClusterMemberships).mockRejectedValueOnce(new Error('down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await getArticleSeriesPanelAction(A1)).toEqual({
      error: "Couldn't load series — refresh to try again",
    });
  });
});
