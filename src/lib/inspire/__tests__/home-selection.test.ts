import { describe, it, expect } from 'vitest';
import {
  selectHomeSet,
  isH6Satisfiable,
  homeCategoryKey,
  HOME_SET_SIZE,
  MIN_HOME_SET,
  type HomeSelection,
  type HomeSelectionCandidate,
} from '../home-selection';
import { HERO_INELIGIBLE_SLUGS } from '../hero-frame';

/**
 * H6 (DES-03 §7.5) over hand-built corpora, never the database.
 *
 * The corpora are hand-built because H6's interesting cases are the ones
 * production does not have: today's corpus has a capacity of 47 against a
 * required 13, so H6.5's ladder never fires and truncation never fires. A test
 * that only reads production would certify the two clauses most likely to be
 * wrong by never executing them — UI-07's finding in a different shape: measure
 * the worst case the field can hold, not the value set you happen to have.
 *
 * ⚠️ RANK CLAUSE (1) DOMINATES, WHICH IS EASY TO GET BACKWARDS WHEN READING
 * THESE FIXTURES. "Applied in order until one comparison decides" means clause
 * (2) — fewest already placed — only speaks on a `publishedAt` TIE. With every
 * timestamp distinct the fill is pure recency subject to H6.1 and H6.2, and
 * nothing spreads categories at all. That is deliberate (§7.5 records the
 * rejected alternative), and it is why the tied corpora below matter.
 */

// ── Fixture builders ──────────────────────────────────────────────────────
// A hero-ELIGIBLE cover: both R8(b) crops present with recorded dimensions, and
// a source aspect (1.5) comfortably over R8(c)'s 1.1616 threshold.
const ELIGIBLE_CROPS = {
  'crop-4.3x1-desktop-hero': { url: 'https://x/desktop.webp', width: 2463, height: 700 },
  'crop-16x9-og': { url: 'https://x/og.webp', width: 1200, height: 630 },
};

interface MakeOpts {
  hero?: boolean;
  publishedAt?: string | Date | null;
}

let seq = 0;
function article(category: string, slug: string, opts: MakeOpts = {}): HomeSelectionCandidate {
  const hero = opts.hero ?? true;
  return {
    slug,
    categorySlug: category,
    // NOT `??`: `publishedAt: null` is a case under test and `null ?? x` would
    // silently replace it with a real date.
    publishedAt:
      opts.publishedAt !== undefined
        ? opts.publishedAt
        : new Date(Date.UTC(2026, 0, 1) - seq++ * 1000),
    coverImageSmartCrops: hero ? ELIGIBLE_CROPS : null,
    coverWidth: hero ? 1500 : null,
    coverHeight: hero ? 1000 : null,
  };
}

/** Strip every hero gate from a corpus without touching its H6 properties. */
const noCovers = (corpus: HomeSelectionCandidate[]): HomeSelectionCandidate[] =>
  corpus.map((a) => ({ ...a, coverImageSmartCrops: null, coverWidth: null, coverHeight: null }));

/**
 * `counts` → a corpus, newest category first in the order given. `stamp` puts
 * every article on ONE `publishedAt`, which is the state rank clause (1) cannot
 * order — the production shape, where 24 rows share one timestamp.
 */
function corpusOf(counts: Record<string, number>, stamp?: string): HomeSelectionCandidate[] {
  const out: HomeSelectionCandidate[] = [];
  for (const [category, n] of Object.entries(counts)) {
    for (let i = 1; i <= n; i++) {
      out.push(
        article(category, `${category}-${String(i).padStart(2, '0')}`, { publishedAt: stamp }),
      );
    }
  }
  return out;
}

const cats = (s: HomeSelection<HomeSelectionCandidate>) => s.items.map(homeCategoryKey);
const slugs = (s: HomeSelection<HomeSelectionCandidate>) => s.items.map((a) => a.slug);

