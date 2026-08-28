#!/usr/bin/env python3
"""DES-03 - builds the self-contained specification artifact.

Reads des-03-spesifikasi.template.html and replaces every {{IMG:name:variant}}
token with a data: URI, so the published artifact carries its photographs
inside it. The Artifact CSP blocks external images outright, so a self-contained
document is not a preference here, it is the only thing that renders.

Writes: ../des-03-spesifikasi.html

Run: python build.py
"""

import base64
import glob
import io
import os
import re

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(
    HERE, "..", "..", "work-done", "aug-28-2026-session-01",
    "aug-28-2026-des-02-EVIDENCE", "images"))
TPL = os.path.join(HERE, "tpl")
OUT = os.path.normpath(os.path.join(HERE, "..", "des-03-spesifikasi.html"))

# variant -> (box, quality). These mirror the four derivatives specified in
# section 6 and measured by derivatives.py.
VARIANTS = {
    "cover": ((860, 1080), 76),  # crop-4x5-mobile-cover-sm / crop-3x2-column-md
    "card":  ((480, 360), 72),   # crop-4x3-card-sm
    "row":   ((160, 160), 72),   # crop-1x1-row-sm
}

cache = {}


def data_uri(name, variant):
    key = (name, variant)
    if key in cache:
        return cache[key]
    box, q = VARIANTS[variant]
    im = Image.open(os.path.join(SRC, name + ".webp")).convert("RGB")
    im.thumbnail(box, Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=q, method=6)
    uri = "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode("ascii")
    cache[key] = (uri, len(buf.getvalue()))
    return cache[key]


def main():
    parts = sorted(glob.glob(os.path.join(TPL, "*.html")))
    if not parts:
        raise SystemExit("no template parts found in %s" % TPL)
    html = "\n".join(open(p, encoding="utf-8").read() for p in parts)
    used = {}

    def sub(m):
        name, variant = m.group(1), m.group(2)
        uri, n = data_uri(name, variant)
        used[(name, variant)] = n
        return uri

    html, count = re.subn(r"\{\{IMG:([a-z0-9-]+):([a-z]+)\}\}", sub, html)
    leftovers = re.findall(r"\{\{[^}]+\}\}", html)
    if leftovers:
        raise SystemExit("unsubstituted tokens remain: %s" % sorted(set(leftovers)))

    with open(OUT, "w", encoding="utf-8") as f:
        f.write(html)

    print("substituted %d image references, %d distinct assets" % (count, len(used)))
    for (name, variant), n in sorted(used.items()):
        print("   %-14s %-6s %7s B" % (name, variant, "{:,}".format(n)))
    print("   %-21s %7s B of image payload" % ("TOTAL",
          "{:,}".format(sum(used.values()))))
    print("assembled from %d template parts" % len(parts))
    print("wrote %s  (%s bytes)" % (OUT, "{:,}".format(os.path.getsize(OUT))))


if __name__ == "__main__":
    main()
