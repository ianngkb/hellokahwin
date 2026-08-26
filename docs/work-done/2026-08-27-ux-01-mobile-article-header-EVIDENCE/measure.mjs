import { chromium } from 'playwright-core';

const url = process.argv[2];
const shot = process.argv[3] || null;
const label = process.argv[4] || 'measure';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
// iPhone 12/13/14 logical viewport: 390 x 844 CSS px.
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForTimeout(1200);

const data = await page.evaluate(() => {
  const out = {};
  out.viewport = { w: window.innerWidth, h: window.innerHeight };

  const header = document.querySelector('header');
  if (!header) {
    out.header = null;
  } else {
    const cs = getComputedStyle(header);
    const r = header.getBoundingClientRect();
    out.header = {
      display: cs.display,
      visibility: cs.visibility,
      position: cs.position,
      rect: { top: r.top, height: r.height, width: r.width },
      brandText: header.querySelector('a[href="/"]')?.textContent?.trim() ?? null,
      navCount: header.querySelectorAll('nav').length,
    };
  }

  const navAnchors = [...document.querySelectorAll('header nav a')];
  out.headerNavA = {
    count: navAnchors.length,
    items: navAnchors.map((a) => {
      const cs = getComputedStyle(a);
      const r = a.getBoundingClientRect();
      return {
        text: a.textContent.trim().slice(0, 28),
        href: a.getAttribute('href'),
        minHeight: cs.minHeight,
        computedHeight: Math.round(r.height * 100) / 100,
        display: cs.display,
      };
    }),
  };

  // Mobile cover
  const coverImg = document.querySelector('img[fetchpriority="high"], img[loading="eager"]');
  const coverBox =
    document.querySelector('[data-mobile-cover]') ||
    (coverImg ? coverImg.closest('div') : null);
  if (coverBox) {
    const cs = getComputedStyle(coverBox);
    const r = coverBox.getBoundingClientRect();
    out.cover = {
      aspectRatioCss: cs.aspectRatio,
      width: Math.round(r.width * 100) / 100,
      height: Math.round(r.height * 100) / 100,
      ratioWbyH: Math.round((r.width / r.height) * 1000) / 1000,
      top: Math.round(r.top * 100) / 100,
      bottom: Math.round(r.bottom * 100) / 100,
    };
  } else {
    out.cover = null;
  }

  // First body paragraph of the article
  const art = document.querySelector('article');
  let firstP = null;
  if (art) {
    const ps = [...art.querySelectorAll('p')].filter(
      (p) => p.textContent.trim().length > 60 && p.offsetParent !== null,
    );
    if (ps.length) {
      const r = ps[0].getBoundingClientRect();
      firstP = {
        text: ps[0].textContent.trim().slice(0, 90),
        top: Math.round(r.top * 100) / 100,
        aboveFold: r.top < window.innerHeight,
        pxAboveFold: Math.round((window.innerHeight - r.top) * 100) / 100,
      };
    }
  }
  out.firstParagraph = firstP;

  // Bottom bar (fixed, bottom:0)
  const fixedBottom = [...document.querySelectorAll('body *')].filter((el) => {
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed') return false;
    const r = el.getBoundingClientRect();
    return r.bottom >= window.innerHeight - 2 && r.height > 10 && r.width > 200 && cs.display !== 'none';
  });
  out.bottomBar = fixedBottom.map((el) => {
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName.toLowerCase(),
      cls: el.className.toString().slice(0, 90),
      text: el.textContent.trim().slice(0, 120),
      height: Math.round(r.height * 100) / 100,
      links: [...el.querySelectorAll('a')].map((a) => ({
        text: a.textContent.trim().slice(0, 40),
        href: a.getAttribute('href'),
        h: Math.round(a.getBoundingClientRect().height * 100) / 100,
      })),
    };
  });

  out.docHeight = document.documentElement.scrollHeight;
  const footer = document.querySelector('footer');
  out.footerTop = footer ? Math.round(footer.getBoundingClientRect().top) : null;
  return out;
});

console.log('### ' + label + ' :: ' + url);
console.log(JSON.stringify(data, null, 2));

if (shot) {
  await page.screenshot({ path: shot });
  console.log('SCREENSHOT: ' + shot);
  await page.screenshot({ path: shot.replace(/\.png$/, '-full.png'), fullPage: false });
}
await browser.close();
