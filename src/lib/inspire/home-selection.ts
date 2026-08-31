import { pickHeroIndex, type HeroCandidate } from './hero-frame';

/**
 * ══════════════════════════════════════════════════════════════════════════
 * H6 — THE HOMEPAGE CATEGORY DIVERSITY RULE, EXECUTABLE.
 * DES-03 §7.5 (H6.0–H6.6) · verified by `scripts/measure/check-h6.sh`
 * ══════════════════════════════════════════════════════════════════════════
 *
 * H6 is NORMATIVE and lives in `docs/design/des-03-spesifikasi.html` §7.5 on
 * `feat/command-centre-dashboard`. This module is its implementation, not a
 * paraphrase of it: every clause below quotes the rule it builds. Where a
 * comment here and §7.5 disagree, §7.5 wins and the comment is the defect.
 *
 * WHY IT EXISTS. Measured on the live homepage 01 Sept 2026 — N=13 items from
 * TWO categories, ten of them consecutive `hantaran-mas-kahwin`, out of a
 * corpus of 89 articles across 15 categories whose capacity at cap 5 is 47.
 * The corpus was never the constraint; the selection had no diversity
 * constraint in it at all.
 *
 * ⚠️ THE OTHER HALF OF THAT DEFECT IS THE CANDIDATE POOL, AND IT IS THE HALF
 * THAT GETS MISSED. Under H6.1 a pool contributes at most `min(count(c), cap)`
 * items per category, so `getHomeData`'s old `.limit(20)` — ranks 1–13 of which
 * were two categories — had a capacity of 8 against a required 13. A PERFECT
 * implementation of this module over a 20-row buffer still falls through H6.5
 * to truncation, and the visible result is a SHORTER homepage rather than a
 * fixed one, which `check-h6.sh` would pass (an 8-item page can satisfy H6 at
 * N=8). H6.5's satisfiability test is written over `published(x)`, not over
 * `buffered(x)`. This module must be given the published corpus.
 */

/** H6.0 — the homepage renders 13 items: `s[1]` the hero, then twelve rows. */
export const HOME_SET_SIZE = 13;

/**
 * H6.5(4) — "The homepage is valid at any N >= 4. Below N = 4 the homepage
 * runs H3, the no-hero variant; with zero published articles it renders
 * `.s-empty` (§8)."
 */
export const MIN_HOME_SET = 4;

/**
 * The minimum an article must expose to be selected. Extends `HeroCandidate`
 * because H6.4's slot 1 runs `pickHeroIndex`'s three R8 gates unchanged — this
 * module does not restate them and must never acquire a second copy.
 *
 * `publishedAt` is `Date | string | null` because the same corpus arrives as
 * `Date` from drizzle and as an ISO string from a serialized cache entry.
 */
export interface HomeSelectionCandidate extends HeroCandidate {
  categorySlug: string | null;
  publishedAt: Date | string | null;
}

/**
 * H6.0 — "An item's category is `<kategori>`. Nothing else is consulted: no
 * data attribute, no CMS field, no heading text."
 *
 * ⚠️ THE RULE IS EVALUATED ON THE RENDERED URL, so this key MUST equal the
 * path segment the page emits. `page.tsx` writes
 * `/artikel/${categorySlug ?? 'artikel'}/${slug}`; the fallback is reachable
 * only if the `inspireCategories` inner join ever stops guaranteeing a slug,
 * but if the two ever disagree the checker measures a different set than the
 * one this module built, and the disagreement is silent.
 */
export function homeCategoryKey(a: Pick<HomeSelectionCandidate, 'categorySlug'>): string {
  return a.categorySlug ?? 'artikel';
}

/**
 * Rank clause (1), "published date, most recent first".
 *
 * Unknown counts as OLDEST. A published row always carries `publishedAt`, so
 * this is defensive; the alternative default (newest) would let one bad row
 * seize the hero, which is the failure mode `isHeroFrameEligible` already
 * refuses for the same reason.
 */
