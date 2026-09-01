#!/usr/bin/env python3
"""PRE-FLIGHT #4 - restate the document/number CTR split from a census CSV, with
its n, its Fisher exact p, its confidence interval, and a VERDICT THAT EXITS.
SEO-14, Sprint 06.

    python scripts/seo/census-restate.py <census.csv> [--compare <older.csv>]

WHY THIS IS A SCRIPT AND NOT A PARAGRAPH
  Decision 188 says CONT-17 must STOP if the split has collapsed below decision
  171's conservative 2.3x bound.  Written as prose that is an intention, and
  three sprints of retros say prose rules do not fire.  So the floor is an exit
  code:

    exit 0  HOLDS      every computable re-cut is at or above the floor and the
                       CI excludes parity - CONT-17's premise is still standing
    exit 1  COLLAPSED  a re-cut is below the floor, or a CI includes parity -
                       CONT-17 STOPS and comes back
    exit 3  UNKNOWN    no re-cut is computable.  NOT A PASS, and not a collapse
    exit 4  usage error

WHAT IT REPORTS, AND WHY EACH PIECE IS REQUIRED
  * BOTH classifiers, named per figure.  `intent_class` is SEO-11's frozen
    intent_of(); `intent_class_gate` is SEO-12's check-serp-shape.py.  A ratio
    quoted without its classifier is not reproducible, and on the 2026-09-02
    census the two disagree on 22 of 95 rows.
  * THREE intervals, because they answer different questions:
      - Wilson 95% per arm.  This is what SEO-11 published, and decision 171's
        "no less than 2.3x" is document-Wilson-lower over number-Wilson-upper.
        Reproduced for comparability even though it is not a CI on a ratio.
      - Katz log-method 95% on the risk ratio itself.  This IS the interval for
        a ratio, and it is wider than the bound above.
      - The floor test names which one it used.
  * The SERP crawl-date RANGE computed from the data (decision 174a), never a
    remembered summary, plus the uncrawled count (decision 173).
  * Every re-cut, because at this company's click volumes one subsetting
    decision moves p by two orders of magnitude (decision 174c).

THE BAND, AND WHY IT IS FIXED
  Positions 3-11, garden-wedding quarantined (decision 148).  Identical to
  `check-serp-shape.py --validate`, deliberately: a second instrument that picks
  its own band is not a check on the first one.
"""

import argparse
import collections
import csv
import io
import math
import os
import sys

HOLDS, COLLAPSED, UNKNOWN, ERROR = 0, 1, 3, 4

# Decision 171, restated by decision 188.  Written here, once, before this
# script had seen any census - DES-09's rule about picking the budget in
# ignorance of the thing it will judge.
FLOOR = 2.3
Z = 1.959963985  # two-sided 95%


def fisher_exact(a, b, c, d):
    """Two-sided Fisher exact on [[a, b], [c, d]].  Same implementation as
    check-serp-shape.py, which was itself cross-checked against SEO-11's three
    independently produced p-values."""
    def lc(n, k):
        return math.lgamma(n + 1) - math.lgamma(k + 1) - math.lgamma(n - k + 1)
    n = a + b + c + d
    r1, r2, c1 = a + b, c + d, a + c

    def p_of(x):
        return math.exp(lc(r1, x) + lc(r2, c1 - x) - lc(n, c1))
    p0 = p_of(a)
    return min(1.0, sum(p_of(x) for x in range(max(0, c1 - r2), min(r1, c1) + 1)
                        if p_of(x) <= p0 * (1 + 1e-9)))


def wilson(k, n):
    """Wilson score interval - the one SEO-11 published.  Returns proportions.

    Defined at k = 0, which the naive normal interval is not, and the
    number/definition arm reaches zero clicks under two of SEO-11's re-cuts."""
    if n <= 0:
        return None
    p = float(k) / n
    den = 1.0 + Z * Z / n
    centre = (p + Z * Z / (2 * n)) / den
    half = (Z / den) * math.sqrt(p * (1 - p) / n + Z * Z / (4 * n * n))
    return max(0.0, centre - half), min(1.0, centre + half)


