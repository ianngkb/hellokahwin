import fs from 'node:fs';
import path from 'node:path';
const file = process.argv[2] || path.join('docs', 'dashboard', 'index.html');
const html = fs.readFileSync(file, 'utf8');
const checks = [];
const has = (name, cond) => checks.push([name, Boolean(cond)]);

// required sections
for (const id of ['overview','timeline','decisions','plans','workdone','people','metrics','clusters','pipeline','blocked','approvals']) {
  has('section #' + id, html.includes('id="' + id + '"'));
}
// Look for the SHAPE of a template hole (a bare value dropped into a slot),
// and only outside <code> spans — documents legitimately quote the words
// "undefined" and "NaN" when they discuss this very check.
const prose = html.replace(/<code>[\s\S]*?<\/code>/g, '<code/>');
has(
  'no unresolved template holes',
  !/>\s*(undefined|NaN|\[object Object\])\s*</.test(prose) &&
    !/="\s*(undefined|NaN|\[object Object\])\s*"/.test(prose) &&
    !/\[object Object\]/.test(prose)
);
has('every persona embedded', (html.match(/id="persona-/g) || []).length === 7);
has('org chart nodes present', (html.match(/class="org-node/g) || []).length >= 7);
has('blocking authority shown', html.includes('can block publication'));
has('decision cards', (html.match(/id="decision-D/g) || []).length >= 14);
has('cluster rows', (html.match(/id="cluster-C/g) || []).length === 26);
has('pipeline columns', (html.match(/class="col"/g) || []).length === 8);
has('charts drawn', (html.match(/<svg class="chart"/g) || []).length >= 3);
has('migration marker', html.includes('21 Aug URL migration'));
has('checkpoint table', html.includes('Against the plan'));
has('live GSC figures', /Clicks<\/div><div class="value">\d/.test(html));
has('honest empty state for articles', html.includes('that is the real number') || html.includes('that is accurate'));
has('search payload', html.includes('window.__HK__='));
has('script closes cleanly', html.trim().endsWith('</html>'));
has('no NUL bytes', !html.includes(String.fromCharCode(0)));
has('no secret leaked', !/private_key|BEGIN [A-Z ]*PRIVATE KEY|client_email|-----BEGIN/.test(html));
has('viewport for phones', html.includes('width=device-width'));
has('noindex', html.includes('noindex'));

// balanced tags (rough): details/section/table
const count = (re) => (html.match(re) || []).length;
has('details balanced', count(/<details\b/g) === count(/<\/details>/g));
has('section balanced', count(/<section\b/g) === count(/<\/section>/g));
has('table balanced', count(/<table\b/g) === count(/<\/table>/g));
has('div balanced', count(/<div\b/g) === count(/<\/div>/g));

let bad = 0;
for (const [n, ok] of checks) if (!ok) { bad++; console.log('FAIL:', n); }
console.log(bad === 0 ? 'ALL ' + checks.length + ' PAGE CHECKS PASS  (' + Math.round(html.length/1024) + ' KB)' : bad + ' of ' + checks.length + ' FAILED');
process.exit(bad ? 1 : 0);
