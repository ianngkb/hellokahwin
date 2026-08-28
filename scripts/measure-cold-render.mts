/**
 * Cold-render latency sweep — measures WHERE the seconds go on an article
 * request, not just how many of them there were.
 *
 *   pnpm measure:cold                       # every article URL in the sitemap
 *   pnpm measure:cold --only /artikel/a/b   # substring filter
 *   pnpm measure:cold --repeat 3            # N passes over the URL list
 *   pnpm measure:cold --delay 1000          # ms between requests (default 1000)
 *   pnpm measure:cold --out rows.json       # write the full row set
 *
 * ── WHY A TOTAL IS NOT A MEASUREMENT ──────────────────────────────────────
 *
 * RISK-08 exists because Sprint 01 recorded "cold renders take 5–22s against a
 * route declaring `maxDuration = 5`". Every number in that finding was a
 * stopwatch on a whole HTTP request: `dulang-hantaran` 22.0s, `walimatul-urus`
 * 3.7s then 21.1s, `mas-kahwin-johor` 5.6s. A whole-request total cannot tell
 * you whether the server rendered slowly, because it also contains DNS, the TCP
 * handshake, the TLS handshake, and — this is the one that mattered — any
 * kernel-level retransmission stall on the way to the edge.
 *
 * So this script splits every request into the five phases Node can actually
 * observe on the socket, and records the cache state alongside them:
 *
 *   dns        `lookup`        name resolution
 *   connect    `connect`       TCP handshake
 *   tls        `secureConnect` TLS handshake
 *   ttfb       `response`      request sent → first response byte
 *   server     ttfb − tls      THE RENDER, with the handshake taken back out
 *   total      `end`           → last body byte
 *
 * `server` is the column to quote when someone asks how long a page took to
 * build. On the worst request of the sweep that closed this item, `ttfb` was
 * 21,174ms and `server` was 85ms.
 *
 * `x-vercel-cache` is recorded on every row and is the second discriminator.
 * **A `HIT` did not run the function.** No render happened, no database was
 * touched, `maxDuration` was never in play. A slow `HIT` is a transport fact
 * about that one request; quoting it as a render time is how Sprint 01 came to
 * describe a delivery stall as a 22-second cold render.
 *
 * Two states mean the reader waited for a render, not one:
 *
 *   MISS         no entry at the edge — rendered from scratch.
 *   REVALIDATED  the entry had expired and was rebuilt INLINE, with the reader
 *                holding the connection open for it. Just as cold as a MISS,
 *                and the state a hardcoded bucket list is most likely to omit.
 *
 * `STALE` is different: the edge hands over the expired copy immediately and
 * rebuilds behind you, so nobody waited. `HIT` is free.
 *
 * ── WHY IT IS SEQUENTIAL, AND WHY THERE IS NO --concurrency ───────────────
 *
 * Same reason as `scripts/audit-rendered-titles.mts`, and it is not a
 * performance preference. Concurrent cold renders race the 1.5s deadline in
 * `generateMetadata` against a 5-wide postgres pool; losing that race degrades
 * the title and CACHES the degraded result. A concurrent sweep of this site
 * manufactures the defect it is measuring and then serves it to the next
 * reader. Requests here are awaited one at a time.
 *
 * ── HOW TO GET A COLD PATH ON PURPOSE ─────────────────────────────────────
 *
 * A unique query string does NOT work: the query is not part of this route's
 * CDN cache key, so `?_t=…` returns the same entry (verified 27 Ogos 2026).
 * What works is the clock. `next.config.ts` gives `/artikel/:category/:slug`
 * `Vercel-CDN-Cache-Control: s-maxage=300, stale-while-revalidate=600`, so an
 * entry is fresh for 300s, `STALE` for the next 600s, and `MISS` after 900s.
 * Leave a path alone for fifteen minutes and its next request is a real cold
 * render. `--delay` and `--repeat` exist to make that spacing deliberate.
 */

import { writeFileSync } from 'node:fs';
import { Agent, request as httpsRequest } from 'node:https';

/**
 * A FRESH TCP connection for every request, on purpose.
 *
 * Node's global agent has `keepAlive: true`, so a sequential sweep of one host
 * reuses one socket and the `lookup` / `connect` / `secureConnect` events fire
 * exactly once — on request 1. Every later row then reports `dns`, `connect`
 * and `tls` as null, and its TTFB is pure server time with no handshake in it.
 *
 * That is a lovely way to measure a render and a useless way to find a
 * handshake stall, which is the thing this item turned out to be about. The
 * first version of this script had the default agent and its 86 rows showed no
 * connect phase at all; the stall was only visible because a parallel `curl`
 * sweep opened a new connection each time. So: no reuse, and `serverMs` below
 * subtracts the handshake back out when you want the render on its own.
 */
const AGENT = new Agent({ keepAlive: false, maxSockets: 1 });

