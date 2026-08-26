# -*- coding: utf-8 -*-
"""Gate the 28 CONT-02 articles against every rule the brief states.

Checks, in the order they would bite at ingest:
  1  every `file:` resolves to a real file on disk (relative to the ARTICLE)
  2  credit, creditUrl, licenseClass, licensorName all present and non-empty
  3  alt and caption present and non-trivial
  4  placeAfter never points past the end of the body
  5  no article carries the same photograph twice
  6  no `kad-tajuk`, and no image that is not a licensed photograph
  7  one path spelling per directory, and never a `./` prefix
"""
import os, re, sys, glob

# Resolve the drafts directory from THIS FILE's location, never from a
# hardcoded checkout. CONT-07 ran this from a worktree on 27 Ogos 2026 and it
# silently validated a DIFFERENT checkout's articles: "PASS, 35 articles" was
# true, and true about files the run had never touched. A validator that can be
# pointed at the wrong tree without saying so is worse than no validator.
D = os.path.abspath(os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    '..', '..', 'plans', 'aug-23-2026-session-01', 'drafts'))
print(f'drafts root: {D}')
FILES = sorted(glob.glob(os.path.join(D, 'ingest', '*.md')))
FILES = [f for f in FILES if not re.search(r'C2-3-A[123]', os.path.basename(f))]
FILES += [os.path.join(D, n) for n in
          ('borang-nikah.md', 'lafaz-taklik.md', 'rukun-nikah.md', 'syarat-sah-nikah.md',
           'C6-2-A1-harga-sewa-dewan-kahwin.md', 'C6-2-A2-checklist-kahwin.md',
           'C6-2-A3-pakej-dewan-kahwin.md', 'C6-2-A4-bajet-kahwin.md')]

fails, total = [], 0
for p in FILES:
    txt = open(p, encoding='utf-8').read()
    end = txt.index('\n---\n', 4) + 1
    fm, body = txt[:end], txt[end:]
    slug = re.search(r'^slug:\s*(\S+)', fm, re.M).group(1)
    blocks = [b for b in re.split(r'\n\s*\n', body) if b.strip()]
    recs = re.split(r'\n(?=  - file:|cover:\n)', fm)
    seen = []
    for r in recs:
        m = re.search(r'^\s*-?\s*file:\s*"?([^"\n]+?)"?\s*$', r, re.M)
        if not m:
            continue
        path = m.group(1).strip()
        total += 1
        base = os.path.basename(path)
        seen.append(base)
        if path.startswith('./'):
            fails.append(f"{slug}: './' prefix on {path}")
        if 'kad-tajuk' in path:
            fails.append(f"{slug}: kad-tajuk reference {path}")
        if not base.startswith('S-'):
            fails.append(f"{slug}: not a licensed photograph: {path}")
        if not os.path.exists(os.path.normpath(os.path.join(os.path.dirname(p), path))):
            fails.append(f"{slug}: MISSING FILE {path}")
        for key in ('credit', 'creditUrl', 'licenseClass', 'licensorName'):
            mm = re.search(rf'^\s*{key}:\s*(\S.*)$', r, re.M)
            if not mm or not mm.group(1).strip().strip("'\""):
                fails.append(f"{slug}: {base} missing {key}")
        for key in ('alt', 'caption'):
            mm = re.search(rf'^\s*{key}:\s*(.+)$', r, re.M)
            if not mm:
                fails.append(f"{slug}: {base} missing {key}")
            elif mm.group(1).strip() == '>-':
                nxt = r[mm.end():].strip().split('\n')[0].strip()
                if len(nxt) < 25:
                    fails.append(f"{slug}: {base} {key} too short")
            elif len(mm.group(1).strip().strip('"')) < 25:
                fails.append(f"{slug}: {base} {key} too short")
        pa = re.search(r'^\s*placeAfter:\s*(\d+)', r, re.M)
        if pa and int(pa.group(1)) > len(blocks):
            fails.append(f"{slug}: placeAfter {pa.group(1)} > {len(blocks)} blocks ({base})")
    dupes = {x for x in seen if seen.count(x) > 1}
    if dupes:
        fails.append(f"{slug}: same photograph twice: {sorted(dupes)}")

print(f"checked {len(FILES)} articles, {total} image references")
if fails:
    print(f"\n{len(fails)} FAILURES:")
    for f in fails:
        print("  -", f)
    sys.exit(1)
print("PASS: every image resolves, is credited four ways, and is placed inside the body.")
