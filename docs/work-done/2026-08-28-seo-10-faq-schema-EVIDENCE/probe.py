"""Probe live article HTML for the Soalan-lazim block and any FAQPage JSON-LD.

Sequential, one request at a time, 900ms apart, no purge -- the same method the
Sprint-02 gap census used, so the two are comparable.

The block is found by heading TEXT (`Soalan lazim`) at whatever level the
article happens to use: the mas-kahwin cluster writes it as `<h3>` with `<h4>`
questions, everything else as `<h2>` with `<h3>` questions. Questions are the
headings one level deeper, up to the next heading at or above the block's own
level, and a question must end in `?` -- which is what keeps the site chrome
that follows the article body (`Tag`, `Lagi dalam ...`) out of the count.
"""
import json, re, sys, time, os, io, urllib.request, html as htmlmod

SP = os.path.dirname(os.path.abspath(__file__))
urls = [u.strip() for u in io.open(SP + '/urls.txt', encoding='utf-8') if u.strip()]
outname = sys.argv[1] if len(sys.argv) > 1 else 'probe.json'

LD = re.compile(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', re.S)
H = re.compile(r'<(h[1-6])\b[^>]*>(.*?)</\1>', re.S | re.I)

def text(s):
    return htmlmod.unescape(re.sub(r'<[^>]*>', '', s)).strip()

def block_questions(heads):
    """(level, text) pairs -> (block heading level, [question text])."""
    for n, (lvl, t) in enumerate(heads):
        if t.strip().lower().rstrip(':') != 'soalan lazim':
            continue
        qs = []
        for lvl2, t2 in heads[n + 1:]:
            if lvl2 <= lvl:
                break
            if lvl2 == lvl + 1 and t2.endswith('?'):
                qs.append(t2)
        return lvl, qs
    return None, []

rows = []
for i, url in enumerate(urls):
    req = urllib.request.Request(url, headers={'User-Agent': 'hellokahwin-seo10-probe/1.0'})
    with urllib.request.urlopen(req, timeout=60) as r:
        body = r.read().decode('utf-8', 'replace')
        cache = r.headers.get('x-vercel-cache', '')
        status = r.status
    blocks = []
    for m in LD.finditer(body):
        raw = m.group(1).replace('\u003c', '<')
        try:
            blocks.append(json.loads(raw))
        except Exception as e:
            blocks.append({'PARSE_ERROR': str(e)})
    types = [b.get('@type') for b in blocks if isinstance(b, dict)]
    faq = next((b for b in blocks if isinstance(b, dict) and b.get('@type') == 'FAQPage'), None)
    heads = [(int(m.group(1)[1]), text(m.group(2))) for m in H.finditer(body)]
    lvl, qs = block_questions(heads)
    rows.append({
        'url': url, 'status': status, 'cache': cache, 'bytes': len(body),
        'ldTypes': types, 'soalanLazimLevel': lvl, 'renderedQuestions': qs,
        'faqPage': faq,
        'faqQuestionCount': len(faq.get('mainEntity', [])) if isinstance(faq, dict) else 0,
    })
    print(f"{i+1:2d}/{len(urls)} {status} {cache:8s} block=h{lvl} qs={len(qs)} "
          f"FAQPage={'YES(' + str(len(faq.get('mainEntity', []))) + ')' if faq else 'no'}  {url}")
    sys.stdout.flush()
    if i + 1 < len(urls):
        time.sleep(0.9)

io.open(SP + '/' + outname, 'w', encoding='utf-8').write(json.dumps({
    'measuredAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'method': 'sequential, one request at a time, 900ms apart, no purge',
    'total': len(rows),
    'withSoalanLazimBlock': sum(1 for r in rows if r['soalanLazimLevel']),
    'emittingFaqPage': sum(1 for r in rows if r['faqPage']),
    'rows': rows,
}, ensure_ascii=False, indent=1))
print('wrote', outname)
