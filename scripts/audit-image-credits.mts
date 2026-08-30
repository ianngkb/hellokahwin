/**
 * Sweep every published article URL in the sitemap and report what the image
 * credit labels ACTUALLY say — RIGHTS-01, 31 Aug 2026.
 *
 *   pnpm --silent audit:credits                    # sweep production
 *   pnpm --silent audit:credits --base-url <url>   # sweep a preview deployment
 *   pnpm --silent audit:credits --json             # machine-readable
 *
 * Exit code 0 when every credit on every page carries the one canonical label,
 * 1 otherwise — so this can gate a deploy, which is the only form of this rule
 * that fires without a human remembering it.
 *
 * WHY IT ENUMERATES INSTEAD OF ASSERTING.
 *
 * The check that started this item was `grep -c 'Kredit'`. It returned ZERO on a
 * page carrying forty credits, because the credits were labelled in English —
 * and zero would have read as "worse than we thought" rather than "wrong regex".
 * So this script never tests for a string it expects. It extracts every
 * `<figcaption>`, takes whatever single word sits before the first colon, and
 * COUNTS what it finds. A label nobody predicted shows up as its own row.
 *
 * That is not hypothetical: the item was briefed as four casings of `source:`,
 * and the first enumeration also turned up `image: zach chin`, plus a second
 * variant axis nobody had recorded — a U+00A0 rather than a space after the
 * colon on some credits. Both would have survived a fix aimed at the four
 * casings in the brief.
 *
 * WHY IT READS THE RENDERED PAGE AND NOT THE DATABASE.
 *
 * The artefact is what the reader gets. The label is applied at render
 * (`src/lib/inspire/image-credit-label.ts`), so the database still holds
 * whatever an editor typed and is the wrong place to look for what shipped.
 * Measured on the live page before the fix, the RSC flight payload mirrors the
 * visible markup 20-for-20 with an identical variant distribution, so this
 * counts BOTH and reports them separately — a fix that cleaned the markup and
 * left the payload dirty would be visible here rather than silent.
 */

interface Args {
  baseUrl: string;
  json: boolean;
  concurrency: number;
}

function parseArgs(argv: string[]): Args {
  let baseUrl = 'https://hellokahwin.com';
  let json = false;
  let concurrency = 6;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--base-url') baseUrl = (argv[++i] ?? baseUrl).replace(/\/$/, '');
    else if (a === '--json') json = true;
    else if (a === '--concurrency') concurrency = Number(argv[++i]) || concurrency;
  }
  return { baseUrl, json, concurrency };
}

/** The one canonical label, from style guide §13.1, duplicated as a literal ON
 * PURPOSE.
 *
 * Importing `CREDIT_LABEL` would make the check agree with the renderer by
 * construction — change the constant to anything and both would move together
 * and the audit would still pass. A sweep that cannot disagree with the code it
 * audits is not a check. Change this line deliberately, after the style guide. */
const EXPECTED_LABEL = 'Kredit';

/** Label words that are UNAMBIGUOUSLY an image credit.
 *
 * Mirrors the strip list in `src/lib/inspire/image-credit-label.ts`, and omits
 * the same three words for the same reason. `Sumber:` cites a FACT on this site
 * — 87 occurrences in body prose naming enactments and council rate sheets;
 * `Jurugambar:` is a line in the body's "Kredit Vendor" block on the 17
 * real-wedding articles; `Grafik:` is a permitted specialisation under §13.1.
 * Counting any of them as a wrong image-credit label — which an earlier version
 * of this script did, reporting 23 and 13 phantom defects — makes the audit
 * demand a change that would corrupt the page. */
const CREDIT_LABEL_WORDS =
  /^(source|sources|credit|credits|kredit|photo|photos|foto|image|images|imej|gambar|picture|pic|courtesy|photography|photographer)$/i;

