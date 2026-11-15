import { describe, expect, it } from 'vitest';
import {
  buildSearchIndex,
  searchCorpus,
  searchIndex,
  topCategories,
  type CorpusArticle,
} from '../engine';
import { FIXTURE_CORPUS } from './fixture-corpus';

const ALL = { limit: 200, offset: 0 };
const index = buildSearchIndex(FIXTURE_CORPUS);
const search = (q: string, opts = ALL) => searchIndex(index, q, opts);
const titles = (q: string) => search(q).articles.map((a) => a.title);

describe('DES-06 must-pass queries against the real titles', () => {
  it('finds Terengganu when the words are in a different order', () => {
    const r = search('mas kahwin terengganu');
    expect(r.mode).toBe('exact');
    expect(r.articles[0]?.title).toBe('Mas kahwin Kelantan dan Terengganu 2026: tiada kadar tetap');
  });

  it.each(['mas kahwin pahang 2026', 'mas kahwin negeri sembilan'])(
    '%s → Pahang dan Negeri Sembilan',
    (q) => {
      const r = search(q);
      expect(r.mode).toBe('exact');
      expect(r.articles[0]?.title).toBe('Mas kahwin Pahang dan Negeri Sembilan 2026: kadar rasmi');
    },
  );

  it('maksud walimatul urus', () => {
    expect(titles('maksud walimatul urus')[0]).toBe(
      'Walimatul urus: maksud, hukum dan adab jemputan',
    );
  });

  it('doa pengantin baru rumi', () => {
    expect(titles('doa pengantin baru rumi')).toEqual([
      'Doa pengantin baru: lafaz penuh, rumi dan maksudnya',
    ]);
  });

  it('dowry finds hantaran and mas kahwin articles through the synonym list', () => {
    const r = search('dowry');
    expect(r.mode).toBe('exact');
    expect(r.total).toBeGreaterThan(30);
    for (const a of r.articles) {
      expect(a.title.toLowerCase()).toMatch(/hantaran|mas kahwin/);
    }
    expect(r.articles.some((a) => a.title.startsWith('Mas kahwin'))).toBe(true);
  });

  it('hantran suggests hantaran and shows its articles as approximate', () => {
    const r = search('hantran');
    expect(r.suggestion).toBe('hantaran');
    expect(r.mode).toBe('approximate');
    expect(r.total).toBe(search('hantaran').total);
    expect(r.total).toBeGreaterThan(25);
    expect(r.articles.every((a) => /hantaran/i.test(a.title + a.slug))).toBe(true);
  });
});

