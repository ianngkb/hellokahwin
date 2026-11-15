import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';

/**
 * Cluster analytics (R16–R21): the movement maths the page shows (R17 example,
 * every visit counted, every move counted, last stop), link-target resolution
 * (R20), window parsing (R16), and the SQL shape — session_id sessionization,
 * exact paths + the partial-index scope, an index-only projection, no
 * COUNT(DISTINCT), no cap, a window floor, one member snapshot per page.
 *
 * The clock is pinned (KL 23:59:59 on 8 Nov 2026) so window floors are fixed
 * dates, never recomputed from the live clock.
 */

vi.mock('server-only', () => ({}));
vi.mock('@sentry/nextjs', () => ({ captureMessage: vi.fn(), captureException: vi.fn() }));

const cacheCalls: { key: string; tags: string[]; value: Promise<unknown> }[] = [];
vi.mock('next/cache', () => ({
  unstable_cache:
    (fn: (...a: unknown[]) => unknown, key: string[], opts: { tags: string[] }) =>
    (...args: unknown[]) => {
      // What would be STORED: through a JSON round trip, like Next's cache.
      const value = Promise.resolve(fn(...args)).then((v) => JSON.parse(JSON.stringify(v)));
      cacheCalls.push({ key: key.join('|'), tags: opts.tags, value });
      return value;
    },
}));
vi.mock('react', async (orig) => ({
  ...(await orig<typeof import('react')>()),
  cache: (fn: unknown) => fn,
}));

type Router = (sql: string, params: unknown[]) => unknown[] | undefined;
let route: Router = () => undefined;
const statements: { sql: string; params: unknown[] }[] = [];
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    execute: async (q: SQL) => {
      const { sql, params } = new PgDialect().sqlToQuery(q);
      statements.push({ sql, params });
      return route(sql, params) ?? [];
    },
  },
}));

// HelloKahwin: the cluster reads live in ../cluster-scope (table-level SQL),
// not in the clusters admin's module; the mock keeps TWN's names.
const getClusterWithMembers = vi.fn();
const getShownSeriesForArticles = vi.fn();
vi.mock('../cluster-scope', () => ({
  clusterAnalyticsTag: (id: string) => `cluster-analytics:${id}`,
  loadClusterMembers: (id: string) => getClusterWithMembers(id),
  getShownSeriesForArticles: (ids: readonly string[]) => getShownSeriesForArticles(ids),
}));
const resolveArticlePaths = vi.fn();
vi.mock('../article-paths', async (orig) => ({
  ...(await orig<typeof import('../article-paths')>()),
  resolveArticlePaths: (s: readonly string[]) => resolveArticlePaths(s),
}));

const cl = await import('../cluster-analytics');
const { parseClusterWindow, DEFAULT_CLUSTER_WINDOW } = await import('../cluster-window');
// TWN's MAX_CLUSTER_MEMBERS (validations/article.ts); the clusters admin owns it here.
const MAX_CLUSTER_MEMBERS = 50;
const { SERIES_BOX_VIEWED_EVENT, SERIES_LINK_CLICKED_EVENT } = await import('../series-events');

const A = 'garden-wedding';
const B = 'ballroom-guide';
const C = 'budget-tips';
const ID_A = '11111111-1111-4111-8111-111111111111';
const ID_B = '22222222-2222-4222-8222-222222222222';
const ID_C = '33333333-3333-4333-8333-333333333333';
const p = (slug: string) => [`/artikel/ideas/${slug}`, `/artikel/ideas/${slug}/`];
const PATHS = [...p(A), ...p(B), ...p(C)];

const isPageviews = (s: string) => s.includes("event_name = 'pageview'");
const isClicks = (s: string) => s.includes("props->>'href'");

/** 23:59:59.999 in Kuala Lumpur on 8 Nov 2026 — one millisecond before the KL day turns. */
const NOW = new Date('2026-11-08T15:59:59.999Z');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  route = () => undefined;
  statements.length = 0;
  cacheCalls.length = 0;
  getClusterWithMembers.mockReset();
  resolveArticlePaths.mockReset();
  getShownSeriesForArticles.mockReset();
  getShownSeriesForArticles.mockResolvedValue(new Map());
});

afterEach(() => {
  vi.useRealTimers();
});

// ── R17: the headline arithmetic ────────────────────────────────────────────

/**
 * What the SQL hands back per visit, built from raw sessions the way the
 * statement does it (collapse consecutive repeats, last step, distinct reads),
 * so the R17/R19 tests read in sessions rather than in summary rows.
 */
function shapesOf(sessions: readonly (readonly string[])[]) {
  const by = new Map<string, { lastSlug: string; distinctReads: number; sessions: number }>();
  for (const raw of sessions) {
    const path = raw.filter((s, i) => i === 0 || raw[i - 1] !== s);
    if (path.length === 0) continue;
    const lastSlug = path[path.length - 1];
    const distinctReads = new Set(path).size;
    const key = `${lastSlug}|${distinctReads}`;
    const prev = by.get(key);
    by.set(key, { lastSlug, distinctReads, sessions: (prev?.sessions ?? 0) + 1 });
  }
  return [...by.values()];
}

