import { describe, expect, it } from 'vitest';
import {
  gscPropertyFor,
  gscSitemapUrlFor,
  gscSubmitSuccessNotice,
  gscSubmitFailureNotice,
  gscSubmitSkippedNotice,
  submitSitemapToGsc,
  type GscSitemapResult,
} from '../gsc-sitemap';

/**
 * Guards the three things about telling Google that a reader cannot check by
 * looking, and that a passing deploy would not catch either.
 *
 * The middle one is the reason this file exists. `PUT .../sitemaps/{feedpath}`
 * answers 204 with an EMPTY BODY on success — the good outcome is
 * indistinguishable from nothing having happened, and "the API said 200" is
 * exactly the kind of claim that let the original cache bug survive review
 * (see `@/lib/cache/__tests__/edge-purge.test.ts`, same lesson one layer down).
 */

const ok: GscSitemapResult = {
  ok: true,
  siteUrl: 'https://hellokahwin.com/',
  sitemapUrl: 'https://hellokahwin.com/sitemap.xml',
  detail: "HTTP 204 (empty body — this is Google's success response)",
  skipped: false,
};

describe('gscPropertyFor', () => {
  const withEnv = (value: string | undefined, fn: () => void) => {
    const saved = process.env.GSC_SITE_URL;
    if (value === undefined) delete process.env.GSC_SITE_URL;
    else process.env.GSC_SITE_URL = value;
    try {
      fn();
    } finally {
      if (saved === undefined) delete process.env.GSC_SITE_URL;
      else process.env.GSC_SITE_URL = saved;
    }
  };

  it('keeps the trailing slash — a URL-prefix property without it is a 404', () => {
    withEnv(undefined, () => {
      expect(gscPropertyFor('https://hellokahwin.com')).toBe('https://hellokahwin.com/');
      expect(gscPropertyFor('https://hellokahwin.com/')).toBe('https://hellokahwin.com/');
    });
  });

  it('drops any path it is handed, because the property is the origin', () => {
    withEnv(undefined, () => {
      expect(gscPropertyFor('https://hellokahwin.com/artikel/x/y')).toBe('https://hellokahwin.com/');
    });
  });

  it('never invents an `sc-domain:` property — that is a different, separately verified one', () => {
    withEnv(undefined, () => {
      expect(gscPropertyFor('https://hellokahwin.com')).not.toContain('sc-domain');
    });
  });

  it('yields to GSC_SITE_URL for anyone pointing this at another property', () => {
    withEnv('sc-domain:example.com', () => {
      expect(gscPropertyFor('https://hellokahwin.com')).toBe('sc-domain:example.com');
    });
  });
});

describe('gscSitemapUrlFor', () => {
  it('puts the sitemap under the property, not under whatever origin was purged', () => {
    // The case this exists for: a run that revalidates a local server or a
    // preview deployment while the sitemap that matters is production's.
    // Deriving from the property makes that combination correct; deriving from
    // the purge target would submit `http://127.0.0.1:3199/sitemap.xml`, which
    // Google rejects because it is not under the property.
    expect(gscSitemapUrlFor('https://hellokahwin.com/')).toBe('https://hellokahwin.com/sitemap.xml');
  });

  it('is stable whether or not the property carries a trailing slash', () => {
    expect(gscSitemapUrlFor('https://hellokahwin.com')).toBe(
      gscSitemapUrlFor('https://hellokahwin.com/'),
    );
  });
});

describe('the operator notices', () => {
  // The one sentence that means "Google has been told". It must appear on
  // exactly one branch, for the same reason the edge purge's does.
  const SUCCESS_CLAIM = 'Google was asked to re-read the sitemap';

  it('claims Google was told only on success', () => {
    expect(gscSubmitSuccessNotice(ok)).toContain(SUCCESS_CLAIM);
  });

  it('refuses to let acceptance read as indexing', () => {
    const notice = gscSubmitSuccessNotice(ok);
    // A 204 is an ACCEPTANCE. Saying so in the same breath is what stops the
    // next reader reporting "Google has the article" off the back of this line.
    expect(notice).toContain('ACCEPTANCE');
    expect(notice).toContain('last_downloaded');
    expect(notice).toContain('48h');
  });

  it('never makes the success claim on failure, and carries Google reason verbatim', () => {
    const failures: GscSitemapResult[] = [
      { ...ok, ok: false, detail: 'HTTP 403 {"error":{"message":"User does not have permission"}}' },
      { ...ok, ok: false, detail: 'token exchange HTTP 400 {"error":"invalid_grant"}' },
      {
        ...ok,
        ok: false,
        skipped: true,
        detail:
          'neither GSC_SERVICE_ACCOUNT_JSON nor a readable GSC_CREDENTIALS_PATH is set, so Google was not told',
      },
      { ...ok, ok: false, detail: 'fetch failed' },
    ];
    for (const failure of failures) {
      const notice = gscSubmitFailureNotice(failure);
      expect(notice).not.toContain(SUCCESS_CLAIM);
      expect(notice).toContain('GOOGLE WAS NOT TOLD');
      // A 403 and a clock-skew invalid_grant need different responses, and only
      // the literal reason separates them.
      expect(notice).toContain(failure.detail);
      expect(notice).toContain(failure.sitemapUrl);
      // And it must say the article is fine, or an operator reads this as data loss.
      expect(notice).toContain('The article is published');
    }
  });

  it('says a skipped submission was a DECISION, not a failure', () => {
    const notice = gscSubmitSkippedNotice('https://hellokahwin.com/sitemap.xml');
    expect(notice).not.toContain(SUCCESS_CLAIM);
    expect(notice).not.toContain('GOOGLE WAS NOT TOLD');
    expect(notice).toContain('changed nothing the sitemap carries');
  });
});

