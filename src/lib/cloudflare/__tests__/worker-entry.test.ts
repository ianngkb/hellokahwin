// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BUILD_HEADER,
  CRON_ROUTES,
  cronRequest,
  isCronEnabled,
  responseStamps,
  wantsNoindex,
} from '../worker-entry';

const root = path.resolve(__dirname, '../../../..');

describe('wantsNoindex', () => {
  it('stamps the read-only preview everywhere', () => {
    expect(wantsNoindex(new Request('https://hellokahwin.com/'), { HK_NOINDEX: '1' })).toBe(true);
  });

  it('stamps any workers.dev address, including the production Worker before the switch', () => {
    expect(
      wantsNoindex(new Request('https://hellokahwin.misty-glitter-43d0.workers.dev/'), {}),
    ).toBe(true);
  });

  it('leaves hellokahwin.com and its subdomains alone in production', () => {
    expect(wantsNoindex(new Request('https://hellokahwin.com/artikel'), {})).toBe(false);
    expect(wantsNoindex(new Request('https://cf-test.hellokahwin.com/'), {})).toBe(false);
  });
});

describe('responseStamps', () => {
  const req = (u: string) => new Request(u);

  it('stamps x-hk-build with the build SHA when the Worker has one', () => {
    expect(responseStamps(req('https://hellokahwin.com/'), { HK_BUILD_SHA: 'abc1234' })).toEqual({
      [BUILD_HEADER]: 'abc1234',
    });
  });

  it('adds noindex on workers.dev alongside the build stamp', () => {
    expect(
      responseStamps(req('https://hellokahwin.misty-glitter-43d0.workers.dev/'), {
        HK_BUILD_SHA: 'abc1234',
      }),
    ).toEqual({ 'x-robots-tag': 'noindex, nofollow', [BUILD_HEADER]: 'abc1234' });
  });

  it('leaves the response untouched when there is nothing to stamp', () => {
    expect(responseStamps(req('https://hellokahwin.com/'), {})).toBeNull();
  });
});

describe('scheduled jobs', () => {
  it('run only when HK_CRON_ENABLED is exactly 1', () => {
    expect(isCronEnabled({})).toBe(false);
    expect(isCronEnabled({ HK_CRON_ENABLED: '0' })).toBe(false);
    expect(isCronEnabled({ HK_CRON_ENABLED: 'true' })).toBe(false);
    expect(isCronEnabled({ HK_CRON_ENABLED: '1' })).toBe(true);
  });

  it('call the route the way Vercel Cron did: GET with the bearer secret', () => {
    const req = cronRequest('/api/cron/gsc-sync', {
      CRON_SECRET: 's3cret',
      NEXT_PUBLIC_SITE_URL: 'https://hellokahwin.com/',
    });
    expect(req.method).toBe('GET');
    expect(req.url).toBe('https://hellokahwin.com/api/cron/gsc-sync');
    expect(req.headers.get('authorization')).toBe('Bearer s3cret');
  });

  it('match vercel.json and the wrangler production trigger one for one', () => {
    const vercel = JSON.parse(readFileSync(path.join(root, 'vercel.json'), 'utf8')) as {
      crons: { path: string; schedule: string }[];
    };
    const fromVercel = Object.fromEntries(vercel.crons.map((c) => [c.schedule, c.path]));
    expect(CRON_ROUTES).toEqual(fromVercel);

    const wrangler = readFileSync(path.join(root, 'wrangler.jsonc'), 'utf8');
    const crons = /"triggers":\s*\{\s*"crons":\s*\[([^\]]*)\]/.exec(wrangler)?.[1] ?? '';
    const schedules = [...crons.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    expect(schedules.sort()).toEqual(Object.keys(CRON_ROUTES).sort());
  });
});

describe('wrangler.jsonc production environment', () => {
  const wrangler = readFileSync(path.join(root, 'wrangler.jsonc'), 'utf8');
  const prod = wrangler.slice(wrangler.indexOf('"production"'));

  it('is the `hellokahwin` Worker, with the preview renamed', () => {
    expect(wrangler).toMatch(/^\s*"name": "hellokahwin-preview",/m);
    expect(prod).toMatch(/"name": "hellokahwin",/);
  });

  it('carries no read-only or noindex switch and no HK_CRON_ENABLED var', () => {
    expect(prod).not.toMatch(/"HK_READ_ONLY"/);
    expect(prod).not.toMatch(/"HK_NOINDEX"/);
    expect(prod).not.toMatch(/"HK_CRON_ENABLED":/);
  });

  it('binds media-tools-twn as MEDIA and uses the production Hyperdrive, not the read-only one', () => {
    expect(prod).toMatch(/"binding": "MEDIA",\s*"service": "media-tools-twn"/);
    expect(prod).not.toContain('a7579bc5a9b64c4e8ab49dab9dc070c8');
    expect(prod).toMatch(/"binding": "HYPERDRIVE",\s*"id": "[0-9a-f]{32}"/);
  });

  it('attaches no routes yet: the domain moves at the switch', () => {
    expect(prod).not.toMatch(/"routes"\s*:/);
  });
});

describe('.github/workflows/cf-production.yml', () => {
  const wf = readFileSync(path.join(root, '.github/workflows/cf-production.yml'), 'utf8');

  it('deploys on every master push, one at a time, never cancelling a deploy', () => {
    expect(wf).toMatch(/on:\s*\n\s*push:\s*\n\s*branches: \[master\]/);
    expect(wf).toMatch(/cancel-in-progress: false/);
  });

  it('stamps the deployed version with the commit and verifies exactly that version answers', () => {
    expect(wf).toContain('--var HK_BUILD_SHA:${{ github.sha }}');
    expect(wf).toMatch(
      /node scripts\/cloudflare\/verify-deploy\.mjs --sha "\$\{\{ github\.sha \}\}"/,
    );
    expect(wf).toContain('WORKER_URL: https://hellokahwin.misty-glitter-43d0.workers.dev');
    // No status-only curl smoke left behind.
    expect(wf).not.toMatch(/curl /);
  });

  it('is inert until HK_CF_PROD_DEPLOY is on', () => {
    expect(wf).toMatch(/if: vars\.HK_CF_PROD_DEPLOY == 'on'/);
  });

  it('deploys only the production environment and builds with the Server Actions key', () => {
    const deploys = [...wf.matchAll(/wrangler deploy([^\n]*)/g)].map((m) => m[1]);
    expect(deploys.length).toBeGreaterThan(0);
    for (const d of deploys) expect(d).toContain('--env production');
    expect(wf).toContain(
      'NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: ${{ secrets.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY }}',
    );
    expect(wf).not.toMatch(/HK_READ_ONLY/);
  });
});
