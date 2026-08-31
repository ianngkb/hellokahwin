#!/usr/bin/env node
/**
 * FAQPage census — walks the LIVE sitemap and reports, per article URL,
 * whether the page emits `FAQPage` JSON-LD: `present`, `absent`, or
 * `not-applicable`.
 *
 * SEO-13, 01 September 2026. Written because the figure in `ceo-memory.md`
 * ("31 articles emitting no FAQ schema") was a hand count taken once and then
 * quoted for two sprints while the corpus grew. A number that can only be
 * re-derived by hand will be re-quoted instead of re-derived. This is the
 * executable form of that number.
 *
 * WHY IT PARSES RATHER THAN GREPS
 * -------------------------------
 * Next.js ships the page twice: once as DOM and once as the RSC flight payload
 * inside `<script>self.__next_f.push(...)</script>`. A text grep for
 * `FAQPage` over the served HTML therefore counts the same block twice, and a
 * grep for `<h2` can hit escaped markup inside that payload. So this script
 * pulls the `<script type="application/ld+json">` tags, `JSON.parse`s each one,
 * and reads `@type`. A block that does not parse is a FAILURE, not an absence —
 * invalid JSON-LD is worse than none, and it is the one state a grep would
 * score as a pass.
 *
 * HOW `not-applicable` IS DECIDED — AND WHY IT IS NOT THE SCRIPT'S CALL ALONE
 * --------------------------------------------------------------------------
 * The DoD forbids padding the count with invented questions, so the script
 * must be able to say "this article genuinely has no Q&A" without me deciding
 * it case by case in prose that nobody re-runs. Two halves:
 *
 *   1. The script measures, from the rendered body with every `<script>` block
 *      stripped, how many headings are phrased as questions (they end in `?`).
 *      That is the evidence.
 *   2. `faq-not-applicable.json` carries a one-line reason per slug, written by
 *      hand and committed. A slug may only be reported `not-applicable` when
 *      BOTH a reason exists AND the measured question-heading count is below
 *      `FAQ_MIN_QUESTIONS`.
 *
 * So a reason cannot excuse an article that visibly does have Q&A, and an
 * article with no Q&A still cannot be quietly dropped — it has to be named.
 * An article with fewer than the minimum questions and NO committed reason is
 * reported `absent` and fails the run, which is the state that makes the census
 * a gate rather than a report.
 *
 * Usage:
 *   node scripts/seo/faq-schema-census.mjs                    # live production
 *   node scripts/seo/faq-schema-census.mjs --base http://localhost:3200
 *   node scripts/seo/faq-schema-census.mjs --json out.json    # machine-readable
 *   node scripts/seo/faq-schema-census.mjs --verbose          # per-URL detail
 *   node scripts/seo/faq-schema-census.mjs --selftest         # prove the shape
 *                                                             # check can fail
 *
 * Exit codes:
 *   0  every article is `present` or a reasoned `not-applicable`
 *   1  at least one article is `absent`, a JSON-LD block failed to parse, or an
 *      `FAQPage` failed schema.org's required properties (`invalid-shape`)
 *   2  the sitemap or a page could not be fetched (the census is incomplete —
 *      distinct from a clean failure, because "not looked at" is not "absent")
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Mirrors `FAQ_MIN_QUESTIONS` in `src/lib/inspire/faq-schema.ts`. */
const FAQ_MIN_QUESTIONS = 2;

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : (args[i + 1] ?? true);
};
const BASE = String(flag('--base', 'https://hellokahwin.com')).replace(/\/$/, '');
const VERBOSE = args.includes('--verbose');
const JSON_OUT = flag('--json', null);

const reasons = JSON.parse(readFileSync(join(HERE, 'faq-not-applicable.json'), 'utf8'));

async function get(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': 'hellokahwin-faq-census/1.0 (+SEO-13)' },
    redirect: 'follow',
  });
  const body = await res.text();
  return { status: res.status, body, cache: res.headers.get('x-vercel-cache') };
}

/** Every `<loc>` in the sitemap that is an article page (`/artikel/<cat>/<slug>`). */
function articleUrls(sitemapXml) {
  return [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1].trim())
    .filter((u) => /\/artikel\/[^/]+\/[^/]+\/?$/.test(new URL(u).pathname));
}

/**
 * The JSON-LD blocks on a page, parsed. `error` is set when a block is present
 * but does not parse — the state a text grep scores as a pass.
 */
