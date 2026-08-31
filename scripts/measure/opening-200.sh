#!/usr/bin/env bash
# opening-200.sh — print a live article's <title>, <h1> and first N reader-facing
# words, and count terms inside that window.
#
# WHY THIS EXISTS. CONT-14's DoD (01 Sep 2026) was "the live page's <h1>, <title>
# and opening 200 words centre on definition and money, quoted from live HTML
# before and after". There was no way to run that. Every seat that gets an
# opening-N-words DoD re-improvises the extraction, and the first improvisation is
# always wrong in the same way:
#
#   THE ARTICLE RAIL AND THE TABLE OF CONTENTS SIT BETWEEN THE <h1> AND THE FIRST
#   PARAGRAPH. A naive strip-tags-and-take-200-words spends ~90 of the 200 words on
#   "Rekod Kategori Penulis Bacaan Disemak Kongsi artikel ini Isi Kandungan ..."
#   plus every heading in the page, then reports term counts about the furniture.
#
# On `hantaran-kahwin` that swallowed the whole opening: the naive window ended
# inside the TOC, so a page whose first paragraph answers the head question read as
# a page with no opening at all.
#
# THE FIRST VERSION OF THIS SCRIPT WAS ALSO WRONG, and that is the more useful
# half. It cut the flattened text from "Rekod" to the first "?" after "Isi
# Kandungan" -- which lands on the FIRST entry of the table of contents, leaving
# the other ten. Run against the very page it was written for, it still spent 60
# words on the TOC and still reported term counts about it. Running it is the only
# reason that is not in the log as a measurement.
#
# So this version does not pattern-match the furniture at all. It takes the DOM
# containers the page actually uses: the <h1>, the deck (p.s-deck), and the body
# (div.inspire-prose) with every <nav> removed. A structural anchor cannot land
# one entry into a list.
#
# It follows count-in-html.sh's rules, and for the same reasons: it never combines
# `grep -o -i -F` (returns 0 in this Git Bash build's GNU grep 3.0), and a zero is
# printed with a warning rather than as a finding.
#
# Usage:
#   opening-200.sh <url|file> [--words N] [term ...]
#
# Examples:
#   opening-200.sh https://hellokahwin.com/artikel/hantaran-mas-kahwin/hantaran-kahwin
#   opening-200.sh <url> --words 200 "mas kahwin" "duit hantaran" kos RM
#
# Quote the before/after windows into your work log verbatim. A DoD that says the
# opening "centres on" something is settled by reading the window, not by the term
# counts: the counts move for reasons that have nothing to do with the angle. They
# are here to make a change visible, not to prove one.
#
# Exit codes: 0 = ran; 2 = usage error; 3 = fetch failed.
set -uo pipefail

die() { echo "$*" >&2; exit 2; }

[ $# -ge 1 ] || die "usage: $0 <url|file> [--words N] [term ...]"

SRC="$1"; shift
WORDS=200
if [ "${1:-}" = "--words" ]; then
  WORDS="${2:-}"; [ -n "$WORDS" ] || die "--words needs a number"; shift 2
fi

TMP="$(mktemp)"; trap 'rm -f "$TMP"' EXIT

if printf '%s' "$SRC" | grep -qE '^https?://'; then
  code="$(curl -sSL -o "$TMP" -w '%{http_code}' "$SRC")" || { echo "fetch failed: $SRC" >&2; exit 3; }
  echo "source: $SRC  (HTTP $code, $(wc -c < "$TMP") bytes)"
  [ "$code" = "200" ] || echo "  !! not 200 — everything below describes an error page" >&2
else
  [ -f "$SRC" ] || die "no such file: $SRC"
  cp "$SRC" "$TMP"
  echo "source: $SRC  ($(wc -c < "$TMP") bytes)"
fi

echo
echo "-- <title> --"
grep -oai '<title>[^<]*</title>' "$TMP" || echo "  (none found)"
echo
echo "-- <h1> --"
grep -oai '<h1[^>]*>[^<]*</h1>' "$TMP" || echo "  (none found)"
echo
echo "-- first $WORDS reader-facing words (article rail and table of contents stripped) --"

WORDS="$WORDS" python - "$TMP" "$@" <<'PYBODY'
import html, os, re, sys

path = sys.argv[1]
terms = sys.argv[2:]
n = int(os.environ["WORDS"])

raw = open(path, encoding="utf-8", errors="replace").read()


def strip_tags(fragment):
    fragment = re.sub(r"<(script|style|nav)\b.*?</\1>", " ", fragment, flags=re.S | re.I)
    fragment = re.sub(r"<[^>]+>", " ", fragment)
    return re.sub(r"\s+", " ", html.unescape(fragment)).strip()


def grab(pattern):
    m = re.search(pattern, raw, flags=re.S | re.I)
    return strip_tags(m.group(1)) if m else ""


h1 = grab(r"<h1[^>]*>(.*?)</h1>")
deck = grab(r'<p[^>]*class="[^"]*\bs-deck\b[^"]*"[^>]*>(.*?)</p>')
body = grab(r'<div[^>]*class="[^"]*\binspire-prose\b[^"]*"[^>]*>(.*)')

if not body:
    # Fallback: everything after the <h1>, minus <nav>. Say so, loudly, because
    # this path can still swallow the rail.
    i = raw.find("<h1")
    body = strip_tags(raw[i:]) if i >= 0 else ""
    print("  !! div.inspire-prose not found - fell back to everything after <h1>.")
    print("     READ the window below before trusting any count taken from it.")

window = " ".join(" ".join(x for x in (h1, deck, body) if x).split(" ")[:n])
print(window)

if terms:
    print()
    print(f"-- term counts INSIDE those {n} words --")
    for t in terms:
        c = len(re.findall(re.escape(t), window, re.I))
        print(f"  {t:<28} {c}")
        if c == 0:
            print("      ^ ZERO. Check the term before reporting an absence:")
            print("        a Malay page may carry the idea under another word.")
PYBODY
