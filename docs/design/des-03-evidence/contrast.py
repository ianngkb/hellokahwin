#!/usr/bin/env python3
"""DES-03 - every contrast ratio quoted in des-03-spesifikasi.html, computed.

WCAG 2.x relative luminance (WCAG 2.2 SC 1.4.3 / SC 1.4.11) and the
(L1+0.05)/(L2+0.05) ratio. Alpha tints are composited onto their own ground with
straight source-over before the ratio is taken, because that is what a reader's
eye actually receives.

Run: python contrast.py
"""


def srgb_to_lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def lum(h):
    r, g, b = hexrgb(h)
    return 0.2126 * srgb_to_lin(r) + 0.7152 * srgb_to_lin(g) + 0.0722 * srgb_to_lin(b)


def ratio(fg, bg):
    a, b = lum(fg), lum(bg)
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)


def over(fg, bg, alpha):
    """source-over composite of fg at `alpha` onto opaque bg -> hex"""
    f, b = hexrgb(fg), hexrgb(bg)
    out = tuple(round(f[i] * alpha + b[i] * (1 - alpha)) for i in range(3))
    return "#%02X%02X%02X" % out


# ---------------------------------------------------------------- primitives
P = {
    "parchment-100": "#EDEAE1",   # light ground
    "parchment-200": "#E3DFD4",   # light raised
    "parchment-300": "#C9C3B6",   # dark muted text
    "parchment-400": "#A89C88",   # dark dim text
    "ink-900":       "#16130F",
    "ink-600":       "#4A443C",
    "ink-500":       "#5A5348",
    "gold-700":      "#725825",
    "gold-400":      "#C9A253",
    "oxblood-700":   "#6B2130",
    "oxblood-300":   "#D98C7A",
    "night-900":     "#14110D",   # dark ground
    "night-800":     "#1E1A15",   # dark raised
    "thread-500":    "#A8823C",   # decorative hairline ONLY - never text, never a boundary
}

LIGHT_BG, LIGHT_RAISED = P["parchment-100"], P["parchment-200"]
DARK_BG, DARK_RAISED = P["night-900"], P["night-800"]


def row(label, fg, bg, floor, note=""):
    r = ratio(fg, bg)
    need = {"text": 4.5, "large": 3.0, "nontext": 3.0, "none": 0.0}[floor]
    if floor == "text":
        verdict = "AAA" if r >= 7 else ("AA" if r >= 4.5 else "FAIL")
    elif floor in ("large", "nontext"):
        verdict = "PASS" if r >= 3.0 else "FAIL"
    else:
        verdict = "n/a"
    print("  %-52s %s on %s  %6.2f:1  %-4s %s" % (label, fg, bg, r, verdict, note))
    return r


print("DES-03 measured contrast - WCAG 2.x relative luminance")
print("=" * 118)

print("\nLIGHT - text on ground #EDEAE1 (parchment-100)")
row("body, headings           ink-900", P["ink-900"], LIGHT_BG, "text")
row("deck, caption, credit    ink-600", P["ink-600"], LIGHT_BG, "text")
row("meta, timestamp          ink-500", P["ink-500"], LIGHT_BG, "text", "<- floor for small text")
row("label, eyebrow, link     gold-700", P["gold-700"], LIGHT_BG, "text", "13px labels ride on this")
row("alert text               oxblood-700", P["oxblood-700"], LIGHT_BG, "text")

print("\nLIGHT - text on raised #E3DFD4 (parchment-200)")
row("body on raised           ink-900", P["ink-900"], LIGHT_RAISED, "text")
row("deck on raised           ink-600", P["ink-600"], LIGHT_RAISED, "text")
row("label on raised          gold-700", P["gold-700"], LIGHT_RAISED, "text")

print("\nDARK - text on ground #14110D (night-900)")
row("body, headings           parchment-100", P["parchment-100"], DARK_BG, "text")
row("deck, caption, credit    parchment-300", P["parchment-300"], DARK_BG, "text")
row("meta, timestamp          parchment-400", P["parchment-400"], DARK_BG, "text", "<- floor for small text")
row("label, eyebrow, link     gold-400", P["gold-400"], DARK_BG, "text")
row("alert text               oxblood-300", P["oxblood-300"], DARK_BG, "text")

print("\nDARK - text on raised #1E1A15 (night-800)")
row("body on raised           parchment-100", P["parchment-100"], DARK_RAISED, "text")
row("deck on raised           parchment-300", P["parchment-300"], DARK_RAISED, "text")
row("label on raised          gold-400", P["gold-400"], DARK_RAISED, "text")

