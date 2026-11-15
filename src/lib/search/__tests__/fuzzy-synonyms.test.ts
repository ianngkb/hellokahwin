import { describe, expect, it } from 'vitest';
import { closestWord, damerauLevenshtein, maxEditsFor } from '../fuzzy';
import { normaliseText, tokenize } from '../normalise';
import { SYNONYMS, expandQueryTerms } from '../synonyms';

describe('damerauLevenshtein', () => {
  it.each([
    ['hantaran', 'hantaran', 0],
    ['hantran', 'hantaran', 1],
    ['tunnag', 'tunang', 1],
    ['nikha', 'nikah', 1],
    ['pelamn', 'pelamin', 1],
    ['kahwin', 'kawhin', 1],
    ['abc', '', 3],
    ['walimatul', 'walimatol', 1],
    ['perkahwinan', 'prkahwnan', 2],
  ])('%s → %s = %d', (a, b, d) => {
    expect(damerauLevenshtein(a, b)).toBe(d);
  });

  it('stops early above the cap', () => {
    expect(damerauLevenshtein('aaaaaaa', 'bbbbbbb', 2)).toBe(3);
  });
});

describe('closestWord', () => {
  const vocab = new Map([
    ['hantaran', 38],
    ['hantar', 1],
    ['tunang', 9],
    ['pelamin', 3],
    ['nikah', 10],
  ]);

  it('allows one edit for 4–6 letters and two for 7+', () => {
    expect(maxEditsFor('doa')).toBe(0);
    expect(maxEditsFor('nika')).toBe(1);
    expect(maxEditsFor('hantran')).toBe(2);
    expect(closestWord('tunnag', vocab)).toBe('tunang');
    expect(closestWord('tnnag', vocab)).toBeNull();
  });

  it('prefers the smaller distance, then the commoner word', () => {
    expect(closestWord('hantran', vocab)).toBe('hantaran');
  });

  it('returns null for a word already in the vocabulary', () => {
    expect(closestWord('nikah', vocab)).toBeNull();
  });
});

describe('normalise', () => {
  it('lowercases, folds accents, strips punctuation, keeps digits', () => {
    expect(normaliseText('Mas-Kahwin: Pahang, 2026!')).toBe('mas kahwin pahang 2026');
    expect(normaliseText('Café  Ñ')).toBe('cafe n');
  });

  it('folds kahwin spellings', () => {
    expect(tokenize('maskawin kawin')).toEqual(['mas', 'kahwin', 'kahwin']);
  });
});

describe('synonyms', () => {
  it('maps the curated English words to Malay', () => {
    const lookup = (en: string) =>
      SYNONYMS.find((s) => s.phrase.join(' ') === en)?.alternatives.map((a) => a.join(' '));
    expect(lookup('dowry')).toEqual(['hantaran', 'mas kahwin']);
    expect(lookup('wedding')).toEqual(['kahwin', 'perkahwinan', 'majlis']);
    expect(lookup('engagement')).toEqual(['tunang', 'pertunangan']);
    expect(lookup('wedding dress')).toEqual(['baju pengantin', 'busana']);
    expect(lookup('prayer')).toEqual(['doa']);
    expect(lookup('marriage')).toContain('nikah');
    expect(lookup('venue')).toContain('dewan');
    expect(lookup('decoration')).toEqual(expect.arrayContaining(['pelamin', 'hiasan']));
    expect(lookup('cost')).toEqual(expect.arrayContaining(['kos', 'bajet']));
    expect(lookup('budget')).toEqual(expect.arrayContaining(['kos', 'bajet']));
  });

  it('consumes the longest phrase first', () => {
    const terms = expandQueryTerms(['wedding', 'dress', 'johor']);
    expect(terms.map((t) => t.text)).toEqual(['wedding dress', 'johor']);
    expect(terms[0]!.alternatives[0]).toEqual(['wedding', 'dress']);
    expect(terms[1]!.fromSynonym).toBe(false);
  });
});
