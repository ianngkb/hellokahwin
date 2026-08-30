/**
 * Search-field accessibility measurement — UI-09's rig.
 *
 *   node scripts/measure-search-a11y.mjs <origin> [--widths 390,768,1024,1440]
 *                                        [--shots <dir>] [--json <file>]
 *
 * Requires playwright-core and the installed Chrome, neither of which is a
 * dependency of the app (same contract as `scripts/measure-nav-overflow.mjs`).
 * If playwright-core is not in this checkout, install it anywhere and point
 * NODE_PATH at that node_modules:
 *
 *   npm i playwright-core --prefix /some/scratch
 *   NODE_PATH=/some/scratch/node_modules \
 *     node scripts/measure-search-a11y.mjs https://hellokahwin.com
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE FIVE THINGS IT DECIDES, AND WHY EACH IS MEASURED THE WAY IT IS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 1. FOCUS INDICATOR under `:focus-visible`. The field is reached BY KEYBOARD —
 *    Tab is pressed until `document.activeElement` is the input — rather than
 *    by calling `.focus()`. A programmatic focus can match `:focus-visible` on
 *    a text field even where a keyboard would not, so a rig that only calls
 *    `.focus()` cannot tell a real indicator from an accident. The keyboard
 *    path is the claim; `.focus()` is recorded beside it as a control.
 *
 * 2. ACCESSIBLE NAME is read out of the browser's own accessibility tree via
 *    CDP `Accessibility.getPartialAXTree`, not inferred from the attributes on
 *    the element. Reading `aria-label` back tells you what you wrote; the AX
 *    tree tells you what a screen reader computes, including the case this
 *    item exists to kill — a name that is really just the placeholder.
 *
 * 3. LIVE REGION. `[aria-live]`, `[role=status]` and `[role=alert]` are
 *    ENUMERATED on the page BEFORE anything is typed, and each one's tag,
 *    id and text is printed. A live region created at the same moment its
 *    content arrives is the classic reason an announcement is never made
 *    (DES-06 §8), so "a region exists once results are open" is not the test —
 *    "a region existed from first render, and its text changed" is.
 *
 * 4. FONT-SIZE. iOS Safari zooms the page when a field under 16px takes focus.
 *    The computed value is what decides that, not the utility class.
 *
 * 5. HIT HEIGHT. `getBoundingClientRect().height` on the input, plus the
 *    height of any padded ancestor that is also part of the hit area.
 *
 * COLOURS ARE RESOLVED THROUGH A CANVAS, NEVER PARSED FROM getComputedStyle.
 * Every token on this site is authored in `oklch()`, and Chrome hands those
 * back as `oklch(...)` or `lab(...)` strings. An rgb() parser pointed at one
 * of those does not fail — it reports confident garbage. Painting the colour
 * into a 1×1 canvas and reading the pixel back is the only way to get the
 * sRGB triple the reader actually sees, which is what the WCAG 1.4.11 ratio
 * has to be computed from.
 *
 * WIDTH IS ASSERTED, NOT REQUESTED. Each row carries `innerWidth`, the layout
 * width (`documentElement.clientWidth`) and two `matchMedia` results, so a
 * "measured at 390" claim can be checked rather than believed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const argv = process.argv.slice(2);
const origin = argv.find((a) => !a.startsWith('--'));
const opt = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d);

if (!origin) {
  console.error(
    'usage: node scripts/measure-search-a11y.mjs <origin> [--widths 390,768,1024,1440] [--shots dir] [--json file]',
  );
  process.exit(1);
}

const widths = opt('widths', '390,768,1024,1440')
  .split(',')
  .map((w) => Number(w.trim()));
const shotsDir = opt('shots', null);
const jsonOut = opt('json', null);
/** A query that matches real articles, and one that cannot match anything. */
const HIT_QUERY = opt('hit', 'hantaran');
const MISS_QUERY = opt('miss', 'zzzqqqxyz');

if (shotsDir) fs.mkdirSync(shotsDir, { recursive: true });

