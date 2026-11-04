import { describe, it, expect, vi } from 'vitest';
import robots from '../robots';

// robots.txt is the one file that decides what search engines may index. If
// it lost a line, unpublished drafts (/draft/ share links) and the admin
// screens could be crawled and listed ahead of the real articles.
describe('robots.txt', () => {
  // Pinned so the result does not depend on the machine's .env.
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://hellokahwin.com');
  const result = robots();
  vi.unstubAllEnvs();
  const rules = Array.isArray(result.rules) ? result.rules : [result.rules];

  it('has a rule for every crawler and a named one for Googlebot', () => {
    const agents = rules.map((r) => r.userAgent);
    expect(agents).toContain('*');
    expect(agents).toContain('Googlebot');
  });

  it.each(['/admin/', '/draft/', '/login', '/no-access', '/sso-callback'])(
    'keeps %s out of every rule',
    (path) => {
      for (const rule of rules) {
        const disallow = Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow];
        expect(disallow).toContain(path);
      }
    },
  );

  it('allows the public site', () => {
    for (const rule of rules) expect(rule.allow).toBe('/');
  });

  it('advertises only the sitemap that exists', () => {
    expect(result.sitemap).toEqual(['https://hellokahwin.com/sitemap.xml']);
  });
});
