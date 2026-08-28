"""What a sub-pixel hairline costs the mark, in contrast ratio.

A vector stroke narrower than one device pixel is not dropped; it is
antialiased, which is the same thing as compositing the ink over the ground at
alpha = stroke width in device pixels.  So the thin strokes of a didone
wordmark do not go missing at small sizes - they go GREY, while the stems stay
black.  That is measurable.

Palette from docs (decision 126 / brand-assets.ts):
  ink        #16130F
  parchment  #EDEAE1
  night      #14110D
"""
INK = (0x16, 0x13, 0x0F)
PARCHMENT = (0xED, 0xEA, 0xE1)
NIGHT = (0x14, 0x11, 0x0D)


def lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lum(rgb):
    r, g, b = (lin(v) for v in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def composite(fg, bg, alpha):
    return tuple(round(alpha * f + (1 - alpha) * b) for f, b in zip(fg, bg))


HAIRLINE_UNITS = {6: 72, 8: 58, 11: 38, 14: 30, 18: 24, 24: 17, 36: 8, 96: 4}
UPEM = 2000
CAP_RATIO = 0.75  # cap height 1500 / upem 2000


def hairline_px(opsz, mark_height_css_px, dpr):
    em_css = mark_height_css_px / CAP_RATIO
    return HAIRLINE_UNITS[opsz] / UPEM * em_css * dpr


print("ink #16130F on parchment #EDEAE1, full strength: %.2f:1" % ratio(INK, PARCHMENT))
print("ink #16130F on night   #14110D, full strength: %.2f:1" % ratio(INK, NIGHT))
print()
print("The horizontal lockup's thin strokes, as shipped (opsz 11):")
print("%-8s %-5s %-12s %-9s %-10s" % ("mark px", "DPR", "hairline dev px", "composite", "contrast"))
for h in (16, 18, 22, 28, 40):
    for dpr in (1, 2, 3):
        px = hairline_px(11, h, dpr)
        alpha = min(1.0, px)
        c = composite(INK, PARCHMENT, alpha)
        print(
            "%-8d %-5d %-12.2f #%02X%02X%02X   %6.2f:1  %s"
            % (h, dpr, px, c[0], c[1], c[2], ratio(c, PARCHMENT),
               "" if ratio(c, PARCHMENT) >= 3.0 else "<-- under 3:1")
        )
print()
print("Same mark heights, re-cut at opsz 6 (the axis minimum):")
print("%-8s %-5s %-12s %-9s %-10s" % ("mark px", "DPR", "hairline dev px", "composite", "contrast"))
for h in (16, 18, 22, 28, 40):
    for dpr in (1, 2, 3):
        px = hairline_px(6, h, dpr)
        alpha = min(1.0, px)
        c = composite(INK, PARCHMENT, alpha)
        print(
            "%-8d %-5d %-12.2f #%02X%02X%02X   %6.2f:1  %s"
            % (h, dpr, px, c[0], c[1], c[2], ratio(c, PARCHMENT),
               "" if ratio(c, PARCHMENT) >= 3.0 else "<-- under 3:1")
        )

print()
print("Smallest mark height at which the opsz 11 hairline reaches 1 device px:")
for dpr in (1, 2, 3):
    h = 1.0 / (HAIRLINE_UNITS[11] / UPEM / CAP_RATIO * dpr)
    print("  DPR %d : %.1f px tall  (lockup width at 10:1 = %.0f px)" % (dpr, h, h * 10))
print("Same, re-cut at opsz 6:")
for dpr in (1, 2, 3):
    h = 1.0 / (HAIRLINE_UNITS[6] / UPEM / CAP_RATIO * dpr)
    print("  DPR %d : %.1f px tall  (lockup width at 10:1 = %.0f px)" % (dpr, h, h * 10))

print()
print("Article <h1> hairline at the DES-01 type scale, opsz 11 (live text, not the mark):")
for label, size in (("mobile 30px", 30), ("desktop 44px", 44)):
    for dpr in (1, 2, 3):
        px = HAIRLINE_UNITS[11] / UPEM * size * dpr
        alpha = min(1.0, px)
        c = composite(INK, PARCHMENT, alpha)
        print(
            "  %-12s DPR %d : %.2f dev px, composite #%02X%02X%02X, %.2f:1"
            % (label, dpr, px, c[0], c[1], c[2], ratio(c, PARCHMENT))
        )
