// Pins the eleven gaps the reviewer reported against da1fe41, by class:
// regex DoS, XSS via search, stage parsing, status negation, error handling,
// symlink containment, dates, list nesting.
//
// Each case is the concrete input that was wrong, not a general principle.

import path from 'node:path';
import { renderMarkdown } from '../lib/md.mjs';
import { parseDate, normaliseStatus } from '../lib/docs.mjs';
import { parseStage } from '../lib/clusters.mjs';
import { CSS, JS } from '../lib/assets.mjs';
import { contains } from '../serve.mjs';

const checks = [];
const has = (name, cond) => checks.push([name, Boolean(cond)]);

// --- status negation -------------------------------------------------------
// "not yet approved" reading as APPROVED is the worst direction to be wrong in.
has('not yet approved is not APPROVED', normaliseStatus('not yet approved') !== 'APPROVED');
has('no longer approved is not APPROVED', normaliseStatus('no longer approved') !== 'APPROVED');
has('is not complete is not COMPLETED', normaliseStatus('the review is not complete') !== 'COMPLETED');
has('never abandoned is not ABANDONED', normaliseStatus('this work was never abandoned') !== 'ABANDONED');
has('plain APPROVED still reads APPROVED', normaliseStatus('APPROVED 23 Aug 2026 (v3)') === 'APPROVED');
has('plain completed still reads COMPLETED', normaliseStatus('completed') === 'COMPLETED');
has('DRAFT still reads DRAFT', normaliseStatus('DRAFT — awaiting board approval') === 'DRAFT');
has(
  'built-but-not-deployed is not COMPLETED',
  normaliseStatus('BUILT AND VERIFIED LOCALLY — NOT DEPLOYED. Awaiting board approval.') !== 'COMPLETED'
);

// --- stage parsing ---------------------------------------------------------
// An article must never be advanced or marked live by a negated sentence.
has('not complete does not advance the stage', parseStage('Stage 3 draft, review is not complete', 3).stage === 3);
has('complete does advance the stage', parseStage('Stage 6 SEO QC complete.', 3).stage === 7);
has('held pins the stage and flags it', (() => {
  const r = parseStage('Stage 6 complete. Held at Stage 7: pillar page missing.', 3);
  return r.stage === 7 && r.held === true;
})());
has('nothing published does not mark it live', parseStage('Nothing published, by design.', 3).stage !== 8);
has('not published does not mark it live', parseStage('Draft ready but not published yet.', 3).stage !== 8);
has('published does mark it live', parseStage('Published 2026-09-01 and live on the site.', 3).stage === 8);

// --- dates -----------------------------------------------------------------
// The writers date their drafts in Malay; these used to fall back to file mtime.
has('Malay: Ogos', parseDate('23 Ogos 2026') === '2026-08-23');
has('Malay: Disember', parseDate('15 Disember 2026') === '2026-12-15');
has('Malay: Mac', parseDate('3 Mac 2026') === '2026-03-03');
has('Malay: Mei', parseDate('5 Mei 2026') === '2026-05-05');
has('Malay: Julai', parseDate('9 Julai 2026') === '2026-07-09');
has('English still works', parseDate('23 Aug 2026') === '2026-08-23');
has('impossible date rejected, not rolled over', parseDate('31 Feb 2026') === null);
has('impossible ISO date rejected', parseDate('2026-02-30') === null);
has('month 13 rejected', parseDate('2026-13-01') === null);

// --- list nesting ----------------------------------------------------------
const nested = renderMarkdown('- top\n  - nested\n    - deeper\n- back');
has('nested list is not a sibling of its li', !/<\/li>\s*<(ul|ol)>/.test(nested));
has('nested list sits inside its li', /<li>[^<]*<(ul|ol)>/.test(nested));
has('li tags balanced', (nested.match(/<li>/g) || []).length === (nested.match(/<\/li>/g) || []).length);
has('list tags balanced', (nested.match(/<(ul|ol)>/g) || []).length === (nested.match(/<\/(ul|ol)>/g) || []).length);

