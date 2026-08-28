#!/usr/bin/env python3
"""DES-03 - the fluid type scale, emitted as exact clamp() declarations and
then evaluated back at every specified breakpoint so the printed numbers and
the printed CSS cannot drift apart.

The scale anchors are DES-01 section (e), which fixed a size at 360 px and a
size at 1024 px for every role. Everything between is linear in the viewport,
which is the whole reason the scale is fluid: the live site solves responsive
type by shipping the same <h1> twice, one per breakpoint, and this is what
removes the reason to.

Run: python typescale.py
"""

V_MIN, V_MAX = 360.0, 1024.0     # the viewport range the interpolation spans
ROOT = 16.0                      # px per rem


def clamp_for(px_min, px_max):
    """Return (css, slope_vw, intercept_rem) for a linear px_min@V_MIN -> px_max@V_MAX."""
    slope = (px_max - px_min) / (V_MAX - V_MIN)          # px of size per px of viewport
    intercept = px_min - slope * V_MIN                    # px at viewport 0
    css = "clamp(%.4frem, %.4frem + %.4fvw, %.4frem)" % (
        px_min / ROOT, intercept / ROOT, slope * 100, px_max / ROOT)
    return css, slope, intercept


def at(vw, px_min, px_max):
    """Evaluate the clamp at a given viewport width."""
    _, slope, intercept = clamp_for(px_min, px_max)
    return min(max(px_min, intercept + slope * vw), px_max)


ROLES = [
    # role,            360px, 1024px, line-height,        measure cap
    ("wordmark",          18,   24, "1.00",              "-"),
    ("h1 / display",      30,   44, "1.08",              "22-30ch"),
    ("h2",                22,   26, "1.25",              "34ch"),
    ("h3",                19,   21, "1.30",              "40ch"),
    ("deck",              18,   20, "1.50",              "60ch"),
    ("body",              17,   18, "1.65 -> 1.70",      "68ch"),
    ("table / figure",    16,   16, "1.45",              "-"),
    ("caption / credit",  14,   14, "1.45",              "60ch"),
    ("label / eyebrow",   13,   13, "1.20",              "-"),
]

BPS = [360, 390, 768, 1024, 1200, 1440]

print("DES-03 fluid type scale - anchors from DES-01 (e), interpolated 360px -> 1024px")
print("=" * 116)
print("\nCSS, as the Design Systems Engineer should paste it")
print("-" * 116)
for role, lo, hi, lh, measure in ROLES:
    css, _, _ = clamp_for(lo, hi)
    token = "--t-" + role.split("/")[0].strip().replace(" ", "-")
    if lo == hi:
        print("  %-20s %-62s  /* fixed %dpx */" % (token + ":", "%.4frem;" % (lo / ROOT), lo))
    else:
        print("  %-20s %s;" % (token + ":", css))

print("\nEvaluated back at every breakpoint - px, rounded to 2dp")
print("-" * 116)
print("  %-20s %s   lh %-14s measure" % ("role", "".join("%9d" % b for b in BPS), ""))
for role, lo, hi, lh, measure in ROLES:
    vals = "".join("%9.2f" % at(b, lo, hi) for b in BPS)
    print("  %-20s %s   %-17s %s" % (role, vals, lh, measure))

print("\nWhy fluid, in one number")
print("-" * 116)
print("  The live article ships TWO <h1> elements with identical text - text-[1.75rem]")
print("  and text-[2.5rem] - one hidden per breakpoint. Verified in the delivered HTML")
print("  of /artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri on 28 Ogos 2026: h1 count = 2.")
print("  A single clamp() covers 28.00px -> 40.00px across the same range with one node.")

print("\nMeasure, in px, at the container widths this spec defines")
print("-" * 116)
# 0.5em average advance is the conventional estimate for a system sans; it is an
# estimate because the face is whatever the reader's OS supplies, and the spec
# says so rather than pretending otherwise.
CONTAINERS = [
    ("360px phone,  16px gutters",  328, 360),
    ("390px phone,  20px gutters",  350, 390),
    ("768px tablet, 32px gutters",  704, 768),
    ("1024px desk,  40px gutters + 300px record rail + 48px gap",  596, 1024),
    ("1200px desk,  40px gutters + 300px record rail + 64px gap",  756, 1200),
    ("1440px desk,  container caps at 1200",                       756, 1440),
]
for name, content_px, vw in CONTAINERS:
    body_px = at(vw, 17, 18)
    ch_est = content_px / (body_px * 0.5)
    capped = min(ch_est, 68)
    print("  %-58s body %5.2fpx  column %4dpx  = ~%5.1fch  -> renders at %.0fch"
          % (name, body_px, content_px, ch_est, capped))
print("\n  0.5em average advance is an ESTIMATE - the body face is the system stack, so the")
print("  advance is whatever the reader's OS supplies. The container widths are exact.")
print("  The 68ch cap is what makes the estimate safe: above 1024px the cap binds, not the column.")
print("\n  328px at 360px viewport is not a taste number: DES-07 measured all 86 live titles")
print("  in that box and 86 of 86 fit in three lines with nothing clamped. At the shipped")
print("  156px two-column box, 57 of 86 are cut.")
