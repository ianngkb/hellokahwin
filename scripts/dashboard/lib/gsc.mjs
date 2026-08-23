// Live Google Search Console. Signs a service-account JWT with node:crypto,
// exchanges it for an access token, and queries the Search Analytics API.
//
// Rules this file exists to keep:
//   - The credential is read from a path, never embedded, never logged.
//   - Nothing is ever estimated. If a call fails, the failure is returned and
//     the dashboard prints it on the page.
//   - Every figure carries the window it covers and the moment it was pulled.

import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

function b64url(input) {
  return Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function isoDaysAgo(from, days) {
  const d = new Date(from + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

async function getAccessToken(credentialPath) {
  if (!fs.existsSync(credentialPath)) {
    throw new Error(
      'Search Console credential not found at ' +
        path.basename(credentialPath) +
        '. Set GSC_SERVICE_ACCOUNT_PATH to the service-account file (see the /tokens registry).'
    );
  }
  let creds;
  try {
    creds = JSON.parse(fs.readFileSync(credentialPath, 'utf8'));
  } catch {
    throw new Error('Search Console credential file is not valid JSON.');
  }
  if (!creds.client_email || !creds.private_key) {
    throw new Error('Search Console credential file is missing client_email or private_key.');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({
      iss: creds.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(header + '.' + claims);
  const signature = b64url(signer.sign(creds.private_key));
  const assertion = header + '.' + claims + '.' + signature;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    // Never surface the assertion or the key; only Google's own error text.
    throw new Error('Search Console sign-in failed (' + res.status + '): ' + body.slice(0, 300));
  }
  const json = await res.json();
  return json.access_token;
}

async function query(token, siteUrl, body) {
  const url =
    'https://searchconsole.googleapis.com/webmasters/v3/sites/' +
    encodeURIComponent(siteUrl) +
    '/searchAnalytics/query';
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error('Search Console query failed (' + res.status + '): ' + text.slice(0, 300));
  }
  return res.json();
}

function totalsFrom(rows) {
  const t = { clicks: 0, impressions: 0, ctr: null, position: null };
  if (!rows || !rows.length) return t;
  let posWeight = 0;
  for (const r of rows) {
    t.clicks += r.clicks || 0;
    t.impressions += r.impressions || 0;
    posWeight += (r.position || 0) * (r.impressions || 0);
  }
  t.ctr = t.impressions ? t.clicks / t.impressions : 0;
  t.position = t.impressions ? posWeight / t.impressions : null;
  return t;
}

/**
 * Pull everything the dashboard needs in one go.
 * @returns {Promise<object>} always resolves; `ok:false` carries the reason.
 */
export async function fetchSearchConsole({ siteUrl, credentialPath, lagDays = 3, historyDays = 180, today }) {
  const pulledAt = new Date().toISOString();

  try {
    const token = await getAccessToken(credentialPath);

    // Ask for everything up to today and let Search Console tell us how fresh it
    // actually is, rather than assuming a fixed lag. Every window below is then
    // anchored to the last day that really has data.
    const daily = await query(token, siteUrl, {
      startDate: isoDaysAgo(today, historyDays - 1),
      endDate: today,
      dimensions: ['date'],
      rowLimit: 1000,
      dataState: 'all',
    });
    const dailyRows = (daily.rows || []).slice().sort((a, b) => a.keys[0].localeCompare(b.keys[0]));
    const endDate = dailyRows.length ? dailyRows[dailyRows.length - 1].keys[0] : isoDaysAgo(today, lagDays);
    const startDate = isoDaysAgo(endDate, 27);
    const prevEnd = isoDaysAgo(startDate, 1);
    const prevStart = isoDaysAgo(prevEnd, 27);

    const [current, previous, queries, pages] = await Promise.all([
      query(token, siteUrl, { startDate, endDate, dimensions: [], dataState: 'all' }),
      query(token, siteUrl, { startDate: prevStart, endDate: prevEnd, dimensions: [], dataState: 'all' }),
      query(token, siteUrl, {
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: 25,
        dataState: 'all',
      }),
      query(token, siteUrl, {
        startDate,
        endDate,
        dimensions: ['page'],
        rowLimit: 25,
        dataState: 'all',
      }),
    ]);

    const cur = totalsFrom(current.rows);
    const prev = totalsFrom(previous.rows);

    return {
      ok: true,
      error: null,
      site: siteUrl,
      pulledAt,
      dataThrough: endDate,
      current: { ...cur, range: startDate + ' → ' + endDate, startDate, endDate },
      previous: { ...prev, range: prevStart + ' → ' + prevEnd, startDate: prevStart, endDate: prevEnd },
      daily: dailyRows.map((r) => ({
        date: r.keys[0],
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        ctr: r.ctr || 0,
        position: r.position || 0,
      })),
      topQueries: (queries.rows || []).map((r) => ({
        query: r.keys[0],
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        ctr: r.ctr || 0,
        position: r.position || 0,
      })),
      topPages: (pages.rows || []).map((r) => ({
        page: r.keys[0],
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        ctr: r.ctr || 0,
        position: r.position || 0,
      })),
    };
  } catch (err) {
    return {
      ok: false,
      error: String(err && err.message ? err.message : err),
      site: siteUrl,
      pulledAt,
      current: null,
      previous: null,
      daily: [],
      topQueries: [],
      topPages: [],
    };
  }
}

/** Snapshots let the page regenerate offline and give the metrics a history. */
export function writeSnapshot(dir, data) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'gsc-snapshot.json');
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  return file;
}

export function readSnapshot(dir) {
  const file = path.join(dir, 'gsc-snapshot.json');
  if (!fs.existsSync(file)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    data.fromSnapshot = true;
    return data;
  } catch {
    return null;
  }
}
