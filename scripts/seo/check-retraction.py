#!/usr/bin/env python3
"""Retraction gate - prove a corrected claim is gone from the WHOLE live page.

    python scripts/seo/check-retraction.py <url|file> \\
        --gone "the retracted phrase" [--gone ...] \\
        --present "a phrase that must be there" [--present ...]
    python scripts/seo/check-retraction.py --selftest

EXIT CODES.  `RETRACTION EXIT: n` is printed at the start of a line.

    0  PASS       every --gone phrase absent everywhere, every --present found
    1  FAIL       a retracted phrase SURVIVES somewhere on the page
    2  MISSING    a --present phrase is not on the page
    3  UNUSABLE   no --present control given, or the control itself is absent,
                  so the absences this run reports are worth nothing
    4  usage or runtime error

WHY THIS EXISTS
  CONT-13, 1 Sept 2026.  `editorial-verification-lead` required three sentences
  removed from a live article.  The republish removed all three from the BODY and
  left a FOURTH standing in an image CAPTION, which lives in front matter rather
  than in body prose and therefore survives every body-text check.  It was found
  only because the lead re-fetched the page and grepped for the RETRACTED phrase
  instead of for the corrected paragraph.

  Two mechanical lessons, and this script is both of them:

  1. CHECK THE WHOLE DOCUMENT, and say WHERE a survivor is.  Body prose, image
     captions and JSON-LD update through different paths.  A retracted claim
     sitting in `FAQPage` structured data can still be surfaced by Google as our
     answer even after the visible text is fixed.
  2. GREP FOR WHAT SHOULD BE GONE, not for what should be there.  Finding the
     corrected paragraph proves the correction landed.  It does not prove the old
     one left.

WHY IT REFUSES TO RUN WITHOUT A --present CONTROL
  The company has twelve tabulated instances of a check returning a zero that
  meant nothing.  An absence is only evidence if the same matcher, on the same
  document, found something.  So this gate will not report "gone" until it has
  confirmed "here" - exit 3 rather than a comforting 0.
"""

import argparse
import io
import json
import re
import sys
import urllib.request

PASS, FAIL, MISSING, UNUSABLE, ERROR = 0, 1, 2, 3, 4
UA = "HelloKahwin-retraction/1.0 (editorial post-correction check)"


