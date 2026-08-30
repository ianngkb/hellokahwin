import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:true });
for (const [w,h,mob] of [[390,844,true],[1400,900,false]]) {
  const ctx = await browser.newContext({ viewport:{width:w,height:h}, deviceScaleFactor:mob?2:1, isMobile:mob, hasTouch:mob });
  const page = await ctx.newPage();
  // arrive exactly the way the masthead link does: from another page, by clicking it
  await page.goto('http://localhost:3200/artikel/hantaran-mas-kahwin', { waitUntil:'networkidle', timeout:120000 });
  await page.click('header a[href="/artikel#cari"]');
  await page.waitForTimeout(1800);
  const r = await page.evaluate(() => {
    const a = document.getElementById('cari');
    const input = a?.querySelector('input');
    const hdr = document.querySelector('header').getBoundingClientRect();
    const ar = a.getBoundingClientRect();
    const ir = input.getBoundingClientRect();
    return {
      url: location.href,
      headerBottom: Math.round(hdr.bottom),
      anchorTop: Math.round(ar.top),
      inputTop: Math.round(ir.top), inputBottom: Math.round(ir.bottom),
      clearsHeader: ir.top >= hdr.bottom,
      gapPx: Math.round(ir.top - hdr.bottom),
      inputFocused: document.activeElement === input,
      scrollMarginTop: getComputedStyle(a).scrollMarginTop,
    };
  });
  console.log(`  ${w}px ->`, JSON.stringify(r));
  await page.screenshot({ path: `.tmp-ux03/shots/AFTER-${w}-search-arrival.png` });
  await ctx.close();
}
await browser.close();
