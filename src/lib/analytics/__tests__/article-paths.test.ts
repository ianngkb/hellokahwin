import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';

/**
 * `resolveArticlePaths` — the list of exact pathnames the per-article raw
 * getters match with `pathname = ANY(…)`. If a path is missing here, that
 * article's views on it silently vanish from Devices / Sources / What people
 * did, so the composition is pinned: canonical + category redirects + every
 * human path seen in the discovery window, each with its trailing-slash twin,
 * de-duplicated. HelloKahwin has no rollup tables, so "seen" is one raw read.
 */

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));

let known: unknown[] = [];
let seen: unknown[] = [];
const statements: { sql: string; params: unknown[] }[] = [];
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    execute: (q: SQL) => {
      const { sql, params } = new PgDialect().sqlToQuery(q);
      statements.push({ sql, params });
      return Promise.resolve(sql.includes('analytics_events') ? seen : known);
    },
  },
}));

const {
  resolveArticlePathsUncached,
  resolveArticlePaths,
  slugInList,
  textArrayParam,
  withSlashVariants,
  MAX_SEEN_PATHS_PER_SLUG,
  DISCOVERY_WINDOW_DAYS,
} = await import('../article-paths');

const seenStatement = () => statements.find((s) => s.sql.includes('analytics_events'))!;
const knownStatement = () => statements.find((s) => !s.sql.includes('analytics_events'))!;

beforeEach(() => {
  known = [];
  seen = [];
  statements.length = 0;
});

describe('resolveArticlePathsUncached', () => {
  it('unions canonical, redirect and seen paths with trailing-slash twins, de-duplicated', async () => {
    known = [
      { slug: 'hantaran', category_slug: 'persiapan' }, // canonical
      { slug: 'hantaran', category_slug: 'adat' }, // moved from `adat`
    ];
    seen = [
      { slug: 'hantaran', path: '/artikel/persiapan/hantaran' }, // dup of canonical
      { slug: 'hantaran', path: '/artikel/lama/hantaran/' }, // legacy trailing slash
    ];
    const out = await resolveArticlePathsUncached(['hantaran']);
    expect(out.get('hantaran')).toEqual([
      '/artikel/adat/hantaran',
      '/artikel/adat/hantaran/',
      '/artikel/lama/hantaran',
      '/artikel/lama/hantaran/',
      '/artikel/persiapan/hantaran',
      '/artikel/persiapan/hantaran/',
    ]);
  });

  it('gives a brand-new article (no traffic yet) its canonical path and twin', async () => {
    known = [{ slug: 'baru', category_slug: 'persiapan' }];
    const out = await resolveArticlePathsUncached(['baru']);
    expect(out.get('baru')).toEqual(['/artikel/persiapan/baru', '/artikel/persiapan/baru/']);
  });

  it('maps an unknown slug to [] and an empty list to an empty map without querying', async () => {
    const out = await resolveArticlePathsUncached(['nope']);
    expect(out.get('nope')).toEqual([]);
    statements.length = 0;
    expect((await resolveArticlePathsUncached([])).size).toBe(0);
    expect((await resolveArticlePathsUncached(['  ', ''])).size).toBe(0);
    expect(statements).toHaveLength(0);
  });

  it('ignores a seen row for a slug that was not asked for', async () => {
    seen = [{ slug: 'other', path: '/artikel/x/other' }];
    const out = await resolveArticlePathsUncached(['wanted']);
    expect([...out.keys()]).toEqual(['wanted']);
  });

  it('does ONE seen-paths pass for the whole slug list, slugs as bound scalars', async () => {
    await resolveArticlePathsUncached(['b', 'a', 'a', ' c ']);
    expect(statements).toHaveLength(2);
    const s = seenStatement();
    // Sorted, de-duplicated, trimmed — one bind per slug.
    expect(s.params).toEqual(expect.arrayContaining(['a', 'b', 'c']));
    expect(s.sql).toMatch(/split_part\(pathname, '\/', 4\) IN \(\$\d+, \$\d+, \$\d+\)/);
  });

  it('excludes bots, scopes to /artikel/ and the discovery window, caps paths per slug', async () => {
    await resolveArticlePathsUncached(['a']);
    const s = seenStatement();
    expect(s.sql).toContain('is_bot = FALSE');
    expect(s.sql).toContain("pathname LIKE '/artikel/%'");
    expect(s.sql).toMatch(/created_at >= NOW\(\) - \(\$\d+::int \* INTERVAL '1 day'\)/);
    expect(s.params).toContain(DISCOVERY_WINDOW_DAYS);
    expect(s.sql).toMatch(/WHERE rn <= \$\d+/);
    expect(s.params).toContain(MAX_SEEN_PATHS_PER_SLUG);
    expect(s.sql).not.toContain('analytics_visitor_target_daily');
  });

  it('reads canonical + both sides of every category redirect', async () => {
    await resolveArticlePathsUncached(['a']);
    const s = knownStatement();
    expect(s.sql).toContain('JOIN inspire_categories c ON c.id = a.primary_category_id');
    expect(s.sql).toContain('r.from_category_slug');
    expect(s.sql).toContain('r.to_category_slug');
  });
});

describe('resolveArticlePaths (cached)', () => {
  it('normalises the key and skips the database for an empty list', async () => {
    known = [{ slug: 'a', category_slug: 'c' }];
    const out = await resolveArticlePaths(['a', 'a']);
    expect(out.get('a')).toEqual(['/artikel/c/a', '/artikel/c/a/']);
    statements.length = 0;
    expect((await resolveArticlePaths([])).size).toBe(0);
    expect(statements).toHaveLength(0);
  });
});

describe('helpers', () => {
  it('withSlashVariants gives both twins and drops the bare root', () => {
    expect(withSlashVariants('/a/b/')).toEqual(['/a/b', '/a/b/']);
    expect(withSlashVariants('/a/b')).toEqual(['/a/b', '/a/b/']);
    expect(withSlashVariants('/')).toEqual([]);
  });

  it('textArrayParam binds a whole list as ONE parameter', () => {
    const { sql, params } = new PgDialect().sqlToQuery(textArrayParam(['/x', '/y', '/z']));
    expect(params).toEqual([JSON.stringify(['/x', '/y', '/z'])]);
    expect(sql).toBe('ARRAY(SELECT jsonb_array_elements_text($1::text::jsonb))');
  });

  it('slugInList binds one scalar per element', () => {
    const { sql, params } = new PgDialect().sqlToQuery(slugInList(['a', 'b']));
    expect(params).toEqual(['a', 'b']);
    expect(sql).toBe('$1, $2');
  });
});