interface PageResult {
  url: string;
  status: number;
  /** label word + colon → count, in the visible markup */
  markup: Map<string, number>;
  /** same, inside the RSC flight payload */
  payload: Map<string, number>;
  /** figcaptions carrying a credit whose separator is not a plain U+0020 */
  oddSeparators: number;
  /** <img> on the page that no figcaption credits */
  images: number;
  captions: number;
  /** captions that are not a `word:` credit at all, verbatim */
  unlabelled: string[];
  /**
   * The article carries a "Kredit Vendor" block in the BODY — the imported
   * real-wedding format, which credits the whole photo set once in prose
   * (`Lokasi:`, `Jurugambar:`, `Juruvideo:`) instead of per image. Those photos
   * are attributable; they are not per-image captioned. Reporting the two as
   * one number would overstate how much of the library is untraceable.
   */
  vendorCreditBlock: boolean;
}

function bump(m: Map<string, number>, k: string) {
  m.set(k, (m.get(k) ?? 0) + 1);
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

/** Spans of the document occupied by `self.__next_f.push(...)` flight scripts. */
function payloadSpans(html: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  const re = /<script[^>]*>\s*self\.__next_f\.push\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const end = html.indexOf('</script>', m.index);
    spans.push([m.index, end === -1 ? html.length : end]);
  }
  return spans;
}

