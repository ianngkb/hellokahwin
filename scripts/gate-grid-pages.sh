#!/usr/bin/env bash
# UI-15 — run the UILINT gate over every CATEGORY page on a live site, with the
# page list DERIVED FROM THE SITEMAP AT RUN TIME.
#
#   bash scripts/gate-grid-pages.sh [base-url] [extra gate flags…]
#
# ── WHAT IT COVERS, STATED NARROWLY BECAUSE AN OVERSTATED SCOPE IS A LIE ────
# `/artikel` plus every `/artikel/<category>` archive. That is UI-15's DoD —
# "0 violations across every category page" — and it is NOT every page that
# renders a grid thumbnail. Named, not left for a reader to discover:
#
#   · `/` renders 13 `.s-row` thumbnails and is NOT in this run.
#   · `/artikel/<cat>/<slug>` renders the related `.s-row` list and is NOT in
#     this run.
#   · `/artikel` itself renders neither `.s-card` nor `.s-row` — it is a
#     Tailwind grid of `ArticleCard` — but the DoD names it, so it is included
#     and it is expected to be silent on the two grid-thumbnail checks.
#
# The gate's own `--base` mode covers the homepage and two article instances
# from its `TEMPLATES` manifest. Run BOTH before believing the site is clean.
#
# ── WHY THE LIST IS DERIVED AND NOT WRITTEN DOWN ───────────────────────────
# UI-15's own tracker row carried "all 37 pages". Re-measured 02 September 2026
# the sitemap held 109 entries, and ONE HOUR LATER it held 113 — four articles
# published mid-item, the same way DES-18 watched 86 become 89 and UI-13 watched
# 89 become 92. A hardcoded count is a number that was true once. This script
# prints its derivation every run so the next reader can watch it move.
#
# It prints the counts it derived BEFORE it measures anything, and refuses to
# report a clean pass over a list it could not build — a silent zero here would
# say "0 violations across every category page" about nothing at all.
set -u

BASE="${1:-https://hellokahwin.com}"
[ $# -gt 0 ] && shift
BASE="${BASE%/}"
case "$BASE" in
  http://* | https://*) ;;
  *)
    echo "FATAL: first argument must be a base URL, got '$BASE'." >&2
    exit 2
    ;;
esac

# ⚠ UI_GATE_BASE_URL WINS OVER --url INSIDE THE GATE. Its dispatch is an
# if/else-if chain and the `--base` branch — which reads this variable — is
# tested BEFORE the `--url` branch. Exported in the environment it would make
# this script print a 16-page derivation and then measure the gate's own
# seven-entry TEMPLATES manifest, possibly against another host, and report that
# run's exit code as though it were this one's. Cleared, not trusted.
if [ -n "${UI_GATE_BASE_URL:-}" ]; then
  echo "note: clearing UI_GATE_BASE_URL='${UI_GATE_BASE_URL}' — it would override the derived --url list" >&2
  unset UI_GATE_BASE_URL
fi

# Same hazard from the other direction: any forwarded mode flag also wins over
# `--url`. Refuse loudly rather than measure something else under this name.
for a in "$@"; do
  case "$a" in
    --selftest | --fixtures | --pre-rail | --discriminator | --h6-order | --grid-thumb | --empty-shell | --base)
      echo "FATAL: '$a' selects a different gate mode and would replace the derived page list. Run it directly with 'node scripts/ui-layout-gate.mjs $a'." >&2
      exit 2
      ;;
  esac
done

# --max-time because this machine stalls ~21s in the TCP handshake to Vercel on
# a few percent of requests, and a hang with no ceiling is not a measurement.
SITEMAP="$(curl -fsS --max-time 120 "$BASE/sitemap.xml")" || {
  echo "FATAL: could not fetch $BASE/sitemap.xml" >&2
  exit 2
}

# Strip the origin with a literal prefix, not a regex: `sed "s|^$BASE||"`
# interpolates an unescaped URL into a pattern, where a `|` or a `.` changes
# what it matches.
PATHS="$(
  printf '%s' "$SITEMAP" |
    grep -o '<loc>[^<]*</loc>' |
    sed 's|</\?loc>||g' |
    while IFS= read -r u; do
      case "$u" in "$BASE"*) u="${u#"$BASE"}" ;; esac
      printf '%s\n' "${u%/}"
    done
)"

# ⚠ NOT `grep -c -o`. `-o` is IGNORED when `-c` is given, so that counts LINES
# and would report 1 for a minified sitemap while $PATHS — built with `grep -o`
# and no `-c` — correctly held every entry. The two would silently disagree and
# the sum check below would fail on a healthy sitemap. Verified in this shell:
# `printf '<loc>a</loc><loc>b</loc>\n' | grep -c -o '<loc>'` returns 1.
TOTAL="$(printf '%s' "$SITEMAP" | grep -o '<loc>' | wc -l | tr -d ' ')"
CATS="$(printf '%s\n' "$PATHS" | grep -E '^/artikel/[^/]+$' | sort)"
NCAT="$(printf '%s\n' "$CATS" | grep -c . || true)"
NART="$(printf '%s\n' "$PATHS" | grep -cE '^/artikel/[^/]+/[^/]+$' || true)"
INDEX="$(printf '%s\n' "$PATHS" | grep -cE '^/artikel$' || true)"
NROOT="$(printf '%s\n' "$PATHS" | grep -c '^$' || true)"

echo "sitemap:  $TOTAL <loc>  =  $NROOT root + $INDEX /artikel + $NCAT category archives + $NART articles"
if [ "$NCAT" -eq 0 ]; then
  echo "FATAL: the sitemap yielded ZERO category archives. Refusing to report a clean run over an empty list." >&2
  exit 2
fi

# Anything the four buckets do not account for is PRINTED. It is only fatal when
# it looks like a page this run should have covered: a new static page such as
# `/tentang-kami` is a content change and must not break a design gate, but an
# unclassified `/artikel/...` shape means the derivation has a hole and the
# "every category page" claim is no longer true.
UNCLASSIFIED="$(printf '%s\n' "$PATHS" | grep -vE '^$|^/artikel$|^/artikel/[^/]+$|^/artikel/[^/]+/[^/]+$' || true)"
if [ -n "$UNCLASSIFIED" ]; then
  echo "unclassified sitemap entries (not measured by this run):"
  printf '  %s\n' $UNCLASSIFIED
  if printf '%s\n' "$UNCLASSIFIED" | grep -q '^/artikel/'; then
    echo "FATAL: an /artikel/... shape this script does not classify. The page list is incomplete and the 'every category page' claim would be false." >&2
    exit 2
  fi
fi

ARGS=()
[ "$INDEX" -gt 0 ] && ARGS+=(--url "$BASE/artikel")
while IFS= read -r p; do
  [ -n "$p" ] && ARGS+=(--url "$BASE$p")
done <<EOF
$CATS
EOF
echo "grid pages derived at run time: $((${#ARGS[@]} / 2))"
echo

# Read the gate's exit code DIRECTLY. `node … | tee log` reports TEE's status,
# which is how UI-06's own CI job printed SUCCESS over an assertion failure.
node scripts/ui-layout-gate.mjs "${ARGS[@]}" "$@"
GATE=$?
echo "GATE EXIT (read directly, not through a pipe): $GATE"
exit $GATE
