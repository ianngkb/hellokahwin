#!/usr/bin/env bash
# check-h6.sh — evaluate DES-03 §7.5 rule H6, the homepage category diversity rule.
#
# WHY THIS EXISTS. DES-03 §5.3 asserted a diversity rule and cross-referenced
# "H6 in §7". No rule H6 existed. Sprint 04's finding was that the parts of
# DES-03 written as enforceable constraints shipped exactly and the parts
# written as prose and a drawing did not ship at all. A rule that only a human
# can evaluate is a prose rule wearing a number. This script is what makes H6
# fire: UI-13 runs it, reads an exit code, and never interprets a sentence.
#
# Usage:
#   check-h6.sh [--corpus <sitemap-url|file>] <homepage-url|file>
#
# Exit codes:
#   0  H6 holds.
#   1  H6 is violated. Every failing clause is printed with its numbers.
#   3  Could not fetch, or usage error. NOT a verdict about the page.
#
# --corpus is optional. Given a sitemap, the script also reports whether the
# published corpus could satisfy H6 at this N — which is what separates "the
# homepage was built wrong" (exit 1, corpus CAN satisfy) from "the corpus is
# too thin and H6.5's fallback applies" (exit 1, corpus CANNOT satisfy). The
# exit code stays binary on purpose: a gate needs pass or fail, and the corpus
# line tells you who owns the fix.
#
# NOTE ON grep. NEVER COMBINE -o -i -F: it returns 0 in GNU grep 3.0, this Git
# Bash build, and reproduces on a 23-byte file. Everything below uses -oaE.
set -uo pipefail

die() { echo "$*" >&2; exit 3; }

