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


# --------------------------------------------------------------------------
# CROSS-REFERENCE GATE. Added by DES-17, 01 September 2026.
#
# WHY THIS EXISTS. §5.3 shipped the sentence "the diversity rule — see H6 in
# §7". No rule H6 existed. It survived a full sprint, a two-way cross-check
# against DES-07, and a spec-versus-build audit, because a cross-reference
# written as prose is invisible to every check anyone was running. Sprint 04's
# finding, restated: the parts of DES-03 written as enforceable constraints
# shipped and the parts written as prose did not. A retrospective that names
# that lesson and changes nothing is the same failure one level up, so the
# lesson is a gate: THE DOCUMENT CANNOT BE REBUILT WITH A CROSS-REFERENCE THAT
# DOES NOT RESOLVE.
#
# Two checks, because either alone is defeatable:
#   1. Every href="#x" has a matching id="x". Catches a link to a target that
#      was renamed or never written.
#   2. No bare prose cross-reference. "see H6 in §7" must be a link. Check 1
#      cannot see a reference that is not a link, which is exactly how the
#      original defect hid.
#
# Base64 image payload is stripped before scanning. A bare \bH6\b matches the
# embedded WebP data three times, and that false positive is half the reason
# nobody noticed the reference was dangling.
# --------------------------------------------------------------------------
BARE_REF = re.compile(r"\bsee\s+([A-Z]\d[a-z]?)\b", re.I)


def check_cross_references(html):
    prose = re.sub(r'src="data:[^"]*"', 'src="data:"', html)

    ids = set(re.findall(r'\bid="([^"]+)"', prose))
    refs = sorted({r for r in re.findall(r'href="#([^"]+)"', prose)})
    dangling = [r for r in refs if r not in ids]
    if dangling:
        raise SystemExit(
            "DANGLING ANCHOR: href points at an id that does not exist: %s\n"
            "  Define the target, or fix the reference. Do not ship the link."
            % dangling)

    bare = []
    for m in BARE_REF.finditer(prose):
        window = prose[max(0, m.start() - 80):m.start()]
        if '<a href="#' not in window:
            line = prose.count("\n", 0, m.start()) + 1
            bare.append("line %d: %s" % (line, prose[m.start():m.start() + 60]
                                         .replace("\n", " ")))
    if bare:
        raise SystemExit(
            "BARE CROSS-REFERENCE: a rule or state id is named in prose without "
            "a link to it.\n  This is the DES-17 defect verbatim. Wrap it in "
            '<a href="#id">, so the anchor check above can prove the target '
            "exists:\n    %s" % "\n    ".join(bare))

    print("cross-references: %d internal links, all resolve; "
          "%d anchors defined; no bare id references" % (len(refs), len(ids)))


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

    check_cross_references(html)

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
