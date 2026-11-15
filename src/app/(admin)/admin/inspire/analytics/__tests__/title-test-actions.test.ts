import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
const revalidatePath = vi.fn();
const revalidateTag = vi.fn();
vi.mock('next/cache', () => ({
  revalidatePath: (p: string) => revalidatePath(p),
  revalidateTag: (...a: unknown[]) => revalidateTag(...a),
}));
const logAuditEvent = vi.fn();
vi.mock('@/lib/audit/log', () => ({ logAuditEvent: (e: unknown) => logAuditEvent(e) }));

const requireAdminSectionAction = vi.fn();
vi.mock('@/lib/auth/admin', () => ({
  requireAdminSectionAction: (s: string) => requireAdminSectionAction(s),
}));

/** Results of successive `select … limit()` calls OUTSIDE the transaction. */
const selects: unknown[][] = [];
/** Results of successive `select … limit()` calls INSIDE it: lock, live row, running test. */
let txSelects: unknown[][] = [];
const txWrites: { kind: string; value: unknown }[] = [];
const txExecuted: string[] = [];
let txThrows: Error | null = null;
const updated = vi.fn();

function chain(queue: () => unknown[]) {
  const c = {
    from: () => c,
    leftJoin: () => c,
    where: () => c,
    limit: async () => queue(),
  };
  return c;
}

vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: () => chain(() => selects.shift() ?? []),
    update: () => ({
      set: () => ({ where: () => ({ returning: async () => updated() }) }),
    }),
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const writes: typeof txWrites = [];
      const tx = {
        execute: async (q: { queryChunks?: unknown[] }) => {
          txExecuted.push(JSON.stringify(q.queryChunks ?? q));
        },
        select: () => chain(() => txSelects.shift() ?? []),
        update: () => ({
          set: (v: unknown) => ({
            where: async () => {
              writes.push({ kind: 'update', value: v });
            },
          }),
        }),
        insert: () => ({
          values: async (v: unknown) => {
            if (txThrows) throw txThrows;
            writes.push({ kind: 'insert', value: v });
          },
        }),
      };
      const result = await fn(tx);
      // Commit only what a successful callback wrote (a throw rolls back).
      txWrites.push(...writes);
      return result;
    },
  },
}));

import { endTitleTestAction, startTitleTestAction } from '../title-test-actions';

const ID = 'c123dbd2-c7a9-4f0f-81b1-eac68bf67058';
const user = { id: 'u1', email: 'admin@example.com' };
const published = {
  id: ID,
  title: 'Cara Daftar Nikah di Malaysia: Panduan Langkah demi Langkah',
  slug: 'cara-daftar-nikah',
  metaTitle: null,
  status: 'published',
  categorySlug: 'persiapan',
};
const live = { title: published.title, metaTitle: null, status: 'published' };

beforeEach(() => {
  selects.length = 0;
  txSelects = [];
  txWrites.length = 0;
  txExecuted.length = 0;
  txThrows = null;
  updated.mockReset();
  revalidatePath.mockReset();
  revalidateTag.mockReset();
  logAuditEvent.mockReset();
  requireAdminSectionAction.mockReset();
  requireAdminSectionAction.mockResolvedValue({ error: null, user });
});

