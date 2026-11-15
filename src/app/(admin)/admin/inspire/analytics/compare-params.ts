import { MAX_COMPARE_ARTICLES } from '@/lib/analytics/compare-limits';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ParsedCompareIds {
  /** Well-formed, de-duplicated ids in the order given, at most MAX_COMPARE_ARTICLES. */
  ids: string[];
  /** Well-formed ids dropped because the selection was over the cap. */
  overCap: number;
  /** Entries that were not article ids at all (ignored). */
  malformed: number;
}

/**
 * `?ids=<uuid>,<uuid>…` → the selection. Order is kept (it is the column
 * order and the colour order); duplicates, blanks and malformed entries are
 * dropped; anything past MAX_COMPARE_ARTICLES is cut HERE, before any getter
 * runs — the comparison getters throw a RangeError past six, and that would
 * 500 the page. A repeated `?ids=` param is joined, never trusted as one.
 */
export function parseCompareIds(raw: string | string[] | undefined): ParsedCompareIds {
  const joined = Array.isArray(raw) ? raw.join(',') : (raw ?? '');
  const seen = new Set<string>();
  let malformed = 0;
  for (const part of joined.split(',')) {
    const id = part.trim().toLowerCase();
    if (!id) continue;
    if (!UUID_RE.test(id)) {
      malformed += 1;
      continue;
    }
    seen.add(id);
  }
  const all = [...seen];
  return {
    ids: all.slice(0, MAX_COMPARE_ARTICLES),
    overCap: Math.max(0, all.length - MAX_COMPARE_ARTICLES),
    malformed,
  };
}

/**
 * The Compare tab's URL for a selection. Always carries `view=compare`, so
 * removing the last article keeps you on the Compare tab rather than dropping
 * you onto the overview.
 */
export function compareHref(ids: readonly string[]): string {
  return ids.length === 0
    ? '/admin/inspire/analytics?view=compare'
    : `/admin/inspire/analytics?view=compare&ids=${ids.join(',')}`;
}
