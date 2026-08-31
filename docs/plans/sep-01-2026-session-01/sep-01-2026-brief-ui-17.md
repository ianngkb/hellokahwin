# UI-17 — Build the 300px desktop right rail that DES-03 section 5.1 specifies and production does not have

**Sprint 05 — *Build where the click is*** · track `design` · **8 points** · owner `design-systems-engineer`
**Dispatched:** 01 September 2026
**Your item in the tracker:** `pnpm --silent sprint get UI-17 --sprint 5` (run from `~/Documents/Code/buddy`)

## WHY THIS ITEM EXISTS

DES-03 section 5.1 draws a 300px right rail beside the article body carrying REKOD, then DALAM ARTIKEL INI, then SUMBER, and says in words: 'On desktop the panel is the 300 px rail; on a phone it is a full-width block in the same place in the reading order.' Measured on live production at 1440px (31 Aug): article body at left 120 width 594; REKOD at left 120 - the SAME left edge as the body, i.e. the phone treatment; SUMBER at left 665 top 4558, far down the page. The desktop composition IS the mobile composition, which is what leaves ~846px of empty margin at 1440 and makes the page read as a centred blog post rather than a designed publication. The scaffolding is partly there - the server HTML carries <aside> x2, REKOD x24 and SUMBER x20 - so this is a layout job, not a from-scratch build.

## DEFINITION OF DONE — verbatim, and it is not narrowed

At 1440px on live production, on at least three article URLs of different lengths: the rail renders at the specified width to the RIGHT of the body, with REKOD, DALAM ARTIKEL INI and SUMBER in that order inside it, proved by COMPUTED getBoundingClientRect values (rail.left > body.right) captured on a real rendered viewport, not by the presence of markup. At 390px the same three blocks render full-width in the same reading order, proved the same way. Body measure stays within UI-10's 45-75 characters per line at 1024/1440/1920 - state the figure at each. The UI-06 layout gate carries a case that fails when the rail collapses to the body's left edge, with a committed pre-fix fixture as the negative control.

## BRIEF

A STATUS CODE AND THE PRESENCE OF MARKUP PROVE NOTHING HERE - the markup is already present and the layout is still wrong. The observable is a computed geometry relationship. Coordinate with UI-18: it builds the TOC that goes INSIDE this rail, so agree the container contract up front and say in your log which of you owns the container. Depends on UI-18 only for content, not for layout - build the rail to accept an empty TOC slot so neither blocks the other.

## HOW TO RECORD YOUR RESULT

Run from `~/Documents/Code/buddy`:

```
pnpm --silent sprint set-state UI-17 in_progress --sprint 5
pnpm --silent sprint add-evidence UI-17 --sprint 5 \
  --claim "<what is now true>" --proof "<the literal output/command/measurement>" --link "<url>"
```

**Do NOT set your own item to `done`.** The CEO verifies every item against
production or the artefact itself before that happens — that is the standing rule,
and it exists because agent completion reports have been wrong in the optimistic
direction. Record your evidence and report; the CEO closes it.

---

## STANDING RULES — these bind you, and they are not optional

**DONE MEANS SHIPPED.** Owner directive, 26 Aug 2026. Not built, not committed, not
"working locally" — shipped, and reachable by the owner. Site code: merged to the
default branch AND deployed AND visible on a live URL. Content: ingested to
production AND the URL returns 200 AND a reader can find it. A document or log:
committed and pushed — a file on one machine is not a deliverable.

**YOUR DoD IS NEVER NARROWED.** If the item turns out bigger than its DoD assumed,
it stays open, gets `parked` with a reason, or carries forward. Rewriting the DoD to
fit what you achieved is the one thing that makes velocity a lie. Bring it back
instead — a parked item with a clear reason is a good outcome.

**A GATE IN YOUR DoD IS ALLOWED TO KILL THIS ITEM.** If your brief opens with a
gate and the gate fails: STOP and report. Do not build with invented figures and do
not quietly downgrade to an option already rejected. On a site whose entire claim is
that its numbers carry sources, a plausible fabrication is the worst outcome
available and the hardest to detect later.

**VERIFY YOUR OWN CHECKS. The company has twelve tabulated instances of the same
failure: checked a proxy, with a pattern nobody tested.**
- When a check returns a surprising ABSENCE, **verify the CHECK first.**
- **Enumerate what IS there** (`grep -oai <pat> | sort | uniq -c`) rather than
  testing for what you assume is there. The second form can only ever return a
  number about your assumption.
