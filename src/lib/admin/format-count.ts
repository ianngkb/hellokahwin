/**
 * Compact count for admin dashboards: `999`, `12.3k`, `4.5M`.
 *
 * The unit is chosen AFTER accounting for rounding: 999,950 rounds to 1000.0
 * thousands, so anything from there up is shown in millions ("1.0M") rather
 * than as "1000.0k".
 */
export function formatCount(n: number): string {
  if (n >= 999_950) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