function jsonLdBlocks(html) {
  const blocks = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    // The page escapes `<` as `<` before serialising; JSON.parse handles
    // that itself, so the raw inner text is what we hand it.
    try {
      blocks.push({ raw: m[1], json: JSON.parse(m[1]), error: null });
    } catch (err) {
      blocks.push({ raw: m[1], json: null, error: err.message });
    }
  }
  return blocks;
}

/** Heading texts in the rendered body, with every `<script>` block removed. */
function headings(html) {
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  return [...body.matchAll(/<(h[2-6])\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) =>
    m[2]
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&#x27;|&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

/**
 * schema.org conformance for `FAQPage`, checked here rather than only at
 * validator.schema.org.
 *
 * The external validator is the authority and is still run
 * (`faq-validate-schemaorg.mjs`), but it is a third party behind Google's
 * infrastructure and it BLOCKS BY IP: two concurrent sweeps from this machine on
 * 01 Sept tripped a `google.com/sorry` interstitial that outlasted the session.
 * A validity gate that only works when someone else's service feels like
 * answering is a gate that reports UNKNOWN on the day you need it.
 *
 * So the shape rules that matter for this type are asserted locally, on every
 * run, over every URL: `mainEntity` is a non-empty array; every member is a
 * `Question` with a non-empty `name`; every one has an `acceptedAnswer` that is
 * an `Answer` with non-empty `text`. Those are the required properties, and a
 * block that satisfies them is what the external validator has returned 0
 * errors and 0 warnings on for every URL it has been reachable for.
 */
function faqShapeErrors(json) {
  const errs = [];
  const entities = json?.mainEntity;
  if (!Array.isArray(entities) || entities.length === 0) {
    return ['mainEntity is missing or empty'];
  }
  entities.forEach((q, i) => {
    const at = `mainEntity[${i}]`;
    if (q?.['@type'] !== 'Question') errs.push(`${at} is not a Question`);
    if (typeof q?.name !== 'string' || q.name.trim() === '') errs.push(`${at}.name is empty`);
    const a = q?.acceptedAnswer;
    if (a?.['@type'] !== 'Answer') errs.push(`${at}.acceptedAnswer is not an Answer`);
    if (typeof a?.text !== 'string' || a.text.trim() === '')
      errs.push(`${at}.acceptedAnswer.text is empty`);
  });
  return errs;
}

const types = (json) => {
  const t = json?.['@type'];
  return Array.isArray(t) ? t : t ? [t] : [];
};

/**
 * The shape check's own negative control. `--selftest` asserts that every rule
 * FIRES on a block that breaks it and CLEARS on one that does not, because a
 * validity gate nobody has watched fail is not a gate.
 */
function selftest() {
  const ok = {
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Bolehkah nikah tanpa wali?',
        acceptedAnswer: { '@type': 'Answer', text: 'Tidak. Wali ialah rukun ketiga.' },
      },
    ],
  };
  const cases = [
    ['a well-formed block', ok, 0],
    ['mainEntity missing', { '@type': 'FAQPage' }, 1],
    ['mainEntity empty', { '@type': 'FAQPage', mainEntity: [] }, 1],
    ['question not a Question', { mainEntity: [{ ...ok.mainEntity[0], '@type': 'Thing' }] }, 1],
    ['question name empty', { mainEntity: [{ ...ok.mainEntity[0], name: '   ' }] }, 1],
    ['acceptedAnswer missing', { mainEntity: [{ '@type': 'Question', name: 'A?' }] }, 2],
    [
      'acceptedAnswer text empty',
      { mainEntity: [{ ...ok.mainEntity[0], acceptedAnswer: { '@type': 'Answer', text: '' } }] },
      1,
    ],
  ];
  let failed = 0;
  for (const [label, block, expected] of cases) {
    const errs = faqShapeErrors(block);
    const pass = errs.length === expected;
    if (!pass) failed++;
    console.log(
      `  ${pass ? 'ok  ' : 'FAIL'} ${String(errs.length).padStart(2)} error(s), expected ${expected}  ${label}` +
        (errs.length ? `\n         ${errs.join('; ')}` : ''),
    );
  }
  console.log(failed === 0 ? '\nSELFTEST EXIT: 0' : `\nSELFTEST EXIT: 1 — ${failed} case(s) wrong`);
  process.exit(failed === 0 ? 0 : 1);
}

