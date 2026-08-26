import { chromium } from 'playwright-core';
const url = process.argv[2], W = Number(process.argv[3]), H = Number(process.argv[4]) || 900;
const shot = process.argv[5] || null, label = process.argv[6] || '';
const browser = await chromium.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:true });
const mobile = W < 700;
const ctx = await browser.newContext({ viewport:{width:W,height:H}, deviceScaleFactor:1, isMobile:mobile, hasTouch:mobile });
const page = await ctx.newPage();
await page.goto(url, { waitUntil:'networkidle', timeout:120000 });
await page.waitForTimeout(900);
const r = await page.evaluate(() => {
  const out = { viewport:{w:innerWidth,h:innerHeight} };
  const header = document.querySelector('header');
  // the scroller is the overflow-x element inside the header
  const all = header ? [...header.querySelectorAll('*')] : [];
  const sc = all.find(e => { const cs=getComputedStyle(e); return (cs.overflowX==='auto'||cs.overflowX==='scroll') && e.scrollWidth > 0; });
  if (!sc) { out.scroller = null; }
  else {
    const cs = getComputedStyle(sc);
    out.scroller = {
      scrollWidth: sc.scrollWidth, clientWidth: sc.clientWidth,
      hiddenPx: sc.scrollWidth - sc.clientWidth,
      scrollbarWidth: cs.scrollbarWidth,
      maxWidthOfParent: getComputedStyle(sc.parentElement).maxWidth,
      // does anything paint a right-edge cue?
      afterContent: getComputedStyle(sc.parentElement,'::after').content,
      bgImage: cs.backgroundImage === 'none' ? 'none' : 'present',
      maskImage: cs.maskImage && cs.maskImage !== 'none' ? 'present' : 'none',
    };
    const links = [...sc.querySelectorAll('a[href^="/artikel/"]')];
    const scRect = sc.getBoundingClientRect();
    const seen = new Set();
    out.pillars = links.filter(a=>{ const h=a.getAttribute('href'); if(seen.has(h))return false; seen.add(h); return /^\/artikel\/[a-z0-9-]+$/.test(h); })
      .map(a=>{ const rr=a.getBoundingClientRect();
        return { href:a.getAttribute('href'), name:a.textContent.trim().slice(0,34),
                 left:Math.round(rr.left), right:Math.round(rr.right),
                 visible: rr.left >= scRect.left-1 && rr.right <= scRect.right+1 }; });
  }
  // masthead search link?
  const search = header ? [...header.querySelectorAll('a,button')].filter(e=>/cari|search/i.test(e.textContent+' '+(e.getAttribute('aria-label')||'')+' '+(e.getAttribute('href')||''))) : [];
  out.searchInMasthead = search.map(e=>({tag:e.tagName, href:e.getAttribute('href'), label:(e.getAttribute('aria-label')||e.textContent.trim()).slice(0,40)}));
  return out;
});
console.log(`\n=== ${label} :: ${W}px :: ${url}`);
if (!r.scroller) console.log('  NO horizontal scroller found in <header>');
else {
  const s = r.scroller;
  console.log(`  scrollWidth ${s.scrollWidth}  clientWidth ${s.clientWidth}  -> ${s.hiddenPx}px OFF-SCREEN`);
  console.log(`  scrollbar-width: ${s.scrollbarWidth}   parent max-width: ${s.maxWidthOfParent}`);
  console.log(`  right-edge cue: ::after=${s.afterContent}  background-image=${s.bgImage}  mask=${s.maskImage}`);
  console.log(`  pillars: ${r.pillars.length}, visible without scrolling: ${r.pillars.filter(p=>p.visible).length}`);
  r.pillars.forEach((p,i)=>console.log(`    ${String(i+1).padStart(2)}. ${p.visible?'VISIBLE':'HIDDEN '} [${String(p.left).padStart(5)}..${String(p.right).padStart(5)}] ${p.name}`));
}
console.log(`  search in masthead: ${r.searchInMasthead.length ? JSON.stringify(r.searchInMasthead) : 'NONE'}`);
if (shot) { await page.screenshot({ path: shot, fullPage:false }); console.log(`  screenshot -> ${shot}`); }
await browser.close();
