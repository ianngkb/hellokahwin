// DES-03 - probes the built artifact in a real layout engine, 28 Ogos 2026.
//
// Checks the things a specification artifact can silently get wrong: a phone
// frame that is not actually 360 px, a page that scrolls sideways, a drawn
// control under the 44 px target, a state that was written into the checklist
// but never drawn, and an image that did not decode.
//
//   1. start a headless Chrome with a debugging port:
//
//      "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new \
//        --disable-gpu --no-first-run --remote-debugging-port=9222 \
//        --user-data-dir=/tmp/des03 about:blank
//
//   2. node probe.mjs [path-to-html] [viewportWidth]
//
// Node 21+ (global WebSocket and fetch). No packages.

const PORT = process.env.CDP_PORT || 9222;
const FILE = process.argv[2] || "../des-03-spesifikasi.html";
const WIDTH = Number(process.argv[3] || 1440);
const HEIGHT = 1000;

import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const url = pathToFileURL(resolve(FILE)).href;

const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = targets.find((t) => t.type === "page");
if (!page) throw new Error("no page target - is Chrome running with --remote-debugging-port?");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));

let id = 0;
const waiters = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && waiters.has(m.id)) { waiters.get(m.id)(m); waiters.delete(m.id); }
};
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const n = ++id;
    waiters.set(n, (m) => (m.error ? rej(new Error(method + ": " + m.error.message)) : res(m.result)));
    ws.send(JSON.stringify({ id: n, method, params }));
  });

const evalJs = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + " " + JSON.stringify(r.exceptionDetails.exception?.description || ""));
  return r.result.value;
};

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: WIDTH < 700,
});
await send("Page.navigate", { url });
await new Promise((r) => setTimeout(r, 2500));
await evalJs("document.fonts.ready.then(()=>1)");
await new Promise((r) => setTimeout(r, 800));

const out = await evalJs(`(() => {
  // 1. assert the viewport really is what we asked for. DES-07's retrospective
  //    lost three runs to a silently-ignored override; this is that lesson.
  const vp = { innerWidth: window.innerWidth, innerHeight: window.innerHeight,
               dpr: window.devicePixelRatio };

  // 2. no sideways scroll on the document
  const de = document.documentElement;
  const bodyOverflow = de.scrollWidth > de.clientWidth
      ? { overflow: true, scrollWidth: de.scrollWidth, clientWidth: de.clientWidth }
      : { overflow: false };

  // 3. every phone frame is exactly 360, every desk frame exactly 1200
  const phones = [...document.querySelectorAll('.ph')].map(n => Math.round(n.getBoundingClientRect().width));
  const desks  = [...document.querySelectorAll('.dk')].map(n => Math.round(n.getBoundingClientRect().width));

  // 4. drawn controls meet the 44 px target. Count only real control elements,
  //    not spans nested inside them - DES-07 nearly recorded a false failure
  //    on exactly that selector artefact.
  const controls = [...document.querySelectorAll('.hk button, .hk .s-btn, .hk .s-chip, .hk a')];
  const small = controls
      .map(n => ({ t: (n.textContent||'').trim().slice(0,32), h: Math.round(n.getBoundingClientRect().height) }))
      .filter(o => o.h > 0 && o.h < 44);

  // 5. every image decoded
  const imgs = [...document.querySelectorAll('img')];
  const broken = imgs.filter(i => !i.complete || i.naturalWidth === 0).length;
  const noAlt  = imgs.filter(i => !i.hasAttribute('alt')).length;
  const emptyAlt = imgs.filter(i => i.getAttribute('alt') === '').length;
  const noDims = imgs.filter(i => !i.hasAttribute('width') || !i.hasAttribute('height')).length;

  // 6. the state badges actually drawn, against the checklist
  const drawn = [...document.querySelectorAll('.id')].map(n => n.textContent.trim());
  const uniq  = [...new Set(drawn)].sort();

  // 7. the display face really loaded, and is really being used on the h1s
  const face = getComputedStyle(document.querySelector('.s-h1')).fontFamily;
  const loaded = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight);

  // 8. no colour whose sole definition sits in a dark block - the rule from 3.1
  const sheets = [...document.styleSheets].filter(s => { try { return !!s.cssRules; } catch(e){ return false; } });
  let darkHexLiterals = 0;
  for (const s of sheets) for (const r of s.cssRules) {
    // a DARK-ONLY rule: names the dark scope and does not also carry the light
    // one. A shared primitives block (.hk-light,.hk-dark{...}) is the correct
    // home for a colour value and is NOT a violation of the 3.1 rule.
    const sel = r.selectorText || '';
    const darkOnly = /hk-dark|data-theme/.test(sel) && !/hk-light/.test(sel);
    if (darkOnly) {
      const t = r.cssText;
      // count hex/rgb literals inside a dark-scoped rule; var() references are fine
      darkHexLiterals += (t.match(/#[0-9a-fA-F]{3,8}\\b/g) || []).length;
      darkHexLiterals += (t.match(/\\brgba?\\(/g) || []).length;
    }
  }

  return { vp, bodyOverflow,
           frames: { phones: [...new Set(phones)], nPhones: phones.length,
                     desks: [...new Set(desks)], nDesks: desks.length },
           controlsChecked: controls.length, controlsUnder44: small,
           images: { total: imgs.length, broken, noAlt, emptyAlt, noDims },
           states: { count: uniq.length, ids: uniq },
           h1Face: face, fontsLoaded: loaded,
           darkHexLiterals };
})()`);

console.log(JSON.stringify(out, null, 2));
ws.close();
