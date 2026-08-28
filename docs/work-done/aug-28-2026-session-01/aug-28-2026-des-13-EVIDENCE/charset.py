"""Build the character set the HelloKahwin display face must cover.

Sources, in order of authority:
  1. Live production HTML  - every <h1>, <h2>, <h3> and the <title>, fetched
     from a sample of real pages.  This is what the display face actually sets.
  2. docs/design/des-06-evidence/corpus-2026-08-28.tsv - all 86 article titles
     and 15 category names, counted 28 Ogos 2026 for DES-06.
  3. The wordmark string itself.

Writes a sorted census so the coverage test can be reproduced.
"""
import collections
import csv
import json
import re
import sys
import unicodedata

CORPUS = r"C:\Users\Ian Ng\Documents\Code\hellokahwin\hellokahwin\docs\design\des-06-evidence\corpus-2026-08-28.tsv"

counts = collections.Counter()
sources = collections.defaultdict(set)


def feed(text, where):
    for ch in text:
        counts[ch] += 1
        sources[ch].add(where)


# 2. corpus
with open(CORPUS, encoding="utf-8") as fh:
    rows = list(csv.DictReader(fh, delimiter="\t"))
for r in rows:
    feed(r.get("title") or "", "corpus:title")
    feed(r.get("category_name") or "", "corpus:category")
print("corpus rows:", len(rows), file=sys.stderr)

# 1. live HTML, passed in as files on argv
for path in sys.argv[1:]:
    html = open(path, encoding="utf-8", errors="replace").read()
    for tag in ("h1", "h2", "h3", "title"):
        for m in re.finditer(r"(?is)<%s[^>]*>(.*?)</%s>" % (tag, tag), html):
            txt = re.sub(r"(?s)<[^>]+>", " ", m.group(1))
            txt = (
                txt.replace("&amp;", "&")
                .replace("&nbsp;", " ")
                .replace("&#x27;", "'")
                .replace("&rsquo;", "\u2019")
                .replace("&quot;", '"')
            )
            feed(txt, "live:%s" % tag)

# 3. the wordmark
feed("HELLOKAHWIN HelloKahwin KAHWIN HK", "wordmark")

out = []
for ch, n in sorted(counts.items(), key=lambda kv: ord(kv[0])):
    out.append(
        {
            "cp": "U+%04X" % ord(ch),
            "char": ch,
            "count": n,
            "name": unicodedata.name(ch, "<unnamed>"),
            "sources": sorted(sources[ch]),
        }
    )
json.dump(out, open("charset.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

print("distinct codepoints:", len(out), file=sys.stderr)
nonascii = [o for o in out if ord(o["char"]) > 127]
print("non-ASCII:", len(nonascii), file=sys.stderr)
for o in out:
    print(o["cp"], repr(o["char"]), o["count"], o["name"], ",".join(o["sources"]))
