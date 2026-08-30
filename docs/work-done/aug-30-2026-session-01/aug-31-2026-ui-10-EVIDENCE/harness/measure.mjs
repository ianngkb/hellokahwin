// UI-10 measure harness. Derived from UI-04's harness/audit.mjs (same rig,
// same matchMedia assertion, same cpl formula width / (font-size * 0.5)).
// Adds: per-paragraph font FAMILY, the column geometry that produces the
// width, a true-glyph measure, and 1920 which UI-04 did not capture.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire('C:/Users/Ian Ng/Documents/Code/thepicklebase/');
const { chromium } = require('playwright');

const BASE = process.argv[2]; // e.g. https://hellokahwin.com
const OUT = process.argv[3]; // out dir
const TAG = process.argv[4] || 'run';
const SHOTS = path.join(OUT, 'screens');
fs.mkdirSync(SHOTS, { recursive: true });

const URL_PATH = '/artikel/idea-dan-nasihat/garden-wedding';
const WIDTHS = [
  { w: 390, h: 844 },
  { w: 768, h: 1024 },
  { w: 1024, h: 900 },
  { w: 1440, h: 900 },
  { w: 1920, h: 1080 },
];

const MEASURE = () => {
  const vw = window.innerWidth;
  const round = (n) => Math.round(n * 100) / 100;

  const mq = {
    'max-width:767px': matchMedia('(max-width:767px)').matches,
    'min-width:768px': matchMedia('(min-width:768px)').matches,
    'max-width:1023px': matchMedia('(max-width:1023px)').matches,
    'min-width:1024px': matchMedia('(min-width:1024px)').matches,
    'min-width:1280px': matchMedia('(min-width:1280px)').matches,
    'min-width:1536px': matchMedia('(min-width:1536px)').matches,
  };

  const vis = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  const desc = (el) =>
    el.tagName.toLowerCase() +
    (el.id ? '#' + el.id : '') +
    (typeof el.className === 'string' && el.className.trim()
      ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
      : '');

  // --- UI-04's exact query and formula, unchanged --------------------------
  const ui04 = Array.from(document.querySelectorAll('article p, main p'))
    .filter(vis)
    .slice(0, 40)
    .map((p) => {
      const r = p.getBoundingClientRect();
      const cs = getComputedStyle(p);
      const fsz = parseFloat(cs.fontSize);
      return {
        width: round(r.width),
        fontSize: fsz,
        cpl: round(r.width / (fsz * 0.5)),
        left: round(r.left),
        right: round(r.right),
        family: cs.fontFamily.split(',')[0].replace(/["']/g, ''),
        lineHeight: cs.lineHeight,
        sel: desc(p),
        text: (p.textContent || '').trim().slice(0, 48),
      };
    });

  // --- the article BODY column only (inside .inspire-prose) ---------------
  const bodyParas = Array.from(document.querySelectorAll('.inspire-prose p'))
    .filter(vis)
    .filter((p) => (p.textContent || '').trim().length >= 40)
    .filter((p) => !p.closest('figure, figcaption, nav, aside, blockquote'))
    .map((p) => {
      const r = p.getBoundingClientRect();
      const cs = getComputedStyle(p);
      const fsz = parseFloat(cs.fontSize);
      return {
        width: round(r.width),
        fontSize: fsz,
        cpl: round(r.width / (fsz * 0.5)),
        left: round(r.left),
        family: cs.fontFamily.split(',')[0].replace(/["']/g, ''),
        lineHeight: cs.lineHeight,
        text: (p.textContent || '').trim().slice(0, 40),
      };
    });

  // --- true glyph measure -------------------------------------------------
  // Divides the paragraph width by the ACTUAL average advance width of this
  // article's own Malay prose in the paragraph's own computed font, rather
  // than by the 0.5em the DoD formula assumes.
  // NOTE, 31 Ogos 2026: this used `document.querySelector('.inspire-prose p')`
  // — the first p in DOM order, which on this article is a CAPTION inside a
  // figure, set in a different family. It reported 0.5406em and an identical
  // trueCpl of 70.3 at both 1440 and 1920 while the body widths were 888 and
  // 1144, which is arithmetically impossible for one element and is what gave
  // it away. It now measures the same paragraph set `bodyParas` measures.
  let trueCpl = null;
  let avgAdvanceEm = null;
  const bodySource = Array.from(document.querySelectorAll('.inspire-prose p'))
    .filter(vis)
    .filter((p) => (p.textContent || '').trim().length >= 40)
    .filter((p) => !p.closest('figure, figcaption, nav, aside, blockquote'));
  const first = bodySource[0];
  if (first) {
    const cs = getComputedStyle(first);
    const cv = document.createElement('canvas').getContext('2d');
    cv.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    const sample = bodySource
      .map((p) => (p.textContent || '').trim())
      .join(' ')
      .slice(0, 6000);
    if (sample.length > 200) {
      const avg = cv.measureText(sample).width / sample.length;
      avgAdvanceEm = round((avg / parseFloat(cs.fontSize)) * 1000) / 1000;
      trueCpl = round(first.getBoundingClientRect().width / avg);
    }
  }

  // --- column geometry ----------------------------------------------------
  const shell = document.querySelector('.hk.container') || document.querySelector('.container');
  const grid = document.querySelector('.inspire-editorial .grid');
  const artEl = document.querySelector('.inspire-editorial article');
  const proseEl = document.querySelector('.inspire-prose');
  const headEl = document.querySelector('.inspire-editorial > header');
  const figEl = document.querySelector('.inspire-editorial > figure');
  const asideEl = document.querySelector('.inspire-editorial .grid > div:last-child');
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      sel: desc(el),
      left: round(r.left),
      right: round(r.right),
      width: round(r.width),
      maxWidth: cs.maxWidth,
      paddingLeft: cs.paddingLeft,
      paddingRight: cs.paddingRight,
      gridTemplateColumns: cs.gridTemplateColumns,
      gap: cs.gap,
      marginInline: cs.marginLeft + ' / ' + cs.marginRight,
    };
  };

  const proseFigs = Array.from(document.querySelectorAll('.inspire-prose figure, .inspire-prose img'))
    .filter(vis)
    .slice(0, 8)
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { sel: desc(el), left: round(r.left), width: round(r.width) };
    });

  const headings = Array.from(document.querySelectorAll('.inspire-prose h2, .inspire-prose h3'))
    .filter(vis)
    .slice(0, 6)
    .map((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        width: round(r.width),
        left: round(r.left),
        fontSize: parseFloat(cs.fontSize),
        text: (el.textContent || '').trim().slice(0, 40),
      };
    });

  const de = document.documentElement;
  return {
    mq,
    innerWidth: vw,
    dpr: devicePixelRatio,
    overflowPx: Math.max(de.scrollWidth, document.body.scrollWidth) - vw,
    scrollHeight: de.scrollHeight,
    geometry: {
      shell: box(shell),
      grid: box(grid),
      article: box(artEl),
      prose: box(proseEl),
      header: box(headEl),
      coverFigure: box(figEl),
      sidebar: box(asideEl),
    },
    proseFigs,
    headings,
    bodyParaCount: bodyParas.length,
    bodyParas,
    ui04MeasureSet: ui04,
    h1: Array.from(document.querySelectorAll('h1')).map((h) => (h.textContent || '').trim().slice(0, 60)),
    h2Count: document.querySelectorAll('.inspire-prose h2').length,
    h3Count: document.querySelectorAll('.inspire-prose h3').length,
    imgCount: document.querySelectorAll('img').length,
    linkCount: document.querySelectorAll('a').length,
    trueCpl,
    avgAdvanceEm,
    buildId: (() => {
      const s = document.querySelector('script[src*="/_next/static/"]');
      const m = s && s.src.match(/_next\/static\/([^/]+)\//);
      return m ? m[1] : null;
    })(),
    title: document.title,
  };
};

