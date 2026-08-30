import { chromium } from 'playwright-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const WIDTHS = [390, 768, 1024, 1440];
const PAGES = process.argv.slice(2);

const b = await chromium.launch({ executablePath: CHROME, headless: true });
for (const url of PAGES) {
  console.log(`\n############ ${url}`);
  for (const w of WIDTHS) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    await p.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
    await p.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
      window.scrollTo(0, 0);
      await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
    });
    await p.waitForTimeout(800);
    const rows = await p.evaluate(async () => {
      const out = [];
      for (const img of document.querySelectorAll('img')) {
        const r = img.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) continue;
        const cs = getComputedStyle(img);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const src = img.currentSrc || img.src || '';
        if (!src || /\.svg/.test(src)) continue;
        let trueW = null, trueH = null;
        try { const d = new Image(); d.src = src; await d.decode(); trueW = d.naturalWidth; trueH = d.naturalHeight; } catch {}
        const bits = []; let n = img;
        while (n && n.nodeType === 1 && n.tagName !== 'BODY' && bits.length < 3) {
          let s = n.tagName.toLowerCase();
          if (typeof n.className === 'string' && n.className.trim()) s += '.' + n.className.trim().split(/\s+/).slice(0,2).join('.');
          bits.unshift(s); n = n.parentElement;
        }
        out.push({
          sel: bits.join('>'), boxW: +r.width.toFixed(0), boxH: +r.height.toFixed(0),
          natW: img.naturalWidth, natH: img.naturalHeight, trueW, trueH,
          sizes: img.getAttribute('sizes'), fit: cs.objectFit,
          file: src.replace(/^.*\/inspire\//, '').slice(0, 70),
          srcsetDesc: (img.getAttribute('srcset') || '').replace(/https?:\/\/[^ ]*?\/([^/ ]+\.webp[^ ]*)/g, '$1').slice(0, 120),
        });
      }
      return out;
    });
    console.log(`\n--- ${w}px --- (${rows.length} images)`);
    const seen = new Set();
    for (const r of rows) {
      const key = r.sel + '|' + r.boxW + 'x' + r.boxH + '|' + (r.trueW + 'x' + r.trueH);
      if (seen.has(key)) continue; seen.add(key);
      const bA = (r.boxW / r.boxH).toFixed(3), nA = (r.natW / r.natH).toFixed(3);
      const dev = (Math.abs(r.boxW / r.boxH - r.natW / r.natH) / (r.natW / r.natH) * 100).toFixed(0);
      const sx = r.boxW / r.natW, sy = r.boxH / r.natH;
      const sc = (r.fit === 'contain' || r.fit === 'scale-down' ? Math.min(sx, sy) : Math.max(sx, sy)).toFixed(3);
      console.log(`  box ${String(r.boxW).padStart(4)}x${String(r.boxH).padEnd(4)} a=${bA}  decoded ${String(r.natW).padStart(4)}x${String(r.natH).padEnd(4)} a=${nA} dev=${String(dev).padStart(3)}%  scale=${sc}  TRUE ${r.trueW}x${r.trueH}  sizes=${r.sizes}  fit=${r.fit}`);
      console.log(`      ${r.sel}`);
      console.log(`      file=${r.file}`);
      if (r.srcsetDesc) console.log(`      srcset=${r.srcsetDesc}`);
    }
    await ctx.close();
  }
}
await b.close();
