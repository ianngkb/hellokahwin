import { describe, expect, it } from 'vitest';
import {
  applyLinkRelPolicy,
  buildLinkAttrs,
  dialogNofollow,
  normaliseLinkInput,
  hasNofollow,
  isInternalHref,
} from '@/lib/tiptap/link-rel';

describe('buildLinkAttrs', () => {
  it('keeps the old default: new tab links are nofollow', () => {
    expect(buildLinkAttrs('https://a.com', { openInNewTab: true, nofollow: true })).toEqual({
      href: 'https://a.com',
      target: '_blank',
      rel: 'noopener noreferrer nofollow',
    });
  });

  it('lets a paid new tab link stay dofollow', () => {
    expect(buildLinkAttrs('https://a.com', { openInNewTab: true, nofollow: false })).toEqual({
      href: 'https://a.com',
      target: '_blank',
      rel: 'noopener noreferrer',
    });
  });

  it('saves no rel for a same tab followed link', () => {
    expect(buildLinkAttrs('https://a.com', { openInNewTab: false, nofollow: false })).toEqual({
      href: 'https://a.com',
      target: null,
      rel: null,
    });
  });

  it('can nofollow a same tab link', () => {
    expect(buildLinkAttrs('https://a.com', { openInNewTab: false, nofollow: true }).rel).toBe(
      'nofollow',
    );
  });
});

describe('hasNofollow', () => {
  it('reads nofollow from any position in rel', () => {
    expect(hasNofollow('noopener noreferrer nofollow')).toBe(true);
    expect(hasNofollow('nofollow noopener')).toBe(true);
  });

  it('is false for followed or missing rel', () => {
    expect(hasNofollow('noopener noreferrer')).toBe(false);
    expect(hasNofollow(null)).toBe(false);
    expect(hasNofollow(undefined)).toBe(false);
  });
});

describe('internal links are followed by destination', () => {
  it('buildLinkAttrs: an internal link defaults to followed + same tab', () => {
    expect(buildLinkAttrs('/artikel/x/y', { openInNewTab: false, nofollow: false })).toEqual({
      href: '/artikel/x/y',
      target: null,
      rel: null,
    });
  });

  it("buildLinkAttrs keeps an editor's explicit override on an internal link", () => {
    expect(
      buildLinkAttrs('https://hellokahwin.com/x', { openInNewTab: true, nofollow: true }),
    ).toEqual({
      href: 'https://hellokahwin.com/x',
      target: '_blank',
      rel: 'noopener noreferrer nofollow',
    });
  });

  it('isInternalHref recognises our hosts, not look-alikes', () => {
    expect(isInternalHref('/x')).toBe(true);
    expect(isInternalHref('//hellokahwin.com/x')).toBe(true);
    expect(isInternalHref('https://images.hellokahwin.com/a.jpg')).toBe(true);
    expect(isInternalHref('https://evil-hellokahwin.com/x')).toBe(false);
    expect(isInternalHref('https://hellokahwin.com.evil.io/x')).toBe(false);
    expect(isInternalHref('https://example.com')).toBe(false);
    expect(isInternalHref('mailto:a@b.com')).toBe(false);
  });

  it('applyLinkRelPolicy: external with nothing set → new tab, followed', () => {
    expect(applyLinkRelPolicy({ href: 'https://a.com', target: null, rel: null })).toEqual({
      href: 'https://a.com',
      target: '_blank',
      rel: 'noopener noreferrer',
    });
  });

  it('applyLinkRelPolicy keeps an explicit external rel (paid dofollow or nofollow)', () => {
    const paid = { href: 'https://a.com', target: '_blank', rel: 'noopener noreferrer' };
    expect(applyLinkRelPolicy(paid)).toBe(paid);
    const nf = { href: 'https://a.com', target: null, rel: 'nofollow' };
    expect(applyLinkRelPolicy(nf)).toBe(nf);
  });

  it('applyLinkRelPolicy never adds anything to an internal link', () => {
    const l = { href: '/x', target: null, rel: null };
    expect(applyLinkRelPolicy(l)).toBe(l);
  });
});

describe('review fixes: dialogs and policy', () => {
  it('a new-tab external link always gains noopener noreferrer', () => {
    expect(applyLinkRelPolicy({ href: 'https://a.com', target: '_blank', rel: null }).rel).toBe(
      'noopener noreferrer',
    );
    expect(
      applyLinkRelPolicy({ href: 'https://a.com', target: '_blank', rel: 'nofollow' }).rel,
    ).toBe('noopener noreferrer nofollow');
  });

  it('normaliseLinkInput keeps bare paths internal', () => {
    expect(normaliseLinkInput('artikel/x/y')).toBe('/artikel/x/y');
    expect(normaliseLinkInput('/artikel')).toBe('/artikel');
    expect(normaliseLinkInput('example.com/x')).toBe('https://example.com/x');
    expect(normaliseLinkInput('//hellokahwin.com/x')).toBe('https://hellokahwin.com/x');
  });

  it('dialogNofollow decides the default from the FINAL href at save time', () => {
    // new tab ticked before an internal URL was typed: followed
    expect(
      dialogNofollow({ href: '/x', openInNewTab: true, nofollow: true, explicit: false }),
    ).toBe(false);
    expect(
      dialogNofollow({
        href: 'https://a.com',
        openInNewTab: true,
        nofollow: false,
        explicit: false,
      }),
    ).toBe(true);
    // explicit choices persist, internal included
    expect(dialogNofollow({ href: '/x', openInNewTab: true, nofollow: true, explicit: true })).toBe(
      true,
    );
    expect(
      dialogNofollow({
        href: 'https://a.com',
        openInNewTab: true,
        nofollow: false,
        explicit: true,
      }),
    ).toBe(false);
  });
});
