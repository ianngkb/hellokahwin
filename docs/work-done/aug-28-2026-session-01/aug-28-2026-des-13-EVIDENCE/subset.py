"""What the display face actually costs the reader, in bytes.

Decision 127 set the webfont budget at ONE display face, one weight,
subsetted, ~20-30 KB, on a site that ships zero webfont bytes today.  This
measures whether Bodoni Moda fits inside that budget at the two subsets worth
considering, and what pinning the optical size buys.
"""
import io
import json
import sys

from fontTools.ttLib import TTFont
from fontTools.subset import Subsetter, Options
from fontTools.varLib.instancer import instantiateVariableFont

src, charset = sys.argv[1], sys.argv[2]
census = json.load(open(charset, encoding="utf-8"))
site_cps = {int(o["cp"][2:], 16) for o in census}

# The set worth shipping: what the site sets today, plus the Latin the register
# could reach for without a re-cut - Latin-1 letters and the punctuation a
# publication of record uses.
safe = set(range(0x20, 0x7F))
safe |= set(range(0xC0, 0x100))
safe |= {0x2010, 0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2026,
         0x00A0, 0x00B0, 0x00D7, 0x2212, 0x2030}

cases = [
    ("measured site set only", site_cps, None),
    ("measured site set only, opsz pinned 11", site_cps, 11),
    ("site set + Latin-1 + punctuation", safe | site_cps, None),
    ("site set + Latin-1 + punctuation, opsz pinned 11", safe | site_cps, 11),
    ("site set + Latin-1 + punctuation, opsz pinned 6", safe | site_cps, 6),
]

print("Bodoni Moda 2.005 variable (opsz 6-96, wght 400-900), source TTF %d bytes"
      % len(open(src, "rb").read()))
print()
print("%-52s %6s %10s %10s" % ("subset", "glyphs", "ttf bytes", "woff2 bytes"))

for label, cps, pin in cases:
    f = TTFont(src)
    if pin is not None:
        # instancing leaves gvar lazily loaded, which the subsetter trips over;
        # round-trip through bytes so the instance is a plain static font.
        f = instantiateVariableFont(f, {"opsz": pin}, inplace=False, updateFontNames=False)
        tmp = io.BytesIO()
        f.save(tmp)
        tmp.seek(0)
        f = TTFont(tmp)
    opt = Options()
    opt.layout_features = ["kern", "liga", "calt", "tnum", "onum", "frac"]
    opt.name_IDs = [1, 2, 3, 4, 5, 6, 13, 14]
    opt.notdef_outline = False
    opt.drop_tables += ["DSIG"]
    ss = Subsetter(options=opt)
    ss.populate(unicodes=cps)
    ss.subset(f)

    b = io.BytesIO()
    f.save(b)
    ttf_bytes = len(b.getvalue())

    f.flavor = "woff2"
    b2 = io.BytesIO()
    try:
        f.save(b2)
        woff2_bytes = len(b2.getvalue())
    except Exception as e:  # brotli missing
        woff2_bytes = -1
        print("  (woff2 failed: %s)" % e)

    print("%-52s %6d %10d %10s"
          % (label, f["maxp"].numGlyphs, ttf_bytes,
             woff2_bytes if woff2_bytes > 0 else "n/a"))
