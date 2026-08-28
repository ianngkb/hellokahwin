"""Pull the FAQPage <script type="application/ld+json"> block out of the LIVE
HTML of the five named articles, VERBATIM -- the bytes the browser receives, not
a re-serialisation of a parsed object. Re-curls each URL rather than reusing an
earlier capture, and records the response headers next to it so the cache state
of the measurement is part of the evidence."""
import io, os, re, sys, time, urllib.request

OUT = sys.argv[1]
URLS = [
    'https://hellokahwin.com/artikel/hantaran-mas-kahwin/nisbah-hantaran',
    'https://hellokahwin.com/artikel/hantaran-mas-kahwin/mas-kahwin-johor',
    'https://hellokahwin.com/artikel/ucapan-doa/walimatul-urus',
    'https://hellokahwin.com/artikel/busana-pengantin/songket-tenunan-tangan-atau-cetak',
    'https://hellokahwin.com/artikel/ucapan-doa/doa-majlis-perkahwinan',
]
SCRIPT = re.compile(r'<script type="application/ld\+json">(.*?)</script>', re.S)
os.makedirs(OUT, exist_ok=True)

for url in URLS:
    slug = url.rsplit('/', 1)[-1]
    req = urllib.request.Request(url, headers={'User-Agent': 'hellokahwin-seo10-probe/1.0'})
    with urllib.request.urlopen(req, timeout=60) as r:
        body = r.read().decode('utf-8', 'strict')
        hdrs = {k.lower(): v for k, v in r.headers.items()}
        status = r.status
    faq = [m.group(0) for m in SCRIPT.finditer(body) if '"FAQPage"' in m.group(1)]
    assert len(faq) == 1, (slug, len(faq))
    lines = [
        '# ' + url,
        '# extracted ' + time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        '# HTTP %d  x-vercel-cache: %s  age: %s  date: %s'
        % (status, hdrs.get('x-vercel-cache', '-'), hdrs.get('age', '-'), hdrs.get('date', '-')),
        '# the <script> element below is copied byte for byte out of the response body',
        '',
        faq[0],
        '',
    ]
    io.open(OUT + '/' + slug + '.faqpage.txt', 'w', encoding='utf-8', newline='\n').write('\n'.join(lines))
    print('%-36s %d bytes  cache=%s' % (slug, len(faq[0]), hdrs.get('x-vercel-cache', '-')))
    time.sleep(0.9)
