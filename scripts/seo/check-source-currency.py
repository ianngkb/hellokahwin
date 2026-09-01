#!/usr/bin/env python3
"""PRE-FLIGHT #2 - the source-currency gate.  CONT-13, Sprint 05.

Fail an article whose cited sources are DEAD or SUPERSEDED, before it ships.

    python scripts/seo/check-source-currency.py <article.md> [<article.md> ...]
    python scripts/seo/check-source-currency.py --url <url>
    python scripts/seo/check-source-currency.py --selftest

EXIT CODES.  The line `SOURCECURRENCY EXIT: n` is printed at the start of a line.

    0  PASS      every cited source resolves and none is known-superseded
    1  FAIL      a cited source's page is gone (404/410) or is known-superseded
    2  STALE     a cited PDF is older than the staleness horizon; advisory
    3  UNKNOWN   a source could not be reached at all.  NOT a pass.
    4  usage or runtime error

  3 IS NOT A PASS, for the same reason it is not one in check-serp-shape.py:
  a checker that cannot tell "gone" from "not looked at" produces the false
  alarms that get checkers switched off.

WHY THIS EXISTS
  CONT-13, 1 Sept 2026.  `islam.gov.my/images/garis-panduan/panduan-doa-rasmi.pdf`
  ranks THIRD on the `doa makan majlis` SERP and FOURTH on `doa selamat majlis`.
  It was picked as the primary source for a batch of six articles on exactly
  that basis.  It is dated 3 April 2007 in its own PDF metadata, its landing
  page returns 404, and JAKIM replaced it on 12 March 2026 with an edition that
  REVERSES one of its rules: the 2007 text says the doa reader "seelok-eloknya
  seorang lelaki", the 2026 text permits a woman to lead at a women-only majlis.
  Publishing from the ranking file would have shipped a withdrawn rule on a
  point readers care about, with every other check green.

  A SEARCH RANKING MEASURES LINK EQUITY, NOT CURRENCY.  An old government file
  that is never deleted keeps its inbound links and keeps its position, and
  nothing in the response marks it as retired.  The CEO's instruction after that
  finding was to turn the lesson into something that FIRES rather than something
  written down, because prose rules do not fire - this is that thing.

WHAT IT COUNTS, AND WHAT IT DOES NOT
  Nothing. This gate reads HTTP status codes and a PDF's own /CreationDate, and
  scans LOCAL markdown for prose mentions. It deliberately does not count string
  occurrences on a rendered page, because a Next.js response carries the same
  sentence in the server HTML and again in the RSC flight payload, so any
  threshold tuned on one denominator misbehaves on the other. If a future
  version ever does count on a live page, it must state its denominator the way
  `check-retraction.py` does.

WHAT IT DOES NOT DO
  It does not judge whether a source is authoritative, and it does not read the
  claim the source is cited for.  Those stay with editorial-verification-lead.
  This gate answers two mechanical questions only: is the page still there, and
  do we already know something replaced it.
"""

import argparse
import io
import os
import re
import sys
import urllib.error
import urllib.request

PASS, FAIL, STALE, UNKNOWN, ERROR = 0, 1, 2, 3, 4

UA = "HelloKahwin-source-currency/1.0 (editorial pre-flight; +https://hellokahwin.com)"
TIMEOUT = 25

# Anything on our own site is not an external source.
OWN = ("hellokahwin.com", "images.hellokahwin.com")

# A PDF whose own creation date is older than this is reported STALE.  Three
# years is not a rule about correctness; it is the horizon past which a
# Malaysian government guideline has usually been reissued at least once.
# JAKIM shipped three editions of one document in nineteen months.
STALE_YEARS = 3
TODAY_YEAR = 2026

