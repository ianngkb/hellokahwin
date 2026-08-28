"""DES-13 verification.

Three questions, answered by measurement rather than assertion:

  A. COVERAGE - does Bodoni Moda carry every codepoint the site's display type
     actually sets, plus the wider Latin set a Malay publication could
     plausibly reach for?
  B. PROVENANCE - are the five shipped wordmark SVGs really Bodoni Moda, or
     something else that was labelled Bodoni Moda?
  C. A FAILED MEASUREMENT, kept deliberately - the first attempt at the optical
     size question, which measured the wrong strokes and concluded the axis does
     nothing. opsz.py holds the sound measurement. See the comment above the
     section.

Run:  python verify.py <font.ttf> <charset.json> <dir-of-svgs>
"""
import json
import re
import sys
import unicodedata

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.recordingPen import DecomposingRecordingPen

font_path, charset_path, svg_dir = sys.argv[1], sys.argv[2], sys.argv[3]

# ---------------------------------------------------------------- A. coverage
f = TTFont(font_path)
cmap = f.getBestCmap()
upem = f["head"].unitsPerEm

census = json.load(open(charset_path, encoding="utf-8"))
required = [int(o["cp"][2:], 16) for o in census]

missing = [cp for cp in required if cp not in cmap and cp not in (0x20,)]
print("== A. COVERAGE ==")
print("upem:", upem, " glyphs:", f["maxp"].numGlyphs, " cmap entries:", len(cmap))
print("codepoints the live site's display type sets:", len(required))
print("MISSING from Bodoni Moda:", len(missing), [hex(c) for c in missing])

# The wider safety set: everything a Malay-language publication could reach for
# without commissioning anything.  Basic Latin + Latin-1 + Latin Extended-A
# (which is where the borrowed-word accents live), plus the punctuation and
# currency a rate table needs.
extra = {
    "Basic Latin (printable)": range(0x20, 0x7F),
    "Latin-1 Supplement (letters)": list(range(0xC0, 0x100)),
    "Latin Extended-A": range(0x100, 0x180),
    "punctuation the register uses": [
        0x2010, 0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D,
        0x2026, 0x00AB, 0x00BB, 0x2039, 0x203A,
    ],
    "currency / figures": [0x00A0, 0x00D7, 0x2212, 0x2030, 0x00B0, 0x20AC, 0x00A3, 0x0024],
}
for label, rng in extra.items():
    rng = list(rng)
    miss = [c for c in rng if c not in cmap]
    print(
        "  %-32s %3d/%3d present, missing %s"
        % (label, len(rng) - len(miss), len(rng), [hex(c) for c in miss] or "none")
    )

# Malay-specific: Rumi Malay is plain Latin, but check the letters anyway.
malay_letters = [ord(c) for c in "abcdefghijklmnopqrstuvwxyz"] + [
    ord(c) for c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
]
print(
    "  Rumi Malay alphabet A-Z a-z:      %d/%d present"
    % (sum(1 for c in malay_letters if c in cmap), len(malay_letters))
)

# ------------------------------------------------------------- B. provenance
print()
print("== B. PROVENANCE OF THE SHIPPED SVGs ==")


def glyph_path_d(ttfont, char, upm_scale=1.0):
    """Return the glyph outline as an SVG-ish coordinate list."""
    gs = ttfont.getGlyphSet()
    gname = ttfont.getBestCmap()[ord(char)]
    pen = DecomposingRecordingPen(gs)
    gs[gname].draw(pen)
    pts = []
    for op, args in pen.value:
        for pt in args:
            if isinstance(pt, tuple):
                pts.append((round(pt[0] * upm_scale), round(pt[1] * upm_scale)))
    return pts, gname


def svg_first_path_points(path_d):
    """Pull the numeric pairs out of an SVG path 'd' made only of M/V/H/L/Z."""
    toks = re.findall(r"([MVHLZmvhlz])|(-?\d+(?:\.\d+)?)", path_d)
    pts, cur = [], [0.0, 0.0]
    cmd = None
    nums = []

    def flush():
        nonlocal nums
        if cmd in ("M", "L"):
            for i in range(0, len(nums) - 1, 2):
                cur[0], cur[1] = nums[i], nums[i + 1]
                pts.append((round(cur[0]), round(cur[1])))
        elif cmd == "V":
            for n in nums:
                cur[1] = n
                pts.append((round(cur[0]), round(cur[1])))
        elif cmd == "H":
            for n in nums:
                cur[0] = n
                pts.append((round(cur[0]), round(cur[1])))
        nums = []

    for c, n in toks:
        if c:
            flush()
            cmd = c.upper()
        else:
            nums.append(float(n))
    flush()
    return pts


import os

