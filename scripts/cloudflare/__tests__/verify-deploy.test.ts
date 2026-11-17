// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
// @ts-expect-error -- plain .mjs script, no type declarations
import { probe, verifyDeploy } from '../verify-deploy.mjs';

const SHA = 'd6e9ae3380f4f98d2c750dfe8e42ca4bafcab2d9';
const reply = (status: number, build?: string, extra: Record<string, string> = {}) =>
  new Response('x', { status, headers: { ...(build ? { 'x-hk-build': build } : {}), ...extra } });
const fixed = (r: () => Response) => vi.fn(async () => r());

describe('verify-deploy probe', () => {
  it('passes only on exactly 200 with x-hk-build equal to the SHA', async () => {
    expect(
      await probe(
        'https://w/',
        SHA,
        fixed(() => reply(200, SHA)),
      ),
    ).toBeNull();
  });

  it('fails a response with no build header (Vercel, or anything that is not this Worker)', async () => {
    const r = await probe(
      'https://w/',
      SHA,
      fixed(() => reply(200, undefined, { 'x-vercel-id': 'sin1::x' })),
    );
    expect(r).toMatch(/x-hk-build=\(missing\)/);
  });

  it('fails an older Worker version', async () => {
    expect(
      await probe(
        'https://w/',
        SHA,
        fixed(() => reply(200, 'a738307')),
      ),
    ).toMatch(/want d6e9ae33/);
  });

  it('never follows a redirect and fails any 3xx, even one stamped with the SHA', async () => {
    const f = fixed(() => reply(308, SHA, { location: 'https://elsewhere/' }));
    expect(await probe('https://w/', SHA, f)).toMatch(/HTTP 308/);
    expect((f.mock.calls[0] as unknown[])[1]).toMatchObject({ redirect: 'manual' });
  });

  it('fails a 500 and a network error', async () => {
    expect(
      await probe(
        'https://w/',
        SHA,
        fixed(() => reply(500, SHA)),
      ),
    ).toMatch(/HTTP 500/);
    const boom = vi.fn(async () => {
      throw new Error('ECONNRESET');
    });
    expect(await probe('https://w/', SHA, boom)).toMatch(/request failed/);
  });
});

describe('verifyDeploy', () => {
  it('retries while the new version propagates, then passes', async () => {
    let n = 0;
    const f = vi.fn(async () => (n++ < 2 ? reply(200, 'old') : reply(200, SHA)));
    const sleep = vi.fn(async () => {});
    expect(await verifyDeploy({ sha: SHA, urls: ['https://w/'], attempts: 4 }, f, sleep)).toEqual(
      [],
    );
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('reports every URL still mismatched after the last attempt', async () => {
    const f = vi.fn(async (url: string) =>
      url.endsWith('/a') ? reply(200, SHA) : reply(200, 'old'),
    );
    const failures = await verifyDeploy(
      { sha: SHA, urls: ['https://w/a', 'https://w/b'], attempts: 2 },
      f,
      async () => {},
    );
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatch(/^https:\/\/w\/b:/);
  });

  it('refuses a missing SHA or an empty URL list', async () => {
    await expect(verifyDeploy({ sha: '', urls: ['https://w/'] })).rejects.toThrow(/git SHA/);
    await expect(verifyDeploy({ sha: SHA, urls: [] })).rejects.toThrow(/at least one URL/);
  });
});
