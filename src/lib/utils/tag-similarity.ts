export interface TagWithCounts {
  id: string;
  name: string;
  slug: string;
  isHidden: boolean;
  articleCount: number;
  listingCount: number;
}

export interface MergeGroup {
  tags: TagWithCounts[];
  suggestedWinnerId: string;
}

/**
 * Normalize a tag name for comparison:
 * lowercase, trim, strip punctuation/hyphens, collapse whitespace, strip trailing plural suffixes.
 */
export function normalize(name: string): string {
  let s = name
    .toLowerCase()
    .trim()
    .replace(/[-]/g, ' ') // hyphens to spaces
    .replace(/[^a-z0-9\s]/g, '') // strip punctuation
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim();

  // Strip common English plural suffixes
  if (s.endsWith('ies') && s.length > 4) {
    s = s.slice(0, -3) + 'y';
  } else if (
    s.endsWith('ses') ||
    s.endsWith('xes') ||
    s.endsWith('zes') ||
    s.endsWith('ches') ||
    s.endsWith('shes')
  ) {
    s = s.slice(0, -2);
  } else if (s.endsWith('s') && !s.endsWith('ss') && s.length > 2) {
    s = s.slice(0, -1);
  }

  return s;
}

/**
 * Compute Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // Use single-row optimization
  const prev = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    let prevDiag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = prev[j];
      if (a[i - 1] === b[j - 1]) {
        prev[j] = prevDiag;
      } else {
        prev[j] = 1 + Math.min(prevDiag, prev[j - 1], prev[j]);
      }
      prevDiag = temp;
    }
  }

  return prev[n];
}

/**
 * Returns normalized similarity 0-1 (1 = identical).
 */
export function levenshteinSimilarity(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

/**
 * Levenshtein distance with an early-exit budget. Returns the true distance
 * when it is <= maxDist, otherwise `maxDist + 1` (a sentinel meaning "farther
 * than the budget"). Never computes more than it must: bails on a length gap
 * wider than the budget, and after any full row whose minimum exceeds it.
 */
function boundedLevenshteinDistance(a: string, b: string, maxDist: number): number {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > maxDist) return maxDist + 1;

  const prev = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    let prevDiag = prev[0];
    prev[0] = i;
    let rowMin = prev[0];
    for (let j = 1; j <= n; j++) {
      const temp = prev[j];
      if (a[i - 1] === b[j - 1]) {
        prev[j] = prevDiag;
      } else {
        prev[j] = 1 + Math.min(prevDiag, prev[j - 1], prev[j]);
      }
      prevDiag = temp;
      if (prev[j] < rowMin) rowMin = prev[j];
    }
    // Every remaining edit can only add distance, so if the whole row already
    // exceeds the budget no completion can come back under it.
    if (rowMin > maxDist) return maxDist + 1;
  }

  return prev[n];
}

const SIMILARITY_THRESHOLD = 0.85;

/**
 * Groups similar tags using a union-find approach.
 * First pass: exact normalized matches.
 * Second pass: fuzzy Levenshtein on normalized names (>= 0.85).
 * Returns only groups with 2+ tags, sorted by group size descending.
 */
export function groupSimilarTags(tags: TagWithCounts[]): MergeGroup[] {
  const n = tags.length;
  if (n === 0) return [];

  // Union-Find
  const parent = new Array(n);
  const rank = new Array(n);
  for (let i = 0; i < n; i++) {
    parent[i] = i;
    rank[i] = 0;
  }

  function find(x: number): number {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]; // path compression
      x = parent[x];
    }
    return x;
  }

  function union(a: number, b: number) {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return;
    if (rank[ra] < rank[rb]) {
      parent[ra] = rb;
    } else if (rank[ra] > rank[rb]) {
      parent[rb] = ra;
    } else {
      parent[rb] = ra;
      rank[ra]++;
    }
  }

  // Pre-compute normalized names
  const normalized = tags.map((t) => normalize(t.name));

  // First pass: group exact normalized matches
  const exactMap = new Map<string, number>(); // normalized -> first index
  for (let i = 0; i < n; i++) {
    const key = normalized[i];
    const existing = exactMap.get(key);
    if (existing !== undefined) {
      union(i, existing);
    } else {
      exactMap.set(key, i);
    }
  }

  // Second pass: fuzzy Levenshtein on unique normalized forms.
  //
  // Naively this is O(u^2) full Levenshtein computations, which at production
  // scale (thousands of unique tag names) blows past the request timeout. Two
  // output-preserving prunes make it near-linear WITHOUT changing which pairs
  // group:
  //   1. Length band — similarity >= T requires min(len) >= T * max(len), so
  //      sorting by length lets us break the inner loop once names diverge in
  //      length past that bound (all later names are only longer → still fail).
  //   2. Bounded Levenshtein — abort a comparison once it provably can't reach
  //      the threshold. The final accept/reject uses the exact same formula as
  //      before, so grouping is identical.
  const uniqueEntries = Array.from(exactMap.entries()) // [normalized, representative index]
    .map(([norm, idx]) => ({ norm, idx, len: norm.length }))
    .filter((e) => e.len > 0) // empty normalized forms can't fuzzy-match anything (sim 0)
    .sort((a, b) => a.len - b.len);

  for (let i = 0; i < uniqueEntries.length; i++) {
    const ai = uniqueEntries[i];
    for (let j = i + 1; j < uniqueEntries.length; j++) {
      const bj = uniqueEntries[j];
      const maxLen = bj.len; // sorted ascending, so bj.len >= ai.len
      // Length-band break: once the length gap exceeds what the threshold can
      // tolerate, no later (even longer) name can qualify either. The +0.5
      // margin keeps this safe against float rounding without dropping any
      // integer-length pair the threshold would actually accept.
      if (bj.len - ai.len > (1 - SIMILARITY_THRESHOLD) * maxLen + 0.5) break;

      // Generous integer budget: never smaller than the largest distance the
      // exact formula would accept, so the bounded search never under-prunes.
      const budget = Math.floor((1 - SIMILARITY_THRESHOLD) * maxLen) + 1;
      const dist = boundedLevenshteinDistance(ai.norm, bj.norm, budget);
      if (dist > budget) continue; // definitely below threshold

      // Exact original gate — guarantees identical grouping output.
      if (1 - dist / maxLen >= SIMILARITY_THRESHOLD) {
        union(ai.idx, bj.idx);
      }
    }
  }

  // Collect groups
  const groups = new Map<number, number[]>(); // root -> indices
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const list = groups.get(root);
    if (list) {
      list.push(i);
    } else {
      groups.set(root, [i]);
    }
  }

  // Build result: only groups with 2+ tags
  const result: MergeGroup[] = [];
  for (const indices of groups.values()) {
    if (indices.length < 2) continue;

    const groupTags = indices.map((i) => tags[i]);

    // Suggested winner: tag with highest article count (tiebreak: highest listing count)
    let winnerId = groupTags[0].id;
    let bestArticles = groupTags[0].articleCount;
    let bestListings = groupTags[0].listingCount;
    for (let i = 1; i < groupTags.length; i++) {
      const t = groupTags[i];
      if (
        t.articleCount > bestArticles ||
        (t.articleCount === bestArticles && t.listingCount > bestListings)
      ) {
        winnerId = t.id;
        bestArticles = t.articleCount;
        bestListings = t.listingCount;
      }
    }

    result.push({ tags: groupTags, suggestedWinnerId: winnerId });
  }

  // Sort by group size descending
  result.sort((a, b) => b.tags.length - a.tags.length);

  return result;
}