/* ── In-page helpers, injected once per document ──────────────────────────
   A REAL FUNCTION, handed to addInitScript as a function, never a template
   literal. The first version of this rig defined these helpers inside a
   backticked string, which silently ate every backslash in every regex:
   `[\d.]+px` became `[d.]+px`, matched nothing, and the rig reported "no
   focus ring" on a field whose ring it had itself printed one line earlier.
   The two outputs disagreeing is the only reason it was caught. Keep this a
   function; the escaping hazard does not exist for one. */
function installHelpers() {
  window.__ui09 = {
    /* Paint a CSS colour into a 1x1 canvas and read the pixel back. The only
     reliable way to get sRGB out of an oklch()/lab() computed value. */
    srgb(css) {
      const c = document.createElement('canvas');
      c.width = c.height = 1;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.clearRect(0, 0, 1, 1);
      x.fillStyle = '#000';
      x.fillStyle = css;
      const resolved = x.fillStyle;
      x.fillRect(0, 0, 1, 1);
      const d = x.getImageData(0, 0, 1, 1).data;
      return { css, resolved, r: d[0], g: d[1], b: d[2], a: +(d[3] / 255).toFixed(3) };
    },
    lum(p) {
      const f = (v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(p.r) + 0.7152 * f(p.g) + 0.0722 * f(p.b);
    },
    /* Flatten a possibly-translucent colour onto the ground it is drawn over.
     Skipping this is exactly how the shipped ring/30 got read as ink: the
     unflattened triple is rgb(22,20,18) and scores 17.64:1, while what the
     reader's eye receives is 30% of that over paper — rgb(183,181,178),
     1.95:1, below the 3:1 that WCAG 2.2 SC 1.4.11 asks of an indicator. */
    over(fg, bg) {
      const a = fg.a;
      return {
        r: Math.round(a * fg.r + (1 - a) * bg.r),
        g: Math.round(a * fg.g + (1 - a) * bg.g),
        b: Math.round(a * fg.b + (1 - a) * bg.b),
        a: 1,
      };
    },
    ratio(a, b) {
      const l1 = this.lum(a),
        l2 = this.lum(b);
      return +((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2);
    },
    /* Every layer of a computed box-shadow, split on top-level commas so that
     the commas inside oklab(...) / rgba(...) do not tear a layer in half.
     The shipped field paints its ring as a box-shadow layer with a 2px
     spread among four fully-transparent Tailwind placeholder layers; a rig
     that truncates the string sees only the placeholders and reports "no
     ring at all" for a ring that is really there and merely too faint. */
    shadowLayers(css) {
      if (!css || css === 'none') return [];
      const out = [];
      let depth = 0,
        cur = '';
      for (const ch of css) {
        if (ch === '(') depth++;
        if (ch === ')') depth--;
        if (ch === ',' && depth === 0) {
          out.push(cur.trim());
          cur = '';
          continue;
        }
        cur += ch;
      }
      if (cur.trim()) out.push(cur.trim());
      return out.map((layer) => {
        const colourMatch = layer.match(
          /^(rgba?\([^)]*\)|oklab\([^)]*\)|oklch\([^)]*\)|lab\([^)]*\)|#[0-9a-f]+|[a-z]+)/i,
        );
        const colour = colourMatch ? colourMatch[0] : null;
        const lengths = (layer.slice(colour ? colour.length : 0).match(/-?[\d.]+px/g) || []).map(
          parseFloat,
        );
        return {
          layer,
          colour,
          srgb: colour ? this.srgb(colour) : null,
          offsetX: lengths[0] ?? null,
          offsetY: lengths[1] ?? null,
          blur: lengths[2] ?? null,
          spread: lengths[3] ?? null,
        };
      });
    },
    /* The search field, found structurally: every <input> inside #cari.
     Enumerated rather than looked up by selector, so a markup change shows
     up as a different count instead of as a silent null. */
    inputs() {
      /* Scoped to #cari and NEVER falling back to the document: the fallback
         is what let this rig measure a Vercel SSO form's password field. */
      const anchor = document.getElementById('cari');
      if (!anchor) return [];
      return Array.from(anchor.querySelectorAll('input'));
    },
    input() {
      return this.inputs()[0] || null;
    },
    /* Every live region on the page, enumerated with its text. */
    liveRegions() {
      return Array.from(
        document.querySelectorAll('[aria-live], [role="status"], [role="alert"]'),
      ).map((el) => ({
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        role: el.getAttribute('role'),
        ariaLive: el.getAttribute('aria-live'),
        ariaAtomic: el.getAttribute('aria-atomic'),
        className: String(el.className).slice(0, 60),
        text: (el.textContent || '').trim().slice(0, 120),
      }));
    },
    viewport() {
      return {
        innerWidth: window.innerWidth,
        layoutWidth: document.documentElement.clientWidth,
        dpr: window.devicePixelRatio,
        mqMax767: matchMedia('(max-width: 767px)').matches,
        mqMin1024: matchMedia('(min-width: 1024px)').matches,
      };
    },
  };
}

