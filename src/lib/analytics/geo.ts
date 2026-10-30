import type { NextRequest } from 'next/server';
import { parseCountry } from '@/lib/analytics/sql-filters';

/**
 * Region codes are stored raw and grouped on by the dashboard's States panel,
 * so a malformed or oversized provider value would render as its own junk row.
 * Normalize at the write boundary: trim, upper-case (ISO 3166-2 region parts are
 * upper-case; numeric codes are unaffected), and accept only the 1–10
 * alphanumerics real subdivision codes use — anything else becomes null
 * (treated as "no region").
 */
function normalizeRegion(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim().toUpperCase();
  return /^[A-Z0-9]{1,10}$/.test(v) ? v : null;
}

/**
 * A provider country code, kept only when it is a real ISO alpha-2 country —
 * `XX`, `T1` and the other pseudo-codes become null, so the stored column
 * agrees with what the dashboard's `?country=` drill-down accepts.
 */
function normalizeCountry(raw: string | null): string | null {
  return parseCountry(raw?.trim()) ?? null;
}

/** A coordinate header, kept only when finite and within `±limit` degrees. */
function coordinate(raw: string | null, limit: number): number | null {
  const v = parseFloat(raw ?? '');
  return Number.isFinite(v) && Math.abs(v) <= limit ? v : null;
}

const MAX_CITY_CHARS = 100;

/** Drop C0 control characters and DEL, then clip — the header is untrusted. */
function cleanCity(city: string | null): string | null {
  if (!city) return null;
  const clean = Array.from(city)
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code > 0x1f && code !== 0x7f;
    })
    .join('')
    .slice(0, MAX_CITY_CHARS);
  return clean || null;
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
    return {
      country: normalizeCountry(vercelCountry),
      region: normalizeRegion(vercelRegion),
      city: cleanCity(decodeGeoCity(vercelCity)),
      latitude: coordinate(request.headers.get('x-vercel-ip-latitude'), 90),
      longitude: coordinate(request.headers.get('x-vercel-ip-longitude'), 180),
    };
  }

  const cfCountry = request.headers.get('cf-ipcountry');
  if (cfCountry) {
    return {
      country: normalizeCountry(cfCountry),
      region: null,
      city: null,
      latitude: null,
      longitude: null,
    };
  }

  return { country: null, region: null, city: null, longitude: null, latitude: null };
}
