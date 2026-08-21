import { describe, it, expect } from 'vitest';
import {
  normalize,
  levenshteinSimilarity,
  groupSimilarTags,
  type TagWithCounts,
} from '../tag-similarity';

describe('normalize', () => {
  it('lowercases and trims', () => {
    expect(normalize('  Beach Wedding  ')).toBe('beach wedding');
  });

  it('strips hyphens and collapses spaces', () => {
    expect(normalize('Pre-Wedding')).toBe('pre wedding');
    expect(normalize('Pre Wedding')).toBe('pre wedding');
    expect(normalize('pre wedding')).toBe('pre wedding');
  });

  it('strips punctuation', () => {
    // Apostrophe removed → "valentines day", plural stripping only applies to end of string
    expect(normalize("Valentine's Day")).toBe('valentines day');
    expect(normalize('Valentines Day')).toBe('valentines day');
  });

  it('strips trailing plural: simple s', () => {
    expect(normalize('Venues')).toBe('venue');
    expect(normalize('venues')).toBe('venue');
  });

  it('strips trailing plural: es', () => {
    expect(normalize('Dresses')).toBe('dress');
  });

  it('strips trailing plural: ies → y', () => {
    expect(normalize('Accessories')).toBe('accessory');
  });

  it('does not strip ss words', () => {
    expect(normalize('dress')).toBe('dress');
  });

  it('handles single-word tags', () => {
    expect(normalize('Cake')).toBe('cake');
  });
});

describe('levenshteinSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(levenshteinSimilarity('hello', 'hello')).toBe(1);
  });

  it('returns 0 for completely different strings of same length', () => {
    expect(levenshteinSimilarity('abc', 'xyz')).toBe(0);
  });

  it('returns 1 for two empty strings', () => {
    expect(levenshteinSimilarity('', '')).toBe(1);
  });

  it('returns correct similarity for known pairs', () => {
    // "beach" vs "beech" — distance 1, max len 5 → similarity 0.8
    expect(levenshteinSimilarity('beach', 'beech')).toBeCloseTo(0.8);
  });

  it('returns correct similarity for different lengths', () => {
    // "cat" vs "cats" — distance 1, max len 4 → similarity 0.75
    expect(levenshteinSimilarity('cat', 'cats')).toBeCloseTo(0.75);
  });
});

describe('groupSimilarTags', () => {
  function makeTag(id: string, name: string, articleCount = 0, listingCount = 0): TagWithCounts {
    return {
      id,
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      isHidden: false,
      articleCount,
      listingCount,
    };
  }

  it('groups exact case-insensitive matches', () => {
    const tags = [
      makeTag('1', 'Beach Wedding', 5),
      makeTag('2', 'beach wedding', 3),
      makeTag('3', 'BEACH WEDDING', 1),
    ];
    const groups = groupSimilarTags(tags);
    expect(groups).toHaveLength(1);
    expect(groups[0].tags).toHaveLength(3);
    expect(groups[0].suggestedWinnerId).toBe('1'); // highest article count
  });

  it('groups plural/singular variants', () => {
    const tags = [makeTag('1', 'Venue', 2), makeTag('2', 'Venues', 5)];
    const groups = groupSimilarTags(tags);
    expect(groups).toHaveLength(1);
    expect(groups[0].tags).toHaveLength(2);
    expect(groups[0].suggestedWinnerId).toBe('2'); // "Venues" has more articles
  });

  it('groups hyphen vs space variants', () => {
    const tags = [makeTag('1', 'Pre-Wedding', 3), makeTag('2', 'Pre Wedding', 1)];
    const groups = groupSimilarTags(tags);
    expect(groups).toHaveLength(1);
    expect(groups[0].tags).toHaveLength(2);
  });

  it('does not group unrelated tags', () => {
    const tags = [
      makeTag('1', 'Beach Wedding'),
      makeTag('2', 'Mountain Retreat'),
      makeTag('3', 'City Wedding'),
    ];
    const groups = groupSimilarTags(tags);
    expect(groups).toHaveLength(0);
  });

  it('does not return single-tag groups', () => {
    const tags = [makeTag('1', 'Unique Tag')];
    const groups = groupSimilarTags(tags);
    expect(groups).toHaveLength(0);
  });

  it('sorts groups by size descending', () => {
    const tags = [
      makeTag('1', 'Cake'),
      makeTag('2', 'Cakes'),
      makeTag('3', 'Beach Wedding'),
      makeTag('4', 'beach wedding'),
      makeTag('5', 'Beach Weddings'),
    ];
    const groups = groupSimilarTags(tags);
    expect(groups.length).toBeGreaterThanOrEqual(2);
    expect(groups[0].tags.length).toBeGreaterThanOrEqual(groups[1].tags.length);
  });

  it('uses listing count as tiebreaker for suggested winner', () => {
    const tags = [makeTag('1', 'Florist', 5, 2), makeTag('2', 'Florists', 5, 10)];
    const groups = groupSimilarTags(tags);
    expect(groups).toHaveLength(1);
    expect(groups[0].suggestedWinnerId).toBe('2'); // same articles, more listings
  });

  it('returns empty array for empty input', () => {
    expect(groupSimilarTags([])).toEqual([]);
  });

  it('groups same-length fuzzy typos', () => {
    // "photographer" vs "photographor" — distance 1, len 12 → sim ≈ 0.917
    const groups = groupSimilarTags([
      makeTag('1', 'Photographer', 5),
      makeTag('2', 'Photographor', 1),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].tags.map((t) => t.id).sort()).toEqual(['1', '2']);
  });

  it('does not group similar prefixes of very different length', () => {
    // "cake" vs "cake smash session" share a prefix but the length gap
    // makes similarity < 0.85 — the length-band prune must not group them.
    const groups = groupSimilarTags([makeTag('1', 'Cake'), makeTag('2', 'Cake Smash Session')]);
    expect(groups).toHaveLength(0);
  });
});