/** Computed name + name sources for a node, straight out of Chrome's AX tree. */
async function accessibleName(client, page) {
  const doc = await client.send('DOM.getDocument', { depth: -1, pierce: true });
  const { nodeId } = await client.send('DOM.querySelector', {
    nodeId: doc.root.nodeId,
    selector: '#cari input',
  });
  if (!nodeId) return { error: 'no #cari input in DOM' };
  const { nodes } = await client.send('Accessibility.getPartialAXTree', {
    nodeId,
    fetchRelatives: false,
  });
  const node = nodes[0];
  if (!node) return { error: 'no AX node' };
  const attrs = await page.evaluate(() => {
    const i = window.__ui09.input();
    const id = i.id;
    const label = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
    return {
      id: id || null,
      ariaLabel: i.getAttribute('aria-label'),
      ariaLabelledby: i.getAttribute('aria-labelledby'),
      placeholder: i.getAttribute('placeholder'),
      wrappingLabel: i.closest('label') ? i.closest('label').textContent.trim() : null,
      labelForText: label ? label.textContent.trim() : null,
      labelForVisible: label ? !label.className.includes('sr-only') : null,
    };
  });
  return {
    computedName: node.name ? node.name.value : null,
    nameFrom:
      node.name && node.name.sources
        ? node.name.sources.filter((s) => s.value || s.attributeValue).map((s) => s.type)
        : [],
    role: node.role ? node.role.value : null,
    attrs,
  };
}

/**
 * Walk to the search input with Tab, starting from the FIRST focusable element
 * in the document.
 *
 * The obvious version of this — blur the input, then Tab — reports "reached in
 * 1 press" on this page and proves nothing: `/artikel#cari` focuses the field
 * on arrival, and Chrome keeps the sequential-navigation starting point where
 * the blur left it. Starting the walk at the top of the tab order makes the
 * press count a real journey through the masthead, so a field that has fallen
 * out of the tab order shows up as `reached: false` instead of as a 1.
 */
