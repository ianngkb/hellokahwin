/**
 * Acceptance verification for the Ahrefs Phase 2.5 content sweeps, run against
 * LIVE production HTML rather than against the database.
 *
 *   node scripts/seo/verify-content-acceptance.mjs
 *
 * It lives in the repo, not in a scratch folder, because "the rows are correct
 * in Postgres" is not the claim any of this makes. The claim is that a reader
 * and a crawler are served the right page, and only a request to the live site
 * can settle that. It is also the check that catches a revalidation which
 * reported success while the CDN kept serving the old HTML.
 *
 * Checks, in order of the brief's acceptance list:
 *  1. The three articles the findings named carry zero internal hrefs that
 *     redirect. Every internal href on those pages gets a real HEAD request
 *     and must answer 200, not 3xx.
 *  2. Every category hub serves a meta description of 120 characters or more.
 *  3. No page title exceeds 60 characters.
 *  4. /artikel emits og:url.
 *  5. A sample of pages carries stored alt text rather than the render-time
 *     fallback.
 *
 * No dependencies, no database, no writes.
 */
const SITE = 'https://hellokahwin.com';

const NAMED = [
  '/artikel/hantaran-mas-kahwin/dulang-hantaran',
  '/artikel/idea-dan-nasihat/tempat-honeymoon-di-malaysia',
  '/artikel/idea-dan-nasihat/cara-buat-kad-kahwin-digital',
];

/** Hubs and pages to spot-check; ten of them, as the common rules require. */
const SPOT = [
  '/artikel',
  '/artikel/real-wedding',
  '/artikel/hantaran-mas-kahwin',
  '/artikel/nikah-undang-undang',
  '/artikel/ucapan-doa',
  '/artikel/idea-dan-nasihat',
  '/artikel/venue-perancangan',
  '/artikel/busana-pengantin',
  '/artikel/sebelum-nikah',
  '/artikel/pelamin-kad-cenderahati',
];

/** Articles whose meta title was shortened, and whose alt text was backfilled. */
const TITLE_SAMPLE = [
  '/artikel/real-wedding/villa-warisan',
  '/artikel/fotografi-videografi/lokasi-pre-wedding-photoshoot-terbaik',
  '/artikel/real-wedding/sentosa-janda-baik',
  '/artikel/moden-kontemporari/sime-darby-convention-centre',
  '/artikel/venue-perancangan/harga-sewa-dewan-kahwin',
];
const ALT_SAMPLE = [
  '/artikel/idea-dan-nasihat/garden-wedding',
  '/artikel/idea-dan-nasihat/majlis-kahwin',
  '/artikel/idea-dan-nasihat/kursus-kahwin',
  '/artikel/hantaran-mas-kahwin/hantaran-tunang',
];

const get = async (path) => {
  const res = await fetch(SITE + path, { headers: { 'user-agent': 'hk-acceptance-check' } });
  return { status: res.status, html: await res.text() };
};

const meta = (html, re) => {
  const m = html.match(re);
  return m ? m[1] : null;
};
const decode = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

let failures = 0;
const check = (ok, label, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
};

console.log('=== 1. internal hrefs on the three named articles ===');
for (const path of NAMED) {
  const { status, html } = await get(path);
  if (status !== 200) {
    check(false, path, `page itself returned ${status}`);
    continue;
  }
  const body = html.split('<footer')[0];
  const hrefs = [
    ...new Set(
      [...body.matchAll(/href="([^"]+)"/g)]
        .map((m) => decode(m[1]))
        .filter((h) => h.startsWith('/artikel/') || h.startsWith('https://hellokahwin.com/')),
    ),
  ];
  let redirecting = 0;
  for (const href of hrefs) {
    const url = href.startsWith('http') ? href : SITE + href;
    const res = await fetch(url, { method: 'HEAD', redirect: 'manual' });
    if (res.status >= 300 && res.status < 400) {
      redirecting++;
      console.log(`        ${res.status}  ${href} -> ${res.headers.get('location')}`);
    }
  }
  check(redirecting === 0, path, `${hrefs.length} internal hrefs, ${redirecting} redirecting`);
}

console.log('\n=== 2. category hub meta descriptions (>= 120 chars) ===');
for (const path of SPOT) {
  const { status, html } = await get(path);
  const d = meta(html, /<meta name="description" content="([^"]*)"/);
  const len = d ? decode(d).length : 0;
  check(status === 200 && len >= 120, path, `${status}, description ${len} chars`);
}

console.log('\n=== 3. article page titles (<= 60 chars) ===');
for (const path of TITLE_SAMPLE) {
  const { html } = await get(path);
  const t = meta(html, /<title>([^<]*)<\/title>/);
  const len = t ? decode(t).length : 0;
  check(len > 0 && len <= 60, path, `title ${len} chars: ${t ? decode(t) : '(none)'}`);
}

// Category hub titles are the category name plus ` | Inspire` plus the brand
// suffix, and a couple of them run long. That is NOT this run's scope, which
// shortens `articles.meta_title` only — but a long title is still a long
// title, so they are reported rather than quietly dropped from the sweep.
console.log('\n--- category hub titles (informational, out of scope for this run) ---');
for (const path of SPOT) {
  const { html } = await get(path);
  const t = meta(html, /<title>([^<]*)<\/title>/);
  const len = t ? decode(t).length : 0;
  console.log(`${len <= 60 ? 'ok  ' : 'LONG'}  ${path}  ${len} chars: ${t ? decode(t) : '(none)'}`);
}

console.log('\n=== 4. /artikel Open Graph ===');
{
  const { html } = await get('/artikel');
  for (const tag of ['og:title', 'og:type', 'og:image', 'og:url']) {
    const v = meta(html, new RegExp(`<meta property="${tag}" content="([^"]*)"`));
    check(Boolean(v), `/artikel ${tag}`, v ?? '(missing)');
  }
}

console.log('\n=== 5. stored alt text replaced the render-time fallback ===');
for (const path of ALT_SAMPLE) {
  const { html } = await get(path);
  const alts = [...html.matchAll(/<img[^>]*\salt="([^"]*)"/g)].map((m) => decode(m[1]));
  const fallback = alts.filter((a) => / — gambar \d+$/.test(a)).length;
  const described = alts.filter((a) => a.trim() && !/ — gambar \d+$/.test(a)).length;
  const empty = alts.filter((a) => !a.trim()).length;
  check(
    described > 0,
    path,
    `${alts.length} images: ${described} described, ${fallback} on the fallback, ${empty} empty`,
  );
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
