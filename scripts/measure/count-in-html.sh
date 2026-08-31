#!/usr/bin/env bash
# count-in-html.sh — count occurrences of a string in a live page, correctly.
#
# WHY THIS EXISTS. On 2026-09-01 the CEO ran `grep -oiF "artikel"` against a live
# article page and got ZERO — on a page whose own URL contains /artikel/. The same
# run returned 0 for REKOD and SUMBER, which are present 24 and 20 times. That
# absence would have been reported as "the article rail's scaffolding does not
# exist", sending a build item to recreate markup that was already shipped.
#
# ⚠ THE FIRST DIAGNOSIS WAS WRONG AND IS RECORDED HERE BECAUSE IT IS THE MORE
# USEFUL HALF. The CEO blamed the file being 145 KB on one line with no terminator
# — "grep classified it as binary" — and wrote `-a` into this script as the fix.
# `-a` DOES NOT FIX IT. Proved by running the fix against the case it was written
# for, which is the only reason it was caught:
#
#     grep -oaiF artikel <page>   ->  0        <- still zero WITH -a
#     grep -oaF  artikel <page>   ->  89
#     grep -oai  artikel <page>   ->  97
#
# The real cause is `-o` + `-i` + `-F` TOGETHER in GNU grep 3.0 (this Git Bash
# build). It has nothing to do with size, line length or binary detection — it
# reproduces on a 23-byte file:
#
#     printf 'artikel artikel ARTIKEL' > f
#     grep -oiF artikel f   ->  0
#     grep -oi  artikel f   ->  3
#
# So: NEVER COMBINE -o -i -F. This script escapes the pattern and uses -oai.
# `-a` is kept because it is harmless and a genuinely binary response should not
# stop a count, but it is not the fix and must not be remembered as one.
#
# Second rule baked in: ENUMERATE, don't test for what you assume is there.
# `--enumerate` reports every distinct variant found, which is how the
# garden-wedding credit count was corrected on 30 Aug (`Kredit` returned 0; the
# label was English, in four casings, including a live `sOURCE:` typo).
#
# Usage:
#   count-in-html.sh <url|file> <pattern> [<pattern> ...]
#   count-in-html.sh [--case-sensitive] --enumerate <url|file> <ERE>
#
# `--enumerate` takes an EXTENDED regex (grep -E) and is CASE-INSENSITIVE unless
# you pass --case-sensitive. Write {0,40}, not the BRE backslashed form.
#
# Examples:
#   count-in-html.sh https://hellokahwin.com/artikel/... "DALAM ARTIKEL INI" REKOD SUMBER
#   count-in-html.sh --enumerate https://hellokahwin.com/artikel/... '[Ss][Oo][Uu][Rr][Cc][Ee]:'
#
# Exit codes: 0 = ran; 2 = usage error; 3 = fetch failed.
set -uo pipefail

die() { echo "$*" >&2; exit 2; }

ENUM=0
ENUM_I=-i
while :; do
  case "${1:-}" in
    --enumerate) ENUM=1; shift ;;
    --case-sensitive) ENUM_I=; shift ;;
    *) break ;;
  esac
done
[ $# -ge 2 ] || die "usage: $0 [--enumerate] <url|file> <pattern> [pattern ...]"

SRC="$1"; shift
TMP="$(mktemp)"; trap 'rm -f "$TMP"' EXIT

if printf '%s' "$SRC" | grep -qE '^https?://'; then
  code="$(curl -sS -o "$TMP" -w '%{http_code}' "$SRC")" || { echo "fetch failed: $SRC" >&2; exit 3; }
  echo "source: $SRC  (HTTP $code, $(wc -c < "$TMP") bytes)"
  [ "$code" = "200" ] || echo "  !! not 200 — every count below is a count about an error page" >&2
else
  [ -f "$SRC" ] || die "no such file: $SRC"
  cp "$SRC" "$TMP"
  echo "source: $SRC  ($(wc -c < "$TMP") bytes)"
fi

if [ "$ENUM" = "1" ]; then
  # Enumerate what IS there, grouped, so a wrong assumption cannot hide as a zero.
  #
  # ⚠ CASE-INSENSITIVE BY DEFAULT — UI-17, 01 Sep 2026. This mode was `grep -oaE`
  # with no `-i`, while the COUNTING mode below has always been `-oai`. So the one
  # mode whose entire purpose is "enumerate what is there rather than testing for
  # the casing you assume" was itself casing-blind, and the two modes disagreed
  # about the same pattern on the same file:
  #
  #     count-in-html.sh <page> SUMBER                 ->  20
  #     count-in-html.sh --enumerate <page> 'SUMBER:'  ->  (none)
  #
  # on a page carrying `Sumber:` ×1. That is this script's own headline failure,
  # reproduced inside this script, and it reads exactly like an absence.
  # `--case-sensitive` opts out for the rare case where the casing IS the finding.
  #
  # ⚠ AND THE DIALECT IS ERE, NOT BRE. `-E` was always here, but the usage block
  # above documented `[Ss][Oo][Uu][Rr][Cc][Ee]:` — a pattern valid in BOTH dialects
  # — so nothing ever revealed the difference. A BRE-style bound written out of the
  # counting mode's habits is read by ERE as literal brace characters and matches
  # nothing. Detected and named below rather than left to look like an absence.
  echo "-- enumerated variants of /$1/ --"
  case "$1" in
    *'\{'*)
      echo "  !! your pattern contains a backslashed brace, which is a BRE bound." >&2
      echo "     This mode is ERE: write {0,40}, not the backslashed form, or the" >&2
      echo "     braces match literally and you get a confident (none)." >&2
      ;;
  esac
  out="$(grep -oa $ENUM_I -E "$1" "$TMP" | sort | uniq -c | sort -rn)"
  if [ -z "$out" ]; then
    echo "  (none)  <- an empty enumeration is a claim about your REGEX until you"
    echo "           prove the regex on a line you know matches. Widen it and re-run."
  else
    printf '%s\n' "$out"
  fi
  exit 0
fi

for pat in "$@"; do
  # NO -F HERE. `grep -o -i -F` returns 0 in GNU grep 3.0 (see WHY THIS EXISTS).
  # Escape the pattern for BRE instead, so it stays a literal without -F.
  esc="$(printf '%s' "$pat" | sed 's/[][\.*^$]/\\&/g')"
  n="$(grep -oai "$esc" "$TMP" | wc -l | tr -d ' ')"
  printf '  %-28s %s\n' "$pat" "$n"
  if [ "$n" = "0" ]; then
    echo "      ^ ZERO. Before reporting this as an absence, verify the CHECK:"
    echo "        re-run with --enumerate and a widened regex. Eleven of the"
    echo "        company's tabulated bad checks were a zero that meant nothing."
  fi
done
