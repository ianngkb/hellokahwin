import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  pathsInvalidatedByIngest,
  edgePurgeSuccessNotice,
  edgePurgeFailureNotice,
  purgeVercelEdge,
  rateLimitWaitMs,
  type EdgePurgeResult,
} from '../edge-purge';

/**
 * Guards the two things about the edge purge that a reader cannot check by
 * looking: that it stays NARROW, and that a failed purge never reads like a
 * successful one.
 *
 * The second is not a hypothetical. The CLI printed "Content caches dropped —
 * the article is visible on the site now" while the revalidate route did
 * nothing, and that sentence is the reason the original bug survived review.
 * The sentence now lives in exactly one function, and this test is what keeps
 * it there.
 */

const ok: EdgePurgeResult = {
  ok: true,
  paths: pathsInvalidatedByIngest('pelamin-kad-cenderahati', 'bunga-telur'),
  detail: 'HTTP 200',
  skipped: false,
};

describe('pathsInvalidatedByIngest', () => {
  it('names the article, its pillar and the sitemap, and nothing else', () => {
    expect(pathsInvalidatedByIngest('ucapan-doa', 'doa-majlis')).toEqual([
      '/artikel/ucapan-doa/doa-majlis',
      '/artikel/ucapan-doa',
      '/sitemap.xml',
    ]);
  });

  it('never produces a wildcard, which would purge the whole project', () => {
    for (const path of pathsInvalidatedByIngest('a', 'b')) {
      expect(path).not.toContain('*');
      expect(path.startsWith('/')).toBe(true);
    }
  });

  it('never produces a tag containing a comma, which Vercel reads as two tags', () => {
    for (const path of pathsInvalidatedByIngest('a-b', 'c-d')) {
      expect(path).not.toContain(',');
    }
  });
});

describe('the operator notices', () => {
  const SUCCESS_CLAIM = 'the article is visible on the';

  it('claims the caches are clear only on success', () => {
    expect(edgePurgeSuccessNotice(ok)).toContain(SUCCESS_CLAIM);
  });

  it('never makes that claim on failure', () => {
    const failures: EdgePurgeResult[] = [
      { ...ok, ok: false, detail: 'HTTP 403 Forbidden' },
      {
        ...ok,
        ok: false,
        skipped: true,
        detail: 'VERCEL_TOKEN is not set, so no purge was attempted',
      },
      { ...ok, ok: false, detail: 'fetch failed' },
    ];
    for (const failure of failures) {
      const notice = edgePurgeFailureNotice(failure);
      expect(notice).not.toContain(SUCCESS_CLAIM);
      expect(notice).toContain('THE VERCEL EDGE WAS NOT PURGED');
      // The reason, verbatim: a 403 and a DNS failure need different responses.
      expect(notice).toContain(failure.detail);
      // The URLs an operator must not invite a crawl of, in full.
      expect(notice).toContain('https://hellokahwin.com/artikel/pelamin-kad-cenderahati');
      expect(notice).toContain('https://hellokahwin.com/sitemap.xml');
      // And the window, so "how long" needs no second question.
      expect(notice).toContain('5 minutes');
      expect(notice).toContain('an hour');
    }
  });
});