async function auditPage(url: string): Promise<PageResult> {
  const res = await fetch(url, { headers: { 'user-agent': 'hellokahwin-credit-audit' } });
  const html = res.ok ? await res.text() : '';
  const r: PageResult = {
    url,
    status: res.status,
    markup: new Map(),
    payload: new Map(),
    oddSeparators: 0,
    images: (html.match(/<img\b/g) ?? []).length,
    captions: 0,
    unlabelled: [],
    vendorCreditBlock: false,
  };
  if (!res.ok) return r;

  const spans = payloadSpans(html);
  const inPayload = (i: number) => spans.some(([a, b]) => i >= a && i < b);

  // 1. Every label word before a colon, ANYWHERE on the page, bucketed by where
  //    it sits. This is the enumeration — no expected string appears in it.
  // The separator class is spelled with escapes on purpose: U+00A0 is one of
  // the things being counted, and a literal one here would be invisible in
  // review — which is exactly how it survived unnoticed in the data.
  const labelRe = /(?:^|[">\\])\s*([A-Za-z\u00c0-\u024f]+)\s*:([ \u00a0\t])/g;
  let m: RegExpExecArray | null;
  while ((m = labelRe.exec(html))) {
    const word = m[1];
    // Only consider it a credit label if it is unambiguously one.
    if (!CREDIT_LABEL_WORDS.test(word)) continue;
    bump(inPayload(m.index) ? r.payload : r.markup, `${word}:`);
    if (m[2] !== ' ') r.oddSeparators++;
  }

  r.vendorCreditBlock =
    /Kredit\s*(?:<[^>]+>\s*)?Vendor/i.test(html) || /Jurugambar\s*:/i.test(html);

  // 2. Figcaption census, for the uncredited count.
  const capRe = /<figcaption[^>]*>([\s\S]*?)<\/figcaption>/g;
  while ((m = capRe.exec(html))) {
    const text = stripTags(m[1]).replace(/\s+/g, ' ').trim();
    if (!text) continue;
    // The cover figcaption also holds the "Lihat semua foto (N)" gallery button;
    // it is chrome, not a caption.
    if (/^Lihat semua foto/.test(text)) continue;
    r.captions++;
    if (!/^[A-Za-z\u00c0-\u024f]+\s*:\s*\S/.test(text)) r.unlabelled.push(text);
  }
  return r;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (;;) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

async function main() {
  const { baseUrl, json, concurrency } = parseArgs(process.argv.slice(2));

  const sitemap = await fetch(`${baseUrl}/sitemap.xml`);
  if (!sitemap.ok) {
    console.error(`  - sitemap.xml returned ${sitemap.status} at ${baseUrl}`);
    process.exit(1);
  }
  const xml = await sitemap.text();
  const all = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  // An article is /artikel/<category>/<slug> — two segments. One segment is a
  // category index and carries no article images.
  const articles = all.filter((u) => /\/artikel\/[^/]+\/[^/]+$/.test(u));

  console.log(`sweeping ${articles.length} article URLs at ${baseUrl}\n`);

  const results = await mapLimit(articles, concurrency, auditPage);

  const markup = new Map<string, number>();
  const payload = new Map<string, number>();
  let oddSeparators = 0;
  let images = 0;
  let captions = 0;
  const failedPages: string[] = [];
  const uncredited: Array<{
    url: string;
    images: number;
    captions: number;
    vendorCreditBlock: boolean;
  }> = [];
  const unlabelled: Array<{ url: string; text: string }> = [];

  for (const r of results) {
    if (r.status !== 200) {
      failedPages.push(`${r.url} → ${r.status}`);
      continue;
    }
    for (const [k, v] of r.markup) markup.set(k, (markup.get(k) ?? 0) + v);
    for (const [k, v] of r.payload) payload.set(k, (payload.get(k) ?? 0) + v);
    oddSeparators += r.oddSeparators;
    images += r.images;
    captions += r.captions;
    for (const t of r.unlabelled) unlabelled.push({ url: r.url, text: t });
    if (r.captions === 0)
      uncredited.push({
        url: r.url,
        images: r.images,
        captions: r.captions,
        vendorCreditBlock: r.vendorCreditBlock,
      });
  }

  const rows = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const wrongMarkup = rows(markup).filter(([k]) => k !== `${EXPECTED_LABEL}:`);
  const wrongPayload = rows(payload).filter(([k]) => k !== `${EXPECTED_LABEL}:`);

  if (json) {
    console.log(
      JSON.stringify(
        {
          baseUrl,
          articles: articles.length,
          markup: Object.fromEntries(rows(markup)),
          payload: Object.fromEntries(rows(payload)),
          oddSeparators,
          images,
          captions,
          uncreditedPages: uncredited,
          unlabelled,
          failedPages,
        },
        null,
        2,
      ),
    );
  } else {
    console.log('LABEL VARIANTS — visible markup');
    for (const [k, v] of rows(markup)) console.log(`  ${String(v).padStart(5)}  ${k}`);
    if (markup.size === 0) console.log('    (none)');
    console.log('\nLABEL VARIANTS — RSC flight payload');
    for (const [k, v] of rows(payload)) console.log(`  ${String(v).padStart(5)}  ${k}`);
    if (payload.size === 0) console.log('    (none)');

    console.log(`\nseparator after the colon that is not U+0020: ${oddSeparators}`);
    console.log(`<img> across all article pages:                ${images}`);
    console.log(`credit figcaptions:                            ${captions}`);

    const noneAtAll = uncredited.filter((u) => !u.vendorCreditBlock);
    console.log(
      `\nARTICLE PAGES WITH ZERO PER-IMAGE CREDIT CAPTIONS: ${uncredited.length}` +
        ` — ${uncredited.length - noneAtAll.length} credited once via a body "Kredit Vendor"` +
        ` block, ${noneAtAll.length} with no credit anywhere`,
    );
    for (const u of uncredited) {
      console.log(
        `  ${u.url.replace(baseUrl, '')}  (${u.images} <img>)` +
          (u.vendorCreditBlock ? '  [Kredit Vendor block in body]' : '  [NO CREDIT ANYWHERE]'),
      );
    }

    if (unlabelled.length) {
      console.log(`\nCAPTIONS THAT ARE NOT A \`word:\` CREDIT: ${unlabelled.length}`);
      for (const u of unlabelled.slice(0, 30)) {
        console.log(`  ${u.url.replace(baseUrl, '')} — ${JSON.stringify(u.text.slice(0, 80))}`);
      }
    }
    if (failedPages.length) {
      console.log(`\nPAGES THAT DID NOT RETURN 200: ${failedPages.length}`);
      for (const f of failedPages) console.log(`  ${f}`);
    }
  }

  const problems = wrongMarkup.length + wrongPayload.length + oddSeparators + failedPages.length;
  if (problems > 0) {
    console.error(
      `\nFAIL — ${wrongMarkup.length} non-canonical label variant(s) in markup, ` +
        `${wrongPayload.length} in the flight payload, ${oddSeparators} odd separator(s), ` +
        `${failedPages.length} page(s) not 200. Expected one label: "${EXPECTED_LABEL}:".`,
    );
    process.exit(1);
  }
  console.log(
    `\nPASS — every credit on ${articles.length} article pages reads "${EXPECTED_LABEL}: ".`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
