// UI-04 rendered audit harness.
// Real Chromium, exact CSS-px viewports, matchMedia asserted at every width.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire('C:/Users/Ian Ng/Documents/Code/thepicklebase/');
const { chromium } = require('playwright');

const OUT = process.argv[2];
const SHOTS = path.join(OUT, 'screens');
fs.mkdirSync(SHOTS, { recursive: true });

const BASE = 'https://hellokahwin.com';
const TEMPLATES = [
  { key: 'homepage', url: '/' },
  { key: 'article', url: '/artikel/idea-dan-nasihat/garden-wedding' },
  { key: 'category', url: '/artikel/hantaran-mas-kahwin' },
  { key: 'artikel-index', url: '/artikel' },
  { key: 'dewan-kahwin', url: '/dewan-kahwin' },
  { key: 'search-404', url: '/cari' },
];
const WIDTHS = [
  { w: 390, h: 844 },
  { w: 768, h: 1024 },
  { w: 1024, h: 900 },
  { w: 1440, h: 900 },
];

const MEASURE = () => {
  const vw = window.innerWidth;
  const round = (n) => Math.round(n * 100) / 100;

  const mq = {
    'max-width:389px': matchMedia('(max-width:389px)').matches,
    'min-width:390px': matchMedia('(min-width:390px)').matches,
    'max-width:767px': matchMedia('(max-width:767px)').matches,
    'min-width:768px': matchMedia('(min-width:768px)').matches,
    'max-width:1023px': matchMedia('(max-width:1023px)').matches,
    'min-width:1024px': matchMedia('(min-width:1024px)').matches,
    'min-width:1280px': matchMedia('(min-width:1280px)').matches,
  };

  const all = Array.from(document.querySelectorAll('body *'));
  const vis = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  // --- horizontal overflow -------------------------------------------------
  const de = document.documentElement;
  const overflow = {
    innerWidth: vw,
    documentScrollWidth: de.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    overflowPx: Math.max(de.scrollWidth, document.body.scrollWidth) - vw,
    canScrollHorizontally: de.scrollWidth > de.clientWidth + 1,
  };

  const inScroller = (el) => {
    let p = el.parentElement;
    while (p && p !== document.body) {
      const cs = getComputedStyle(p);
      if (cs.overflowX === 'auto' || cs.overflowX === 'scroll' || cs.overflowX === 'hidden') return true;
      p = p.parentElement;
    }
    return false;
  };

  const pastEdge = all
    .filter(vis)
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.right > vw + 1 || r.left < -1)
    .map(({ el, r }) => ({
      sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''),
      left: round(r.left),
      right: round(r.right),
      width: round(r.width),
      overhang: round(r.right - vw),
      clippedByAncestor: inScroller(el),
      text: (el.textContent || '').trim().slice(0, 60),
    }))
    .filter((o) => !o.clippedByAncestor)
    .sort((a, b) => b.overhang - a.overhang)
    .slice(0, 25);

  // --- narrow text columns (the 44px-headline class of defect) -------------
  const textish = all.filter((el) => {
    if (!vis(el)) return false;
    const t = (el.textContent || '').trim();
    if (t.length < 12) return false;
    // leaf-ish: no child element that itself holds most of the text
    const kids = Array.from(el.children);
    if (kids.some((k) => (k.textContent || '').trim().length >= t.length * 0.9)) return false;
    return true;
  });
  const narrowText = textish
    .map((el) => ({ el, r: el.getBoundingClientRect(), cs: getComputedStyle(el) }))
    .filter(({ r, cs }) => r.width < 120 && r.height > r.width * 1.5 && cs.writingMode.startsWith('horizontal'))
    .map(({ el, r, cs }) => ({
      sel: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''),
      width: round(r.width),
      height: round(r.height),
      ratio: round(r.height / r.width),
      fontSize: cs.fontSize,
      text: (el.textContent || '').trim().slice(0, 70),
    }))
    .sort((a, b) => a.width - b.width)
    .slice(0, 20);

  // --- images --------------------------------------------------------------
  const imgs = Array.from(document.querySelectorAll('img')).map((img) => {
    const r = img.getBoundingClientRect();
    return {
      src: (img.currentSrc || img.src || '').slice(-90),
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      renderedWidth: round(r.width),
      renderedHeight: round(r.height),
      upscale: img.naturalWidth ? round(r.width / img.naturalWidth) : null,
      loading: img.loading,
      complete: img.complete,
      objectFit: getComputedStyle(img).objectFit,
      srcAspect: img.naturalWidth ? round(img.naturalWidth / img.naturalHeight) : null,
      boxAspect: r.height ? round(r.width / r.height) : null,
      alt: img.alt,
    };
  });
  const upscaled = imgs.filter((i) => i.upscale && i.upscale > 1.1 && i.renderedWidth > 40);
  const cropped = imgs.filter(
    (i) => i.srcAspect && i.boxAspect && i.objectFit === 'cover' && Math.abs(i.srcAspect - i.boxAspect) / i.srcAspect > 0.35 && i.renderedWidth > 200,
  );

  // --- tap targets ---------------------------------------------------------
  const tappable = Array.from(document.querySelectorAll('a,button,[role="button"],input,select,summary')).filter(vis);
  const smallTargets = tappable
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.width < 44 || r.height < 44)
    .map(({ el, r }) => ({
      sel: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''),
      width: round(r.width),
      height: round(r.height),
      text: (el.textContent || '').trim().slice(0, 40),
    }))
    .sort((a, b) => a.width * a.height - b.width * b.height)
    .slice(0, 25);

  // --- small type ----------------------------------------------------------
  const smallType = textish
    .map((el) => ({ el, cs: getComputedStyle(el) }))
    .filter(({ cs }) => parseFloat(cs.fontSize) < 12)
    .map(({ el, cs }) => ({
      sel: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''),
      fontSize: cs.fontSize,
      text: (el.textContent || '').trim().slice(0, 50),
    }))
    .slice(0, 15);

  // --- nav -----------------------------------------------------------------
  const navEl = document.querySelector('header nav, nav');
  const nav = navEl
    ? (() => {
        const r = navEl.getBoundingClientRect();
        const links = Array.from(navEl.querySelectorAll('a')).filter(vis).map((a) => {
          const lr = a.getBoundingClientRect();
          return { text: (a.textContent || '').trim().slice(0, 40), left: round(lr.left), right: round(lr.right), offscreen: lr.right > vw + 1 };
        });
        return { width: round(r.width), scrollWidth: navEl.scrollWidth, clientWidth: navEl.clientWidth, overflowX: getComputedStyle(navEl).overflowX, links };
      })()
    : null;

  // --- .s-row component ----------------------------------------------------
  const sRows = Array.from(document.querySelectorAll('.s-row')).map((row) => {
    const cs = getComputedStyle(row);
    const kids = Array.from(row.children).map((k) => {
      const r = k.getBoundingClientRect();
      return {
        tag: k.tagName.toLowerCase(),
        cls: typeof k.className === 'string' ? k.className.trim().slice(0, 40) : '',
        width: round(r.width),
        height: round(r.height),
        gridColumn: getComputedStyle(k).gridColumnStart,
        text: (k.textContent || '').trim().slice(0, 40),
      };
    });
    return { templateColumns: cs.gridTemplateColumns, childCount: row.children.length, kids };
  });

  // --- reading measure -----------------------------------------------------
  const paras = Array.from(document.querySelectorAll('article p, main p')).filter(vis).slice(0, 40);
  const measures = paras.map((p) => {
    const r = p.getBoundingClientRect();
    const cs = getComputedStyle(p);
    const fs = parseFloat(cs.fontSize);
    return { width: round(r.width), fontSize: fs, cpl: round(r.width / (fs * 0.5)) };
  });

  // --- body scroll height --------------------------------------------------
  return {
    mq,
    innerWidth: window.innerWidth,
    outerWidth: window.outerWidth,
    innerHeight: window.innerHeight,
    dpr: devicePixelRatio,
    scrollHeight: de.scrollHeight,
    overflow,
    pastEdge,
    narrowText,
    imgCount: imgs.length,
    imgs,
    upscaled,
    cropped,
    smallTargets,
    smallType,
    nav,
    sRows,
    measures,
    title: document.title,
    h1: Array.from(document.querySelectorAll('h1')).map((h) => (h.textContent || '').trim().slice(0, 80)),
  };
};

