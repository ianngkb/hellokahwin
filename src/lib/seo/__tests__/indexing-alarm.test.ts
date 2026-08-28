import { describe, expect, it } from 'vitest';
import {
  alarmIssueBody,
  alarmIssueTitle,
  assessSweep,
  assessUrl,
  effectiveFirstSeen,
  isUncrawled,
  isUnknownToGoogle,
  isNoindexedInSitemap,
  nextLedger,
  GRACE_HOURS,
  type Ledger,
  type SitemapEntry,
} from '../indexing-alarm';
import type { UrlInspectionResult } from '../gsc-url-inspection';

/**
 * Guards the judgement the indexing monitor makes, which is the half of the
 * item that cannot be checked by looking at a green cron run.
 *
 * The shapes below are LITERAL captures from the live URL Inspection API on
 * 27 Aug 2026 against `https://hellokahwin.com/` — an indexed article, and a
 * fabricated path. They are not invented. If Google changes the response shape
 * these stop matching reality, and that is the point: the structural test in
 * `isUnknownToGoogle` exists precisely because the prose in `coverageState`
 * carries no guarantee.
 */

const NOW = new Date('2026-08-27T12:00:00.000Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

/** Literal capture: an indexed article. */
const INDEXED: UrlInspectionResult = {
  url: 'https://hellokahwin.com/artikel/ucapan-doa/walimatul-urus',
  ok: true,
  coverageState: 'Submitted and indexed',
  verdict: 'PASS',
  indexingState: 'INDEXING_ALLOWED',
  robotsTxtState: 'ALLOWED',
  pageFetchState: 'SUCCESSFUL',
  lastCrawlTime: '2026-08-26T06:14:46Z',
  googleCanonical: 'https://hellokahwin.com/artikel/ucapan-doa/walimatul-urus',
  userCanonical: 'https://hellokahwin.com/artikel/ucapan-doa/walimatul-urus',
  sitemaps: ['https://hellokahwin.com/sitemap.xml'],
  inspectionResultLink: 'https://search.google.com/search-console/inspect?resource_id=x',
  detail: 'HTTP 200',
};

/** Literal capture: a fabricated path Google has no record of. */
const UNKNOWN: UrlInspectionResult = {
  url: 'https://hellokahwin.com/artikel/does-not-exist/probe',
  ok: true,
  coverageState: 'URL is unknown to Google',
  verdict: 'NEUTRAL',
  indexingState: 'INDEXING_STATE_UNSPECIFIED',
  robotsTxtState: 'ROBOTS_TXT_STATE_UNSPECIFIED',
  pageFetchState: 'PAGE_FETCH_STATE_UNSPECIFIED',
  lastCrawlTime: null,
  googleCanonical: null,
  userCanonical: null,
  sitemaps: [],
  inspectionResultLink: 'https://search.google.com/search-console/inspect?resource_id=y',
  detail: 'HTTP 200',
};

/** Known to Google, never fetched. The shape a dark article usually has. */
const DISCOVERED: UrlInspectionResult = {
  ...INDEXED,
  url: 'https://hellokahwin.com/artikel/x/discovered',
  coverageState: 'Discovered - currently not indexed',
  verdict: 'NEUTRAL',
  lastCrawlTime: null,
};

/**
 * Literal capture, 28 Aug 2026: `/artikel/minimalis-mewah`, one of the six hubs
 * RISK-07 is named after. The sitemap advertises this URL and Google has
 * excluded it. Note `indexingState` — a structural signal that carries no
 * prose, which is why the predicate below does not depend on `coverageState`
 * alone.
 */
const NOINDEXED: UrlInspectionResult = {
  ...INDEXED,
  url: 'https://hellokahwin.com/artikel/minimalis-mewah',
  coverageState: 'Excluded by ‘noindex’ tag',
  verdict: 'NEUTRAL',
  indexingState: 'BLOCKED_BY_META_TAG',
  robotsTxtState: 'ALLOWED',
  pageFetchState: 'SUCCESSFUL',
  lastCrawlTime: '2026-08-23T04:39:38Z',
};

describe('isUnknownToGoogle', () => {
  it('recognises the English prose Google actually returns', () => {
    expect(isUnknownToGoogle(UNKNOWN)).toBe(true);
    expect(isUnknownToGoogle(INDEXED)).toBe(false);
  });

  it('still recognises it when the prose is not English', () => {
    // The reason this branch exists: `coverageState` is localised. If a future
    // change drops `languageCode: 'en-US'`, or Google copy-edits the sentence,
    // the substring test goes quiet and the monitor reports a clean sweep
    // forever. The structural signature carries no prose.
    expect(isUnknownToGoogle({ ...UNKNOWN, coverageState: 'URL tidak diketahui Google' })).toBe(
      true,
    );
    expect(isUnknownToGoogle({ ...UNKNOWN, coverageState: null })).toBe(true);
  });

  it('does not mistake "discovered but not indexed" for "never heard of it"', () => {
    // Both are dark and both alarm — but through different reasons, and the
    // issue text says which. Conflating them would send an operator to
    // "Request indexing" for a URL Google already has queued.
    expect(isUnknownToGoogle(DISCOVERED)).toBe(false);
    expect(isUncrawled(DISCOVERED)).toBe(true);
  });
});

describe('isUncrawled', () => {
  it('is exactly the absence of a lastCrawlTime', () => {
    expect(isUncrawled(INDEXED)).toBe(false);
    expect(isUncrawled(UNKNOWN)).toBe(true);
    expect(isUncrawled({ lastCrawlTime: null })).toBe(true);
  });
});

describe('effectiveFirstSeen', () => {
  it('prefers whichever of ledger and lastmod is EARLIER', () => {
    expect(effectiveFirstSeen(hoursAgo(10), hoursAgo(200), NOW)).toBe(hoursAgo(200));
    expect(effectiveFirstSeen(hoursAgo(200), hoursAgo(10), NOW)).toBe(hoursAgo(200));
  });

  it('falls back to now when it has neither, so a brand-new URL gets its full window', () => {
    expect(effectiveFirstSeen(null, null, NOW)).toBe(NOW.toISOString());
    expect(effectiveFirstSeen(undefined, 'not-a-date', NOW)).toBe(NOW.toISOString());
  });

  it('refuses a lastmod in the future, which would buy an infinite grace window', () => {
    const future = new Date(NOW.getTime() + 90 * 3_600_000).toISOString();
    expect(effectiveFirstSeen(null, future, NOW)).toBe(NOW.toISOString());
    expect(effectiveFirstSeen(hoursAgo(100), future, NOW)).toBe(hoursAgo(100));
  });
});

describe('assessUrl — the DoD, condition by condition', () => {
  const entry = (lastmod: string | null): SitemapEntry => ({ url: UNKNOWN.url, lastmod });

  it('alarms on unknown-to-Google past the window', () => {
    const a = assessUrl(entry(hoursAgo(GRACE_HOURS + 1)), UNKNOWN, undefined, NOW);
    expect(a.alarming).toBe(true);
    expect(a.reasons).toContain('unknown-to-google');
    expect(a.reasons).toContain('never-crawled');
  });

  it('alarms on uncrawled past the window even when Google knows the URL', () => {
    const a = assessUrl(
      { url: DISCOVERED.url, lastmod: hoursAgo(GRACE_HOURS + 1) },
      DISCOVERED,
      undefined,
      NOW,
    );
    expect(a.alarming).toBe(true);
    expect(a.reasons).toEqual(['never-crawled']);
  });

  it('does NOT alarm inside the window — it watches', () => {
    // A four-minute-old article is legitimately unknown to Google. Alarming on
    // it would leave the monitor permanently red, and a permanently red alarm
    // is an alarm nobody reads.
    const a = assessUrl(entry(hoursAgo(1)), UNKNOWN, undefined, NOW);
    expect(a.alarming).toBe(false);
    expect(a.watching).toBe(true);
    expect(a.reasons.length).toBeGreaterThan(0);
  });

  it('treats exactly 72h as still inside the window — "more than 72h" is strict', () => {
    expect(assessUrl(entry(hoursAgo(GRACE_HOURS)), UNKNOWN, undefined, NOW).alarming).toBe(false);
    expect(assessUrl(entry(hoursAgo(GRACE_HOURS + 1)), UNKNOWN, undefined, NOW).alarming).toBe(
      true,
    );
  });

  it('never alarms on a healthy indexed URL, however old', () => {
    const a = assessUrl({ url: INDEXED.url, lastmod: hoursAgo(5000) }, INDEXED, undefined, NOW);
    expect(a.alarming).toBe(false);
    expect(a.watching).toBe(false);
    expect(a.reasons).toEqual([]);
  });

  it('records a failed inspection as BLIND, never as healthy', () => {
    // The whole item exists because a monitor reported nothing wrong. A URL
    // Google did not answer for is not a URL that is fine.
    const failed: UrlInspectionResult = { ...UNKNOWN, ok: false, detail: 'HTTP 429 quota' };
    const a = assessUrl(entry(hoursAgo(500)), failed, undefined, NOW);
    expect(a.blind).toBe(true);
    expect(a.alarming).toBe(false);
    expect(a.reasons).toEqual([]);
    expect(a.detail).toBe('HTTP 429 quota');
  });

  it('lets the ledger keep the clock once it is older than lastmod', () => {
    // The case that makes the alarm possible at all: `lastmod` moves forward
    // every time an article is edited. If the window restarted with it, an
    // article edited daily could stay dark forever without ever alarming.
    const ledgerEntry = {
      firstSeenInSitemap: hoursAgo(500),
      lastCheckedAt: hoursAgo(24),
      coverageState: 'URL is unknown to Google',
      verdict: 'NEUTRAL',
      lastCrawlTime: null,
      lastAlarmedAt: null,
    };
    const a = assessUrl(entry(hoursAgo(1)), UNKNOWN, ledgerEntry, NOW);
    expect(a.firstSeenInSitemap).toBe(hoursAgo(500));
    expect(a.alarming).toBe(true);
  });
});

describe('isNoindexedInSitemap — the condition RISK-05 recorded and could not alarm on', () => {
  it('is true for a sitemap URL Google excluded by a noindex tag', () => {
    expect(isNoindexedInSitemap(NOINDEXED)).toBe(true);
  });

  it('reads the STRUCTURAL signal, so a Google copy-edit cannot silence it', () => {
    // Same reasoning as `isUnknownToGoogle`: `coverageState` is localised prose.
    expect(isNoindexedInSitemap({ ...NOINDEXED, coverageState: 'Ausgeschlossen' })).toBe(true);
  });

  it('reads the PROSE too, so a new structural enum value cannot silence it either', () => {
    expect(
      isNoindexedInSitemap({ ...NOINDEXED, indexingState: 'INDEXING_STATE_UNSPECIFIED' }),
    ).toBe(true);
  });

  it('is false for a healthy indexed URL', () => {
    expect(isNoindexedInSitemap(INDEXED)).toBe(false);
  });

  it('is false for a URL Google has simply never heard of', () => {
    expect(isNoindexedInSitemap(UNKNOWN)).toBe(false);
  });
});

describe('assessUrl — the third condition, added by RISK-07', () => {
  it('alarms on a noindexed sitemap URL past the window', () => {
    const a = assessUrl(
      { url: NOINDEXED.url, lastmod: hoursAgo(GRACE_HOURS + 1) },
      NOINDEXED,
      undefined,
      NOW,
    );
    expect(a.alarming).toBe(true);
    expect(a.reasons).toEqual(['sitemap-url-noindexed']);
  });

  it('watches, rather than alarms, inside the window', () => {
    // A hub can be legitimately noindex for a few hours between being added to
    // the sitemap and its first article going live.
    const a = assessUrl({ url: NOINDEXED.url, lastmod: hoursAgo(1) }, NOINDEXED, undefined, NOW);
    expect(a.alarming).toBe(false);
    expect(a.watching).toBe(true);
  });

  it('does not disturb the two original conditions', () => {
    const a = assessUrl(
      { url: UNKNOWN.url, lastmod: hoursAgo(GRACE_HOURS + 1) },
      UNKNOWN,
      undefined,
      NOW,
    );
    expect(a.reasons).toEqual(['unknown-to-google', 'never-crawled']);
  });
});

describe('assessSweep', () => {
  const sitemap: SitemapEntry[] = [
    { url: INDEXED.url, lastmod: hoursAgo(200) },
    { url: UNKNOWN.url, lastmod: hoursAgo(200) },
    { url: DISCOVERED.url, lastmod: hoursAgo(1) },
  ];
  const inspections = new Map([
    [INDEXED.url, INDEXED],
    [UNKNOWN.url, UNKNOWN],
    [DISCOVERED.url, DISCOVERED],
  ]);

  it('splits the sweep into alarming, watching and blind', () => {
    const s = assessSweep(sitemap, inspections, {}, NOW);
    expect(s.alarms.map((a) => a.url)).toEqual([UNKNOWN.url]);
    expect(s.watching.map((a) => a.url)).toEqual([DISCOVERED.url]);
    expect(s.blind).toEqual([]);
    expect(s.byCoverageState).toEqual({
      'Submitted and indexed': 1,
      'URL is unknown to Google': 1,
      'Discovered - currently not indexed': 1,
    });
  });

  it('counts a URL with no result at all as blind, not as absent', () => {
    // A sitemap URL the sweep dropped is a bug in the caller. Silently
    // shrinking the denominator is the exact lie this monitor exists to stop.
    const s = assessSweep(sitemap, new Map([[INDEXED.url, INDEXED]]), {}, NOW);
    expect(s.blind.map((a) => a.url).sort()).toEqual([DISCOVERED.url, UNKNOWN.url].sort());
    expect(s.assessments).toHaveLength(3);
  });
});

describe('nextLedger', () => {
  const sitemap: SitemapEntry[] = [{ url: UNKNOWN.url, lastmod: hoursAgo(200) }];
  const inspections = new Map([[UNKNOWN.url, UNKNOWN]]);

  it('carries firstSeenInSitemap forward verbatim, or the window never expires', () => {
    const previous: Ledger = {
      [UNKNOWN.url]: {
        firstSeenInSitemap: hoursAgo(1000),
        lastCheckedAt: hoursAgo(24),
        coverageState: 'URL is unknown to Google',
        verdict: 'NEUTRAL',
        lastCrawlTime: null,
        lastAlarmedAt: hoursAgo(24),
      },
    };
    const out = nextLedger(previous, assessSweep(sitemap, inspections, previous, NOW), NOW);
    expect(out[UNKNOWN.url].firstSeenInSitemap).toBe(hoursAgo(1000));
    expect(out[UNKNOWN.url].lastCheckedAt).toBe(NOW.toISOString());
    expect(out[UNKNOWN.url].lastAlarmedAt).toBe(NOW.toISOString());
  });

  it('drops URLs that have left the sitemap', () => {
    const previous: Ledger = {
      'https://hellokahwin.com/artikel/gone': {
        firstSeenInSitemap: hoursAgo(1000),
        lastCheckedAt: hoursAgo(24),
        coverageState: 'Submitted and indexed',
        verdict: 'PASS',
        lastCrawlTime: hoursAgo(30),
        lastAlarmedAt: null,
      },
    };
    const out = nextLedger(previous, assessSweep(sitemap, inspections, previous, NOW), NOW);
    expect(Object.keys(out)).toEqual([UNKNOWN.url]);
  });

  it('keeps the last known state when an inspection failed, rather than nulling it', () => {
    const previous: Ledger = {
      [INDEXED.url]: {
        firstSeenInSitemap: hoursAgo(1000),
        lastCheckedAt: hoursAgo(24),
        coverageState: 'Submitted and indexed',
        verdict: 'PASS',
        lastCrawlTime: '2026-08-26T06:14:46Z',
        lastAlarmedAt: null,
      },
    };
    const failed: UrlInspectionResult = { ...INDEXED, ok: false, detail: 'fetch failed' };
    const s = assessSweep(
      [{ url: INDEXED.url, lastmod: hoursAgo(200) }],
      new Map([[INDEXED.url, failed]]),
      previous,
      NOW,
    );
    const out = nextLedger(previous, s, NOW);
    expect(out[INDEXED.url].coverageState).toBe('Submitted and indexed');
    expect(out[INDEXED.url].lastCrawlTime).toBe('2026-08-26T06:14:46Z');
    // …but the check date moves, so a reading that has stopped updating shows.
    expect(out[INDEXED.url].lastCheckedAt).toBe(NOW.toISOString());
  });
});

describe('alarmIssueTitle — the line a human reads first', () => {
  const sweep = (entries: SitemapEntry[], results: UrlInspectionResult[]) =>
    assessSweep(entries, new Map(results.map((r) => [r.url, r])), {}, NOW);

  it('says "dark" when everything alarming is dark', () => {
    const t = alarmIssueTitle(sweep([{ url: UNKNOWN.url, lastmod: hoursAgo(200) }], [UNKNOWN]));
    expect(t).toBe('ALARM: 1 sitemap URL(s) are dark to Google (>72h, unknown or uncrawled)');
  });

  it('does NOT say "dark" about a URL Google crawled and then refused', () => {
    // RISK-07: calling this "dark" is how a new alarm gets read as a familiar
    // one and closed. Google fetched the page; it did what the page asked.
    const t = alarmIssueTitle(sweep([{ url: NOINDEXED.url, lastmod: hoursAgo(200) }], [NOINDEXED]));
    expect(t).not.toMatch(/dark/);
    expect(t).toBe('ALARM: 1 sitemap URL(s) are advertised while serving noindex (>72h)');
  });

  it('counts both shapes separately when both are present', () => {
    const t = alarmIssueTitle(
      sweep(
        [
          { url: UNKNOWN.url, lastmod: hoursAgo(200) },
          { url: NOINDEXED.url, lastmod: hoursAgo(200) },
        ],
        [UNKNOWN, NOINDEXED],
      ),
    );
    expect(t).toBe('ALARM: 1 sitemap URL(s) dark to Google and 1 serving noindex (>72h)');
  });
});

describe('alarmIssueBody', () => {
  const sitemap: SitemapEntry[] = [
    { url: INDEXED.url, lastmod: hoursAgo(200) },
    { url: UNKNOWN.url, lastmod: hoursAgo(200) },
    { url: DISCOVERED.url, lastmod: hoursAgo(1) },
  ];
  const s = assessSweep(
    sitemap,
    new Map([
      [INDEXED.url, INDEXED],
      [UNKNOWN.url, UNKNOWN],
      [DISCOVERED.url, DISCOVERED],
    ]),
    {},
    NOW,
  );
  const body = alarmIssueBody({
    assessment: s,
    property: 'https://hellokahwin.com/',
    sitemapUrl: 'https://hellokahwin.com/sitemap.xml',
    runUrl: 'https://github.com/ianngkb/hellokahwin/actions/runs/1',
    detectedAt: NOW.toISOString(),
    probeUrls: [UNKNOWN.url],
  });

  it('names every alarming URL, its coverage_state and its reason', () => {
    expect(body).toContain(UNKNOWN.url);
    expect(body).toContain('URL is unknown to Google');
    expect(body).toContain('unknown-to-google');
  });

  it('says out loud when a URL was a deliberate probe', () => {
    // An issue that does not distinguish a probe from a real dark article
    // teaches the reader to distrust the next one.
    expect(body).toContain('deliberate probe');
    expect(body).toContain('excluded from the persisted state file');
  });

  it('reports the watching set without claiming it is alarming', () => {
    expect(body).toContain(DISCOVERED.url);
    expect(body).toContain(`inside the ${GRACE_HOURS}h window`);
  });

  it('carries the run link and the detection timestamp, which the 10s gate needs', () => {
    expect(body).toContain('actions/runs/1');
    expect(body).toContain(NOW.toISOString());
  });

  it('never lists a healthy URL', () => {
    expect(body).not.toContain(INDEXED.url);
  });
});
