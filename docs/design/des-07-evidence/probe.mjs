// DES-07 — browser-side measurements, 28 Ogos 2026.
//
// Reproduces every number in the spec that needs a real layout engine: the
// title truncation counts, the category-rail width, the breadcrumb cut, the
// navigation-feedback samples, the broken-image behaviour and the target sizes.
//
//   1. start a headless Chrome with a debugging port:
//
//      chrome --headless=new --disable-gpu --no-first-run \
//             --remote-debugging-port=9222 --user-data-dir=/tmp/des07 about:blank
//
//   2. node probe.mjs
//
// Node 21+ only (uses the global WebSocket and fetch). No packages.
//
// Reported on deploy dpl_CV6piQmHcTjeP1p5nSmH3tffd4MS:
//
//   card box at 360 px                     156 px, Georgia 17px/21.42, clamp 3
//   titles truncated in it                 57 of 86  (66%)
//   ... under the generic serif fallback   32 of 86  (37%)
//   longest title                          95 chars -> 49 visible, 46 lost
//   titles truncated in a 328 px column     0 of 86
//   category rail                          2130 px wide, 1770 px (83%) hidden
//   breadcrumb, 38-char category           200 px given, 260 px needed
//   navigation feedback within 2.79 s      none: no url/content/opacity change
//   webfonts loaded                        0

const PORT = process.env.CDP_PORT || 9222;
const BASE = "https://hellokahwin.com";
const WIDTH = 360, HEIGHT = 1200;

async function session() {
  const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const pend = new Map(); const events = [];
  await new Promise(r => (ws.onopen = r));
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { const [res, rej] = pend.get(m.id); pend.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
    else if (m.method) events.push(m);
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, [res, rej]); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Page.enable"); await send("Runtime.enable");
  return { send, events, close: () => ws.close() };
}

async function open(url, { noJs = false } = {}) {
  const s = await session();
  if (noJs) await s.send("Emulation.setScriptExecutionDisabled", { value: true });
  await s.send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 2, mobile: true });
  await s.send("Page.navigate", { url });
  await new Promise(r => { const t = setInterval(() => { if (s.events.some(e => e.method === "Page.loadEventFired")) { clearInterval(t); r(); } }, 100); setTimeout(() => { clearInterval(t); r(); }, 45000); });
  await s.send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 2, mobile: true });
  await new Promise(r => setTimeout(r, 2500));
  return s;
}

