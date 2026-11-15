/**
 * IA-3. The embed block stores and renders iframes for the hosts in
 * `ALLOWED_EMBED_HOSTS`, but the BROWSER only loads a frame its CSP
 * `frame-src` allows. If the two drift apart, every embed renders as a blocked
 * frame in the editor and on public pages, with nothing but a console error.
 */
import { describe, it, expect } from 'vitest';
import nextConfig from '../../../../next.config';
import { ALLOWED_EMBED_HOSTS, toEmbedSrc } from '../iframe-embed';

async function frameSrc(): Promise<string[]> {
  const rules = await nextConfig.headers!();
  const csp = rules
    .flatMap((r) => r.headers)
    .find((h) => h.key === 'Content-Security-Policy')?.value;
  expect(csp).toBeTruthy();
  const directive = csp!
    .split(';')
    .map((d) => d.trim())
    .find((d) => d.startsWith('frame-src '));
  expect(directive).toBeTruthy();
  return directive!.split(/\s+/).slice(1);
}

describe('CSP frame-src covers the embed block (IA-3)', () => {
  it('allows every host the embed node may store and render', async () => {
    const allowed = await frameSrc();
    for (const host of ALLOWED_EMBED_HOSTS) {
      expect(allowed, `frame-src is missing https://${host}`).toContain(`https://${host}`);
    }
  });

  it('allows the origin of every URL the paste translator emits', async () => {
    const allowed = await frameSrc();
    const emitted = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://vimeo.com/76979871',
      'https://player.vimeo.com/video/76979871',
      'https://www.instagram.com/p/C1a2B3c4D5e/',
      'https://instagram.com/reel/C1a2B3c4D5e/',
    ].map((u) => toEmbedSrc(u));
    for (const src of emitted) {
      expect(src).toBeTruthy();
      expect(allowed).toContain(new URL(src!).origin);
    }
  });

  it('adds embed hosts to framing only — not a wildcard', async () => {
    const allowed = await frameSrc();
    expect(allowed.some((s) => s === '*' || s === 'https:' || s.includes('*.youtube'))).toBe(false);
  });
});
