#!/usr/bin/env bash
# SEO-08 — what a reader actually receives at https://hellokahwin.com/garden-wedding/.
# Sequential, one request at a time (a concurrent sweep manufactures the
# generateMetadata contention that produces false title failures).
set -u
TMPHTML="${TMPDIR:-.}/seo08-gw.html"
export TMPHTML
URL_LEGACY="https://hellokahwin.com/garden-wedding/"
URL_CANON="https://hellokahwin.com/artikel/idea-dan-nasihat/garden-wedding"

echo "### measured $(date -u '+%Y-%m-%dT%H:%M:%SZ') UTC"
echo
echo "## 1. Legacy URL — status and redirect target"
curl -s -o /dev/null -w 'status=%{http_code} redirect=%{redirect_url}\n' "$URL_LEGACY"
curl -sI "$URL_LEGACY" | grep -iE '^(location|x-vercel-cache|cache-control):'
echo
echo "## 2. Canonical URL — what the reader ends up on"
curl -sIL "$URL_CANON" | grep -iE '^(HTTP/|x-vercel-cache|cache-control):'
echo
echo "## 3. The rendered <title>, <h1>, canonical and description"
curl -sL "$URL_LEGACY" -o "$TMPHTML"
grep -o '<title>[^<]*</title>' "$TMPHTML"
grep -oE '<link rel="canonical"[^>]*>' "$TMPHTML"
grep -oE '<meta name="description" content="[^"]{0,120}' "$TMPHTML"
echo "h1 count: $(grep -o '<h1' "$TMPHTML" | wc -l)"
grep -oE '<h1[^>]*>[^<]*' "$TMPHTML" | sed 's/<h1[^>]*>/  h1: /'
echo
echo "## 4. NEGATIVE CONTROL — a page this item did not touch"
curl -sL "https://hellokahwin.com/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri" | grep -o '<title>[^<]*</title>'
echo
echo "## 5. Image credit audit (the owner-level rule: every image credited)"
python - <<'PY'
import re, html, os
s = open(os.environ['TMPHTML'], encoding='utf-8').read()
b = re.sub(r'<script.*?</script>', '', s, flags=re.S)
m = re.search(r'<article.*?</article>', b, flags=re.S)
seg = m.group(0) if m else b
figs = re.findall(r'<figure.*?</figure>', seg, flags=re.S)
imgs = re.findall(r'<img[^>]+>', seg)
alts = re.findall(r'<img[^>]*alt="([^"]*)"', seg)
caps = [html.unescape(re.sub(r'<[^>]+>', '', re.search(r'<figcaption[^>]*>(.*?)</figcaption>', f, flags=re.S).group(1))).strip()
        for f in figs if '<figcaption' in f]
print('images in article body :', len(imgs))
print('images carrying a credit:', len(caps))
print('images with NO credit   :', len(imgs) - len(caps))
print('images with empty alt   :', sum(1 for a in alts if not a.strip()), 'of', len(alts))
print('images carrying srcset  :', sum(1 for i in imgs if 'srcset' in i))
import collections
print('credit label casings    :', dict(collections.Counter(c.split(':')[0] for c in caps)))
for c in caps[:5]:
    print('  sample credit:', c[:80])
PY