describe('purgeVercelEdge', () => {
  it('reports a missing token instead of throwing, so a publish is never lost to it', async () => {
    const saved = process.env.VERCEL_TOKEN;
    delete process.env.VERCEL_TOKEN;
    try {
      const result = await purgeVercelEdge(['/artikel/x']);
      expect(result.ok).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.detail).toContain('VERCEL_TOKEN');
    } finally {
      if (saved !== undefined) process.env.VERCEL_TOKEN = saved;
    }
  });

  /**
   * The batch and rate-limit guards, both added 26 Aug 2026 after SEO-02 asked
   * for 58 paths in one call and purged NOTHING.
   *
   * The ingest path never met either ceiling because it sends exactly three
   * paths. A limit that only bites above the batch size anyone has used yet is
   * not a limit anyone has tested.
   */
  describe('batching and rate limits', () => {
    const withToken = async (fn: () => Promise<void>) => {
      const saved = process.env.VERCEL_TOKEN;
      const savedFetch = globalThis.fetch;
      process.env.VERCEL_TOKEN = 'test-token';
      try {
        await fn();
      } finally {
        globalThis.fetch = savedFetch;
        if (saved === undefined) delete process.env.VERCEL_TOKEN;
        else process.env.VERCEL_TOKEN = saved;
      }
    };

    it('never sends more than 16 tags in one request', async () => {
      await withToken(async () => {
        const sent: string[][] = [];
        globalThis.fetch = (async (_url: string, init: { body: string }) => {
          sent.push(JSON.parse(init.body).tags);
          return { ok: true, status: 200, text: async () => '' };
        }) as unknown as typeof fetch;

        const paths = Array.from({ length: 58 }, (_, i) => `/artikel/c/a${i}`);
        const result = await purgeVercelEdge(paths);

        expect(result.ok).toBe(true);
        expect(sent).toHaveLength(4);
        for (const batch of sent) expect(batch.length).toBeLessThanOrEqual(16);
        expect(sent.flat()).toEqual(paths);
      });
    }, 120_000);

    it('does not retry a 400 — retrying it only spends the rate-limit budget', async () => {
      await withToken(async () => {
        let calls = 0;
        globalThis.fetch = (async () => {
          calls++;
          return { ok: false, status: 400, text: async () => '{"error":{"code":"bad_request"}}' };
        }) as unknown as typeof fetch;

        const result = await purgeVercelEdge(['/artikel/c/a']);
        expect(result.ok).toBe(false);
        expect(calls).toBe(1);
      });
    });

    it('reports the FULL path list on failure, not just the failing batch', async () => {
      await withToken(async () => {
        globalThis.fetch = (async () => ({
          ok: false,
          status: 403,
          text: async () => 'forbidden',
        })) as unknown as typeof fetch;

        const paths = Array.from({ length: 20 }, (_, i) => `/artikel/c/a${i}`);
        const result = await purgeVercelEdge(paths);
        expect(result.ok).toBe(false);
        expect(result.paths).toEqual(paths);
      });
    });
  });
});

describe('rateLimitWaitMs', () => {
  const body = (reset: number) =>
    JSON.stringify({ error: { code: 'rate_limited', limit: { total: 5, remaining: 0, reset } } });

  it("waits to Vercel's own reset instant, in milliseconds", () => {
    const now = 1_787_681_000_000;
    expect(rateLimitWaitMs(body(now + 30_000), now)).toBe(31_000);
  });

  it('reads a ten-digit reset as seconds rather than computing a wait in 1970', () => {
    const now = 1_787_681_000_000;
    expect(rateLimitWaitMs(body(1_787_681_030), now)).toBe(31_000);
  });

  it('falls back to a full window on any other shape — guessing short re-arms the limit', () => {
    expect(rateLimitWaitMs('not json')).toBe(61_000);
    expect(rateLimitWaitMs('{}')).toBe(61_000);
    expect(rateLimitWaitMs(body(1_000), 2_000_000_000_000)).toBe(61_000);
  });
});

describe('the ingest call site', () => {
  // Comments stripped: the script explains the old defect by QUOTING the
  // sentence, and a prose mention of it is the opposite of a regression.
  const source = readFileSync(
    join(__dirname, '..', '..', '..', '..', 'scripts', 'ingest-article.mts'),
    'utf8',
  )
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('does not print the success sentence anywhere of its own', () => {
    // If this fails, someone has re-inlined the claim next to the origin
    // revalidate — which is where it was when it was wrong.
    expect(source).not.toContain('the article is visible on the site now');
  });

  it('uses the delete form, not the invalidate form', () => {
    // `invalidate` marks entries stale and serves the stale copy on the next
    // request, which is the bug this whole path exists to remove.
    const purgeSource = readFileSync(join(__dirname, '..', 'edge-purge.ts'), 'utf8');
    expect(purgeSource).toContain('dangerously-delete-by-tags');
    expect(purgeSource).not.toContain(
      "ENDPOINT = 'https://api.vercel.com/v1/edge-cache/invalidate",
    );
  });
});