async function tabToInput(page, cap = 80) {
  const start = await page.evaluate(() => {
    window.scrollTo(0, 0);
    const focusables = Array.from(
      document.querySelectorAll(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => !el.disabled && el.offsetParent !== null);
    const first = focusables[0];
    if (!first) return null;
    first.focus();
    return first.tagName.toLowerCase() + ' :: ' + (first.textContent || '').trim().slice(0, 30);
  });
  for (let n = 1; n <= cap; n++) {
    await page.keyboard.press('Tab');
    const hit = await page.evaluate(() => document.activeElement === window.__ui09.input());
    if (hit) return { reached: true, presses: n, startedAt: start };
  }
  return { reached: false, presses: cap, startedAt: start };
}

/* Vercel deployment protection sits in front of preview URLs and answers a
   302 to an SSO page, which is a page with an <input> on it — so a rig that
   hunts for "the first input" measures Vercel's login form and reports
   numbers. The bypass secret is read from the environment, never from argv,
   so it stays out of shell history; production needs none of this. */
const BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || null;

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const report = [];

for (const width of widths) {
  const isPhone = width < 768;
  const ctx = await browser.newContext({
    viewport: { width, height: isPhone ? 844 : 900 },
    isMobile: isPhone,
    hasTouch: isPhone,
    deviceScaleFactor: 1,
    userAgent: isPhone
      ? 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36'
      : undefined,
    extraHTTPHeaders: BYPASS
      ? {
          'x-vercel-protection-bypass': BYPASS,
          'x-vercel-set-bypass-cookie': 'true',
        }
      : undefined,
  });
  await ctx.addInitScript(installHelpers);
  const page = await ctx.newPage();
  const client = await ctx.newCDPSession(page);
  await client.send('DOM.enable');
  await client.send('Accessibility.enable');

  const url = `${origin.replace(/\/$/, '')}/artikel#cari`;
  const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);

  const row = { width, url, status: resp ? resp.status() : null };
  row.viewport = await page.evaluate(() => window.__ui09.viewport());

  /* Refuse to measure anything that is not the search surface. An auth wall,
     an error boundary and the real page can all end up with an <input> on
     them; the first version of this rig fell back to `document.body` when
     `#cari` was missing and happily measured Vercel's SSO form. Quote
     something only the real page has, and stop if it is not there. */
  row.identity = await page.evaluate(() => ({
    hasCariAnchor: !!document.getElementById('cari'),
    finalUrl: location.href,
    title: document.title,
    articleLinks: Array.from(document.querySelectorAll('a')).filter((a) =>
      /^\/artikel\/[^/]+\/[^/]+/.test(a.getAttribute('href') || ''),
    ).length,
  }));
  if (!row.identity.hasCariAnchor) {
    console.error(
      `
STOP at ${width}px: no #cari on ${row.identity.finalUrl} ` +
        `(HTTP ${row.status}, title "${row.identity.title}", ` +
        `${row.identity.articleLinks} article links). This is not the search ` +
        `surface — refusing to measure it.`,
    );
    process.exit(2);
  }

  /* ── 3. Live regions BEFORE anything is typed ────────────────────── */
  row.liveRegionsAtFirstRender = await page.evaluate(() => window.__ui09.liveRegions());

  /* ── Structural census of the field ──────────────────────────────── */
  row.field = await page.evaluate(() => {
    const all = window.__ui09.inputs();
    const i = all[0];
    if (!i) return { inputsUnderCari: 0 };
    const cs = getComputedStyle(i);
    const r = i.getBoundingClientRect();
    return {
      inputsUnderCari: all.length,
      type: i.type,
      autocomplete: i.getAttribute('autocomplete'),
      enterKeyHint: i.getAttribute('enterkeyhint'),
      role: i.getAttribute('role'),
      ariaExpanded: i.getAttribute('aria-expanded'),
      ariaControls: i.getAttribute('aria-controls'),
      ariaAutocomplete: i.getAttribute('aria-autocomplete'),
      ariaDescribedby: i.getAttribute('aria-describedby'),
      /* 4 + 5 */
      fontSizePx: parseFloat(cs.fontSize),
      lineHeight: cs.lineHeight,
      heightPx: +r.height.toFixed(2),
      widthPx: +r.width.toFixed(2),
      paddingBlock: `${cs.paddingTop} / ${cs.paddingBottom}`,
      borderWidth: cs.borderTopWidth,
      minHeight: cs.minHeight,
    };
  });

  /* The RESTING boundary of the control. WCAG 2.2 SC 1.4.11 asks 3:1 of the
     visual information needed to identify a form control, which for a field
     drawn as a hairline pill is the hairline. Measured before focus, and
     flattened over the ground the same way the focus ring is. */
  row.restingBorder = await page.evaluate(() => {
    const U = window.__ui09;
    const i = U.input();
    i.blur();
    const cs = getComputedStyle(i);
    let g = i.parentElement;
    let groundCss = 'rgba(0,0,0,0)';
    while (g) {
      const bg = getComputedStyle(g).backgroundColor;
      if (U.srgb(bg).a > 0) {
        groundCss = bg;
        break;
      }
      g = g.parentElement;
    }
    const ground = U.srgb(groundCss);
    const border = U.srgb(cs.borderTopColor);
    const flat = U.over(border, ground);
    return {
      raw: cs.borderTopColor,
      srgb: flat,
      groundSrgb: ground,
      ratio: U.ratio(flat, ground),
      passes1411: U.ratio(flat, ground) >= 3,
    };
  });

  /* ── ARIA structure of the popup, listbox nesting included ───────── */
  row.popupStructureIdle = await page.evaluate(() => {
    const listboxes = Array.from(document.querySelectorAll('[role="listbox"]'));
    return {
      listboxCount: listboxes.length,
      nestedListbox: listboxes.some((l) => l.querySelector('[role="listbox"]')),
      optionCount: document.querySelectorAll('[role="option"]').length,
    };
  });

  /* ── 2. Accessible name ──────────────────────────────────────────── */
  row.accessibleName = await accessibleName(client, page);

  /* ── 1. Focus indicator, reached by keyboard ─────────────────────── */
  const tab = await tabToInput(page);
  row.keyboard = tab;
  /* The field carries `transition-shadow`, and getComputedStyle returns a LIVE
     declaration: read boxShadow twice during that transition and you get two
     different answers. The first version of this rig did exactly that and
     reported "no ring" for a ring it had itself printed one line later, caught
     only because the two disagreed. Settle the transition, then snapshot every
     value into a plain string before anything is derived from it. */
  await page.waitForTimeout(700);
  row.focusVisible = await page.evaluate(() => {
    const U = window.__ui09;
    const i = U.input();
    const live = getComputedStyle(i);
    const cs = {
      outlineStyle: live.outlineStyle,
      outlineWidth: live.outlineWidth,
      outlineOffset: live.outlineOffset,
      outlineColor: live.outlineColor,
      boxShadow: live.boxShadow,
      transition: live.transitionProperty + ' ' + live.transitionDuration,
    };
    /* The ground the indicator is drawn over: the nearest ancestor that
       actually paints a background, not `body` on faith. */
    let groundEl = i.parentElement;
    let groundCss = 'rgba(0,0,0,0)';
    while (groundEl) {
      const bg = getComputedStyle(groundEl).backgroundColor;
      if (U.srgb(bg).a > 0) {
        groundCss = bg;
        break;
      }
      groundEl = groundEl.parentElement;
    }
    const ground = U.srgb(groundCss);

    const outlineRaw = U.srgb(cs.outlineColor);
    const outlineFlat = U.over(outlineRaw, ground);
    const drawsOutline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;

    /* The ring may be painted as a box-shadow instead. Take the widest
       spread layer that is not fully transparent. */
    const layers = U.shadowLayers(cs.boxShadow);
    const ringLayers = layers
      .filter((l) => l.srgb && l.srgb.a > 0 && (l.spread || 0) > 0)
      .sort((a, b) => (b.spread || 0) - (a.spread || 0));
    const ring = ringLayers[0] || null;
    const ringFlat = ring ? U.over(ring.srgb, ground) : null;

    return {
      reachedByKeyboard: document.activeElement === i,
      matchesFocusVisible: i.matches(':focus-visible'),
      groundCss,
      groundSrgb: ground,
      transition: cs.transition,

      outlineStyle: cs.outlineStyle,
      outlineWidth: cs.outlineWidth,
      outlineOffset: cs.outlineOffset,
      outlineColorRaw: cs.outlineColor,
      outlineSrgbUnflattened: outlineRaw,
      outlineSrgbOverGround: outlineFlat,
      /* WCAG 2.2 SC 1.4.11 — an indicator needs 3:1 against what is adjacent
         to it, computed on the colour the eye receives, alpha flattened. */
      outlineRatio: drawsOutline ? U.ratio(outlineFlat, ground) : null,

      boxShadow: cs.boxShadow,
      boxShadowLayerCount: layers.length,
      ringLayer: ring ? ring.layer : null,
      ringSpreadPx: ring ? ring.spread : null,
      ringAlpha: ring ? ring.srgb.a : null,
      ringSrgbOverGround: ringFlat,
      ringRatio: ringFlat ? U.ratio(ringFlat, ground) : null,

      /* One number the verdict turns on: the strongest indicator present. */
      bestIndicator: (() => {
        const cands = [];
        if (drawsOutline) {
          cands.push({
            kind: 'outline',
            widthPx: parseFloat(cs.outlineWidth),
            ratio: U.ratio(outlineFlat, ground),
          });
        }
        if (ringFlat) {
          cands.push({
            kind: 'box-shadow',
            widthPx: ring.spread,
            ratio: U.ratio(ringFlat, ground),
          });
        }
        cands.sort((a, b) => b.ratio - a.ratio);
        return cands[0] || { kind: 'none', widthPx: 0, ratio: 1 };
      })(),
    };
  });
  /* Control: the same read after a programmatic focus, so the two can be
     compared rather than conflated. */
  await page.evaluate(() => {
    const i = window.__ui09.input();
    i.blur();
    i.focus();
  });
  await page.waitForTimeout(700);
  row.focusProgrammatic = await page.evaluate(() => {
    const i = window.__ui09.input();
    const cs = getComputedStyle(i);
    return {
      matchesFocusVisible: i.matches(':focus-visible'),
      outlineStyle: cs.outlineStyle,
      outlineWidth: cs.outlineWidth,
      boxShadow: cs.boxShadow,
    };
  });
  if (shotsDir) {
    await page.screenshot({ path: path.join(shotsDir, `search-${width}-a-focus.png`) });
  }

  /* ── 3b. Announcement, results ───────────────────────────────────── */
  const input = page.locator('#cari input').first();
  await input.click();
  await input.fill(HIT_QUERY);
  await page.waitForTimeout(1800);
  row.hit = {
    query: HIT_QUERY,
    liveRegions: await page.evaluate(() => window.__ui09.liveRegions()),
    visibleOptions: await page.evaluate(() => document.querySelectorAll('[role="option"]').length),
    popupStructure: await page.evaluate(() => {
      const listboxes = Array.from(document.querySelectorAll('[role="listbox"]'));
      return {
        listboxCount: listboxes.length,
        nestedListbox: listboxes.some((l) => l.querySelector('[role="listbox"]')),
      };
    }),
  };
  if (shotsDir) {
    await page.screenshot({ path: path.join(shotsDir, `search-${width}-b-results.png`) });
  }

  /* ── 3c. Announcement, no results ────────────────────────────────── */
  await input.fill(MISS_QUERY);
  await page.waitForTimeout(1800);
  row.miss = {
    query: MISS_QUERY,
    liveRegions: await page.evaluate(() => window.__ui09.liveRegions()),
    visibleOptions: await page.evaluate(() => document.querySelectorAll('[role="option"]').length),
    panelText: await page.evaluate(() => {
      const anchor = document.getElementById('cari');
      return anchor ? anchor.innerText.replace(/\n+/g, ' | ').slice(0, 200) : null;
    }),
  };
  if (shotsDir) {
    await page.screenshot({ path: path.join(shotsDir, `search-${width}-c-empty.png`) });
  }

  /* ── Verdicts, one per DoD clause ────────────────────────────────── */
  const f = row.focusVisible;
  const fld = row.field;
  const live0 = row.liveRegionsAtFirstRender;
  const announced = (regions, before) => {
    /* An announcement counts only if a region that existed at first render
       now carries text. A region that appeared with its content does not. */
    const ids0 = new Set(before.map((r) => `${r.tag}#${r.id}.${r.className}`));
    return regions.some((r) => r.text.length > 0 && ids0.has(`${r.tag}#${r.id}.${r.className}`));
  };
  row.verdict = {
    /* An indicator counts only if it is REACHED by keyboard, MATCHES
       :focus-visible, is at least 2px thick, and clears 3:1 against the
       ground once its alpha is flattened. The shipped ring meets three of
       those four and fails the fourth at 1.95:1, which is why "is there a
       box-shadow" was never the right question. */
    '1_focusIndicator':
      f.reachedByKeyboard &&
      f.matchesFocusVisible &&
      f.bestIndicator.widthPx >= 2 &&
      f.bestIndicator.ratio >= 3
        ? 'PASS'
        : 'FAIL',
    '2_accessibleName':
      row.accessibleName.computedName &&
      row.accessibleName.computedName.length > 0 &&
      !row.accessibleName.nameFrom.every((s) => s === 'placeholder')
        ? 'PASS'
        : 'FAIL',
    '3_liveRegion':
      live0.length > 0 &&
      announced(row.hit.liveRegions, live0) &&
      announced(row.miss.liveRegions, live0)
        ? 'PASS'
        : 'FAIL',
    '4_fontSize16': fld.fontSizePx >= 16 ? 'PASS' : 'FAIL',
    '5_hitHeight44': fld.heightPx >= 44 ? 'PASS' : 'FAIL',
  };

  report.push(row);
  await ctx.close();
}

