import type { NextRequest } from 'next/server';

/**
 * Region codes are stored raw and grouped on by the dashboard's States panel,
 * so a malformed or oversized provider value would render as its own junk row.
 * Normalize at the write boundary: trim, upper-case (ISO 3166-2 region parts are
 * upper-case; numeric codes are unaffected), and accept only the 1–10
 * alphanumerics real subdivision codes use — anything else becomes null
 * (treated as "no region"). Kept here rather than importing sql-filters so the geo
 * helper carries no query-layer dependency.
 */
function normalizeRegion(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim().toUpperCase();
  return /^[A-Z0-9]{1,10}$/.test(v) ? v : null;
}

export interface GeoResult {
  country: string | null;
  /**
   * State/province code as the geo provider sent it (e.g. `10` for Selangor,
   * `CA` for California) — NOT a display name. Combine with `country` as
   * `${country}-${region}` to resolve a name via `region-name.ts`. Null when the
   * provider gave no region (Cloudflare fallback, local dev).
   */
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Vercel URL-encodes the `x-vercel-ip-city` header (e.g. `Tampines%20New%20Town`,
 * `S%C3%A3o%20Paulo`). Decode it so stored and displayed city names are human
 * readable. Malformed percent-sequences fall back to the raw value.
 */
export function decodeGeoCity(city: string | null): string | null {
  if (!city) return city;
  try {
    return decodeURIComponent(city);
  } catch {
    return city;
  }
}

/**
 * Resolves geographic information from request headers.
 *
 * Priority order:
 * 1. Vercel headers: `x-vercel-ip-country` + `x-vercel-ip-country-region` + `x-vercel-ip-city`
 * 2. Cloudflare header: `cf-ipcountry` (country only — CF gives no region here)
 * 3. null (local dev or unknown)
 */
export function resolveGeo(request: NextRequest): GeoResult {
  const vercelCountry = request.headers.get('x-vercel-ip-country');
  const vercelCity = request.headers.get('x-vercel-ip-city');
  // Vercel's subdivision code, e.g. `10` (Selangor), `CA` (California). A
  // whitespace-only or empty header counts as "no region".
  const vercelRegion = request.headers.get('x-vercel-ip-country-region');

  if (vercelCountry) {
    const lat = parseFloat(request.headers.get('x-vercel-ip-latitude') ?? '');
    const lng = parseFloat(request.headers.get('x-vercel-ip-longitude') ?? '');
    return {
      country: vercelCountry,
      region: normalizeRegion(vercelRegion),
      city: decodeGeoCity(vercelCity),
      latitude: Number.isFinite(lat) ? lat : null,
      longitude: Number.isFinite(lng) ? lng : null,
    };
  }

  const cfCountry = request.headers.get('cf-ipcountry');
  if (cfCountry) {
    return {
      country: cfCountry,
      region: null,
      city: null,
      latitude: null,
      longitude: null,
    };
  }

  return { country: null, region: null, city: null, longitude: null, latitude: null };
}
