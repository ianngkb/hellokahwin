// Checks the defects found in review stay fixed. Each case is the concrete
// input that used to break, not a general principle.

import path from 'node:path';
import { renderMarkdown } from '../lib/md.mjs';
import { lineChart } from '../lib/charts.mjs';
import { parseDate, addDays, daysBetween, normaliseStatus } from '../lib/docs.mjs';
import { parseStage } from '../lib/clusters.mjs';

const checks = [];
const has = (name, cond) => checks.push([name, Boolean(cond)]);

// --- 1. dangerous URL schemes never reach an href/src ----------------------
const evilLink = renderMarkdown('[click me](javascript:alert(document.cookie))');
has('javascript: link is defused', !/href="javascript:/i.test(evilLink) && evilLink.includes('click me'));

const evilImg = renderMarkdown('![x](javascript:alert(1))');
has('javascript: image is defused', !/src="javascript:/i.test(evilImg));

const dataImg = renderMarkdown('![x](data:text/html;base64,PHNjcmlwdD4=)');
has('data: URI is defused', !/src="data:/i.test(dataImg));

const goodLink = renderMarkdown('[docs](https://example.com/a)');
has('ordinary https link still works', goodLink.includes('href="https://example.com/a"'));
has('external link gets noopener', goodLink.includes('rel="noopener"'));

const relLink = renderMarkdown('[plan](aug-23-2026-plan.md)');
has('relative repo link still works', relLink.includes('href="aug-23-2026-plan.md"'));

// --- 2. content cannot break out of HTML ----------------------------------
const injection = renderMarkdown('A "quoted" <script>alert(1)</script> & an \'apostrophe\'');
has('script tag is escaped', !injection.includes('<script>') && injection.includes('&lt;script&gt;'));
has('quotes are escaped', injection.includes('&quot;') && injection.includes('&#39;'));

const attrBreak = renderMarkdown('| a | b |\n|---|---|\n| " onmouseover="alert(1) | x |');
has('table cell cannot break an attribute', !/onmouseover=/.test(attrBreak.replace(/&quot;/g, '')) || attrBreak.includes('&quot;'));

// --- 3. malformed markdown does not crash ---------------------------------
const nasties = [
  '',
  '   ',
  '```\nunterminated fence',
  '| ragged | table |\n|---|---|---|---|\n| only one |',
  'unmatched ` backtick',
  '#'.repeat(10) + ' deep heading',
  '- a\n    - b\n        - c\n            - d\n1. mixed\n- back to bullet',
  '> quote\n> > nested\n',
  '|' + '-|'.repeat(4000),
  '*'.repeat(500),
  '[' .repeat(200) + 'x',
];
let crashed = null;
for (const n of nasties) {
  try {
    renderMarkdown(n);
  } catch (err) {
    crashed = n.slice(0, 30) + ' -> ' + err.message;
    break;
  }
}
has('malformed markdown never throws (' + nasties.length + ' cases)', !crashed);
if (crashed) console.log('  crashed on:', crashed);

has('null markdown is handled', renderMarkdown(null) === '' && renderMarkdown(undefined) === '');

// A pathological delimiter line must be rejected fast, not backtrack.
const t0 = Date.now();
renderMarkdown('| h |\n' + '|' + ' -'.repeat(3000) + '|\n');
has('no catastrophic backtracking on a long delimiter line', Date.now() - t0 < 1000);

// --- 4. charts survive missing and non-finite values -----------------------
const nanChart = lineChart({
  series: [{ name: 'x', color: 'red', points: [{ date: '2026-01-01', value: NaN }, { date: '2026-01-02', value: 5 }] }],
});
has('NaN does not poison the chart scale', !nanChart.includes('NaN'));

const allNan = lineChart({ series: [{ name: 'x', color: 'red', points: [{ date: '2026-01-01', value: NaN }] }] });
has('an all-NaN series renders an empty state', allNan.includes('empty') && !allNan.includes('NaN'));

has('an empty series renders an empty state', lineChart({ series: [] }).includes('empty'));

// --- 5. date arithmetic ----------------------------------------------------
has('ISO date', parseDate('2026-08-23') === '2026-08-23');
has('long form date', parseDate('23 Aug 2026') === '2026-08-23');
has('filename date', parseDate('aug-23-2026-plan-x.md') === '2026-08-23');
has('month-name-first date', parseDate('Nov 21, 2026') === '2026-11-21');
has('garbage date is null, not a guess', parseDate('sometime soon') === null && parseDate('') === null);
has('month boundary', addDays('2026-08-23', 30) === '2026-09-22');
has('year boundary', addDays('2026-12-30', 5) === '2027-01-04');
has('leap year', addDays('2028-02-28', 1) === '2028-02-29');
has('invalid date returns null', addDays('not-a-date', 5) === null);
has('daysBetween', daysBetween('2026-08-23', '2026-11-21') === 90);
has('daysBetween invalid', daysBetween('x', '2026-01-01') === null);

// --- 6. status and stage derivation ---------------------------------------
has('DRAFT', normaliseStatus('DRAFT — awaiting board approval') === 'DRAFT');
has('awaiting CEO approval is a draft', normaliseStatus('awaiting CEO approval') === 'DRAFT');
has('APPROVED', normaliseStatus('APPROVED 23 Aug 2026 (v3)') === 'APPROVED');
has('SUPERSEDED beats APPROVED', normaliseStatus('APPROVED, superseded by x.md') === 'SUPERSEDED');
has('ABANDONED', normaliseStatus('ABANDONED — no longer needed') === 'ABANDONED');
has('unknown status is not forced into a bucket', normaliseStatus('mauve') === 'OTHER');
has('no status is null', normaliseStatus(null) === null);

const held = parseStage('Stage 4 review board, Stage 5 and Stage 6 SEO QC all complete. Held at Stage 7: the P2 pillar page does not exist yet.', 3);
has('held article stops at its stage', held.stage === 7 && held.held === true);
has('held reason is captured without markdown', held.reason && !held.reason.includes('*'));
const done6 = parseStage('Stage 6 SEO QC complete.', 3);
has('a completed stage advances by one', done6.stage === 7 && !done6.held);
const pub = parseStage('Published 2026-09-01.', 3);
has('published reaches stage 8', pub.stage === 8);
has('no stage information falls back', parseStage('', 3).stage === 3);

// --- 7. static server containment -----------------------------------------
// The old check was startsWith, which lets "/x/dashboard-evil" pass for root
// "/x/dashboard". This is the same comparison serve.mjs now makes.
const contained = (root, target) => {
  const rel = path.relative(path.resolve(root), path.resolve(target));
  return !(rel.startsWith('..') || path.isAbsolute(rel));
};
has('sibling directory with a shared prefix is refused', !contained('/x/dashboard', '/x/dashboard-evil/secret'));
has('parent traversal is refused', !contained('/x/dashboard', '/x/dashboard/../../etc/passwd'));
has('a real child is allowed', contained('/x/dashboard', '/x/dashboard/data/gsc-snapshot.json'));

let bad = 0;
for (const [name, ok] of checks) if (!ok) { bad++; console.log('FAIL:', name); }
console.log(bad === 0 ? 'ALL ' + checks.length + ' SAFETY CHECKS PASS' : bad + ' of ' + checks.length + ' FAILED');
process.exit(bad ? 1 : 0);