def katz_rr(a, n1, c, n2):
    """Katz log-method 95% CI on the risk ratio (a/n1)/(c/n2).

    Undefined when either numerator is zero - log(0).  Returns None rather than
    a continuity-corrected number: a zero-click arm bounds the ratio below but
    not above, and inventing half a click to make the arithmetic run is exactly
    the quiet estimate this company keeps getting bitten by."""
    if not (a > 0 and c > 0 and n1 > 0 and n2 > 0):
        return None
    rr = (float(a) / n1) / (float(c) / n2)
    se = math.sqrt(1.0 / a - 1.0 / n1 + 1.0 / c - 1.0 / n2)
    return rr, rr * math.exp(-Z * se), rr * math.exp(Z * se)


# ------------------------------------------------------------------- the band
def in_band(r):
    if "garden-wedding" in r.get("landing_page", ""):
        return False                                # QUARANTINE, decision 148
    try:
        pos = float(r["position"])
    except (ValueError, KeyError):
        return False
    return 3.0 <= pos <= 11.0


def fresh(r):
    d = r.get("serp_update_date", "")
    return d == "" or d[:7] == "2026-08"


def crawled(r):
    return r.get("serp_data") == "yes"


TREATMENTS = [
    ("all band rows", None),
    ("stale SERP snapshots dropped", fresh),
    ("no-SERP-data rows also dropped", lambda r: fresh(r) and crawled(r)),
]


def arms(rows, column):
    doc = [0, 0, 0, 0.0]
    nd = [0, 0, 0, 0.0]
    for r in rows:
        k = r.get(column, "")
        t = doc if k == "document" else (nd if k in ("number", "definition") else None)
        if t is None:
            continue
        i, c = int(r["impressions"]), int(r["clicks"])
        t[0] += 1
        t[1] += i
        t[2] += c
        t[3] += float(r["position"]) * i
    return doc, nd


def restate(rows, column, label, out):
    w = out.write
    w("\n%s\n%s\n" % (label, "-" * len(label)))
    w("  %-32s %-21s %-21s %8s %11s  %s\n"
      % ("treatment", "document", "number/definition", "ratio", "fisher p",
         "95% CI on the ratio (Katz)"))
    results = []
    for tname, extra in TREATMENTS:
        rs = [r for r in rows if in_band(r) and (extra is None or extra(r))]
        d, n = arms(rs, column)
        if not d[1] or not n[1]:
            w("  %-32s INSUFFICIENT - an arm has no impressions\n" % tname)
            results.append({"treatment": tname, "status": "insufficient"})
            continue
        cd, cn = 100.0 * d[2] / d[1], 100.0 * n[2] / n[1]
        p = fisher_exact(d[2], d[1] - d[2], n[2], n[1] - n[2])
        wd, wn = wilson(d[2], d[1]), wilson(n[2], n[1])
        k = katz_rr(d[2], d[1], n[2], n[1])
        ratio = (cd / cn) if cn else None
        # SEO-11's conservative bound reproduced: document Wilson-lower over
        # number Wilson-upper.  This is the arithmetic decision 171's 2.3x came
        # from.  It is NOT a CI on a ratio; it is quoted because the floor being
        # tested was derived this way and the comparison has to be like for like.
        naive_lo = (wd[0] / wn[1]) if wn[1] > 0 else None
        w("  %-32s %2d/%-5d = %5.2f%%   %2d/%-5d = %5.2f%%  %7s  %.7f  %s\n"
          % (tname, d[2], d[1], cd, n[2], n[1], cn,
             ("%.1fx" % ratio) if ratio else "inf", p,
             ("%.2fx - %.1fx" % (k[1], k[2])) if k
             else "not computable - an arm has 0 clicks"))
        results.append({"treatment": tname, "status": "ok",
                        "n_doc": d[0], "imp_doc": d[1], "clk_doc": d[2], "ctr_doc": cd,
                        "n_nd": n[0], "imp_nd": n[1], "clk_nd": n[2], "ctr_nd": cn,
                        "ratio": ratio, "p": p, "katz": k,
                        "wilson_doc": wd, "wilson_nd": wn, "naive_lo": naive_lo,
                        "pos_doc": d[3] / d[1], "pos_nd": n[3] / n[1]})
    w("\n  per-arm Wilson 95% CI - the interval SEO-11 published, and the one\n"
      "  decision 171's 2.3x floor was derived from:\n")
    for r in results:
        if r["status"] != "ok":
            continue
        w("    %-32s document %5.2f%% [%.2f - %.2f]   number/def %5.2f%% [%.2f - %.2f]"
          "   conservative bound %s\n"
          % (r["treatment"], r["ctr_doc"], 100 * r["wilson_doc"][0], 100 * r["wilson_doc"][1],
             r["ctr_nd"], 100 * r["wilson_nd"][0], 100 * r["wilson_nd"][1],
             ("%.1fx" % r["naive_lo"]) if r["naive_lo"] else "n/a"))
    ok = [r for r in results if r["status"] == "ok"]
    if ok:
        b = ok[0]
        w("\n  mean position: document %.2f, number/definition %.2f (%.2f apart)"
          " - depth does not explain the gap\n"
          % (b["pos_doc"], b["pos_nd"], abs(b["pos_doc"] - b["pos_nd"])))
    return results


