import { chromium } from 'playwright-core';
const base = process.argv[2] || 'https://hellokahwin.com';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
for (const path of ['/artikel','/artikel/tag/hantaran']) {
  const c = await b.newContext({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true, deviceScaleFactor:1 });
  const p = await c.newPage();
  const r = await p.goto(base+path, { waitUntil:'networkidle' });
  await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(400);
  const cache = r.headers()['x-vercel-cache'] || 'n/a', vid = r.headers()['x-vercel-id'] || 'n/a';
  const o = await p.evaluate(() => ({
    h1: document.querySelectorAll('h1').length, h2: document.querySelectorAll('h2').length,
    h3: document.querySelectorAll('h3').length, img: document.querySelectorAll('img').length,
    a: document.querySelectorAll('a').length, article: document.querySelectorAll('article').length,
    eyebrow: document.querySelectorAll('p.hk-eyebrow').length,
    truncEyebrow: document.querySelectorAll('p.hk-eyebrow.truncate').length,
    firstTitle: document.querySelector('article h3')?.textContent.trim().slice(0,40) || '',
    chars: document.body.innerText.length,
  }));
  console.log(`${path}  [${r.status()}] cache=${cache} id=${vid}`);
  console.log(`   h1:${o.h1} h2:${o.h2} h3:${o.h3} img:${o.img} a:${o.a} article:${o.article} eyebrow:${o.eyebrow} eyebrow.truncate:${o.truncEyebrow} innerTextChars:${o.chars}`);
  console.log(`   first card title: "${o.firstTitle}"`);
  await c.close();
}
await b.close();
