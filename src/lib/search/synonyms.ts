import { tokenize } from './normalise';

/**
 * English words readers type, mapped to the Malay the articles are written in.
 * A curated list, not a translator: each entry exists because a reader can be
 * expected to search in English for something the site covers in Malay.
 *
 * Keys and values are written plainly and normalised at load, so a value may
 * be a phrase ("mas kahwin" needs both words). The English word itself always
 * stays a match too, so an English title ("Garden Wedding") is still found.
 */
const RAW_SYNONYMS: Record<string, readonly string[]> = {
  dowry: ['hantaran', 'mas kahwin'],
  'bride price': ['hantaran', 'mas kahwin'],
  mahr: ['mas kahwin'],
  'wedding dress': ['baju pengantin', 'busana'],
  'wedding gown': ['baju pengantin', 'busana'],
  'bridal dress': ['baju pengantin', 'busana'],
  dress: ['baju', 'busana'],
  outfit: ['baju', 'busana'],
  wedding: ['kahwin', 'perkahwinan', 'majlis'],
  marriage: ['nikah', 'perkahwinan', 'kahwin'],
  married: ['nikah', 'kahwin'],
  marry: ['nikah', 'kahwin'],
  engagement: ['tunang', 'pertunangan'],
  engaged: ['tunang', 'pertunangan'],
  'engagement ring': ['cincin tunang'],
  ring: ['cincin'],
  prayer: ['doa'],
  prayers: ['doa'],
  venue: ['dewan'],
  hall: ['dewan'],
  decoration: ['pelamin', 'hiasan', 'dekorasi'],
  decorations: ['pelamin', 'hiasan', 'dekorasi'],
  decor: ['pelamin', 'hiasan', 'dekorasi'],
  dais: ['pelamin'],
  cost: ['kos', 'bajet', 'harga'],
  costs: ['kos', 'bajet', 'harga'],
  budget: ['kos', 'bajet'],
  price: ['harga', 'kos', 'kadar'],
  bride: ['pengantin'],
  groom: ['pengantin'],
  newlyweds: ['pengantin baru'],
  invitation: ['kad jemputan', 'jemputan'],
  card: ['kad'],
  gift: ['hadiah', 'cenderahati'],
  gifts: ['hadiah', 'cenderahati'],
  souvenir: ['cenderahati', 'goodies'],
  henna: ['inai'],
  speech: ['ucapan'],
  wishes: ['ucapan'],
  reception: ['majlis', 'resepsi', 'walimatul urus'],
  feast: ['kenduri', 'walimatul urus'],
  requirements: ['syarat'],
  conditions: ['syarat'],
  form: ['borang'],
  course: ['kursus'],
  photography: ['fotografi'],
  photographer: ['fotografi', 'jurugambar'],
  husband: ['suami'],
  wife: ['isteri'],
  tray: ['dulang'],
  trays: ['dulang'],
};

/** One reading of a query word: the alternatives (each a token sequence) any of which satisfies it. */
export interface SynonymEntry {
  /** The English phrase, as normalised tokens. */
  phrase: string[];
  /** Malay alternatives, each as normalised tokens. */
  alternatives: string[][];
}

/** Entries sorted longest phrase first, so "wedding dress" is consumed before "wedding". */
export const SYNONYMS: readonly SynonymEntry[] = Object.entries(RAW_SYNONYMS)
  .map(([phrase, alts]) => ({
    phrase: tokenize(phrase),
    alternatives: alts.map((a) => tokenize(a)),
  }))
  .sort((a, b) => b.phrase.length - a.phrase.length);

/** Every token that appears as (part of) an English synonym key. */
export const SYNONYM_KEY_TOKENS: ReadonlySet<string> = new Set(SYNONYMS.flatMap((s) => s.phrase));

/**
 * One unit of a query that a result must satisfy: the words as typed, plus any
 * Malay alternative. `alternatives[0]` is always the typed form.
 */
export interface QueryTerm {
  /** The typed tokens, joined with a space (used for display and suggestions). */
  text: string;
  alternatives: string[][];
  /** True when the term came from the synonym list. */
  fromSynonym: boolean;
}

/**
 * Splits query tokens into terms, greedily matching the longest English
 * synonym phrase at each position. Unknown tokens become single-token terms.
 */
export function expandQueryTerms(tokens: readonly string[]): QueryTerm[] {
  const terms: QueryTerm[] = [];
  let i = 0;
  outer: while (i < tokens.length) {
    for (const entry of SYNONYMS) {
      const n = entry.phrase.length;
      if (n === 0 || i + n > tokens.length) continue;
      let hit = true;
      for (let k = 0; k < n; k++) {
        if (tokens[i + k] !== entry.phrase[k]) {
          hit = false;
          break;
        }
      }
      if (hit) {
        terms.push({
          text: entry.phrase.join(' '),
          alternatives: [entry.phrase, ...entry.alternatives],
          fromSynonym: true,
        });
        i += n;
        continue outer;
      }
    }
    terms.push({ text: tokens[i]!, alternatives: [[tokens[i]!]], fromSynonym: false });
    i += 1;
  }
  return terms;
}
