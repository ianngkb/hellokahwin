import type { UrlInspectionResult } from './gsc-url-inspection';

/**
 * Decide, from a sweep of URL inspections plus what we saw last time, which
 * URLs are DARK — and be able to argue it in a unit test rather than in
 * production at 4am.
 *
 * This file is deliberately pure: no network, no clock, no filesystem. Every
 * input is an argument, `now` included. `scripts/indexing-monitor.mts` does the
 * I/O and hands the results here. That split exists because the expensive part
 * of this item is not fetching — it is the JUDGEMENT, and a judgement you can
 * only exercise by waiting for a real cron run is a judgement nobody reviews.
 *
 * ── WHAT COUNTS AS AN ALARM, VERBATIM FROM THE DoD ────────────────────────
 *
 *   "…files a loud alarm when any URL is unknown-to-Google or uncrawled more
 *    than 72h after appearing in the sitemap."
 *
 * Two conditions, one grace window, and the window applies to BOTH. An article
 * published four minutes ago is legitimately unknown to Google; alarming on it
 * would leave the monitor permanently red, and a permanently red alarm is an
 * alarm nobody reads — which is the same outcome as having no alarm, arrived at
 * more expensively. 72h is the number the DoD set and it is not tuned here.
 *
 * ── THE BASELINE PROBLEM, WHICH IS THE WHOLE POINT OF THE ITEM ────────────
 *
 * "A baseline you take once is a photograph." The corollary bit us designing
 * this: the grace window needs to know when a URL FIRST APPEARED in the
 * sitemap, and on the very first run this monitor has no history at all. Taken
 * naively, that means the monitor is blind for its first 72 hours and the five
 * dark articles that motivated the item would have been invisible to it.
 *
 * So `effectiveFirstSeen` takes the EARLIER of two things:
 *
 *   1. when this monitor first recorded the URL in the sitemap (the ledger), and
 *   2. the `lastmod` the sitemap itself advertises for that URL.
 *
 * (2) is sound as a lower bound on age because a URL cannot be in the sitemap
 * before it exists, and `src/app/sitemap.ts` emits a TRUTHFUL `lastmod` — it
 * floors at the 21 Aug 2026 migration date and never writes `new Date()`. If a
 * URL has been telling Google "I was last modified six days ago" and Google
 * still has never heard of it, the grace window is not the thing protecting it.
 *
 * The failure direction matters: `lastmod` moves FORWARD when an article is
 * edited, so using it can only ever make `effectiveFirstSeen` later than the
 * truth, never earlier. This can therefore delay an alarm; it cannot fabricate
 * one. Once the ledger has real history, (1) wins for anything published after
 * the monitor started, which is every URL that matters going forward.
 *
 * ── `coverageState` IS PROSE, NOT AN ENUM ─────────────────────────────────
 *
 * Google returns a localised human string. `@/lib/seo/gsc-url-inspection` pins
 * `languageCode: 'en-US'` to keep it English, but a monitor whose only test is
 * a substring match on prose is one Google copy-edit away from reporting a
 * clean sweep forever. `isUnknownToGoogle` therefore accepts EITHER the string
 * or a structural signature that carries no prose at all. Both halves stay.
 */

/** The DoD's window, in hours. Not a tuning knob — it is the contract. */
export const GRACE_HOURS = 72;

const HOUR_MS = 3_600_000;

/** One `<url>` from the live sitemap. */
export interface SitemapEntry {
  url: string;
  /** ISO 8601 `lastmod`, or null when the sitemap did not carry one. */
  lastmod: string | null;
}

/** What the monitor remembers about one URL between runs. */
export interface LedgerEntry {
  /** ISO 8601 — the first sweep in which this URL was present in the sitemap. */
  firstSeenInSitemap: string;
  /** ISO 8601 of the most recent sweep that inspected it. */
  lastCheckedAt: string;
  /** Google's prose, as of `lastCheckedAt`. This is the "coverage_state per URL with the date". */
  coverageState: string | null;
  verdict: string | null;
  /** ISO 8601 of Googlebot's last fetch, or null if it has never fetched. */
  lastCrawlTime: string | null;
  /** ISO 8601 of the last sweep in which this URL was alarming, or null. */
  lastAlarmedAt: string | null;
}

export type Ledger = Record<string, LedgerEntry>;

/** Why a URL is being alarmed on. More than one can apply at once. */
export type AlarmReason = 'unknown-to-google' | 'never-crawled' | 'sitemap-url-noindexed';