const results = [];

const browser = await chromium.launch({
  executablePath: 'C:/Users/Ian Ng/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe',
});

for (const t of TEMPLATES) {
  for (const { w, h } of WIDTHS) {
    const isMobileWidth = w < 768;
    const ctx = await browser.newContext({
      viewport: { width: w, height: h },
      deviceScaleFactor: 1,
      isMobile: isMobileWidth,
      hasTouch: isMobileWidth,
      userAgent: isMobileWidth
        ? 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36'
        : undefined,
    });
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200));
    });
    const failed = [];
    page.on('requestfailed', (r) => failed.push(r.url().slice(-90) + ' :: ' + (r.failure()?.errorText || '')));

    const resp = await page.goto(BASE + t.url, { waitUntil: 'networkidle', timeout: 60000 }).catch((e) => ({ err: e.message }));
    const status = resp && resp.status ? resp.status() : null;
    const finalUrl = page.url();

    // trigger lazy-loaded images, then return to top
    await page.evaluate(async () => {
      const step = Math.round(window.innerHeight * 0.8);
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 400));
    });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(700);

    const m = await page.evaluate(MEASURE);

    const base = `${t.key}-${w}`;
    await page.screenshot({ path: path.join(SHOTS, `${base}-full.png`), fullPage: true });
    await page.screenshot({ path: path.join(SHOTS, `${base}-fold.png`), fullPage: false });

    results.push({ template: t.key, url: t.url, finalUrl, status, viewportRequested: w, ...m, consoleErrors: consoleErrors.slice(0, 10), failedRequests: failed.slice(0, 10) });
    console.log(
      `${t.key.padEnd(14)} ${String(w).padStart(4)}  inner=${m.innerWidth} mq<1024=${m.mq['max-width:1023px']} mq>=1024=${m.mq['min-width:1024px']}  overflow=${m.overflow.overflowPx}px  narrowText=${m.narrowText.length}  imgs=${m.imgCount}  upscaled=${m.upscaled.length}`,
    );
    await ctx.close();
  }
}

await browser.close();
fs.writeFileSync(path.join(OUT, 'measurements.json'), JSON.stringify(results, null, 2));
console.log('\nWROTE ' + path.join(OUT, 'measurements.json'));