describe('submitSitemapToGsc', () => {
  const withoutCredential = async (fn: () => Promise<void>) => {
    const savedJson = process.env.GSC_SERVICE_ACCOUNT_JSON;
    const savedPath = process.env.GSC_CREDENTIALS_PATH;
    delete process.env.GSC_SERVICE_ACCOUNT_JSON;
    delete process.env.GSC_CREDENTIALS_PATH;
    try {
      await fn();
    } finally {
      if (savedJson !== undefined) process.env.GSC_SERVICE_ACCOUNT_JSON = savedJson;
      if (savedPath !== undefined) process.env.GSC_CREDENTIALS_PATH = savedPath;
    }
  };

  it('reports a missing credential instead of throwing, so a publish is never lost to it', async () => {
    await withoutCredential(async () => {
      const result = await submitSitemapToGsc(
        'https://hellokahwin.com/',
        'https://hellokahwin.com/sitemap.xml',
      );
      expect(result.ok).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.detail).toContain('GSC_SERVICE_ACCOUNT_JSON');
    });
  });

  it('treats an unreadable GSC_CREDENTIALS_PATH as absent, not as a crash', async () => {
    const savedJson = process.env.GSC_SERVICE_ACCOUNT_JSON;
    const savedPath = process.env.GSC_CREDENTIALS_PATH;
    delete process.env.GSC_SERVICE_ACCOUNT_JSON;
    process.env.GSC_CREDENTIALS_PATH = '/no/such/service-account.json';
    try {
      const result = await submitSitemapToGsc(
        'https://hellokahwin.com/',
        'https://hellokahwin.com/sitemap.xml',
      );
      expect(result.ok).toBe(false);
      expect(result.skipped).toBe(true);
    } finally {
      if (savedJson !== undefined) process.env.GSC_SERVICE_ACCOUNT_JSON = savedJson;
      if (savedPath === undefined) delete process.env.GSC_CREDENTIALS_PATH;
      else process.env.GSC_CREDENTIALS_PATH = savedPath;
    }
  });

  it('reports a malformed credential rather than signing garbage', async () => {
    const savedJson = process.env.GSC_SERVICE_ACCOUNT_JSON;
    const savedPath = process.env.GSC_CREDENTIALS_PATH;
    delete process.env.GSC_CREDENTIALS_PATH;
    process.env.GSC_SERVICE_ACCOUNT_JSON = '{"client_email":"a@b.iam.gserviceaccount.com"}';
    try {
      const result = await submitSitemapToGsc(
        'https://hellokahwin.com/',
        'https://hellokahwin.com/sitemap.xml',
      );
      // No private_key: indistinguishable from no credential at all, and the
      // right answer is the same — degrade, do not throw.
      expect(result.ok).toBe(false);
      expect(result.skipped).toBe(true);
    } finally {
      if (savedJson === undefined) delete process.env.GSC_SERVICE_ACCOUNT_JSON;
      else process.env.GSC_SERVICE_ACCOUNT_JSON = savedJson;
      if (savedPath !== undefined) process.env.GSC_CREDENTIALS_PATH = savedPath;
    }
  });

  it('never puts the private key anywhere an operator could read it', async () => {
    const savedJson = process.env.GSC_SERVICE_ACCOUNT_JSON;
    const savedPath = process.env.GSC_CREDENTIALS_PATH;
    delete process.env.GSC_CREDENTIALS_PATH;
    // A syntactically valid PEM header with nonsense body — signing must fail,
    // and the failure message must not echo the material back.
    const secret = 'SUPER-SECRET-KEY-MATERIAL';
    process.env.GSC_SERVICE_ACCOUNT_JSON = JSON.stringify({
      client_email: 'a@b.iam.gserviceaccount.com',
      private_key: `-----BEGIN PRIVATE KEY-----\n${secret}\n-----END PRIVATE KEY-----\n`,
    });
    try {
      const result = await submitSitemapToGsc(
        'https://hellokahwin.com/',
        'https://hellokahwin.com/sitemap.xml',
      );
      expect(result.ok).toBe(false);
      expect(result.detail).not.toContain(secret);
      expect(gscSubmitFailureNotice(result)).not.toContain(secret);
    } finally {
      if (savedJson === undefined) delete process.env.GSC_SERVICE_ACCOUNT_JSON;
      else process.env.GSC_SERVICE_ACCOUNT_JSON = savedJson;
      if (savedPath !== undefined) process.env.GSC_CREDENTIALS_PATH = savedPath;
    }
  });
});
