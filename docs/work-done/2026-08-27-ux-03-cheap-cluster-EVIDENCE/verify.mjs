import { chromium } from 'playwright-core';

const BASE = process.argv[2];
const OUT = process.argv[3] || '.';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

async function ctxFor(w, h) {
  const mobile = w < 700;
  return browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile,
    hasTouch: mobile,
    userAgent: mobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : undefined,
  });
}

// WCAG relative luminance from an "rgb(r, g, b)" string
const CONTRAST = `(a, b) => {
  const p = (s) => (s.match(/[\\d.]+/g) || []).slice(0, 3).map(Number);
  const L = (c) => { const f = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
  const [x, y] = [L(p(a)), L(p(b))].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}`;

const results = {};

// ---------- 1 + 3 + 5: homepage at desktop and mobile ----------
for (const [label, w, h] of [['desktop', 1905, 1000], ['at1400', 1400, 900], ['mobile', 390, 844]]) {
  const ctx = await ctxFor(w, h);
  const page = await ctx.newPage();
  const fetched = [];
  page.on('response', (r) => {
    if (/^image\//.test(r.headers()['content-type'] || '') && /crop-/.test(r.url())) {
      fetched.push({ crop: (r.url().match(/crop-[a-z0-9.x-]+/i) || ['?'])[0], bytes: Number(r.headers()['content-length'] || 0) });
    }
  });
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(1200);

  const data = await page.evaluate(
    ({ CONTRAST_SRC }) => {
      const contrast = eval('(' + CONTRAST_SRC + ')');
      const out = { viewport: { w: innerWidth, h: innerHeight } };

      // --- hero ---
      const img = document.querySelector('section picture img, section img');
      if (img) {
        const r = img.getBoundingClientRect();
        out.hero = {
          src: img.currentSrc || img.src,
          crop: ((img.currentSrc || img.src).match(/crop-[a-z0-9.x-]+/i) || ['?'])[0],
          intrinsic: { w: img.naturalWidth, h: img.naturalHeight },
          rendered: { w: Math.round(r.width), h: Math.round(r.height) },
          insidePicture: img.parentElement?.tagName === 'PICTURE',
          sourceCount: img.parentElement?.querySelectorAll('source').length ?? 0,
        };
        const s = out.hero;
        const scale = Math.max(s.rendered.w / s.intrinsic.w, s.rendered.h / s.intrinsic.h);
        const shownW = s.rendered.w / scale, shownH = s.rendered.h / scale;
        s.coverScale = Number(scale.toFixed(4));
        s.upscaledPct = Number(((scale - 1) * 100).toFixed(1));
        s.frameDiscardedPct = Number(((1 - (shownW * shownH) / (s.intrinsic.w * s.intrinsic.h)) * 100).toFixed(1));
      } else out.hero = null;

      // --- duplicate rail gone? ---
      out.homepageRail = document.querySelector('nav[aria-label="Kategori"]:not(header nav)') ? 'STILL PRESENT' : 'gone';
      const header = document.querySelector('header');
      out.navsOutsideHeader = [...document.querySelectorAll('nav')].filter((n) => !header?.contains(n) && !n.closest('footer')).length;

      // --- masthead scroller + affordance ---
      const sc = header ? [...header.querySelectorAll('*')].find((e) => { const cs = getComputedStyle(e); return cs.overflowX === 'auto' || cs.overflowX === 'scroll'; }) : null;
      if (sc) {
        const wrap = sc.parentElement;
        const before = getComputedStyle(wrap, '::before'), after = getComputedStyle(wrap, '::after');
        out.scroller = {
          scrollWidth: sc.scrollWidth, clientWidth: sc.clientWidth,
          hiddenPx: sc.scrollWidth - sc.clientWidth,
          wrapperClass: wrap.className,
          dataOverflowEnd: wrap.getAttribute('data-overflow-end'),
          dataOverflowStart: wrap.getAttribute('data-overflow-start'),
          afterOpacity: after.opacity, afterWidth: after.width,
          afterHasChevron: /svg/.test(after.backgroundImage) ? 'yes' : 'no',
          beforeOpacity: before.opacity,
        };
        const seen = new Set();
        const links = [...sc.querySelectorAll('a[href]')].filter((a) => /^\/artikel\/[a-z0-9-]+$/.test(a.getAttribute('href')) && !seen.has(a.getAttribute('href')) && seen.add(a.getAttribute('href')));
        out.pillars = links.map((a) => ({ href: a.getAttribute('href'), name: a.textContent.trim().slice(0, 30), left: Math.round(a.getBoundingClientRect().left) }));
        // can we reach the last pillar by scrolling?
        out.maxScrollLeft = sc.scrollWidth - sc.clientWidth;
      } else out.scroller = null;

      // --- search in masthead ---
      const s2 = header ? [...header.querySelectorAll('a')].find((a) => (a.getAttribute('href') || '').includes('#cari')) : null;
      out.search = s2 ? { href: s2.getAttribute('href'), ariaLabel: s2.getAttribute('aria-label'), rect: (() => { const r = s2.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })() } : null;

      // --- hk-chip contrast (chips live on /artikel, measure the token here) ---
      const probe = document.createElement('span');
      probe.className = 'hk-chip';
      (document.querySelector('.hk-public') || document.body).appendChild(probe);
      const pcs = getComputedStyle(probe);
      const bg = getComputedStyle(document.querySelector('.hk-public') || document.body).backgroundColor;
      out.chip = { borderColor: pcs.borderTopColor, borderWidth: pcs.borderTopWidth, pageBg: bg, contrast: Number(contrast(pcs.borderTopColor, bg).toFixed(3)) };
      probe.remove();
      return out;
    },
    { CONTRAST_SRC: CONTRAST },
  );
  data.cropsFetched = fetched;
  results[label] = data;

  if (label === 'at1400') {
    await page.screenshot({ path: `${OUT}/AFTER-1400-masthead.png`, clip: { x: 0, y: 0, width: 1400, height: 220 } });
    // scroll the rail fully right and shoot again to prove all nine are reachable
    await page.evaluate(() => {
      const h = document.querySelector('header');
      const sc = [...h.querySelectorAll('*')].find((e) => getComputedStyle(e).overflowX === 'auto');
      if (sc) sc.scrollLeft = sc.scrollWidth;
    });
    await page.waitForTimeout(500);
    const scrolled = await page.evaluate(() => {
      const h = document.querySelector('header');
      const sc = [...h.querySelectorAll('*')].find((e) => getComputedStyle(e).overflowX === 'auto');
      const wrap = sc.parentElement;
      const scR = sc.getBoundingClientRect();
      const seen = new Set();
      const links = [...sc.querySelectorAll('a[href]')].filter((a) => /^\/artikel\/[a-z0-9-]+$/.test(a.getAttribute('href')) && !seen.has(a.getAttribute('href')) && seen.add(a.getAttribute('href')));
      return {
        scrollLeft: Math.round(sc.scrollLeft),
        dataOverflowStart: wrap.getAttribute('data-overflow-start'),
        dataOverflowEnd: wrap.getAttribute('data-overflow-end'),
        lastVisible: links.filter((a) => { const r = a.getBoundingClientRect(); return r.left >= scR.left - 1 && r.right <= scR.right + 1; }).map((a) => a.textContent.trim().slice(0, 30)),
      };
    });
    results.at1400_scrolledRight = scrolled;
    await page.screenshot({ path: `${OUT}/AFTER-1400-masthead-scrolled.png`, clip: { x: 0, y: 0, width: 1400, height: 220 } });
  }
  if (label === 'mobile') await page.screenshot({ path: `${OUT}/AFTER-390-home.png` });
  await ctx.close();
}

