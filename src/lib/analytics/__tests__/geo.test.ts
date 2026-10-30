import { describe, it, expect } from 'vitest';
import type { NextRequest } from 'next/server';
import { resolveGeo } from '../geo';

/** Minimal NextRequest stand-in: resolveGeo only reads `.headers.get`. */
function reqWith(headers: Record<string, string>): NextRequest {
  const h = new Headers(headers);
  return { headers: h } as unknown as NextRequest;
}

describe('resolveGeo — region (state) capture', () => {
  it('captures the Vercel region code alongside country/city', () => {
    const geo = resolveGeo(
      reqWith({
        'x-vercel-ip-country': 'MY',
        'x-vercel-ip-country-region': '10',
        'x-vercel-ip-city': 'Shah%20Alam',
        'x-vercel-ip-latitude': '3.07',
        'x-vercel-ip-longitude': '101.52',
      }),
    );
    expect(geo.country).toBe('MY');
    expect(geo.region).toBe('10');
    expect(geo.city).toBe('Shah Alam');
    expect(geo.latitude).toBeCloseTo(3.07);
  });

  it('is null when Vercel sends a country but no region header', () => {
    const geo = resolveGeo(reqWith({ 'x-vercel-ip-country': 'MY' }));
    expect(geo.country).toBe('MY');
    expect(geo.region).toBeNull();
  });

  it('treats a whitespace-only region header as absent', () => {
    const geo = resolveGeo(
      reqWith({ 'x-vercel-ip-country': 'US', 'x-vercel-ip-country-region': '   ' }),
    );
    expect(geo.region).toBeNull();
  });

  it('upper-cases alpha region codes so one state never splits on case', () => {
    const geo = resolveGeo(
      reqWith({ 'x-vercel-ip-country': 'US', 'x-vercel-ip-country-region': 'ca' }),
    );
    expect(geo.region).toBe('CA');
  });

  it('drops a malformed or oversized region code to null (never a junk PK bucket)', () => {
    for (const bad of ['MY-10', 'toolongregioncode', 'a b', '<script>']) {
      const geo = resolveGeo(
        reqWith({ 'x-vercel-ip-country': 'MY', 'x-vercel-ip-country-region': bad }),
      );
      expect(geo.region).toBeNull();
    }
  });

  it('gives no region on the Cloudflare fallback', () => {
    const geo = resolveGeo(reqWith({ 'cf-ipcountry': 'MY' }));
    expect(geo.country).toBe('MY');
    expect(geo.region).toBeNull();
    expect(geo.city).toBeNull();
  });

  it('gives no region for a request with no geo headers (local dev)', () => {
    const geo = resolveGeo(reqWith({}));
    expect(geo.country).toBeNull();
    expect(geo.region).toBeNull();
  });
});