interface Row {
  url: string;
  pass: number;
  status: number;
  cache: string | null;
  age: string | null;
  vercelId: string | null;
  prerender: string | null;
  /** Phase boundaries in ms from the moment the request was created. */
  dnsMs: number | null;
  connectMs: number | null;
  tlsMs: number | null;
  ttfbMs: number | null;
  /**
   * TTFB with the handshake subtracted — request sent → first response byte.
   *
   * This is the number to quote as "how long the server took", and keeping the
   * two apart is the entire lesson of RISK-08: the readings that opened the
   * item were `ttfbMs`, and on the worst of them `serverMs` was ~350ms.
   */
  serverMs: number | null;
  totalMs: number;
  bytes: number;
  error: string | null;
}

const UA = 'hellokahwin-cold-render-probe/1.0 (+sequential; scripts/measure-cold-render.mts)';

/** `/artikel/<category>/<slug>` — the route that declares `maxDuration = 5`. */
const ARTICLE_PATH = /^\/artikel\/[^/]+\/[^/]+$/;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

/**
 * One request, timed at the socket.
 *
 * `node:https` rather than `fetch` for one reason: `fetch` reports a single
 * number. The whole point of this item is that the single number was hiding
 * which phase the seconds were in.
 */
function probe(url: string, pass: number, timeoutMs: number): Promise<Row> {
  return new Promise((resolve) => {
    const started = process.hrtime.bigint();
    const since = () => Number(process.hrtime.bigint() - started) / 1e6;

    const row: Row = {
      url,
      pass,
      status: 0,
      cache: null,
      age: null,
      vercelId: null,
      prerender: null,
      dnsMs: null,
      connectMs: null,
      tlsMs: null,
      ttfbMs: null,
      serverMs: null,
      totalMs: 0,
      bytes: 0,
      error: null,
    };

    const req = httpsRequest(url, { agent: AGENT, headers: { 'user-agent': UA } }, (res) => {
      row.ttfbMs = since();
      // The handshake is whatever completed last before the request went out.
      // TLS on a normal HTTPS request; falling back down the chain keeps the
      // number honest if an event was missed or a socket was reused.
      row.serverMs = row.ttfbMs - (row.tlsMs ?? row.connectMs ?? row.dnsMs ?? 0);
      row.status = res.statusCode ?? 0;
      const h = res.headers;
      row.cache = (h['x-vercel-cache'] as string) ?? null;
      row.age = (h['age'] as string) ?? null;
      row.vercelId = (h['x-vercel-id'] as string) ?? null;
      row.prerender = (h['x-nextjs-prerender'] as string) ?? null;
      res.on('data', (c: Buffer) => {
        row.bytes += c.length;
      });
      res.on('end', () => {
        row.totalMs = since();
        resolve(row);
      });
    });

    req.on('socket', (socket) => {
      socket.on('lookup', () => {
        row.dnsMs = since();
      });
      socket.on('connect', () => {
        row.connectMs = since();
      });
      socket.on('secureConnect', () => {
        row.tlsMs = since();
      });
    });

    // A hung request is a row, not a crash — the same rule the title audit
    // follows. One unreachable URL must not end a sweep that has already cost
    // eighty sequential requests and fifteen minutes of deliberate spacing.
    req.setTimeout(timeoutMs, () => {
      row.error = `timeout after ${timeoutMs}ms`;
      row.totalMs = since();
      req.destroy();
      resolve(row);
    });
    req.on('error', (err) => {
      if (row.error) return; // already resolved by the timeout handler
      row.error = err.message;
      row.totalMs = since();
      resolve(row);
    });
    req.end();
  });
}

