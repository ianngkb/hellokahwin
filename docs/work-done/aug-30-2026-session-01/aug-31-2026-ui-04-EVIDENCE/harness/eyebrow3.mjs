import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Ian Ng/Documents/Code/thepicklebase/');
const { chromium } = require('playwright');
const b = await chromium.launch({ executablePath: 'C:/Users/Ian Ng/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
for (const [name,url] of [['artikel-index','https://hellokahwin.com/artikel'],['homepage','https://hellokahwin.com/'],['category','https://hellokahwin.com/artikel/hantaran-mas-kahwin']]) {
for (const w of [390, 768, 1024, 1440]) {
  const c = await b.newContext({ viewport: { width: w, height: w<768?844:900 }, isMobile: w<768, hasTouch: w<768, deviceScaleFactor: 1 });
  const p = await c.newPage();
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  const out = await p.evaluate(() => {
    // ANY element whose computed style truncates with an ellipsis
    const els = Array.from(document.querySelectorAll('body *')).filter(e => {
      const cs = getComputedStyle(e);
      return cs.textOverflow === 'ellipsis' && cs.overflow !== 'visible' && (e.textContent||'').trim().length > 3;
    });
    const rows = els.map(e => ({
      sel: e.tagName.toLowerCase() + '.' + String(e.className).trim().split(/\s+/).slice(0,2).join('.'),
      cw: e.clientWidth, sw: e.scrollWidth, hidden: e.scrollWidth - e.clientWidth,
      fs: getComputedStyle(e).fontSize,
      text: (e.textContent||'').trim().slice(0,45),
    }));
    const clipped = rows.filter(r => r.hidden > 1);
    return { total: rows.length, clipped: clipped.length, sample: clipped.slice(0,4), widths: [...new Set(rows.map(r=>r.cw))].sort((a,b)=>a-b).slice(0,6) };
  });
  console.log(`${name.padEnd(14)} @${String(w).padStart(4)}  ellipsis-capable:${out.total}  actually clipped:${out.clipped}  boxWidths:${JSON.stringify(out.widths)}`);
  out.sample.forEach(s=>console.log(`      ${s.cw}px box / ${s.sw}px text — ${s.hidden}px hidden — ${s.fs} — ${s.sel} :: ${s.text}`));
  await c.close();
}}
await b.close();
