#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""PRE-FLIGHT #3 - the ownership gate.  CONT-16, Sprint 05.

Test 3 of the target-selection gate - "not already owned by a sibling page on the
same parent topic", rule 4 of the cluster method - has been written in prose in
every content brief since Sprint 04 and has never been executable.  On 01 Sept
2026 it did not fire, and that is why this file exists.

WHAT HAPPENED.  CONT-16 reserved two keyword families at sprint planning -
`skrip pengacara majlis` and `teks kad jemputan` - and budgeted 5 points to write
two new articles for them.  Both were already owned:

    /artikel/ucapan-doa/skrip-pengacara-majlis-perkahwinan
    /artikel/pelamin-kad-cenderahati/contoh-kad-jemputan-kahwin

The second one already carried the exact artefact the item was dispatched to
write - an H2 reading "Tiga daftar ayat jemputan, dengan contoh".  The item's own
`why` field says "We already have one live page in the script family", so the
first was known and the second was not.  Nobody ran the check because there was
no check to run: rule 4 was a sentence, and PROSE RULES DO NOT FIRE.

WHAT THIS DOES.  Resolves a candidate keyword's Ahrefs `parent_topic`, then asks
the LIVE sitemap whether a page already targets it.  A live slug (or <title>)
containing every content token of the parent topic is treated as owning it.

    python scripts/seo/check-family-owned.py "contoh kad jemputan kahwin"
    python scripts/seo/check-family-owned.py --parent "contoh kad kahwin" --offline
    python scripts/seo/check-family-owned.py --selftest

EXIT CODES.  The line `FAMILYOWNED EXIT: n` is printed at the start of a line.
It is namespaced on purpose: `ITEM EXIT:` is the sprint watcher's sentinel and a
gate must never print it (PLAT-13, 01 Sept 2026).

    0  FREE      no live page owns this parent topic - a new page is legitimate
    1  OWNED     a live page already targets it - UPGRADE OR MERGE, do not add
    2  CONTAINED a live page's WHOLE slug sits inside this parent topic - NOT A
                 PASS.  Open that page and overrule with a recorded reason, or
                 upgrade it instead of adding a second one.  See below.
    3  UNKNOWN   no parent topic resolved - NOT A PASS, classify it by hand
    4  usage or runtime error

  NEITHER 2 NOR 3 IS A PASS, for the same reason 3 is not a pass in PRE-FLIGHT
  #1: a checker that cannot tell "absent" from "not looked at" produces the
  false alarms that get checkers switched off (DES-09).

WHY 2 EXISTS - CONT-18, 2 September 2026.  `borang nikah online` (2,500/mo)
returned FREE, because the parent topic carries the token `online` and our live
slug `borang-nikah` does not, so the score is 67% and it lands in the advisory
near-miss band.  The live page it named already covers the whole family: it has
H2s reading "Apa yang ada dalam borang permohonan", "Dokumen: contoh senarai
penuh" and "Sistem mana yang negeri anda guna".  Writing a second page there was
CONT-16's exact defect arriving by a new route, and the only thing that caught
it was a writer choosing to open the page the near-miss line named.  A rule that
depends on someone choosing to look is a prose rule with a print statement.

So the containment case is now its own verdict: when a live ARTICLE slug's
content tokens are all present in the parent topic, the parent is a LONGER,
more specific version of a page we already have.  That is a different shape from
a near miss and it is reported as one.  It is exit 2 rather than exit 1 because
it is sometimes right to proceed - a state spoke under a national hub is the
normal cluster shape - but it must be an overrule with a reason in the log, not
a silent pass.