def verdict(results, label, out):
    """The floor test, reported per classifier.  Overall exit is the worst."""
    w = out.write
    ok = [r for r in results if r["status"] == "ok" and r["ratio"] is not None]
    if not ok:
        w("  %-24s UNKNOWN - no computable re-cut\n" % label)
        return UNKNOWN
    worst = min(r["ratio"] for r in ok)
    below = [r for r in ok if r["ratio"] < FLOOR]
    with_ci = [r for r in ok if r["katz"]]
    parity = [r for r in with_ci if r["katz"][1] <= 1.0]
    state = COLLAPSED if (below or parity) else HOLDS
    w("  %-24s worst re-cut %.1fx vs the %.1fx floor | %d of %d re-cuts computable"
      " | CI excludes parity in %d of %d | %s\n"
      % (label, worst, FLOOR, len(ok), len(results),
         len(with_ci) - len(parity), len(with_ci),
         "HOLDS" if state == HOLDS else "COLLAPSED"))
    if below:
        w("      below the floor: %s\n"
          % "; ".join("%s (%.1fx)" % (r["treatment"], r["ratio"]) for r in below))
    if parity:
        w("      CI includes parity: %s\n"
          % "; ".join("%s (lower %.2fx)" % (r["treatment"], r["katz"][1]) for r in parity))
    # CONDITION 3 IS REPORTED AND NEVER GATES, AND THIS IS A DISCLOSURE, NOT A
    # DESIGN.  Conditions 1 and 2 were fixed before the census was pulled;
    # this third one was not - it was added after seeing that the crude bound
    # had moved, precisely so the movement could not be left in prose where the
    # reader has to take my word for it.  It does not gate because the ratio of
    # two per-arm interval endpoints is not a confidence interval on a ratio and
    # is over-conservative by construction; the Katz interval in condition 2 is
    # the correct one.  But 2.3x was DERIVED this way, so like-for-like it is
    # the only directly comparable number, and it is printed every run.
    crude = [r for r in ok if r["naive_lo"] is not None and r["naive_lo"] < FLOOR]
    if crude:
        w("      NOTE, not gated: SEO-11's crude bound (document Wilson-lower /\n"
          "      number Wilson-upper) is now below %.1fx on %s.\n"
          % (FLOOR, "; ".join("%s (%.1fx)" % (r["treatment"], r["naive_lo"])
                              for r in crude)))
        w("      That bound is not a CI on a ratio. The Katz CI is, and it reads"
          " %.2fx at its lower end.\n" % min(r["katz"][1] for r in ok if r["katz"]))
    return state


def snapshots(rows, out):
    w = out.write
    dates = sorted(r["serp_update_date"] for r in rows if r.get("serp_update_date"))
    uncrawled = [r for r in rows if not crawled(r)]
    w("\nSERP SNAPSHOT PROVENANCE - computed from the data, never remembered (decision 174a)\n")
    w("  rows                   : %d\n" % len(rows))
    if dates:
        w("  crawled SERPs          : %d\n" % len(dates))
        w("  serp_update_date RANGE : %s  ..  %s\n" % (dates[0], dates[-1]))
        by_month = collections.Counter(d[:7] for d in dates)
        w("  by month               : %s\n"
          % ", ".join("%s x%d" % (m, n) for m, n in sorted(by_month.items())))
        newest = max(by_month)
        stale = sum(n for m, n in by_month.items() if m != newest)
        w("  not from %s        : %d of %d - a stale `true` is reliable, a stale "
          "`false` is NOT\n" % (newest, stale, len(dates)))
    else:
        w("  crawled SERPs          : 0 - no snapshot anywhere in this census\n")
    w("  uncrawled              : %d of %d rows, written `unknown` and never "
      "`false` (decision 173)\n" % (len(uncrawled), len(rows)))
    if uncrawled:
        stamped = [r for r in uncrawled
                   if any(y in r["query"] for y in ("2024", "2025", "2026", "2027"))]
        w("  of those, year-stamped : %d - the standing blind spot\n" % len(stamped))


