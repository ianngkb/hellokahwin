import { describe, expect, it } from 'vitest';
import { readOnlyPreviewVerdict } from '../read-only-preview';

describe('readOnlyPreviewVerdict', () => {
  it('does nothing when the switch is off (Vercel, next dev)', () => {
    expect(readOnlyPreviewVerdict(false, 'POST', '/admin/inspire')).toBeNull();
    expect(readOnlyPreviewVerdict(false, 'POST', '/api/v1/analytics/collect')).toBeNull();
  });

  it('lets public reads through', () => {
    for (const path of [
      '/',
      '/artikel',
      '/artikel/majlis/some-slug',
      '/api/v1/search',
      '/sitemap.xml',
    ]) {
      expect(readOnlyPreviewVerdict(true, 'GET', path)).toBeNull();
      expect(readOnlyPreviewVerdict(true, 'HEAD', path)).toBeNull();
    }
  });

  it('closes admin, login and upload surfaces even for GET', () => {
    for (const path of [
      '/admin',
      '/admin/inspire',
      '/login',
      '/login/sso',
      '/no-access',
      '/api/v1/inspire/upload',
    ]) {
      expect(readOnlyPreviewVerdict(true, 'GET', path)?.status).toBe(403);
    }
  });

  it('does not mistake a public path that merely starts with the same letters', () => {
    expect(readOnlyPreviewVerdict(true, 'GET', '/administrasi-majlis')).toBeNull();
    expect(readOnlyPreviewVerdict(true, 'GET', '/login-tips')).toBeNull();
  });

  it('swallows the page-view beacon with 204', () => {
    expect(readOnlyPreviewVerdict(true, 'POST', '/api/v1/analytics/collect')?.status).toBe(204);
  });

  it('refuses every other write, Server Actions included', () => {
    expect(readOnlyPreviewVerdict(true, 'POST', '/artikel/majlis/some-slug')?.status).toBe(403);
    expect(readOnlyPreviewVerdict(true, 'DELETE', '/api/v1/search')?.status).toBe(403);
  });

  it('keeps the CRON_SECRET-gated cache drop open', () => {
    expect(readOnlyPreviewVerdict(true, 'POST', '/api/cron/revalidate-content')).toBeNull();
  });
});
