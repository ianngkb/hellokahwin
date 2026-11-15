// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  auth: { error: null, user: { id: 'admin-1' } } as { error: string | null; user: unknown },
  // One entry per awaited query, in order. An Error entry rejects.
  results: [] as unknown[],
  writes: [] as { op: string; payload: unknown }[],
  // Stateful mode: when set, queries are answered from this fake table
  // instead of `results`, and inserts enforce the two unique constraints the
  // real table has. Used to exercise moved clusters and concurrent creates.
  table: null as null | TableRow[],
  tablePillarId: '',
}));

interface TableRow {
  id: string;
  slug: string;
  parentId: string | null;
  isPillar: boolean;
  pillarCode: string | null;
  displayOrder: number | null;
}

function uniqueError(constraint: string) {
  return Object.assign(new Error('duplicate key value violates unique constraint'), {
    cause: { code: '23505', constraint_name: constraint },
  });
}

/** Answer a query from the fake table, keyed by the selected column set. */
function fromTable(table: TableRow[], kind: string, fields: string[], values: unknown): unknown {
  if (kind === 'insert') {
    const row = values as TableRow;
    if (table.some((r) => r.pillarCode && r.pillarCode === row.pillarCode)) {
      throw uniqueError('inspire_categories_pillar_code_idx');
    }
    if (table.some((r) => r.slug === row.slug)) throw uniqueError('inspire_categories_slug_unique');
    const id = `new-${table.length}`;
    table.push({ ...row, id });
    return [{ id }];
  }
  if (fields.includes('isPillar')) return table.filter((r) => r.id === h.tablePillarId);
  if (fields.length === 1 && fields[0] === 'displayOrder') {
    return table.filter((r) => r.parentId === h.tablePillarId);
  }
  if (fields.length === 1 && fields[0] === 'pillarCode') {
    // The action asks for every code with its pillar's prefix, table-wide.
    return table.filter((r) => r.pillarCode?.startsWith('C1.'));
  }
  throw new Error(`unexpected query: ${kind} ${fields.join(',')}`);
}

vi.mock('@/lib/auth/admin', () => ({
  requireAdminSectionAction: vi.fn(async () => h.auth),
}));
vi.mock('@/lib/audit/log', () => ({ logAuditEvent: vi.fn() }));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));
vi.mock('@/lib/db/drizzle', () => {
  const chain = (kind: string, fields: string[] = []): Record<string, unknown> => {
    const b: Record<string, unknown> = {};
    let inserted: unknown;
    for (const m of ['from', 'where', 'limit', 'returning']) b[m] = vi.fn(() => b);
    b.set = vi.fn((payload: unknown) => {
      h.writes.push({ op: 'update', payload });
      return b;
    });
    b.values = vi.fn((payload: unknown) => {
      h.writes.push({ op: 'insert', payload });
      inserted = payload;
      return b;
    });
    b.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => {
      if (h.table) {
        const table = h.table;
        // Yield first so concurrent callers genuinely interleave.
        return Promise.resolve()
          .then(() => fromTable(table, kind, fields, inserted))
          .then(res, rej);
      }
      const next = h.results.shift();
      return (next instanceof Error ? Promise.reject(next) : Promise.resolve(next ?? [])).then(
        res,
        rej,
      );
    };
    return b;
  };
  return {
    db: {
      select: vi.fn((fields?: Record<string, unknown>) =>
        chain('select', Object.keys(fields ?? {})),
      ),
      update: vi.fn(() => chain('update')),
      insert: vi.fn(() => chain('insert')),
    },
  };
});

const { updateClusterSettingsAction, createClusterAction } = await import('../actions');
const { db } = await import('@/lib/db/drizzle');
const { logAuditEvent } = await import('@/lib/audit/log');
const { revalidateTag } = await import('next/cache');

const PILLAR_ID = '11111111-1111-4111-8111-111111111111';
const CLUSTER_ID = '22222222-2222-4222-8222-222222222222';

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.auth = { error: null, user: { id: 'admin-1' } };
  h.results = [];
  h.writes = [];
  h.table = null;
  h.tablePillarId = '';
});

