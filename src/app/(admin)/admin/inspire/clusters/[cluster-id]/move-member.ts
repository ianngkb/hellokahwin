/**
 * `members` with the item at `from` moved one step up (-1) or down (+1).
 * Out-of-range moves (the first item up, the last item down) return an
 * unchanged copy.
 */
export function moveMember<T>(members: readonly T[], from: number, step: -1 | 1): T[] {
  const to = from + step;
  if (from < 0 || from >= members.length || to < 0 || to >= members.length) return [...members];
  const next = [...members];
  [next[from], next[to]] = [next[to]!, next[from]!];
  return next;
}
