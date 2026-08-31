#!/usr/bin/env bash
#
# UNDO — put the in-article contents-list label back to `Isi Kandungan`.
#
#   bash tests/article-toc/UNDO-label-rename.sh          # apply the undo
#   bash tests/article-toc/UNDO-label-rename.sh --check  # verify it would apply
#
# WHY THIS FILE EXISTS. UI-18 renamed the label from `Isi Kandungan` to
# `Dalam artikel ini` on 01 Sept 2026, on the authority of DES-03 §5.1. The
# owner's instruction re-scoping the item arrived TRUNCATED and its surviving
# fragment reads "…st rename to match a spec that may itself be wrong", most
# plausibly "must NOT just rename". The rename is therefore PROVISIONAL until
# the full text arrives, and the standing rule is that a reversible change is
# reversible IN FACT, not in principle.
#
# WHAT IT IS NOT. There is no production WRITE to undo. Not one database row was
# touched by this item: the label is a string literal in a React component, the
# ids come from `heading-anchors.ts` at render time, and the corpus is read-only
# to everything UI-18 shipped. Reverting is a code change plus a deploy. Nothing
# is lost while it is not applied and nothing needs recovering after it is.
#
# WHAT IT TOUCHES — the complete list, two files, four lines:
#   src/components/inspire/article-toc.tsx                aria-label + the eyebrow text
#   src/components/inspire/__tests__/article-toc.test.tsx the assertion on both
#
# WHAT IT DELIBERATELY DOES NOT TOUCH, and why reverting PR #38 wholesale is the
# wrong undo: that PR also lowered TOC_MIN_HEADINGS from 4 to 2, which is the
# DoD's number and is what puts a contents list on `goodies-kahwin` and
# `tempat-honeymoon-di-malaysia`. It also shipped the gate, the CI job and the
# reference-page entries. Reverting the commit would take all of that with it.
# The label is the only provisional part and this is the only part that moves.
#
# The gate does not assert the string in either direction — `.article-toc` is
# the signal, never a label string — so `pnpm audit:toc` stays green across this
# change, by design. `pnpm test` is what proves the undo landed.
set -euo pipefail
cd "$(dirname "$0")/../.."

COMPONENT=src/components/inspire/article-toc.tsx
TEST=src/components/inspire/__tests__/article-toc.test.tsx

expect() { # file, pattern, human name
  grep -q -- "$2" "$1" || { echo "UNDO: $1 does not contain $3 — the file has moved on since"; \
    echo "      this undo was written. Re-read it before applying."; exit 1; }
}
expect "$COMPONENT" 'aria-label.: .Dalam artikel ini' "the aria-label"
expect "$COMPONENT" '>Dalam artikel ini</p>' "the eyebrow"
expect "$TEST" "toContain('Dalam artikel ini')" "the label assertion"

if [ "${1:-}" = "--check" ]; then echo "UNDO: all three anchors present; the undo would apply cleanly."; exit 0; fi

sed -i "s/{ 'aria-label': 'Dalam artikel ini' }/{ 'aria-label': 'Isi Kandungan' }/" "$COMPONENT"
sed -i 's|>Dalam artikel ini</p>|>Isi Kandungan</p>|' "$COMPONENT"
sed -i "s/expect(html).toContain('Dalam artikel ini');/expect(html).toContain('Isi Kandungan');/" "$TEST"
sed -i "s/expect(html).not.toContain('Isi Kandungan');/expect(html).not.toContain('Dalam artikel ini');/" "$TEST"
sed -i "s/expect(html).toContain('aria-label=\"Dalam artikel ini\"');/expect(html).toContain('aria-label=\"Isi Kandungan\"');/" "$TEST"
sed -i "s/expect(inline).toContain('aria-label=\"Dalam artikel ini\"');/expect(inline).toContain('aria-label=\"Isi Kandungan\"');/" "$TEST"
sed -i "s/expect(inRail).not.toContain('Dalam artikel ini');/expect(inRail).not.toContain('Isi Kandungan');/" "$TEST"

echo "UNDO applied to the CODE. Two things are still on you:"
echo "  1. The doc block at the top of $COMPONENT still describes the rename as"
echo "     current. Rewrite that paragraph; a comment that survives its own undo"
echo "     is the drift this component's header exists to argue against."
echo "  2. UI-17's rail renders the heading itself once it lands. If the rail is"
echo "     already on production, the string it renders is theirs to change too —"
echo "     check src/design-system/components/article-rail.tsx before deploying,"
echo "     or the two surfaces disagree."
echo
echo "Then:  pnpm test  &&  pnpm audit:toc:selftest  &&  commit and deploy."
grep -n 'Isi Kandungan\|Dalam artikel ini' "$COMPONENT" | grep -v '^\s*\*' || true
