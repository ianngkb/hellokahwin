import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:true });
for (const [w,h,mob] of [[390,844,true],[1400,900,false]]) {
  const ctx = await browser.newContext({ viewport:{width:w,height:h}, deviceScaleFactor:1, isMobile:mob, hasTouch:mob });
  const page = await ctx.newPage();
  await page.goto('http://localhost:3200/artikel', { waitUntil:'networkidle', timeout:120000 });
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => {
    // true sRGB bytes via canvas — getComputedStyle returns lab()/oklch() verbatim
    const toRGB = (css) => {
      const c = document.createElement('canvas'); c.width = c.height = 1;
      const g = c.getContext('2d'); g.fillStyle = '#000';
      g.fillStyle = css; g.fillRect(0,0,1,1);
      const d = g.getImageData(0,0,1,1).data; return [d[0],d[1],d[2]];
    };
    const lum = (c) => { const f = c.map(v=>{v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4);});
      return 0.2126*f[0]+0.7152*f[1]+0.0722*f[2]; };
    const ratio = (a,b) => { const [x,y]=[lum(toRGB(a)),lum(toRGB(b))].sort((p,q)=>q-p); return (x+0.05)/(y+0.05); };
    const chip = document.querySelector('.hk-chip');
    const cs = getComputedStyle(chip);
    let el = chip.parentElement, bg = 'rgba(0, 0, 0, 0)';
    while (el && (bg==='rgba(0, 0, 0, 0)'||bg==='transparent')) { bg = getComputedStyle(el).backgroundColor; el = el.parentElement; }
    const hdr = document.querySelector('header');
    const anchor = document.getElementById('cari');
    return {
      viewport: innerWidth,
      chipBorderCss: cs.borderTopColor,
      chipBorderRGB: 'rgb(' + toRGB(cs.borderTopColor).join(',') + ')',
      pageBgCss: bg,
      pageBgRGB: 'rgb(' + toRGB(bg).join(',') + ')',
      contrast: Number(ratio(cs.borderTopColor, bg).toFixed(3)),
      hoverTarget: 'var(--foreground)',
      contrastHover: Number(ratio(getComputedStyle(document.documentElement).getPropertyValue('--foreground') || '#151412', bg).toFixed(3)),
      headerHeight: Math.round(hdr.getBoundingClientRect().height),
      anchorScrollMarginTop: anchor ? getComputedStyle(anchor).scrollMarginTop : null,
      chipCount: document.querySelectorAll('.hk-chip').length,
    };
  });
  console.log(JSON.stringify(r, null, 2));
  await ctx.close();
}
await browser.close();
