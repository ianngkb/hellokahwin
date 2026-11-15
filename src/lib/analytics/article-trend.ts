/**
 * Pure classification of a period-over-period view trend for one article.
 *
 * Kept in its own module (no `server-only`, no DB) so both the client table and
 * the unit tests can import it. The rendering — green up-arrow / red down-arrow /
 * em-dash — is `ChangeBadge`'s job; this only decides WHICH case applies, and in
 * particular carves out the "brand-new article" case a raw percentage cannot
 * express.
 */
export type ArticleTrend =
  | { kind: 'new' } // current > 0 but no prior window to compare — "New"
  | { kind: 'none' } // nothing in either window — render an em-dash
  | { kind: 'delta'; pct: number; direction: 'up' | 'down' | 'flat' };

export function classifyTrend(current: number, prior: number): ArticleTrend {
  if (prior === 0) {
    return current > 0 ? { kind: 'new' } : { kind: 'none' };
  }
  const diff = current - prior;
  const pct = Math.abs(Math.round((diff / prior) * 100));
  const direction = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
  return { kind: 'delta', pct, direction };
}
