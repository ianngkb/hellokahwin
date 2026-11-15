/**
 * The article search engine, as pure functions over an in-memory corpus.
 * `article-search.ts` loads the corpus from the database; everything here is
 * testable without one. Rules are DES-06 §3.3.
 *
 * - Stage 1: every query word (or an English→Malay synonym of it) appears in
 *   the title, slug or excerpt, in any order. Title hits rank above
 *   excerpt-only hits, then newest first.
 * - Stage 2, only if stage 1 found nothing: the category name counts too.
 * - Stage 3, only if stages 1–2 found nothing: articles matching at least half
 *   of the meaningful words, ranked by how many matched. Mode `approximate`.
 *   An approximate block is never mixed into exact results.
 * - Spelling: a word that matches nothing anywhere is checked against the
 *   title and category vocabulary. When the corrected query finds articles it
 *   is offered as `suggestion`; if the original found nothing, the corrected
 *   query's results are returned, labelled `approximate`.
 */
import type { SearchMode, SearchResponse, SearchResultArticle } from './contract';
import { closestWord } from './fuzzy';
import { isStopword, tokenize } from './normalise';
import { SYNONYM_KEY_TOKENS, expandQueryTerms, type QueryTerm } from './synonyms';

export const SEARCH_MIN_QUERY_LENGTH = 2;
export const SEARCH_MAX_QUERY_LENGTH = 100;

/** One published article as the engine sees it: the result fields plus the category name. */
export type CorpusArticle = SearchResultArticle;

interface IndexedArticle {
  article: CorpusArticle;
  title: Set<string>;
  slug: Set<string>;
  excerpt: Set<string>;
  category: Set<string>;
  /** The normalised title as one string, for the exact-phrase rank. */
  titleText: string;
  publishedMs: number;
}

export interface SearchIndex {
  articles: IndexedArticle[];
  /** Title and category words → number of articles that use them. */
  vocabulary: Map<string, number>;
  /** Every token in any field of any article. */
  allTokens: Set<string>;
}

export function buildSearchIndex(corpus: readonly CorpusArticle[]): SearchIndex {
  const vocabulary = new Map<string, number>();
  const allTokens = new Set<string>();
  const indexed = corpus.map((article) => {
    const titleTokens = tokenize(article.title);
    const entry: IndexedArticle = {
      article,
      title: new Set(titleTokens),
      slug: new Set(tokenize(article.slug)),
      excerpt: new Set(tokenize(article.excerpt ?? '')),
      category: new Set(tokenize(article.categoryName)),
      titleText: titleTokens.join(' '),
      publishedMs: article.publishedAt ? Date.parse(article.publishedAt) || 0 : 0,
    };
    for (const word of new Set([...entry.title, ...entry.category])) {
      // Words a reader could mean: letters only, three or more of them.
      if (word.length >= 3 && !/\d/.test(word)) {
        vocabulary.set(word, (vocabulary.get(word) ?? 0) + 1);
      }
    }
    for (const set of [entry.title, entry.slug, entry.excerpt, entry.category]) {
      for (const t of set) allTokens.add(t);
    }
    return entry;
  });
  return { articles: indexed, vocabulary, allTokens };
}

/**
 * A query word matches a field word when they are equal, or — for words of
 * four letters or more — when the field word starts with it ("hantar" finds
 * "hantaran"). Short words must match whole, so "mas" never finds "masa".
 */
function tokenInSet(token: string, set: ReadonlySet<string>): boolean {
  if (set.has(token)) return true;
  if (token.length < 4 || /^\d+$/.test(token)) return false;
  for (const word of set) {
    if (word.length > token.length && word.startsWith(token)) return true;
  }
  return false;
}

function termIn(term: QueryTerm, fields: readonly ReadonlySet<string>[]): boolean {
  return term.alternatives.some((alt) =>
    alt.every((token) => fields.some((field) => tokenInSet(token, field))),
  );
}