# ------------------------------------------------------------------ registry
# KNOWN-SUPERSEDED SOURCES.  One entry per document we have positively
# established is replaced.  Keyed by a distinctive URL fragment so that a
# mirror or a changed query string still trips it.
#
# Add an entry the moment a verification round establishes a replacement.  The
# cost of an entry is one line; the cost of not having it is the failure above.
SUPERSEDED = {
    "garis-panduan/panduan-doa-rasmi.pdf": {
        "what": "JAKIM, Garis Panduan Tatacara Membaca Doa (edisi 2007, 76 pp)",
        "why": (
            "PDF creation date 3 April 2007; its landing page "
            "/ms/garis-panduan/4592-panduan-doa-rasmi-2 returns 404. Still served "
            "at the old path, so it keeps its links and its ranking."
        ),
        "use_instead": (
            "https://www.islam.gov.my/ms/garis-panduan/"
            "4994-panduan-dan-himpunan-doa-2026 - Garis Panduan dan Himpunan Doa "
            "bagi Majlis Rasmi dan Separuh Rasmi (Pindaan 2026), 12 Mac 2026"
        ),
        "what_changed": (
            "Doa duration 5 minutes -> 2-3 minutes (cl. 9.2); reader "
            "'seelok-eloknya seorang lelaki' -> a woman may lead at a women-only "
            "majlis (cl. 7.2 iv)"
        ),
        "established": "CONT-13, editorial-verification-lead, 1 September 2026",
        # Distinctive strings by which this document is named in PROSE, for
        # articles that cite a source by title rather than by link - which is
        # our house style and is how the 2007 file was nearly cited.
        "prose": ["panduan-doa-rasmi.pdf",
                  "Garis Panduan Tatacara Membaca Doa"],
    },
}

# `)` IS PART OF THE URL until proved otherwise - CONT-18, 2 September 2026.
#
# This pattern used to exclude `)` outright, which truncated every Wikimedia
# Commons filename containing a bracket.  `File:UTC_Shah_Alam_(220711).jpg`
# became `File:UTC_Shah_Alam_(220711`, that fragment returns HTTP 404, and the
# gate reported FAIL on two live pages in one run.  Our own asset register
# already carries two such credit URLs, so the false alarm was not hypothetical
# and was going to repeat on every article crediting those photographs - which
# is exactly how a checker earns the reputation that gets it switched off
# (DES-09).  Parentheses are now matched and the UNBALANCED trailing ones are
# trimmed instead, so `[x](https://a/b)` still yields `https://a/b`.
URL_RE = re.compile(r"https?://[^\s<>\"'\]]+")


def trim_url(raw):
    """Strip trailing sentence punctuation and unbalanced closing brackets.

    A URL at the end of a Malay sentence picks up a full stop; a URL inside a
    markdown link picks up the link's own `)`.  A URL whose own filename
    contains balanced brackets keeps them.
    """
    url = raw.rstrip(".,;:")
    while url.endswith(")") and url.count(")") > url.count("("):
        url = url[:-1].rstrip(".,;:")
    return url


def cited_urls(path):
    """Every external URL in the file, deduplicated, order preserved.

    Trailing punctuation is stripped because a URL at the end of a Malay
    sentence picks up a full stop, and a URL inside a markdown link picks up
    nothing - both shapes appear in our drafts.
    """
    text = io.open(path, encoding="utf-8").read()
    seen, out = set(), []
    for raw in URL_RE.findall(text):
        url = trim_url(raw)
        if any(h in url for h in OWN):
            continue
        if url not in seen:
            seen.add(url)
            out.append(url)
    return out


def prose_mentions(path):
    """Lines that NAME a known-superseded document without linking it.

    Our house style cites an authority by title, not by URL, so a URL-only gate
    would have missed the exact case that produced it: the 2007 JAKIM file was
    going to be cited in prose as "Panduan Doa Rasmi", never as a link.

    This is ADVISORY, not a refusal, and the reason is in the data. An article
    may name a superseded edition on purpose - three of this batch do, to warn
    the reader that the file still ranks. A gate that cannot tell a citation
    from a warning must hand the judgement back rather than guess it.
    """
    out = []
    for n, line in enumerate(io.open(path, encoding="utf-8"), start=1):
        for frag, entry in SUPERSEDED.items():
            for needle in entry.get("prose", []):
                if needle.lower() in line.lower():
                    out.append((n, needle, entry, line.strip()))
    return out