describe('startTitleTestAction', () => {
  it('refuses without the inspire section', async () => {
    requireAdminSectionAction.mockResolvedValue({ error: 'Forbidden', user: null });
    expect(await startTitleTestAction(ID, 'New')).toEqual({ error: 'Forbidden' });
    expect(requireAdminSectionAction).toHaveBeenCalledWith('inspire');
  });

  it('refuses an empty or over-long title, or a bad id, before touching anything', async () => {
    expect(await startTitleTestAction(ID, '   ')).toHaveProperty('error');
    expect(await startTitleTestAction(ID, 'x'.repeat(61))).toHaveProperty('error');
    expect(await startTitleTestAction('not-a-uuid', 'Fine')).toHaveProperty('error');
    expect(txWrites).toEqual([]);
  });

  it('refuses an unpublished article', async () => {
    selects.push([{ ...published, status: 'draft' }]);
    expect(await startTitleTestAction(ID, 'Fine title')).toHaveProperty('error');
    expect(txWrites).toEqual([]);
  });

  it('refuses the title Google already sees', async () => {
    selects.push([published]);
    expect(await startTitleTestAction(ID, published.title)).toEqual({
      error: 'That is already the title Google sees.',
    });
  });

  it('refuses while another test is running on the article', async () => {
    selects.push([published], [{ id: 'running' }]);
    expect(await startTitleTestAction(ID, 'Fine title')).toHaveProperty('error');
    expect(txWrites).toEqual([]);
  });

  it('writes the title and the test row together, under the row lock, then refreshes the public page', async () => {
    selects.push([published], []);
    txSelects = [[], [live], []]; // no editor lock, live row unchanged, no test started meanwhile
    const r = await startTitleTestAction(ID, '  Daftar Nikah  di Malaysia: Langkah JPN ');
    expect(r).toEqual({ ok: true });
    expect(txExecuted[0]).toContain('FOR UPDATE');
    expect(txWrites).toEqual([
      {
        kind: 'update',
        value: { metaTitle: 'Daftar Nikah di Malaysia: Langkah JPN', updatedAt: expect.any(Date) },
      },
      {
        kind: 'insert',
        value: {
          articleId: ID,
          // What Google was shown: no meta title, so the article title.
          oldTitle: published.title,
          newTitle: 'Daftar Nikah di Malaysia: Langkah JPN',
          createdBy: 'u1',
        },
      },
    ]);
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: ID,
        action: 'updated',
        changes: { metaTitle: { old: null, new: 'Daftar Nikah di Malaysia: Langkah JPN' } },
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith('/artikel/persiapan/cara-daftar-nikah');
    expect(revalidateTag).toHaveBeenCalledWith('articles', expect.anything());
  });

  it('the old title is the meta title as Google sees it (brand suffix stripped)', async () => {
    const withMeta = { ...published, metaTitle: 'Daftar Nikah 2026 | HelloKahwin' };
    selects.push([withMeta], []);
    txSelects = [[], [{ ...live, metaTitle: withMeta.metaTitle }], []];
    expect(await startTitleTestAction(ID, 'Something new')).toEqual({ ok: true });
    expect(txWrites[1].value).toMatchObject({ oldTitle: 'Daftar Nikah 2026' });
  });

  it('refuses while someone has the article open in the editor — nothing written', async () => {
    selects.push([published], []);
    txSelects = [[{ lockedByName: 'Aisyah' }]];
    const r = await startTitleTestAction(ID, 'Fine title');
    expect(r).toHaveProperty('error');
    expect((r as { error: string }).error).toMatch(/Aisyah has this article open/);
    expect(txWrites).toEqual([]);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('refuses when the live title changed since the request read it', async () => {
    selects.push([published], []);
    txSelects = [[], [{ ...live, metaTitle: 'Someone else changed it' }]];
    expect(await startTitleTestAction(ID, 'Fine title')).toEqual({
      error: 'The article changed while you were typing. Reload and try again.',
    });
    expect(txWrites).toEqual([]);
  });

  it('a test started meanwhile refuses the whole write', async () => {
    selects.push([published], []);
    txSelects = [[], [live], [{ id: 'just-started' }]];
    expect(await startTitleTestAction(ID, 'Fine title')).toEqual({
      error: 'This article already has a test running. End it before starting another.',
    });
    expect(txWrites).toEqual([]);
  });

  it('an unexpected failure (e.g. the one-running-test index) reports nothing was saved', async () => {
    selects.push([published], []);
    txSelects = [[], [live], []];
    txThrows = new Error('duplicate key value violates unique constraint');
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await startTitleTestAction(ID, 'Fine title')).toEqual({
      error: 'The title could not be changed. Nothing was saved — try again.',
    });
    err.mockRestore();
    expect(txWrites).toEqual([]);
    expect(logAuditEvent).not.toHaveBeenCalled();
  });
});

describe('endTitleTestAction', () => {
  it('ends a running test', async () => {
    updated.mockReturnValue([{ id: ID }]);
    expect(await endTitleTestAction(ID)).toEqual({ ok: true });
  });

  it('says so when the test already ended', async () => {
    updated.mockReturnValue([]);
    expect(await endTitleTestAction(ID)).toHaveProperty('error');
  });

  it('refuses without the inspire section', async () => {
    requireAdminSectionAction.mockResolvedValue({ error: 'Forbidden', user: null });
    expect(await endTitleTestAction(ID)).toEqual({ error: 'Forbidden' });
    expect(updated).not.toHaveBeenCalled();
  });
});
