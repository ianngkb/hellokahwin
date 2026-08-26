# Harvest every image's credit metadata out of the existing front matter, keyed by
# basename. Reused photographs then carry credit that was READ from the register's
# own files rather than retyped — the "never fabricate a URL" rule, enforced by
# construction instead of by care.
import glob, os, json, re
D = r"C:/Users/Ian Ng/Documents/Code/hellokahwin/hellokahwin/docs/plans/aug-23-2026-session-01/drafts"
out = {}
files = glob.glob(os.path.join(D, '*.md')) + glob.glob(os.path.join(D, 'ingest', '*.md'))
for p in files:
    if any(x in os.path.basename(p) for x in ('REVIEWED', '-draft.md', 'INSESSION')): continue
    txt = open(p, encoding='utf-8').read()
    parts = txt.split('\n---\n', 1)
    fm = parts[0]
    # split the front matter into image records: cover: block and each `- file:` block
    recs = re.split(r'\n(?=  - file:|cover:\n)', fm)
    for r in recs:
        m = re.search(r'file:\s*"?([^"\n]+)"?', r)
        if not m: continue
        base = os.path.basename(m.group(1).strip().strip('"'))
        if not base.startswith('S-'): continue
        def grab(key):
            mm = re.search(rf'^\s*{key}:\s*(.+)$', r, re.M)
            return mm.group(1).strip() if mm else None
        alt = None
        ma = re.search(r'^\s*alt:\s*(>-\n(?:\s{6,}.*\n?)+|.+)$', r, re.M)
        if ma:
            v = ma.group(1)
            if v.startswith('>-'):
                alt = ' '.join(l.strip() for l in v.split('\n')[1:] if l.strip())
            else:
                alt = v.strip()
        rec = {'alt': alt, 'credit': grab('credit'), 'creditUrl': grab('creditUrl'),
               'licenseClass': grab('licenseClass'), 'licensorName': grab('licensorName')}
        if base not in out and rec['credit']:
            out[base] = rec
json.dump(out, open(os.path.join(os.path.dirname(__file__), 'meta.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f"harvested {len(out)} images")
missing = [b for b, r in out.items() if not (r['credit'] and r['licenseClass'] and r['licensorName'])]
print("incomplete:", missing or "none")