/** The three clauses `check-h6.sh` evaluates, in JS, over a rendered set. */
function clauseViolations(categories: readonly string[], K: number) {
  const n = categories.length;
  const cap = Math.ceil(n / 3);
  const counts = new Map<string, number>();
  for (const c of categories) counts.set(c, (counts.get(c) ?? 0) + 1);
  const over = [...counts.entries()].filter(([, v]) => v > cap);
  let adjacent = 0;
  for (let i = 1; i < n; i++) if (categories[i] === categories[i - 1]) adjacent++;
  const floor = Math.max(1, Math.min(MIN_HOME_SET, K, n - cap + 1));
  return {
    cap,
    over,
    adjacent,
    floor,
    distinct: counts.size,
    holds: over.length === 0 && adjacent === 0 && counts.size >= floor,
  };
}

/**
 * THE PAIRED ASSERTION FOR THE LADDER, and the reason it is worth writing: a
 * test that only counts relaxations passes just as happily on an implementation
 * that spends rung 2 where rung 1 would have done, which is the exact failure
 * H6.5's "never further than the slot requires" forbids. Each rung leaves a
 * signature in the SET, and these are those signatures:
 *
 *   rung 1 — the only thing it adds over rung 0 is "same category as prev", so
 *            a rung-1 slot MUST repeat its predecessor, and its category MUST
 *            still be under the cap (or rung 1 would not have admitted it).
 *   rung 2 — it adds `cap + 1` over rung 1, and rung 1's run condition survives
 *            into it unchanged. So if a rung-2 pick were under the cap, rung 1
 *            would already have admitted it: a rung-2 slot's category MUST be
 *            sitting at EXACTLY the cap when it is taken.
 *
 * And in both directions: every slot NOT marked as a relaxation must satisfy
 * H6.1 and H6.2 outright.
 */
function auditLadder(selection: HomeSelection<HomeSelectionCandidate>) {
  const counts = new Map<string, number>();
  const order = cats(selection);
  for (let i = 0; i < order.length; i++) {
    const key = order[i];
    const before = counts.get(key) ?? 0;
    const rung = selection.relaxations.find((r) => r.slot === i + 1)?.rung ?? 0;

    if (rung === 0) {
      expect(before, `slot ${i + 1} is unrelaxed and must be under the cap`).toBeLessThan(
        selection.cap,
      );
      if (i > 0)
        expect(key, `slot ${i + 1} is unrelaxed and must not repeat`).not.toBe(order[i - 1]);
    }
    if (rung === 1) {
      expect(key, `slot ${i + 1} spent H6.5(1), so it must repeat its predecessor`).toBe(
        order[i - 1],
      );
      expect(before, `slot ${i + 1} spent H6.5(1) only, so H6.1 must still hold`).toBeLessThan(
        selection.cap,
      );
    }
    if (rung === 2) {
      expect(before, `slot ${i + 1} spent H6.5(2), so its category must be AT the cap`).toBe(
        selection.cap,
      );
    }
    counts.set(key, before + 1);
  }
  // "a run of 2 is permitted, a run of 3 never is" — at every rung.
  for (let i = 2; i < order.length; i++) {
    expect(
      order[i] === order[i - 1] && order[i - 1] === order[i - 2],
      `run of 3 ending at slot ${i + 1}`,
    ).toBe(false);
  }
  // H6.5(2) relaxes H6.1 to cap + 1 and no further, ever.
  for (const [, v] of counts) expect(v).toBeLessThanOrEqual(selection.cap + 1);
}