const results = [];
const browser = await chromium.launch({
  executablePath:
    'C:/Users/Ian Ng/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe',
});

for (const { w, h } of WIDTHS) {
  const isMobileWidth = w < 768;
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 1,
    isMobile: isMobileWidth,
    hasTouch: isMobileWidth,
    // Vercel preview deployments sit behind team SSO: an unauthenticated GET is
    // a 302 to vercel.com/sso-api, not the page. The bypass secret
    // (vault `vercelbypass.hellokahwin`) is injected as an env var by
    // vault.ps1 run, so it never reaches a command line. Absent on production.
    extraHTTPHeaders: process.env.VERCEL_BYPASS
      ? { 'x-vercel-protection-bypass': process.env.VERCEL_BYPASS, 'x-vercel-set-bypass-cookie': 'true' }
      : {},
    userAgent: isMobileWidth
      ? 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36'
      : undefined,
  });
  const page = await ctx.newPage();
  const resp = await page.goto(BASE + URL_PATH, { waitUntil: 'networkidle', timeout: 90000 });
  const status = resp ? resp.status() : null;
  const cache = resp ? resp.headers()['x-vercel-cache'] || null : null;

  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 90));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 400));
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);

  const m = await page.evaluate(MEASURE);
  if (m.innerWidth !== w) throw new Error('ASSERT FAIL: asked ' + w + ', innerWidth ' + m.innerWidth);
  // A status code is not evidence. Assert the page STRUCTURALLY against the
  // production shape measured 31 Ogos 2026: 21 h2, 51 img, 71 a, one h1.
  if (!m.geometry.prose) throw new Error('ASSERT FAIL: no .inspire-prose at ' + w + ' — url ' + page.url());
  if (m.h2Count !== 21 || m.imgCount !== 51 || m.h1.length !== 1)
    throw new Error('ASSERT FAIL: shape drift at ' + w + ' — h2=' + m.h2Count + ' img=' + m.imgCount + ' h1=' + m.h1.length);

  await page.screenshot({ path: path.join(SHOTS, TAG + '-article-' + w + 'px-fold.png'), fullPage: false });
  const pr = await page.evaluate(() => {
    const el = document.querySelector('.inspire-prose');
    const r = el.getBoundingClientRect();
    return { y: r.top + window.scrollY };
  });
  await page.evaluate((y) => window.scrollTo(0, y - 20), pr.y);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SHOTS, TAG + '-article-' + w + 'px-body.png'), fullPage: false });

  const cpls = m.bodyParas.map((x) => x.cpl);
  results.push({ tag: TAG, base: BASE, viewportRequested: w, status, xVercelCache: cache, ...m });
  console.log(
    TAG +
      ' ' +
      String(w).padStart(4) +
      '  inner=' + m.innerWidth +
      ' mq>=1024=' + m.mq['min-width:1024px'] +
      '  body n=' + m.bodyParaCount +
      ' w=' + (m.bodyParas[0] ? m.bodyParas[0].width : '-') +
      ' fs=' + (m.bodyParas[0] ? m.bodyParas[0].fontSize : '-') +
      '  cpl ' + (cpls.length ? Math.min(...cpls) : '-') + '-' + (cpls.length ? Math.max(...cpls) : '-') +
      '  trueCpl=' + m.trueCpl +
      ' (avg ' + m.avgAdvanceEm + 'em)' +
      '  overflow=' + m.overflowPx +
      '  build=' + m.buildId,
  );
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'measure-' + TAG + '.json'), JSON.stringify(results, null, 2));
console.log('WROTE ' + path.join(OUT, 'measure-' + TAG + '.json'));
