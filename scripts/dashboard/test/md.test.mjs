import { renderMarkdown, toPlainText } from '../lib/md.mjs';
const src = [
  '# Title',
  '',
  '**Status:** APPROVED 23 Aug 2026 (v3)',
  '',
  '| Metric | Baseline | 30 days |',
  '|---|---|---:|',
  '| Clicks / 28d | 32 | 150 |',
  '| Code | `borang nikah` | **1,500** |',
  '',
  '- one item',
  '  - nested item',
  '- two `code` item',
  '',
  '1. first',
  '2. second',
  '',
  '> a quote with **bold**',
  '',
  '---',
  '',
  'Para with **bold**, *em*, [link](https://x.com), `a|b` and a pipe | char.',
  '',
  '```js',
  'const a = 1; // <not html>',
  '```',
].join('\n');
const html = renderMarkdown(src);
const checks = [
  ['table rendered', html.includes('<table class="md-table"')],
  ['right align kept', html.includes('text-align:right')],
  ['code span in table cell', html.includes('<code>borang nikah</code>')],
  ['nested list', /<ul>[\s\S]*<ul>/.test(html)],
  ['ordered list', html.includes('<ol>')],
  ['blockquote', html.includes('<blockquote>')],
  ['hr', html.includes('<hr>')],
  ['link', html.includes('href="https://x.com"')],
  ['code span with pipe', html.includes('<code>a|b</code>')],
  ['fenced code escaped', html.includes('&lt;not html&gt;')],
  ['bold', html.includes('<strong>bold</strong>')],
  ['no NUL', !html.includes(String.fromCharCode(0))],
  ['plain text strips markup', !toPlainText(src).includes('**')],
];
let bad = 0;
for (const [name, ok] of checks) { if (!ok) { bad++; console.log('FAIL:', name); } }
console.log(bad === 0 ? 'ALL ' + checks.length + ' MARKDOWN CHECKS PASS' : bad + ' FAILURES');
if (bad) console.log(html);