function publishedMs(value: Date | string | null): number {
  if (value == null) return Number.NEGATIVE_INFINITY;
  const t = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t;
}

/**
 * Rank clauses (3) and (4), "ascending byte order".
 *
 * Category and article slugs are `[a-z0-9-]+` — the same character class
 * `check-h6.sh` extracts with — so a plain `<` would agree with byte order on
 * every slug that exists. It is written out anyway because `<` compares UTF-16
 * code UNITS, which stops matching UTF-8 byte order above the BMP: the day a
 * slug carries one non-ASCII character, `<` silently orders it differently to
 * the rule, and the homepage becomes non-deterministic in exactly the way
 * clauses (3) and (4) exist to prevent. Code-point order IS UTF-8 byte order.
 */
function byteCompare(a: string, b: string): number {
  if (a === b) return 0;
  const ac = Array.from(a);
  const bc = Array.from(b);
  const shared = Math.min(ac.length, bc.length);
  for (let i = 0; i < shared; i++) {
    const x = ac[i].codePointAt(0) ?? 0;
    const y = bc[i].codePointAt(0) ?? 0;
    if (x !== y) return x - y;
  }
  return ac.length - bc.length;
}

/**
 * H6.4 — the rank, "applied in order until one comparison decides".
 *
 *   (1) published date, most recent first
 *   (2) then the number already placed from that article's category, fewest first
 *   (3) then category slug, ascending byte order
 *   (4) then article slug, ascending byte order
 *
 * ⚠️ CLAUSE (2) IS RECOMPUTED AT EVERY SLOT — `placed` is the running count,
 * not a property of the article. That is what makes this a rank rather than a
 * sort, and it is why the corpus cannot be ordered once up front.
 *
 * ⚠️ CLAUSE (1) LEADS AND STAYS LEADING. §7.5 records the rejected
 * alternative — (2) before (1) — explicitly: "It produces a well-mixed homepage
 * that buries what was published yesterday, and §5.3 gives the homepage the job
 * of being the record of what is new. Diversity is a constraint here, not a
 * preference."
 *
 * Clauses (3) and (4) are load-bearing, not decoration: on the corpus of
 * 01 Sept 2026, 24 articles carry one identical `publishedAt` and 19 carry
 * another. Clause (1) alone leaves 24 items unordered and the homepage
 * non-deterministic across renders.
 */
function compareRank(
  a: HomeSelectionCandidate,
  b: HomeSelectionCandidate,
  placed: ReadonlyMap<string, number>,
): number {
  const pa = publishedMs(a.publishedAt);
  const pb = publishedMs(b.publishedAt);
  if (pa !== pb) return pb - pa;

  const ka = homeCategoryKey(a);
  const kb = homeCategoryKey(b);
  const na = placed.get(ka) ?? 0;
  const nb = placed.get(kb) ?? 0;
  if (na !== nb) return na - nb;

  const byCategory = byteCompare(ka, kb);
  if (byCategory !== 0) return byCategory;

  return byteCompare(a.slug, b.slug);
}

