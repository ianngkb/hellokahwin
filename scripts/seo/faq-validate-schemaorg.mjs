#!/usr/bin/env node
/**
 * Validate every live `FAQPage` block against schema.org's own validator.
 *
 * SEO-13. The DoD asks for validity to be CHECKED rather than assumed, and
 * names Google's Rich Results test or schema.org validation. This uses
 * `validator.schema.org`, which has a real endpoint that answers over HTTP —
 * the Rich Results test does not, it is a JS app behind a token.
 *
 * ── WHY IT VALIDATES ALL OF THEM ──────────────────────────────────────────
 * The DoD asks for the result quoted for at least five URLs. Five is the
 * REPORTING floor, not the checking floor: the whole point of `faq-schema.ts`
 * is that no block is hand-written, so validity is a property of the emitter
 * and five samples of one emitter tell you about the emitter, not about the
 * corpus. The cheap thing here is to run all of them, so all of them are run
 * and the five get quoted out of a full pass.
 *
 * ── WHAT THE VALIDATOR SEES ───────────────────────────────────────────────
 * It fetches and RENDERS the URL itself (`isRendered: true` in the response),
 * so this checks what a crawler gets, not what the database holds. Its reply is
 * prefixed with `)]}'` as an anti-hijacking guard, which has to be stripped
 * before parsing.
 *
 * Usage:
 *   node scripts/seo/faq-validate-schemaorg.mjs <census.json>
 *   node scripts/seo/faq-validate-schemaorg.mjs --url <one url>
 *
 * Exit codes:
 *   0  every FAQPage node validated with zero errors
 *   1  at least one error, or a URL where the census expected FAQPage and the
 *      validator found none
 *   2  the validator could not be reached (not a failure of the markup)
 */

import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const ENDPOINT = 'https://validator.schema.org/validate';
const DELAY_MS = Number(args.includes('--delay') ? args[args.indexOf('--delay') + 1] : 4000);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The validator rate-limits, and it does so by URL count rather than by bytes:
 * a flat-out sweep of the corpus got 27 URLs in before the first HTTP 429.
 *
 * The distinction that matters is that a 429 is NOT a validation failure. The
 * first version of this script exited 2 on it, which was right, and that is
 * kept: "the validator would not talk to me" and "the markup is wrong" are
 * different outcomes and a checker that cannot tell them apart is the checker
 * that gets switched off. The backoff below is so the 74-URL sweep completes;
 * if it still cannot, the script says UNREACHABLE and exits 2.
 */
async function validate(url, { retries = 5 } = {}) {
  let wait = 8000;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ url }),
    });
    if (res.status === 429 && attempt < retries) {
      await sleep(wait);
      wait *= 2;
      continue;
    }
    if (!res.ok) throw new Error(`validator HTTP ${res.status}`);
    const text = await res.text();
    // `)]}'` anti-hijacking prefix.
    return JSON.parse(text.replace(/^\)\]\}'\s*/, ''));
  }
}

/** Every node in the reply, flattened out of its triple groups. */
function nodes(reply) {
  const out = [];
  for (const group of reply.tripleGroups ?? []) out.push(...(group.nodes ?? []));
  return out;
}

const urls = args.includes('--url')
  ? [args[args.indexOf('--url') + 1]]
  : JSON.parse(readFileSync(args[0], 'utf8'))
      .rows.filter((r) => r.state === 'present')
      .map((r) => r.url);

let errors = 0;
let missing = 0;

console.log(`schema.org validation — ${urls.length} URL(s) — ${new Date().toISOString()}`);

for (const url of urls) {
  let reply;
  try {
    await sleep(DELAY_MS);
    reply = await validate(url);
  } catch (err) {
    console.error(`  UNREACHABLE  ${url}  ${err.message}`);
    process.exit(2);
  }

  const faq = nodes(reply).filter((n) => n.typeGroup === 'FAQPage');
  if (faq.length === 0) {
    console.log(`  NO FAQPage   ${url}`);
    missing++;
    continue;
  }

  const numErrors = faq.reduce((n, f) => n + (f.numErrors ?? 0), 0);
  const numWarnings = faq.reduce((n, f) => n + (f.numWarnings ?? 0), 0);
  const questions = faq.reduce(
    (n, f) => n + (f.nodeProperties ?? []).filter((p) => p.pred === 'mainEntity').length,
    0,
  );

  if (numErrors > 0) errors++;
  console.log(
    `  ${numErrors === 0 ? 'VALID  ' : 'ERRORS '} ${String(questions).padStart(2)} Question  ` +
      `${numErrors} error, ${numWarnings} warning   ${url}`,
  );
}

console.log(`\n${urls.length} URL(s): ${errors} with errors, ${missing} with no FAQPage node`);
if (errors > 0 || missing > 0) {
  console.log('FAQ SCHEMAORG EXIT: 1');
  process.exit(1);
}
console.log('FAQ SCHEMAORG EXIT: 0 — every emitted FAQPage validated clean');
