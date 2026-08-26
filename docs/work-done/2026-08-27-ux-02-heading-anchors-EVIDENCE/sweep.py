"""UX-02 invariant sweep over every published article page, served locally.

Asserts, per page:
  - every body <h2>/<h3> carries an id
  - no id appears twice
  - every href="#..." resolves to an id that exists
  - every ItemList url points at an anchor that exists
  - numberOfItems matches the array length
  - a TOC is only rendered at or above the 4-heading threshold

Usage: python sweep.py <dir-of-fetched-html>
"""
import re, sys, json, io, os, glob

W = sys.argv[1]
rows, bad, places = [], [], []
for f in sorted(glob.glob(os.path.join(W, 'sweep', '*.html'))):
    s = io.open(f, encoding='utf-8').read()
    name = os.path.basename(f)[:-5].replace('_artikel_', '').replace('_', '/')
    # The ARTICLE BODY only. A first cut at 'related-articles-heading' still
    # swept in the sidebar's own <h3 class="sidebar-section-title">, which
    # reported two "headings without an id" that are not article headings at
    # all -- so start at the renderer's own container and stop at whichever
    # chrome comes first.
    body = s[s.find('inspire-prose max-w-none'):]
    for marker in ('related-articles-heading', 'sidebar-section-title'):
        i = body.find(marker)
        if i != -1:
            body = body[:i]
    # Match a WHOLE opening tag. An earlier `<(h[23])(?: id="...")?` also
    # matched a bare `<h2` substring and over-counted the headings by one.
    tags = re.findall(r'<h[23](?:\s[^>]*)?>', body)
    bodyh = [(t, (re.search(r'\sid="([^"]*)"', t) or [None, None])[1]) for t in tags]
    total, withid = len(bodyh), len([1 for t, i in bodyh if i])
    hrefs = re.findall(r'href="#([^"]+)"', s)
    idset = set(re.findall(r'<h[1-6][^>]*id="([^"]+)"', s))
    ids = [i for t, i in bodyh if i]
    dang = [h for h in hrefs if h not in idset]
    blocks = [json.loads(b.replace('\u003c', '<'))
              for b in re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, re.S)]
    il = [b for b in blocks if b.get('@type') == 'ItemList']
    pl = [e['item'] for b in il for e in b['itemListElement'] if 'item' in e]
    places += [(p['name'], p['address']['addressLocality']) for p in pl]
    if dang: bad.append((name, 'DANGLING ANCHOR', dang))
    if len(ids) != len(set(ids)): bad.append((name, 'DUPLICATE ID', ids))
    if withid != total: bad.append((name, 'HEADING WITHOUT ID', f'{withid}/{total}'))
    if hrefs and len(hrefs) < 4: bad.append((name, 'TOC BELOW THRESHOLD', len(hrefs)))
    for b in il:
        if b['numberOfItems'] != len(b['itemListElement']):
            bad.append((name, 'numberOfItems MISMATCH', b['numberOfItems']))
        for e in b['itemListElement']:
            if e['url'].split('#')[-1] not in idset:
                bad.append((name, 'ITEMLIST URL WITH NO ANCHOR', e['url']))
    rows.append((name, total, withid, len(hrefs), il[0]['numberOfItems'] if il else 0, len(pl)))

print("UX-02 corpus sweep - local production build, every published article page\n")
print(f"{'article':50s} {'h2/h3':>6} {'ids':>4} {'toc':>4} {'list':>5} {'place':>6}")
for r in rows:
    print(f"{r[0][:50]:50s} {r[1]:6d} {r[2]:4d} {r[3]:4d} {r[4]:5d} {r[5]:6d}")
print()
print(f"pages                       : {len(rows)}")
print(f"body h2/h3 total            : {sum(r[1] for r in rows)}")
print(f"body h2/h3 carrying an id   : {sum(r[2] for r in rows)}")
print(f"pages with a TOC            : {sum(1 for r in rows if r[3])}  (threshold: >=4 h2s)")
print(f"pages emitting ItemList     : {sum(1 for r in rows if r[4])}  (threshold: >=4 numbered h2s)")
print(f"Place claims, whole corpus  : {len(places)}")
print()
print("INVARIANT VIOLATIONS: " + ('NONE' if not bad else ''))
for b in bad:
    print('  ', b)
print()
print("every Place claimed anywhere on the site:")
for n, l in places:
    print(f"  {l:16s} | {n}")