// ── H6.4 — the rank and the greedy slot fill ──────────────────────────────
describe('H6.4 — rank and slot fill', () => {
  /** The 01 Sept 2026 shape: 89 articles, 15 categories, one dominant. */
  function productionShapedCorpus(stamp?: string) {
    const counts: Record<string, number> = { 'hantaran-mas-kahwin': 38, 'ucapan-doa': 9 };
    for (let i = 1; i <= 13; i++) counts[`kategori-${String(i).padStart(2, '0')}`] = i <= 3 ? 4 : 3;
    return corpusOf(counts, stamp);
  }

  it('satisfies all three clauses on a production-shaped corpus', () => {
    const corpus = productionShapedCorpus();
    expect(corpus.length).toBe(89);

    const selection = selectHomeSet(corpus);
    expect(selection.n).toBe(HOME_SET_SIZE);
    expect(selection.variant).toBe('h1');
    expect(selection.relaxations).toEqual([]);
    expect(selection.truncatedFrom).toEqual([]);

    const v = clauseViolations(cats(selection), 15);
    expect(v.cap).toBe(5);
    expect(v.over).toEqual([]); // H6.1
    expect(v.adjacent).toBe(0); // H6.2
    expect(v.distinct).toBeGreaterThanOrEqual(v.floor); // H6.3
    expect(v.holds).toBe(true);
    auditLadder(selection);
  });

  it('holds on the same corpus when every article shares one timestamp', () => {
    // The state clause (1) cannot order at all: 89 articles, one `publishedAt`.
    // Clauses (2)–(4) carry the whole selection here.
    const selection = selectHomeSet(productionShapedCorpus('2026-08-30T09:00:00.000Z'));
    expect(selection.n).toBe(HOME_SET_SIZE);
    expect(clauseViolations(cats(selection), 15).holds).toBe(true);
    auditLadder(selection);
  });

  it('rejects the pre-fix homepage: recency alone violates all three clauses', () => {
    // The negative control, and the numbers are the measured ones: ranks 1–13
    // on 01 Sept 2026 were 10 `hantaran-mas-kahwin` + 3 `ucapan-doa`.
    const pool = corpusOf({ 'ucapan-doa': 3, 'hantaran-mas-kahwin': 38 });
    const recency = clauseViolations(pool.slice(0, 13).map(homeCategoryKey), 2);
    expect(recency.holds).toBe(false);
    expect(recency.over.length).toBeGreaterThan(0);
    expect(recency.adjacent).toBeGreaterThan(0);

    // Over a TWO-category corpus H6 is unsatisfiable at any N above 3, so the
    // rule's own answer is H6.5, not a clean set. What must be true is that the
    // ladder is spent minimally and bounded: no run of 3, nothing above cap + 1.
    expect(isH6Satisfiable(pool, HOME_SET_SIZE)).toBe(false);
    const selection = selectHomeSet(pool);
    auditLadder(selection);
    expect(clauseViolations(cats(selection), 2).adjacent).toBeLessThan(recency.adjacent);
  });

  it('slot 1 is the highest-ranked HERO-ELIGIBLE article, not the newest article', () => {
    const corpus = [
      article('ucapan-doa', 'newest-but-portrait', { hero: false }),
      article('hantaran-mas-kahwin', 'newest-eligible'),
      ...corpusOf({ 'kategori-a': 4, 'kategori-b': 4, 'kategori-c': 4 }),
    ];
    const selection = selectHomeSet(corpus);
    expect(selection.items[0].slug).toBe('newest-eligible');
    expect(selection.heroEligible).toBe(true);
    // The skipped article is still a perfectly good ITEM — H6 does not consult
    // covers, only categories.
    expect(slugs(selection)).toContain('newest-but-portrait');
  });

  it('applies R8(a) at slot 1 — the hand-curated class-G list is not re-implemented', () => {
    const banned = [...HERO_INELIGIBLE_SLUGS][0];
    const corpus = [
      article('ucapan-doa', banned),
      article('hantaran-mas-kahwin', 'next-eligible'),
      ...corpusOf({ 'kategori-a': 4, 'kategori-b': 4, 'kategori-c': 4 }),
    ];
    expect(selectHomeSet(corpus).items[0].slug).toBe('next-eligible');
  });

  it("no H6 clause binds at slot 1, but slot 1's category still counts", () => {
    // H6.4: "no H6 clause can bind at slot 1". The hero here is the newest
    // article of the dominant category and that placement is allowed. What is
    // NOT allowed is slot 2 repeating it (H6.2) or the category exceeding the
    // cap across the set (H6.1) — `check-h6.sh` measures both over the whole
    // set INCLUDING item 1, so "does not bind" governs the choice, not the
    // accounting.
    const corpus = [
      article('hantaran-mas-kahwin', 'hero-eligible'),
      ...noCovers(corpusOf({ 'hantaran-mas-kahwin': 20 })),
      ...corpusOf({ 'kategori-a': 5, 'kategori-b': 5, 'kategori-c': 5 }),
    ];
    const selection = selectHomeSet(corpus);
    expect(selection.items[0].slug).toBe('hero-eligible');
    expect(cats(selection)[1]).not.toBe('hantaran-mas-kahwin');
    auditLadder(selection);
  });

  it('recency leads: clause (1) is not overtaken by clause (2)', () => {
    // The rejected alternative in §7.5 is (2) before (1). With one article per
    // category and no ties, the set must be pure recency order.
    const corpus = Array.from({ length: 20 }, (_, i) =>
      article(`kategori-${String(i).padStart(2, '0')}`, `slug-${String(i).padStart(2, '0')}`, {
        publishedAt: new Date(Date.UTC(2026, 0, 30 - i)),
      }),
    );
    expect(slugs(selectHomeSet(corpus))).toEqual(
      Array.from({ length: 13 }, (_, i) => `slug-${String(i).padStart(2, '0')}`),
    );

    // ⚠️ THE FIXTURE ABOVE CANNOT DETECT THE REJECTED ORDER, which is exactly
    // the trap: one article per category means every unplaced category has 0
    // placed, clause (2) never discriminates, and a (2)-before-(1) build passes
    // it unchanged (verified by mutation, 01 Sept 2026). A SECOND article in
    // the newest category is what separates the two rules, and N must be at
    // least 4 so that `cap = ceil(N/3)` is 2 and H6.1 is not itself the thing
    // keeping `alfa-02` out.
    //
    // Under the rule, slot 3 takes the recent `alfa-02` — clause (1) decides
    // before clause (2) is consulted. Under the rejected order it takes the
    // two-years-older `gamma-01`, because gamma has nothing placed yet.
    const discriminating = [
      article('alfa', 'alfa-01', { publishedAt: new Date(Date.UTC(2026, 0, 30)) }),
      article('alfa', 'alfa-02', { publishedAt: new Date(Date.UTC(2026, 0, 29)) }),
      article('beta', 'beta-01', { publishedAt: new Date(Date.UTC(2025, 0, 10)) }),
      article('gamma', 'gamma-01', { publishedAt: new Date(Date.UTC(2024, 0, 10)) }),
      article('delta', 'delta-01', { publishedAt: new Date(Date.UTC(2023, 0, 10)) }),
    ];
    expect(slugs(selectHomeSet(discriminating, 4))).toEqual([
      'alfa-01',
      'beta-01',
      'alfa-02',
      'gamma-01',
    ]);
  });

  it('breaks a full timestamp tie by (2) placed, then (3) category, then (4) slug', () => {
    const stamp = '2026-08-30T09:00:00.000Z';
    const corpus = [
      article('zeta', 'zeta-b', { publishedAt: stamp }),
      article('zeta', 'zeta-a', { publishedAt: stamp }),
      article('alfa', 'alfa-b', { publishedAt: stamp }),
      article('alfa', 'alfa-a', { publishedAt: stamp }),
      article('beta', 'beta-a', { publishedAt: stamp }),
    ];
    // Slot 1: nothing placed, so (3) then (4) decide → alfa-a.
    // Slot 2: everything ties on (1); alfa is `prev` and excluded anyway; beta
    //         and zeta both have 0 placed, so (3) decides → beta-a.
    // Slot 3: alfa-b has 1 placed against zeta's 0, so (2) puts ZETA ahead of
    //         it — this is the assertion that clause (2) really is consulted
    //         before clause (3), and the one an implementation gets backwards.
    // Slot 4: prev is zeta, so alfa-b is all that is left.
    expect(slugs(selectHomeSet(corpus, 4))).toEqual(['alfa-a', 'beta-a', 'zeta-a', 'alfa-b']);
  });
});

