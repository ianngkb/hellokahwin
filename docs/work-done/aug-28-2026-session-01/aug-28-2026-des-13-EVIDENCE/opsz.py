"""What Bodoni Moda's opsz axis actually changes.

The first pass measured the H stem and found it moves 181 -> 179 units across
opsz 6 -> 96, which is 1.1% and not a design lever.  So measure the other two
things an optical size axis normally moves: SPACING (advance width and
sidebearings) and the THIN stroke - the hairline that decides whether a didone
survives at 18px.
"""
import sys

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.boundsPen import BoundsPen

path = sys.argv[1]
WORD = "HelloKahwin"


def measure(opsz, wght=400):
    inst = instantiateVariableFont(
        TTFont(path), {"opsz": opsz, "wght": wght}, inplace=False, updateFontNames=False
    )
    gs = inst.getGlyphSet()
    cmap = inst.getBestCmap()
    hmtx = inst["hmtx"]

    # total set width of the real wordmark string, no tracking
    total = sum(hmtx[cmap[ord(c)]][0] for c in WORD)

    # 'o' hairline: the thinnest horizontal section of the bowl, taken at the
    # top of the o where a didone's stroke is at its thinnest.
    gname = cmap[ord("o")]
    pen = DecomposingRecordingPen(gs)
    gs[gname].draw(pen)
    pts = [p for op, args in pen.value for p in args if isinstance(p, tuple)]
    bp = BoundsPen(gs)
    gs[gname].draw(bp)
    x0, y0, x1, y1 = bp.bounds
    ymid_top = y1  # apex of the bowl
    # points within 4% of the apex, on the left half and the right half
    band = [p for p in pts if p[1] >= y1 - (y1 - y0) * 0.06]
    apex_thin = None
    if band:
        # thinnest vertical extent among apex points is not meaningful; instead
        # take the o's own bounding box and the counter's, via the second contour
        pass
    # counter (inner contour) bounds: decompose contours
    contours, cur = [], []
    for op, args in pen.value:
        if op == "moveTo":
            if cur:
                contours.append(cur)
            cur = [args[0]]
        elif op in ("lineTo", "curveTo", "qCurveTo"):
            cur.extend([a for a in args if isinstance(a, tuple)])
        elif op == "closePath":
            if cur:
                contours.append(cur)
            cur = []
    if cur:
        contours.append(cur)
    bounds = []
    for c in contours:
        bounds.append(
            (min(p[0] for p in c), min(p[1] for p in c),
             max(p[0] for p in c), max(p[1] for p in c))
        )
    bounds.sort(key=lambda b: (b[2] - b[0]) * (b[3] - b[1]), reverse=True)
    outer, inner = bounds[0], (bounds[1] if len(bounds) > 1 else bounds[0])
    hairline = outer[3] - inner[3]          # top of o minus top of counter
    stem_o = inner[0] - outer[0]            # left thick stroke of the o
    adv_o = hmtx[gname][0]
    lsb_o = hmtx[gname][1]

    gH = cmap[ord("H")]
    return dict(
        opsz=opsz,
        set_width=total,
        adv_H=hmtx[gH][0],
        lsb_H=hmtx[gH][1],
        adv_o=adv_o,
        lsb_o=lsb_o,
        hairline=hairline,
        stem_o=stem_o,
        contrast=(stem_o / hairline if hairline else 0),
    )


print("Bodoni Moda 2.005, wght 400, cap height 1500 units (upem 2000)")
print(
    "%-5s %10s %6s %6s %6s %6s %9s %8s %9s"
    % ("opsz", "'HelloKahwin'", "adv H", "lsb H", "adv o", "lsb o", "hairline", "o stem", "contrast")
)
rows = [measure(o) for o in (6, 8, 11, 14, 18, 24, 36, 48, 72, 96)]
for r in rows:
    print(
        "%-5d %10d %6d %6d %6d %6d %9d %8d %8.2f:1"
        % (r["opsz"], r["set_width"], r["adv_H"], r["lsb_H"], r["adv_o"], r["lsb_o"],
           r["hairline"], r["stem_o"], r["contrast"])
    )

a, b = rows[0], rows[-1]
print()
print(
    "opsz 6 -> 96 : set width %d -> %d (%+.1f%%), hairline %d -> %d (%+.1f%%), "
    "contrast %.2f -> %.2f"
    % (a["set_width"], b["set_width"],
       100.0 * (b["set_width"] - a["set_width"]) / a["set_width"],
       a["hairline"], b["hairline"],
       100.0 * (b["hairline"] - a["hairline"]) / a["hairline"],
       a["contrast"], b["contrast"])
)

print()
print("Hairline at the real rendered sizes, in device pixels:")
print("(hairline units / 2000 upem * font-size px, at cap height 1500 => the")
print(" mark's own height is 0.75 * em, so a mark H px tall is H/0.75 em)")
for label, mark_px, opsz in [
    ("wordmark, brand-page minimum", 18, 11),
    ("wordmark, likely header", 22, 11),
    ("article h1 mobile 30px", 30, 11),
    ("article h1 desktop 44px", 44, 11),
]:
    r = [x for x in rows if x["opsz"] == opsz][0]
    em_px = mark_px / 0.75
    px = r["hairline"] / 2000.0 * em_px
    print("  %-32s %5.2f px hairline" % (label + " @opsz %d" % opsz, px))
