import { sql, type SQL } from 'drizzle-orm';

// Ported from The Wedding Notebook. Pure (no DB import), so the client
// dashboard can import the parsers without pulling in a database client.

export const TRAFFIC_MODES = ['human', 'bot', 'all'] as const;
export type TrafficMode = (typeof TRAFFIC_MODES)[number];

export const DEFAULT_TRAFFIC: TrafficMode = 'human';

export function parseTrafficMode(value: string | undefined | null): TrafficMode {
  if (!value) return DEFAULT_TRAFFIC;
  return (TRAFFIC_MODES as ReadonlyArray<string>).includes(value)
    ? (value as TrafficMode)
    : DEFAULT_TRAFFIC;
}

/**
 * Returns the SQL fragment to add to a WHERE clause to scope an analytics
 * query to humans / bots / both. Always returns a fragment (the "all" case
 * returns `TRUE`) so callers can unconditionally interpolate it via
 * `AND ${trafficFilter(mode)}` without branching.
 */
export function trafficFilter(mode: TrafficMode): SQL {
  switch (mode) {
    case 'human':
      return sql`is_bot = FALSE`;
    case 'bot':
      return sql`is_bot = TRUE`;
    case 'all':
      return sql`TRUE`;
  }
}

/**
 * Returns the SQL fragment to scope an analytics query to a single pathname.
 * When `pathname` is undefined or empty, returns `TRUE` so callers can
 * unconditionally interpolate it via `AND ${pageFilter(page)}`.
 */
export function pageFilter(pathname?: string): SQL {
  if (!pathname) return sql`TRUE`;
  return sql`pathname = ${pathname}`;
}

/** Matches an ISO 3166-1 alpha-2 country code (e.g. `US`, `MY`). */
export const COUNTRY_CODE_RE = /^[A-Z]{2}$/;

/**
 * All-letter codes that geo providers emit but that are NOT real countries:
 * `XX`/`ZZ` = unknown, `EU`/`AP`/`QO` = region aggregates, `A1`/`A2`/`O1` =
 * anonymizer/other buckets, `T1` = Tor. They (mostly) pass the alpha-2 shape
 * check but must not be drillable — they'd render a junk flag glyph and scope
 * every panel to a meaningless filter. Cloudflare `cf-ipcountry` is the main
 * source (see resolveGeo). Codes containing digits already fail COUNTRY_CODE_RE;
 * they're listed here anyway for self-documentation.
 */
const NON_COUNTRY_CODES = new Set(['XX', 'ZZ', 'EU', 'AP', 'QO', 'A1', 'A2', 'O1', 'T1']);

/**
 * True when `value` is a real, drillable ISO 3166-1 alpha-2 country code — i.e.
 * alpha-2 shape AND not a provider pseudo-code. Shared by the request boundary
 * (`parseCountry`) and the dashboard (which country rows are clickable / get a
 * flag) so the two can never disagree.
 */
export function isCountryCode(value: string | undefined | null): boolean {
  if (!value) return false;
  const upper = value.toUpperCase();
  return COUNTRY_CODE_RE.test(upper) && !NON_COUNTRY_CODES.has(upper);
}

/**
 * Normalizes an untrusted country query param to a real ISO alpha-2 code, or
 * `undefined` if it isn't one. Use at the request boundary before threading a
 * country into queries so the drill-down can't be driven by arbitrary input.
 */
export function parseCountry(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  return isCountryCode(upper) ? upper : undefined;
}

/**
 * Returns the SQL fragment to scope an analytics query to a single country
 * (ISO alpha-2). The input goes through `parseCountry` here, so the fragment is
 * safe whatever the caller passes: a pseudo-code or junk returns `TRUE`, which
 * callers can unconditionally interpolate via `AND ${countryFilter(country)}`.
 */
export function countryFilter(country?: string): SQL {
  const code = parseCountry(country);
  return code ? sql`country = ${code}` : sql`TRUE`;
}

/**
 * Matches a geo-provider subdivision (state/province) code. Unlike a country
 * code these are NOT uniformly shaped: Vercel emits numeric (`10` = Selangor),
 * alpha (`CA` = California) and alphanumeric codes. So we accept 1–10 ASCII
 * alphanumerics rather than a fixed shape — tight enough to keep arbitrary
 * input out of the drill-down, loose enough not to reject a real region.
 */
export const REGION_CODE_RE = /^[A-Za-z0-9]{1,10}$/;

/**
 * The States panel coalesces a missing region to the literal 'Unknown'. That
 * sentinel is alphanumeric and so passes REGION_CODE_RE, but it must NOT be
 * drillable: `?region=Unknown` would scope every panel to `region = 'Unknown'`,
 * which no stored row carries (a missing region is stored NULL), and the whole
 * dashboard would read as empty.
 */
export const UNKNOWN_DIMENSION = 'Unknown';

/** True when `value` is a real, drillable subdivision code (shape + not the sentinel, case-insensitive). */
export function isRegionCode(value: string | undefined | null): boolean {
  if (!value) return false;
  if (value.toUpperCase() === UNKNOWN_DIMENSION.toUpperCase()) return false;
  return REGION_CODE_RE.test(value);
}

/**
 * Normalizes an untrusted region query param to a safe subdivision code, or
 * `undefined` if it isn't one (including the 'Unknown' sentinel). Region codes
 * are stored upper-cased at write (see geo.ts), so this upper-cases too — a
 * hand-typed `?region=ca` then still matches the stored `CA`.
 */
export function parseRegion(value: string | undefined | null): string | undefined {
  if (!value || !isRegionCode(value)) return undefined;
  return value.toUpperCase();
}

/**
 * Returns the SQL fragment to scope an analytics query to a single region
 * (subdivision code). When `region` is undefined/invalid, returns `TRUE` so
 * callers can unconditionally interpolate it via `AND ${regionFilter(region)}`.
 *
 * A region only makes sense under a country, so callers pair it with
 * `countryFilter`; this fragment scopes the `region` column alone.
 */
export function regionFilter(region?: string): SQL {
  // Normalised (upper-cased) here, to match how geo.ts stores the code.
  const code = parseRegion(region);
  return code ? sql`region = ${code}` : sql`TRUE`;
}

/** Longest `?page=` pathname honoured — the collector clips pathnames to this. */
export const MAX_PAGE_PARAM_LENGTH = 2000;

/**
 * Normalizes an untrusted `?page=` param: a pathname starting with `/` and at
 * most MAX_PAGE_PARAM_LENGTH chars, or `undefined` (no page filter).
 */
export function parsePageParam(value: string | undefined | null): string | undefined {
  if (!value || !value.startsWith('/') || value.length > MAX_PAGE_PARAM_LENGTH) return undefined;
  return value;
}
