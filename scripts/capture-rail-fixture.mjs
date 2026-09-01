/**
 * UI-19 — capture the article rail's known-good page from production, and
 * derive the two known-bad inputs from it by ONE deletion each.
 *
 *   node scripts/capture-rail-fixture.mjs            # write the fixtures
 *   node scripts/capture-rail-fixture.mjs --verify   # re-derive and compare only
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY A SCRIPT AND NOT FOUR FILES SOMEBODY SAVED
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * UI-19's DoD asks for a gate case that fails when the rail collapses and one
 * that fails when an empty `Sumber` heading is printed, "each with a committed
 * fixture proven to fire on it and clear on an input differing in exactly that
 * one property". The load-bearing words are EXACTLY THAT ONE PROPERTY. Two
 * files a person edited by hand cannot demonstrate that; the diff is whatever
 * the editor happened to touch, and every later reader has to take it on trust.
 *
 * So each bad half here is the good half minus ONE CONTIGUOUS BYTE RANGE, and
 * the range is named. `scripts/ui-layout-gate.mjs --selftest` re-derives that
 * range at run time — common prefix, common suffix, one deletion in between —
 * and fails if the pair has drifted into differing in anything else. The
 * property is therefore asserted, not asserted-about.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IS CAPTURED, AND WHY BOTH SETS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The CEO ruling UI-19 ships under is that `Sumber` renders only where sources
 * exist. That splits the corpus in two, and a fixture from one set cannot
 * discipline a check about the other:
 *
 *   sourced-ok.html      /artikel/hantaran-mas-kahwin/hantaran-wajib-atau-adat
 *                        Rekod + contents + Sumber. One of only 7 of 92
 *                        articles carrying all three blocks (measured 02 Sep
 *                        2026), which is why it is here: the rail's specified
 *                        order had never been observed with all three present.
 *
 *   unsourced-ok.html    /artikel/ucapan-doa/doa-makan-majlis
 *                        Rekod + contents, NO Sumber block and no Sumber
 *                        heading. This is the DoD's "article with no sources"
 *                        case, frozen — the input on which `sumber-empty` must
 *                        stay silent forever.
 *
 * and the two derived inputs:
 *
 *   unsourced-rail-absent.html   unsourced-ok.html minus the whole
 *                                `<aside data-hk-rail>` element. The rail has
 *                                collapsed to nothing on an article that has
 *                                no sources — the exact shape the DoD names.
 *                                `rail-missing` fires; `sumber-empty` must not.
 *
 *   sourced-sumber-empty.html    sourced-ok.html minus the `<li>` children of
 *                                `<ul class="hk-rail-sources">`. The heading
 *                                `Sumber` is printed over nothing, which
 *                                asserts an article is sourced when it is not.
 *                                `sumber-empty` fires; `rail-missing` must not.
 *
 * Each bad file fires ITS check and stays silent on the other's, so the pair
 * also proves the two checks are independent rather than one check with two
 * names.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE FLIGHT PAYLOAD, STATED RATHER THAN HIDDEN
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * A Next.js page carries its markup TWICE in the served bytes — once in the
 * streamed HTML, once in the RSC flight payload inside `<script>`. The deletion
 * here is made in the streamed HTML only. That is not sloppiness: the gate's
 * fixture server answers every unvendored `/_next/**` request with an empty
 * 200, so no JavaScript ever runs, the flight payload is never parsed, and the
 * DOM the browser lays out is the streamed markup alone. The self-test asserts
 * the DOM consequence directly — `[data-hk-rail]` count 1 in the good file and
 * 0 in the bad one — rather than inferring it from the bytes.
 *
 * CSS and fonts are vendored for the same reason `2026-09-01-pre-rail/` vendors
 * them: content-hashed chunks stop being served the moment the deployment that
 * produced them is superseded, and the rail is a COMPUTED column that does not
 * exist without its stylesheet. JavaScript is deliberately not vendored.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const OUT = path.join(REPO, 'tests', 'ui-layout-gate', 'fixtures', '2026-09-02-rail');
const ORIGIN = 'https://hellokahwin.com';
const VERIFY = process.argv.includes('--verify');

/** The two production pages, and which half of the CEO ruling each one is. */
const SOURCES = [
  { name: 'sourced', path: '/artikel/hantaran-mas-kahwin/hantaran-wajib-atau-adat' },
  { name: 'unsourced', path: '/artikel/ucapan-doa/doa-makan-majlis' },
];

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