def superseded_entry(url):
    for frag, entry in SUPERSEDED.items():
        if frag in url:
            return frag, entry
    return None, None


def fetch(url):
    """Returns (status, body_head, error).  HEAD is not used: several Malaysian
    government hosts answer HEAD with 405 while serving GET perfectly well, and
    a 405 read as 'gone' is exactly the false alarm this gate must not raise."""
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return resp.getcode(), resp.read(2048), None
    except urllib.error.HTTPError as exc:
        return exc.code, b"", None
    except Exception as exc:  # noqa: BLE001 - network, DNS, TLS, timeout
        return None, b"", str(exc)


PDF_DATE_RE = re.compile(rb"/CreationDate\s*\(\s*D:(\d{4})")


def pdf_year(url):
    """The year inside a PDF's own /CreationDate, or None.

    Reads the whole file: /CreationDate sits in the trailer on most producers,
    so the first 2 KB is not enough and a partial read returns None on documents
    that do carry a date.
    """
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            blob = resp.read(6 * 1024 * 1024)
    except Exception:  # noqa: BLE001
        return None
    m = PDF_DATE_RE.search(blob)
    return int(m.group(1)) if m else None


def check_url(url, verbose=True):
    """Returns one of 'pass', 'fail', 'stale', 'unknown'."""
    frag, entry = superseded_entry(url)
    if entry:
        if verbose:
            print("  FAIL  SUPERSEDED  %s" % url)
            print("        %s" % entry["what"])
            print("        why          : %s" % entry["why"])
            print("        what changed : %s" % entry["what_changed"])
            print("        use instead  : %s" % entry["use_instead"])
            print("        established  : %s" % entry["established"])
        return "fail"

    status, _, err = fetch(url)
    if status is None:
        if verbose:
            print("  UNKNOWN  could not reach  %s" % url)
            print("        %s" % err)
            print("        Not a pass. Re-run, or check it by hand and say so.")
        return "unknown"
    if status in (404, 410):
        if verbose:
            print("  FAIL  HTTP %d  %s" % (status, url))
            print("        A cited source whose page is gone. Find what replaced")
            print("        it, cite that, and add the old one to SUPERSEDED.")
        return "fail"

    if url.lower().endswith(".pdf"):
        year = pdf_year(url)
        if year and year <= TODAY_YEAR - STALE_YEARS:
            if verbose:
                print("  STALE  PDF created %d  %s" % (year, url))
                print("        Older than %d years. Check for a newer edition"
                      % STALE_YEARS)
                print("        before citing it. A file that is never deleted")
                print("        keeps its ranking whatever its age.")
            return "stale"
        if verbose:
            print("  ok    HTTP %d, PDF created %s  %s"
                  % (status, year if year else "date not in file", url))
            return "pass"

    if verbose:
        print("  ok    HTTP %d  %s" % (status, url))
    return "pass"


def run(paths, urls, verbose=True):
    targets = []
    prose_hits = []
    for p in paths:
        if not os.path.exists(p):
            print("no such file: %s" % p)
            return ERROR
        found = cited_urls(p)
        mentions = prose_mentions(p)
        if verbose:
            print("\n%s  -  %d external source(s) cited" % (os.path.basename(p), len(found)))
            for n, needle, entry, line in mentions:
                print("  REVIEW  line %d names a superseded document in prose: %r"
                      % (n, needle))
                print("        %s" % entry["what"])
                print("        current : %s" % entry["use_instead"].split(" - ")[0])
                print("        the line: %s"
                      % (line[:140] + ("..." if len(line) > 140 else "")))
                print("        Naming it to WARN the reader is correct. Citing it")
                print("        as the source is not. Confirm which this is.")
        prose_hits.extend(mentions)
        targets.extend(found)
    targets.extend(urls)
    if not targets:
        print("\nNo external sources cited. Nothing to check.")
        return PASS

    seen, results = set(), []
    for url in targets:
        if url in seen:
            continue
        seen.add(url)
        results.append(check_url(url, verbose))

    if "fail" in results:
        return FAIL
    if "unknown" in results:
        return UNKNOWN
    if "stale" in results or prose_hits:
        return STALE
    return PASS