export interface UrlAssessment {
  url: string;
  coverageState: string | null;
  verdict: string | null;
  lastCrawlTime: string | null;
  /** The date this URL is judged against. See `effectiveFirstSeen`. */
  firstSeenInSitemap: string;
  /** Whole hours between `firstSeenInSitemap` and `now`. */
  hoursInSitemap: number;
  /** Conditions that are TRUE right now, regardless of the grace window. */
  reasons: AlarmReason[];
  /** True when a condition holds AND the grace window has expired. */
  alarming: boolean;
  /** True when a condition holds but the URL is still inside its 72h window. */
  watching: boolean;
  /** True when Google did not answer, so nothing is known about this URL. */
  blind: boolean;
  /** The literal API answer for this URL. */
  detail: string;
  /** Search Console deep link, when Google gave one. */
  inspectionResultLink: string | null;
}

export interface SweepAssessment {
  /** Every URL, in sitemap order. */
  assessments: UrlAssessment[];
  /** Past grace and dark. These are what the alarm is about. */
  alarms: UrlAssessment[];
  /** Dark but still inside the 72h window. Reported, never alarmed on. */
  watching: UrlAssessment[];
  /** Google did not answer. The monitor is blind on these — NOT a clean result. */
  blind: UrlAssessment[];
  /** `coverageState` → count, so a human can see the shape of the property at a glance. */
  byCoverageState: Record<string, number>;
}

const iso = (d: Date) => d.toISOString();

