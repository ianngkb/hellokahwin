import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  pathsInvalidatedByIngest,
  edgePurgeSuccessNotice,
  edgePurgeFailureNotice,
  purgeVercelEdge,
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