describe('summariseVisits / buildClusterOverview (R17, R19)', () => {
  it('reproduces the R17 example: {s1:[A,B], s2:[A,A], s3:[B]} → 3 visits, 33 %, 1.33', () => {
    const ov = cl.buildClusterOverview([A, B], new Map(), shapesOf([[A, B], [A, A], [B]]));
    expect(ov.visits).toBe(3);
    expect(ov.flowSessions).toBe(1);
    expect(ov.flowRate).toBeCloseTo(1 / 3, 10);
    expect(Math.round(ov.flowRate * 100)).toBe(33);
    expect(ov.articlesPerVisit).toBeCloseTo(4 / 3, 10);
    expect(ov.articlesPerVisit.toFixed(2)).toBe('1.33');
  });

  it('weights each shape by its session count', () => {
    const s = cl.summariseVisits(
      [
        { lastSlug: C, distinctReads: 3, sessions: 2 },
        { lastSlug: A, distinctReads: 1, sessions: 8 },
      ],
      [A, B, C],
    );
    expect(s.visits).toBe(10);
    expect(s.flowSessions).toBe(2);
    expect(s.distinctReads).toBe(2 * 3 + 8);
  });

  it('a refresh of the same article never counts as reading two', () => {
    const s = cl.summariseVisits(shapesOf([[A, A, A]]), [A, B]);
    expect(s.flowSessions).toBe(0);
    expect(s.distinctReads).toBe(1);
  });

  it('last stop: the share of visits whose LAST cluster article was this one', () => {
    const ov = cl.buildClusterOverview(
      [A, B, C],
      new Map([[A, { views: 9, uniqueVisitors: 4 }]]),
      shapesOf([
        ...Array.from({ length: 3 }, () => [A, B]), // end on B
        [B, A], // ends on A
        [A, A],
        [A, A], // end on A (collapsed)
        ...Array.from({ length: 4 }, () => [C, A, C]), // end on C
      ]),
    );
    const by = Object.fromEntries(ov.members.map((m) => [m.slug, m]));
    expect(ov.visits).toBe(10);
    expect(by[A].lastStops).toBe(3);
    expect(by[B].lastStops).toBe(3);
    expect(by[C].lastStops).toBe(4);
    expect(by[A].lastStopShare).toBeCloseTo(0.3, 10);
    expect(by[C].lastStopShare).toBeCloseTo(0.4, 10);
    // Shares of a complete set of visits add up to 1.
    expect(ov.members.reduce((acc, m) => acc + m.lastStopShare, 0)).toBeCloseTo(1, 10);
    // Totals come through; a member with no totals row reads zeros, not missing.
    expect(by[A].views).toBe(9);
    expect(by[A].uniqueVisitors).toBe(4);
    expect(by[B].views).toBe(0);
  });

  it('keeps every member, in member order, even with no data at all', () => {
    const ov = cl.buildClusterOverview([C, A, B], new Map(), []);
    expect(ov.members.map((m) => m.slug)).toEqual([C, A, B]);
    expect(ov).toMatchObject({ visits: 0, flowRate: 0, articlesPerVisit: 0 });
    expect(ov.members.every((m) => m.lastStopShare === 0)).toBe(true);
  });

  it('ignores shapes ending on a non-member, with no sessions or no reads', () => {
    const s = cl.summariseVisits(
      [
        { lastSlug: 'someone-else', distinctReads: 1, sessions: 2 },
        { lastSlug: B, distinctReads: 1, sessions: 0 },
        { lastSlug: A, distinctReads: 0, sessions: 5 },
        { lastSlug: A, distinctReads: 1, sessions: 2 },
      ],
      [A, B],
    );
    expect(s.visits).toBe(2);
    expect(s.flowSessions).toBe(0);
    expect([...s.lastStops]).toEqual([[A, 2]]);
  });

  it('counts EVERY visit, however many distinct reading paths there are (no cap)', async () => {
    // 6,001 visits, each on its own reading path. The old statement kept only
    // the 5,000 most common paths, so every headline number undercounted past
    // them. Visits now arrive summarised by (last article, distinct reads) —
    // a handful of rows for the whole set — and every one is counted.
    route = (s) =>
      isPageviews(s)
        ? [
            { kind: 'total', slug: A, other: null, a: '7000', b: '6500' },
            { kind: 'shape', slug: A, other: null, a: '5000', b: '1' },
            { kind: 'shape', slug: B, other: null, a: '1001', b: '2' },
          ]
        : [];
    const ov = await cl.getClusterOverviewUncached([A, B], PATHS, [ID_A, ID_B], 365);
    expect(ov.visits).toBe(6001);
    expect(ov.flowSessions).toBe(1001);
    expect(ov.flowRate).toBeCloseTo(1001 / 6001, 10);
    expect(ov.articlesPerVisit).toBeCloseTo((5000 + 2 * 1001) / 6001, 10);
    expect(ov.members[0]).toMatchObject({ slug: A, views: 7000, uniqueVisitors: 6500 });
    expect(ov).not.toHaveProperty('truncated');
    // …and the statement itself never caps anything.
    expect(statements.find((x) => isPageviews(x.sql))!.sql).not.toMatch(/\bLIMIT\b/i);
  });
});

// ── R18: where readers went next ────────────────────────────────────────────

describe('journey transitions (R18)', () => {
  it('sums move rows between different members, most-travelled first', () => {
    expect(
      cl.clusterTransitions(
        [
          { from: A, to: B, moves: 2 },
          { from: C, to: A, moves: 5 },
          { from: A, to: B, moves: 5 },
        ],
        [A, B, C],
      ),
    ).toEqual([
      { from: A, to: B, moves: 7 },
      { from: C, to: A, moves: 5 },
    ]);
  });

  it('drops self-moves, non-members and zero rows', () => {
    expect(
      cl.clusterTransitions(
        [
          { from: A, to: A, moves: 4 },
          { from: A, to: 'someone-else', moves: 3 },
          { from: 'someone-else', to: B, moves: 3 },
          { from: B, to: A, moves: 0 },
        ],
        [A, B],
      ),
    ).toEqual([]);
  });

  it('every move counts: A, B, A, B is A→B twice and B→A once (not once per visit)', async () => {
    // One visit A, B, A, B: the statement's LEAD pairs are (A,B), (B,A), (A,B),
    // and GROUP BY from, to gives A→B 2, B→A 1. The getter passes those counts
    // through — the old per-visit de-duplication reported A→B 1.
    route = (s) =>
      isPageviews(s)
        ? [
            { kind: 'shape', slug: B, other: null, a: '1', b: '2' },
            { kind: 'move', slug: A, other: B, a: '2', b: null },
            { kind: 'move', slug: B, other: A, a: '1', b: null },
          ]
        : [];
    const j = await cl.getClusterJourneyUncached([A, B], PATHS, [ID_A, ID_B], 90);
    expect(j).toEqual([
      { from: A, to: B, moves: 2 },
      { from: B, to: A, moves: 1 },
    ]);
    // In SQL: every (step, next step) pair counted per (from, to) with
    // COUNT(*), no session de-duplication on the way.
    const q = statements.find((x) => isPageviews(x.sql))!.sql;
    expect(q).toMatch(
      /moves AS \(\s*SELECT slug AS from_slug, next_slug AS to_slug, COUNT\(\*\)::bigint AS moves\s+FROM steps\s+WHERE next_slug IS NOT NULL\s+GROUP BY slug, next_slug\s*\)/,
    );
    expect(q).not.toMatch(/GROUP BY session_id, slug, next_slug|DISTINCT\s+session_id/i);
  });

  it('collapses consecutive repeats before pairing (A, A, B → one A→B), in created_at order', async () => {
    await cl.getClusterJourneyUncached([A, B], PATHS, [ID_A, ID_B], 90);
    const q = statements.find((x) => isPageviews(x.sql))!.sql;
    // LAG drops a step repeating the previous one; LEAD pairs what is left,
    // in the same order. Order is created_at (stamped in queue order at
    // /collect, batch-order.ts); slug only breaks a historical exact tie.
    expect(q).toContain(
      'LAG(slug) OVER (PARTITION BY session_id ORDER BY created_at, slug) AS prev_slug',
    );
    expect(q).toMatch(
      /LEAD\(slug\) OVER \(PARTITION BY session_id ORDER BY created_at, slug\) AS next_slug\s+FROM ordered\s+WHERE prev_slug IS DISTINCT FROM slug/,
    );
  });
});

// ── R20: link clicks between members ────────────────────────────────────────

