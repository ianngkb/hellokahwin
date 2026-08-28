#!/usr/bin/env bash
# The 30-minute cold re-fetch, run exactly as recorded in 06-cold-refetch-30min.md.
#
# Two passes over the eight URLs the OLD code was serving the site-default title
# on, because they answer different questions:
#
#   plain  — what a reader and Googlebot actually receive right now, edge state
#            included. `x-vercel-cache` and `age` are printed because a title
#            without its cache state is not a measurement.
#   ?_t=   — a unique query per request. The INTENT was to give the Vercel edge
#            a key it has never seen, so the request reaches the origin.
#
#            IT DOES NOT DO THAT, and the run of 04:44Z is the proof: every
#            busted request came back `HIT` with an `age` matching the entry the
#            plain pass had created 70 seconds earlier. Vercel's cache key for
#            this route ignores the query string, so `?_t=` is not a
#            cache-buster here — it is the same request with extra characters.
#
#            Kept, and kept honest, because the mistake is worth more than the
#            pass: it is the same shape of error as the six-wide Sprint 02
#            sweep. A knob that looks like it changes the measurement, does not,
#            and reports a confident number either way.
#
#            The plain pass is the one that carries the claim. Run 30+ minutes
#            after anything last touched these URLs, the edge entries have
#            expired (`s-maxage=300, stale-while-revalidate=600`, so 15 minutes
#            of life at most) and the plain pass IS the cold origin fetch —
#            which is exactly what `x-vercel-cache: MISS, age=0` on all eight
#            rows at 04:43Z says.
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
    # TRUNCATE FIRST. Without this, a curl that fails leaves the PREVIOUS
    # URL's HTML on disk and the next line reports that page's title against
    # this URL. It happened on the 04:43Z run — one row printed an empty status
    # and the title belonging to the row above it. A measurement script that
    # reuses a stale file on failure is a measurement script that lies.
    : > /tmp/seo07/cold.html
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