function isMeaningful(term: QueryTerm): boolean {
  return term.fromSynonym || !isStopword(term.text);
}

interface Ranked {
  entry: IndexedArticle;
  /** Lower is better. */
  tier: number;
  /** Higher is better (stage 3 only). */
  matched: number;
  /** Higher is better (stage 3 only): a rare word matched outweighs a common one. */
  weight: number;
  titleMatched: number;
}

function exactHit(entry: IndexedArticle, tier: number): Ranked {
  return { entry, tier, matched: 0, weight: 0, titleMatched: 0 };
}

function byRank(a: Ranked, b: Ranked): number {
  return (
    a.tier - b.tier ||
    b.matched - a.matched ||
    b.weight - a.weight ||
    b.titleMatched - a.titleMatched ||
    b.entry.publishedMs - a.entry.publishedMs ||
    a.entry.article.title.localeCompare(b.entry.article.title)
  );
}

interface Matched {
  mode: SearchMode;
  ranked: Ranked[];
}

/** Stages 1–3 for one query. Does not do spelling correction. */
function matchQuery(index: SearchIndex, query: string): Matched {
  const tokens = tokenize(query);
  const terms = expandQueryTerms(tokens);
  if (terms.length === 0) return { mode: 'none', ranked: [] };

  const meaningful = terms.filter(isMeaningful);
  // A query made only of stopwords still has to mean something.
  const required = meaningful.length > 0 ? meaningful : terms;
  const phrase = tokens.join(' ');

  // Stage 1: title, slug, excerpt.
  const stage1: Ranked[] = [];
  for (const entry of index.articles) {
    const titleFields = [entry.title, entry.slug];
    if (required.every((t) => termIn(t, titleFields))) {
      const exactPhrase = phrase.length > 0 && entry.titleText.includes(phrase);
      stage1.push(exactHit(entry, exactPhrase ? 0 : 1));
    } else if (required.every((t) => termIn(t, [entry.title, entry.slug, entry.excerpt]))) {
      stage1.push(exactHit(entry, 2));
    }
  }
  if (stage1.length > 0) return { mode: 'exact', ranked: stage1.sort(byRank) };

  // Stage 2: the category name as a field.
  const stage2: Ranked[] = [];
  for (const entry of index.articles) {
    const fields = [entry.title, entry.slug, entry.excerpt, entry.category];
    if (required.every((t) => termIn(t, fields))) {
      stage2.push(exactHit(entry, 3));
    }
  }
  if (stage2.length > 0) return { mode: 'exact', ranked: stage2.sort(byRank) };

  // Stage 3: ranked partial match on the meaningful words, at least half.
  if (meaningful.length < 2) return { mode: 'none', ranked: [] };
  const needed = Math.ceil(meaningful.length / 2);
  const allFields = (e: IndexedArticle) => [e.title, e.slug, e.excerpt, e.category];
  const hits = index.articles.map((entry) =>
    meaningful.map((term) => termIn(term, allFields(entry))),
  );
  // Inverse document frequency: "perak" (one article) outweighs "negeri" (five),
  // so "mas kahwin negeri perak" puts the Perak article first.
  const idf = meaningful.map((_, t) => {
    const df = hits.reduce((n, row) => n + (row[t] ? 1 : 0), 0);
    return df === 0 ? 0 : Math.log(1 + index.articles.length / df);
  });
  const stage3: Ranked[] = [];
  index.articles.forEach((entry, i) => {
    const row = hits[i]!;
    const matched = row.filter(Boolean).length;
    if (matched < needed) return;
    const weight = row.reduce((w, hit, t) => w + (hit ? idf[t]! : 0), 0);
    const titleFields = [entry.title, entry.slug];
    const titleMatched = meaningful.filter((term) => termIn(term, titleFields)).length;
    stage3.push({ entry, tier: 4, matched, weight, titleMatched });
  });
  if (stage3.length > 0) {
    // Only the closest band: with "mas kahwin negeri perak", the articles that
    // match three words, not the 38 that share "mas kahwin" through their
    // category name. "Ini yang paling hampir" has to be true.
    const best = Math.max(...stage3.map((r) => r.matched));
    const closest = stage3.filter((r) => r.matched === best);
    return { mode: 'approximate', ranked: closest.sort(byRank) };
  }
  return { mode: 'none', ranked: [] };
}

