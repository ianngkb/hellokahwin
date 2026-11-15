import { describe, it, expect } from 'vitest';
import { linkClickProps, MAX_HREF_CHARS } from '../link-click-tracking';

const here = {
  origin: 'https://hellokahwin.com',
  pathname: '/artikel/persiapan/hantaran',
  search: '',
};

describe('linkClickProps', () => {
  it('records a same-site article link as a path, typed internal_article', () => {
    expect(linkClickProps('https://hellokahwin.com/artikel/adat/merisik?utm=x', here)).toEqual({
      href: '/artikel/adat/merisik?utm=x',
      link_type: 'internal_article',
    });
  });

  it('records other same-site links as internal', () => {
    expect(linkClickProps('https://hellokahwin.com/cari?q=baju', here)).toEqual({
      href: '/cari?q=baju',
      link_type: 'internal',
    });
  });

  it('records an outbound link without its query string (it can carry tokens)', () => {
    expect(linkClickProps('https://shop.example.com/item/1?ref=abc&token=secret', here)).toEqual({
      href: 'https://shop.example.com/item/1',
      link_type: 'external',
    });
  });

  it('ignores in-page jumps, mailto/tel/javascript, and junk', () => {
    expect(linkClickProps('https://hellokahwin.com/artikel/persiapan/hantaran#faq', here)).toBe(
      null,
    );
    expect(linkClickProps('mailto:hi@hellokahwin.com', here)).toBe(null);
    expect(linkClickProps('tel:+60123', here)).toBe(null);
    expect(linkClickProps('javascript:void(0)', here)).toBe(null);
    expect(linkClickProps('', here)).toBe(null);
  });

  it('a hash link to ANOTHER page still counts', () => {
    expect(linkClickProps('https://hellokahwin.com/artikel/adat/merisik#faq', here)?.href).toBe(
      '/artikel/adat/merisik',
    );
  });

  it('caps the stored href', () => {
    const long = `https://hellokahwin.com/artikel/a/${'x'.repeat(2000)}`;
    expect(linkClickProps(long, here)!.href.length).toBe(MAX_HREF_CHARS);
  });
});
