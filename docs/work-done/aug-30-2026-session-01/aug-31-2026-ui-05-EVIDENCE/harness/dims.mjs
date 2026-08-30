import { chromium } from 'playwright-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const urls = process.argv.slice(2);
const b = await chromium.launch({ executablePath: CHROME, headless: true });
const p = await (await b.newContext()).newPage();
for (const u of urls) {
  const d = await p.evaluate(
    (src) => new Promise((res) => {
      const i = new Image();
      i.onload = () => res({ w: i.naturalWidth, h: i.naturalHeight, ar: +(i.naturalWidth / i.naturalHeight).toFixed(2) });
      i.onerror = () => res({ err: true });
      i.src = src;
    }),
    u,
  );
  console.log(`${d.w}x${d.h} ar=${d.ar}  ${u.replace('https://images.hellokahwin.com/inspire/','')}`);
}
await b.close();
