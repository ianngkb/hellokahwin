import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('C:/Users/Ian Ng/Documents/Code/thepicklebase/');
const { chromium } = require('playwright');
const b = await chromium.launch({ executablePath: 'C:/Users/Ian Ng/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });

const PAGES = [
  ['homepage', 'https://hellokahwin.com/'],
  ['article', 'https://hellokahwin.com/artikel/idea-dan-nasihat/garden-wedding'],
  ['category', 'https://hellokahwin.com/artikel/hantaran-mas-kahwin'],
  ['artikel-index', 'https://hellokahwin.com/artikel'],
  ['dewan-kahwin', 'https://hellokahwin.com/dewan-kahwin'],
];

const FN = () => {
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  // WARNING, 31 Aug 2026 (UI-04): this walker reads background-COLOR only. It
  // climbs straight past a background-IMAGE scrim. On hellokahwin it reported
  // 1.2:1 for every image figcaption on the site — white text that is in fact
  // sitting on `linear-gradient(to top, oklab(0 0 0 / 0.7), transparent)` plus a
  // text-shadow, and perfectly legible. Before reporting any failure from this
  // function, read the element's own backgroundImage and textShadow, and look at
  // a crop. Evidence: ../screens/evidence-figcaption-scrim-390px.png
  const bgOf = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0.9) return c;
      n = n.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  const over = (fg, bg) => {
    if (fg.a >= 1) return fg;
    return { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 };
  };

  const out = [];
  const els = Array.from(document.querySelectorAll('body *')).filter((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.95) return false;
    const own = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim().length > 2);
    if (!own) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
  for (const el of els) {
    const cs = getComputedStyle(el);
    const fgRaw = parse(cs.color);
    if (!fgRaw) continue;
    const bg = bgOf(el);
    const fg = over(fgRaw, bg);
    const fs = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight, 10) >= 700;
    const large = fs >= 24 || (fs >= 18.66 && bold);
    const cr = ratio(fg, bg);
    const min = large ? 3 : 4.5;
    if (cr < min) {
      out.push({
        sel: el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''),
        ratio: Math.round(cr * 100) / 100,
        required: min,
        fontSize: cs.fontSize,
        weight: cs.fontWeight,
        color: cs.color,
        bg: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`,
        text: (el.textContent || '').trim().slice(0, 60),
      });
    }
  }
  // de-dup by sel+ratio
  const seen = new Set();
  return out.filter((o) => {
    const k = o.sel + o.ratio + o.fontSize;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

const all = {};
for (const [key, url] of PAGES) {
  all[key] = {};
  for (const w of [390, 1440]) {
    const c = await b.newContext({ viewport: { width: w, height: w < 768 ? 844 : 900 }, isMobile: w < 768, hasTouch: w < 768, deviceScaleFactor: 1 });
    const p = await c.newPage();
    await p.goto(url, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(500);
    const fails = await p.evaluate(FN);
    all[key][w] = fails;
    console.log(`\n### ${key} @${w} — ${fails.length} text nodes below WCAG AA`);
    fails.slice(0, 12).forEach((f) => console.log(`   ${String(f.ratio).padStart(5)}:1 (need ${f.required})  ${f.fontSize}/${f.weight}  ${f.color} on ${f.bg}  ${f.sel}  :: ${f.text.slice(0, 45)}`));
    await c.close();
  }
}
fs.writeFileSync(process.argv[2], JSON.stringify(all, null, 2));
await b.close();
