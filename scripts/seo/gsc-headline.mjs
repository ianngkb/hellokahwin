// Headline Search Console figures for a board report, printed TWICE: once for
// the whole site and once with the quarantined pages taken out.
//
// Why this exists (decision 148, SEO-08, 28 Ogos 2026):
//   /garden-wedding/ draws about a quarter of every impression the site earns
//   and converts none of them, because it sits around position 37 on English
//   loanword queries. Left in the total it drags sitewide average position down
//   by roughly five places and CTR down by roughly a third, and every report
//   the company writes has to explain it again. The decision was to keep the
//   page and stop reporting it inside the headline numbers.
//
//   "Stop reporting it" is only real if there is a command that does it, so
//   this is the command. Quote the ex-quarantine line as the company's
//   performance; quote the site line beside it so nothing is hidden.
//
// Usage:
//   node scripts/seo/gsc-headline.mjs                  # last 28 complete days
//   node scripts/seo/gsc-headline.mjs 2026-07-31 2026-08-27
//
// Credential: GSC_SERVICE_ACCOUNT_PATH, else ~/.claude/secrets/gsc-service-account.json.
// Nothing is estimated. If the call fails it says so and exits non-zero.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const SITE = process.env.HELLOKAHWIN_GSC_SITE || 'https://hellokahwin.com/';
const CRED =
  process.env.GSC_SERVICE_ACCOUNT_PATH ||
  path.join(os.homedir(), '.claude', 'secrets', 'gsc-service-account.json');

// Pages quarantined from the headline by an explicit decision. Each entry
// carries the decision that put it here, so nothing sits in this list unowned.
export const QUARANTINE = [
  { match: 'garden-wedding', decision: 148, reviewOn: '2026-11-27' },
];

const b64url = (i) =>
  Buffer.from(i).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

async function accessToken() {
  if (!fs.existsSync(CRED)) {
    throw new Error(
      'Search Console credential not found at ' + path.basename(CRED) +
      '. Set GSC_SERVICE_ACCOUNT_PATH (see the /tokens registry).'
    );
  }
  const c = JSON.parse(fs.readFileSync(CRED, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: c.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(header + '.' + claims);
  const assertion = header + '.' + claims + '.' + b64url(signer.sign(c.private_key));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error('Token exchange failed: ' + JSON.stringify(json).slice(0, 200));
  return json.access_token;
}

async function searchAnalytics(token, body) {
  const res = await fetch(
    'https://searchconsole.googleapis.com/webmasters/v3/sites/' +
      encodeURIComponent(SITE) + '/searchAnalytics/query',
    {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) throw new Error('Search Console query failed (' + res.status + '): ' + (await res.text()).slice(0, 300));
  return (await res.json()).rows || [];
}

// Impression-weighted, the way Search Console itself aggregates position.
function totals(rows) {
  let clicks = 0, impressions = 0, weighted = 0;
  for (const r of rows) {
    clicks += r.clicks || 0;
    impressions += r.impressions || 0;
    weighted += (r.position || 0) * (r.impressions || 0);
  }
  return {
    clicks,
    impressions,
    ctr: impressions ? clicks / impressions : 0,
    position: impressions ? weighted / impressions : null,
  };
}

function isoDaysAgo(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function line(label, t) {
  const pos = t.position === null ? '   n/a' : t.position.toFixed(2).padStart(6);
  return (
    label.padEnd(34) +
    String(t.clicks).padStart(7) +
    String(t.impressions).padStart(13) +
    (t.ctr * 100).toFixed(2).padStart(9) + '%' +
    pos.padStart(11)
  );
}

const [, , argStart, argEnd] = process.argv;
// Search Console finalises data about three days late.
const endDate = argEnd || isoDaysAgo(3);
const startDate = argStart || isoDaysAgo(30);

const token = await accessToken();
const pages = await searchAnalytics(token, {
  startDate, endDate, dimensions: ['page'], rowLimit: 1000,
});

const quarantined = pages.filter((r) => QUARANTINE.some((q) => r.keys[0].includes(q.match)));
const kept = pages.filter((r) => !QUARANTINE.some((q) => r.keys[0].includes(q.match)));

console.log('HelloKahwin — Search Console headline, ' + startDate + ' to ' + endDate);
console.log('pulled ' + new Date().toISOString() + ' · property ' + SITE);
console.log();
console.log('row'.padEnd(34) + 'clicks'.padStart(7) + 'impressions'.padStart(13) + 'CTR'.padStart(10) + 'position'.padStart(11));
console.log('-'.repeat(75));
console.log(line('site total (all pages)', totals(pages)));
console.log(line('QUARANTINED (see below)', totals(quarantined)));
console.log(line('SITE EX-QUARANTINE  <-- quote', totals(kept)));
console.log();
console.log('Quarantined pages — every impression Search Console attributed to each URL string:');
for (const q of QUARANTINE) {
  const rows = pages.filter((r) => r.keys[0].includes(q.match));
  if (!rows.length) {
    console.log('  ' + q.match + ' — no rows in this window (decision ' + q.decision + ')');
    continue;
  }
  for (const r of rows) {
    console.log(
      '  ' + r.keys[0] + '  impressions=' + r.impressions + ' clicks=' + r.clicks +
      ' position=' + r.position.toFixed(1)
    );
  }
  console.log('  ^ decision ' + q.decision + ', reviewed ' + q.reviewOn +
    ' — on that date the page either earns investment or leaves the review rota.');
}
