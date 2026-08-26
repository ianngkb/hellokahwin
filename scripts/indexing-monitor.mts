/**
 * Sweep every URL in the LIVE sitemap through Google's URL Inspection API,
 * record what Google says about each one with the date, and hand the workflow
 * a decision about whether to file an alarm.
 *
 *   pnpm --silent monitor:indexing --out .tmp-monitor
 *   pnpm --silent monitor:indexing --out .tmp-monitor --probe-url <url>
 *   pnpm --silent monitor:indexing --out .tmp-monitor --dry-run   # no ledger written
 *
 * WHY THIS EXISTS.
 *
 * On 27 Aug 2026 the owner ran a URL inspection by hand and found five
 * published articles Google had never heard of. SEO-01 had taken a coverage
 * baseline in Sprint 01; it was a photograph, so it could not have caught them,
 * and nothing else in the system was looking. This is the thing that looks
 * every day.
 *
 * ── THE DIVISION OF LABOUR, AND WHY IT IS SPLIT THIS WAY ──────────────────
 *
 *   `@/lib/seo/gsc-url-inspection`  talks to Google. Network, retries, quota.
 *   `@/lib/seo/indexing-alarm`      decides what is dark. Pure, unit-tested.
 *   this file                       does I/O and reports.
 *   `.github/workflows/indexing-monitor.yml`  schedules it and files the issue.
 *
 * The judgement lives in a pure module on purpose. A rule you can only exercise
 * by waiting for tomorrow's cron is a rule nobody reviews, and this item exists
 * precisely because an unreviewed assumption ("the sitemap is submitted, so
 * Google knows") went unchallenged for a sprint.
 *
 * ── THE LEDGER IS A FILE, AND THE WORKFLOW OWNS MOVING IT ─────────────────
 *
 * The grace window needs to know when a URL first appeared in the sitemap, so
 * state has to survive between runs. This script reads and writes it as a plain
 * local JSON file (`--state`); the workflow copies that file to and from R2
 * with the `aws` CLI, the same mechanism `db-backup.yml` already proved on this
 * repo. Three consequences, all deliberate:
 *
 *   - the script runs locally with no cloud credentials at all, which is how it
 *     was developed and how it can be re-run by hand during an incident;
 *   - the state never rides in the git repo, so the monitor cannot trigger a
 *     production deploy by writing to `master` every night;
 *   - the durable record is versioned by DATE in R2, so "coverage_state per URL
 *     with the date" is an archive you can diff, not a single mutable file.
 *
 * ── BLIND IS NOT CLEAN ────────────────────────────────────────────────────
 *
 * If Google does not answer for a URL, this run FAILS (exit 2). It does not
 * report a clean sweep with a smaller denominator. A monitor that quietly
 * shrinks its own coverage is the failure this item was created to end, and the
 * workflow files a separate, differently-worded issue for it.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createGscInspector,
  inspectUrl,
  type GscInspector,
  type UrlInspectionResult,
} from '../src/lib/seo/gsc-url-inspection';
import {
  alarmIssueBody,
  assessSweep,
  nextLedger,
  GRACE_HOURS,
  type Ledger,
  type SitemapEntry,
} from '../src/lib/seo/indexing-alarm';

interface Args {
  siteUrl: string;
  property: string;
  sitemapUrl: string;
  statePath: string;
  outDir: string;
  probeUrls: string[];
  concurrency: number;
  dryRun: boolean;
  runUrl: string;
}

function parseArgs(argv: string[]): Args {
  let siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hellokahwin.com';
  let property = '';
  let sitemapUrl = '';
  let statePath = '';
  let outDir = '.tmp-indexing-monitor';
  let concurrency = 4;
  let dryRun = false;
  const probeUrls: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--site-url') siteUrl = argv[++i] ?? siteUrl;
    else if (a === '--property') property = argv[++i] ?? '';
    else if (a === '--sitemap-url') sitemapUrl = argv[++i] ?? '';
    else if (a === '--state') statePath = argv[++i] ?? '';
    else if (a === '--out') outDir = argv[++i] ?? outDir;
    else if (a === '--probe-url') {
      const v = argv[++i];
      if (v) probeUrls.push(v.trim());
    } else if (a === '--concurrency') concurrency = Number(argv[++i]) || concurrency;
    else if (a === '--dry-run') dryRun = true;
    else if (a === '--help' || a === '-h') {
      console.log(
        'Usage: monitor:indexing [--site-url u] [--property p] [--sitemap-url u]\n' +
          '                        [--state file] [--out dir] [--probe-url u]...\n' +
          '                        [--concurrency n] [--dry-run]',
      );
      process.exit(0);
    }
  }
  // The GSC property is a URL-prefix property: the origin WITH a trailing
  // slash. `https://hellokahwin.com/` and `sc-domain:hellokahwin.com` are two
  // separately verified properties and the service account is on the former.
  // Same rule as `gscPropertyFor` in `@/lib/seo/gsc-sitemap`; duplicated as one
  // line here rather than importing, because this script must stay runnable
  // against any property an operator names.
  if (!property) {
    const u = new URL(siteUrl);
    property = process.env.GSC_SITE_URL?.trim() || `${u.protocol}//${u.host}/`;
  }
  if (!sitemapUrl) sitemapUrl = new URL('/sitemap.xml', property).toString();
  if (!statePath) statePath = join(outDir, 'state.json');
  return {
    siteUrl,
    property,
    sitemapUrl,
    statePath,
    outDir,
    probeUrls,
    concurrency,
    dryRun,
    runUrl: process.env.MONITOR_RUN_URL ?? '(run locally)',
  };
}

/**
 * Parse `<url><loc>…</loc><lastmod>…</lastmod></url>` out of the sitemap.
 *
 * Hand-rolled rather than an XML dependency: `src/app/sitemap.ts` is a Next
 * `MetadataRoute.Sitemap`, so the document is machine-generated, flat, and has
 * exactly one shape. The one thing worth guarding is a sitemap INDEX — a
 * `<sitemapindex>` document would parse to zero URLs here and the run would
 * report a clean sweep of nothing, so it is detected and refused explicitly.
 */