describe('linkTargetSlug (R20)', () => {
  it.each([
    ['/artikel/ideas/garden-wedding', A],
    ['/artikel/ideas/garden-wedding/', A],
    ['/artikel/ideas/garden-wedding?utm=x', A],
    ['/artikel/ideas/garden-wedding/?utm=x&b=2#top', A],
    ['/artikel/ideas/garden-wedding#faq', A],
    ['https://hellokahwin.com/artikel/ideas/garden-wedding?ref=1', A],
    ['https://www.hellokahwin.com/artikel/ideas/garden-wedding/', A],
    ['//hellokahwin.com/artikel/ideas/garden-wedding', A],
  ])('%s → %s', (href, want) => {
    expect(cl.linkTargetSlug(href)).toBe(want);
  });

  it.each([
    'https://example.com/artikel/ideas/garden-wedding',
    '/artikel/ideas',
    '/inspire',
    '/artikel/ideas/garden-wedding/attachment/photo-1',
    '/catalog/venues/some-hall',
    'mailto:hello@example.com',
    '',
    'not a url',
  ])('%s → null', (href) => {
    expect(cl.linkTargetSlug(href)).toBeNull();
  });
});

describe('clusterLinkClicksFromRows (R20)', () => {
  const scope = { slugs: [A, B, C], memberIds: [ID_A, ID_B, ID_C] };

  it('sums the same target under query-string and trailing-slash variants', () => {
    const out = cl.clusterLinkClicksFromRows(
      [
        { articleId: ID_A, href: `/artikel/ideas/${B}?utm=1`, clicks: 3 },
        { articleId: ID_A, href: `/artikel/ideas/${B}/`, clicks: 2 },
        { articleId: ID_A, href: `https://hellokahwin.com/artikel/x/${C}#top`, clicks: 1 },
      ],
      scope,
    );
    expect(out).toEqual([
      { fromArticleId: ID_A, toSlug: B, clicks: 5 },
      { fromArticleId: ID_A, toSlug: C, clicks: 1 },
    ]);
  });

  it('excludes non-member targets, self-links, non-member sources and unresolvable hrefs', () => {
    const out = cl.clusterLinkClicksFromRows(
      [
        { articleId: ID_A, href: '/artikel/ideas/not-in-this-cluster', clicks: 9 },
        { articleId: ID_A, href: `/artikel/ideas/${A}`, clicks: 4 },
        {
          articleId: '44444444-4444-4444-8444-444444444444',
          href: `/artikel/ideas/${B}`,
          clicks: 7,
        },
        { articleId: ID_B, href: '/artikel/ideas', clicks: 6 },
        { articleId: ID_B, href: `/artikel/ideas/${A}`, clicks: 0 },
      ],
      scope,
    );
    expect(out).toEqual([]);
  });
});

describe('getClusterLinkClicksUncached SQL (R20)', () => {
  it('reads article_link_click events on the members’ exact paths since the window floor, then resolves', async () => {
    route = (s) =>
      isClicks(s)
        ? [
            // FROM is the pathname's slug; TO comes from the recorded href.
            { slug: B, href: `/artikel/ideas/${A}?x=1`, clicks: '4' },
            { slug: B, href: '/artikel/ideas/elsewhere', clicks: '10' },
            { slug: 'not-a-member', href: `/artikel/ideas/${A}`, clicks: '9' },
            { slug: A, href: null, clicks: '3' },
          ]
        : [];
    const out = await cl.getClusterLinkClicksUncached([A, B], PATHS, [ID_A, ID_B], 30);
    expect(out).toEqual([{ fromArticleId: ID_B, toSlug: A, clicks: 4 }]);
    const q = statements.find((x) => isClicks(x.sql))!;
    expect(q.sql).toContain('FROM analytics_events');
    expect(q.sql).toContain('is_bot = FALSE');
    expect(q.sql).toMatch(
      /pathname = ANY \(ARRAY\(SELECT jsonb_array_elements_text\(\$\d+::text::jsonb\)\)\)/,
    );
    expect(q.params).toContain('article_link_click');
    expect(q.params).toContain(JSON.stringify(PATHS));
    // 30 KL days including 8 Nov 2026 start on 10 Oct (KL midnight, in UTC).
    expect(q.params).toContain('2026-10-09T16:00:00.000Z');
    expect(q.sql).not.toMatch(/COUNT\s*\(\s*DISTINCT/i);
  });

  it('runs nothing for fewer than two members', async () => {
    expect(await cl.getClusterLinkClicksUncached([A], PATHS, [ID_A], 90)).toEqual([]);
    expect(statements).toHaveLength(0);
  });
});

// ── The pageview statement ──────────────────────────────────────────────────

/**
 * Every identifier the `v` CTE (the only part that touches analytics_events)
 * names, minus SQL words and functions. Literals and bind params are removed
 * first, so `'/artikel/%'` or `'365 days'` never count.
 */
function identifiersIn(fragment: string): Set<string> {
  const SQL_WORDS = new Set([
    'select',
    'as',
    'from',
    'where',
    'and',
    'or',
    'not',
    'now',
    'interval',
    'any',
    'array',
    'like',
    'false',
    'true',
    'split_part',
    'jsonb_array_elements_text',
    'text',
    'jsonb',
    'analytics_events',
    'slug', // the output alias of split_part(pathname, …)
  ]);
  const stripped = fragment.replace(/'(?:[^']|'')*'/g, ' ').replace(/\$\d+/g, ' ');
  const ids = new Set<string>();
  for (const m of stripped.matchAll(/[a-z_][a-z0-9_]*/gi)) {
    const w = m[0].toLowerCase();
    if (!SQL_WORDS.has(w)) ids.add(w);
  }
  return ids;
}

/** The covering index's columns: key (pathname, created_at) + INCLUDE + its predicate's. */
const INDEX_COLUMNS = new Set([
  'pathname',
  'created_at',
  'visitor_hash',
  'screen_width',
  'referrer',
  'session_id',
  'event_name', // constant under the partial predicate
  'is_bot', // constant under the partial predicate
]);