describe('matching', () => {
  it('is case-, accent- and punctuation-insensitive', () => {
    expect(titles('MAS-KAHWIN, Térengganu!')[0]).toBe(
      'Mas kahwin Kelantan dan Terengganu 2026: tiada kadar tetap',
    );
  });

  it('folds kawin and maskahwin to kahwin and mas kahwin', () => {
    expect(titles('maskawin johor')[0]).toBe(
      'Mas kahwin Johor 2026: RM22.50 dan asal usul angkanya',
    );
    expect(titles('kursus kawin selangor')[0]).toBe(
      'Kursus kahwin Selangor: yuran RM100 dan 10 penganjur',
    );
  });

  it('ranks the exact phrase in a title first, then newest', () => {
    const r = search('hantaran tunang');
    expect(r.mode).toBe('exact');
    // Every title-phrase hit comes before any title that only has both words apart.
    const phraseHits = r.articles.map((a) => /hantaran tunang/i.test(a.title));
    const firstNonPhrase = phraseHits.indexOf(false);
    if (firstNonPhrase >= 0) expect(phraseHits.slice(firstNonPhrase).every((x) => !x)).toBe(true);
  });

  it('does not let a short word match as a prefix ("mas" is not "masa")', () => {
    const corpus: CorpusArticle[] = [
      { ...FIXTURE_CORPUS[0]!, id: 'x', title: 'Masa yang sesuai', slug: 'masa' },
    ];
    expect(searchCorpus(corpus, 'mas', ALL).total).toBe(0);
  });

  it('lets a longer word match as a prefix ("hantar" finds "hantaran")', () => {
    expect(search('hantar').total).toBeGreaterThan(30);
  });

  it('ignores stopwords in the words a result must contain', () => {
    expect(titles('cara tetapkan duit hantaran')[0]).toBe(
      'Cara tetapkan jumlah duit hantaran tanpa jatuh air muka',
    );
    expect(search('apa itu taaruf').articles[0]?.title).toMatch(/^Taaruf Maksud/);
  });

  it('ranks title hits above excerpt-only hits', () => {
    const corpus: CorpusArticle[] = [
      {
        ...FIXTURE_CORPUS[0]!,
        id: 'old-title',
        title: 'Pelamin songket',
        slug: 'p1',
        publishedAt: '2020-01-01T00:00:00.000Z',
      },
      {
        ...FIXTURE_CORPUS[0]!,
        id: 'new-excerpt',
        title: 'Lain',
        slug: 'p2',
        excerpt: 'Tentang pelamin songket.',
        publishedAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    const r = searchCorpus(corpus, 'songket pelamin', ALL);
    expect(r.articles.map((a) => a.id)).toEqual(['old-title', 'new-excerpt']);
    expect(r.mode).toBe('exact');
  });

  it('uses the category name only when titles find nothing (stage 2)', () => {
    // "videografi" is only in the category name "Fotografi & Videografi".
    const r = search('videografi');
    expect(r.mode).toBe('exact');
    expect(r.articles[0]?.slug).toBe('lokasi-pre-wedding-photoshoot-terbaik');
  });

  it('falls back to a ranked partial match, labelled approximate (stage 3)', () => {
    const r = search('mas kahwin negeri perak');
    expect(r.mode).toBe('approximate');
    expect(r.articles[0]?.title).toBe('Mas kahwin Perak 2026: tiada kadar minimum ditetapkan');
    // Only the closest band (three of four words), not every "mas kahwin" article.
    expect(r.total).toBeLessThan(10);
    expect(r.articles.map((a) => a.title)).toContain(
      'Mas kahwin ikut negeri 2026: kadar minimum setiap negeri',
    );
  });

  it('needs at least half the meaningful words for an approximate match', () => {
    // One of three meaningful words matches: not enough.
    expect(search('pelamin qzxwv plokij').mode).toBe('none');
  });

  it('never runs stage 3 when stage 1 found something', () => {
    const r = search('mas kahwin');
    expect(r.mode).toBe('exact');
    // The fixture has no excerpts, so every hit carries both words in its title or slug.
    for (const a of r.articles) {
      const text = `${a.title} ${a.slug}`.toLowerCase();
      expect(text).toMatch(/\bmas\b/);
      expect(text).toMatch(/kahwin/);
    }
  });

  it('returns none for nonsense, and for queries under two characters', () => {
    expect(search('qzxwv')).toMatchObject({
      mode: 'none',
      total: 0,
      suggestion: null,
      articles: [],
    });
    expect(search('a')).toMatchObject({ mode: 'none', total: 0 });
    expect(search('  !! ')).toMatchObject({ mode: 'none', total: 0 });
  });
});

describe('synonyms in queries', () => {
  it('wedding dress → baju pengantin', () => {
    expect(titles('wedding dress')[0]).toBe('Baju pengantin: sewa atau beli, dan kos sebenar 2026');
  });

  it('engagement ring → cincin tunang', () => {
    expect(titles('engagement ring')[0]).toMatch(/^Cincin Tunang/);
  });

  it('prayer, venue, budget map to doa, dewan, bajet', () => {
    expect(search('prayer').total).toBeGreaterThan(10);
    expect(titles('venue').some((t) => /dewan/i.test(t))).toBe(true);
    expect(titles('wedding budget').some((t) => /bajet kahwin/i.test(t))).toBe(true);
  });

  it('keeps the English word itself as a match', () => {
    expect(titles('garden wedding')[0]).toBe('20 Venue Garden Wedding Paling Cantik di Malaysia');
  });
});

describe('spelling suggestions', () => {
  it('offers a correction while keeping a partial match for the original', () => {
    const r = search('hantaran tunnag');
    expect(r.suggestion).toBe('hantaran tunang');
  });

  it('does not correct words that already match', () => {
    expect(search('hantaran').suggestion).toBeNull();
  });

  it('does not correct short words', () => {
    expect(search('doq').suggestion).toBeNull();
  });
});

describe('paging', () => {
  it('honours limit and offset and reports the total before paging', () => {
    const full = search('hantaran');
    const page2 = search('hantaran', { limit: 5, offset: 5 });
    expect(page2.total).toBe(full.total);
    expect(page2.articles.map((a) => a.id)).toEqual(full.articles.slice(5, 10).map((a) => a.id));
  });
});

describe('topCategories', () => {
  it('orders categories by article count', () => {
    const top = topCategories(FIXTURE_CORPUS, 4);
    expect(top[0]).toMatchObject({ name: 'Hantaran & Mas Kahwin' });
    expect(top).toHaveLength(4);
    expect(top[0]!.count).toBeGreaterThanOrEqual(top[1]!.count);
  });
});