export function parseSitemap(xml: string): SitemapEntry[] {
  if (/<sitemapindex[\s>]/i.test(xml)) {
    throw new Error(
      'that is a sitemap INDEX, not a urlset — this monitor sweeps a flat sitemap and ' +
        'would otherwise report a clean sweep of zero URLs. Teach it to follow the index ' +
        'before pointing it at one.',
    );
  }
  const out: SitemapEntry[] = [];
  const blocks = xml.match(/<url>[\s\S]*?<\/url>/gi) ?? [];
  for (const block of blocks) {
    const loc = block.match(/<loc>([\s\S]*?)<\/loc>/i)?.[1]?.trim();
    if (!loc) continue;
    const lastmod = block.match(/<lastmod>([\s\S]*?)<\/lastmod>/i)?.[1]?.trim() ?? null;
    out.push({ url: decodeXmlEntities(loc), lastmod });
  }
  return out;
}

/** The five XML predefined entities. `&amp;` appears in any URL carrying a query string. */
function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Fetch the sitemap the way Googlebot would — no cache-buster.
 *
 * Deliberately NOT `?t=<now>`: the document this monitor should be judging is
 * the one actually being served from the edge, because that is the one Google
 * reads. A cache-buster would make the monitor sweep a document no crawler has
 * ever seen, and the stale-edge failure (RISK-06, `stale-while-revalidate` at
 * 365 days until this sprint) is exactly the class of bug it should catch.
 */
async function fetchSitemap(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { accept: 'application/xml,text/xml;q=0.9,*/*;q=0.8' },
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`sitemap fetch HTTP ${res.status}: ${text.slice(0, 300)}`);
  return text;
}

