/**
 * The page total to show when the exact `count(*)` could not be obtained.
 *
 * Ported from The Wedding Notebook (`lib/media/paging.ts`).
 *
 * WHY THIS EXISTS. The admin media library fetches a page of rows and an exact
 * total side by side. A searched view (`filename/alt/caption ILIKE '%term%'`)
 * cannot use an index, so on a large table the count is the slow half and can
 * cross the database's statement timeout — which used to reject the whole
 * request and take the media library page down, throwing away rows that had
 * already been fetched in order to render a number.
 *
 * The count now degrades to this estimate. It is NOT a guess at the real total:
 * it is the smallest total consistent with what we can see, chosen so paging
 * still works.
 *
 *   - A FULL page means there is at least one more row, so claim exactly one
 *     more than we have seen. `Math.ceil(total / pageSize)` is then the current
 *     page plus one, which keeps "Next" enabled — the admin walks forward and
 *     the estimate re-derives on each page.
 *   - A PARTIAL (or empty) page IS the end of the list, so the figure is exact.
 *
 * It can never strand the admin before the real end, and it never claims a page
 * that is not there.
 *
 * Callers must distinguish "the count returned 0" from "the count failed", and
 * `0` is falsy: use `??` against a `null` sentinel, never `||`.
 */
export function estimateTotalFromPage(offset: number, rowCount: number, pageSize: number): number {
  return offset + rowCount + (rowCount === pageSize ? 1 : 0);
}

/**
 * Run a count query, and turn a failure into `null` instead of a rejection.
 *
 * Kept next to the estimate so every caller pairs them the same way:
 * `(await countOrNull(...)) ?? estimateTotalFromPage(...)`.
 */
export async function countOrNull(
  run: () => Promise<number>,
  label = 'media-library',
): Promise<number | null> {
  try {
    return await run();
  } catch (err) {
    console.error(`[${label}] count failed; falling back to a paging estimate`, err);
    return null;
  }
}