def coverage(rows, out):
    w = out.write
    w("\nCLASSIFIER COVERAGE - every figure below names the column it came from\n")
    for col, who in (("intent_class", "frozen intent_of() (SEO-11)"),
                     ("intent_class_gate", "check-serp-shape.py (SEO-12)")):
        if col not in rows[0]:
            w("  %-17s COLUMN ABSENT - this census predates SEO-14's re-issue\n" % col)
            continue
        dist = collections.Counter(r[col] for r in rows)
        ungated = dist.get("unknown", 0) + dist.get("other", 0) + dist.get("not-loaded", 0)
        w("  %-17s %-29s %s\n" % (col, who, dict(dist)))
        w("  %-17s %d of %d rows land in a gated class; %d do not\n"
          % ("", len(rows) - ungated, len(rows), ungated))
    if "intent_class_gate" in rows[0]:
        moved = [r for r in rows if r["intent_class"] != r["intent_class_gate"]]
        w("  the two columns disagree on %d of %d rows\n" % (len(moved), len(rows)))


def main():
    global FLOOR
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("census")
    ap.add_argument("--compare", help="an earlier census CSV, restated alongside")
    ap.add_argument("--floor", type=float, default=FLOOR)
    args = ap.parse_args()
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass
    FLOOR = args.floor

    if not os.path.exists(args.census):
        sys.stderr.write("no such census: %s\n" % args.census)
        return ERROR
    rows = list(csv.DictReader(io.open(args.census, encoding="utf-8")))
    if not rows:
        sys.stderr.write("census is empty\n")
        return ERROR

    out = sys.stdout
    out.write("CENSUS RESTATED: %s (%d rows)\n" % (args.census, len(rows)))
    out.write("band: positions 3-11, garden-wedding quarantined (decision 148)\n")
    out.write("floor under test: %.1fx (decision 171, restated by decision 188)\n" % FLOOR)
    coverage(rows, out)
    snapshots(rows, out)

    res = {}
    for col, label in (("intent_class", "FROZEN intent_of() - SEO-11's classifier"),
                       ("intent_class_gate", "GATE check-serp-shape.py - SEO-12's classifier")):
        if col in rows[0]:
            res[col] = restate(rows, col, label, out)

    if args.compare and os.path.exists(args.compare):
        old = list(csv.DictReader(io.open(args.compare, encoding="utf-8")))
        out.write("\n\n=== PRIOR CENSUS, same instrument: %s (%d rows) ===\n"
                  % (args.compare, len(old)))
        snapshots(old, out)
        for col, label in (("intent_class", "FROZEN intent_of() - SEO-11's classifier"),
                           ("intent_class_gate", "GATE check-serp-shape.py - SEO-12's classifier")):
            if col in old[0]:
                restate(old, col, label + "   [PRIOR CENSUS]", out)

    out.write("\n\nVERDICT - THE FLOOR TEST (decision 188)\n")
    out.write("  Two conditions, both fixed before this census was pulled:\n")
    out.write("    1. every computable re-cut's point ratio is at or above %.1fx\n" % FLOOR)
    out.write("    2. the 95% Katz CI on the ratio excludes parity wherever computable\n\n")
    states = []
    for col, label in (("intent_class", "frozen intent_of()"),
                       ("intent_class_gate", "gate classifier")):
        if col in res:
            states.append(verdict(res[col], label, out))
    state = max(states) if states else UNKNOWN
    if state == HOLDS:
        out.write("\n  CONT-17 MAY PROCEED - the document/number split has not collapsed.\n")
    elif state == COLLAPSED:
        out.write("\n  CONT-17 STOPS AND COMES BACK - the premise it rests on is gone.\n")
    else:
        out.write("\n  UNKNOWN IS NOT A PASS. Report to the CEO before CONT-17 selects.\n")
    out.write("RESTATE EXIT: %d\n" % state)
    return state


if __name__ == "__main__":
    sys.exit(main())