const evaluate = async (s, expression) =>
  (await s.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;

// --- 1. the corpus, straight off the sitemap ------------------------------
const sm = await (await fetch(`${BASE}/sitemap.xml`)).text();
const urls = [...sm.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
const arts = urls.filter(u => u.split("/").length === 6);
const titles = [];
for (const chunk of Array.from({ length: Math.ceil(arts.length / 8) }, (_, i) => arts.slice(i * 8, i * 8 + 8))) {
  const got = await Promise.all(chunk.map(async u => {
    const html = await (await fetch(u, { headers: { "User-Agent": "DES-07" } })).text();
    const m = html.match(/<h1[^>]*class="hk-display[^"]*"[^>]*>(.*?)<\/h1>/s);
    return m ? m[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").trim() : null;
  }));
  titles.push(...got.filter(Boolean));
}
console.log(`corpus: ${titles.length} titles from ${arts.length} articles`);

// --- 2. truncation, measured inside the live card box ---------------------
const s1 = await open(`${BASE}/artikel/real-wedding`);
const trunc = await evaluate(s1, `(()=>{
  const T=${JSON.stringify(titles)};
  const card=document.querySelector('.hk-card-title');
  const box=document.createElement('div');
  box.style.cssText='position:absolute;left:-9999px;top:0';
  const inner=document.createElement('h3'); inner.className=card.className;
  box.appendChild(inner); document.body.appendChild(box);
  const R={cardW:Math.round(card.getBoundingClientRect().width),
           style:(()=>{const c=getComputedStyle(inner);return {fs:c.fontSize,lh:c.lineHeight,family:c.fontFamily,clamp:c.webkitLineClamp};})(),
           families:{}, widths:{}};
  const fams={'Georgia (what ships)':'Georgia,"Times New Roman",Times,serif',
              'generic serif (Android)':'serif'};
  box.style.width=R.cardW+'px';
  for(const [label,f] of Object.entries(fams)){
    inner.style.fontFamily=f;
    const lh=parseFloat(getComputedStyle(inner).lineHeight);
    let cut=0,max=0;
    T.forEach(t=>{inner.textContent=t;const l=Math.round(inner.scrollHeight/lh);if(l>3)cut++;if(l>max)max=l;});
    R.families[label]={cut,pct:Math.round(cut/T.length*100),maxLines:max};
  }
  inner.style.fontFamily='';
  for(const w of [156,236,328]){
    box.style.width=w+'px';
    const lh=parseFloat(getComputedStyle(inner).lineHeight);
    let cut=0; T.forEach(t=>{inner.textContent=t;if(Math.round(inner.scrollHeight/lh)>3)cut++;});
    R.widths[w+'px']={cut};
  }
  // how much of the longest title survives the shipped clamp
  box.style.width=R.cardW+'px';
  const L=T.reduce((a,b)=>b.length>a.length?b:a);
  const lh=parseFloat(getComputedStyle(inner).lineHeight);
  let lo=0,hi=L.length,vis=0;
  while(lo<=hi){const m=(lo+hi)>>1;inner.textContent=L.slice(0,m);
    if(Math.round(inner.scrollHeight/lh)<=3){vis=m;lo=m+1;}else hi=m-1;}
  R.longest={chars:L.length,visible:vis,lost:L.length-vis,shown:L.slice(0,vis)};
  box.remove(); return R;})()`);
console.log("\ntruncation in the shipped card box");
console.log(`  box ${trunc.cardW}px  ${trunc.style.fs}/${trunc.style.lh}  clamp ${trunc.style.clamp}  ${trunc.style.family}`);
for (const [k, v] of Object.entries(trunc.families)) console.log(`  ${k.padEnd(26)} ${v.cut} of ${titles.length} cut (${v.pct}%), worst ${v.maxLines} lines`);
console.log("  by container width:", JSON.stringify(trunc.widths));
console.log(`  longest title ${trunc.longest.chars} chars -> ${trunc.longest.visible} visible, ${trunc.longest.lost} lost`);
console.log(`  reader sees: "${trunc.longest.shown}"`);
s1.close();

// --- 3. rail, breadcrumb, fonts, targets ---------------------------------
const s2 = await open(`${BASE}/artikel/sebelum-nikah`);
const chrome = await evaluate(s2, `(()=>{
  const R={};
  const nav=document.querySelector('nav[aria-label="Kategori"]');
  const sc=nav&&nav.closest('.overflow-x-auto');
  if(sc)R.rail={links:nav.querySelectorAll('a').length,scrollW:sc.scrollWidth,clientW:sc.clientWidth,
                hidden:sc.scrollWidth-sc.clientWidth,pctHidden:Math.round((1-sc.clientWidth/sc.scrollWidth)*100)};
  const bc=document.querySelector('nav[aria-label=Breadcrumb] [aria-current=page]');
  if(bc)R.breadcrumb={text:bc.textContent.trim(),chars:bc.textContent.trim().length,
    given:bc.clientWidth,needed:bc.scrollWidth,truncated:bc.scrollWidth>bc.clientWidth+1,
    maxWidth:getComputedStyle(bc).maxWidth};
  R.webfonts={loaded:[...document.fonts].length,status:document.fonts.status,
    serifResolvesTo:getComputedStyle(document.documentElement).getPropertyValue('--font-cormorant').trim()};
  const small=[];
  document.querySelectorAll('main a,main button').forEach(e=>{const r=e.getBoundingClientRect();
    if(r.width>0&&Math.min(r.width,r.height)<44)small.push({t:(e.textContent||'').trim().slice(0,28),w:Math.round(r.width),h:Math.round(r.height)});});
  R.targetsUnder44=small;
  R.firstItemY=(()=>{const a=document.querySelector('main section[aria-labelledby] li a, main .hk-card-title');
    return a?Math.round(a.getBoundingClientRect().top+scrollY):null;})();
  R.emptyCopy=[...document.querySelectorAll('main p')].map(p=>p.textContent.trim()).filter(t=>/akan datang/.test(t));
  return R;})()`);
console.log("\nchrome");
console.log("  rail:", JSON.stringify(chrome.rail));
console.log("  breadcrumb:", JSON.stringify(chrome.breadcrumb));
console.log("  webfonts:", JSON.stringify(chrome.webfonts));
console.log(`  first headline at y=${chrome.firstItemY}px`);
console.log(`  targets under 44px in <main>: ${chrome.targetsUnder44.length}`, JSON.stringify(chrome.targetsUnder44.slice(0, 4)));
console.log("  empty-section copy:", JSON.stringify(chrome.emptyCopy));
s2.close();

// --- 4. what a tap looks like --------------------------------------------
const s3 = await open(`${BASE}/`);
const nav = await evaluate(s3, `(async()=>{
  const R={samples:[]};
  const sig=ms=>({ms,url:location.pathname,
    mainChars:(document.querySelector('main')||{textContent:''}).textContent.trim().length,
    indicators:document.querySelectorAll('[class*=animate-pulse],[class*=animate-spin],[role=progressbar],[aria-busy=true]').length,
    ariaBusy:document.body.getAttribute('aria-busy'),
    opacity:getComputedStyle(document.querySelector('main')).opacity});
  const link=[...document.querySelectorAll('nav[aria-label=Kategori] a')]
    .find(a=>a.getAttribute('href')==='/artikel/venue-perancangan');
  if(!link)return {err:'link not in nav'};
  const t0=performance.now(); link.click();
  for(let i=0;i<12;i++){await new Promise(r=>setTimeout(r,220));R.samples.push(sig(Math.round(performance.now()-t0)));}
  R.urlChanged=new Set(R.samples.map(s=>s.url)).size>1;
  R.contentChanged=new Set(R.samples.map(s=>s.mainChars)).size>1;
  R.anyIndicator=R.samples.some(s=>s.indicators>0||s.ariaBusy);
  R.lastMs=R.samples[R.samples.length-1].ms;
  return R;})()`);
console.log("\nnavigation feedback after tapping a category link");
console.log(`  sampled for ${nav.lastMs} ms: url changed ${nav.urlChanged}, content changed ${nav.contentChanged}, any loading indicator ${nav.anyIndicator}`);
s3.close();

// --- 5. what a broken image does -----------------------------------------
const s4 = await open(`${BASE}/artikel/real-wedding`);
const img = await evaluate(s4, `(async()=>{
  const imgs=[...document.querySelectorAll('main img')];
  const first=imgs[0], box=first.parentElement;
  const before={w:Math.round(first.getBoundingClientRect().width),h:Math.round(first.getBoundingClientRect().height),altChars:first.alt.length};
  imgs.forEach(i=>{i.removeAttribute('srcset');i.style.backgroundImage='none';i.src='https://images.hellokahwin.com/tiada-fail-ini-404.webp';});
  await new Promise(r=>setTimeout(r,3500));
  return {before,after:{naturalW:first.naturalWidth,
    boxH:Math.round(box.getBoundingClientRect().height),
    boxBg:getComputedStyle(box).backgroundColor,
    altRendersInForeground:getComputedStyle(first).color!=='transparent',
    layoutHeld:Math.round(box.getBoundingClientRect().height)===before.h}};})()`);
console.log("\nbroken image");
console.log("  ", JSON.stringify(img));
s4.close();

// --- 6. the 404, with and without scripting -------------------------------
console.log("\n404 body");
for (const noJs of [true, false]) {
  const s = await open(`${BASE}/halaman-yang-tidak-wujud`, { noJs });
  const doc = await s.send("DOM.getDocument", { depth: -1 });
  const html = (await s.send("DOM.getOuterHTML", { nodeId: doc.root.nodeId })).outerHTML;
  const m = html.match(/<main[\s\S]*?<\/main>/);
  const text = m ? m[0].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
  console.log(`  scripting ${noJs ? "OFF" : "ON "}: <main> present ${!!m}, ${text.length} characters` + (text ? `  "${text.slice(0, 60)}"` : ""));
  s.close();
}
process.exit(0);
