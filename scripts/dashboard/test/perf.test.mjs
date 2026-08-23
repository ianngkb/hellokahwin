// Growth tests for the two patterns the reviewer measured as quadratic.
//
// A wall-clock threshold alone is a bad test — it passes on a fast machine and
// flakes on a slow one. These assert the SHAPE of the growth: doubling the input
// must not quadruple the time. That is what "quadratic" actually means, and it
// is what was wrong.
//
// The inputs matter. An earlier pass timed a single bracket followed by 40,000
// letters and found nothing, because the blow-up needs a RUN of brackets (no
// closing bracket anywhere) and a RUN of colons. Shape, not size.

import { renderMarkdown } from '../lib/md.mjs';
import { loadDocuments } from '../lib/docs.mjs';
import { PATHS } from '../lib/config.mjs';

const checks = [];
const has = (name, cond) => checks.push([name, Boolean(cond)]);

function timeOf(fn, repeats = 3) {
  let best = Infinity;
  for (let i = 0; i < repeats; i++) {
    const t0 = process.hrtime.bigint();
    fn();
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    if (ms < best) best = ms;
  }
  return best;
}

/**
 * Time at n and at 2n. Quadratic growth lands near 4x; linear near 2x.
 * The allowance is generous so the test reports a real algorithmic change
 * rather than machine noise.
 */
function growth(label, build, n) {
  const small = timeOf(() => build(n));
  const large = timeOf(() => build(n * 2));
  const ratio = small > 0.05 ? large / small : 1;
  has(
    label + ' grows sub-quadratically (' + small.toFixed(2) + 'ms -> ' + large.toFixed(2) + 'ms, x' + ratio.toFixed(1) + ')',
    ratio < 3.2
  );
  return ratio;
}

// --- the link/image pattern, against a run of unmatched brackets ------------
growth('link pattern on a bracket run', (n) => renderMarkdown('['.repeat(n)), 8000);
growth('image pattern on a bang-bracket run', (n) => renderMarkdown('!['.repeat(n)), 8000);

// --- the metadata pattern, against a run of colons --------------------------
const metaA = /^\s*\*\*(.{1,120}?):\*\*\s*(.*)$/;
const metaB = /^\s*\*\*(.{1,120}?):\s*(.{0,400}?)\*\*\s*$/;
growth('metadata key pattern A on a colon run', (n) => metaA.test('**' + ':'.repeat(n)), 8000);
growth('metadata key pattern B on a colon run', (n) => metaB.test('**' + ':'.repeat(n)), 8000);

// --- an absolute ceiling as well, at a size well past anything real ---------
const bigBrackets = timeOf(() => renderMarkdown('['.repeat(48000)));
has('48,000 brackets stay under 100ms (' + bigBrackets.toFixed(1) + 'ms)', bigBrackets < 100);
const bigColons = timeOf(() => metaB.test('**' + ':'.repeat(48000)));
has('48,000 colons stay under 100ms (' + bigColons.toFixed(1) + 'ms)', bigColons < 100);

// --- the bounds must not break real content --------------------------------
const realLink = renderMarkdown('See [the cluster launch plan](aug-23-2026-clusters-launch-plan.md) for detail.');
has('an ordinary link still renders', realLink.includes('href="aug-23-2026-clusters-launch-plan.md"'));
const longButReal = renderMarkdown('[' + 'a'.repeat(280) + '](https://example.com/' + 'b'.repeat(400) + ')');
has('a long but plausible link still renders', longButReal.includes('<a href='));
const titled = renderMarkdown('[x](https://example.com "a title")');
has('a link with a title still renders', titled.includes('href="https://example.com"'));

// --- and the real documents still parse identically -------------------------
const docs = loadDocuments(PATHS.docs);
has('the real document tree still loads', docs.length > 0);
const withMeta = docs.filter((d) => Object.keys(d.meta).length > 0).length;
has('metadata still parses out of real documents (' + withMeta + ' of ' + docs.length + ')', withMeta > docs.length / 2);
const statuses = docs.filter((d) => d.status).length;
has('statuses still parse (' + statuses + ' documents)', statuses > 5);

let bad = 0;
for (const [name, ok] of checks) if (!ok) { bad++; console.log('FAIL:', name); }
console.log(bad === 0 ? 'ALL ' + checks.length + ' PERFORMANCE CHECKS PASS' : bad + ' of ' + checks.length + ' FAILED');
process.exit(bad ? 1 : 0);
