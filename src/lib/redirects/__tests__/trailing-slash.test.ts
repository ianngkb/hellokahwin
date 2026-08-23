import { describe, it, expect } from 'vitest';
import { resolveTrailingSlash } from '../trailing-slash';

describe('resolveTrailingSlash', () => {
  it('leaves the bare root alone', () => {
    expect(resolveTrailingSlash('/')).toEqual({ kind: 'none' });
  });

  it('leaves an already-canonical path alone', () => {
    expect(resolveTrailingSlash('/artikel/idea-dan-nasihat')).toEqual({ kind: 'none' });
    expect(resolveTrailingSlash('/hantaran-kahwin')).toEqual({ kind: 'none' });
  });

  // The whole point: one hop, not two. A rewrite keeps the request internal so
  // the /[slug] route can issue the single 308 to the canonical article URL.
  it('REWRITES a legacy root permalink so the article redirect is the only hop', () => {
    expect(resolveTrailingSlash('/hantaran-kahwin/')).toEqual({
      kind: 'rewrite',
      path: '/hantaran-kahwin',
    });
    expect(resolveTrailingSlash('/dewan-kahwin/')).toEqual({
      kind: 'rewrite',
      path: '/dewan-kahwin',
    });
  });

  it('sends a slashed WP category archive straight to its destination in one hop', () => {
    expect(resolveTrailingSlash('/category/venue/')).toEqual({
      kind: 'redirect',
      path: '/artikel/venue',
      statusCode: 301,
    });
  });

  it('sends a slashed WP tag archive straight to its destination in one hop', () => {
    expect(resolveTrailingSlash('/tag/pelamin/')).toEqual({
      kind: 'redirect',
      path: '/artikel/tag/pelamin',
      statusCode: 301,
    });
  });

  it('308s a multi-segment path — no pattern applies and it is not a root permalink', () => {
    expect(resolveTrailingSlash('/artikel/idea-dan-nasihat/')).toEqual({
      kind: 'redirect',
      path: '/artikel/idea-dan-nasihat',
      statusCode: 308,
    });
    expect(resolveTrailingSlash('/artikel/idea-dan-nasihat/dewan-kahwin/')).toEqual({
      kind: 'redirect',
      path: '/artikel/idea-dan-nasihat/dewan-kahwin',
      statusCode: 308,
    });
  });

  it('collapses doubled slashes even without a trailing one', () => {
    expect(resolveTrailingSlash('//hantaran-kahwin')).toEqual({
      kind: 'rewrite',
      path: '/hantaran-kahwin',
    });
    expect(resolveTrailingSlash('//hantaran-kahwin//')).toEqual({
      kind: 'rewrite',
      path: '/hantaran-kahwin',
    });
  });

  // Uppercase and underscores are not WP permalink shape here; treating them as
  // one would rewrite paths that then 404 instead of canonicalising first.
  it('does not treat a non-slug-shaped single segment as a legacy permalink', () => {
    expect(resolveTrailingSlash('/Hantaran-Kahwin/')).toEqual({
      kind: 'redirect',
      path: '/Hantaran-Kahwin',
      statusCode: 308,
    });
    expect(resolveTrailingSlash('/hantaran_kahwin/')).toEqual({
      kind: 'redirect',
      path: '/hantaran_kahwin',
      statusCode: 308,
    });
  });

  it('handles a slashed WP pagination path through the pattern rules', () => {
    expect(resolveTrailingSlash('/category/venue/page/2/')).toEqual({
      kind: 'redirect',
      path: '/artikel/venue',
      statusCode: 301,
    });
  });

  it('routes slashed WP admin and feed paths in one hop', () => {
    expect(resolveTrailingSlash('/feed/')).toEqual({
      kind: 'redirect',
      path: '/',
      statusCode: 301,
    });
    expect(resolveTrailingSlash('/wp-admin/')).toEqual({
      kind: 'redirect',
      path: '/login',
      statusCode: 301,
    });
  });
});
