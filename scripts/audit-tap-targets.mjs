/**
 * Standalone tap-target audit — UI-11's rig, and the gate that keeps it fixed.
 *
 *   pnpm audit:taps <url> [url2 ...] [--widths 390,1440] [--min 24] [--json]
 *                         [--all] [--no-gate]
 *
 * Requires playwright-core and the installed Chrome, neither of which is a
 * dependency of the app (same contract as `scripts/measure-page.mjs` and
 * `scripts/measure-nav-overflow.mjs`). playwright-core is not in this
 * checkout; point NODE_PATH at one that has it:
 *
 *   NODE_PATH="C:/Users/Ian Ng/Documents/Code/thepicklebase/node_modules" \
 *     node scripts/audit-tap-targets.mjs https://hellokahwin.com/
 *
 * Exits 1 when any standalone target is under --min in either dimension, so
 * this can be a CI gate. `--no-gate` prints the same report and exits 0.
 * Exits 2 when it could not measure the site it was pointed at — see the
 * precondition below. A rig that cannot tell those two apart is worse than no
 * rig, because "0 failing targets" and "I never saw the site" look identical.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * MEASURING A PROTECTED PREVIEW, AND THE PRECONDITION THAT MAKES IT SAFE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Vercel preview deployments sit behind SSO. Pointed at one, this rig used to
 * enumerate the targets on **vercel.com's login page**, find none under 24px,
 * and exit 0 — a well-formed, entirely fictional green run. THREE items walked
 * into that wall on the same day: UI-08 found a page with nothing wrong with
 * it, UI-09 found an `<input>` that was Vercel's login field, and UI-11 got a
 * clean sweep off five 200s that were all the same login page. UI-08 wrote the
 * lesson down before UI-11 hit it. Prose did not fire. So it is code now:
 *
 *   PRECONDITION, run on every page before a single target is measured —
 *     1. the final URL's origin is the origin that was requested, and
 *     2. `<html lang>` is `ms` (every public template sets it; Vercel's login
 *        page is `en-US`).
 *   Either one failing is an ERROR and exit 2. Never a clean run.
 *
 * To measure a protected preview legitimately, pass the protection-bypass
 * secret — vault key `vercelbypass.hellokahwin`, never inlined here:
 *
 *   VERCEL_PROTECTION_BYPASS=$(pwsh -NoProfile -c "& '…/vault.ps1' get vercelbypass.hellokahwin") \
 *     node scripts/audit-tap-targets.mjs https://<preview>.vercel.app
 *
 * A legitimately bypassed preview passes both markers, so the precondition
 * rejects the protection wall without rejecting previews.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IT MEASURES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WCAG 2.5.8 Target Size (Minimum), AA: a target must be at least 24 x 24 CSS
 * px, EXCEPT — among other exceptions this rig does not rely on — when the
 * target is "in a sentence or its size is otherwise constrained by the
 * line-height of non-target text". That exception is why `pelamin` inside a
 * paragraph is fine and `Laman Utama` in the footer is not, at the same 15.4px
 * height. Everything here turns on telling those two apart correctly.
 *
 * THE INLINE TEST. It went wrong TWICE before it went right, and both wrong
 * versions produced a confident, quotable, false exemption — so the reasoning
 * is here rather than in a commit message:
 *
 *   v1 "is there other text in my block?" — the footer's two links share one
 *      `<nav class="flex">`, whose `textContent` is "Laman UtamaSemua Artikel".
 *      Other text: yes. Both exempted. They are the canonical standalone case.
 *      FIX: ignore text that belongs to ANOTHER target.
 *
 *   v2 "...and is the target inline-level?" using `display.startsWith('inline')`
 *      — exempted the homepage credit (`inline-block`) and the footer wordmark
 *      (`inline`, alone on its line, in a `<div>` that also holds a tagline and
 *      a copyright two lines away). `inline-block` is an ATOMIC inline: it has
 *      its own box and is not constrained by anybody's line-height, which is
 *      the entire premise of the exception. And "somewhere in the same block"
 *      is not "in a sentence".
 *
 *   v3, what this runs: a target is in a sentence when BOTH hold —
 *      (a) its computed display is exactly `inline` (not inline-block /
 *          inline-flex / inline-grid — those are atomic boxes), AND
 *      (b) some non-target text is rendered on the SAME LINE: a text node whose
 *          Range rect overlaps the target's box vertically by more than half
 *          the target's height.
 *
 *      (b) is measured from rendered geometry, not inferred from the DOM, and
 *      it is what "its size is constrained by the line-height of non-target
 *      text" actually means. `pelamin` mid-paragraph: exempt. A wordmark alone
 *      on its line inside a chatty div: not exempt.
 *
 * THE BOX, and the one thing it can hide:
 *
 * The verdict uses `getBoundingClientRect()` on the target itself. That is
 * deliberate: it is the same method UI-04's audit used to produce the numbers
 * in this item's definition of done, so before/after are comparable rather
 * than merely both true. An absolutely-positioned `::after` hit-area extender
 * does NOT show up in it — so a fix of that shape would still read as a
 * failure here, and that is the intended strictness, not a bug.
 *
 * A target that wraps across lines has ONE bounding box spanning every line,
 * which flatters it. So `rects` and `minRect`/`maxRect` are printed next to
 * every measurement: a "24.0 tall" that is really two 12px lines is visible in
 * the output instead of buried by it.
 *
 * WHAT IT EXCLUDES, and why each exclusion exists:
 *
 *   - Visually hidden targets (`sr-only`: clip-path inset(50%), clip rect(0...),
 *     or a 1x1 absolutely-positioned box). `/artikel` carries a deliberate
 *     sr-only `h1` and skip-links are the same shape; reporting a skip link as
 *     a 1x1 tap target is a false finding UI-04 already killed once.
 *   - `pointer-events: none` — not a target; it cannot accept a pointer action.
 *   - `disabled` controls.
 *
 * NO CAP. UI-04's harness sliced its tap-target list at 25 entries, which is
 * why this item's DoD reads "article 25 targets ... of which 25 are under
 * 24px" — 25 is the slice, not the count. Everything here is enumerated.
 */