def load(target):
    if target.startswith("http://") or target.startswith("https://"):
        req = urllib.request.Request(target, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read().decode("utf-8", "replace")
    return io.open(target, encoding="utf-8", errors="replace").read()


def zones(html):
    """The page split into the three surfaces that update independently.

    `all` is the authority for presence/absence; the other three exist so a
    survivor is LOCATED rather than merely detected, because "it is somewhere in
    122 KB" is not an actionable finding.
    """
    captions = " ".join(
        re.findall(r"<figcaption[^>]*>(.*?)</figcaption>", html, re.S)
        + re.findall(r'data-caption="([^"]*)"', html)
    )
    ld = " ".join(re.findall(
        r'<script[^>]*type="application/ld\+json"[^>]*>([\s\S]*?)</script>', html))
    body = re.sub(r"<[^>]+>", " ", re.sub(
        r"<script[\s\S]*?</script>", " ", html))
    return {"body text": body, "image captions": captions,
            "JSON-LD": ld, "all": html}


def count(hay, needle):
    return hay.lower().count(needle.lower())


def run(target, gone, present, verbose=True):
    html = load(target)
    z = zones(html)
    if verbose:
        print("page: %s  (%d bytes)" % (target, len(html)))

    # ---- the control comes FIRST. No control, no verdict.
    if not present:
        print("\nNo --present control given. An absence proves nothing without one.")
        return UNUSABLE
    missing = []
    if verbose:
        print("\ncontrol - phrases that MUST be present:")
    for p in present:
        n = count(z["all"], p)
        if verbose:
            print("  %-4s x%-4d %s" % ("ok" if n else "MISS", n, p[:70]))
        if not n:
            missing.append(p)
    if len(missing) == len(present):
        print("\nEvery control phrase is absent. The matcher, the page or the")
        print("phrasing is wrong - not the article. Fix the check first.")
        return UNUSABLE

    # ---- now the absences are worth something
    survivors = []
    if verbose:
        print("\nretracted - phrases that must be GONE from the whole page:")
    for g in gone:
        n = count(z["all"], g)
        if n:
            where = [k for k in ("body text", "image captions", "JSON-LD")
                     if count(z[k], g)]
            survivors.append((g, n, where))
            if verbose:
                print("  SURVIVES x%-3d %s" % (n, g[:70]))
                print("               found in: %s"
                      % (", ".join(where) if where else
                         "the raw HTML but not in body, captions or JSON-LD "
                         "- check front matter and attributes"))
        elif verbose:
            print("  gone         %s" % g[:70])

    if survivors:
        return FAIL
    if missing:
        return MISSING
    return PASS


def selftest():
    """Run against the real before and after, if they are on disk; otherwise
    against synthetic fixtures that reproduce the caption case exactly."""
    ok = True
    before = (
        '<html><body><p>Tiada mana-mana pihak berkuasa menerbitkan teks rasmi.</p>'
        '<figure><img src="x.jpg">'
        '<figcaption>Di rumah, yang dibaca ialah doa umum, dan itu memadai.'
        '</figcaption></figure>'
        '<script type="application/ld+json">{"@type":"FAQPage"}</script>'
        '</body></html>')
    after = before.replace(
        "Di rumah, yang dibaca ialah doa umum, dan itu memadai.",
        "Untuk kenduri di rumah, tiada pihak berkuasa yang menerbitkan teks rasmi khusus.")

    import tempfile, os
    d = tempfile.mkdtemp()
    fb, fa = os.path.join(d, "before.html"), os.path.join(d, "after.html")
    io.open(fb, "w", encoding="utf-8").write(before)
    io.open(fa, "w", encoding="utf-8").write(after)

    print("THE FAILING CASE - body fixed, caption still carrying the claim:")
    r = run(fb, ["yang dibaca ialah doa umum", "itu memadai"],
            ["Tiada mana-mana pihak berkuasa"], verbose=False)
    print("  exit %d %s" % (r, "(FAIL, correct)" if r == FAIL else "(WRONG)"))
    ok &= (r == FAIL)

    print("\nAFTER the caption is fixed:")
    r = run(fa, ["yang dibaca ialah doa umum", "itu memadai"],
            ["Tiada mana-mana pihak berkuasa"], verbose=False)
    print("  exit %d %s" % (r, "(PASS, correct)" if r == PASS else "(WRONG)"))
    ok &= (r == PASS)

    print("\nNO CONTROL - the gate must refuse rather than return a hollow pass:")
    r = run(fa, ["yang dibaca ialah doa umum"], [], verbose=False)
    print("  exit %d %s" % (r, "(UNUSABLE, correct)" if r == UNUSABLE else "(WRONG)"))
    ok &= (r == UNUSABLE)

    print("\nBROKEN CONTROL - a control that is itself absent must not be trusted:")
    r = run(fa, ["yang dibaca ialah doa umum"], ["a phrase that is not there"],
            verbose=False)
    print("  exit %d %s" % (r, "(UNUSABLE, correct)" if r == UNUSABLE else "(WRONG)"))
    ok &= (r == UNUSABLE)

    return PASS if ok else FAIL


def main():
    ap = argparse.ArgumentParser(add_help=True)
    ap.add_argument("target", nargs="?", help="live URL or saved HTML file")
    ap.add_argument("--gone", action="append", default=[])
    ap.add_argument("--present", action="append", default=[])
    ap.add_argument("--selftest", action="store_true")
    args = ap.parse_args()

    if args.selftest:
        code = selftest()
    elif not args.target or not args.gone:
        ap.print_help()
        code = ERROR
    else:
        code = run(args.target, args.gone, args.present)

    print("\n%s" % {PASS: "PASS", FAIL: "FAIL", MISSING: "MISSING",
                    UNUSABLE: "UNUSABLE", ERROR: "ERROR"}[code])
    print("RETRACTION EXIT: %d" % code)
    return code


if __name__ == "__main__":
    sys.exit(main())
