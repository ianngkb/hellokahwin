import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The cluster read helpers, run through REAL drizzle (the pg-proxy driver) so
 * the assertions are on the SQL Postgres would receive, not on a mocked
 * builder. The proxy answers each statement from a queue. Ported from TWN.
 */

const h = vi.hoisted(() => ({
  calls: [] as { sql: string; params: unknown[] }[],
  answers: [] as unknown[][][],
}));

vi.mock('@/lib/db/drizzle', async () => {
  const { drizzle } = await import('drizzle-orm/pg-proxy');
  return {
    db: drizzle(async (sql, params) => {
      h.calls.push({ sql, params });
      return { rows: h.answers.shift() ?? [] };
    }),
  };
});

import { clusterAnalyticsTag, getClusters, getClusterWithMembers } from '../clusters';

const CLUSTER_ID = '11111111-1111-4111-8111-111111111111';
const CREATED = '2026-11-01T00:00:00.000Z';
const SCHEDULED = '2026-12-01T09:00:00.000Z';

beforeEach(() => {
  h.calls.length = 0;
  h.answers.length = 0;
});

describe('clusterAnalyticsTag', () => {
  it('is per cluster', () => {
    expect(clusterAnalyticsTag(CLUSTER_ID)).toBe(`cluster-analytics:${CLUSTER_ID}`);
  });
});

describe('getClusters', () => {
  it('maps rows and turns a missing count into 0', async () => {
    // pg-proxy rows are positional arrays in select order.
    h.answers.push([
      ['c1', 'Budget', null, null, null, false, CREATED, '3'],
      ['c2', 'Pelamin', 'pelamin', 'Every pelamin guide', 'Pelamin', true, CREATED, null],
    ]);
    const out = await getClusters();
    expect(out).toEqual([
      {
        id: 'c1',
        name: 'Budget',
        slug: null,
        description: null,
        eyebrow: null,
        seriesEnabled: false,
        createdAt: new Date(CREATED),
        memberCount: 3,
      },
      {
        id: 'c2',
        name: 'Pelamin',
        slug: 'pelamin',
        description: 'Every pelamin guide',
        eyebrow: 'Pelamin',
        seriesEnabled: true,
        createdAt: new Date(CREATED),
        memberCount: 0,
      },
    ]);
  });

  it('returns [] for no clusters', async () => {
    h.answers.push([]);
    expect(await getClusters()).toEqual([]);
  });

  it('counts only live members (soft-deleted articles excluded), in one statement', async () => {
    h.answers.push([]);
    await getClusters();
    expect(h.calls).toHaveLength(1);
    const { sql, params } = h.calls[0]!;
    expect(sql).toContain('"article_cluster_members"');
    expect(sql).toMatch(/inner join "articles"/);
    expect(sql).toMatch(/"articles"\."status" <> \$1/);
    expect(params).toContain('deleted');
    expect(sql).toMatch(/left join \(select/);
    expect(sql).toMatch(/order by "article_clusters"\."name" asc/);
  });
});

describe('getClusterWithMembers', () => {
  // One row per membership, cluster columns first (select order):
  // id, name, slug, description, eyebrow, series_enabled, created_at,
  // updated_at, member id, article id, title, article slug, status,
  // scheduled_publish_at, category slug, position.
  const C = [CLUSTER_ID, 'Budget', null, null, null, false, CREATED, CREATED] as const;

  it('returns null without querying for a non-uuid id', async () => {
    expect(await getClusterWithMembers('not-a-uuid')).toBeNull();
    expect(await getClusterWithMembers('')).toBeNull();
    expect(h.calls).toHaveLength(0);
  });

  it('returns null when the cluster does not exist', async () => {
    h.answers.push([]);
    expect(await getClusterWithMembers(CLUSTER_ID)).toBeNull();
  });

  it('returns the cluster with members in position order, null category kept', async () => {
    h.answers.push([
      [...C, 'm1', 'a1', 'First', 'first', 'published', null, 'perkahwinan', 0],
      [...C, 'm2', 'a2', 'Second', 'second', 'draft', SCHEDULED, null, 1],
    ]);
    const out = await getClusterWithMembers(CLUSTER_ID);
    expect(out).toEqual({
      id: CLUSTER_ID,
      name: 'Budget',
      slug: null,
      description: null,
      eyebrow: null,
      seriesEnabled: false,
      createdAt: new Date(CREATED),
      updatedAt: new Date(CREATED),
      members: [
        {
          memberId: 'm1',
          articleId: 'a1',
          title: 'First',
          slug: 'first',
          status: 'published',
          scheduledPublishAt: null,
          categorySlug: 'perkahwinan',
          position: 0,
        },
        {
          memberId: 'm2',
          articleId: 'a2',
          title: 'Second',
          slug: 'second',
          status: 'draft',
          scheduledPublishAt: new Date(SCHEDULED),
          categorySlug: null,
          position: 1,
        },
      ],
    });
  });

  it('returns the Series-box columns (intro, label, switch) on the cluster', async () => {
    h.answers.push([
      [
        CLUSTER_ID,
        'Pelamin ideas',
        'idea-pelamin',
        'Everything you need to choose your pelamin.',
        'Pelamin',
        true,
        CREATED,
        CREATED,
        'm1',
        'a1',
        'First',
        'first',
        'published',
        null,
        'perkahwinan',
        0,
      ],
    ]);
    const out = await getClusterWithMembers(CLUSTER_ID);
    expect(out?.description).toBe('Everything you need to choose your pelamin.');
    expect(out?.eyebrow).toBe('Pelamin');
    expect(out?.seriesEnabled).toBe(true);
  });

  it('a cluster with no members has an empty list (one row, member columns null)', async () => {
    h.answers.push([[...C, null, null, null, null, null, null, null, null]]);
    const out = await getClusterWithMembers(CLUSTER_ID);
    expect(out?.name).toBe('Budget');
    expect(out?.members).toEqual([]);
  });

  it('a cluster whose only members are soft-deleted is empty, not missing', async () => {
    // The membership joins, but the article join (status <> deleted) does not.
    h.answers.push([[...C, 'm1', null, null, null, null, null, null, 0]]);
    const out = await getClusterWithMembers(CLUSTER_ID);
    expect(out).not.toBeNull();
    expect(out?.members).toEqual([]);
  });

  it('reads cluster and members in ONE statement (one snapshot)', async () => {
    h.answers.push([]);
    await getClusterWithMembers(CLUSTER_ID);
    expect(h.calls).toHaveLength(1);
  });

  it('scopes to the cluster, hides soft-deleted articles in the join, orders by position', async () => {
    h.answers.push([]);
    await getClusterWithMembers(CLUSTER_ID);
    const { sql, params } = h.calls[0]!;
    expect(sql).toMatch(/from "article_clusters" left join "article_cluster_members"/);
    expect(sql).toMatch(/on "article_cluster_members"\."cluster_id" = "article_clusters"\."id"/);
    // Soft-delete filter is in the ON clause, not WHERE.
    expect(sql).toMatch(
      /left join "articles" on \("articles"\."id" = "article_cluster_members"\."article_id" and "articles"\."status" <> \$1\)/,
    );
    expect(sql).toMatch(/left join "inspire_categories"/);
    expect(sql).toMatch(/where "article_clusters"\."id" = \$2/);
    expect(params).toEqual(['deleted', CLUSTER_ID]);
    expect(sql).toMatch(
      /order by "article_cluster_members"\."position" asc, "article_cluster_members"\."created_at" asc/,
    );
  });
});