import { chromium } from 'playwright-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const argv = process.argv.slice(2);
const urls = argv.filter((a) => !a.startsWith('--') && /^https?:\/\//.test(a));
const flag = (n) => argv.includes(`--${n}`);
const opt = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d);

if (urls.length === 0) {
  console.error(
    'usage: node scripts/audit-tap-targets.mjs <url> [url2 ...] [--widths 390,1440] [--min 24]',
  );
  process.exit(2);
}

const widths = opt('widths', '390,1440')
  .split(',')
  .map((w) => Number(w.trim()));
const MIN = Number(opt('min', '24'));

/* Runs in the page. `min` is passed in so the browser side holds no policy. */
const ENUMERATE = (min) => {
  const round = (n) => Math.round(n * 100) / 100;

  const TAPPABLE = [
    'a[href]',
    'area[href]',
    'button',
    'input:not([type="hidden"])',
    'select',
    'textarea',
    'summary',
    '[role="button"]',
    '[role="link"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="switch"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[role="menuitemcheckbox"]',
    '[role="menuitemradio"]',
    '[role="option"]',
    '[contenteditable="true"]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  const isTarget = (el) => el instanceof Element && el.matches(TAPPABLE);

  /* sr-only in all three shapes this codebase and Tailwind produce. */
  const visuallyHidden = (el) => {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.clipPath && cs.clipPath.includes('inset(50%')) return true;
      if (cs.clip && /rect\(0(px)?[,\s]/.test(cs.clip)) return true;
      const r = n.getBoundingClientRect();
      if (cs.position === 'absolute' && r.width <= 1 && r.height <= 1) return true;
    }
    return false;
  };

  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    if (cs.pointerEvents === 'none') return false;
    if (el.disabled) return false;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    return !visuallyHidden(el);
  };

  /* Strictly `inline` — an atomic inline (inline-block/flex/grid) carries its
     own box and is NOT constrained by anyone's line-height, so it never earns
     the exception. See v2 in the header. */
  const strictlyInline = (el) => getComputedStyle(el).display === 'inline';
  const anyInline = (el) => getComputedStyle(el).display.startsWith('inline');

  /* Nearest ancestor that is not an inline-level box: the block the target
     lives in. Stops at <body> so a stray inline chain cannot run off the end. */
  const blockOf = (el) => {
    let p = el.parentElement;
    while (p && p !== document.body && anyInline(p)) p = p.parentElement;
    return p || document.body;
  };

  /* Non-target text rendered on the target's own line. Geometry, not DOM. */
  const proseOnSameLine = (el) => {
    const block = blockOf(el);
    const box = el.getBoundingClientRect();
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    let sameLine = '';
    let anywhere = '';
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.nodeValue.trim()) continue;
      let inTarget = false;
      for (let p = n.parentElement; p && p !== block; p = p.parentElement) {
        if (isTarget(p)) {
          inTarget = true;
          break;
        }
      }
      if (inTarget) continue;
      anywhere += n.nodeValue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const q of range.getClientRects()) {
        if (q.width <= 0 || q.height <= 0) continue;
        const overlap = Math.min(box.bottom, q.bottom) - Math.max(box.top, q.top);
        if (overlap > box.height / 2) {
          sameLine += n.nodeValue;
          break;
        }
      }
    }
    return {
      block,
      sameLine: sameLine.replace(/\s+/g, ' ').trim(),
      anywhere: anywhere.replace(/\s+/g, ' ').trim(),
    };
  };

  const path = (el) => {
    const bit = (n) =>
      n.tagName.toLowerCase() +
      (n.id ? `#${n.id}` : '') +
      (typeof n.className === 'string' && n.className.trim()
        ? '.' + n.className.trim().split(/\s+/).slice(0, 3).join('.')
        : '');
    const chain = [];
    for (let n = el; n && n !== document.body && chain.length < 4; n = n.parentElement)
      chain.unshift(bit(n));
    return chain.join(' > ');
  };

  const targets = Array.from(document.querySelectorAll(TAPPABLE)).filter(visible);

  const rows = targets.map((el) => {
    const r = el.getBoundingClientRect();
    const rects = Array.from(el.getClientRects()).filter((q) => q.width > 0 && q.height > 0);
    const { block, sameLine, anywhere } = proseOnSameLine(el);
    const inSentence = strictlyInline(el) && sameLine.length > 0;
    const w = round(r.width);
    const h = round(r.height);
    return {
      sel: path(el),
      text: (el.textContent || el.getAttribute('aria-label') || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 46),
      width: w,
      height: h,
      rects: rects.length,
      minRect: rects.length ? round(Math.min(...rects.map((q) => q.height))) : h,
      maxRect: rects.length ? round(Math.max(...rects.map((q) => q.height))) : h,
      display: getComputedStyle(el).display,
      block: block === document.body ? 'body' : path(block),
      proseSameLine: sameLine.slice(0, 40),
      proseInBlock: anywhere.slice(0, 40),
      inSentence,
      fail: !inSentence && (w < min || h < min),
    };
  });

  return {
    innerWidth: window.innerWidth,
    layoutWidth: document.documentElement.clientWidth,
    mq: {
      'max-width:767px': matchMedia('(max-width:767px)').matches,
      'min-width:768px': matchMedia('(min-width:768px)').matches,
      'max-width:1023px': matchMedia('(max-width:1023px)').matches,
      'min-width:1024px': matchMedia('(min-width:1024px)').matches,
    },
    rows,
  };
};

