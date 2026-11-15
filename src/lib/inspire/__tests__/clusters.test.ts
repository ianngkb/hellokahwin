import { describe, it, expect } from 'vitest';
import {
  applyClusterChoice,
  compareCodes,
  countClusters,
  initialClusterId,
  isClusterCategory,
  listClusterOptions,
  nextClusterCode,
  type ClusterCategoryLike,
} from '../clusters';

const P1: ClusterCategoryLike = {
  id: 'p1',
  name: 'Mas kahwin',
  parentId: null,
  isPillar: true,
  pillarCode: 'P1',
};
const P2: ClusterCategoryLike = {
  id: 'p2',
  name: 'Majlis',
  parentId: null,
  isPillar: true,
  pillarCode: 'P2',
};
const C11: ClusterCategoryLike = {
  id: 'c11',
  name: 'Ikut negeri',
  parentId: 'p1',
  pillarCode: 'C1.1',
};
const C110: ClusterCategoryLike = {
  id: 'c110',
  name: 'Sejarah',
  parentId: 'p1',
  pillarCode: 'C1.10',
};
const C12: ClusterCategoryLike = { id: 'c12', name: 'Kadar', parentId: 'p1', pillarCode: 'C1.2' };
const C21: ClusterCategoryLike = { id: 'c21', name: 'Dewan', parentId: 'p2', pillarCode: 'C2.1' };
// A legacy child of a pillar with no code — NOT a cluster.
const LEGACY_CHILD: ClusterCategoryLike = { id: 'lc', name: 'Lama', parentId: 'p1' };
// A coded category under a non-pillar parent — NOT a cluster.
const ROOT: ClusterCategoryLike = { id: 'r', name: 'Root', parentId: null };
const STRAY: ClusterCategoryLike = { id: 's', name: 'Stray', parentId: 'r', pillarCode: 'C9.1' };

const ALL = [C21, C110, P2, C12, LEGACY_CHILD, P1, C11, ROOT, STRAY];
const byId = new Map(ALL.map((c) => [c.id, c]));

describe('isClusterCategory', () => {
  it('needs a pillar code, a pillar parent, and not to be a pillar', () => {
    expect(isClusterCategory(C11, byId)).toBe(true);
    expect(isClusterCategory(P1, byId)).toBe(false);
    expect(isClusterCategory(LEGACY_CHILD, byId)).toBe(false);
    expect(isClusterCategory(STRAY, byId)).toBe(false);
    expect(isClusterCategory(undefined, byId)).toBe(false);
  });
});

describe('compareCodes', () => {
  it('sorts numerically and puts missing codes last', () => {
    expect(['C1.10', 'C1.2', null, 'C1.1'].sort(compareCodes)).toEqual([
      'C1.1',
      'C1.2',
      'C1.10',
      null,
    ]);
    expect(compareCodes('P10', 'P2')).toBeGreaterThan(0);
  });
});

describe('listClusterOptions', () => {
  it('lists only clusters, grouped by pillar in code order, with the pillar name', () => {
    const opts = listClusterOptions(ALL);
    expect(opts.map((o) => o.id)).toEqual(['c11', 'c12', 'c110', 'c21']);
    expect(opts[0]).toMatchObject({ pillarId: 'p1', pillarName: 'Mas kahwin', code: 'C1.1' });
  });
});

describe('initialClusterId', () => {
  it('prefers a primary category that is itself a cluster', () => {
    expect(initialClusterId('c12', ['p1', 'c11'], ALL)).toBe('c12');
  });
  it('otherwise takes the first linked cluster', () => {
    expect(initialClusterId('p1', ['p1', 'lc', 'c11'], ALL)).toBe('c11');
  });
  it('returns empty when the article has no cluster', () => {
    expect(initialClusterId('p1', ['p1', 'lc'], ALL)).toBe('');
    expect(initialClusterId(null, [], ALL)).toBe('');
  });
});

describe('applyClusterChoice — one cluster per article', () => {
  it('replaces the old cluster with the new one and keeps everything else', () => {
    expect(applyClusterChoice(['p1', 'lc', 'c11'], 'c12', ALL, 'p1')).toEqual(['p1', 'lc', 'c12']);
  });
  it('collapses several clusters to the chosen one', () => {
    const out = applyClusterChoice(['p1', 'c11', 'c12', 'c21'], 'c21', ALL, 'p1');
    expect(countClusters(out, ALL)).toBe(1);
    expect(out).toContain('c21');
  });
  it('removes every cluster when "no cluster" is chosen', () => {
    expect(applyClusterChoice(['p1', 'c11', 'lc'], '', ALL, 'p1')).toEqual(['p1', 'lc']);
  });
  it('never removes the primary category, even when it is a cluster', () => {
    expect(applyClusterChoice(['c11', 'c12'], 'c11', ALL, 'c11')).toEqual(['c11']);
  });
  it('ignores a chosen id that is not a cluster', () => {
    expect(applyClusterChoice(['p1'], 'lc', ALL, 'p1')).toEqual(['p1']);
  });
});

describe('nextClusterCode', () => {
  it('takes the next number under the pillar, ignoring other pillars', () => {
    expect(nextClusterCode('P1', ['C1.1', 'C1.10', 'C1.2', 'C2.40', null])).toBe('C1.11');
  });
  it('starts at .1 for a pillar with no clusters', () => {
    expect(nextClusterCode('P7', [])).toBe('C7.1');
  });
  it('returns null for a pillar with no usable code', () => {
    expect(nextClusterCode(null, [])).toBeNull();
    expect(nextClusterCode('X1', [])).toBeNull();
  });
});