CORPUS=""
if [ "${1:-}" = "--corpus" ]; then CORPUS="${2:-}"; shift 2 || die "usage: --corpus needs a value"; fi
[ $# -eq 1 ] || die "usage: $0 [--corpus <sitemap-url|file>] <homepage-url|file>"

SRC="$1"
TMP="$(mktemp)"; CTMP="$(mktemp)"; trap 'rm -f "$TMP" "$CTMP"' EXIT

# UI-13, 01 Sept 2026. `fetch` is ALWAYS called inside a command substitution,
# so it runs in a SUBSHELL, and `die`'s `exit 3` could only ever kill that
# subshell — the parent read an empty description and carried straight on over
# an EMPTY FILE. That is not a cosmetic error path. Measured against the live
# homepage the same afternoon, with the sitemap fetch failing on this machine's
# known TCP stall:
#
#   corpus:                                    <- silently blank
#   H6.3  FLOOR       pass — 2 distinct categories, floor min(4,K,N-cap+1)=1
#   corpus: 0 published articles across 1 categories
#           H6 IS NOT SATISFIABLE at N=13. H6.5's fallback applies: ...
#
# Both lines are false and both are LENIENT. An empty corpus file makes K=1,
# which drags H6.3's floor from 4 down to 1, so H6.3 REPORTED PASS ON A
# TWO-CATEGORY HOMEPAGE — near enough the exact page this rule exists to
# reject. And the satisfiability line inverts: it blames a corpus of 89
# articles for a build defect and sends the reader to H6.5's truncation ladder,
# i.e. to shipping a SHORTER homepage instead of a fixed one. A fetch error
# must be exit 3 and NOT a verdict, which is what this file's own header
# already promised.
#
# So `fetch` now RETURNS 3 and the caller dies in the parent shell. Proved
# against the failing case rather than against an understanding of it:
#   check-h6.sh --corpus /does/not/exist <page>   ->  exit 3, no verdict printed.
fetch() { # fetch <src> <dest>  -> echoes a description line; returns 3 on failure
  if printf '%s' "$1" | grep -qE '^https?://'; then
    code="$(curl -sS -o "$2" -w '%{http_code}' "$1")" || { echo "fetch failed: $1" >&2; return 3; }
    echo "$1  (HTTP $code, $(wc -c < "$2" | tr -d ' ') bytes)"
    [ "$code" = "200" ] || echo "  !! not 200 — every number below is a number about an error page" >&2
  else
    [ -f "$1" ] || { echo "no such file: $1" >&2; return 3; }
    cp "$1" "$2"
    echo "$1  ($(wc -c < "$2" | tr -d ' ') bytes)"
  fi
}

echo "H6 — homepage category diversity (DES-03 §7.5)"
PAGE_DESC="$(fetch "$SRC" "$TMP")" || die "could not read the page: $SRC  (exit 3 is not a verdict about it)"
echo "page:   $PAGE_DESC"
KCAP=4          # the ideal floor; H6.3 lowers it where the set or the corpus cannot carry it
K=""
if [ -n "$CORPUS" ]; then
  CORPUS_DESC="$(fetch "$CORPUS" "$CTMP")" || die "could not read the corpus: $CORPUS  (exit 3 is not a verdict about the page)"
  echo "corpus: $CORPUS_DESC"
  CCOUNT="$(grep -oaE 'hellokahwin\.com/artikel/[a-z0-9-]+/[a-z0-9-]+' "$CTMP" \
           | sed 's#.*/artikel/##; s#/.*##' | sort | uniq -c | sort -rn)"
  # A corpus that parses to nothing is a claim about THIS EXTRACTION, never a
  # claim that the site has no articles — and left unchecked it is lenient in
  # both directions at once (K=1 collapses H6.3's floor to 1; capacity 0 blames
  # the corpus for a build defect). Note that `printf '%s\n' ""` emits one line,
  # so `wc -l` reports 1 for the empty case and CANNOT be used to detect it.
  # Test the string itself.
  [ -n "$CCOUNT" ] || die "corpus parsed to ZERO article URLs: $CORPUS
  A ZERO IS A CLAIM ABOUT THE CHECK UNTIL THE CHECK IS PROVED. Enumerate what
  IS in that file before believing it:
    grep -oaE '<loc>[^<]*</loc>' <corpus> | head -20"
  K="$(printf '%s\n' "$CCOUNT" | wc -l | tr -d ' ')"
  [ "$K" -lt "$KCAP" ] && KCAP="$K"
fi


# --- H6.0 EXTRACTION, normative. Ordered item set = every article link in DOM
# order, deduplicated by path, first occurrence wins. Category = the path
# segment between /artikel/ and the article slug.
SEQ="$(grep -oaE 'href="(https://hellokahwin\.com)?/artikel/[a-z0-9-]+/[a-z0-9-]+"' "$TMP" \
      | sed 's/^href="//; s/"$//; s#^https://hellokahwin\.com##' \
      | awk '!seen[$0]++' \
      | awk -F/ '{print $3}')"

if [ -z "$SEQ" ]; then
  echo
  echo "  H6.0  EXTRACTION  FAIL — zero article links matched."
  echo "        A ZERO IS A CLAIM ABOUT THE CHECK UNTIL THE CHECK IS PROVED."
  echo "        Enumerate what IS there before reporting this as an empty homepage:"
  echo "          grep -oaE 'href=\"[^\"]*\"' <page> | sort | uniq -c | sort -rn | head -40"
  exit 1
fi

N="$(printf '%s\n' "$SEQ" | wc -l | tr -d ' ')"
CAP=$(( (N + 2) / 3 ))          # ceil(N/3)
DISTINCT="$(printf '%s\n' "$SEQ" | sort -u | wc -l | tr -d ' ')"

# --- THE RAW CENSUS, UNDEDUPLICATED. UI-13's DoD names this exact command, and
# it is not the same number as the set above: a Next.js page carries its content
# TWICE, once as DOM and once as the RSC flight payload, so a plain-text grep
# over the served HTML returns exactly double. Measured on the live homepage,
# 01 Sept 2026: 26 raw segments, 13 items. That is why H6.0 deduplicates by
# path, and why "26 of 26 are hantaran-mas-kahwin" was always a statement about
# 13 articles.
#
# Printed rather than merely accounted for, because the RATIO is a diagnostic
# nothing else here would catch: RAW = 2 x N is the healthy state, and any other
# multiple means the page's shape changed under this script — a third copy, a
# link rendered only on the server, a duplicate item — and the verdict below
# deserves a second look before it is believed.
RAWCENSUS="$(grep -oaE '/artikel/[a-z0-9-]+/[a-z0-9-]+' "$TMP" \
            | sed 's#.*/artikel/##; s#/.*##' | sort | uniq -c | sort -rn)"
RAWTOTAL="$(printf '%s\n' "$RAWCENSUS" | awk '{s+=$1} END {print s+0}')"

echo
echo "  raw:    $RAWTOTAL category segments before dedup ($(printf '%s\n' "$RAWCENSUS" | awk '{printf "%s%s=%d", (n++?" ":""), $2, $1}'))"
# Two multiples are normal and neither is a finding: 2 x N is a Next.js page
# (DOM + RSC flight payload) and 1 x N is a plain HTML file, which is what every
# fixture in this repo is. Anything else means a third copy, a link rendered
# only on one side, or a genuinely repeated item — a change in the page's shape
# underneath this script, which is worth knowing before the verdict is believed.
# Written as "not 1 and not 2" rather than "not 2" because the first draft
# warned on all eight of its own fixtures, and a warning that fires on every
# control is noise that teaches people to skip the line.
if [ "$RAWTOTAL" -ne "$N" ] && [ "$RAWTOTAL" -ne $(( N * 2 )) ]; then
  echo "          !! $RAWTOTAL is neither N ($N) nor 2 x N ($(( N * 2 ))). The page's shape changed"
  echo "             under this script; the verdict below is worth a second look." >&2
fi
echo "  set:    N=$N items, $DISTINCT distinct categories, share cap ceil(N/3)=$CAP"
echo "  order:  $(printf '%s\n' "$SEQ" | paste -sd' ' -)"
echo

FAIL=0

# --- H6.1 SHARE CAP: no category supplies more than ceil(N/3) items.
OVER="$(printf '%s\n' "$SEQ" | sort | uniq -c | sort -rn | awk -v cap="$CAP" '$1>cap {printf "%s%s=%d", (n++?" ":""), $2, $1}')"
if [ -n "$OVER" ]; then
  echo "  H6.1  SHARE CAP   FAIL — over ceil(N/3)=$CAP: $OVER"
  FAIL=1
else
  TOP="$(printf '%s\n' "$SEQ" | sort | uniq -c | sort -rn | head -1 | awk '{printf "%s=%d", $2, $1}')"
  echo "  H6.1  SHARE CAP   pass — largest category $TOP, cap $CAP"
fi

# --- H6.2 RUN CAP: no two consecutive items share a category.
RUNS="$(printf '%s\n' "$SEQ" | awk 'NR>1 && $0==p {printf "%d-%d:%s ", NR-1, NR, $0} {p=$0}')"
if [ -n "$RUNS" ]; then
  NRUNS="$(printf '%s\n' "$RUNS" | tr ' ' '\n' | grep -c ':' )"
  PL="pairs"; [ "$NRUNS" = "1" ] && PL="pair"
  echo "  H6.2  RUN CAP     FAIL — $NRUNS adjacent same-category $PL: $(printf '%s' "$RUNS" | sed "s/ *$//" | cut -c1-140)"
  FAIL=1
else
  echo "  H6.2  RUN CAP     pass — no two consecutive items share a category"
fi

# --- H6.3 DISTINCT FLOOR: the set names at least F distinct categories, where
#   F = min(4, K, N - cap + 1)
# K = categories holding at least one published article (>= 4 when no --corpus
# is given, which is the stricter reading). The third term is what stops H6.3
# contradicting H6.1: a floor above N - cap + 1 would forbid any category from
# reaching the share cap H6.1 explicitly permits. At N=4, cap=2, F is 3, not 4.
FLOOR=$(( N - CAP + 1 ))
[ "$FLOOR" -gt "$KCAP" ] && FLOOR="$KCAP"
[ "$FLOOR" -lt 1 ] && FLOOR=1
FDESC="min(4,K,N-cap+1)=$FLOOR"
if [ "$DISTINCT" -lt "$FLOOR" ]; then
  echo "  H6.3  FLOOR       FAIL — $DISTINCT distinct categories, floor $FDESC"
  FAIL=1
else
  echo "  H6.3  FLOOR       pass — $DISTINCT distinct categories, floor $FDESC"
fi

# --- H6.5 SATISFIABILITY: could the corpus have satisfied H6.1 at this N?
# Capacity = sum over categories of min(published, cap). H6.1 is satisfiable iff
# capacity >= N. H6.2 is then automatically satisfiable, because cap = ceil(N/3)
# is never above ceil(N/2), the rearrangement bound.
if [ -n "$CORPUS" ]; then
  CAPACITY="$(printf '%s\n' "$CCOUNT" | awk -v cap="$CAP" '{c=$1; if (c>cap) c=cap; s+=c} END {print s+0}')"
  TOTAL="$(printf '%s\n' "$CCOUNT" | awk '{s+=$1} END {print s+0}')"
  echo
  echo "  corpus: $TOTAL published articles across $K categories"
  echo "          capacity at cap $CAP = $CAPACITY, required = $N"
  if [ "$CAPACITY" -ge "$N" ]; then
    echo "          H6 IS SATISFIABLE at N=$N. A failure above is a build defect, not a corpus limit."
  else
    echo "          H6 IS NOT SATISFIABLE at N=$N. H6.5's fallback applies: relax the run cap"
    echo "          first, then the share cap, then TRUNCATE to the longest set that holds."
  fi
fi

echo
if [ "$FAIL" = "0" ]; then echo "  VERDICT: H6 holds."; else echo "  VERDICT: H6 is violated."; fi
exit "$FAIL"
