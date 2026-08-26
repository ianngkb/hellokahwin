import { chromium } from 'playwright-core';
const url = process.argv[2];
const W = Number(process.argv[3]), H = Number(process.argv[4]), label = process.argv[5] || '';
const browser = await chromium.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:true });
const mobile = W < 700;
const ctx = await browser.newContext({
  viewport:{width:W,height:H}, deviceScaleFactor: mobile?2:1, isMobile:mobile, hasTouch:mobile,
  userAgent: mobile
    ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    : undefined,
});
const page = await ctx.newPage();
const imgs = [];
page.on('response', async (r) => {
  const ct = r.headers()['content-type'] || '';
  if (!/^image\//.test(ct)) return;
  let len = Number(r.headers()['content-length'] || 0);
  imgs.push({ url: r.url(), status: r.status(), bytes: len });
});
await page.goto(url, { waitUntil:'networkidle', timeout:120000 });
await page.waitForTimeout(1500);
console.log(`\n=== ${label} :: ${W}x${H} :: ${url}`);
const crops = imgs.filter(i=>/crop-/.test(i.url));
if (!crops.length) console.log('  (no smart-crop images fetched)');
for (const i of crops) {
  const name = (i.url.match(/crop-[a-z0-9.x-]+/i)||['?'])[0];
  console.log(`  FETCHED ${name.padEnd(26)} ${String(Math.round(i.bytes/1024)).padStart(5)} KB  HTTP ${i.status}`);
}
console.log(`  total image requests: ${imgs.length}, smart-crop requests: ${crops.length}`);
await browser.close();
