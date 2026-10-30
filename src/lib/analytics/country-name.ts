import { isCountryCode } from '@/lib/analytics/sql-filters';

let displayNames: Intl.DisplayNames | null | undefined;

/**
 * ISO alpha-2 → English country name via `Intl.DisplayNames`; anything else
 * (Unknown, a pseudo-code) comes back raw. Called on the SERVER only, so the
 * name a page renders never depends on the browser's ICU data — a server and
 * client disagreeing would be a hydration mismatch.
 */
export function countryName(code: string): string {
  if (!isCountryCode(code)) return code;
  if (displayNames === undefined) {
    try {
      displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
    } catch {
      displayNames = null;
    }
  }
  try {
    return displayNames?.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}
