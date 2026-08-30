import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Ian Ng/Documents/Code/thepicklebase/');
const { chromium } = require('playwright');
const b = await chromium.launch({ executablePath: 'C:/Users/Ian Ng/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
for (const [name,url] of [['article','https://hellokahwin.com/artikel/idea-dan-nasihat/garden-wedding'],['dewan-kahwin','https://hellokahwin.com/dewan-kahwin'],['homepage','https://hellokahwin.com/']]) {
for (const w of [390, 1440]) {
  const c = await b.newContext({ viewport: { width: w, height: w<768?844:900 }, isMobile: w<768, hasTouch: w<768, deviceScaleFactor: 1 });
  const p = await c.newPage();
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.evaluate(async () => { const s=Math.round(innerHeight*0.9); for(let y=0;y<document.documentElement.scrollHeight;y+=s){scrollTo(0,y);await new Promise(r=>setTimeout(r,60));} scrollTo(0,0); });
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
  const out = await p.evaluate(() => {
    const wide = Array.from(document.querySelectorAll('table,pre,iframe,video,figure,blockquote,ul,ol'))
      .map(e => ({ tag:e.tagName.toLowerCase(), cw:e.clientWidth, sw:e.scrollWidth, over:e.scrollWidth-e.clientWidth, rect:Math.round(e.getBoundingClientRect().width) }))
      .filter(x => x.over > 1);
    const header = document.querySelector('header');
    const hr = header.getBoundingClientRect();
    return {
      wideOverflow: wide.slice(0,8),
      headerHeight: Math.round(hr.height),
      viewportHeight: innerHeight,
      headerPctOfViewport: Math.round(hr.height/innerHeight*1000)/10,
      firstH1Top: (()=>{const h=document.querySelector('h1'); return h?Math.round(h.getBoundingClientRect().top+scrollY):null;})(),
      scrollHeight: document.documentElement.scrollHeight,
      screensToScroll: Math.round(document.documentElement.scrollHeight/innerHeight*10)/10,
    };
  });
  console.log(`${name.padEnd(13)} @${String(w).padStart(4)}  header ${out.headerHeight}px (${out.headerPctOfViewport}% of ${out.viewportHeight})  h1Top=${out.firstH1Top}  page=${out.scrollHeight}px (${out.screensToScroll} screens)  wideOverflow=${JSON.stringify(out.wideOverflow)}`);
  await c.close();
}}
await b.close();