const BYPASS = process.env.VERCEL_PROTECTION_BYPASS || '';

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const report = [];
const blocked = [];

for (const url of urls) {
  for (const width of widths) {
    const mobile = width < 768;
    const ctx = await browser.newContext({
      viewport: { width, height: mobile ? 844 : 900 },
      deviceScaleFactor: 1,
      isMobile: mobile,
      hasTouch: mobile,
      ...(BYPASS
        ? {
            extraHTTPHeaders: {
              'x-vercel-protection-bypass': BYPASS,
              'x-vercel-set-bypass-cookie': 'true',
            },
          }
        : {}),
      ...(mobile
        ? {
            userAgent:
              'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
          }
        : {}),
    });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 90_000 });
    // Webfonts change every advance width AND every line box. Measuring before
    // they land measures a fallback stack nobody sees.
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);

    // PRECONDITION — prove this is the site before measuring it. See the
    // header. Without this, a protected preview yields a confident 0.
    const landed = await page.evaluate(() => ({
      href: location.href,
      origin: location.origin,
      lang: document.documentElement.lang,
      nextError: document.documentElement.id === '__next_error__',
      title: document.title.slice(0, 60),
    }));
    const wantOrigin = new URL(url).origin;
    // `lang="ms"` is set by every public TEMPLATE. Next's own error page (404,
    // 500) is rendered by a different root and carries no `lang` at all — it is
    // still our page, and it still has tap targets worth auditing, so it is
    // admitted on `#__next_error__` instead. That marker is only trustworthy
    // BECAUSE the origin check above already ran: a cross-origin wall cannot
    // reach this line.
    const isOurs = landed.origin === wantOrigin && (landed.lang === 'ms' || landed.nextError);
    if (!isOurs) {
      blocked.push({
        url,
        width,
        why:
          landed.origin !== wantOrigin
            ? `asked ${wantOrigin}, landed on ${landed.origin}`
            : `<html lang="${landed.lang}"> and no #__next_error__ — expected "ms"`,
        landedOn: landed.href,
        title: landed.title,
      });
      await ctx.close();
      continue;
    }

    const result = await page.evaluate(ENUMERATE, MIN);
    report.push({ url, width, ...result });
    await ctx.close();
  }
}