// ── H6.5 — the relaxation ladder, in its fixed order ──────────────────────
describe('H6.5 — the fallback ladder', () => {
  it('step (1) permits a run of 2 for that slot only, and spends nothing else', () => {
    // Engineered so the RUN is the binding constraint and the cap is not: two
    // recent categories exhaust themselves, leaving one older category that
    // still has cap headroom and nothing to alternate with.
    const corpus = [
      article('beta', 'beta-01'),
      article('gamma', 'gamma-01'),
      article('beta', 'beta-02'),
      article('gamma', 'gamma-02'),
      article('alfa', 'alfa-01'),
      article('alfa', 'alfa-02'),
      article('alfa', 'alfa-03'),
    ];
    const selection = selectHomeSet(corpus, 7);
    expect(cats(selection)).toEqual(['beta', 'gamma', 'beta', 'gamma', 'alfa', 'alfa']);
    expect(selection.relaxations).toEqual([{ slot: 6, rung: 1 }]);
    // H6.2 was spent; H6.1 was NOT — no category is above the cap.
    expect(clauseViolations(cats(selection), 3).over).toEqual([]);
    auditLadder(selection);
  });

  it('step (2) spends cap + 1, and only where a run could not have solved it', () => {
    // Three alfa, two beta, N=5 → cap 2. Perfect alternation is available, so
    // H6.2 is never touched; what runs out is alfa's share at the last slot.
    const selection = selectHomeSet(corpusOf({ alfa: 3, beta: 2 }), 5);
    expect(cats(selection)).toEqual(['alfa', 'beta', 'alfa', 'beta', 'alfa']);
    expect(selection.relaxations).toEqual([{ slot: 5, rung: 2 }]);
    expect(selection.cap).toBe(2);
    // Exactly cap + 1, never further.
    expect(clauseViolations(cats(selection), 2).over).toEqual([['alfa', 3]]);
    // H6.2 was NOT spent to get there.
    expect(clauseViolations(cats(selection), 2).adjacent).toBe(0);
    auditLadder(selection);
  });

  it('never repeats an article and never pads to reach the target length', () => {
    const corpus = corpusOf({ alfa: 2, beta: 2, gamma: 1 });
    const selection = selectHomeSet(corpus, HOME_SET_SIZE);
    expect(new Set(slugs(selection)).size).toBe(selection.items.length);
    expect(selection.items.length).toBeLessThanOrEqual(corpus.length);
  });

  it('step (3) truncates, and the set is then measurable at its OWN cap', () => {
    // 12 articles against a target of 13. `cap` is derived from N, and
    // `check-h6.sh` computes it from the RENDERED N — a set built at cap 5 and
    // then shortened to 12 would be measured at ceil(12/3)=4. The re-run is
    // what stops that being a self-inflicted failure.
    const selection = selectHomeSet(corpusOf({ alfa: 3, beta: 3, gamma: 3, delta: 3 }));
    expect(selection.truncatedFrom).toEqual([HOME_SET_SIZE]);
    expect(selection.n).toBe(12);
    expect(selection.cap).toBe(4);
    const v = clauseViolations(cats(selection), 4);
    expect(v.cap).toBe(selection.cap);
    expect(v.holds).toBe(true);
    expect(selection.relaxations).toEqual([]);
    auditLadder(selection);
  });

  it('re-runs after a truncation the ladder caused, and converges', () => {
    // Five alfa and one beta: the fill gets four slots in at N=6 and stops, so
    // the whole selection re-runs at N=4 with cap recomputed from 2 to 2.
    const selection = selectHomeSet(corpusOf({ alfa: 5, beta: 1 }));
    expect(selection.truncatedFrom).toEqual([HOME_SET_SIZE, 6]);
    for (let i = 1; i < selection.truncatedFrom.length; i++) {
      expect(selection.truncatedFrom[i]).toBeLessThan(selection.truncatedFrom[i - 1]);
    }
    expect(selection.n).toBe(4);
    expect(selection.cap).toBe(Math.ceil(selection.n / 3));
    expect(selection.variant).toBe('h1');
    auditLadder(selection);
  });

  it('does not relax anything when the corpus can satisfy H6 outright', () => {
    const corpus = corpusOf({ alfa: 5, beta: 5, gamma: 5, delta: 5 });
    expect(isH6Satisfiable(corpus, HOME_SET_SIZE)).toBe(true);
    const selection = selectHomeSet(corpus);
    expect(selection.relaxations).toEqual([]);
    expect(selection.truncatedFrom).toEqual([]);
    expect(clauseViolations(cats(selection), 4).holds).toBe(true);
  });

  it('isH6Satisfiable matches check-h6.sh — capacity = Σ min(published, cap)', () => {
    // The pre-fix candidate pool, exactly: ranks 1–13 were two categories.
    // Capacity at cap 5 = min(10,5) + min(3,5) = 8 against a required 13.
    expect(isH6Satisfiable(corpusOf({ 'hantaran-mas-kahwin': 10, 'ucapan-doa': 3 }), 13)).toBe(
      false,
    );
    // The published corpus of the same day: 89 across 15, capacity 47.
    const counts: Record<string, number> = { 'hantaran-mas-kahwin': 38, 'ucapan-doa': 9 };
    for (let i = 1; i <= 13; i++) counts[`kategori-${String(i).padStart(2, '0')}`] = i <= 3 ? 4 : 3;
    expect(isH6Satisfiable(corpusOf(counts), 13)).toBe(true);
  });

  it('KNOWN GAP — satisfiable is not the same as reachable by H6.4s greedy', () => {
    // 15 articles over 3 categories, every timestamp distinct, A newest and C
    // oldest. Capacity at cap 5 is 15 and a 5/4/4 arrangement plainly exists,
    // so H6.5 calls this satisfiable at N=13. The fill cannot get there: rank
    // clause (1) is recency and does not backtrack, so A and B reach the cap by
    // slot 10 and C is left alone with three slots and nothing to alternate
    // with. The ladder is spent, then the set truncates to 12.
    //
    // This is FAITHFUL to H6.4, which specifies a greedy. It is recorded as a
    // test rather than fixed because backtracking would be a new clause, not an
    // implementation of an existing one. Raised to the Creative Director.
    const corpus = corpusOf({ alfa: 5, beta: 5, gamma: 5 });
    expect(isH6Satisfiable(corpus, HOME_SET_SIZE)).toBe(true);
    const selection = selectHomeSet(corpus);
    expect(selection.truncatedFrom).toEqual([HOME_SET_SIZE]);
    expect(selection.n).toBe(12);
    expect(selection.relaxations).toEqual([
      { slot: 10, rung: 1 },
      { slot: 11, rung: 2 },
    ]);
    auditLadder(selection);
  });
});

