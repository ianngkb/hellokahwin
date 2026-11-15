import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The shared Series read — the rule that decides which ONE series an article
 * shows — ported from The Wedding Notebook (the two admin reads only; the
 * public `loadArticleSeries` is not built in HelloKahwin yet).
 *
 * Run through REAL drizzle (the pg-proxy driver), so the assertions are on the
 * SQL Postgres would receive and on the mapping of the rows it would answer
 * with — not on a mocked query builder. No database is needed.
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

import {
  getShownSeriesForArticles,
  getArticleClusterMemberships,
  SERIES_LOOKUP_BATCH_SIZE,
} from '../article-series';

const A1 = '11111111-1111-4111-8111-111111111111';
const A2 = '22222222-2222-4222-8222-222222222222';
const A3 = '33333333-3333-4333-8333-333333333333';
/** Carries hex LETTERS, so its upper-case spelling really differs. */
const A_MIXED = 'f1e2d3c4-1111-4111-8111-abcdefabcdef';
const C1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const C2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

beforeEach(() => {
  h.calls.length = 0;
  h.answers.length = 0;
});

/** A row of `getShownSeriesForArticles`: article id, cluster id, name, EXISTS. */
function shownRow(articleId: string, clusterId: string, name: string, rendersBox: boolean) {
  return [articleId, clusterId, name, rendersBox];
}

/**
 * A row of `getArticleClusterMemberships`: cluster id, name, series_enabled,
 * "is the R2 winner", "has something to list".
 */
function membershipRow(
  clusterId: string,
  name: string,
  seriesEnabled: boolean,
  isFirstEnabled: boolean,
  rendersBox: boolean,
) {
  return [clusterId, name, seriesEnabled, isFirstEnabled, rendersBox];
}

/** Article ids a statement bound, ignoring the `published` status parameter. */
function boundIds(params: unknown[]): string[] {
  return params.filter((p): p is string => typeof p === 'string' && p !== 'published');
}

