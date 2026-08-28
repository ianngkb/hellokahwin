#!/usr/bin/env bash
# The 30-minute cold re-fetch, run exactly as recorded in 06-cold-refetch-30min.md.
#
# Two passes over the eight URLs the OLD code was serving the site-default title
# on, because they answer different questions:
#
#   plain  — what a reader and Googlebot actually receive right now, edge state
#            included. `x-vercel-cache` and `age` are printed because a title
#            without its cache state is not a measurement.
#   ?_t=   — a unique query per request, so the Vercel edge has no entry and the
#            request reaches the ORIGIN. This is what distinguishes "the edge is
#            holding a good copy" from "the origin still renders a good title".
#
# Sequential, one second apart. See the header of scripts/audit-rendered-titles.mts
# for why a concurrent version of this is a different and destructive operation.
set -u
export PATH="/usr/bin:/mingw64/bin:/c/Windows/System32"

URLS="
/artikel/ucapan-doa/ucapan-pengantin-baru
/artikel/real-wedding/sentosa-janda-baik
/artikel/hantaran-mas-kahwin/barang-hantaran-perempuan
/artikel/hantaran-mas-kahwin/hantaran-tunang-untuk-lelaki
/artikel/real-wedding/perkahwinan-di-ruma-hotel-kuala-lumpur-dengan-sentuhan-warisan-peranakan
/artikel/busana-pengantin/songket-tenunan-tangan-atau-cetak
/artikel/hantaran-mas-kahwin/berapa-dulang-hantaran-tunang
/artikel/hantaran-mas-kahwin/hantaran-tunang-untuk-perempuan
"
BASE=https://hellokahwin.com
GBOT="Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"

pass () { # $1 = label, $2 = "bust" or ""
  echo "### $1  ($(date -u +%Y-%m-%dT%H:%M:%SZ))"
  for p in $URLS; do
    u="$BASE$p"
    [ "$2" = "bust" ] && u="$u?_t=$(date +%s)-$RANDOM"
    h=$(curl -s -D - -o /tmp/seo07/cold.html -A "$GBOT" "$u")
    c=$(echo "$h" | grep -i "^x-vercel-cache" | tr -d '\r' | cut -d' ' -f2)
    a=$(echo "$h" | grep -i "^age:" | tr -d '\r' | cut -d' ' -f2)
    s=$(echo "$h" | head -1 | tr -d '\r' | cut -d' ' -f2)
    t=$(grep -o '<title>[^<]*</title>' /tmp/seo07/cold.html | sed 's|</\?title>||g')
    printf '%s\n  http=%s  x-vercel-cache=%s  age=%s\n  <title> %s\n' \
      "$p" "$s" "${c:--}" "${a:--}" "${t:-(none)}"
    sleep 1
  done
  echo ""
}

mkdir -p /tmp/seo07
pass "PLAIN — what a reader and Googlebot receive" ""
pass "?_t= CACHE-BUSTED — edge bypassed, answered by the origin" "bust"
