/**
 * ISO 3166-2:MY subdivision codes → state names, as Vercel sends them in
 * `x-vercel-ip-country-region` (the part after `MY-`).
 *
 * A static map rather than the `iso-3166-2` package The Wedding Notebook uses:
 * HelloKahwin's audience is overwhelmingly Malaysian, so this is the only
 * country whose states are worth naming, and 16 entries are not worth a
 * ~244KB dependency.
 */
const MY_STATES: Record<string, string> = {
  '01': 'Johor',
  '02': 'Kedah',
  '03': 'Kelantan',
  '04': 'Melaka',
  '05': 'Negeri Sembilan',
  '06': 'Pahang',
  '07': 'Pulau Pinang',
  '08': 'Perak',
  '09': 'Perlis',
  '10': 'Selangor',
  '11': 'Terengganu',
  '12': 'Sabah',
  '13': 'Sarawak',
  '14': 'Wilayah Persekutuan Kuala Lumpur',
  '15': 'Wilayah Persekutuan Labuan',
  '16': 'Wilayah Persekutuan Putrajaya',
};

/**
 * Resolve a state display name from a country + subdivision code.
 *
 *   regionName('MY', '10') === 'Selangor'
 *   regionName('US', 'CA') === 'CA'   // not mapped: shown raw
 *
 * It NEVER throws and NEVER hides a code it can't map:
 *   - A missing code, or the 'Unknown' sentinel the States panel coalesces a
 *     missing region to, returns 'Unknown'.
 *   - A code with no mapping falls back to the raw code, so an unmapped
 *     subdivision still prints something a person can act on.
 */
export function regionName(
  country: string | null | undefined,
  code: string | null | undefined,
): string {
  if (!code || code === 'Unknown') return 'Unknown';
  if (country?.toUpperCase() !== 'MY') return code;
  return MY_STATES[code.toUpperCase()] ?? code;
}
