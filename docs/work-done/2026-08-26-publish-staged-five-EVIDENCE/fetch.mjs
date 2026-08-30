/**
 * One request, one line of evidence.
 *
 * Cache headers are recorded on every request because a stale 200 and a fresh
 * 200 are otherwise identical. `age` is compared against seconds-since-write:
 * an age larger than that is arithmetically impossible for a fresh render, so
 * the script says so itself rather than leaving it to be diagnosed by hand.
 *
 *   node fetch.mjs <label> <url> [probe...] --since <iso>
 */
import fs from 'node:fs';

const argv = process.argv.slice(2);
const si = argv.indexOf('--since');
const since = si >= 0 ? new Date(argv[si + 1]) : null;
if (si >= 0) argv.splice(si, 2);
const oi = argv.indexOf('--out');
const out = oi >= 0 ? argv[oi + 1] : null;
if (oi >= 0) argv.splice(oi, 2);
const [label, url, ...probes] = argv;

const at = new Date();
const res = await fetch(url, { redirect: 'manual' });
const body = await res.text();
if (out) fs.writeFileSync(out, body);

const secs = since ? Math.round((at - since) / 1000) : null;
const age = Number(res.headers.get('age') ?? '-1');
const robots = body.match(/<meta name="robots" content="[^"]*"\/?>/)?.[0] ?? '(none)';

const L = [];
L.push(`URL:              ${url}`);
L.push(`LABEL:            ${label}`);
L.push(
  `AT (UTC):         ${at.toISOString()}${secs !== null ? `   (+${secs}s after last write)` : ''}`,
);
L.push(
  `STATUS:           ${res.status}      HDR x-vercel-cache: ${res.headers.get('x-vercel-cache') ?? '-'}   HDR age: ${res.headers.get('age') ?? '-'}`,
);
L.push(`BODY BYTES:       ${Buffer.byteLength(body)}`);
L.push(`ROBOTS META:      ${robots}`);
L.push(`NOINDEX ANYWHERE IN BODY: ${body.includes('noindex')}`);
for (const p of probes) L.push(`PROBE "${p}": ${body.split(p).length - 1} occurrence(s)`);
if (secs !== null && age > secs)
  L.push(
    `!! age ${age} EXCEEDS the ${secs}s since the last write — PRE-WRITE copy, not the origin's answer.`,
  );
console.log(L.join('\n') + '\n');