WHY SLUG TOKENS AND NOT A SEMANTIC MATCH.  Because the failure mode this guards
is cheap and blunt - a writer proposing a page that already exists - and a blunt
check that runs beats a clever one that does not.  It errs toward OWNED: a hit
is an instruction to LOOK at the named page, not an automatic veto.  Every hit
prints the URL so the reader can overrule it with a reason.
"""

from __future__ import print_function

import argparse
import io
import json
import os
import re
import sys
import time
import importlib.util

try:
    import urllib.request as urlrequest
except ImportError:                                    # pragma: no cover - py2
    import urllib2 as urlrequest                       # type: ignore

HERE = os.path.dirname(os.path.abspath(__file__))
SITEMAP = "https://hellokahwin.com/sitemap.xml"

FREE, OWNED, CONTAINED, UNKNOWN, ERROR = 0, 1, 2, 3, 4

# Malay function words carry no targeting signal, so they must not be allowed to
# manufacture a match.  Format words (contoh, teks, skrip, ayat) are KEPT - they
# are exactly what distinguishes a document-intent query from its topic.
STOPWORDS = frozenset("""
dan di ke dari untuk yang dengan pada itu ini adalah ialah atau serta
the a an of for to in on and or my
""".split())


def tokens(phrase):
    """Content tokens of a phrase, lowercased, stopwords dropped."""
    raw = re.split(r"[^0-9a-zA-ZÀ-ɏ]+", (phrase or "").lower())
    return [t for t in raw if t and t not in STOPWORDS]


def slug_tokens(url):
    """Content tokens of a URL's path, so /a/b-c-d -> [a, b, c, d]."""
    path = re.sub(r"^https?://[^/]+", "", url or "")
    return tokens(path)


def fetch(url, timeout=60):
    req = urlrequest.Request(url, headers={"User-Agent": "check-family-owned/1.0"})
    return urlrequest.urlopen(req, timeout=timeout).read().decode("utf-8", "replace")


def sitemap_urls(sitemap_url):
    body = fetch(sitemap_url)
    return re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", body)


def title_of(html):
    m = re.search(r"<title[^>]*>(.*?)</title>", html, re.S | re.I)
    return re.sub(r"\s+", " ", m.group(1)).strip() if m else ""


def score(parent, url):
    """Fraction of the parent topic's content tokens present in the URL path."""
    pt = tokens(parent)
    if not pt:
        return 0.0, []
    have = set(slug_tokens(url))
    hits = [t for t in pt if t in have]
    return float(len(hits)) / len(pt), hits


def contained(parent, urls):
    """Live ARTICLE pages whose whole slug sits inside this parent topic.

    A hub (`/artikel/<pillar>`) is skipped: a hub needs no resolving, exactly as
    in `bodyInternalLinks`.  Returns [(url, slug_tokens)], longest slug first,
    so the most specific collision is reported at the top.
    """
    pt = set(tokens(parent))
    if not pt:
        return []
    hits = []
    for u in urls:
        segs = [s for s in re.sub(r"^https?://[^/]+", "", u or "").split("/") if s]
        if len(segs) < 3 or segs[0] != "artikel":
            continue
        st = tokens(segs[-1])
        if st and set(st) <= pt:
            hits.append((u, st))
    hits.sort(key=lambda h: (-len(h[1]), h[0]))
    return hits


def check(parent, urls, near=0.60, probe_titles=True, probe_limit=5):
    """Return (exit_code, owners, near_misses).  Pure - no Ahrefs, no argv."""
    pt = tokens(parent)
    if not pt:
        return UNKNOWN, [], []

    scored = []
    for u in urls:
        s, hits = score(parent, u)
        if s > 0:
            scored.append((s, u, hits))
    scored.sort(key=lambda x: (-x[0], x[1]))

    owners = [(s, u, h) for s, u, h in scored if s >= 1.0]
    nears = [(s, u, h) for s, u, h in scored if near <= s < 1.0]

    # A slug can diverge from what the page actually targets, so the near-miss
    # band gets its <title> read before it is waved through.  Bounded on purpose:
    # this gate runs at selection time and must stay cheap enough to actually run.
    if probe_titles and not owners:
        for s, u, _h in nears[:probe_limit]:
            try:
                t = title_of(fetch(u, timeout=30))
            except Exception:                          # noqa: BLE001 - advisory
                continue
            have = set(tokens(t))
            if all(tok in have for tok in pt):
                owners.append((1.0, u, pt + ["<title>"]))
            time.sleep(0.2)

    if owners:
        return OWNED, owners, nears
    # A live article whose WHOLE slug sits inside the parent topic is a
    # collision of a different shape from a near miss, and it gets its own
    # verdict rather than an advisory line nobody has to read.  CONT-18.
    if contained(parent, urls):
        return CONTAINED, owners, nears
    return FREE, owners, nears


