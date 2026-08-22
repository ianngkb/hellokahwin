import { describe, it, expect } from 'vitest';
import sanitizeHtml from 'sanitize-html';
import { sanitizeOptions } from '../article-renderer';

const clean = (html: string) => sanitizeHtml(html, sanitizeOptions);

describe('article sanitizer — ordered list numbering', () => {
  // The regression: the editor offers 1/a/A/i/I numbering and `globals.css`
  // has the matching `.inspire-prose ol[type=…]` rules, but with no `ol` entry
  // in `allowedAttributes` sanitize-html stripped `type`, so every choice
  // silently reverted to 1, 2, 3 on the published article.
  it.each(['a', 'A', 'i', 'I', '1'])('keeps type="%s" on an ol', (type) => {
    expect(clean(`<ol type="${type}"><li>one</li></ol>`)).toContain(`type="${type}"`);
  });

  it('keeps an explicit start value', () => {
    expect(clean('<ol start="5"><li>five</li></ol>')).toContain('start="5"');
  });

  it('does not extend the same attributes to unordered lists', () => {
    expect(clean('<ul type="a"><li>one</li></ul>')).not.toContain('type=');
  });
});

describe('article sanitizer — image captions', () => {
  it('keeps the caption attributes the renderer reads', () => {
    const html = clean(
      '<img src="https://example.com/a.jpg" data-caption="Photo by X" data-caption-url="https://example.com" />',
    );
    expect(html).toContain('data-caption="Photo by X"');
    expect(html).toContain('data-caption-url="https://example.com"');
  });
});

describe('article sanitizer — still blocks what it always blocked', () => {
  it('drops script tags', () => {
    expect(clean('<p>hi</p><script>alert(1)</script>')).toBe('<p>hi</p>');
  });

  it('drops inline event handlers', () => {
    expect(clean('<p onclick="alert(1)">hi</p>')).toBe('<p>hi</p>');
  });

  it('drops javascript: hrefs', () => {
    expect(clean('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript:');
  });

  it('drops the src of iframes from hosts outside the allowlist', () => {
    // sanitize-html keeps the (now inert) element and removes the src.
    expect(clean('<iframe src="https://evil.example/x"></iframe>')).not.toContain('evil.example');
    expect(clean('<iframe src="https://www.youtube.com/embed/abc"></iframe>')).toContain(
      'youtube.com',
    );
  });
});