describe('updateClusterSettingsAction', () => {
  it('rejects a non-admin without touching the database', async () => {
    h.auth = { error: 'Unauthorized', user: null };
    const res = await updateClusterSettingsAction(null, fd({ id: CLUSTER_ID }));
    expect(res).toEqual({ error: 'Unauthorized' });
    expect(db.select).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it('rejects a malformed id', async () => {
    const res = await updateClusterSettingsAction(null, fd({ id: 'not-a-uuid' }));
    expect(res).toHaveProperty('error');
    expect(db.update).not.toHaveBeenCalled();
  });

  it('rejects a description over 600 characters', async () => {
    const res = await updateClusterSettingsAction(
      null,
      fd({ id: CLUSTER_ID, seriesDescription: 'a'.repeat(601) }),
    );
    expect(res).toEqual({ error: 'Series description must be 600 characters or fewer' });
    expect(db.update).not.toHaveBeenCalled();
  });

  it('saves a cluster’s series settings as plain, trimmed text', async () => {
    h.results = [
      [
        {
          id: CLUSTER_ID,
          name: 'Ikut negeri',
          isPillar: false,
          pillarCode: 'C1.1',
          parentId: PILLAR_ID,
        },
      ],
      [{ isPillar: true }],
      [],
    ];
    const res = await updateClusterSettingsAction(
      null,
      fd({
        id: CLUSTER_ID,
        entityPhrase: '  mas kahwin\nikut negeri ',
        seriesDescription: ' Panduan   setiap negeri ',
        seriesEnabled: 'on',
        intro: 'ignored for clusters',
      }),
    );
    expect(res).toEqual({ success: true });
    expect(h.writes[0].payload).toMatchObject({
      entityPhrase: 'mas kahwin ikut negeri',
      seriesEnabled: true,
      seriesDescription: 'Panduan setiap negeri',
    });
    expect(h.writes[0].payload).not.toHaveProperty('intro');
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: CLUSTER_ID, action: 'updated', performedBy: 'admin-1' }),
    );
    expect(revalidateTag).toHaveBeenCalledWith('articles', expect.anything());
    expect(revalidateTag).toHaveBeenCalledWith('inspire-categories', expect.anything());
  });

  it('switches the box off when the checkbox is absent, and stores an empty description as null', async () => {
    h.results = [
      [
        {
          id: CLUSTER_ID,
          name: 'Ikut negeri',
          isPillar: false,
          pillarCode: 'C1.1',
          parentId: PILLAR_ID,
        },
      ],
      [{ isPillar: true }],
      [],
    ];
    await updateClusterSettingsAction(null, fd({ id: CLUSTER_ID, seriesDescription: '   ' }));
    expect(h.writes[0].payload).toMatchObject({ seriesEnabled: false, seriesDescription: null });
  });

  it('saves only the linking phrase and intro on a pillar', async () => {
    h.results = [
      [{ id: PILLAR_ID, name: 'Mas kahwin', isPillar: true, pillarCode: 'P1', parentId: null }],
      [],
    ];
    await updateClusterSettingsAction(
      null,
      fd({
        id: PILLAR_ID,
        entityPhrase: 'mas kahwin',
        intro: 'Para 1\r\n\r\nPara 2',
        seriesEnabled: 'on',
      }),
    );
    expect(h.writes[0].payload).toMatchObject({
      entityPhrase: 'mas kahwin',
      intro: 'Para 1\n\nPara 2',
    });
    expect(h.writes[0].payload).not.toHaveProperty('seriesEnabled');
  });

  it('refuses to edit an ordinary category', async () => {
    h.results = [
      [{ id: CLUSTER_ID, name: 'Lama', isPillar: false, pillarCode: null, parentId: null }],
    ];
    const res = await updateClusterSettingsAction(null, fd({ id: CLUSTER_ID }));
    expect(res).toEqual({ error: 'Only pillars and clusters can be edited here.' });
    expect(db.update).not.toHaveBeenCalled();
  });

  it('reports a missing row', async () => {
    h.results = [[]];
    const res = await updateClusterSettingsAction(null, fd({ id: CLUSTER_ID }));
    expect(res).toEqual({ error: 'That pillar or cluster no longer exists.' });
  });
});