describe('getClusterOverviewUncached SQL shape (R16, R21)', () => {
  it('one statement: exact paths, index scope, window floor, session_id, no COUNT(DISTINCT)', async () => {
    await cl.getClusterOverviewUncached([A, B, C], PATHS, [ID_A, ID_B, ID_C], 90);
    const pv = statements.filter((x) => isPageviews(x.sql));
    expect(pv).toHaveLength(1);
    const { sql, params } = pv[0];
    expect(sql).toContain('pathname = ANY (');
    expect(sql).toContain("pathname LIKE '/artikel/%'");
    expect(sql).toContain("event_name = 'pageview'");
    expect(sql).toContain('is_bot = FALSE');
    expect(sql).toContain("created_at >= NOW() - INTERVAL '365 days'");
    expect(sql).toContain('session_id IS NOT NULL');
    expect(sql).toContain('prev_slug IS DISTINCT FROM slug');
    expect(sql).toContain('GROUP BY slug, visitor_hash');
    expect(sql).toContain('GROUP BY session_id, slug');
    expect(sql).not.toMatch(/COUNT\s*\(\s*DISTINCT/i);
    // No visitor-hash gap logic: sessions are the tracker's session_id.
    expect(sql).not.toMatch(/LAG\s*\(\s*created_at/i);
    expect(params).toContain(JSON.stringify(PATHS));
    // 90 KL days including 8 Nov 2026 start on 11 Aug, KL midnight = 16:00 UTC.
    expect(params).toContain('2026-08-10T16:00:00.000Z');
  });

  it('stays an index-only scan: reads analytics_events once, and only covering-index columns', async () => {
    await cl.getClusterOverviewUncached([A, B, C], PATHS, [ID_A, ID_B, ID_C], 365);
    const { sql } = statements.find((x) => isPageviews(x.sql))!;
    // Exactly one read of the table — every later CTE reads `v`, never the table.
    expect(sql.match(/\banalytics_events\b/g)).toHaveLength(1);
    expect(sql).not.toMatch(/\bSELECT\s+(\w+\.)?\*/i);
    const vBody = /WITH v AS \(([\s\S]*?)\n\s*\),\s*\n\s*per_visitor AS/.exec(sql)?.[1];
    expect(vBody).toBeDefined();
    expect(vBody).toContain('FROM analytics_events');
    // Every column the table read names — projected or filtered — is in the index.
    const outside = [...identifiersIn(vBody!)].filter((id) => !INDEX_COLUMNS.has(id));
    expect(outside).toEqual([]);
    // The projection is exactly the slug + the three columns the CTEs use.
    const projection = /SELECT([\s\S]*?)FROM analytics_events/.exec(vBody!)![1];
    expect(projection.replace(/\s+/g, ' ').trim()).toBe(
      "split_part(pathname, '/', 4) AS slug, visitor_hash, session_id, created_at",
    );
    // split_part only extracts the slug from already-matched rows — never in
    // ANY WHERE of the statement (it would defeat the exact-path probes).
    const wheres = sql.split(/\bWHERE\b/).slice(1);
    expect(wheres.length).toBeGreaterThan(1);
    for (const w of wheres) {
      const clause = w.split(/\b(?:GROUP BY|ORDER BY|UNION ALL|\)\s*,)/)[0];
      expect(clause).not.toContain('split_part');
    }
  });

  it('returns only member-bounded summaries, never per-visit rows (keeps the cache entry small)', async () => {
    await cl.getClusterOverviewUncached([A, B, C], PATHS, [ID_A, ID_B, ID_C], 365);
    const { sql } = statements.find((x) => isPageviews(x.sql))!;
    // ≤ members rows, ≤ members × members shapes, ≤ members² moves — whatever
    // the traffic. A session_id in any output grouping would make it per visit.
    expect(sql).toMatch(/totals AS \([\s\S]*?GROUP BY slug\s*\)/);
    expect(sql).toMatch(/shapes AS \([\s\S]*?GROUP BY s\.slug, r\.distinct_reads\s*\)/);
    expect(sql).toMatch(/moves AS \([\s\S]*?GROUP BY slug, next_slug\s*\)/);
    const output = sql.slice(sql.lastIndexOf("SELECT 'total'"));
    expect(output).not.toContain('session_id');
    expect(output.match(/\bFROM (\w+)/g)).toEqual(['FROM totals', 'FROM shapes', 'FROM moves']);
  });

  it('the guard catches a heap-reading column or a split_part predicate (self-test)', () => {
    expect(identifiersIn("SELECT id, visitor_hash FROM analytics_events WHERE x = 'a b'")).toEqual(
      new Set(['id', 'visitor_hash', 'x']),
    );
    expect(
      [...identifiersIn('SELECT props, referrer FROM analytics_events')].filter(
        (id) => !INDEX_COLUMNS.has(id),
      ),
    ).toEqual(['props']);
  });

  it('runs no statement when the cluster has no paths', async () => {
    const ov = await cl.getClusterOverviewUncached([A], [], [ID_A], 90);
    expect(ov.visits).toBe(0);
    expect(statements).toHaveLength(0);
  });
});

// ── Cached getters: one snapshot, scope, tags ───────────────────────────────

describe('cached getters (R21)', () => {
  const cluster = (members: { articleId: string; slug: string }[]) => ({
    id: 'c1',
    name: 'Venues',
    slug: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    members: members.map((m, i) => ({
      memberId: `m${i}`,
      title: `Title of ${m.slug}`,
      status: 'published',
      categorySlug: 'ideas',
      position: i,
      ...m,
    })),
  });
  const AB = { slugs: [A, B], memberIds: [ID_A, ID_B] };

  it('loadClusterAnalytics reads the cluster ONCE into labels + membership (no analytics yet)', async () => {
    getClusterWithMembers.mockResolvedValue(
      cluster([
        { articleId: ID_A, slug: A },
        { articleId: ID_C, slug: '' }, // a member without a slug is not analysable
        { articleId: ID_B, slug: B },
      ]),
    );
    const snap = await cl.loadClusterAnalytics('c1');
    expect(snap).toEqual({
      id: 'c1',
      name: 'Venues',
      members: [
        { articleId: ID_A, slug: A, title: `Title of ${A}` },
        { articleId: ID_B, slug: B, title: `Title of ${B}` },
      ],
      membership: AB,
      // T5: the panel's "switched off" state needs it, and it comes from the
      // same single cluster read as the labels.
      seriesEnabled: false,
    });
    expect(getClusterWithMembers).toHaveBeenCalledTimes(1);
    expect(resolveArticlePaths).not.toHaveBeenCalled();
    expect(statements).toHaveLength(0);
    getClusterWithMembers.mockResolvedValue(null);
    expect(await cl.loadClusterAnalytics('gone')).toBeNull();
  });

  it('the getters query the snapshot they are given and never re-read the cluster', async () => {
    resolveArticlePaths.mockResolvedValue(
      new Map([
        [A, p(A)],
        [B, p(B)],
        [C, p(C)],
      ]),
    );
    await cl.getClusterOverview('c1', AB, 90);
    await cl.getClusterJourney('c1', AB, 90);
    await cl.getClusterLinkClicks('c1', AB, 90);
    expect(getClusterWithMembers).not.toHaveBeenCalled();
    expect(resolveArticlePaths).toHaveBeenCalledWith([A, B]);
    const pv = statements.find((x) => isPageviews(x.sql))!;
    expect(pv.params).toContain(JSON.stringify([...p(A), ...p(B)].sort()));
    expect(pv.params.join(' ')).not.toContain(C);
    const ck = statements.find((x) => isClicks(x.sql))!;
    expect(ck.params).toContain(JSON.stringify([...p(A), ...p(B)].sort()));
    expect(ck.params.join(' ')).not.toContain(C);
  });

  it('caches under article-analytics + cluster-analytics:<id>, in distinct pageview / click namespaces', async () => {
    resolveArticlePaths.mockResolvedValue(
      new Map([
        [A, p(A)],
        [B, p(B)],
      ]),
    );
    await cl.getClusterOverview('c1', AB, 30);
    await cl.getClusterLinkClicks('c1', AB, 30);
    expect(cacheCalls).toHaveLength(2);
    for (const c of cacheCalls) {
      expect(c.tags).toEqual(['article-analytics', 'cluster-analytics:c1']);
    }
    const [pvKey, clickKey] = cacheCalls.map((c) => c.key);
    expect(cl.PAGEVIEWS_CACHE_KEY).toBe('cluster-analytics:pageviews');
    expect(cl.CLICKS_CACHE_KEY).toBe('cluster-analytics:clicks');
    expect(pvKey.startsWith('cluster-analytics:pageviews|c1|30|')).toBe(true);
    expect(clickKey.startsWith('cluster-analytics:clicks|c1|30|')).toBe(true);
    expect(pvKey).not.toBe(clickKey);
    // A different window is a different entry.
    await cl.getClusterOverview('c1', AB, 90);
    expect(cacheCalls[2].key.startsWith('cluster-analytics:pageviews|c1|90|')).toBe(true);
  });

  it('an empty membership answers empty without touching analytics', async () => {
    const none = { slugs: [], memberIds: [] };
    expect(await cl.getClusterOverview('c1', none, 90)).toEqual({
      members: [],
      visits: 0,
      flowSessions: 0,
      flowRate: 0,
      articlesPerVisit: 0,
    });
    expect(await cl.getClusterJourney('c1', none, 90)).toEqual([]);
    expect(await cl.getClusterLinkClicks('c1', none, 90)).toEqual([]);
    expect(statements).toHaveLength(0);
    expect(resolveArticlePaths).not.toHaveBeenCalled();
  });

  it('a one-member cluster has no journey or clicks to read', async () => {
    const one = { slugs: [A], memberIds: [ID_A] };
    expect(await cl.getClusterJourney('c1', one, 90)).toEqual([]);
    expect(await cl.getClusterLinkClicks('c1', one, 90)).toEqual([]);
    expect(statements).toHaveLength(0);
  });
});

// ── T6-F6: the cached pageview entry is compact and byte-budgeted ──────────

describe('compact pageview cache entry (T6-F6)', () => {
  /** The largest cluster the admin allows, with very long slugs. */
  const N = MAX_CLUSTER_MEMBERS;
  const slugs = Array.from(
    { length: N },
    (_, i) => `${String(i).padStart(3, '0')}-${'x'.repeat(296)}`,
  );
  const BIG = 999_999_999_999;
  /** Every shape and every move a cluster this size can produce, at huge counts. */
  const worstCase = () => ({
    totals: new Map(slugs.map((s) => [s, { views: BIG, uniqueVisitors: BIG }])),
    shapes: slugs.flatMap((s) =>
      Array.from({ length: N }, (_, d) => ({ lastSlug: s, distinctReads: d + 1, sessions: BIG })),
    ),
    moves: slugs.flatMap((from, i) =>
      slugs.filter((_, j) => j !== i).map((to, j) => ({ from, to, moves: BIG - i * N - j })),
    ),
  });

  it("the worst-case entry stays far under the budget and Next's ~2 MB limit, with no slug text", () => {
    const pv = worstCase();
    // The old entry (slug text on every row) would be over 2 MB → never cached.
    const raw = { ...pv, totals: Array.from(pv.totals.entries()) };
    expect(cl.serializedBytes(raw)).toBeGreaterThan(2 * 1024 * 1024);
    const entry = cl.compactPageviews(pv, slugs);
    const bytes = cl.serializedBytes(entry);
    expect(bytes).toBeLessThanOrEqual(cl.PAGEVIEWS_CACHE_BYTE_BUDGET);
    expect(bytes).toBeLessThan(200 * 1024);
    expect(cl.PAGEVIEWS_CACHE_BYTE_BUDGET).toBeLessThan(2 * 1024 * 1024);
    expect(entry.movesTrimmed).toBe(0);
    // Rows bounded by the member count: ≤ N totals, N last stops, N × (N − 1) moves.
    expect(entry.totals).toHaveLength(N);
    expect(entry.visits.lastStops).toHaveLength(N);
    expect(entry.moves).toHaveLength(N * (N - 1));
    expect(JSON.stringify(entry)).not.toContain('xxx');
  });

  it('round-trips losslessly: headlines from EVERY shape, journey from every move', () => {
    const pv = worstCase();
    const entry = JSON.parse(JSON.stringify(cl.compactPageviews(pv, slugs)));
    const back = cl.expandPageviews(entry, slugs);
    expect(cl.overviewFromSummary(slugs, back.totals, back.visits)).toEqual(
      cl.buildClusterOverview(slugs, pv.totals, pv.shapes),
    );
    expect(cl.clusterTransitions(back.moves, slugs)).toEqual(
      cl.clusterTransitions(pv.moves, slugs),
    );
  });

  it('over budget, it drops the least-travelled moves only — headline numbers stay exact', () => {
    const pv = worstCase();
    const budget = 20 * 1024;
    const entry = cl.compactPageviews(pv, slugs, budget);
    expect(cl.serializedBytes(entry)).toBeLessThanOrEqual(budget);
    expect(entry.movesTrimmed).toBeGreaterThan(0);
    expect(entry.moves.length + entry.movesTrimmed).toBe(N * (N - 1));
    const full = cl.compactPageviews(pv, slugs);
    expect(entry.visits).toEqual(full.visits);
    expect(entry.totals).toEqual(full.totals);
    // The kept moves are the most-travelled prefix.
    expect(entry.moves).toEqual(full.moves.slice(0, entry.moves.length));
    const back = cl.expandPageviews(entry, slugs);
    expect(cl.overviewFromSummary(slugs, back.totals, back.visits)).toEqual(
      cl.buildClusterOverview(slugs, pv.totals, pv.shapes),
    );
  });

  it('drops rows for a slug that is not a member', () => {
    const entry = cl.compactPageviews(
      {
        totals: new Map([
          [A, { views: 3, uniqueVisitors: 2 }],
          ['gone', { views: 9, uniqueVisitors: 9 }],
        ]),
        shapes: [{ lastSlug: 'gone', distinctReads: 1, sessions: 5 }],
        moves: [{ from: A, to: 'gone', moves: 4 }],
      },
      [A, B],
    );
    expect(entry).toEqual({
      totals: [[0, 3, 2]],
      visits: { visits: 0, flowSessions: 0, distinctReads: 0, lastStops: [0, 0] },
      moves: [],
      movesTrimmed: 0,
    });
  });

  it('the cached getters store the compact entry and still show the full-set numbers', async () => {
    resolveArticlePaths.mockResolvedValue(
      new Map([
        [A, p(A)],
        [B, p(B)],
      ]),
    );
    route = (s) =>
      isPageviews(s)
        ? [
            { kind: 'total', slug: A, other: null, a: '7000', b: '6500' },
            { kind: 'total', slug: B, other: null, a: '1200', b: '1100' },
            { kind: 'shape', slug: A, other: null, a: '5000', b: '1' },
            { kind: 'shape', slug: B, other: null, a: '1001', b: '2' },
            { kind: 'move', slug: A, other: B, a: '900', b: null },
            { kind: 'move', slug: B, other: A, a: '101', b: null },
          ]
        : undefined;
    const AB = { slugs: [A, B], memberIds: [ID_A, ID_B] };
    const overview = await cl.getClusterOverview('c1', AB, 90);
    const journey = await cl.getClusterJourney('c1', AB, 90);
    expect(overview).toEqual(await cl.getClusterOverviewUncached([A, B], PATHS, [ID_A, ID_B], 90));
    expect(journey).toEqual(await cl.getClusterJourneyUncached([A, B], PATHS, [ID_A, ID_B], 90));
    expect(overview.visits).toBe(6001);
    expect(overview.flowSessions).toBe(1001);
    const stored = await cacheCalls.find((c) => c.key.startsWith(cl.PAGEVIEWS_CACHE_KEY))!.value;
    expect(stored).toEqual({
      totals: [
        [0, 7000, 6500],
        [1, 1200, 1100],
      ],
      visits: { visits: 6001, flowSessions: 1001, distinctReads: 7002, lastStops: [5000, 1001] },
      moves: [
        [0, 1, 900],
        [1, 0, 101],
      ],
      movesTrimmed: 0,
    });
    expect(JSON.stringify(stored)).not.toContain(A);
  });
});

// ── R16: window ─────────────────────────────────────────────────────────────

describe('parseClusterWindow (R16)', () => {
  it.each([
    ['30', 30],
    ['90', 90],
    ['365', 365],
  ] as const)('%s → %s', (raw, want) => {
    expect(parseClusterWindow(raw)).toBe(want);
  });

  it.each([
    undefined,
    null,
    '',
    '7',
    '0',
    '90abc',
    '-30',
    '1000',
    'all',
    ' ',
    ' 30',
    '30 ',
    ' 365 ',
    '030',
    '30.0',
    ['30', '365'],
    ['365'],
    [],
  ])('%j falls back to 90', (raw) => {
    expect(parseClusterWindow(raw as string | string[] | undefined)).toBe(DEFAULT_CLUSTER_WINDOW);
    expect(DEFAULT_CLUSTER_WINDOW).toBe(90);
  });

  it('the floor covers exactly N KL days including today (clock pinned)', () => {
    // 8 Nov 2026, 23:59:59.999 KL.
    expect(cl.clusterWindowFloor(30)).toEqual({
      day: '2026-10-10',
      utc: '2026-10-09T16:00:00.000Z',
    });
    expect(cl.clusterWindowFloor(90).day).toBe('2026-08-11');
    expect(cl.clusterWindowFloor(365).day).toBe('2025-11-09');
    // One millisecond later it is 9 Nov in KL: the floor moves with the KL day.
    vi.setSystemTime(new Date(NOW.getTime() + 1));
    expect(cl.clusterWindowFloor(30)).toEqual({
      day: '2026-10-11',
      utc: '2026-10-10T16:00:00.000Z',
    });
  });
});

// ── T5: the "Series box" panel (R18, R19) ───────────────────────────────────

/**
 * The columns the series partial index carries: its keys plus the two columns
 * its predicate pins to a constant. The impressions branch may name NOTHING
 * else, or it stops being an index-only scan — the measured difference between
 * a few index pages and one random heap read per matched row.
 */
const SERIES_INDEX_COLUMNS = new Set(['event_name', 'pathname', 'created_at', 'is_bot']);

/**
 * Words `identifiersIn` cannot know are not columns: the UNION branch's output
 * aliases and the SQL it is built from. Anything NOT here and not an index
 * column fails the guard — which is the point: `props`, `visitor_hash` or any
 * other real column in the impressions branch is caught.
 */
const SERIES_NON_COLUMNS = new Set([
  'kind',
  'other',
  'n',
  'null',
  'bigint',
  'count',
  'group',
  'by',
  'union',
  'all',
]);

const isSeries = (s: string) => s.includes("'Series Box Viewed'");
const SCOPE3 = { slugs: [A, B, C], memberIds: [ID_A, ID_B, ID_C] };
const seenRow = (slug: string, n: number) => ({ kind: 'seen' as const, slug, other: null, n });
const clickRow = (slug: string, to: string, n: number) => ({
  kind: 'click' as const,
  slug,
  other: to,
  n,
});

describe('buildSeriesBox (R18)', () => {
  it('adds up impressions and clicks, per member in member order', () => {
    const out = cl.buildSeriesBox(
      [seenRow(A, 5), seenRow(B, 3), seenRow(C, 1), clickRow(A, ID_B, 2), clickRow(B, ID_C, 1)],
      SCOPE3,
      [A, B, C],
    );
    expect(out.seen).toBe(9);
    expect(out.clicks).toBe(3);
    expect(out.perArticle).toEqual([
      { articleId: ID_A, seen: 5, clicks: 2 },
      { articleId: ID_B, seen: 3, clicks: 1 },
      { articleId: ID_C, seen: 1, clicks: 0 },
    ]);
    expect(out.links).toEqual([
      { fromArticleId: ID_A, toArticleId: ID_B, clicks: 2 },
      { fromArticleId: ID_B, toArticleId: ID_C, clicks: 1 },
    ]);
  });

  it('counts impressions ONLY for members whose shown series is this cluster (R2)', () => {
    // B's box is another cluster's (it joined that one first), so B's page
    // views are that cluster's impressions, not this one's. A click FROM B
    // carrying this cluster_id still counts: the event names the box used.
    const rows = [seenRow(A, 5), seenRow(B, 100), clickRow(B, ID_A, 1)];
    const out = cl.buildSeriesBox(rows, SCOPE3, [A, C]);
    expect(out.seen).toBe(5);
    expect(out.perArticle).toEqual([
      { articleId: ID_A, seen: 5, clicks: 0 },
      { articleId: ID_B, seen: 0, clicks: 1 },
      { articleId: ID_C, seen: 0, clicks: 0 },
    ]);
    expect(out.clicks).toBe(1);
  });

  it('drops a click whose target is not a current member, or is the article itself', () => {
    const out = cl.buildSeriesBox(
      [
        clickRow(A, '99999999-9999-4999-8999-999999999999', 7), // moved out of the cluster
        clickRow(A, ID_A, 4), // itself: impossible from the box, never counted
        clickRow(A, null as unknown as string, 3), // a row with no target
        clickRow(A, ID_B, 1),
      ],
      SCOPE3,
      [A, B, C],
    );
    expect(out.clicks).toBe(1);
    expect(out.links).toEqual([{ fromArticleId: ID_A, toArticleId: ID_B, clicks: 1 }]);
  });

  it('ignores events on a slug that is not a member, and zero counts', () => {
    const out = cl.buildSeriesBox(
      [seenRow('someone-else', 40), seenRow(A, 0), clickRow('someone-else', ID_A, 9)],
      SCOPE3,
      [A, B, C, 'someone-else'],
    );
    expect(out).toEqual(cl.emptySeriesBox([ID_A, ID_B, ID_C]));
  });

  it('matches ids case-insensitively and answers in the membership spelling', () => {
    const out = cl.buildSeriesBox([clickRow(A, ID_B.toUpperCase(), 2)], SCOPE3, [A, B, C]);
    expect(out.links).toEqual([{ fromArticleId: ID_A, toArticleId: ID_B, clicks: 2 }]);
  });

  it('sums repeated rows and sorts links most-clicked first, ties by article', () => {
    const out = cl.buildSeriesBox(
      [
        clickRow(A, ID_B, 1),
        clickRow(A, ID_B, 2), // same pair (e.g. the path and its trailing-slash twin)
        clickRow(C, ID_A, 9),
        clickRow(B, ID_A, 3),
        clickRow(A, ID_C, 3),
      ],
      SCOPE3,
      [A, B, C],
    );
    expect(out.links.map((l) => [l.fromArticleId, l.toArticleId, l.clicks])).toEqual([
      [ID_C, ID_A, 9],
      [ID_A, ID_B, 3],
      [ID_A, ID_C, 3],
      [ID_B, ID_A, 3],
    ]);
    expect(out.clicks).toBe(18);
  });

  it('gives every member a zero row when nothing was recorded at all', () => {
    const out = cl.buildSeriesBox([], SCOPE3, [A, B, C]);
    expect(out).toEqual({
      seen: 0,
      clicks: 0,
      perArticle: [
        { articleId: ID_A, seen: 0, clicks: 0 },
        { articleId: ID_B, seen: 0, clicks: 0 },
        { articleId: ID_C, seen: 0, clicks: 0 },
      ],
      links: [],
    });
  });

  it("pathSlug is SQL's split_part(pathname, '/', 4), trailing slash included", () => {
    expect(cl.pathSlug(`/artikel/ideas/${A}`)).toBe(A);
    expect(cl.pathSlug(`/artikel/ideas/${A}/`)).toBe(A);
    expect(cl.pathSlug('/inspire')).toBe('');
  });
});

describe('getClusterSeriesBoxUncached SQL shape (R18, R19)', () => {
  it('ONE statement, two branches: exact paths, index scope, window floor, no COUNT(DISTINCT)', async () => {
    await cl.getClusterSeriesBoxUncached('c1', [A, B, C], PATHS, [ID_A, ID_B, ID_C], 90);
    const found = statements.filter((x) => isSeries(x.sql));
    expect(found).toHaveLength(1);
    const { sql, params } = found[0];
    expect(sql.match(/UNION ALL/g)).toHaveLength(1);
    expect(sql.match(/\bFROM analytics_events\b/g)).toHaveLength(2);
    // The event names are SQL literals (planning must prove the partial index
    // predicate), and they are the ones the tracker actually sends.
    expect(sql).toContain(`event_name = '${SERIES_BOX_VIEWED_EVENT}'`);
    expect(sql).toContain(`event_name = '${SERIES_LINK_CLICKED_EVENT}'`);
    expect(SERIES_BOX_VIEWED_EVENT).toBe('Series Box Viewed');
    expect(SERIES_LINK_CLICKED_EVENT).toBe('Series Link Clicked');
    expect(sql.match(/is_bot = FALSE/g)).toHaveLength(2);
    expect(sql.match(/pathname = ANY \(/g)).toHaveLength(2);
    expect(sql.match(/pathname LIKE '\/artikel\/%'/g)).toHaveLength(2);
    expect(sql).not.toMatch(/COUNT\s*\(\s*DISTINCT/i);
    expect(sql).not.toMatch(/\bSELECT\s+(\w+\.)?\*/i);
    expect(sql.match(/COUNT\(\*\)::bigint/g)).toHaveLength(2);
    // Bounded by the window: 90 KL days including 8 Nov 2026 start 11 Aug,
    // KL midnight = 16:00 UTC the day before.
    expect(params.filter((v) => v === '2026-08-10T16:00:00.000Z')).toHaveLength(2);
    expect(params).toContain(JSON.stringify(PATHS));
    // Bounded output: at most one row per member, plus one per from→to pair.
    expect(sql.match(/GROUP BY 1, 2, 3/g)).toHaveLength(2);
  });

  it('the impressions branch names index columns and `props` — nothing else (I-F1)', async () => {
    await cl.getClusterSeriesBoxUncached('c1', [A, B, C], PATHS, [ID_A, ID_B, ID_C], 365);
    const { sql } = statements.find((x) => isSeries(x.sql))!;
    const seen = sql.slice(0, sql.indexOf('UNION ALL'));
    const outside = [...identifiersIn(seen)].filter(
      (id) => !SERIES_INDEX_COLUMNS.has(id) && !SERIES_NON_COLUMNS.has(id),
    );
    // `props` is the ONE non-index column the branch may name: the cluster_id
    // attribution filter (I-F1). Everything the index cannot answer stays out,
    // so the probe still does all the narrowing.
    expect(outside).toEqual(['props']);
    expect(seen).not.toContain('visitor_hash');
    // split_part only names the already-matched row's slug, never in a WHERE
    // (that would throw away the exact-path probes).
    const where = seen.slice(seen.indexOf('WHERE'));
    expect(where).not.toContain('split_part');
  });

  it('BOTH branches filter on the cluster their events carry (I-F1)', async () => {
    await cl.getClusterSeriesBoxUncached('cluster-7', [A, B, C], PATHS, [ID_A, ID_B, ID_C], 30);
    const { sql, params } = statements.find((x) => isSeries(x.sql))!;
    const seen = sql.slice(0, sql.indexOf('UNION ALL'));
    const clicks = sql.slice(sql.indexOf('UNION ALL'));
    // One per branch: an impression and a click are each attributed to the box
    // that was actually on screen, so two clusters can never count the same
    // event — the double count I-F1 closed.
    expect(sql.match(/props->>'cluster_id' =/g)).toHaveLength(2);
    expect(seen).toContain("props->>'cluster_id' =");
    expect(clicks).toContain("props->>'cluster_id' =");
    expect(params.filter((v) => v === 'cluster-7')).toHaveLength(2);
    // `to_article_id` stays clicks-only: an impression has no target.
    expect(seen).not.toContain('to_article_id');
    expect(clicks).toContain("props->>'to_article_id'");
  });

  it('runs no statement when the cluster resolves to no path', async () => {
    const out = await cl.getClusterSeriesBoxUncached('c1', [A], [], [ID_A], 90);
    expect(out).toEqual(cl.emptySeriesBox([ID_A]));
    expect(statements).toHaveLength(0);
  });

  it('counts every member (the canary has no real membership to ask R2 about)', async () => {
    route = (s) => (isSeries(s) ? [{ kind: 'seen', slug: B, other: null, n: '4' }] : undefined);
    const out = await cl.getClusterSeriesBoxUncached('c1', [A, B], PATHS, [ID_A, ID_B], 90);
    expect(out.seen).toBe(4);
    expect(getShownSeriesForArticles).not.toHaveBeenCalled();
  });
});

describe('getClusterSeriesBox cached (R18, R19)', () => {
  const AB = { slugs: [A, B], memberIds: [ID_A, ID_B] };
  const shown = (entries: [string, string][]) =>
    new Map(entries.map(([id, clusterId]) => [id, { clusterId, name: 'S', rendersBox: true }]));

  beforeEach(() => {
    resolveArticlePaths.mockResolvedValue(
      new Map([
        [A, p(A)],
        [B, p(B)],
      ]),
    );
  });

  it('reads impressions only on the paths of members whose shown series is THIS cluster', async () => {
    getShownSeriesForArticles.mockResolvedValue(
      shown([
        [ID_A, 'c1'],
        [ID_B, 'other'],
      ]),
    );
    route = (s) =>
      isSeries(s)
        ? [
            { kind: 'seen', slug: A, other: null, n: '6' },
            { kind: 'click', slug: A, other: ID_B, n: '2' },
          ]
        : undefined;
    const out = await cl.getClusterSeriesBox('c1', AB, 90);
    expect(out.seen).toBe(6);
    expect(out.clicks).toBe(2);
    const { params } = statements.find((x) => isSeries(x.sql))!;
    // A's two paths for the impressions branch; both members' for the clicks.
    expect(params).toContain(JSON.stringify(p(A)));
    expect(params).toContain(JSON.stringify([...p(A), ...p(B)].sort()));
    expect(getShownSeriesForArticles).toHaveBeenCalledWith([ID_A, ID_B]);
  });

  it('matches the cluster id case-insensitively', async () => {
    getShownSeriesForArticles.mockResolvedValue(
      shown([
        [ID_A, 'C1'],
        [ID_B, 'C1'],
      ]),
    );
    route = (s) => (isSeries(s) ? [{ kind: 'seen', slug: B, other: null, n: '3' }] : undefined);
    expect((await cl.getClusterSeriesBox('c1', AB, 90)).seen).toBe(3);
  });

  it('every member shown by ANOTHER cluster → the statement counts no impression path', async () => {
    getShownSeriesForArticles.mockResolvedValue(
      shown([
        [ID_A, 'other'],
        [ID_B, 'other-too'],
      ]),
    );
    route = (s) => (isSeries(s) ? [] : undefined);
    const out = await cl.getClusterSeriesBox('c1', AB, 90);
    expect(out).toEqual(cl.emptySeriesBox([ID_A, ID_B]));
    const { params } = statements.find((x) => isSeries(x.sql))!;
    expect(params).toContain(JSON.stringify([]));
  });

  // ── T5-F1: switching the box OFF must not zero the cluster's own history ──

  it('switched OFF (no member shows ANY series): its own impressions still count (T5-F1)', async () => {
    // What the database actually answers once this cluster's switch goes off:
    // the members are in no reader-facing cluster, so there is NO entry for
    // them. A 'Series Box Viewed' row only exists where a box rendered, so
    // these views are this cluster's own history — not nothing.
    getShownSeriesForArticles.mockResolvedValue(new Map());
    route = (s) =>
      isSeries(s)
        ? [
            { kind: 'seen', slug: A, other: null, n: '7' },
            { kind: 'seen', slug: B, other: null, n: '4' },
          ]
        : undefined;
    const out = await cl.getClusterSeriesBox('c1', AB, 90);
    expect(out.seen).toBe(11);
    expect(out.perArticle).toEqual([
      { articleId: ID_A, seen: 7, clicks: 0 },
      { articleId: ID_B, seen: 4, clicks: 0 },
    ]);
    // Both members' paths are probed — the branch is not left with an empty set.
    const { params } = statements.find((x) => isSeries(x.sql))!;
    expect(params).toContain(JSON.stringify([...p(A), ...p(B)].sort()));
    expect(params).not.toContain(JSON.stringify([]));
  });

  it('switched OFF with views but no clicks: seen survives, so the panel cannot say "nothing" (T5-F1)', async () => {
    getShownSeriesForArticles.mockResolvedValue(new Map());
    route = (s) => (isSeries(s) ? [{ kind: 'seen', slug: A, other: null, n: '5' }] : undefined);
    const out = await cl.getClusterSeriesBox('c1', AB, 90);
    expect(out.seen).toBe(5);
    expect(out.clicks).toBe(0);
    expect(out.seen > 0 || out.clicks > 0).toBe(true);
  });

  it('widening keeps cross-cluster de-dup: a member a DIFFERENT cluster shows is still excluded (T5-F1)', async () => {
    // A renders another switched-ON cluster's box; B renders none at all.
    getShownSeriesForArticles.mockResolvedValue(shown([[ID_A, 'other']]));
    route = (s) =>
      isSeries(s)
        ? [
            { kind: 'seen', slug: A, other: null, n: '9' },
            { kind: 'seen', slug: B, other: null, n: '5' },
          ]
        : undefined;
    const out = await cl.getClusterSeriesBox('c1', AB, 90);
    expect(out.seen).toBe(5);
    expect(out.perArticle).toEqual([
      { articleId: ID_A, seen: 0, clicks: 0 },
      { articleId: ID_B, seen: 5, clicks: 0 },
    ]);
    // Only B's paths go into the impressions branch.
    const { params } = statements.find((x) => isSeries(x.sql))!;
    expect(params).toContain(JSON.stringify(p(B)));
  });

  it('is cached under its own key with the cluster tag, keyed by window and scope', async () => {
    getShownSeriesForArticles.mockResolvedValue(
      shown([
        [ID_A, 'c1'],
        [ID_B, 'c1'],
      ]),
    );
    route = (s) => (isSeries(s) ? [{ kind: 'seen', slug: A, other: null, n: '1' }] : undefined);
    await cl.getClusterSeriesBox('c1', AB, 90);
    await cl.getClusterSeriesBox('c1', AB, 365);
    const entries = cacheCalls.filter((c) => c.key.startsWith(cl.SERIES_CACHE_KEY));
    expect(entries).toHaveLength(2);
    expect(entries[0].tags).toEqual(['article-analytics', 'cluster-analytics:c1']);
    expect(entries[0].key).toContain('|90|');
    expect(entries[1].key).toContain('|365|');
    expect(entries[0].key).toContain(A);
    expect(cl.SERIES_CACHE_KEY).not.toBe(cl.PAGEVIEWS_CACHE_KEY);
    expect(cl.SERIES_CACHE_KEY).not.toBe(cl.CLICKS_CACHE_KEY);
    // What the cache stores survives the JSON round trip unchanged.
    expect(await entries[0].value).toEqual(await cl.getClusterSeriesBox('c1', AB, 90));
  });

  it('a cluster with no members answers without reading anything', async () => {
    const out = await cl.getClusterSeriesBox('c1', { slugs: [], memberIds: [] }, 90);
    expect(out).toEqual({ seen: 0, clicks: 0, perArticle: [], links: [] });
    expect(statements).toHaveLength(0);
    expect(cacheCalls).toHaveLength(0);
    expect(getShownSeriesForArticles).not.toHaveBeenCalled();
  });

  it('a one-member cluster still counts its impressions (the box can be seen there)', async () => {
    // The box only renders with a publishable sibling, but a member can be
    // alone TODAY and have been seen yesterday — the history stays true.
    resolveArticlePaths.mockResolvedValue(new Map([[A, p(A)]]));
    getShownSeriesForArticles.mockResolvedValue(shown([[ID_A, 'c1']]));
    route = (s) => (isSeries(s) ? [{ kind: 'seen', slug: A, other: null, n: '2' }] : undefined);
    const out = await cl.getClusterSeriesBox('c1', { slugs: [A], memberIds: [ID_A] }, 30);
    expect(out.seen).toBe(2);
  });
});