// ---------- 5: search reachable + focuses ----------
{
  const ctx = await ctxFor(390, 844);
  const page = await ctx.newPage();
  await page.goto(BASE + '/artikel#cari', { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(1500);
  results.searchLanding = await page.evaluate(() => {
    const el = document.getElementById('cari');
    const input = el?.querySelector('input');
    return {
      anchorExists: !!el,
      inputFocused: document.activeElement === input,
      activeTag: document.activeElement?.tagName,
      placeholder: input?.placeholder ?? null,
      anchorTopAfterScroll: el ? Math.round(el.getBoundingClientRect().top) : null,
      headerHeight: Math.round(document.querySelector('header')?.getBoundingClientRect().height ?? 0),
    };
  });
  await page.screenshot({ path: `${OUT}/AFTER-390-search-focused.png` });
  await ctx.close();
}

// ---------- 6: chips on a page that actually renders them ----------
{
  const ctx = await ctxFor(1400, 900);
  const page = await ctx.newPage();
  await page.goto(BASE + '/artikel', { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(800);
  results.chipsLive = await page.evaluate(
    ({ CONTRAST_SRC }) => {
      const contrast = eval('(' + CONTRAST_SRC + ')');
      const chips = [...document.querySelectorAll('.hk-chip')];
      if (!chips.length) return { count: 0 };
      const c = chips[0];
      const cs = getComputedStyle(c);
      let bgEl = c.parentElement, bg = 'rgba(0, 0, 0, 0)';
      while (bgEl && (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent')) { bg = getComputedStyle(bgEl).backgroundColor; bgEl = bgEl.parentElement; }
      return { count: chips.length, borderColor: cs.borderTopColor, borderWidth: cs.borderTopWidth, behind: bg, contrast: Number(contrast(cs.borderTopColor, bg).toFixed(3)), minHeight: cs.minHeight };
    },
    { CONTRAST_SRC: CONTRAST },
  );
  await ctx.close();
}

// ---------- 4: cluster order on the three misordered pillars ----------
{
  const ctx = await ctxFor(1400, 900);
  const page = await ctx.newPage();
  results.pillars = {};
  for (const p of ['venue-perancangan', 'sebelum-nikah', 'pelamin-kad-cenderahati', 'nikah-undang-undang', 'hantaran-mas-kahwin']) {
    await page.goto(`${BASE}/artikel/${p}`, { waitUntil: 'networkidle', timeout: 120000 });
    await page.waitForTimeout(400);
    results.pillars[p] = await page.evaluate(() =>
      [...document.querySelectorAll('section[aria-labelledby^="cluster-"]')].map((s) => ({
        name: s.querySelector('h2')?.textContent.trim().slice(0, 44),
        articles: s.querySelectorAll('li a').length,
        empty: /akan datang tidak lama lagi/.test(s.textContent),
      })),
    );
  }
  await ctx.close();
}

console.log(JSON.stringify(results, null, 2));
await browser.close();