await browser.close();

if (blocked.length > 0) {
  console.error(
    `\nERROR — NOT THIS SITE. ${blocked.length} of ${urls.length * widths.length} page loads did ` +
      `not reach the site they asked for, so nothing was measured for them.\n` +
      (BYPASS
        ? '  A bypass secret WAS supplied and it did not work — check it is current.\n'
        : '  No VERCEL_PROTECTION_BYPASS was set. If this is a protected preview, pass the\n' +
          '  vault secret `vercelbypass.hellokahwin` in that variable and re-run.\n'),
  );
  for (const b of blocked) {
    console.error(`  ${b.url} @ ${b.width}px — ${b.why}\n     landed on: ${b.landedOn}`);
    console.error(`     title: ${JSON.stringify(b.title)}`);
  }
  console.error('');
  process.exit(2);
}

if (flag('json')) {
  console.log(JSON.stringify({ min: MIN, widths, report }, null, 2));
} else {
  for (const r of report) {
    const fails = r.rows.filter((x) => x.fail);
    const standalone = r.rows.filter((x) => !x.inSentence);
    console.log(
      `\n-- ${r.url} @ ${r.width}px ------------------------------------\n` +
        `   innerWidth ${r.innerWidth} - layoutWidth ${r.layoutWidth} - ` +
        `(max-width:767px)=${r.mq['max-width:767px']} (min-width:1024px)=${r.mq['min-width:1024px']}\n` +
        `   ${r.rows.length} targets - ${standalone.length} standalone - ` +
        `${r.rows.length - standalone.length} in-sentence (WCAG 2.5.8 exempt)`,
    );
    const shown = flag('all') ? r.rows : fails;
    for (const x of shown) {
      const verdict = x.fail ? 'FAIL' : x.inSentence ? 'xmpt' : ' ok ';
      console.log(
        `   ${verdict} ${String(x.width).padStart(8)} x ${String(x.height).padStart(6)}  ` +
          `rects ${x.rects} (${x.minRect}-${x.maxRect})  ${x.display.padEnd(12)}  ` +
          `${JSON.stringify(x.text)}\n        ${x.sel}`,
      );
    }
    console.log(`   => ${fails.length} standalone target(s) under ${MIN}px`);
  }
  const total = report.reduce((a, r) => a + r.rows.filter((x) => x.fail).length, 0);
  console.log(
    `\n==== ${total} failing target(s) across ${urls.length} URL(s) x ${widths.length} width(s), ` +
      `floor ${MIN}px ====\n`,
  );
}

const failing = report.reduce((a, r) => a + r.rows.filter((x) => x.fail).length, 0);
process.exit(failing > 0 && !flag('no-gate') ? 1 : 0);