describe('createClusterAction', () => {
  it('rejects a non-admin', async () => {
    h.auth = { error: 'Unauthorized', user: null };
    expect(await createClusterAction(null, fd({ pillarId: PILLAR_ID, name: 'X' }))).toEqual({
      error: 'Unauthorized',
    });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('requires a name', async () => {
    const res = await createClusterAction(null, fd({ pillarId: PILLAR_ID, name: '  ' }));
    expect(res).toEqual({ error: 'Cluster name is required' });
  });

  it('rejects a bad web address', async () => {
    const res = await createClusterAction(
      null,
      fd({ pillarId: PILLAR_ID, name: 'X', slug: 'a b/c' }),
    );
    expect(res).toHaveProperty('error');
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('creates a cluster with the next code, under the pillar, series box off', async () => {
    h.results = [
      [{ id: PILLAR_ID, isPillar: true, pillarCode: 'P1' }],
      [{ displayOrder: 0 }, { displayOrder: 3 }],
      [{ pillarCode: 'C1.1' }, { pillarCode: 'C1.4' }],
      [{ id: CLUSTER_ID }],
    ];
    const res = await createClusterAction(
      null,
      fd({ pillarId: PILLAR_ID, name: 'Mas Kahwin Sabah', entityPhrase: 'mas kahwin sabah' }),
    );
    expect(res).toEqual({ success: true });
    expect(h.writes[0]).toEqual({
      op: 'insert',
      payload: expect.objectContaining({
        name: 'Mas Kahwin Sabah',
        parentId: PILLAR_ID,
        pillarCode: 'C1.5',
        entityPhrase: 'mas kahwin sabah',
        isPillar: false,
        displayOrder: 4,
      }),
    });
    expect(h.writes[0].payload).not.toHaveProperty('seriesEnabled', true);
    expect(logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'created' }));
  });

  it('refuses a parent that is not a pillar', async () => {
    h.results = [[{ id: PILLAR_ID, isPillar: false, pillarCode: null }]];
    const res = await createClusterAction(null, fd({ pillarId: PILLAR_ID, name: 'X' }));
    expect(res).toEqual({ error: 'Choose a pillar to add the cluster under.' });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('refuses a pillar without a pillar code', async () => {
    h.results = [[{ id: PILLAR_ID, isPillar: true, pillarCode: null }]];
    const res = await createClusterAction(null, fd({ pillarId: PILLAR_ID, name: 'X' }));
    expect(res).toHaveProperty('error');
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('turns a duplicate web address into a readable error (slug constraint only)', async () => {
    h.results = [
      [{ id: PILLAR_ID, isPillar: true, pillarCode: 'P1' }],
      [],
      [],
      uniqueError('inspire_categories_slug_unique'),
    ];
    const res = await createClusterAction(null, fd({ pillarId: PILLAR_ID, name: 'Mas Kahwin' }));
    expect(res).toEqual({
      error: 'A category with the web address "mas-kahwin" already exists. Try another name.',
    });
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it('F1: after the highest cluster moves to another pillar, the next code is still unused', async () => {
    // C1.2 was created under P1 and later moved to P2 by the category admin,
    // keeping its code. P1's own children are now only C1.1.
    h.tablePillarId = 'p1';
    h.table = [
      { id: 'p1', slug: 'p1', parentId: null, isPillar: true, pillarCode: 'P1', displayOrder: 0 },
      { id: 'p2', slug: 'p2', parentId: null, isPillar: true, pillarCode: 'P2', displayOrder: 1 },
      {
        id: 'c11',
        slug: 'c11',
        parentId: 'p1',
        isPillar: false,
        pillarCode: 'C1.1',
        displayOrder: 0,
      },
      {
        id: 'c12',
        slug: 'c12',
        parentId: 'p2',
        isPillar: false,
        pillarCode: 'C1.2',
        displayOrder: 0,
      },
    ];
    const res = await createClusterAction(null, fd({ pillarId: PILLAR_ID, name: 'Baru' }));
    expect(res).toEqual({ success: true });
    expect(h.table.find((r) => r.slug === 'baru')).toMatchObject({
      parentId: 'p1',
      pillarCode: 'C1.3',
    });
    // One insert, no collision: the moved cluster's code was never offered.
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it('F1: two concurrent creates under one pillar end with distinct codes', async () => {
    h.tablePillarId = 'p1';
    h.table = [
      { id: 'p1', slug: 'p1', parentId: null, isPillar: true, pillarCode: 'P1', displayOrder: 0 },
      {
        id: 'c11',
        slug: 'c11',
        parentId: 'p1',
        isPillar: false,
        pillarCode: 'C1.1',
        displayOrder: 0,
      },
    ];
    const [a, b] = await Promise.all([
      createClusterAction(null, fd({ pillarId: PILLAR_ID, name: 'Satu' })),
      createClusterAction(null, fd({ pillarId: PILLAR_ID, name: 'Dua' })),
    ]);
    expect(a).toEqual({ success: true });
    expect(b).toEqual({ success: true });
    const codes = h.table
      .filter((r) => r.slug === 'satu' || r.slug === 'dua')
      .map((r) => r.pillarCode)
      .sort();
    expect(codes).toEqual(['C1.2', 'C1.3']);
    // Both read C1.2 as free; one lost on the code index and retried.
    expect(db.insert).toHaveBeenCalledTimes(3);
  });

  it('F1: recovers from a pillar-code collision by re-reading and taking the next code', async () => {
    h.results = [
      [{ id: PILLAR_ID, isPillar: true, pillarCode: 'P1' }],
      [{ displayOrder: 0 }],
      [{ pillarCode: 'C1.1' }],
      uniqueError('inspire_categories_pillar_code_idx'),
      [{ pillarCode: 'C1.1' }, { pillarCode: 'C1.2' }],
      [{ id: CLUSTER_ID }],
    ];
    const res = await createClusterAction(null, fd({ pillarId: PILLAR_ID, name: 'Tiga' }));
    expect(res).toEqual({ success: true });
    expect(
      h.writes.filter((w) => w.op === 'insert').map((w) => (w.payload as TableRow).pillarCode),
    ).toEqual(['C1.2', 'C1.3']);
  });

  it('F1: gives up with a clear message after repeated code collisions', async () => {
    h.results = [
      [{ id: PILLAR_ID, isPillar: true, pillarCode: 'P1' }],
      [],
      ...Array.from({ length: 5 }, () => [
        [],
        uniqueError('inspire_categories_pillar_code_idx'),
      ]).flat(),
    ];
    const res = await createClusterAction(null, fd({ pillarId: PILLAR_ID, name: 'Empat' }));
    expect(res).toEqual({
      error:
        'Could not assign a free cluster code because others were being added at the same time. Try again.',
    });
    expect(db.insert).toHaveBeenCalledTimes(5);
  });
});
