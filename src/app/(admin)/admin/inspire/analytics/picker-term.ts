/**
 * The article picker's search term rules, shared by the client picker and the
 * server search action so both count the same way. Lengths are in CODE POINTS
 * (`Array.from`), not UTF-16 units: one emoji is one character, so it does not
 * pass the two-character minimum on its own, and the cap never cuts an emoji
 * in half.
 */
export const PICKER_MIN_TERM_CHARS = 2;
export const PICKER_MAX_TERM_CHARS = 200;

/** The trimmed term. */
export function pickerTerm(query: string): string {
  return query.trim();
}

/** Characters (code points) in the trimmed term. */
export function pickerTermLength(query: string): number {
  return Array.from(pickerTerm(query)).length;
}

/** Whether the term is long enough to search. */
export function isSearchableTerm(query: string): boolean {
  return pickerTermLength(query) >= PICKER_MIN_TERM_CHARS;
}

/**
 * The box's content capped at PICKER_MAX_TERM_CHARS code points (I-F14). The
 * picker stores ONLY this, so the term on screen is exactly the term searched:
 * the server trims and applies the same cap, and a capped box trims to no more
 * than the cap, so it never silently drops a suffix the admin can still see.
 */
export function capPickerQuery(raw: string): string {
  const chars = Array.from(raw);
  return chars.length <= PICKER_MAX_TERM_CHARS
    ? raw
    : chars.slice(0, PICKER_MAX_TERM_CHARS).join('');
}