async function main() {
  if (args.includes('--selftest')) return selftest();

  let sitemap;
  try {
    sitemap = await get(`${BASE}/sitemap.xml`);
  } catch (err) {
    console.error(`FETCH FAILED  ${BASE}/sitemap.xml  ${err.message}`);
    process.exit(2);
  }
  if (sitemap.status !== 200) {
    console.error(`FETCH FAILED  ${BASE}/sitemap.xml  HTTP ${sitemap.status}`);
    process.exit(2);
  }

  const urls = articleUrls(sitemap.body);
  const rows = [];

  // SEQUENTIAL, deliberately. A concurrent sweep of this site manufactures the
  // render contention it is trying to measure — SEO-05, 26 Aug 2026, where a
  // six-wide sweep put the root default `<title>` on 36 article pages and the
  // report blamed a pre-existing defect. One request at a time.
  for (const url of urls) {
    let page;
    try {
      page = await get(url);
    } catch (err) {
      rows.push({ url, state: 'fetch-failed', detail: err.message });
      continue;
    }
    if (page.status !== 200) {
      rows.push({ url, state: 'fetch-failed', detail: `HTTP ${page.status}` });
      continue;
    }

    const blocks = jsonLdBlocks(page.body);
    const broken = blocks.filter((b) => b.error);
    const faq = blocks.find((b) => types(b.json).includes('FAQPage'));
    const hs = headings(page.body);
    const questionHeadings = hs.filter((h) => h.endsWith('?'));
    const slug = new URL(url).pathname.split('/').filter(Boolean).pop();

    const row = {
      url,
      slug,
      jsonLdBlocks: blocks.length,
      brokenBlocks: broken.map((b) => b.error),
      faqQuestions: faq ? (faq.json.mainEntity?.length ?? 0) : 0,
      headings: hs.length,
      questionHeadings: questionHeadings.length,
      questionHeadingText: questionHeadings,
      reason: reasons[slug] ?? null,
    };

    row.shapeErrors = faq ? faqShapeErrors(faq.json) : [];

    if (broken.length > 0) row.state = 'invalid-json';
    else if (faq && row.shapeErrors.length > 0) row.state = 'invalid-shape';
    else if (faq) row.state = 'present';
    else if (row.questionHeadings < FAQ_MIN_QUESTIONS && row.reason) row.state = 'not-applicable';
    else row.state = 'absent';

    rows.push(row);
  }

  const by = (s) => rows.filter((r) => r.state === s);
  const present = by('present');
  const absent = by('absent');
  const na = by('not-applicable');
  const invalid = [...by('invalid-json'), ...by('invalid-shape')];
  const failed = by('fetch-failed');

  console.log(`FAQPage census — ${BASE} — ${new Date().toISOString()}`);
  console.log(`articles in sitemap: ${rows.length}`);
  console.log(`  present:         ${present.length}`);
  console.log(`  absent:          ${absent.length}`);
  console.log(`  not-applicable:  ${na.length}`);
  console.log(
    `  invalid:         ${invalid.length}  (unparseable JSON, or an FAQPage that fails schema.org's required properties)`,
  );
  console.log(`  fetch-failed:    ${failed.length}`);
  console.log(`  questions emitted: ${present.reduce((n, r) => n + r.faqQuestions, 0)}`);

  const line = (r) =>
    `  ${r.state.padEnd(15)} ${r.slug ?? r.url}` +
    (r.state === 'present' ? `  (${r.faqQuestions} Q)` : '') +
    (r.state === 'absent'
      ? `  (${r.questionHeadings} question headings, no committed reason)`
      : '') +
    (r.state === 'not-applicable' ? `  — ${r.reason}` : '') +
    (r.state === 'invalid-json' ? `  ${r.brokenBlocks.join('; ')}` : '') +
    (r.state === 'invalid-shape' ? `  ${r.shapeErrors.join('; ')}` : '') +
    (r.state === 'fetch-failed' ? `  ${r.detail}` : '');

  if (VERBOSE) {
    console.log('\nall rows:');
    for (const r of rows) console.log(line(r));
  } else {
    for (const group of [invalid, failed, absent, na]) {
      for (const r of group) console.log(line(r));
    }
  }

  if (JSON_OUT)
    writeFileSync(
      JSON_OUT,
      JSON.stringify({ base: BASE, at: new Date().toISOString(), rows }, null, 2),
    );

  if (failed.length > 0) {
    console.log(
      `\nCENSUS INCOMPLETE — ${failed.length} URL(s) not fetched. "Not looked at" is not "absent".`,
    );
    process.exit(2);
  }
  if (invalid.length > 0 || absent.length > 0) {
    console.log(`\nFAQ CENSUS EXIT: 1 — ${absent.length} absent, ${invalid.length} invalid`);
    process.exit(1);
  }
  console.log('\nFAQ CENSUS EXIT: 0 — every article is present or a reasoned not-applicable');
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