/**
 * The one deletion, located rather than pattern-matched.
 *
 * `<aside …>` cannot be closed with a regex without over-matching to the LAST
 * `</aside>` on the page — the old sidebar is an `<aside>` too, and it renders
 * INSIDE the rail's own subtree at the `extra` slot. So the close tag is found
 * by walking the tag stream and counting depth. A regex here would have
 * silently deleted a different amount of the page than the one reported.
 */
export function cutElement(html, openMarker, tag) {
  const start = html.indexOf(openMarker);
  if (start < 0) throw new Error(`capture: "${openMarker}" not found`);
  const open = new RegExp(`<${tag}\\b`, 'g');
  const close = new RegExp(`</${tag}>`, 'g');
  let depth = 0;
  let i = start;
  for (;;) {
    open.lastIndex = i;
    close.lastIndex = i;
    const o = open.exec(html);
    const c = close.exec(html);
    if (!c) throw new Error(`capture: unbalanced <${tag}> from ${start}`);
    if (o && o.index < c.index) {
      depth++;
      i = o.index + 1;
      continue;
    }
    depth--;
    i = c.index + 1;
    if (depth === 0) return { start, end: c.index + `</${tag}>`.length };
  }
}

/** The `<li>` children of the first `<ul class="hk-rail-sources">`, and only those. */
export function cutSourceItems(html) {
  const marker = '<ul class="hk-rail-sources">';
  const start = html.indexOf(marker);
  if (start < 0) throw new Error('capture: no <ul class="hk-rail-sources"> on this page');
  const end = html.indexOf('</ul>', start);
  if (end < 0) throw new Error('capture: unterminated hk-rail-sources list');
  return { start: start + marker.length, end };
}

