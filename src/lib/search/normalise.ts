/**
 * Text normalisation shared by the search index and the query (DES-06 §3.3):
 * lowercase, accents folded, punctuation stripped, digits kept, and the common
 * spellings of "kahwin" folded together so `kawin`, `maskahwin` and
 * `maskawin` find the same articles as `kahwin` and `mas kahwin`.
 */

/** Whole-token spellings folded to the form the titles use. */
const TOKEN_FOLDS: Record<string, readonly string[]> = {
  kawin: ['kahwin'],
  maskahwin: ['mas', 'kahwin'],
  maskawin: ['mas', 'kahwin'],
  perkawinan: ['perkahwinan'],
};

/**
 * Malay (and a few English) function words. They are dropped from the set of
 * words a result must contain, so "cara buat hantaran" is not failed by "cara";
 * a query made only of these keeps them, so it still means something.
 */
export const STOPWORDS: ReadonlySet<string> = new Set([
  'dan',
  'di',
  'ke',
  'dari',
  'daripada',
  'untuk',
  'yang',
  'cara',
  'apa',
  'itu',
  'ini',
  'dengan',
  'atau',
  'ada',
  'bagi',
  'pada',
  'dalam',
  'adalah',
  'ialah',
  'nak',
  'mahu',
  'macam',
  'mana',
  'bagaimana',
  'berapa',
  'boleh',
  'tak',
  'tidak',
  'the',
  'a',
  'an',
  'of',
  'in',
  'for',
  'and',
  'to',
  'how',
  'what',
]);

/** Lowercase, fold accents, and turn everything that is not a letter or digit into a space. */
export function normaliseText(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Normalised tokens, with the kahwin spellings folded. */
export function tokenize(input: string): string[] {
  const out: string[] = [];
  for (const raw of normaliseText(input).split(' ')) {
    if (!raw) continue;
    const folded = TOKEN_FOLDS[raw];
    if (folded) out.push(...folded);
    else out.push(raw);
  }
  return out;
}

export function isStopword(token: string): boolean {
  return STOPWORDS.has(token);
}
