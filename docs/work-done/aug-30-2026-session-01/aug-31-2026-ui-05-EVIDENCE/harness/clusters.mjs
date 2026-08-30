/** True per-pillar cluster census, read from the DOM, not from HTML text.
 * The served document contains the page TWICE - rendered HTML plus the RSC
 * flight payload in <script> - so any grep over the raw text double-counts. */
import { chromium } from 'playwright-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const slugs = [
  'busana-pengantin', 'hantaran-mas-kahwin', 'nikah-undang-undang',
  'pelamin-kad-cenderahati', 'sebelum-nikah', 'ucapan-doa', 'venue-perancangan',
];
const b = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
let totEmpty = 0, totClusters = 0, pillarsWithEmpty = 0;
console.log('slug'.padEnd(26), 'clusters', 'empty', 'links', 'img', 'promiseRule');
for (const s of slugs) {
  await p.goto(`https://hellokahwin.com/artikel/${s}`, { waitUntil: 'networkidle', timeout: 60000 });
  const r = await p.evaluate(() => {
    const secs = [...document.querySelectorAll('section[aria-labelledby^="cluster-"]')];
    const promises = [...document.querySelectorAll('p.s-meta')].filter((e) =>
      /akan datang tidak lama lagi/.test(e.textContent));
    const one = promises[0] ? getComputedStyle(promises[0]) : null;
    const wrap = promises[0]?.parentElement ? getComputedStyle(promises[0].parentElement) : null;
    return {
      clusters: secs.length,
      empty: promises.length,
      links: document.querySelectorAll('a.s-pillar-link').length,
      img: document.querySelectorAll('img').length,
      pad: one?.paddingTop + '/' + one?.paddingBottom,
      borderBottom: one?.borderBottomWidth,
      wrapBorderTop: wrap?.borderTopWidth,
      wrapMarginTop: wrap?.marginTop,
    };
  });
  totEmpty += r.empty; totClusters += r.clusters; if (r.empty) pillarsWithEmpty++;
  console.log(s.padEnd(26), String(r.clusters).padStart(8), String(r.empty).padStart(5),
    String(r.links).padStart(5), String(r.img).padStart(3),
    r.empty ? `pad ${r.pad} bb ${r.borderBottom} wrap-bt ${r.wrapBorderTop} mt ${r.wrapMarginTop}` : '-');
}
console.log(`\nTOTAL clusters=${totClusters} emptyClusters=${totEmpty} pillarsWithEmptyClusters=${pillarsWithEmpty}`);
await b.close();
