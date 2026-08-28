#!/usr/bin/env python3
"""DES-03 - the four image derivatives this specification asks for, generated
from the site's OWN photographs and weighed, so the byte budgets in section 6
are measured rather than hoped for.

DES-09 G19 vetoed the 4:5 mobile cover at its shipped weight - median
1,405,400 B against a 204,800 B budget - and named three ways out. This picks
route 1, a smaller derivative plus srcset, and this script is the proof that
route 1 lands inside the budget on the real assets.

Source: the eleven photographs pulled from images.hellokahwin.com for DES-02,
in ../../work-done/aug-28-2026-session-01/aug-28-2026-des-02-EVIDENCE/images/.

Run: python derivatives.py
"""

import glob
import io
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(
    HERE, "..", "..", "work-done", "aug-28-2026-session-01",
    "aug-28-2026-des-02-EVIDENCE", "images"))

# name, target box, WebP quality, the ceiling this specification sets
TARGETS = [
    ("crop-4x5-mobile-cover-sm", (720, 900), 74, 122_880),    # 120 KB - the LCP element
    ("crop-3x2-column-md",       (760, 507), 74, 112_640),    # 110 KB - desktop column frame
    ("crop-4x3-card-sm",         (480, 360), 72,  46_080),    #  45 KB - catalogue card
    ("crop-1x1-row-sm",          (160, 160), 72,  12_288),    #  12 KB - list row thumb
]


def encode(im, box, q):
    c = im.copy()
    c.thumbnail(box, Image.LANCZOS)
    buf = io.BytesIO()
    c.save(buf, "WEBP", quality=q, method=6)
    return buf.getvalue(), c.size


files = sorted(glob.glob(os.path.join(SRC, "*.webp")))
print("DES-03 image derivatives - measured on %d real HelloKahwin photographs" % len(files))
print("Source: %s" % SRC)
print("=" * 104)

for name, box, q, ceiling in TARGETS:
    sizes = []
    for f in files:
        data, dim = encode(Image.open(f).convert("RGB"), box, q)
        sizes.append((len(data), os.path.basename(f), dim))
    sizes.sort()
    lo, med, hi = sizes[0], sizes[len(sizes) // 2], sizes[-1]
    verdict = "WITHIN BUDGET" if hi[0] <= ceiling else "OVER"
    print("\n%-26s box %-10s q%d   ceiling %7s B   %s"
          % (name, "%dx%d" % box, q, "{:,}".format(ceiling), verdict))
    print("   min    %8s B  %-16s %s" % ("{:,}".format(lo[0]), lo[1], lo[2]))
    print("   median %8s B  %-16s %s" % ("{:,}".format(med[0]), med[1], med[2]))
    print("   max    %8s B  %-16s %s" % ("{:,}".format(hi[0]), hi[1], hi[2]))

print("\n" + "=" * 104)
print("Against what production serves today, from DES-09 section 3.5:")
print("   crop-4x5-mobile-cover  1920x2400  median 1,405,400 B   <- DES-09 G19 vetoed this")
print("   crop-4x3-article-card  1600x1200  median   823,997 B   <- every card on the homepage")
print("\nG19 ceiling 204,800 B - G20 sum of preloads 307,200 B - G21 any single asset 409,600 B.")
print("Exactly ONE image is preloaded per page under this specification: the article cover.")
print("Everything else is loading=lazy with srcset+sizes, which is also G22.")
print("\nNOTE the sources are already downsampled copies (800x600 and 900x1200), so these")
print("figures are the derivative sizes for THESE files. A re-encode from the 1920x2400")
print("original will differ; the ceilings are what the DSE must hit, not these numbers.")