describe('groupSimilarTags — pruning is output-preserving', () => {
  function makeTag(id: string, name: string): TagWithCounts {
    return {
      id,
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      isHidden: false,
      articleCount: 0,
      listingCount: 0,
    };
  }

  // Reference implementation of the ORIGINAL O(n²) grouping (exact + fuzzy),
  // used to prove the optimized function groups exactly the same tags.
  function bruteMembership(tags: TagWithCounts[]): Set<string>[] {
    const n = tags.length;
    const norm = tags.map((t) => normalize(t.name));
    const parent = Array.from({ length: n }, (_, i) => i);
    const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    const union = (a: number, b: number) => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent[ra] = rb;
    };
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (norm[i] === norm[j] || levenshteinSimilarity(norm[i], norm[j]) >= 0.85) union(i, j);
      }
    }
    const comps = new Map<number, string[]>();
    for (let i = 0; i < n; i++) {
      const r = find(i);
      const list = comps.get(r);
      if (list) list.push(tags[i].id);
      else comps.set(r, [tags[i].id]);
    }
    return [...comps.values()].filter((c) => c.length >= 2).map((c) => new Set(c));
  }

  function membershipKey(sets: Set<string>[]): string {
    return sets
      .map((s) => [...s].sort().join(','))
      .sort()
      .join('|');
  }

  function assertEquivalent(tags: TagWithCounts[]) {
    const optimized = groupSimilarTags(tags).map((g) => new Set(g.tags.map((t) => t.id)));
    expect(membershipKey(optimized)).toBe(membershipKey(bruteMembership(tags)));
  }

  it('matches brute force on a hand-picked mixed fixture', () => {
    assertEquivalent([
      makeTag('1', 'Beach Wedding'),
      makeTag('2', 'beach wedding'),
      makeTag('3', 'Beach Weddings'),
      makeTag('4', 'Photographer'),
      makeTag('5', 'Photographor'),
      makeTag('6', 'Cake'),
      makeTag('7', 'Cakes'),
      makeTag('8', 'Cake Smash Session'),
      makeTag('9', 'Venue'),
      makeTag('10', 'Venues'),
      makeTag('11', 'Mountain Retreat'),
      makeTag('12', "Valentine's Day"),
      makeTag('13', 'Valentines Day'),
      makeTag('14', '!!!'), // normalizes to '' — must not fuzzy-match anything
      makeTag('15', '???'), // also '' — groups only with #14 via exact pass
      makeTag('16', 'Florist'),
      makeTag('17', 'Florero'),
    ]);
  });

  it('matches brute force on a large deterministic fixture', () => {
    // Deterministic pseudo-random names of varied length; includes injected
    // near-duplicates so real groups exist across the length spectrum.
    const words = [
      'wedding',
      'venue',
      'cake',
      'florist',
      'photo',
      'bridal',
      'ceremony',
      'reception',
      'garden',
      'beach',
    ];
    const tags: TagWithCounts[] = [];
    let seed = 12345;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let i = 0; i < 400; i++) {
      const parts = 1 + Math.floor(rand() * 3);
      let name = '';
      for (let p = 0; p < parts; p++)
        name += (p ? ' ' : '') + words[Math.floor(rand() * words.length)];
      tags.push(makeTag(`b${i}`, name + (rand() > 0.7 ? String(Math.floor(rand() * 5)) : '')));
    }
    assertEquivalent(tags);
  });

  it('handles production-scale input without quadratic blowup', () => {
    const tags: TagWithCounts[] = [];
    let seed = 98765;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    // 3,000 unique-ish names spanning many lengths — mirrors the real table.
    for (let i = 0; i < 3000; i++) {
      const len = 3 + Math.floor(rand() * 25);
      let name = '';
      for (let c = 0; c < len; c++) name += String.fromCharCode(97 + Math.floor(rand() * 26));
      tags.push({
        id: `s${i}`,
        name,
        slug: name,
        isHidden: false,
        articleCount: 0,
        listingCount: 0,
      });
    }
    // Inject a guaranteed same-length fuzzy pair that must group.
    tags.push({
      id: 'inj-a',
      name: 'photographerspecialist',
      slug: 'a',
      isHidden: false,
      articleCount: 3,
      listingCount: 0,
    });
    tags.push({
      id: 'inj-b',
      name: 'photographerspecialisx',
      slug: 'b',
      isHidden: false,
      articleCount: 1,
      listingCount: 0,
    });

    const start = performance.now();
    const groups = groupSimilarTags(tags);
    const elapsedMs = performance.now() - start;

    // Generous ceiling: the O(n²) version took many seconds on this input.
    expect(elapsedMs).toBeLessThan(2000);
    const injected = groups.find((g) => g.tags.some((t) => t.id === 'inj-a'));
    expect(injected).toBeDefined();
    expect(injected!.tags.map((t) => t.id).sort()).toEqual(['inj-a', 'inj-b']);
    // Winner selection (AC: suggested winner unchanged) — inj-a has more articles.
    expect(injected!.suggestedWinnerId).toBe('inj-a');
  });
});