/**
 * The query with each word that matches nothing anywhere swapped for the
 * closest title or category word, or null when no word needed (or found) a
 * correction. Synonym keys, stopwords and numbers are left alone.
 */
export function suggestCorrection(index: SearchIndex, query: string): string | null {
  const tokens = tokenize(query);
  let changed = false;
  const corrected = tokens.map((token) => {
    if (isStopword(token) || SYNONYM_KEY_TOKENS.has(token) || /\d/.test(token)) return token;
    if (tokenInSet(token, index.allTokens)) return token;
    const fix = closestWord(token, index.vocabulary);
    if (!fix) return token;
    changed = true;
    return fix;
  });
  return changed ? corrected.join(' ') : null;
}

export interface SearchOptions {
  limit: number;
  offset: number;
}

function page(
  query: string,
  matched: Matched,
  suggestion: string | null,
  mode: SearchMode,
  { limit, offset }: SearchOptions,
): SearchResponse {
  return {
    query,
    articles: matched.ranked.slice(offset, offset + limit).map((r) => r.entry.article),
    total: matched.ranked.length,
    mode,
    suggestion,
  };
}

/** Runs a query against a built index. `query` is returned trimmed, as typed. */
export function searchIndex(
  index: SearchIndex,
  rawQuery: string,
  options: SearchOptions,
): SearchResponse {
  const query = rawQuery.trim().slice(0, SEARCH_MAX_QUERY_LENGTH);
  const empty: SearchResponse = { query, articles: [], total: 0, mode: 'none', suggestion: null };
  if (query.length < SEARCH_MIN_QUERY_LENGTH) return empty;

  const original = matchQuery(index, query);

  let suggestion: string | null = null;
  let suggested: Matched | null = null;
  // An exact answer needs no correction; otherwise try one.
  if (original.mode !== 'exact') {
    const corrected = suggestCorrection(index, query);
    if (corrected) {
      const result = matchQuery(index, corrected);
      if (result.ranked.length > 0) {
        suggestion = corrected;
        suggested = result;
      }
    }
  }

  if (original.ranked.length === 0 && suggested) {
    return page(query, suggested, suggestion, 'approximate', options);
  }
  return page(query, original, suggestion, original.mode, options);
}

/**
 * The articles a reader may see at `now`: a `published` article dated in the
 * future is scheduled, not live, and must not surface in search. Filtered at
 * query time rather than when the corpus is cached, so a scheduled article
 * appears the moment its date passes instead of when the cache next refreshes.
 * An article with no date is treated as live, as the article pages treat it.
 */
export function publiclyVisible(
  corpus: readonly CorpusArticle[],
  now: number = Date.now(),
): CorpusArticle[] {
  return corpus.filter((a) => a.publishedAt === null || Date.parse(a.publishedAt) <= now);
}

/** Convenience for tests and one-off callers: index and search in one go. */
export function searchCorpus(
  corpus: readonly CorpusArticle[],
  query: string,
  options: SearchOptions,
): SearchResponse {
  return searchIndex(buildSearchIndex(corpus), query, options);
}

export interface CategorySummary {
  slug: string;
  name: string;
  count: number;
}

/** Categories by number of published articles (primary category), largest first. */
export function topCategories(corpus: readonly CorpusArticle[], limit: number): CategorySummary[] {
  const counts = new Map<string, CategorySummary>();
  for (const a of corpus) {
    const current = counts.get(a.categorySlug);
    if (current) current.count += 1;
    else counts.set(a.categorySlug, { slug: a.categorySlug, name: a.categoryName, count: 1 });
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}