# ------------------------------------------------------------------ Ahrefs glue
def load_serp_shape():
    """Import check-serp-shape.py by path - its filename is not a module name."""
    path = os.path.join(HERE, "check-serp-shape.py")
    spec = importlib.util.spec_from_file_location("check_serp_shape", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def parent_topic_of(keyword, country):
    css = load_serp_shape()
    tok = css.Ahrefs.token_from_env()
    if not tok:
        sys.stderr.write(
            "no Ahrefs credential in this SESSION (AHREFS_MCP_TOKEN or "
            "~/.claude.json mcpServers.ahrefs). That is a session permission "
            "problem, not a missing company credential - say so that way.\n")
        return None, None
    a = css.Ahrefs(tok)
    ov = a.overview(keyword, country) or {}
    return ov.get("parent_topic"), ov.get("volume")


# ------------------------------------------------------------------- self-test
# The two families CONT-16 was dispatched to write, and one that was genuinely
# free, against the live sitemap as it stood on 01 Sept 2026.  A FIX IS NOT
# VERIFIED UNTIL IT IS RUN AGAINST THE FAILING CASE - so the failing cases are
# the regression suite, not an afterthought.
FIXTURE = [
    "https://hellokahwin.com/artikel/ucapan-doa",
    "https://hellokahwin.com/artikel/ucapan-doa/skrip-pengacara-majlis-perkahwinan",
    "https://hellokahwin.com/artikel/ucapan-doa/doa-majlis-perkahwinan",
    "https://hellokahwin.com/artikel/ucapan-doa/doa-pengantin-baru",
    "https://hellokahwin.com/artikel/ucapan-doa/ucapan-pengantin-baru",
    "https://hellokahwin.com/artikel/ucapan-doa/walimatul-urus",
    "https://hellokahwin.com/artikel/pelamin-kad-cenderahati/contoh-kad-jemputan-kahwin",
    "https://hellokahwin.com/artikel/pelamin-kad-cenderahati/bunga-telur",
    "https://hellokahwin.com/artikel/idea-dan-nasihat/cara-buat-kad-kahwin-digital",
    "https://hellokahwin.com/artikel/nikah-undang-undang/rukun-nikah",
    # Added CONT-18, 2 Sept 2026 - the two live pages the containment cases hit.
    "https://hellokahwin.com/artikel/nikah-undang-undang/borang-nikah",
    "https://hellokahwin.com/artikel/idea-dan-nasihat/kursus-kahwin",
]

CASES = [
    # parent topic,                        want,   why
    ("skrip pengacara majlis perkahwinan", OWNED,
     "CONT-16 half 1 - the live page the item's own why-field already knew about"),
    ("contoh kad kahwin", OWNED,
     "CONT-16 half 2 - the live page NOBODY knew about; this is the miss"),
    ("aturcara majlis perkahwinan", FREE,
     "no live slug carries 'aturcara' - the H2 inside a page is not ownership"),
    ("doa penutup majlis", FREE,
     "CONT-13 target - doa-majlis-perkahwinan lacks 'penutup', must not false-fire"),
    ("doa makan majlis", FREE,
     "CONT-13 target - same near-miss shape, must not false-fire"),
    ("rukun nikah", OWNED,
     "positive control - a page we certainly own"),
    ("", UNKNOWN,
     "no parent topic resolved is NOT a pass"),
    # CONT-18's failing cases. Both returned FREE before containment existed.
    ("borang nikah online", CONTAINED,
     "CONT-18 - the whole slug borang-nikah sits inside it; returned FREE before"),
    ("kursus kahwin selangor", CONTAINED,
     "CONT-18 - the whole slug kursus-kahwin sits inside it; returned FREE before"),
    ("sijil kursus kahwin", CONTAINED,
     "CONT-18 - same shape, a token added on the LEFT rather than the right"),
    ("urutan wali nikah", FREE,
     "CONT-18 control - rukun-nikah shares 'nikah' only, so containment must NOT fire"),
    ("hiv test kahwin", FREE,
     "CONT-18 control - nothing live is contained; this one was genuinely free"),
]


def selftest():
    print("REGRESSION SUITE - PRE-FLIGHT #3, run against the cases that failed")
    print("=" * 78)
    ok = True
    for parent, want, why in CASES:
        got, owners, _n = check(parent, FIXTURE, probe_titles=False)
        good = (got == want)
        ok = ok and good
        print("\n%s  %-36s want %d  got %d"
              % ("PASS" if good else "FAIL", repr(parent), want, got))
        print("      %s" % why)
        for s, u, h in owners[:2]:
            print("      owner: %s  (%.0f%% of tokens: %s)" % (u, 100 * s, ", ".join(h)))
    print("\n" + "=" * 78)
    print("REGRESSION SUITE: %s" % ("all %d hold" % len(CASES) if ok else "BROKEN"))
    print("FAMILYOWNED EXIT: %d" % (FREE if ok else OWNED))
    return FREE if ok else OWNED


# ------------------------------------------------------------------------ main
def main():
    ap = argparse.ArgumentParser(
        description="PRE-FLIGHT #3 - does a live page already own this parent topic?")
    ap.add_argument("keywords", nargs="*", help="candidate keyword(s)")
    ap.add_argument("--country", default="my")
    ap.add_argument("--parent", help="skip Ahrefs and test this parent topic directly")
    ap.add_argument("--sitemap", default=SITEMAP)
    ap.add_argument("--offline", action="store_true",
                    help="use the committed 01 Sept fixture instead of the live sitemap")
    ap.add_argument("--selftest", action="store_true")
    args = ap.parse_args()

    if args.selftest:
        return selftest()

    if not args.keywords and not args.parent:
        ap.print_usage(sys.stderr)
        print("FAMILYOWNED EXIT: %d" % ERROR)
        return ERROR

    if args.offline:
        urls = FIXTURE
        src = "committed fixture (01 Sept 2026, %d urls)" % len(urls)
    else:
        try:
            urls = sitemap_urls(args.sitemap)
        except Exception as exc:                       # noqa: BLE001
            sys.stderr.write("sitemap fetch failed: %s\n" % exc)
            print("FAMILYOWNED EXIT: %d" % ERROR)
            return ERROR
        src = "%s (%d urls)" % (args.sitemap, len(urls))

    print("sitemap      : %s" % src)

    worst = FREE
    targets = [(None, args.parent)] if args.parent else [(k, None) for k in args.keywords]

    for keyword, parent in targets:
        vol = None
        if parent is None:
            parent, vol = parent_topic_of(keyword, args.country)
        print("\nkeyword      : %s" % (keyword if keyword else "(parent given directly)"))
        print("parent topic : %s" % (parent if parent else "(none resolved)"))
        if vol is not None:
            print("volume (my)  : %s/mo" % vol)

        code, owners, nears = check(parent, urls)

        for s, u, h in owners:
            print("OWNED BY     : %s" % u)
            print("               %.0f%% of parent-topic tokens in the slug: %s"
                  % (100 * s, ", ".join(h)))
        for s, u, h in nears[:5]:
            print("near miss    : %s  (%.0f%%: %s)" % (u, 100 * s, ", ".join(h)))
        if not owners and not nears:
            print("no live page shares a token with this parent topic.")
            print("  ^ before reporting that as FREE, verify the CHECK: re-run with")
            print("    --parent on a topic you KNOW we own (try 'rukun nikah').")

        for u, st in contained(parent, urls)[:5]:
            if not owners:
                print("CONTAINED BY : %s" % u)
                print("               its whole slug (%s) sits inside this parent topic"
                      % ", ".join(st))
        verdict = {FREE: "FREE", OWNED: "OWNED", CONTAINED: "CONTAINED",
                   UNKNOWN: "UNKNOWN"}[code]
        print("\n%s: %s" % (verdict, {
            FREE: "no live page targets this parent topic - a new page is legitimate",
            OWNED: "a live page already targets it - UPGRADE OR MERGE (rule 4). "
                   "Writing a second page here is cannibalisation.",
            CONTAINED: "NOT A PASS. This parent topic is a longer version of a page "
                       "we already have. OPEN the page named above and read its "
                       "headings before writing anything. Proceed only by recording "
                       "in your log why a second page is not cannibalisation.",
            UNKNOWN: "NOT A PASS. No parent topic resolved - classify it by hand.",
        }[code]))
        worst = max(worst, code)

    print("FAMILYOWNED EXIT: %d" % worst)
    return worst


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(ERROR)
