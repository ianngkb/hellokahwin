/**
 * UI-03 hero measurement rig — the DoD instrument.
 *
 * ⚠ NEVER use img.naturalWidth on an element carrying a srcset with `w`
 * descriptors. Per HTML spec naturalWidth returns intrinsic width DIVIDED by the
 * current pixel density the browser derived from `sizes`. Measured on
 * hellokahwin.com 31 Aug 2026: the hero reported naturalWidth 390 at a 390px
 * viewport while the served low.webp is genuinely 1200px wide — because
 * sizes=100vw and the candidate was 1200w, giving density 3.077 and 1200/3.077
 * = 390. Any "upscale = boxWidth / naturalWidth" check on a srcset image
 * therefore returns ~1.0 BY CONSTRUCTION and can never fire. Intrinsic size is
 * read here from a detached Image() loaded from currentSrc, which is unaffected.
 */
import { chromium } from 'playwright-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const url = process.argv[2];
const label = process.argv[3] ?? 'measure';
const VIEWS = [
  { name: 'desktop-1920', width: 1920, height: 900, dpr: 1, mobile: false },
  { name: 'desktop-1440', width: 1440, height: 900, dpr: 1, mobile: false },
  { name: 'desktop-1280', width: 1280, height: 800, dpr: 1, mobile: false },
  { name: 'tablet-768', width: 768, height: 1024, dpr: 2, mobile: true },
  { name: 'mobile-390', width: 390, height: 844, dpr: 2, mobile: true },
];
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const out = [];
for (const v of VIEWS) {
  const ctx = await browser.newContext({
    viewport: { width: v.width, height: v.height },
    deviceScaleFactor: v.dpr,
    isMobile: v.mobile,
    hasTouch: v.mobile,
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(600);
  const r = await page.evaluate(async () => {
    const img = document.querySelector('section img');
    if (!img) return { error: 'no hero img' };
    await img.decode().catch(() => {});
    const probe = await new Promise((res) => {
      const i = new Image();
      i.onload = () => res({ w: i.naturalWidth, h: i.naturalHeight });
      i.onerror = () => res({ w: -1, h: -1 });
      i.src = img.currentSrc;
    });
    const box = img.getBoundingClientRect();
    const h1 = document.querySelector('h1');
    const h1r = h1 ? h1.getBoundingClientRect() : null;
    const cs = getComputedStyle(img);
    return {
      boxW: +box.width.toFixed(1),
      boxH: +box.height.toFixed(1),
      boxTop: +box.top.toFixed(1),
      currentSrc: img.currentSrc,
      intrinsicW: probe.w,
      intrinsicH: probe.h,
      naturalWidthTrap: img.naturalWidth,
      objectFit: cs.objectFit,
      objectPosition: cs.objectPosition,
      attrW: img.getAttribute('width'),
      attrH: img.getAttribute('height'),
      sizes: img.getAttribute('sizes'),
      inPicture: img.parentElement.tagName === 'PICTURE',
      sources:
        img.parentElement.tagName === 'PICTURE'
          ? [...img.parentElement.querySelectorAll('source')].map((s) => ({
              media: s.media,
              srcset: s.srcset.replace(
                /https:\/\/images\.hellokahwin\.com\/inspire\/[^/]+\/[^/]+\//g,
                '…/',
              ),
            }))
          : null,
      h1Top: h1r ? +h1r.top.toFixed(1) : null,
      h1Text: h1 ? h1.textContent.trim().slice(0, 70) : null,
      vh: window.innerHeight,
      vw: window.innerWidth,
      dpr: devicePixelRatio,
    };
  });
  if (!r.error) {
    const boxAspect = r.boxW / r.boxH,
      srcAspect = r.intrinsicW / r.intrinsicH;
    r.boxAspect = +boxAspect.toFixed(3);
    r.assetAspect = +srcAspect.toFixed(3);
    r.aspectDeviationPct = +((Math.abs(boxAspect - srcAspect) / srcAspect) * 100).toFixed(1);
    r.upscale = +(r.boxW / r.intrinsicW).toFixed(3);
    r.variant = (r.currentSrc.split('/').pop() || '').split('?')[0];
    r.platePctOfViewport = +((r.boxH / r.vh) * 100).toFixed(1);
    r.h1InFirstScreen = r.h1Top !== null && r.h1Top < r.vh;
    r.visibleFractionPct = +(
      (boxAspect > srcAspect ? srcAspect / boxAspect : boxAspect / srcAspect) * 100
    ).toFixed(1);
    r.PASS_aspect = r.aspectDeviationPct <= 15;
    r.PASS_upscale = r.upscale <= 1.1;
    r.PASS_variant = !/^(low|high|original)\./.test(r.variant);
    r.PASS_h1 = r.h1InFirstScreen;
  }
  out.push({ view: v.name, ...r });
  await ctx.close();
}
await browser.close();
const W = (s, n) => String(s).padEnd(n);
console.log(`\n=== ${label} — ${url} ===`);
console.log(
  W('view', 15) +
    W('box', 13) +
    W('boxAR', 8) +
    W('variant', 32) +
    W('intrinsic', 12) +
    W('assetAR', 9) +
    W('devi%', 8) +
    W('upscale', 9) +
    W('vis%', 7) +
    W('plate%', 8) +
    W('h1@1st', 8) +
    'DoD',
);
for (const r of out) {
  if (r.error) {
    console.log(W(r.view, 15) + r.error);
    continue;
  }
  const dod = [
    r.PASS_aspect ? 'aspect✓' : 'aspect✗',
    r.PASS_upscale ? 'upscale✓' : 'upscale✗',
    r.PASS_variant ? 'variant✓' : 'variant✗',
    r.PASS_h1 ? 'h1✓' : 'h1✗',
  ].join(' ');
  console.log(
    W(r.view, 15) +
      W(`${r.boxW}x${r.boxH}`, 13) +
      W(r.boxAspect, 8) +
      W(r.variant, 32) +
      W(`${r.intrinsicW}x${r.intrinsicH}`, 12) +
      W(r.assetAspect, 9) +
      W(r.aspectDeviationPct, 8) +
      W(r.upscale + 'x', 9) +
      W(r.visibleFractionPct, 7) +
      W(r.platePctOfViewport, 8) +
      W(r.h1InFirstScreen ? 'yes' : 'NO', 8) +
      dod,
  );
}
console.log(
  '\nnaturalWidth trap (DO NOT USE): ' +
    out
      .filter((r) => !r.error)
      .map((r) => `${r.view}=${r.naturalWidthTrap}`)
      .join('  '),
);
if (out[0] && out[0].sources)
  console.log('\n<picture> sources:\n' + JSON.stringify(out[0].sources, null, 2));
import fs from 'node:fs';
fs.writeFileSync(process.env.UI03_OUT || `/tmp/ui03/${label}.json`, JSON.stringify(out, null, 2));