// --- regex DoS -------------------------------------------------------------
// Every one of these used to be a candidate for catastrophic backtracking.
const hostile = {
  'quote entities in a link title': '[x](http://a "' + '&quot;'.repeat(2000) + '")',
  'nested brackets': '['.repeat(3000) + 'x' + ']'.repeat(3000),
  asterisks: '*'.repeat(4000),
  underscores: '_'.repeat(4000),
  'pipes and dashes': '|' + ' -'.repeat(4000) + '|',
  backticks: '`'.repeat(4000),
  'alternating emphasis': '*a'.repeat(3000),
  'long image alt': '![' + 'a'.repeat(5000) + '](x.png)',
  'deep list nesting': Array.from({ length: 400 }, (_, i) => ' '.repeat(i % 40) + '- item').join('\n'),
  'ragged table': '| a | b |\n|---|---|\n' + '| 1 |\n'.repeat(500),
};
let slowest = 0;
let slowestName = '';
for (const [name, input] of Object.entries(hostile)) {
  const t0 = Date.now();
  try {
    renderMarkdown(input);
  } catch (err) {
    has('hostile input "' + name + '" does not throw', false);
    continue;
  }
  const ms = Date.now() - t0;
  if (ms > slowest) {
    slowest = ms;
    slowestName = name;
  }
}
has('no hostile input takes over a second (slowest: ' + slowestName + ' ' + slowest + 'ms)', slowest < 1000);

// --- XSS via the client-side search ---------------------------------------
// esc() is what stands between document text and innerHTML in the search
// results and the changed-document feed.
const escBody = JS.match(/function esc\(s\)\{[\s\S]*?\}/);
has('client escaper exists', Boolean(escBody));
if (escBody) {
  const src = escBody[0];
  for (const ch of ['&', '<', '>', '"', "'"]) {
    has('client escaper handles ' + JSON.stringify(ch), src.includes(ch));
  }
}
has('changed-document feed uses no inline onclick', !/onclick="location\.hash/.test(JS));
has('search results escape their target', /data-go="' \+ esc\(/.test(JS));

// --- error handling / network ---------------------------------------------
const gscSrc = await import('node:fs').then((fs) =>
  fs.readFileSync(new URL('../lib/gsc.mjs', import.meta.url), 'utf8')
);
// The only bare fetch allowed is the one inside the timeout wrapper, and it
// must carry the abort signal.
const bareFetches = [...gscSrc.matchAll(/\bawait fetch\([\s\S]{0,120}/g)].map((m) => m[0]);
has('only one bare fetch, inside the wrapper', bareFetches.length === 1);
has('that fetch carries the abort signal', bareFetches.length === 1 && bareFetches[0].includes('signal: controller.signal'));
has('callers go through the wrapper', (gscSrc.match(/fetchWithTimeout\(/g) || []).length >= 3);
has('timeout is configurable', gscSrc.includes('HELLOKAHWIN_GSC_TIMEOUT_MS'));
has('the signed assertion is never logged', !/console\.[a-z]+\([^)]*assertion/.test(gscSrc));
has('the access token is never logged', !/console\.[a-z]+\([^)]*token/.test(gscSrc));
has('the private key is never logged', !/console\.[a-z]+\([^)]*private_key/.test(gscSrc));

// --- symlink containment ---------------------------------------------------
has('sibling with a shared prefix refused', !contains('/x/dashboard', '/x/dashboard-evil/secret'));
has('parent traversal refused', !contains(path.resolve('/x/dashboard'), path.resolve('/x/dashboard/../../etc/passwd')));
has('the root itself is allowed', contains('/x/dashboard', '/x/dashboard'));
has('a real child is allowed', contains('/x/dashboard', '/x/dashboard/data/x.json'));
const serveSrc = await import('node:fs').then((fs) =>
  fs.readFileSync(new URL('../serve.mjs', import.meta.url), 'utf8')
);
has('containment is checked on the resolved real path', serveSrc.includes('realpath'));
has('server never leaks a stack trace', !/res\.end\((?:err|String\(err)/.test(serveSrc));

// --- theme/style sanity (cheap, catches a truncated asset) ------------------
has('stylesheet is present and closed', CSS.length > 2000 && CSS.includes('.org-node'));

let bad = 0;
for (const [name, ok] of checks) if (!ok) { bad++; console.log('FAIL:', name); }
console.log(bad === 0 ? 'ALL ' + checks.length + ' GAP CHECKS PASS' : bad + ' of ' + checks.length + ' FAILED');
process.exit(bad ? 1 : 0);