// ── H6.5(4) — N < 4, and zero articles ────────────────────────────────────
describe('H6.5(4) — the short and empty cases', () => {
  it('zero published articles renders .s-empty, not a blank page', () => {
    const selection = selectHomeSet([]);
    expect(selection.variant).toBe('empty');
    expect(selection.items).toEqual([]);
    expect(selection.heroEligible).toBe(false);
    expect(selection.n).toBe(0);
    expect(selection.cap).toBe(0);
  });

  it('below N = 4 the homepage runs H3, the no-hero variant', () => {
    for (const size of [1, 2, 3]) {
      const corpus = Array.from({ length: size }, (_, i) => article(`kategori-${i}`, `slug-${i}`));
      const selection = selectHomeSet(corpus);
      expect(selection.items.length).toBe(size);
      expect(selection.variant).toBe('h3');
      // H3 IS the no-hero variant, so no hero is reported even though every one
      // of these articles passes all three R8 gates.
      expect(selection.heroEligible).toBe(false);
    }
  });

  it('N = 4 is valid and keeps its hero', () => {
    const corpus = Array.from({ length: 4 }, (_, i) => article(`kategori-${i}`, `slug-${i}`));
    const selection = selectHomeSet(corpus);
    expect(selection.items.length).toBe(MIN_HOME_SET);
    expect(selection.variant).toBe('h1');
    expect(selection.heroEligible).toBe(true);
  });

  it('a corpus with no hero-eligible cover still returns a full set', () => {
    const counts: Record<string, number> = { 'hantaran-mas-kahwin': 38, 'ucapan-doa': 9 };
    for (let i = 1; i <= 13; i++) counts[`kategori-${String(i).padStart(2, '0')}`] = i <= 3 ? 4 : 3;
    const selection = selectHomeSet(noCovers(corpusOf(counts)));
    expect(selection.n).toBe(HOME_SET_SIZE);
    expect(selection.heroEligible).toBe(false);
    expect(clauseViolations(cats(selection), 15).holds).toBe(true);
  });
});