/**
 * H6.5's satisfiability test, exported because it is normative and because it
 * is the line that separates "the homepage was built wrong" from "the corpus is
 * too thin":
 *
 *   "H6.1 is satisfiable at a given N if and only if Σx min(published(x), cap)
 *    >= N. H6.2 is then satisfiable automatically, because cap = ceil(N/3)
 *    never exceeds ceil(N/2), the multiplicity above which no arrangement can
 *    avoid adjacency. One test therefore decides the whole question."
 *
 * ⚠️ THIS TEST IS ABOUT EXISTENCE, AND H6.4 MANDATES A GREEDY. §7.5 says "one
 * test therefore decides the whole question", which is true of whether a valid
 * ARRANGEMENT exists and is NOT true of whether H6.4's slot fill will find it —
 * the fill takes "the highest-ranked remaining article" with no backtracking,
 * and rank clause (1) is recency, which front-loads whichever categories
 * published most recently.
 *
 * Measured, and it is not hypothetical: 15 articles over 3 categories, every
 * timestamp distinct, category A newest through C oldest. At N=13, cap=5,
 * capacity is 15 and a 5/4/4 arrangement plainly exists — but recency fills
 * A and B to the cap by slot 10, leaving C alone with three slots and nothing
 * to alternate with. The fill spends H6.5(1), then H6.5(2), then truncates to
 * 12. That is FAITHFUL to H6.4 (a greedy that cannot backtrack) and it makes
 * H6.5's satisfiability line optimistic as a predictor of the fill's outcome.
 * Raised to the Creative Director; not fixed here, because adding backtracking
 * would be adding a clause to H6.4 rather than building it.
 *
 * On the real corpus this gap narrows sharply, because clause (2) — which is
 * what spreads categories — fires on every `publishedAt` TIE, and 24 of the 89
 * published articles share one timestamp with 19 more sharing another.
 *
 * `select()` does NOT branch on this. It relaxes when a SLOT has no candidate,
 * which is strictly at least as strict: when the corpus is satisfiable and the
 * greedy completes, nothing is relaxed; when it is not, the ladder is entered
 * exactly where the shortfall bites, which is what "never further than the slot
 * requires" asks for. The test is here for diagnostics and for the tests, and
 * `check-h6.sh --corpus` prints the same number off the sitemap.
 */
