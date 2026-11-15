/**
 * Spelling correction for search ("Mungkin maksud anda: hantaran").
 *
 * Distance is Damerau-Levenshtein in its optimal-string-alignment form: an
 * insertion, deletion, substitution or swap of two neighbouring letters each
 * cost one. "hantran" → "hantaran" is 1; "tunnag" → "tunang" is 1.
 */
export function damerauLevenshtein(a: string, b: string, max = Infinity): number {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > max) return max + 1;
  if (la === 0) return lb;
  if (lb === 0) return la;

  // Three rolling rows: two back (for the swap), previous, current.
  let prev2 = new Array<number>(lb + 1).fill(0);
  let prev = Array.from({ length: lb + 1 }, (_, j) => j);
  let cur = new Array<number>(lb + 1).fill(0);

  for (let i = 1; i <= la; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prev2[j - 2]! + 1);
      }
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    [prev2, prev, cur] = [prev, cur, prev2];
  }
  return prev[lb]!;
}

/** How many edits a word of this length may be corrected by: none under 4 letters. */
export function maxEditsFor(word: string): number {
  if (word.length < 4) return 0;
  if (word.length <= 6) return 1;
  return 2;
}

/**
 * The closest vocabulary word within the allowed distance, or null. Ties go to
 * the smaller distance, then the word that appears in more articles, then the
 * alphabetically first, so the answer is stable.
 *
 * @param vocabulary word → how many articles use it
 */
export function closestWord(word: string, vocabulary: ReadonlyMap<string, number>): string | null {
  const limit = maxEditsFor(word);
  if (limit === 0) return null;
  let best: { word: string; distance: number; frequency: number } | null = null;
  for (const [candidate, frequency] of vocabulary) {
    if (candidate === word) return null;
    const distance = damerauLevenshtein(word, candidate, limit);
    if (distance > limit) continue;
    if (
      !best ||
      distance < best.distance ||
      (distance === best.distance && frequency > best.frequency) ||
      (distance === best.distance && frequency === best.frequency && candidate < best.word)
    ) {
      best = { word: candidate, distance, frequency };
    }
  }
  return best?.word ?? null;
}