describe('every admin read is ONE statement — one snapshot, nothing to interleave', () => {
  it('getShownSeriesForArticles: cluster and "renders a box" come from one statement', async () => {
    h.answers.push([shownRow(A1, C1, 'Joined first', true)]);
    await getShownSeriesForArticles([A1]);
    expect(h.calls).toHaveLength(1);
    expect(h.calls[0]!.sql).toContain('select distinct on ("own_members"."article_id")');
    expect(h.calls[0]!.sql).toContain('exists (select 1 from "article_cluster_members"');
  });

  it('getArticleClusterMemberships: list, winner and sibling test come from one statement', async () => {
    h.answers.push([membershipRow(C1, 'Pelamin', true, true, true)]);
    await getArticleClusterMemberships(A1);
    expect(h.calls).toHaveLength(1);
    expect(h.calls[0]!.sql).toContain('"winner_members"');
    expect(h.calls[0]!.sql).toContain('exists (select 1 from "article_cluster_members"');
  });

  it('only switched-on clusters with a non-blank intro count as reader-facing', async () => {
    h.answers.push([]);
    await getShownSeriesForArticles([A1]);
    const { sql } = h.calls[0]!;
    expect(sql).toContain('"article_clusters"."series_enabled" = true');
    // btrim with the JS whitespace set, not the spaces-only default.
    expect(sql).toMatch(/btrim\(coalesce\("article_clusters"\."description", ''\), E' \\t\\n/);
  });

  it('the DISTINCT ON order touches only membership columns (siblings never pick the cluster)', async () => {
    h.answers.push([]);
    await getShownSeriesForArticles([A1]);
    const sql = h.calls[0]!.sql;
    const orderBy = sql.slice(sql.lastIndexOf(' order by '));
    expect(orderBy).toBe(
      ' order by "own_members"."article_id" asc, "own_members"."created_at" asc, "own_members"."id" asc',
    );
  });
});

describe('getShownSeriesForArticles — the same R2 rule, shared with both editors', () => {
  it('sends no query for an empty or all-invalid list', async () => {
    expect(await getShownSeriesForArticles([])).toEqual(new Map());
    expect(await getShownSeriesForArticles(['nope', ''])).toEqual(new Map());
    expect(h.calls).toHaveLength(0);
  });

  it('answers one entry per article, and none for an article with no series', async () => {
    h.answers.push([
      shownRow(A1, C1, 'Joined first', true),
      shownRow(A2, C2, 'Joined later', true),
    ]);
    const out = await getShownSeriesForArticles([A1, A2, A3]);
    expect(out.get(A1)).toEqual({ clusterId: C1, name: 'Joined first', rendersBox: true });
    expect(out.get(A2)).toEqual({ clusterId: C2, name: 'Joined later', rendersBox: true });
    expect(out.has(A3)).toBe(false);
  });

  it('T1-F2: carries rendersBox through, so the admin cannot claim a box that is not there', async () => {
    h.answers.push([shownRow(A1, C1, 'Pelamin ideas', false)]);
    expect(await getShownSeriesForArticles([A1])).toEqual(
      new Map([[A1, { clusterId: C1, name: 'Pelamin ideas', rendersBox: false }]]),
    );
  });

  it('tests "publishable" as published plus a primary category', async () => {
    // T1-F2's lesson: two expressions of the same predicate are two chances to
    // disagree. Both carry the published status and the category join.
    h.answers.push([]);
    await getShownSeriesForArticles([A1]);
    const { sql, params } = h.calls[0];
    expect(sql).toMatch(/inner join "articles" on \([^)]*"articles"\."status" = \$\d/);
    expect(sql).toMatch(
      /inner join "inspire_categories" on "inspire_categories"\."id" = "articles"\."primary_category_id"/,
    );
    expect(params).toContain('published');
  });

  it('I-F4: a reader only "sees" a box on an article that is PUBLISHED', async () => {
    h.answers.push([]);
    await getShownSeriesForArticles([A1]);
    const { sql, params } = h.calls[0];
    // `rendersBox` is now both halves of what a reader gets: the subject
    // article's own row tested for `published` (its own alias, so it cannot be
    // confused with the siblings' `articles` row) AND the sibling test.
    expect(sql).toMatch(
      /exists \(select 1 from "articles" "subject_article" where \("subject_article"\."id" = "own_members"\."article_id" and "subject_article"\."status" = \$\d\)\)/,
    );
    expect(sql.match(/exists \(/g)).toHaveLength(2);
    expect(params.filter((v) => v === 'published')).toHaveLength(2);
    // R2's choice is untouched: the ORDER BY that decides which cluster wins
    // still names membership columns only — not the article's status (T1-F1).
    const order = sql.slice(sql.lastIndexOf('order by'));
    expect(order).not.toContain('subject_article');
    expect(order).not.toContain('status');
  });

  it('asks only about reader-facing clusters, for the ids given', async () => {
    h.answers.push([]);
    await getShownSeriesForArticles([A1, A2]);
    const { sql, params } = h.calls[0];
    expect(sql).toContain('"article_clusters"."series_enabled" = true');
    expect(sql).toMatch(/"own_members"\."article_id" in \(\$\d, \$\d\)/);
    expect(params).toEqual(expect.arrayContaining([A1, A2]));
  });

  it('T1-F3: matches an UPPER-CASE uuid against the lowercase one Postgres returns', async () => {
    const upper = A_MIXED.toUpperCase();
    expect(upper).not.toBe(A_MIXED);
    h.answers.push([shownRow(A_MIXED, C1, 'Pelamin ideas', true)]);
    const out = await getShownSeriesForArticles([upper]);
    // Keyed by the spelling the CALLER passed, so `map.get(whatIPassed)` works…
    expect(out.get(upper)).toEqual({
      clusterId: C1,
      name: 'Pelamin ideas',
      rendersBox: true,
    });
    // …and the id reaching Postgres is folded, so the row really matches.
    expect(h.calls[0]!.params).toContain(A_MIXED);
    expect(h.calls[0]!.params).not.toContain(upper);
  });

  it('T1-F3: treats two spellings of one id as one article', async () => {
    h.answers.push([]);
    await getShownSeriesForArticles([A_MIXED, A_MIXED.toUpperCase()]);
    expect(boundIds(h.calls[0]!.params)).toEqual([A_MIXED]);
  });

  it('T1-F4: answers MORE ids than one statement may bind, in batches, dropping none', async () => {
    const many = Array.from(
      { length: SERIES_LOOKUP_BATCH_SIZE + 10 },
      (_, i) => `${String(i).padStart(8, '0')}-0000-4000-8000-000000000000`,
    );
    h.answers.push([shownRow(many[0]!, C1, 'First batch', true)]);
    h.answers.push([shownRow(many[SERIES_LOOKUP_BATCH_SIZE]!, C2, 'Second batch', false)]);

    const out = await getShownSeriesForArticles(many);

    // Every id was asked about — none silently reported as "no series".
    const asked = h.calls.flatMap((c) => boundIds(c.params));
    for (const id of many) expect(asked).toContain(id);
    expect(h.calls).toHaveLength(2);
    expect(out.get(many[0]!)).toEqual({ clusterId: C1, name: 'First batch', rendersBox: true });
    expect(out.get(many[SERIES_LOOKUP_BATCH_SIZE]!)).toEqual({
      clusterId: C2,
      name: 'Second batch',
      rendersBox: false,
    });
    expect(out.size).toBe(2);
  });

  it('T1-F4: binds no more than the batch size per statement', async () => {
    const many = Array.from(
      { length: SERIES_LOOKUP_BATCH_SIZE * 2 },
      (_, i) => `${String(i).padStart(8, '0')}-0000-4000-8000-000000000000`,
    );
    h.answers.push([]);
    h.answers.push([]);
    await getShownSeriesForArticles(many);
    for (const call of h.calls) {
      expect(boundIds(call.params).length).toBeLessThanOrEqual(SERIES_LOOKUP_BATCH_SIZE);
    }
  });
});

describe('getArticleClusterMemberships — what the article editor shows', () => {
  it('I-F4: `isShown` requires the article itself to be published', async () => {
    h.answers.push([]);
    await getArticleClusterMemberships(A1);
    const { sql, params } = h.calls[0];
    expect(sql).toMatch(
      /exists \(select 1 from "articles" "subject_article" where \("subject_article"\."id" = "own_members"\."article_id" and "subject_article"\."status" = \$\d\)\)/,
    );
    expect(params.filter((v) => v === 'published')).toHaveLength(2);
    // The R2 winner subquery stays sibling-blind AND draft-blind: a draft
    // article still has a first-enabled cluster, it just shows nothing.
    const winner = sql.slice(sql.indexOf('"winner_members"'), sql.indexOf('limit $'));
    expect(winner).not.toContain('subject_article');
    expect(winner).not.toContain('"articles"');
  });

  it('returns [] without querying for a non-uuid id', async () => {
    expect(await getArticleClusterMemberships('nope')).toEqual([]);
    expect(h.calls).toHaveLength(0);
  });

  it('returns [] when the article is in no cluster', async () => {
    h.answers.push([]);
    expect(await getArticleClusterMemberships(A1)).toEqual([]);
  });

  it('lists every cluster alphabetically and marks the ONE readers see', async () => {
    h.answers.push([
      membershipRow(C2, 'Budget (off)', false, false, false),
      membershipRow(C1, 'Pelamin ideas', true, true, true),
    ]);
    const out = await getArticleClusterMemberships(A1);
    expect(out).toEqual([
      {
        clusterId: C2,
        name: 'Budget (off)',
        seriesEnabled: false,
        isFirstEnabled: false,
        isShown: false,
      },
      {
        clusterId: C1,
        name: 'Pelamin ideas',
        seriesEnabled: true,
        isFirstEnabled: true,
        isShown: true,
      },
    ]);
    expect(out.filter((m) => m.isShown)).toHaveLength(1);
  });

  it('T1-F2: switched on and the R2 winner, yet NOT shown — nothing to link to', async () => {
    // The state the editor must not describe as "readers see this series".
    h.answers.push([membershipRow(C1, 'Pelamin ideas', true, true, false)]);
    expect(await getArticleClusterMemberships(A1)).toEqual([
      {
        clusterId: C1,
        name: 'Pelamin ideas',
        seriesEnabled: true,
        isFirstEnabled: true,
        isShown: false,
      },
    ]);
  });

  it('a cluster that has siblings but is not the winner is not shown either', async () => {
    h.answers.push([
      membershipRow(C1, 'Joined first', true, true, true),
      membershipRow(C2, 'Joined later', true, false, true),
    ]);
    const out = await getArticleClusterMemberships(A1);
    expect(out.find((m) => m.clusterId === C1)).toMatchObject({
      isFirstEnabled: true,
      isShown: true,
    });
    expect(out.find((m) => m.clusterId === C2)).toMatchObject({
      isFirstEnabled: false,
      isShown: false,
    });
  });

  it('marks nothing as shown when every cluster is switched off', async () => {
    h.answers.push([membershipRow(C1, 'Off one', false, false, true)]);
    expect(await getArticleClusterMemberships(A1)).toEqual([
      {
        clusterId: C1,
        name: 'Off one',
        seriesEnabled: false,
        isFirstEnabled: false,
        isShown: false,
      },
    ]);
  });

  it('picks the winner with a sibling-blind scalar subquery (T1-F1 holds here too)', async () => {
    h.answers.push([]);
    await getArticleClusterMemberships(A1);
    const sql = h.calls[0]!.sql;
    const open = sql.indexOf('(select "winner_members"."cluster_id"');
    expect(open).toBeGreaterThanOrEqual(0);
    const sub = sql.slice(open, sql.indexOf('))', open) + 1);
    expect(sub).toMatch(
      /order by "winner_members"\."created_at" asc, "winner_members"\."id" asc limit \$\d/,
    );
    expect(sub).not.toContain('"articles"');
    expect(sub).not.toContain('exists');
  });

  it('T1-F3: an UPPER-CASE article id still resolves its shown series', async () => {
    h.answers.push([membershipRow(C1, 'Pelamin ideas', true, true, true)]);
    const out = await getArticleClusterMemberships(A_MIXED.toUpperCase());
    // Was always false before the fold: the id never matched the lowercase one
    // Postgres returns.
    expect(out[0]!.isShown).toBe(true);
    expect(h.calls[0]!.params).toContain(A_MIXED);
    expect(h.calls[0]!.params).not.toContain(A_MIXED.toUpperCase());
  });

  it('scopes to the article and orders by cluster name', async () => {
    h.answers.push([]);
    await getArticleClusterMemberships(A1);
    const { sql, params } = h.calls[0];
    expect(sql).toMatch(/where "own_members"\."article_id" = \$\d/);
    expect(sql).toMatch(/order by "article_clusters"\."name" asc/);
    expect(params).toEqual(expect.arrayContaining([A1]));
  });
});
