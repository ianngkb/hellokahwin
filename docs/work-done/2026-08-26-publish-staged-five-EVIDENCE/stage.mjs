import fs from 'node:fs';
const D =
  'C:/Users/Ian Ng/Documents/Code/hellokahwin/hellokahwin/docs/plans/aug-23-2026-session-01/drafts/';
const FILES = ['P3-A4-walimatul-urus.md', 'P3-A5-skrip-pengacara-majlis-perkahwinan.md'];
for (const f of FILES) {
  const src = D + f,
    dst = D + 'ingest/' + f;
  const raw = fs.readFileSync(src, 'utf8');
  const m = raw.match(/^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n)([\s\S]*)$/);
  if (!m) throw new Error('no front matter in ' + f);
  const [, open, fmIn, close, body] = m;
  const changes = [];
  let fm = fmIn;
  fm = fm.replace(/^status:\s*draft\s*$/m, () => {
    changes.push('status: draft -> status: published');
    return 'status: published';
  });
  fm = fm.replace(/^(\s*(?:- )?file:\s*)(?!\.\.\/)images\//gm, (s, p) => {
    changes.push('images/… -> ../images/…');
    return p + '../images/';
  });
  const out = open + fm + close + body;
  fs.writeFileSync(dst, out);
  const chk = fs.readFileSync(dst, 'utf8').match(/^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n)([\s\S]*)$/);
  console.log('#### ' + f + '  ->  ingest/' + f);
  console.log(
    '   changes: status x' +
      changes.filter((c) => c.startsWith('status')).length +
      ', image path x' +
      changes.filter((c) => !c.startsWith('status')).length,
  );
  console.log('   body IDENTICAL to original: ' + (chk[4] === body));
  console.log('   CRLF preserved throughout:  ' + !/(?<!\r)\n/.test(out));
  console.log('   "./" prefixes: ' + (out.match(/file:\s*\.\//g) || []).length);
}
