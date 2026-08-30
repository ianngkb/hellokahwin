import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:true });
for (const [w,h,dpr] of [[390,844,2],[1920,900,1]]) {
  const ctx = await b.newContext({ viewport:{width:w,height:h}, deviceScaleFactor:dpr, isMobile:w<768, hasTouch:w<768 });
  const p = await ctx.newPage();
  await p.goto('https://hellokahwin.com/artikel/idea-dan-nasihat', { waitUntil:'domcontentloaded', timeout:45000 });
  await p.evaluate(async () => { for(let y=0;y<document.body.scrollHeight;y+=500){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,60));}
    await Promise.all([...document.images].map(i=>i.complete?null:new Promise(r=>{i.onload=i.onerror=r;}))); });
  await p.waitForTimeout(1200);
  const rows = await p.evaluate(async () => {
    const out=[];
    for (const img of [...document.querySelectorAll('.s-row img')].slice(0,5)) {
      const bx=img.getBoundingClientRect();
      const real=await new Promise(res=>{const d=new Image();d.onload=()=>res({w:d.naturalWidth,h:d.naturalHeight});d.onerror=()=>res({w:0,h:0});d.src=img.currentSrc;});
      const bAR=bx.width/bx.height, aAR=real.w/real.h;
      out.push({box:`${Math.round(bx.width)}x${Math.round(bx.height)}`,boxAR:bAR.toFixed(3),
        served:img.currentSrc.split('/').pop().split('?')[0], intrinsic:`${real.w}x${real.h}`, assetAR:aAR.toFixed(3),
        devPct:(Math.abs(bAR-aAR)/aAR*100).toFixed(1), R1:Math.abs(bAR-aAR)/aAR<=0.15,
        R2:!/^(low|high|original)\./.test(img.currentSrc.split('/').pop()),
        attrs:`${img.getAttribute('width')}x${img.getAttribute('height')}`});
    }
    return out;
  });
  console.log(`\n===== .s-row thumbnails @ ${w}px (DPR${dpr}) =====`);
  for (const r of rows) console.log(`box ${r.box.padEnd(9)} AR ${r.boxAR}  asset ${r.intrinsic.padEnd(10)} AR ${r.assetAR}  dev ${r.devPct.padStart(5)}%  R1:${r.R1?'PASS':'FAIL'}  R2:${r.R2?'PASS':'FAIL'}  served ${r.served}  attrs ${r.attrs}`);
  await ctx.close();
}
await b.close();