def selftest():
    """Run against the case that produced this gate, and against a control.

    The registry check is offline and deterministic, so it is the part asserted
    here. The network checks are exercised by a real run, not by the suite.
    """
    ok = True

    frag, entry = superseded_entry(
        "https://www.islam.gov.my/images/garis-panduan/panduan-doa-rasmi.pdf")
    print("THE FAILING CASE - the 2007 JAKIM PDF that ranks third:")
    if entry:
        print("  caught by registry key %r" % frag)
        print("  redirected to: %s" % entry["use_instead"].split(" - ")[0])
    else:
        print("  NOT CAUGHT - the gate does not do the one thing it exists for")
        ok = False

    print("\nCONTROL - the 2026 edition that replaced it must NOT be flagged:")
    _, entry2 = superseded_entry(
        "https://www.islam.gov.my/ms/garis-panduan/4994-panduan-dan-himpunan-doa-2026")
    if entry2 is None:
        print("  not flagged, correct")
    else:
        print("  WRONGLY FLAGGED - the gate would reject the current source")
        ok = False

    print("\nCONTROL - an unrelated authority page must NOT be flagged:")
    _, entry3 = superseded_entry(
        "https://muftiwp.gov.my/ms/artikel/al-kafi-li-al-fatawi/5708-al-kafi-1948")
    if entry3 is None:
        print("  not flagged, correct")
    else:
        print("  WRONGLY FLAGGED")
        ok = False

    print("\nTHE FAILING CASE - a URL whose filename contains brackets:")
    # CONT-18, 2 Sept 2026. Both of these are LIVE (HTTP 200, checked by hand
    # the same day). The old pattern cut each at the opening bracket and
    # reported the fragment as a dead source.
    bracket_cases = [
        ("https://commons.wikimedia.org/wiki/File:UTC_Shah_Alam_(220711).jpg",
         "https://commons.wikimedia.org/wiki/File:UTC_Shah_Alam_(220711).jpg"),
        ("[foto](https://commons.wikimedia.org/wiki/File:UTC_Keramat_counter_(220527).jpg)",
         "https://commons.wikimedia.org/wiki/File:UTC_Keramat_counter_(220527).jpg"),
        ("Lihat (https://example.gov.my/a/b).",
         "https://example.gov.my/a/b"),
        ("markdown [x](https://example.gov.my/a/b) inline",
         "https://example.gov.my/a/b"),
    ]
    for text, want in bracket_cases:
        got = [trim_url(u) for u in URL_RE.findall(text)]
        if got == [want]:
            print("  ok    %s" % want)
        else:
            print("  WRONG %r -> %r, wanted [%r]" % (text, got, want))
            ok = False

    print("\nCONTROL - our own URLs are not external sources:")
    n = len([u for u in ["https://hellokahwin.com/artikel/x"] if not any(h in u for h in OWN)])
    if n == 0:
        print("  skipped, correct")
    else:
        print("  WRONGLY TREATED AS EXTERNAL")
        ok = False

    return PASS if ok else FAIL


def main():
    ap = argparse.ArgumentParser(add_help=True)
    ap.add_argument("paths", nargs="*", help="article markdown file(s)")
    ap.add_argument("--url", action="append", default=[], help="check one URL")
    ap.add_argument("--selftest", action="store_true")
    args = ap.parse_args()

    if args.selftest:
        code = selftest()
    elif not args.paths and not args.url:
        ap.print_help()
        code = ERROR
    else:
        code = run(args.paths, args.url)

    verdict = {PASS: "PASS", FAIL: "FAIL", STALE: "STALE",
               UNKNOWN: "UNKNOWN", ERROR: "ERROR"}[code]
    print("\n%s" % verdict)
    print("SOURCECURRENCY EXIT: %d" % code)
    return code


if __name__ == "__main__":
    sys.exit(main())
