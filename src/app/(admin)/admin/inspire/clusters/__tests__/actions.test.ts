// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  auth: { error: null, user: { id: 'admin-1' } } as { error: string | null; user: unknown },
  // One entry per awaited query, in order. An Error entry rejects.
  results: [] as unknown[],
  writes: [] as { op: string; payload: unknown }[],
}));

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
  const chain = (): Record<string, unknown> => {
    const b: Record<string, unknown> = {};
    for (const m of ['from', 'where', 'limit', 'returning']) b[m] = vi.fn(() => b);
    b.set = vi.fn((payload: unknown) => {
      h.writes.push({ op: 'update', payload });
      return b;
    });
    b.values = vi.fn((payload: unknown) => {
      h.writes.push({ op: 'insert', payload });
      return b;
    });
    b.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => {
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
      select: vi.fn(() => chain()),
      update: vi.fn(() => chain()),
      insert: vi.fn(() => chain()),
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
      [
        { pillarCode: 'C1.1', displayOrder: 0 },
        { pillarCode: 'C1.4', displayOrder: 3 },
      ],
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
    h.results = [[{ id: PILLAR_ID, isPillar: true, pillarCode: null }], []];
    const res = await createClusterAction(null, fd({ pillarId: PILLAR_ID, name: 'X' }));
    expect(res).toHaveProperty('error');
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('turns a duplicate web address into a readable error', async () => {
    h.results = [
      [{ id: PILLAR_ID, isPillar: true, pillarCode: 'P1' }],
      [],
      Object.assign(new Error('duplicate key'), { code: '23505' }),
    ];
    const res = await createClusterAction(null, fd({ pillarId: PILLAR_ID, name: 'Mas Kahwin' }));
    expect(res).toEqual({
      error: 'A category with the web address "mas-kahwin" already exists. Try another name.',
    });
  });
});