// ── DETERMINISM ───────────────────────────────────────────────────────────
describe('determinism — one corpus yields one set', () => {
  /**
   * §7.5: "on the sitemap of 01 September 2026, 24 articles carry one identical
   * timestamp and 19 carry another — rank 1 alone leaves 24 items unordered and
   * the homepage non-deterministic."
   *
   * Running the same array twice only proves the function is not random. The
   * real test is that INPUT ORDER cannot change the output, because the row
   * order within a tie is whatever Postgres felt like on that plan.
   */
  const tied = [
    ...corpusOf({ 'hantaran-mas-kahwin': 24, 'ucapan-doa': 8 }, '2026-08-30T09:00:00.000Z'),
    ...corpusOf({ 'kategori-a': 19, 'kategori-b': 6 }, '2026-08-28T09:00:00.000Z'),
    ...corpusOf({ 'kategori-c': 5, 'kategori-d': 5, 'kategori-e': 5 }, '2026-08-27T09:00:00.000Z'),
  ];

  it('is byte-identical across two runs of the same corpus', () => {
    const a = JSON.stringify(slugs(selectHomeSet(tied)));
    const b = JSON.stringify(slugs(selectHomeSet(tied)));
    expect(a).toBe(b);
    expect(JSON.parse(a)).toHaveLength(HOME_SET_SIZE);
  });

  it('is byte-identical under 20 shuffles of the same corpus', () => {
    // A deterministic LCG, so a failure is reproducible rather than a flake.
    let state = 20260901;
    const rand = () => (state = (state * 1103515245 + 12345) % 2147483648) / 2147483648;
    const expected = JSON.stringify(slugs(selectHomeSet(tied)));
    for (let round = 0; round < 20; round++) {
      const shuffled = [...tied];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      expect(JSON.stringify(slugs(selectHomeSet(shuffled)))).toBe(expected);
    }
  });

  it('orders a tie by byte order, not by insertion order', () => {
    const stamp = '2026-08-30T09:00:00.000Z';
    const forward = ['aa', 'ab', 'ba', 'bb'].map((s) =>
      article(`kat-${s[0]}`, `slug-${s}`, { publishedAt: stamp }),
    );
    const reversed = [...forward].reverse();
    expect(slugs(selectHomeSet(forward, 4))).toEqual(slugs(selectHomeSet(reversed, 4)));
    expect(slugs(selectHomeSet(forward, 4))[0]).toBe('slug-aa');
  });

  it('treats an unknown publishedAt as the OLDEST, never the newest', () => {
    const corpus = [
      // `alfa` sorts BEFORE `beta` on clause (3), so if the null date were
      // treated as newest — or ignored — this fixture would lead with it.
      article('alfa', 'no-date', { publishedAt: null }),
      article('beta', 'has-date', { publishedAt: '2020-01-01T00:00:00.000Z' }),
    ];
    expect(slugs(selectHomeSet(corpus, 2))).toEqual(['has-date', 'no-date']);
  });

  it('treats an unparseable publishedAt the same way, rather than as NaN', () => {
    const corpus = [
      article('alfa', 'garbage-date', { publishedAt: 'not-a-date' }),
      article('beta', 'has-date', { publishedAt: '2020-01-01T00:00:00.000Z' }),
    ];
    expect(slugs(selectHomeSet(corpus, 2))).toEqual(['has-date', 'garbage-date']);
  });
});

// ── H6.0 — the category key must equal the rendered URL segment ───────────
describe('H6.0 — the category key', () => {
  it('falls back to the same segment page.tsx writes when a slug is missing', () => {
    expect(homeCategoryKey({ categorySlug: null })).toBe('artikel');
    expect(homeCategoryKey({ categorySlug: 'ucapan-doa' })).toBe('ucapan-doa');
  });
});
