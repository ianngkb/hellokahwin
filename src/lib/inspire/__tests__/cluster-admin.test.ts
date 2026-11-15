// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const dbState = vi.hoisted(() => ({
  result: [] as unknown,
  reject: null as unknown,
  never: false,
  calls: [] as string[],
}));

vi.mock('@/lib/db/drizzle', () => {
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'from', 'where', 'groupBy', 'innerJoin', 'leftJoin']) {
    builder[m] = vi.fn(() => {
      dbState.calls.push(m);
      return builder;
    });
  }
  builder.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => {
    if (dbState.never) return new Promise(() => {}).then(res, rej);
    if (dbState.reject) return Promise.reject(dbState.reject).then(res, rej);
    return Promise.resolve(dbState.result).then(res, rej);
  };
  return { db: builder };
});
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));

const { buildClusterOverview, getPathViews } = await import('../cluster-admin');
type Cat = Parameters<typeof buildClusterOverview>[0][number];
type Mem = Parameters<typeof buildClusterOverview>[1][number];

const cat = (over: Partial<Cat> & Pick<Cat, 'id' | 'name'>): Cat => ({
  slug: over.id,
  parentId: null,
  isPillar: false,
  pillarCode: null,
  entityPhrase: null,
  intro: null,
  seriesEnabled: false,
  seriesDescription: null,
  displayOrder: 0,
  ...over,
});

const mem = (over: Partial<Mem> & Pick<Mem, 'articleId' | 'linkedCategoryId'>): Mem => ({
  title: `Article ${over.articleId}`,
  slug: over.articleId,
  status: 'published',
  publishedAt: new Date('2026-11-01T00:00:00Z'),
  scheduledPublishAt: null,
  categorySlug: 'mas-kahwin',
  ...over,
});

const CATS: Cat[] = [
  cat({
    id: 'p1',
    name: 'Mas kahwin',
    isPillar: true,
    pillarCode: 'P1',
    entityPhrase: 'mas kahwin',
  }),
  cat({ id: 'c12', name: 'Kadar', parentId: 'p1', pillarCode: 'C1.2', seriesEnabled: true }),
  cat({ id: 'c11', name: 'Ikut negeri', parentId: 'p1', pillarCode: 'C1.1' }),
];

describe('buildClusterOverview', () => {
  it('counts live, draft and scheduled per cluster and flags thin clusters', () => {
    const out = buildClusterOverview(
      CATS,
      [
        mem({ articleId: 'a', linkedCategoryId: 'c11' }),
        mem({
          articleId: 'b',
          linkedCategoryId: 'c11',
          publishedAt: new Date('2026-11-09T00:00:00Z'),
        }),
        mem({ articleId: 'c', linkedCategoryId: 'c11' }),
        mem({ articleId: 'd', linkedCategoryId: 'c11', status: 'draft', publishedAt: null }),
        mem({
          articleId: 'e',
          linkedCategoryId: 'c12',
          status: 'draft',
          publishedAt: null,
          scheduledPublishAt: new Date('2026-12-01T00:00:00Z'),
        }),
        mem({ articleId: 'x', linkedCategoryId: 'c12', status: 'deleted' }),
      ],
      new Map([
        ['/artikel/mas-kahwin/a', 10],
        ['/artikel/mas-kahwin/b', 5],
      ]),
    );
    const [pillar] = out.pillars;
    expect(pillar.clusters.map((c) => c.code)).toEqual(['C1.1', 'C1.2']);
    const [c11, c12] = pillar.clusters;
    expect(c11).toMatchObject({ live: 3, draft: 1, scheduled: 0, views: 15, thin: false });
    expect(c11.lastPublishedAt?.toISOString()).toBe('2026-11-09T00:00:00.000Z');
    expect(c12).toMatchObject({ live: 0, draft: 0, scheduled: 1, thin: true, seriesEnabled: true });
    expect(c12.articles.map((a) => a.id)).toEqual(['e']);
    expect(out.viewsAvailable).toBe(true);
  });

  it('lists pillar articles that are in none of its clusters', () => {
    const out = buildClusterOverview(
      CATS,
      [
        mem({ articleId: 'a', linkedCategoryId: 'p1' }),
        mem({ articleId: 'a', linkedCategoryId: 'c11' }),
        mem({ articleId: 'lonely', linkedCategoryId: 'p1', status: 'draft', publishedAt: null }),
      ],
      new Map(),
    );
    expect(out.pillars[0].unclustered.map((a) => [a.id, a.status])).toEqual([['lonely', 'draft']]);
  });

  it('shows views as unavailable (null) rather than zero when analytics failed', () => {
    const out = buildClusterOverview(
      CATS,
      [mem({ articleId: 'a', linkedCategoryId: 'c11' })],
      null,
    );
    expect(out.viewsAvailable).toBe(false);
    expect(out.pillars[0].clusters[0].views).toBeNull();
    expect(out.pillars[0].clusters[0].articles[0].views).toBeNull();
  });
});

describe('getPathViews', () => {
  beforeEach(() => {
    dbState.result = [];
    dbState.reject = null;
    dbState.never = false;
    dbState.calls = [];
  });

  it('skips the query entirely for no paths', async () => {
    expect(await getPathViews([])).toEqual(new Map());
    expect(dbState.calls).toEqual([]);
  });

  it('maps rows to a path -> views map', async () => {
    dbState.result = [{ pathname: '/artikel/a/b', views: '7' }];
    expect(await getPathViews(['/artikel/a/b'])).toEqual(new Map([['/artikel/a/b', 7]]));
  });

  it('degrades to null on a database error', async () => {
    dbState.reject = new Error('boom');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await getPathViews(['/x'])).toBeNull();
  });

  it('degrades to null when the read overruns its time limit', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    dbState.never = true;
    const p = getPathViews(['/x']);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(await p).toBeNull();
    vi.useRealTimers();
  });
});