for fn in sorted(os.listdir(svg_dir)):
    if not fn.endswith(".svg"):
        continue
    svg = open(os.path.join(svg_dir, fn), encoding="utf-8").read()
    vb = re.search(r'viewBox="([^"]+)"', svg).group(1).split()
    w, h = float(vb[2]), float(vb[3])
    ds = re.findall(r'<path[^>]*\sd="([^"]+)"', svg)
    print(
        "%-38s viewBox %sx%s  ratio %.2f:1  paths %d  %d bytes"
        % (fn, int(w), int(h), w / h, len(ds), len(svg))
    )

# Compare the FIRST path of the horizontal lockup (should be 'H') against
# Bodoni Moda's own 'H' outline.  The SVGs are y-flipped by the <g> transform,
# so compare the sorted set of |x| and |y| extremes instead of raw coordinates.
horiz = open(os.path.join(svg_dir, "hellokahwin-horizontal.svg"), encoding="utf-8").read()
first_d = re.findall(r'<path[^>]*\sd="([^"]+)"', horiz)[0]
svg_pts = svg_first_path_points(first_d)

print()
print("first path of hellokahwin-horizontal.svg, %d points" % len(svg_pts))
print("  x range", min(p[0] for p in svg_pts), "->", max(p[0] for p in svg_pts))
print("  y range", min(p[1] for p in svg_pts), "->", max(p[1] for p in svg_pts))

for opsz in (6, 11, 40, 96):
    inst = instantiateVariableFont(
        TTFont(font_path), {"opsz": opsz, "wght": 400}, inplace=False, updateFontNames=False
    )
    pts, gname = glyph_path_d(inst, "H", 1500.0 / (inst["OS/2"].sCapHeight or 1500))
    xs = sorted({p[0] for p in pts})
    ys = sorted({p[1] for p in pts})
    print(
        "  Bodoni Moda H @opsz %2d wght 400 -> glyph %-4s cap %4d  x set %s"
        % (opsz, gname, inst["OS/2"].sCapHeight, xs)
    )

# ------------------------------------------- C. the measurement that was WRONG
#
# KEPT ON PURPOSE, AND IT DOES NOT ANSWER THE HAIRLINE QUESTION.  Read this
# before you read the numbers.
#
# This was the first attempt at "what does opsz do?", and it says the axis does
# almost nothing.  That conclusion is FALSE, and the two columns below are why:
#
#   * "H stem" measures the H, and the H is the one letter in a didone where
#     EVERY stroke is thick.  Its stem moves 181 -> 179 units across the whole
#     axis, about 1%, because thick strokes are not what an optical size axis
#     moves.
#   * "o outer-to-next" is the gap between the two leftmost x coordinates on the
#     o's OUTER contour.  It is not the thin stroke.  The hairline is the
#     distance between the top of the outer contour and the top of the COUNTER,
#     and this column never touches the counter, which is why it is a flat 112
#     at every size.
#
# The real measurement is in opsz.py, and it reports the hairline moving
# 72 -> 4 units across opsz 6 -> 96 - a 94% collapse.  THAT is the number the
# decision, decision-log entry 141 and DES-10's reopened brief rest on.  See
# out-opsz.txt.
#
# This block stays in the evidence because the trap is worth being able to
# reproduce: it shows exactly how a confident, wrong answer falls out of
# measuring a property on a glyph that does not carry it.
print()
print("== C. THE FAILED MEASUREMENT - DOES NOT MEASURE THE HAIRLINE ==")
print("Kept as a reproducible trap, NOT as a result. 'H stem' measures a glyph")
print("whose strokes are all thick; 'o outer-to-next' never touches the counter,")
print("so neither column can see a hairline. Both are near-invariant for that")
print("reason. For what opsz actually does to the hairline - 72 -> 4 units across")
print("opsz 6 -> 96 - run opsz.py and read out-opsz.txt.")
for opsz in (6, 8, 11, 14, 24, 48, 72, 96):
    inst = instantiateVariableFont(
        TTFont(font_path), {"opsz": opsz, "wght": 400}, inplace=False, updateFontNames=False
    )
    cap = inst["OS/2"].sCapHeight or 1500
    scale = 1500.0 / cap
    hp, _ = glyph_path_d(inst, "H", scale)
    xs = sorted({p[0] for p in hp})
    # H = two vertical stems + a crossbar; the first two distinct x values are
    # the left stem's edges.
    stem = xs[1] - xs[0] if len(xs) > 1 else 0
    op, _ = glyph_path_d(inst, "o", scale)
    oxs = sorted({p[0] for p in op})
    thin_hint = oxs[1] - oxs[0] if len(oxs) > 1 else 0
    print(
        "  opsz %2d  cap %4d  H stem %4d  o outer-to-next %4d  stem/cap %.4f"
        % (opsz, cap, stem, thin_hint, stem / 1500.0)
    )
