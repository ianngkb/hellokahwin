import { chromium } from 'playwright-core';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 360, height: 900 } });
await page.goto('http://localhost:3200/', { waitUntil: 'networkidle' });
await page.screenshot({
  path: 'docs/des-08-evidence/home-360-zoom.png',
  clip: { x: 0, y: 220, width: 360, height: 260 },
});
const eyebrow = await page.$('a.group span.s-label');
if (eyebrow) {
  const style = await eyebrow.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { color: cs.color, text: el.textContent, display: cs.display, fontSize: cs.fontSize };
  });
  console.log('eyebrow', style);
} else {
  console.log('eyebrow span not found');
}
const cred = await page.$('a.group .s-cred');
if (cred) {
  const style = await cred.evaluate((el) => ({
    color: getComputedStyle(el).color,
    text: el.textContent,
    display: getComputedStyle(el).display,
  }));
  console.log('credit', style);
} else {
  console.log('credit not found (no cover credit for this hero article)');
}
const h1 = await page.$('a.group h1');
if (h1) {
  const style = await h1.evaluate((el) => ({
    color: getComputedStyle(el).color,
    fontFamily: getComputedStyle(el).fontFamily,
  }));
  console.log('h1', style);
}
await browser.close();