async function grab(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return {
    body: Buffer.from(await res.arrayBuffer()),
    provenance: {
      status: res.status,
      vercelId: res.headers.get('x-vercel-id'),
      cache: res.headers.get('x-vercel-cache'),
      age: res.headers.get('age'),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EVERYTHING BELOW RUNS ONLY WHEN THIS FILE IS EXECUTED DIRECTLY.
//
// The two `cut` functions above are imported by `scripts/ui-layout-gate.mjs
// --selftest`, which re-derives the deletion and asserts the committed bad file
// is byte-for-byte the committed good file with that range spliced out. ONE
// definition of where the cut falls, living in the file that made it — a second
// copy inside the gate would be free to drift from this one the day either
// changes, which is the same reasoning that put `TOC_MIN_HEADINGS` in one
// place.
//
// ⚠ THE GUARD IS NOT TIDINESS. Without it, `import()`-ing this module for those
// two functions re-runs the capture: on 02 Sep 2026 a one-line
// `node -e "import(...)"` silently re-fetched production and overwrote all four
// fixtures from a NEWER deployment — DES-15 and UI-20 had shipped in the
// meantime and the CSS chunk hashes had changed — leaving two orphaned
// stylesheets on disk and every sha256 in the fixture README wrong. A module
// with side effects at import time cannot be imported for anything.
// ─────────────────────────────────────────────────────────────────────────────
export const RAIL_CAPTURE_DIR = OUT;
export const RAIL_CAPTURE_SOURCES = SOURCES;

if (pathToFileURL(process.argv[1] ?? '').href === import.meta.url) await main();

async function main() {
  const written = [];
  function write(rel, buf) {
    const file = path.join(OUT, rel);
    if (VERIFY) {
      const have = fs.existsSync(file) ? fs.readFileSync(file) : null;
      const same = have !== null && Buffer.compare(have, buf) === 0;
      console.log(
        `  ${same ? 'SAME' : 'DIFF'}  ${rel}  ${buf.length} bytes  ${sha(buf).slice(0, 16)}…`,
      );
      return same;
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, buf);
    written.push([rel, buf.length, sha(buf)]);
    return true;
  }

  let ok = true;
  const assets = new Set();

  for (const src of SOURCES) {
    const { body, provenance } = await grab(ORIGIN + src.path);
    const html = body.toString('utf8');
    console.log(
      `\n${src.path}\n  HTTP ${provenance.status} ${provenance.cache} age=${provenance.age} ${provenance.vercelId}\n  ${body.length} bytes  sha256 ${sha(body)}`,
    );

    for (const m of html.matchAll(
      /\/_next\/static\/(?:chunks|media)\/[A-Za-z0-9._-]+\.(?:css|woff2)/g,
    ))
      assets.add(m[0]);

    ok = write(`${src.name}-ok.html`, body) && ok;

    if (src.name === 'unsourced') {
      const cut = cutElement(html, '<aside data-hk-rail=', 'aside');
      const bad = html.slice(0, cut.start) + html.slice(cut.end);
      console.log(
        `  cut <aside data-hk-rail> [${cut.start}, ${cut.end}) = ${cut.end - cut.start} bytes`,
      );
      ok = write('unsourced-rail-absent.html', Buffer.from(bad, 'utf8')) && ok;
    } else {
      const cut = cutSourceItems(html);
      const bad = html.slice(0, cut.start) + html.slice(cut.end);
      console.log(
        `  cut hk-rail-sources <li>s [${cut.start}, ${cut.end}) = ${cut.end - cut.start} bytes: ` +
          `${JSON.stringify(html.slice(cut.start, Math.min(cut.end, cut.start + 90)))}…`,
      );
      ok = write('sourced-sumber-empty.html', Buffer.from(bad, 'utf8')) && ok;
    }
  }

  // The fonts are referenced from inside the CSS, so the CSS has to be read for
  // them rather than the HTML. A measure taken in a fallback face is a measure of
  // a page nobody sees.
  //
  // ⚠ AND THEY ARE RELATIVE. The first run of this script scanned the CSS with
  // the same absolute `/_next/static/media/…` pattern used on the HTML and
  // vendored ONE font — the only one the HTML happens to `<link rel=preload>`.
  // The stylesheet writes `url(../media/…)` from `/_next/static/chunks/`, so the
  // other three were invisible to the pattern and would have been served as an
  // empty 200, silently measuring the page in a fallback face. Resolved against
  // the stylesheet's own URL instead of matched against an assumed shape.
  for (const a of [...assets]) {
    if (!a.endsWith('.css')) continue;
    const { body } = await grab(ORIGIN + a);
    for (const m of body.toString('utf8').matchAll(/url\(\s*["']?([^"')]+\.woff2)["']?\s*\)/g))
      assets.add(new URL(m[1], ORIGIN + a).pathname);
  }

  console.log(`\nvendoring ${assets.size} asset(s):`);
  for (const a of [...assets].sort()) {
    const { body } = await grab(ORIGIN + a);
    ok = write(a.replace(/^\//, ''), body) && ok;
  }

  if (!VERIFY) {
    console.log('\n| File | bytes | sha256 |');
    console.log('| --- | --- | --- |');
    for (const [rel, len, h] of written) console.log(`| \`${rel}\` | ${len} | \`${h}\` |`);
  }
  console.log(`\nCAPTURE EXIT: ${ok ? 0 : 1}`);
  process.exit(ok ? 0 : 1);
}
