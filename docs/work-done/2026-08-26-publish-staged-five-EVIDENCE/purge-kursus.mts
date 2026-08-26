/**
 * The two cache drops an ingest does, for a write that did NOT go through
 * ingest.
 *
 * `kursus-kahwin` is a legacy WordPress row with no markdown source file, so
 * `pnpm ingest --update` cannot express the change; the swap is a direct
 * `articles.content` write. That skips the cache handling ingest bundles, so it
 * is reproduced here EXACTLY — same revalidate endpoint, same three-attempt
 * retry, then the same `purgeVercelEdge` over the same three paths — rather
 * than approximated.
 */
import fs from 'node:fs';
import { purgeVercelEdge, pathsInvalidatedByIngest } from '../src/lib/cache/edge-purge.ts';

// The ingest CLI's own bootstrap: .env files, without clobbering an injected
// VERCEL_TOKEN.
for (const f of ['.env.local', '.env']) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const v = m[2].trim().replace(/^["']|["']$/g, '');
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}

const secret = process.env.CRON_SECRET;
if (!secret) throw new Error('CRON_SECRET is not set — the origin cache cannot be dropped');

const endpoint = 'https://hellokahwin.com/api/cron/revalidate-content';
let ok = false;
let detail = '';
for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${secret}` },
    });
    ok = res.ok;
    detail = `HTTP ${res.status}`;
  } catch (err) {
    detail = err instanceof Error ? err.message : String(err);
  }
  if (!ok && attempt < 3) await new Promise((r) => setTimeout(r, attempt * 1000));
}
console.log(`origin cache drop: ${ok ? 'OK' : 'FAILED'} (${detail})`);
if (!ok) process.exit(2);

const paths = pathsInvalidatedByIngest('idea-dan-nasihat', 'kursus-kahwin');
const purge = await purgeVercelEdge(paths);
console.log(
  `edge purge: ${purge.ok ? 'OK' : 'FAILED'} (${purge.detail})${purge.skipped ? ' [skipped — no token]' : ''}`,
);
for (const p of purge.paths) console.log(`  ${p}`);
if (!purge.ok) process.exit(3);