# --------------------------------------------------- alpha tints (ONE COLOUR RULE)
print("\nTINTS - every rule, stripe and boundary is an alpha of the ink/parchment, so a page")
print("still renders in exactly four hex values. Composited first, then measured.")
for label, a, floor in [
    ("table stripe            ink @  5%", 0.05, "none"),
    ("field separator (hair)  ink @ 12%", 0.12, "none"),
    ("section rule            ink @ 22%", 0.22, "none"),
    ("CONTROL BOUNDARY        ink @ 47%", 0.47, "nontext"),
]:
    c = over(P["ink-900"], LIGHT_BG, a)
    row("light  %s -> %s" % (label, c), c, LIGHT_BG, floor)

for label, a, floor in [
    ("table stripe            parchment @  5%", 0.05, "none"),
    ("field separator (hair)  parchment @ 11%", 0.11, "none"),
    ("section rule            parchment @ 20%", 0.20, "none"),
    ("CONTROL BOUNDARY        parchment @ 37%", 0.37, "nontext"),
]:
    c = over(P["parchment-100"], DARK_BG, a)
    row("dark   %s -> %s" % (label, c), c, DARK_BG, floor)

print("\nDISQUALIFIED and SHIPPED-DEFECT values, measured so nobody re-proposes them")
row("thread-500 as a control boundary", P["thread-500"], LIGHT_BG, "nontext",
    "FAILS 1.4.11 - decorative hairline only")
row("thread-500 as text", P["thread-500"], LIGHT_BG, "text", "FAILS - never text")

# The shipped values, read out of the served stylesheet
# https://hellokahwin.com/_next/static/chunks/655cb3c3fa9beb33.css on 28 Ogos 2026:
#   --ring:#22122d  --background:#fcfaf7  --border:#dbd7d0  --border-strong:#898581
SHIP_RING, SHIP_BG = "#22122D", "#FCFAF7"
shipped_ring = over(SHIP_RING, SHIP_BG, 0.30)     # focus:ring-ring/30 as shipped
row("SHIPPED focus ring ring/30 -> %s" % shipped_ring, shipped_ring, SHIP_BG, "nontext",
    "the live defect DES-06/DES-07 found")
row("SHIPPED --border #DBD7D0 on --background", "#DBD7D0", SHIP_BG, "nontext",
    "shipped default border also under the floor")
row("SHIPPED --border-strong #898581 on parchment", "#898581", LIGHT_BG, "nontext",
    "the one shipped token that clears it")
row("SPEC focus ring  ink-900 @ 100%", P["ink-900"], LIGHT_BG, "nontext", "the fix, light")
row("SPEC focus ring  parchment @ 100%", P["parchment-100"], DARK_BG, "nontext", "the fix, dark")
row("ink on PURE WHITE (rejected)", P["ink-900"], "#FFFFFF", "text",
    "harsher than 15.39 for no gain")

print("\nTHE SPECIFICATION DOCUMENT'S OWN CHROME - deliberately cooler and greyer than")
print("the site palette, so a reader never mistakes spec furniture for site colour.")
DOC_L = {"bg": "#EFEEEC", "panel": "#E4E3E0", "fg": "#1B1B1A", "fg2": "#55554F",
         "accent": "#2F3A4A", "rule": "#CFCEC9"}
DOC_D = {"bg": "#17181A", "panel": "#202225", "fg": "#E8E8E6", "fg2": "#A3A39D",
         "accent": "#9FB4D4", "rule": "#33353A"}
for theme, D in (("light", DOC_L), ("dark", DOC_D)):
    for role in ("fg", "fg2", "accent"):
        row("doc %-5s %-8s on ground" % (theme, role), D[role], D["bg"], "text")
    for role in ("fg", "fg2", "accent"):
        row("doc %-5s %-8s on panel" % (theme, role), D[role], D["panel"], "text")
    row("doc %-5s rule on ground" % theme, D["rule"], D["bg"], "none")

print("\nFLOORS: normal text 4.5:1 (SC 1.4.3) - large text >=24px, or >=18.66px bold, 3:1")
print("        non-text UI boundary and focus indicator 3:1 (SC 1.4.11)")
print("        Nothing in this specification ships below 3.00:1 for a boundary")
print("        or 4.50:1 for text.")