/** Inspect `urls` with a bounded number of requests in flight. See the quota note in gsc-url-inspection. */
async function sweep(
  inspector: GscInspector,
  urls: string[],
  concurrency: number,
): Promise<Map<string, UrlInspectionResult>> {
  const results = new Map<string, UrlInspectionResult>();
  let cursor = 0;
  let done = 0;
  const worker = async () => {
    for (;;) {
      const i = cursor++;
      if (i >= urls.length) return;
      const url = urls[i];
      const result = await inspectUrl(inspector, url);
      results.set(url, result);
      done++;
      const mark = result.ok
        ? (result.coverageState ?? '(no coverageState)')
        : `FAILED ${result.detail}`;
      console.log(`  [${String(done).padStart(3)}/${urls.length}] ${url}\n        ${mark}`);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  return results;
}

function readLedger(path: string): { ledger: Ledger; note: string } {
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as { urls?: Ledger };
    const ledger = parsed.urls ?? {};
    return { ledger, note: `loaded ${Object.keys(ledger).length} URLs from ${path}` };
  } catch {
    // A missing state file is the FIRST RUN, not an error. Say which, loudly,
    // because "first run" is also what a silently-broken R2 download looks
    // like, and the two need different responses.
    return {
      ledger: {},
      note:
        `no readable state at ${path} — treating this as a FIRST RUN. Every URL's grace ` +
        `window will be measured from its sitemap lastmod. If this says "first run" on a ` +
        `day that is not the first, the state file did not come down from R2 and the ` +
        `monitor has amnesia.`,
    };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  mkdirSync(args.outDir, { recursive: true });

  console.log('Indexing monitor');
  console.log(`  property   : ${args.property}`);
  console.log(`  sitemap    : ${args.sitemapUrl}`);
  console.log(`  state      : ${args.statePath}`);
  console.log(`  out        : ${args.outDir}`);
  console.log(`  grace      : ${GRACE_HOURS}h`);
  if (args.probeUrls.length > 0) {
    console.log(`  probe URLs : ${args.probeUrls.join(', ')}`);
  }

  const { ledger, note } = readLedger(args.statePath);
  console.log(`  ledger     : ${note}`);

  const xml = await fetchSitemap(args.sitemapUrl);
  const sitemap = parseSitemap(xml);
  if (sitemap.length === 0) {
    throw new Error(
      `the sitemap at ${args.sitemapUrl} parsed to ZERO urls. Refusing to report a clean ` +
        'sweep of nothing — that is how a monitor lies.',
    );
  }
  console.log(`\n${sitemap.length} URLs in the live sitemap.`);

  // Probe URLs are injected HERE, at the sitemap boundary, so that everything
  // downstream — inspection, grace window, assessment, issue body — is the
  // identical code path a real dark URL takes. An alarm proved through a
  // special-case branch proves only that the branch works.
  //
  // `lastmod: null` is not enough to force them past the grace window (it would
  // fall back to `now`), so a probe is stamped with an explicitly ancient
  // lastmod. That is honest: the probe's whole purpose is to occupy the state a
  // URL reaches after 72 dark hours.
  const ANCIENT = '2026-01-01T00:00:00.000Z';
  const entries: SitemapEntry[] = [
    ...sitemap,
    ...args.probeUrls
      .filter((u) => !sitemap.some((e) => e.url === u))
      .map((u) => ({ url: u, lastmod: ANCIENT })),
  ];

  const { inspector, detail } = await createGscInspector(args.property);
  if (!inspector) {
    throw new Error(`cannot inspect anything: ${detail}`);
  }

  console.log('\nInspecting…');
  const inspections = await sweep(
    inspector,
    entries.map((e) => e.url),
    args.concurrency,
  );

  const now = new Date();
  const assessment = assessSweep(entries, inspections, ledger, now);
  // Stamped the instant the decision exists, and quoted in the issue body. The
  // workflow compares it against the issue's own `created_at` and fails if the
  // gap exceeded the DoD's 10 seconds — so "a loud alarm within 10s" is a
  // measurement this job takes on itself, not a claim in a document.
  const detectedAt = new Date().toISOString();

  const title =
    `ALARM: ${assessment.alarms.length} sitemap URL(s) are dark to Google ` +
    `(>${GRACE_HOURS}h, unknown or uncrawled)`;
  const body = alarmIssueBody({
    assessment,
    property: args.property,
    sitemapUrl: args.sitemapUrl,
    runUrl: args.runUrl,
    detectedAt,
    probeUrls: args.probeUrls,
  });

  // ── the durable record ──────────────────────────────────────────────────
  // A probe is a 404 by construction; persisting it would alarm forever. It
  // stays in the dated snapshot (so the proof is archived) and is kept out of
  // the state file (so tomorrow is clean).
  const realAssessments = assessment.assessments.filter((a) => !args.probeUrls.includes(a.url));
  const state = nextLedger(ledger, { ...assessment, assessments: realAssessments }, now);
  const snapshot = {
    sweptAt: now.toISOString(),
    property: args.property,
    sitemapUrl: args.sitemapUrl,
    graceHours: GRACE_HOURS,
    urlCount: sitemap.length,
    probeUrls: args.probeUrls,
    byCoverageState: assessment.byCoverageState,
    alarmCount: assessment.alarms.length,
    watchingCount: assessment.watching.length,
    blindCount: assessment.blind.length,
    urls: assessment.assessments,
  };

  writeFileSync(join(args.outDir, 'snapshot.json'), JSON.stringify(snapshot, null, 2));
  if (!args.dryRun) {
    writeFileSync(
      args.statePath,
      JSON.stringify({ updatedAt: now.toISOString(), urls: state }, null, 2),
    );
  }
  writeFileSync(
    join(args.outDir, 'alarm.json'),
    JSON.stringify(
      {
        alarm: assessment.alarms.length > 0,
        detectedAt,
        title,
        body,
        alarmCount: assessment.alarms.length,
        watchingCount: assessment.watching.length,
        blindCount: assessment.blind.length,
        urls: assessment.alarms.map((a) => a.url),
      },
      null,
      2,
    ),
  );

  // ── the human-readable report ───────────────────────────────────────────
  const summary: string[] = [
    `### Indexing monitor — ${sitemap.length} sitemap URLs swept`,
    '',
    `| bucket | count |`,
    `| --- | --- |`,
    `| alarming (dark >${GRACE_HOURS}h) | ${assessment.alarms.length} |`,
    `| watching (dark, inside ${GRACE_HOURS}h) | ${assessment.watching.length} |`,
    `| not answered by Google | ${assessment.blind.length} |`,
    '',
    '| coverage_state | count |',
    '| --- | --- |',
    ...Object.entries(assessment.byCoverageState)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `| ${k} | ${v} |`),
  ];
  if (assessment.alarms.length > 0) {
    summary.push(
      '',
      '#### Alarming',
      ...assessment.alarms.map(
        (a) =>
          `- \`${a.url}\` — ${a.coverageState ?? '—'} (${a.hoursInSitemap}h, ${a.reasons.join(', ')})`,
      ),
    );
  }
  if (assessment.watching.length > 0) {
    summary.push(
      '',
      '#### Watching',
      ...assessment.watching.map(
        (a) => `- \`${a.url}\` — ${a.coverageState ?? '—'} (${a.hoursInSitemap}h)`,
      ),
    );
  }
  writeFileSync(join(args.outDir, 'summary.md'), summary.join('\n') + '\n');

  console.log('\n' + summary.join('\n'));
  console.log(
    `\nalarm=${assessment.alarms.length > 0} alarms=${assessment.alarms.length} ` +
      `watching=${assessment.watching.length} blind=${assessment.blind.length} detectedAt=${detectedAt}`,
  );

  // Blindness is its own exit code so the workflow can tell "the site has dark
  // URLs" from "the monitor could not see". Both are loud; they are not the
  // same incident and they do not have the same fix.
  if (assessment.blind.length > 0) {
    console.error(
      `\n${assessment.blind.length} URL(s) were not answered by Google. This run did NOT ` +
        'sweep the whole sitemap and its result must not be read as clean:',
    );
    for (const b of assessment.blind) console.error(`  ${b.url} — ${b.detail}`);
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(`\nindexing monitor failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
