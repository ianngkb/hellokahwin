import { describe, expect, it } from 'vitest';
import { resolvePreviewBadge } from '../banner';

/**
 * PLAT-08. The banner is the only thing on a page that says "you are looking at
 * a preview, of this branch, at this commit", so the rule it encodes is the part
 * worth testing. Everything a preview shows is real production content read
 * through a read-only database role — which is exactly why a reviewer must never
 * be able to mistake one for the live site.
 */
describe('resolvePreviewBadge', () => {
  it('returns null in production', () => {
    expect(
      resolvePreviewBadge({
        VERCEL_ENV: 'production',
        VERCEL_GIT_COMMIT_REF: 'master',
        VERCEL_GIT_COMMIT_SHA: '0123456789abcdef',
      }),
    ).toBeNull();
  });

  it('returns null in local development, where there is no Vercel env at all', () => {
    expect(resolvePreviewBadge({})).toBeNull();
  });

  it('returns null for any env that is not exactly "preview"', () => {
    // Guards against a truthiness check (`if (env.VERCEL_ENV)`) creeping in —
    // that would paint the banner across hellokahwin.com too.
    for (const v of ['Preview', 'PREVIEW', 'development', '', '1']) {
      expect(resolvePreviewBadge({ VERCEL_ENV: v })).toBeNull();
    }
  });

  it('renders branch and short sha on a preview deployment', () => {
    expect(
      resolvePreviewBadge({
        VERCEL_ENV: 'preview',
        VERCEL_GIT_COMMIT_REF: 'ianng89/hk-plat08-preview',
        VERCEL_GIT_COMMIT_SHA: '0123456789abcdef0123456789abcdef01234567',
      }),
    ).toEqual({
      label: 'PREVIEW DEPLOYMENT',
      branch: 'ianng89/hk-plat08-preview',
      sha: '0123456',
    });
  });

  it('still renders when git metadata is missing — a preview URL with no branch is still a preview', () => {
    expect(resolvePreviewBadge({ VERCEL_ENV: 'preview' })).toEqual({
      label: 'PREVIEW DEPLOYMENT',
      branch: 'unknown branch',
      sha: 'unknown',
    });
  });
});