export function isH6Satisfiable(corpus: readonly HomeSelectionCandidate[], n: number): boolean {
  if (n <= 0) return true;
  const cap = Math.ceil(n / 3);
  const counts = new Map<string, number>();
  for (const a of corpus) {
    const k = homeCategoryKey(a);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let capacity = 0;
  for (const c of counts.values()) capacity += Math.min(c, cap);
  return capacity >= n;
}

/** Which rung of H6.5's ladder a slot had to spend. 0 = nothing relaxed. */
export type H6Rung = 0 | 1 | 2;

export interface H6Relaxation {
  /** 1-based slot index, matching H6.4's "slots are filled 1 to N". */
  slot: number;
  /** 1 = H6.2 relaxed to a run of 2. 2 = H6.1 also relaxed to cap + 1. */
  rung: 1 | 2;
}

export interface HomeSelection<T> {
  /**
   * The set, in the order it must be rendered. H6.6: "DOM order is the order."
   * `items[0]` is `s[1]`, the hero slot.
   */
  items: T[];
  /**
   * H6.4 slot 1 — true when `items[0]` passed all three R8 hero gates, i.e.
   * when the page may render the enlarged plate. False means no article in the
   * corpus carries a class O or class P cover; see the H3 note on `select`.
   */
  heroEligible: boolean;
  /**
   * H6.5(4). `'empty'` → `.s-empty` (§8), which `page.tsx` renders with DES-05's
   * `EmptyState`; `'h3'` → the no-hero variant; else H1.
   *
   * ⚠️ `'h3'` IS COMPUTED AND NOT RENDERED. Parked by the Creative Director on
   * 01 September 2026 and owned by them: H3 has no markup in DES-03, and the
   * variant needs either N < 4 or zero class-O/P covers in the whole corpus, so
   * it is unreachable today. Building an unreachable page variant nobody can
   * look at is how untested markup ships. `page.tsx` carries the full ruling
   * beside the branch it would go in. Do not widen it here.
   */
  variant: 'h1' | 'h3' | 'empty';
  /** `ceil(N/3)` at the FINAL N, which is the cap `check-h6.sh` recomputes. */
  cap: number;
  /** The N this selection was finally built at. Equals `items.length`. */
  n: number;
  /** Every slot that had to spend a rung of H6.5's ladder, in slot order. */
  relaxations: H6Relaxation[];
  /** The target N each truncation stepped down from, oldest first. */
  truncatedFrom: number[];
}

/** The trailing run length of `key` at the end of `chosen`. */
function trailingRun<T extends HomeSelectionCandidate>(chosen: readonly T[], key: string): number {
  let run = 0;
  for (let i = chosen.length - 1; i >= 0 && homeCategoryKey(chosen[i]) === key; i--) run++;
  return run;
}

/**
 * One pass of H6.4's greedy slot fill at a fixed N. Returns fewer than `n`
 * items when H6.5 step (3) fires (no candidate at any rung) or the corpus runs
 * out; `select` handles the re-run.
 */
function fillAt<T extends HomeSelectionCandidate>(
  corpus: readonly T[],
  n: number,
): { items: T[]; heroEligible: boolean; relaxations: H6Relaxation[] } {
  const cap = Math.ceil(n / 3);
  const placed = new Map<string, number>();
  const used = new Set<number>();
  const chosen: T[] = [];
  const relaxations: H6Relaxation[] = [];

  const take = (index: number) => {
    used.add(index);
    const article = corpus[index];
    const k = homeCategoryKey(article);
    placed.set(k, (placed.get(k) ?? 0) + 1);
    chosen.push(article);
  };

  // ── SLOT 1, H6.4 ────────────────────────────────────────────────────────
  // "Slot 1 takes the highest-ranked article whose cover is class O or class P
  //  (§5.3, §6.3); no H6 clause can bind at slot 1, so hero eligibility and H6
  //  cannot conflict there."
  //
  // "No H6 clause BINDS at slot 1" governs the CHOICE, not the accounting: the
  // hero's category still counts toward H6.1's cap and still blocks slot 2
  // under H6.2, because `check-h6.sh` evaluates all three clauses over the
  // whole set including item 1. Read the other way this module would build sets
  // its own gate rejects.
  //
  // `pickHeroIndex` is called over the RANK ORDER, never over the query order,
  // so "highest-ranked eligible" is what it returns. All three R8 gates, one
  // definition, unchanged — UI-12 gave them a second caller and this is a
  // third; do not inline them here.
  const rankOrder = corpus
    .map((_, i) => i)
    .sort((i, j) => compareRank(corpus[i], corpus[j], placed));
  const heroRankPos = pickHeroIndex(rankOrder.map((i) => corpus[i]));
  const heroEligible = heroRankPos >= 0;
  if (rankOrder.length > 0) {
    // H3 (no article in the corpus carries a class O or P cover): slot 1 is not
    // forced by hero eligibility, and no H6 clause can bind on an empty prefix
    // anyway, so the highest-ranked article overall is the same answer either
    // way. Only the RENDERING differs, and that is not this module's call —
    // `heroEligible` reports it and `page.tsx` decides.
    take(rankOrder[heroEligible ? heroRankPos : 0]);
  }

  // ── SLOTS 2..N, H6.4 then H6.5 ──────────────────────────────────────────
  for (let slot = 2; slot <= n; slot++) {
    const prev = homeCategoryKey(chosen[chosen.length - 1]);
    const run = trailingRun(chosen, prev);
    const countOf = (i: number) => placed.get(homeCategoryKey(corpus[i])) ?? 0;
    const sameAsPrev = (i: number) => homeCategoryKey(corpus[i]) === prev;

    // H6.5, "relax in this fixed order, one step at a time, never further than
    // the slot requires". The rungs are cumulative: step (2) is reached only
    // after step (1) produced nothing, and un-relaxing H6.2 there would send a
    // slot to TRUNCATION that H6.5 says to solve with a run of 2 — §7.5 is
    // explicit that monotony is the cheaper thing to spend, so it is spent
    // first and it is not taken back.
    //
    // "a run of 2 is permitted, a run of 3 never is" — `run < 2` is that
    // sentence, and it survives into rung 2 unchanged.
    const rungs: Array<(i: number) => boolean> = [
      (i) => countOf(i) < cap && !sameAsPrev(i), //            rung 0 — H6.1 + H6.2
      (i) => countOf(i) < cap && (!sameAsPrev(i) || run < 2), // rung 1 — H6.5(1)
      (i) => countOf(i) < cap + 1 && (!sameAsPrev(i) || run < 2), // rung 2 — H6.5(2)
    ];

    let picked = -1;
    let spent: H6Rung = 0;
    for (let rung = 0; rung < rungs.length; rung++) {
      const admits = rungs[rung];
      let best = -1;
      for (let i = 0; i < corpus.length; i++) {
        if (used.has(i) || !admits(i)) continue;
        if (best < 0 || compareRank(corpus[i], corpus[best], placed) < 0) best = i;
      }
      if (best >= 0) {
        picked = best;
        spent = rung as H6Rung;
        break;
      }
    }

    // H6.5(3) — "then truncate: render a shorter set." Never repeat an article
    // and never pad to reach a target length, so the loop simply stops.
    if (picked < 0) break;
    if (spent > 0) relaxations.push({ slot, rung: spent as 1 | 2 });
    take(picked);
  }

  return { items: chosen, heroEligible, relaxations };
}

/**
 * H6.4 + H6.5 over a published corpus. Returns the ordered set `page.tsx`
 * renders, in the order it must render it (H6.6).
 *
 * ⚠️ THE RE-RUN AFTER TRUNCATION, WHICH §7.5 DOES NOT SPELL OUT AND WHICH IS
 * THE ONE JUDGEMENT IN THIS FILE. `cap` is derived from N (H6.0) and H6.5(3)
 * changes N. `check-h6.sh` computes `cap` from the RENDERED N, so a set
 * truncated from 13 to 10 is measured at `ceil(10/3) = 4`, not at 5 — a set
 * built at cap 5 and then shortened can fail its own gate. So after any
 * truncation the whole selection re-runs at the new N. It converges because N
 * strictly decreases.
 *
 * On today's corpus this path never fires: capacity at cap 5 is 47 against a
 * required 13. It is built and unit-tested anyway, because the day it fires is
 * the day nobody is looking.
 *
 * ⚠️ H6.5's RELAXATIONS ARE INVISIBLE TO `check-h6.sh`. The checker evaluates
 * H6.1/H6.2/H6.3 as absolutes and has no notion of a rung, so a set that H6.5
 * EXPLICITLY PERMITS — a run of 2, or one category at `cap + 1` — is reported
 * as exit 1. Unreachable on today's corpus; reported to the Creative Director
 * as a gap between the rule and its instrument rather than papered over here.
 */
export function selectHomeSet<T extends HomeSelectionCandidate>(
  corpus: readonly T[],
  targetN: number = HOME_SET_SIZE,
): HomeSelection<T> {
  const truncatedFrom: number[] = [];

  if (corpus.length === 0) {
    // H6.5(4): "with zero published articles it renders `.s-empty` (§8), not
    // the blank page §7.4 records shipping."
    return {
      items: [],
      heroEligible: false,
      variant: 'empty',
      cap: 0,
      n: 0,
      relaxations: [],
      truncatedFrom,
    };
  }

  let n = Math.max(0, Math.min(targetN, corpus.length));
  // A corpus shorter than the target IS H6.5(3) — "render a shorter set" — and
  // it is recorded as a truncation rather than silently clamped, because the
  // difference between "the rule shortened this page" and "there was nothing to
  // put on it" is the whole content of the diagnostic.
  if (n < targetN) truncatedFrom.push(targetN);
  let pass = fillAt(corpus, n);
  while (pass.items.length < n) {
    truncatedFrom.push(n);
    n = pass.items.length;
    if (n === 0) break;
    pass = fillAt(corpus, n);
  }

  const items = pass.items;
  const variant = items.length === 0 ? 'empty' : items.length < MIN_HOME_SET ? 'h3' : 'h1';

  return {
    items,
    // H3 is a no-hero variant by definition, so an ineligible or absent lead
    // article is never reported as a hero regardless of which branch got here.
    heroEligible: variant === 'h1' && pass.heroEligible,
    variant,
    cap: items.length === 0 ? 0 : Math.ceil(items.length / 3),
    n: items.length,
    relaxations: pass.relaxations,
    truncatedFrom,
  };
}
