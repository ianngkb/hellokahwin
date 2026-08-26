#!/usr/bin/env bash
# CONT-02 before/after image count, produced by command over the drafts.
#
# The front matter uses TWO spellings and a count that misses either is wrong:
#     cover:            file: path     <- 2-space indent, NO dash
#     images:         - file: path     <- 2-space indent, WITH dash
# Only lines inside the front matter are counted (awk stops at the closing ---),
# so a markdown image in the body can never inflate the number. A "text card" is
# any front-matter image whose basename is not a licensed S- photograph.
# "Sect" is the shallowest heading level the body uses: the eight C2.4 articles
# head their sections with ###, every other article with ##.
#
# AFTER is measured live. BEFORE is the recorded output of THIS SAME counter run
# over the same 28 files before any edit (before.tsv) - none of these files is
# tracked in git, so there is no committed state to diff against.
S="$(cd "$(dirname "$0")" && pwd)"
D="C:/Users/Ian Ng/Documents/Code/hellokahwin/hellokahwin/docs/plans/aug-23-2026-session-01/drafts"
cd "$D" || exit 1
# The three C2-3-* files are excluded: another agent created them DURING this
# run and they are not in CONT-02's scope.
FILES=$(ls ingest/*.md | grep -v 'C2-3-A'; ls borang-nikah.md lafaz-taklik.md rukun-nikah.md \
        syarat-sah-nikah.md C6-2-A1-harga-sewa-dewan-kahwin.md C6-2-A2-checklist-kahwin.md \
        C6-2-A3-pakej-dewan-kahwin.md C6-2-A4-bajet-kahwin.md)
printf '%-4s %-38s %5s %7s %7s %7s %7s\n' PIL SLUG SECT BEFORE CARDS AFTER CARDS
tb=0; ta=0; tbc=0; tac=0; n=0
for f in $FILES; do
  fm=$(awk 'NR>1 && /^---$/{exit} NR>1{print}' "$f")
  body=$(awk 'c>=2{print} /^---$/{c++}' "$f")
  slug=$(printf '%s\n' "$fm" | awk '/^slug:/{print $2;exit}')
  pil=$(printf '%s\n'  "$fm" | awk '/^pillar:/{print $2;exit}')
  h2=$(printf '%s\n' "$body" | grep -cE '^## '); h3=$(printf '%s\n' "$body" | grep -cE '^### ')
  sect=$h2; [ "$h2" -eq 0 ] && sect=$h3
  cov=$(printf '%s\n' "$fm" | grep -cE '^  file:[[:space:]]*[^[:space:]]')
  bod=$(printf '%s\n' "$fm" | grep -cE '^  - file:[[:space:]]*[^[:space:]]')
  ac=$(printf '%s\n'  "$fm" | grep -E '^ *-? *file:[[:space:]]*[^[:space:]]' | grep -vc '/S-\|: *S-')
  a=$((cov+bod))
  b=$(awk -v s="$slug" -F'\t' '$1==s{print $2}' "$S/before.tsv")
  bc=$(awk -v s="$slug" -F'\t' '$1==s{print $3}' "$S/before.tsv")
  : "${b:=0}"; : "${bc:=0}"
  tb=$((tb+b)); ta=$((ta+a)); tbc=$((tbc+bc)); tac=$((tac+ac)); n=$((n+1))
  printf '%-4s %-38s %5s %7s %7s %7s %7s\n' "$pil" "$slug" "$sect" "$b" "$bc" "$a" "$ac"
done
echo "--------------------------------------------------------------------------"
printf '%-4s %-38s %5s %7s %7s %7s %7s\n' '' "TOTAL ($n articles)" '' "$tb" "$tbc" "$ta" "$tac"
echo
echo "photographs: $((tb-tbc)) -> $((ta-tac))   |   text cards: $tbc -> $tac"
echo "kad-tajuk references: $(grep -h 'kad-tajuk' $FILES 2>/dev/null | wc -l)"
