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

describe('resolveGeo — input hardening', () => {
  it('F11: keeps only real ISO alpha-2 countries, trimmed and upper-cased', () => {
    expect(resolveGeo(reqWith({ 'x-vercel-ip-country': 'xx' })).country).toBeNull();
    expect(resolveGeo(reqWith({ 'x-vercel-ip-country': 'T1' })).country).toBeNull();
    expect(resolveGeo(reqWith({ 'x-vercel-ip-country': ' my ' })).country).toBe('MY');
    expect(resolveGeo(reqWith({ 'cf-ipcountry': 'XX' })).country).toBeNull();
    expect(resolveGeo(reqWith({ 'cf-ipcountry': 'sg' })).country).toBe('SG');
  });

  it('F12: drops out-of-range or non-finite coordinates', () => {
    const ok = resolveGeo(
      reqWith({
        'x-vercel-ip-country': 'MY',
        'x-vercel-ip-latitude': '-90',
        'x-vercel-ip-longitude': '180',
      }),
    );
    expect(ok.latitude).toBe(-90);
    expect(ok.longitude).toBe(180);

    const bad = resolveGeo(
      reqWith({
        'x-vercel-ip-country': 'MY',
        'x-vercel-ip-latitude': '90.5',
        'x-vercel-ip-longitude': '-181',
      }),
    );
    expect(bad.latitude).toBeNull();
    expect(bad.longitude).toBeNull();

    const junk = resolveGeo(
      reqWith({
        'x-vercel-ip-country': 'MY',
        'x-vercel-ip-latitude': 'Infinity',
        'x-vercel-ip-longitude': 'abc',
      }),
    );
    expect(junk.latitude).toBeNull();
    expect(junk.longitude).toBeNull();
  });

  it('F13: strips control characters from the city and clips it to 100 chars', () => {
    const encodedCtl = encodeURIComponent(
      `Shah${String.fromCharCode(1)}Alam${String.fromCharCode(0x7f)}`,
    );
    expect(
      resolveGeo(reqWith({ 'x-vercel-ip-country': 'MY', 'x-vercel-ip-city': encodedCtl })).city,
    ).toBe('ShahAlam');

    const long = encodeURIComponent('K'.repeat(150));
    expect(
      resolveGeo(reqWith({ 'x-vercel-ip-country': 'MY', 'x-vercel-ip-city': long })).city,
    ).toHaveLength(100);
  });
});
