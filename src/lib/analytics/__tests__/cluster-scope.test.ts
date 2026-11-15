import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';

/**
 * The cluster reads the analytics page makes against TWN's cluster TABLES
 * (built in parallel by the series port). Pinned: the table/column names the
 * dependency rests on, member order, deleted articles dropped, and R2 (the
 * first-joined switched-on cluster with an intro owns an article's box).
 */

vi.mock('server-only', () => ({}));
let answers: unknown[][] = [];
const statements: { sql: string; params: unknown[] }[] = [];
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    execute: (q: SQL) => {
      const { sql, params } = new PgDialect().sqlToQuery(q);
      statements.push({ sql, params });
      return Promise.resolve(answers.shift() ?? []);
    },
  },
}));

const { loadClusterMembers, getShownSeriesForArticles, clusterAnalyticsTag } =
  await import('../cluster-scope');

const C1 = '11111111-1111-4111-8111-111111111111';
const A1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const A2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

beforeEach(() => {
  answers = [];
  statements.length = 0;
});

describe('loadClusterMembers', () => {
  it('reads one cluster with its live members in member order', async () => {
    answers = [
      [
        { id: C1, name: 'Adat', series_enabled: true, article_id: A1, slug: 'merisik', title: 'M' },
        { id: C1, name: 'Adat', series_enabled: true, article_id: null, slug: null, title: null },
        { id: C1, name: 'Adat', series_enabled: true, article_id: A2, slug: 'tunang', title: null },
      ],
    ];
    expect(await loadClusterMembers(C1)).toEqual({
      id: C1,
      name: 'Adat',
      seriesEnabled: true,
      members: [
        { articleId: A1, slug: 'merisik', title: 'M' },
        { articleId: A2, slug: 'tunang', title: '' },
      ],
    });
    const { sql } = statements[0];
    expect(sql).toContain('FROM article_clusters c');
    expect(sql).toContain('LEFT JOIN article_cluster_members m ON m.cluster_id = c.id');
    expect(sql).toContain("a.status <> 'deleted'");
    expect(sql).toContain('ORDER BY m.position ASC NULLS LAST, m.created_at ASC, m.id ASC');
  });

  it('an empty cluster has no members; an unknown or malformed id is null', async () => {
    answers = [
      [{ id: C1, name: 'X', series_enabled: false, article_id: null, slug: null, title: null }],
    ];
    expect((await loadClusterMembers(C1))?.members).toEqual([]);
    answers = [[]];
    expect(await loadClusterMembers(C1)).toBeNull();
    statements.length = 0;
    expect(await loadClusterMembers('not-a-uuid')).toBeNull();
    expect(statements).toHaveLength(0);
  });
});

describe('getShownSeriesForArticles (R2)', () => {
  it('first-joined, switched-on cluster with an intro, keyed back to the caller’s spelling', async () => {
    answers = [[{ article_id: A1, cluster_id: C1 }]];
    const out = await getShownSeriesForArticles([A1.toUpperCase(), A2, 'junk']);
    expect(out.get(A1.toUpperCase())).toEqual({ clusterId: C1 });
    expect(out.has(A2)).toBe(false);
    const { sql, params } = statements[0];
    expect(sql).toContain('DISTINCT ON (m.article_id)');
    expect(sql).toContain('c.series_enabled = TRUE');
    expect(sql).toContain("NULLIF(btrim(c.description), '') IS NOT NULL");
    expect(sql).toContain('ORDER BY m.article_id, m.created_at ASC, m.id ASC');
    expect(params).not.toContain('junk');
  });

  it('no valid ids → no query', async () => {
    expect((await getShownSeriesForArticles(['x'])).size).toBe(0);
    expect(statements).toHaveLength(0);
  });

  it('tags a cluster’s analytics cache entries', () => {
    expect(clusterAnalyticsTag(C1)).toBe(`cluster-analytics:${C1}`);
  });
});