await browser.close();

/* ── Print ───────────────────────────────────────────────────────────── */
console.log(`\nUI-09 search accessibility — ${origin}`);
console.log(`Chrome: ${CHROME}\n`);
for (const r of report) {
  console.log(
    `── ${r.width}px  (innerWidth ${r.viewport.innerWidth}, layout ${r.viewport.layoutWidth}, ` +
      `mq<=767 ${r.viewport.mqMax767}, mq>=1024 ${r.viewport.mqMin1024}, HTTP ${r.status}) ──`,
  );
  const f = r.focusVisible;
  const px = (c) => `rgb(${c.r},${c.g},${c.b})`;
  console.log(
    `  1 focus       ${r.verdict['1_focusIndicator']}  best=${f.bestIndicator.kind} ` +
      `${f.bestIndicator.widthPx}px  ${f.bestIndicator.ratio}:1 (floor 3:1)`,
  );
  console.log(
    `                outline: ${f.outlineStyle} ${f.outlineWidth} offset ${f.outlineOffset}` +
      (f.outlineRatio !== null
        ? `  ${px(f.outlineSrgbOverGround)} ${f.outlineRatio}:1`
        : '  (not drawn)'),
  );
  console.log(
    `                box-shadow: ${f.boxShadowLayerCount} layers, ring=` +
      (f.ringLayer
        ? `${f.ringSpreadPx}px alpha ${f.ringAlpha} -> ${px(f.ringSrgbOverGround)} ${f.ringRatio}:1`
        : 'none'),
  );
  console.log(
    `                ground ${px(f.groundSrgb)}  :focus-visible ${f.matchesFocusVisible}  ` +
      `reached by Tab x${r.keyboard.presses} from ${r.keyboard.startedAt}`,
  );
  console.log(
    `  2 name        ${r.verdict['2_accessibleName']}  computed "${r.accessibleName.computedName}" ` +
      `from [${r.accessibleName.nameFrom.join(', ')}]  role ${r.accessibleName.role}`,
  );
  console.log(
    `  3 live region ${r.verdict['3_liveRegion']}  at first render ${r.liveRegionsAtFirstRender.length} ` +
      `${JSON.stringify(r.liveRegionsAtFirstRender.map((x) => x.role || x.ariaLive))}  ` +
      `hit "${(r.hit.liveRegions.find((x) => x.text) || {}).text || ''}"  ` +
      `miss "${(r.miss.liveRegions.find((x) => x.text) || {}).text || ''}"`,
  );
  console.log(
    `  4 font-size   ${r.verdict['4_fontSize16']}  ${r.field.fontSizePx}px (line-height ${r.field.lineHeight})`,
  );
  console.log(
    `  5 hit height  ${r.verdict['5_hitHeight44']}  ${r.field.heightPx}px x ${r.field.widthPx}px ` +
      `(padding ${r.field.paddingBlock}, border ${r.field.borderWidth}, min-height ${r.field.minHeight})`,
  );
  console.log(
    `    aria        listbox x${r.hit.popupStructure.listboxCount} nested=${r.hit.popupStructure.nestedListbox} ` +
      `options=${r.hit.visibleOptions}`,
  );
  console.log(
    `    border      ${r.restingBorder.passes1411 ? 'PASS' : 'FAIL'} resting ${px(r.restingBorder.srgb)} ` +
      `${r.restingBorder.ratio}:1 vs ${px(r.restingBorder.groundSrgb)}  (SC 1.4.11 floor 3:1 — not a DoD clause)`,
  );
  console.log('');
}

const failed = report.filter((r) => Object.values(r.verdict).includes('FAIL'));
console.log(
  failed.length === 0
    ? `ALL PASS — ${report.length} widths x 5 clauses`
    : `FAIL at ${failed.map((r) => r.width + 'px').join(', ')}`,
);

if (jsonOut) {
  fs.mkdirSync(path.dirname(jsonOut), { recursive: true });
  fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2));
  console.log(`json → ${jsonOut}`);
}

process.exit(failed.length === 0 ? 0 : 1);