async function sitemapArticleUrls(base: string): Promise<string[]> {
  const res = await fetch(`${base}/sitemap.xml`, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`sitemap ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1])
    .filter((u) => ARTICLE_PATH.test(u.replace(/^https?:\/\/[^/]+/, '')));
}

function pct(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[i];
}

function describe(label: string, values: number[]): string {
  if (values.length === 0) return `${label}: (none)`;
  const s = [...values].sort((a, b) => a - b);
  return (
    `${label}: n=${s.length} min=${Math.round(s[0])} p50=${Math.round(pct(s, 50))} ` +
    `p90=${Math.round(pct(s, 90))} max=${Math.round(s[s.length - 1])} (ms)`
  );
}

async function main() {
  const base = (arg('base') ?? 'https://hellokahwin.com').replace(/\/$/, '');
  const delay = Number(arg('delay') ?? 1000);
  const repeat = Number(arg('repeat') ?? 1);
  const timeoutMs = Number(arg('timeout') ?? 60_000);
  const only = arg('only');
  const out = arg('out');

  let urls = await sitemapArticleUrls(base);
  urls = urls.map((u) => u.replace(/^https?:\/\/[^/]+/, base));
  if (only) urls = urls.filter((u) => u.includes(only));

  console.log('# cold-render sweep');
  console.log(
    `# base=${base} urls=${urls.length} passes=${repeat} sequential delay=${delay}ms timeout=${timeoutMs}ms`,
  );
  console.log(`# started=${new Date().toISOString()}`);
  console.log('#');
  console.log('# cache        age   dns  conn   tls   ttfb server  total   kb  path');

  const rows: Row[] = [];
  for (let pass = 1; pass <= repeat; pass++) {
    if (repeat > 1) console.log(`# ── pass ${pass}/${repeat} ─────────────────────────────`);
    for (const url of urls) {
      const row = await probe(url, pass, timeoutMs);
      rows.push(row);
      const n = (v: number | null) => (v === null ? '   -' : String(Math.round(v)).padStart(5));
      console.log(
        `${(row.cache ?? '-').padEnd(13)} ${(row.age ?? '-').padStart(4)} ` +
          `${n(row.dnsMs)} ${n(row.connectMs)} ${n(row.tlsMs)} ${n(row.ttfbMs)} ${n(row.serverMs)} ${n(row.totalMs)} ` +
          `${String(Math.round(row.bytes / 1024)).padStart(4)}  ${row.url.replace(base, '')}` +
          (row.error ? `  ERROR ${row.error}` : '') +
          (row.status !== 200 ? `  status=${row.status}` : ''),
      );
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    }
  }

  // Buckets are derived from the rows, never from a list written in advance.
  // The first version of this summary iterated a hardcoded
  // ['MISS','STALE','HIT','BYPASS','PRERENDER'] and silently dropped 25 of its
  // own 86 rows, because Vercel also answers `REVALIDATED` — a stale entry the
  // edge rebuilt WHILE THE READER WAITED, which is a render this item cares
  // about as much as a MISS. A summary that can only report the states its
  // author had heard of is how a measurement quietly shrinks its denominator.
  const states = [...new Set(rows.map((r) => r.cache ?? '-'))].sort();
  console.log('');
  console.log('# ── SUMMARY ────────────────────────────────────────────────');
  console.log(`# finished=${new Date().toISOString()}`);
  console.log(`# rows=${rows.length}`);
  for (const c of states) {
    const rs = rows.filter((r) => (r.cache ?? '-') === c);
    console.log(`#`);
    console.log(`# x-vercel-cache: ${c}  (n=${rs.length})`);
    console.log(
      `#   ${describe(
        'ttfb  ',
        rs.map((r) => r.ttfbMs).filter((v): v is number => v !== null),
      )}`,
    );
    console.log(
      `#   ${describe(
        'server',
        rs.map((r) => r.serverMs).filter((v): v is number => v !== null),
      )}`,
    );
  }

  // MISS and REVALIDATED are the two states in which the reader waited for a
  // render. Reported together because that combined population — not MISS
  // alone — is what `maxDuration = 5` is actually sized against.
  const rendered = rows.filter((r) => r.cache === 'MISS' || r.cache === 'REVALIDATED');
  console.log('#');
  console.log(`# WAITED FOR A RENDER (MISS + REVALIDATED), n=${rendered.length}`);
  console.log(
    `#   ${describe(
      'server',
      rendered.map((r) => r.serverMs).filter((v): v is number => v !== null),
    )}`,
  );

  // The row shape this item is about: a request whose TTFB exceeded the route's
  // own `maxDuration = 5`. Printed with its cache state and its handshake
  // phases, because those three facts together are what say whether a function
  // ran at all — and on a HIT, none did.
  const slow = rows.filter((r) => (r.ttfbMs ?? 0) > 5000);
  console.log('#');
  console.log(`# requests with ttfb > 5000ms (the route's maxDuration): ${slow.length}`);
  for (const r of slow) {
    console.log(
      `#   ${(r.cache ?? '-').padEnd(6)} ttfb=${Math.round(r.ttfbMs ?? 0)}ms ` +
        `dns=${r.dnsMs === null ? '-' : Math.round(r.dnsMs)} ` +
        `conn=${r.connectMs === null ? '-' : Math.round(r.connectMs)} ` +
        `tls=${r.tlsMs === null ? '-' : Math.round(r.tlsMs)}  ${r.url}`,
    );
  }
  const slowHits = slow.filter((r) => r.cache === 'HIT' || r.cache === 'STALE');
  if (slowHits.length > 0) {
    console.log('#');
    console.log(
      `# ${slowHits.length} of those ${slow.length} were served from cache (HIT/STALE) — no function ran,`,
    );
    console.log(
      `# so they are transport stalls and NOT cold renders. Do not quote them as render time.`,
    );
  }

  const errors = rows.filter((r) => r.error !== null || (r.status !== 200 && r.status !== 0));
  if (errors.length > 0) {
    console.log('#');
    console.log('# non-200 / errored:');
    for (const r of errors) console.log(`#   ${r.status} ${r.error ?? ''} ${r.url}`);
  }

  if (out) {
    writeFileSync(out, JSON.stringify({ base, delay, repeat, rows }, null, 2));
    console.log(`#\n# rows written to ${out}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
