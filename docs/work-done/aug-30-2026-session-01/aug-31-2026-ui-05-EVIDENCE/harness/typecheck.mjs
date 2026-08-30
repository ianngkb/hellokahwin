/** Computed typography of an article-title link, pillar vs grid. Scratchpad rig. */
import { chromium } from 'playwright-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const b = await chromium.launch({ executablePath: CHROME, headless: true });

const probe = async (url, sel, width) => {
  const ctx = await b.newContext({
    viewport: { width, height: 900 },
    deviceScaleFactor: 2,
    isMobile: width < 768,
    hasTouch: width < 768,
  });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  const r = await p.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return { missing: s };
    const cs = getComputedStyle(el);
    return {
      text: el.textContent.trim().slice(0, 42),
      cls: el.className,
      fontFamily: cs.fontFamily.split(',')[0],
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
    };
  }, sel);
  await ctx.close();
  return r;
};

for (const w of [390, 1280]) {
  console.log(`\n===== ${w}px =====`);
  console.log('PILLAR link  ', JSON.stringify(await probe('https://hellokahwin.com/artikel/hantaran-mas-kahwin', 'a.t', w)));
  console.log('GRID row title', JSON.stringify(await probe('https://hellokahwin.com/artikel/idea-dan-nasihat', '.s-row h2.t', w)));
  console.log('GRID card title', JSON.stringify(await probe('https://hellokahwin.com/artikel/idea-dan-nasihat', '.s-card h2', w)));
}
await b.close();
