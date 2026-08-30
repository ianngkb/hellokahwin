import { chromium } from 'playwright-core';
const NAMED = ['Pelamin, Kad & Cenderahati Majlis','Cenderahati Majlis','Pelamin Kad',
               'Sebelum Nikah: Jodoh, Merisik & Tunang','Sebelum Nikah: Jodoh Merisik','Tunang',
               'Hantaran & Mas Kahwin','Ulang tahun perkahwinan, pantun & adab tetamu'];
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
for (const w of [390,768,1024,1440]) {
  const c = await b.newContext({ viewport:{width:w,height:w<768?844:900}, isMobile:w<768, hasTouch:w<768, deviceScaleFactor:1 });
  const p = await c.newPage();
  const r = await p.goto('https://hellokahwin.com/artikel', { waitUntil:'networkidle' });
  await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(400);
  const o = await p.evaluate((NAMED) => {
    const cards = Array.from(document.querySelectorAll('p.hk-eyebrow')).filter(e=>e.closest('article'));
    const el = cards[cards.length-1], link = el.querySelector('a')||el, orig = link.textContent;
    const lh = parseFloat(getComputedStyle(el).lineHeight);
    const rows = NAMED.map(t => { link.textContent = t;
      return { t, cw: el.clientWidth, sw: el.scrollWidth, lines: Math.round(el.getBoundingClientRect().height/lh), fs: getComputedStyle(el).fontSize }; });
    link.textContent = orig; return { col: el.clientWidth, rows };
  }, NAMED);
  console.log(`\n@${w}  narrowest card column = ${o.col}px   [cache ${r.headers()['x-vercel-cache']||'n/a'}]`);
  o.rows.forEach(x => console.log(`   ${x.sw-x.cw>1?'CLIPS':'fits '}  ${String(x.cw).padStart(3)}px box / ${String(x.sw).padStart(3)}px content / ${x.lines} line(s) / ${x.fs} — "${x.t}"`));
  await c.close();
}
await b.close();