/** Parse an ISO date, returning null rather than an Invalid Date. */
function parseIso(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * The date a URL's grace window is measured from.
 *
 * The earlier of the ledger's `firstSeenInSitemap` and the sitemap's `lastmod`,
 * clamped so it can never be in the future — a `lastmod` ahead of the clock
 * would otherwise buy a broken URL an indefinite grace window. Falls back to
 * `now` when there is neither, which is the correct answer for a URL this
 * monitor is seeing for the first time and whose sitemap entry says nothing.
 *
 * See the header for why `lastmod` is a legitimate lower bound and why the
 * error can only ever be in the safe direction.
 */
export function effectiveFirstSeen(
  ledgerFirstSeen: string | null | undefined,
  sitemapLastmod: string | null | undefined,
  now: Date,
): string {
  const candidates = [parseIso(ledgerFirstSeen), parseIso(sitemapLastmod)]
    .filter((d): d is Date => d !== null)
    .filter((d) => d.getTime() <= now.getTime());
  if (candidates.length === 0) return iso(now);
  return iso(candidates.reduce((min, d) => (d < min ? d : min)));
}

/**
 * Has Google never heard of this URL?
 *
 * Two independent tests, ORed, because either one alone is a silent-failure
 * risk:
 *
 *   - the PROSE test reads `coverageState`, which is what a human sees in
 *     Search Console, but is localised and un-versioned;
 *   - the STRUCTURAL test reads the three enum fields Google leaves
 *     `*_UNSPECIFIED` for a URL it has no record of, plus the absence of a
 *     crawl. Verified against the live API on 27 Aug 2026: a fabricated path
 *     answers `verdict: NEUTRAL`, `robotsTxtState`, `indexingState` and
 *     `pageFetchState` all `*_UNSPECIFIED`, and no `lastCrawlTime`. A URL
 *     Google merely has not indexed yet ("Discovered - currently not indexed")
 *     still carries `INDEXING_ALLOWED`, so it does not match this signature.
 */
export function isUnknownToGoogle(
  r: Pick<
    UrlInspectionResult,
    'coverageState' | 'verdict' | 'indexingState' | 'pageFetchState' | 'lastCrawlTime'
  >,
): boolean {
  if (r.coverageState && /unknown to google/i.test(r.coverageState)) return true;
  return (
    r.verdict === 'NEUTRAL' &&
    r.indexingState === 'INDEXING_STATE_UNSPECIFIED' &&
    r.pageFetchState === 'PAGE_FETCH_STATE_UNSPECIFIED' &&
    !r.lastCrawlTime
  );
}

/**
 * Has Googlebot never fetched this URL?
 *
 * `lastCrawlTime` absent is the whole test. It is deliberately broader than
 * `isUnknownToGoogle`: "Discovered - currently not indexed" means Google KNOWS
 * the URL and has still never gone to look at it, which is the exact shape of a
 * dark article that a coverage-state check alone would wave through.
 */
export function isUncrawled(r: Pick<UrlInspectionResult, 'lastCrawlTime'>): boolean {
  return !r.lastCrawlTime;
}

/**
 * A URL WE ADVERTISE that Google has crawled and then refused, because the page
 * told it to. The third alarm condition, and it was added after the fact.
 *
 * WHY IT IS HERE AND WAS NOT BEFORE. RISK-05 built this monitor against a DoD
 * naming two conditions, and on its first real sweep — 26 Aug 2026 — it counted
 * six URLs in state `Excluded by 'noindex' tag`. It recorded them and did not
 * alarm, correctly, because neither condition covered them. They were handed to
 * the owner as a finding, went into the backlog unowned, and sat there for a
 * sprint while every one of the six stayed excluded:
 *
 *   /artikel/hiasan-dekorasi        /artikel/glamor-eksklusif
 *   /artikel/moden-kontemporari     /artikel/fotografi-videografi
 *   /artikel/pantai-santai          /artikel/minimalis-mewah
 *
 * That is the RISK-07 defect, and the reason it survived is not that nobody
 * looked — the monitor looked every day and printed the number. It is that
 * looking without escalating produces a fact nobody is accountable for. A
 * sitemap that advertises a `noindex` URL is a permanent Search Console error,
 * so it belongs in the issue, not in the census table.
 *
 * NOT the same as `noindex` in general. A `noindex` page that is NOT in the
 * sitemap is a deliberate design choice this site makes on purpose — an empty
 * pillar, an orphaned child hub, a `?sub=` view. Nothing here sees those,
 * because the monitor's whole input is the live sitemap. The contradiction
 * being alarmed on is between two things WE control and which disagree.
 *
 * Structural signal AND prose, for the reason the file header gives: Google's
 * `coverageState` is localised human text, and `indexingState` is an enum that
 * could gain a value. Either alone is one Google change away from silence.
 */
export function isNoindexedInSitemap(
  r: Pick<UrlInspectionResult, 'coverageState' | 'indexingState'>,
): boolean {
  if (r.indexingState === 'BLOCKED_BY_META_TAG') return true;
  return Boolean(r.coverageState && /noindex/i.test(r.coverageState));
}

/** Assess one URL against the DoD's two conditions and its grace window. */
export function assessUrl(
  entry: SitemapEntry,
  inspection: UrlInspectionResult,
  ledgerEntry: LedgerEntry | undefined,
  now: Date,
): UrlAssessment {
  const firstSeenInSitemap = effectiveFirstSeen(
    ledgerEntry?.firstSeenInSitemap,
    entry.lastmod,
    now,
  );
  const hoursInSitemap = Math.floor(
    (now.getTime() - new Date(firstSeenInSitemap).getTime()) / HOUR_MS,
  );

  // Google did not answer. This is NOT a clean URL — it is an unknown one, and
  // it belongs in its own bucket so it can never be counted as healthy.
  if (!inspection.ok) {
    return {
      url: entry.url,
      coverageState: null,
      verdict: null,
      lastCrawlTime: null,
      firstSeenInSitemap,
      hoursInSitemap,
      reasons: [],
      alarming: false,
      watching: false,
      blind: true,
      detail: inspection.detail,
      inspectionResultLink: inspection.inspectionResultLink,
    };
  }

  const reasons: AlarmReason[] = [];
  if (isUnknownToGoogle(inspection)) reasons.push('unknown-to-google');
  if (isUncrawled(inspection)) reasons.push('never-crawled');
  // The grace window applies to this one too. A hub can be legitimately
  // `noindex` for a few hours between entering the sitemap and its first
  // article going live, and an alarm that fires on that is an alarm nobody
  // reads. Past 72h the two are simply contradicting each other.
  if (isNoindexedInSitemap(inspection)) reasons.push('sitemap-url-noindexed');

  const pastGrace = hoursInSitemap > GRACE_HOURS;
  return {
    url: entry.url,
    coverageState: inspection.coverageState,
    verdict: inspection.verdict,
    lastCrawlTime: inspection.lastCrawlTime,
    firstSeenInSitemap,
    hoursInSitemap,
    reasons,
    alarming: reasons.length > 0 && pastGrace,
    watching: reasons.length > 0 && !pastGrace,
    blind: false,
    detail: inspection.detail,
    inspectionResultLink: inspection.inspectionResultLink,
  };
}

/** Assess a whole sweep. `inspections` is keyed by URL. */
export function assessSweep(
  sitemap: SitemapEntry[],
  inspections: Map<string, UrlInspectionResult>,
  ledger: Ledger,
  now: Date,
): SweepAssessment {
  const assessments = sitemap.map((entry) =>
    assessUrl(
      entry,
      inspections.get(entry.url) ??
        // A URL in the sitemap that the sweep never inspected is a bug in the
        // caller, and the only safe reading of it is blindness.
        {
          url: entry.url,
          ok: false,
          coverageState: null,
          verdict: null,
          indexingState: null,
          robotsTxtState: null,
          pageFetchState: null,
          lastCrawlTime: null,
          googleCanonical: null,
          userCanonical: null,
          sitemaps: [],
          inspectionResultLink: null,
          detail: 'this URL was in the sitemap but the sweep produced no result for it',
        },
      ledger[entry.url],
      now,
    ),
  );

  const byCoverageState: Record<string, number> = {};
  for (const a of assessments) {
    const key = a.blind ? '(not answered)' : (a.coverageState ?? '(no coverageState)');
    byCoverageState[key] = (byCoverageState[key] ?? 0) + 1;
  }

  return {
    assessments,
    alarms: assessments.filter((a) => a.alarming),
    watching: assessments.filter((a) => a.watching),
    blind: assessments.filter((a) => a.blind),
    byCoverageState,
  };
}

/**
 * The ledger for the NEXT run.
 *
 * Built from the current sitemap only, so a URL that leaves the sitemap leaves
 * the ledger — otherwise a redirected or deleted article would sit in the state
 * file forever, and the "72h since it appeared" clock for a URL that comes BACK
 * would be measured from its previous life.
 *
 * `firstSeenInSitemap` is carried forward verbatim from the previous ledger
 * when it exists. It is the one field that must never be recomputed: rewriting
 * it every run would reset the grace window every run and the alarm could never
 * fire. When there is no previous entry it is stamped with the same
 * `effectiveFirstSeen` the assessment used, so the value recorded and the value
 * judged against are the same number.
 *
 * A URL whose inspection FAILED keeps its previous coverage/crawl values rather
 * than having them overwritten with nulls — a network blip must not erase the
 * last thing we actually knew — but `lastCheckedAt` still moves, so a stale
 * reading is visible as a date that has stopped matching the run.
 */
export function nextLedger(previous: Ledger, assessment: SweepAssessment, now: Date): Ledger {
  const out: Ledger = {};
  for (const a of assessment.assessments) {
    const prev = previous[a.url];
    out[a.url] = {
      firstSeenInSitemap: prev?.firstSeenInSitemap ?? a.firstSeenInSitemap,
      lastCheckedAt: iso(now),
      coverageState: a.blind ? (prev?.coverageState ?? null) : a.coverageState,
      verdict: a.blind ? (prev?.verdict ?? null) : a.verdict,
      lastCrawlTime: a.blind ? (prev?.lastCrawlTime ?? null) : a.lastCrawlTime,
      lastAlarmedAt: a.alarming ? iso(now) : (prev?.lastAlarmedAt ?? null),
    };
  }
  return out;
}

/**
 * Split the alarms by shape. Two genuinely different defects share one alarm:
 *
 *   DARK       Google does not have the page. Something stopped it arriving.
 *   NOINDEXED  Google has the page and we told it to throw it away. Both sides
 *              of that contradiction are ours.
 *
 * They need different words because they need different actions, and because a
 * new alarm wearing a familiar headline gets read as the familiar one and
 * closed. That is not hypothetical here: RISK-07's six URLs sat in the
 * monitor's census table for a sprint under a heading about dark URLs.
 */
function splitAlarms(assessment: SweepAssessment) {
  const noindexed = assessment.alarms.filter((a) => a.reasons.includes('sitemap-url-noindexed'));
  const dark = assessment.alarms.filter((a) => !a.reasons.includes('sitemap-url-noindexed'));
  return { dark, noindexed };
}

/**
 * The issue title. Exported and tested for the same reason the body is: it is
 * the only line most people read, and it must describe what was actually found.
 */
export function alarmIssueTitle(assessment: SweepAssessment): string {
  const { dark, noindexed } = splitAlarms(assessment);
  if (dark.length > 0 && noindexed.length > 0) {
    return (
      `ALARM: ${dark.length} sitemap URL(s) dark to Google and ` +
      `${noindexed.length} serving noindex (>${GRACE_HOURS}h)`
    );
  }
  if (noindexed.length > 0) {
    return `ALARM: ${noindexed.length} sitemap URL(s) are advertised while serving noindex (>${GRACE_HOURS}h)`;
  }
  return `ALARM: ${dark.length} sitemap URL(s) are dark to Google (>${GRACE_HOURS}h, unknown or uncrawled)`;
}

/**
 * The issue body, built once so the workflow's `github-script` step contains no
 * prose of its own.
 *
 * Two rules it must keep, both learned elsewhere in this repo: the loud claim
 * appears on exactly one branch, and every number it quotes is one the sweep
 * actually measured.
 */
export function alarmIssueBody(input: {
  assessment: SweepAssessment;
  property: string;
  sitemapUrl: string;
  runUrl: string;
  detectedAt: string;
  probeUrls: string[];
}): string {
  const { assessment, property, sitemapUrl, runUrl, detectedAt, probeUrls } = input;
  const lines: string[] = [];

  // The headline must describe what was actually found. "Dark" is wrong for a
  // URL Google crawled and then refused, and a headline that misdescribes its
  // own table is how a real alarm gets read as a familiar one and closed.
  const { dark, noindexed } = splitAlarms(assessment);
  const headline =
    dark.length > 0 && noindexed.length > 0
      ? `**${dark.length} URL(s) in the live sitemap are dark to Google, and ${noindexed.length} ` +
        `are advertised while telling Google not to index them**`
      : noindexed.length > 0
        ? `**${noindexed.length} URL(s) are advertised in the live sitemap while telling Google ` +
          `not to index them** — a permanent Search Console error`
        : `**${dark.length} URL(s) in the live sitemap are dark to Google**`;
  lines.push(
    `${headline} more than ` + `${GRACE_HOURS}h after appearing in it.`,
    '',
    `| URL | coverage_state | reason | hours in sitemap | last crawled |`,
    `| --- | --- | --- | --- | --- |`,
  );
  for (const a of assessment.alarms) {
    const probe = probeUrls.includes(a.url) ? ' _(deliberate probe)_' : '';
    lines.push(
      `| ${a.url}${probe} | ${a.coverageState ?? '—'} | ${a.reasons.join(', ')} | ` +
        `${a.hoursInSitemap} | ${a.lastCrawlTime ?? 'never'} |`,
    );
  }

  if (probeUrls.length > 0) {
    lines.push(
      '',
      `**A probe URL was injected into this run** (\`probe_url\`): ` +
        probeUrls.map((u) => `\`${u}\``).join(', ') +
        '. A probe is a URL fed to the monitor on purpose to make the alarm fire, ' +
        'so that the alarm is something that has been SEEN to work rather than a ' +
        'hypothesis. Probe URLs are excluded from the persisted state file, so they ' +
        'do not alarm again tomorrow.',
    );
  }

  if (assessment.watching.length > 0) {
    lines.push(
      '',
      `${assessment.watching.length} further URL(s) are dark but still inside the ` +
        `${GRACE_HOURS}h window, so they are not alarmed on yet:`,
      ...assessment.watching.map(
        (a) => `- \`${a.url}\` — ${a.coverageState ?? '—'} (${a.hoursInSitemap}h)`,
      ),
    );
  }

  lines.push(
    '',
    '---',
    '',
    `- Property: \`${property}\``,
    `- Sitemap: ${sitemapUrl} (${assessment.assessments.length} URLs swept)`,
    `- Detected at: \`${detectedAt}\``,
    `- Run: ${runUrl}`,
    '',
    'What to do: open the URL inspection link for each row in Search Console, confirm the',
    'page returns 200 and is not `noindex`, then use **Request indexing**. If several',
    'rows appeared at once, suspect the sitemap or a cache rather than the pages —',
    '`src/app/sitemap.ts` and `src/lib/cache/edge-purge.ts` are where that goes wrong.',
    '',
    'A `sitemap-url-noindexed` row is different: it means the sitemap and the page are',
    'contradicting each other, and BOTH are ours. `curl` the URL and grep the robots meta',
    'before touching Search Console — if the live HTML is already clean, the row is a stale',
    'Google verdict and needs a re-crawl, not a code change. `src/lib/seo/category-robots.ts`',
    'is where the decision for `/artikel/[category]` lives.',
  );

  return lines.join('\n');
}
