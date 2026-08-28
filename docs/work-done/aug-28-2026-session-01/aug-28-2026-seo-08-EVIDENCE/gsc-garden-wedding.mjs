import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

const CRED = process.env.GSC_SERVICE_ACCOUNT_PATH ||
  path.join(os.homedir(), '.claude', 'secrets', 'gsc-service-account.json');
const SITE = 'https://hellokahwin.com/';
const b64url = (i) => Buffer.from(i).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

async function token() {
  const c = JSON.parse(fs.readFileSync(CRED, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const h = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const cl = b64url(JSON.stringify({
    iss: c.client_email, scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }));
  const s = crypto.createSign('RSA-SHA256'); s.update(h + '.' + cl);
  const jwt = h + '.' + cl + '.' + b64url(s.sign(c.private_key));
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(JSON.stringify(j).slice(0, 300));
  return j.access_token;
}

async function q(tok, body) {
  const r = await fetch('https://searchconsole.googleapis.com/webmasters/v3/sites/' +
    encodeURIComponent(SITE) + '/searchAnalytics/query', {
    method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(r.status + ' ' + (await r.text()).slice(0, 300));
  return (await r.json()).rows || [];
}

const [, , start, end] = process.argv;
const tok = await token();

const site = await q(tok, { startDate: start, endDate: end, dimensions: [], rowLimit: 1 });
console.log(`SITE ${start}..${end}:`, JSON.stringify(site[0] || {}));

const pages = await q(tok, { startDate: start, endDate: end, dimensions: ['page'], rowLimit: 500 });
const fam = pages.filter((r) => r.keys[0].includes('garden-wedding'));
let fi = 0, fc = 0, pw = 0;
for (const r of fam) { fi += r.impressions; fc += r.clicks; pw += r.position * r.impressions; }
console.log('GARDEN-WEDDING REDIRECT FAMILY — every URL string GSC printed:');
for (const r of fam) console.log(`  ${r.keys[0]}  imp=${r.impressions} clk=${r.clicks} pos=${r.position.toFixed(1)}`);
console.log(`  FAMILY TOTAL impressions=${fi} clicks=${fc} pos=${(pw / fi).toFixed(2)} ctr=${(fc / fi * 100).toFixed(2)}%`);
const si = site[0] ? site[0].impressions : 0;
console.log(`  share of site impressions = ${(fi / si * 100).toFixed(1)}%  (site ${si})`);

const qp = await q(tok, {
  startDate: start, endDate: end, dimensions: ['query', 'page'], rowLimit: 500,
  dimensionFilterGroups: [{ filters: [{ dimension: 'page', operator: 'contains', expression: 'garden-wedding' }] }],
});
console.log(`\nPER-QUERY BREAKDOWN (dimensions=query,page) — ${qp.length} rows`);
let m = 0, le13 = 0;
for (const r of qp) {
  m += r.impressions;
  if (r.position <= 13) le13 += r.impressions;
  console.log(`  ${r.keys[0].padEnd(50)} imp=${String(r.impressions).padStart(4)} clk=${r.clicks} pos=${r.position.toFixed(1)}`);
}
console.log(`  named-query impressions=${m} of ${fi} family (${(m / fi * 100).toFixed(1)}%; remainder anonymised)`);
console.log(`  impressions at position <= 13: ${le13}`);