- **NEVER COMBINE `grep -o -i -F`.** It returns **0** in GNU grep 3.0 (this Git Bash
  build) and reproduces on a 23-byte file. On 01 Sept it returned 0 for `REKOD` and
  `SUMBER` on a page carrying them ×24 and ×20. Use the committed helper:
  `bash scripts/measure/count-in-html.sh <url|file> "PATTERN" ...`
- **A FIX IS NOT VERIFIED UNTIL IT IS RUN AGAINST THE FAILING CASE.** The first fix
  for that grep bug was itself wrong, and was caught only by running it. "I
  understand the cause" is not a test.
- **A status code proves nothing on its own.** A 200 carrying the right string can
  still be a shell — a preview once returned 200 with the right marker and rendered
  zero articles. Compare structurally against production where it should not differ.

**PRODUCTION WRITES: record and push a precise UNDO first.** Name the exact slugs,
paths or row ids. That is what makes a write reversible in fact rather than in
principle. Additive and reversible writes proceed on your authority; anything with
no recovery path stops and comes back to the CEO.

**STAGE 9 — THE RETROSPECTIVE IS PART OF THIS ITEM, NOT AN EXTRA.**
Write it into your `docs/work-done/` entry under `## Retrospective`, answering:
what did we learn that is not written down; **which document must change and who
owns the edit — name the file**; what did we do twice that we should never repeat;
what did we nearly ship, and what caught it. **Then make the edit.** A retrospective
that names a document and does not change it has failed. Prefer an executable form —
a DoD clause, a script, a gate — over prose: **prose rules do not fire.**

**LOG YOUR WORK** in `docs/work-done/sep-01-2026-session-01/sep-01-2026-done-<slug>.md`
with evidence a reader who was not here can verify, and update
`docs/work-done/README.md`.

**REPORT A BLOCK THE MOMENT IT HAPPENS.** Do not sit on it. If you are blocked on a
credential, that means your SESSION lacks permission — say so precisely, because
that is a different problem from the company lacking the credential.

**When your work contradicts something the CEO wrote, the evidence wins** and the
file gets corrected at source. Four agents corrected the CEO in Sprint 04 and every
one was right. Put it in your log where it will be read.

**All reader-facing content passes `/humanizer` before it is done.**

---

## When you finish

Print, at the start of a line, exactly:

Print your completion sentinel as the FIRST THING ON A LINE, in the form
`ITEM` then a space then `EXIT:` then a space then your exit code — e.g. exit code zero.
Nothing else on that line.

> ⚠ This is deliberately NOT written out literally here. The watcher matches that
> exact line anchored to the start of a line, and on 01 Sept 2026 the wave-1 brief
> printed it verbatim in a code fence — so CONT-16 and SEO-13 tripped their own
> watchers within 90 seconds of dispatch, both still WORKING, simply by displaying
> their brief. Filed with the captured lines as evidence on PLAT-13.

`ITEM EXIT: <n>` is the ONLY string that means this ITEM is done. Gates you run may
print their own `NAME EXIT: n` lines — those are that gate's outcome, not yours, and
they wake the CEO for nothing. Use a non-zero code if you are stopping without
completing the DoD, and say why immediately above it.

## ⚠ WHERE THE CODE IS — and how the CEO nearly sent you on a hunt

A first pass ran `grep -rl "REKOD\|SUMBER" src/` in `hellokahwin-site` and got **nothing**,
on a repo that serves `REKOD` twenty-four times. **The check was wrong, not the repo.**
The served uppercase is a CSS text-transform; the source is mixed case:

```
$ grep -roih "rekod[a-z]*" --include=*.ts --include=*.tsx . | sort | uniq -c
     13 Rekod
      2 RekodField
      3 RekodPanel
      3 rekod
```

Start here:

- `src/design-system/components/content.tsx` — `RekodPanel`, `RekodField`
- `src/app/(public)/artikel/[category]/[slug]/page.tsx` — the article template
- `src/design-system/components/typography.tsx`, `src/design-system/token-values.ts`

**Enumerate what is there; never test for the casing you assume.** This is the
third instance of that shape in one day and all three were the CEO.
